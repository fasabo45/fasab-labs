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
    deg: {
      rust:      +document.getElementById('d_rust').value,
      burn:      +document.getElementById('d_burn').value,
      cracks:    +document.getElementById('d_cracks').value,
      scratches: +document.getElementById('d_scratch').value,
      dust:      +document.getElementById('d_dust').value,
      stains:    +document.getElementById('d_stain').value,
    },
    hud: {
      on:        document.getElementById('h_on').checked,
      color:     document.getElementById('h_color').value,
      crosshair: document.getElementById('h_cross').checked,
      ammo:      document.getElementById('h_ammo').checked,
      minimap:   document.getElementById('h_map').checked,
      killfeed:  document.getElementById('h_feed').checked,
      compass:   document.getElementById('h_compass').checked,
      lowhealth: document.getElementById('h_low').checked,
    },
    ov: {
      on:       document.getElementById('o_on').checked,
      redacted: document.getElementById('o_redact').checked,
      stamp:    document.getElementById('o_stamp').value,
      timecode: document.getElementById('o_time').checked,
      ufo:      document.getElementById('o_ufo').checked,
      holo:     document.getElementById('o_holo').checked,
      coords:   document.getElementById('o_coords').checked,
      nft:      document.getElementById('o_nft').checked,
    },
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
  const dg = r.deg || {};
  document.getElementById('d_rust').value = dg.rust || 0;
  document.getElementById('d_burn').value = dg.burn || 0;
  document.getElementById('d_cracks').value = dg.cracks || 0;
  document.getElementById('d_scratch').value = dg.scratches || 0;
  document.getElementById('d_dust').value = dg.dust || 0;
  document.getElementById('d_stain').value = dg.stains || 0;
  const hd = r.hud || {};
  document.getElementById('h_on').checked = !!hd.on;
  document.getElementById('h_color').value = hd.color || 'green';
  document.getElementById('h_cross').checked = !!hd.crosshair;
  document.getElementById('h_ammo').checked = !!hd.ammo;
  document.getElementById('h_map').checked = !!hd.minimap;
  document.getElementById('h_feed').checked = !!hd.killfeed;
  document.getElementById('h_compass').checked = !!hd.compass;
  document.getElementById('h_low').checked = !!hd.lowhealth;
  const ov = r.ov || {};
  document.getElementById('o_on').checked = !!ov.on;
  document.getElementById('o_redact').checked = !!ov.redacted;
  document.getElementById('o_stamp').value = ov.stamp || 'random';
  document.getElementById('o_time').checked = !!ov.timecode;
  document.getElementById('o_ufo').checked = !!ov.ufo;
  document.getElementById('o_holo').checked = !!ov.holo;
  document.getElementById('o_coords').checked = !!ov.coords;
  document.getElementById('o_nft').checked = !!ov.nft;
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
    const j = Math.floor(rng() * (i + 1));            // (always run: keeps rng stream stable)
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  // Baked ref IDs win: pin the exact source images in their recorded order.
  // Missing IDs are skipped; if none survive we fall back to the fresh shuffle.
  if (recipe.refs && recipe.refs.length){
    const byId = new Map(lib.map(o => [o.id, o]));
    const locked = recipe.refs.map(id => byId.get(id)).filter(Boolean);
    if (locked.length) return locked;
    if (window.toast) toast('Baked refs not in this library - reshuffling');
  }
  return arr;
}

// Compute & stamp the exact ref IDs onto a recipe (once) so its formula
// code reproduces the same source images even after the library changes.
function ensureRefs(recipe, lib){
  if (recipe.refs && recipe.refs.length) return;
  if (!lib || !lib.length) return;
  const pool = selectImages(recipe, lib, makeRng(recipe.seed));
  if (pool.length) recipe.refs = pool.map(o => o.id);
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
  if (window.applyDegradation) applyDegradation(ctx, recipe, rng);
  applyGrade(ctx, recipe, rng);
  if (recipe.glitch > 0) applyGlitch(ctx, recipe, rng);
  if (window.applyHud) applyHud(ctx, recipe);
  if (window.applyOverlays) applyOverlays(ctx, recipe);
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
let _pinnedRefs = null;   // ref IDs carried over from a loaded code; null = pick fresh
// Let the Brain tab pin a mood board's images as the exact source set.
window.setPinnedRefs = function(ids){ _pinnedRefs = (ids && ids.length) ? ids.slice() : null; };

// Recipe straight from the form, re-attaching any pinned refs from a loaded code.
function currentRecipe(){
  const r = readRecipeFromForm();
  if (_pinnedRefs && _pinnedRefs.length) r.refs = _pinnedRefs.slice();
  return r;
}

async function previewOne(){
  const r = currentRecipe();
  const lib = await loadLibraryImages();
  ensureRefs(r, lib);                       // bake exact source IDs into the code
  _pinnedRefs = r.refs || null;             // keep code + pin in sync
  await renderRecipe(r, document.getElementById('previewCanvas'), lib);
  document.getElementById('formulaCode').textContent = encodeRecipe(r);
  _lastRecipe = r;
}

function randomizeSeed(){
  const hex = Math.floor(Math.random() * 0xFFFFFF).toString(16).toUpperCase().padStart(6, '0');
  document.getElementById('f_seed').value = 'FORGE-' + hex;
  _pinnedRefs = null;                       // new seed -> fresh image pick
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
    _pinnedRefs = (r.refs && r.refs.length) ? r.refs.slice() : null;  // honor the pinned images
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

const DEG_PARAMS = { rust: 1, burn: 1, cracks: 1, scratches: 1, dust: 1, stains: 1 };
function applySweep(r, param, val){
  if (param === 'fragments') r.fragments = Math.max(1, Math.round(val));
  else if (param === 'scale') r.scale = val;
  else if (param === 'rot') r.rot = val;
  else if (param === 'grain') r.grain = val;
  else if (param === 'glitch') r.glitch = val;
  else if (param === 'gradeAmt') r.gradeAmt = val;
  else if (DEG_PARAMS[param]) r.deg[param] = val;
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
  const base = currentRecipe();
  const lib = await loadLibraryImages();
  if (!lib.length){ toast('Import references first'); showTab('library'); return; }

  const mode = document.getElementById('s_mode').value;
  const count = +document.getElementById('s_count').value;
  const gallery = document.getElementById('gallery');
  gallery.innerHTML = '';
  _seriesRecipes = [];
  const archiveItems = [];
  toast('Forging ' + count + ' editions...');

  for (let i = 0; i < count; i++){
    const r = Object.assign({}, base);
    r.deg = Object.assign({}, base.deg);   // own copy so sweeps don't bleed across siblings
    r.hud = Object.assign({}, base.hud);
    r.ov  = Object.assign({}, base.ov);
    r.ov._idx = i + 1; r.ov._total = count;   // real edition numbers in the NFT stamp
    if (mode === 'reseed'){
      r.seed = base.seed + '-' + (i + 1);
      delete r.refs;                       // new seed -> its own fresh image pick
    } else {
      const param = document.getElementById('s_param').value;
      const from = +document.getElementById('s_from').value;
      const to = +document.getElementById('s_to').value;
      const val = count === 1 ? from : from + (to - from) * i / (count - 1);
      applySweep(r, param, val);           // same seed -> keeps base's pinned refs
    }
    ensureRefs(r, lib);                     // bake this sibling's exact source IDs
    const card = makeGalleryCard(r, i);
    gallery.appendChild(card.el);
    await renderRecipe(scaleRecipe(r, 420), card.canvas, lib);
    _seriesRecipes.push(r);
    const thumb = await new Promise(res => card.canvas.toBlob(res, 'image/png'));
    if (thumb) archiveItems.push({ seed: r.seed, index: i + 1, code: encodeRecipe(r), w: r.w, h: r.h, blob: thumb });
    await new Promise(res => setTimeout(res, 0));  // let the UI breathe
  }
  toast('Forged ' + count + ' editions');
  if (window.archiveGeneration && archiveItems.length){
    try { await archiveGeneration(archiveItems); } catch (e){ console.warn('gallery archive failed', e); }
  }
}

async function renderFull(recipe){
  const lib = await loadLibraryImages();
  const c = document.createElement('canvas');
  await renderRecipe(recipe, c, lib);
  return c;
}

function downloadCanvas(canvas, name){
  canvas.toBlob(blob => {
    if (!blob){ toast('Save failed - could not encode PNG (canvas too large or blocked)'); return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);     // some browsers (Firefox) require it in the DOM
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);   // revoke late so the download completes
  }, 'image/png');
}
window.renderFull = renderFull;              // used by gallery.js
window.downloadCanvas = downloadCanvas;
window.getSeriesRecipes = () => _seriesRecipes;

async function saveOne(recipe, index){
  try {
    const c = await renderFull(recipe);
    downloadCanvas(c, 'forge_' + recipe.seed + '_' + (index + 1) + '.png');
    toast('Saved edition ' + (index + 1));
  } catch (e){ console.error(e); toast('Save failed: ' + e.message); }
}

async function saveAllSeries(){
  if (!_seriesRecipes.length){ toast('Generate a series first'); return; }
  toast('Saving ' + _seriesRecipes.length + ' full-res PNGs...');
  for (let i = 0; i < _seriesRecipes.length; i++){
    try {
      const c = await renderFull(_seriesRecipes[i]);
      downloadCanvas(c, 'forge_' + _seriesRecipes[i].seed + '_' + (i + 1) + '.png');
    } catch (e){ console.error(e); toast('Edition ' + (i + 1) + ' failed'); }
    await new Promise(res => setTimeout(res, 400));  // stagger so browsers don't block
  }
  toast('Saved. If your browser blocked some, grab them from the Gallery tab.');
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
  ['d_rust', 'd_rust_v', ''], ['d_burn', 'd_burn_v', ''], ['d_cracks', 'd_cracks_v', ''],
  ['d_scratch', 'd_scratch_v', ''], ['d_dust', 'd_dust_v', ''], ['d_stain', 'd_stain_v', ''],
  ['v_frames', 'v_frames_v', ''],
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

// Manually editing the seed or tag means "give me a fresh pick", so drop any pin.
function wireRefsReset(){
  ['f_seed', 'f_tag'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => { _pinnedRefs = null; });
  });
}

//==================== INIT ====================
wireLabels();
wireRefsReset();
onSeriesMode();
