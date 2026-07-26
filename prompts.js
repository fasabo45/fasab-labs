//==================== SERIES FORGE - PROMPT BRAIN ====================
// Turns an analyzed board aesthetic into descriptive text prompts.
// Pure/global helpers: window.generateMoodPrompt(...) and window.colorName(...).
// No DOM, no deps - fed a plain aesthetic object by brain.js.

//---------- tiny rng-aware pickers ----------
function _pick(rng, arr){ return arr[Math.floor(rng() * arr.length)]; }
function _pickN(rng, arr, n){
  const a = arr.slice(), out = [];
  while (out.length < n && a.length) out.push(a.splice(Math.floor(rng() * a.length), 1)[0]);
  return out;
}
// value -> level index (0..thresholds.length) by ascending thresholds
function _lvl(v, t){ let i = 0; while (i < t.length && v >= t[i]) i++; return i; }

//---------- descriptor lexicons (5 levels each) ----------
const BRIGHT = [
  ['pitch-black', 'shadow-drenched', 'near-black'],
  ['dim', 'low-key', 'murky', 'dusky'],
  ['evenly lit', 'balanced exposure'],
  ['bright', 'airy', 'well-lit'],
  ['luminous', 'high-key', 'glowing', 'radiant'],
];
const CONTRAST = [
  ['flat', 'washed-out', 'low-contrast'],
  ['soft', 'gentle gradients', 'muted contrast'],
  ['punchy', 'defined'],
  ['high-contrast', 'dramatic'],
  ['harsh contrast', 'crushed blacks', 'blown highlights'],
];
const SAT = [
  ['monochrome', 'black-and-white', 'colorless'],
  ['desaturated', 'muted', 'faded'],
  ['restrained color', 'subdued palette'],
  ['saturated', 'rich color'],
  ['vivid', 'hyper-saturated', 'candy-bright'],
];
const TEMP = [
  ['icy', 'cold-blue', 'wintry'],
  ['cool', 'steely', 'overcast'],
  ['neutral-temperature'],
  ['warm', 'golden', 'amber-lit'],
  ['hot', 'sun-baked', 'sepia-warm'],
];
const DETAIL = [
  ['minimal', 'lots of negative space', 'sparse'],
  ['clean', 'uncluttered'],
  ['textured', 'moderately detailed'],
  ['busy', 'densely layered', 'detail-packed'],
  ['chaotic', 'maximalist', 'cluttered collage'],
];

//---------- style-lean vibe packs ----------
const VIBES = {
  auto:  [],  // filled from metrics below
  cinematic: ['cinematic', 'anamorphic framing', 'filmic', 'widescreen', 'moody lighting', 'depth of field'],
  analog: ['35mm film', 'grainy', 'light leaks', 'faded emulsion', 'lo-fi analog', 'halation'],
  grunge: ['grungy', 'distressed textures', 'xerox photocopy', 'conspiracy dossier', 'redacted', 'CRT scanlines', 'NFT edition'],
  avant:  ['schizocollage', 'trait-maxed maximalism', 'layered appropriation collage', 'obscured distorted subject', 'DADA photomontage', 'cubist collage of internet detritus', 'anime PFP reaction', 'ironic and transgressive', 'generative trait layers', 'lo-fi rendered assets'],
  vapor:  ['vaporwave', 'retro 1980s', 'neon grid horizon', 'chromatic aberration', 'synthwave glow'],
  doc:    ['documentary', 'photojournalistic', 'candid', 'available light', 'reportage realism'],
};
const MEDIUM = ['shot on film', 'fine photographic grain', 'subtle vignette', 'high detail', 'sharp focus', 'atmospheric haze'];

//---------- lighting inference ----------
function _lightingFor(a, rng){
  const wn = Math.min(1, Math.max(0, a.warmth + 0.5));
  const cands = [];
  if (a.brightness < 0.35 && a.contrast > 0.16) cands.push('chiaroscuro shadows', 'single-source key light', 'noir lighting');
  if (wn > 0.6 && a.brightness > 0.45) cands.push('golden-hour glow', 'warm rim light');
  if (wn < 0.42) cands.push('cold diffused daylight', 'overcast light');
  if (a.brightness > 0.7) cands.push('soft high-key light', 'bright bloom');
  if (!cands.length) cands.push('soft directional light', 'natural daylight');
  return _pick(rng, cands);
}

function _autoVibe(a, rng){
  const v = [];
  if (a.detail > 0.16 && a.contrast > 0.16) v.push('gritty', 'analog texture');
  else if (a.detail < 0.08) v.push('clean', 'minimalist');
  if (a.saturation < 0.18) v.push('muted editorial');
  if (a.colorfulness > 0.6) v.push('bold color story');
  return v.length ? _pickN(rng, v, Math.min(2, v.length)) : ['understated'];
}

//==================== COLOR NAMING ====================
// rgb -> human-ish color name (hue + lightness/saturation modifier)
function colorName(r, g, b){
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  const l = (mx + mn) / 510;                         // 0..1 lightness
  const s = mx === 0 ? 0 : d / mx;                    // 0..1 saturation
  if (s < 0.12){                                      // greys
    if (l < 0.12) return 'black';
    if (l < 0.3)  return 'charcoal';
    if (l < 0.55) return 'grey';
    if (l < 0.8)  return 'silver';
    return 'off-white';
  }
  let h = 0;
  if (d !== 0){
    if (mx === r)      h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else               h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  const HUES = [
    [15, 'red'], [40, 'orange'], [50, 'amber'], [70, 'yellow'], [90, 'chartreuse'],
    [160, 'green'], [190, 'teal'], [210, 'cyan'], [250, 'blue'], [280, 'indigo'],
    [320, 'violet'], [345, 'magenta'], [360, 'pink'],
  ];
  let base = 'red';
  for (const [lim, name] of HUES){ if (h <= lim){ base = name; break; } }
  const mod = l < 0.28 ? 'deep ' : l > 0.75 ? 'pale ' : s > 0.7 ? 'vivid ' : s < 0.3 ? 'muted ' : '';
  return mod + base;
}

//==================== PROMPT GENERATION ====================
function generateMoodPrompt(a, tags, opts, rng){
  opts = opts || {}; rng = rng || Math.random; tags = tags || [];
  const parts = [];

  const subj = (opts.subject || '').trim();
  parts.push(subj || 'an evocative scene');

  parts.push(_pick(rng, BRIGHT[_lvl(a.brightness, [0.2, 0.4, 0.6, 0.8])]));
  parts.push(_pick(rng, CONTRAST[_lvl(a.contrast, [0.08, 0.14, 0.2, 0.28])]));
  parts.push(_pick(rng, SAT[_lvl(a.saturation, [0.12, 0.28, 0.45, 0.62])]));

  if (a.palette && a.palette.length){
    const names = [...new Set(a.palette.slice(0, 4).map(c => colorName(c.r, c.g, c.b)))].slice(0, 3);
    if (names.length) parts.push(names.join(', ') + ' palette');
  }

  const wn = Math.min(1, Math.max(0, a.warmth + 0.5));
  parts.push(_pick(rng, TEMP[_lvl(wn, [0.4, 0.48, 0.56, 0.66])]) + ' tones');
  parts.push(_pick(rng, DETAIL[_lvl(a.detail, [0.06, 0.12, 0.2, 0.3])]) + ' composition');

  const style = opts.style || 'auto';
  const vibe = style === 'auto' ? _autoVibe(a, rng) : _pickN(rng, VIBES[style] || [], 3);
  parts.push(...vibe);

  parts.push(_lightingFor(a, rng));
  parts.push(_pick(rng, MEDIUM));

  if (tags.length) parts.push(..._pickN(rng, tags, Math.min(3, tags.length)));

  return parts.filter(Boolean).join(', ');
}

window.generateMoodPrompt = generateMoodPrompt;
window.colorName = colorName;
