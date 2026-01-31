import type { PadRegion } from '../types/instrument';
import type { Point3D } from '../types/hand';

export function mirrorX(x: number): number {
  return 1 - x;
}

export function distance2D(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function pointInRegion(px: number, py: number, region: PadRegion): boolean {
  const dx = px - region.cx;
  const dy = py - region.cy;
  return dx * dx + dy * dy <= region.radius * region.radius;
}

/**
 * Calculate how much of a point with given tip radius overlaps with a pad region.
 * Returns a value between 0 (no overlap) and 1 (full overlap).
 * 
 * @param px - Point x coordinate (normalized 0-1)
 * @param py - Point y coordinate (normalized 0-1)
 * @param region - The pad region to check against
 * @param tipRadius - The radius of the drumstick tip (normalized)
 * @returns Overlap ratio between 0 and 1
 */
export function getOverlapRatio(
  px: number,
  py: number,
  region: PadRegion,
  tipRadius: number = 0.02
): number {
  const dx = px - region.cx;
  const dy = py - region.cy;
  const centerDistance = Math.sqrt(dx * dx + dy * dy);
  
  // If tip center is inside pad, high overlap
  if (centerDistance <= region.radius) {
    // Full overlap when center is inside
    return 1;
  }
  
  // Calculate overlap when tip is partially inside pad
  const distanceFromEdge = centerDistance - region.radius;
  
  // If the tip is completely outside (distance > tip radius), no overlap
  if (distanceFromEdge >= tipRadius) {
    return 0;
  }
  
  // Partial overlap: tip touches the pad
  // The overlap decreases linearly as the tip moves away from the pad edge
  const overlapDepth = tipRadius - distanceFromEdge;
  const overlapRatio = overlapDepth / tipRadius;
  
  return Math.max(0, Math.min(1, overlapRatio));
}

/**
 * Check if a point with given tip radius overlaps with a pad region
 * by at least the specified threshold percentage.
 * 
 * @param px - Point x coordinate (normalized 0-1)
 * @param py - Point y coordinate (normalized 0-1)
 * @param region - The pad region to check against
 * @param threshold - Minimum overlap ratio required (0-1, e.g., 0.3 for 30%)
 * @param tipRadius - The radius of the drumstick tip (normalized)
 * @returns True if overlap meets threshold
 */
export function pointOverlapsRegion(
  px: number,
  py: number,
  region: PadRegion,
  threshold: number = 0.3,
  tipRadius: number = 0.02
): boolean {
  return getOverlapRatio(px, py, region, tipRadius) >= threshold;
}

export function landmarkDistance(a: Point3D, b: Point3D): number {
  return distance2D(a, b);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
