import { execSync, spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

async function main() {
  const listingIdArg = process.argv[2] || process.env.LISTING_ID;
  const variantArg = process.argv[3] || process.env.VARIANT || 'bireysel';
  if (!listingIdArg) {
    console.error('Kullanım: npm run video:run -- <LISTING_ID>');
    process.exit(1);
  }

  const rootDir = process.cwd();
  const remotionDir = path.resolve(rootDir, 'satarizaevideo', 'remotion');
  const remotionPublicDir = path.join(remotionDir, 'public');
  const listingsDir = path.join(remotionPublicDir, 'listings');
  // Always render with fixed Remotion listing id
  const remotionListingId = 10317;
  const listingsJsonPath = path.join(listingsDir, `${String(remotionListingId)}.json`);
  const outputsDir = path.resolve(rootDir, 'satarizaevideo', 'outputs');

  try { fs.mkdirSync(outputsDir, { recursive: true }); } catch {}

  // 1) E2E çalıştır (LISTING_ID ile)
  console.log('▶️ Test başlatılıyor... LISTING_ID=%s', listingIdArg);
  execSync('npm run test', {
    stdio: 'inherit',
    env: { ...process.env, LISTING_ID: String(listingIdArg) }
  });

  // 2) Preview başlat (arka planda) - kullanıcı talebi: npm run preview
  console.log('▶️ Preview başlatılıyor...');
  const preview = spawn('npm', ['run', 'preview'], {
    cwd: rootDir,
    stdio: 'inherit',
    env: { ...process.env }
  });

  // Biraz bekle (server ayağa kalksın)
  await new Promise((r) => setTimeout(r, 3000));

  // 3) İlan numarasını JSON'dan çek ve son 5 haneyi hesapla
  let last5 = '00000';
  try {
    const txt = await fsp.readFile(listingsJsonPath, 'utf-8');
    const json = JSON.parse(txt);
    const ln = json?.data?.listing_number ?? json?.listing_number;
    const digits = String(ln ?? '').replace(/\D/g, '');
    if (digits) last5 = digits.slice(-5);
  } catch (e) {
    console.warn('⚠️ JSON okunamadı, varsayılan 00000 kullanılacak:', e?.message);
  }
  // 3.5) Remotion için güncel listing JSON'unu public/listings altına koy
  try {
    await fsp.mkdir(listingsDir, { recursive: true });
    const fixtureListingPref = path.resolve(rootDir, 'tests', 'fixtures', `listing-${String(remotionListingId)}.json`);
    const fixtureListingAlt = path.resolve(rootDir, 'tests', 'fixtures', `${String(remotionListingId)}.json`);
    let src = null;
    try { await fsp.access(fixtureListingPref); src = fixtureListingPref; } catch {}
    if (!src) { try { await fsp.access(fixtureListingAlt); src = fixtureListingAlt; } catch {} }
    if (src) {
      await fsp.copyFile(src, listingsJsonPath);
      console.log('📄 Listing JSON kopyalandı -> %s', listingsJsonPath);
    } else {
      // Son çare: canlı API'den çekmeyi dene
      try {
        const url = `https://www.satariz.com/api/api/v1/listing/${String(remotionListingId)}`;
        const res = await fetch(url);
        if (res.ok) {
          const buf = Buffer.from(await res.arrayBuffer());
          await fsp.writeFile(listingsJsonPath, buf);
          console.log('🌐 Listing JSON API’den indirildi -> %s', listingsJsonPath);
        } else {
          console.warn('⚠️ API yanıtı başarısız: %s %s', res.status, res.statusText);
        }
      } catch (e) {
        console.warn('⚠️ API’den listing çekilemedi:', e?.message);
      }
    }
  } catch (e) {
    console.warn('⚠️ Listing JSON hazırlama adımı atlandı:', e?.message);
  }


  // Choose a unique output filename: base.mp4, base (1).mp4, base (2).mp4, ...
  const makeUniquePath = (dir, baseName, ext) => {
    let candidate = path.join(dir, `${baseName}${ext}`);
    if (!fs.existsSync(candidate)) return candidate;
    let i = 1;
    while (true) {
      const next = path.join(dir, `${baseName} (${i})${ext}`);
      if (!fs.existsSync(next)) return next;
      i += 1;
    }
  };
  const outFile = makeUniquePath(outputsDir, `${last5}`, '.mp4');

  // 4) Render al
  console.log('🎬 Render başlıyor -> %s', outFile);
  const propsJson = JSON.stringify({ listingId: Number(remotionListingId), variant: String(variantArg) });
  execSync(`npx --yes remotion render src/index.jsx ListingVideo "${outFile}" --codec=h264 --overwrite --props='${propsJson}'`, {
    cwd: remotionDir,
    stdio: 'inherit',
    env: { ...process.env }
  });

  console.log('✅ Render tamamlandı:', outFile);

  // İsteğe bağlı: Preview'ı sonlandır
  try {
    preview.kill('SIGINT');
  } catch {}

  // 4.5) Variant'a göre sesi videoya ekle (yeniden kodlama yok)
  try {
    const variantLc = String(variantArg).toLowerCase();
    const audioFile = variantLc === 'bireysel' ? 'satarizsesbireysel.MP3'
      : ((variantLc === 'kurumsal' || variantLc === 'kurumsallogo') ? 'satarizseskurumsal.mp3' : null);
    if (!audioFile) {
      console.log('ℹ️ Mux atlandı (desteklenmeyen variant=%s)', variantArg);
    } else {
      const audioPath = path.join(remotionPublicDir, audioFile);
      try { fs.accessSync(audioPath, fs.constants.R_OK); } catch {
        console.warn('⚠️ Audio bulunamadı, mux adımı atlanıyor:', audioPath);
        throw new Error('skip-mux');
      }
      const outBase = path.basename(outFile, path.extname(outFile));
      const tmpMux = path.join(outputsDir, `${outBase}.tmp.mux.mp4`);
      console.log('🔊 FFmpeg mux başlıyor... (%s)', audioFile);
      const args = [
        '-y', '-hide_banner', '-stats',
        '-i', outFile,
        '-i', audioPath,
        '-map', '0:v:0', '-map', '1:a:0',
        '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart',
        tmpMux
      ];
      const ff = spawnSync('ffmpeg', args, { stdio: 'inherit' });
      if (ff.status !== 0) {
        throw new Error(`ffmpeg failed with code ${ff.status}`);
      }
      fs.renameSync(tmpMux, outFile);
      console.log('✅ FFmpeg mux tamamlandı:', outFile);
    }
  } catch (e) {
    if (e && e.message === 'skip-mux') {
      // no-op
    } else {
      console.warn('⚠️ FFmpeg mux adımı başarısız veya atlandı:', e?.message);
    }
  }

  // Post-render cleanup: remove temporary public copies to avoid stale re-use
  try {
    const pubMp4Stable = path.join(remotionPublicDir, `10317.mp4`);
    const pubMp4ById = path.join(remotionPublicDir, `${String(listingIdArg)}.mp4`);
    const pubJson = path.join(remotionPublicDir, 'listings', `${String(remotionListingId)}.json`);
    // Remove any temporary MP4s written to public
    try { await fsp.unlink(pubMp4Stable); } catch {}
    try { await fsp.unlink(pubMp4ById); } catch {}
    // Remove the temporary JSON used by Remotion
    try { await fsp.unlink(pubJson); } catch {}
    console.log('🧹 Geçici public kopyalar temizlendi.');
  } catch {}

  // Cleanup fixtures JSON so next run always fetches fresh data
  try {
    const fixturesDir = path.resolve(rootDir, 'tests', 'fixtures');
    const stableJson = path.join(fixturesDir, '10317.json');
    const idJson = path.join(fixturesDir, `${String(listingIdArg)}.json`);
    try { await fsp.unlink(stableJson); } catch {}
    try { await fsp.unlink(idJson); } catch {}
    console.log('🧹 Fixtures JSON temizlendi.');
  } catch {}

  // Cleanup test-results videos (.mp4/.webm)
  try {
    const testResultsDir = path.resolve(rootDir, 'test-results');
    const walk = async (dir) => {
      let items = [];
      try { items = await fsp.readdir(dir, { withFileTypes: true }); } catch { return; }
      for (const e of items) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) {
          await walk(p);
        } else if (/\.(mp4|webm)$/i.test(e.name)) {
          try { await fsp.unlink(p); } catch {}
        }
      }
    };
    await walk(testResultsDir);
    console.log('🧹 test-results video dosyaları temizlendi.');
  } catch {}
}

main().catch((e) => {
  console.error('❌ Pipeline hatası:', e);
  process.exit(1);
});


