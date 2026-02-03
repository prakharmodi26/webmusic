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
      region: { cx: 0.3, cy: 0.5, radius: 0.16 },
      soundFile: '/sounds/tabla/Tabla/ghay.wav',
      color: '#5D3A1A',
      shape: 'tabla',
    },
    {
      id: 'dayan',
      label: 'Dayan',
      region: { cx: 0.7, cy: 0.5, radius: 0.14 },
      soundFile: '/sounds/tabla/Tabla/na.wav',
      color: '#8B5A2B',
      shape: 'tabla',
    },
    {
      id: 'both',
      label: 'Both',
      region: { cx: 0.5, cy: 0.82, radius: 0.12 },
      soundFile: '/sounds/tabla/Tabla/dha-noslide.wav',
      color: '#6B4423',
      shape: 'tabla',
    },
  ],
};

// Available tabla sounds for switching
export const tablaSounds = [
  { id: 'na', label: 'Na', file: '/sounds/tabla/Tabla/na.wav' },
  { id: 'tay', label: 'Tay', file: '/sounds/tabla/Tabla/tay.wav' },
  { id: 'tey', label: 'Tey', file: '/sounds/tabla/Tabla/tey.wav' },
  { id: 'ti', label: 'Ti', file: '/sounds/tabla/Tabla/ti.wav' },
  { id: 'ti-ri', label: 'Ti-Ri', file: '/sounds/tabla/Tabla/ti-ri.wav' },
  { id: 'tun', label: 'Tun', file: '/sounds/tabla/Tabla/tun.wav' },
  { id: 'dhi', label: 'Dhi', file: '/sounds/tabla/Tabla/dhi.wav' },
  { id: 'dhin', label: 'Dhin', file: '/sounds/tabla/Tabla/dhin-noslide.wav' },
  { id: 'dhin-slide', label: 'Dhin (Slide)', file: '/sounds/tabla/Tabla/dhin-slide.wav' },
  { id: 'dha', label: 'Dha', file: '/sounds/tabla/Tabla/dha-noslide.wav' },
  { id: 'dha-slide', label: 'Dha (Slide)', file: '/sounds/tabla/Tabla/dha-slide.wav' },
  { id: 'ghay', label: 'Ghay', file: '/sounds/tabla/Tabla/ghay.wav' },
  { id: 'gi', label: 'Gi', file: '/sounds/tabla/Tabla/gi.wav' },
  { id: 'kut', label: 'Kut', file: '/sounds/tabla/Tabla/kut.wav' },
  { id: 'tabla1', label: 'Tabla 1', file: '/sounds/tabla/Tabla/tabla1.wav' },
  { id: 'tabla2', label: 'Tabla 2', file: '/sounds/tabla/Tabla/tabla2.wav' },
  { id: 'tabla3', label: 'Tabla 3', file: '/sounds/tabla/Tabla/tabla3.wav' },
  { id: 'tabla4', label: 'Tabla 4', file: '/sounds/tabla/Tabla/tabla4.wav' },
  { id: 'tabla5', label: 'Tabla 5', file: '/sounds/tabla/Tabla/tabla5.wav' },
  { id: 'tabla6', label: 'Tabla 6', file: '/sounds/tabla/Tabla/tabla6.wav' },
];
