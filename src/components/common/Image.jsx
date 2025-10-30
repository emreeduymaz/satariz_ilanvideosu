export default function Image({ source, width, height, style, alt = '' }) {
  const uri = source?.uri || source;
  return (
    <img
      src={uri}
      alt={alt}
      style={{ width, height, objectFit: 'cover', display: 'block', ...style }}
    />
  );
}


