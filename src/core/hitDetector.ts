import type { TrackingFrame, Point3D } from '../types/hand';
import type { PadConfig, HitEvent } from '../types/instrument';
import { pointOverlapsRegion } from '../utils/geometry';
import { recognizeGesture } from './gestureRecognizer';

/** Minimum overlap threshold (30%) to trigger a hit. */
const HIT_OVERLAP_THRESHOLD = 0.3;

/**
 * How long (ms) the fist must dwell inside a pad before it triggers.
 * This prevents accidental triggers when sweeping past a pad on the way
 * to another one.
 */
const DWELL_TIME_MS = 120;

/**
 * Compute the center of the fist as the centroid of
 * wrist (0) and the 4 MCP joints (5, 9, 13, 17).
 */
export function getFistCenter(landmarks: Point3D[]): { x: number; y: number } {
  const indices = [0, 5, 9, 13, 17];
  let sx = 0;
  let sy = 0;
  for (const i of indices) {
    sx += landmarks[i].x;
    sy += landmarks[i].y;
  }
  return { x: sx / indices.length, y: sy / indices.length };
}

/**
 * Compute the fist radius as half the distance from wrist to middle MCP.
 */
export function getFistRadius(landmarks: Point3D[]): number {
  const wrist = landmarks[0];
  const middleMcp = landmarks[9];
  const dx = middleMcp.x - wrist.x;
  const dy = middleMcp.y - wrist.y;
  return Math.sqrt(dx * dx + dy * dy) / 2;
}

export class HitDetector {
  /** Tracks whether each hand has already triggered each pad. Key: `${handIndex}-${padId}` */
  private triggered: Map<string, boolean> = new Map();
  /** Timestamp when the fist first entered each pad. Key: `${handIndex}-${padId}` */
  private enterTime: Map<string, number> = new Map();

  update(frame: TrackingFrame, pads: PadConfig[]): HitEvent[] {
    const hits: HitEvent[] = [];

    for (let hi = 0; hi < frame.hands.length; hi++) {
      const hand = frame.hands[hi];
      const gesture = recognizeGesture(hand);

      // Only closed fist triggers hits
      if (gesture !== 'fist') {
        // Clear all states for this hand when not a fist
        for (const pad of pads) {
          const key = `${hi}-${pad.id}`;
          this.triggered.delete(key);
          this.enterTime.delete(key);
        }
        continue;
      }

      const center = getFistCenter(hand.landmarks);
      const radius = getFistRadius(hand.landmarks);

      for (const pad of pads) {
        const key = `${hi}-${pad.id}`;
        const isInside = pointOverlapsRegion(
          center.x,
          center.y,
          pad.region,
          HIT_OVERLAP_THRESHOLD,
          radius,
        );

        if (!isInside) {
          // Left the pad — reset so it can trigger again next time
          this.triggered.delete(key);
          this.enterTime.delete(key);
          continue;
        }

        // Fist is inside the pad
        if (this.triggered.get(key)) {
          // Already fired for this entry — do nothing until fist leaves
          continue;
        }

        const enteredAt = this.enterTime.get(key);
        if (enteredAt === undefined) {
          // Just entered — record timestamp, don't fire yet
          this.enterTime.set(key, frame.timestamp);
          continue;
        }

        // Check dwell time
        if (frame.timestamp - enteredAt >= DWELL_TIME_MS) {
          // Fist has been inside long enough — trigger
          this.triggered.set(key, true);
          hits.push({
            padId: pad.id,
            timestamp: frame.timestamp,
            handIndex: hi,
          });
        }
      }
    }

    return hits;
  }

  reset(): void {
    this.triggered.clear();
    this.enterTime.clear();
  }
}
