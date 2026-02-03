import type { TrackingFrame, Point3D } from '../types/hand';
import type { PadConfig, HitEvent } from '../types/instrument';
import { distance2D } from '../utils/geometry';
import { recognizeGesture } from './gestureRecognizer';

/** Default trigger zone is 60% of the visual pad radius. */
const DEFAULT_HITBOX_RATIO = 0.6;

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

  update(frame: TrackingFrame, pads: PadConfig[], sensitivity: number = DEFAULT_HITBOX_RATIO): HitEvent[] {
    const hits: HitEvent[] = [];

    for (let hi = 0; hi < frame.hands.length; hi++) {
      const hand = frame.hands[hi];
      const gesture = recognizeGesture(hand);

      // Only closed fist triggers hits
      if (gesture !== 'fist') {
        // Clear all states for this hand when not a fist
        for (const pad of pads) {
          this.triggered.delete(`${hi}-${pad.id}`);
        }
        continue;
      }

      const center = getFistCenter(hand.landmarks);

      for (const pad of pads) {
        const key = `${hi}-${pad.id}`;
        const dist = distance2D(center, { x: pad.region.cx, y: pad.region.cy });
        const innerRadius = pad.region.radius * sensitivity;

        if (dist <= innerRadius) {
          // Fist center is inside the inner hitbox
          if (!this.triggered.get(key)) {
            this.triggered.set(key, true);
            hits.push({
              padId: pad.id,
              timestamp: frame.timestamp,
              handIndex: hi,
            });
          }
        } else if (dist > pad.region.radius) {
          // Fist center is outside the full visual radius — allow re-trigger
          this.triggered.delete(key);
        }
        // Between innerRadius and full radius: do nothing (hysteresis zone)
      }
    }

    return hits;
  }

  reset(): void {
    this.triggered.clear();
  }
}
