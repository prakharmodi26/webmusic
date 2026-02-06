import { useState, useRef, useCallback, useEffect } from 'react';
import { useCamera } from '../hooks/useCamera';
import { useHandTracking } from '../hooks/useHandTracking';
import { PinchPianoEngine } from '../game/PinchPianoEngine';
import { MidiSongEngine } from '../game/MidiSongEngine';
import { pinchPianoConfig } from '../config/instruments/pinchPiano';
import { detectPinches, createEmptyPinchState, type PinchState } from '../core/pinchDetector';
import { ToneAudioEngine } from '../audio/ToneAudioEngine';
import SongSelector from './SongSelector';
import type { Column, GameState, MissAnimation, HitAnimation, Song, FallingTile } from '../game/types';

interface PinchPianoGameProps {
  onGoHome: () => void;
}

type GameStage = 'loading' | 'songSelect' | 'ready' | 'playing';

export default function PinchPianoGame({ onGoHome }: PinchPianoGameProps) {
  const [stage, setStage] = useState<GameStage>('loading');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [speed, setSpeed] = useState<number>(0.5); // default to easy

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<PinchPianoEngine | null>(null);
  const audioRef = useRef<ToneAudioEngine | null>(null);
  const midiEngineRef = useRef<MidiSongEngine | null>(null);
  const pinchStateRef = useRef<PinchState>(createEmptyPinchState());
  const rafRef = useRef<number>(0);
  const missAnimationsRef = useRef<MissAnimation[]>([]);
  const hitAnimationsRef = useRef<HitAnimation[]>([]);
  const lowestTileRef = useRef<FallingTile | null>(null);
  const mouseColumnRef = useRef<number>(-1); // -1 = no mouse column active

  const { videoRef, isActive: cameraActive, error: cameraError, start: startCamera } = useCamera();
  const { frame, isLoading: trackingLoading, isReady: trackingReady, init: initTracking, startLoop } = useHandTracking(videoRef);

  // Initialize camera and audio
  useEffect(() => {
    const init = async () => {
      await startCamera();
      await initTracking();

      // Initialize Tone.js audio engine
      const audio = new ToneAudioEngine();
      await audio.init();
      audioRef.current = audio;

      // Initialize MIDI engine
      midiEngineRef.current = new MidiSongEngine(
        pinchPianoConfig.fallDuration,
        pinchPianoConfig.hitLineY,
        pinchPianoConfig.baseTileHeight,
        pinchPianoConfig.maxTileHeight
      );
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
      setStage('songSelect');
    }
  }, [cameraActive, trackingReady, startLoop]);

  // Resume audio on user interaction
  const handleUserInteraction = useCallback(async () => {
    await audioRef.current?.resume();
  }, []);

  const playNote = useCallback((midiNote: number, velocity: number) => {
    audioRef.current?.playNote(midiNote, velocity);
  }, []);

  const stopNote = useCallback((midiNote: number) => {
    audioRef.current?.stopNote(midiNote);
  }, []);

  const onMiss = useCallback(() => {
    audioRef.current?.stopAll();
  }, []);

  const handleSongSelect = useCallback((song: Song) => {
    setSelectedSong(song);
    setStage('ready');
  }, []);

  const handleStartGame = useCallback(async () => {
    if (!selectedSong) return;

    await handleUserInteraction();

    // Apply speed multiplier: slower speed = longer fall duration
    const adjustedFallDuration = pinchPianoConfig.fallDuration / speed;
    const adjustedConfig = { ...pinchPianoConfig, fallDuration: adjustedFallDuration };

    // Create MidiSongEngine with adjusted speed for tile scheduling
    const midiEngine = new MidiSongEngine(
      adjustedFallDuration,
      pinchPianoConfig.hitLineY,
      pinchPianoConfig.baseTileHeight,
      pinchPianoConfig.maxTileHeight
    );
    const parsedSong = midiEngine.prepareSong(selectedSong);

    const engine = new PinchPianoEngine(adjustedConfig, playNote, stopNote, onMiss);
    engine.loadSong(parsedSong);
    engine.start();
    engineRef.current = engine;
    setGameState(engine.getState());
    setStage('playing');
  }, [selectedSong, speed, playNote, stopNote, onMiss, handleUserInteraction]);

  const handleRestart = useCallback(async () => {
    await handleUserInteraction();

    if (engineRef.current) {
      engineRef.current.start();
      setGameState(engineRef.current.getState());
    } else {
      handleStartGame();
    }
  }, [handleStartGame, handleUserInteraction]);

  const handleBackToSongSelect = useCallback(() => {
    audioRef.current?.stopAll();
    setSelectedSong(null);
    setStage('songSelect');
  }, []);

  // Update pinch state from hand tracking
  useEffect(() => {
    if (frame && frame.hands.length > 0) {
      pinchStateRef.current = detectPinches(frame.hands, pinchStateRef.current);
    } else if (mouseColumnRef.current === -1) {
      pinchStateRef.current = createEmptyPinchState();
    }
  }, [frame]);

  // Mouse/keyboard controls for column activation (click or keys 1-4)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getColumn = (e: MouseEvent) => Math.min(3, Math.floor((e.offsetX / canvas.clientWidth) * 4));

    const onMouseDown = (e: MouseEvent) => {
      const col = getColumn(e);
      mouseColumnRef.current = col;
      const state = createEmptyPinchState();
      const keys: (keyof PinchState)[] = ['col0', 'col1', 'col2', 'col3'];
      state[keys[col]] = true;
      pinchStateRef.current = state;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (mouseColumnRef.current === -1) return;
      const col = getColumn(e);
      mouseColumnRef.current = col;
      const state = createEmptyPinchState();
      const keys: (keyof PinchState)[] = ['col0', 'col1', 'col2', 'col3'];
      state[keys[col]] = true;
      pinchStateRef.current = state;
    };
    const onMouseUp = () => {
      mouseColumnRef.current = -1;
      pinchStateRef.current = createEmptyPinchState();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const col = parseInt(e.key) - 1;
      if (col >= 0 && col <= 3) {
        mouseColumnRef.current = col;
        const state = createEmptyPinchState();
        const keys: (keyof PinchState)[] = ['col0', 'col1', 'col2', 'col3'];
        state[keys[col]] = true;
        pinchStateRef.current = state;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const col = parseInt(e.key) - 1;
      if (col >= 0 && col <= 3 && mouseColumnRef.current === col) {
        mouseColumnRef.current = -1;
        pinchStateRef.current = createEmptyPinchState();
      }
    };

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [stage]);

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
      lowestTileRef.current = engine.getLowestTile();

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [stage]);

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
      const { hitLineY, columnColors } = pinchPianoConfig;

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

      // Draw hit line (single line instead of zone)
      const hitY = hitLineY * h;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, hitY);
      ctx.lineTo(w, hitY);
      ctx.stroke();

      // Draw falling tiles
      if (gameState) {
        const lowestTile = lowestTileRef.current;

        for (const tile of gameState.tiles) {
          if (tile.hit || tile.missed) continue;

          const colWidth = w / 4;
          const tileWidth = colWidth * 0.8;
          const tileHeight = tile.height * h;
          const x = (tile.column / 4) * w + (colWidth - tileWidth) / 2;
          const y = tile.y * h - tileHeight;

          const color = columnColors[tile.column];
          const isLowest = lowestTile?.id === tile.id;

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

          // Highlight lowest tile
          if (isLowest) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 3;
          } else {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2;
          }
          ctx.stroke();

          // Note name on tile (for longer tiles)
          if (tileHeight > 40) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(tile.note, x + tileWidth / 2, y + tileHeight / 2);
          }
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

  // Song selection screen
  if (stage === 'songSelect') {
    return (
      <div className="relative w-full h-full bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
        <video ref={videoRef} className="hidden" playsInline muted />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

        <SongSelector
          bundledSongPaths={pinchPianoConfig.bundledSongs}
          onSongSelect={handleSongSelect}
          onBack={onGoHome}
        />

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

  // Ready/Start screen (after song selected)
  if (stage === 'ready' && selectedSong) {
    return (
      <div className="relative w-full h-full bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
        <video ref={videoRef} className="hidden" playsInline muted />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-center space-y-8 p-8">
            <h1 className="text-5xl font-bold text-white">Piano Tiles</h1>
            <div className="bg-gray-900/80 rounded-xl px-8 py-6">
              <h2 className="text-2xl font-semibold text-purple-300 mb-2">{selectedSong.name}</h2>
              <div className="flex justify-center gap-6 text-gray-400">
                <span>{Math.round(selectedSong.bpm)} BPM</span>
                <span>{selectedSong.notes.length} notes</span>
              </div>
            </div>

            <p className="text-lg text-purple-200 max-w-md mx-auto">
              Hit the lowest tile in each column. Miss any tile = Game Over!
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
                    <span className="text-xs text-gray-300">Middle</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className="w-14 h-14 rounded-full border-2 flex items-center justify-center"
                      style={{ backgroundColor: pinchPianoConfig.columnColors[1], borderColor: 'rgba(255,255,255,0.5)' }}
                    >
                      <span className="text-sm font-bold text-white">2</span>
                    </div>
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
                    <span className="text-xs text-gray-300">Index</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className="w-14 h-14 rounded-full border-2 flex items-center justify-center"
                      style={{ backgroundColor: pinchPianoConfig.columnColors[3], borderColor: 'rgba(255,255,255,0.5)' }}
                    >
                      <span className="text-sm font-bold text-white">4</span>
                    </div>
                    <span className="text-xs text-gray-300">Middle</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Speed selector */}
            <div className="pt-2">
              <p className="text-sm text-gray-400 mb-3">Speed</p>
              <div className="flex justify-center gap-3">
                {[
                  { value: 0.25, label: '0.25x', desc: 'Slowest' },
                  { value: 0.5, label: '0.5x', desc: 'Easy' },
                  { value: 0.75, label: '0.75x', desc: 'Medium' },
                  { value: 1, label: '1x', desc: 'Normal' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSpeed(opt.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      speed === opt.value
                        ? 'bg-purple-600 text-white ring-2 ring-purple-400'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <div>{opt.label}</div>
                    <div className="text-xs opacity-70">{opt.desc}</div>
                  </button>
                ))}
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
                  onClick={handleBackToSongSelect}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Choose Different Song
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

          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <div className="bg-gray-900/70 backdrop-blur-sm px-3 py-2 rounded-full flex items-center gap-2">
              <span className="text-sm text-gray-300">{gameState.notesHit}/{gameState.totalNotes}</span>
            </div>
            <div className="w-32 h-3 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-200"
                style={{ width: `${gameState.songProgress * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Game Over */}
      {gameState?.status === 'gameover' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-30">
          <div className="text-center space-y-6 p-8">
            <h2 className="text-5xl font-bold text-red-500">Game Over</h2>
            <div className="space-y-2">
              <p className="text-3xl text-white">Score: {gameState.score}</p>
              <p className="text-lg text-gray-400">
                {gameState.notesHit} / {gameState.totalNotes} notes ({Math.round(gameState.songProgress * 100)}%)
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={handleRestart}
                className="block w-full px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-lg font-bold rounded-full hover:scale-105 transition-transform"
              >
                Try Again
              </button>
              <button
                onClick={handleBackToSongSelect}
                className="block w-full px-8 py-3 bg-gray-700 text-white text-lg font-semibold rounded-full hover:bg-gray-600 transition-colors"
              >
                Choose Song
              </button>
              <button
                onClick={onGoHome}
                className="block w-full px-8 py-3 text-gray-400 hover:text-white transition-colors"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Song Complete */}
      {gameState?.status === 'completed' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-30">
          <div className="text-center space-y-6 p-8">
            <h2 className="text-5xl font-bold text-green-400">Song Complete!</h2>
            <div className="space-y-2">
              <p className="text-3xl text-white">Score: {gameState.score}</p>
              <p className="text-lg text-gray-300">
                Perfect! {gameState.notesHit} / {gameState.totalNotes} notes
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={handleRestart}
                className="block w-full px-8 py-3 bg-gradient-to-r from-green-500 to-teal-600 text-white text-lg font-bold rounded-full hover:scale-105 transition-transform"
              >
                Play Again
              </button>
              <button
                onClick={handleBackToSongSelect}
                className="block w-full px-8 py-3 bg-gray-700 text-white text-lg font-semibold rounded-full hover:bg-gray-600 transition-colors"
              >
                Choose Song
              </button>
              <button
                onClick={onGoHome}
                className="block w-full px-8 py-3 text-gray-400 hover:text-white transition-colors"
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
