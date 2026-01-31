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
  // Draw connections
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 2;
  for (const [a, b] of HAND_CONNECTIONS) {
    const la = landmarks[a];
    const lb = landmarks[b];
    ctx.beginPath();
    ctx.moveTo(la.x * width, la.y * height);
    ctx.lineTo(lb.x * width, lb.y * height);
    ctx.stroke();
  }

  // Draw joints
  for (let i = 0; i < landmarks.length; i++) {
    const lm = landmarks[i];
    const px = lm.x * width;
    const py = lm.y * height;
    // Highlight index and middle fingertips (strike points)
    const isStrikeTip = i === 8 || i === 12;
    ctx.beginPath();
    ctx.arc(px, py, isStrikeTip ? 7 : 3, 0, Math.PI * 2);
    ctx.fillStyle = isStrikeTip
      ? 'rgba(255, 100, 100, 0.95)'
      : 'rgba(255, 255, 255, 0.8)';
    ctx.fill();
    if (isStrikeTip) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
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

function drawDrumShell(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: string,
  active: boolean,
) {
  const [r, g, b] = hexToRgb(color);
  const shellHeight = ry * 0.8;

  // Drum body (side)
  ctx.beginPath();
  ctx.moveTo(cx - rx, cy);
  ctx.lineTo(cx - rx, cy + shellHeight);
  ctx.ellipse(cx, cy + shellHeight, rx, ry * 0.35, 0, Math.PI, 0, true);
  ctx.lineTo(cx + rx, cy);
  ctx.closePath();

  const bodyGrad = ctx.createLinearGradient(cx - rx, cy, cx + rx, cy);
  bodyGrad.addColorStop(0, `rgba(${r * 0.4}, ${g * 0.4}, ${b * 0.4}, 0.85)`);
  bodyGrad.addColorStop(0.3, `rgba(${r * 0.7}, ${g * 0.7}, ${b * 0.7}, 0.85)`);
  bodyGrad.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.85)`);
  bodyGrad.addColorStop(0.7, `rgba(${r * 0.7}, ${g * 0.7}, ${b * 0.7}, 0.85)`);
  bodyGrad.addColorStop(1, `rgba(${r * 0.4}, ${g * 0.4}, ${b * 0.4}, 0.85)`);
  ctx.fillStyle = bodyGrad;
  ctx.fill();

  // Rim highlight
  ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.6)`;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Drum head (top ellipse)
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry * 0.45, 0, 0, Math.PI * 2);
  ctx.closePath();

  const headAlpha = active ? 0.95 : 0.55;
  const headGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
  headGrad.addColorStop(0, `rgba(255, 255, 255, ${headAlpha * 0.6})`);
  headGrad.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${headAlpha * 0.4})`);
  headGrad.addColorStop(1, `rgba(${r * 0.6}, ${g * 0.6}, ${b * 0.6}, ${headAlpha})`);
  ctx.fillStyle = headGrad;
  ctx.fill();

  // Rim
  ctx.strokeStyle = active
    ? `rgba(255, 255, 255, 0.9)`
    : `rgba(${r}, ${g}, ${b}, 0.8)`;
  ctx.lineWidth = active ? 3 : 2;
  ctx.stroke();

  // Hit flash
  if (active) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx * 1.15, ry * 0.52, 0, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 255, 255, 0.5)`;
    ctx.lineWidth = 4;
    ctx.stroke();
  }
}

function drawCymbal(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: string,
  active: boolean,
) {
  const [r, g, b] = hexToRgb(color);

  // Stand
  ctx.beginPath();
  ctx.moveTo(cx, cy + ry * 0.3);
  ctx.lineTo(cx, cy + ry * 2.5);
  ctx.strokeStyle = 'rgba(160, 160, 160, 0.6)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Cymbal body — thin ellipse
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry * 0.25, 0, 0, Math.PI * 2);
  ctx.closePath();

  const cymAlpha = active ? 0.9 : 0.5;
  const grad = ctx.createRadialGradient(cx - rx * 0.2, cy - ry * 0.1, 0, cx, cy, rx);
  grad.addColorStop(0, `rgba(255, 255, 230, ${cymAlpha})`);
  grad.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${cymAlpha})`);
  grad.addColorStop(1, `rgba(${r * 0.6}, ${g * 0.6}, ${b * 0.6}, ${cymAlpha})`);
  ctx.fillStyle = grad;
  ctx.fill();

  // Edge
  ctx.strokeStyle = active
    ? `rgba(255, 255, 255, 0.9)`
    : `rgba(${r}, ${g}, ${b}, 0.7)`;
  ctx.lineWidth = active ? 2.5 : 1.5;
  ctx.stroke();

  // Bell (center dome)
  ctx.beginPath();
  ctx.arc(cx, cy, rx * 0.12, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(200, 200, 180, ${active ? 0.95 : 0.6})`;
  ctx.fill();

  // Hit flash
  if (active) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx * 1.2, ry * 0.32, 0, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 255, 255, 0.4)`;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

function drawHiHat(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: string,
  active: boolean,
) {
  const [r, g, b] = hexToRgb(color);

  // Stand
  ctx.beginPath();
  ctx.moveTo(cx, cy + ry * 0.4);
  ctx.lineTo(cx, cy + ry * 2.5);
  ctx.strokeStyle = 'rgba(160, 160, 160, 0.6)';
  ctx.lineWidth = 3;
  ctx.stroke();

  const hhAlpha = active ? 0.9 : 0.5;

  // Bottom cymbal
  ctx.beginPath();
  ctx.ellipse(cx, cy + ry * 0.12, rx, ry * 0.22, 0, 0, Math.PI * 2);
  const botGrad = ctx.createRadialGradient(cx, cy + ry * 0.12, 0, cx, cy + ry * 0.12, rx);
  botGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${hhAlpha * 0.5})`);
  botGrad.addColorStop(1, `rgba(${r * 0.5}, ${g * 0.5}, ${b * 0.5}, ${hhAlpha})`);
  ctx.fillStyle = botGrad;
  ctx.fill();
  ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.5)`;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Top cymbal
  ctx.beginPath();
  ctx.ellipse(cx, cy - ry * 0.08, rx * 0.95, ry * 0.22, 0, 0, Math.PI * 2);
  const topGrad = ctx.createRadialGradient(cx - rx * 0.2, cy - ry * 0.1, 0, cx, cy, rx);
  topGrad.addColorStop(0, `rgba(255, 255, 220, ${hhAlpha})`);
  topGrad.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${hhAlpha})`);
  topGrad.addColorStop(1, `rgba(${r * 0.6}, ${g * 0.6}, ${b * 0.6}, ${hhAlpha})`);
  ctx.fillStyle = topGrad;
  ctx.fill();
  ctx.strokeStyle = active
    ? `rgba(255, 255, 255, 0.9)`
    : `rgba(${r}, ${g}, ${b}, 0.7)`;
  ctx.lineWidth = active ? 2.5 : 1.5;
  ctx.stroke();

  // Bell
  ctx.beginPath();
  ctx.arc(cx, cy - ry * 0.08, rx * 0.1, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(200, 200, 180, ${active ? 0.95 : 0.6})`;
  ctx.fill();

  if (active) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx * 1.15, ry * 0.3, 0, 0, Math.PI * 2);
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
      drawDrumShell(ctx, cx, cy, baseSize, baseSize * 0.9, pad.color, active);
      break;
    case 'cymbal':
      drawCymbal(ctx, cx, cy, baseSize * 1.1, baseSize * 0.9, pad.color, active);
      break;
    case 'hihat':
      drawHiHat(ctx, cx, cy, baseSize, baseSize * 0.85, pad.color, active);
      break;
  }

  // Label
  ctx.fillStyle = active ? '#ffffff' : 'rgba(255, 255, 255, 0.85)';
  ctx.font = `${active ? 'bold ' : ''}${Math.max(11, baseSize * 0.28)}px Nunito, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const labelY = pad.shape === 'drum' ? cy : cy + baseSize * 0.7;
  ctx.fillText(pad.label, cx, labelY);
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
