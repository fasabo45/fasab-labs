//==================== SERIES FORGE - DEGRADATION ====================
// Procedural, seeded battle-damage: rust, burn, cracks, scratches, dust, stains.
// All driven by the recipe's `deg` block; applied UNDER the grade.
// Exposes window.applyDegradation(ctx, recipe, rng).

//---------- seeded fractal value-noise -> Float32Array 0..1 ----------
// octaves: array of [cellDivisor, weight]; bigger divisor = finer detail.
function fractalNoise(W, H, rng, octaves){
  const acc = new Float32Array(W * H);
  let wsum = 0;
  for (const [cells, weight] of octaves){
    const lw = Math.max(2, Math.round(W / cells));
    const lh = Math.max(2, Math.round(H / cells));
    const grid = new Float32Array(lw * lh);
    for (let i = 0; i < grid.length; i++) grid[i] = rng();
    for (let y = 0; y < H; y++){
      const gy = (y / H) * (lh - 1);
      const y0 = Math.floor(gy), fy = gy - y0, y1 = Math.min(lh - 1, y0 + 1);
      for (let x = 0; x < W; x++){
        const gx = (x / W) * (lw - 1);
        const x0 = Math.floor(gx), fx = gx - x0, x1 = Math.min(lw - 1, x0 + 1);
        const v00 = grid[y0 * lw + x0], v10 = grid[y0 * lw + x1];
        const v01 = grid[y1 * lw + x0], v11 = grid[y1 * lw + x1];
        const top = v00 + (v10 - v00) * fx, bot = v01 + (v11 - v01) * fx;
        acc[y * W + x] += (top + (bot - top) * fy) * weight;
      }
    }
    wsum += weight;
  }
  for (let i = 0; i < acc.length; i++) acc[i] /= wsum;
  return acc;
}

function dgClamp(v){ return v < 0 ? 0 : v > 255 ? 255 : v; }

//---------- RUST: patchy orange-brown corrosion ----------
function applyRust(ctx, W, H, amt, rng){
  const a = amt / 100;
  const mask = fractalNoise(W, H, rng, [[7, 1], [18, 0.6], [45, 0.3]]);
  const id = ctx.getImageData(0, 0, W, H);
  const d = id.data;
  for (let i = 0, p = 0; i < d.length; i += 4, p++){
    let m = (mask[p] - 0.52) / 0.48;
    if (m <= 0) continue;
    if (m > 1) m = 1;
    const k = m * a * 0.9;
    const rr = 110 + m * 35, rg = 48 + m * 22, rb = 22 + m * 12;
    d[i]     = dgClamp(d[i]     + (rr - d[i])     * k);
    d[i + 1] = dgClamp(d[i + 1] + (rg - d[i + 1]) * k);
    d[i + 2] = dgClamp(d[i + 2] + (rb - d[i + 2]) * k);
  }
  ctx.putImageData(id, 0, 0);
}

//---------- BURN: charred blotches + scorched edges ----------
function applyBurn(ctx, W, H, amt, rng){
  const a = amt / 100;
  const mask = fractalNoise(W, H, rng, [[5, 1], [14, 0.5]]);
  const id = ctx.getImageData(0, 0, W, H);
  const d = id.data;
  for (let i = 0, p = 0; i < d.length; i += 4, p++){
    let m = (mask[p] - 0.6) / 0.4;
    if (m <= 0) continue;
    if (m > 1) m = 1;
    const k = m * a;
    d[i]     = dgClamp(d[i]     * (1 - k));
    d[i + 1] = dgClamp(d[i + 1] * (1 - k * 0.85));
    d[i + 2] = dgClamp(d[i + 2] * (1 - k * 0.65));
  }
  ctx.putImageData(id, 0, 0);
  // scorched-edge brown vignette
  const a2 = a * 0.7;
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.4, W / 2, H / 2, Math.max(W, H) * 0.78);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(28,12,4,${a2})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

//---------- CRACKS: branching dark fractures with light rims ----------
function drawCrack(ctx, x, y, ang, len, depth, rng, a){
  if (depth > 3 || len < 6) return;
  const segs = Math.round(len / 8) + 2;
  let px = x, py = y, pa = ang;
  ctx.beginPath();
  ctx.moveTo(px, py);
  for (let s = 0; s < segs; s++){
    pa += (rng() * 2 - 1) * 0.5;
    px += Math.cos(pa) * 8;
    py += Math.sin(pa) * 8;
    ctx.lineTo(px, py);
  }
  ctx.strokeStyle = `rgba(8,6,4,${0.55 * a})`;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.strokeStyle = `rgba(205,205,195,${0.12 * a})`;
  ctx.lineWidth = 0.7;
  ctx.stroke();
  if (rng() < 0.6) drawCrack(ctx, px, py, pa + (rng() < 0.5 ? 1 : -1) * (0.6 + rng() * 0.5), len * 0.6, depth + 1, rng, a);
}

function applyCracks(ctx, W, H, amt, rng){
  const a = amt / 100;
  const count = Math.round(a * 6) + 1;
  ctx.save();
  ctx.lineCap = 'round';
  for (let c = 0; c < count; c++){
    drawCrack(ctx, rng() * W, rng() * H, rng() * Math.PI * 2, 40 + rng() * 120, 0, rng, a);
  }
  ctx.restore();
}

//---------- SCRATCHES: thin random light/dark streaks ----------
function applyScratches(ctx, W, H, amt, rng){
  const a = amt / 100;
  const n = Math.round(a * 30);
  ctx.save();
  for (let i = 0; i < n; i++){
    const x = rng() * W, y = rng() * H;
    const ang = rng() * Math.PI * 2;
    const len = 20 + rng() * 120;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    ctx.strokeStyle = rng() < 0.5
      ? `rgba(255,255,250,${0.10 + rng() * 0.12})`
      : `rgba(0,0,0,${0.12 + rng() * 0.15})`;
    ctx.lineWidth = rng() < 0.85 ? 0.6 : 1.2;
    ctx.stroke();
  }
  ctx.restore();
}

//---------- DUST: fine speckle grime ----------
function applyDust(ctx, W, H, amt, rng){
  const a = amt / 100;
  const n = Math.round(a * W * H / 4000);
  ctx.save();
  for (let i = 0; i < n; i++){
    const x = rng() * W, y = rng() * H, r = rng() * 1.6 + 0.3;
    ctx.fillStyle = rng() < 0.6
      ? `rgba(0,0,0,${0.15 + rng() * 0.25})`
      : `rgba(255,255,255,${0.10 + rng() * 0.20})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 7);
    ctx.fill();
  }
  ctx.restore();
}

//---------- STAINS: soft water-mark blotches with dark rings ----------
function applyStains(ctx, W, H, amt, rng){
  const a = amt / 100;
  const n = Math.round(a * 4) + 1;
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  for (let i = 0; i < n; i++){
    const x = rng() * W, y = rng() * H, r = 40 + rng() * 120;
    const tone = rng() < 0.5 ? '60,45,25' : '40,40,45';
    const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
    g.addColorStop(0, `rgba(${tone},0)`);
    g.addColorStop(0.70, `rgba(${tone},${0.25 * a})`);
    g.addColorStop(0.86, `rgba(${tone},${0.40 * a})`);
    g.addColorStop(1, `rgba(${tone},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 7);
    ctx.fill();
  }
  ctx.restore();
}

//---------- master orchestrator ----------
// Surface coloring first (stains/rust/burn), then linework (cracks/scratches/dust).
function applyDegradation(ctx, recipe, rng){
  const W = recipe.w, H = recipe.h;
  const dg = recipe.deg || {};
  if (dg.stains)    applyStains(ctx, W, H, dg.stains, rng);
  if (dg.rust)      applyRust(ctx, W, H, dg.rust, rng);
  if (dg.burn)      applyBurn(ctx, W, H, dg.burn, rng);
  if (dg.cracks)    applyCracks(ctx, W, H, dg.cracks, rng);
  if (dg.scratches) applyScratches(ctx, W, H, dg.scratches, rng);
  if (dg.dust)      applyDust(ctx, W, H, dg.dust, rng);
}
window.applyDegradation = applyDegradation;
