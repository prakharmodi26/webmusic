import { useEffect } from 'react';
import type { PadConfig } from '../types/instrument';
import { drawPad } from '../utils/canvas';

interface PadOverlayProps {
  ctx: CanvasRenderingContext2D | null;
  pads: PadConfig[];
  activePads: Set<string>;
  width: number;
  height: number;
  beginnerMode: boolean;
}

export default function PadOverlay({
  ctx,
  pads,
  activePads,
  width,
  height,
  beginnerMode,
}: PadOverlayProps) {
  useEffect(() => {
    if (!ctx) return;
    const scale = beginnerMode ? 1.4 : 1;
    for (const pad of pads) {
      drawPad(ctx, pad, width, height, activePads.has(pad.id), scale);
    }
  }, [ctx, pads, activePads, width, height, beginnerMode]);

  return null;
}
