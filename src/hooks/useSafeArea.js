import { useEffect, useState } from 'react';

export function useSafeAreaInsets() {
  const [insets, setInsets] = useState({ top: 0, right: 0, bottom: 0, left: 0 });

  useEffect(() => {
    function compute() {
      const style = getComputedStyle(document.documentElement);
      const top = parseInt(style.getPropertyValue('env(safe-area-inset-top)') || '0', 10) || 0;
      const right = parseInt(style.getPropertyValue('env(safe-area-inset-right)') || '0', 10) || 0;
      const bottom = parseInt(style.getPropertyValue('env(safe-area-inset-bottom)') || '0', 10) || 0;
      const left = parseInt(style.getPropertyValue('env(safe-area-inset-left)') || '0', 10) || 0;
      setInsets({ top, right, bottom, left });
    }
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);

  return insets;
}

export default useSafeAreaInsets;


