export function MapView({ style, children }) {
  return (
    <div style={{ ...style, background: '#d0e7ff', position: 'relative' }}>
      {children}
    </div>
  );
}

export function Marker({ children, coordinate }) {
  return (
    <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
      {children}
    </div>
  );
}


