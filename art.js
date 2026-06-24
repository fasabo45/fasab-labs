//==================== CORE ====================
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', {willReadFrequently:true});
const fileInput = document.getElementById('fileInput');
let history = [];
let currentTool = 'brush';

function toast(msg){
  const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show');
  clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove('show'),1800);
}
function pushHistory(){
  try{ history.push(ctx.getImageData(0,0,canvas.width,canvas.height)); }catch(e){}
  if(history.length>20) history.shift();
}
function undo(){
  if(history.length<1){ toast('Nothing to undo '); return; }
  const img=history.pop();
  canvas.width=img.width; canvas.height=img.height;
  ctx.putImageData(img,0,0); updateDims();
}
function updateDims(){ document.getElementById('dims').textContent=`${canvas.width} Ã— ${canvas.height}`; }
function setSize(w,h){ pushHistory(); canvas.width=w; canvas.height=h; ctx.fillStyle='#0d0b1a'; ctx.fillRect(0,0,w,h); updateDims(); toast(`Canvas ${w}Ã—${h}`); }
function resetCanvas(){ pushHistory(); ctx.fillStyle='#0d0b1a'; ctx.fillRect(0,0,canvas.width,canvas.height); toast('Cleared '); }
function download(){ const out=(typeof layers!=='undefined'&&layers.length)?flattenedCanvas():canvas; const a=document.createElement('a'); a.download='ai-art-'+Date.now()+'.png'; a.href=out.toDataURL('image/png'); a.click(); }

//==================== TABS ====================
document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.pane').forEach(x=>x.classList.remove('active'));
  t.classList.add('active');
  document.getElementById('pane-'+t.dataset.pane).classList.add('active');
  document.getElementById('overlay').classList.toggle('layeredit', t.dataset.pane==='lay');
});

//==================== UPLOAD / DROP ====================
fileInput.onchange=e=>{ if(e.target.files[0]) loadImageFile(e.target.files[0]); };
function loadImageFile(file){
  const r=new FileReader();
  r.onload=ev=>{ const img=new Image(); img.onload=()=>{
    pushHistory();
    const max=1024; let w=img.width,h=img.height;
    if(w>max||h>max){ const s=max/Math.max(w,h); w=Math.round(w*s); h=Math.round(h*s); }
    canvas.width=w; canvas.height=h; ctx.drawImage(img,0,0,w,h); updateDims(); toast('Image loaded ');
  }; img.src=ev.target.result; };
  r.readAsDataURL(file);
}
const wrap=document.getElementById('canvasWrap');
wrap.addEventListener('dragover',e=>{e.preventDefault();});
wrap.addEventListener('drop',e=>{e.preventDefault(); if(e.dataTransfer.files[0]) loadImageFile(e.dataTransfer.files[0]);});

//==================== PALETTES ====================
const PALETTES={
  neon:[[255,77,210],[77,210,255],[180,77,255],[77,255,180]],
  sunset:[[255,94,77],[255,165,77],[255,77,141],[120,40,140]],
  ocean:[[12,40,90],[20,120,170],[80,200,210],[230,250,255]],
  mono:[[20,20,30],[90,90,120],[170,170,200],[245,245,255]],
  fire:[[10,0,0],[120,20,0],[230,90,10],[255,220,80]],
};
function getPalette(){
  let p=document.getElementById('genPalette').value;
  if(p==='random'){ const k=Object.keys(PALETTES); p=k[Math.floor(Math.random()*k.length)]; }
  return PALETTES[p]||PALETTES.neon;
}
function lerp(a,b,t){return a+(b-a)*t;}
function paletteColor(pal,t){
  t=Math.max(0,Math.min(1,t)); const n=pal.length-1; const f=t*n; const i=Math.floor(f); const fr=f-i;
  const a=pal[i], b=pal[Math.min(i+1,n)];
  return [lerp(a[0],b[0],fr),lerp(a[1],b[1],fr),lerp(a[2],b[2],fr)];
}

//==================== GENERATORS ====================
function gen(type){
  pushHistory();
  const W=canvas.width,H=canvas.height; const pal=getPalette();
  const img=ctx.createImageData(W,H); const d=img.data;
  const seed=Math.random()*1000;
  if(type==='plasma'){
    const sx=0.01+Math.random()*0.03, sy=0.01+Math.random()*0.03;
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){
      const v=(Math.sin(x*sx+seed)+Math.sin(y*sy)+Math.sin((x+y)*sx*0.7)+Math.sin(Math.hypot(x-W/2,y-H/2)*0.02))/4;
      const c=paletteColor(pal,(v+1)/2); setPx(d,(y*W+x)*4,c);
    }
  } else if(type==='nebula'){
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){
      let n=0,amp=1,fr=0.008;
      for(let o=0;o<5;o++){ n+=amp*valueNoise(x*fr+seed,y*fr+seed); amp*=0.5; fr*=2; }
      n=(n+1)/2; const c=paletteColor(pal,Math.pow(n,1.6)); setPx(d,(y*W+x)*4,c);
    }
  } else if(type==='mandelbrot'||type==='julia'){
    const zoom=type==='mandelbrot'?(1.2+Math.random()*0.6):1.4;
    const cx=type==='julia'?-0.7+Math.random()*0.3:0, cy=type==='julia'?0.27+Math.random()*0.2:0;
    const jcx=-0.8+Math.random()*1.2, jcy=-0.4+Math.random()*0.8;
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){
      let zx=(x/W-0.5)*zoom*3+cx, zy=(y/H-0.5)*zoom*3+cy;
      let ax=type==='julia'?zx:0, ay=type==='julia'?zy:0;
      let bx=type==='julia'?jcx:zx, by=type==='julia'?jcy:zy;
      let i=0; const max=80;
      while(i<max && ax*ax+ay*ay<4){ const t=ax*ax-ay*ay+bx; ay=2*ax*ay+by; ax=t; i++; }
      const c=paletteColor(pal, i>=max?0:i/max); setPx(d,(y*W+x)*4,c);
    }
  } else if(type==='voronoi'){
    const n=8+Math.floor(Math.random()*24); const pts=[];
    for(let i=0;i<n;i++) pts.push([Math.random()*W,Math.random()*H,Math.random()]);
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){
      let best=1e9,bt=0;
      for(const p of pts){ const dd=(x-p[0])**2+(y-p[1])**2; if(dd<best){best=dd;bt=p[2];} }
      const c=paletteColor(pal,bt); setPx(d,(y*W+x)*4,c);
    }
  } else if(type==='rings'){
    const cx=W*(0.3+Math.random()*0.4), cy=H*(0.3+Math.random()*0.4);
    const fr=0.02+Math.random()*0.06;
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){
      const dist=Math.hypot(x-cx,y-cy); const v=(Math.sin(dist*fr)+1)/2;
      const c=paletteColor(pal,v); setPx(d,(y*W+x)*4,c);
    }
  }
  if(type==='flow'||type==='bauhaus'){
    // these draw with context, not imageData
    ctx.fillStyle=`rgb(${pal[0].join(',')})`; ctx.fillRect(0,0,W,H);
    if(type==='flow') drawFlow(W,H,pal,seed); else drawBauhaus(W,H,pal);
    toast('Generated '); return;
  }
  ctx.putImageData(img,0,0); toast('Generated ');
}
function setPx(d,i,c){ d[i]=c[0]; d[i+1]=c[1]; d[i+2]=c[2]; d[i+3]=255; }
function valueNoise(x,y){
  const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi;
  const tl=hash(xi,yi),tr=hash(xi+1,yi),bl=hash(xi,yi+1),br=hash(xi+1,yi+1);
  const u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
  return lerp(lerp(tl,tr,u),lerp(bl,br,u),v)*2-1;
}
function hash(x,y){ let h=Math.sin(x*127.1+y*311.7)*43758.5453; return h-Math.floor(h); }
function drawFlow(W,H,pal,seed){
  ctx.globalAlpha=0.5; ctx.lineWidth=1.2;
  for(let i=0;i<2500;i++){
    let x=Math.random()*W,y=Math.random()*H;
    const c=paletteColor(pal,Math.random()); ctx.strokeStyle=`rgb(${c.map(Math.round).join(',')})`;
    ctx.beginPath(); ctx.moveTo(x,y);
    for(let s=0;s<26;s++){ const a=valueNoise(x*0.005+seed,y*0.005)*Math.PI*2; x+=Math.cos(a)*5; y+=Math.sin(a)*5; ctx.lineTo(x,y); }
    ctx.stroke();
  }
  ctx.globalAlpha=1;
}
function drawBauhaus(W,H,pal){
  for(let i=0;i<28;i++){
    const c=pal[Math.floor(Math.random()*pal.length)]; ctx.fillStyle=`rgb(${c.join(',')})`;
    const x=Math.random()*W,y=Math.random()*H,s=30+Math.random()*Math.min(W,H)*0.4;
    const r=Math.random();
    if(r<0.4){ ctx.fillRect(x,y,s,s*(0.3+Math.random())); }
    else if(r<0.75){ ctx.beginPath(); ctx.arc(x,y,s/2,0,Math.PI*2); ctx.fill(); }
    else { ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+s,y); ctx.lineTo(x+s/2,y-s); ctx.fill(); }
  }
}

//==================== ADJUSTMENTS ====================
let baseForAdjust=null;
['adjBright','adjContrast','adjSat','adjHue'].forEach(id=>{
  document.getElementById(id).addEventListener('input',previewAdjust);
});
function readAdj(){
  const b=+adjBright.value, c=+adjContrast.value, s=+adjSat.value, h=+adjHue.value;
  document.getElementById('vBright').textContent=b;
  document.getElementById('vContrast').textContent=c;
  document.getElementById('vSat').textContent=s;
  document.getElementById('vHue').textContent=h;
  return {b,c,s,h};
}
function previewAdjust(){
  if(!baseForAdjust){ baseForAdjust=ctx.getImageData(0,0,canvas.width,canvas.height); }
  const {b,c,s,h}=readAdj();
  const src=baseForAdjust.data; const out=ctx.createImageData(canvas.width,canvas.height); const d=out.data;
  const cf=(259*(c+255))/(255*(259-c)); const sf=1+s/100;
  for(let i=0;i<src.length;i+=4){
    let r=src[i],g=src[i+1],bl=src[i+2];
    r=cf*(r-128)+128+b; g=cf*(g-128)+128+b; bl=cf*(bl-128)+128+b;
    // saturation
    const gray=0.3*r+0.59*g+0.11*bl;
    r=gray+(r-gray)*sf; g=gray+(g-gray)*sf; bl=gray+(bl-gray)*sf;
    if(h>0){ const hsl=rgb2hsl(r,g,bl); hsl[0]=(hsl[0]+h/360)%1; const rr=hsl2rgb(hsl[0],hsl[1],hsl[2]); r=rr[0];g=rr[1];bl=rr[2]; }
    d[i]=clamp(r); d[i+1]=clamp(g); d[i+2]=clamp(bl); d[i+3]=src[i+3];
  }
  ctx.putImageData(out,0,0);
}
function applyAdjust(){ if(baseForAdjust){ history.push(baseForAdjust);} baseForAdjust=null; resetSliders(true); toast('Baked in '); }
function resetSliders(keep){
  ['adjBright','adjContrast','adjSat'].forEach(id=>document.getElementById(id).value=0);
  document.getElementById('adjHue').value=0; readAdj();
  if(!keep && baseForAdjust){ ctx.putImageData(baseForAdjust,0,0); baseForAdjust=null; }
}
function clamp(v){return v<0?0:v>255?255:v;}
function rgb2hsl(r,g,b){ r/=255;g/=255;b/=255; const mx=Math.max(r,g,b),mn=Math.min(r,g,b); let h,s,l=(mx+mn)/2;
  if(mx===mn){h=s=0;}else{const dd=mx-mn; s=l>0.5?dd/(2-mx-mn):dd/(mx+mn);
  switch(mx){case r:h=(g-b)/dd+(g<b?6:0);break;case g:h=(b-r)/dd+2;break;default:h=(r-g)/dd+4;}h/=6;} return [h,s,l];}
function hsl2rgb(h,s,l){ let r,g,b; if(s===0){r=g=b=l;}else{const q=l<0.5?l*(1+s):l+s-l*s; const p=2*l-q;
  r=hue2(p,q,h+1/3);g=hue2(p,q,h);b=hue2(p,q,h-1/3);} return [r*255,g*255,b*255];}
function hue2(p,q,t){if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p;}

//==================== FILTERS ====================
const KERNELS={
  sharpen:[0,-1,0,-1,5,-1,0,-1,0],
  edge:[-1,-1,-1,-1,8,-1,-1,-1,-1],
  emboss:[-2,-1,0,-1,1,1,0,1,2],
  blur:[1,2,1,2,4,2,1,2,1],
};
function filter(type){
  pushHistory();
  const W=canvas.width,H=canvas.height; const src=ctx.getImageData(0,0,W,H);
  if(KERNELS[type]) convolve(src,KERNELS[type]);
  else if(type==='gray'||type==='sepia'||type==='invert'||type==='posterize') colorOp(src,type);
  else if(type==='pixelate'){ pixelate(+document.getElementById('pixSize').value); return; }
  ctx.putImageData(src,0,0); toast('Filter applied ');
}
function convolve(img,k){
  const W=img.width,H=img.height,s=img.data,o=new Uint8ClampedArray(s);
  const div=k.reduce((a,b)=>a+b,0)||1;
  for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){
    let r=0,g=0,b=0,ki=0;
    for(let ky=-1;ky<=1;ky++)for(let kx=-1;kx<=1;kx++){
      const i=((y+ky)*W+(x+kx))*4; const w=k[ki++]; r+=s[i]*w; g+=s[i+1]*w; b+=s[i+2]*w;
    }
    const i=(y*W+x)*4; o[i]=r/div; o[i+1]=g/div; o[i+2]=b/div;
  }
  img.data.set(o);
}
function colorOp(img,type){
  const d=img.data;
  for(let i=0;i<d.length;i+=4){
    let r=d[i],g=d[i+1],b=d[i+2];
    if(type==='gray'){ const v=0.3*r+0.59*g+0.11*b; r=g=b=v; }
    else if(type==='sepia'){ const nr=r*0.393+g*0.769+b*0.189,ng=r*0.349+g*0.686+b*0.168,nb=r*0.272+g*0.534+b*0.131; r=nr;g=ng;b=nb; }
    else if(type==='invert'){ r=255-r;g=255-g;b=255-b; }
    else if(type==='posterize'){ const lv=5; r=Math.round(r/255*lv)/lv*255; g=Math.round(g/255*lv)/lv*255; b=Math.round(b/255*lv)/lv*255; }
    d[i]=clamp(r); d[i+1]=clamp(g); d[i+2]=clamp(b);
  }
}
function pixelate(block){
  pushHistory();
  const W=canvas.width,H=canvas.height; const src=ctx.getImageData(0,0,W,H).data;
  for(let y=0;y<H;y+=block)for(let x=0;x<W;x+=block){
    let r=0,g=0,b=0,n=0;
    for(let dy=0;dy<block&&y+dy<H;dy++)for(let dx=0;dx<block&&x+dx<W;dx++){ const i=((y+dy)*W+(x+dx))*4; r+=src[i];g+=src[i+1];b+=src[i+2];n++; }
    r/=n;g/=n;b/=n; ctx.fillStyle=`rgb(${r|0},${g|0},${b|0})`; ctx.fillRect(x,y,block,block);
  }
  toast('Pixelated ');
}

//==================== GLITCH ====================
function glitch(type){
  pushHistory();
  const W=canvas.width,H=canvas.height; const amt=+document.getElementById('glitchAmt').value;
  const img=ctx.getImageData(0,0,W,H); const d=img.data;
  if(type==='rgbshift'){
    const sh=Math.round(amt/100*40)+1; const copy=new Uint8ClampedArray(d);
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){
      const i=(y*W+x)*4; const rx=Math.min(W-1,x+sh),bx=Math.max(0,x-sh);
      d[i]=copy[(y*W+rx)*4]; d[i+2]=copy[(y*W+bx)*4+2];
    }
    ctx.putImageData(img,0,0);
  } else if(type==='pixelsort'){
    const thresh=255-amt*2;
    for(let y=0;y<H;y++){
      let start=-1;
      for(let x=0;x<=W;x++){
        const i=(y*W+x)*4; const lum=x<W?(d[i]+d[i+1]+d[i+2])/3:999;
        if(lum>thresh&&x<W){ if(start<0)start=x; }
        else if(start>=0){ sortRun(d,y,start,x,W); start=-1; }
      }
    }
    ctx.putImageData(img,0,0);
  } else if(type==='blocks'){
    const n=Math.round(amt/3)+2;
    for(let k=0;k<n;k++){
      const by=Math.random()*H|0, bh=5+Math.random()*40|0, sh=(Math.random()-0.5)*amt*2|0;
      const slice=ctx.getImageData(0,by,W,Math.min(bh,H-by));
      ctx.putImageData(slice,sh,by);
    }
    return;
  } else if(type==='scanlines'){
    for(let y=0;y<H;y+=2)for(let x=0;x<W;x++){ const i=(y*W+x)*4; const f=1-amt/150; d[i]*=f;d[i+1]*=f;d[i+2]*=f; }
    ctx.putImageData(img,0,0);
  } else if(type==='noise'){
    for(let i=0;i<d.length;i+=4){ const n=(Math.random()-0.5)*amt*2.5; d[i]+=n;d[i+1]+=n;d[i+2]+=n; }
    ctx.putImageData(img,0,0);
  } else if(type==='wave'){
    const copy=new Uint8ClampedArray(d); const f=amt/4;
    for(let y=0;y<H;y++){ const off=Math.round(Math.sin(y*0.05)*f);
      for(let x=0;x<W;x++){ const sx=(x+off+W)%W; const i=(y*W+x)*4,j=(y*W+sx)*4; d[i]=copy[j];d[i+1]=copy[j+1];d[i+2]=copy[j+2]; } }
    ctx.putImageData(img,0,0);
  }
  toast('Glitched ');
}
function sortRun(d,y,x0,x1,W){
  const arr=[];
  for(let x=x0;x<x1;x++){ const i=(y*W+x)*4; arr.push([d[i],d[i+1],d[i+2],d[i+3]]); }
  arr.sort((a,b)=>(a[0]+a[1]+a[2])-(b[0]+b[1]+b[2]));
  for(let x=x0;x<x1;x++){ const i=(y*W+x)*4; const p=arr[x-x0]; d[i]=p[0];d[i+1]=p[1];d[i+2]=p[2];d[i+3]=p[3]; }
}

//==================== ASCII ====================
let lastAsciiText='';
document.getElementById('ascCols').addEventListener('input',e=>document.getElementById('vAscCols').textContent=e.target.value);
function asciiFilter(){
  const ramp=document.getElementById('ascRamp').value;
  const invert=document.getElementById('ascInvert').checked;
  const cols=+document.getElementById('ascCols').value;
  const colorMode=document.getElementById('ascColor').value;
  const W=canvas.width,H=canvas.height;
  // sample current canvas at low res; chars are ~2x taller than wide
  const cellW=W/cols; const cellH=cellW*2;
  const rows=Math.max(1,Math.floor(H/cellH));
  const src=ctx.getImageData(0,0,W,H).data;
  pushHistory();
  // backgrounds per color mode
  const bg = (colorMode==='image' && !invert) ? '#0d0b1a'
           : (invert ? '#000' : (colorMode==='mono'?'#000': (colorMode==='green'?'#001500':(colorMode==='amber'?'#160d00':'#000'))));
  ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);
  const fontPx=cellH; ctx.font=fontPx+'px monospace'; ctx.textBaseline='top';
  const n=ramp.length-1;
  let textOut='';
  for(let ry=0;ry<rows;ry++){
    let line='';
    for(let rx=0;rx<cols;rx++){
      const sx=Math.floor(rx*cellW), sy=Math.floor(ry*cellH);
      let r=0,g=0,b=0,cnt=0;
      for(let dy=0;dy<cellH&&sy+dy<H;dy+=2)for(let dx=0;dx<cellW&&sx+dx<W;dx+=2){
        const i=((sy+dy)*W+(sx+dx))*4; r+=src[i];g+=src[i+1];b+=src[i+2];cnt++;
      }
      if(cnt){r/=cnt;g/=cnt;b/=cnt;}
      let lum=(0.299*r+0.587*g+0.114*b)/255;
      if(invert) lum=1-lum;
      const ch=ramp[Math.round(lum*n)]||' ';
      line+=ch;
      if(ch!==' '){
        ctx.fillStyle = colorMode==='image' ? `rgb(${r|0},${g|0},${b|0})`
                      : colorMode==='green' ? '#6dffb0'
                      : colorMode==='amber' ? '#ffb347' : '#ffffff';
        ctx.fillText(ch, rx*cellW, ry*cellH);
      }
    }
    textOut+=line+'\n';
  }
  lastAsciiText=textOut;
  toast('ASCII-fied');
}
function downloadAsciiText(){
  if(!lastAsciiText){ toast('Convert to ASCII first'); return; }
  const blob=new Blob([lastAsciiText],{type:'text/plain'});
  const a=document.createElement('a'); a.download='ascii-art-'+Date.now()+'.txt';
  a.href=URL.createObjectURL(blob); a.click();
}

//==================== MATH PATTERNS ====================
function palFrom(id){ let p=document.getElementById(id).value; if(p==='random'){ const k=Object.keys(PALETTES); p=k[Math.floor(Math.random()*k.length)]; } return PALETTES[p]||PALETTES.neon; }
function colStr(pal,t){ const c=paletteColor(pal,t); return `rgb(${c[0]|0},${c[1]|0},${c[2]|0})`; }
function paramPath(fn,t0,t1,steps,pal){ let prev=null; for(let i=0;i<=steps;i++){ const t=t0+(t1-t0)*i/steps; const p=fn(t); if(prev){ ctx.strokeStyle=colStr(pal,i/steps); ctx.beginPath(); ctx.moveTo(prev.x,prev.y); ctx.lineTo(p.x,p.y); ctx.stroke(); } prev=p; } }
['mathA','mathB'].forEach(id=>document.getElementById(id).addEventListener('input',e=>document.getElementById('v'+id.charAt(0).toUpperCase()+id.slice(1)).textContent=e.target.value));
function mathArt(type){
  pushHistory();
  const W=canvas.width,H=canvas.height,cx=W/2,cy=H/2;
  const pal=palFrom('mathPalette'); const a=+mathA.value, b=+mathB.value;
  const dark=document.getElementById('mathDark').checked;
  ctx.globalCompositeOperation='source-over'; ctx.globalAlpha=1;
  ctx.fillStyle=dark?'#0d0b1a':'#f4f1ff'; ctx.fillRect(0,0,W,H);
  ctx.lineWidth=1.2; ctx.lineCap='round'; const R=Math.min(W,H)*0.42;
  if(type==='spiro'){
    const r=R/a, d=r*(1+b/8);
    paramPath(t=>({x:cx+(R-r)*Math.cos(t)+d*Math.cos((R-r)/r*t), y:cy+(R-r)*Math.sin(t)-d*Math.sin((R-r)/r*t)}),0,Math.PI*2*a,6000,pal);
  } else if(type==='lissajous'){
    const A=a,B=b+1,ph=Math.PI/(b+2);
    paramPath(t=>({x:cx+R*Math.sin(A*t+ph), y:cy+R*Math.sin(B*t)}),0,Math.PI*2,5000,pal);
  } else if(type==='rose'){
    const k=a/b;
    paramPath(t=>{const rr=R*Math.cos(k*t); return {x:cx+rr*Math.cos(t), y:cy+rr*Math.sin(t)};},0,Math.PI*2*b,6000,pal);
  } else if(type==='maurer'){
    const n=a, dd=(b*11)%360||29; let prev=null;
    for(let i=0;i<=360;i++){ const k=i*dd*Math.PI/180; const rr=R*Math.sin(n*k); const x=cx+rr*Math.cos(k),y=cy+rr*Math.sin(k); if(prev){ctx.strokeStyle=colStr(pal,i/360); ctx.beginPath(); ctx.moveTo(prev.x,prev.y); ctx.lineTo(x,y); ctx.stroke();} prev={x,y}; }
  } else if(type==='super'){
    const m=a, n1=0.3+b/6;
    const sf=phi=>{ const t1=Math.pow(Math.abs(Math.cos(m*phi/4)),n1), t2=Math.pow(Math.abs(Math.sin(m*phi/4)),n1); return Math.pow(t1+t2,-1/n1); };
    for(let s=1;s<=b;s++){ const sc=R*s/b; paramPath(phi=>{const rr=sf(phi)*sc; return {x:cx+rr*Math.cos(phi), y:cy+rr*Math.sin(phi)};},0,Math.PI*2,1500,pal); }
  } else if(type==='harmono'){
    const f1=a,f2=a+(Math.random()*0.04-0.02),f3=b,f4=b+(Math.random()*0.04-0.02);
    const p1=Math.random()*6,p2=Math.random()*6,p3=Math.random()*6,p4=Math.random()*6; const dc=0.0045;
    paramPath(t=>{ const x=cx+R*0.5*(Math.sin(f1*t+p1)*Math.exp(-dc*t)+Math.sin(f2*t+p2)*Math.exp(-dc*t)); const y=cy+R*0.5*(Math.sin(f3*t+p3)*Math.exp(-dc*t)+Math.sin(f4*t+p4)*Math.exp(-dc*t)); return {x,y}; },0,220,14000,pal);
  } else if(type==='phyllo'){
    const N=a*160, c=R/Math.sqrt(N), golden=Math.PI*(3-Math.sqrt(5));
    for(let i=0;i<N;i++){ const ang=i*golden, rad=c*Math.sqrt(i); ctx.fillStyle=colStr(pal,i/N); ctx.beginPath(); ctx.arc(cx+rad*Math.cos(ang),cy+rad*Math.sin(ang),Math.max(1,b*0.5),0,Math.PI*2); ctx.fill(); }
  } else if(type==='flower'){
    const rr=R/a; ctx.lineWidth=1.4;
    for(let gy=-a*2;gy<=a*2;gy++)for(let gx=-a*2;gx<=a*2;gx++){ const px=cx+rr*(gx + (gy&1?0.5:0)), py=cy+rr*gy*Math.sqrt(3)/2; const dd=Math.hypot(px-cx,py-cy); if(dd<R){ ctx.strokeStyle=colStr(pal,dd/R); ctx.beginPath(); ctx.arc(px,py,rr,0,Math.PI*2); ctx.stroke(); } }
  } else if(type==='butterfly'){
    paramPath(t=>{ const r=Math.exp(Math.sin(t))-2*Math.cos(4*t)+Math.pow(Math.sin((2*t-Math.PI)/24),5); const sc=R*0.22; return {x:cx+sc*r*Math.sin(t), y:cy-sc*r*Math.cos(t)}; },0,Math.PI*2*b,9000,pal);
  } else if(type==='moire'){
    ctx.globalCompositeOperation='lighter'; const gap=Math.max(3,b); const off=a*2;
    for(const c of [{x:cx-off,y:cy},{x:cx+off,y:cy}]){ for(let rad=gap;rad<R*2;rad+=gap){ ctx.strokeStyle=colStr(pal,(rad%R)/R); ctx.beginPath(); ctx.arc(c.x,c.y,rad,0,Math.PI*2); ctx.stroke(); } }
    ctx.globalCompositeOperation='source-over';
  } else if(type==='automata'){
    const rule=(a*6)%256, cell=Math.max(2,Math.round(b)); const cols=Math.floor(W/cell), rows=Math.floor(H/cell);
    let row=new Array(cols).fill(0); row[cols>>1]=1;
    for(let y=0;y<rows;y++){ for(let x=0;x<cols;x++){ if(row[x]){ ctx.fillStyle=colStr(pal,y/rows); ctx.fillRect(x*cell,y*cell,cell,cell);} } const next=new Array(cols).fill(0); for(let x=0;x<cols;x++){ const l=row[(x-1+cols)%cols],ce=row[x],rg=row[(x+1)%cols]; next[x]=(rule>>((l<<2)|(ce<<1)|rg))&1; } row=next; }
  } else if(type==='mandala'){
    ctx.save(); ctx.translate(cx,cy); const sym=Math.max(3,a), layers=Math.max(1,b);
    for(let layer=0;layer<layers;layer++){ const rad=R*(layer+1)/layers; for(let s=0;s<sym;s++){ ctx.save(); ctx.rotate(s*2*Math.PI/sym); ctx.strokeStyle=colStr(pal,layer/layers); ctx.beginPath(); ctx.arc(rad*0.72,0,rad*0.16,0,Math.PI*2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0,0); ctx.quadraticCurveTo(rad*0.5,rad*0.13,rad,0); ctx.quadraticCurveTo(rad*0.5,-rad*0.13,0,0); ctx.stroke(); ctx.restore(); } }
    ctx.restore();
  }
  ctx.globalAlpha=1; toast('Math art rendered');
}

//==================== LAYERS ====================
const overlay=document.getElementById('overlay');
const octx=overlay.getContext('2d');
const layerFileInput=document.getElementById('layerFileInput');
let layers=[]; let activeLayer=-1; let layerDrag=null;
const HANDLE=9;
function makeLayerCanvas(w,h){ const c=document.createElement('canvas'); c.width=w; c.height=h; return c; }
function addLayerFromCanvas(){
  const c=makeLayerCanvas(canvas.width,canvas.height); c.getContext('2d').drawImage(canvas,0,0);
  layers.push({cnv:c,x:0,y:0,w:canvas.width,h:canvas.height,op:1,vis:true,name:'Layer '+(layers.length+1)});
  activeLayer=layers.length-1; refreshLayers(); toast('Layer added');
}
layerFileInput.addEventListener('change',e=>{ const f=e.target.files[0]; if(!f)return; const r=new FileReader();
  r.onload=ev=>{ const img=new Image(); img.onload=()=>{ const c=makeLayerCanvas(img.width,img.height); c.getContext('2d').drawImage(img,0,0);
    let w=img.width,h=img.height; const max=Math.min(canvas.width,canvas.height)*0.8; if(w>max||h>max){ const s=max/Math.max(w,h); w=Math.round(w*s); h=Math.round(h*s); }
    layers.push({cnv:c,x:(canvas.width-w)/2,y:(canvas.height-h)/2,w,h,op:1,vis:true,name:f.name.slice(0,14)});
    activeLayer=layers.length-1; refreshLayers(); toast('Imported as layer'); }; img.src=ev.target.result; };
  r.readAsDataURL(f); layerFileInput.value=''; });
function selectLayer(i){ activeLayer=i; refreshLayers(); }
function deleteLayer(i){ layers.splice(i,1); if(activeLayer>=layers.length)activeLayer=layers.length-1; refreshLayers(); }
function moveLayer(i,dir){ const j=i+dir; if(j<0||j>=layers.length)return; const t=layers[i]; layers[i]=layers[j]; layers[j]=t; activeLayer=j; refreshLayers(); }
function layerFit(){ const L=layers[activeLayer]; if(!L)return; L.x=0;L.y=0;L.w=canvas.width;L.h=canvas.height; refreshLayers(); }
function layerCenter(){ const L=layers[activeLayer]; if(!L)return; L.x=(canvas.width-L.w)/2; L.y=(canvas.height-L.h)/2; refreshLayers(); }
function layerAspect(){ const L=layers[activeLayer]; if(!L)return; const ar=L.cnv.width/L.cnv.height; L.h=L.w/ar; refreshLayers(); }
function flattenLayers(){ if(!layers.length){ toast('No layers to flatten'); return; } pushHistory();
  for(const L of layers){ if(!L.vis)continue; ctx.globalAlpha=L.op; ctx.drawImage(L.cnv,L.x,L.y,L.w,L.h); } ctx.globalAlpha=1;
  layers=[]; activeLayer=-1; refreshLayers(); toast('Flattened to canvas'); }
function refreshLayers(){
  const list=document.getElementById('layerList'); list.innerHTML='';
  for(let i=layers.length-1;i>=0;i--){ const L=layers[i]; const row=document.createElement('div');
    row.style.cssText='display:flex;align-items:center;gap:6px;padding:6px;border-radius:8px;margin-bottom:4px;cursor:pointer;font-size:12px;'+(i===activeLayer?'background:#3a2a6a;border:1px solid var(--accent)':'background:#211c44');
    row.innerHTML=`<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${L.name}</span>`;
    const vis=document.createElement('span'); vis.textContent=L.vis?'on':'off'; vis.className='badge'; vis.style.cursor='pointer';
    vis.onclick=ev=>{ ev.stopPropagation(); L.vis=!L.vis; refreshLayers(); };
    const up=document.createElement('button'); up.className='ghost'; up.style.cssText='flex:none;padding:2px 6px'; up.textContent='^'; up.onclick=ev=>{ev.stopPropagation();moveLayer(i,1);};
    const dn=document.createElement('button'); dn.className='ghost'; dn.style.cssText='flex:none;padding:2px 6px'; dn.textContent='v'; dn.onclick=ev=>{ev.stopPropagation();moveLayer(i,-1);};
    const del=document.createElement('button'); del.className='ghost'; del.style.cssText='flex:none;padding:2px 6px'; del.textContent='x'; del.onclick=ev=>{ev.stopPropagation();deleteLayer(i);};
    row.appendChild(vis); row.appendChild(up); row.appendChild(dn); row.appendChild(del);
    row.onclick=()=>selectLayer(i); list.appendChild(row);
  }
  const ctrls=document.getElementById('layerControls'); const L=layers[activeLayer];
  ctrls.style.display=L?'block':'none';
  if(L){ document.getElementById('layerOp').value=Math.round(L.op*100); document.getElementById('vLayerOp').textContent=Math.round(L.op*100);
    document.getElementById('layerW').value=Math.round(L.w); document.getElementById('vLayerW').textContent=Math.round(L.w);
    document.getElementById('layerH').value=Math.round(L.h); document.getElementById('vLayerH').textContent=Math.round(L.h); }
}
document.getElementById('layerOp').addEventListener('input',e=>{ const L=layers[activeLayer]; if(!L)return; L.op=+e.target.value/100; document.getElementById('vLayerOp').textContent=e.target.value; });
document.getElementById('layerW').addEventListener('input',e=>{ const L=layers[activeLayer]; if(!L)return; L.w=+e.target.value; document.getElementById('vLayerW').textContent=e.target.value; });
document.getElementById('layerH').addEventListener('input',e=>{ const L=layers[activeLayer]; if(!L)return; L.h=+e.target.value; document.getElementById('vLayerH').textContent=e.target.value; });
// overlay compositor + interaction
function overlayPt(e){ const r=overlay.getBoundingClientRect(); return { x:(e.clientX-r.left)/r.width*overlay.width, y:(e.clientY-r.top)/r.height*overlay.height }; }
function cornerAt(L,p){ const cs=[[L.x,L.y,'nw'],[L.x+L.w,L.y,'ne'],[L.x,L.y+L.h,'sw'],[L.x+L.w,L.y+L.h,'se']]; const tol=HANDLE*1.6*overlay.width/Math.max(1,overlay.getBoundingClientRect().width); for(const c of cs){ if(Math.hypot(p.x-c[0],p.y-c[1])<tol)return c[2]; } return null; }
overlay.addEventListener('mousedown',e=>{ const L=layers[activeLayer]; if(!L)return; const p=overlayPt(e); const corner=cornerAt(L,p);
  if(corner){ layerDrag={mode:'resize',corner,sx:p.x,sy:p.y,o:{...L}}; }
  else if(p.x>=L.x&&p.x<=L.x+L.w&&p.y>=L.y&&p.y<=L.y+L.h){ layerDrag={mode:'move',sx:p.x,sy:p.y,o:{...L}}; }
  else { // click another layer under the point
    for(let i=layers.length-1;i>=0;i--){ const Q=layers[i]; if(p.x>=Q.x&&p.x<=Q.x+Q.w&&p.y>=Q.y&&p.y<=Q.y+Q.h){ activeLayer=i; refreshLayers(); break; } } }
});
window.addEventListener('mousemove',e=>{ if(!layerDrag)return; const L=layers[activeLayer]; if(!L)return; const p=overlayPt(e); const dx=p.x-layerDrag.sx, dy=p.y-layerDrag.sy, o=layerDrag.o;
  if(layerDrag.mode==='move'){ L.x=o.x+dx; L.y=o.y+dy; }
  else { const c=layerDrag.corner; if(c.includes('e'))L.w=Math.max(10,o.w+dx); if(c.includes('s'))L.h=Math.max(10,o.h+dy); if(c.includes('w')){ L.w=Math.max(10,o.w-dx); L.x=o.x+dx; } if(c.includes('n')){ L.h=Math.max(10,o.h-dy); L.y=o.y+dy; } }
  refreshLayers();
});
window.addEventListener('mouseup',()=>{ layerDrag=null; });
function compositeOverlay(){ requestAnimationFrame(compositeOverlay);
  if(overlay.width!==canvas.width||overlay.height!==canvas.height){ overlay.width=canvas.width; overlay.height=canvas.height; }
  octx.clearRect(0,0,overlay.width,overlay.height);
  for(const L of layers){ if(!L.vis)continue; octx.globalAlpha=L.op; octx.drawImage(L.cnv,L.x,L.y,L.w,L.h); }
  octx.globalAlpha=1;
  const editing=document.getElementById('pane-lay').classList.contains('active'); const L=layers[activeLayer];
  if(editing&&L){ octx.strokeStyle='#ff4dd2'; octx.lineWidth=2; octx.setLineDash([6,4]); octx.strokeRect(L.x,L.y,L.w,L.h); octx.setLineDash([]);
    octx.fillStyle='#4dd2ff'; for(const c of [[L.x,L.y],[L.x+L.w,L.y],[L.x,L.y+L.h],[L.x+L.w,L.y+L.h]]){ octx.fillRect(c[0]-HANDLE/2,c[1]-HANDLE/2,HANDLE,HANDLE); } }
}
compositeOverlay();
// composite stage + layers into a flat canvas (for export)
function flattenedCanvas(){ const t=makeLayerCanvas(canvas.width,canvas.height); const tx=t.getContext('2d'); tx.drawImage(canvas,0,0); for(const L of layers){ if(!L.vis)continue; tx.globalAlpha=L.op; tx.drawImage(L.cnv,L.x,L.y,L.w,L.h); } tx.globalAlpha=1; return t; }

//==================== PAINT ====================
const SWATCH_COLORS=['#ff4dd2','#4dd2ff','#6dffb0','#ffd54d','#ff5e4d','#b44dff','#ffffff','#000000'];
const swEl=document.getElementById('swatches');
SWATCH_COLORS.forEach((c,idx)=>{ const s=document.createElement('div'); s.className='sw'+(idx===0?' active':''); s.style.background=c;
  s.onclick=()=>{ document.getElementById('brushColor').value=c; document.querySelectorAll('.sw').forEach(e=>e.classList.remove('active')); s.classList.add('active'); }; swEl.appendChild(s); });
function setTool(t){ currentTool=t; document.getElementById('btnBrush').style.background=t==='brush'?'#3a2a6a':'#2c2658'; document.getElementById('btnErase').style.background=t==='erase'?'#3a2a6a':'#2c2658'; }
setTool('brush');
let painting=false,lastPt=null;
function canvasPt(e){ const r=canvas.getBoundingClientRect(); return {x:(e.clientX-r.left)/r.width*canvas.width, y:(e.clientY-r.top)/r.height*canvas.height}; }
canvas.addEventListener('mousedown',e=>{ if(!document.getElementById('pane-pnt').classList.contains('active'))return; painting=true; pushHistory(); lastPt=canvasPt(e); paintTo(lastPt); });
canvas.addEventListener('mousemove',e=>{ if(!painting)return; const p=canvasPt(e); strokeLine(lastPt,p); lastPt=p; });
window.addEventListener('mouseup',()=>{painting=false; lastPt=null;});
function brushStyle(){ const size=+document.getElementById('brushSize').value; const op=+document.getElementById('brushOpacity').value/100;
  ctx.lineWidth=size; ctx.lineCap='round'; ctx.lineJoin='round'; ctx.globalAlpha=op;
  if(currentTool==='erase'){ ctx.globalCompositeOperation='destination-out'; ctx.strokeStyle='#000'; ctx.fillStyle='#000'; }
  else { ctx.globalCompositeOperation='source-over'; ctx.strokeStyle=document.getElementById('brushColor').value; ctx.fillStyle=ctx.strokeStyle; } return size; }
function paintTo(p){ const s=brushStyle(); ctx.beginPath(); ctx.arc(p.x,p.y,s/2,0,Math.PI*2); ctx.fill(); reset(); }
function strokeLine(a,b){ brushStyle(); ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke(); reset(); }
function reset(){ ctx.globalAlpha=1; ctx.globalCompositeOperation='source-over'; }

// live slider labels
document.getElementById('pixSize').addEventListener('input',e=>document.getElementById('vPix').textContent=e.target.value);
document.getElementById('glitchAmt').addEventListener('input',e=>document.getElementById('vGlitch').textContent=e.target.value);
document.getElementById('brushSize').addEventListener('input',e=>document.getElementById('vBrush').textContent=e.target.value);
document.getElementById('brushOpacity').addEventListener('input',e=>document.getElementById('vOpacity').textContent=e.target.value);

//==================== AI ====================
function onProviderChange(){
  const p=document.getElementById('aiProvider').value;
  document.getElementById('keyBox').style.display = p==='pollinations'?'none':'block';
  const saved=localStorage.getItem('aikey_'+p); if(saved) document.getElementById('apiKey').value=saved;
}
document.getElementById('apiKey')?.addEventListener('change',e=>{ const p=document.getElementById('aiProvider').value; localStorage.setItem('aikey_'+p,e.target.value); });

async function generateAI(){
  const provider=document.getElementById('aiProvider').value;
  let prompt=document.getElementById('aiPrompt').value.trim();
  prompt+=document.getElementById('aiStyle').value;
  if(!prompt){ toast('Type a prompt first! '); return; }
  toast('Summoning pixels... ');
  try{
    if(provider==='pollinations'){
      const W=canvas.width,H=canvas.height;
      const url=`https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${W}&height=${H}&seed=${Math.floor(Math.random()*99999)}&nologo=true`;
      const img=new Image(); img.crossOrigin='anonymous';
      img.onload=()=>{ pushHistory(); ctx.drawImage(img,0,0,W,H); toast('AI art delivered! '); };
      img.onerror=()=>toast('Pollinations hiccup  try again');
      img.src=url;
    } else if(provider==='stability'){
      const key=document.getElementById('apiKey').value.trim();
      if(!key){ toast('Need a Stability key '); return; }
      const res=await fetch('https://api.stability.ai/v2beta/stable-image/generate/core',{
        method:'POST', headers:{Authorization:'Bearer '+key, Accept:'image/*'},
        body:(()=>{const f=new FormData(); f.append('prompt',prompt); f.append('output_format','png'); return f;})()
      });
      if(!res.ok){ toast('Stability error '+res.status); return; }
      const blob=await res.blob(); drawBlob(blob);
    } else if(provider==='openai'){
      const key=document.getElementById('apiKey').value.trim();
      if(!key){ toast('Need an OpenAI key '); return; }
      const res=await fetch('https://api.openai.com/v1/images/generations',{
        method:'POST', headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},
        body:JSON.stringify({model:'dall-e-3',prompt,n:1,size:'1024x1024',response_format:'b64_json'})
      });
      const j=await res.json();
      if(j.error){ toast('OpenAI: '+j.error.message); return; }
      const img=new Image(); img.onload=()=>{ pushHistory(); setSize(1024,1024); ctx.drawImage(img,0,0); toast('DALLÂ·E done! '); };
      img.src='data:image/png;base64,'+j.data[0].b64_json;
    }
  }catch(err){ toast('AI failed: '+err.message); }
}
function drawBlob(blob){ const img=new Image(); img.onload=()=>{ pushHistory(); canvas.width=img.width; canvas.height=img.height; ctx.drawImage(img,0,0); updateDims(); toast('AI art delivered! '); }; img.src=URL.createObjectURL(blob); }

//==================== INIT ====================
ctx.fillStyle='#0d0b1a'; ctx.fillRect(0,0,canvas.width,canvas.height);
gen('nebula'); updateDims(); readAdj();
