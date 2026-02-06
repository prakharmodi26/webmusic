import type { HandFrame, Point3D } from '../types/hand';

// ============================================================
// PUBLIC INTERFACES
// ============================================================

export interface PinchState {
  col0: boolean;  // 1 finger extended
  col1: boolean;  // 2 fingers extended
  col2: boolean;  // 3 fingers extended
  col3: boolean;  // 4 fingers extended
}

/** Debug info for a single finger */
export interface FingerDebugInfo {
  finger: 'index' | 'middle' | 'ring' | 'pinky';
  tipY: number;
  pipY: number;
  mcpY: number;
  bendAmount: number;
  baseConfidence: number;
  totalConfidence: number;
  requiredConfidence: number;
  isDown: boolean;
  wasDown: boolean;
  isExtended?: boolean;
}

/** Debug info for a single hand */
export interface HandDebugInfo {
  handedness: 'Left' | 'Right';
  palmSize: number;
  wristY: number;
  fingers: FingerDebugInfo[];
  fingerCount: number;
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
// CONFIGURATION
// ============================================================

export interface FingerCountConfig {
  // How far tip must be above MCP (relative to palm) to be considered extended
  extensionThreshold: number;

  // Angle threshold - finger extended if angle > this (degrees)
  angleThreshold: number;

  // Minimum frames count must be stable before registering
  debounceFrames: number;

  // Smoothing factor for landmark positions (0 = none, 1 = full previous)
  smoothingFactor: number;

  // Minimum palm size to consider valid hand detection
  minPalmSize: number;
}

const DEFAULT_CONFIG: FingerCountConfig = {
  extensionThreshold: 0.6,   // Tip must be 60% extended relative to MCP-to-wrist
  angleThreshold: 150,        // Finger extended if angle > 150 degrees
  debounceFrames: 2,          // 2 frames for stability
  smoothingFactor: 0.3,       // Light smoothing
  minPalmSize: 0.05,          // Minimum valid palm size
};

// ============================================================
// LANDMARK INDICES
// ============================================================

const LANDMARKS = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_DIP: 7,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_DIP: 11,
  MIDDLE_TIP: 12,
  RING_MCP: 13,
  RING_PIP: 14,
  RING_DIP: 15,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20,
} as const;

// ============================================================
// FINGER COUNT DETECTOR CLASS
// ============================================================

class FingerCountDetector {
  private config: FingerCountConfig;

  // Smoothed landmarks
  private smoothedLandmarks: Point3D[] | null = null;

  // Previous count for debouncing
  private prevCount = 0;
  private countStableFrames = 0;
  private confirmedCount = 0;

  constructor(config: Partial<FingerCountConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Reset all state
   */
  reset(): void {
    this.smoothedLandmarks = null;
    this.prevCount = 0;
    this.countStableFrames = 0;
    this.confirmedCount = 0;
  }

  /**
   * Main detection method - returns number of extended fingers (1-4)
   */
  detect(landmarks: Point3D[]): {
    fingerCount: number;
    confirmedCount: number;
    fingers: { index: boolean; middle: boolean; ring: boolean; pinky: boolean };
  } {
    // Apply smoothing
    const smoothed = this.smoothLandmarks(landmarks);

    // Calculate palm size for normalization
    const wrist = smoothed[LANDMARKS.WRIST];
    const middleMcp = smoothed[LANDMARKS.MIDDLE_MCP];
    const palmSize = this.distance(wrist, middleMcp);

    // Skip if palm too small
    if (palmSize < this.config.minPalmSize) {
      return {
        fingerCount: 0,
        confirmedCount: this.confirmedCount,
        fingers: { index: false, middle: false, ring: false, pinky: false },
      };
    }

    // Check each finger
    const indexExtended = this.isFingerExtended(smoothed, 'index', palmSize);
    const middleExtended = this.isFingerExtended(smoothed, 'middle', palmSize);
    const ringExtended = this.isFingerExtended(smoothed, 'ring', palmSize);
    const pinkyExtended = this.isFingerExtended(smoothed, 'pinky', palmSize);

    // Count extended fingers
    let count = 0;
    if (indexExtended) count++;
    if (middleExtended) count++;
    if (ringExtended) count++;
    if (pinkyExtended) count++;

    // Debounce: only update confirmed count if stable
    if (count === this.prevCount) {
      this.countStableFrames++;
    } else {
      this.countStableFrames = 1;
    }

    if (this.countStableFrames >= this.config.debounceFrames) {
      this.confirmedCount = count;
    }

    this.prevCount = count;

    return {
      fingerCount: count,
      confirmedCount: this.confirmedCount,
      fingers: {
        index: indexExtended,
        middle: middleExtended,
        ring: ringExtended,
        pinky: pinkyExtended,
      },
    };
  }

  /**
   * Check if a specific finger is extended using multiple methods
   */
  private isFingerExtended(
    landmarks: Point3D[],
    finger: 'index' | 'middle' | 'ring' | 'pinky',
    palmSize: number
  ): boolean {
    const indices = this.getFingerIndices(finger);

    const mcp = landmarks[indices.mcp];
    const pip = landmarks[indices.pip];
    const tip = landmarks[indices.tip];
    const wrist = landmarks[LANDMARKS.WRIST];

    // Method 1: Y-position based (tip above PIP means extended)
    // In normalized coords, lower Y = higher on screen
    const tipAbovePip = tip.y < pip.y;

    // Method 2: Distance ratio (extended finger = tip far from wrist)
    const tipToWrist = this.distance(tip, wrist);
    const mcpToWrist = this.distance(mcp, wrist);
    const extensionRatio = tipToWrist / (mcpToWrist + 0.0001);
    const distanceExtended = extensionRatio > 1.3; // Tip should be further than MCP

    // Method 3: Angle at PIP joint
    const angle = this.calculateAngle(mcp, pip, tip);
    const angleExtended = angle > this.config.angleThreshold;

    // Method 4: Tip Y relative to MCP (primary method)
    // If tip is above or near MCP level, finger is extended
    const tipAboveMcp = tip.y < mcp.y + (palmSize * 0.15);

    // Combine methods - require at least 2 to agree
    let votes = 0;
    if (tipAbovePip) votes++;
    if (distanceExtended) votes++;
    if (angleExtended) votes++;
    if (tipAboveMcp) votes++;

    return votes >= 2;
  }

  /**
   * Get landmark indices for a finger
   */
  private getFingerIndices(finger: 'index' | 'middle' | 'ring' | 'pinky'): {
    mcp: number;
    pip: number;
    dip: number;
    tip: number;
  } {
    switch (finger) {
      case 'index':
        return { mcp: LANDMARKS.INDEX_MCP, pip: LANDMARKS.INDEX_PIP, dip: LANDMARKS.INDEX_DIP, tip: LANDMARKS.INDEX_TIP };
      case 'middle':
        return { mcp: LANDMARKS.MIDDLE_MCP, pip: LANDMARKS.MIDDLE_PIP, dip: LANDMARKS.MIDDLE_DIP, tip: LANDMARKS.MIDDLE_TIP };
      case 'ring':
        return { mcp: LANDMARKS.RING_MCP, pip: LANDMARKS.RING_PIP, dip: LANDMARKS.RING_DIP, tip: LANDMARKS.RING_TIP };
      case 'pinky':
        return { mcp: LANDMARKS.PINKY_MCP, pip: LANDMARKS.PINKY_PIP, dip: LANDMARKS.PINKY_DIP, tip: LANDMARKS.PINKY_TIP };
    }
  }

  /**
   * Calculate angle at middle point (in degrees)
   */
  private calculateAngle(p1: Point3D, middle: Point3D, p2: Point3D): number {
    const v1 = { x: p1.x - middle.x, y: p1.y - middle.y };
    const v2 = { x: p2.x - middle.x, y: p2.y - middle.y };

    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

    if (mag1 === 0 || mag2 === 0) return 180;

    const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
    return Math.acos(cosAngle) * (180 / Math.PI);
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
   * Calculate 3D distance between two points
   */
  private distance(a: Point3D, b: Point3D): number {
    return Math.sqrt(
      Math.pow(a.x - b.x, 2) +
      Math.pow(a.y - b.y, 2) +
      Math.pow((a.z || 0) - (b.z || 0), 2)
    );
  }
}

// ============================================================
// GLOBAL DETECTOR INSTANCE
// ============================================================

const fingerCountDetector = new FingerCountDetector();
let lastHandSeen = 0;
const HAND_TIMEOUT_MS = 500;

/**
 * Detect finger count and map to columns.
 *
 * Finger count mapping:
 * - 1 finger (index) → Column 0
 * - 2 fingers (index + middle) → Column 1
 * - 3 fingers (index + middle + ring) → Column 2
 * - 4 fingers (all four) → Column 3
 */
export function detectPinches(hands: HandFrame[], _prevState?: PinchState): PinchState {
  const now = Date.now();
  const state: PinchState = {
    col0: false,
    col1: false,
    col2: false,
    col3: false,
  };

  // Use the first detected hand (prefer right hand if both visible)
  let handToUse: HandFrame | null = null;
  for (const hand of hands) {
    if (!hand.landmarks || hand.landmarks.length < 21) continue;

    // Prefer right hand, but use left if right not available
    if (hand.handedness === 'Right') {
      handToUse = hand;
      break;
    }
    if (!handToUse) {
      handToUse = hand;
    }
  }

  if (!handToUse) {
    // No hand detected
    if (now - lastHandSeen > HAND_TIMEOUT_MS) {
      fingerCountDetector.reset();
    }
    return state;
  }

  // Reset detector if hand was lost for a while
  if (now - lastHandSeen > HAND_TIMEOUT_MS) {
    fingerCountDetector.reset();
  }
  lastHandSeen = now;

  const result = fingerCountDetector.detect(handToUse.landmarks);
  const count = result.confirmedCount;

  // Map finger count to column
  // Only one column active at a time based on count
  if (count === 1) {
    state.col0 = true;
  } else if (count === 2) {
    state.col1 = true;
  } else if (count === 3) {
    state.col2 = true;
  } else if (count >= 4) {
    state.col3 = true;
  }

  return state;
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
 * Reset the finger count detector
 */
export function resetDetectors(): void {
  fingerCountDetector.reset();
  lastHandSeen = 0;
}

/**
 * Get detailed debug info for finger detection.
 */
export function getPinchDebugInfo(hands: HandFrame[], _prevState?: PinchState): PinchDebugInfo {
  const handsDebug: HandDebugInfo[] = [];
  let activeColumn: number | null = null;

  for (const hand of hands) {
    const landmarks = hand.landmarks;
    if (!landmarks || landmarks.length < 21) continue;

    const wrist = landmarks[LANDMARKS.WRIST];
    const middleMcp = landmarks[LANDMARKS.MIDDLE_MCP];
    const palmSize = Math.sqrt(
      Math.pow(wrist.x - middleMcp.x, 2) +
      Math.pow(wrist.y - middleMcp.y, 2) +
      Math.pow((wrist.z || 0) - (middleMcp.z || 0), 2)
    );

    // Simple extension check for debug
    const checkExtended = (tipIdx: number, pipIdx: number) => {
      return landmarks[tipIdx].y < landmarks[pipIdx].y;
    };

    const indexExtended = checkExtended(LANDMARKS.INDEX_TIP, LANDMARKS.INDEX_PIP);
    const middleExtended = checkExtended(LANDMARKS.MIDDLE_TIP, LANDMARKS.MIDDLE_PIP);
    const ringExtended = checkExtended(LANDMARKS.RING_TIP, LANDMARKS.RING_PIP);
    const pinkyExtended = checkExtended(LANDMARKS.PINKY_TIP, LANDMARKS.PINKY_PIP);

    let count = 0;
    if (indexExtended) count++;
    if (middleExtended) count++;
    if (ringExtended) count++;
    if (pinkyExtended) count++;

    const fingers: FingerDebugInfo[] = [
      {
        finger: 'index',
        tipY: landmarks[LANDMARKS.INDEX_TIP].y,
        pipY: landmarks[LANDMARKS.INDEX_PIP].y,
        mcpY: landmarks[LANDMARKS.INDEX_MCP].y,
        bendAmount: landmarks[LANDMARKS.INDEX_TIP].y - landmarks[LANDMARKS.INDEX_PIP].y,
        baseConfidence: indexExtended ? 1 : 0,
        totalConfidence: indexExtended ? 1 : 0,
        requiredConfidence: 0.5,
        isDown: !indexExtended,
        wasDown: false,
      },
      {
        finger: 'middle',
        tipY: landmarks[LANDMARKS.MIDDLE_TIP].y,
        pipY: landmarks[LANDMARKS.MIDDLE_PIP].y,
        mcpY: landmarks[LANDMARKS.MIDDLE_MCP].y,
        bendAmount: landmarks[LANDMARKS.MIDDLE_TIP].y - landmarks[LANDMARKS.MIDDLE_PIP].y,
        baseConfidence: middleExtended ? 1 : 0,
        totalConfidence: middleExtended ? 1 : 0,
        requiredConfidence: 0.5,
        isDown: !middleExtended,
        wasDown: false,
      },
      {
        finger: 'ring',
        tipY: landmarks[LANDMARKS.RING_TIP].y,
        pipY: landmarks[LANDMARKS.RING_PIP].y,
        mcpY: landmarks[LANDMARKS.RING_MCP].y,
        bendAmount: landmarks[LANDMARKS.RING_TIP].y - landmarks[LANDMARKS.RING_PIP].y,
        baseConfidence: ringExtended ? 1 : 0,
        totalConfidence: ringExtended ? 1 : 0,
        requiredConfidence: 0.5,
        isDown: !ringExtended,
        wasDown: false,
        isExtended: ringExtended,
      },
      {
        finger: 'pinky',
        tipY: landmarks[LANDMARKS.PINKY_TIP].y,
        pipY: landmarks[LANDMARKS.PINKY_PIP].y,
        mcpY: landmarks[LANDMARKS.PINKY_MCP].y,
        bendAmount: landmarks[LANDMARKS.PINKY_TIP].y - landmarks[LANDMARKS.PINKY_PIP].y,
        baseConfidence: pinkyExtended ? 1 : 0,
        totalConfidence: pinkyExtended ? 1 : 0,
        requiredConfidence: 0.5,
        isDown: !pinkyExtended,
        wasDown: false,
        isExtended: pinkyExtended,
      },
    ];

    handsDebug.push({
      handedness: hand.handedness,
      palmSize,
      wristY: wrist.y,
      fingers,
      fingerCount: count,
    });

    // Determine active column
    if (count === 1) activeColumn = 0;
    else if (count === 2) activeColumn = 1;
    else if (count === 3) activeColumn = 2;
    else if (count >= 4) activeColumn = 3;
  }

  return {
    hands: handsDebug,
    activeColumn,
    thresholds: {
      bendThreshold: DEFAULT_CONFIG.extensionThreshold,
      releaseThreshold: DEFAULT_CONFIG.angleThreshold,
      confidenceThreshold: 0.5,
    },
  };
}

/**
 * Update configuration
 */
export function updateConfig(config: Partial<FingerCountConfig>): void {
  Object.assign(DEFAULT_CONFIG, config);
}

/**
 * Get current configuration
 */
export function getConfig(): FingerCountConfig {
  return { ...DEFAULT_CONFIG };
}
