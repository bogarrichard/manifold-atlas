'use strict';
/* Shared toolkit for the Lie journeys: math helpers, the color palette, and
   Three.js primitive builders. Pure factories — no scene state — so any journey
   can use them. Requires THREE (global) to be loaded first. Exposes LIE.kit. */
window.LIE = window.LIE || {};
LIE.kit = (function(){
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const V3 = (x,y,z)=>new THREE.Vector3(x,y,z);
  const lerp=(a,b,t)=>a+(b-a)*t;
  const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const UP = V3(0,1,0);

  const COL = {teal:0x5DCAA5, violet:0xAFA9EC, violet2:0x7F77DD, coral:0xF0997B,
               amber:0xFAC775, red:0xE24B4A, green:0x97C459, slate:0x24314e, ink:0xE8E6DF};

  function fatArrow(color, r){
    r = r||0.05;
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({color});
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(r,r,1,10), mat);
    cyl.geometry.translate(0,0.5,0);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r*2.6,0.24,14), mat);
    g.add(cyl); g.add(cone);
    g.userData={cyl,cone};
    return g;
  }
  function setArrow(g, origin, vec){
    const L = vec.length();
    if(L < 1e-4){ g.visible=false; return; }
    g.visible=true;
    g.position.copy(origin);
    g.quaternion.setFromUnitVectors(UP, vec.clone().multiplyScalar(1/L));
    g.userData.cyl.scale.set(1, Math.max(L-0.22,0.02), 1);
    g.userData.cone.position.y = L-0.12;
  }
  function makeLabel(text, color, w){
    w = w||3.2;
    const cv = document.createElement('canvas'); cv.width=512; cv.height=128;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({transparent:true, depthTest:false}));
    sp.userData.cv=cv;
    sp.scale.set(w, w*0.25, 1);
    updateLabel(sp, text, color);
    return sp;
  }
  function updateLabel(sp, text, color){
    const cv=sp.userData.cv, ctx=cv.getContext('2d');
    ctx.clearRect(0,0,512,128);
    const toks=[];
    for(let i=0;i<text.length;i++){
      if(text[i]==='^'){
        if(text[i+1]==='{'){ const j=text.indexOf('}',i+2); toks.push({t:text.slice(i+2,j),s:1}); i=j; }
        else { toks.push({t:text[i+1],s:1}); i++; }
      } else toks.push({t:text[i],s:0});
    }
    let F=46;
    const wOf=f=>{let w=0; toks.forEach(k=>{ctx.font='italic '+Math.round(k.s?f*0.62:f)+'px Georgia, serif'; w+=ctx.measureText(k.t).width;}); return w;};
    let W=wOf(F); if(W>470){ F=F*470/W; W=wOf(F); }
    let x=(512-W)/2;
    ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.fillStyle=color||'#FAC775';
    toks.forEach(k=>{
      ctx.font='italic '+Math.round(k.s?F*0.62:F)+'px Georgia, serif';
      ctx.fillText(k.t, x, k.s?46:66);
      x+=ctx.measureText(k.t).width;
    });
    const tex=new THREE.CanvasTexture(cv);
    tex.minFilter=THREE.LinearFilter;
    if(sp.material.map) sp.material.map.dispose();
    sp.material.map=tex; sp.material.needsUpdate=true;
  }
  function baseSphere(R){
    const g = new THREE.Group();
    const surf = new THREE.Mesh(new THREE.SphereGeometry(R, 48, 36),
      new THREE.MeshStandardMaterial({color:0x1b2b48, roughness:0.85, metalness:0.05,
        transparent:true, opacity:0.94}));
    const wire = new THREE.Mesh(new THREE.SphereGeometry(R*1.001, 24, 16),
      new THREE.MeshBasicMaterial({color:COL.teal, wireframe:true, transparent:true, opacity:0.07}));
    g.add(surf); g.add(wire);
    return g;
  }
  function dashedLine(a, b, color, dash){
    const geo = new THREE.BufferGeometry().setFromPoints([a,b]);
    const li = new THREE.Line(geo, new THREE.LineDashedMaterial({color, dashSize:dash||0.12, gapSize:(dash||0.12)*0.8, transparent:true, opacity:0.9}));
    li.computeLineDistances();
    return li;
  }
  function expSph(pu, v){
    const th = v.length();
    if(th < 1e-9) return pu.clone();
    const u = v.clone().multiplyScalar(1/th);
    return pu.clone().multiplyScalar(Math.cos(th)).add(u.multiplyScalar(Math.sin(th))).normalize();
  }
  function projT(g, pu){ return g.clone().sub(pu.clone().multiplyScalar(g.dot(pu))); }

  return { RM, V3, lerp, ease, clamp, UP, COL,
           fatArrow, setArrow, makeLabel, updateLabel, baseSphere, dashedLine, expSph, projT };
})();
