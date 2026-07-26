//==================== SERIES FORGE - DECAY / DESTRUCTION ====================
// Progressive image destruction keyed to recipe.decay (0-100). Effects switch
// on at escalating thresholds so low = subtle imperfection, 100 = total chaos.
// Applied by engine.js renderRecipe() after the glitch pass. Pure ctx ops.

function _snap(ctx, W, H){
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  c.getContext('2d').drawImage(ctx.canvas, 0, 0);
  return c;
}

// 1. Horizontal row jitter - the first cracks.
function _rowJitter(ctx, W, H, rng, t){
  const maxShift = Math.max(1, Math.round(W * 0.06 * t));
  const rows = Math.round(H * (0.05 + 0.5 * t) / 8);
  for (let k = 0; k < rows; k++){
    const y = Math.floor(rng() * H);
    const th = 1 + Math.floor(rng() * (1 + 10 * t));
    const dx = Math.round((rng() * 2 - 1) * maxShift);
    ctx.putImageData(ctx.getImageData(0, y, W, Math.min(th, H - y)), dx, y);
  }
}

// 2. Sine wave warp - the image starts to bend.
function _waveWarp(ctx, W, H, rng, t){
  const src = _snap(ctx, W, H);
  ctx.clearRect(0, 0, W, H);
  const amp = W * (0.015 + 0.12 * t);
  const freq = (2 + rng() * 6) / H;
  const phase = rng() * Math.PI * 2;
  for (let y = 0; y < H; y++){
    const dx = Math.sin(y * freq + phase) * amp;
    ctx.drawImage(src, 0, y, W, 1, dx, y, W, 1);
  }
}

// 3. RGB channel shatter in random bands - colour comes apart.
function _channelShatter(ctx, W, H, rng, t){
  const img = ctx.getImageData(0, 0, W, H); const s = img.data;
  const out = ctx.createImageData(W, H); const o = out.data; o.set(s);
  const bands = 2 + Math.floor(t * 8);
  for (let b = 0; b < bands; b++){
    const y0 = Math.floor(rng() * H), h = Math.floor(H * (0.02 + rng() * 0.15));
    const rsh = Math.round((rng() * 2 - 1) * W * 0.12 * t);
    const bsh = Math.round((rng() * 2 - 1) * W * 0.12 * t);
    for (let y = y0; y < Math.min(H, y0 + h); y++){
      for (let x = 0; x < W; x++){
        const i = (y * W + x) * 4;
        const rx = Math.min(W - 1, Math.max(0, x + rsh));
        const bx = Math.min(W - 1, Math.max(0, x + bsh));
        o[i] = s[(y * W + rx) * 4];
        o[i + 2] = s[(y * W + bx) * 4 + 2];
      }
    }
  }
  ctx.putImageData(out, 0, 0);
}

// 4. Block corruption / datamosh - chunks teleport.
function _blockCorrupt(ctx, W, H, rng, t){
  const n = Math.round(4 + t * 40);
  for (let k = 0; k < n; k++){
    const bw = Math.max(2, Math.floor(W * (0.05 + rng() * 0.25)));
    const bh = Math.max(2, Math.floor(H * (0.02 + rng() * 0.12)));
    const sx = Math.floor(rng() * (W - bw)), sy = Math.floor(rng() * (H - bh));
    const dx = Math.floor(rng() * (W - bw)), dy = Math.floor(rng() * (H - bh));
    ctx.putImageData(ctx.getImageData(sx, sy, bw, bh), dx, dy);
  }
}

// 5. Pixel sort - horizontal spans sorted by luminance.
function _pixelSort(ctx, W, H, rng, t){
  const img = ctx.getImageData(0, 0, W, H); const d = img.data;
  const rows = Math.round(H * (0.04 + 0.4 * t) / 2);
  for (let k = 0; k < rows; k++){
    const y = Math.floor(rng() * H);
    const len = Math.max(4, Math.floor(W * (0.1 + rng() * (0.2 + 0.7 * t))));
    const x0 = Math.floor(rng() * Math.max(1, W - len));
    const arr = [];
    for (let x = x0; x < x0 + len; x++){ const i = (y * W + x) * 4; arr.push([d[i], d[i + 1], d[i + 2], d[i + 3]]); }
    arr.sort((a, b) => (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]));
    for (let x = x0, j = 0; x < x0 + len; x++, j++){
      const i = (y * W + x) * 4;
      d[i] = arr[j][0]; d[i + 1] = arr[j][1]; d[i + 2] = arr[j][2]; d[i + 3] = arr[j][3];
    }
  }
  ctx.putImageData(img, 0, 0);
}

// 6. Slice scramble - big horizontal tears fling sideways.
function _sliceScramble(ctx, W, H, rng, t){
  const src = _snap(ctx, W, H);
  const slices = Math.round(6 + t * 30);
  for (let k = 0; k < slices; k++){
    const y = Math.floor(rng() * H);
    const h = 1 + Math.floor(rng() * Math.max(2, H * 0.08 * t));
    const dx = Math.round((rng() * 2 - 1) * W * 0.4 * t);
    ctx.drawImage(src, 0, y, W, h, dx, y, W, h);
  }
}

// 7. Melt / smear - pixels drag downward like the image is running.
function _smearDown(ctx, W, H, rng, t){
  const cols = Math.round(3 + t * 30);
  for (let k = 0; k < cols; k++){
    const x = Math.floor(rng() * W);
    const w = 1 + Math.floor(rng() * Math.max(2, W * 0.04 * t));
    const y = Math.floor(rng() * H * 0.6);
    const len = Math.floor(H * (0.1 + rng() * 0.5 * t));
    const strip = ctx.getImageData(x, y, Math.min(w, W - x), 1);
    for (let yy = y; yy < Math.min(H, y + len); yy++) ctx.putImageData(strip, x, yy);
  }
}

// Master: ramp effects on as decay climbs.
function applyDecay(ctx, recipe, rng){
  const d = (recipe.decay || 0) / 100;
  if (d <= 0) return;
  const W = recipe.w, H = recipe.h;
  const ramp = (from) => (d - from) / (1 - from);   // 0..1 within an effect's active range
  _rowJitter(ctx, W, H, rng, d);
  if (d > 0.18) _waveWarp(ctx, W, H, rng, ramp(0.18));
  if (d > 0.28) _channelShatter(ctx, W, H, rng, ramp(0.28));
  if (d > 0.33) _blockCorrupt(ctx, W, H, rng, ramp(0.33));
  if (d > 0.43) _smearDown(ctx, W, H, rng, ramp(0.43));
  if (d > 0.48) _pixelSort(ctx, W, H, rng, ramp(0.48));
  if (d > 0.58) _sliceScramble(ctx, W, H, rng, ramp(0.58));
}
window.applyDecay = applyDecay;
