import type { PadConfig } from '../types/instrument';

/** Draw a fist circle indicator on the canvas. */
export function drawFistIndicator(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  width: number,
  height: number,
): void {
  const px = cx * width;
  const py = cy * height;
  const r = radius * Math.min(width, height);

  // Outer glow
  ctx.beginPath();
  ctx.arc(px, py, r + 4, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 6;
  ctx.stroke();

  // Main circle
  ctx.beginPath();
  ctx.arc(px, py, r, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 100, 150, 0.7)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Inner fill
  ctx.beginPath();
  ctx.arc(px, py, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 100, 150, 0.12)';
  ctx.fill();

  // Center dot
  ctx.beginPath();
  ctx.arc(px, py, 3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 100, 150, 0.9)';
  ctx.fill();
}

/** Draw a resize handle at the bottom-right of a pad. */
export function drawResizeHandle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  padRadius: number,
  width: number,
  height: number,
): void {
  const r = padRadius * Math.min(width, height);
  const px = cx * width + r * 0.85;
  const py = cy * height + r * 0.85;
  const size = 14;

  // Outer glow
  ctx.beginPath();
  ctx.arc(px, py, size + 3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fill();

  // Button background
  ctx.beginPath();
  ctx.arc(px, py, size, 0, Math.PI * 2);
  const grad = ctx.createRadialGradient(px - 3, py - 3, 0, px, py, size);
  grad.addColorStop(0, 'rgba(100, 100, 255, 1)');
  grad.addColorStop(0.7, 'rgba(70, 70, 200, 1)');
  grad.addColorStop(1, 'rgba(50, 50, 150, 1)');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Resize icon (diagonal arrows)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';

  // Arrow from center to bottom-right
  ctx.beginPath();
  ctx.moveTo(px - 1, py - 1);
  ctx.lineTo(px + 5, py + 5);
  ctx.stroke();
  // Arrowhead
  ctx.beginPath();
  ctx.moveTo(px + 5, py + 1);
  ctx.lineTo(px + 5, py + 5);
  ctx.lineTo(px + 1, py + 5);
  ctx.stroke();

  // Arrow from center to top-left
  ctx.beginPath();
  ctx.moveTo(px + 1, py + 1);
  ctx.lineTo(px - 5, py - 5);
  ctx.stroke();
  // Arrowhead
  ctx.beginPath();
  ctx.moveTo(px - 5, py - 1);
  ctx.lineTo(px - 5, py - 5);
  ctx.lineTo(px - 1, py - 5);
  ctx.stroke();

  ctx.lineCap = 'butt';
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

/** Draw realistic drum lugs around the rim */
function drawDrumLugs(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  lugCount: number = 8,
) {
  const lugSize = radius * 0.08;
  
  for (let i = 0; i < lugCount; i++) {
    const angle = (i / lugCount) * Math.PI * 2 - Math.PI / 2;
    const lugX = cx + Math.cos(angle) * (radius * 0.92);
    const lugY = cy + Math.sin(angle) * (radius * 0.92);
    
    // Lug body
    ctx.beginPath();
    ctx.rect(lugX - lugSize, lugY - lugSize * 0.6, lugSize * 2, lugSize * 1.2);
    ctx.fillStyle = '#888888';
    ctx.fill();
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Lug highlight
    ctx.beginPath();
    ctx.rect(lugX - lugSize + 1, lugY - lugSize * 0.6 + 1, lugSize * 2 - 2, lugSize * 0.4);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fill();
  }
}

function drawDrumPad(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  _ry: number,
  _color: string,
  active: boolean,
) {
  const alpha = active ? 1 : 0.85;

  // Outer metal rim (chrome hoop)
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.closePath();
  
  const rimGrad = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
  rimGrad.addColorStop(0, `rgba(180, 180, 180, ${alpha})`);
  rimGrad.addColorStop(0.3, `rgba(220, 220, 220, ${alpha})`);
  rimGrad.addColorStop(0.5, `rgba(255, 255, 255, ${alpha})`);
  rimGrad.addColorStop(0.7, `rgba(200, 200, 200, ${alpha})`);
  rimGrad.addColorStop(1, `rgba(150, 150, 150, ${alpha})`);
  
  ctx.strokeStyle = rimGrad;
  ctx.lineWidth = radius * 0.08;
  ctx.stroke();

  // Draw lugs
  drawDrumLugs(ctx, cx, cy, radius, 8);

  // Inner rim shadow
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.88, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Drum head (white/off-white membrane)
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.85, 0, Math.PI * 2);
  ctx.closePath();

  const headGrad = ctx.createRadialGradient(cx - radius * 0.2, cy - radius * 0.2, 0, cx, cy, radius * 0.85);
  headGrad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
  headGrad.addColorStop(0.5, `rgba(245, 245, 240, ${alpha})`);
  headGrad.addColorStop(0.8, `rgba(230, 230, 225, ${alpha})`);
  headGrad.addColorStop(1, `rgba(200, 200, 195, ${alpha})`);
  
  ctx.fillStyle = headGrad;
  ctx.fill();

  // Subtle texture lines on drum head
  ctx.strokeStyle = 'rgba(200, 200, 195, 0.3)';
  ctx.lineWidth = 0.5;
  for (let i = 1; i <= 3; i++) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.85 * (i / 4), 0, Math.PI * 2);
    ctx.stroke();
  }

  // Hit flash effect
  if (active) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.85, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.1, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
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
  const alpha = active ? 1 : 0.9;

  // Main cymbal body - golden brass color
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.closePath();

  // Create brushed metal effect
  const grad = ctx.createRadialGradient(cx - radius * 0.3, cy - radius * 0.3, 0, cx, cy, radius);
  grad.addColorStop(0, `rgba(255, 235, 180, ${alpha})`); // Bright highlight
  grad.addColorStop(0.2, `rgba(${r + 30}, ${g + 20}, ${b + 20}, ${alpha})`);
  grad.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${alpha})`);
  grad.addColorStop(0.8, `rgba(${r - 30}, ${g - 30}, ${b - 10}, ${alpha})`);
  grad.addColorStop(1, `rgba(${r - 50}, ${g - 50}, ${b - 20}, ${alpha})`);
  
  ctx.fillStyle = grad;
  ctx.fill();

  // Concentric grooves (lathing lines)
  ctx.strokeStyle = `rgba(${r - 40}, ${g - 40}, ${b}, 0.3)`;
  ctx.lineWidth = 0.5;
  for (let i = 3; i <= 8; i++) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius * (i / 10), 0, Math.PI * 2);
    ctx.stroke();
  }

  // Edge highlight
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = active
    ? 'rgba(255, 255, 255, 0.8)'
    : `rgba(${r + 50}, ${g + 40}, ${b + 30}, 0.6)`;
  ctx.lineWidth = active ? 3 : 2;
  ctx.stroke();

  // Bell (center dome)
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.15, 0, Math.PI * 2);
  
  const bellGrad = ctx.createRadialGradient(cx - radius * 0.05, cy - radius * 0.05, 0, cx, cy, radius * 0.15);
  bellGrad.addColorStop(0, `rgba(255, 245, 200, ${active ? 1 : 0.95})`);
  bellGrad.addColorStop(0.5, `rgba(${r + 20}, ${g + 10}, ${b}, ${active ? 1 : 0.9})`);
  bellGrad.addColorStop(1, `rgba(${r - 20}, ${g - 20}, ${b - 10}, ${active ? 0.95 : 0.85})`);
  
  ctx.fillStyle = bellGrad;
  ctx.fill();
  ctx.strokeStyle = `rgba(${r - 30}, ${g - 30}, ${b}, 0.5)`;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Center hole
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.02, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(50, 50, 50, 0.9)';
  ctx.fill();

  // Hit flash
  if (active) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.08, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 230, 150, 0.5)';
    ctx.lineWidth = 4;
    ctx.stroke();
  }
}

function drawTablaPad(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  _ry: number,
  color: string,
  active: boolean,
) {
  const [r, g, b] = hexToRgb(color);
  const alpha = active ? 1 : 0.9;

  // Outer decorative border (braided leather/rope edge)
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.closePath();

  const borderGrad = ctx.createRadialGradient(cx, cy, radius * 0.85, cx, cy, radius);
  borderGrad.addColorStop(0, `rgba(${r + 30}, ${g + 20}, ${b + 10}, ${alpha})`);
  borderGrad.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, ${alpha})`);
  borderGrad.addColorStop(0.7, `rgba(${r - 20}, ${g - 15}, ${b - 10}, ${alpha})`);
  borderGrad.addColorStop(1, `rgba(${r - 40}, ${g - 30}, ${b - 20}, ${alpha})`);

  ctx.fillStyle = borderGrad;
  ctx.fill();

  // Braided pattern on border
  ctx.strokeStyle = `rgba(${r - 60}, ${g - 50}, ${b - 30}, 0.4)`;
  ctx.lineWidth = 1;
  const segments = 24;
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const innerR = radius * 0.88;
    const outerR = radius * 0.98;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
    ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
    ctx.stroke();
  }

  // Main drum head (pudi) - off-white/cream color like goat skin
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.85, 0, Math.PI * 2);
  ctx.closePath();

  const headGrad = ctx.createRadialGradient(cx - radius * 0.15, cy - radius * 0.15, 0, cx, cy, radius * 0.85);
  headGrad.addColorStop(0, `rgba(255, 252, 245, ${alpha})`);
  headGrad.addColorStop(0.3, `rgba(250, 245, 235, ${alpha})`);
  headGrad.addColorStop(0.6, `rgba(240, 235, 220, ${alpha})`);
  headGrad.addColorStop(1, `rgba(225, 218, 200, ${alpha})`);

  ctx.fillStyle = headGrad;
  ctx.fill();

  // Subtle texture on the skin
  ctx.strokeStyle = 'rgba(200, 190, 170, 0.2)';
  ctx.lineWidth = 0.5;
  for (let i = 1; i <= 4; i++) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.85 * (i / 5), 0, Math.PI * 2);
    ctx.stroke();
  }

  // Syahi (black center circle) - the tuning paste
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.35, 0, Math.PI * 2);
  ctx.closePath();

  const syahiGrad = ctx.createRadialGradient(cx - radius * 0.08, cy - radius * 0.08, 0, cx, cy, radius * 0.35);
  syahiGrad.addColorStop(0, `rgba(60, 55, 50, ${alpha})`);
  syahiGrad.addColorStop(0.4, `rgba(35, 32, 28, ${alpha})`);
  syahiGrad.addColorStop(0.8, `rgba(20, 18, 15, ${alpha})`);
  syahiGrad.addColorStop(1, `rgba(10, 8, 5, ${alpha})`);

  ctx.fillStyle = syahiGrad;
  ctx.fill();

  // Syahi highlight (subtle shine)
  ctx.beginPath();
  ctx.arc(cx - radius * 0.1, cy - radius * 0.1, radius * 0.12, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(80, 75, 70, 0.3)';
  ctx.fill();

  // Syahi edge definition
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.35, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Outer edge of head
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.85, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(180, 170, 150, 0.6)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Hit flash effect
  if (active) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.85, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.08, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 220, 180, 0.6)';
    ctx.lineWidth = 4;
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
  const alpha = active ? 1 : 0.9;

  // Hi-hat is similar to cymbal but with a distinct look (stacked cymbals)
  // Bottom cymbal (slightly larger, darker)
  ctx.beginPath();
  ctx.arc(cx + 2, cy + 2, radius * 1.02, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${r - 60}, ${g - 60}, ${b - 30}, ${alpha * 0.6})`;
  ctx.fill();

  // Top cymbal
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.closePath();

  const grad = ctx.createRadialGradient(cx - radius * 0.25, cy - radius * 0.2, 0, cx, cy, radius);
  grad.addColorStop(0, `rgba(255, 245, 200, ${alpha})`);
  grad.addColorStop(0.3, `rgba(${r + 40}, ${g + 30}, ${b + 20}, ${alpha})`);
  grad.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, ${alpha})`);
  grad.addColorStop(1, `rgba(${r - 40}, ${g - 40}, ${b - 20}, ${alpha})`);
  
  ctx.fillStyle = grad;
  ctx.fill();

  // Concentric grooves
  ctx.strokeStyle = `rgba(${r - 50}, ${g - 50}, ${b - 20}, 0.25)`;
  ctx.lineWidth = 0.5;
  for (let i = 2; i <= 7; i++) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius * (i / 9), 0, Math.PI * 2);
    ctx.stroke();
  }

  // Edge
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = active
    ? 'rgba(255, 255, 255, 0.8)'
    : `rgba(${r + 30}, ${g + 20}, ${b + 10}, 0.5)`;
  ctx.lineWidth = active ? 2.5 : 1.5;
  ctx.stroke();

  // Bell (center)
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.12, 0, Math.PI * 2);
  
  const bellGrad = ctx.createRadialGradient(cx - radius * 0.03, cy - radius * 0.03, 0, cx, cy, radius * 0.12);
  bellGrad.addColorStop(0, `rgba(255, 250, 220, ${active ? 1 : 0.95})`);
  bellGrad.addColorStop(0.6, `rgba(${r + 10}, ${g}, ${b}, ${active ? 1 : 0.9})`);
  bellGrad.addColorStop(1, `rgba(${r - 30}, ${g - 30}, ${b - 15}, ${active ? 0.95 : 0.85})`);
  
  ctx.fillStyle = bellGrad;
  ctx.fill();
  
  // Center rod hole
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.025, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(40, 40, 40, 0.9)';
  ctx.fill();

  // Hit flash
  if (active) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.08, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 240, 180, 0.5)';
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
    case 'tabla':
      drawTablaPad(ctx, cx, cy, baseSize, baseSize, pad.color, active);
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
