export default function RichEditor({ initialContentHTML, disabled, style, initialHeight }) {
  return (
    <div
      style={{
        ...style,
        height: initialHeight,
        overflow: 'auto',
        background: '#fff',
        padding: 8,
        border: '1px solid rgba(0,0,0,0.08)',
      }}
      dangerouslySetInnerHTML={{ __html: initialContentHTML || '' }}
    />
  );
}


