import type { Point3D } from '../types/hand';
import { VELOCITY_BUFFER_SIZE } from '../config/tracking';

interface TimestampedPoint {
  point: Point3D;
  timestamp: number;
}

export class MotionTracker {
  private buffers: Map<string, TimestampedPoint[]> = new Map();

  update(key: string, point: Point3D, timestamp: number): void {
    let buffer = this.buffers.get(key);
    if (!buffer) {
      buffer = [];
      this.buffers.set(key, buffer);
    }
    buffer.push({ point, timestamp });
    if (buffer.length > VELOCITY_BUFFER_SIZE) {
      buffer.shift();
    }
  }

  getVelocityY(key: string): number {
    const buffer = this.buffers.get(key);
    if (!buffer || buffer.length < 2) return 0;

    const oldest = buffer[0];
    const newest = buffer[buffer.length - 1];
    const dt = newest.timestamp - oldest.timestamp;
    if (dt === 0) return 0;

    return (newest.point.y - oldest.point.y) / dt;
  }

  isMovingDown(key: string): boolean {
    return this.getVelocityY(key) > 0;
  }

  clear(): void {
    this.buffers.clear();
  }
}
