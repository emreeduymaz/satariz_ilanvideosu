import { memo } from 'react';
import MdiIcon from '@mdi/react';
import { mdiContentCopy } from '@mdi/js';

// Lightweight icon shim. You can swap to `react-icons` later.
const nameToSvg = (name, { size, color }) => {
  const common = { width: size, height: size, stroke: color, fill: 'none' };
  switch (name) {
    case 'cursor-default-click':
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M3 3l7 17 2-7 7-2-16-8z" strokeWidth="2" />
        </svg>
      );
    case 'file-compare':
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M6 2h7l5 5v15H6z" strokeWidth="2" />
          <path d="M13 2v6h6" strokeWidth="2" />
        </svg>
      );
    case 'map-marker':
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M12 22s7-5.5 7-12a7 7 0 1 0-14 0c0 6.5 7 12 7 12z" strokeWidth="2" />
          <circle cx="12" cy="10" r="3" strokeWidth="2" />
        </svg>
      );
    case 'directions':
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M21 11l-8-8-8 8 8 8 8-8z" strokeWidth="2" />
          <path d="M13 7h-2v6h3" strokeWidth="2" />
        </svg>
      );
    case 'information-outline':
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <circle cx="12" cy="12" r="9" strokeWidth="2" />
          <path d="M12 8v.01M11 12h2v4h-2z" strokeWidth="2" />
        </svg>
      );
    case 'copy':
      return <MdiIcon path={mdiContentCopy} size={size / 24} color={color} />;
    default:
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <circle cx="12" cy="12" r="9" strokeWidth="2" />
        </svg>
      );
  }
};

function Icon({ name, size = 20, color = 'currentColor', backgroundStyle }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', ...backgroundStyle }}>
      {nameToSvg(name, { size, color })}
    </span>
  );
}

export default memo(Icon);


