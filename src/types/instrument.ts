export interface PadRegion {
  cx: number;
  cy: number;
  radius: number;
}

export interface PadConfig {
  id: string;
  label: string;
  region: PadRegion;
  soundFile: string;
  color: string;
  cooldownMs: number;
  velocityThreshold: number;
}

export interface InstrumentConfig {
  id: string;
  name: string;
  pads: PadConfig[];
}

export interface HitEvent {
  padId: string;
  velocity: number;
  timestamp: number;
  handIndex: number;
  fingertip: number;
}
