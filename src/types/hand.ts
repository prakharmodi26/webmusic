export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export const Fingertip = {
  THUMB: 4,
  INDEX: 8,
  MIDDLE: 12,
  RING: 16,
  PINKY: 20,
} as const;
export type Fingertip = (typeof Fingertip)[keyof typeof Fingertip];

export interface HandFrame {
  landmarks: Point3D[];
  handedness: 'Left' | 'Right';
}

export interface TrackingFrame {
  hands: HandFrame[];
  timestamp: number;
}
