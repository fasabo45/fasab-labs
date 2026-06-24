//==================== SERIES FORGE - HUD OVERLAY ====================
// Fake nostalgic-shooter HUD drawn ON TOP of the finished collage.
// Uses its own seeded rng (seed + '|hud') so it never disturbs the
// main render stream -> old formula codes stay pixel-identical.
// Exposes window.applyHud(ctx, recipe).  Relies on global makeRng (engine.js).

const HUD_COLORS = {
  green: { main: '#8dff74', dim: '#4a7d3c', enemy: '#ff5a4d' },
  amber: { main: '#ffb83a', dim: '#9a6e1e', enemy: '#ff5a4d' },
  white: { main: '#f0f0e8', dim: '#8f9678', enemy: '#ff5a4d' },
};
const HUD_WEAPONS = ['M4A1', 'AK-47', 'MP5', 'INTERVENTION', 'UMP45', 'SCAR-H', 'ACR', 'FAMAS', 'M16A4', 'RPD'];
const HUD_NAMES = ['Ghost', 'Soap', 'Roach', 'Price', 'Gaz', 'Nikolai', 'Frost', 'Sandman',
  'Yuri', 'Makarov', 'xX_Sniper_Xx', 'NoScope360', 'Cpt_Price', 'RECRUIT', 'M0NSTER', 'Quickscoper'];

function hudFont(px){ return `bold ${px}px Consolas, "Courier New", monospace`; }

//---------- crosshair ----------
function drawCrosshair(ctx, W, H, col){
  const cx = W / 2, cy = H / 2;
  const gap = Math.round(W * 0.012), len = Math.round(W * 0.02);
  ctx.save();
  ctx.strokeStyle = col.main;
  ctx.lineWidth = Math.max(1.5, W * 0.0025);
  ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 3;
  ctx.beginPath();
  ctx.moveTo(cx, cy - gap - len); ctx.lineTo(cx, cy - gap);
  ctx.moveTo(cx, cy + gap);       ctx.lineTo(cx, cy + gap + len);
  ctx.moveTo(cx - gap - len, cy); ctx.lineTo(cx - gap, cy);
  ctx.moveTo(cx + gap, cy);       ctx.lineTo(cx + gap + len, cy);
  ctx.stroke();
  ctx.fillStyle = col.main;
  ctx.beginPath(); ctx.arc(cx, cy, ctx.lineWidth, 0, 7); ctx.fill();
  ctx.restore();
}

//---------- ammo counter (bottom-right) ----------
function drawAmmo(ctx, W, H, col, rng){
  const weapon = HUD_WEAPONS[Math.floor(rng() * HUD_WEAPONS.length)];
  const mag = Math.floor(rng() * 31);
  const reserve = Math.floor(rng() * 8) * 30;
  const pad = W * 0.045, s = Math.round(W * 0.05);
  ctx.save();
  ctx.textAlign = 'right';
  ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 4;
  ctx.fillStyle = col.main;
  ctx.font = hudFont(s);
  ctx.fillText(`${mag} / ${reserve}`, W - pad, H - pad);
  ctx.fillStyle = col.dim;
  ctx.font = hudFont(Math.round(s * 0.5));
  ctx.fillText(weapon, W - pad, H - pad - s * 1.05);
  ctx.restore();
}

//---------- minimap / radar (top-left) ----------
function drawMinimap(ctx, W, H, col, rng){
  const pad = W * 0.03, s = Math.round(W * 0.16), x = pad, y = pad;
  ctx.save();
  ctx.fillStyle = 'rgba(10,14,8,0.55)';
  ctx.fillRect(x, y, s, s);
  ctx.strokeStyle = col.dim; ctx.lineWidth = 2;
  ctx.strokeRect(x, y, s, s);
  ctx.strokeStyle = 'rgba(141,255,116,0.12)'; ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++){
    ctx.beginPath(); ctx.moveTo(x + s * i / 4, y); ctx.lineTo(x + s * i / 4, y + s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y + s * i / 4); ctx.lineTo(x + s, y + s * i / 4); ctx.stroke();
  }
  const blips = 2 + Math.floor(rng() * 5);
  for (let i = 0; i < blips; i++){
    ctx.fillStyle = rng() < 0.5 ? col.enemy : col.main;
    ctx.beginPath(); ctx.arc(x + rng() * s, y + rng() * s, s * 0.025, 0, 7); ctx.fill();
  }
  const px = x + s / 2, py = y + s / 2;
  ctx.fillStyle = col.main;
  ctx.beginPath();
  ctx.moveTo(px, py - s * 0.06);
  ctx.lineTo(px - s * 0.045, py + s * 0.05);
  ctx.lineTo(px + s * 0.045, py + s * 0.05);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

//---------- killfeed (top-right) ----------
function drawKillfeed(ctx, W, H, col, rng){
  const pad = W * 0.03, s = Math.round(W * 0.024);
  const lines = 1 + Math.floor(rng() * 3);
  ctx.save();
  ctx.textAlign = 'right';
  ctx.font = hudFont(s);
  for (let i = 0; i < lines; i++){
    const a = HUD_NAMES[Math.floor(rng() * HUD_NAMES.length)];
    const b = HUD_NAMES[Math.floor(rng() * HUD_NAMES.length)];
    const mid = ' [X] ';
    const y = pad + s * 1.5 * (i + 1);
    const full = a + mid + b;
    const fullW = ctx.measureText(full).width;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(W - pad - fullW - 6, y - s, fullW + 10, s * 1.35);
    const bW = ctx.measureText(b).width;
    ctx.fillStyle = col.enemy; ctx.fillText(b, W - pad, y);
    ctx.fillStyle = col.main;  ctx.fillText(a + mid, W - pad - bW, y);
  }
  ctx.restore();
}

//---------- compass strip (top-center) ----------
function drawCompass(ctx, W, H, col, rng){
  const cw = W * 0.34, x = (W - cw) / 2, y = H * 0.035, s = Math.round(W * 0.024);
  const dirs = ['N', '30', '60', 'E', '120', '150', 'S', '240', '270', 'W', '300', '330'];
  const off = Math.floor(rng() * dirs.length), ticks = 7;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = hudFont(s);
  ctx.fillStyle = 'rgba(10,14,8,0.4)';
  ctx.fillRect(x, y - s * 0.2, cw, s * 1.4);
  ctx.strokeStyle = col.dim; ctx.lineWidth = 1;
  ctx.strokeRect(x, y - s * 0.2, cw, s * 1.4);
  for (let i = 0; i < ticks; i++){
    const lx = x + 8 + (i / (ticks - 1)) * (cw - 16);
    const d = dirs[(off + i) % dirs.length];
    ctx.fillStyle = d.length === 1 ? col.main : col.dim;
    ctx.fillText(d, lx, y + s);
  }
  ctx.strokeStyle = col.main; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(W / 2, y + s * 1.0); ctx.lineTo(W / 2, y + s * 1.3); ctx.stroke();
  ctx.restore();
}

//---------- low-health red edge pulse ----------
function drawLowHealth(ctx, W, H){
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.62);
  g.addColorStop(0, 'rgba(120,0,0,0)');
  g.addColorStop(1, 'rgba(120,0,0,0.5)');
  ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}

//---------- orchestrator ----------
function applyHud(ctx, recipe){
  const h = recipe.hud;
  if (!h || !h.on) return;
  const W = recipe.w, H = recipe.h;
  const col = HUD_COLORS[h.color] || HUD_COLORS.green;
  const rng = makeRng(recipe.seed + '|hud');
  if (h.lowhealth) drawLowHealth(ctx, W, H);
  if (h.minimap)   drawMinimap(ctx, W, H, col, rng);
  if (h.compass)   drawCompass(ctx, W, H, col, rng);
  if (h.killfeed)  drawKillfeed(ctx, W, H, col, rng);
  if (h.ammo)      drawAmmo(ctx, W, H, col, rng);
  if (h.crosshair) drawCrosshair(ctx, W, H, col);
}
window.applyHud = applyHud;
