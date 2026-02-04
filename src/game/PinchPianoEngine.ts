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

    // Check for hits while finger is down
    this.checkHits(pinchState, timestamp);

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

  // Minimum Y gap between tiles to ensure they don't overlap in hit zone
  private readonly MIN_TILE_GAP = 0.18;  // Roughly one tile height apart

  private isColumnAvailable(column: Column, targetY: number): boolean {
    // Check if any tile in this column would be too close to the target Y position
    const blockingTile = this.state.tiles.find(
      (t) => t.column === column && !t.hit && !t.missed && Math.abs(t.y - targetY) < this.MIN_TILE_GAP
    );
    return !blockingTile;
  }

  private getAvailableColumnsAtY(targetY: number): Column[] {
    const columns: Column[] = [0, 1, 2, 3];
    return columns.filter((col) => this.isColumnAvailable(col, targetY));
  }

  private spawnTile(): void {
    // Determine how many tiles to spawn (increases with difficulty)
    // At higher speeds, chance to spawn multiple tiles increases
    const speedRatio = this.state.speed / this.config.initialSpeed;
    const multiTileChance = Math.min(0.6, (speedRatio - 1) * 0.15);  // Up to 60% chance at high speeds
    
    // Base: always spawn at least 1, maybe 2 at higher difficulty
    let tilesToSpawn = 1;
    if (Math.random() < multiTileChance) {
      tilesToSpawn = 2;
    }
    
    // Spawn tiles at staggered Y positions to ensure gap
    for (let i = 0; i < tilesToSpawn; i++) {
      // Each additional tile spawns slightly higher (earlier) to maintain gap
      const targetY = -0.12 - (i * this.MIN_TILE_GAP * 1.2);  // Stagger Y positions
      
      const availableColumns = this.getAvailableColumnsAtY(targetY);
      if (availableColumns.length === 0) continue;

      const column = availableColumns[Math.floor(Math.random() * availableColumns.length)];
      const note = this.config.columnNotes[column];

      const tile: FallingTile = {
        id: generateTileId(),
        column,
        y: targetY,
        note,
        hit: false,
        missed: false,
      };

      this.state.tiles.push(tile);
    }
  }

  private checkHits(pinchState: PinchState, timestamp: number): void {
    const { yMin, yMax } = this.config.hitZone;
    const cols: (keyof PinchState)[] = ['col0', 'col1', 'col2', 'col3'];

    cols.forEach((colKey, colIndex) => {
      const column = colIndex as Column;
      const isActive = pinchState[colKey];

      // If column is not activated, skip
      if (!isActive) return;

      // Find ALL tiles in the hit zone for this activated column
      const hitableTiles = this.state.tiles.filter(
        (t) =>
          t.column === column &&
          !t.hit &&
          !t.missed &&
          t.y >= yMin &&
          t.y <= yMax
      );

      // Hit ALL tiles in the zone while finger is down
      for (const tile of hitableTiles) {
        tile.hit = true;
        tile.hitAt = timestamp;

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
          tileId: tile.id,
          column,
          y: tile.y,
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
      // Also increase spawn rate (decrease time between spawns)
      const spawnDecrement = increment * 0.5; // Spawn rate increases proportionally
      this.state.spawnRate = Math.max(
        this.state.spawnRate - spawnDecrement,
        this.config.minSpawnRate
      );
      this.consecutiveHits = 0;
    }
  }
}
