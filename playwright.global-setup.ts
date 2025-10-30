import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

export default async function globalSetup() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const fixturesDir = path.resolve(__dirname, 'tests', 'fixtures');
  const LISTING_ID = process.env.LISTING_ID;
  if (!LISTING_ID) {
    console.warn('⚠️ LISTING_ID env yok, fixture JSON indirilmeyecek.');
    return;
  }
  const outPath = path.join(fixturesDir, `10317.json`);
  try {
    await fs.access(outPath);
    return;
  } catch {}

  const url = `https://www.satariz.com/api/v1/listing/${LISTING_ID}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch listing JSON: ${res.status}`);
  const body = await res.text();
  await fs.mkdir(fixturesDir, { recursive: true });
  await fs.writeFile(outPath, body, 'utf-8');

  // Also pre-download images referenced in the JSON to avoid runtime delays
  try {
    const parsed = JSON.parse(body);
    const data = parsed?.data || {};
    const imageUrls = new Set<string>();
    const push = (u: unknown) => { if (typeof u === 'string' && /^https?:\/\//.test(u)) imageUrls.add(u); };
    if (Array.isArray(data?.gallery)) data.gallery.forEach(push);
    push(data?.image);

    const imagesDir = path.join(fixturesDir, 'images');
    await fs.mkdir(imagesDir, { recursive: true });
    const map: Array<{ url: string; path: string; contentType: string }> = [];

    for (const u of imageUrls) {
      try {
        const r = await fetch(u);
        if (!r.ok) continue;
        const ct = r.headers.get('content-type') || 'image/jpeg';
        const buf = Buffer.from(await r.arrayBuffer());
        const hash = crypto.createHash('sha1').update(u).digest('hex').slice(0, 16);
        const ext = ct.includes('webp') ? '.webp' : ct.includes('png') ? '.png' : '.jpg';
        const file = path.join(imagesDir, `${hash}${ext}`);
        await fs.writeFile(file, buf);
        map.push({ url: u, path: file, contentType: ct });
      } catch {}
    }

    const mapPath = path.join(fixturesDir, `image-map-10317.json`);
    await fs.writeFile(mapPath, JSON.stringify(map, null, 2), 'utf-8');
  } catch {
    // ignore image predownload errors
  }
}


