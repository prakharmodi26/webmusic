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
    // Use middle finger MCP (landmark 9) instead of fingertip —
    // palm size doesn't change when making a fist
    const middleMcp = hand.landmarks[9];
    const palmSize = landmarkDistance(wrist, middleMcp);

    if (palmSize > DISTANCE_THRESHOLDS.tooClose) return 'too_close';
    if (palmSize < DISTANCE_THRESHOLDS.tooFar) return 'too_far';
    return 'ok';
  }, [frame]);
}
