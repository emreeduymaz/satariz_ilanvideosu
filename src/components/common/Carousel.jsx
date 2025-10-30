import { useCallback, useEffect } from 'react';
import useEmblaCarousel from 'embla-carousel-react';

export default function Carousel({ slides = [], width, height, onIndexChange, onProgress, testId }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: 'start' });

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    const idx = emblaApi.selectedScrollSnap();
    onIndexChange?.(idx);
  }, [emblaApi, onIndexChange]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    onSelect();
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (!emblaApi) return;
    const handleScroll = () => {
      const progress = emblaApi.scrollProgress();
      const snapList = emblaApi.scrollSnapList();
      onProgress?.(progress, snapList);
    };
    emblaApi.on('scroll', handleScroll);
    handleScroll();
  }, [emblaApi, onProgress]);

  return (
    <div style={{ width, height, overflow: 'hidden', touchAction: 'pan-y' }} ref={emblaRef} data-testid={testId}>
      <div style={{ display: 'flex', userSelect: 'none', WebkitUserSelect: 'none', msUserSelect: 'none' }}>
        {slides.map((node, i) => (
          <div key={i} style={{ position: 'relative', flex: '0 0 100%', width, height }}>
            {typeof node === 'function' ? node() : node}
          </div>
        ))}
      </div>
    </div>
  );
}


