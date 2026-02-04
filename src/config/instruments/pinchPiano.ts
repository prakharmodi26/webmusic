import type { GameConfig, Column } from '../../game/types';

export const pinchPianoConfig: GameConfig = {
  id: 'pinch-piano',
  name: 'Pinch Piano',

  // Mapping: Thumb + finger → column → note
  // Index(0)=C4, Middle(1)=E4, Ring(2)=G4, Pinky(3)=C5
  columnNotes: {
    0: 'C4',
    1: 'E4',
    2: 'G4',
    3: 'C5',
  } as Record<Column, string>,

  // Column colors (left to right)
  columnColors: {
    0: '#FF6B6B',  // Red/Coral
    1: '#4ECDC4',  // Teal
    2: '#FFE66D',  // Yellow
    3: '#AA96DA',  // Purple
  } as Record<Column, string>,

  // Speed settings (normalized y units per second) - challenging progression
  initialSpeed: 0.6,
  maxSpeed: 10.0,  // Very high max speed - practically unreachable, makes game feel endless
  hitsPerSpeedStep: 3,  // Speed increases every 3 hits for faster progression
  speedSteps: {
    easy: 0.03,
    medium: 0.05,
    hard: 0.08,
  },

  // Spawn settings (seconds between tile spawns) - faster spawning
  initialSpawnRate: 1.2,

  // Hit zone (bottom of screen, normalized y coordinates)
  hitZone: {
    yMin: 0.75,
    yMax: 0.95,
  },

  // Lives
  initialLives: 5,

  // Sound files
  sounds: {
    0: '/sounds/piano/C4.mp3',
    1: '/sounds/piano/E4.mp3',
    2: '/sounds/piano/G4.mp3',
    3: '/sounds/piano/C5.mp3',
  } as Record<Column, string>,
};
