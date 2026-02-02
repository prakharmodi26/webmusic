export interface PadRegion {
  cx: number;
  cy: number;
  radius: number;
}

export type DrumShape = 'drum' | 'cymbal' | 'hihat';

export interface PadConfig {
  id: string;
  label: string;
  region: PadRegion;
  soundFile: string;
  color: string;
  shape: DrumShape;
}

export interface InstrumentConfig {
  id: string;
  name: string;
  pads: PadConfig[];
}

export interface HitEvent {
  padId: string;
  timestamp: number;
  handIndex: number;
}
