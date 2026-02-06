import { Midi } from '@tonejs/midi';
import type { Song, MidiNote, ScheduledTile, Column } from './types';

let scheduledTileIdCounter = 0;

function generateScheduledTileId(): string {
  return `stile-${++scheduledTileIdCounter}`;
}

export interface ParsedSong extends Song {
  scheduledTiles: ScheduledTile[];
}

export class MidiSongEngine {
  private fallDuration: number;
  private hitLineY: number;
  private baseTileHeight: number;
  private maxTileHeight: number;

  constructor(
    fallDuration: number = 2,
    hitLineY: number = 0.85,
    baseTileHeight: number = 0.08,
    maxTileHeight: number = 0.25
  ) {
    this.fallDuration = fallDuration;
    this.hitLineY = hitLineY;
    this.baseTileHeight = baseTileHeight;
    this.maxTileHeight = maxTileHeight;
  }

  /**
   * Parse a MIDI file and extract song data
   */
  async parseMidiFile(file: File): Promise<Song> {
    const arrayBuffer = await file.arrayBuffer();
    return this.parseMidiBuffer(arrayBuffer, file.name.replace(/\.mid$/i, ''));
  }

  /**
   * Parse MIDI from ArrayBuffer (for bundled songs fetched via URL)
   */
  async parseMidiBuffer(buffer: ArrayBuffer, name: string): Promise<Song> {
    const midi = new Midi(buffer);

    // Extract all notes from all tracks
    const notes: MidiNote[] = [];

    for (const track of midi.tracks) {
      for (const note of track.notes) {
        notes.push({
          midi: note.midi,
          name: note.name,
          time: note.time,
          duration: note.duration,
          velocity: note.velocity,
        });
      }
    }

    // Sort notes by time
    notes.sort((a, b) => a.time - b.time);

    if (notes.length === 0) {
      throw new Error('MIDI file contains no notes');
    }

    // Calculate pitch range
    const pitches = notes.map(n => n.midi);
    const minPitch = Math.min(...pitches);
    const maxPitch = Math.max(...pitches);

    // Calculate duration (last note end time)
    const duration = Math.max(...notes.map(n => n.time + n.duration));

    // Get BPM from MIDI (use first tempo or default to 120)
    const bpm = midi.header.tempos.length > 0
      ? midi.header.tempos[0].bpm
      : 120;

    return {
      id: `song-${Date.now()}`,
      name: name || midi.header.name || 'Unknown Song',
      bpm,
      duration,
      notes,
      minPitch,
      maxPitch,
    };
  }

  /**
   * Fetch and parse a MIDI file from a URL (for bundled songs)
   */
  async loadSongFromUrl(url: string): Promise<Song> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load MIDI file: ${url}`);
    }
    const buffer = await response.arrayBuffer();
    const name = url.split('/').pop()?.replace(/\.mid$/i, '') || 'Unknown';
    return this.parseMidiBuffer(buffer, name);
  }

  /**
   * Calculate which column a note should fall in based on pitch buckets
   */
  getColumnForPitch(pitch: number, minPitch: number, maxPitch: number): Column {
    const range = maxPitch - minPitch;

    // If all notes are the same pitch, distribute evenly
    if (range === 0) {
      return (pitch % 4) as Column;
    }

    const bucketSize = range / 4;
    const bucket = Math.floor((pitch - minPitch) / bucketSize);

    // Clamp to valid column range (0-3)
    return Math.min(bucket, 3) as Column;
  }

  /**
   * Calculate normalized tile height from note duration
   */
  private calculateTileHeight(duration: number): number {
    const baseDuration = 0.2;
    const durationRatio = Math.min(duration / baseDuration, 5);
    const height = this.baseTileHeight +
      (this.maxTileHeight - this.baseTileHeight) * Math.min(1, (durationRatio - 1) / 4);
    return Math.max(this.baseTileHeight, height);
  }

  /**
   * Generate scheduled tiles for a song.
   * Tiles are sequentially spaced so they never overlap vertically.
   * MIDI timing determines note order and column, but NOT visual spacing.
   */
  generateScheduledTiles(song: Song): ScheduledTile[] {
    scheduledTileIdCounter = 0;

    const fallSpeed = this.hitLineY / this.fallDuration;
    const minGap = 0.02; // Minimum normalized gap between consecutive tiles
    const chordTolerance = 0.01; // Notes within 10ms are treated as a chord

    // Group notes into chord groups (notes at ~same time)
    const chordGroups: MidiNote[][] = [];
    let currentGroup: MidiNote[] = [];

    for (const note of song.notes) { // already sorted by time
      if (currentGroup.length === 0 ||
          note.time - currentGroup[0].time <= chordTolerance) {
        currentGroup.push(note);
      } else {
        chordGroups.push(currentGroup);
        currentGroup = [note];
      }
    }
    if (currentGroup.length > 0) {
      chordGroups.push(currentGroup);
    }

    // Schedule each chord group sequentially with guaranteed spacing
    const tiles: ScheduledTile[] = [];
    let prevSpawnTime = -Infinity;
    let prevRowHeight = 0;

    for (const group of chordGroups) {
      // Deduplicate notes that map to the same column within a chord
      const seenColumns = new Set<Column>();
      const dedupedNotes: MidiNote[] = [];
      for (const note of group) {
        const col = this.getColumnForPitch(note.midi, song.minPitch, song.maxPitch);
        if (!seenColumns.has(col)) {
          seenColumns.add(col);
          dedupedNotes.push(note);
        }
      }

      // Calculate heights for all notes in this chord
      const noteHeights = dedupedNotes.map(note => this.calculateTileHeight(note.duration));
      const rowHeight = Math.max(...noteHeights);

      // Calculate spawn time with guaranteed spacing from previous row
      let spawnTime: number;
      if (prevSpawnTime === -Infinity) {
        spawnTime = 0; // First tile spawns at game start
      } else {
        const minDelay = (prevRowHeight + minGap) / fallSpeed;
        spawnTime = prevSpawnTime + minDelay;
      }

      const hitTime = spawnTime + this.fallDuration;

      // Create scheduled tiles for each note in the chord
      for (let i = 0; i < dedupedNotes.length; i++) {
        const note = dedupedNotes[i];
        const column = this.getColumnForPitch(note.midi, song.minPitch, song.maxPitch);

        tiles.push({
          id: generateScheduledTileId(),
          column,
          midiNote: note.midi,
          noteName: note.name,
          spawnTime,
          hitTime,
          duration: note.duration,
          height: noteHeights[i],
          spawned: false,
        });
      }

      prevSpawnTime = spawnTime;
      prevRowHeight = rowHeight;
    }

    return tiles;
  }

  /**
   * Prepare a song for gameplay - returns song with scheduled tiles
   */
  prepareSong(song: Song): ParsedSong {
    const scheduledTiles = this.generateScheduledTiles(song);
    return {
      ...song,
      scheduledTiles,
    };
  }

  /**
   * Get song metadata for display in song selector
   */
  getSongMetadata(song: Song) {
    return {
      name: song.name,
      bpm: Math.round(song.bpm),
      noteCount: song.notes.length,
      duration: this.formatDuration(song.duration),
      pitchRange: `${this.midiToNoteName(song.minPitch)} - ${this.midiToNoteName(song.maxPitch)}`,
    };
  }

  private formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  private midiToNoteName(midi: number): string {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(midi / 12) - 1;
    const note = noteNames[midi % 12];
    return `${note}${octave}`;
  }
}
