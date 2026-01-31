import { type TrackingFrame, Fingertip } from '../types/hand';
import type { PadConfig, HitEvent } from '../types/instrument';
import { pointInRegion, clamp } from '../utils/geometry';
import { MotionTracker } from '../utils/motion';
import { MAX_VELOCITY } from '../config/tracking';

const STRIKE_FINGERTIPS = [Fingertip.INDEX, Fingertip.MIDDLE];

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

      for (const fingertip of STRIKE_FINGERTIPS) {
        const lm = hand.landmarks[fingertip];
        if (!lm) continue;

        const key = `${hi}-${fingertip}`;
        this.motionTracker.update(key, lm, frame.timestamp);

        if (!this.motionTracker.isMovingDown(key)) continue;

        const velocityY = this.motionTracker.getVelocityY(key);

        for (const pad of pads) {
          if (!pointInRegion(lm.x, lm.y, pad.region)) continue;

          const threshold = pad.velocityThreshold / this.sensitivityMultiplier;
          if (velocityY < threshold) continue;

          const cooldownKey = `${hi}-${fingertip}-${pad.id}`;
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
            fingertip,
          });
        }
      }
    }

    return hits;
  }

  reset(): void {
    this.motionTracker.clear();
    this.lastHitTime.clear();
  }
}
