import type { GameState, FallingTile, GameConfig, Column, MissAnimation, HitAnimation, ScheduledTile } from './types';
import type { PinchState } from '../core/pinchDetector';
import type { ParsedSong } from './MidiSongEngine';

let tileIdCounter = 0;

function generateTileId(): string {
  return `tile-${++tileIdCounter}`;
}

export class PianoTilesEngine {
  private config: GameConfig;
  private state: GameState;
  private missAnimations: MissAnimation[] = [];
  private hitAnimations: HitAnimation[] = [];
  private onPlayNote: (midiNote: number, velocity: number) => void;
  private onStopNote: (midiNote: number) => void;
  private onMiss: () => void;
  private lastUpdateTime: number = 0;
  private prevPinchState: PinchState | null = null;
  private persistentHighScore: number = 0;
  // Tracks columns of last-hit tiles for consecutive same-column auto-hit
  private lastHitColumns: Set<Column> | null = null;
  private lastHitColumnsReleaseTime: number = 0;
  private lastHitColumnsGrace: number = 300; // ms grace period before clearing chain
  // ═══════════════════════════════════════════════════════════════
  // AUTO-HIT GAP: Change this value to adjust delay between consecutive auto-hits (ms)
  private autoHitDelay: number = 500; // 0.5 seconds
  // ═══════════════════════════════════════════════════════════════
  private nextAutoHitTime: number = 0;
  private pendingAutoHitTileIds: Set<string> = new Set();
  // Timers for auto-stopping notes after their MIDI duration
  private noteStopTimers: number[] = [];

  // MIDI song data
  private parsedSong: ParsedSong | null = null;
  private scheduledTiles: ScheduledTile[] = [];
  private playStartTime: number = 0; // When actual gameplay started (after countdown)

  // Cached lowest tiles for fast hit detection
  private cachedLowestTiles: FallingTile[] = [];
  private tilesDirty: boolean = true;

  constructor(
    config: GameConfig,
    onPlayNote: (midiNote: number, velocity: number) => void,
    onStopNote: (midiNote: number) => void,
    onMiss: () => void
  ) {
    this.config = config;
    this.onPlayNote = onPlayNote;
    this.onStopNote = onStopNote;
    this.onMiss = onMiss;
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      status: 'idle',
      score: 0,
      highScore: this.persistentHighScore,
      tiles: [],
      speed: this.config.baseSpeed,
      startTime: 0,
      countdownValue: 3,
      songProgress: 0,
      notesHit: 0,
      totalNotes: 0,
      currentSong: null,
      gameTime: 0,
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

  /**
   * Load a song and prepare for gameplay
   */
  loadSong(parsedSong: ParsedSong): void {
    this.parsedSong = parsedSong;
    this.scheduledTiles = parsedSong.scheduledTiles.map(t => ({ ...t, spawned: false }));
    this.state.currentSong = parsedSong;
    this.state.totalNotes = parsedSong.notes.length;
  }

  start(): void {
    if (!this.parsedSong) {
      console.error('No song loaded. Call loadSong() first.');
      return;
    }

    // Update high score from previous game before resetting
    if (this.state.score > this.persistentHighScore) {
      this.persistentHighScore = this.state.score;
    }

    // Reset scheduled tiles
    this.scheduledTiles = this.parsedSong.scheduledTiles.map(t => ({ ...t, spawned: false }));

    this.state = this.createInitialState();
    this.state.currentSong = this.parsedSong;
    this.state.totalNotes = this.parsedSong.notes.length;
    this.state.status = 'countdown';
    this.state.startTime = performance.now();
    this.state.countdownValue = 3;
    this.lastUpdateTime = 0;
    this.missAnimations = [];
    this.hitAnimations = [];
    this.prevPinchState = null;
    this.lastHitColumns = null;
    this.lastHitColumnsReleaseTime = 0;
    this.nextAutoHitTime = 0;
    this.pendingAutoHitTileIds.clear();
    for (const id of this.noteStopTimers) clearTimeout(id);
    this.noteStopTimers = [];
    this.cachedLowestTiles = [];
    this.tilesDirty = true;
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
    if (this.parsedSong) {
      this.state.currentSong = this.parsedSong;
      this.state.totalNotes = this.parsedSong.notes.length;
      this.scheduledTiles = this.parsedSong.scheduledTiles.map(t => ({ ...t, spawned: false }));
    }
    this.missAnimations = [];
    this.hitAnimations = [];
    this.lastUpdateTime = 0;
    this.prevPinchState = null;
    this.lastHitColumns = null;
    this.lastHitColumnsReleaseTime = 0;
    this.nextAutoHitTime = 0;
    this.pendingAutoHitTileIds.clear();
    for (const id of this.noteStopTimers) clearTimeout(id);
    this.noteStopTimers = [];
    this.cachedLowestTiles = [];
    this.tilesDirty = true;
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
        this.playStartTime = timestamp;
      }
      return;
    }

    if (this.state.status !== 'playing') {
      return;
    }

    // Calculate game time (time since playing started)
    this.state.gameTime = (timestamp - this.playStartTime) / 1000;

    // Spawn tiles based on MIDI schedule
    this.spawnScheduledTiles();

    // Move tiles down with current speed
    const fallSpeed = this.config.hitLineY / this.config.fallDuration;
    for (const tile of this.state.tiles) {
      if (!tile.hit && !tile.missed) {
        tile.y += fallSpeed * deltaTime;
      }
    }

    // Check for hits (lowest tile only)
    this.checkHits(pinchState, timestamp);

    // Handle hold releases
    this.checkHoldReleases(pinchState);

    this.prevPinchState = { ...pinchState };

    // Check for misses (tile passed hit line)
    this.checkMisses(timestamp);

    // Update animations
    this.updateMissAnimations(timestamp, deltaTime);
    this.updateHitAnimations(timestamp);

    // Clean up old tiles (hit tiles and tiles far below screen)
    const prevLength = this.state.tiles.length;
    this.state.tiles = this.state.tiles.filter(
      (tile) => tile.y < 1.3 && !tile.hit
    );
    if (this.state.tiles.length !== prevLength) {
      this.invalidateLowestTilesCache();
    }

    // Update song progress based on notes hit
    this.state.songProgress = this.state.totalNotes > 0
      ? this.state.notesHit / this.state.totalNotes
      : 0;

    // Check for song completion
    if (this.isSongComplete()) {
      this.state.status = 'completed';
    }
  }

  private spawnScheduledTiles(): void {
    const gameTime = this.state.gameTime;

    for (const scheduled of this.scheduledTiles) {
      if (scheduled.spawned) continue;

      // Spawn tile when game time reaches spawn time
      if (gameTime >= scheduled.spawnTime) {
        this.spawnTileFromSchedule(scheduled);
        scheduled.spawned = true;
      }
    }
  }

  private spawnTileFromSchedule(scheduled: ScheduledTile): void {
    const tile: FallingTile = {
      id: generateTileId(),
      column: scheduled.column,
      y: 0, // Start at top
      note: scheduled.noteName,
      midiNote: scheduled.midiNote,
      height: scheduled.height,
      duration: scheduled.duration,
      hit: false,
      missed: false,
    };

    this.state.tiles.push(tile);
    this.invalidateLowestTilesCache();
  }

  /**
   * Mark tiles as dirty - call when tiles are added, removed, or hit
   */
  private invalidateLowestTilesCache(): void {
    this.tilesDirty = true;
  }

  /**
   * Find all tiles at the lowest Y position (for chords)
   * Uses caching for performance - only recalculates when tiles change
   */
  private getLowestTilesOptimized(): FallingTile[] {
    if (!this.tilesDirty && this.cachedLowestTiles.length > 0) {
      // Verify cache is still valid (tiles not hit/missed)
      const stillValid = this.cachedLowestTiles.every(t => !t.hit && !t.missed);
      if (stillValid) {
        return this.cachedLowestTiles;
      }
    }

    // Recalculate lowest tiles
    let lowestY = -Infinity;
    let lowest: FallingTile | null = null;

    // Single pass to find lowest Y
    for (const tile of this.state.tiles) {
      if (!tile.hit && !tile.missed && tile.y > lowestY) {
        lowestY = tile.y;
        lowest = tile;
      }
    }

    if (!lowest) {
      this.cachedLowestTiles = [];
      this.tilesDirty = false;
      return [];
    }

    // Collect all tiles at same Y level (chord tolerance)
    const tolerance = 0.005;
    this.cachedLowestTiles = [];
    for (const tile of this.state.tiles) {
      if (!tile.hit && !tile.missed && Math.abs(tile.y - lowestY) < tolerance) {
        this.cachedLowestTiles.push(tile);
      }
    }

    this.tilesDirty = false;
    return this.cachedLowestTiles;
  }

  private executeHit(tiles: FallingTile[], requiredColumns: Set<Column>, timestamp: number): void {
    for (const tile of tiles) {
      tile.hit = true;
      tile.hitAt = timestamp;

      this.state.score += 10;
      this.state.notesHit++;

      // Play note for its MIDI duration, then auto-stop (independent of column activation)
      const midiNote = tile.midiNote;
      this.onPlayNote(midiNote, 0.8);
      const stopTimer = window.setTimeout(() => {
        this.onStopNote(midiNote);
      }, tile.duration * 1000);
      this.noteStopTimers.push(stopTimer);

      this.hitAnimations.push({
        tileId: tile.id,
        column: tile.column,
        y: tile.y,
        startTime: timestamp,
        color: this.config.columnColors[tile.column],
      });
    }

    if (this.state.score > this.state.highScore) {
      this.state.highScore = this.state.score;
      this.persistentHighScore = this.state.score;
    }

    this.lastHitColumns = new Set(requiredColumns);
    this.lastHitColumnsReleaseTime = 0;
    this.invalidateLowestTilesCache();
  }

  private checkHits(pinchState: PinchState, timestamp: number): void {
    // Expire grace period: if lastHitColumns was released and grace period passed, clear it
    if (this.lastHitColumns !== null && this.lastHitColumnsReleaseTime > 0) {
      if (performance.now() - this.lastHitColumnsReleaseTime > this.lastHitColumnsGrace) {
        this.lastHitColumns = null;
        this.lastHitColumnsReleaseTime = 0;
        this.pendingAutoHitTileIds.clear();
      }
    }

    // Get cached lowest tiles (chord group)
    const lowestTiles = this.getLowestTilesOptimized();
    if (lowestTiles.length === 0) return;

    // Tile must be fully visible on screen before it can be hit
    // ═══════════════════════════════════════════════════════════════
    // VISIBILITY GATE: Change `t.height` to `t.height / 2` for half-tile, etc.
    // ═══════════════════════════════════════════════════════════════
    if (lowestTiles.some(t => t.y < t.height)) return;

    // Get the set of columns required for the current chord
    const requiredColumns = new Set(lowestTiles.map(t => t.column));

    // Check which columns are currently active
    const activeColumns = new Set<Column>();
    if (pinchState.col0) activeColumns.add(0);
    if (pinchState.col1) activeColumns.add(1);
    if (pinchState.col2) activeColumns.add(2);
    if (pinchState.col3) activeColumns.add(3);

    // Check if ALL required columns are active
    let allRequiredActive = true;
    for (const col of requiredColumns) {
      if (!activeColumns.has(col)) {
        allRequiredActive = false;
        break;
      }
    }

    if (!allRequiredActive) return;

    // Columns are active — if they were released during grace period, cancel the release
    if (this.lastHitColumnsReleaseTime > 0) {
      this.lastHitColumnsReleaseTime = 0;
    }

    // Check if this is a new activation (rising edge)
    const prevActiveColumns = new Set<Column>();
    if (this.prevPinchState) {
      if (this.prevPinchState.col0) prevActiveColumns.add(0);
      if (this.prevPinchState.col1) prevActiveColumns.add(1);
      if (this.prevPinchState.col2) prevActiveColumns.add(2);
      if (this.prevPinchState.col3) prevActiveColumns.add(3);
    }

    let wasAllActive = true;
    for (const col of requiredColumns) {
      if (!prevActiveColumns.has(col)) {
        wasAllActive = false;
        break;
      }
    }

    // Rising edge: column just activated — immediate hit
    if (!wasAllActive) {
      this.pendingAutoHitTileIds.clear();
      this.executeHit(lowestTiles, requiredColumns, timestamp);
      this.nextAutoHitTime = performance.now() + this.autoHitDelay;
      return;
    }

    // Consecutive same-column auto-hit: columns already held from previous hit
    if (this.lastHitColumns !== null) {
      const sameColumns = requiredColumns.size === this.lastHitColumns.size &&
        [...requiredColumns].every(c => this.lastHitColumns!.has(c));
      if (sameColumns) {
        const now = performance.now();
        if (now >= this.nextAutoHitTime) {
          // Delay elapsed — hit the tiles now
          this.pendingAutoHitTileIds.clear();
          this.executeHit(lowestTiles, requiredColumns, timestamp);
          this.nextAutoHitTime = now + this.autoHitDelay;
        } else {
          // Still waiting — mark tiles as pending so they don't count as missed
          for (const tile of lowestTiles) {
            this.pendingAutoHitTileIds.add(tile.id);
          }
        }
      }
    }
  }

  private checkHoldReleases(pinchState: PinchState): void {
    const cols: (keyof PinchState)[] = ['col0', 'col1', 'col2', 'col3'];

    cols.forEach((colKey, colIndex) => {
      const column = colIndex as Column;
      const wasActive = this.prevPinchState?.[colKey] ?? false;
      const isActive = pinchState[colKey];

      // On release (falling edge) — start grace period for auto-hit chain
      if (wasActive && !isActive) {
        if (this.lastHitColumns !== null && this.lastHitColumns.has(column)) {
          this.lastHitColumnsReleaseTime = performance.now();
        }
      }
    });
  }

  private checkMisses(timestamp: number): void {
    const hitLineY = this.config.hitLineY;
    const missTolerance = 0.05; // How far past hit line before considered missed

    for (const tile of this.state.tiles) {
      // A tile is missed if it passes the hit line without being hit (skip pending auto-hits)
      if (!tile.hit && !tile.missed && !this.pendingAutoHitTileIds.has(tile.id) && tile.y > hitLineY + missTolerance) {
        tile.missed = true;
        tile.missedAt = timestamp;
        this.invalidateLowestTilesCache();

        this.onMiss();
        this.createMissAnimation(tile, timestamp);

        // Game over on any miss — clear pending sounds
        for (const id of this.noteStopTimers) clearTimeout(id);
        this.noteStopTimers = [];
        this.pendingAutoHitTileIds.clear();
        this.state.status = 'gameover';
        return;
      }
    }
  }

  private isSongComplete(): boolean {
    if (!this.parsedSong) return false;

    // Song is complete when all tiles have been spawned and processed
    const allSpawned = this.scheduledTiles.every(t => t.spawned);
    const allTilesGone = this.state.tiles.length === 0 ||
      this.state.tiles.every(t => t.hit || t.missed);

    return allSpawned && allTilesGone;
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

  /**
   * Get the lowest tile for UI highlighting
   */
  getLowestTile(): FallingTile | null {
    const tiles = this.getLowestTilesOptimized();
    return tiles.length > 0 ? tiles[0] : null;
  }

  /**
   * Get all lowest tiles (chord group) for UI highlighting
   */
  getLowestTiles(): FallingTile[] {
    return this.getLowestTilesOptimized();
  }
}
