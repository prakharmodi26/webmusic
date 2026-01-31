import type { Point3D } from '../types/hand';
import type { PadConfig } from '../types/instrument';

/** How far the stick extends past the fist (as a fraction of palm length). */
const STICK_LENGTH_MULTIPLIER = 2.5;

/** Draw a drumstick that appears to come out of the hand naturally. */
export function drawDrumstick(
  ctx: CanvasRenderingContext2D,
  landmarks: Point3D[],
  _tipX: number,
  _tipY: number,
  width: number,
  height: number,
): void {
  const wrist = landmarks[0];
  const indexMcp = landmarks[5];
  const middleMcp = landmarks[9];
  const pinkyMcp = landmarks[17];
  
  // Calculate the center of the palm (between index and pinky MCP)
  const palmCenterX = ((indexMcp.x + pinkyMcp.x) / 2) * width;
  const palmCenterY = ((indexMcp.y + pinkyMcp.y) / 2) * height;
  
  // Stick starts from the pinky side of the fist (where you'd grip a drumstick)
  const gripX = ((pinkyMcp.x * 0.7 + wrist.x * 0.3)) * width;
  const gripY = ((pinkyMcp.y * 0.7 + wrist.y * 0.3)) * height;
  
  // Calculate direction from wrist through middle MCP
  const dirX = middleMcp.x - wrist.x;
  const dirY = middleMcp.y - wrist.y;
  const dirLen = Math.sqrt(dirX * dirX + dirY * dirY);
  
  // Normalize and extend for the stick tip
  const stickLength = dirLen * width * STICK_LENGTH_MULTIPLIER;
  const normalizedDirX = dirX / dirLen;
  const normalizedDirY = dirY / dirLen;
  
  // Tip position
  const endX = palmCenterX + normalizedDirX * stickLength;
  const endY = palmCenterY + normalizedDirY * stickLength;
  
  // Draw stick shadow for depth
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(gripX + 3, gripY + 3);
  ctx.lineTo(endX + 3, endY + 3);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();

  // Stick shaft - tapered wooden look
  const grad = ctx.createLinearGradient(gripX, gripY, endX, endY);
  grad.addColorStop(0, '#5D4037'); // Dark brown at grip
  grad.addColorStop(0.2, '#8D6E63'); // Medium brown
  grad.addColorStop(0.6, '#A1887F'); // Lighter brown
  grad.addColorStop(0.85, '#BCAAA4'); // Light at tip area
  grad.addColorStop(1, '#D7CCC8'); // Lightest at tip

  // Draw the main stick body with slight taper
  ctx.beginPath();
  ctx.moveTo(gripX, gripY);
  ctx.lineTo(endX, endY);
  ctx.strokeStyle = grad;
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Inner highlight for 3D effect
  ctx.beginPath();
  ctx.moveTo(gripX, gripY);
  ctx.lineTo(endX, endY);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Stick tip (oval bead)
  const tipRadius = 10;
  ctx.beginPath();
  ctx.ellipse(endX, endY, tipRadius, tipRadius * 0.8, Math.atan2(normalizedDirY, normalizedDirX), 0, Math.PI * 2);
  
  const tipGrad = ctx.createRadialGradient(endX - 2, endY - 2, 0, endX, endY, tipRadius);
  tipGrad.addColorStop(0, '#FFFFFF');
  tipGrad.addColorStop(0.3, '#F5F5F5');
  tipGrad.addColorStop(0.7, '#D7CCC8');
  tipGrad.addColorStop(1, '#BCAAA4');
  
  ctx.fillStyle = tipGrad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(139, 90, 43, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Subtle glow around tip for visibility
  ctx.beginPath();
  ctx.arc(endX, endY, tipRadius + 6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
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
