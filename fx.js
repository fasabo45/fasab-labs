//==================== SERIES FORGE - COLOUR GRADE / FX ====================
// Pixel-level post effects applied by engine.js renderRecipe():
// colour grade + film grain + scanlines + vignette, and RGB-split glitch.
// Pure functions on a 2D canvas context; no DOM or app state.

function clamp(v){ return v < 0 ? 0 : v > 255 ? 255 : v; }

const TINTS = { cod: [150, 160, 90], vhs: [170, 140, 180] };

function applyGrade(ctx, recipe, rng){
  const W = recipe.w, H = recipe.h;
  const amt = recipe.gradeAmt / 100;
  const doGrade = recipe.grade !== 'none' && amt > 0;
  const doGrain = recipe.grain > 0;

  if (doGrade || doGrain){
    const id = ctx.getImageData(0, 0, W, H);
    const d = id.data;
    const tint = TINTS[recipe.grade];
    for (let i = 0; i < d.length; i += 4){
      if (doGrade){
        const r0 = d[i], g0 = d[i + 1], b0 = d[i + 2];
        const lum = 0.3 * r0 + 0.59 * g0 + 0.11 * b0;
        let nr, ng, nb, contrast = 1.15;
        switch (recipe.grade){
          case 'mono':  nr = ng = nb = lum; break;
          case 'noir':  nr = ng = nb = lum; contrast = 1.65; break;
          case 'sepia': nr = lum * 1.07; ng = lum * 0.85; nb = lum * 0.62; contrast = 1.1; break;
          case 'nvg':   nr = lum * 0.15; ng = lum * 1.2; nb = lum * 0.15; contrast = 1.3; break;
          case 'bleach': {
            const ds = 0.6;
            nr = r0 + (lum - r0) * ds; ng = g0 + (lum - g0) * ds; nb = b0 + (lum - b0) * ds;
            contrast = 1.45; break;
          }
          default: { // cod, vhs (tinted desaturate)
            nr = r0 + (lum - r0) * 0.4; ng = g0 + (lum - g0) * 0.4; nb = b0 + (lum - b0) * 0.4;
            if (tint){ nr *= tint[0] / 160; ng *= tint[1] / 160; nb *= tint[2] / 160; }
          }
        }
        nr = (nr - 128) * contrast + 128; ng = (ng - 128) * contrast + 128; nb = (nb - 128) * contrast + 128;
        d[i]     += (clamp(nr) - d[i]) * amt;
        d[i + 1] += (clamp(ng) - d[i + 1]) * amt;
        d[i + 2] += (clamp(nb) - d[i + 2]) * amt;
      }
      if (doGrain){
        const nz = (rng() * 2 - 1) * recipe.grain;
        d[i] = clamp(d[i] + nz); d[i + 1] = clamp(d[i + 1] + nz); d[i + 2] = clamp(d[i + 2] + nz);
      }
    }
    ctx.putImageData(id, 0, 0);
  }

  if (recipe.scan){
    ctx.save();
    ctx.globalAlpha = 0.22; ctx.fillStyle = '#000';
    for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
    ctx.restore();
  }
  if (recipe.vig > 0){
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.72);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, `rgba(0,0,0,${(recipe.vig / 100) * 0.85})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
}

function applyGlitch(ctx, recipe, rng){
  const W = recipe.w, H = recipe.h;
  const shift = Math.round((recipe.glitch / 100) * 18) + 1;
  const src = ctx.getImageData(0, 0, W, H);
  const out = ctx.createImageData(W, H);
  const s = src.data, o = out.data;
  for (let y = 0; y < H; y++){
    for (let x = 0; x < W; x++){
      const i = (y * W + x) * 4;
      const rx = Math.min(W - 1, x + shift), bx = Math.max(0, x - shift);
      o[i]     = s[(y * W + rx) * 4];       // red shifted right-source
      o[i + 1] = s[i + 1];                   // green stays
      o[i + 2] = s[(y * W + bx) * 4 + 2];   // blue shifted
      o[i + 3] = s[i + 3];
    }
  }
  ctx.putImageData(out, 0, 0);
  const tears = Math.round((recipe.glitch / 100) * 8);
  for (let t = 0; t < tears; t++){
    const ty = Math.floor(rng() * H);
    const th = 2 + Math.floor(rng() * 10);
    const dx = Math.floor((rng() * 2 - 1) * shift * 2);
    const band = ctx.getImageData(0, ty, W, Math.min(th, H - ty));
    ctx.putImageData(band, dx, ty);
  }
}
