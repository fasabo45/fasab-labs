//==================== SERIES FORGE ====================
// Pillar 1: the Reference Library (IndexedDB-backed, persistent).
// Formula + Series engines land next session.

//---------- tiny helpers ----------
function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 2200);
}

function showTab(name){
  document.querySelectorAll('.tab').forEach(el =>
    el.classList.toggle('active', el.dataset.tab === name));
  document.querySelectorAll('.panel').forEach(el =>
    el.classList.toggle('active', el.id === 'panel-' + name));
}

//==================== INDEXEDDB ====================
const DB_NAME = 'seriesForge';
const STORE = 'refs';
let _db = null;

function openDB(){
  return new Promise((resolve, reject) => {
    if (_db) return resolve(_db);
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)){
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = e => { _db = e.target.result; resolve(_db); };
    req.onerror = e => reject(e.target.error);
  });
}

function dbTx(mode){
  return openDB().then(db => db.transaction(STORE, mode).objectStore(STORE));
}

function dbAdd(record){
  return dbTx('readwrite').then(store => new Promise((resolve, reject) => {
    const r = store.add(record);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  }));
}

function dbGetAll(){
  return dbTx('readonly').then(store => new Promise((resolve, reject) => {
    const r = store.getAll();
    r.onsuccess = () => resolve(r.result || []);
    r.onerror = () => reject(r.error);
  }));
}

function dbGet(id){
  return dbTx('readonly').then(store => new Promise((resolve, reject) => {
    const r = store.get(id);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  }));
}

function dbPut(record){
  return dbTx('readwrite').then(store => new Promise((resolve, reject) => {
    const r = store.put(record);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  }));
}

function dbDelete(id){
  return dbTx('readwrite').then(store => new Promise((resolve, reject) => {
    const r = store.delete(id);
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  }));
}

function dbClear(){
  return dbTx('readwrite').then(store => new Promise((resolve, reject) => {
    const r = store.clear();
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  }));
}

//==================== IMAGE INTAKE ====================
// Read a File -> measure dimensions -> store the raw Blob + metadata.
function readImageMeta(file){
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const meta = { w: img.naturalWidth, h: img.naturalHeight };
      URL.revokeObjectURL(url);
      resolve(meta);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('not an image')); };
    img.src = url;
  });
}

async function importFiles(fileList){
  const files = [...fileList].filter(f => f.type.startsWith('image/'));
  if (!files.length){ toast('No images found in that drop'); return; }
  let ok = 0;
  for (const file of files){
    try {
      const meta = await readImageMeta(file);
      await dbAdd({
        name: file.name,
        type: file.type,
        tags: [],
        w: meta.w,
        h: meta.h,
        size: file.size,
        added: Date.now(),
        blob: file,            // IndexedDB stores Blobs natively
      });
      ok++;
    } catch (err) {
      console.warn('skip', file.name, err);
    }
  }
  toast(`Imported ${ok} image${ok === 1 ? '' : 's'}`);
  await renderLibrary();
}

//==================== LIBRARY RENDER ====================
let _objectUrls = [];   // track for cleanup

function clearObjectUrls(){
  _objectUrls.forEach(u => URL.revokeObjectURL(u));
  _objectUrls = [];
}

function fmtBytes(n){
  if (n < 1024) return n + ' B';
  if (n < 1048576) return (n / 1024).toFixed(0) + ' KB';
  return (n / 1048576).toFixed(1) + ' MB';
}

async function renderLibrary(){
  if (window.invalidateLib) window.invalidateLib();  // engine cache is now stale
  const grid = document.getElementById('libgrid');
  const stats = document.getElementById('libstats');
  const badge = document.getElementById('libBadge');
  clearObjectUrls();
  grid.innerHTML = '';

  const items = await dbGetAll();
  badge.textContent = `${items.length} ref${items.length === 1 ? '' : 's'}`;

  if (!items.length){
    stats.textContent = 'Library empty.';
    return;
  }

  const totalBytes = items.reduce((s, it) => s + (it.size || 0), 0);
  let est = '';
  if (navigator.storage && navigator.storage.estimate){
    try {
      const e = await navigator.storage.estimate();
      const pct = e.quota ? ((e.usage / e.quota) * 100).toFixed(1) : '?';
      est = ` - using ${fmtBytes(e.usage)} of browser quota (${pct}%)`;
    } catch (_) {}
  }
  stats.textContent = `${items.length} references - ${fmtBytes(totalBytes)} of image data${est}`;

  for (const it of items){
    const url = URL.createObjectURL(it.blob);
    _objectUrls.push(url);

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <img class="thumb" src="${url}" alt="${it.name}">
      <div class="meta">
        <span class="name" title="${it.name}">${it.name}</span>
        <span class="dim">${it.w}x${it.h} - ${fmtBytes(it.size || 0)}</span>
        <input class="tag" placeholder="tags (comma separated)" value="${(it.tags || []).join(', ')}">
        <button class="danger">Delete</button>
      </div>`;

    const tagInput = card.querySelector('input.tag');
    tagInput.addEventListener('change', async () => {
      const rec = await dbGet(it.id);
      rec.tags = tagInput.value.split(',').map(s => s.trim()).filter(Boolean);
      await dbPut(rec);
      toast('Tags saved');
    });

    card.querySelector('button.danger').addEventListener('click', async () => {
      await dbDelete(it.id);
      toast('Removed from library');
      await renderLibrary();
    });

    grid.appendChild(card);
  }
}

//==================== LIBRARY ACTIONS ====================
async function clearLibrary(){
  const items = await dbGetAll();
  if (!items.length){ toast('Already empty'); return; }
  if (!confirm(`Delete all ${items.length} references? This cannot be undone.`)) return;
  await dbClear();
  toast('Library cleared');
  await renderLibrary();
}

async function exportLibraryManifest(){
  const items = await dbGetAll();
  if (!items.length){ toast('Nothing to export'); return; }
  const manifest = items.map(it => ({
    id: it.id, name: it.name, tags: it.tags || [],
    w: it.w, h: it.h, size: it.size, added: it.added,
  }));
  const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'series_forge_library.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast(`Exported manifest (${manifest.length} refs)`);
}

//==================== WIRING ====================
function wireDropzone(){
  const dz = document.getElementById('dropzone');
  const input = document.getElementById('fileInput');

  dz.addEventListener('click', () => input.click());
  input.addEventListener('change', () => { importFiles(input.files); input.value = ''; });

  ['dragenter', 'dragover'].forEach(evt =>
    dz.addEventListener(evt, e => { e.preventDefault(); dz.classList.add('hot'); }));
  ['dragleave', 'drop'].forEach(evt =>
    dz.addEventListener(evt, e => { e.preventDefault(); dz.classList.remove('hot'); }));
  dz.addEventListener('drop', e => importFiles(e.dataTransfer.files));

  // allow dropping anywhere on the page too
  window.addEventListener('dragover', e => e.preventDefault());
  window.addEventListener('drop', e => {
    e.preventDefault();
    if (e.target.closest('#dropzone')) return; // already handled
    if (e.dataTransfer.files.length) importFiles(e.dataTransfer.files);
  });
}

//==================== INIT ====================
wireDropzone();
renderLibrary();
