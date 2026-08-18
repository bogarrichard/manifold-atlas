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
document.getElementById('prev').setAttribute('aria-label', C.ui.prevAria);
document.getElementById('next').setAttribute('aria-label', C.ui.nextAria);

/* Language list (only shown when more than one pack is loaded). It lives inside the
   top-right menu panel, so it is a plain always-visible list — a dropdown nested in a
   dropdown would need two clicks to reach one link. */
(function(){
  const codes = Object.keys(LANGS);
  const sec = document.getElementById('msec-lang');
  if(codes.length < 2){ sec.hidden = true; return; }
  const menu = document.createElement('ul');
  menu.id = 'langmenu'; menu.setAttribute('role', 'listbox');
  codes.forEach(code=>{
    const m = LANGS[code].meta || {};
    const li = document.createElement('li'); li.setAttribute('role', 'option');
    // keep the rest of the query (notably ?journey=) so switching language stays
    // on the current journey instead of dropping back to the default one
    const q = new URLSearchParams(location.search); q.set('lang', code);
    const a = document.createElement('a'); a.href = '?' + q.toString();
    if(code === LANG){ a.className = 'on'; li.setAttribute('aria-selected', 'true'); }
    a.innerHTML = '<span class="flag">'+(m.flag||'🌐')+'</span><span>'+(m.langLabel||code)+'</span>';
    li.appendChild(a); menu.appendChild(li);
  });
  document.getElementById('lang').appendChild(menu);
})();

/* ---- toolkit + mode selection ------------------------------------------ */
const K = window.LIE && LIE.kit;
if(!K){ throw new Error('LIE.kit not loaded — include kit.js before engine.js.'); }
const { V3, ease, clamp, RM, palette } = K;

const JOURNEYS = (window.LIE && LIE.journeys) || {};
const DEFAULT_JOURNEY = 'so3-optimization';
const journeyId = new URLSearchParams(location.search).get('journey');
// no ?journey= at all => land on the hub; an explicit id always wins
const hubMode = (journeyId === 'hub' || !journeyId) && !!(window.LIE && LIE.hub);
let journeyDef = null;
if(!hubMode){
  journeyDef = (journeyId && JOURNEYS[journeyId]) || JOURNEYS[DEFAULT_JOURNEY] || Object.values(JOURNEYS)[0];
  if(!journeyDef){ throw new Error('No journey registered — include a journeys/<id>.js before engine.js.'); }
}
document.body.classList.toggle('hub', hubMode);

/* ---- theme (dark / light / system) ------------------------------------- */
const THEME_KEY = 'lie-theme';
const mqlDark = matchMedia('(prefers-color-scheme: dark)');
function storedPref(){
  try{ const v = localStorage.getItem(THEME_KEY); return (v==='light'||v==='dark'||v==='system') ? v : 'system'; }
  catch(e){ return 'system'; }
}
function resolveTheme(pref){
  if(pref==='light' || pref==='dark') return pref;
  return mqlDark.matches ? 'dark' : 'light';
}
let themePref = storedPref();
let theme = resolveTheme(themePref);
document.documentElement.setAttribute('data-theme', theme);
let PAL = palette(theme);

/* ---- three.js scene (shared) ------------------------------------------- */
const cv = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({canvas:cv, antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 900);
scene.add(new THREE.AmbientLight(0xbdc4d6, 0.75));
const key = new THREE.DirectionalLight(0xffffff, 0.55); key.position.set(3,6,4); scene.add(key);
function applySceneTheme(){
  renderer.setClearColor(PAL.bg);
  scene.fog = new THREE.FogExp2(PAL.fog, 0.0052);
}
applySceneTheme();

/* ---- theme toggle (shared; content re-theme delegated per mode) -------- */
let rethemeContent = ()=>{};
const THEME_ICON = {system:'◐', light:'☀', dark:'☾'};
const THEME_NEXT = {system:'light', light:'dark', dark:'system'};
const themeBtn = document.createElement('button');
themeBtn.id='themebtn'; themeBtn.type='button';
document.getElementById('theme').appendChild(themeBtn);
function updateThemeBtn(){
  const tl = (C.ui && C.ui.theme) || {};
  const name = tl[themePref] || themePref;
  // inside the menu the button has room to say where it currently stands, not just show a glyph
  themeBtn.innerHTML = '<span class="ticon" aria-hidden="true">'+THEME_ICON[themePref]+'</span><span></span>';
  themeBtn.lastChild.textContent = name;
  themeBtn.title = (tl.label||'Theme') + ': ' + name;
  themeBtn.setAttribute('aria-label', (tl.label||'Theme') + ': ' + name);
}
function setTheme(next){
  if(next===theme) return;
  theme=next; document.documentElement.setAttribute('data-theme', theme);
  PAL=palette(theme); applySceneTheme(); rethemeContent();
}
function applyPref(pref){
  themePref=pref;
  try{ localStorage.setItem(THEME_KEY, pref); }catch(e){}
  setTheme(resolveTheme(pref));
  updateThemeBtn();
}
themeBtn.addEventListener('click', ()=>applyPref(THEME_NEXT[themePref]));
updateThemeBtn();

/* ---- text size (default / large / larger) ------------------------------
   Same cycling-button shape as the theme toggle above, and the same reason for it: one
   control that shows where it currently stands rather than a picker that has to be
   opened to find out. The three steps scale `--text-scale`, which every fluid font-size
   in style.css (`clamp(...) * var(--text-scale)`) multiplies in — so this stacks with,
   rather than replaces, the viewport-based scaling already there. Default is 1 (matches
   every size already chosen for the "default" case), not tied to any OS-level signal:
   unlike color scheme, there is no cross-browser media query for a user's preferred text
   scale to default to, so "unless you ask, nothing changes" is the honest default. */
const TEXTSIZE_KEY = 'lie-textsize';
const TEXT_SCALE = { default: 1, large: 1.15, larger: 1.3 };
const TEXT_SCALE_NEXT = { default: 'large', large: 'larger', larger: 'default' };
function storedTextSizePref(){
  try{ const v = localStorage.getItem(TEXTSIZE_KEY); return TEXT_SCALE[v] ? v : 'default'; }
  catch(e){ return 'default'; }
}
let textSizePref = storedTextSizePref();
document.documentElement.style.setProperty('--text-scale', TEXT_SCALE[textSizePref]);
const textSizeBtn = document.createElement('button');
textSizeBtn.id='textsizebtn'; textSizeBtn.type='button';
document.getElementById('textsize').appendChild(textSizeBtn);
function updateTextSizeBtn(){
  const tl = (C.ui && C.ui.textSize) || {};
  const name = tl[textSizePref] || textSizePref;
  // the icon's own size grows with each step — the control demonstrates its own effect
  // rather than relying on a label alone to say what "large" means
  textSizeBtn.innerHTML = '<span class="ticon tsicon tsicon-'+textSizePref+'" aria-hidden="true">A</span><span></span>';
  textSizeBtn.lastChild.textContent = name;
  textSizeBtn.title = (tl.label||'Text size') + ': ' + name;
  textSizeBtn.setAttribute('aria-label', (tl.label||'Text size') + ': ' + name);
}
function applyTextSizePref(pref){
  textSizePref = pref;
  try{ localStorage.setItem(TEXTSIZE_KEY, pref); }catch(e){}
  document.documentElement.style.setProperty('--text-scale', TEXT_SCALE[pref]);
  updateTextSizeBtn();
}
textSizeBtn.addEventListener('click', ()=>applyTextSizePref(TEXT_SCALE_NEXT[textSizePref]));
updateTextSizeBtn();
mqlDark.addEventListener('change', ()=>{ if(themePref==='system') setTheme(resolveTheme('system')); });

/* ---- top-right menu: theme + language + the control legend ------------- */
(function(){
  const ui = C.ui || {}, tl = ui.theme || {};
  const btn = document.getElementById('menubtn');
  const panel = document.getElementById('menupanel');
  const cluster = document.getElementById('topctl');
  btn.setAttribute('aria-label', ui.menuLabel || 'Menu');
  btn.title = ui.menuLabel || 'Menu';
  document.getElementById('mtheme-h').textContent = tl.label || 'Theme';
  document.getElementById('mtextsize-h').textContent = (ui.textSize && ui.textSize.label) || 'Text size';
  document.getElementById('mlang-h').textContent = ui.langMenuLabel || 'Language';
  document.getElementById('mhint-h').textContent = ui.controlsLabel || 'Controls';
  const setOpen = v=>{ panel.hidden = !v; btn.setAttribute('aria-expanded', v?'true':'false'); };
  btn.addEventListener('click', e=>{ e.stopPropagation(); setOpen(panel.hidden); });
  document.addEventListener('click', e=>{ if(!panel.hidden && !cluster.contains(e.target)) setOpen(false); });
  // Escape closes the menu first and stops there — the journey's own Escape handler backs
  // out to the hub, which would be a surprise when you only meant to dismiss this panel.
  // Document fires before the window-level handler, so stopping propagation here is enough.
  document.addEventListener('keydown', e=>{
    if(e.key!=='Escape' || panel.hidden) return;
    e.stopPropagation(); setOpen(false); btn.focus();
  });
})();

/* ---- resize (shared) --------------------------------------------------- */
/* The canvas covers the whole window, but the text card eats into it. Shifting the
   frustum re-centers the scene in what is left, so nothing important ends up hidden
   behind the card. Journeys shift sideways (the card sits on the left, full-height);
   the hub shifts vertically (the card is now a bottom mission bar, full-width) — a
   fixed amount rather than the card's measured height, so hovering a branch (which
   changes the card's content, hence its height) does not jiggle the framing. Below the
   mobile breakpoint both cards go full-width bars and there is no free column/row left
   to center in, so neither shifts. The hub also skips the *sideways* shift regardless of
   width: its outermost orbit already fills the viewport, so nudging it sideways would
   swing the far planet off the edge. */
const hudEl = document.getElementById('hud');
/* Confirmed on a real device, independent of any of the above: the very first paint of
   #hud after page load can come back completely blank — no background, no border, no
   text — while #nav/#topctl (static markup, not their own scroll container) paint
   correctly from the first frame. The very next station's fade transition (which toggles
   this same element's class, forcing a style recalc) fixes it on its own, which is why
   the bug is easy to miss testing past the first screen. #hud is the only fixed-position
   element here that is ALSO its own overflow:auto scroll container with content and a
   custom property (`--bubmax`) set by JS before that first paint — a combination some
   engines mishandle on the very first frame. Forcing an extra reflow right after that
   content lands closes the gap between "the DOM is correct" and "the browser actually
   painted it". */
function forceRepaint(el){
  el.style.display='none';
  void el.offsetHeight;
  el.style.display='';
}
/* px the scene shifts up, off a bottom-anchored card — the hub bar always, and now (once
   the mobile breakpoint hits) a journey's card too, since it also docks to the bottom
   there. The card has a *fixed* height on that edge (the hub bar's is set in the CSS; a
   mobile journey card is capped by `.scrolls`), so this can be derived from it instead of
   hard-coded: lifting by half the space it occupies centers the rest of the scene in what
   is left. Deriving it also means a hover-driven height change on desktop never needs to
   fight a stale fixed value. The `bottom` offset itself is read live too (12px on mobile,
   26px for the hub on desktop) rather than hard-coded, so it can never drift out of step
   with the CSS. Falls back to a rough guess only if the card has not been laid out yet. */
function bottomLift(){
  const h = hudEl.getBoundingClientRect().height || innerHeight * (hubMode ? 0.40 : 0.50);
  const gap = parseFloat(getComputedStyle(hudEl).bottom) || 12;
  return Math.round((h + gap) / 2);
}
// Returns the (ox, oy) pair to hand straight to camera.setViewOffset — signs verified
// empirically (a positive ox pushes content left, a positive oy pushes it up), not
// derived from the setViewOffset docs, which describe the sub-rectangle it reads from a
// larger virtual sensor rather than the on-screen effect that has.
function viewShift(){
  // Below the mobile breakpoint both cards go full-width bottom bars (see style.css), so
  // there is no free side column to center in either — but lifting the scene up and out
  // from under whichever one is showing still applies the same way it does for the hub on
  // desktop, hence sharing bottomLift() rather than returning {0,0} here.
  if(innerWidth <= 640 || hubMode) return {ox:0, oy:bottomLift()};   // positive oy => content moves up
  return {ox:-(hudEl.getBoundingClientRect().right / 2), oy:0};  // negative ox => content moves right
}
function resize(){
  camera.aspect=innerWidth/innerHeight;
  const s=viewShift();
  // setViewOffset re-derives aspect from the full size, so the image is not stretched
  if(s.ox||s.oy) camera.setViewOffset(innerWidth, innerHeight, s.ox, s.oy, innerWidth, innerHeight);
  else camera.clearViewOffset();
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
  syncHudScroll();
}
/* The longest cards do not fit a short viewport. Those get `.scrolls`, which makes the
   card a scroll box — and since a scroll box clips whatever hangs out of it, the CSS then
   moves the footnote panels into the flow. A card that fits keeps `overflow:visible` and
   with it the floating panel, whose height is clamped here to the room actually left below
   the card; when even that is too small to read, the card takes the inline treatment too.
   Measured off the flow content: `scrollHeight` counts an open floating panel, which hangs
   below the card on purpose, and would report a card that fits as overflowing. */
const boEl = document.getElementById('bo');
const navEl = document.getElementById('nav');
const PANEL_MIN = 200;      // a floating panel shorter than this is not worth reading
/* The controls used to float *below* the card, so the card had to stop 78px short of the
   bottom to leave them room. They are inside it now (the console rail), so all that is
   still owed is the same breathing room the card keeps at the top. Mirrors `.scrolls`. */
const BOTTOM_KEEP = 22;
function syncHudScroll(){
  const top = hudEl.offsetTop;
  /* Measured off the flow content plus the rail, and deliberately NOT off `navEl.offsetTop`
     or `hudEl.scrollHeight`: the rail is `position:sticky`, so once it sticks `offsetTop`
     reports where it is *painted*, not where it sits in layout (810 instead of ~1305 on a
     long card) — which under-reports the card's height and leaves `.scrolls` off, running
     the card straight off the bottom of the window. `scrollHeight` is right for the rail
     but wrong for the bubble (it counts an open floating panel, which hangs below the card
     on purpose). `offsetHeight` and the computed margin are stable under sticky, so the
     rail's contribution is added explicitly. No padding term appears here because the card
     now has *no* bottom padding — the rail carries that gutter itself, which is what lets
     it stick flush to the card's bottom edge instead of floating a padding's width above it. */
  const navMt = parseFloat(getComputedStyle(navEl).marginTop) || 0;
  const need = boEl.offsetTop + boEl.offsetHeight + navMt + navEl.offsetHeight;
  // the hub card has no ↑ button competing for room below it, and is bottom-anchored
  // besides, so there is no bottom margin to reserve
  const avail = innerHeight - top - (hubMode ? 0 : BOTTOM_KEEP);
  const room = innerHeight - (top + Math.min(need, avail)) - 24;  // the 12px gap under the card, and as much again below
  hudEl.style.setProperty('--bubmax', Math.max(0, room) + 'px');
  // the hub has no floating footnote panel to reserve room for — it never needs `room`
  // (which is near-zero anyway: the hub card sits close to the bottom edge on purpose)
  hudEl.classList.toggle('scrolls', need > avail || (!hubMode && room < PANEL_MIN));
}
// resize() (not just syncHudScroll()) so the mobile edgeLift() shift — which reads the
// card's live height — stays correct as a station's content changes it, not only on an
// actual window resize; resize() already calls syncHudScroll() itself at its tail.
if(window.ResizeObserver) new ResizeObserver(resize).observe(boEl);
addEventListener('resize',resize); resize();

/* ========================================================================
   HUB MODE
   ===================================================================== */
if(hubMode){
  // hub.js's syncFocus() owns this from here on (it swaps system/planet hints); this initial
  // value only covers the instant before that first runs, so it always starts in system mode
  document.getElementById('hint').innerHTML = (C.hub && C.hub.hintSystem || []).join('<br>');
  // hidden on the map; hub.js brings the nav strip back as the planet view's carousel control
  document.getElementById('nav').style.display = 'none';
  const eb=document.getElementById('eb'), ti=document.getElementById('ti'), bo=document.getElementById('bo');
  eb.textContent = (C.hub && C.hub.eyebrow) || '';
  ti.textContent = (C.meta && C.meta.title) || '';
  bo.innerHTML   = (C.hub && C.hub.intro) || '';

  const hubApi = LIE.hub.run({ THREE, kit:K, scene, camera, renderer, canvas:cv, C, PAL });
  rethemeContent = ()=>{ hubApi.retheme(PAL); };
  requestAnimationFrame(()=>forceRepaint(hudEl));   // see forceRepaint's comment above

/* ========================================================================
   JOURNEY MODE
   ===================================================================== */
} else {
  document.getElementById('hint').innerHTML = C.ui.hint.join('<br>');

  const urlLang = () => new URLSearchParams(location.search).get('lang');
  function goHub(){
    const l = urlLang();
    // stamp which planet+moon this journey lives on, so the hub can land back on the
    // exact spot left rather than always resetting to the system map
    const m = (LIE.hub && LIE.hub.moonOf) ? LIE.hub.moonOf(journeyId) : null;
    const spot = m ? ('&planet='+encodeURIComponent(m.branchId)+'&moon='+encodeURIComponent(m.moonKey)) : '';
    location.href = '?journey=hub'+(l?('&lang='+l):'')+spot;
  }

  /* The last station is where a reader decides what to read next, and until now that
     decision was only ever *stated* — eleven journeys end by naming a destination ("that
     is the SO(3) moon", "the next moon") with nothing to act on. The only control there
     was ↓, which lands in system view: from a named moon, four or five more interactions
     to reach it. `journeyDef.seq` turns those sentences into links.

     Rendered inside #bo, not appended after it, for two reasons: syncHudScroll() measures
     the card off `boEl`, so anything outside it is invisible to the `.scrolls` decision;
     and a synthetic extra *card* — the other obvious shape for this — would break the
     `cards[LANG].length === stations.length` invariant that check.html exists to defend,
     taking OFF[i]/camPose() with it. This adds no station and no dot.

     Link text is the moon's own title from the content pack (via LIE.hub.moonOf), so no
     journey name lives in the engine. `handoffs` minus `next` because a journey may name
     the same moon both ways round and one link is enough. */
  function whatNext(){
    const seq = journeyDef.seq || {};
    const label = id => {
      const m = (LIE.hub && LIE.hub.moonOf) ? LIE.hub.moonOf(id) : null;
      if(!m) return id;
      const br = ((C.hub && C.hub.branches) || {})[m.branchId] || {};
      return ((br.moons || {})[m.moonKey] || {}).title || m.fallback || id;
    };
    const l = urlLang();
    const href = id => '?journey='+encodeURIComponent(id)+(l?('&lang='+encodeURIComponent(l)):'');
    const link = (id,cls) => '<a class="'+cls+'" href="'+href(id)+'">'+label(id)+'</a>';
    const row = (lab,body) => '<p class="wnrow"><span class="wnlab">'+lab+'</span>'+body+'</p>';
    const U = C.ui || {};
    let h = '';
    if(seq.next) h += row(U.nextStop||'', link(seq.next,'wngo'));
    const also = (seq.handoffs||[]).filter(id => id !== seq.next);
    if(also.length) h += row(U.alsoSee||'', also.map(id=>link(id,'wnalso')).join(''));
    // A same-planet "next moon", purely from the BRANCHES order — independent of (and often
    // redundant with) the hand-authored seq.next/handoffs above, so only added when it names
    // a moon those don't already offer.
    const nm = (LIE.hub && LIE.hub.nextMoon) ? LIE.hub.nextMoon(journeyId) : null;
    if(nm && nm!==seq.next && !also.includes(nm)) h += row(U.nextMoon||U.nextStop||'', link(nm,'wngo'));
    return h ? '<nav class="whatnext" aria-label="'+(U.whatNextAria||'')+'">'+h+'</nav>' : '';
  }
  const toHubBtn = document.getElementById('tohub');
  toHubBtn.hidden = false;
  toHubBtn.setAttribute('aria-label', (C.ui && C.ui.hubBackAria) || 'Hub');
  toHubBtn.title = (C.ui && C.ui.hubBackAria) || 'Hub';
  toHubBtn.onclick = goHub;

  const SP = journeyDef.layout.SP;
  const OFF = journeyDef.layout.OFF;
  const LOOK = SP.map(p=>p.clone().add(V3(0,0.55,0)));

  let world = null, stations = [], curInst = null;
  function disposeWorld(){
    if(!world) return;
    world.traverse(o=>{ if(o.geometry) o.geometry.dispose();
      if(o.material){ const arr=Array.isArray(o.material)?o.material:[o.material];
        arr.forEach(m=>{ if(m.map) m.map.dispose(); m.dispose(); }); } });
    scene.remove(world); world=null;
  }
  function buildScene(){
    disposeWorld();
    world = new THREE.Group(); scene.add(world);
    const tc = new THREE.CatmullRomCurve3(SP.map(p=>p.clone().add(V3(0,-2.5,0))));
    world.add(new THREE.Mesh(new THREE.TubeGeometry(tc, 200, 0.05, 6, false),
      new THREE.MeshBasicMaterial({color:PAL[journeyDef.threadKey||'violet2'], transparent:true, opacity:0.16})));
    const cx = SP.reduce((s,p)=>s+p.x,0)/SP.length;
    const N=1100, pos=new Float32Array(N*3);
    for(let i=0;i<N;i++){
      const r=180+Math.random()*520, a=Math.random()*Math.PI*2, b=Math.acos(2*Math.random()-1);
      pos[3*i]=cx+r*Math.sin(b)*Math.cos(a); pos[3*i+1]=r*Math.cos(b)*0.55; pos[3*i+2]=r*Math.sin(b)*Math.sin(a);
    }
    const sg=new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos,3));
    world.add(new THREE.Points(sg, new THREE.PointsMaterial({color:PAL.star,size:1.1,sizeAttenuation:false,transparent:true,opacity:PAL.starOpacity,fog:false})));
    curInst = journeyDef.build(C, PAL);
    stations = [];
    curInst.stations.forEach((b,i)=>{
      const grp = new THREE.Group(); grp.position.copy(SP[i]);
      const st = b(grp) || {}; st.group = grp; world.add(grp); stations.push(st);
    });
  }
  buildScene();
  rethemeContent = ()=>{ buildScene(); renderCard(cur); };

  // a journey may ship its own per-language cards (self-contained prototypes do);
  // otherwise fall back to the shared content-pack cards.
  const CARDS = (journeyDef.cards && (journeyDef.cards[LANG] || journeyDef.cards.hu || journeyDef.cards.en)) || C.cards;
  let cur=0, travel=null;
  let yaw=0, pitch=0, zoomF=1;
  const hud=document.getElementById('hud'), eb=document.getElementById('eb'),
        ti=document.getElementById('ti'), bo=document.getElementById('bo'),
        dots=document.getElementById('dots'), dotctr=document.getElementById('dotctr');
  // real <button>s, matching the hub's strip: a <div> is not focusable, cannot be
  // activated from the keyboard, and announces nothing — yet these dots are the only
  // way to jump straight to a station.
  const dotLabel = i => C.ui.stationWord+' '+(i+1)+' / '+CARDS.length+' — '+CARDS[i].t;
  CARDS.forEach((_,i)=>{
    const d=document.createElement('button');
    d.type='button'; d.className='dot'+(i===0?' on':'');
    d.title=CARDS[i].t; d.setAttribute('aria-label', dotLabel(i));
    d.onclick=()=>go(i); dots.appendChild(d);
  });
  function renderCard(i){
    eb.textContent=C.ui.stationWord+' '+(i+1)+' / '+CARDS.length;
    dotctr.textContent=(i+1)+' / '+CARDS.length;   // the dot row's mobile stand-in (style.css)
    ti.textContent=CARDS[i].t;
    bo.innerHTML=CARDS[i].b + (i===CARDS.length-1 ? whatNext() : '');
    hud.scrollTop=0;   // a long previous card may have left the box scrolled down
    syncHudScroll();   // the card's own length decides whether it scrolls — measure it now
                       // rather than waiting on the ResizeObserver, whose delivery rides
                       // the rendering steps and so lags (or stalls) exactly when a long
                       // card most needs clamping. The observer stays as the backstop for
                       // reflows this path cannot see (font swap, viewport-driven rewrap).
    [...dots.children].forEach((d,k)=>{
      d.classList.toggle('on',k===i);
      // aria-current is what carries "you are here" to a screen reader; the .on class
      // is purely visual. Removed rather than set to "false" — false still announces.
      if(k===i) d.setAttribute('aria-current','true'); else d.removeAttribute('aria-current');
    });
    document.getElementById('prev').disabled=(i===0);
    document.getElementById('next').disabled=(i===CARDS.length-1);
    curInst.bindCard(i);
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
  // One meaning per key across the whole site: up/Enter go deeper, down/Escape back out.
  // A journey has no deeper level, so up/Enter simply do nothing here — they are NOT
  // recycled as "back", which is what they used to mean and what made the direction you
  // press to leave depend on where you were standing.
  addEventListener('keydown',e=>{
    if(e.key==='ArrowRight') go(cur+1);
    if(e.key==='ArrowLeft') go(cur-1);
    if(e.key==='ArrowDown') goHub();
  });

  /* close any open explanatory bubble (a "what is δ"-style popover) on outside-click;
     Escape closes it too, or — if none is open — backs out to the hub. Generic over any
     .bubble whose trigger carries aria-controls="<bubble id>", so journeys can add their
     own bubbles without touching the engine. Only one card (hence one bubble) is live. */
  const openBubble = ()=>document.querySelector('.bubble:not([hidden]), .pop:not([hidden])');
  const bubbleTrigger = bub=>bub ? document.querySelector('[aria-controls="'+bub.id+'"]') : null;
  document.addEventListener('click', e=>{
    const bub=openBubble(); if(!bub) return;
    const info=bubbleTrigger(bub);
    if(!bub.contains(e.target) && !(info && info.contains(e.target))){
      bub.hidden=true; if(info) info.setAttribute('aria-expanded','false');
    }
  });
  /* In a scrolling card the panel is in the flow at the very bottom (see `.scrolls` in the
     CSS), so opening one from a term near the top would look like nothing happened. The
     journeys' own toggles stop propagation, so this listens in the capture phase — and
     reads the resulting state one frame later, once they have run. */
  document.addEventListener('click', e=>{
    if(!e.target.closest) return;
    const trig=e.target.closest('[aria-controls]'); if(!trig) return;
    const bub=document.getElementById(trig.getAttribute('aria-controls')); if(!bub) return;
    requestAnimationFrame(()=>{
      if(!bub.hidden && hud.classList.contains('scrolls'))
        bub.scrollIntoView({block:'nearest', behavior:'smooth'});
    });
  }, true);
  addEventListener('keydown', e=>{
    if(e.key!=='Escape') return;
    const bub=openBubble();
    if(bub){ bub.hidden=true; const info=bubbleTrigger(bub); if(info){ info.setAttribute('aria-expanded','false'); info.focus(); } return; }
    goHub();
  });

  let dragging=false,lx=0,ly=0;
  // A second simultaneous pointer means a pinch, not a drag — tracked by id so either
  // finger can lift first without confusing which one is still down. `wheel` (below)
  // covers zoom for a mouse; touch has no wheel event, so this is the touch equivalent.
  const touches=new Map();
  let pinchD0=null, zoom0=null;
  function pinchDist(){
    const p=[...touches.values()]; return Math.hypot(p[0].x-p[1].x, p[0].y-p[1].y);
  }
  cv.addEventListener('pointerdown',e=>{
    touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
    cv.setPointerCapture(e.pointerId);
    if(touches.size===2){ dragging=false; pinchD0=pinchDist(); zoom0=zoomF; return; }
    if(touches.size>2) return;   // a stray third touch: ignore, keep the pinch running
    dragging=true; lx=e.clientX; ly=e.clientY; cv.classList.add('grabbing');
  });
  cv.addEventListener('pointermove',e=>{
    if(!touches.has(e.pointerId)) return;
    touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(touches.size===2){
      if(!travel && pinchD0) zoomF=clamp(zoom0*(pinchD0/pinchDist()), 0.55, 2.1);
      return;
    }
    if(!dragging||travel) return;
    yaw+=(e.clientX-lx)*0.005; pitch+=(e.clientY-ly)*0.004;
    pitch=clamp(pitch,-1.1,1.1); lx=e.clientX; ly=e.clientY;
  });
  function endTouch(e){
    touches.delete(e.pointerId);
    if(touches.size<2) pinchD0=null;
    dragging=false; cv.classList.remove('grabbing');
  }
  cv.addEventListener('pointerup',endTouch);
  cv.addEventListener('pointercancel',endTouch);
  cv.addEventListener('wheel',e=>{
    if(travel) return;
    e.preventDefault();
    zoomF=clamp(zoomF*(1+Math.sign(e.deltaY)*0.08), 0.55, 2.1);
  },{passive:false});

  renderCard(0);
  { const p=camPose(0); camera.position.copy(p.pos); camera.lookAt(p.look); }
  requestAnimationFrame(()=>forceRepaint(hudEl));   // see forceRepaint's comment above

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
}
