/* ART V4 HQ — runtime layers: zone labels, command hub glow, floor readouts.
 * Decorative only; never indicates task state. Clipped to HQ room bounds.
 */

export const HQ_ZONE_LABELS = Object.freeze([
  { id: 'library', label: 'Библиотека', x: 18, y: 118 },
  { id: 'meeting', label: 'Переговорная', x: 118, y: 54 },
  { id: 'server', label: 'Серверная', x: 238, y: 72 },
  { id: 'command', label: 'Командный хаб', x: 108, y: 168 },
  { id: 'lounge', label: 'Lounge', x: 118, y: 210 },
  { id: 'creative', label: 'Creative', x: 232, y: 188 },
]);

function zoneLabel(ctx, text, x, y, { accent = '#e1c28c' } = {}) {
  const w = Math.min(148, 11 * text.length + 28);
  ctx.fillStyle = '#0b1826d8';
  ctx.fillRect(x, y, w, 20);
  ctx.fillStyle = accent;
  ctx.fillRect(x, y, 3, 20);
  ctx.fillStyle = '#f0ece4';
  ctx.font = '700 9px system-ui';
  ctx.fillText(text, x + 9, y + 13, w - 14);
}

export function drawHqV4MidLayer(ctx, room, time = 0) {
  const x = room.x;
  const y = room.y;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, room.w, room.h);
  ctx.clip();

  // Floor reflection under amber command ring
  ctx.globalCompositeOperation = 'screen';
  const pulse = 0.55 + 0.14 * Math.sin(time * 1.55);
  const gx = x + 156;
  const gy = y + 152;
  const floorGlow = ctx.createRadialGradient(gx, gy, 4, gx, gy, 102);
  floorGlow.addColorStop(0, `rgba(240, 176, 110,${(pulse * 0.26).toFixed(3)})`);
  floorGlow.addColorStop(0.38, `rgba(232, 148, 86,${(pulse * 0.11).toFixed(3)})`);
  floorGlow.addColorStop(0.72, `rgba(200, 120, 72,${(pulse * 0.04).toFixed(3)})`);
  floorGlow.addColorStop(1, 'rgba(232, 148, 86,0)');
  ctx.fillStyle = floorGlow;
  ctx.fillRect(x + 40, y + 84, 228, 138);

  const ringPulse = 0.5 + 0.16 * Math.sin(time * 1.85 + 0.4);
  for (const [rx, ry, rad] of [
    [156, 152, 78],
    [156, 152, 58],
    [156, 152, 38],
  ]) {
    ctx.strokeStyle = `rgba(235, 178, 108,${(ringPulse * 0.22).toFixed(3)})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(x + rx, y + ry, rad, rad * 0.44, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  const cool = ctx.createRadialGradient(x + 268, y + 82, 2, x + 268, y + 82, 58);
  cool.addColorStop(0, `rgba(72, 206, 232,${(0.16 + 0.04 * Math.sin(time)).toFixed(3)})`);
  cool.addColorStop(1, 'rgba(72, 206, 232,0)');
  ctx.fillStyle = cool;
  ctx.fillRect(x + 220, y + 44, 88, 88);

  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
}

export function drawHqV4ZoneLabels(ctx, room) {
  const x = room.x;
  const y = room.y;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, room.w, room.h);
  ctx.clip();
  for (const zone of HQ_ZONE_LABELS) {
    const accent =
      zone.id === 'server'
        ? '#7ad8ec'
        : zone.id === 'library'
          ? '#9cc8e0'
          : zone.id === 'creative'
            ? '#c4a8e8'
            : '#e1c28c';
    zoneLabel(ctx, zone.label, x + zone.x, y + zone.y, { accent });
  }
  ctx.restore();
}

export function drawHqV4CommandRing(ctx, x, y, w, h, time = 0) {
  ctx.save();
  const cx = x + w * 0.5;
  const cy = y + h * 0.42;
  const glow = 0.5 + 0.2 * Math.sin(time * 1.85);
  ctx.strokeStyle = `rgba(243, 188, 120,${glow.toFixed(3)})`;
  ctx.lineWidth = 2.2;
  ctx.shadowBlur = 14;
  ctx.shadowColor = '#efbc84';
  ctx.beginPath();
  ctx.ellipse(cx, cy, w * 0.41, h * 0.36, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = `rgba(210, 158, 96,${(glow * 0.65).toFixed(3)})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(cx, cy, w * 0.33, h * 0.28, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}