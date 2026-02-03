import type { TrackingFrame, Point3D } from '../types/hand';
import type { PadConfig, HitEvent } from '../types/instrument';
import { distance2D } from '../utils/geometry';
import { recognizeGesture } from './gestureRecognizer';

/** Default trigger zone is 60% of the visual pad radius. */
const DEFAULT_HITBOX_RATIO = 0.6;

/** Cooldown duration in milliseconds after a hit before re-triggering is allowed */
const COOLDOWN_DURATION = 200;

/** Pad state constants */
const PAD_STATE_IDLE = 'idle';           // Not touching pad, ready to trigger
const PAD_STATE_ENTERING = 'entering';   // Just entered pad, will trigger on next frame
const PAD_STATE_HIT = 'hit';             // Just triggered
const PAD_STATE_COOLDOWN = 'cooldown';   // In cooldown period
const PAD_STATE_WAITING = 'waiting';     // Waiting for finger to leave before allowing re-trigger

type PadState = typeof PAD_STATE_IDLE | typeof PAD_STATE_ENTERING | typeof PAD_STATE_HIT | typeof PAD_STATE_COOLDOWN | typeof PAD_STATE_WAITING;

interface PadTrackingState {
  state: PadState;
  lastHitTime: number;
}

/**
 * Get the index fingertip position (landmark 8).
 * Used for piano tiles where finger pointing is the interaction mode.
 */
export function getIndexFingertip(landmarks: Point3D[]): { x: number; y: number } {
  const tip = landmarks[8]; // Index finger tip
  return { x: tip.x, y: tip.y };
}

/**
 * Compute the center of the hand as the centroid of
 * wrist (0) and the 4 MCP joints (5, 9, 13, 17).
 * Works for both fist and open hand.
 */
export function getHandCenter(landmarks: Point3D[]): { x: number; y: number } {
  const indices = [0, 5, 9, 13, 17];
  let sx = 0;
  let sy = 0;
  for (const i of indices) {
    sx += landmarks[i].x;
    sy += landmarks[i].y;
  }
  return { x: sx / indices.length, y: sy / indices.length };
}

/** @deprecated Use getHandCenter instead */
export function getFistCenter(landmarks: Point3D[]): { x: number; y: number } {
  return getHandCenter(landmarks);
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
  /** State machine tracking for each hand-pad combination. Key: `${handIndex}-${padId}` */
  private padStates: Map<string, PadTrackingState> = new Map();

  private getOrCreatePadState(key: string): PadTrackingState {
    let state = this.padStates.get(key);
    if (!state) {
      state = { state: PAD_STATE_IDLE, lastHitTime: 0 };
      this.padStates.set(key, state);
    }
    return state;
  }

  update(frame: TrackingFrame, pads: PadConfig[], sensitivity: number = DEFAULT_HITBOX_RATIO, useFingerTip: boolean = false): HitEvent[] {
    const hits: HitEvent[] = [];
    const now = Date.now();
    const activeKeys = new Set<string>();

    for (let hi = 0; hi < frame.hands.length; hi++) {
      const hand = frame.hands[hi];
      const gesture = recognizeGesture(hand);

      // For tiles (useFingerTip=true): use index finger tip position, any gesture works
      // For drums/tabla: only closed fist triggers hits, use hand center
      if (!useFingerTip && gesture !== 'fist') {
        // Clear all states for this hand when not a fist
        for (const pad of pads) {
          const key = `${hi}-${pad.id}`;
          const padState = this.padStates.get(key);
          if (padState && padState.state !== PAD_STATE_COOLDOWN) {
            padState.state = PAD_STATE_IDLE;
          }
        }
        continue;
      }

      // Get detection point based on mode
      const detectionPoint = useFingerTip 
        ? getIndexFingertip(hand.landmarks) 
        : getHandCenter(hand.landmarks);

      for (const pad of pads) {
        const key = `${hi}-${pad.id}`;
        activeKeys.add(key);
        const padState = this.getOrCreatePadState(key);
        const dist = distance2D(detectionPoint, { x: pad.region.cx, y: pad.region.cy });
        const innerRadius = pad.region.radius * sensitivity;
        const isInsidePad = dist <= innerRadius;

        // State machine logic
        switch (padState.state) {
          case PAD_STATE_IDLE:
            if (isInsidePad) {
              padState.state = PAD_STATE_ENTERING;
            }
            break;

          case PAD_STATE_ENTERING:
            if (isInsidePad) {
              // Trigger hit
              padState.state = PAD_STATE_HIT;
              padState.lastHitTime = now;
              hits.push({
                padId: pad.id,
                timestamp: frame.timestamp,
                handIndex: hi,
              });
            } else {
              // Left without triggering
              padState.state = PAD_STATE_IDLE;
            }
            break;

          case PAD_STATE_HIT:
            // Immediately go to cooldown
            padState.state = PAD_STATE_COOLDOWN;
            break;

          case PAD_STATE_COOLDOWN:
            if (!isInsidePad) {
              // Left the pad - go to idle (can re-trigger on next entry)
              padState.state = PAD_STATE_IDLE;
            } else if (now - padState.lastHitTime > COOLDOWN_DURATION) {
              // Still inside and cooldown expired - go to waiting state
              // Must leave the pad before triggering again
              padState.state = PAD_STATE_WAITING;
            }
            break;

          case PAD_STATE_WAITING:
            // Stay in waiting until finger leaves the pad
            if (!isInsidePad) {
              padState.state = PAD_STATE_IDLE;
            }
            // If still inside, do nothing - no re-trigger allowed
            break;
        }
      }
    }

    // Reset pads that are no longer being tracked by any hand
    for (const [key, padState] of this.padStates) {
      if (!activeKeys.has(key)) {
        // Hand is no longer tracking this pad - reset to idle
        padState.state = PAD_STATE_IDLE;
      }
    }

    return hits;
  }

  reset(): void {
    this.padStates.clear();
  }
}
