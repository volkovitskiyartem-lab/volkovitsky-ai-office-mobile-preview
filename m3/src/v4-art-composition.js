/* ART V4 HQ M3 — procedural scene dressing on top of authored PNG layers.
 * Decorative only: no task state, no LIVE signaling. Clipped to room bounds.
 */

const DEMO_TICKERS = Object.freeze([
  { label: 'DEMO · портфель', x: 228, y: 198, w: 72 },
  { label: 'DEMO · KPI', x: 14, y: 76, w: 58 },
]);

function clipRoom(ctx, room) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(room.x, room.y, room.w, room.h);
  ctx.clip();
}

export function drawHqV4BackgroundAccents(ctx, room, time = 0) {
  // Detailed glass, parquet and wall sconces are already authored into PNGs.
  // Only three lightweight dynamic reflections are rendered each frame.
  // Do not recreate gradient objects or high-DPI canvases on animation frames.
  const { x, y } = room;
  clipRoom(ctx, room);
  const shimmer = 0.10 + 0.03 * Math.sin(time * 1.1);
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = 'rgba(110,205,223,' + shimmer.toFixed(3) + ')';
  for (let i = 0; i < 3; i++) {
    const gx = x + 120 + i * 32 + Math.sin(time * 0.45 + i) * 2;
    ctx.fillRect(gx, y + 44, 4, 52);
  }
  ctx.fillStyle = 'rgba(78,195,222,0.035)';
  ctx.fillRect(x + 235, y + 50, 68, 74);
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
}

export function drawHqV4ForegroundLayer(ctx, room, time = 0, { reducedMotion = false, showDemoLabels = false } = {}) {
  const { x, y, w, h } = room;
  clipRoom(ctx, room);
  const motion = reducedMotion ? 0 : Math.sin(time * 1.1);

  // Command table front lip gloss (sits above actors at room front).
  ctx.globalCompositeOperation = 'screen';
  const lip = ctx.createLinearGradient(x + 88, y + 148, x + 224, y + 168);
  lip.addColorStop(0, 'rgba(240, 188, 120,0)');
  lip.addColorStop(0.45, `rgba(248, 196, 128,${(0.14 + motion * 0.04).toFixed(3)})`);
  lip.addColorStop(1, 'rgba(240, 188, 120,0)');
  ctx.fillStyle = lip;
  ctx.fillRect(x + 72, y + 138, 168, 28);

  // Fore-edge monstera highlights (depth queue plants stay authoritative; this is rim light).
  for (const [px, py] of [
    [18, 142],
    [268, 124],
  ]) {
    const leafGlow = ctx.createRadialGradient(x + px, y + py, 2, x + px, y + py, 22);
    leafGlow.addColorStop(0, `rgba(120, 210, 148,${(0.12 + motion * 0.03).toFixed(3)})`);
    leafGlow.addColorStop(1, 'rgba(120, 210, 148,0)');
    ctx.fillStyle = leafGlow;
    ctx.fillRect(x + px - 24, y + py - 24, 48, 48);
  }

  ctx.globalCompositeOperation = 'source-over';

  // Synthetic indicator labels must never appear in disconnected LIVE.
  // Normal visual mode relies on the existing DEMO HUD, avoiding duplicate
  // opaque overlays in the actual hero artwork.
  if (showDemoLabels) for (const tick of DEMO_TICKERS) {
    ctx.fillStyle = '#0b1826cc';
    ctx.fillRect(x + tick.x, y + tick.y, tick.w, 14);
    ctx.fillStyle = '#6ec9dc';
    ctx.fillRect(x + tick.x, y + tick.y, 2, 14);
    ctx.fillStyle = '#c8e8f0';
    ctx.font = '600 6px system-ui';
    ctx.fillText(tick.label, x + tick.x + 5, y + tick.y + 9, tick.w - 8);
    const bar = reducedMotion ? 0.42 : 0.35 + 0.25 * (0.5 + 0.5 * Math.sin(time * 0.9 + tick.x));
    ctx.fillStyle = '#3a7a8c';
    ctx.fillRect(x + tick.x + 4, y + tick.y + 11, tick.w - 8, 1);
    ctx.fillStyle = '#7ad8ec';
    ctx.fillRect(x + tick.x + 4, y + tick.y + 11, (tick.w - 8) * bar, 1);
  }

  // Soft floor vignette for isometric depth (does not hide labels).
  const vignette = ctx.createRadialGradient(x + w * 0.5, y + h * 0.72, 20, x + w * 0.5, y + h * 0.72, w * 0.62);
  vignette.addColorStop(0, 'rgba(8, 14, 22,0)');
  vignette.addColorStop(1, 'rgba(8, 14, 22,0.22)');
  ctx.fillStyle = vignette;
  ctx.fillRect(x, y + h * 0.45, w, h * 0.55);

  ctx.restore();
}