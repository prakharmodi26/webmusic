export type Column = 0 | 1 | 2 | 3;

export interface FallingTile {
  id: string;
  column: Column;
  y: number;              // 0=top, 1=bottom (normalized)
  note: string;
  hit: boolean;
  missed: boolean;
  missedAt?: number;      // Timestamp for break animation
  hitAt?: number;         // Timestamp for hit animation
}

export type GameStatus = 'idle' | 'countdown' | 'playing' | 'paused' | 'gameover';

export interface GameState {
  status: GameStatus;
  score: number;
  highScore: number;      // Persists across retries
  lives: number;          // Starts at 5
  tiles: FallingTile[];
  speed: number;          // Tiles per second (normalized y distance)
  spawnRate: number;      // Seconds between spawns
  lastSpawnTime: number;
  startTime: number;
  countdownValue: number; // 3, 2, 1, Go!
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
  columnNotes: Record<Column, string>;
  columnColors: Record<Column, string>;
  initialSpeed: number;
  maxSpeed: number;  // Maximum speed cap (set very high for endless feel)
  hitsPerSpeedStep: number;
  speedSteps: Record<'easy' | 'medium' | 'hard', number>;
  initialSpawnRate: number;
  minSpawnRate: number;
  hitZone: {
    yMin: number;
    yMax: number;
  };
  initialLives: number;
  sounds: Record<Column, string>;
}
