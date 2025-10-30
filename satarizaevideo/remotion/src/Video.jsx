import { interpolate, useCurrentFrame, useVideoConfig, spring, Easing, staticFile, OffthreadVideo, Freeze, Sequence, Img, Audio, delayRender, continueRender } from 'remotion';
import Colors from '../../../src/theme/colors.js';
import { useEffect, useMemo, useState } from 'react';

export const Video = ({ listingId, variant = 'bireysel' }) => {
  const [listing, setListing] = useState(null);
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const BASE_WIDTH = 400;
  const BASE_HEIGHT = 700;
  const scalePx = (n) => Math.round(n * Math.min(width / BASE_WIDTH, height / BASE_HEIGHT));
  const appear = spring({ frame, fps, damping: 200, mass: 0.6 });
  const y = interpolate(appear, [0, 1], [20, 0]);

  // Slow close with approach -> slight retreat -> final close, then fade
  const approachFrames = 27;
  const retreatFrames = 15;
  const closeFrames = 10;
  const holdFrames = 15;
  const fadeFrames = 10;

  const approachEnd = approachFrames; // 0..70
  const retreatEnd = approachEnd + retreatFrames; // ..90
  const closeEnd = retreatEnd + closeFrames; // ..130
  const holdEnd = closeEnd + holdFrames; // ..140
  const fadeEnd = holdEnd + fadeFrames; // ..160
  const revealFrames = 20;
  const bannerInFrames = 12;
  const bannerFontSize = scalePx(32); // Scaled font size for SATILIK text
  const introImageSeconds = 3;
  const introImageFrames = Math.round(introImageSeconds * 28);
  // Intro delay before guillotine starts
  const introDelayFrames = Math.round(1 * fps);
  // End curtain timings (orange slides in from right, then exits left)
  const endCurtainInFrames = 6;
  const endCurtainOutFrames = 6;
  // Fix end curtain start to a constant mid-scene length after reveal,
  // so extending total duration adds time at the END, not before curtain.
  const midSceneDurationFrames = Math.round(3.8 * fps); // after white reveal
  const endStart = closeEnd + revealFrames + midSceneDurationFrames;
  const endTotalFrames = endCurtainInFrames + endCurtainOutFrames;
  // Badge display after curtain completes
  const endBadgeFrom = endStart + endTotalFrames;
  const endBadgeTo = endBadgeFrom + Math.round(3.5 * fps);
  // Final fade of end-screen overlays to white, then show bottom info row
  const finalFadeStart = endBadgeFrom + Math.round(2 * fps); // last 1s window
  const ilanStart = endBadgeFrom + Math.round(2.8 * fps); // show Ilan No later
  const ilanEnd = Math.min(durationInFrames, ilanStart + Math.round(4.8 * fps)); // keep Ilan No for 4s
  // For final freeze duration: keep video frozen until black guillotine fully closes
  const endGuillotineTotalFrames = approachFrames + retreatFrames + closeFrames;
  const finalFreezeTo = Math.min(durationInFrames, ilanEnd + endGuillotineTotalFrames);
  const playDurationFrames = Math.max(0, ilanEnd - ilanStart);
  const freezeHoldFrames = Math.max(0, finalFreezeTo - ilanEnd);
  // Crossfade between playing video and freeze to avoid pop
  const crossfadeFrames = Math.min(3, Math.max(1, Math.round(0.01 * fps)));
  // Logo slide-in after black guillotine
  const blackLogoStart = ilanEnd + endGuillotineTotalFrames;
  const blackLogoInFrames = 12;
  const finalFadeOpacity = interpolate(
    frame,
    [finalFadeStart, endBadgeTo],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) }
  );
  // Mid-entry animation for existing end-stage elements (bar/title/chips/list)
  const midEntryProgress = interpolate(
    frame,
    [endStart + endTotalFrames / 2, endStart + endTotalFrames],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) }
  );
  const midEntryShiftX = Math.round(-width * (1 - midEntryProgress));
  // End logo timing: appear at the MIDDLE of the curtain animation
  const endLogoLeadFrames = 0; // unused in middle-timing
  const endLogoDurationFrames = Math.round(3 * fps);
  const endLogoFrom = Math.max(0, endStart + Math.round(endTotalFrames / 2));
  const endLogoTo = Math.min(durationInFrames, endLogoFrom + endLogoDurationFrames);
  const headlineSeconds = 2.9;
  const headlineFrames = Math.round(headlineSeconds * fps);
  const bireyselVoiceSeconds = 21;
  const bireyselVoiceFrames = Math.round(bireyselVoiceSeconds * fps);
  // Fade-out timing for current scene (mid-curtain)
  const contentFadeStart = endStart + endTotalFrames / 2;
  const contentOpacity = interpolate(
    frame,
    [contentFadeStart, endStart + endTotalFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) }
  );

  // Monotonic animation progress for approach -> retreat -> close (starts after introDelay)
  const animFrame = Math.max(0, frame - introDelayFrames);
  const animProgress = Math.min(Math.max(animFrame / closeEnd, 0), 1);

  const overlayOpacity = 1 - interpolate(
    frame,
    [holdEnd, fadeEnd],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad) }
  );

  // White circular reveal starting after introDelay + close
  const revealProgress = interpolate(
    frame,
    [introDelayFrames + closeEnd, introDelayFrames + closeEnd + revealFrames],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) }
  );
  const maxRadius = Math.ceil(Math.sqrt((width / 2) ** 2 + (height / 2) ** 2));
  const circleSize = maxRadius * 2;

  const orange = (Colors && Colors.primary) ? Colors.primary : '#FF4800';
  const isKurumsal = ['kurumsal', 'kurumsallogo'].includes(String(variant).toLowerCase());
  // Corporate variant: extend end window so centered video can play longer
  const ilanEndKurumsal = isKurumsal
    ? Math.min(durationInFrames, ilanEnd + Math.round(9 * fps))
    : ilanEnd;
  const sideSizeBase = Math.ceil(Math.sqrt(width * width + height * height)) + scalePx(400);
  const sideSize = Math.round(sideSizeBase); // half size
  const centerX = Math.round((width - sideSize) / 2);
  const seamY = height / 2;
  const tipOffset = sideSize * Math.SQRT1_2; // sideSize / sqrt(2)
  // Corner contact positions (tip at seam)
  const tlCornerY = Math.round(seamY - tipOffset - sideSize / 2);
  const brCornerY = Math.round(seamY + tipOffset - sideSize / 2);
  // Edge contact positions (edges meet at seam)
  const edgeOffset = sideSize / (1.32 * Math.SQRT2); // sideSize/(2√2)
  const tlEdgeY = Math.round(seamY - edgeOffset - sideSize / 2);
  const brEdgeY = Math.round(seamY + edgeOffset - sideSize / 2);
  // How close the first approach gets: 0 = corner, 1 = edge
  const approachCloseness = 0.4;
  const tlApproachY = Math.round(tlCornerY + (tlEdgeY - tlCornerY) * approachCloseness);
  const brApproachY = Math.round(brCornerY + (brEdgeY - brCornerY) * approachCloseness);
  // Small retreat amount after corner touch
  const retreatPx = scalePx(30);

  // Vertical-only motion; stop when edges touch (no overlap)
  const xOffset = isKurumsal
    ? interpolate(
        frame,
        [0, Math.min(introDelayFrames, Math.round(0.4 * fps))],
        [-scalePx(-350), -scalePx(150)],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) }
      )
    : -scalePx(150);
  const tlX = centerX - xOffset;
  const tlY = interpolate(animProgress, [0, approachFrames / closeEnd, (approachFrames + retreatFrames) / closeEnd, 1], [-sideSize, tlApproachY, tlApproachY - retreatPx, tlEdgeY], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)
  });
  const brX = centerX + xOffset;
  const brY = interpolate(animProgress, [0, approachFrames / closeEnd, (approachFrames + retreatFrames) / closeEnd, 1], [height, brApproachY, brApproachY + retreatPx, brEdgeY], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)
  });
  const badgeRightPx = -scalePx(60);  // istediğin kadar küçük
  const badgeBottomPx = -scalePx(60);

  // Load listing JSON from public/listings/{listingId}.json using Remotion's delay/continue pattern
  useEffect(() => {
    const handle = delayRender('load-listing-json');
    let cancelled = false;
    const url = staticFile(`listings/${listingId}.json`);
    (async () => {
      try {
        const r = await fetch(url);
        const d = await r.json();
        if (cancelled) return;
        setListing(d?.data ?? d ?? null);
      } catch (_e) {
        if (!cancelled) setListing(null);
      } finally {
        if (!cancelled) continueRender(handle);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listingId]);

  const locationText = useMemo(() => {
    if (!listing) return null;
    const parts = listing.location_parts || listing.locationParts || [listing.province?.name, listing.district?.name, listing.neighbourhood?.name].filter(Boolean);
    if (!parts || !Array.isArray(parts) || parts.length === 0) return null;
    const normalizedParts = parts.map((p) => {
      const s = String(p ?? '').trim();
      if (!s) return s;
      return s.replace(/\bmah\.?\b/gi, 'Mah.');
    });
    return normalizedParts.join(', ');
  }, [listing]);

  const { chips, detailItems, ilanNo } = useMemo(() => {
    const formatNum = new Intl.NumberFormat('tr-TR');
    const getAttr = (substr) => {
      const attrs = listing?.attributes;
      if (!Array.isArray(attrs)) return null;
      return attrs.find((a) => typeof a.attribute_name === 'string' && a.attribute_name.toLowerCase().includes(substr.toLowerCase())) || null;
    };
    const getAttrAny = (substrings, opts = {}) => {
      const attrs = listing?.attributes;
      if (!Array.isArray(attrs)) return null;
      const subs = substrings.map((s) => s.toLowerCase());
      const excludes = (opts.exclude || []).map((s) => s.toLowerCase());
      return attrs.find((a) => {
        const name = (a?.attribute_name || '').toLowerCase();
        if (excludes.some((e) => name.includes(e))) return false;
        return subs.some((s) => name.includes(s));
      }) || null;
    };
    const val = (a) => a?.attribute_value_name ?? a?.attribute_value ?? null;
    const truthy = (v) => {
      const s = String(v ?? '').toLowerCase();
      return v === true || ['var', 'mevcut', 'evet', 'true', '1', 'yes'].some((k) => s.includes(k));
    };

    const kmAttr = getAttr('KM');
    let kmText = null;
    const kmRaw = val(kmAttr);
    if (kmRaw != null) {
      const kmNum = Number(String(kmRaw).replace(/[^\d]/g, ''));
      kmText = `${formatNum.format(Number.isNaN(kmNum) ? Number(kmRaw) : kmNum)} KM`;
    }

    const yilAttr = getAttr('Yıl');
    const modelText = val(yilAttr);

    const vitesAttr = getAttr('Vites');
    const vitesText = val(vitesAttr);

    const kasaAttr = getAttr('Kasa Tipi');
    const kasaBase = val(kasaAttr);
    const kasaText = kasaBase ? `${kasaBase} Kasa` : null;

    const yakitAttr = getAttr('Yakıt');
    const yakitText = val(yakitAttr);

    const cekisAttr = getAttr('Çekiş');
    const cekisText = val(cekisAttr);

    const motorAttr = getAttr('Motor Gücü');
    const motorVal = val(motorAttr);
    const motorValNorm = motorVal != null ? String(motorVal).replace(/\bhp\b/gi, 'HP') : null;
    const motorText = motorValNorm ? `Motor Gücü: ${motorValNorm}` : null;

    // Detect Minibüs by attribute or category
    const aracTuruAttr = getAttrAny([
      'Araç Türü', 'Arac Türü', 'Araç Tipi', 'Arac Tipi',
      'Taşıt Türü', 'Tasit Türü', 'Taşıt Tipi', 'Tasit Tipi',
      'Araç Segmenti', 'Arac Segmenti'
    ]);
    const aracTuruVal = val(aracTuruAttr);
    const isMinibus = (() => {
      const valStr = String(aracTuruVal || '').toLowerCase();
      const byAttr = valStr.includes('minib');
      const cats = listing?.category_parents;
      const byCat = Array.isArray(cats) && cats.some((c) => {
        const t = String(c?.title ?? '').toLowerCase();
        const s = String(c?.slug ?? '').toLowerCase();
        return t.includes('minib') || s.includes('minib');
      });
      return byAttr || byCat;
    })();

    // Seats for Minibüs
    const koltukAttr = getAttrAny(['Koltuk Sayısı', 'Koltuk Sayisi', 'Koltuk']);
    const koltukVal = val(koltukAttr);
    const koltukText = koltukVal != null ? `Koltuk Sayısı: ${koltukVal}` : null;

    // Detect Otobüs by attribute or category
    const isBus = (() => {
      const aracTuruStr = String(aracTuruVal || '').toLowerCase();
      const byAttr = /otob|otobüs|otobus/.test(aracTuruStr);
      const cats = listing?.category_parents;
      const byCat = Array.isArray(cats) && cats.some((c) => {
        const t = String(c?.title ?? '').toLowerCase();
        const s = String(c?.slug ?? '').toLowerCase();
        return /otob|otobüs|otobus/.test(t) || /otob|otobüs|otobus/.test(s);
      });
      return byAttr || byCat;
    })();

    // Bus-specific attributes
    const yolcuKapasitesiAttr = getAttrAny(['Yolcu Kapasitesi', 'Yolcu Kapasitesi (Kişi)', 'Yolcu Kap.', 'Kapasite']);
    const yolcuKapasitesiVal = val(yolcuKapasitesiAttr);
    const yolcuKapasitesiText = yolcuKapasitesiVal != null ? `Yolcu Kapasitesi: ${yolcuKapasitesiVal}` : null;

    const vitesSayisiAttr = getAttrAny(['Vites Sayısı', 'Vites Sayisi', 'Vites Adedi', 'Vites (Adet)']);
    const vitesSayisiVal = val(vitesSayisiAttr);
    const vitesSayisiText = vitesSayisiVal != null ? `${vitesSayisiVal} Vites` : null;

    const koltukDuzeniAttr = getAttrAny(['Koltuk Düzeni', 'Koltuk Duzeni', 'Koltuk Düzen']);
    const koltukDuzeniVal = val(koltukDuzeniAttr);
    const koltukDuzeniText = koltukDuzeniVal != null ? `Koltuk Düzeni: ${koltukDuzeniVal}` : null;

    const yakitHacmiAttr = getAttrAny(['Yakıt Hacmi', 'Yakit Hacmi', 'Depo Hacmi', 'Depo Kapasitesi', 'Yakıt Depo Kapasitesi', 'Yakit Depo Kapasitesi']);
    const yakitHacmiVal = val(yakitHacmiAttr);
    const yakitHacmiText = yakitHacmiVal != null ? `Yakıt Hacmi (Litre): ${yakitHacmiVal}` : null;

    // Detect motorcycle based on category titles/slugs containing 'moto'
    const isMotorcycle = (() => {
      const cats = listing?.category_parents;
      if (!Array.isArray(cats)) return false;
      return cats.some((c) => {
        const t = String(c?.title ?? '').toLowerCase();
        const s = String(c?.slug ?? '').toLowerCase();
        return t.includes('moto') || s.includes('moto');
      });
    })();

    // Detect housing (konut)
    const isHousing = (() => {
      const cats = listing?.category_parents;
      if (!Array.isArray(cats)) return false;
      return cats.some((c) => {
        const t = String(c?.title ?? '').toLowerCase();
        const s = String(c?.slug ?? '').toLowerCase();
        return t.includes('konut') || s.includes('konut') || t.includes('emlak') || s.includes('emlak');
      });
    })();

    // Detect land (toprak / arsa / tarla / arazi)
    const isLand = (() => {
      const cats = listing?.category_parents;
      if (!Array.isArray(cats)) return false;
      return cats.some((c) => {
        const t = String(c?.title ?? '').toLowerCase();
        const s = String(c?.slug ?? '').toLowerCase();
        return (
          t.includes('toprak') || s.includes('toprak') ||
          t.includes('arsa') || s.includes('arsa') ||
          t.includes('tarla') || s.includes('tarla') ||
          t.includes('arazi') || s.includes('arazi')
        );
      });
    })();

    // Motorcycle-specific attributes
    const silindirAttr = getAttrAny(['Silindir', 'Silindir Sayısı']);
    const silindirText = val(silindirAttr);

    const zamanlamaAttr = getAttrAny(['Zamanlama']);
    const zamanlamaText = val(zamanlamaAttr);

    const tipiAttr = getAttrAny(['Motor Tipi', 'Tipi'], { exclude: ['Kasa'] });
    const tipiText = val(tipiAttr);

    // Housing-specific attributes
    const brutM2Attr = getAttrAny(['Brüt', 'Brut', 'Metrekare', 'm2', 'm²']);
    const brutM2Val = val(brutM2Attr);
    let brutM2Text = null;
    if (brutM2Val != null) {
      const hasUnit = /m\s?²|m2|metrekare/i.test(String(brutM2Val));
      brutM2Text = hasUnit ? String(brutM2Val) : `${brutM2Val} m²`;
    }
    const katAttr = getAttrAny(['Bulunduğu Kat', 'Bulundugu Kat', 'Kat'], { exclude: ['Kat Sayısı', 'Kat Sayisi'] });
    const katText = val(katAttr);
    const katSayisiAttr = getAttrAny(['Kat Sayısı', 'Kat Sayisi', 'Bina Kat Sayısı', 'Bina Kat Sayisi']);
    const katSayisiVal = val(katSayisiAttr);
    const parseIntFrom = (v) => {
      const m = String(v ?? '').match(/\d+/);
      return m ? parseInt(m[0], 10) : null;
    };
    const bulKatNum = parseIntFrom(katText);
    const katSayiNum = parseIntFrom(katSayisiVal);
    // Format middle housing chip: convert numeric to "N. Kat" if needed
    const formattedKatText = (() => {
      if (!katText) return null;
      const s = String(katText).trim();
      if (/kat/i.test(s)) return s;
      const m = s.match(/\d+/);
      if (m) {
        const n = parseInt(m[0], 10);
        if (!Number.isNaN(n)) return `${n}. Kat`;
      }
      return s;
    })();
    const katPositionText = (() => {
      if (bulKatNum == null || katSayiNum == null) return null;
      if (bulKatNum < katSayiNum) return 'Ara Kat';
      if (bulKatNum === katSayiNum) return 'Son Kat';
      return null;
    })();
    const odaAttr = getAttrAny(['Oda Sayısı', 'Oda Sayisi', 'Oda']);
    const odaText = val(odaAttr);

    const isitmaAttr = getAttrAny(['Isıtma', 'Isitma']);
    const isitmaText = val(isitmaAttr);
    const mutfakAttr = getAttrAny(['Mutfak Tipi', 'Mutfak']);
    const mutfakBase = val(mutfakAttr);
    const mutfakText = mutfakBase
      ? (/\bmutfak\b/i.test(String(mutfakBase)) ? String(mutfakBase) : `${mutfakBase} Mutfak`)
      : null;
    const asansorAttr = getAttrAny(['Asansör', 'Asansor']);
    const asansorVal = val(asansorAttr);
    const cepheAttr = getAttrAny(['Cephe']);
    const cepheText = val(cepheAttr);
    const otoparkAttr = getAttrAny(['Otopark']);
    const otoparkVal = val(otoparkAttr);
    const tapuAttr = getAttrAny(['Tapu', 'Tapu Durumu']);
    const tapuText = val(tapuAttr);

    let detailsForVehicle = null;
    if (isBus) {
      // Bus ordering: 1) Yolcu Kapasitesi, 2) `${vitesSayisi} Vites`, 3) Koltuk Düzeni, 4) Yakıt Hacmi (Litre)
      detailsForVehicle = [
        yolcuKapasitesiText,
        vitesSayisiText,
        koltukDuzeniText,
        yakitHacmiText,
      ].filter(Boolean);
    } else if (isMinibus) {
      const baseNonMotor = [kasaText, yakitText, cekisText].filter(Boolean);
      detailsForVehicle = baseNonMotor.slice(0, 2);
      if (koltukText) {
        detailsForVehicle.push(koltukText); // 3rd item: seats
      } else if (baseNonMotor.length > 2) {
        detailsForVehicle.push(baseNonMotor[2]);
      }
      if (motorText) {
        detailsForVehicle.push(motorText); // 4th item: motor power
      }
    } else {
      detailsForVehicle = [kasaText, yakitText, cekisText, motorText].filter(Boolean);
    }
    const detailsForMotorcycle = [motorText, silindirText, zamanlamaText, tipiText].filter(Boolean);
    const detailsForHousing = [
      isitmaText,
      mutfakText,
      truthy(asansorVal) ? 'Asansörlü' : (cepheText || katPositionText),
      truthy(otoparkVal) ? 'Otopark Mevcut' : tapuText,
    ].filter(Boolean);

    // Land-specific attributes and mapping
    const alanAttr = getAttrAny(['Arsa Alanı', 'Alan', 'Metrekare', 'm2', 'm²', 'Parsel']);
    const alanVal = val(alanAttr);
    let m2Text = null;
    if (alanVal != null) {
      const hasUnit = /m\s?²|m2|metrekare/i.test(String(alanVal));
      m2Text = hasUnit ? String(alanVal) : `${alanVal} m²`;
    }
    const m2FiyatiAttr = getAttrAny(['m2 Fiyatı', 'm² Fiyatı', 'Birim Fiyat', 'm2 Birim Fiyatı', 'm² Birim Fiyatı']);
    const m2FiyatiVal = val(m2FiyatiAttr);
    const m2FiyatiText = m2FiyatiVal != null ? `m² Fiyatı: ${m2FiyatiVal}` : null;
    const imarAttr = getAttrAny(['İmar Durumu', 'Imar Durumu', 'İmar', 'Imar']);
    const imarVal = val(imarAttr);
    const gabariAttr = getAttrAny(['Gabari']);
    const gabariVal = val(gabariAttr);
    const emsalAttr = getAttrAny(['Emsal', 'Kaks']);
    const emsalVal = val(emsalAttr);
    // Land type from categories or attributes
    const landType = (() => {
      const text = [
        ...(Array.isArray(listing?.category_parents) ? listing.category_parents.map((c) => `${c?.title ?? ''} ${c?.slug ?? ''}`) : []),
        String(val(getAttrAny(['Taşınmaz Türü', 'Gayrimenkul Türü', 'Tür', 'Tip'])) || '')
      ].join(' ').toLowerCase();
      if (/(^|\s)arsa(\s|$)/.test(text)) return 'Arsa';
      if (/(^|\s)tarla(\s|$)/.test(text)) return 'Tarla';
      if (/(^|\s)icar(\s|$)/.test(text)) return 'İcar';
      if (text.includes('kat karşı') || text.includes('kat kars')) return 'Kat Karşılığı';
      return null;
    })();
    const detailsForLand = [
      imarVal != null ? `İmar Durumu: ${imarVal}` : null,
      gabariVal != null ? `Gabari: ${gabariVal}` : null,
      emsalVal != null ? `Emsal: ${emsalVal}` : null,
      tapuText,
    ].filter(Boolean);

    return {
      chips: isLand
        ? [m2Text, m2FiyatiText, landType].filter(Boolean)
        : isHousing
          ? [brutM2Text, formattedKatText, odaText].filter(Boolean)
          : [kmText, modelText, vitesText].filter(Boolean),
      detailItems: isLand
        ? detailsForLand
        : isMotorcycle
          ? detailsForMotorcycle
          : (isHousing ? detailsForHousing : detailsForVehicle),
      ilanNo: listing?.listing_number ?? null,
    };
  }, [listing]);

  const storeFullName = useMemo(() => {
    if (!listing) return null;
    const candidates = [
      listing?.store?.name,
      listing?.corporate?.name,
      listing?.publisher?.store_name,
      listing?.publisher?.name,
      listing?.user?.store_name,
      listing?.user?.company_name,
      listing?.corporate_name,
      listing?.store_name,
      listing?.storeName,
      listing?.company_name,
      listing?.companyName,
    ];
    for (const c of candidates) {
      const s = (c == null ? '' : String(c)).trim();
      if (s) return s;
    }
    // Recursive fallback: search for likely keys
    const seen = new Set();
    const keyRegex = /(store.?name|corporate.?name|company.?name|office.?name|emlak)/i;
    const findString = (obj, depth = 0) => {
      if (!obj || typeof obj !== 'object' || depth > 4) return null;
      if (seen.has(obj)) return null;
      seen.add(obj);
      for (const k of Object.keys(obj)) {
        const v = obj[k];
        if (v && typeof v === 'string' && keyRegex.test(k)) {
          const s = v.trim();
          if (s) return s;
        }
      }
      for (const k of Object.keys(obj)) {
        const v = obj[k];
        if (v && typeof v === 'object') {
          const hit = findString(v, depth + 1);
          if (hit) return hit;
        }
      }
      return null;
    };
    return findString(listing);
  }, [listing]);

  // Corporate logo variant handling
  const DEFAULT_CORP_LOGO_URL = 'https://www.satariz.com/inc/profile-default.png';
  const requestedKurumsalLogo = String(variant).toLowerCase() === 'kurumsallogo';
  const corporateLogoUrl = useMemo(() => {
    const candidates = [
      listing?.corporate?.logo,
      listing?.corporate_logo,
      listing?.corporate?.logo_url,
      listing?.corporate?.logoUrl,
      listing?.corporate?.image,
      listing?.corporate?.image_url,
      listing?.corporate?.imageUrl,
    ];
    for (const c of candidates) {
      const s = (c == null ? '' : String(c)).trim();
      if (s) return s;
    }
    return null;
  }, [listing]);
  const isKurumsalLogo = requestedKurumsalLogo && !!corporateLogoUrl && corporateLogoUrl !== DEFAULT_CORP_LOGO_URL;

  return (
    <div style={{
      width, height,
      backgroundColor: revealProgress < 1 ? '#F7F8FA' : '#fff',
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center',
      position: 'relative',
    }}>
      {/* Bireysel ses: videonun başından 21 saniye boyunca */}
      
      {/* Guillotine Intro Overlay - show only during reveal */}
      {revealProgress < 1 && (
        <div style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 10,
        }}>
          {/* Top-left box moving diagonally to center (under) */}
          <div style={{
            position: 'absolute',
            left: 0,
            top: 0,
            transform: `translate(${Math.round(tlX)}px, ${Math.round(tlY)}px)`,
            zIndex: 1
          }}>
            <div style={{
              width: sideSize,
              height: sideSize,
              backgroundColor: isKurumsal ? '#000' : orange,
              transform: 'rotate(-13.3deg)'
            }} />
          </div>
          {/* Bottom-right box moving diagonally to center (over) */}
          <div style={{
            position: 'absolute',
            left: 0,
            top: 0,
            transform: `translate(${Math.round(brX)}px, ${Math.round(brY)}px)`,
            zIndex: 1
          }}>
            <div style={{
              width: sideSize,
              height: sideSize,
              backgroundColor: orange,
              transform: 'rotate(-13.3deg)'
            }} />
          </div>
        </div>
      )}
      {/* Intro image overlay for first 3s (bireysel only) */}
      {!isKurumsal && frame < introImageFrames && (
        <div style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 0,
          pointerEvents: 'none',
          width,
          height,
        }}>
          <Img
            src={staticFile('gritiklama-removebg-preview.png')}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain'
            }}
          />
        </div>
      )}
      {/* Headline text for first 2s */}
      {frame < headlineFrames && (
        <div style={{
          position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
          zIndex: 6, pointerEvents: 'none', textAlign: 'center'
        }}>
          {isKurumsal ? (
            <>
              {(() => {
                if (isKurumsalLogo) {
                  return (
                    <Img
                      src={corporateLogoUrl}
                      style={{ width: Math.round(width * 0.6), height: 'auto' }}
                    />
                  );
                }
                const full = (storeFullName || '').trim();
                if (!full) {
                  return (
                    <>
                      <div style={{ color: orange, fontFamily: "'Product Sans Bold', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif", fontWeight: 700, fontSize: scalePx(36), lineHeight: 1.1, WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale', textRendering: 'optimizeLegibility' }}>KURUMSAL</div>
                      <div style={{ color: orange, fontFamily: "'Product Sans Bold', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif", fontWeight: 700, fontSize: scalePx(36), lineHeight: 1.1, WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale', textRendering: 'optimizeLegibility' }}></div>
                      <div style={{ color: orange, fontFamily: "'Product Sans Bold', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif", fontWeight: 700, fontSize: scalePx(36), lineHeight: 1.1, WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale', textRendering: 'optimizeLegibility' }}></div>
                    </>
                  );
                }
                const parts = full.split(/\s+/);
                const first = parts[0] || '';
                const rest = parts.length > 1 ? parts.slice(1).join(' ') : '';
                return (
                  <>
                    <div style={{ color: orange, fontFamily: "'Product Sans Bold', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif", fontWeight: 700, fontSize: scalePx(36), lineHeight: 1.1, WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale', textRendering: 'optimizeLegibility' }}>{first}</div>
                    <div style={{ color: orange, fontFamily: "'Product Sans Bold', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif", fontWeight: 700, fontSize: scalePx(36), lineHeight: 1.1, WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale', textRendering: 'optimizeLegibility' }}>{rest}</div>
                    <div style={{ color: orange, fontFamily: "'Product Sans Bold', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif", fontWeight: 700, fontSize: scalePx(36), lineHeight: 1.1, WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale', textRendering: 'optimizeLegibility' }}></div>
                  </>
                );
              })()}
            </>
          ) : (
            <>
              <div style={{ color: orange, fontFamily: "'Product Sans Bold','Sansation', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif", fontWeight: 900, fontSize: scalePx(36), lineHeight: 1.1, WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale', textRendering: 'optimizeLegibility' }}>BİREYSEL</div>
              <div style={{ color: orange, fontFamily: "'Product Sans Bold','Sansation', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif", fontWeight: 900, fontSize: scalePx(36), lineHeight: 1.1, WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale', textRendering: 'optimizeLegibility' }}>KULLANICIDAN</div>
              <div style={{ color: orange, fontFamily: "'Product Sans Bold','Sansation', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif", fontWeight: 900, fontSize: scalePx(36), lineHeight: 1.1, WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale', textRendering: 'optimizeLegibility' }}>SATILIK</div>
            </>
          )}
        </div>
      )}
      {/* White circular reveal (only while revealing) */}
      {revealProgress < 1 && (
        <div style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: circleSize,
          height: circleSize,
          backgroundColor: '#fff',
          borderRadius: '50%',
          transform: `translate(-50%, -50%) scale(${Math.max(0.001, revealProgress)})`,
          transformOrigin: 'center',
          zIndex: 12,
          pointerEvents: 'none'
        }} />
      )}

      {/* Bottom-right badge on white screen for 3s after curtain */}
      {frame >= endBadgeFrom && frame < endBadgeTo && (() => {
        const revealFrames = Math.round(0.8 * fps);
        const p = interpolate(
          frame,
          [endBadgeFrom, endBadgeFrom + revealFrames],
          [0, 1],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) }
        );
        const rightInsetPct = Math.max(0, Math.min(100, Math.round((1 - p) * 100)));
        const clip = `inset(0% ${rightInsetPct}% 0% 0%)`;
        return (
          <Img
            src={staticFile('gritiklama-removebg-preview.png')}
            style={{
              position: 'absolute',
              right: badgeRightPx,
              bottom: badgeBottomPx,
              width: Math.round(width * 1),
              height: 'auto',
              zIndex: 2,
              opacity: finalFadeOpacity,
              clipPath: clip,
              WebkitClipPath: clip,
              pointerEvents: 'none'
            }}
          />
        );
      })()}

      {/* End screen (1.2s): Bottom-right anchored diagonal reveal towards center */}
      {(() => {
        const start = endBadgeFrom + Math.round(2 * fps);
        const end = Math.min(endBadgeTo, start + Math.round(0.3 * fps));
        if (frame < start || frame >= endBadgeTo) return null;
        const p = interpolate(frame, [start, end], [0, 1], {
          extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)
        });
        const scale = Math.max(0.1, p);
        const opacity = interpolate(p, [0, 0.1, 1], [0, 1, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        return (
          <div style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: width,
            height: height,
            transformOrigin: '100% 100%', // stick to bottom-right
            transform: `translate(${+scalePx(250) * p}px, ${+scalePx(425) * p}px) scale(${scale}) `,
            opacity: opacity * finalFadeOpacity,
            zIndex: 5,
            pointerEvents: 'none'
          }}>
            <Img src={staticFile('sektorunrengidegisiyor-removebg-preview.png')} style={{ width: '60%', height: '60%', objectFit: 'contain', transform: 'rotate(0deg)' }} />
          </div>
        );
      })()}

      {/* End logo: appears slightly before curtain completes and stays for 3s */}
      {frame >= endLogoFrom && frame < endLogoTo && (
        <>
          {/* Logo */}
          <div style={{
            position: 'absolute', left: '50%', top: 0,
            transform: 'translateX(-50%) translateY(-10%)', zIndex: 19, pointerEvents: 'none'
          }}>
            <Img
              src={staticFile('beyazsatariz-removebg-preview.png')}
              style={{ width: Math.round(width * 0.6), height: 'auto' }}
            />
          </div>
          {/* Orange bar under logo, independently positioned */}
          {(() => {
            const barTop = Math.round(height * 0.22);
            const barHeight = Math.max(scalePx(6), Math.round(height * 0.04));
            const endElementsRevealFrames = Math.round(0.8 * fps);
            const pLoc = interpolate(
              frame,
              [endLogoFrom, endLogoFrom + endElementsRevealFrames],
              [0, 1],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) }
            );
            const rightInsetLoc = Math.max(0, Math.min(100, Math.round((1 - pLoc) * 100)));
            const clipLoc = `inset(0% ${rightInsetLoc}% 0% 0%)`;
            return (
              <>
                <div style={{
                  position: 'absolute', left: 0, top: barTop,
                  width: width,
                  height: barHeight,
                  backgroundColor: isKurumsal ? '#000' : orange,
                  borderRadius: scalePx(3),
                  zIndex: 18,
                  transform: `translateX(${midEntryShiftX}px)`,
                  pointerEvents: 'none'
                }} />
                {/* Location text inside the orange bar */}
                <div style={{
                  position: 'absolute', left: 0, top: barTop,
                  width,
                  height: barHeight,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff',
                  fontFamily: "'Product Sans','Sansation', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
                  fontWeight: 600,
                  fontSize: Math.max(scalePx(12), Math.round(height * 0.024)),
                  lineHeight: 1,
                  zIndex: 19,
                  transform: `translateX(${midEntryShiftX}px)`,
                  clipPath: clipLoc,
                  WebkitClipPath: clipLoc,
                  pointerEvents: 'none'
                }}>
                  {locationText || ''}
                </div>
                {/* SATILIK text below the orange bar */}
                <div style={{
                  marginTop: scalePx(15),
                  position: 'absolute', left: 0, top: barTop + barHeight + 8,
                  // scale the 8px offset too
                  top: barTop + barHeight + scalePx(8),
                  width,
                  textAlign: 'center',
                  color: isKurumsal ? orange : '#000',
                  fontFamily: "'Product Sans Bold', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
                  fontWeight: 700,
                  fontSize: Math.round(height * 0.05),
                  lineHeight: 1,
                  zIndex: 19,
                  transform: `translateX(${midEntryShiftX}px)`,
                  pointerEvents: 'none'
                }}>
                  SATILIK
                </div>
                {/* Feature chips under SATILIK */}
                <div style={{
                  position: 'absolute', left: 0,
                  top: barTop + barHeight + scalePx(8) + Math.round(height * 0.05) + scalePx(40),
                  width,
                  display: 'flex',
                  justifyContent: 'space-evenly',
                  alignItems: 'center',
                  zIndex: 19,
                  transform: `translateX(${midEntryShiftX}px)`,
                  pointerEvents: 'none'
                }}>
                  {(chips?.length ? chips : []).map((label, idx) => {
                    const chipDelay = Math.round(0.1 * fps) * idx;
                    const pChip = interpolate(
                      frame,
                      [endLogoFrom + chipDelay, endLogoFrom + chipDelay + endElementsRevealFrames],
                      [0, 1],
                      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) }
                    );
                    const rightInsetChip = Math.max(0, Math.min(100, Math.round((1 - pChip) * 100)));
                    const clipChip = `inset(0% ${rightInsetChip}% 0% 0%)`;
                    return (
                      <div key={idx} style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                        <div style={{
                          backgroundColor: orange,
                          color: '#fff',
                          padding: `${scalePx(6)}px ${scalePx(10)}px`,
                          borderRadius: scalePx(10),
                          fontFamily: "'Product Sans','Sansation', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
                          fontWeight: 700,
                          fontSize: Math.max(scalePx(12), Math.round(height * 0.025)),
                          lineHeight: 1,
                          whiteSpace: 'nowrap',
                          clipPath: clipChip,
                          WebkitClipPath: clipChip
                        }}>
                          {label}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Black details list under chips */}
                {(() => {
                  const chipsTop = barTop + barHeight + scalePx(8) + Math.round(height * 0.05) + scalePx(40);
                  const chipLineH = Math.max(scalePx(12), Math.round(height * 0.025)) + scalePx(12); // font + vertical padding
                  const listTop = chipsTop + chipLineH + scalePx(40);
                  const items = detailItems?.length ? detailItems : [];
                  return (
                    <div style={{
                      position: 'absolute', left: 0, top: listTop,
                      width,
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      gap: scalePx(6),
                      zIndex: 19, pointerEvents: 'none', transform: `translateX(${midEntryShiftX}px)`
                    }}>
                      {items.map((t, i) => {
                        const itemDelay = Math.round(0.12 * fps) * i;
                        const pItem = interpolate(
                          frame,
                          [endLogoFrom + itemDelay, endLogoFrom + itemDelay + endElementsRevealFrames],
                          [0, 1],
                          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) }
                        );
                        const rightInsetItem = Math.max(0, Math.min(100, Math.round((1 - pItem) * 100)));
                        const clipItem = `inset(0% ${rightInsetItem}% 0% 0%)`;
                        return (
                          <div key={i} style={{
                            color: '#000',
                            fontFamily: "'Product Sans Bold', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
                            fontWeight: 600,
                            fontSize: Math.max(scalePx(12), Math.round(height * 0.035)),
                            lineHeight: 1.2,
                            clipPath: clipItem,
                            WebkitClipPath: clipItem
                          }}>{t}</div>
                        );
                      })}
                    </div>
                  );
                })()}
              </>
            );
          })()}
        </>
      )}

      {/* SATILIK banner - slides in from right after reveal */}
      {revealProgress >= 1 && (
        (() => {
          // Start banner right after reveal completes (account for introDelay)
          const bannerStart = introDelayFrames + closeEnd + revealFrames;
          const bannerProgress = interpolate(
            frame,
            [bannerStart, bannerStart + bannerInFrames],
            [0, 1],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) }
          );
          const translateX = interpolate(bannerProgress, [0, 1], [width, 0], {
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)
          });
          const bannerHeight = Math.max(scalePx(44), Math.round(height * 0.01));
          const bannerTopPx = Math.round(height * 0.2);
          // Secondary label timing (starts after banner finishes sliding in)
          const labelStart = bannerStart + bannerInFrames;
          const labelRiseFrames = 10;
          const labelProgress = interpolate(
            frame,
            [labelStart, labelStart + labelRiseFrames],
            [0, 1],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) }
          );
          const startOffset = Math.round(bannerHeight * 0.2); // start inside banner (hidden behind)
          const endOffset = Math.round(-bannerHeight * 1);   // rise above banner top
          const labelOffsetY = interpolate(labelProgress, [0, 1], [startOffset, endOffset], {
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)
          });
          // Separate frame (mockup) and inner video sizes
          const frameWidth = Math.round(width * 0.55);
          const frameHeight = Math.round(frameWidth * (812 / 375));
          const frameLeft = Math.round((width - frameWidth) / 2);
          const frameTop = bannerTopPx + bannerHeight + scalePx(12);

          // Mockup screen rect as percentages of the mockup image (calibrate once)
          // These ratios are robust to scaling; adjust to match your iPhone mockup window precisely
          const screenXPct = 0.065;   // left inset as % of mockup width
          const screenYPct = 0.08;   // top inset as % of mockup height
          const screenWPct = 0.88;   // screen width as % of mockup width
          const screenHPct = 0.845;    // screen height as % of mockup height
          // Optional: per-corner radius for exact match with mockup curvature
          const screenRadiusPct = 0.15; // ~6% of mockup width; tune per mockup
          const rTL = Math.round(frameWidth * screenRadiusPct);
          const rTR = Math.round(frameWidth * screenRadiusPct);
          const rBR = Math.round(frameWidth * screenRadiusPct);
          const rBL = Math.round(frameWidth * screenRadiusPct);

          // Add a small bleed so slight misalignment never shows gaps (independent X/Y)
          const bleedX = scalePx(10); // px on left & right
          const bleedY = scalePx(20);  // px on top & bottom
          const videoWidth = Math.round(frameWidth * screenWPct) + bleedX * 2;
          const videoHeight = Math.round(frameHeight * screenHPct) + bleedY * 2;
          const videoLeft = frameLeft + Math.round(frameWidth * screenXPct) - bleedX;
          const videoTop = frameTop + Math.round(frameHeight * screenYPct) - bleedY;
          const playStart = Math.round(bannerStart + bannerInFrames);
          const preloadFrames = 2;
          return (
            <div style={{ opacity: Math.min(contentOpacity, finalFadeOpacity) }}>
              {/* Inner video screen (independent container) */}
              <div style={{
                position: 'absolute',
                left: videoLeft,
                top: videoTop,
                width: videoWidth,
                height: videoHeight,
                overflow: 'hidden',
                borderTopLeftRadius: rTL,
                borderTopRightRadius: rTR,
                borderBottomRightRadius: rBR,
                borderBottomLeftRadius: rBL,
                transform: `translate(${Math.round(translateX)}px, 0)`,
                zIndex: 2
              }}>
                {frame <= playStart && (
                  <div style={{ position: 'absolute', inset: 0, zIndex: 2 }}>
                    <Freeze frame={0}>
                      <OffthreadVideo src={staticFile('10317.mp4')} style={{ width: '100%', height: '100%', objectFit: 'fill' }} muted />
                    </Freeze>
                  </div>
                )}
                <Sequence from={Math.max(0, playStart - preloadFrames)}>
                  <div style={{ position: 'absolute', inset: 0, zIndex: 2 }}>
                    <OffthreadVideo src={staticFile('10317.mp4')} style={{ width: '100%', height: '100%', objectFit: 'fill' }} muted playbackRate={1.25} />
                  </div>
                </Sequence>
              </div>
              {/* Device mockup (separate container) */}
      <div style={{
                position: 'absolute',
                left: frameLeft,
                top: frameTop,
                width: frameWidth,
                height: frameHeight,
                transform: `translate(${Math.round(translateX)}px, 0)`,
                zIndex: 5,
                pointerEvents: 'none'
              }}>
                <Img src={staticFile('iphonemockup.png')} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>
      {/* Corporate store name above the SATILIK banner, sliding in with the banner (or corporate logo) */}
      {isKurumsal && (
        (() => {
          const full = (storeFullName || 'KURUMSAL').trim();
          if (!full) return null;
          const corpFontSize = Math.max(18, Math.round(bannerFontSize * 1.2));
          const nameTop = bannerTopPx - Math.round(bannerHeight * 1.1);
          return (
            <div style={{
              position: 'absolute', left: 0, top: '7%', width,
              height: bannerHeight,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transform: `translate(${Math.round(translateX)}px, 0)`,
              zIndex: 6, pointerEvents: 'none'
            }}>
              {isKurumsalLogo ? (
                <Img
                  src={corporateLogoUrl}
                  style={{ height: Math.max(16, Math.round(bannerHeight * 2.5)), width: 'auto' }}
                />
              ) : (
                <div style={{
                  color: orange,
                  fontWeight: 700,
                  letterSpacing: 1,
                  fontSize: corpFontSize,
                  fontFamily: "'Product Sans Bold', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
                  textAlign: 'center'
                }}>{full}</div>
              )}
            </div>
          );
        })()
      )}
      <div style={{
                position: 'absolute',
                left: 0,
                top: `${bannerTopPx}px`,
                width,
                height: bannerHeight,
                backgroundColor: isKurumsal ? '#000' : orange,
                transform: `translate(${Math.round(translateX)}px, 0)`,
                zIndex: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{
                  color: '#fff',
                  fontWeight: 900,
                  letterSpacing: 2,
                  fontSize: Math.round(bannerFontSize * 1.2),
                  fontFamily: "'Product Sans Bold', 'Product Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
                }}>
                  SATILIK
                </div>
              </div>
              {/* Secondary label area behind the banner */}
              {(() => {
                const baseStyle = {
                  position: 'absolute',
                  left: 0,
                  top: bannerTopPx - 5,
                  width,
                  height: bannerHeight,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 3,
                  pointerEvents: 'none',
                };
                if (isKurumsal) {
                  return null;
                }
                const fontSize = Math.max(18, Math.round(bannerFontSize * 0.9));
                return (
                  <div style={{
                    ...baseStyle,
                    transform: `translate(${Math.round(translateX)}px, ${Math.round(labelOffsetY)}px)`,
                  }}>
                    <div style={{
                      color: orange,
                      fontWeight: 700,
                      letterSpacing: 1,
                      fontSize,
                      fontFamily: "'Product Sans','Sansation', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
                    }}>
                      Bireysel Kullanıcıdan
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })()
      )}
      
      {/* End curtain: orange slides in from right, then exits left revealing white */}
      {frame >= endStart && (
        <>
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20, opacity: finalFadeOpacity }}>
            {(() => {
              const segW = Math.ceil(width / 4);
              const w3 = width - segW * 3;
              const segmentStyles = [
                { left: 0,       width: segW, color: orange },        // asıl turuncu
                { left: segW,    width: segW, color: '#ef4f22' },
                { left: segW*2,  width: segW, color: '#f1633b' },
                { left: segW*3,  width: w3,  color: '#f37a57' },
              ];
              const t = interpolate(
                frame,
                [endStart, endStart + endTotalFrames],
                [0, 1],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) }
              );
              // Move from right (off-screen) to left (off-screen) in one continuous motion, subpixel for smoothness
              const translateX = (1 - 2 * t) * width;
              return (
                <div style={{ position: 'absolute', left: 0, top: 0, width, height, transform: `translate3d(${translateX}px, 0, 0)`, willChange: 'transform' }}>
                  {segmentStyles.map((s, i) => (
                    <div key={i} style={{ position: 'absolute', left: s.left, top: 0, width: s.width, height, backgroundColor: s.color }} />
                  ))}
                </div>
              );
            })()}
      </div>
          <div style={{ position: 'absolute', inset: 0, backgroundColor: '#fff', zIndex: 1 }} />
          {/* Keep background white through freeze; no black here */}
          {/* Variant-specific end content */}
          {!isKurumsal ? (
            <>
              {/* Final white video: play, then freeze until guillotine closes */}
              <Sequence from={Math.max(0, ilanStart)} durationInFrames={playDurationFrames}>
                {(() => {
                  const local = frame - ilanStart;
                  const fadeOut = interpolate(local, [Math.max(0, playDurationFrames - crossfadeFrames), playDurationFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
                  return (
                    <div style={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: fadeOut }}>
                      <OffthreadVideo src={staticFile('animasyonluvideo-trim.mp4')} style={{ width: '100%', height: '100%', objectFit: 'contain' }} muted />
                    </div>
                  );
                })()}
              </Sequence>
              <Sequence from={Math.max(0, ilanEnd - crossfadeFrames)} durationInFrames={freezeHoldFrames + crossfadeFrames}>
                {(() => {
                  const local = frame - (ilanEnd - crossfadeFrames);
                  const fadeIn = interpolate(local, [0, crossfadeFrames], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
                  return (
                    <div style={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: fadeIn }}>
                      <Freeze frame={Math.max(0, playDurationFrames - 1)}>
                        <OffthreadVideo src={staticFile('animasyonluvideo-trim.mp4')} style={{ width: '100%', height: '100%', objectFit: 'contain' }} muted />
                      </Freeze>
                    </div>
                  );
                })()}
              </Sequence>
              {/* Final bottom row: icon + Ilan No, delayed start and 4s hold */}
              {frame >= ilanStart && frame < ilanEnd && (
                <div style={{
                  position: 'absolute',
                  left: Math.round(width * 0.04),
                  right: Math.round(width * 0.04),
                  bottom: Math.round(height * 0.15),
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  zIndex: 3
                }}>
                  <Img src={staticFile('siyahtiklama.png')} style={{ height: Math.round(height * 0.06), width: 'auto' }} />
                  <div style={{
                    color: orange,
                    fontFamily: "'Product Sans Bold', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
                    fontWeight: 600,
                    fontSize: Math.max(14, Math.round(height * 0.03)),
                    textAlign: 'center'
                  }}>
                    {ilanNo ? `İlan No: ${ilanNo}` : ''}
                  </div>
                </div>
              )}
            </>
          ) : (
            // Corporate: Centered stack (Text -> Logo -> Ilan No), no inner video
            frame >= ilanStart && frame < ilanEndKurumsal ? (() => {
              const local = frame - ilanStart;
              const slideFrames = Math.round(0.5 * fps);
              const text1Delay = 0;
              const text2Delay = Math.round(0.15 * fps);
              const logoDelay = Math.round(0.3 * fps);
              const ilanDelay = Math.round(0.45 * fps);

              const slideDistance = Math.round(width * 0.4);
              const slideIn = (delay) => interpolate(
                local,
                [delay, delay + slideFrames],
                [1, 0],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) }
              );
              const fadeIn = (delay) => interpolate(
                local,
                [delay, delay + slideFrames],
                [0, 1],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) }
              );

              const t1 = slideIn(text1Delay);
              const o1 = fadeIn(text1Delay);
              const t2 = slideIn(text2Delay);
              const o2 = fadeIn(text2Delay);

              const logoInFrames = Math.round(0.6 * fps);
              const pLogo = interpolate(
                local,
                [logoDelay, logoDelay + logoInFrames],
                [0, 1],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) }
              );
              const logoScale = interpolate(pLogo, [0, 1], [3, 1.0]);
              const logoOpacity = interpolate(pLogo, [0, 1], [0, 1]);

              const tIlan = slideIn(ilanDelay);
              const oIlan = fadeIn(ilanDelay);

              // Corporate exit: after a short hold, fade out texts and ilan row; logo rises up
              const exitStart = ilanDelay + Math.round(1.0 * fps);
              const exitFrames = Math.round(0.6 * fps);
              const pExit = interpolate(
                local,
                [exitStart, exitStart + exitFrames],
                [0, 1],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) }
              );
              const fadeOutFactor = 1 - pExit;
              const logoRisePx = Math.round(height * 0.13 * pExit);
              // Adjustable: how much the logo grows while rising (user-tunable)
              const logoExitScaleFactor = 1.35; // increase to grow more
              const logoExitScale = interpolate(pExit, [0, 1], [1, logoExitScaleFactor]);
              const logoScaleCombined = logoScale * logoExitScale;

              // Hold after exit completes, then show tagline and stores (left-to-right reveal)
              const postHoldFrames = Math.round(1.5 * fps);
              const tagStart = exitStart + exitFrames + postHoldFrames;
              const revealFrames2 = Math.round(0.6 * fps);
              const pTag = interpolate(
                local,
                [tagStart, tagStart + revealFrames2],
                [0, 1],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) }
              );
              const rightInsetPct2 = Math.max(0, Math.min(100, Math.round((1 - pTag) * 100)));
              const clipLTR = `inset(0% ${rightInsetPct2}% 0% 0%)`;
              // After 0.9s scene length, wipe to white and show centered video on white
              const sceneLenFrames = Math.round(0.9 * fps);
              const wipeStart = tagStart + sceneLenFrames;
              const wipeFrames = Math.round(0.9 * fps);
              const pWipe = interpolate(
                local,
                [wipeStart, wipeStart + wipeFrames],
                [0, 1],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) }
              );
              const whiteTx = Math.round((1 - pWipe) * width);
              const showCenteredWhiteVideo = local >= wipeStart + wipeFrames;
              const centeredVideoFrom = Math.max(0, ilanStart + wipeStart + wipeFrames);
              const centeredVideoDuration = Math.max(0, ilanEndKurumsal - centeredVideoFrom);

              // Independent absolute layers for each element (text1, text2, logo, ilan row)
              const text1Top = Math.round(height * 0.36);
              const text2Top = Math.round(height * 0.41);
              const logoTop = Math.round(height * 0.50);
              const ilanTop = Math.round(height * 0.62);
              return (
                <div style={{ position: 'absolute', inset: 0, zIndex: 3 }}>
                  {/* Text 1 */}
                  <div style={{ position: 'absolute', left: '50%', top: '25%', transform: `translate(-50%, 0) translateX(${Math.round(slideDistance * t1)}px)`, opacity: o1 * fadeOutFactor, pointerEvents: 'none' }}>
                    <div style={{
                      color: '#000',
                      fontFamily: "'Product Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
                      fontWeight: 700,
                      fontSize: Math.max(scalePx(16), Math.round(height * 0.032)),
                      textAlign: 'center',
                      whiteSpace: 'nowrap'
                    }}>Daha fazlasını görmek için şimdi</div>
                  </div>
                  {/* Text 2 */}
                  <div style={{ position: 'absolute', left: '50%', top: '30%', transform: `translate(-50%, 0) translateX(${Math.round(slideDistance * t2)}px)`, opacity: o2 * fadeOutFactor, pointerEvents: 'none' }}>
                    <div style={{
                      color: '#000',
                      fontFamily: "'Product Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
                      fontWeight: 700,
                      fontSize: Math.max(scalePx(16), Math.round(height * 0.032)),
                      textAlign: 'center',
                      whiteSpace: 'nowrap'
                    }}>uygulamayı indir, sen de keşfet!</div>
                  </div>
                  {/* Logo */}
                  <div style={{ position: 'absolute', left: '50%', top: '19%', transform: `translate(-50%, 0) translateY(-${logoRisePx}px) scale(${logoScaleCombined})`, opacity: logoOpacity, pointerEvents: 'none' }}>
                    <Img src={staticFile('beyazsatarizpng.png')} style={{ width: Math.round(width * 0.7), height: 'auto' }} />
                  </div>
                  {/* Ilan row */}
                  <div style={{ position: 'absolute', left: '50%', top: '47%', transform: `translate(-50%, 0) translateX(${Math.round(slideDistance * tIlan)}px)`, opacity: oIlan * fadeOutFactor, display: 'flex', alignItems: 'center', gap: scalePx(10) }}>
                    <Img src={staticFile('siyahtiklama.png')} style={{ height: Math.round(height * 0.08), width: 'auto' }} />
                    <div style={{
                      color: orange,
                      fontFamily: "'Product Sans Bold', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
                      fontWeight: 700,
                      fontSize: Math.max(scalePx(14), Math.round(height * 0.03)),
                      textAlign: 'center',
                      whiteSpace: 'nowrap'
                    }}>{ilanNo ? `İlan No: ${ilanNo}` : ''}</div>
                  </div>
                  {/* Bottom-right badge (synced with Ilan row) */}
                  {(() => {
                    const revealFrames = Math.round(0.8 * fps);
                    const start = ilanDelay;
                    const p = interpolate(
                      local,
                      [start, start + revealFrames],
                      [0, 1],
                      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) }
                    );
                    const rightInsetPct = Math.max(0, Math.min(100, Math.round((1 - p) * 100)));
                    const clip = `inset(0% ${rightInsetPct}% 0% 0%)`;
                    return (
                      <Img
                        src={staticFile('gritiklama-removebg-preview.png')}
                        style={{
                          position: 'absolute',
                          right: badgeRightPx,
                          bottom: badgeBottomPx,
                          width: Math.round(width * 1),
                          height: 'auto',
                          zIndex: 0,
                          opacity: 1,
                          clipPath: clip,
                          WebkitClipPath: clip,
                          pointerEvents: 'none'
                        }}
                      />
                    );
                  })()}

                  {/* Tagline under logo - independent positioned */}
                  <div style={{ position: 'absolute', left: '50%', top: '30%', transform: 'translate(-50%, 0)', pointerEvents: 'none' }}>
                    <Img
                      src={staticFile('turkiyeninyeniilanplatformu.png')}
                      style={{ width: Math.round(width * 0.7), height: 'auto', WebkitClipPath: clipLTR, clipPath: clipLTR }}
                    />
                  </div>
                  {/* App stores - three independent rows with staggered reveal */}
                  {(() => {
                    const storeStagger = Math.round(0.15 * fps);
                    const pApple = interpolate(local, [tagStart, tagStart + revealFrames2], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
                    const pPlay = interpolate(local, [tagStart + storeStagger, tagStart + storeStagger + revealFrames2], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
                    const pHuawei = interpolate(local, [tagStart + storeStagger * 2, tagStart + storeStagger * 2 + revealFrames2], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
                    const clipFrom = (p) => `inset(0% ${Math.max(0, Math.min(100, Math.round((1 - p) * 100)))}% 0% 0%)`;
                    return (
                      <>
                        {/* Apple Store */}
                        <div style={{ position: 'absolute', left: Math.round(width * 0.05), bottom: Math.round(height * 0.2), pointerEvents: 'none' }}>
                          <Img src={staticFile('applestore.png')} style={{ width: Math.round(width * 0.38), height: 'auto', WebkitClipPath: clipFrom(pApple), clipPath: clipFrom(pApple) }} />
                        </div>
                        {/* Google Play */}
                        <div style={{ position: 'absolute', left: Math.round(width * 0.05), bottom: Math.round(height * 0.12), pointerEvents: 'none' }}>
                          <Img src={staticFile('playstore.png')} style={{ width: Math.round(width * 0.38), height: 'auto', WebkitClipPath: clipFrom(pPlay), clipPath: clipFrom(pPlay) }} />
                        </div>
                        {/* Huawei AppGallery */}
                        <div style={{ position: 'absolute', left: Math.round(width * 0.05), bottom: Math.round(height * 0.041), pointerEvents: 'none' }}>
                          <Img src={staticFile('huaweistore.png')} style={{ width: Math.round(width * 0.38), height: 'auto', WebkitClipPath: clipFrom(pHuawei), clipPath: clipFrom(pHuawei) }} />
                        </div>
                      </>
                    );
                  })()}

                  {/* White wipe (zIndex below video so video stays above) */}
                  <div style={{ position: 'absolute', left: 0, top: 0, width, height, backgroundColor: '#fff', transform: `translateX(${whiteTx}px)`, zIndex: 4, pointerEvents: 'none' }} />
                  <Sequence from={centeredVideoFrom} durationInFrames={centeredVideoDuration}>
                    <div style={{ position: 'absolute', inset: 0, zIndex: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                      <OffthreadVideo src={staticFile('animasyonluvideo-trim.mp4')} style={{ width: '100%', height: '100%', objectFit: 'contain' }} muted />
                    </div>
                  </Sequence>
                </div>
              );
            })() : null
          )}
        </>
      )}

      {/* Final black guillotine close after final video ends (same as intro, color black) - bireysel only */}
      {!isKurumsal && (() => {
        const endGuillotineStart = ilanEnd;
        const total = approachFrames + retreatFrames + closeFrames;
        if (frame < endGuillotineStart || frame > endGuillotineStart + total) return null;
        const rel = frame - endGuillotineStart;
        const tlY2 = interpolate(rel, [0, approachFrames, approachFrames + retreatFrames, total], [-sideSize, tlApproachY, tlApproachY - retreatPx, tlEdgeY], {
          extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)
        });
        const brY2 = interpolate(rel, [0, approachFrames, approachFrames + retreatFrames, total], [height, brApproachY, brApproachY + retreatPx, brEdgeY], {
          extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)
        });
        return (
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 30 }}>
            <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${Math.round(tlX)}px, ${Math.round(tlY2)}px)` }}>
              <div style={{ width: sideSize, height: sideSize, backgroundColor: '#000', transform: 'rotate(80deg)' }} />
            </div>
            <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${Math.round(brX)}px, ${Math.round(brY2)}px)` }}>
              <div style={{ width: sideSize, height: sideSize, backgroundColor: '#000', transform: 'rotate(80deg)' }} />
            </div>
          </div>
        );
      })()}

      {/* After guillotine fully closed: switch background to black - bireysel only */}
      {!isKurumsal && (() => {
        const endGuillotineStart = ilanEnd;
        const total = approachFrames + retreatFrames + closeFrames;
        if (frame < endGuillotineStart + total) return null;
        return <div style={{ position: 'absolute', inset: 0, backgroundColor: '#000', zIndex: 1 }} />;
      })()}

      {/* Slide-in siyahsatariz logo from right to left after guillotine - bireysel only */}
      {!isKurumsal && frame >= blackLogoStart && (
        (() => {
          const t = interpolate(
            frame,
            [blackLogoStart, blackLogoStart + blackLogoInFrames],
            [0, 1],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) }
          );
          const tx = interpolate(t, [0, 1], [width, 0]);
          const logoOffsetY = -Math.round(height * 0.07);
          // After slide-in completes, wait 1.4s, then converge: logo moves down, stores move up
          const convergeDelayFrames = Math.round(1 * fps);
          const convergeFrames = 12;
          const convergeStart = blackLogoStart + blackLogoInFrames + convergeDelayFrames;
          const convergeProgress = interpolate(
            frame,
            [convergeStart, convergeStart + convergeFrames],
            [0, 1],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) }
          );
          const convergeDeltaY = Math.round(height * 0.1);
          const logoApproachY = interpolate(convergeProgress, [0, 1], [0, convergeDeltaY], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          const storesApproachY = interpolate(convergeProgress, [0, 1], [0, -convergeDeltaY], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          return (
            <div style={{ position: 'absolute', left: 0, top: 0, width, display: 'flex', justifyContent: 'center', zIndex: 32, pointerEvents: 'none' }}>
              <div style={{ transform: `translate(${Math.round(tx)}px, ${logoOffsetY + logoApproachY}px)` }}>
                <Img src={staticFile('siyahsatariz.png')} style={{ width: Math.round(width * 0.9), height: 'auto' }} />
              </div>
              {/* Download stores strip, slides in together */}
              <div style={{ position: 'absolute', left: 0, top: Math.round(height * 0.5), width: '100%', display: 'flex', justifyContent: 'center' }}>
                <div style={{ transform: `translate(${Math.round(tx)}px, ${storesApproachY}px)` }}>
                  <Img src={staticFile('downloadablestores.png')} style={{ width: Math.round(width * 0.7), height: 'auto' }} />
                </div>
              </div>
            </div>
          );
        })()
      )}

    </div>
  );
};

