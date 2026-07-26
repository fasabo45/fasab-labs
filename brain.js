//==================== SERIES FORGE - AESTHETIC BRAIN ====================
// Analyzes library images grouped into "mood boards": extracts a colour/light/
// texture fingerprint, aggregates it, and (via prompts.js) generates prompts.
// Depends on forge.js (dbGetAll, toast, showTab) + engine.js (loadLibraryImages,
// setPinnedRefs) + prompts.js (generateMoodPrompt, colorName).

//==================== IMAGE ANALYSIS ====================
const _analysisCache = new Map();   // imageId -> features (per session)

// Downsample an <img> and derive an aesthetic feature set.
function analyzeImage(img){
  const N = 48;
  const c = document.createElement('canvas'); c.width = N; c.height = N;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, N, N);
  const d = ctx.getImageData(0, 0, N, N).data;
  const n = N * N;

  let sumL = 0, sumL2 = 0, sumSat = 0, sumWarm = 0;
  let sumRG = 0, sumRG2 = 0, sumYB = 0, sumYB2 = 0;   // for colourfulness
  const lum = new Float32Array(n);
  const buckets = new Map();                           // quantised colour -> {r,g,b,c}

  for (let i = 0, p = 0; i < d.length; i += 4, p++){
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const l = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    lum[p] = l; sumL += l; sumL2 += l * l;

    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    sumSat += mx === 0 ? 0 : (mx - mn) / mx;
    sumWarm += (r - b) / 255;

    const rg = r - g, yb = 0.5 * (r + g) - b;
    sumRG += rg; sumRG2 += rg * rg; sumYB += yb; sumYB2 += yb * yb;

    const q = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
    const bk = buckets.get(q) || { r: 0, g: 0, b: 0, c: 0 };
    bk.r += r; bk.g += g; bk.b += b; bk.c++; buckets.set(q, bk);
  }

  let edge = 0;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++){
    const p = y * N + x;
    if (x < N - 1) edge += Math.abs(lum[p] - lum[p + 1]);
    if (y < N - 1) edge += Math.abs(lum[p] - lum[p + N]);
  }

  const meanL = sumL / n;
  const stdRG = Math.sqrt(Math.max(0, sumRG2 / n - (sumRG / n) ** 2));
  const stdYB = Math.sqrt(Math.max(0, sumYB2 / n - (sumYB / n) ** 2));
  const meanRG = Math.abs(sumRG / n), meanYB = Math.abs(sumYB / n);
  const colourful = (Math.sqrt(stdRG * stdRG + stdYB * stdYB)
                    + 0.3 * Math.sqrt(meanRG * meanRG + meanYB * meanYB)) / 120;

  return {
    brightness: meanL,
    contrast: Math.sqrt(Math.max(0, sumL2 / n - meanL * meanL)),
    saturation: sumSat / n,
    warmth: sumWarm / n,                  // ~ -0.5..0.5
    detail: edge / (2 * n),
    colorfulness: Math.min(1, colourful),
    buckets,
  };
}

function cachedAnalysis(id, img){
  if (!_analysisCache.has(id)) _analysisCache.set(id, analyzeImage(img));
  return _analysisCache.get(id);
}

// Top-k representative colours from merged colour buckets.
function topPalette(buckets, k){
  return [...buckets.values()]
    .sort((a, b) => b.c - a.c)
    .slice(0, k)
    .map(bk => ({ r: Math.round(bk.r / bk.c), g: Math.round(bk.g / bk.c), b: Math.round(bk.b / bk.c) }));
}

// Average per-image features into one board aesthetic.
function aggregate(list){
  const avg = k => list.reduce((s, o) => s + o[k], 0) / list.length;
  const merged = new Map();
  for (const o of list) for (const [q, bk] of o.buckets){
    const m = merged.get(q) || { r: 0, g: 0, b: 0, c: 0 };
    m.r += bk.r; m.g += bk.g; m.b += bk.b; m.c += bk.c; merged.set(q, m);
  }
  return {
    brightness: avg('brightness'), contrast: avg('contrast'), saturation: avg('saturation'),
    warmth: avg('warmth'), detail: avg('detail'), colorfulness: avg('colorfulness'),
    palette: topPalette(merged, 6),
  };
}

//==================== MOOD BOARD PERSISTENCE ====================
const MB_KEY = 'forge_moodboards';
function loadBoards(){ try { return JSON.parse(localStorage.getItem(MB_KEY)) || []; } catch (_) { return []; } }
function saveBoards(a){ localStorage.setItem(MB_KEY, JSON.stringify(a)); }

let _mbSelected = new Set();   // image ids in the current editor
let _mbCurrentId = null;       // id of board being edited (null = new)
let _mbAesthetic = null;       // last analysis result
let _mbTags = [];

//==================== PICKER + LIST RENDER ====================
async function renderPicker(){
  const grid = document.getElementById('mb_picker');
  if (!grid) return;
  const lib = await loadLibraryImages();
  grid.innerHTML = '';
  if (!lib.length){ grid.innerHTML = '<p class="muted">Library is empty - import references first.</p>'; updateCount(); return; }
  for (const o of lib){
    const d = document.createElement('div');
    d.className = 'pick' + (_mbSelected.has(o.id) ? ' sel' : '');
    d.innerHTML = '<img src="' + o.img.src + '" alt=""><span class="tick"></span>';
    d.addEventListener('click', () => {
      if (_mbSelected.has(o.id)) _mbSelected.delete(o.id); else _mbSelected.add(o.id);
      d.classList.toggle('sel'); updateCount();
    });
    grid.appendChild(d);
  }
  updateCount();
}

function updateCount(){
  const el = document.getElementById('mb_count');
  if (el) el.textContent = _mbSelected.size + ' selected';
}

function renderBoardList(){
  const wrap = document.getElementById('mb_list');
  if (!wrap) return;
  const boards = loadBoards();
  wrap.innerHTML = boards.length ? '' : '<p class="muted">No mood boards yet. Pick images and Save.</p>';
  for (const b of boards){
    const item = document.createElement('div');
    item.className = 'mb-item' + (b.id === _mbCurrentId ? ' active' : '');
    const label = document.createElement('div');
    label.className = 'mbn';
    label.innerHTML = b.name + ' <span class="mbc">(' + b.imageIds.length + ' imgs)</span>';
    label.style.cursor = 'pointer';
    label.addEventListener('click', () => loadBoardIntoEditor(b.id));
    const del = document.createElement('button');
    del.className = 'danger'; del.textContent = 'Delete';
    del.addEventListener('click', () => deleteBoard(b.id));
    item.append(label, del);
    wrap.appendChild(item);
  }
}

//==================== MOOD BOARD ACTIONS ====================
function mbSelectAll(on){
  const grid = document.getElementById('mb_picker');
  if (on){
    grid.querySelectorAll('.pick').forEach((d, i) => d.classList.add('sel'));
    loadLibraryImages().then(lib => { lib.forEach(o => _mbSelected.add(o.id)); updateCount(); });
  } else {
    _mbSelected.clear();
    grid.querySelectorAll('.pick').forEach(d => d.classList.remove('sel'));
    updateCount();
  }
}

function newMoodBoard(){
  _mbCurrentId = null; _mbSelected.clear();
  const nm = document.getElementById('mb_name'); if (nm) nm.value = '';
  _mbAesthetic = null; _mbTags = [];
  document.getElementById('mb_readout').innerHTML = 'Select images, Save, then Analyze.';
  document.getElementById('pg_out').textContent = '- generate a prompt -';
  renderPicker(); renderBoardList();
}

function saveMoodBoard(){
  const name = (document.getElementById('mb_name').value || '').trim();
  if (!name){ toast('Name the board first'); return; }
  const ids = [..._mbSelected];
  if (!ids.length){ toast('Pick at least one image'); return; }
  const boards = loadBoards();
  let b = _mbCurrentId != null ? boards.find(x => x.id === _mbCurrentId) : null;
  if (b){ b.name = name; b.imageIds = ids; }
  else { b = { id: Date.now(), name, imageIds: ids, createdAt: Date.now(), aesthetic: null, prompt: '' }; boards.push(b); _mbCurrentId = b.id; }
  saveBoards(boards); renderBoardList();
  toast('Saved "' + name + '"');
}

function loadBoardIntoEditor(id){
  const b = loadBoards().find(x => x.id === id);
  if (!b) return;
  _mbCurrentId = b.id;
  _mbSelected = new Set(b.imageIds);
  document.getElementById('mb_name').value = b.name;
  if (b.prompt) document.getElementById('pg_out').textContent = b.prompt;
  renderPicker(); renderBoardList();
  analyzeCurrentBoard();
}

function deleteBoard(id){
  const boards = loadBoards().filter(x => x.id !== id);
  saveBoards(boards);
  if (_mbCurrentId === id) newMoodBoard();
  else renderBoardList();
  toast('Board deleted');
}

async function aggregateTags(ids){
  const items = await dbGetAll();
  const freq = new Map();
  items.filter(it => ids.includes(it.id)).forEach(it => (it.tags || []).forEach(t => freq.set(t, (freq.get(t) || 0) + 1)));
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).map(e => e[0]);
}

async function analyzeCurrentBoard(){
  const ids = [..._mbSelected];
  if (!ids.length){ toast('Pick images to analyze'); return; }
  const lib = await loadLibraryImages();
  const byId = new Map(lib.map(o => [o.id, o]));
  const list = [];
  for (const id of ids){ const o = byId.get(id); if (o) list.push(cachedAnalysis(id, o.img)); }
  if (!list.length){ toast('Those images are not loaded'); return; }
  _mbAesthetic = aggregate(list);
  _mbTags = await aggregateTags(ids);
  renderReadout(_mbAesthetic, _mbTags);
  if (_mbCurrentId != null){
    const boards = loadBoards(); const b = boards.find(x => x.id === _mbCurrentId);
    if (b){ b.aesthetic = _mbAesthetic; saveBoards(boards); }
  }
  toast('Analyzed ' + list.length + ' images');
}

//==================== READOUT RENDER ====================
function _bar(label, val){
  const pct = Math.round(Math.min(1, Math.max(0, val)) * 100);
  return '<div class="metric"><div class="lab"><span>' + label + '</span><span>' + pct + '%</span></div>' +
         '<div class="bar"><div class="fill" style="width:' + pct + '%"></div></div></div>';
}
function _word(v, t, words){ let i = 0; while (i < t.length && v >= t[i]) i++; return words[i]; }

function renderReadout(a, tags){
  const el = document.getElementById('mb_readout');
  const sw = a.palette.map(c => '<span class="swatch" style="background:rgb(' + c.r + ',' + c.g + ',' + c.b + ')" title="' + colorName(c.r, c.g, c.b) + '"></span>').join('');
  const wn = Math.min(1, Math.max(0, a.warmth + 0.5));
  const chips = [
    _word(a.brightness, [0.3, 0.55, 0.75], ['dark', 'dim', 'bright', 'luminous']),
    _word(a.saturation, [0.15, 0.35, 0.55], ['muted', 'restrained', 'saturated', 'vivid']),
    _word(a.contrast, [0.1, 0.18, 0.26], ['flat', 'soft', 'punchy', 'high-contrast']),
    _word(wn, [0.42, 0.5, 0.62], ['cool', 'neutral', 'warm', 'hot']),
    _word(a.detail, [0.08, 0.15, 0.25], ['minimal', 'clean', 'textured', 'busy']),
  ].map(w => '<span class="chip">' + w + '</span>').join('');
  const tagChips = (tags || []).slice(0, 8).map(t => '<span class="chip" style="background:#20261a;color:var(--muted)">#' + t + '</span>').join('');
  el.innerHTML =
    '<div class="swatches">' + sw + '</div>' +
    _bar('Brightness', a.brightness) +
    _bar('Contrast', a.contrast * 3) +
    _bar('Saturation', a.saturation) +
    _bar('Warmth', wn) +
    _bar('Detail / texture', a.detail * 3.5) +
    _bar('Colorfulness', a.colorfulness) +
    '<div class="chips">' + chips + '</div>' +
    (tagChips ? '<div class="chips">' + tagChips + '</div>' : '');
}

//==================== PROMPT GENERATOR ACTIONS ====================
function genPrompt(){
  if (!_mbAesthetic){ toast('Analyze a board first'); return; }
  const opts = {
    subject: document.getElementById('pg_subject').value,
    style: document.getElementById('pg_style').value,
  };
  const p = generateMoodPrompt(_mbAesthetic, _mbTags, opts, Math.random);
  document.getElementById('pg_out').textContent = p;
  if (_mbCurrentId != null){
    const boards = loadBoards(); const b = boards.find(x => x.id === _mbCurrentId);
    if (b){ b.prompt = p; saveBoards(boards); }
  }
}

function copyPrompt(){
  const txt = document.getElementById('pg_out').textContent;
  if (!txt || txt.startsWith('-')){ toast('Generate a prompt first'); return; }
  navigator.clipboard.writeText(txt).then(() => toast('Prompt copied'), () => toast('Copy failed'));
}

//==================== AESTHETIC -> FORMULA ====================
function clampv(v, lo, hi){ return v < lo ? lo : v > hi ? hi : v; }

// Pick the single best-matching grade for an analyzed aesthetic.
function pickGrade(a){
  const wn = a.warmth + 0.5;
  const top = (a.palette && a.palette[0]) || null;
  const h = top ? _hue(top.r, top.g, top.b) : -1;
  if (a.saturation < 0.14) return a.contrast > 0.2 ? 'noir' : 'mono';
  if (h >= 80 && h <= 170 && a.brightness < 0.5 && a.saturation > 0.2) return 'nvg';
  if (a.contrast > 0.24 && a.saturation < 0.35) return 'bleach';
  if (wn > 0.6) return a.saturation < 0.4 ? 'sepia' : 'cod';
  if (wn < 0.42) return a.saturation < 0.3 ? 'vhs' : 'cod';
  if (a.colorfulness > 0.6 && a.brightness > 0.5) return 'none';
  return 'cod';
}

// Translate an aesthetic into Formula look controls and write them to the form.
function applyAestheticToFormula(a){
  if (!a) return null;
  const grade = pickGrade(a);
  const gradeAmt = Math.round(clampv(40 + (1 - a.saturation) * 40 + a.contrast * 60, 20, 100));
  const grain = Math.round(clampv(a.detail * 180 + (1 - a.brightness) * 20, 0, 100));
  const vig = Math.round(clampv((1 - a.brightness) * 90 + a.contrast * 60, 0, 100));
  const glitch = Math.round(clampv(a.detail * 60, 0, 40));
  const scan = a.brightness < 0.4 || grade === 'vhs' || grade === 'nvg' || grade === 'noir';
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
  set('f_grade', grade); set('f_gradeAmt', gradeAmt); set('f_grain', grain);
  set('f_vig', vig); set('f_glitch', glitch);
  const sc = document.getElementById('f_scan'); if (sc) sc.checked = scan;
  if (window.refreshLabels) refreshLabels();
  return { grade, gradeAmt, grain, vig, glitch };
}

// Apply the analyzed look to the Formula tab (analyzing first if needed).
async function useAestheticInFormula(){
  if (!_mbAesthetic) await analyzeCurrentBoard();
  if (!_mbAesthetic) return;
  const s = applyAestheticToFormula(_mbAesthetic);
  showTab('formula');
  if (window.previewOne) previewOne();
  toast('Applied look: ' + s.grade + ' grade, grain ' + s.grain + ', vig ' + s.vig);
}

// Full send: pin the board's images AND apply its analyzed look, then preview.
async function forgeThisMood(){
  const ids = [..._mbSelected];
  if (!ids.length){ toast('Select a mood board first'); return; }
  if (!_mbAesthetic) await analyzeCurrentBoard();
  if (window.setPinnedRefs) setPinnedRefs(ids);
  if (_mbAesthetic) applyAestheticToFormula(_mbAesthetic);
  showTab('formula');
  if (window.previewOne) previewOne();
  toast('Forging ' + ids.length + ' refs + aesthetic');
}

//==================== AUTO-GROUP BY AESTHETIC ====================
let _lastGroups = [];

function _hue(r, g, b){
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (!d) return 0;
  let h; if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
  h *= 60; return h < 0 ? h + 360 : h;
}

// Build a normalised 8-D aesthetic vector (hue is weighted by saturation).
function featureVector(a){
  const wn = Math.min(1, Math.max(0, a.warmth + 0.5));
  const top = topPalette(a.buckets, 1)[0] || { r: 0, g: 0, b: 0 };
  const hr = _hue(top.r, top.g, top.b) * Math.PI / 180;
  return [
    a.brightness, Math.min(1, a.contrast * 2.5), a.saturation, wn,
    Math.min(1, a.detail * 3), a.colorfulness,
    0.6 * Math.cos(hr) * a.saturation, 0.6 * Math.sin(hr) * a.saturation,
  ];
}

function _dist2(a, b){ let s = 0; for (let i = 0; i < a.length; i++){ const d = a[i] - b[i]; s += d * d; } return s; }

// Seeded k-means++ so the same library groups the same way each run.
function kmeans(vecs, k, rng){
  const n = vecs.length; k = Math.min(k, n);
  const cents = [vecs[Math.floor(rng() * n)].slice()];
  while (cents.length < k){
    const d = vecs.map(v => Math.min(...cents.map(c => _dist2(v, c))));
    const sum = d.reduce((a, b) => a + b, 0) || 1;
    let r = rng() * sum, idx = 0;
    for (; idx < n; idx++){ r -= d[idx]; if (r <= 0) break; }
    cents.push(vecs[Math.min(idx, n - 1)].slice());
  }
  const assign = new Array(n).fill(0);
  for (let it = 0; it < 12; it++){
    for (let i = 0; i < n; i++){
      let best = 0, bd = Infinity;
      for (let c = 0; c < k; c++){ const dd = _dist2(vecs[i], cents[c]); if (dd < bd){ bd = dd; best = c; } }
      assign[i] = best;
    }
    const dim = vecs[0].length;
    const sums = Array.from({ length: k }, () => new Array(dim).fill(0));
    const cnt = new Array(k).fill(0);
    for (let i = 0; i < n; i++){ const c = assign[i]; cnt[c]++; for (let j = 0; j < dim; j++) sums[c][j] += vecs[i][j]; }
    for (let c = 0; c < k; c++){
      if (cnt[c] === 0){ cents[c] = vecs[Math.floor(rng() * n)].slice(); continue; }
      for (let j = 0; j < dim; j++) cents[c][j] = sums[c][j] / cnt[c];
    }
  }
  return assign;
}

function groupName(a){
  const wn = Math.min(1, Math.max(0, a.warmth + 0.5));
  const light = _word(a.brightness, [0.3, 0.55, 0.75], ['Dark', 'Dim', 'Bright', 'Luminous']);
  const temp  = _word(wn, [0.42, 0.5, 0.62], ['Cool', 'Neutral', 'Warm', 'Hot']);
  const tex   = _word(a.detail, [0.08, 0.15, 0.25], ['Minimal', 'Clean', 'Textured', 'Busy']);
  return [light, temp, tex].join(' / ');
}

// Shared aesthetic clustering -> {lib, groups}. Reused by the Library auto-group
// view and the Source tab pool builder (DRY).
async function computeGroups(k){
  const lib = await loadLibraryImages();
  if (lib.length < 2) return { lib, groups: [] };
  k = Math.min(k, lib.length);
  const analyses = lib.map(o => cachedAnalysis(o.id, o.img));
  const vecs = analyses.map(featureVector);
  const assign = kmeans(vecs, k, makeRng('autogroup-' + lib.length + '-' + k));
  const groups = [];
  for (let c = 0; c < k; c++){
    const idxs = [];
    assign.forEach((a, i) => { if (a === c) idxs.push(i); });
    if (!idxs.length) continue;
    const aes = aggregate(idxs.map(i => analyses[i]));
    groups.push({ name: groupName(aes), ids: idxs.map(i => lib[i].id), imgs: idxs.map(i => lib[i].img.src), aesthetic: aes });
  }
  groups.sort((a, b) => b.ids.length - a.ids.length);
  return { lib, groups };
}
window.computeGroups = computeGroups;
window.getMoodBoards = () => loadBoards();

async function autoGroupLibrary(){
  const k = +document.getElementById('ag_k').value;
  const { lib, groups } = await computeGroups(k);
  if (lib.length < 2){ toast('Need at least 2 images to group'); return; }
  _lastGroups = groups;
  renderAutoGroups(groups);
  toast('Grouped into ' + groups.length + ' aesthetics');
}

function renderAutoGroups(groups){
  const wrap = document.getElementById('autogroups');
  wrap.innerHTML = '';
  groups.forEach((g, gi) => {
    const sw = g.aesthetic.palette.slice(0, 5)
      .map(c => '<span class="swatch" style="width:22px;height:22px;background:rgb(' + c.r + ',' + c.g + ',' + c.b + ')"></span>').join('');
    const thumbs = g.imgs.map(src => '<img src="' + src + '" class="agthumb" alt="">').join('');
    const el = document.createElement('div');
    el.className = 'agroup';
    el.innerHTML =
      '<div class="aghead">' +
        '<span class="agname">' + g.name + '</span>' +
        '<span class="swatches" style="margin:0">' + sw + '</span>' +
        '<span class="agn">' + g.ids.length + ' imgs</span>' +
        '<span style="flex:1"></span>' +
        '<button class="ghost" onclick="saveGroupAsBoard(' + gi + ')">Save as board</button>' +
        '<button class="ghost" onclick="tagGroup(' + gi + ')">Tag</button>' +
      '</div>' +
      '<div class="agthumbs">' + thumbs + '</div>';
    wrap.appendChild(el);
  });
}

function saveGroupAsBoard(gi){
  const g = _lastGroups[gi]; if (!g) return;
  const boards = loadBoards();
  const name = g.name + ' (' + g.ids.length + ')';
  boards.push({ id: Date.now() + gi, name, imageIds: g.ids.slice(), createdAt: Date.now(), aesthetic: g.aesthetic, prompt: '' });
  saveBoards(boards); renderBoardList();
  toast('Saved board "' + name + '"');
}

async function tagGroup(gi){
  const g = _lastGroups[gi]; if (!g) return;
  const tag = g.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  for (const id of g.ids){
    const rec = await dbGet(id); if (!rec) continue;
    rec.tags = rec.tags || [];
    if (!rec.tags.includes(tag)) rec.tags.push(tag);
    await dbPut(rec);
  }
  toast('Tagged ' + g.ids.length + ' images "' + tag + '"');
  if (window.renderLibrary) renderLibrary();
}

//==================== INIT ====================
function initBrain(){
  const tab = document.querySelector('.tab[data-tab="brain"]');
  if (tab) tab.addEventListener('click', () => { renderPicker(); renderBoardList(); });
  const agk = document.getElementById('ag_k'), agv = document.getElementById('ag_k_v');
  if (agk && agv) agk.addEventListener('input', () => { agv.textContent = agk.value; });
  renderBoardList();
}
initBrain();
