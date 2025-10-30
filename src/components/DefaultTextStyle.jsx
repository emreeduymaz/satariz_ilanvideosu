/*
  Simple text wrapper to emulate RN's text style props
*/
export default function DefaultTextStyle({
  children,
  color = '#000',
  fontType = 'regular',
  fontSize = 14,
  style,
}) {
  const fontWeight = fontType === 'bold' ? 700 : fontType === 'medium' ? 500 : 400;
  const merged = {
    color,
    fontSize,
    fontWeight,
    lineHeight: Math.round(fontSize * 1.3),
    ...style,
  };
  return <span style={merged}>{children}</span>;
}


