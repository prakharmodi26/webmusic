import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useCamera } from '../hooks/useCamera';
import { useHandTracking } from '../hooks/useHandTracking';
import { useHitDetection } from '../hooks/useHitDetection';
import { useAudio } from '../hooks/useAudio';
import { useDistanceGuide } from '../hooks/useDistanceGuide';
import { drumKitConfig } from '../config/instruments/drumKit';
import { tablaConfig } from '../config/instruments/tabla';
import { customConfig, generatePadId, customPadColors } from '../config/instruments/custom';
import { tilesConfig } from '../config/instruments/tiles';
import type { PadConfig, PadRegion, InstrumentConfig, DrumShape } from '../types/instrument';
import InstrumentHome, { type InstrumentType } from './InstrumentHome';
import PinchPianoGame from './PinchPianoGame';
import CameraView from './CameraView';
import DistanceBanner from './DistanceBanner';
import SettingsPanel from './SettingsPanel';
import { drawPad, drawRipple, drawFistIndicator, drawResizeCorner, drawHandSkeleton, type RippleState } from '../utils/canvas';
import { pointInRegion } from '../utils/geometry';
import { recognizeGesture } from '../core/gestureRecognizer';
import { getHandCenter, getFistRadius, getIndexFingertip } from '../core/hitDetector';

type Stage = 'idle' | 'loading' | 'playing';

/** Hard limits for pad radius (normalized 0-1 space). */
const MIN_PAD_RADIUS = 0.03;
const MAX_PAD_RADIUS = 0.35;

interface DragState {
  padId: string;
  offsetX: number;
  offsetY: number;
}

interface ResizeState {
  padId: string;
  startRadius: number;
  startX: number;
  startY: number;
}

function getInstrumentConfig(type: InstrumentType): InstrumentConfig {
  switch (type) {
    case 'drums':
      return drumKitConfig;
    case 'tabla':
      return tablaConfig;
    case 'custom':
      return customConfig;
    case 'tiles':
      return tilesConfig;
    case 'pinch-piano':
      // Pinch piano uses its own component and config
      return { id: 'pinch-piano', name: 'Pinch Piano', pads: [] };
  }
}

export default function PlaygroundPage() {
  const [stage, setStage] = useState<Stage>('idle');
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentType | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [beginnerMode, setBeginnerMode] = useState(false);
  const [sensitivity, setSensitivity] = useState(0.6);

  // Movable/resizable pad state: overrides for position and radius
  const [padPositions, setPadPositions] = useState<Map<string, { cx: number; cy: number }>>(new Map());
  const [padRadii, setPadRadii] = useState<Map<string, number>>(new Map());

  // Custom mode: store pads array separately (starts empty)
  const [customPads, setCustomPads] = useState<PadConfig[]>([]);

  // Tabla sound overrides
  const [tablaSoundOverrides, setTablaSoundOverrides] = useState<Map<string, string>>(new Map());

  // Pad menu for custom mode
  const [padMenuOpen, setPadMenuOpen] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);
  const dragRef = useRef<DragState | null>(null);
  const resizeRef = useRef<ResizeState | null>(null);
  const wasDraggingRef = useRef(false);
  const wasResizeClickRef = useRef(false);

  const { videoRef, isActive: cameraActive, error: cameraError, start: startCamera } = useCamera();
  const { frame, isLoading: trackingLoading, isReady: trackingReady, init: initTracking, startLoop } = useHandTracking(videoRef);
  const { engineRef, isLoaded: audioLoaded, init: initAudio, loadCustomSample, resume: resumeAudio } = useAudio();

  // Get base config for selected instrument
  const instrumentConfig = selectedInstrument ? getInstrumentConfig(selectedInstrument) : null;

  // Build current pads array with overridden positions/radii/sounds
  const currentPads: PadConfig[] = useMemo(() => {
    if (!selectedInstrument) return [];

    // For custom mode, use customPads state
    if (selectedInstrument === 'custom') {
      return customPads.map((pad) => {
        const pos = padPositions.get(pad.id);
        const rad = padRadii.get(pad.id);
        const region: PadRegion = {
          cx: pos?.cx ?? pad.region.cx,
          cy: pos?.cy ?? pad.region.cy,
          radius: rad ?? pad.region.radius,
        };
        return { ...pad, region };
      });
    }

    // For tiles, use tilesConfig
    if (selectedInstrument === 'tiles') {
      return tilesConfig.pads.map((pad) => {
        const pos = padPositions.get(pad.id);
        const rad = padRadii.get(pad.id);
        const region: PadRegion = {
          cx: pos?.cx ?? pad.region.cx,
          cy: pos?.cy ?? pad.region.cy,
          radius: rad ?? pad.region.radius,
        };
        return { ...pad, region };
      });
    }

    // For drums and tabla
    const basePads = selectedInstrument === 'tabla' ? tablaConfig.pads : drumKitConfig.pads;
    return basePads.map((pad) => {
      const pos = padPositions.get(pad.id);
      const rad = padRadii.get(pad.id);
      const soundOverride = selectedInstrument === 'tabla' ? tablaSoundOverrides.get(pad.id) : undefined;
      const region: PadRegion = {
        cx: pos?.cx ?? pad.region.cx,
        cy: pos?.cy ?? pad.region.cy,
        radius: rad ?? pad.region.radius,
      };
      return {
        ...pad,
        region,
        soundFile: soundOverride ?? pad.soundFile,
      };
    });
  }, [selectedInstrument, customPads, padPositions, padRadii, tablaSoundOverrides]);

  const useFingerTip = selectedInstrument === 'tiles';
  // Use full pad radius (1.0) for tiles since we want fingertip to trigger on any part of the tile
  const effectiveSensitivity = selectedInstrument === 'tiles' ? 1.0 : sensitivity;
  const { processFrame, activePads, ripples, setRipples } = useHitDetection(engineRef, currentPads, effectiveSensitivity, useFingerTip);
  const distanceStatus = useDistanceGuide(frame);

  // Handle instrument selection
  const handleSelectInstrument = useCallback(async (instrument: InstrumentType) => {
    setSelectedInstrument(instrument);
    setStage('loading');

    // Reset position/radius overrides for new instrument
    setPadPositions(new Map());
    setPadRadii(new Map());

    await startCamera();
    await initTracking();

    // Get pads to load audio for (custom starts with no audio - user uploads)
    const padsToLoad = instrument === 'custom' ? [] : getInstrumentConfig(instrument).pads;
    await initAudio(padsToLoad);
  }, [startCamera, initTracking, initAudio]);

  // Handle going back to home
  const handleGoHome = useCallback(() => {
    setStage('idle');
    setSelectedInstrument(null);
    setSettingsOpen(false);
    setPadMenuOpen(false);
    // Reset custom pads when going home
    setCustomPads([]);
    setPadPositions(new Map());
    setPadRadii(new Map());
    setTablaSoundOverrides(new Map());
  }, []);

  useEffect(() => {
    if (cameraActive && trackingReady && audioLoaded && stage === 'loading') {
      startLoop();
      resumeAudio();
      setStage('playing');
    }
  }, [cameraActive, trackingReady, audioLoaded, stage, startLoop, resumeAudio]);

  // ── Custom Mode: Add Pad ──
  const handleAddPad = useCallback((shape: DrumShape = 'drum') => {
    const shapeLabels: Record<DrumShape, string> = {
      drum: 'Drum',
      cymbal: 'Cymbal',
      hihat: 'Hi-Hat',
      tabla: 'Tabla',
      tile: 'Tile',
    };
    const newPad: PadConfig = {
      id: generatePadId(),
      label: `${shapeLabels[shape]} ${customPads.length + 1}`,
      region: { cx: 0.5, cy: 0.5, radius: 0.12 },
      soundFile: '', // No sound until user uploads
      color: customPadColors[customPads.length % customPadColors.length],
      shape,
    };
    setCustomPads((prev) => [...prev, newPad]);
    setPadMenuOpen(false);
  }, [customPads.length]);

  // ── Custom Mode: Delete Pad ──
  const handleDeletePad = useCallback((padId: string) => {
    setCustomPads((prev) => prev.filter((p) => p.id !== padId));
    setPadPositions((prev) => {
      const next = new Map(prev);
      next.delete(padId);
      return next;
    });
    setPadRadii((prev) => {
      const next = new Map(prev);
      next.delete(padId);
      return next;
    });
  }, []);

  // ── Custom Mode: Change Pad Color ──
  const handlePadColorChange = useCallback((padId: string, color: string) => {
    setCustomPads((prev) =>
      prev.map((p) => (p.id === padId ? { ...p, color } : p))
    );
  }, []);

  // ── Custom Mode: Change Pad Label ──
  const handlePadLabelChange = useCallback((padId: string, label: string) => {
    setCustomPads((prev) =>
      prev.map((p) => (p.id === padId ? { ...p, label } : p))
    );
  }, []);

  // ── Tabla: Change Sound ──
  const handleTablaSoundChange = useCallback(async (padId: string, soundFile: string) => {
    setTablaSoundOverrides((prev) => new Map(prev).set(padId, soundFile));
    // Load the new sound
    if (engineRef.current) {
      await engineRef.current.loadSample(padId, soundFile);
    }
  }, [engineRef]);

  // ── Custom: Change to Preset Sound ──
  const handlePresetSoundChange = useCallback(async (padId: string, soundFile: string) => {
    if (!soundFile) return;
    // Update the pad's soundFile
    setCustomPads((prev) =>
      prev.map((p) => (p.id === padId ? { ...p, soundFile } : p))
    );
    // Load the new sound
    if (engineRef.current) {
      await engineRef.current.loadSample(padId, soundFile);
    }
  }, [engineRef]);

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

  // Check if a point is in the bottom-right corner resize zone of a pad
  const hitResizeCorner = useCallback((nx: number, ny: number, pad: PadConfig): boolean => {
    // Bottom-right corner of the pad bounding box
    const right = pad.region.cx + pad.region.radius;
    const bottom = pad.region.cy + pad.region.radius;
    // Resize zone - larger and easier to hit
    const zoneSize = Math.max(0.05, pad.region.radius * 0.4);
    const zoneCenterX = right - zoneSize * 0.4;
    const zoneCenterY = bottom - zoneSize * 0.4;
    const dx = nx - zoneCenterX;
    const dy = ny - zoneCenterY;
    // Circular hit zone
    return Math.sqrt(dx * dx + dy * dy) <= zoneSize;
  }, []);

  // ── Drag & Resize handlers ──

  const handleDragStart = useCallback((clientX: number, clientY: number) => {
    if (stage !== 'playing') return;
    const { nx, ny } = getNormalized(clientX, clientY);
    wasResizeClickRef.current = false;

    // Check resize corners first (iterate in reverse to prioritize top/last drawn pads)
    for (let i = currentPads.length - 1; i >= 0; i--) {
      const pad = currentPads[i];
      if (hitResizeCorner(nx, ny, pad)) {
        resizeRef.current = {
          padId: pad.id,
          startRadius: pad.region.radius,
          startX: nx,
          startY: ny,
        };
        wasDraggingRef.current = false;
        wasResizeClickRef.current = true;
        return;
      }
    }

    // Check pad bodies for drag (iterate in reverse to prioritize top pads)
    for (let i = currentPads.length - 1; i >= 0; i--) {
      const pad = currentPads[i];
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
  }, [stage, currentPads, getNormalized, hitResizeCorner]);

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    const { nx, ny } = getNormalized(clientX, clientY);

    if (resizeRef.current) {
      wasDraggingRef.current = true;
      const { padId, startRadius, startX, startY } = resizeRef.current;
      const pad = currentPads.find((p) => p.id === padId);
      if (!pad) return;
      
      // Calculate new radius based on how far the mouse moved from start position
      const deltaX = nx - startX;
      const deltaY = ny - startY;
      // Use the larger of the two deltas for uniform scaling
      const delta = Math.max(deltaX, deltaY);
      const newRadius = Math.max(MIN_PAD_RADIUS, Math.min(MAX_PAD_RADIUS, startRadius + delta));
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

  // Tap-to-test: clicking on canvas plays the pad under the cursor (skip if was dragging/resizing)
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (stage !== 'playing') return;
      // Skip if we were dragging or clicked on resize corner
      if (wasDraggingRef.current || wasResizeClickRef.current) {
        wasDraggingRef.current = false;
        wasResizeClickRef.current = false;
        return;
      }
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width;
      const ny = (e.clientY - rect.top) / rect.height;

      // Don't play if clicking on a resize corner
      for (const pad of currentPads) {
        if (hitResizeCorner(nx, ny, pad)) {
          return;
        }
      }

      resumeAudio();

      for (const pad of currentPads) {
        if (pointInRegion(nx, ny, pad.region)) {
          engineRef.current?.play(pad.id, 0.8);
          break;
        }
      }
    },
    [stage, currentPads, engineRef, resumeAudio, hitResizeCorner],
  );

  // Process hits when playing
  useEffect(() => {
    if (stage === 'playing' && frame) {
      processFrame(frame);
    }
  }, [stage, frame, processFrame]);

  // Canvas render loop
  useEffect(() => {
    if (stage !== 'playing') return;

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
          drawResizeCorner(ctx, pad.region.cx, pad.region.cy, pad.region.radius, w, h);
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

      // Draw hand indicators
      if (frame) {
        for (const hand of frame.hands) {
          const gesture = recognizeGesture(hand);
          
          if (selectedInstrument === 'tiles') {
            // For piano tiles: draw hand skeleton and fingertip indicator
            drawHandSkeleton(ctx, hand.landmarks, w, h);
            // Draw a small circle at the index fingertip
            const fingertip = getIndexFingertip(hand.landmarks);
            ctx.beginPath();
            ctx.arc(fingertip.x * w, fingertip.y * h, 8, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 100, 100, 0.9)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 2;
            ctx.stroke();
          } else if (gesture === 'fist') {
            // For drums/tabla: show fist indicator only when fist detected
            const center = getHandCenter(hand.landmarks);
            const radius = getFistRadius(hand.landmarks);
            drawFistIndicator(ctx, center.x, center.y, radius, w, h);
          }
        }
      }

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafRef.current);
  }, [stage, frame, currentPads, activePads, ripples, setRipples, beginnerMode, selectedInstrument]);

  // Show home screen when idle and no instrument selected
  if (stage === 'idle' && !selectedInstrument) {
    return <InstrumentHome onSelectInstrument={handleSelectInstrument} error={cameraError} />;
  }

  // Pinch Piano has its own game component
  if (selectedInstrument === 'pinch-piano') {
    return <PinchPianoGame onGoHome={handleGoHome} />;
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

      {stage === 'playing' && (
        <>
          {/* Home button and instrument name */}
          <div className="absolute top-4 left-4 z-30 flex items-center gap-2">
            <button
              onClick={handleGoHome}
              className="bg-gray-900/70 backdrop-blur-sm w-10 h-10 rounded-full flex items-center justify-center text-gray-300 hover:text-white transition-colors"
              title="Back to Home"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
            </button>
            <span className="bg-gray-900/70 backdrop-blur-sm px-4 py-2 rounded-full text-sm text-gray-300 font-semibold">
              {instrumentConfig?.name ?? 'Instrument'}
            </span>
          </div>

          <DistanceBanner status={distanceStatus} />

          {/* Add Pad menu for custom mode */}
          {selectedInstrument === 'custom' && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30">
              {padMenuOpen && (
                <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-gray-900/95 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-gray-700 min-w-[200px]">
                  <p className="text-gray-400 text-xs font-semibold mb-3 text-center">SELECT PAD TYPE</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleAddPad('drum')}
                      className="flex flex-col items-center gap-1 p-3 rounded-xl bg-gray-800 hover:bg-gray-700 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 border-2 border-gray-400" />
                      <span className="text-xs text-gray-300">Drum</span>
                    </button>
                    <button
                      onClick={() => handleAddPad('cymbal')}
                      className="flex flex-col items-center gap-1 p-3 rounded-xl bg-gray-800 hover:bg-gray-700 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-700 border-2 border-yellow-500" />
                      <span className="text-xs text-gray-300">Cymbal</span>
                    </button>
                    <button
                      onClick={() => handleAddPad('hihat')}
                      className="flex flex-col items-center gap-1 p-3 rounded-xl bg-gray-800 hover:bg-gray-700 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-600 border-2 border-yellow-400 relative">
                        <div className="absolute inset-1 rounded-full bg-yellow-500/50" />
                      </div>
                      <span className="text-xs text-gray-300">Hi-Hat</span>
                    </button>
                    <button
                      onClick={() => handleAddPad('tabla')}
                      className="flex flex-col items-center gap-1 p-3 rounded-xl bg-gray-800 hover:bg-gray-700 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-100 to-amber-300 border-2 border-amber-700 flex items-center justify-center">
                        <div className="w-4 h-4 rounded-full bg-gray-900" />
                      </div>
                      <span className="text-xs text-gray-300">Tabla</span>
                    </button>
                    <button
                      onClick={() => handleAddPad('tile')}
                      className="flex flex-col items-center gap-1 p-3 rounded-xl bg-gray-800 hover:bg-gray-700 transition-colors col-span-2"
                    >
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-400 to-emerald-600 border-2 border-green-300" />
                      <span className="text-xs text-gray-300">Tile</span>
                    </button>
                  </div>
                </div>
              )}
              <button
                onClick={() => setPadMenuOpen((o) => !o)}
                className={`bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-6 py-3 rounded-full font-semibold shadow-lg hover:scale-105 transition-transform flex items-center gap-2 ${padMenuOpen ? 'ring-2 ring-white/50' : ''}`}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" className={`transition-transform ${padMenuOpen ? 'rotate-45' : ''}`}>
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add Pad
              </button>
            </div>
          )}

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
            instrumentType={selectedInstrument!}
            sensitivity={sensitivity}
            onSensitivityChange={setSensitivity}
            onTablaSoundChange={selectedInstrument === 'tabla' ? handleTablaSoundChange : undefined}
            onDeletePad={selectedInstrument === 'custom' ? handleDeletePad : undefined}
            onPadColorChange={selectedInstrument === 'custom' ? handlePadColorChange : undefined}
            onPadLabelChange={selectedInstrument === 'custom' ? handlePadLabelChange : undefined}
            onPresetSoundChange={selectedInstrument === 'custom' ? handlePresetSoundChange : undefined}
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
