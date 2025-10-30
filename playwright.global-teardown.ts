import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function* walk(dir: string): Generator<string> {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else yield p;
  }
}

export default async function globalTeardown() {
  const resultsDir = path.resolve('test-results');
  if (!fs.existsSync(resultsDir)) {
    console.warn('⚠️ test-results bulunamadı:', resultsDir);
    return;
  }

  // Prepare Remotion public directories
  const remotionPublicDir = path.resolve('satarizaevideo', 'remotion', 'public');
  const remotionListingsDir = path.join(remotionPublicDir, 'listings');
  try { fs.mkdirSync(remotionPublicDir, { recursive: true }); } catch {}
  try { fs.mkdirSync(remotionListingsDir, { recursive: true }); } catch {}

  const videos: string[] = [];
  for (const file of walk(resultsDir)) {
    const lower = file.toLowerCase();
    if (lower.endsWith('.webm') || lower.endsWith('.mp4')) {
      videos.push(file);
    }
  }

  if (videos.length === 0) {
    console.warn('⚠️ Trimlenecek video bulunamadı. Video ayarın `use.video` = "on" mı?');
    return;
  }

  console.log('🎯 Bulunan videolar:\n' + videos.map(v => ' - ' + v).join('\n'));

  for (const file of videos) {
    const ext = path.extname(file).toLowerCase();      // .webm | .mp4
    const base = file.slice(0, -ext.length);
    const out  = `${base}-trim${ext}`;

    try {
      // Hedef format: MP4 (h264), her durumda mp4 üret
      const mp4Out = `${base}-trim.mp4`;
      if (ext === '.webm') {
        execSync(
          `ffmpeg -y -ss 2.5 -i "${file}" -vf "crop=iw:ih-2:0:0,scale=trunc(iw/2)*2:trunc(ih/2)*2" -c:v libx264 -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 128k "${mp4Out}"`,
          { stdio: 'inherit' }
        );
      } else if (ext === '.mp4') {
        execSync(
          `ffmpeg -y -ss 1.75 -i "${file}" -vf "crop=iw:ih-2:0:0,scale=trunc(iw/2)*2:trunc(ih/2)*2" -c:v libx264 -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 128k "${mp4Out}"`,
          { stdio: 'inherit' }
        );
      } else {
        // Diğer formatlar için de mp4'e dönüştür
        execSync(
          `ffmpeg -y -ss 2.0 -i "${file}" -vf "crop=iw:ih-2:0:0,scale=trunc(iw/2)*2:trunc(ih/2)*2" -c:v libx264 -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 128k "${mp4Out}"`,
          { stdio: 'inherit' }
        );
      }

      // Süreyi 3s'e normalize et (3 saniyeden uzunsa hızlandır)
      try {
        const targetSec = 3;
        const probed = execSync(`ffprobe -v error -show_entries format=duration -of default=nk=1:nw=1 "${mp4Out}"`).toString().trim();
        const duration = Number(probed);
        if (Number.isFinite(duration) && duration > targetSec + 0.05) {
          const speed = duration / targetSec; // >1
          const normOut = `${base}-norm.mp4`;
          // setpts=PTS/speed -> hızlandırır; ses yoksa -an diyerek sadece videoyu hızlandır
          execSync(
            `ffmpeg -y -i "${mp4Out}" -filter:v "setpts=${(1/speed).toFixed(6)}*PTS" -an -c:v libx264 -pix_fmt yuv420p -movflags +faststart "${normOut}"`,
            { stdio: 'inherit' }
          );
          try { fs.unlinkSync(mp4Out); } catch {}
          fs.renameSync(normOut, mp4Out);
          console.log('⏱️  Video 3s’e normalize edildi:', mp4Out);
        }
      } catch (e) {
        console.warn('⚠️ 3s normalize adımı atlandı:', e?.message ?? e);
      }

      const listingId = process.env.LISTING_ID;
      const dir = path.dirname(file);
      const final = listingId ? path.join(dir, `${listingId}.mp4`) : mp4Out;
      if (listingId && mp4Out !== final) {
        try { fs.renameSync(mp4Out, final); } catch {}
      }
      // Orijinal kaynağı kaldır
      try { fs.unlinkSync(file); } catch {}
      console.log('✅ MP4 trim oluşturuldu:', listingId ? final : mp4Out);

      // Copy trimmed MP4 into Remotion public directory for rendering (stable name 10317.mp4)
      try {
        const srcMp4 = listingId ? final : mp4Out;
        const destMp4 = path.join(remotionPublicDir, `10317.mp4`);
        if (fs.existsSync(srcMp4)) {
          const buf = fs.readFileSync(srcMp4);
          fs.writeFileSync(destMp4, buf, { flag: 'w' }); // overwrite/truncate
          console.log('📦 MP4 Remotion public klasörüne yazıldı (override):', destMp4);
        }
      } catch (e) {
        console.warn('⚠️ MP4 Remotion public kopyalama hatası:', e);
      }
    } catch (err) {
      console.error('❌ FFmpeg hatası:', file, err);
    }
  }

  // Also place listing JSON into Remotion public/listings (stable name 10317.json)
  try {
    const listingId = process.env.LISTING_ID;
    const candidates = [
      path.resolve('tests', 'fixtures', '10317.json'),
      ...(listingId ? [path.resolve('tests', 'fixtures', `${listingId}.json`)] : [])
    ];
    const fixturesJson = candidates.find((p) => fs.existsSync(p));
    if (!fixturesJson) {
      console.warn('⚠️ Fixture JSON bulunamadı, atlanıyor. Aranan yollar:', candidates.join(', '));
      return;
    }
    const destJson = path.join(remotionListingsDir, `10317.json`);
    try {
      const txt = fs.readFileSync(fixturesJson, 'utf-8');
      fs.writeFileSync(destJson, txt, { encoding: 'utf-8', flag: 'w' }); // overwrite/truncate
      console.log('📦 JSON Remotion public/listings klasörüne yazıldı (override):', destJson);
    } catch (e) {
      console.warn('⚠️ JSON yazma hatası:', e);
    }
  } catch (e) {
    console.warn('⚠️ JSON Remotion public/listings kopyalama hatası:', e);
  }
}
