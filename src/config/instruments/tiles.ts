import type { InstrumentConfig, PadConfig } from '../../types/instrument';

// Piano notes with corresponding sound files (3 rows of 7 notes + extra note)
const PIANO_NOTES = [
  // Bottom row - Octave 3
  { note: 'C3', color: '#FF6B6B' },
  { note: 'D3', color: '#FF8C42' },
  { note: 'E3', color: '#FFE66D' },
  { note: 'F3', color: '#95E1D3' },
  { note: 'G3', color: '#4ECDC4' },
  { note: 'A3', color: '#45B7D1' },
  { note: 'B3', color: '#AA96DA' },
  // Middle row - Octave 4
  { note: 'C4', color: '#FF6B6B' },
  { note: 'D4', color: '#FF8C42' },
  { note: 'E4', color: '#FFE66D' },
  { note: 'F4', color: '#95E1D3' },
  { note: 'G4', color: '#4ECDC4' },
  { note: 'A4', color: '#45B7D1' },
  { note: 'B4', color: '#AA96DA' },
  // Top row - Octave 5
  { note: 'C5', color: '#FF6B6B' },
  { note: 'D5', color: '#FF8C42' },
  { note: 'E5', color: '#FFE66D' },
  { note: 'F5', color: '#95E1D3' },
  { note: 'G5', color: '#4ECDC4' },
  { note: 'A5', color: '#45B7D1' },
  { note: 'B5', color: '#AA96DA' },
];

// Generate a full-screen grid of piano tiles (3 rows x 7 columns)
function generateTilesGrid(): PadConfig[] {
  const pads: PadConfig[] = [];
  const cols = 7; // 7 notes per octave (C, D, E, F, G, A, B)
  const rows = 3; // 3 octaves

  // Calculate tile dimensions to fill the screen
  // Using normalized coordinates (0-1)
  const margin = 0.02; // Small margin around edges
  const gap = 0.01; // Gap between tiles
  
  const availableWidth = 1 - 2 * margin - (cols - 1) * gap;
  const availableHeight = 1 - 2 * margin - (rows - 1) * gap;
  
  const tileWidth = availableWidth / cols;
  const tileHeight = availableHeight / rows;
  
  // Use the smaller dimension for the radius (tiles are squares)
  const tileRadius = Math.min(tileWidth, tileHeight) / 2 - 0.005;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const noteIndex = row * cols + col;
      const noteData = PIANO_NOTES[noteIndex];
      
      // Calculate center position
      const cx = margin + tileRadius + col * (tileWidth + gap);
      const cy = margin + tileRadius + row * (tileHeight + gap);

      pads.push({
        id: `tile-${noteData.note}`,
        label: noteData.note,
        region: {
          cx,
          cy,
          radius: tileRadius,
        },
        soundFile: `/sounds/piano/${noteData.note}.mp3`,
        color: noteData.color,
        shape: 'tile',
      });
    }
  }
  return pads;
}

export const tilesConfig: InstrumentConfig = {
  id: 'tiles',
  name: 'Piano Tiles',
  pads: generateTilesGrid(),
};
