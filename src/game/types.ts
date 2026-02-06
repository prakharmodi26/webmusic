export type Column = 0 | 1 | 2 | 3;

// MIDI note extracted from a MIDI file
export interface MidiNote {
  midi: number;           // MIDI note number (0-127)
  name: string;           // Note name like "C4"
  time: number;           // Start time in seconds
  duration: number;       // Duration in seconds
  velocity: number;       // Velocity (0-1)
}

// Song metadata and notes
export interface Song {
  id: string;
  name: string;
  bpm: number;
  duration: number;       // Total duration in seconds
  notes: MidiNote[];
  minPitch: number;
  maxPitch: number;
}

// A tile scheduled based on MIDI note
export interface ScheduledTile {
  id: string;
  column: Column;
  midiNote: number;       // Original MIDI note number for playback
  noteName: string;       // Note name for display
  spawnTime: number;      // When to spawn (game time)
  hitTime: number;        // When it should be at hit position (game time)
  duration: number;       // Note duration in seconds (affects tile height)
  height: number;         // Pre-computed normalized tile height
  spawned: boolean;
}

export interface FallingTile {
  id: string;
  column: Column;
  y: number;              // 0=top, 1=bottom (normalized)
  note: string;
  midiNote: number;       // MIDI note number for Tone.js playback
  height: number;         // Normalized height (based on duration)
  duration: number;       // Note duration in seconds (from MIDI, controls sound length)
  hit: boolean;
  missed: boolean;
  missedAt?: number;      // Timestamp for break animation
  hitAt?: number;         // Timestamp for hit animation
}

export type GameStatus = 'idle' | 'countdown' | 'playing' | 'paused' | 'gameover' | 'completed';

export interface GameState {
  status: GameStatus;
  score: number;
  highScore: number;
  tiles: FallingTile[];
  speed: number;          // Tiles per second (normalized y distance)
  startTime: number;
  countdownValue: number; // 3, 2, 1, Go!
  // Song progress tracking
  songProgress: number;   // 0-1 progress through song
  notesHit: number;       // Number of notes successfully hit
  totalNotes: number;     // Total notes in song
  currentSong: Song | null;
  gameTime: number;       // Current game time in seconds (since playing started)
}

export interface TileFragment {
  x: number;
  y: number;
  vx: number;             // Velocity X
  vy: number;             // Velocity Y
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  size: number;
  color: string;
}

export interface MissAnimation {
  tileId: string;
  column: Column;
  startTime: number;
  fragments: TileFragment[];
}

export interface HitAnimation {
  tileId: string;
  column: Column;
  y: number;
  startTime: number;
  color: string;
}

export interface GameConfig {
  id: string;
  name: string;
  columnColors: Record<Column, string>;
  // Speed is now derived from song BPM, but we keep a base multiplier
  baseSpeed: number;      // Base fall speed multiplier
  // Hit line position (normalized Y where tiles should be hit)
  hitLineY: number;       // e.g., 0.85 means 85% down the screen
  // Tile sizing
  baseTileHeight: number; // Base tile height for short notes (normalized)
  maxTileHeight: number;  // Maximum tile height for long notes (normalized)
  // Time it takes for a tile to fall from top to hit line
  fallDuration: number;   // In seconds
  // Bundled songs
  bundledSongs: string[]; // Paths to bundled MIDI files
}
