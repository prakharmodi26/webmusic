import type { GameState, FallingTile, GameConfig, Column, MissAnimation, HitAnimation } from './types';
import type { PinchState } from '../core/pinchDetector';

let tileIdCounter = 0;

function generateTileId(): string {
  return `tile-${++tileIdCounter}`;
}

export type DifficultyMode = 'easy' | 'medium' | 'hard';

export class PinchPianoEngine {
  private config: GameConfig;
  private state: GameState;
  private missAnimations: MissAnimation[] = [];
  private hitAnimations: HitAnimation[] = [];
  private onPlaySound: (column: Column) => void;
  private onMiss: () => void;
  private lastUpdateTime: number = 0;
  private prevPinchState: PinchState | null = null;
  // Tracks whether the current pinch (until release) has already triggered a hit per column
  private pinchHitConsumed: boolean[] = [false, false, false, false];
  private difficultyMode: DifficultyMode = 'medium';
  private consecutiveHits: number = 0;
  private persistentHighScore: number = 0;  // Persists across restarts

  constructor(
    config: GameConfig,
    onPlaySound: (column: Column) => void,
    onMiss: () => void
  ) {
    this.config = config;
    this.onPlaySound = onPlaySound;
    this.onMiss = onMiss;
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      status: 'idle',
      score: 0,
      highScore: this.persistentHighScore,
      lives: this.config.initialLives,
      tiles: [],
      speed: this.config.initialSpeed,
      spawnRate: this.config.initialSpawnRate,
      lastSpawnTime: 0,
      startTime: 0,
      countdownValue: 3,
    };
  }

  getState(): GameState {
    return this.state;
  }

  getMissAnimations(): MissAnimation[] {
    return this.missAnimations;
  }

  getHitAnimations(): HitAnimation[] {
    return this.hitAnimations;
  }

  start(): void {
    // Update high score from previous game before resetting
    if (this.state.score > this.persistentHighScore) {
      this.persistentHighScore = this.state.score;
    }
    this.state = this.createInitialState();
    this.state.status = 'countdown';
    this.state.startTime = performance.now();
    this.state.countdownValue = 3;
    this.lastUpdateTime = 0;
    this.missAnimations = [];
    this.hitAnimations = [];
    this.prevPinchState = null;
    this.pinchHitConsumed = [false, false, false, false];
    this.consecutiveHits = 0;
    tileIdCounter = 0;
  }

  pause(): void {
    if (this.state.status === 'playing') {
      this.state.status = 'paused';
    }
  }

  resume(): void {
    if (this.state.status === 'paused') {
      this.state.status = 'playing';
      this.lastUpdateTime = 0;
    }
  }

  reset(): void {
    this.state = this.createInitialState();
    this.missAnimations = [];
    this.hitAnimations = [];
    this.lastUpdateTime = 0;
    this.prevPinchState = null;
    this.pinchHitConsumed = [false, false, false, false];
    this.consecutiveHits = 0;
    tileIdCounter = 0;
  }

  update(timestamp: number, pinchState: PinchState): void {
    // Calculate actual delta time for smooth animation
    const deltaTime = this.lastUpdateTime > 0
      ? Math.min((timestamp - this.lastUpdateTime) / 1000, 0.1)
      : 1 / 60;
    this.lastUpdateTime = timestamp;

    // Handle countdown
    if (this.state.status === 'countdown') {
      const elapsed = (timestamp - this.state.startTime) / 1000;
      if (elapsed < 1) {
        this.state.countdownValue = 3;
      } else if (elapsed < 2) {
        this.state.countdownValue = 2;
      } else if (elapsed < 3) {
        this.state.countdownValue = 1;
      } else if (elapsed < 3.5) {
        this.state.countdownValue = 0;
      } else {
        this.state.status = 'playing';
        this.state.lastSpawnTime = timestamp;
      }
      return;
    }

    if (this.state.status !== 'playing') {
      return;
    }

    // Spawn new tiles
    const timeSinceLastSpawn = (timestamp - this.state.lastSpawnTime) / 1000;
    if (timeSinceLastSpawn >= this.state.spawnRate) {
      this.spawnTile();
      this.state.lastSpawnTime = timestamp;
    }

    // Move tiles down with current speed
    const currentSpeed = this.state.speed;
    for (const tile of this.state.tiles) {
      if (!tile.hit && !tile.missed) {
        tile.y += currentSpeed * deltaTime;
      }
    }

    // Check for hits (only on new pinch)
    this.checkHits(pinchState, timestamp);
    this.prevPinchState = { ...pinchState };

    // Check for misses
    this.checkMisses(timestamp);

    // Update animations
    this.updateMissAnimations(timestamp, deltaTime);
    this.updateHitAnimations(timestamp);

    // Clean up old tiles
    this.state.tiles = this.state.tiles.filter(
      (tile) => tile.y < 1.2 && !tile.hit
    );

    // Check game over
    if (this.state.lives <= 0) {
      this.state.status = 'gameover';
    }
  }

  private isColumnAvailable(column: Column): boolean {
    const { yMin } = this.config.hitZone;
    const blockingTile = this.state.tiles.find(
      (t) => t.column === column && !t.hit && !t.missed && t.y < yMin + 0.1
    );
    return !blockingTile;
  }

  private getAvailableColumns(): Column[] {
    const columns: Column[] = [0, 1, 2, 3];
    return columns.filter((col) => this.isColumnAvailable(col));
  }

  private spawnTile(): void {
    const availableColumns = this.getAvailableColumns();
    if (availableColumns.length === 0) return;

    const column = availableColumns[Math.floor(Math.random() * availableColumns.length)];
    const note = this.config.columnNotes[column];

    const tile: FallingTile = {
      id: generateTileId(),
      column,
      y: -0.12,
      note,
      hit: false,
      missed: false,
    };

    this.state.tiles.push(tile);
  }

  private checkHits(pinchState: PinchState, timestamp: number): void {
    const { yMin, yMax } = this.config.hitZone;
    const cols: (keyof PinchState)[] = ['col0', 'col1', 'col2', 'col3'];

    cols.forEach((colKey, colIndex) => {
      const column = colIndex as Column;
      const wasActive = this.prevPinchState?.[colKey] ?? false;
      const isActive = pinchState[colKey];

      // Reset consumption when pinch is released so the next pinch can score again
      if (!isActive && wasActive) {
        this.pinchHitConsumed[column] = false;
        return;
      }

      // Only consider hits while the pinch is held and not yet consumed
      if (!isActive || this.pinchHitConsumed[column]) return;

      const hitableTile = this.state.tiles.find(
        (t) =>
          t.column === column &&
          !t.hit &&
          !t.missed &&
          t.y >= yMin &&
          t.y <= yMax
      );

      if (hitableTile) {
        hitableTile.hit = true;
        hitableTile.hitAt = timestamp;
        this.pinchHitConsumed[column] = true;

        // Simple scoring: 10 points per hit
        this.state.score += 10;
        // Update high score in real-time
        if (this.state.score > this.state.highScore) {
          this.state.highScore = this.state.score;
          this.persistentHighScore = this.state.score;
        }
        this.registerSuccessfulHit();

        this.onPlaySound(column);

        this.hitAnimations.push({
          tileId: hitableTile.id,
          column,
          y: hitableTile.y,
          startTime: timestamp,
          color: this.config.columnColors[column],
        });
      }
    });
  }

  private checkMisses(timestamp: number): void {
    const { yMax } = this.config.hitZone;

    for (const tile of this.state.tiles) {
      if (!tile.hit && !tile.missed && tile.y > yMax + 0.02) {
        tile.missed = true;
        tile.missedAt = timestamp;

        this.state.lives--;
        this.consecutiveHits = 0;
        this.onMiss();

        this.createMissAnimation(tile, timestamp);
      }
    }
  }

  private createMissAnimation(tile: FallingTile, timestamp: number): void {
    const fragments: MissAnimation['fragments'] = [];
    const numFragments = 6;
    const baseX = (tile.column + 0.5) / 4;

    for (let i = 0; i < numFragments; i++) {
      const angle = (Math.PI * 2 * i) / numFragments + Math.random() * 0.5;
      const speed = 0.15 + Math.random() * 0.2;

      fragments.push({
        x: baseX,
        y: tile.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.15,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 8,
        opacity: 1,
        size: 0.025 + Math.random() * 0.02,
        color: '#FF4444',
      });
    }

    this.missAnimations.push({
      tileId: tile.id,
      column: tile.column,
      startTime: timestamp,
      fragments,
    });
  }

  private updateMissAnimations(timestamp: number, deltaTime: number): void {
    const gravity = 0.8;
    const duration = 500;

    this.missAnimations = this.missAnimations.filter((anim) => {
      const elapsed = timestamp - anim.startTime;
      if (elapsed > duration) return false;

      const progress = elapsed / duration;

      for (const frag of anim.fragments) {
        frag.x += frag.vx * deltaTime;
        frag.y += frag.vy * deltaTime;
        frag.vy += gravity * deltaTime;
        frag.rotation += frag.rotationSpeed * deltaTime;
        frag.opacity = 1 - progress;
      }

      return true;
    });
  }

  private updateHitAnimations(timestamp: number): void {
    const duration = 250;
    this.hitAnimations = this.hitAnimations.filter((anim) => {
      const elapsed = timestamp - anim.startTime;
      return elapsed < duration;
    });
  }

  setDifficultyMode(mode: DifficultyMode): void {
    this.difficultyMode = mode;
    // Reset streak so the next step uses the new mode cleanly
    this.consecutiveHits = 0;
  }

  private registerSuccessfulHit(): void {
    this.consecutiveHits += 1;
    if (this.consecutiveHits >= this.config.hitsPerSpeedStep) {
      const increment = this.config.speedSteps[this.difficultyMode];
      // Apply speed increase but cap at maxSpeed (very high, practically unreachable)
      this.state.speed = Math.min(
        this.state.speed + increment,
        this.config.maxSpeed
      );
      this.consecutiveHits = 0;
    }
  }
}
