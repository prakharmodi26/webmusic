import { forwardRef } from 'react';

interface CameraViewProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onCanvasClick?: React.MouseEventHandler<HTMLCanvasElement>;
  onMouseDown?: React.MouseEventHandler<HTMLCanvasElement>;
  onMouseMove?: React.MouseEventHandler<HTMLCanvasElement>;
  onMouseUp?: React.MouseEventHandler<HTMLCanvasElement>;
  onTouchStart?: React.TouchEventHandler<HTMLCanvasElement>;
  onTouchMove?: React.TouchEventHandler<HTMLCanvasElement>;
  onTouchEnd?: React.TouchEventHandler<HTMLCanvasElement>;
}

const CameraView = forwardRef<HTMLVideoElement, CameraViewProps>(
  ({ canvasRef, onCanvasClick, onMouseDown, onMouseMove, onMouseUp, onTouchStart, onTouchMove, onTouchEnd }, videoRef) => {
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
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        />
      </div>
    );
  },
);

CameraView.displayName = 'CameraView';
export default CameraView;
