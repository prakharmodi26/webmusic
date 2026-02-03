import type { InstrumentConfig } from '../../types/instrument';

// Custom mode starts with no pads - user adds their own
export const customConfig: InstrumentConfig = {
  id: 'custom',
  name: 'Custom',
  pads: [],
};

// Preset colors for custom pads
export const customPadColors = [
  '#EF4444', // red
  '#F97316', // orange
  '#EAB308', // yellow
  '#22C55E', // green
  '#06B6D4', // cyan
  '#3B82F6', // blue
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#6B7280', // gray
  '#FFFFFF', // white
];

// Generate a unique ID for new custom pads
export function generatePadId(): string {
  return `pad-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
