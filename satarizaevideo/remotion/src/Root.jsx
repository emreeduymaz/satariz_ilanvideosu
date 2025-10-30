import { Composition, getInputProps } from 'remotion';
import { Video } from './Video';

export const RemotionRoot = () => {
  const input = getInputProps?.() || {};
  const defaultListingId = 10317;
  const listingId = Number(input.listingId) || defaultListingId;
  const variant = typeof input.variant === 'string' ? input.variant : 'bireysel';
  return (
    <>
      <Composition
        id="ListingVideo"
        component={Video}
        // Single source of truth for total duration
        // Change only totalSeconds to safely get ~12-13s etc.
        durationInFrames={(() => {
          const fps = 30;
          const totalSeconds = 22; // adjust this value only
          return Math.round(totalSeconds * fps);
        })()}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ listingId, variant }}
      />
    </>
  );
};
