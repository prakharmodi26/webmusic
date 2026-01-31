export const TRACKING_CONFIG = {
  maxHands: 2,
  minDetectionConfidence: 0.6,
  minTrackingConfidence: 0.5,
  targetFps: 30,
  modelAssetPath:
    'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
  wasmPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
};

export const DISTANCE_THRESHOLDS = {
  tooClose: 0.35,
  tooFar: 0.12,
  okMin: 0.12,
  okMax: 0.35,
};

export const VELOCITY_BUFFER_SIZE = 5;
export const MAX_VELOCITY = 0.08;
