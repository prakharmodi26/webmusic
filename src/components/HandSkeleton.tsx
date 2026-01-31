import { useEffect } from 'react';
import type { TrackingFrame } from '../types/hand';
import { drawLandmarks } from '../utils/canvas';

interface HandSkeletonProps {
  ctx: CanvasRenderingContext2D | null;
  frame: TrackingFrame | null;
  width: number;
  height: number;
}

export default function HandSkeleton({ ctx, frame, width, height }: HandSkeletonProps) {
  useEffect(() => {
    if (!ctx || !frame) return;
    for (const hand of frame.hands) {
      drawLandmarks(ctx, hand.landmarks, width, height);
    }
  }, [ctx, frame, width, height]);

  return null;
}
