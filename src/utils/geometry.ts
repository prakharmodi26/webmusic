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

export function landmarkDistance(a: Point3D, b: Point3D): number {
  return distance2D(a, b);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
