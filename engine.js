'use strict';

/* ---- language / content selection -------------------------------------- */
const LANGS = window.LIE_CONTENT || {};
function pickLang(){
  const q = new URLSearchParams(location.search).get('lang');
  if(q && LANGS[q]) return q;
  const h = document.documentElement.getAttribute('lang');
  if(h && LANGS[h]) return h;
  if(LANGS.hu) return 'hu';
  return Object.keys(LANGS)[0];
}
const LANG = pickLang();
const C = LANGS[LANG];
if(!C){ throw new Error('No LIE_CONTENT loaded — include a content/<lang>.js file.'); }
document.documentElement.lang = (C.meta && C.meta.htmlLang) || LANG;
if(C.meta && C.meta.title) document.title = C.meta.title;

/* localized static chrome */
document.getElementById('hint').innerHTML = C.ui.hint.join('<br>');
document.getElementById('prev').setAttribute('aria-label', C.ui.prevAria);
document.getElementById('next').setAttribute('aria-label', C.ui.nextAria);

/* language dropdown (only shown when more than one language is available) */
(function(){
  const codes = Object.keys(LANGS);
  const wrap = document.getElementById('lang');
  if(codes.length < 2){ wrap.hidden = true; return; }
  const curMeta = C.meta || {};

  const btn = document.createElement('button');
  btn.id = 'langbtn'; btn.type = 'button';
  btn.setAttribute('aria-haspopup', 'listbox');
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-label', (C.ui && C.ui.langMenuLabel) || 'Language');
  btn.innerHTML = '<span class="flag">'+(curMeta.flag||'🌐')+'</span><span class="caret">▾</span>';

  const menu = document.createElement('ul');
  menu.id = 'langmenu'; menu.setAttribute('role', 'listbox'); menu.hidden = true;
  codes.forEach(code=>{
    const m = LANGS[code].meta || {};
    const li = document.createElement('li'); li.setAttribute('role', 'option');
    const a = document.createElement('a'); a.href = '?lang=' + code;
    if(code === LANG){ a.className = 'on'; li.setAttribute('aria-selected', 'true'); }
    a.innerHTML = '<span class="flag">'+(m.flag||'🌐')+'</span><span>'+(m.langLabel||code)+'</span>';
    li.appendChild(a); menu.appendChild(li);
  });

  wrap.appendChild(btn); wrap.appendChild(menu);
  const setOpen = v=>{ menu.hidden = !v; btn.setAttribute('aria-expanded', v?'true':'false'); };
  btn.addEventListener('click', e=>{ e.stopPropagation(); setOpen(menu.hidden); });
  document.addEventListener('click', e=>{ if(!wrap.contains(e.target)) setOpen(false); });
  document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !menu.hidden){ setOpen(false); btn.focus(); } });
})();

/* ---- toolkit + journey selection --------------------------------------- */
const K = window.LIE && LIE.kit;
if(!K){ throw new Error('LIE.kit not loaded — include kit.js before engine.js.'); }
const { V3, ease, clamp, RM } = K;

const JOURNEYS = (window.LIE && LIE.journeys) || {};
const DEFAULT_JOURNEY = 'so3-optimization';
const journeyId = new URLSearchParams(location.search).get('journey');
const journeyDef = (journeyId && JOURNEYS[journeyId]) || JOURNEYS[DEFAULT_JOURNEY] || Object.values(JOURNEYS)[0];
if(!journeyDef){ throw new Error('No journey registered — include a journeys/<id>.js before engine.js.'); }

/* ---- three.js scene ---------------------------------------------------- */
const renderer = new THREE.WebGLRenderer({canvas:document.getElementById('c'),antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setClearColor(0x0d1220);
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0d1220, 0.0052);
const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 900);

scene.add(new THREE.AmbientLight(0xbdc4d6, 0.75));
const key = new THREE.DirectionalLight(0xffffff, 0.55); key.position.set(3,6,4); scene.add(key);

/* ---- journey instance + layout ----------------------------------------- */
const inst = journeyDef.build(C);
const SP = journeyDef.layout.SP;
const OFF = journeyDef.layout.OFF;
const LOOK = SP.map(p=>p.clone().add(V3(0,0.55,0)));

/* violet thread through the stations */
const thread = (()=>{
  const curve = new THREE.CatmullRomCurve3(SP.map(p=>p.clone().add(V3(0,-2.5,0))));
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 200, 0.05, 6, false),
    new THREE.MeshBasicMaterial({color:(journeyDef.threadColor||0x7F77DD), transparent:true, opacity:0.16}));
  scene.add(m); return m;
})();
/* starfield, centered on the journey's span */
(()=>{
  const cx = SP.reduce((s,p)=>s+p.x,0)/SP.length;
  const N=1100, pos=new Float32Array(N*3);
  for(let i=0;i<N;i++){
    const r=180+Math.random()*520, a=Math.random()*Math.PI*2, b=Math.acos(2*Math.random()-1);
    pos[3*i]=cx+r*Math.sin(b)*Math.cos(a); pos[3*i+1]=r*Math.cos(b)*0.55; pos[3*i+2]=r*Math.sin(b)*Math.sin(a);
  }
  const g=new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos,3));
  const p=new THREE.Points(g, new THREE.PointsMaterial({color:0x9aa4c0,size:1.1,sizeAttenuation:false,transparent:true,opacity:0.5,fog:false}));
  scene.add(p);
})();

/* ---- stations from the journey ----------------------------------------- */
const stations = [];
function addStation(build){
  const i = stations.length;
  const group = new THREE.Group(); group.position.copy(SP[i]);
  const st = build(group) || {};
  st.group = group; scene.add(group); stations.push(st);
}
inst.stations.forEach(b => addStation(b));

/* ---- HUD / navigation -------------------------------------------------- */
const CARDS = C.cards;

let cur=0, travel=null;
let yaw=0, pitch=0, zoomF=1;
const hud=document.getElementById('hud'), eb=document.getElementById('eb'),
      ti=document.getElementById('ti'), bo=document.getElementById('bo'),
      dots=document.getElementById('dots');
CARDS.forEach((_,i)=>{
  const d=document.createElement('div'); d.className='dot'+(i===0?' on':'');
  d.onclick=()=>go(i); dots.appendChild(d);
});
function renderCard(i){
  eb.textContent=C.ui.stationWord+' '+(i+1)+' / '+CARDS.length;
  ti.textContent=CARDS[i].t;
  bo.innerHTML=CARDS[i].b;
  [...dots.children].forEach((d,k)=>d.classList.toggle('on',k===i));
  document.getElementById('prev').disabled=(i===0);
  document.getElementById('next').disabled=(i===CARDS.length-1);
  inst.bindCard(i);
}
function camPose(i){
  const s=new THREE.Spherical().setFromVector3(OFF[i]);
  s.theta-=yaw; s.phi=clamp(s.phi-pitch, 0.15, Math.PI-0.15);
  s.radius*=zoomF;
  return {pos:LOOK[i].clone().add(V3(0,0,0).setFromSpherical(s)), look:LOOK[i]};
}
function go(i){
  if(i===cur || i<0 || i>=CARDS.length || travel) return;
  const from=camPose(cur);
  yaw=0; pitch=0; zoomF=1;
  const to=camPose(i);
  hud.classList.add('fade');
  if(RM){ cur=i; camera.position.copy(to.pos); camera.lookAt(to.look);
    renderCard(i); hud.classList.remove('fade'); return; }
  travel={t0:performance.now(), dur:1900, from, to, target:i};
}
document.getElementById('prev').onclick=()=>go(cur-1);
document.getElementById('next').onclick=()=>go(cur+1);
addEventListener('keydown',e=>{
  if(e.key==='ArrowRight') go(cur+1);
  if(e.key==='ArrowLeft') go(cur-1);
});

/* close any open "what is δ"-style bubble on outside-click or Escape */
document.addEventListener('click', e=>{
  const bub=document.getElementById('s5deltabubble'), info=document.getElementById('s5deltainfo');
  if(bub && !bub.hidden && info && !bub.contains(e.target) && !info.contains(e.target)){
    bub.hidden=true; info.setAttribute('aria-expanded','false');
  }
});
addEventListener('keydown', e=>{
  if(e.key!=='Escape') return;
  const bub=document.getElementById('s5deltabubble'), info=document.getElementById('s5deltainfo');
  if(bub && !bub.hidden){ bub.hidden=true; if(info){ info.setAttribute('aria-expanded','false'); info.focus(); } }
});

const cv=document.getElementById('c');
let dragging=false,lx=0,ly=0;
cv.addEventListener('pointerdown',e=>{dragging=true;lx=e.clientX;ly=e.clientY;cv.classList.add('grabbing');cv.setPointerCapture(e.pointerId);});
cv.addEventListener('pointermove',e=>{
  if(!dragging||travel) return;
  yaw+=(e.clientX-lx)*0.005; pitch+=(e.clientY-ly)*0.004;
  pitch=clamp(pitch,-1.1,1.1); lx=e.clientX; ly=e.clientY;
});
cv.addEventListener('pointerup',e=>{dragging=false;cv.classList.remove('grabbing');});
cv.addEventListener('wheel',e=>{
  if(travel) return;
  e.preventDefault();
  zoomF=clamp(zoomF*(1+Math.sign(e.deltaY)*0.08), 0.55, 2.1);
},{passive:false});

function resize(){
  camera.aspect=innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
}
addEventListener('resize',resize); resize();

renderCard(0);
{ const p=camPose(0); camera.position.copy(p.pos); camera.lookAt(p.look); }

const clock=new THREE.Clock();
function loop(){
  requestAnimationFrame(loop);
  const t=clock.getElapsedTime();
  if(travel){
    const u=clamp((performance.now()-travel.t0)/travel.dur,0,1), e=ease(u);
    camera.position.lerpVectors(travel.from.pos, travel.to.pos, e);
    const lk=travel.from.look.clone().lerp(travel.to.look, e);
    camera.lookAt(lk);
    if(u>=1){ cur=travel.target; travel=null; renderCard(cur); hud.classList.remove('fade'); }
  } else {
    const p=camPose(cur);
    camera.position.lerp(p.pos, 0.14);
    camera.lookAt(p.look);
  }
  stations.forEach((s,i)=>{
    if(Math.abs(i-cur)<=1 && s.tick) s.tick(t);
  });
  renderer.render(scene,camera);
}
loop();
