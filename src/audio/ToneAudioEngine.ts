import * as Tone from 'tone';

export class ToneAudioEngine {
  private synth: Tone.PolySynth | null = null;
  private activeNotes: Map<number, boolean> = new Map();
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    // Create a polyphonic synth that can play multiple notes
    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: 'triangle',
      },
      envelope: {
        attack: 0.02,
        decay: 0.1,
        sustain: 0.3,
        release: 0.8,
      },
    }).toDestination();

    // Set initial volume
    this.synth.volume.value = -6;

    this.initialized = true;
  }

  /**
   * Resume audio context - call this on user interaction
   */
  async resume(): Promise<void> {
    await Tone.start();
  }

  /**
   * Play a note by MIDI number
   */
  playNote(midiNote: number, velocity: number = 0.8): void {
    if (!this.synth) return;

    // Convert MIDI note to frequency
    const frequency = Tone.Frequency(midiNote, 'midi').toFrequency();

    // Trigger the note
    this.synth.triggerAttack(frequency, Tone.now(), velocity);
    this.activeNotes.set(midiNote, true);
  }

  /**
   * Play a note by name (e.g., "C4")
   */
  playNoteByName(noteName: string, velocity: number = 0.8): void {
    if (!this.synth) return;

    this.synth.triggerAttack(noteName, Tone.now(), velocity);
  }

  /**
   * Stop a specific note by MIDI number
   */
  stopNote(midiNote: number): void {
    if (!this.synth) return;

    const frequency = Tone.Frequency(midiNote, 'midi').toFrequency();
    this.synth.triggerRelease(frequency, Tone.now());
    this.activeNotes.delete(midiNote);
  }

  /**
   * Stop a specific note by name
   */
  stopNoteByName(noteName: string): void {
    if (!this.synth) return;

    this.synth.triggerRelease(noteName, Tone.now());
  }

  /**
   * Play a note with automatic release after duration
   */
  playNoteWithDuration(midiNote: number, duration: number, velocity: number = 0.8): void {
    if (!this.synth) return;

    const frequency = Tone.Frequency(midiNote, 'midi').toFrequency();
    this.synth.triggerAttackRelease(frequency, duration, Tone.now(), velocity);
  }

  /**
   * Stop all currently playing notes
   */
  stopAll(): void {
    if (!this.synth) return;

    this.synth.releaseAll(Tone.now());
    this.activeNotes.clear();
  }

  /**
   * Check if a note is currently playing
   */
  isNotePlaying(midiNote: number): boolean {
    return this.activeNotes.has(midiNote);
  }

  /**
   * Set the synth volume (in decibels)
   */
  setVolume(db: number): void {
    if (!this.synth) return;
    this.synth.volume.value = db;
  }

  /**
   * Destroy and clean up
   */
  destroy(): void {
    this.stopAll();
    this.synth?.dispose();
    this.synth = null;
    this.activeNotes.clear();
    this.initialized = false;
  }

  /**
   * Get whether engine is ready
   */
  isReady(): boolean {
    return this.initialized && this.synth !== null;
  }
}
