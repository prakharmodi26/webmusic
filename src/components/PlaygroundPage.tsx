import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useCamera } from '../hooks/useCamera';
import { useHandTracking } from '../hooks/useHandTracking';
import { useHitDetection } from '../hooks/useHitDetection';
import { useAudio } from '../hooks/useAudio';
import { useDistanceGuide } from '../hooks/useDistanceGuide';
import { drumKitConfig } from '../config/instruments/drumKit';
import type { PadConfig, PadRegion } from '../types/instrument';
import StartScreen from './StartScreen';
import CameraView from './CameraView';
import CalibrationOverlay from './CalibrationOverlay';
import DistanceBanner from './DistanceBanner';
import SettingsPanel from './SettingsPanel';
import InstrumentSelector from './InstrumentSelector';
import { drawPad, drawRipple, drawFistIndicator, drawResizeHandle, type RippleState } from '../utils/canvas';
import { pointInRegion } from '../utils/geometry';
import { recognizeGesture } from '../core/gestureRecognizer';
import { getFistCenter, getFistRadius } from '../core/hitDetector';

type Stage = 'idle' | 'loading' | 'calibrating' | 'playing';

/** Hard limits for pad radius (normalized 0-1 space). */
const MIN_PAD_RADIUS = 0.04;
const MAX_PAD_RADIUS = 0.25;

interface DragState {
  padId: string;
  offsetX: number;
  offsetY: number;
}

interface ResizeState {
  padId: string;
  startRadius: number;
  startDist: number;
}

export default function PlaygroundPage() {
  const [stage, setStage] = useState<Stage>('idle');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [beginnerMode, setBeginnerMode] = useState(false);

  // Movable/resizable pad state: overrides for position and radius
  const [padPositions, setPadPositions] = useState<Map<string, { cx: number; cy: number }>>(new Map());
  const [padRadii, setPadRadii] = useState<Map<string, number>>(new Map());

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);
  const dragRef = useRef<DragState | null>(null);
  const resizeRef = useRef<ResizeState | null>(null);
  const wasDraggingRef = useRef(false);

  const { videoRef, isActive: cameraActive, error: cameraError, start: startCamera } = useCamera();
  const { frame, isLoading: trackingLoading, isReady: trackingReady, init: initTracking, startLoop } = useHandTracking(videoRef);
  const { engineRef, isLoaded: audioLoaded, init: initAudio, loadCustomSample, resume: resumeAudio } = useAudio();

  // Build current pads array with overridden positions/radii
  const currentPads: PadConfig[] = useMemo(() => {
    return drumKitConfig.pads.map((pad) => {
      const pos = padPositions.get(pad.id);
      const rad = padRadii.get(pad.id);
      const region: PadRegion = {
        cx: pos?.cx ?? pad.region.cx,
        cy: pos?.cy ?? pad.region.cy,
        radius: rad ?? pad.region.radius,
      };
      return { ...pad, region };
    });
  }, [padPositions, padRadii]);

  const { processFrame, activePads, ripples, setRipples } = useHitDetection(engineRef, currentPads);
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

  // ── Helpers to convert mouse/touch to normalized coords ──

  const getNormalized = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { nx: 0, ny: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      nx: (clientX - rect.left) / rect.width,
      ny: (clientY - rect.top) / rect.height,
    };
  }, []);

  // Check if a point is near the resize handle of a pad
  const hitResizeHandle = useCallback((nx: number, ny: number, pad: PadConfig): boolean => {
    const handleX = pad.region.cx + pad.region.radius * 0.7;
    const handleY = pad.region.cy + pad.region.radius * 0.7;
    const dx = nx - handleX;
    const dy = ny - handleY;
    return Math.sqrt(dx * dx + dy * dy) < 0.03;
  }, []);

  // ── Drag & Resize handlers ──

  const handleDragStart = useCallback((clientX: number, clientY: number) => {
    if (stage !== 'playing') return;
    const { nx, ny } = getNormalized(clientX, clientY);

    // Check resize handles first
    for (const pad of currentPads) {
      if (hitResizeHandle(nx, ny, pad)) {
        const dist = Math.sqrt(
          (nx - pad.region.cx) ** 2 + (ny - pad.region.cy) ** 2,
        );
        resizeRef.current = {
          padId: pad.id,
          startRadius: pad.region.radius,
          startDist: dist,
        };
        wasDraggingRef.current = false;
        return;
      }
    }

    // Check pad bodies for drag
    for (const pad of currentPads) {
      if (pointInRegion(nx, ny, pad.region)) {
        dragRef.current = {
          padId: pad.id,
          offsetX: nx - pad.region.cx,
          offsetY: ny - pad.region.cy,
        };
        wasDraggingRef.current = false;
        return;
      }
    }
  }, [stage, currentPads, getNormalized, hitResizeHandle]);

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    const { nx, ny } = getNormalized(clientX, clientY);

    if (resizeRef.current) {
      wasDraggingRef.current = true;
      const { padId, startRadius, startDist } = resizeRef.current;
      const pad = currentPads.find((p) => p.id === padId);
      if (!pad) return;
      const currentDist = Math.sqrt(
        (nx - pad.region.cx) ** 2 + (ny - pad.region.cy) ** 2,
      );
      const scale = currentDist / startDist;
      const newRadius = Math.max(MIN_PAD_RADIUS, Math.min(MAX_PAD_RADIUS, startRadius * scale));
      setPadRadii((prev) => new Map(prev).set(padId, newRadius));
      return;
    }

    if (dragRef.current) {
      wasDraggingRef.current = true;
      const { padId, offsetX, offsetY } = dragRef.current;
      const newCx = Math.max(0, Math.min(1, nx - offsetX));
      const newCy = Math.max(0, Math.min(1, ny - offsetY));
      setPadPositions((prev) => new Map(prev).set(padId, { cx: newCx, cy: newCy }));
    }
  }, [getNormalized, currentPads]);

  const handleDragEnd = useCallback(() => {
    dragRef.current = null;
    resizeRef.current = null;
  }, []);

  // Mouse event handlers
  const onMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    handleDragStart(e.clientX, e.clientY);
  }, [handleDragStart]);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    handleDragMove(e.clientX, e.clientY);
  }, [handleDragMove]);

  const onMouseUp = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  // Touch event handlers
  const onTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, [handleDragStart]);

  const onTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, [handleDragMove]);

  const onTouchEnd = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  // Tap-to-test: clicking on canvas plays the pad under the cursor (skip if was dragging)
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (stage !== 'playing') return;
      if (wasDraggingRef.current) {
        wasDraggingRef.current = false;
        return;
      }
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width;
      const ny = (e.clientY - rect.top) / rect.height;

      resumeAudio();

      for (const pad of currentPads) {
        if (pointInRegion(nx, ny, pad.region)) {
          engineRef.current?.play(pad.id, 0.8);
          break;
        }
      }
    },
    [stage, currentPads, engineRef, resumeAudio],
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

      const w = canvas.width;
      const h = canvas.height;

      // Draw pads
      if (stage === 'playing') {
        const scale = beginnerMode ? 1.4 : 1;
        for (const pad of currentPads) {
          drawPad(ctx, pad, w, h, activePads.has(pad.id), scale);
          drawResizeHandle(ctx, pad.region.cx, pad.region.cy, pad.region.radius, w, h);
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

      // Draw fist circle indicators for closed fists
      if (frame) {
        for (const hand of frame.hands) {
          const gesture = recognizeGesture(hand);
          if (gesture === 'fist') {
            const center = getFistCenter(hand.landmarks);
            const radius = getFistRadius(hand.landmarks);
            drawFistIndicator(ctx, center.x, center.y, radius, w, h);
          }
        }
      }

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafRef.current);
  }, [stage, frame, currentPads, activePads, ripples, setRipples, beginnerMode]);

  if (stage === 'idle') {
    return <StartScreen onStart={handleStart} error={cameraError} />;
  }

  return (
    <div className="relative w-full h-full">
      <CameraView
        ref={videoRef}
        canvasRef={canvasRef}
        onCanvasClick={handleCanvasClick}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      />

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
            beginnerMode={beginnerMode}
            onBeginnerModeChange={setBeginnerMode}
            pads={currentPads}
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
