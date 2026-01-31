import type { Point3D } from '../types/hand';
import type { PadConfig } from '../types/instrument';

const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

export function drawLandmarks(
  ctx: CanvasRenderingContext2D,
  landmarks: Point3D[],
  width: number,
  height: number,
): void {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth = 2;

  for (const [a, b] of HAND_CONNECTIONS) {
    const la = landmarks[a];
    const lb = landmarks[b];
    ctx.beginPath();
    ctx.moveTo(la.x * width, la.y * height);
    ctx.lineTo(lb.x * width, lb.y * height);
    ctx.stroke();
  }

  for (const lm of landmarks) {
    ctx.beginPath();
    ctx.arc(lm.x * width, lm.y * height, 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fill();
  }
}

export function drawPad(
  ctx: CanvasRenderingContext2D,
  pad: PadConfig,
  width: number,
  height: number,
  active: boolean,
  scale: number = 1,
): void {
  const cx = pad.region.cx * width;
  const cy = pad.region.cy * height;
  const r = pad.region.radius * Math.min(width, height) * scale;

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = active
    ? pad.color + 'cc'
    : pad.color + '44';
  ctx.fill();

  ctx.strokeStyle = pad.color + '88';
  ctx.lineWidth = 2;
  ctx.stroke();

  if (active) {
    ctx.beginPath();
    ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
    ctx.strokeStyle = pad.color + 'aa';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  ctx.fillStyle = '#ffffff';
  ctx.font = `${Math.max(12, r * 0.35)}px Nunito, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(pad.label, cx, cy);
}

export interface RippleState {
  cx: number;
  cy: number;
  color: string;
  startTime: number;
  duration: number;
}

export function drawRipple(
  ctx: CanvasRenderingContext2D,
  ripple: RippleState,
  width: number,
  height: number,
  now: number,
): boolean {
  const elapsed = now - ripple.startTime;
  if (elapsed > ripple.duration) return false;

  const progress = elapsed / ripple.duration;
  const maxRadius = Math.min(width, height) * 0.12;
  const radius = maxRadius * progress;
  const alpha = 1 - progress;

  ctx.beginPath();
  ctx.arc(ripple.cx * width, ripple.cy * height, radius, 0, Math.PI * 2);
  ctx.strokeStyle = ripple.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
  ctx.lineWidth = 3 * (1 - progress);
  ctx.stroke();

  return true;
}
