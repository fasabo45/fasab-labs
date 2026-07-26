//==================== SERIES FORGE - EVOLVE (vibe feedback loop) ====================
// Like -> Learn -> Evolve -> repeat. Learns a personal profile from the gallery
// editions you HEART (their aesthetics + recipe params), then evolves fresh
// batches toward it with mutation, and can rank the gallery by YOUR vibe.
// Depends on gallery.js(galleryAll, rankGallery, _imgFromBlob), engine.js
// (decodeRecipe, refreshLabels, previewOne, generateSeries, onSeriesMode,
// setAlter, setSubject, setSeriesPool), brain.js(analyzeImage).

const VIBE_KEY = 'forge_vibe';
function loadVibe(){ try { return JSON.parse(localStorage.getItem(VIBE_KEY)); } catch (_) { return null; } }
function saveVibe(v){ localStorage.setItem(VIBE_KEY, JSON.stringify(v)); }
function _clampi(v, lo, hi){ return Math.max(lo, Math.min(hi, Math.round(v))); }
function _jit(v, amt){ return v + (Math.random() * 2 - 1) * amt; }

//==================== AVANT PRESET ====================
function avantPreset(){
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
  const chk = (id, v) => { const el = document.getElementById(id); if (el) el.checked = v; };
  set('f_layout', 'stack'); chk('f_torn', true);
  set('f_frag', 24); set('f_scale', 55); set('f_rot', 35);
  set('f_grade', 'vhs'); set('f_gradeAmt', 60); set('f_grain', 45); set('f_vig', 45);
  chk('f_scan', true); set('f_glitch', 55); set('f_decay', 45);
  set('d_dust', 30); set('d_scratch', 25);
  const st = document.getElementById('pg_style'); if (st) st.value = 'avant';
  if (window.refreshLabels) refreshLabels();
  if (window.previewOne) previewOne();
  toast('Avant preset applied. For the signature look, set a Subject + high Alter in the Source tab.');
}

//==================== LEARN ====================
function _avg(arr, f){ return arr.length ? arr.reduce((s, o) => s + (f(o) || 0), 0) / arr.length : 0; }
function _mode(arr, f){
  const m = {}; arr.forEach(o => { const k = f(o); if (k != null) m[k] = (m[k] || 0) + 1; });
  let best = null, bc = -1; for (const k in m){ if (m[k] > bc){ bc = m[k]; best = k; } } return best;
}

async function learnVibe(){
  const items = (window.galleryAll ? await galleryAll() : []).filter(i => i.liked);
  if (items.length < 2){ toast('Heart at least 2 editions in the Gallery first'); return; }
  const feats = [], recs = [];
  for (const it of items){
    try { const { img, url } = await _imgFromBlob(it.blob); feats.push(analyzeImage(img)); URL.revokeObjectURL(url); } catch (_) {}
    try { recs.push(decodeRecipe(it.code)); } catch (_) { recs.push({}); }
  }
  const dg = k => Math.round(_avg(recs, r => (r.deg && r.deg[k]) || 0));
  const profile = {
    count: items.length,
    feat: {
      brightness: _avg(feats, a => a.brightness), contrast: _avg(feats, a => a.contrast),
      saturation: _avg(feats, a => a.saturation), warmth: _avg(feats, a => a.warmth),
      detail: _avg(feats, a => a.detail), colorfulness: _avg(feats, a => a.colorfulness),
    },
    rec: {
      layout: _mode(recs, r => r.layout) || 'stack',
      grade: _mode(recs, r => r.grade) || 'vhs',
      torn: recs.filter(r => r.torn).length >= recs.length / 2,
      fragments: Math.round(_avg(recs, r => r.fragments)), scale: Math.round(_avg(recs, r => r.scale)),
      rot: Math.round(_avg(recs, r => r.rot)), gradeAmt: Math.round(_avg(recs, r => r.gradeAmt)),
      grain: Math.round(_avg(recs, r => r.grain)), vig: Math.round(_avg(recs, r => r.vig)),
      glitch: Math.round(_avg(recs, r => r.glitch)), decay: Math.round(_avg(recs, r => r.decay || 0)),
      alter: Math.round(_avg(recs, r => r.alter != null ? r.alter : 60)),
      deg: { rust: dg('rust'), burn: dg('burn'), cracks: dg('cracks'), scratches: dg('scratches'), dust: dg('dust'), stains: dg('stains') },
    },
    subject: _mode(recs.filter(r => r.subject), r => r.subject) || null,
    sourceIds: [...new Set(recs.flatMap(r => (r.refs || r.pool || [])))],
  };
  saveVibe(profile);
  updateVibeStatus();
  toast('Learned your vibe from ' + items.length + ' likes');
}

//==================== APPLY / EVOLVE ====================
function applyVibeToForm(p, mutate){
  const r = p.rec, m = mutate ? 1 : 0;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
  const chk = (id, v) => { const el = document.getElementById(id); if (el) el.checked = v; };
  set('f_layout', r.layout); chk('f_torn', r.torn); set('f_grade', r.grade);
  set('f_frag', _clampi(_jit(r.fragments, 4 * m), 1, 40));
  set('f_scale', _clampi(_jit(r.scale, 8 * m), 10, 120));
  set('f_rot', _clampi(_jit(r.rot, 10 * m), 0, 180));
  set('f_gradeAmt', _clampi(_jit(r.gradeAmt, 8 * m), 0, 100));
  set('f_grain', _clampi(_jit(r.grain, 8 * m), 0, 100));
  set('f_vig', _clampi(_jit(r.vig, 8 * m), 0, 100));
  set('f_glitch', _clampi(_jit(r.glitch, 10 * m), 0, 100));
  set('f_decay', _clampi(_jit(r.decay, 10 * m), 0, 100));
  const dg = r.deg || {}, map = { rust: 'd_rust', burn: 'd_burn', cracks: 'd_cracks', scratches: 'd_scratch', dust: 'd_dust', stains: 'd_stain' };
  for (const k in map) set(map[k], _clampi(_jit(dg[k] || 0, 8 * m), 0, 100));
  if (window.setAlter) setAlter(_clampi(_jit(r.alter, 10 * m), 0, 100));
  if (window.setSubject) setSubject(p.subject || null);
  if (window.refreshLabels) refreshLabels();
}

async function evolveTowardVibe(){
  const p = loadVibe();
  if (!p){ toast('Heart some editions and press "Learn my vibe" first'); return; }
  applyVibeToForm(p, true);
  if (p.sourceIds && p.sourceIds.length && window.setSeriesPool) setSeriesPool(p.sourceIds);
  showTab('series');
  const md = document.getElementById('s_mode'); if (md){ md.value = 'reseed'; if (window.onSeriesMode) onSeriesMode(); }
  if (window.generateSeries){ await generateSeries(); }
  toast('Evolved a fresh batch toward your vibe. Heart the best, then Learn again.');
}

//==================== RANK BY MY VIBE ====================
function scoreVibe(a, recipe, p){
  const f = p.feat, r = p.rec;
  const d = [
    Math.abs(a.brightness - f.brightness),
    Math.abs(a.contrast - f.contrast) / 0.3,
    Math.abs(a.saturation - f.saturation),
    Math.abs(a.detail - f.detail) / 0.25,
    Math.abs(a.colorfulness - f.colorfulness),
    Math.abs(((recipe && recipe.glitch || 0) - r.glitch) / 100),
    Math.abs(((recipe && recipe.decay || 0) - r.decay) / 100),
    Math.abs(((recipe && recipe.fragments || 0) - r.fragments) / 24),
  ];
  return 1 - d.reduce((s, x) => s + Math.min(1, x), 0) / d.length;
}
function rankByVibe(){
  const p = loadVibe();
  if (!p){ toast('Learn your vibe first'); return; }
  if (!window.rankGallery){ toast('Gallery not loaded'); return; }
  rankGallery((a, recipe) => scoreVibe(a, recipe, p)).then(() => toast('Ranked by YOUR vibe'));
}

//==================== STATUS ====================
async function updateVibeStatus(){
  const el = document.getElementById('vibe_status'); if (!el) return;
  const p = loadVibe();
  const items = window.galleryAll ? await galleryAll() : [];
  const n = items.filter(i => i.liked).length;
  el.textContent = (p ? ('Vibe learned from ' + p.count + ' likes | ') : '') + n + ' liked now'
    + (p ? '' : ' - heart editions, then Learn');
}
window.onVibeLikesChanged = updateVibeStatus;

(function initEvolve(){
  const tab = document.querySelector('.tab[data-tab="gallery"]');
  if (tab) tab.addEventListener('click', updateVibeStatus);
  updateVibeStatus();
})();
