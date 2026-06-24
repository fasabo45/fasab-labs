//==================== SERIES FORGE - ENGINE ====================
// Pillar 2: deterministic recipe -> collage renderer, plus series batches.
// Depends on forge.js (dbGetAll, toast, showTab).

//---------- seeded RNG (xmur3 hash -> mulberry32) ----------
function xmur3(str){
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++){
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}
function mulberry32(a){
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function makeRng(seedStr){ return mulberry32(xmur3(String(seedStr))()); }
function clamp(v){ return v < 0 ? 0 : v > 255 ? 255 : v; }

//==================== LIBRARY IMAGE CACHE ====================
let _libImgs = null;
function invalidateLib(){
  if (_libImgs) _libImgs.forEach(o => URL.revokeObjectURL(o._url));
  _libImgs = null;
}
window.invalidateLib = invalidateLib;

function loadImg(src){
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}

async function loadLibraryImages(){
  if (_libImgs) return _libImgs;
  const items = await dbGetAll();
  const out = [];
  for (const it of items){
    const url = URL.createObjectURL(it.blob);
    try {
      const img = await loadImg(url);
      out.push({ id: it.id, img, tags: it.tags || [], w: it.w, h: it.h, _url: url });
    } catch (_) { URL.revokeObjectURL(url); }
  }
  _libImgs = out;
  return out;
}

//==================== RECIPE <-> FORM ====================
function readRecipeFromForm(){
  const [w, h] = document.getElementById('f_size').value.split('x').map(Number);
  return {
    tag:      document.getElementById('f_tag').value.trim(),
    layout:   document.getElementById('f_layout').value,
    fragments:+document.getElementById('f_frag').value,
    torn:     document.getElementById('f_torn').checked,
    scale:    +document.getElementById('f_scale').value,
    rot:      +document.getElementById('f_rot').value,
    grade:    document.getElementById('f_grade').value,
    gradeAmt: +document.getElementById('f_gradeAmt').value,
    grain:    +document.getElementById('f_grain').value,
    vig:      +document.getElementById('f_vig').value,
    scan:     document.getElementById('f_scan').checked,
    glitch:   +document.getElementById('f_glitch').value,
    w, h,
    seed:     document.getElementById('f_seed').value.trim() || 'FORGE-001',
  };
}

function applyRecipeToForm(r){
  document.getElementById('f_tag').value = r.tag || '';
  document.getElementById('f_layout').value = r.layout;
  document.getElementById('f_frag').value = r.fragments;
  document.getElementById('f_torn').checked = !!r.torn;
  document.getElementById('f_scale').value = r.scale;
  document.getElementById('f_rot').value = r.rot;
  document.getElementById('f_grade').value = r.grade;
  document.getElementById('f_gradeAmt').value = r.gradeAmt;
  document.getElementById('f_grain').value = r.grain;
  document.getElementById('f_vig').value = r.vig;
  document.getElementById('f_scan').checked = !!r.scan;
  document.getElementById('f_glitch').value = r.glitch;
  document.getElementById('f_size').value = r.w + 'x' + r.h;
  document.getElementById('f_seed').value = r.seed;
  refreshLabels();
}

//==================== IMAGE SELECTION ====================
function selectImages(recipe, lib, rng){
  let pool = lib;
  if (recipe.tag){
    const wanted = recipe.tag.toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
    const filtered = lib.filter(o => (o.tags || []).some(t => wanted.includes(t.toLowerCase())));
    if (filtered.length) pool = filtered;
  }
  const arr = pool.slice();
  for (let i = arr.length - 1; i > 0; i--){          // seeded Fisher-Yates
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function coverCrop(src, targetAR){
  const ar = src.w / src.h;
  let sw, sh;
  if (ar > targetAR){ sh = src.h; sw = sh * targetAR; }
  else { sw = src.w; sh = sw / targetAR; }
  return { sx: (src.w - sw) / 2, sy: (src.h - sh) / 2, sw, sh };
}

//==================== LAYOUT ====================
function buildLayout(recipe, pool, rng){
  const W = recipe.w, H = recipe.h, out = [];
  const n = recipe.fragments;

  if (recipe.layout === 'grid'){
    const cols = Math.ceil(Math.sqrt(n)), rows = Math.ceil(n / cols);
    const cw = W / cols, ch = H / rows;
    for (let i = 0; i < n; i++){
      const src = pool[i % pool.length];
      const c = i % cols, r = Math.floor(i / cols);
      out.push({ img: src.img, cx: c * cw + cw / 2, cy: r * ch + ch / 2,
        dw: cw, dh: ch, rot: 0, alpha: 1, blend: 'source-over', crop: coverCrop(src, cw / ch) });
    }
  } else if (recipe.layout === 'stack'){
    for (let i = 0; i < n; i++){
      const src = pool[i % pool.length];
      out.push({ img: src.img, cx: W / 2, cy: H / 2, dw: W, dh: H, rot: 0,
        alpha: i === 0 ? 1 : 0.45 + rng() * 0.4,
        blend: i === 0 ? 'source-over' : (rng() < 0.5 ? 'screen' : 'overlay'),
        crop: coverCrop(src, W / H) });
    }
  } else if (recipe.layout === 'strip'){
    const bw = W / n;
    for (let i = 0; i < n; i++){
      const src = pool[i % pool.length];
      out.push({ img: src.img, cx: i * bw + bw / 2, cy: H / 2, dw: bw, dh: H,
        rot: 0, alpha: 1, blend: 'source-over', crop: coverCrop(src, bw / H) });
    }
  } else { // scatter
    for (let i = 0; i < n; i++){
      const src = pool[i % pool.length];
      const baseW = W * (recipe.scale / 100);
      let dw = baseW * (0.6 + rng() * 0.8);
      let dh = dw / (src.w / src.h);
      let crop = null;
      if (recipe.torn){
        const cw = src.w * (0.3 + rng() * 0.5), ch = src.h * (0.3 + rng() * 0.5);
        crop = { sx: rng() * (src.w - cw), sy: rng() * (src.h - ch), sw: cw, sh: ch };
        dh = dw / (cw / ch);
      }
      out.push({ img: src.img, cx: rng() * W, cy: rng() * H, dw, dh,
        rot: (rng() * 2 - 1) * recipe.rot * Math.PI / 180,
        alpha: 0.7 + rng() * 0.3, blend: rng() < 0.3 ? 'screen' : 'source-over', crop });
    }
  }
  return out;
}

function drawPiece(ctx, p){
  ctx.save();
  ctx.globalAlpha = p.alpha;
  ctx.globalCompositeOperation = p.blend || 'source-over';
  ctx.translate(p.cx, p.cy);
  if (p.rot) ctx.rotate(p.rot);
  if (p.crop) ctx.drawImage(p.img, p.crop.sx, p.crop.sy, p.crop.sw, p.crop.sh, -p.dw / 2, -p.dh / 2, p.dw, p.dh);
  else ctx.drawImage(p.img, -p.dw / 2, -p.dh / 2, p.dw, p.dh);
  ctx.restore();
}

//==================== GRADE / FX ====================
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
        let r = d[i], g = d[i + 1], b = d[i + 2];
        const lum = 0.3 * r + 0.59 * g + 0.11 * b;
        if (recipe.grade === 'mono'){ r = g = b = lum; }
        else {
          r += (lum - r) * 0.4; g += (lum - g) * 0.4; b += (lum - b) * 0.4;
          if (tint){ r *= tint[0] / 160; g *= tint[1] / 160; b *= tint[2] / 160; }
        }
        r = (r - 128) * 1.15 + 128; g = (g - 128) * 1.15 + 128; b = (b - 128) * 1.15 + 128;
        d[i]     += (clamp(r) - d[i]) * amt;
        d[i + 1] += (clamp(g) - d[i + 1]) * amt;
        d[i + 2] += (clamp(b) - d[i + 2]) * amt;
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

//==================== RENDER ====================
async function renderRecipe(recipe, canvas, lib){
  canvas.width = recipe.w; canvas.height = recipe.h;
  const ctx = canvas.getContext('2d');
  const rng = makeRng(recipe.seed);
  ctx.fillStyle = '#0d0f0a';
  ctx.fillRect(0, 0, recipe.w, recipe.h);

  const pool = selectImages(recipe, lib, rng);
  if (!pool.length){
    ctx.fillStyle = '#8f9678';
    ctx.font = `${Math.round(recipe.w / 28)}px Segoe UI, sans-serif`;
    ctx.fillText('Library empty - import references first', recipe.w * 0.06, recipe.h / 2);
    return;
  }
  for (const p of buildLayout(recipe, pool, rng)) drawPiece(ctx, p);
  applyGrade(ctx, recipe, rng);
  if (recipe.glitch > 0) applyGlitch(ctx, recipe, rng);
}

function scaleRecipe(r, maxDim){
  const k = Math.min(1, maxDim / Math.max(r.w, r.h));
  return Object.assign({}, r, { w: Math.round(r.w * k), h: Math.round(r.h * k) });
}

//==================== FORMULA CODES ====================
function encodeRecipe(r){ return 'FRG1.' + btoa(unescape(encodeURIComponent(JSON.stringify(r)))); }
function decodeRecipe(code){
  const s = code.trim().replace(/^FRG1\./, '');
  return JSON.parse(decodeURIComponent(escape(atob(s))));
}

//==================== FORMULA TAB ACTIONS ====================
let _lastRecipe = null;

async function previewOne(){
  const r = readRecipeFromForm();
  const lib = await loadLibraryImages();
  await renderRecipe(r, document.getElementById('previewCanvas'), lib);
  document.getElementById('formulaCode').textContent = encodeRecipe(r);
  _lastRecipe = r;
}

function randomizeSeed(){
  const hex = Math.floor(Math.random() * 0xFFFFFF).toString(16).toUpperCase().padStart(6, '0');
  document.getElementById('f_seed').value = 'FORGE-' + hex;
}

function copyFormulaCode(){
  const txt = document.getElementById('formulaCode').textContent;
  if (!txt || txt.startsWith('-')){ toast('Preview one first'); return; }
  navigator.clipboard.writeText(txt).then(() => toast('Formula code copied'),
    () => toast('Copy failed - select it manually'));
}

async function loadFormulaCode(){
  const code = document.getElementById('loadCode').value;
  if (!code.trim()){ toast('Paste a code first'); return; }
  try {
    const r = decodeRecipe(code);
    applyRecipeToForm(r);
    await previewOne();
    toast('Formula loaded');
  } catch (err){ toast('Invalid formula code'); }
}

//==================== SERIES TAB ====================
let _seriesRecipes = [];

function onSeriesMode(){
  const sweep = document.getElementById('s_mode').value === 'sweep';
  document.getElementById('sweepBox').style.display = sweep ? 'block' : 'none';
}

function applySweep(r, param, val){
  if (param === 'fragments') r.fragments = Math.max(1, Math.round(val));
  else if (param === 'scale') r.scale = val;
  else if (param === 'rot') r.rot = val;
  else if (param === 'grain') r.grain = val;
  else if (param === 'glitch') r.glitch = val;
  else if (param === 'gradeAmt') r.gradeAmt = val;
}

function makeGalleryCard(recipe, index){
  const el = document.createElement('div');
  el.className = 'gcard';
  const canvas = document.createElement('canvas');
  canvas.addEventListener('click', () => enlarge(recipe));
  const meta = document.createElement('div');
  meta.className = 'gmeta';
  const seed = document.createElement('div');
  seed.className = 'gseed';
  seed.textContent = '#' + (index + 1) + '  seed: ' + recipe.seed;
  const grow = document.createElement('div');
  grow.className = 'grow';
  const bCopy = document.createElement('button'); bCopy.className = 'ghost'; bCopy.textContent = 'Copy Code';
  bCopy.addEventListener('click', () => {
    navigator.clipboard.writeText(encodeRecipe(recipe)).then(() => toast('Code copied'));
  });
  const bSave = document.createElement('button'); bSave.className = 'ghost'; bSave.textContent = 'Save PNG';
  bSave.addEventListener('click', () => saveOne(recipe, index));
  grow.append(bCopy, bSave);
  meta.append(seed, grow);
  el.append(canvas, meta);
  return { el, canvas };
}

async function generateSeries(){
  const base = readRecipeFromForm();
  const lib = await loadLibraryImages();
  if (!lib.length){ toast('Import references first'); showTab('library'); return; }

  const mode = document.getElementById('s_mode').value;
  const count = +document.getElementById('s_count').value;
  const gallery = document.getElementById('gallery');
  gallery.innerHTML = '';
  _seriesRecipes = [];
  toast('Forging ' + count + ' editions...');

  for (let i = 0; i < count; i++){
    const r = Object.assign({}, base);
    if (mode === 'reseed'){
      r.seed = base.seed + '-' + (i + 1);
    } else {
      const param = document.getElementById('s_param').value;
      const from = +document.getElementById('s_from').value;
      const to = +document.getElementById('s_to').value;
      const val = count === 1 ? from : from + (to - from) * i / (count - 1);
      applySweep(r, param, val);
    }
    const card = makeGalleryCard(r, i);
    gallery.appendChild(card.el);
    await renderRecipe(scaleRecipe(r, 420), card.canvas, lib);
    _seriesRecipes.push(r);
    await new Promise(res => setTimeout(res, 0));  // let the UI breathe
  }
  toast('Forged ' + count + ' editions');
}

async function renderFull(recipe){
  const lib = await loadLibraryImages();
  const c = document.createElement('canvas');
  await renderRecipe(recipe, c, lib);
  return c;
}

function downloadCanvas(canvas, name){
  canvas.toBlob(blob => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }, 'image/png');
}

async function saveOne(recipe, index){
  const c = await renderFull(recipe);
  downloadCanvas(c, 'forge_' + recipe.seed + '_' + (index + 1) + '.png');
  toast('Saved edition ' + (index + 1));
}

async function saveAllSeries(){
  if (!_seriesRecipes.length){ toast('Generate a series first'); return; }
  toast('Saving ' + _seriesRecipes.length + ' full-res PNGs...');
  for (let i = 0; i < _seriesRecipes.length; i++){
    const c = await renderFull(_seriesRecipes[i]);
    downloadCanvas(c, 'forge_' + _seriesRecipes[i].seed + '_' + (i + 1) + '.png');
    await new Promise(res => setTimeout(res, 250));  // stagger downloads
  }
  toast('All editions saved');
}

async function enlarge(recipe){
  const c = await renderFull(recipe);
  document.getElementById('lightboxImg').src = c.toDataURL('image/png');
  document.getElementById('lightbox').classList.add('show');
}

//==================== SLIDER LABELS ====================
const LABELS = [
  ['f_frag', 'f_frag_v', ''], ['f_scale', 'f_scale_v', '%'], ['f_rot', 'f_rot_v', ''],
  ['f_gradeAmt', 'f_gradeAmt_v', '%'], ['f_grain', 'f_grain_v', ''], ['f_vig', 'f_vig_v', ''],
  ['f_glitch', 'f_glitch_v', ''], ['s_count', 's_count_v', ''],
];
function refreshLabels(){
  LABELS.forEach(([id, span, suf]) => {
    const el = document.getElementById(id), s = document.getElementById(span);
    if (el && s) s.textContent = el.value + suf;
  });
}
function wireLabels(){
  LABELS.forEach(([id, span, suf]) => {
    const el = document.getElementById(id), s = document.getElementById(span);
    if (el && s) el.addEventListener('input', () => s.textContent = el.value + suf);
  });
  refreshLabels();
}

//==================== INIT ====================
wireLabels();
onSeriesMode();
