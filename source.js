//==================== SERIES FORGE - SOURCE POOL ====================
// Build the pool of images the next preview/series draws from: pick specific
// images, aesthetic groups (brain), and/or mood boards - they combine (union).
// Applies live via window.setSeriesPool. Depends on engine.js(setSeriesPool,
// loadLibraryImages), brain.js(computeGroups, getMoodBoards).

let _srcBoards = new Set();     // selected board ids
let _srcGroups = [];           // last computed aesthetic groups
let _srcGroupSel = new Set();   // selected group indices
let _srcImages = new Set();     // individually selected image ids
let _srcUrls = [];

// Reflect the active pool in the Source count + the Series-tab note.
window.onPoolChanged = function(pool){
  const note = document.getElementById('s_source_note');
  if (note) note.textContent = pool && pool.length ? ('Source: ' + pool.length + ' selected images') : 'Source: whole library';
};

function unionIds(){
  const ids = new Set();
  const boards = window.getMoodBoards ? getMoodBoards() : [];
  boards.filter(b => _srcBoards.has(b.id)).forEach(b => (b.imageIds || []).forEach(id => ids.add(id)));
  _srcGroups.forEach((g, i) => { if (_srcGroupSel.has(i)) g.ids.forEach(id => ids.add(id)); });
  _srcImages.forEach(id => ids.add(id));
  return [...ids];
}

function applySource(){
  const ids = unionIds();
  if (window.setSeriesPool) setSeriesPool(ids.length ? ids : null);
  const el = document.getElementById('src_count');
  if (el) el.textContent = ids.length ? ('Source pool: ' + ids.length + ' images') : 'Source: whole library';
}

//==================== MOOD BOARDS ====================
function renderSourceBoards(){
  const wrap = document.getElementById('src_boards'); if (!wrap) return;
  const boards = window.getMoodBoards ? getMoodBoards() : [];
  wrap.innerHTML = boards.length ? '' : '<p class="muted">No mood boards yet - build them in the Brain tab.</p>';
  boards.forEach(b => {
    const row = document.createElement('label'); row.className = 'src-row';
    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = _srcBoards.has(b.id);
    cb.addEventListener('change', () => { cb.checked ? _srcBoards.add(b.id) : _srcBoards.delete(b.id); applySource(); });
    const span = document.createElement('span'); span.innerHTML = b.name + ' <span class="mbc">(' + (b.imageIds || []).length + ')</span>';
    row.append(cb, span); wrap.appendChild(row);
  });
}

//==================== AESTHETIC GROUPS ====================
async function computeSourceGroups(){
  if (!window.computeGroups){ toast('Brain not loaded'); return; }
  const k = +(document.getElementById('src_k') || { value: 3 }).value;
  toast('Grouping by aesthetic...');
  const { lib, groups } = await computeGroups(k);
  if (lib.length < 2){ toast('Need at least 2 images in the library'); return; }
  _srcGroups = groups; _srcGroupSel = new Set();
  renderSourceGroups(); applySource();
  toast('Found ' + groups.length + ' aesthetic groups');
}
function renderSourceGroups(){
  const wrap = document.getElementById('src_groups'); if (!wrap) return;
  wrap.innerHTML = _srcGroups.length ? '' : '<p class="muted">Press "Compute groups" to cluster the library by aesthetic.</p>';
  _srcGroups.forEach((g, i) => {
    const row = document.createElement('label'); row.className = 'src-row';
    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = _srcGroupSel.has(i);
    cb.addEventListener('change', () => { cb.checked ? _srcGroupSel.add(i) : _srcGroupSel.delete(i); applySource(); });
    const sw = ((g.aesthetic && g.aesthetic.palette) || []).slice(0, 4)
      .map(c => '<span class="swatch" style="width:16px;height:16px;background:rgb(' + c.r + ',' + c.g + ',' + c.b + ')"></span>').join('');
    const span = document.createElement('span');
    span.style.cssText = 'display:inline-flex;align-items:center;gap:6px';
    span.innerHTML = '<b>' + g.name + '</b> <span class="mbc">(' + g.ids.length + ')</span> ' + sw;
    row.append(cb, span); wrap.appendChild(row);
  });
}

//==================== INDIVIDUAL IMAGES ====================
async function renderSourceImages(){
  const grid = document.getElementById('src_images'); if (!grid) return;
  _srcUrls.forEach(u => URL.revokeObjectURL(u)); _srcUrls = [];
  const lib = window.loadLibraryImages ? await loadLibraryImages() : [];
  grid.innerHTML = lib.length ? '' : '<p class="muted">Library empty - import references first.</p>';
  for (const o of lib){
    const d = document.createElement('div');
    d.className = 'pick' + (_srcImages.has(o.id) ? ' sel' : '');
    d.innerHTML = '<img src="' + o.img.src + '" alt=""><span class="tick"></span>';
    d.addEventListener('click', () => {
      _srcImages.has(o.id) ? _srcImages.delete(o.id) : _srcImages.add(o.id);
      d.classList.toggle('sel'); applySource();
    });
    grid.appendChild(d);
  }
}
async function srcSelectAllImages(on){
  const lib = await loadLibraryImages();
  if (on) lib.forEach(o => _srcImages.add(o.id)); else _srcImages.clear();
  renderSourceImages(); applySource();
}

//==================== CLEAR ====================
function clearSource(){
  _srcBoards.clear(); _srcGroupSel.clear(); _srcImages.clear();
  applySource();
  renderSourceBoards(); renderSourceGroups(); renderSourceImages();
  toast('Source cleared - using whole library');
}

//==================== INIT ====================
(function initSource(){
  const tab = document.querySelector('.tab[data-tab="source"]');
  if (tab) tab.addEventListener('click', () => { renderSourceBoards(); renderSourceGroups(); renderSourceImages(); });
  const k = document.getElementById('src_k'), kv = document.getElementById('src_k_v');
  if (k && kv) k.addEventListener('input', () => kv.textContent = k.value);
  if (window.onPoolChanged) onPoolChanged(window.getSeriesPool ? getSeriesPool() : null);
})();
