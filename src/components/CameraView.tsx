import { forwardRef } from 'react';

interface CameraViewProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onCanvasClick?: React.MouseEventHandler<HTMLCanvasElement>;
}

const CameraView = forwardRef<HTMLVideoElement, CameraViewProps>(
  ({ canvasRef, onCanvasClick }, videoRef) => {
    return (
      <div className="relative w-full h-full overflow-hidden bg-black">
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          onClick={onCanvasClick}
        />
      </div>
    );
  },
);

CameraView.displayName = 'CameraView';
export default CameraView;
