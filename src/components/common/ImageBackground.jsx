export default function ImageBackground({ source, width, height, borderRadius = 0, style, resizeMode = 'cover' }) {
  const uri = source?.uri || source;
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        backgroundImage: `url(${uri})`,
        backgroundSize: resizeMode,
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        ...style,
      }}
    />
  );
}


