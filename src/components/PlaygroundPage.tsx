import { useState, useRef, useCallback, useEffect } from 'react';
import { useCamera } from '../hooks/useCamera';
import { useHandTracking } from '../hooks/useHandTracking';
import { useHitDetection } from '../hooks/useHitDetection';
import { useAudio } from '../hooks/useAudio';
import { useDistanceGuide } from '../hooks/useDistanceGuide';
import { drumKitConfig } from '../config/instruments/drumKit';
import StartScreen from './StartScreen';
import CameraView from './CameraView';
import CalibrationOverlay from './CalibrationOverlay';
import DistanceBanner from './DistanceBanner';
import SettingsPanel from './SettingsPanel';
import InstrumentSelector from './InstrumentSelector';
import { drawPad, drawRipple, drawLandmarks, type RippleState } from '../utils/canvas';

type Stage = 'idle' | 'loading' | 'calibrating' | 'playing';

export default function PlaygroundPage() {
  const [stage, setStage] = useState<Stage>('idle');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sensitivity, setSensitivity] = useState(1.0);
  const [beginnerMode, setBeginnerMode] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);

  const { videoRef, isActive: cameraActive, error: cameraError, start: startCamera } = useCamera();
  const { frame, isLoading: trackingLoading, isReady: trackingReady, init: initTracking, startLoop } = useHandTracking(videoRef);
  const { engineRef, isLoaded: audioLoaded, init: initAudio, loadCustomSample, resume: resumeAudio } = useAudio();
  const { processFrame, activePads, ripples, setRipples, setSensitivity: setDetectorSensitivity } = useHitDetection(engineRef, drumKitConfig.pads);
  const distanceStatus = useDistanceGuide(frame);

  const handleStart = useCallback(async () => {
    setStage('loading');
    await startCamera();
    await initTracking();
    await initAudio(drumKitConfig.pads);
  }, [startCamera, initTracking, initAudio]);

  useEffect(() => {
    if (cameraActive && trackingReady && audioLoaded && stage === 'loading') {
      startLoop();
      setStage('calibrating');
    }
  }, [cameraActive, trackingReady, audioLoaded, stage, startLoop]);

  const handleCalibrationReady = useCallback(() => {
    resumeAudio();
    setStage('playing');
  }, [resumeAudio]);

  const handleSensitivityChange = useCallback(
    (value: number) => {
      setSensitivity(value);
      setDetectorSensitivity(value);
    },
    [setDetectorSensitivity],
  );

  // Process hits when playing
  useEffect(() => {
    if (stage === 'playing' && frame) {
      processFrame(frame);
    }
  }, [stage, frame, processFrame]);

  // Canvas render loop
  useEffect(() => {
    if (stage !== 'calibrating' && stage !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const render = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // These components draw onto the canvas via effects
      // We trigger re-render by passing ctx through state would be wasteful,
      // so we draw directly here
      const w = canvas.width;
      const h = canvas.height;

      // Draw pads
      if (stage === 'playing') {
        const scale = beginnerMode ? 1.4 : 1;
        for (const pad of drumKitConfig.pads) {
          drawPad(ctx, pad, w, h, activePads.has(pad.id), scale);
        }

        // Draw ripples
        const now = performance.now();
        const remaining: RippleState[] = [];
        for (const ripple of ripples) {
          if (drawRipple(ctx, ripple, w, h, now)) {
            remaining.push(ripple);
          }
        }
        if (remaining.length !== ripples.length) {
          setRipples(remaining);
        }
      }

      // Draw hand skeleton
      if (frame) {
        for (const hand of frame.hands) {
          drawLandmarks(ctx, hand.landmarks, w, h);
        }
      }

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafRef.current);
  }, [stage, frame, activePads, ripples, setRipples, beginnerMode]);

  if (stage === 'idle') {
    return <StartScreen onStart={handleStart} error={cameraError} />;
  }

  return (
    <div className="relative w-full h-full">
      <CameraView ref={videoRef} canvasRef={canvasRef} />

      {stage === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-gray-300 font-semibold">
              {trackingLoading ? 'Loading hand tracking model...' : 'Setting up camera...'}
            </p>
          </div>
        </div>
      )}

      {stage === 'calibrating' && (
        <CalibrationOverlay frame={frame} onReady={handleCalibrationReady} />
      )}

      {stage === 'playing' && (
        <>
          <InstrumentSelector current={drumKitConfig.name} />
          <DistanceBanner status={distanceStatus} />

          <button
            onClick={() => setSettingsOpen((o) => !o)}
            className="absolute top-4 right-4 z-30 bg-gray-900/70 backdrop-blur-sm w-10 h-10 rounded-full flex items-center justify-center text-gray-300 hover:text-white transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          <SettingsPanel
            isOpen={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            sensitivity={sensitivity}
            onSensitivityChange={handleSensitivityChange}
            beginnerMode={beginnerMode}
            onBeginnerModeChange={setBeginnerMode}
            pads={drumKitConfig.pads}
            onCustomSample={loadCustomSample}
          />
        </>
      )}

      {cameraError && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 bg-red-500/80 px-6 py-2 rounded-full text-white text-sm font-semibold">
          {cameraError}
        </div>
      )}
    </div>
  );
}
