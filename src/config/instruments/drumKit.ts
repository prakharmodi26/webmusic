import type { InstrumentConfig } from '../../types/instrument';

// Layout: Camera pointed at torso/lap. Kit fills the visible area.
// From the player's perspective looking down at their lap:
//
//     Crash              Ride         (top - cymbals on stands)
//  Hi-Hat  High Tom   Low Tom         (middle)
//             Snare                    (center-bottom - main drum)

export const drumKitConfig: InstrumentConfig = {
  id: 'drum-kit',
  name: 'Drum Kit',
  pads: [
    {
      id: 'snare',
      label: 'Snare',
      region: { cx: 0.5, cy: 0.7, radius: 0.11 },
      soundFile: '/sounds/snare.wav',
      color: '#ef4444',
      cooldownMs: 60,
      velocityThreshold: 0.3,
      shape: 'drum',
    },
    {
      id: 'hihat',
      label: 'Hi-Hat',
      region: { cx: 0.15, cy: 0.50, radius: 0.08 },
      soundFile: '/sounds/hihat.wav',
      color: '#eab308',
      cooldownMs: 40,
      velocityThreshold: 0.25,
      shape: 'hihat',
    },
    {
      id: 'tom-high',
      label: 'High Tom',
      region: { cx: 0.38, cy: 0.45, radius: 0.09 },
      soundFile: '/sounds/tom-high.wav',
      color: '#3b82f6',
      cooldownMs: 60,
      velocityThreshold: 0.3,
      shape: 'drum',
    },
    {
      id: 'tom-low',
      label: 'Low Tom',
      region: { cx: 0.62, cy: 0.45, radius: 0.09 },
      soundFile: '/sounds/tom-low.wav',
      color: '#a855f7',
      cooldownMs: 60,
      velocityThreshold: 0.3,
      shape: 'drum',
    },
    {
      id: 'crash',
      label: 'Crash',
      region: { cx: 0.2, cy: 0.2, radius: 0.09 },
      soundFile: '/sounds/crash.wav',
      color: '#f97316',
      cooldownMs: 150,
      velocityThreshold: 0.35,
      shape: 'cymbal',
    },
    {
      id: 'ride',
      label: 'Ride',
      region: { cx: 0.8, cy: 0.2, radius: 0.09 },
      soundFile: '/sounds/ride.wav',
      color: '#22c55e',
      cooldownMs: 100,
      velocityThreshold: 0.3,
      shape: 'cymbal',
    },
  ],
};
