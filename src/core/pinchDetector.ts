import type { HandFrame, Point3D } from '../types/hand';

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
  bendAmount: number;        // How much finger is bent (normalized)
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

// Landmark indices for fingers
// Index finger: MCP=5, PIP=6, DIP=7, TIP=8
// Middle finger: MCP=9, PIP=10, DIP=11, TIP=12
const INDEX_MCP = 5;
const INDEX_PIP = 6;
const INDEX_TIP = 8;
const MIDDLE_MCP = 9;
const MIDDLE_PIP = 10;
const MIDDLE_TIP = 12;

// For palm size normalization
const WRIST = 0;

// Thresholds for finger-down detection - optimized for fast response
// bendAmount > BEND_THRESHOLD means finger is considered "down"
const BEND_THRESHOLD = 0.15;          // Lower = triggers faster on slight bend
const RELEASE_THRESHOLD = 0.08;       // Lower = releases faster when extended
const CONFIDENCE_THRESHOLD = 0.40;    // Lower = more responsive detection

function distance3D(a: Point3D, b: Point3D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = (a.z || 0) - (b.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function getPalmSize(landmarks: Point3D[]): number {
  const wrist = landmarks[WRIST];
  const middleMcp = landmarks[MIDDLE_MCP];
  return distance3D(wrist, middleMcp);
}

/**
 * Calculate how much a finger is bent/curled.
 * Returns a value where:
 * - 0 = finger fully extended (V-sign)
 * - 1 = finger fully curled down
 * 
 * We measure by comparing tip position to PIP (middle joint).
 * When tip Y > PIP Y (in screen coords where Y increases downward), finger is curled.
 */
function calculateFingerBend(
  tip: Point3D,
  pip: Point3D,
  _mcp: Point3D,  // Reserved for future use
  palmSize: number
): number {
  // Calculate the "down" amount: how much tip is below PIP
  // Positive = finger curled down, Negative = finger extended up
  const tipBelowPip = tip.y - pip.y;
  
  // Normalize by palm size for consistency across different hand sizes/distances
  const normalizedBend = tipBelowPip / palmSize;
  
  // Clamp to reasonable range
  return Math.max(0, Math.min(1, normalizedBend + 0.1)); // +0.1 offset so slight bend registers
}

/**
 * Calculate confidence score based on how definitively the finger is down.
 * Higher bend = higher confidence. Optimized for fast response.
 */
function calculateFingerDownConfidence(bendAmount: number): number {
  if (bendAmount < RELEASE_THRESHOLD) {
    return 0;
  }
  
  // Direct linear mapping for fastest response
  // bendAmount of 0.15 (BEND_THRESHOLD) gives confidence of 1.0
  const confidence = bendAmount / BEND_THRESHOLD;
  
  return Math.min(1, confidence);
}

/**
 * Check if a finger is "down" (curled/bent) with hysteresis.
 */
function checkFingerDown(
  tip: Point3D,
  pip: Point3D,
  mcp: Point3D,
  palmSize: number,
  _wasDown: boolean
): { isDown: boolean; bendAmount: number; confidence: number } {
  const bendAmount = calculateFingerBend(tip, pip, mcp, palmSize);
  const confidence = calculateFingerDownConfidence(bendAmount);
  
  // Direct threshold check - no hysteresis for instant response
  const isDown = confidence >= CONFIDENCE_THRESHOLD;
  
  return { isDown, bendAmount, confidence };
}

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
export function detectPinches(hands: HandFrame[], prevState?: PinchState): PinchState {
  const rawState: PinchState = {
    col0: false,
    col1: false,
    col2: false,
    col3: false,
  };

  for (const hand of hands) {
    const landmarks = hand.landmarks;
    const palmSize = getPalmSize(landmarks);

    // Prevent division by zero
    if (palmSize < 0.01) continue;

    // Get finger landmarks
    const indexTip = landmarks[INDEX_TIP];
    const indexPip = landmarks[INDEX_PIP];
    const indexMcp = landmarks[INDEX_MCP];
    
    const middleTip = landmarks[MIDDLE_TIP];
    const middlePip = landmarks[MIDDLE_PIP];
    const middleMcp = landmarks[MIDDLE_MCP];

    if (hand.handedness === 'Left') {
      // Left hand: index down = col2, middle down = col3
      const indexResult = checkFingerDown(
        indexTip, indexPip, indexMcp, palmSize,
        prevState?.col2 ?? false
      );
      const middleResult = checkFingerDown(
        middleTip, middlePip, middleMcp, palmSize,
        prevState?.col3 ?? false
      );
      
      rawState.col2 = indexResult.isDown;
      rawState.col3 = middleResult.isDown;
    } else {
      // Right hand: index down = col1, middle down = col0
      const indexResult = checkFingerDown(
        indexTip, indexPip, indexMcp, palmSize,
        prevState?.col1 ?? false
      );
      const middleResult = checkFingerDown(
        middleTip, middlePip, middleMcp, palmSize,
        prevState?.col0 ?? false
      );
      
      rawState.col1 = indexResult.isDown;
      rawState.col0 = middleResult.isDown;
    }
  }

  // For this V-sign mode, allow multiple columns active simultaneously
  // (user could have multiple fingers down at once)
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
 * Get detailed debug info for finger-down detection.
 * Use this to display a debug overlay showing confidence values.
 */
export function getPinchDebugInfo(hands: HandFrame[], prevState?: PinchState): PinchDebugInfo {
  const handsDebug: HandDebugInfo[] = [];
  let activeColumn: number | null = null;

  for (const hand of hands) {
    const landmarks = hand.landmarks;
    const palmSize = getPalmSize(landmarks);

    if (palmSize < 0.01) continue;

    const wrist = landmarks[WRIST];
    
    // Index finger
    const indexTip = landmarks[INDEX_TIP];
    const indexPip = landmarks[INDEX_PIP];
    const indexMcp = landmarks[INDEX_MCP];
    
    // Middle finger
    const middleTip = landmarks[MIDDLE_TIP];
    const middlePip = landmarks[MIDDLE_PIP];
    const middleMcp = landmarks[MIDDLE_MCP];

    const fingers: FingerDebugInfo[] = [];

    // Index finger debug
    const indexWasDown = hand.handedness === 'Left' 
      ? (prevState?.col2 ?? false)
      : (prevState?.col1 ?? false);
    const indexBend = calculateFingerBend(indexTip, indexPip, indexMcp, palmSize);
    const indexConf = calculateFingerDownConfidence(indexBend);
    const indexRequiredConf = indexWasDown 
      ? CONFIDENCE_THRESHOLD * 0.6 
      : CONFIDENCE_THRESHOLD;
    const indexIsDown = indexConf >= indexRequiredConf;

    fingers.push({
      finger: 'index',
      tipY: indexTip.y,
      pipY: indexPip.y,
      mcpY: indexMcp.y,
      bendAmount: indexBend,
      baseConfidence: indexConf,
      totalConfidence: indexConf,
      requiredConfidence: indexRequiredConf,
      isDown: indexIsDown,
      wasDown: indexWasDown,
    });

    // Middle finger debug
    const middleWasDown = hand.handedness === 'Left'
      ? (prevState?.col3 ?? false)
      : (prevState?.col0 ?? false);
    const middleBend = calculateFingerBend(middleTip, middlePip, middleMcp, palmSize);
    const middleConf = calculateFingerDownConfidence(middleBend);
    const middleRequiredConf = middleWasDown
      ? CONFIDENCE_THRESHOLD * 0.6
      : CONFIDENCE_THRESHOLD;
    const middleIsDown = middleConf >= middleRequiredConf;

    fingers.push({
      finger: 'middle',
      tipY: middleTip.y,
      pipY: middlePip.y,
      mcpY: middleMcp.y,
      bendAmount: middleBend,
      baseConfidence: middleConf,
      totalConfidence: middleConf,
      requiredConfidence: middleRequiredConf,
      isDown: middleIsDown,
      wasDown: middleWasDown,
    });

    handsDebug.push({
      handedness: hand.handedness as 'Left' | 'Right',
      palmSize,
      wristY: wrist.y,
      fingers,
    });

    // Track active columns
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
      bendThreshold: BEND_THRESHOLD,
      releaseThreshold: RELEASE_THRESHOLD,
      confidenceThreshold: CONFIDENCE_THRESHOLD,
    },
  };
}
