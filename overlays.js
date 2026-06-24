//==================== SERIES FORGE - TRANSMISSION OVERLAYS ====================
// The vibe pack: redacted/classified stamps, surveillance timecode, UFO +
// tractor beam, holographic sheen, conspiracy coordinate tracker, NFT stamp.
// Drawn at the very top (after HUD). Own rng (seed + '|ov') -> reproducible,
// no drift, off by default => old formula codes stay identical.
// Exposes window.applyOverlays(ctx, recipe). Relies on global makeRng.

const STAMPS = ['CLASSIFIED', 'TOP SECRET', 'EYES ONLY', 'REDACTED', 'DECLASSIFIED', 'EVIDENCE', 'UAP REPORT'];

function ovFont(px, heavy){
  return heavy ? `900 ${px}px "Arial Black", Impact, sans-serif`
               : `bold ${px}px Consolas, "Courier New", monospace`;
}
function pad2(n){ return String(n).padStart(2, '0'); }

//---------- holographic iridescent sheen (gay avant NFT energy) ----------
function drawHolo(ctx, W, H, rng){
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.4;
  const ang = rng() * Math.PI;
  const g = ctx.createLinearGradient(0, 0, Math.cos(ang) * W || W, Math.sin(ang) * H || H);
  const stops = ['#ff3cac', '#ff8a3c', '#ffe93c', '#3cff8a', '#3cd0ff', '#8a3cff', '#ff3cac'];
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

//---------- UFO + tractor beam + targeting box ----------
function drawUFO(ctx, W, H, rng){
  const ux = W * (0.2 + rng() * 0.6), uy = H * (0.12 + rng() * 0.26);
  const rw = W * (0.06 + rng() * 0.06), rh = rw * 0.32;
  ctx.save();
  const beamH = H * 0.5;
  ctx.globalCompositeOperation = 'screen';
  const g = ctx.createLinearGradient(ux, uy, ux, uy + beamH);
  g.addColorStop(0, 'rgba(120,255,180,0.35)');
  g.addColorStop(1, 'rgba(120,255,180,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(ux - rw * 0.4, uy); ctx.lineTo(ux + rw * 0.4, uy);
  ctx.lineTo(ux + rw * 1.4, uy + beamH); ctx.lineTo(ux - rw * 1.4, uy + beamH);
  ctx.closePath(); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#1a1f14'; ctx.strokeStyle = '#3a4a2a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(ux, uy, rw, rh, 0, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(150,220,160,0.5)';
  ctx.beginPath(); ctx.ellipse(ux, uy - rh * 0.5, rw * 0.45, rh * 1.1, 0, Math.PI, 0); ctx.fill();
  for (let i = -2; i <= 2; i++){
    ctx.fillStyle = rng() < 0.5 ? '#8dff74' : '#ffb83a';
    ctx.beginPath(); ctx.arc(ux + i * rw * 0.35, uy + rh * 0.3, rw * 0.06, 0, 7); ctx.fill();
  }
  const bs = rw * 1.7;
  ctx.strokeStyle = 'rgba(141,255,116,0.8)'; ctx.lineWidth = 1.5;
  ctx.strokeRect(ux - bs, uy - bs * 0.7, bs * 2, bs * 1.4);
  const s = Math.round(W * 0.016);
  ctx.font = ovFont(s); ctx.fillStyle = 'rgba(141,255,116,0.9)'; ctx.textAlign = 'left';
  ctx.fillText('U.A.P. // UNIDENTIFIED', ux + bs + 6, uy - bs * 0.5);
  ctx.fillText('TRACKING...', ux + bs + 6, uy - bs * 0.5 + s * 1.3);
  ctx.restore();
}

//---------- conspiracy coordinate tracker ----------
function drawCoords(ctx, W, H, rng){
  const bx = W * (0.55 + rng() * 0.2), by = H * (0.45 + rng() * 0.2), bs = W * 0.12;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,80,70,0.85)'; ctx.lineWidth = 1.5;
  const L = bs * 0.3;
  const corner = (x, y, dx, dy) => { ctx.beginPath(); ctx.moveTo(x + dx * L, y); ctx.lineTo(x, y); ctx.lineTo(x, y + dy * L); ctx.stroke(); };
  corner(bx, by, 1, 1); corner(bx + bs, by, -1, 1); corner(bx, by + bs, 1, -1); corner(bx + bs, by + bs, -1, -1);
  const m = bs / 2;
  ctx.beginPath();
  ctx.moveTo(bx + m - 6, by + m); ctx.lineTo(bx + m + 6, by + m);
  ctx.moveTo(bx + m, by + m - 6); ctx.lineTo(bx + m, by + m + 6); ctx.stroke();
  const s = Math.round(W * 0.016);
  ctx.font = ovFont(s); ctx.fillStyle = 'rgba(255,80,70,0.9)'; ctx.textAlign = 'left';
  ctx.fillText(`LAT ${(rng() * 180 - 90).toFixed(4)}`, bx, by - 6 - s);
  ctx.fillText(`LON ${(rng() * 360 - 180).toFixed(4)}`, bx, by - 6);
  ctx.fillText('* TRACKING', bx, by + bs + s);
  ctx.restore();
}

//---------- surveillance timecode + REC + focus brackets ----------
function drawTimecode(ctx, W, H, rng){
  ctx.save();
  const s = Math.round(W * 0.022), m = W * 0.04, L = W * 0.05;
  ctx.strokeStyle = 'rgba(240,240,230,0.85)'; ctx.lineWidth = Math.max(2, W * 0.003);
  const corner = (x, y, dx, dy) => { ctx.beginPath(); ctx.moveTo(x + dx * L, y); ctx.lineTo(x, y); ctx.lineTo(x, y + dy * L); ctx.stroke(); };
  corner(m, m, 1, 1); corner(W - m, m, -1, 1); corner(m, H - m, 1, -1); corner(W - m, H - m, -1, -1);
  ctx.font = ovFont(s);
  ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 3;
  ctx.fillStyle = '#ff4d4d';
  ctx.beginPath(); ctx.arc(m + s * 0.5, m + s * 1.7, s * 0.4, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(240,240,230,0.95)'; ctx.textAlign = 'left';
  ctx.fillText('REC', m + s * 1.2, m + s * 2.0);
  const yr = 1990 + Math.floor(rng() * 20), mo = 1 + Math.floor(rng() * 12), da = 1 + Math.floor(rng() * 28);
  const hh = Math.floor(rng() * 24), mm = Math.floor(rng() * 60), ss = Math.floor(rng() * 60);
  const cam = 'CAM ' + pad2(1 + Math.floor(rng() * 8));
  ctx.fillText(`${cam}  ${yr}-${pad2(mo)}-${pad2(da)}  ${pad2(hh)}:${pad2(mm)}:${pad2(ss)}`, m, H - m - s * 0.5);
  ctx.textAlign = 'right';
  ctx.fillText('> PLAY  SP', W - m, m + s * 1.2);
  ctx.restore();
}

//---------- redaction bars + distressed stamp ----------
function drawStamp(ctx, W, H, text, rng){
  ctx.save();
  ctx.translate(W * (0.3 + rng() * 0.4), H * (0.3 + rng() * 0.4));
  ctx.rotate((rng() * 2 - 1) * 0.5);
  const s = Math.round(W * 0.06);
  ctx.font = ovFont(s, true);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const tw = ctx.measureText(text).width;
  ctx.lineWidth = Math.max(3, s * 0.12);
  ctx.strokeStyle = 'rgba(200,30,24,0.8)';
  ctx.strokeRect(-tw / 2 - s * 0.3, -s * 0.7, tw + s * 0.6, s * 1.4);
  ctx.fillStyle = 'rgba(200,30,24,0.82)';
  ctx.fillText(text, 0, 0);
  ctx.restore();
}
function drawRedacted(ctx, W, H, rng, stampText){
  ctx.save();
  const bars = 2 + Math.floor(rng() * 4);
  for (let i = 0; i < bars; i++){
    const bw = W * (0.12 + rng() * 0.3), bh = H * (0.018 + rng() * 0.02);
    ctx.fillStyle = 'rgba(0,0,0,0.9)';
    ctx.fillRect(rng() * (W - bw), rng() * (H - bh), bw, bh);
  }
  ctx.restore();
  drawStamp(ctx, W, H, stampText, rng);
}

//---------- NFT edition stamp (bottom strip) ----------
function drawNFT(ctx, W, H, rng, idx, total){
  ctx.save();
  const s = Math.round(W * 0.02);
  const ed = (idx && total) ? `EDITION ${idx} / ${total}` : `EDITION ${1 + Math.floor(rng() * 50)} / 50`;
  const token = 'TOKEN 0x' + Math.floor(rng() * 0xFFFFFF).toString(16).toUpperCase().padStart(6, '0');
  const line = `${ed}   <>   ${token}   <>   SERIES FORGE`;
  ctx.font = ovFont(s); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const tw = ctx.measureText(line).width, y = H - s * 1.6;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(W / 2 - tw / 2 - s, y - s, tw + s * 2, s * 2);
  ctx.fillStyle = 'rgba(240,240,230,0.92)';
  ctx.fillText(line, W / 2, y);
  ctx.restore();
}

//---------- orchestrator ----------
function applyOverlays(ctx, recipe){
  const o = recipe.ov;
  if (!o || !o.on) return;
  const W = recipe.w, H = recipe.h;
  const rng = makeRng(recipe.seed + '|ov');
  if (o.holo)     drawHolo(ctx, W, H, rng);
  if (o.ufo)      drawUFO(ctx, W, H, rng);
  if (o.coords)   drawCoords(ctx, W, H, rng);
  if (o.timecode) drawTimecode(ctx, W, H, rng);
  if (o.redacted) drawRedacted(ctx, W, H, rng, o.stamp === 'random' ? STAMPS[Math.floor(rng() * STAMPS.length)] : (o.stamp || 'CLASSIFIED'));
  if (o.nft)      drawNFT(ctx, W, H, rng, o._idx, o._total);
}
window.applyOverlays = applyOverlays;
