import type { TrackingFrame, Point3D } from '../types/hand';
import type { PadConfig, HitEvent } from '../types/instrument';
import { pointInRegion, clamp } from '../utils/geometry';
import { MotionTracker } from '../utils/motion';
import { MAX_VELOCITY } from '../config/tracking';
import { recognizeGesture } from './gestureRecognizer';

/** How far the stick tip extends past the fist (as a fraction of palm length). */
const STICK_EXTENSION = 0.8;

/** Compute the drumstick tip position from hand landmarks. */
export function getStickTip(landmarks: Point3D[]): Point3D {
  const wrist = landmarks[0];
  const middleMcp = landmarks[9];
  const dx = middleMcp.x - wrist.x;
  const dy = middleMcp.y - wrist.y;
  const dz = middleMcp.z - wrist.z;
  return {
    x: middleMcp.x + dx * STICK_EXTENSION,
    y: middleMcp.y + dy * STICK_EXTENSION,
    z: middleMcp.z + dz * STICK_EXTENSION,
  };
}

export class HitDetector {
  private motionTracker = new MotionTracker();
  private lastHitTime: Map<string, number> = new Map();
  private sensitivityMultiplier = 1.0;

  setSensitivity(value: number): void {
    this.sensitivityMultiplier = value;
  }

  update(frame: TrackingFrame, pads: PadConfig[]): HitEvent[] {
    const hits: HitEvent[] = [];

    for (let hi = 0; hi < frame.hands.length; hi++) {
      const hand = frame.hands[hi];

      // Only detect hits when fist is closed (stick is active)
      const gesture = recognizeGesture(hand);
      if (gesture !== 'fist') continue;

      const tip = getStickTip(hand.landmarks);
      const key = `${hi}-stick`;
      this.motionTracker.update(key, tip, frame.timestamp);

      if (!this.motionTracker.isMovingDown(key)) continue;

      const velocityY = this.motionTracker.getVelocityY(key);

      for (const pad of pads) {
        if (!pointInRegion(tip.x, tip.y, pad.region)) continue;

        const threshold = pad.velocityThreshold / this.sensitivityMultiplier;
        if (velocityY < threshold) continue;

        const cooldownKey = `${hi}-stick-${pad.id}`;
        const lastHit = this.lastHitTime.get(cooldownKey) ?? 0;
        if (frame.timestamp - lastHit < pad.cooldownMs) continue;

        this.lastHitTime.set(cooldownKey, frame.timestamp);

        const velocity = clamp(
          (velocityY - threshold) / (MAX_VELOCITY - threshold),
          0,
          1,
        );

        hits.push({
          padId: pad.id,
          velocity,
          timestamp: frame.timestamp,
          handIndex: hi,
        });
      }
    }

    return hits;
  }

  reset(): void {
    this.motionTracker.clear();
    this.lastHitTime.clear();
  }
}
