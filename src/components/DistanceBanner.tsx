import type { DistanceStatus } from '../hooks/useDistanceGuide';

interface DistanceBannerProps {
  status: DistanceStatus;
}

export default function DistanceBanner({ status }: DistanceBannerProps) {
  if (status === 'ok' || status === 'no_hand') return null;

  const message =
    status === 'too_close'
      ? 'Move back a bit'
      : 'Move closer to the camera';

  const bgColor =
    status === 'too_close' ? 'bg-orange-500/80' : 'bg-blue-500/80';

  return (
    <div
      className={`absolute top-4 left-1/2 -translate-x-1/2 z-30 ${bgColor} backdrop-blur-sm px-6 py-2 rounded-full text-white font-semibold text-sm shadow-lg`}
    >
      {message}
    </div>
  );
}
