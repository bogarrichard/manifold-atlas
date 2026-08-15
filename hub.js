'use strict';
/* The hub: a little solar system around the central frame gizmo.
   Each BRANCH is a planet orbiting the gizmo along an (undrawn) ellipse, all in
   roughly one tilted plane, in the gizmo's spin sense. Each planet carries a
   moon-ring: its journeys as numbered moons (1 = where to start). Cross-branch
   convergence is drawn as faint dashed threads that light up when you hover the
   planet they belong to; hovering a planet also shows its summary in the card and
   eases the orbit to a near-stop so it's readable. Only moons with a `journey`
   are live. Reached via ?journey=hub; reuses LIE.kit. */
window.LIE = window.LIE || {};
LIE.hub = (function(){

  const ROOT_COL = { geo:'teal', opt:'amber', conv:'green' };

  // orbit A/B are chosen so consecutive shells never overlap even at closest approach:
  // B(outer) - A(inner) > ringR(inner) + ringR(outer) + a ~2-unit margin — otherwise, since
  // the shells are periodic with different speeds, an exact collision is only a matter of time.
  const BRANCHES = [
    {id:'geometry', title:'Geometry', root:'geo', orbit:{A:9.0,  B:7.0,  ph:2.4, w:0.130}, spin:0.22, tilt:[1.05,0.45],
     journeys:[{k:'flat',title:'ℝⁿ',journey:'geometry-flat'},{k:'so2',title:'SO(2)'},{k:'se2',title:'SE(2)'},
               {k:'so3',title:'SO(3)'},{k:'se3',title:'SE(3)',journey:'geometry-se3'},{k:'sim3',title:'Sim(3)'}]},
    {id:'optimization', title:'Optimization', root:'opt', orbit:{A:20.0, B:17.5, ph:3.8, w:0.070}, spin:0.28, tilt:[1.30,-0.5],
     journeys:[{k:'gd',title:'gradient descent',journey:'optimization-gd'},{k:'gn',title:'Gauss–Newton'},{k:'lm',title:'LM · robust'}]},
    {id:'slam', title:'SLAM', root:'conv', orbit:{A:30.5, B:27.5, ph:0.2, w:0.040}, spin:0.24, tilt:[0.9,0.7],
     journeys:[{k:'riemann',title:'Riemannian GD',journey:'so3-optimization'},
               {k:'fg',title:'factor graphs'},{k:'slam',title:'SLAM'}]},
  ];
  const CROSS = [
    ['geometry:so3','slam:riemann'], ['optimization:gd','slam:riemann'],
    ['geometry:se3','slam:slam'], ['geometry:sim3','slam:slam'], ['optimization:gn','slam:slam'],
  ];

  function run(ctx){
    const { THREE, kit, scene, camera, renderer, canvas, C } = ctx;
    const { V3, lerp, ease, clamp, RM, makeLabel, fatArrow, setArrow, hexStr } = kit;
    let PAL = ctx.PAL;
    const HUB = C.hub || {};
    const brInfo = id => (HUB.branches && HUB.branches[id]) || {};
    const moonInfo = (brId, k) => (brInfo(brId).moons || {})[k] || {};

    // the mission bar, plus the nav strip the planet view borrows from the journey player
    const eb=document.getElementById('eb'), ti=document.getElementById('ti'), bo=document.getElementById('bo');
    const navWrap=document.getElementById('nav'), dotsWrap=document.getElementById('dots');
    const backBtn=document.getElementById('tohub');
    const dots=[];
    const DEF = { eb:HUB.eyebrow||'', ti:HUB.title||(C.meta&&C.meta.title)||'', bo:HUB.intro||'' };
    let cardKey = undefined;
    /* Three states: nothing hovered (the intro), a planet (its branch summary), a moon (its
       own summary). A moon wins over the planet it belongs to — it is the more specific
       thing under the cursor, and the one you are about to click. */
    function setCard(br, moonUD){
      const key = moonUD ? ('m:'+moonUD.branchId+':'+moonUD.journey.k)
                : br ? ('b:'+br.id) : null;
      if(key===cardKey) return; cardKey=key;
      if(moonUD){
        const info=moonInfo(moonUD.branchId, moonUD.journey.k);
        eb.textContent=HUB.moonWord||DEF.eb;
        ti.textContent=info.title||moonUD.journey.title;
        bo.innerHTML=info.summary||'';
      } else if(br){
        const info=brInfo(br.id);
        eb.textContent=HUB.branchWord||DEF.eb; ti.textContent=info.title||br.title; bo.innerHTML=info.summary||'';
      } else { eb.textContent=DEF.eb; ti.textContent=DEF.ti; bo.innerHTML=DEF.bo; }
      // the bar is a fixed-height scroll box, so each new entry has to start at its own top
      bo.scrollTop = 0;
    }

    let world=null, gizmo=null, planets=[], cores=[], spheres=[], threads=[], pickables=[];
    let hoverMoon=null, hoverPlanet=null;
    let byKey={};   // '<branchId>:<moonKey>' -> moon mesh; also how a planet finds its first stop
    // A planet is a shortcut to where its branch begins: the first moon that is actually built.
    function firstLive(br){
      for(const j of br.journeys){ if(j.journey) return byKey[br.id+':'+j.k]; }
      return null;
    }

    function dispose(){
      if(!world) return;
      world.traverse(o=>{ if(o.geometry)o.geometry.dispose();
        if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{ if(m.map)m.map.dispose(); m.dispose(); });} });
      scene.remove(world); world=null; gizmo=null; planets=[]; cores=[]; spheres=[]; threads=[]; pickables=[]; byKey={}; hoverMoon=null; hoverPlanet=null;
    }
    function ringPts(r,seg){ const p=[]; for(let i=0;i<=seg;i++){const a=i/seg*Math.PI*2; p.push(V3(Math.cos(a)*r,Math.sin(a)*r,0));} return p; }
    function numberBadge(txt, color, size){
      const cv=document.createElement('canvas'); cv.width=cv.height=72;
      const g=cv.getContext('2d');
      g.font='bold 52px ui-monospace, SFMono-Regular, Menlo, monospace';
      g.textAlign='center'; g.textBaseline='middle';
      g.lineWidth=6; g.strokeStyle='rgba(0,0,0,0.28)'; g.strokeText(txt,36,39);
      g.fillStyle=color; g.fillText(txt,36,39);
      const tex=new THREE.CanvasTexture(cv); tex.minFilter=THREE.LinearFilter;
      const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false}));
      sp.scale.set(size,size,1); return sp;
    }
    const orbitPos = (o,ph)=>V3(Math.cos(ph)*o.A, 0, -Math.sin(ph)*o.B); // -sin z => same sense as +Y gizmo spin

    function build(){
      dispose();
      world = new THREE.Group(); scene.add(world);

      gizmo = new THREE.Group();
      [[V3(2.4,0,0),PAL.coral],[V3(0,2.4,0),PAL.teal],[V3(0,0,2.4),PAL.violet]].forEach(([v,c])=>{
        const a=fatArrow(c,0.065); setArrow(a,V3(0,0,0),v); gizmo.add(a);
      });
      world.add(gizmo);

      const ecliptic = new THREE.Group(); ecliptic.rotation.set(0.20, 0, 0.05); world.add(ecliptic);
      byKey = {};

      BRANCHES.forEach(br=>{
        const col=PAL[ROOT_COL[br.root]], n=br.journeys.length;
        const coreR=0.8+n*0.08, ringR=1.9+n*0.28;
        const planet=new THREE.Group(); planet.position.copy(orbitPos(br.orbit, br.orbit.ph));
        planet.userData={orbit:br.orbit, spin:br.spin||0.2, tilt:br.tilt, branch:br}; ecliptic.add(planet); planets.push(planet);
        const core=new THREE.Mesh(new THREE.SphereGeometry(coreR,26,20),
          new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:0.82}));
        core.userData={isPlanet:true, branch:br, branchId:br.id, planet, h:0}; planet.add(core); cores.push(core); pickables.push(core);
        planet.add(new THREE.Mesh(new THREE.SphereGeometry(coreR*1.35,20,16),
          new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:0.10})));
        const blabel=makeLabel(brInfo(br.id).title||br.title, hexStr(col), 9.5);
        blabel.position.set(0, coreR+1.7, 0); blabel.material.opacity=0.9;
        blabel.userData.isPlanetLabel=true;   // dropped outright in another planet's view
        planet.add(blabel);

        const ringG=new THREE.Group(); ringG.rotation.set(br.tilt[0], br.tilt[1], 0); planet.add(ringG);
        planet.userData.ringG = ringG;
        ringG.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ringPts(ringR,80)),
          new THREE.LineBasicMaterial({color:col,transparent:true,opacity:0.5})));
        br.journeys.forEach((j,idx)=>{
          const a = n===1 ? Math.PI*0.5 : (Math.PI*0.5 + (idx/(n-1)-0.5)*Math.PI*1.55);
          const anchor=new THREE.Group(); anchor.position.set(Math.cos(a)*ringR, Math.sin(a)*ringR, 0); ringG.add(anchor);
          const live=!!j.journey;
          const sphere=new THREE.Mesh(new THREE.SphereGeometry(0.5,20,15),
            new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:live?0.97:0.42}));
          anchor.add(sphere);
          anchor.add(new THREE.Mesh(new THREE.SphereGeometry(0.72,16,12),
            new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:live?0.12:0.05})));
          const num=numberBadge(String(idx+1), hexStr(col), 1.5);
          num.position.set(0, 1.02, 0); anchor.add(num);
          const title=makeLabel(j.title, hexStr(col), 11.5);
          title.position.set(0, 2.6, 0); title.material.opacity=0;
          title.userData.isMoonTitle=true;   // the moon loop owns this opacity, not dimPass
          anchor.add(title);
          // Moon names are never drawn in the system view — only planets are named there.
          // A ring of six labels at the size needed to read them from the default camera
          // distance is unreadable noise, and the mission bar now carries the same text
          // properly. They fade in only inside the planet view, where there is room.
          // `a` (the moon's angle on its ring) is what the carousel spins against.
          sphere.userData={journey:j, col, live, title, a, idx, branchId:br.id, planet, t:0, h:0};
          spheres.push(sphere); pickables.push(sphere); byKey[br.id+':'+j.k]=sphere;
        });
      });

      CROSS.forEach(([a,b])=>{
        const sa=byKey[a], sb=byKey[b]; if(!sa||!sb) return;
        const geo=new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6),3));
        const line=new THREE.Line(geo, new THREE.LineDashedMaterial({color:PAL.green,dashSize:0.5,gapSize:0.4,transparent:true,opacity:0.2}));
        line.userData.isThread=true;   // the thread loop owns this opacity, not dimPass
        world.add(line); threads.push({line, geo, sa, sb});
      });
    }
    build();

    /* ================= two-level navigation =================================
       SYSTEM view — the whole map. Planets are named, moons are not; hovering a
         planet reads out its branch, clicking one drops into…
       PLANET view — that planet centered and its moon-ring turned into a carousel.
         The selected moon swings to the front, the bar carries its abstract, and
         ← / → wind the ring to the next stop. Clicking the front moon lands.
       The rest of the system stays on screen but falls back — see `dimPass`.
    ====================================================================== */
    let mode='system';          // 'system' | 'planet'
    let focus=null;             // { planet, br, idx } while in planet view
    let focusT=0;               // 0..1 eased; drives the ring's reorientation and the dim
    let spinCur=0;              // the carousel's current angle (continuous, not wrapped)
    let inFocus=new Set();      // objects belonging to the focused planet — kept bright

    const FOCUS_OFF = V3(0, 4.5, 23);  // where the camera sits relative to the focused planet
    // Ring lean in planet view: front moon low and near. Close to -π/2 (fully horizontal,
    // like a disc lying flat) without reaching it — at exactly -π/2 the ring's vertical
    // extent collapses to zero and, viewed from the shallow ~11° camera elevation FOCUS_OFF
    // implies, moons on opposite sides of the ring would overlap on screen.
    const PRESENT_TILT = -1.3;

    const target=V3(0,0,0);
    let theta=0.6, phi=1.02, radius=62;
    const ray=new THREE.Raycaster(); const pointer=new THREE.Vector2(-2,-2);
    let flight=null, dragging=false, lx=0, ly=0, dx0=0, dy0=0, moved=false;
    let trans=null;                     // timed camera move between the two views
    const _look=V3(0,0,0), _p=new THREE.Vector3();

    const moonsOf = br => br.journeys.map(j=>byKey[br.id+':'+j.k]).filter(Boolean);
    const selMoon = () => focus ? moonsOf(focus.br)[focus.idx] : null;

    // where the camera wants to be for the current view; read live, so a transition
    // still lands correctly even though the planet drifts while it runs
    function camWant(){
      if(mode==='planet' && focus){
        focus.planet.getWorldPosition(_p);
        return {pos:_p.clone().add(FOCUS_OFF), look:_p.clone()};
      }
      const s=new THREE.Spherical(radius, phi, theta);
      return {pos:target.clone().add(V3(0,0,0).setFromSpherical(s)), look:target.clone()};
    }
    function place(){
      const w=camWant();
      if(trans){
        const u=ease(clamp((performance.now()-trans.t0)/trans.dur,0,1));
        camera.position.lerpVectors(trans.pos, w.pos, u);
        _look.lerpVectors(trans.look, w.look, u);
        if(u>=1) trans=null;
      } else { camera.position.copy(w.pos); _look.copy(w.look); }
      camera.lookAt(_look);
    }
    function beginTrans(){
      trans={t0:performance.now(), dur:RM?1:820, pos:camera.position.clone(), look:_look.clone()};
    }
    function enterPlanet(planet, idx){
      const br=planet.userData.branch;
      beginTrans();
      mode='planet'; focus={planet, br, idx:idx||0};
      inFocus=new Set(); planet.traverse(o=>inFocus.add(o));
      // start the carousel from wherever the ring happens to be, so it winds rather than snaps
      spinCur = planet.userData.ringG.rotation.z;
      syncFocus();
    }
    function exitPlanet(){
      if(mode!=='planet') return;
      beginTrans(); mode='system'; focus=null; inFocus=new Set();
      setCard(null,null); syncFocus();
    }
    function step(d){
      if(mode!=='planet') return;
      const n=moonsOf(focus.br).length; if(!n) return;
      focus.idx=(focus.idx+d+n)%n;
      syncFocus();
    }
    // reflect the current selection into the bar and the nav affordances
    function syncFocus(){
      navWrap.style.display = mode==='planet' ? '' : 'none';
      backBtn.hidden = mode!=='planet';
      if(mode!=='planet'){ dotsWrap.innerHTML=''; dots.length=0; return; }
      const ms=moonsOf(focus.br);
      // rebuilt per entry rather than reused: a different planet means different moons
      dotsWrap.innerHTML=''; dots.length=0;
      ms.forEach((sp,i)=>{
        const d=document.createElement('button');
        d.type='button'; d.title=sp.userData.journey.title;
        d.className='dot'+(i===focus.idx?' on':'')+(sp.userData.live?'':' locked');
        d.onclick=()=>{ focus.idx=i; syncFocus(); };
        dotsWrap.appendChild(d); dots.push(d);
      });
      setCard(null, ms[focus.idx].userData);
    }
    function enter(sp){
      const j=sp.userData.journey, wp=new THREE.Vector3(); sp.getWorldPosition(wp);
      const dir=wp.clone().sub(target).normalize();
      const l=new URLSearchParams(location.search).get('lang');
      flight={t0:performance.now(), dur:RM?1:1100, from:camera.position.clone(),
        to:wp.clone().add(dir.multiplyScalar(3.4)).add(V3(0,0.4,0)), look:wp.clone(),
        url:'?journey='+j.journey+(l?('&lang='+l):'')};
    }
    canvas.addEventListener('pointerdown',e=>{dragging=true;moved=false;lx=e.clientX;ly=e.clientY;dx0=e.clientX;dy0=e.clientY;canvas.classList.add('grabbing');canvas.setPointerCapture(e.pointerId);});
    canvas.addEventListener('pointermove',e=>{
      const r=canvas.getBoundingClientRect();
      pointer.set(((e.clientX-r.left)/r.width)*2-1, -((e.clientY-r.top)/r.height)*2+1);
      if(dragging){
        const dx=e.clientX-lx, dy=e.clientY-ly;
        // total displacement from the press origin (not the per-move delta, which would
        // under-count a slow multi-step drag) decides click vs. drag
        if(!moved && Math.abs(e.clientX-dx0)+Math.abs(e.clientY-dy0)>6) moved=true;
        // only actually orbit the camera once a real drag is confirmed — otherwise a few px
        // of unavoidable hand/trackpad jitter during a click nudges the view just enough to
        // carry the moon out from under the cursor, so the hover check misses it on release
        if(moved){ theta-=dx*0.006; phi=clamp(phi-dy*0.006, 0.22, Math.PI-0.22); }
        lx=e.clientX; ly=e.clientY;
      }
    });
    canvas.addEventListener('pointerup',e=>{
      dragging=false; canvas.classList.remove('grabbing');
      if(moved || flight) return;
      if(mode==='planet'){
        // inside a planet: the front moon lands, any other one winds the carousel to itself
        if(hoverMoon){
          const u=hoverMoon.userData;
          if(u.idx===focus.idx){ if(u.live) enter(hoverMoon); }
          else { focus.idx=u.idx; syncFocus(); }
        } else if(hoverPlanet && hoverPlanet.userData.branch!==focus.br){
          enterPlanet(hoverPlanet, 0);           // hop straight to a neighbouring planet
        } else if(!hoverPlanet){ exitPlanet(); } // empty space backs out
        return;
      }
      // system view: both a planet and a moon open that planet — a moon just picks its own slot
      if(hoverMoon) enterPlanet(hoverMoon.userData.planet, hoverMoon.userData.idx);
      else if(hoverPlanet) enterPlanet(hoverPlanet.userData.planet, 0);
    });
    canvas.addEventListener('wheel',e=>{
      e.preventDefault();
      if(mode==='planet') return;              // the planet view frames itself; zoom is the map's tool
      radius=clamp(radius*(1+Math.sign(e.deltaY)*0.08), 16, 85);
    },{passive:false});
    addEventListener('keydown', e=>{
      if(mode!=='planet') return;
      if(e.key==='ArrowRight'){ step(1); e.preventDefault(); }
      else if(e.key==='ArrowLeft'){ step(-1); e.preventDefault(); }
      else if(e.key==='ArrowUp' || e.key==='Escape'){ exitPlanet(); e.preventDefault(); }
      else if(e.key==='Enter'){ const m=selMoon(); if(m && m.userData.live) enter(m); }
    });
    navWrap.querySelector('#prev').onclick=()=>step(-1);
    navWrap.querySelector('#next').onclick=()=>step(1);
    backBtn.onclick=()=>exitPlanet();
    function pick(){
      ray.setFromCamera(pointer, camera);
      // in the planet view only its own moons are live targets; the dimmed rest is scenery
      const pool = mode==='planet' ? pickables.filter(o=>inFocus.has(o)||o.userData.isPlanet) : pickables;
      const hits=ray.intersectObjects(pool, false);
      const hit=hits.length?hits[0].object:null;
      hoverPlanet = (hit && hit.userData.isPlanet) ? hit : null;
      hoverMoon   = (hit && !hit.userData.isPlanet) ? hit : null;
      const clickable = hoverMoon || hoverPlanet;
      canvas.style.cursor = clickable ? 'pointer' : 'grab';
      // the bar follows the hover only on the map; inside a planet it belongs to the selection
      if(mode!=='planet') setCard(hoverPlanet ? hoverPlanet.userData.branch : null, null);
    }

    syncFocus();   // start on the map: nav strip and back button stay out of the way
    place();

    const clock=new THREE.Clock(); const _a=new THREE.Vector3(), _b=new THREE.Vector3();
    let T=0, orbitTime=0, orbitSpeed=1;
    function loop(){
      requestAnimationFrame(loop);
      const dt=Math.min(clock.getDelta(), 0.05); T+=dt;
      const now=performance.now();
      if(flight){
        const u=ease(clamp((now-flight.t0)/flight.dur,0,1));
        camera.position.lerpVectors(flight.from, flight.to, u);
        camera.lookAt(flight.look);
        // fire the navigation exactly once — this branch keeps running every frame
        // (rAF is already re-armed above) for as long as the browser takes to actually
        // unload the page, and re-assigning location.href each time restarts the
        // navigation from scratch (repeated DNS/connection attempts)
        if(u>=1){ if(!flight.navigated){ flight.navigated=true; location.href=flight.url; } return; }
        renderer.render(scene,camera); return;
      }
      // The system eases to a near-stop while a planet is hovered, and to a full stop inside
      // the planet view — a carousel you are reading should not also be drifting across the sky.
      const tgtSpeed = mode==='planet' ? 0 : (hoverPlanet ? 0.05 : 1);
      orbitSpeed += (tgtSpeed-orbitSpeed)*Math.min(1,dt*3);
      orbitTime += RM?0:dt*orbitSpeed;
      focusT += ((mode==='planet'?1:0)-focusT)*Math.min(1, dt*(RM?60:4.5));
      // the gizmo's spin is driven by the same eased clock, so it slows down with the system
      if(gizmo) gizmo.rotation.y = orbitTime*0.18;
      planets.forEach(p=>{
        const o=p.userData.orbit; p.position.copy(orbitPos(o, o.ph + orbitTime*o.w));
        const rg=p.userData.ringG; if(!rg) return;
        if(focus && p===focus.planet){
          // Carousel: wind the ring so the selected moon swings to the near, low front.
          // The angle is kept continuous and stepped along the short way round, so moving
          // from the last moon back to the first winds backwards rather than unspooling.
          const want = -Math.PI/2 - selMoon().userData.a;
          let d=(want-spinCur)%(Math.PI*2);
          if(d> Math.PI) d-=Math.PI*2;
          if(d<-Math.PI) d+=Math.PI*2;
          spinCur += d*Math.min(1, dt*(RM?60:5));
          rg.rotation.set(lerp(p.userData.tilt[0], PRESENT_TILT, focusT),
                          lerp(p.userData.tilt[1], 0, focusT), spinCur);
        } else {
          rg.rotation.set(p.userData.tilt[0], p.userData.tilt[1], orbitTime*p.userData.spin);
        }
      });
      world.updateMatrixWorld(true);
      // convergence threads follow the moving moons; faint by default, light up on MOON hover
      threads.forEach(th=>{
        th.sa.getWorldPosition(_a); th.sb.getWorldPosition(_b);
        const arr=th.geo.attributes.position.array;
        arr[0]=_a.x;arr[1]=_a.y;arr[2]=_a.z; arr[3]=_b.x;arr[4]=_b.y;arr[5]=_b.z;
        th.geo.attributes.position.needsUpdate=true; th.line.computeLineDistances();
        // cross-branch threads are a map-level idea; they fade away inside a planet
        const on = hoverMoon && (th.sa===hoverMoon || th.sb===hoverMoon);
        const want = (on?0.95:0.2) * (1-focusT*0.92);
        const m=th.line.material; m.opacity += (want-m.opacity)*Math.min(1,dt*8);
      });
      place(); pick();
      /* Exactly one moon name is ever drawn: the selected one, inside the planet view.
         Showing its neighbours too — even faintly — puts six labels back on one ring and
         re-creates the crowding this view was meant to fix. The numbered badges already
         carry the ordering, and the bar carries the words. The selected moon also swells,
         which is what marks it as the thing Enter/click will land on. */
      spheres.forEach(sp=>{
        const u=sp.userData;
        const mine = !!focus && u.planet===focus.planet;
        const chosen = mine && u.idx===focus.idx;
        const tTitle = chosen ? focusT : 0;
        const tSwell = (chosen ? 1 : 0)*focusT + (sp===hoverMoon ? 0.5 : 0);
        u.t+=(tTitle-u.t)*Math.min(1,dt*10);
        u.h+=(tSwell-u.h)*Math.min(1,dt*10);
        u.title.material.opacity=u.t; u.title.visible=u.t>0.02;
        sp.scale.setScalar(1 + u.h*0.42);
      });
      dimPass(dt);
      renderer.render(scene,camera);
    }

    /* The "background blur". A real depth-of-field needs the postprocessing passes, which
       are not part of the vendored core build, so this fades the rest of the system back
       instead: every material outside the focused planet loses most of its opacity, and the
       fog thickens to wash out what is left. Reads as focus without a second dependency.
       Each material's own opacity is captured once, so the fade is relative to whatever the
       theme set — a dimmed grid line does not brighten on the way back. */
    const baseFog = scene.fog ? scene.fog.density : 0;
    function dimPass(dt){
      const k = focusT;
      world.traverse(o=>{
        const m=o.material; if(!m || m.opacity===undefined) return;
        if(o.userData && o.userData.isMoonTitle) return;   // driven by the moon loop above
        if(m.userData.base===undefined){
          m.userData.base=m.opacity;
          // An opaque material ignores `opacity` outright, so the gizmo arrows and any other
          // solid would stay at full brightness through the fade. Opt them in once, here,
          // rather than at every construction site that might ever end up dimmed.
          if(!m.transparent){ m.transparent=true; m.needsUpdate=true; }
        }
        const mine = inFocus.has(o);
        /* Other planets' name labels go all the way out, not just faint. Labels are sprites
           at a fixed world scale, so a neighbouring planet that the camera has just moved
           close to renders its name *larger* than the focused planet's — a merely dimmed
           label still dominates the frame. Everything else fades to a low floor. */
        const factor = mine ? 1
                     : (o.userData && o.userData.isPlanetLabel) ? 1-k
                     : 1 - k*0.94;
        const want = m.userData.base * factor;
        m.opacity += (want-m.opacity)*Math.min(1, dt*6);
      });
      if(scene.fog) scene.fog.density = baseFog * (1 + k*1.6);
    }
    loop();

    // A retheme disposes every material and rebuilds, so anything holding object references
    // — the focus set, the selected moon — would be pointing at dead geometry. Drop back to
    // the map rather than trying to re-resolve it.
    return { retheme(newPAL){ PAL=newPAL; mode='system'; focus=null; inFocus=new Set();
                              focusT=0; build(); setCard(null,null); syncFocus(); },
             onResize(){} };
  }

  return { run };
})();
