import type { HandFrame, Point3D } from '../types/hand';

// ============================================================
// PUBLIC INTERFACES (maintained for compatibility)
// ============================================================

export interface PinchState {
  col0: boolean;  // Right hand: middle finger down
  col1: boolean;  // Right hand: index finger down
  col2: boolean;  // Left hand: index finger down
  col3: boolean;  // Left hand: middle finger down
}

/** Debug info for a single finger detection */
export interface FingerDebugInfo {
  finger: 'index' | 'middle';
  tipY: number;
  pipY: number;
  mcpY: number;
  bendAmount: number;
  baseConfidence: number;
  totalConfidence: number;
  requiredConfidence: number;
  isDown: boolean;
  wasDown: boolean;
}

/** Debug info for a single hand */
export interface HandDebugInfo {
  handedness: 'Left' | 'Right';
  palmSize: number;
  wristY: number;
  fingers: FingerDebugInfo[];
}

/** Complete debug info for finger detection */
export interface PinchDebugInfo {
  hands: HandDebugInfo[];
  activeColumn: number | null;
  thresholds: {
    bendThreshold: number;
    releaseThreshold: number;
    confidenceThreshold: number;
  };
}

// ============================================================
// TUNABLE CONFIGURATION PARAMETERS
// ============================================================

export interface FingerDetectorConfig {
  // Primary threshold: How far tip must be below PIP to consider finger "down"
  fingerDownThreshold: number;

  // Confidence boost when the OTHER finger is confirmed UP
  partnerUpBoost: number;

  // Minimum curl ratio (tip-to-mcp vs pip-to-mcp) to consider finger curled
  curlRatioThreshold: number;

  // Debounce: frames finger must be down before registering
  debounceFrames: number;

  // Z-depth threshold for forward detection
  zDepthThreshold: number;

  // Use angle-based detection (more robust to hand orientation)
  useAngleDetection: boolean;

  // Angle threshold in degrees - finger considered down when angle < this
  angleThreshold: number;

  // Smoothing factor for landmark positions (0 = no smoothing, 1 = full previous)
  smoothingFactor: number;

  // Hysteresis: different thresholds for going down vs coming up
  hysteresisMargin: number;
}

const DEFAULT_CONFIG: FingerDetectorConfig = {
  fingerDownThreshold: 0.04,
  partnerUpBoost: 0.15,
  curlRatioThreshold: 0.55,
  debounceFrames: 2,
  zDepthThreshold: -0.02,
  useAngleDetection: true,
  angleThreshold: 140,
  smoothingFactor: 0.4,
  hysteresisMargin: 0.015,
};

// ============================================================
// INTERNAL TYPES
// ============================================================

type DetectedFinger = 'index' | 'middle' | 'both' | 'none';

interface FingerState {
  isDown: boolean;
  confidence: number;
  rawValue: number;
  timestamp: number;
}

// ============================================================
// VICTORY FINGER DETECTOR CLASS
// ============================================================

class VictoryFingerDetector {
  private config: FingerDetectorConfig;
  
  // State tracking per finger
  private indexDownFrames = 0;
  private middleDownFrames = 0;
  private firstDownFinger: DetectedFinger | null = null;
  
  // Previous states for hysteresis
  private prevIndexDown = false;
  private prevMiddleDown = false;
  
  // Smoothed landmarks
  private smoothedLandmarks: Point3D[] | null = null;

  constructor(config: Partial<FingerDetectorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Reset all state (call when hand is lost/redetected)
   */
  reset(): void {
    this.indexDownFrames = 0;
    this.middleDownFrames = 0;
    this.firstDownFinger = null;
    this.prevIndexDown = false;
    this.prevMiddleDown = false;
    this.smoothedLandmarks = null;
  }

  /**
   * Main detection method - call this each frame with landmarks
   */
  detect(landmarks: Point3D[]): { indexDown: boolean; middleDown: boolean; indexConf: number; middleConf: number } {
    const now = Date.now();
    
    // Apply smoothing
    const smoothed = this.smoothLandmarks(landmarks);
    
    // Get finger states using multiple methods for robustness
    const indexState = this.getFingerState(smoothed, 'index', now);
    const middleState = this.getFingerState(smoothed, 'middle', now);
    
    // Apply partner boost - if one is UP, increases confidence the other is DOWN
    if (!indexState.isDown && middleState.confidence > 0.3) {
      middleState.confidence = Math.min(1.0, middleState.confidence + this.config.partnerUpBoost);
    }
    if (!middleState.isDown && indexState.confidence > 0.3) {
      indexState.confidence = Math.min(1.0, indexState.confidence + this.config.partnerUpBoost);
    }
    
    // Apply hysteresis to prevent flickering
    const indexDown = this.applyHysteresis(indexState, this.prevIndexDown);
    const middleDown = this.applyHysteresis(middleState, this.prevMiddleDown);
    
    // Update debounce counters
    this.indexDownFrames = indexDown ? this.indexDownFrames + 1 : 0;
    this.middleDownFrames = middleDown ? this.middleDownFrames + 1 : 0;
    
    // Check if fingers pass debounce threshold
    const indexConfirmedDown = this.indexDownFrames >= this.config.debounceFrames;
    const middleConfirmedDown = this.middleDownFrames >= this.config.debounceFrames;
    
    // Track which finger went down first
    this.updateFirstDownFinger(indexConfirmedDown, middleConfirmedDown);
    
    // Update previous states
    this.prevIndexDown = indexDown;
    this.prevMiddleDown = middleDown;
    
    return {
      indexDown: indexConfirmedDown,
      middleDown: middleConfirmedDown,
      indexConf: indexState.confidence,
      middleConf: middleState.confidence,
    };
  }

  /**
   * Smooth landmarks to reduce jitter
   */
  private smoothLandmarks(landmarks: Point3D[]): Point3D[] {
    if (!this.smoothedLandmarks || this.config.smoothingFactor === 0) {
      this.smoothedLandmarks = landmarks.map(l => ({ ...l }));
      return this.smoothedLandmarks;
    }
    
    const alpha = this.config.smoothingFactor;
    this.smoothedLandmarks = landmarks.map((l, i) => ({
      x: alpha * this.smoothedLandmarks![i].x + (1 - alpha) * l.x,
      y: alpha * this.smoothedLandmarks![i].y + (1 - alpha) * l.y,
      z: alpha * (this.smoothedLandmarks![i].z || 0) + (1 - alpha) * (l.z || 0),
    }));
    
    return this.smoothedLandmarks;
  }

  /**
   * Get the state of a specific finger using multiple detection methods
   */
  private getFingerState(
    landmarks: Point3D[], 
    finger: 'index' | 'middle',
    timestamp: number
  ): FingerState {
    const indices = finger === 'index' 
      ? { mcp: 5, pip: 6, dip: 7, tip: 8 }
      : { mcp: 9, pip: 10, dip: 11, tip: 12 };
    
    const mcp = landmarks[indices.mcp];
    const pip = landmarks[indices.pip];
    const tip = landmarks[indices.tip];
    
    // Method 1: Y-position based (tip below PIP)
    const yDiff = tip.y - pip.y;
    const yBasedDown = yDiff > this.config.fingerDownThreshold;
    
    // Method 2: Curl ratio (how much finger is curled)
    const tipToMcp = this.distance(tip, mcp);
    const pipToMcp = this.distance(pip, mcp);
    const curlRatio = tipToMcp / (pipToMcp + 0.0001);
    const curlBasedDown = curlRatio < this.config.curlRatioThreshold;
    
    // Method 3: Angle-based detection (more robust to rotation)
    let angleBasedDown = false;
    if (this.config.useAngleDetection) {
      const angle = this.calculateFingerAngle(mcp, pip, tip);
      angleBasedDown = angle < this.config.angleThreshold;
    }
    
    // Method 4: Z-depth check (finger moving toward camera when curled)
    const zDiff = (tip.z || 0) - (pip.z || 0);
    const zBasedDown = zDiff < this.config.zDepthThreshold;
    
    // Combine methods with weighted voting
    let downScore = 0;
    let totalWeight = 0;
    
    // Y-position: weight 0.35
    if (yBasedDown) downScore += 0.35;
    totalWeight += 0.35;
    
    // Curl ratio: weight 0.25
    if (curlBasedDown) downScore += 0.25;
    totalWeight += 0.25;
    
    // Angle: weight 0.30 (if enabled)
    if (this.config.useAngleDetection) {
      if (angleBasedDown) downScore += 0.30;
      totalWeight += 0.30;
    }
    
    // Z-depth: weight 0.10 (supplementary)
    if (zBasedDown) downScore += 0.10;
    totalWeight += 0.10;
    
    const confidence = downScore / totalWeight;
    const isDown = confidence > 0.5;
    
    return {
      isDown,
      confidence,
      rawValue: yDiff,
      timestamp,
    };
  }

  /**
   * Calculate the angle at the PIP joint (finger bend angle)
   */
  private calculateFingerAngle(mcp: Point3D, pip: Point3D, tip: Point3D): number {
    const v1 = { x: mcp.x - pip.x, y: mcp.y - pip.y };
    const v2 = { x: tip.x - pip.x, y: tip.y - pip.y };
    
    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
    
    if (mag1 === 0 || mag2 === 0) return 180;
    
    const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
    return Math.acos(cosAngle) * (180 / Math.PI);
  }

  /**
   * Calculate Euclidean distance between two landmarks
   */
  private distance(a: Point3D, b: Point3D): number {
    return Math.sqrt(
      Math.pow(a.x - b.x, 2) + 
      Math.pow(a.y - b.y, 2) + 
      Math.pow((a.z || 0) - (b.z || 0), 2)
    );
  }

  /**
   * Apply hysteresis to prevent flickering at threshold boundary
   */
  private applyHysteresis(state: FingerState, wasDown: boolean): boolean {
    const threshold = wasDown 
      ? 0.5 - this.config.hysteresisMargin
      : 0.5 + this.config.hysteresisMargin;
    
    return state.confidence > threshold;
  }

  /**
   * Track which finger went down first
   */
  private updateFirstDownFinger(indexDown: boolean, middleDown: boolean): void {
    if (!indexDown && !middleDown) {
      this.firstDownFinger = null;
      return;
    }
    
    if (this.firstDownFinger !== null) {
      return;
    }
    
    if (indexDown && !middleDown) {
      this.firstDownFinger = 'index';
    } else if (middleDown && !indexDown) {
      this.firstDownFinger = 'middle';
    } else if (indexDown && middleDown) {
      if (this.indexDownFrames > this.middleDownFrames) {
        this.firstDownFinger = 'index';
      } else if (this.middleDownFrames > this.indexDownFrames) {
        this.firstDownFinger = 'middle';
      } else {
        this.firstDownFinger = 'both';
      }
    }
  }
}

// ============================================================
// GLOBAL DETECTOR INSTANCES (one per hand)
// ============================================================

const leftHandDetector = new VictoryFingerDetector();
const rightHandDetector = new VictoryFingerDetector();

let lastLeftHandSeen = 0;
let lastRightHandSeen = 0;
const HAND_TIMEOUT_MS = 500;

/**
 * Detect finger-down gestures from both hands (V-sign style).
 *
 * Both hands show V-sign (index and middle extended).
 * Bringing a finger down triggers the corresponding column:
 * - Right hand middle down → Column 0
 * - Right hand index down → Column 1
 * - Left hand index down → Column 2
 * - Left hand middle down → Column 3
 */
export function detectPinches(hands: HandFrame[], _prevState?: PinchState): PinchState {
  const now = Date.now();
  const rawState: PinchState = {
    col0: false,
    col1: false,
    col2: false,
    col3: false,
  };

  let leftHandFound = false;
  let rightHandFound = false;

  for (const hand of hands) {
    const landmarks = hand.landmarks;
    if (!landmarks || landmarks.length < 21) continue;

    if (hand.handedness === 'Left') {
      leftHandFound = true;
      
      if (now - lastLeftHandSeen > HAND_TIMEOUT_MS) {
        leftHandDetector.reset();
      }
      lastLeftHandSeen = now;
      
      const result = leftHandDetector.detect(landmarks);
      rawState.col2 = result.indexDown;
      rawState.col3 = result.middleDown;
    } else {
      rightHandFound = true;
      
      if (now - lastRightHandSeen > HAND_TIMEOUT_MS) {
        rightHandDetector.reset();
      }
      lastRightHandSeen = now;
      
      const result = rightHandDetector.detect(landmarks);
      rawState.col1 = result.indexDown;
      rawState.col0 = result.middleDown;
    }
  }

  if (!leftHandFound && now - lastLeftHandSeen > HAND_TIMEOUT_MS) {
    leftHandDetector.reset();
  }
  if (!rightHandFound && now - lastRightHandSeen > HAND_TIMEOUT_MS) {
    rightHandDetector.reset();
  }

  return rawState;
}

/**
 * Create an empty pinch state.
 */
export function createEmptyPinchState(): PinchState {
  return { col0: false, col1: false, col2: false, col3: false };
}

/**
 * Get array of active column indices.
 */
export function getActiveColumns(state: PinchState): (0 | 1 | 2 | 3)[] {
  const columns: (0 | 1 | 2 | 3)[] = [];
  if (state.col0) columns.push(0);
  if (state.col1) columns.push(1);
  if (state.col2) columns.push(2);
  if (state.col3) columns.push(3);
  return columns;
}

/**
 * Reset both hand detectors (call when game restarts, etc.)
 */
export function resetDetectors(): void {
  leftHandDetector.reset();
  rightHandDetector.reset();
  lastLeftHandSeen = 0;
  lastRightHandSeen = 0;
}

/**
 * Get detailed debug info for finger-down detection.
 */
export function getPinchDebugInfo(hands: HandFrame[], _prevState?: PinchState): PinchDebugInfo {
  const handsDebug: HandDebugInfo[] = [];
  let activeColumn: number | null = null;

  for (const hand of hands) {
    const landmarks = hand.landmarks;
    if (!landmarks || landmarks.length < 21) continue;

    const wrist = landmarks[0];
    const middleMcp = landmarks[9];
    const palmSize = Math.sqrt(
      Math.pow(wrist.x - middleMcp.x, 2) +
      Math.pow(wrist.y - middleMcp.y, 2) +
      Math.pow((wrist.z || 0) - (middleMcp.z || 0), 2)
    );

    const indexTip = landmarks[8];
    const indexPip = landmarks[6];
    const indexMcp = landmarks[5];
    
    const middleTip = landmarks[12];
    const middlePip = landmarks[10];
    const middleMcp2 = landmarks[9];

    const fingers: FingerDebugInfo[] = [];

    const indexYDiff = indexTip.y - indexPip.y;
    const indexConf = indexYDiff > 0.04 ? Math.min(1, indexYDiff / 0.08) : 0;
    const indexIsDown = indexConf > 0.5;

    fingers.push({
      finger: 'index',
      tipY: indexTip.y,
      pipY: indexPip.y,
      mcpY: indexMcp.y,
      bendAmount: indexYDiff,
      baseConfidence: indexConf,
      totalConfidence: indexConf,
      requiredConfidence: 0.5,
      isDown: indexIsDown,
      wasDown: false,
    });

    const middleYDiff = middleTip.y - middlePip.y;
    const middleConf = middleYDiff > 0.04 ? Math.min(1, middleYDiff / 0.08) : 0;
    const middleIsDown = middleConf > 0.5;

    fingers.push({
      finger: 'middle',
      tipY: middleTip.y,
      pipY: middlePip.y,
      mcpY: middleMcp2.y,
      bendAmount: middleYDiff,
      baseConfidence: middleConf,
      totalConfidence: middleConf,
      requiredConfidence: 0.5,
      isDown: middleIsDown,
      wasDown: false,
    });

    handsDebug.push({
      handedness: hand.handedness,
      palmSize,
      wristY: wrist.y,
      fingers,
    });

    if (hand.handedness === 'Left') {
      if (indexIsDown) activeColumn = 2;
      if (middleIsDown) activeColumn = 3;
    } else {
      if (indexIsDown) activeColumn = 1;
      if (middleIsDown) activeColumn = 0;
    }
  }

  return {
    hands: handsDebug,
    activeColumn,
    thresholds: {
      bendThreshold: DEFAULT_CONFIG.fingerDownThreshold,
      releaseThreshold: DEFAULT_CONFIG.hysteresisMargin,
      confidenceThreshold: 0.5,
    },
  };
}
