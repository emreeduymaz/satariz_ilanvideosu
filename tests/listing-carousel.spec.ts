import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs/promises';

// Adjustable timings for video length and pacing
const START_DELAY_MS = 2000; // başlangıçta bekle (yüklenmeyi atla)
const TARGET_TOTAL_MS = 3000; // tüm kaydırmaları bu sürede tamamla
const FINAL_HOLD_MS = 300; // sonunda kısa bekleme (kare yakalansın)
const MAX_IMAGES = 7; // en fazla 7 görsel üzerinden kaydır

test('ilan sayfasında resimler sağdan sola kaydırılır ve video kaydedilir', async ({ page }) => {
  const LISTING_ID = process.env.LISTING_ID;
  // Route API to local fixture to avoid network delay
  const jsonCandidates = [
    path.resolve(process.cwd(), 'tests', 'fixtures', `listing-${LISTING_ID}.json`),
    path.resolve(process.cwd(), 'tests', 'fixtures', `10317.json`),
  ];
  let jsonPath: string | null = null;
  for (const p of jsonCandidates) {
    try { await fs.access(p); jsonPath = p; break; } catch {}
  }
  if (jsonPath) {
    await page.route(`**/api/api/v1/listing/${LISTING_ID}`, async (route) => {
      await route.fulfill({ path: jsonPath as string, status: 200, contentType: 'application/json' });
    });
  }

  // Route image requests to predownloaded local files if available
  const mapCandidates = [
    path.resolve(process.cwd(), 'tests', 'fixtures', `image-map-${LISTING_ID}.json`),
    path.resolve(process.cwd(), 'tests', 'fixtures', `image-map-10317.json`),
  ];
  let mapPath: string | null = null;
  for (const p of mapCandidates) {
    try { await fs.access(p); mapPath = p; break; } catch {}
  }
  try {
    if (!mapPath) throw new Error('no-map');
    const content = await fs.readFile(mapPath, 'utf-8');
    const map: Array<{ url: string; path: string; contentType: string }> = JSON.parse(content);
    const lookup = new Map(map.map(m => [m.url.split('?')[0], m]));
    await page.route('**/*', async (route) => {
      const url = route.request().url().split('?')[0];
      const hit = lookup.get(url);
      if (hit) {
        await route.fulfill({ path: hit.path, status: 200, contentType: hit.contentType });
      } else {
        await route.continue();
      }
    });
  } catch {
    // if no image map, continue normally
  }

  // Navigate to app root
  await page.goto(`/?id=${LISTING_ID}`);

  // Wait for the carousel to be visible (graceful fallback if not present)
  const carousel = page.getByTestId('listing-carousel');
  let hasCarousel = true;
  try {
    await carousel.waitFor({ state: 'visible', timeout: 30000 });
  } catch {
    hasCarousel = false;
  }

  // Başta yüklenmeyi atlamak için bekle
  await page.waitForTimeout(START_DELAY_MS);

  if (!hasCarousel) {
    // Fallback: wait fixed duration so a short video is still produced
    await page.waitForTimeout(TARGET_TOTAL_MS);
    return;
  }

  // Ensure first image loaded
  await expect(carousel.locator('img').first()).toBeVisible();

  // Perform swipe gestures from right to left across the carousel area
  // We will drag three times to move to next images
  const box = await carousel.boundingBox();
  if (!box) throw new Error('Carousel bounding box not found');
  const centerY = Math.floor(box.y + box.height / 2);
  const startX = Math.floor(box.x + box.width - 10);
  const endX = Math.floor(box.x + 10);

  // Calculate how many unique images exist to avoid overswiping
  const uniqueImageCount = await carousel.locator('img').evaluateAll((els) => {
    const s = new Set<string>();
    for (const el of els) {
      const img = el as HTMLImageElement;
      const src = (img.currentSrc || img.src || '').split('?')[0];
      if (src) s.add(src);
    }
    return s.size;
  });
  const cappedImageCount = Math.max(1, Math.min(uniqueImageCount, MAX_IMAGES));
  const plannedSwipes = Math.max(0, cappedImageCount - 1);
  // Tüm kaydırmaların toplam süresi ~3s olsun
  const perSwipeDelayMs = plannedSwipes > 0 ? Math.floor(TARGET_TOTAL_MS / plannedSwipes) : 0;
  const betweenSwipeDelayMs = Math.max(50, perSwipeDelayMs);

  for (let i = 0; i < plannedSwipes; i++) {
    await page.mouse.move(startX, centerY);
    await page.mouse.down();
    await page.mouse.move(endX, centerY, { steps: 25 });
    await page.mouse.up();
    await page.waitForTimeout(betweenSwipeDelayMs);
  }

  // Small hold to make sure video captures the end state
  await page.waitForTimeout(FINAL_HOLD_MS);

  // An assertion: the capped last image should be visible
  await expect(carousel.locator('img').nth(plannedSwipes)).toBeVisible();
});


