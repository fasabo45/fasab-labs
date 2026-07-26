//==================== SERIES FORGE - FRAMES ====================
// A separate frame library + a Frame tab: drop a generated image into an
// ornate frame's opening. Frames live in their own IndexedDB store so they
// never get used as collage reference fragments.
// Depends on forge.js(window.openDB,toast), engine.js(renderFull,decodeRecipe,
// downloadCanvas,getLastRecipe), gallery.js(galleryAll).

const F_STORE = 'frames';
function fTx(mode){ return window.openDB().then(db => db.transaction(F_STORE, mode).objectStore(F_STORE)); }
function fReq(s, fn){ return new Promise((res, rej) => { const r = fn(s); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
function fAdd(rec){ return fTx('readwrite').then(s => fReq(s, st => st.add(rec))); }
function fGetAll(){ return fTx('readonly').then(s => fReq(s, st => st.getAll())).then(r => r || []); }
function fPut(rec){ return fTx('readwrite').then(s => fReq(s, st => st.put(rec))); }
function fDelete(id){ return fTx('readwrite').then(s => fReq(s, st => st.delete(id))); }

let _frames = [], _frameImgs = new Map(), _activeFrame = null, _artCanvas = null, _frameUrls = [];
let _srcMode = 'gallery';   // 'gallery' | 'library' - what the source picker shows

function loadImgFromBlob(blob){
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(blob);
    const i = new Image();
    i.onload = () => res({ img: i, url });
    i.onerror = () => { URL.revokeObjectURL(url); rej(new Error('img')); };
    i.src = url;
  });
}

//==================== OPENING AUTO-DETECT ====================
// Downscale, mark "empty" (transparent OR near-white), flood-fill from the
// borders to find the OUTSIDE, then the largest enclosed empty region = opening.
function detectOpening(img){
  const L = 200;
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const s = L / Math.max(iw, ih);
  const w = Math.max(1, Math.round(iw * s)), h = Math.max(1, Math.round(ih * s));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;

  const empty = new Uint8Array(w * h);
  for (let i = 0, p = 0; i < d.length; i += 4, p++){
    const a = d[i + 3], lum = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
    empty[p] = (a < 24 || lum > 238) ? 1 : 0;
  }
  const centerA = d[((h >> 1) * w + (w >> 1)) * 4 + 3];
  const frameOnTop = centerA < 16;

  const outside = new Uint8Array(w * h), stack = [];
  const push = (x, y) => { if (x < 0 || y < 0 || x >= w || y >= h) return; const p = y * w + x; if (empty[p] && !outside[p]){ outside[p] = 1; stack.push(p); } };
  for (let x = 0; x < w; x++){ push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++){ push(0, y); push(w - 1, y); }
  while (stack.length){ const p = stack.pop(), x = p % w, y = (p - x) / w; push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1); }

  const seen = new Uint8Array(w * h);
  let best = { area: 0, minx: 0, miny: 0, maxx: 0, maxy: 0 };
  for (let p0 = 0; p0 < w * h; p0++){
    if (!empty[p0] || outside[p0] || seen[p0]) continue;
    let area = 0, mnx = w, mny = h, mxx = -1, mxy = -1; const st = [p0]; seen[p0] = 1;
    while (st.length){
      const p = st.pop(), x = p % w, y = (p - x) / w;
      area++; if (x < mnx) mnx = x; if (x > mxx) mxx = x; if (y < mny) mny = y; if (y > mxy) mxy = y;
      const nb = [p + 1, p - 1, p + w, p - w], nx = [x + 1, x - 1, x, x];
      for (let k = 0; k < 4; k++){ const q = nb[k]; if (q < 0 || q >= w * h) continue; if (k < 2 && nx[k] !== ((q % w))) continue; if (empty[q] && !outside[q] && !seen[q]){ seen[q] = 1; st.push(q); } }
    }
    if (area > best.area) best = { area, minx: mnx, miny: mny, maxx: mxx, maxy: mxy };
  }
  if (best.area < w * h * 0.02) return { opening: { l: 0.16, t: 0.16, r: 0.16, b: 0.16 }, frameOnTop };
  return {
    opening: { l: best.minx / w, t: best.miny / h, r: (w - 1 - best.maxx) / w, b: (h - 1 - best.maxy) / h },
    frameOnTop,
  };
}

//==================== IMPORT ====================
async function importFrameFiles(fileList){
  const files = [...fileList].filter(f => f.type.startsWith('image/'));
  if (!files.length){ toast('No images in that pick'); return; }
  let ok = 0;
  for (const f of files){
    try {
      const { img, url } = await loadImgFromBlob(f);
      const det = detectOpening(img);
      await fAdd({ name: f.name, blob: f, w: img.naturalWidth, h: img.naturalHeight, opening: det.opening, frameOnTop: det.frameOnTop, added: Date.now() });
      URL.revokeObjectURL(url); ok++;
    } catch (e){ console.warn('frame skip', f.name, e); }
  }
  toast('Imported ' + ok + ' frame' + (ok === 1 ? '' : 's'));
  await renderFrames();
}

//==================== FRAME LIST ====================
async function renderFrames(){
  const grid = document.getElementById('fr_grid'); if (!grid) return;
  _frameUrls.forEach(u => URL.revokeObjectURL(u)); _frameUrls = [];
  _frames = await fGetAll();
  grid.innerHTML = _frames.length ? '' : '<p class="muted">No frames yet. Import your frame PNGs/JPGs (folder works too).</p>';
  for (const fr of _frames){
    const url = URL.createObjectURL(fr.blob); _frameUrls.push(url);
    const cell = document.createElement('div');
    cell.className = 'pick' + (_activeFrame && _activeFrame.id === fr.id ? ' sel' : '');
    cell.innerHTML = '<img src="' + url + '" alt=""><span class="tick"></span>';
    cell.querySelector('img').addEventListener('click', () => selectFrame(fr.id));
    const del = document.createElement('button'); del.className = 'danger'; del.textContent = 'x';
    del.style.cssText = 'position:absolute;top:2px;left:2px;padding:2px 6px';
    del.addEventListener('click', e => { e.stopPropagation(); deleteFrame(fr.id); });
    cell.appendChild(del);
    grid.appendChild(cell);
  }
}

async function selectFrame(id){
  _activeFrame = _frames.find(f => f.id === id) || null;
  if (_activeFrame){
    if (!_frameImgs.has(id)){ const { img } = await loadImgFromBlob(_activeFrame.blob); _frameImgs.set(id, img); }
    setOpeningSliders(_activeFrame.opening);
  }
  renderFrames(); renderFramedPreview();
}

async function deleteFrame(id){
  await fDelete(id);
  if (_activeFrame && _activeFrame.id === id) _activeFrame = null;
  _frameImgs.delete(id);
  renderFrames(); renderFramedPreview();
}

//==================== OPENING SLIDERS ====================
function setOpeningSliders(o){
  [['fr_l', o.l], ['fr_t', o.t], ['fr_r', o.r], ['fr_b', o.b]].forEach(([id, v]) => {
    const el = document.getElementById(id); if (el) el.value = Math.round(v * 100);
    const s = document.getElementById(id + '_v'); if (s) s.textContent = Math.round(v * 100) + '%';
  });
}
function readOpeningSliders(){
  const g = id => +((document.getElementById(id) || { value: 16 }).value) / 100;
  return { l: g('fr_l'), t: g('fr_t'), r: g('fr_r'), b: g('fr_b') };
}
async function onOpeningChange(){
  if (!_activeFrame) return;
  _activeFrame.opening = readOpeningSliders();
  ['fr_l', 'fr_t', 'fr_r', 'fr_b'].forEach(id => { const el = document.getElementById(id), s = document.getElementById(id + '_v'); if (el && s) s.textContent = el.value + '%'; });
  await fPut(_activeFrame);
  renderFramedPreview();
}
async function autoDetectActiveFrame(){
  if (!_activeFrame){ toast('Select a frame first'); return; }
  const img = _frameImgs.get(_activeFrame.id); if (!img) return;
  const det = detectOpening(img);
  _activeFrame.opening = det.opening; _activeFrame.frameOnTop = det.frameOnTop;
  setOpeningSliders(det.opening); await fPut(_activeFrame); renderFramedPreview();
  toast('Opening auto-detected');
}

async function rotateActiveFrame(){
  if (!_activeFrame){ toast('Select a frame first'); return; }
  _activeFrame.rotate = !_activeFrame.rotate;
  await fPut(_activeFrame);
  renderFramedPreview();
  toast(_activeFrame.rotate ? 'Frame rotated 90 (landscape)' : 'Frame upright (portrait)');
}

//==================== SOURCE ART ====================
async function useLatestPreview(){
  const r = window.getLastRecipe && getLastRecipe();
  if (!r){ toast('Preview something in the Formula tab first'); return; }
  toast('Rendering art...');
  _artCanvas = await renderFull(r);
  renderFramedPreview();
}
function frSrcMode(mode){ _srcMode = mode; renderSourcePicker(); }

// Frame ANY image file from disk.
function _loadArtFile(file){
  loadImgFromBlob(file).then(({ img, url }) => {
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext('2d').drawImage(img, 0, 0); URL.revokeObjectURL(url);
    _artCanvas = c; renderFramedPreview(); toast('Loaded image to frame');
  }).catch(() => toast('Could not load that image'));
}

async function renderSourcePicker(){
  const strip = document.getElementById('fr_src'); if (!strip) return;
  strip.innerHTML = '';
  if (_srcMode === 'library'){
    const lib = window.loadLibraryImages ? await loadLibraryImages() : [];
    if (!lib.length){ strip.innerHTML = '<span class="muted">Library empty - import references first.</span>'; return; }
    for (const o of lib){
      const im = document.createElement('img'); im.src = o.img.src; im.className = 'fr-srcthumb'; im.title = (o.tags || []).join(', ');
      im.addEventListener('click', () => {
        _artCanvas = o.img;
        strip.querySelectorAll('img').forEach(i => i.classList.remove('sel')); im.classList.add('sel');
        renderFramedPreview();
      });
      strip.appendChild(im);
    }
    return;
  }
  const items = window.galleryAll ? await galleryAll() : [];
  if (!items.length){ strip.innerHTML = '<span class="muted">No gallery images yet - generate a series, upload, or pick from Library.</span>'; return; }
  items.sort((a, b) => b.batch - a.batch);
  for (const it of items.slice(0, 60)){
    const url = URL.createObjectURL(it.blob); _frameUrls.push(url);
    const im = document.createElement('img'); im.src = url; im.className = 'fr-srcthumb'; im.title = 'edition ' + it.index;
    im.addEventListener('click', async () => {
      toast('Rendering art...');
      try { _artCanvas = await renderFull(decodeRecipe(it.code)); }
      catch (e){ const { img } = await loadImgFromBlob(it.blob); const cc = document.createElement('canvas'); cc.width = img.naturalWidth; cc.height = img.naturalHeight; cc.getContext('2d').drawImage(img, 0, 0); _artCanvas = cc; }
      strip.querySelectorAll('img').forEach(i => i.classList.remove('sel')); im.classList.add('sel');
      renderFramedPreview();
    });
    strip.appendChild(im);
  }
}

//==================== COMPOSE ====================
function coverDraw(ctx, src, x, y, w, h){
  const iw = src.naturalWidth || src.width, ih = src.naturalHeight || src.height;
  const tr = w / h, ar = iw / ih; let sw, sh, sx, sy;
  if (ar > tr){ sh = ih; sw = ih * tr; sx = (iw - sw) / 2; sy = 0; }
  else { sw = iw; sh = iw / tr; sx = 0; sy = (ih - sh) / 2; }
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.drawImage(src, sx, sy, sw, sh, x, y, w, h); ctx.restore();
}
function composeFramed(longSide){
  const fr = _activeFrame, img = _frameImgs.get(fr.id);
  const rot = fr.rotate ? 90 : 0;                 // rotate the frame 90 CW for landscape
  const fw = img.naturalWidth, fh = img.naturalHeight;
  const scale = longSide / Math.max(fw, fh);
  const W = Math.round((rot ? fh : fw) * scale), H = Math.round((rot ? fw : fh) * scale);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = (document.getElementById('fr_mat') || { value: '#000000' }).value;
  ctx.fillRect(0, 0, W, H);
  // rotate the opening insets to match a 90 CW frame turn
  const o = rot ? { l: fr.opening.b, t: fr.opening.l, r: fr.opening.t, b: fr.opening.r } : fr.opening;
  const ox = o.l * W, oy = o.t * H, ow = Math.max(1, (1 - o.l - o.r) * W), oh = Math.max(1, (1 - o.t - o.b) * H);
  const drawArt = () => { if (_artCanvas) coverDraw(ctx, _artCanvas, ox, oy, ow, oh); };
  const drawFrame = () => {
    if (!rot){ ctx.drawImage(img, 0, 0, W, H); return; }
    ctx.save(); ctx.translate(W, 0); ctx.rotate(Math.PI / 2); ctx.drawImage(img, 0, 0, H, W); ctx.restore();
  };
  if (fr.frameOnTop){ drawArt(); drawFrame(); } else { drawFrame(); drawArt(); }
  return c;
}
function renderFramedPreview(){
  const cv = document.getElementById('fr_preview'); if (!cv) return;
  const ctx = cv.getContext('2d');
  if (!_activeFrame || !_frameImgs.get(_activeFrame.id)){
    cv.width = 400; cv.height = 300; ctx.clearRect(0, 0, 400, 300);
    ctx.fillStyle = '#8f9678'; ctx.font = '14px Segoe UI, sans-serif';
    ctx.fillText(_activeFrame ? 'loading frame...' : 'Select a frame + a source image', 20, 150);
    return;
  }
  const c = composeFramed(700);
  cv.width = c.width; cv.height = c.height; ctx.drawImage(c, 0, 0);
}
async function downloadFramed(){
  if (!_activeFrame){ toast('Select a frame'); return; }
  if (!_artCanvas){ toast('Pick a source image (gallery thumb or "Use latest preview")'); return; }
  downloadCanvas(composeFramed(1600), 'framed_' + Date.now() + '.png');
  toast('Framed image saved');
}

//==================== INIT ====================
(function initFrames(){
  const tab = document.querySelector('.tab[data-tab="frame"]');
  if (tab) tab.addEventListener('click', () => { renderFrames(); renderSourcePicker(); });
  const ff = document.getElementById('frameFileInput'); if (ff) ff.addEventListener('change', () => { importFrameFiles(ff.files); ff.value = ''; });
  const fd = document.getElementById('frameFolderInput'); if (fd) fd.addEventListener('change', () => { importFrameFiles(fd.files); fd.value = ''; });
  ['fr_l', 'fr_t', 'fr_r', 'fr_b'].forEach(id => { const el = document.getElementById(id); if (el) el.addEventListener('input', onOpeningChange); });
  const mat = document.getElementById('fr_mat'); if (mat) mat.addEventListener('input', renderFramedPreview);
  const fa = document.getElementById('frameArtInput');
  if (fa) fa.addEventListener('change', () => { if (fa.files[0]) _loadArtFile(fa.files[0]); fa.value = ''; });
})();
