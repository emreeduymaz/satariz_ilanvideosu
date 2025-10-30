import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

export const GuillotineIntro = ({ durationInFrames, color = '#FF7A00', thickness = 12 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const progress = interpolate(frame, [0, Math.max(1, durationInFrames - 1)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });

  const fadeOut = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });

  const diagonalLength = Math.ceil(Math.hypot(width, height)) + 40;

  const topTranslateY = interpolate(progress, [0, 1], [-height * 0.35, 0]);
  const bottomTranslateY = interpolate(progress, [0, 1], [height * 0.35, 0]);

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', opacity: fadeOut }}>
      {/* Top-left diagonal bar */}
      <div style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: diagonalLength,
        height: thickness,
        backgroundColor: color,
        transform: `translate(-50%, -50%) translateY(${topTranslateY}px) rotate(45deg)`,
        transformOrigin: 'center',
        borderRadius: thickness / 2
      }} />

      {/* Bottom-right diagonal bar */}
      <div style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: diagonalLength,
        height: thickness,
        backgroundColor: color,
        transform: `translate(-50%, -50%) translateY(${bottomTranslateY}px) rotate(-45deg)`,
        transformOrigin: 'center',
        borderRadius: thickness / 2
      }} />
    </AbsoluteFill>
  );
};


