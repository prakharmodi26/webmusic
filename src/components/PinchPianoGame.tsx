import { useState, useRef, useCallback, useEffect } from 'react';
import { useCamera } from '../hooks/useCamera';
import { useHandTracking } from '../hooks/useHandTracking';
import { PinchPianoEngine, type DifficultyMode } from '../game/PinchPianoEngine';
import { pinchPianoConfig } from '../config/instruments/pinchPiano';
import { detectPinches, createEmptyPinchState, type PinchState } from '../core/pinchDetector';
import { AudioEngine } from '../core/audioEngine';
import type { Column, GameState, MissAnimation, HitAnimation } from '../game/types';

interface PinchPianoGameProps {
  onGoHome: () => void;
}

export default function PinchPianoGame({ onGoHome }: PinchPianoGameProps) {
  const [stage, setStage] = useState<'loading' | 'ready' | 'playing'>('loading');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [difficultyMode, setDifficultyMode] = useState<DifficultyMode>('medium');
  const [settingsOpen, setSettingsOpen] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<PinchPianoEngine | null>(null);
  const audioRef = useRef<AudioEngine | null>(null);
  const pinchStateRef = useRef<PinchState>(createEmptyPinchState());
  const rafRef = useRef<number>(0);
  const missAnimationsRef = useRef<MissAnimation[]>([]);
  const hitAnimationsRef = useRef<HitAnimation[]>([]);

  const { videoRef, isActive: cameraActive, error: cameraError, start: startCamera } = useCamera();
  const { frame, isLoading: trackingLoading, isReady: trackingReady, init: initTracking, startLoop } = useHandTracking(videoRef);

  // Initialize camera and audio
  useEffect(() => {
    const init = async () => {
      await startCamera();
      await initTracking();

      const audio = new AudioEngine();
      await audio.init();

      const columns: Column[] = [0, 1, 2, 3];
      await Promise.all(
        columns.map((col) => audio.loadSample(`col-${col}`, pinchPianoConfig.sounds[col]))
      );
      audioRef.current = audio;
    };

    init();

    return () => {
      audioRef.current?.destroy();
    };
  }, [startCamera, initTracking]);

  // Start tracking loop when ready
  useEffect(() => {
    if (cameraActive && trackingReady) {
      startLoop();
      setStage('ready');
    }
  }, [cameraActive, trackingReady, startLoop]);

  const playSound = useCallback((column: Column) => {
    audioRef.current?.play(`col-${column}`, 0.8);
  }, []);

  const onMiss = useCallback(() => {}, []);

  const handleStartGame = useCallback(() => {
    const engine = new PinchPianoEngine(pinchPianoConfig, playSound, onMiss);
    engine.setDifficultyMode(difficultyMode);
    engine.start();
    engineRef.current = engine;
    setGameState(engine.getState());
    setStage('playing');
  }, [difficultyMode, playSound, onMiss]);

  const handleRestart = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.start();
      engineRef.current.setDifficultyMode(difficultyMode);
      setGameState(engineRef.current.getState());
    } else {
      handleStartGame();
    }
  }, [difficultyMode, handleStartGame]);

  // Update pinch state from hand tracking (now handles multiple hands)
  useEffect(() => {
    if (frame && frame.hands.length > 0) {
      pinchStateRef.current = detectPinches(frame.hands, pinchStateRef.current);
    } else {
      pinchStateRef.current = createEmptyPinchState();
    }
  }, [frame]);

  // Game loop
  useEffect(() => {
    if (stage !== 'playing' || !engineRef.current) return;

    const loop = (timestamp: number) => {
      const engine = engineRef.current;
      if (!engine) return;

      engine.update(timestamp, pinchStateRef.current);
      setGameState({ ...engine.getState() });
      missAnimationsRef.current = engine.getMissAnimations();
      hitAnimationsRef.current = engine.getHitAnimations();

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [stage]);

  // Apply difficulty mode changes to running engine
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setDifficultyMode(difficultyMode);
    }
  }, [difficultyMode]);

  const renderSettingsMenu = () => (
    <div className="absolute top-4 right-4 z-30">
      <button
        onClick={() => setSettingsOpen((o) => !o)}
        className="w-10 h-10 rounded-full bg-gray-900/70 backdrop-blur-sm flex items-center justify-center text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
        title="Settings"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.14,12.94a1.72,1.72,0,0,0,0-1.88l2-1.55a.43.43,0,0,0,.1-.54l-1.9-3.29a.44.44,0,0,0-.52-.19l-2.35.94a6.55,6.55,0,0,0-1.62-.94l-.36-2.49A.44.44,0,0,0,13,2H11a.44.44,0,0,0-.43.36L10.21,4.85a6.91,6.91,0,0,0-1.62.94L6.24,4.85a.44.44,0,0,0-.52.19L3.82,8.33a.44.44,0,0,0,.1.54l2,1.55a1.72,1.72,0,0,0,0,1.88l-2,1.55a.43.43,0,0,0-.1.54l1.9,3.29a.44.44,0,0,0,.52.19l2.35-.94a6.55,6.55,0,0,0,1.62.94l.36,2.49A.44.44,0,0,0,11,22h2a.44.44,0,0,0,.43-.36l.36-2.49a6.91,6.91,0,0,0,1.62-.94l2.35.94a.44.44,0,0,0,.52-.19l1.9-3.29a.44.44,0,0,0-.1-.54ZM12,15.5A3.5,3.5,0,1,1,15.5,12,3.5,3.5,0,0,1,12,15.5Z" />
        </svg>
      </button>

      {settingsOpen && (
        <div className="mt-2 w-56 bg-gray-900/95 backdrop-blur-md border border-gray-800 rounded-lg shadow-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-200">Difficulty</span>
            <button
              className="text-xs text-gray-400 hover:text-white"
              onClick={() => setSettingsOpen(false)}
            >
              Close
            </button>
          </div>
          <div className="space-y-2">
            {(['easy', 'medium', 'hard'] as DifficultyMode[]).map((mode) => (
              <label
                key={mode}
                className={`flex items-center gap-3 cursor-pointer rounded px-2 py-2 ${
                  difficultyMode === mode ? 'bg-gray-800 border border-pink-500/50' : 'bg-gray-800/40'
                }`}
              >
                <input
                  type="radio"
                  name="difficulty"
                  value={mode}
                  checked={difficultyMode === mode}
                  onChange={() => setDifficultyMode(mode)}
                  className="accent-pink-500"
                />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold capitalize text-white">{mode}</span>
                  <span className="text-xs text-gray-400">
                    +{pinchPianoConfig.speedSteps[mode]} speed every {pinchPianoConfig.hitsPerSpeedStep} hits
                  </span>
                </div>
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            Speed increases only after {pinchPianoConfig.hitsPerSpeedStep} consecutive hits. Misses reset the streak but keep current speed.
          </p>
        </div>
      )}
    </div>
  );

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }

      const w = canvas.width;
      const h = canvas.height;
      const { hitZone, columnColors } = pinchPianoConfig;

      ctx.clearRect(0, 0, w, h);

      // Draw column backgrounds
      for (let col = 0; col < 4; col++) {
        const x = (col / 4) * w;
        const colWidth = w / 4;
        ctx.fillStyle = `${columnColors[col as Column]}10`;
        ctx.fillRect(x, 0, colWidth, h);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      // Draw hit zone
      const hitZoneY = hitZone.yMin * h;
      const hitZoneHeight = (hitZone.yMax - hitZone.yMin) * h;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(0, hitZoneY, w, hitZoneHeight);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, hitZoneY);
      ctx.lineTo(w, hitZoneY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, hitZoneY + hitZoneHeight);
      ctx.lineTo(w, hitZoneY + hitZoneHeight);
      ctx.stroke();

      // Draw falling tiles
      if (gameState) {
        for (const tile of gameState.tiles) {
          if (tile.hit || tile.missed) continue;

          const colWidth = w / 4;
          const tileWidth = colWidth * 0.8;
          const tileHeight = h * 0.08;
          const x = (tile.column / 4) * w + (colWidth - tileWidth) / 2;
          const y = tile.y * h - tileHeight / 2;

          const color = columnColors[tile.column];

          // Shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.beginPath();
          ctx.roundRect(x + 3, y + 3, tileWidth, tileHeight, 8);
          ctx.fill();

          // Tile body
          const gradient = ctx.createLinearGradient(x, y, x, y + tileHeight);
          gradient.addColorStop(0, color);
          gradient.addColorStop(1, adjustBrightness(color, -30));
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.roundRect(x, y, tileWidth, tileHeight, 8);
          ctx.fill();

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Hit animations
        for (const anim of hitAnimationsRef.current) {
          const elapsed = performance.now() - anim.startTime;
          const duration = 250;
          const progress = elapsed / duration;

          const colWidth = w / 4;
          const x = (anim.column + 0.5) * colWidth;
          const y = anim.y * h;
          const maxRadius = colWidth * 0.6;

          ctx.beginPath();
          ctx.arc(x, y, maxRadius * progress, 0, Math.PI * 2);
          ctx.strokeStyle = `${anim.color}${Math.round((1 - progress) * 255).toString(16).padStart(2, '0')}`;
          ctx.lineWidth = 4 * (1 - progress);
          ctx.stroke();
        }

        // Miss animations
        for (const anim of missAnimationsRef.current) {
          for (const frag of anim.fragments) {
            ctx.save();
            ctx.translate(frag.x * w, frag.y * h);
            ctx.rotate(frag.rotation);
            ctx.globalAlpha = frag.opacity;
            ctx.fillStyle = frag.color;
            ctx.fillRect(-frag.size * w / 2, -frag.size * h / 2, frag.size * w, frag.size * h);
            ctx.restore();
          }
        }
      }

      // Draw pinch indicators at bottom
      const indicatorY = h - 50;
      const indicatorRadius = 25;
      const pinchState = pinchStateRef.current;
      const colKeys: (keyof PinchState)[] = ['col0', 'col1', 'col2', 'col3'];
      const labels = ['L-Mid', 'L-Idx', 'R-Idx', 'R-Mid'];

      for (let col = 0; col < 4; col++) {
        const colWidth = w / 4;
        const x = (col + 0.5) * colWidth;
        const isActive = pinchState[colKeys[col]];
        const color = columnColors[col as Column];

        // Label
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(labels[col], x, indicatorY - 35);

        // Indicator circle
        ctx.beginPath();
        ctx.arc(x, indicatorY, indicatorRadius, 0, Math.PI * 2);

        if (isActive) {
          ctx.fillStyle = color;
          ctx.fill();
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 3;
          ctx.stroke();
        } else {
          ctx.fillStyle = 'rgba(50, 50, 50, 0.8)';
          ctx.fill();
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      requestAnimationFrame(render);
    };

    const animationId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationId);
  }, [gameState]);

  // Loading screen
  if (stage === 'loading') {
    return (
      <div className="relative w-full h-full bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
        <video ref={videoRef} className="hidden" playsInline muted />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-gray-300 font-semibold">
              {trackingLoading ? 'Loading hand tracking...' : 'Setting up camera...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Ready/Start screen
  if (stage === 'ready') {
    return (
      <div className="relative w-full h-full bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
        <video ref={videoRef} className="hidden" playsInline muted />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
        {renderSettingsMenu()}

        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-center space-y-8 p-8">
            <h1 className="text-5xl font-bold text-white">Pinch Piano</h1>
            <p className="text-xl text-purple-200 max-w-md mx-auto">
              Pinch your thumb with different fingers to hit tiles!
            </p>

            {/* Finger mapping guide */}
            <div className="flex justify-center gap-6 mt-6">
              <div className="text-center">
                <p className="text-sm text-gray-400 mb-3">Left Hand</p>
                <div className="flex gap-4">
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className="w-14 h-14 rounded-full border-2 flex items-center justify-center"
                      style={{ backgroundColor: pinchPianoConfig.columnColors[0], borderColor: 'rgba(255,255,255,0.5)' }}
                    >
                      <span className="text-sm font-bold text-white">1</span>
                    </div>
                    <span className="text-xs text-gray-300">Thumb +</span>
                    <span className="text-xs text-gray-300">Middle</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className="w-14 h-14 rounded-full border-2 flex items-center justify-center"
                      style={{ backgroundColor: pinchPianoConfig.columnColors[1], borderColor: 'rgba(255,255,255,0.5)' }}
                    >
                      <span className="text-sm font-bold text-white">2</span>
                    </div>
                    <span className="text-xs text-gray-300">Thumb +</span>
                    <span className="text-xs text-gray-300">Index</span>
                  </div>
                </div>
              </div>

              <div className="w-px bg-gray-600" />

              <div className="text-center">
                <p className="text-sm text-gray-400 mb-3">Right Hand</p>
                <div className="flex gap-4">
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className="w-14 h-14 rounded-full border-2 flex items-center justify-center"
                      style={{ backgroundColor: pinchPianoConfig.columnColors[2], borderColor: 'rgba(255,255,255,0.5)' }}
                    >
                      <span className="text-sm font-bold text-white">3</span>
                    </div>
                    <span className="text-xs text-gray-300">Thumb +</span>
                    <span className="text-xs text-gray-300">Index</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className="w-14 h-14 rounded-full border-2 flex items-center justify-center"
                      style={{ backgroundColor: pinchPianoConfig.columnColors[3], borderColor: 'rgba(255,255,255,0.5)' }}
                    >
                      <span className="text-sm font-bold text-white">4</span>
                    </div>
                    <span className="text-xs text-gray-300">Thumb +</span>
                    <span className="text-xs text-gray-300">Middle</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <button
                onClick={handleStartGame}
                className="px-12 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xl font-bold rounded-full shadow-lg hover:scale-105 transition-transform"
              >
                Start Game
              </button>

              <div>
                <button
                  onClick={onGoHome}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Back to Home
                </button>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={onGoHome}
          className="absolute top-4 left-4 z-30 bg-gray-900/70 backdrop-blur-sm w-10 h-10 rounded-full flex items-center justify-center text-gray-300 hover:text-white transition-colors"
          title="Back to Home"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
          </svg>
        </button>
      </div>
    );
  }

  // Playing screen
  return (
    <div className="relative w-full h-full bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      <video ref={videoRef} className="hidden" playsInline muted />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      {renderSettingsMenu()}

      {/* Countdown */}
      {gameState?.status === 'countdown' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
          <div className="text-8xl font-bold text-white animate-pulse">
            {gameState.countdownValue === 0 ? 'GO!' : gameState.countdownValue}
          </div>
        </div>
      )}

      {/* HUD */}
      {gameState && gameState.status !== 'countdown' && (
        <div className="absolute top-4 left-0 right-0 flex justify-between items-start px-4 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={onGoHome}
              className="bg-gray-900/70 backdrop-blur-sm w-10 h-10 rounded-full flex items-center justify-center text-gray-300 hover:text-white transition-colors"
              title="Back to Home"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
            </button>
            <div className="bg-gray-900/70 backdrop-blur-sm px-4 py-2 rounded-full">
              <span className="text-2xl font-bold text-white">{gameState.score}</span>
            </div>
            {gameState.highScore > 0 && (
              <div className="bg-gray-900/70 backdrop-blur-sm px-3 py-2 rounded-full">
                <span className="text-sm text-yellow-400">Best: {gameState.highScore}</span>
              </div>
            )}
          </div>

          <div className="bg-gray-900/70 backdrop-blur-sm px-4 py-2 rounded-full flex gap-1">
            {Array.from({ length: pinchPianoConfig.initialLives }).map((_, idx) => (
              <svg
                key={idx}
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill={idx < gameState.lives ? '#FF6B6B' : '#333'}
              >
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            ))}
          </div>
        </div>
      )}

      {/* Game Over */}
      {gameState?.status === 'gameover' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-30">
          <div className="text-center space-y-6 p-8">
            <h2 className="text-5xl font-bold text-red-500">Game Over</h2>
            <p className="text-3xl text-white">Score: {gameState.score}</p>
            <div className="space-y-3">
              <button
                onClick={handleRestart}
                className="block w-full px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-lg font-bold rounded-full hover:scale-105 transition-transform"
              >
                Play Again
              </button>
              <button
                onClick={onGoHome}
                className="block w-full px-8 py-3 bg-gray-700 text-white text-lg font-semibold rounded-full hover:bg-gray-600 transition-colors"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      )}

      {cameraError && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 bg-red-500/80 px-6 py-2 rounded-full text-white text-sm font-semibold">
          {cameraError}
        </div>
      )}
    </div>
  );
}

function adjustBrightness(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amount));
  const b = Math.max(0, Math.min(255, (num & 0x0000ff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
