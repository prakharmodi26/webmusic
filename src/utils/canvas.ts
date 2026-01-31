import type { Point3D } from '../types/hand';
import type { PadConfig } from '../types/instrument';

/** Draw a drumstick from the hand to the stick tip. */
export function drawDrumstick(
  ctx: CanvasRenderingContext2D,
  landmarks: Point3D[],
  tipX: number,
  tipY: number,
  width: number,
  height: number,
): void {
  // Stick base: midpoint of wrist (0) and middle MCP (9)
  const wrist = landmarks[0];
  const mcp = landmarks[9];
  const baseX = ((wrist.x + mcp.x) / 2) * width;
  const baseY = ((wrist.y + mcp.y) / 2) * height;
  const endX = tipX * width;
  const endY = tipY * height;

  // Stick shaft
  const grad = ctx.createLinearGradient(baseX, baseY, endX, endY);
  grad.addColorStop(0, 'rgba(180, 130, 70, 0.95)');
  grad.addColorStop(0.7, 'rgba(210, 170, 100, 0.95)');
  grad.addColorStop(1, 'rgba(240, 200, 140, 0.95)');

  ctx.beginPath();
  ctx.moveTo(baseX, baseY);
  ctx.lineTo(endX, endY);
  ctx.strokeStyle = grad;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Stick tip (ball)
  ctx.beginPath();
  ctx.arc(endX, endY, 8, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 220, 160, 0.95)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Subtle glow at tip
  ctx.beginPath();
  ctx.arc(endX, endY, 14, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 200, 100, 0.15)';
  ctx.fill();
}

// ── Drum Kit Drawing ──

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function drawDrumPad(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  _ry: number,
  color: string,
  active: boolean,
) {
  const [r, g, b] = hexToRgb(color);
  const alpha = active ? 0.9 : 0.5;

  // Flat circular pad
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.closePath();

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  grad.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.5})`);
  grad.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${alpha * 0.6})`);
  grad.addColorStop(1, `rgba(${r * 0.5}, ${g * 0.5}, ${b * 0.5}, ${alpha})`);
  ctx.fillStyle = grad;
  ctx.fill();

  // Rim
  ctx.strokeStyle = active
    ? `rgba(255, 255, 255, 0.9)`
    : `rgba(${r}, ${g}, ${b}, 0.7)`;
  ctx.lineWidth = active ? 3 : 2;
  ctx.stroke();

  // Hit flash
  if (active) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.15, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 255, 255, 0.5)`;
    ctx.lineWidth = 4;
    ctx.stroke();
  }
}

function drawCymbalPad(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  _ry: number,
  color: string,
  active: boolean,
) {
  const [r, g, b] = hexToRgb(color);
  const alpha = active ? 0.9 : 0.5;

  // Flat circular cymbal
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.closePath();

  const grad = ctx.createRadialGradient(cx - radius * 0.15, cy - radius * 0.1, 0, cx, cy, radius);
  grad.addColorStop(0, `rgba(255, 255, 230, ${alpha})`);
  grad.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${alpha})`);
  grad.addColorStop(1, `rgba(${r * 0.6}, ${g * 0.6}, ${b * 0.6}, ${alpha})`);
  ctx.fillStyle = grad;
  ctx.fill();

  // Edge
  ctx.strokeStyle = active
    ? `rgba(255, 255, 255, 0.9)`
    : `rgba(${r}, ${g}, ${b}, 0.7)`;
  ctx.lineWidth = active ? 2.5 : 1.5;
  ctx.stroke();

  // Bell (center dot)
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.12, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(200, 200, 180, ${active ? 0.95 : 0.6})`;
  ctx.fill();

  // Hit flash
  if (active) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.15, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 255, 255, 0.4)`;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

function drawHiHatPad(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  _ry: number,
  color: string,
  active: boolean,
) {
  const [r, g, b] = hexToRgb(color);
  const alpha = active ? 0.9 : 0.5;

  // Flat circular hi-hat
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.closePath();

  const grad = ctx.createRadialGradient(cx - radius * 0.15, cy - radius * 0.1, 0, cx, cy, radius);
  grad.addColorStop(0, `rgba(255, 255, 220, ${alpha})`);
  grad.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${alpha})`);
  grad.addColorStop(1, `rgba(${r * 0.6}, ${g * 0.6}, ${b * 0.6}, ${alpha})`);
  ctx.fillStyle = grad;
  ctx.fill();

  // Edge
  ctx.strokeStyle = active
    ? `rgba(255, 255, 255, 0.9)`
    : `rgba(${r}, ${g}, ${b}, 0.7)`;
  ctx.lineWidth = active ? 2.5 : 1.5;
  ctx.stroke();

  // Bell (center dot)
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.1, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(200, 200, 180, ${active ? 0.95 : 0.6})`;
  ctx.fill();

  // Hit flash
  if (active) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.15, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 255, 255, 0.4)`;
    ctx.lineWidth = 3;
    ctx.stroke();
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
  const baseSize = pad.region.radius * Math.min(width, height) * scale;

  switch (pad.shape) {
    case 'drum':
      drawDrumPad(ctx, cx, cy, baseSize, baseSize, pad.color, active);
      break;
    case 'cymbal':
      drawCymbalPad(ctx, cx, cy, baseSize, baseSize, pad.color, active);
      break;
    case 'hihat':
      drawHiHatPad(ctx, cx, cy, baseSize, baseSize, pad.color, active);
      break;
  }

  // Label
  ctx.fillStyle = active ? '#ffffff' : 'rgba(255, 255, 255, 0.85)';
  ctx.font = `${active ? 'bold ' : ''}${Math.max(11, baseSize * 0.28)}px Nunito, sans-serif`;
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

  const [r, g, b] = hexToRgb(ripple.color);

  ctx.beginPath();
  ctx.arc(ripple.cx * width, ripple.cy * height, radius, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
  ctx.lineWidth = 3 * (1 - progress);
  ctx.stroke();

  return true;
}
