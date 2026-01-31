export interface SoundBank {
  [padId: string]: AudioBuffer;
}

export interface PlaybackOptions {
  volume: number;
  playbackRate?: number;
}
