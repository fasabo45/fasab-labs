//==================== SERIES FORGE - GALLERY / ARCHIVE ====================
// Every generated series is auto-archived here (thumbnail blob + formula code)
// in IndexedDB, so nothing is lost even when a browser blocks bulk downloads.
// Depends on forge.js (window.openDB, toast) + engine.js (renderFull,
// downloadCanvas, decodeRecipe, enlarge).

const G_STORE = 'gallery';
let _galUrls = [];   // object URLs for thumbnails, revoked on re-render

function gStore(mode){ return window.openDB().then(db => db.transaction(G_STORE, mode).objectStore(G_STORE)); }
function gReq(store, fn){ return new Promise((res, rej) => { const r = fn(store); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
function gAdd(rec){ return gStore('readwrite').then(s => gReq(s, st => st.add(rec))); }
function gGet(id){ return gStore('readonly').then(s => gReq(s, st => st.get(id))); }
function gGetAll(){ return gStore('readonly').then(s => gReq(s, st => st.getAll())).then(r => r || []); }
function gDelete(id){ return gStore('readwrite').then(s => gReq(s, st => st.delete(id))); }
function gClear(){ return gStore('readwrite').then(s => gReq(s, st => st.clear())); }
function gPut(rec){ return gStore('readwrite').then(s => gReq(s, st => st.put(rec))); }
window.galleryAll = gGetAll;   // frames.js source picker + evolve.js

//==================== CURATOR (Gay-Avant NFT scorer) ====================
// Scores each edition on aesthetic INTENSITY (Fasab's picks: vivid colour,
// bold contrast, maximalist detail, glitch/decay, holographic sheen). Hue-
// neutral (pink weight 0). Reuses analyzeImage + the recipe's glitch/decay.
// Calibrated from docs/gay_avant_nft.md: the genre is defined by MAXIMAL layered
// collage that DISRUPTS a subject, not by colour intensity.
const CURATE_WEIGHTS = { maximal: 1.0, disrupt: 0.9, collage: 0.9, distort: 0.8, color: 0.4, contrast: 0.35 };
const CURATE_TOP = 20;
let _curated = false;
let _scores = new Map();

function _imgFromBlob(blob){
  return new Promise((res, rej) => {
    const u = URL.createObjectURL(blob); const i = new Image();
    i.onload = () => res({ img: i, url: u });
    i.onerror = () => { URL.revokeObjectURL(u); rej(new Error('img')); };
    i.src = u;
  });
}
// Heart/Like toggle for the evolve.js feedback loop.
function _likeBtn(it){
  const b = document.createElement('button');
  b.className = 'ghost' + (it.liked ? ' liked' : '');
  b.textContent = it.liked ? 'Liked' : 'Like';
  b.addEventListener('click', async e => {
    e.stopPropagation();
    it.liked = !it.liked; await gPut(it);
    b.textContent = it.liked ? 'Liked' : 'Like'; b.classList.toggle('liked', it.liked);
    if (window.onVibeLikesChanged) onVibeLikesChanged();
  });
  return b;
}
function scoreAesthetic(a, recipe){
  const g = (recipe && recipe.glitch || 0) / 100;
  const dc = (recipe && recipe.decay || 0) / 100;
  const frags = recipe ? (recipe.fragments || 0) : 0;
  const hasSubj = !!(recipe && recipe.subject);
  const alter = hasSubj ? (recipe.alter != null ? recipe.alter : 60) / 100 : 0;
  const layered = recipe && (recipe.layout === 'stack' || recipe.layout === 'scatter') ? 1 : 0.4;
  const detail = Math.min(1, a.detail / 0.25);
  const s = {
    // schizocollage / trait-maxing / formal superabundance
    maximal:  Math.min(1, 0.55 * detail + 0.45 * Math.min(1, frags / 24)),
    // obscuring / distorting a central subject (the signature Mifella move)
    disrupt:  (hasSubj ? 1 : 0.35) * Math.min(1, 0.5 * alter + 0.3 * dc + 0.2 * g),
    // layered collage of disparate appropriated elements
    collage:  Math.min(1, layered * (0.5 + 0.5 * Math.min(1, frags / 16))),
    // distortion / glitch / digital decay ("distorted and abused")
    distort:  Math.min(1, 0.6 * dc + 0.6 * g),
    // colour energy - secondary (genre spans pastel Milady to lurid)
    color:    Math.min(1, 0.5 * a.saturation + 0.5 * a.colorfulness),
    contrast: Math.min(1, a.contrast / 0.3),
  };
  let num = 0, den = 0;
  for (const k in CURATE_WEIGHTS){ num += CURATE_WEIGHTS[k] * (s[k] || 0); den += CURATE_WEIGHTS[k]; }
  return den ? num / den : 0;
}

// Generic ranker: scoreFn(analysis, recipe, item) -> number. Reused by the
// avant Curator and evolve.js 'Rank: My Vibe'.
async function rankGallery(scoreFn){
  const items = await gGetAll();
  if (!items.length){ toast('Gallery empty - generate a series first'); return; }
  toast('Scoring ' + items.length + ' editions...');
  _scores = new Map();
  for (const it of items){
    let recipe = null, a = null;
    try { recipe = decodeRecipe(it.code); } catch (_) {}
    try { const { img, url } = await _imgFromBlob(it.blob); a = analyzeImage(img); URL.revokeObjectURL(url); } catch (_) {}
    _scores.set(it.id, a ? scoreFn(a, recipe, it) : 0);
  }
  _curated = true;
  renderGallery();
}
window.rankGallery = rankGallery;
function curateGallery(){ rankGallery((a, recipe) => scoreAesthetic(a, recipe)).then(() => toast('Ranked for gay-avant NFT')); }
function uncurate(){ _curated = false; renderGallery(); }

async function saveBestAsBoard(){
  if (!_curated){ toast('Press "Rank" first'); return; }
  const top = (await gGetAll()).sort((a, b) => (_scores.get(b.id) || 0) - (_scores.get(a.id) || 0)).slice(0, CURATE_TOP);
  const lib = window.loadLibraryImages ? await loadLibraryImages() : [];
  const libIds = new Set(lib.map(o => o.id));
  const ids = new Set();
  for (const it of top){ try { const r = decodeRecipe(it.code); (r.refs || r.pool || []).forEach(id => { if (libIds.has(id)) ids.add(id); }); } catch (_) {} }
  if (!ids.size){ toast('Top picks have no source images still in the library'); return; }
  if (typeof loadBoards !== 'function' || typeof saveBoards !== 'function'){ toast('Brain not loaded'); return; }
  const boards = loadBoards();
  boards.push({ id: Date.now(), name: 'Best of: Gay-Avant NFT (' + ids.size + ')', imageIds: [...ids], createdAt: Date.now(), aesthetic: null, prompt: '' });
  saveBoards(boards);
  toast('Saved "Best of" mood board - ' + ids.size + ' source images. Use it in the Source tab.');
}

//==================== ARCHIVE ====================
async function archiveGeneration(items){
  if (!items || !items.length) return;
  const batch = Date.now();
  for (const it of items){
    await gAdd({ batch, seed: it.seed, index: it.index, w: it.w, h: it.h, code: it.code, blob: it.blob, created: Date.now() });
  }
  if (document.getElementById('panel-gallery')) renderGallery();
}
window.archiveGeneration = archiveGeneration;

//==================== RENDER ====================
async function renderGallery(){
  const wrap = document.getElementById('gallery_archive');
  if (!wrap) return;
  _galUrls.forEach(u => URL.revokeObjectURL(u)); _galUrls = [];
  const items = await gGetAll();
  const stat = document.getElementById('gallery_stat');

  if (!items.length){
    wrap.innerHTML = '';
    _curated = false;
    if (stat) stat.textContent = 'Gallery empty - generate a series and it auto-archives here.';
    return;
  }

  if (_curated){                            // curated view: flat, best-first, scored
    const sorted = items.slice().sort((a, b) => (_scores.get(b.id) || 0) - (_scores.get(a.id) || 0));
    if (stat) stat.textContent = items.length + ' editions ranked best-first (top ' + CURATE_TOP + ' marked)';
    const grid = document.createElement('div'); grid.className = 'ggrid';
    sorted.forEach((it, rank) => {
      const url = URL.createObjectURL(it.blob); _galUrls.push(url);
      const cell = document.createElement('div'); cell.className = 'gcell';
      const sc = Math.round((_scores.get(it.id) || 0) * 100);
      const top = rank < CURATE_TOP;
      cell.innerHTML = '<img src="' + url + '" alt=""><span class="gscore' + (top ? ' gtop' : '') + '">' + (top ? '#' + (rank + 1) + ' ' : '') + sc + '%</span>';
      cell.querySelector('img').addEventListener('click', () => openArchive(it));
      const bar = document.createElement('div'); bar.className = 'gcell-bar';
      const dl = document.createElement('button'); dl.className = 'ghost'; dl.textContent = 'Download'; dl.addEventListener('click', () => downloadGalleryFull(it.id));
      const del = document.createElement('button'); del.className = 'danger'; del.textContent = 'x'; del.addEventListener('click', () => deleteGalleryItem(it.id));
      bar.append(_likeBtn(it), dl, del); cell.append(bar);
      grid.appendChild(cell);
    });
    wrap.innerHTML = ''; wrap.appendChild(grid);
    return;
  }

  const batches = new Map();
  items.forEach(it => { if (!batches.has(it.batch)) batches.set(it.batch, []); batches.get(it.batch).push(it); });
  const order = [...batches.keys()].sort((a, b) => b - a);
  if (stat) stat.textContent = items.length + ' images across ' + order.length + ' generation' + (order.length === 1 ? '' : 's');

  wrap.innerHTML = '';
  for (const b of order){
    const list = batches.get(b).sort((x, y) => x.index - y.index);
    const sec = document.createElement('div'); sec.className = 'gbatch';

    const head = document.createElement('div'); head.className = 'gbatch-head';
    head.innerHTML = '<span class="gbatch-title">' + new Date(b).toLocaleString() + '</span>' +
                     '<span class="agn">' + list.length + ' imgs</span><span style="flex:1"></span>';
    const dlAll = document.createElement('button'); dlAll.className = 'ghost'; dlAll.textContent = 'Download all';
    dlAll.addEventListener('click', () => downloadBatch(b));
    const delB = document.createElement('button'); delB.className = 'danger'; delB.textContent = 'Delete';
    delB.addEventListener('click', () => deleteBatch(b));
    head.append(dlAll, delB);

    const grid = document.createElement('div'); grid.className = 'ggrid';
    for (const it of list){
      const url = URL.createObjectURL(it.blob); _galUrls.push(url);
      const cell = document.createElement('div'); cell.className = 'gcell';
      cell.innerHTML = '<img src="' + url + '" alt="edition ' + it.index + '">';
      cell.querySelector('img').addEventListener('click', () => openArchive(it));
      const bar = document.createElement('div'); bar.className = 'gcell-bar';
      const dl = document.createElement('button'); dl.className = 'ghost'; dl.textContent = 'Download';
      dl.addEventListener('click', () => downloadGalleryFull(it.id));
      const del = document.createElement('button'); del.className = 'danger'; del.textContent = 'x'; del.title = 'Delete';
      del.addEventListener('click', () => deleteGalleryItem(it.id));
      bar.append(_likeBtn(it), dl, del); cell.append(bar);
      grid.appendChild(cell);
    }
    sec.append(head, grid); wrap.appendChild(sec);
  }
}

//==================== ACTIONS ====================
// Open full-res in the shared lightbox (re-render from code; fall back to thumb).
function openArchive(it){
  try { enlarge(decodeRecipe(it.code)); }
  catch (e){
    const lb = document.getElementById('lightbox');
    document.getElementById('lightboxImg').src = URL.createObjectURL(it.blob);
    lb.classList.add('show');
  }
}

// Re-render the edition full-resolution from its formula code and download it.
async function downloadGalleryFull(id){
  const rec = await gGet(id);
  if (!rec) return;
  try {
    const c = await renderFull(decodeRecipe(rec.code));
    downloadCanvas(c, 'forge_' + rec.seed + '_' + rec.index + '.png');
    toast('Downloaded edition ' + rec.index);
  } catch (e){
    // library changed / images gone -> fall back to the archived thumbnail
    const url = URL.createObjectURL(rec.blob);
    const a = document.createElement('a'); a.href = url; a.download = 'forge_' + rec.seed + '_' + rec.index + '.png';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    toast('Downloaded archived copy (library changed)');
  }
}

async function downloadBatch(batch){
  const items = (await gGetAll()).filter(it => it.batch === batch).sort((a, b) => a.index - b.index);
  toast('Downloading ' + items.length + ' editions...');
  for (const it of items){ await downloadGalleryFull(it.id); await new Promise(r => setTimeout(r, 400)); }
}

async function deleteGalleryItem(id){ await gDelete(id); renderGallery(); }

async function deleteBatch(batch){
  const items = (await gGetAll()).filter(it => it.batch === batch);
  for (const it of items) await gDelete(it.id);
  toast('Deleted generation'); renderGallery();
}

async function clearGallery(){
  const items = await gGetAll();
  if (!items.length){ toast('Gallery already empty'); return; }
  if (!confirm('Delete all ' + items.length + ' archived images? This cannot be undone.')) return;
  await gClear(); toast('Gallery cleared'); renderGallery();
}

//==================== INIT ====================
(function initGallery(){
  const tab = document.querySelector('.tab[data-tab="gallery"]');
  if (tab) tab.addEventListener('click', renderGallery);
})();
