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
    if (stat) stat.textContent = 'Gallery empty - generate a series and it auto-archives here.';
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
      bar.append(dl, del); cell.append(bar);
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
