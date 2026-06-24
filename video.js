//==================== SERIES FORGE - VIDEO EXPORT ====================
// Renders a sweep (or reseed) as smooth frames and records to WebM via
// MediaRecorder + canvas.captureStream. No libraries, all native.
// Exposes window.exportSweepVideo(). Relies on globals from engine.js/forge.js.

function pickVideoMime(){
  const opts = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  for (const o of opts){
    if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(o)) return o;
  }
  return '';
}

async function exportSweepVideo(){
  if (!window.MediaRecorder){ toast('MediaRecorder not supported in this browser'); return; }
  const base = readRecipeFromForm();
  const lib = await loadLibraryImages();
  if (!lib.length){ toast('Import references first'); showTab('library'); return; }

  const mode   = document.getElementById('s_mode').value;
  const frames = Math.max(2, +document.getElementById('v_frames').value);
  const fps    = Math.max(1, +document.getElementById('v_fps').value);
  const param  = document.getElementById('s_param').value;
  const from   = +document.getElementById('s_from').value;
  const to     = +document.getElementById('s_to').value;

  const vr = scaleRecipe(base, 720);                 // fixed dims for the whole clip
  const canvas = document.createElement('canvas');
  canvas.width = vr.w; canvas.height = vr.h;
  const stream = canvas.captureStream(0);            // manual frame pump
  const track = stream.getVideoTracks()[0];
  const mime = pickVideoMime();
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks = [];
  rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  const stopped = new Promise(res => { rec.onstop = res; });

  rec.start();
  toast('Recording ' + frames + ' frames...');
  for (let i = 0; i < frames; i++){
    const r = Object.assign({}, vr);
    r.deg = Object.assign({}, base.deg);
    r.hud = Object.assign({}, base.hud);
    r.ov  = Object.assign({}, base.ov);
    const t = frames === 1 ? 0 : i / (frames - 1);
    if (mode === 'reseed') r.seed = base.seed + '-' + (i + 1);
    else applySweep(r, param, from + (to - from) * t);

    await renderRecipe(r, canvas, lib);
    if (track.requestFrame) track.requestFrame();
    else if (stream.requestFrame) stream.requestFrame();
    await new Promise(res => setTimeout(res, 1000 / fps));
  }
  rec.stop();
  await stopped;

  const blob = new Blob(chunks, { type: mime || 'video/webm' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'forge_sweep_' + base.seed + '.webm';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  toast('Video saved (' + frames + ' frames @ ' + fps + 'fps)');
}
window.exportSweepVideo = exportSweepVideo;
