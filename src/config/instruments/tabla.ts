import type { InstrumentConfig } from '../../types/instrument';

// Tabla layout:
// - Bayan (bass, left) - larger, deeper tone
// - Dayan (treble, right) - smaller, sharper tone
// - Both (combined stroke) - bottom center

export const tablaConfig: InstrumentConfig = {
  id: 'tabla',
  name: 'Tabla',
  pads: [
    {
      id: 'bayan',
      label: 'Bayan',
      region: { cx: 0.3, cy: 0.5, radius: 0.22 },
      soundFile: '/sounds/tabla-ge.wav',
      color: '#5D3A1A',
      shape: 'tabla',
    },
    {
      id: 'dayan',
      label: 'Dayan',
      region: { cx: 0.7, cy: 0.5, radius: 0.18 },
      soundFile: '/sounds/tabla-na.wav',
      color: '#8B5A2B',
      shape: 'tabla',
    },
    {
      id: 'both',
      label: 'Both',
      region: { cx: 0.5, cy: 0.82, radius: 0.15 },
      soundFile: '/sounds/tabla-dha.wav',
      color: '#6B4423',
      shape: 'tabla',
    },
  ],
};

// Available tabla sounds for switching
export const tablaSounds = [
  { id: 'na', label: 'Na', file: '/sounds/tabla-na.wav' },
  { id: 'tin', label: 'Tin', file: '/sounds/tabla-tin.wav' },
  { id: 'ge', label: 'Ge', file: '/sounds/tabla-ge.wav' },
  { id: 'dhin', label: 'Dhin', file: '/sounds/tabla-dhin.wav' },
  { id: 'dha', label: 'Dha', file: '/sounds/tabla-dha.wav' },
  { id: 'te', label: 'Te', file: '/sounds/tabla-te.wav' },
];
