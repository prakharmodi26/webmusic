import { useEffect } from 'react';
import { type RippleState, drawRipple } from '../utils/canvas';

interface EffectsLayerProps {
  ctx: CanvasRenderingContext2D | null;
  ripples: RippleState[];
  onCleanup: (remaining: RippleState[]) => void;
  width: number;
  height: number;
}

export default function EffectsLayer({ ctx, ripples, onCleanup, width, height }: EffectsLayerProps) {
  useEffect(() => {
    if (!ctx || ripples.length === 0) return;

    const now = performance.now();
    const remaining: RippleState[] = [];

    for (const ripple of ripples) {
      if (drawRipple(ctx, ripple, width, height, now)) {
        remaining.push(ripple);
      }
    }

    if (remaining.length !== ripples.length) {
      onCleanup(remaining);
    }
  }, [ctx, ripples, onCleanup, width, height]);

  return null;
}
