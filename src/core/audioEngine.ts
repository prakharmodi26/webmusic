import type { SoundBank } from '../types/audio';

export class AudioEngine {
  private context: AudioContext | null = null;
  private soundBank: SoundBank = {};

  async init(): Promise<void> {
    this.context = new AudioContext();
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
  }

  async loadSample(padId: string, url: string): Promise<void> {
    if (!this.context) await this.init();
    const ctx = this.context!;

    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    this.soundBank[padId] = audioBuffer;
  }

  async loadSampleFromBuffer(padId: string, arrayBuffer: ArrayBuffer): Promise<void> {
    if (!this.context) await this.init();
    const ctx = this.context!;

    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    this.soundBank[padId] = audioBuffer;
  }

  play(padId: string, velocity: number = 0.8): void {
    if (!this.context) return;
    const buffer = this.soundBank[padId];
    if (!buffer) return;

    const source = this.context.createBufferSource();
    const gain = this.context.createGain();

    source.buffer = buffer;
    gain.gain.value = Math.max(0.1, Math.min(1, velocity));

    source.connect(gain);
    gain.connect(this.context.destination);
    source.start(0);
  }

  async resume(): Promise<void> {
    if (this.context?.state === 'suspended') {
      await this.context.resume();
    }
  }

  destroy(): void {
    this.context?.close();
    this.context = null;
    this.soundBank = {};
  }
}
