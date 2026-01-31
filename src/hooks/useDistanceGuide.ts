import { useMemo } from 'react';
import type { TrackingFrame } from '../types/hand';
import { landmarkDistance } from '../utils/geometry';
import { DISTANCE_THRESHOLDS } from '../config/tracking';

export type DistanceStatus = 'ok' | 'too_close' | 'too_far' | 'no_hand';

export function useDistanceGuide(frame: TrackingFrame | null): DistanceStatus {
  return useMemo(() => {
    if (!frame || frame.hands.length === 0) return 'no_hand';

    const hand = frame.hands[0];
    const wrist = hand.landmarks[0];
    const middleTip = hand.landmarks[12];
    const handSpan = landmarkDistance(wrist, middleTip);

    if (handSpan > DISTANCE_THRESHOLDS.tooClose) return 'too_close';
    if (handSpan < DISTANCE_THRESHOLDS.tooFar) return 'too_far';
    return 'ok';
  }, [frame]);
}
