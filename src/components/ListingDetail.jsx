import { useEffect, useMemo, useRef, useState } from 'react';
import Colors from '../theme/colors';
import { FaktorelGenislik, FRAME_WIDTH, FRAME_HEIGHT, HeaderHeight } from '../utils/scale';
import DefaultTextStyle from './DefaultTextStyle';
import Image from './common/Image';
import Carousel from './common/Carousel';
import ImageBackground from './common/ImageBackground';
import Icon from './common/Icon';
import { ThreeTabs, TwoTabs } from './common/Tabs';
import RichEditor from './stubs/RichEditor';
import { MapView, Marker } from './stubs/Map';
import { useSafeAreaInsets } from '../hooks/useSafeArea';

function Divider({ width }) {
  return <div style={{ height: FaktorelGenislik(1), backgroundColor: 'rgba(0,0,0,0.1)', width }} />;
}

function AttributeRow({ label, value, highlight = false, copyable = false, onCopy, valueColor, valueFontType }) {
  return (
    <div style={{
      width: '100%',
      margin: 0,
      backgroundColor: Colors.white,
      borderRadius: 10,
      boxShadow: '0 1px 0 rgba(0,0,0,0.06)',
      boxSizing: 'border-box',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingLeft: FaktorelGenislik(12),
      paddingRight: FaktorelGenislik(12),
      marginBottom: 3,
      height: FaktorelGenislik(38),
    }}>
      <DefaultTextStyle color={Colors.black161616} fontType={'medium'} fontSize={FaktorelGenislik(12)}>
        {label}
      </DefaultTextStyle>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <DefaultTextStyle color={valueColor ?? (highlight ? Colors.primary : Colors.black161616)} fontType={valueFontType ?? (highlight ? 'bold' : 'medium')} fontSize={FaktorelGenislik(12)}>
          {value}
        </DefaultTextStyle>
        {copyable ? (
          <button onClick={onCopy} style={{ border: 'none', background: 'transparent', padding: 0, paddingTop: FaktorelGenislik(5), cursor: 'pointer' }}>
            <Icon name="copy" size={FaktorelGenislik(18)} color={Colors.black161616} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function ListingDetail({ dataListing = {}, windowWidth = FRAME_WIDTH, token = false }) {
  const insets = useSafeAreaInsets();
  // Dot fill tuning: adjust to test the fill amount responsiveness
  const DOT_GAIN = 2.0; // >1 hızlanır (daha çabuk dolar), <1 yavaşlar
  const DOT_EASE = 2.0; // 1: linear, 2: ease-in, 0.5: ease-out
  const [tab, setTab] = useState('one');
  const ScrollViewRef = useRef(null);
  const richText = useRef(null);
  const mapViewRef = useRef(null);
  const extraBottom = insets.bottom < 1 ? FaktorelGenislik(30) : insets.bottom;
  const initialHeight = FRAME_HEIGHT - (HeaderHeight + FaktorelGenislik(10));
  const mapsType = 'standard';
  const isVehicle = false;
  const nearbyPlaces = [];
  const [sliderIndex, setSliderIndex] = useState(0);
  const dotRefs = useRef([]);

  const d = dataListing?.data || {};
  const title = d?.title || '';

  const galleryImages = useMemo(() => {
    const urls = [];
    const seen = new Set();
    const isImageUrl = (u) => typeof u === 'string' && /^https?:\/\//.test(u) && /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(u);
    const pushUrl = (val) => { if (isImageUrl(val)) urls.push(val.trim()); };

    const walk = (val, depth = 0) => {
      if (val == null || depth > 4) return;
      if (typeof val === 'string') { pushUrl(val); return; }
      if (Array.isArray(val)) { for (const v of val) walk(v, depth + 1); return; }
      if (typeof val === 'object') {
        if (seen.has(val)) return; seen.add(val);
        // Likely fields
        ['url','uri','image','path','src','file','small','medium','large','original'].forEach(k => walk(val[k], depth + 1));
        // Common collections
        ['files','items','images','list','data','variants','thumbnails','sizes'].forEach(k => walk(val[k], depth + 1));
        // Fallback: shallow scan values (limited depth)
        if (depth < 2) { Object.values(val).forEach(v => walk(v, depth + 1)); }
      }
    };

    walk(d?.gallery_groups);
    walk(d?.images);
    walk(d?.gallery);
    walk(d?.image);

    // Group duplicate variants (small/medium/large/original) per base key and pick best quality
    const qualityRank = (u) => (/original/i.test(u) ? 3 : /hd/i.test(u) ? 2 : /medium/i.test(u) ? 1 : /small|thumb|thumbnail/i.test(u) ? 0 : 2);
    const stripQuery = (u) => u.split('?')[0];
    const baseName = (u) => stripQuery(u)
      .replace(/\/(small|medium|large|original|thumb|thumbnail|hd)\//gi, '/')
      .replace(/[-_](small|medium|large|original|thumb|thumbnail|hd)(?=\.)/gi, '')
      .toLowerCase();
    const groupKey = (u) => {
      const m = /image-([a-z0-9-]+)/i.exec(u);
      return m ? m[0].toLowerCase() : baseName(u);
    };

    const byKey = new Map();
    for (const u of urls) {
      const key = groupKey(u);
      const rank = qualityRank(u);
      const prev = byKey.get(key);
      if (!prev || rank > prev.rank) byKey.set(key, { url: u, rank });
    }
    const dedup = Array.from(byKey.values()).map(v => v.url);
    let hdOnly = dedup.filter(u => /(original|hd)/i.test(u) && !/(small|medium|thumb|thumbnail)/i.test(u));
    // If no HD variants available, try to up-convert URLs heuristically (small/medium -> large)
    if (hdOnly.length === 0) {
      const toHd = (u) => u
        .replace(/-(small|medium)(?=\.)/i, '-hd')
        .replace(/\/(small|medium)\//i, '/hd/');
      const converted = dedup.map(toHd);
      hdOnly = Array.from(new Set(converted)).filter(u => /(original|hd)/i.test(u));
    }
    const result = hdOnly.length > 0 ? hdOnly : dedup; // final fallback to any available
    return result.slice(0, 10);
  }, [d]);

  useEffect(() => {
    // Debug: print incoming gallery structures and resolved URLs
    // eslint-disable-next-line no-console
    console.log('ListingDetail gallery debug', {
      gallery_groups: d?.gallery_groups,
      images: d?.images,
      gallery: d?.gallery,
      image: d?.image,
      resolved: galleryImages,
      hdCount: galleryImages?.filter?.(u => /(original|large)/i.test(u))?.length,
      count: galleryImages?.length,
    });
  }, [d, galleryImages]);

  function scrollToTab() {
    if (ScrollViewRef.current) {
      ScrollViewRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  const locationText = [d?.province?.name, d?.district?.name, d?.neighbourhood?.name].filter(Boolean).join(', ');

  function getAttr(name) {
    const arr = d?.attributes || [];
    const f = arr.find(a => a?.attribute_name === name);
    return f?.attribute_value_name || f?.attribute_value || '';
  }

  function copyToClipboard(text) {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(String(text || ''));
    }
  }

  // Carousel index is controlled via Embla onIndexChange above

  function formatDate(iso) {
    if (!iso) return '';
    let d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      const s = String(iso);
      const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s);
      if (m) {
        const day = Number(m[1]);
        const month = Number(m[2]) - 1;
        const year = Number(m[3]);
        d = new Date(year, month, day);
      }
    }
    if (Number.isNaN(d.getTime())) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  }

  return (
    <div style={{ flex: 1 }}>
      <div style={{ flex: 1 }}>
        <div ref={ScrollViewRef} style={{ overflowY: 'auto', height: initialHeight, paddingBottom: FaktorelGenislik(90) + extraBottom }}>
          <div style={{ width: FRAME_WIDTH, borderRadius: 5, backgroundColor: Colors.white, margin: '0 auto' }}>
            <div style={{ width: windowWidth, borderRadius: 5, margin: '0 auto' }}>
              <div style={{ width: windowWidth, backgroundColor: '#f7f7f7' }}>
                <DefaultTextStyle
                  color={Colors.black161616}
                  fontType={'regular'}
                  fontSize={FaktorelGenislik(14)}
                  style={{ lineHeight: FaktorelGenislik(1), marginTop: FaktorelGenislik(1), marginInline: FaktorelGenislik(1), paddingBottom: 3, display: 'block', width: '100%', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                >
                  {title}
                </DefaultTextStyle>
              </div>

              {(galleryImages.length > 0 ? galleryImages : [d?.image]).filter(Boolean).length > 0 && (
                <div>
                  <Carousel
                    width={windowWidth}
                    height={(windowWidth / 4) * 3}
                    testId="listing-carousel"
                    slides={(galleryImages.length > 0 ? galleryImages : [d?.image]).filter(Boolean).map((src) => () => (
                      <Image source={src} width={windowWidth} height={(windowWidth / 4) * 3} />
                    ))}
                    onIndexChange={(i) => setSliderIndex(i)}
                    onProgress={(p) => {
                      const count = (galleryImages.length || 1);
                      const total = Math.max(1, count - 1);
                      // base ve yerel ilerleme
                      const exactRaw = p * total; // 0..(n-1)
                      const base = Math.floor(exactRaw);
                      // sadece yerel t üzerinde gain/ease uygula
                      let t = exactRaw - base; // 0..1
                      t = Math.pow(Math.min(1, Math.max(0, t * DOT_GAIN)), DOT_EASE);
                      const fills = dotRefs.current || [];
                      for (let i = 0; i < fills.length; i++) {
                        const el = fills[i];
                        if (!el) continue;
                        let widthPct = 0;
                        // default anchor left
                        el.style.left = '0px';
                        el.style.right = 'auto';
                        if (i === base) {
                          // current dot fills from right to left: width = 1 - t, anchor right
                          widthPct = (1 - t) * 100;
                          el.style.left = 'auto';
                          el.style.right = '0px';
                        } else if (i === base + 1) {
                          // next dot fills from left to right: width = t, anchor left
                          widthPct = t * 100;
                          el.style.left = '0px';
                          el.style.right = 'auto';
                        } else if (exactRaw <= 0 && i === 0) {
                          widthPct = 100; // at very start, first dot full
                          el.style.left = 'auto';
                          el.style.right = '0px';
                        } else if (exactRaw >= total && i === total) {
                          widthPct = 100; // at very end, last dot full
                          el.style.left = 'auto';
                          el.style.right = '0px';
                        }
                        el.style.width = `${widthPct}%`;
                      }
                    }}
                  />
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'center', padding: '5px 0' }}>
                    {(galleryImages.length > 0 ? galleryImages : [d?.image]).filter(Boolean).map((_, idx) => (
                      <span key={idx} style={{ position: 'relative', width: 12, height: 12, borderRadius: 100, backgroundColor: '#3c3c3c', overflow: 'hidden' }}>
                        <span
                          ref={el => (dotRefs.current[idx] = el)}
                          style={{ position: 'absolute', top: 0, bottom: 0, width: '0%', borderRadius: 500, backgroundColor: Colors.primary, left: 'auto', right: 'auto', transition: 'width 50ms linear', willChange: 'width' }}
                        />
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ width: windowWidth, backgroundColor: '#000' }}>
                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingTop: FaktorelGenislik(5) }}>
                  <DefaultTextStyle style={{ textAlign: 'center', lineHeight: FaktorelGenislik(1) }} color={Colors.primary} fontType={'medium'} fontSize={FaktorelGenislik(12)}>
                    {(d?.category_parents || []).map((item, index, arr) => index === arr.length - 1 ? `${item?.title}` : `${item?.title} ›`).join(' ')}
                  </DefaultTextStyle>
                </div>

                <div style={{ height: FaktorelGenislik(20), display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000'}}>
                  <DefaultTextStyle style={{ marginBottom: 0, textAlign: 'center' }} color={Colors.disabled} fontType={'medium'} fontSize={FaktorelGenislik(12)}>
                    {locationText}
                  </DefaultTextStyle>
                </div>
                <Divider width={windowWidth} />
                <div style={{ height: FaktorelGenislik(38), display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f7f7f7' }}>
                  {(() => {
                    const nameText = d?.corporate?.store_name || d?.sales_representative?.name || '';
                    const nameFontSize = FaktorelGenislik(12);
                    const avatarFontSize = FaktorelGenislik(16);
                    const defaultAvatar = 'https://www.satariz.com/inc/profile-default.png';
                    const avatarCandidates = [
                      d?.corporate?.logo,
                      d?.sales_representative?.image,
                      d?.sales_representative?.photo,
                      d?.sales_representative?.avatar,
                      d?.publisher?.photo,
                      d?.publisher?.image,
                      d?.publisher?.avatar,
                      d?.user?.profile_image,
                      d?.user?.photo,
                      d?.user?.avatar,
                    ].map(v => (typeof v === 'string' ? v.trim() : ''));
                    const avatarUrl = (avatarCandidates.find(u => u) || defaultAvatar);
                    const size = avatarFontSize;
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: FaktorelGenislik(4) }}>
                        <div style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: Colors.white, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                          <ImageBackground
                            source={{ uri: avatarUrl }}
                            resizeMode="cover"
                            borderRadius={size / 2}
                            width={size}
                            height={size}
                            style={{ width: size, height: size, borderRadius: size / 2 }}
                          />
                        </div>
                        <DefaultTextStyle style={{ textAlign: 'center' }} color={Colors.black161616} fontType={'medium'} fontSize={nameFontSize}>
                          {nameText}
                        </DefaultTextStyle>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: Colors.backgroundF2F3F5 }}>
            <div style={{ position: 'sticky', top: 0, zIndex: 2, background: Colors.backgroundF2F3F5, paddingLeft: FaktorelGenislik(10), paddingRight: FaktorelGenislik(10), width: windowWidth, boxSizing: 'border-box' }}>
              <div style={{ height: FaktorelGenislik(38), marginTop: FaktorelGenislik(10), marginBottom: FaktorelGenislik(10), width: '100%', borderRadius: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', alignSelf: 'center' }}>
                <button
                  onClick={() => { setTab('one'); scrollToTab(); }}
                  style={{
                    height: FaktorelGenislik(38),
                    width: FaktorelGenislik(110),
                    background: Colors.black161616,
                    backgroundColor: Colors.black161616,
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    borderRadius: 5,
                    border: 'none', cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none',
                    color: Colors.white, WebkitTextFillColor: Colors.white,
                  }}
                >
                  <DefaultTextStyle color={Colors.white} fontType={'bold'} fontSize={FaktorelGenislik(11)}>İlan Bilgileri</DefaultTextStyle>
                </button>

                <button
                  onClick={() => { setTab('two'); scrollToTab(); }}
                  style={{
                    height: FaktorelGenislik(38),
                    width: FaktorelGenislik(110),
                    background: Colors.white,
                    backgroundColor: Colors.white,
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    borderRadius: 5,
                    border: 'none', cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none',
                    color: Colors.black161616, WebkitTextFillColor: Colors.black161616,
                  }}
                >
                  <DefaultTextStyle color={Colors.black161616} fontType={'bold'} fontSize={FaktorelGenislik(11)}>Açıklama</DefaultTextStyle>
                </button>

                <button
                  onClick={() => { setTab('three'); scrollToTab(); }}
                  style={{
                    height: FaktorelGenislik(38),
                    width: FaktorelGenislik(110),
                    background: Colors.white,
                    backgroundColor: Colors.white,
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    borderRadius: 5,
                    border: 'none', cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none',
                    color: Colors.black161616, WebkitTextFillColor: Colors.black161616,
                  }}
                >
                  <DefaultTextStyle color={Colors.black161616} fontType={'bold'} fontSize={FaktorelGenislik(11)}>Konum</DefaultTextStyle>
                </button>
              </div>
            </div>

            {tab === 'one' ? (
              <div style={{ paddingBottom: 16 }}>
                <AttributeRow label={'İlan No'} value={d?.listing_number ?? '-'} highlight valueColor={Colors.black161616} valueFontType={'bold'} copyable onCopy={() => copyToClipboard(d?.listing_number)} />
                <AttributeRow label={'Fiyat'} value={d?.price ?? '-'} highlight />
                <AttributeRow label={'İlan Tarihi'} value={formatDate(d?.created_at)} />
                {(d?.attributes || []).map((a, idx) => {
                  const value = a?.attribute_value_name || a?.attribute_value;
                  if (!value) return null;
                  return (
                    <AttributeRow key={`${a?.id}-${idx}`} label={a?.attribute_name} value={value} />
                  );
                })}
              </div>
            ) : tab === 'two' ? (
              <div style={{ width: '100%', margin: 0, backgroundColor: Colors.white, borderRadius: 8 }}>
                <RichEditor
                  initialContentHTML={d?.description}
                  disabled
                  ref={richText}
                  style={{ width: '100%', margin: 0, borderRadius: 8, marginBottom: FaktorelGenislik(5) }}
                  initialHeight={initialHeight}
                />
              </div>
            ) : tab === 'three' ? (
              <div style={{ width: windowWidth, height: initialHeight, margin: '0 auto', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 8, position: 'relative' }}>
                <MapView
                  ref={mapViewRef}
                  style={{ width: windowWidth, height: initialHeight, margin: '0 auto' }}
                >
                  <Marker coordinate={{ latitude: d?.lat, longitude: d?.lng }}>
                    <Icon name={'map-marker'} size={FaktorelGenislik(40)} color={Colors.primary} />
                  </Marker>
                </MapView>

                <div style={{ top: 0, position: 'absolute', width: FaktorelGenislik(120), right: 10 }}>
                  <TwoTabs
                    height={FaktorelGenislik(30)}
                    fontType="medium"
                    oneText="Harita"
                    oneButtonPress={() => { /* setMapsType('standard') */ }}
                    twoText="Uydu"
                    twoButtonPress={() => { /* setMapsType('hybrid') */ }}
                    tab={'one'}
                  />
                </div>

                <div style={{ top: 0, position: 'absolute', width: FaktorelGenislik(150), left: 10, display: 'flex', flexDirection: 'row' }}>
                  <button
                    style={{ marginTop: FaktorelGenislik(5), marginRight: FaktorelGenislik(5), height: FaktorelGenislik(30), width: FaktorelGenislik(90), backgroundColor: Colors.white, display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: 5, flexDirection: 'row', border: 'none', cursor: 'pointer' }}
                    onClick={() => { /* open maps driving */ }}
                  >
                    <Icon size={FaktorelGenislik(20)} color={Colors.secondary} name={'directions'} />
                    <DefaultTextStyle color={Colors.secondary} fontType={'medium'} fontSize={FaktorelGenislik(12)} style={{ marginLeft: FaktorelGenislik(3) }}>
                      {'Yol Tarifi'}
                    </DefaultTextStyle>
                  </button>
                  {isVehicle === false ? (
                    <button
                      style={{ marginTop: FaktorelGenislik(5), height: FaktorelGenislik(30), width: FaktorelGenislik(100), backgroundColor: Colors.white, display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: 5, flexDirection: 'row', border: 'none', cursor: 'pointer' }}
                      onClick={() => { /* env info */ }}
                    >
                      <Icon size={FaktorelGenislik(20)} color={Colors.secondary} name={'information-outline'} />
                      <DefaultTextStyle color={Colors.secondary} fontType={'medium'} fontSize={FaktorelGenislik(12)} style={{ marginLeft: FaktorelGenislik(3) }}>
                        {'Çevre Bilgisi'}
                      </DefaultTextStyle>
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <div style={{ height: FaktorelGenislik(30) }} />
        </div>
      </div>
      {/* Bottom action bar with safe-area white extension (filler below the bar) */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
        <div style={{ width: '100%', height: FaktorelGenislik(74), display: 'flex', gap: 7, margin: 0, alignItems: 'center', justifyContent: 'space-between', background: Colors.white }}>
          <button style={{ flex: 1, height: FaktorelGenislik(38), background: Colors.primary, color: Colors.white, border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: 600, fontSize: FaktorelGenislik(12), marginLeft: 15 }}>Arama</button>
          <button style={{ flex: 1, height: FaktorelGenislik(38), background: Colors.primary, color: Colors.white, border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: 600, fontSize: FaktorelGenislik(12) }}>Mesaj</button>
          <button style={{ flex: 1, height: FaktorelGenislik(38), background: Colors.primary, color: Colors.white, border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: 600, fontSize: FaktorelGenislik(12), marginRight: 15 }}>WhatsApp</button>
        </div>
        <div style={{ height: extraBottom, background: Colors.white }} />
      </div>
    </div>
  );
}


