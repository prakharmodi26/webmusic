import type { InstrumentConfig } from '../../types/instrument';

// Layout based on reference image:
//
//     Crash (L)                    Ride (R)       (top corners - cymbals)
//  Snare (L)    Bass (Center)    Tom-High (R)    (middle row - main drums)
//     Tom-Low (L)              Hi-Hat (R)        (bottom corners)

export const drumKitConfig: InstrumentConfig = {
  id: 'drum-kit',
  name: 'Drum Kit',
  pads: [
    // Top row - Cymbals (golden brass color)
    {
      id: 'crash',
      label: 'Crash',
      region: { cx: 0.13, cy: 0.18, radius: 0.12 },
      soundFile: '/sounds/crash.wav',
      color: '#D4A843', // Golden brass
      cooldownMs: 150,
      velocityThreshold: 0.35,
      shape: 'cymbal',
    },
    {
      id: 'ride',
      label: 'Ride',
      region: { cx: 0.87, cy: 0.18, radius: 0.12 },
      soundFile: '/sounds/ride.wav',
      color: '#D4A843', // Golden brass
      cooldownMs: 100,
      velocityThreshold: 0.3,
      shape: 'cymbal',
    },
    // Middle row - Main drums
    {
      id: 'snare',
      label: 'Snare',
      region: { cx: 0.18, cy: 0.55, radius: 0.14 },
      soundFile: '/sounds/snare.wav',
      color: '#CCCCCC', // Silver/chrome
      cooldownMs: 60,
      velocityThreshold: 0.3,
      shape: 'drum',
    },
    {
      id: 'bass',
      label: 'Bass',
      region: { cx: 0.5, cy: 0.58, radius: 0.18 },
      soundFile: '/sounds/tom-low.wav', // Using tom-low as bass
      color: '#CCCCCC', // Silver/chrome
      cooldownMs: 60,
      velocityThreshold: 0.3,
      shape: 'drum',
    },
    {
      id: 'tom-high',
      label: 'High Tom',
      region: { cx: 0.82, cy: 0.55, radius: 0.12 },
      soundFile: '/sounds/tom-high.wav',
      color: '#CCCCCC', // Silver/chrome
      cooldownMs: 60,
      velocityThreshold: 0.3,
      shape: 'drum',
    },
    // Bottom row - Corner drums
    {
      id: 'tom-low',
      label: 'Low Tom',
      region: { cx: 0.15, cy: 0.85, radius: 0.10 },
      soundFile: '/sounds/tom-low.wav',
      color: '#CCCCCC', // Silver/chrome
      cooldownMs: 60,
      velocityThreshold: 0.3,
      shape: 'drum',
    },
    {
      id: 'hihat',
      label: 'Hi-Hat',
      region: { cx: 0.85, cy: 0.85, radius: 0.10 },
      soundFile: '/sounds/hihat.wav',
      color: '#CCCCCC', // Silver/chrome
      cooldownMs: 40,
      velocityThreshold: 0.25,
      shape: 'hihat',
    },
  ],
};
