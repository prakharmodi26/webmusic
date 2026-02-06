import type { GameConfig, Column } from '../../game/types';

export const pinchPianoConfig: GameConfig = {
  id: 'pinch-piano',
  name: 'Piano Tiles',

  // Column colors (left to right)
  columnColors: {
    0: '#FF6B6B',  // Red/Coral
    1: '#4ECDC4',  // Teal
    2: '#FFE66D',  // Yellow
    3: '#AA96DA',  // Purple
  } as Record<Column, string>,

  // Speed is derived from fall duration, this is a multiplier
  baseSpeed: 1.0,

  // Hit line position (normalized Y where tiles should be hit)
  hitLineY: 0.85,

  // Tile sizing (normalized heights)
  baseTileHeight: 0.08,   // Minimum tile height
  maxTileHeight: 0.25,    // Maximum tile height for long notes

  // Time for a tile to fall from top to hit line
  fallDuration: 2.0,      // In seconds

  // Bundled songs (paths relative to public folder)
  bundledSongs: [
    '/songs/twinkle-twinkle.mid',
    '/songs/mary-had-a-little-lamb.mid',
    '/songs/ode-to-joy.mid',
  ],
};
