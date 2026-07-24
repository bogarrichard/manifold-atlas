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
     journeys:[{k:'flat',title:'ℝⁿ'},{k:'so2',title:'SO(2)'},{k:'se2',title:'SE(2)'},
               {k:'so3',title:'SO(3)'},{k:'se3',title:'SE(3)'},{k:'sim3',title:'Sim(3)'}]},
    {id:'optimization', title:'Optimization', root:'opt', orbit:{A:20.0, B:17.5, ph:3.8, w:0.070}, spin:0.28, tilt:[1.30,-0.5],
     journeys:[{k:'gd',title:'gradient descent'},{k:'gn',title:'Gauss–Newton'},{k:'lm',title:'LM · robust'}]},
    {id:'slam', title:'SLAM', root:'conv', orbit:{A:30.5, B:27.5, ph:0.2, w:0.040}, spin:0.24, tilt:[0.9,0.7],
     journeys:[{k:'riemann',title:'Riemannian GD',journey:'so3-optimization',today:true},
               {k:'fg',title:'factor graphs'},{k:'slam',title:'SLAM'}]},
  ];
  const CROSS = [
    ['geometry:so3','slam:riemann'], ['optimization:gd','slam:riemann'],
    ['geometry:se3','slam:slam'], ['geometry:sim3','slam:slam'], ['optimization:gn','slam:slam'],
  ];

  function run(ctx){
    const { THREE, kit, scene, camera, renderer, canvas, C } = ctx;
    const { V3, ease, clamp, RM, makeLabel, fatArrow, setArrow, hexStr } = kit;
    let PAL = ctx.PAL;
    const HUB = C.hub || {};
    const brInfo = id => (HUB.branches && HUB.branches[id]) || {};

    // top-left card
    const eb=document.getElementById('eb'), ti=document.getElementById('ti'), bo=document.getElementById('bo');
    const DEF = { eb:HUB.eyebrow||'', ti:(C.meta&&C.meta.title)||'', bo:HUB.intro||'' };
    let cardBranch = undefined;
    function setCard(br){
      const id = br ? br.id : null;
      if(id===cardBranch) return; cardBranch=id;
      if(br){ const info=brInfo(br.id);
        eb.textContent=HUB.branchWord||DEF.eb; ti.textContent=info.title||br.title; bo.innerHTML=info.summary||''; }
      else { eb.textContent=DEF.eb; ti.textContent=DEF.ti; bo.innerHTML=DEF.bo; }
    }

    let world=null, gizmo=null, planets=[], cores=[], spheres=[], threads=[], pickables=[];
    let hoverMoon=null, hoverPlanet=null;

    function dispose(){
      if(!world) return;
      world.traverse(o=>{ if(o.geometry)o.geometry.dispose();
        if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{ if(m.map)m.map.dispose(); m.dispose(); });} });
      scene.remove(world); world=null; gizmo=null; planets=[]; cores=[]; spheres=[]; threads=[]; pickables=[]; hoverMoon=null; hoverPlanet=null;
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
      const byKey = {};

      BRANCHES.forEach(br=>{
        const col=PAL[ROOT_COL[br.root]], n=br.journeys.length;
        const coreR=0.8+n*0.08, ringR=1.9+n*0.28;
        const planet=new THREE.Group(); planet.position.copy(orbitPos(br.orbit, br.orbit.ph));
        planet.userData={orbit:br.orbit, spin:br.spin||0.2}; ecliptic.add(planet); planets.push(planet);
        const core=new THREE.Mesh(new THREE.SphereGeometry(coreR,26,20),
          new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:0.82}));
        core.userData={isPlanet:true, branch:br, branchId:br.id, h:0}; planet.add(core); cores.push(core); pickables.push(core);
        planet.add(new THREE.Mesh(new THREE.SphereGeometry(coreR*1.35,20,16),
          new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:0.10})));
        const blabel=makeLabel(brInfo(br.id).title||br.title, hexStr(col), 3.6);
        blabel.position.set(0, coreR+1.3, 0); blabel.material.opacity=0.9; planet.add(blabel);

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
          if(j.today){
            const tr=new THREE.Line(new THREE.BufferGeometry().setFromPoints(ringPts(0.9,48)),
              new THREE.LineBasicMaterial({color:col,transparent:true,opacity:0.85}));
            anchor.add(tr); sphere.userData.todayRing=tr;
          }
          const num=numberBadge(String(idx+1), hexStr(col), 0.92);
          num.position.set(0, 1.02, 0); anchor.add(num);
          const title=makeLabel(j.title, hexStr(col), 3.8);
          title.position.set(0, 1.85, 0); title.material.opacity=0; anchor.add(title);
          sphere.userData={journey:j, col, live, title, branchId:br.id, t:0};
          spheres.push(sphere); pickables.push(sphere); byKey[br.id+':'+j.k]=sphere;
        });
      });

      CROSS.forEach(([a,b])=>{
        const sa=byKey[a], sb=byKey[b]; if(!sa||!sb) return;
        const geo=new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6),3));
        const line=new THREE.Line(geo, new THREE.LineDashedMaterial({color:PAL.green,dashSize:0.5,gapSize:0.4,transparent:true,opacity:0.2}));
        world.add(line); threads.push({line, geo, sa, sb});
      });
    }
    build();

    /* ---- orbit camera + picking + flight ---- */
    const target=V3(0,0,0);
    let theta=0.6, phi=1.02, radius=62;
    const ray=new THREE.Raycaster(); const pointer=new THREE.Vector2(-2,-2);
    let flight=null, dragging=false, lx=0, ly=0, dx0=0, dy0=0, moved=false;
    function place(){
      const s=new THREE.Spherical(radius, phi, theta);
      camera.position.copy(target).add(V3(0,0,0).setFromSpherical(s));
      camera.lookAt(target);
    }
    place();
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
      if(!moved && hoverMoon && hoverMoon.userData.live && !flight) enter(hoverMoon);
    });
    canvas.addEventListener('wheel',e=>{ e.preventDefault(); radius=clamp(radius*(1+Math.sign(e.deltaY)*0.08), 16, 85); },{passive:false});
    function pick(){
      ray.setFromCamera(pointer, camera);
      const hits=ray.intersectObjects(pickables, false);
      const hit=hits.length?hits[0].object:null;
      hoverPlanet = (hit && hit.userData.isPlanet) ? hit : null;
      hoverMoon   = (hit && !hit.userData.isPlanet) ? hit : null;
      canvas.style.cursor = (hoverMoon && hoverMoon.userData.live) ? 'pointer' : 'grab';
      setCard(hoverPlanet ? hoverPlanet.userData.branch : null);
    }

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
        if(u>=1){ location.href=flight.url; return; }
        renderer.render(scene,camera); return;
      }
      // ease the revolution to a near-stop while hovering a planet OR a moon (to read / click it)
      const tgtSpeed = (hoverPlanet || hoverMoon) ? 0.05 : 1;
      orbitSpeed += (tgtSpeed-orbitSpeed)*Math.min(1,dt*3);
      orbitTime += RM?0:dt*orbitSpeed;
      // the gizmo's spin is driven by the same eased clock, so it slows down with the system
      if(gizmo) gizmo.rotation.y = orbitTime*0.18;
      planets.forEach(p=>{
        const o=p.userData.orbit; p.position.copy(orbitPos(o, o.ph + orbitTime*o.w));
        if(p.userData.ringG) p.userData.ringG.rotation.z = orbitTime*p.userData.spin;
      });
      world.updateMatrixWorld(true);
      // convergence threads follow the moving moons; faint by default, light up on MOON hover
      threads.forEach(th=>{
        th.sa.getWorldPosition(_a); th.sb.getWorldPosition(_b);
        const arr=th.geo.attributes.position.array;
        arr[0]=_a.x;arr[1]=_a.y;arr[2]=_a.z; arr[3]=_b.x;arr[4]=_b.y;arr[5]=_b.z;
        th.geo.attributes.position.needsUpdate=true; th.line.computeLineDistances();
        const on = hoverMoon && (th.sa===hoverMoon || th.sb===hoverMoon);
        const m=th.line.material; m.opacity += ((on?0.95:0.2)-m.opacity)*Math.min(1,dt*8);
      });
      place(); pick();
      // moon hover: title fade + spinning today ring
      spheres.forEach(sp=>{
        const u=sp.userData, tg=(sp===hoverMoon)?1:0;
        u.t+=(tg-u.t)*Math.min(1,dt*12);
        u.title.material.opacity=u.t; u.title.visible=u.t>0.02;
        sp.scale.setScalar(1 + u.t*0.28);
        if(u.todayRing) u.todayRing.rotation.z=T*0.6;
      });
      renderer.render(scene,camera);
    }
    loop();

    return { retheme(newPAL){ PAL=newPAL; build(); }, onResize(){} };
  }

  return { run };
})();
