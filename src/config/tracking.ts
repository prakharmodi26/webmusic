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
  // Based on wrist-to-middle-MCP (landmark 9) distance in normalized coords
  tooClose: 0.18,
  tooFar: 0.05,
};

export const VELOCITY_BUFFER_SIZE = 5;
// Velocity thresholds are now in normalized-units per second
export const MAX_VELOCITY = 3.0;
