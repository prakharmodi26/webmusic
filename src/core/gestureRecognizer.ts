import { type HandFrame, Fingertip } from '../types/hand';
import { landmarkDistance } from '../utils/geometry';

export type Gesture = 'open_palm' | 'fist' | 'unknown';

const FINGER_TIPS = [Fingertip.INDEX, Fingertip.MIDDLE, Fingertip.RING, Fingertip.PINKY];
const FINGER_PIPS = [6, 10, 14, 18];

export function recognizeGesture(hand: HandFrame): Gesture {
  const wrist = hand.landmarks[0];
  const middleMcp = hand.landmarks[9];
  const palmSize = landmarkDistance(wrist, middleMcp);

  if (palmSize < 0.01) return 'unknown';

  let extendedCount = 0;
  for (let i = 0; i < FINGER_TIPS.length; i++) {
    const tip = hand.landmarks[FINGER_TIPS[i]];
    const pip = hand.landmarks[FINGER_PIPS[i]];
    const tipDist = landmarkDistance(tip, wrist);
    const pipDist = landmarkDistance(pip, wrist);

    if (tipDist > pipDist * 1.1) {
      extendedCount++;
    }
  }

  if (extendedCount >= 3) return 'open_palm';
  if (extendedCount <= 1) return 'fist';
  return 'unknown';
}
