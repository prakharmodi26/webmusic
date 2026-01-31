import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { TRACKING_CONFIG } from '../config/tracking';
import type { TrackingFrame, HandFrame, Point3D } from '../types/hand';
import { mirrorX } from '../utils/geometry';

export class HandTracker {
  private landmarker: HandLandmarker | null = null;
  private ready = false;

  async init(): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(TRACKING_CONFIG.wasmPath);
    this.landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: TRACKING_CONFIG.modelAssetPath,
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numHands: TRACKING_CONFIG.maxHands,
      minHandDetectionConfidence: TRACKING_CONFIG.minDetectionConfidence,
      minTrackingConfidence: TRACKING_CONFIG.minTrackingConfidence,
    });
    this.ready = true;
  }

  detect(video: HTMLVideoElement, timestamp: number): TrackingFrame | null {
    if (!this.landmarker || !this.ready) return null;

    const result = this.landmarker.detectForVideo(video, timestamp);
    const hands: HandFrame[] = [];

    for (let i = 0; i < result.landmarks.length; i++) {
      const landmarks: Point3D[] = result.landmarks[i].map((lm) => ({
        x: mirrorX(lm.x),
        y: lm.y,
        z: lm.z,
      }));

      const handedness =
        result.handednesses[i]?.[0]?.categoryName === 'Left' ? 'Right' : 'Left';

      hands.push({ landmarks, handedness });
    }

    return { hands, timestamp };
  }

  destroy(): void {
    this.landmarker?.close();
    this.landmarker = null;
    this.ready = false;
  }
}
