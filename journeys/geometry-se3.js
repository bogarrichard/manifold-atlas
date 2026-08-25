'use strict';
/* Journey: SE(3) — the Geometry planet's pose moon, and the chapter the SO(3)
   storyline promised ("the subtlety between v and the real t — the left Jacobian —
   is the next chapter"). Ten stations, told in SLAM vocabulary: the pose, the pose /
   transformation duality (the columns of T *are* the frame), chaining as re-reading
   one fixed point, why the order of R and t matters, twists, the screw motion exp
   draws, the left Jacobian that separates arc length from chord, log as the inverse
   reading, the adjoint as a change of observer, and pose resampling between timestamps.

   Two stations are interactive: station 7 (a θ slider that fans the constant body
   velocity into the chord t = V(φ)ρ) and station 10 (a query-time slider comparing
   split slerp+lerp against the true screw geodesic). Cards are bilingual and live
   in this file. Aimed at an undergraduate EE/CS reader. Requires LIE.kit. */
window.LIE = window.LIE || {};
LIE.journeys = LIE.journeys || {};
LIE.journeys['geometry-se3'] = (function(){
  const K = LIE.kit;
  const { V3, ease, clamp, hexStr, fatArrow, setArrow, makeLabel, updateLabel, dashedLine } = K;

  /* ---- SE(3) math, in the plain shapes the cards state -------------------
     A pose is {p, q} (translation + quaternion). A twist is {rho, phi}: the
     constant body velocity and the rotation vector. Everything below is the
     closed form written in the cards, nothing more. */
  const expQ = phi => {
    const th = phi.length();
    if(th < 1e-9) return new THREE.Quaternion();
    return new THREE.Quaternion().setFromAxisAngle(phi.clone().multiplyScalar(1/th), th);
  };
  const logQ = q => {
    const u = q.clone().normalize();
    if(u.w < 0){ u.set(-u.x,-u.y,-u.z,-u.w); }          // shortest arc: |θ| ≤ π
    const s = Math.hypot(u.x,u.y,u.z), th = 2*Math.atan2(s, u.w);
    const k = s < 1e-8 ? 2 : th/s;
    return V3(u.x*k, u.y*k, u.z*k);
  };
  // V(φ)ρ = ρ + a·(φ×ρ) + b·(φ×(φ×ρ)); the series values 1/2 and 1/6 take over at θ→0
  function Vmul(phi, rho){
    const th = phi.length(), t2 = th*th;
    const a = th < 1e-4 ? 0.5 - t2/24 : (1-Math.cos(th))/t2;
    const b = th < 1e-4 ? 1/6 - t2/120 : (th-Math.sin(th))/(t2*th);
    const c1 = phi.clone().cross(rho), c2 = phi.clone().cross(c1);
    return rho.clone().addScaledVector(c1, a).addScaledVector(c2, b);
  }
  // V(φ)^-1 t = t − ½(φ×t) + c·(φ×(φ×t)); c → 1/12 at θ→0
  function VinvMul(phi, t){
    const th = phi.length(), t2 = th*th;
    const c = th < 1e-4 ? 1/12 : (1 - th*Math.sin(th)/(2*(1-Math.cos(th))))/t2;
    const c1 = phi.clone().cross(t), c2 = phi.clone().cross(c1);
    return t.clone().addScaledVector(c1, -0.5).addScaledVector(c2, c);
  }
  const expSE3   = (rho, phi) => ({p: Vmul(phi, rho), q: expQ(phi)});
  const logSE3   = T => { const phi = logQ(T.q); return {rho: VinvMul(phi, T.p), phi}; };
  const compose  = (A,B) => ({p: A.p.clone().add(B.p.clone().applyQuaternion(A.q)),
                              q: A.q.clone().multiply(B.q)});
  const invert   = A => { const qi = A.q.clone().conjugate();
                          return {q: qi, p: A.p.clone().applyQuaternion(qi).negate()}; };
  const pose     = (p, rotvec) => ({p: p.clone(), q: expQ(rotvec)});
  // The screw axis of exp(ξ): direction φ/θ, through the point c solving (I−R)c = t⊥.
  // In the plane ⟂ to the axis that inverse is ½ + ½cot(θ/2)·(â×·) — see the card.
  function screwAxis(rho, phi){
    const th = phi.length();
    if(th < 1e-3) return null;
    const ax = phi.clone().multiplyScalar(1/th);
    const t  = Vmul(phi, rho);
    const d  = ax.dot(t);                                   // pitch: slide along the axis
    const tp = t.clone().addScaledVector(ax, -d);
    const c  = tp.clone().multiplyScalar(0.5)
                 .addScaledVector(ax.clone().cross(tp), 0.5/Math.tan(th/2));
    return {ax, c, d};
  }

  function build(C, PAL){
    const COL = PAL || K.palette('dark');
    const HX = { teal:hexStr(COL.teal), coral:hexStr(COL.coral), violet:hexStr(COL.violet),
                 violet2:hexStr(COL.violet2), amber:hexStr(COL.amber), green:hexStr(COL.green),
                 red:hexStr(COL.red), ink:hexStr(COL.ink) };
    let jacApi = null, interpApi = null, colApi = null, chainApi = null;

    /* ---- small scene helpers ---- */
    function dimArrow(color, r, op){
      const a = fatArrow(color, r);
      a.userData.cyl.material.transparent = true; a.userData.cyl.material.opacity = op;
      return a;
    }
    // a coordinate frame as a child group: move it by setting .position / .quaternion
    function gizmo(len, r, op){
      const G = new THREE.Group();
      [[V3(len,0,0),COL.coral],[V3(0,len,0),COL.teal],[V3(0,0,len),COL.violet]].forEach(([v,c])=>{
        const a = op==null ? fatArrow(c, r) : dimArrow(c, r, op);
        setArrow(a, V3(0,0,0), v); G.add(a);
      });
      return G;
    }
    const setPose = (G, T) => { G.position.copy(T.p); G.quaternion.copy(T.q); };
    function grid(g, size, seg, y){
      const gr = new THREE.GridHelper(size||9, seg||18, COL.grid1, COL.grid2);
      gr.position.y = y===undefined ? -1.6 : y; g.add(gr);
    }
    function dot(color, r, p){
      const d = new THREE.Mesh(new THREE.SphereGeometry(r,14,12), new THREE.MeshBasicMaterial({color}));
      if(p) d.position.copy(p);
      return d;
    }
    // a polyline whose vertices are rewritten in place (paths that follow a slider)
    function polyline(n, color, op, width){
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n*3), 3));
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({color, transparent:true, opacity:op==null?0.9:op, linewidth:width||1}));
      line.userData.set = pts => {
        const a = geo.attributes.position.array;
        for(let i=0;i<n;i++){ const p = pts[Math.min(i, pts.length-1)];
          a[3*i]=p.x; a[3*i+1]=p.y; a[3*i+2]=p.z; }
        geo.attributes.position.needsUpdate = true;
        geo.computeBoundingSphere();
      };
      return line;
    }
    /* A live 4×4 matrix, drawn as one canvas sprite. Its first three columns carry the
       colors of the basis vectors they *are* — that identification is the whole claim of
       the pose/transformation station — so the numbers and the arrows read as one object.
       One sprite rather than sixteen labels: the brackets have to line up with the grid,
       and kit's makeLabel is a single-line, single-color canvas of its own fixed size.
       Every redraw re-uploads the texture, so redraws are rate-limited instead of running
       at frame rate (a numeric read-out at 25 Hz is indistinguishable from one at 60), and
       the backing canvas is capped at DPR 2 for the same reason. */
    const PANEL_DPR = Math.min(window.devicePixelRatio||1, 2);
    const fmt = v => { const x = Math.abs(v) < 5e-3 ? 0 : v;
                       return (x < 0 ? '−' : '') + Math.abs(x).toFixed(2); };
    function matrixPanel(w){
      const CW = 710, CH = 440, X0 = 120, X1 = 684, Y0 = 62, Y1 = 398;   // X1+16 must clear CW
      const cw = (X1-X0)/4, rh = (Y1-Y0)/4;
      const cv = document.createElement('canvas');
      cv.width = CW*PANEL_DPR; cv.height = CH*PANEL_DPR;
      const ctx = cv.getContext('2d');
      const tex = new THREE.CanvasTexture(cv); tex.minFilter = THREE.LinearFilter;
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:tex, transparent:true, depthTest:false}));
      sp.scale.set(w, w*CH/CW, 1);
      let last = -1;
      // M: 4×4 of strings. cols: one CSS color per column. alpha: per-column weight, which
      // is how a column that has not been written yet stays legible but recessive.
      sp.userData.draw = (M, cols, alpha, vis, t) => {
        if(t - last < 0.04) return;
        last = t;
        ctx.setTransform(PANEL_DPR,0,0,PANEL_DPR,0,0);
        ctx.clearRect(0,0,CW,CH);
        ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
        // One soft backdrop plate under the whole panel, not a stroke behind each glyph:
        // a per-glyph halo reads as a little aura ringing every character (worst on the
        // light palette, where the halo color sits close to the digit colors), and it
        // still doesn't fully solve legibility since the panel can float over the grid,
        // other frames, or a bright arrow. A single translucent plate is one soft edge,
        // not sixteen, and needs no per-theme tuning because it *is* the theme's own bg.
        ctx.globalAlpha = vis*0.82;
        ctx.fillStyle = hexStr(COL.bg);
        const PR = 22, PX0 = 0, PY0 = Y0-30, PX1 = X1+30, PY1 = Y1+30;
        ctx.beginPath();
        ctx.moveTo(PX0+PR, PY0);
        ctx.arcTo(PX1, PY0, PX1, PY1, PR); ctx.arcTo(PX1, PY1, PX0, PY1, PR);
        ctx.arcTo(PX0, PY1, PX0, PY0, PR); ctx.arcTo(PX0, PY0, PX1, PY0, PR);
        ctx.closePath(); ctx.fill();
        ctx.globalAlpha = vis;
        ctx.textAlign = 'left'; ctx.font = 'italic 50px Georgia, serif';
        ctx.fillStyle = HX.ink; ctx.fillText('T =', 8, (Y0+Y1)/2);
        ctx.globalAlpha = vis*0.5; ctx.strokeStyle = HX.ink; ctx.lineWidth = 5;
        const SER = 24;
        ctx.beginPath();
        ctx.moveTo(X0-16+SER, Y0-16); ctx.lineTo(X0-16, Y0-16);
        ctx.lineTo(X0-16, Y1+16);     ctx.lineTo(X0-16+SER, Y1+16);
        ctx.moveTo(X1+16-SER, Y0-16); ctx.lineTo(X1+16, Y0-16);
        ctx.lineTo(X1+16, Y1+16);     ctx.lineTo(X1+16-SER, Y1+16);
        ctx.stroke();
        ctx.textAlign = 'center'; ctx.font = '46px Georgia, serif';
        for(let c=0;c<4;c++) for(let r=0;r<4;r++){
          // the homogeneous bottom row is padding, not part of the column vector: it recedes
          ctx.globalAlpha = vis*alpha[c]*(r===3 ? 0.4 : 1);
          const x = X0+cw*(c+0.5), y = Y0+rh*(r+0.5);
          ctx.fillStyle = cols[c]; ctx.fillText(M[r][c], x, y);
        }
        ctx.globalAlpha = 1;
        tex.needsUpdate = true;
      };
      return sp;
    }
    function wireBubble(infoId, popId){
      const info = document.getElementById(infoId), pop = document.getElementById(popId);
      if(!info || !pop) return;
      info.onclick = e => {
        e.stopPropagation();
        const willOpen = pop.hidden;
        document.querySelectorAll('.bubble:not([hidden]), .pop:not([hidden])').forEach(o=>{
          if(o!==pop){ o.hidden=true; const t=document.querySelector('[aria-controls="'+o.id+'"]'); if(t) t.setAttribute('aria-expanded','false'); }
        });
        pop.hidden = !willOpen; info.setAttribute('aria-expanded', willOpen?'true':'false');
      };
    }

    const stations = [

      /* 0 · the pose: a body frame sitting somewhere relative to the world frame,
             with landmarks that both frames can name. */
      g=>{
        grid(g);
        g.add(gizmo(1.5, 0.045, 0.42));                                  // world frame W
        const lw = makeLabel('W', HX.ink, 1.2); lw.position.set(-0.5,1.7,0); g.add(lw);
        const body = gizmo(1.15, 0.05); g.add(body);
        const lb = makeLabel('T', HX.amber, 1.2); g.add(lb);
        const tArr = dimArrow(COL.amber, 0.032, 0.55); g.add(tArr);       // world origin → body origin
        const lt = makeLabel('t', HX.amber, 1.1); g.add(lt);
        const marks = [V3(2.6,0.9,-1.4), V3(-2.2,1.3,1.9), V3(0.4,-0.9,2.6), V3(-2.7,-0.6,-1.5)];
        marks.forEach(m=>g.add(dot(COL.green, 0.085, m)));
        return {tick(t){
          const a = t*0.28;
          const T = pose(V3(Math.cos(a)*2.3, 0.55+Math.sin(t*0.4)*0.25, Math.sin(a)*2.3),
                         V3(0.25*Math.sin(t*0.31), a+1.2, 0.2*Math.cos(t*0.27)));
          setPose(body, T);
          setArrow(tArr, V3(0,0,0), T.p);
          lb.position.copy(T.p).add(V3(0,1.5,0));
          lt.position.copy(T.p).multiplyScalar(0.5).add(V3(0,0.35,0));
        }};
      },

      /* 1 · pose or transformation: the columns of T are where the world basis vectors
             land. The frame is assembled one column at a time — each unit vector swings
             along the rotation's own geodesic onto the body axis it becomes — and only
             once all three stand does the finished frame slide out along t. The 4×4 panel
             beside it always shows the *current* pose of that moving frame, so it starts
             as the identity, gains one colored column per arrow that lands, and ends as T:
             the drawing and the matrix are the same object, which is the station's claim.
             Mid-rotation the panel is deliberately not a rotation matrix — one column has
             moved and the others have not. That is what "column by column" looks like. */
      g=>{
        // the grid rides with the frames; the panel does not (it sits fixed in the outer
        // group so its own placement is independent of where S is shifted)
        const S = new THREE.Group(); S.position.set(-1.0,-0.2,0); g.add(S);
        const PHI = V3(0.18,0.95,0.28), TT = V3(2.0,0.8,-0.7);
        // W and B straddle the grid's own centre rather than sitting to one side of it:
        // CTR is minus their averaged x/z, so shifting both by it puts the pair's
        // horizontal midpoint exactly at the grid's local (0,·,0) — W and B move, but the
        // displacement TT between them (and every rotation/translation computed from it)
        // is untouched, since only where the *pair* sits is being recentred, not the pose
        // math itself. y is left alone: the grid's height is set separately, below.
        const CTR = V3(-TT.x/2, 0, -TT.z/2);
        grid(S, undefined, undefined, CTR.y-0.05);          // the lower gizmo (W) rests on it
        const T = pose(TT.clone().add(CTR), PHI);
        const world = gizmo(1.15, 0.038, 0.24); world.position.copy(CTR); S.add(world);   // W
        const body = gizmo(1.05, 0.042, 0.2); setPose(body, T); S.add(body);   // where it is headed
        const lw = makeLabel('W', HX.ink, 1.1); lw.position.copy(CTR).add(V3(0.5,1.3,0)); S.add(lw);
        const lbdy = makeLabel('B', HX.ink, 1.1);
        lbdy.position.copy(T.p).add(V3(0,1.55,0)); S.add(lbdy);
        const tArr = dimArrow(COL.amber, 0.032, 0.75); S.add(tArr);       // zero-length until t runs
        const AX = [V3(1,0,0), V3(0,1,0), V3(0,0,1)], CO = [COL.coral, COL.teal, COL.violet];
        const LEN = 1.05;
        // the three live axes, plus the arc each tip sweeps on its way into place
        const arms  = CO.map(c=>{ const a = dimArrow(c, 0.05, 1); S.add(a); return a; });
        const swept = CO.map(c=>{ const l = polyline(24, c, 0.45); S.add(l); return l; });
        // fixed above the W origin rather than riding the arrow tip: a caption that tracks
        // the moving frame ends up sitting over the B gizmo by the time the slide runs,
        // exactly where a second frame's own geometry is — confusing when several frames
        // are on screen together. Anchored here it stays legible and never competes with
        // anything the animation moves through.
        const lbl = makeLabel(' ', HX.coral, 2.7); lbl.position.copy(CTR).add(V3(0,2.5,0.9)); S.add(lbl);
        // above and to the right of the frame rather than beside it at the same height —
        // a floating side-by-side panel needed a wide gap to stay clear; stacked instead,
        // the whole station reads well in the roughly-square 3D viewport
        const panel = matrixPanel(3.9); panel.position.set(2.6,3.5,0); g.add(panel);
        const CX = [HX.coral, HX.teal, HX.violet, HX.amber];
        const M  = [['0','0','0','0'],['0','0','0','0'],['0','0','0','0'],['0','0','0','1']];
        const al = [0,0,0,0];
        const TX = ['R e1', 'R e2', 'R e3', 't'];
        // one column at a time, then the slide; the tail hold is what makes finished T readable
        const LEAD = 0.55, ROT = 1.15, GAP = 0.22, MID = 0.7, TR = 1.5, TAIL = 2.1, FADE = 0.5;
        const ST = [LEAD, LEAD+ROT+GAP, LEAD+2*(ROT+GAP)];
        const SL = ST[2] + ROT + MID, PER = SL + TR + TAIL;
        let t0 = null, cur = -2;
        colApi = { restart(){ t0 = null; cur = -2; } };
        return {tick(t){
          if(t0 === null) t0 = t;
          const tc = (t - t0) % PER;
          const vis = clamp(tc/0.3, 0, 1) * clamp((PER-tc)/FADE, 0, 1);   // the loop's cut, softened
          const u   = ST.map(s => ease(clamp((tc-s)/ROT, 0, 1)));
          const uT  = ease(clamp((tc-SL)/TR, 0, 1));
          const org = CTR.clone().addScaledVector(TT, uT);
          // each axis travels the rotation's own geodesic, staged one after another: the arc
          // it sweeps is drawn behind it, so "rotated into place" is visible, not inferred
          const dir = AX.map((e,i)=> e.clone().applyQuaternion(expQ(PHI.clone().multiplyScalar(u[i]))));
          for(let i=0;i<3;i++){
            setArrow(arms[i], org, dir[i].clone().multiplyScalar(LEN));
            arms[i].userData.cyl.material.opacity = vis;
            const pts = [];
            for(let k=0;k<24;k++){ const s = u[i]*k/23;
              pts.push(org.clone().addScaledVector(
                AX[i].clone().applyQuaternion(expQ(PHI.clone().multiplyScalar(s))), LEN)); }
            swept[i].userData.set(pts);
            swept[i].material.opacity = 0.45*vis;
          }
          setArrow(tArr, CTR, org);
          tArr.userData.cyl.material.opacity = 0.75*vis;
          // the caption names whichever column is being written right now
          let ph = -1;
          for(let i=0;i<3;i++) if(tc >= ST[i] && tc < ST[i]+ROT+GAP) ph = i;
          if(tc >= SL) ph = 3;
          if(ph !== cur){ cur = ph; if(ph >= 0) updateLabel(lbl, TX[ph], CX[ph]); }
          lbl.visible = ph >= 0;
          lbl.material.opacity = vis;
          // the panel is that same frame, written down: identity → one colored column per
          // arrow that lands → T
          for(let c=0;c<3;c++){
            al[c] = 0.3 + 0.7*u[c];
            M[0][c] = fmt(dir[c].x); M[1][c] = fmt(dir[c].y); M[2][c] = fmt(dir[c].z);
          }
          al[3] = 0.3 + 0.7*uT;
          // the matrix's t column is the true translation, not the on-screen (CTR-shifted)
          // position org is drawn at
          const tv = TT.clone().multiplyScalar(uT);
          M[0][3] = fmt(tv.x); M[1][3] = fmt(tv.y); M[2][3] = fmt(tv.z);
          panel.userData.draw(M, CX, al, vis, t);
        }};
      },

      /* 2 · chaining as re-reading one point: the landmark never moves, only the frame we
             read it in. One bright frame does all of the reading. It starts parked on C,
             where the staircase grows leg by leg and the three numbers fill in with it;
             then it glides into B, and from B into W — each glide along the SE(3) geodesic
             between the two poses, T(s) = A·exp(s·log(A⁻¹B)), the same exp/log the rest of
             the journey runs on. The staircase is rebuilt from that frame's own axes every
             tick, so it stays pinned to the landmark while its components slide continuously
             from p(C) to p(B) to p(W), and the read-out riding under the frame is those
             components, live. Watching the numbers change *during* the travel is the point:
             the chain is one continuous change of observer, not three separate pictures. */
      g=>{
        grid(g);
        // the frames sit left of the world origin, which the HUD card covers, so the whole
        // scene is shifted right — less far than it used to be, because the read-out now
        // rides the frame and carries the visual mass rightward with it. A uniform shift
        // leaves every read-out coordinate unchanged.
        const S = new THREE.Group(); S.position.set(1.0,-0.3,0); g.add(S); g = S;
        const TWB = pose(V3(-1.6,0.3,0.9), V3(0.05,0.85,0.12));
        const TBC = pose(V3(1.25,0.65,0.25), V3(0,-0.6,0.18));
        const TWC = compose(TWB, TBC);
        const W = {p:V3(0,0,0), q:new THREE.Quaternion()};
        const P = V3(2.1,1.7,-1.5);                                      // landmark, fixed in W
        g.add(dot(COL.green, 0.12, P));
        // the three frames stay drawn as faint anchors; the reading frame parks on them.
        // Kept by reference (not just built) so the one the live frame is sitting on or
        // sliding into can be faded out — full overlap between two frame gizmos is what
        // was glitching (coplanar arrows z-fighting at the exact same pose).
        const ANCH = 0.24;
        const anchors = [[TWC,'C'],[TWB,'B'],[W,'W']].map(([T,name])=>{
          const gz = gizmo(0.95, 0.036, ANCH); setPose(gz, T); g.add(gz);
          const l = makeLabel(name, HX.ink, 0.9); l.position.copy(T.p).add(V3(-0.42,1.3,0)); g.add(l);
          return {p:T.p, gz};
        });
        const live = gizmo(0.95, 0.05, 1); g.add(live);
        // one 2-point line per axis component, rebuilt from `live`'s axes on every tick
        const legs = [polyline(2, COL.coral, 0.95), polyline(2, COL.teal, 0.95),
                      polyline(2, COL.violet, 0.95)];
        legs.forEach(l=>g.add(l));
        const read = makeLabel(' ', HX.green, 3.9); g.add(read);
        const step = makeLabel(' ', HX.amber, 2.2); g.add(step);
        const HOP = [{A:TWC, B:TWB, s:'B ← C', n:'B'}, {A:TWB, B:W, s:'W ← B', n:'W'}];
        HOP.forEach(h => { h.xi = logSE3(compose(invert(h.A), h.B)); });
        const at = (h, s) => compose(h.A, expSE3(h.xi.rho.clone().multiplyScalar(s),
                                                 h.xi.phi.clone().multiplyScalar(s)));
        const LEAD = 0.45, GROW = 1.5, HOLD = 1.1, GLIDE = 2.1, TAIL = 1.5, FADE = 0.55;
        const H0 = LEAD + GROW + HOLD, H1 = H0 + GLIDE + HOLD, PER = H1 + GLIDE + TAIL;
        let t0 = null, curS = -2, lastR = '', lastT = -1;
        chainApi = { restart(){ t0 = null; curS = -2; lastR = ''; } };
        return {tick(t){
          if(t0 === null) t0 = t;
          const tc = (t - t0) % PER;
          const vis = clamp(tc/0.3, 0, 1) * clamp((PER-tc)/FADE, 0, 1);   // the loop's cut, softened
          const k = tc < H0 ? -1 : (tc < H1 ? 0 : 1);
          let T = TWC, s = 0, name = 'C';
          if(k >= 0){
            s = clamp((tc - (k ? H1 : H0))/GLIDE, 0, 1);
            T = at(HOP[k], ease(s));
            name = s >= 1 ? HOP[k].n : null;                 // in transit it is neither frame
          }
          setPose(live, T);
          const o = vis*(1 - 0.5*Math.sin(Math.PI*s));       // the travelling frame goes faint
          live.children.forEach(a => { a.userData.cyl.material.opacity = o; });
          // whichever static anchor the live frame is at or sliding into fades out under it,
          // so the two coplanar gizmos never fully coincide — that overlap is what glitched
          const NEAR = 0.85;
          anchors.forEach(an => {
            const f = ease(clamp(T.p.distanceTo(an.p)/NEAR, 0, 1));
            an.gz.children.forEach(a => { a.userData.cyl.material.opacity = ANCH*f*vis; });
          });
          // the landmark, split along whichever axes are current
          const c = P.clone().sub(T.p).applyQuaternion(T.q.clone().conjugate());
          const dir = [V3(1,0,0),V3(0,1,0),V3(0,0,1)].map(e=>e.applyQuaternion(T.q));
          const comp = [c.x, c.y, c.z];
          const w = k < 0 ? ease(clamp((tc-LEAD)/GROW, 0, 1)) : 1;
          const shown = [];
          let from = T.p.clone();
          for(let i=0;i<3;i++){
            const f = clamp(w*3 - i, 0, 1);                  // the legs draw one after another
            shown.push(comp[i]*f);
            legs[i].userData.set([from, from.clone().addScaledVector(dir[i], comp[i]*f)]);
            legs[i].material.opacity = 0.95*vis;
            from = from.clone().addScaledVector(dir[i], comp[i]);
          }
          // the read-out rides the frame: parked on C the numbers *are* p(C), so the letter
          // only has to be said when there is a frame to say it about
          read.position.copy(T.p).add(V3(0.2,-0.9,0));
          read.material.opacity = vis*clamp(w*2-0.35, 0, 1);
          const txt = 'p'+(name ? '('+name+')' : '')+' = ('+shown.map(fmt).join(', ')+')';
          if(txt !== lastR && t - lastT > 0.04){ lastR = txt; lastT = t; updateLabel(read, txt, HX.green); }
          step.position.copy(T.p).add(V3(0,1.8,0));
          step.material.opacity = vis;
          step.visible = k >= 0;
          if(k !== curS){ curS = k; if(k >= 0) updateLabel(step, HOP[k].s, HX.amber); }
        }};
      },

      /* 3 · order: the same two moves, composed both ways. Left composition means "in world
             axes", so in the second chain the rotation swings the already-translated body
             around the world origin — and the two bodies end up somewhere else entirely. */
      g=>{
        grid(g);
        // the turn is about z, so the swing of the second chain happens across the screen
        // rather than into it — the whole point is that the two endpoints look different
        const PHI = V3(0, 0, Math.PI/2), TT = V3(2, 0, 0);
        const RQ = expQ(PHI);
        const endA = {p:TT.clone(), q:RQ.clone()};                        // T(t)·T(R) = (R, t)
        const endB = {p:TT.clone().applyQuaternion(RQ), q:RQ.clone()};    // T(R)·T(t) = (R, Rt)
        // A: turn in place, then slide. B: slide, then turn about the world origin.
        const trA = polyline(2, COL.teal, 0.8);      g.add(trA);
        trA.userData.set([V3(0,0,0), TT.clone()]);
        const trB = polyline(42, COL.violet2, 0.8);  g.add(trB);
        const pathB = [V3(0,0,0)]; for(let i=0;i<=40;i++){ const s=i/40;
          pathB.push(TT.clone().applyQuaternion(expQ(PHI.clone().multiplyScalar(s)))); }
        trB.userData.set(pathB);
        g.add(dot(COL.teal, 0.14, endA.p)); g.add(dot(COL.violet2, 0.14, endB.p));
        // B is drawn a touch smaller so the two frames stay apart while they still overlap
        const gA = gizmo(1.0, 0.05), gB = gizmo(0.8, 0.042); g.add(gA); g.add(gB);
        const lA = makeLabel('T(t) T(R)', HX.teal, 2.6);
        lA.position.copy(endA.p).add(V3(0.7,-0.8,0)); g.add(lA);
        const lB = makeLabel('T(R) T(t)', HX.violet2, 2.6);
        lB.position.copy(endB.p).add(V3(0,0.9,0)); g.add(lB);
        const PER = 5.2;
        return {tick(t){
          const tc = t%PER;
          const u1 = ease(clamp((tc-0.4)/1.6, 0, 1)), u2 = ease(clamp((tc-2.4)/1.6, 0, 1));
          setPose(gA, {p:TT.clone().multiplyScalar(u2),
                       q:new THREE.Quaternion().slerp(RQ, u1)});
          const qB = new THREE.Quaternion().slerp(RQ, u2);
          setPose(gB, {p:TT.clone().multiplyScalar(u1).applyQuaternion(qB), q:qB});
        }};
      },

      /* 2 · the twist: the velocity field of a rigid body, v(x) = ω×x + u.
             Six numbers describe every arrow in the picture. */
      g=>{
        // a square pyramid rather than a cube: it has a nose, so the turning is legible
        const R0 = 1.15, HH = 1.0;
        g.add(new THREE.Mesh(new THREE.ConeGeometry(R0, 2*HH, 4),
          new THREE.MeshBasicMaterial({color:COL.se3tube, wireframe:true, transparent:true, opacity:0.6})));
        const apex = V3(0,HH,0);
        const base = [V3(0,-HH,R0), V3(R0,-HH,0), V3(0,-HH,-R0), V3(-R0,-HH,0)];
        const pts = base.concat([apex]);
        base.forEach((b,i)=>pts.push(b.clone().lerp(base[(i+1)%4], 0.5)));
        base.forEach(b=>pts.push(b.clone().lerp(apex, 0.55)));
        const arrows = pts.map(()=>{ const a = dimArrow(COL.violet, 0.026, 0.8); g.add(a); return a; });
        const axArr = fatArrow(COL.coral, 0.05), uArr = fatArrow(COL.teal, 0.05);
        g.add(axArr); g.add(uArr);
        const lw = makeLabel('φ', HX.coral, 1.4), lu = makeLabel('ρ', HX.teal, 1.4);
        g.add(lw); g.add(lu);
        // kept off the view axis so the linear part reads as an arrow, not a dot
        const U = V3(1.25, -0.1, 0.7);                                    // the linear part
        return {tick(t){
          const w = V3(Math.sin(t*0.33)*0.55, 1.0, Math.cos(t*0.29)*0.45).normalize().multiplyScalar(1.6);
          pts.forEach((p,i)=>setArrow(arrows[i], p, w.clone().cross(p).add(U).multiplyScalar(0.55)));
          setArrow(axArr, V3(0,0,0), w.clone().multiplyScalar(1.25));
          setArrow(uArr, V3(0,0,0), U.clone().multiplyScalar(1.1));
          lw.position.copy(w).multiplyScalar(1.45).add(V3(0,0.25,0));
          lu.position.copy(U).multiplyScalar(1.3).add(V3(0,0.25,0));
        }};
      },

      /* 3 · exp as a screw: hold one twist constant for unit time. The traced path is
             a helix about the screw axis; ghost frames mark the way. */
      g=>{
        const RHO = V3(2.2, 0.8, 0.2), PHI = V3(0.16,1,0.1).normalize().multiplyScalar(2.55);
        const path = [];
        for(let i=0;i<=90;i++){ const s=i/90; path.push(expSE3(RHO.clone().multiplyScalar(s), PHI.clone().multiplyScalar(s)).p); }
        const tube = new THREE.Mesh(
          new THREE.TubeGeometry(new THREE.CatmullRomCurve3(path), 140, 0.035, 6, false),
          new THREE.MeshBasicMaterial({color:COL.violet2, transparent:true, opacity:0.85}));
        g.add(tube);
        const sc = screwAxis(RHO, PHI);
        if(sc){
          g.add(dashedLine(sc.c.clone().addScaledVector(sc.ax,-2.6), sc.c.clone().addScaledVector(sc.ax,3.0), COL.amber, 0.14));
          const la = makeLabel('â', HX.amber, 1.0);
          la.position.copy(sc.c).addScaledVector(sc.ax, 3.35); g.add(la);
        }
        for(let k=0;k<=4;k++){
          const s = k/4, T = expSE3(RHO.clone().multiplyScalar(s), PHI.clone().multiplyScalar(s));
          const gh = gizmo(0.55, 0.028, 0.32); setPose(gh, T); g.add(gh);
        }
        const live = gizmo(0.95, 0.05); g.add(live);
        const ls = makeLabel('exp(ξ)', HX.ink, 2.0); ls.position.set(0,2.6,0); g.add(ls);
        const PER = 4.6;
        return {tick(t){
          const u = clamp(((t%PER)-0.5)/3.2, 0, 1), s = ease(u);
          setPose(live, expSE3(RHO.clone().multiplyScalar(s), PHI.clone().multiplyScalar(s)));
        }};
      },

      /* 4 · the left Jacobian: the constant body velocity, re-aimed by the ongoing
             rotation, summed head-to-tail into the chord t. The θ slider fans it. */
      g=>{
        const RHO = V3(2.5, 0.35, 0.0), AX = V3(0.12, 1, 0.16).normalize();
        const N = 14;
        const seg = []; for(let i=0;i<N;i++){ const a = dimArrow(COL.violet, 0.026, 0.9); g.add(a); seg.push(a); }
        const arc  = polyline(64, COL.violet2, 0.55);  g.add(arc);
        const tArr = fatArrow(COL.amber, 0.05);  g.add(tArr);
        const rArr = fatArrow(COL.teal, 0.05);   g.add(rArr);
        const endD = dot(COL.amber, 0.1);        g.add(endD);
        const lt = makeLabel('t = V(φ)ρ', HX.amber, 2.6), lr = makeLabel('ρ', HX.teal, 1.0);
        g.add(lt); g.add(lr);
        let theta = 0.0;
        function refresh(){
          const phi = AX.clone().multiplyScalar(theta);
          const t = Vmul(phi, RHO);
          const pts = [];
          for(let i=0;i<64;i++){ const s=i/63; pts.push(Vmul(phi.clone().multiplyScalar(s), RHO.clone().multiplyScalar(s))); }
          arc.userData.set(pts);
          // head-to-tail chain of the turning velocity R(s)ρ/N: it *is* the path
          for(let i=0;i<N;i++){
            const s = (i+0.5)/N;
            const from = Vmul(phi.clone().multiplyScalar(i/N), RHO.clone().multiplyScalar(i/N));
            setArrow(seg[i], from, RHO.clone().applyQuaternion(expQ(phi.clone().multiplyScalar(s))).multiplyScalar(1/N));
          }
          setArrow(tArr, V3(0,0,0), t);
          setArrow(rArr, V3(0,0,0), RHO);
          endD.position.copy(t);
          lt.position.copy(t).multiplyScalar(0.55).add(V3(0,-1.15,0));
          lr.position.copy(RHO).add(V3(0.3,0.34,0));
          if(jacApi && jacApi.onchange) jacApi.onchange(theta, RHO.length(), t.length());
        }
        refresh();
        jacApi = { set(deg){ theta = deg*Math.PI/180; refresh(); }, get(){ return theta; }, onchange:null };
        return {tick(){}};
      },

      /* 5 · log: two keyframes on a trajectory, and the relative screw between them
             read back as an angle and an arc length. */
      g=>{
        const curve = new THREE.CatmullRomCurve3([
          V3(-3.3,-1.9,1.6), V3(-1.5,-0.7,-1.1), V3(0.6,-1.4,1.3),
          V3(2.7,-0.3,-0.9), V3(4.8,-1.2,0.9)]);
        g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 160, 0.03, 6, false),
          new THREE.MeshBasicMaterial({color:COL.se3tube, transparent:true, opacity:0.75})));
        function frameAt(s){
          const p = curve.getPointAt(clamp(s,0,1)), T = curve.getTangentAt(clamp(s,0,1)).normalize();
          let Nv = V3(0,1,0).cross(T); if(Nv.length()<1e-3) Nv = V3(1,0,0).cross(T);
          Nv.normalize();
          const B = T.clone().cross(Nv);
          return {p, q:new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(Nv,B,T))};
        }
        const SS = [0.04,0.24,0.44,0.64,0.84];
        const KF = SS.map(s=>frameAt(s));
        const ghosts = KF.map(T=>{ const gh = gizmo(0.5,0.026,0.3); setPose(gh,T); g.add(gh); return gh; });
        const a1 = gizmo(0.85,0.045), a2 = gizmo(0.85,0.045); g.add(a1); g.add(a2);
        // the relative motion, replayed from the identity in its own little stage above the
        // trajectory: that detached screw is exactly what the six numbers mean
        const inset = new THREE.Group(); inset.position.set(0.6,1.9,0); g.add(inset);
        inset.add(gizmo(0.7,0.035,0.45));
        const arc = polyline(48, COL.amber, 0.95); inset.add(arc);
        const relEnd = gizmo(0.8,0.042); inset.add(relEnd);
        const read = makeLabel('θ = 0°', HX.amber, 3.4); read.position.set(0.6,3.1,0); g.add(read);
        const lrel = makeLabel('log(Ta^{-1}Tb)', HX.ink, 3.0); lrel.position.set(0.6,3.8,0); g.add(lrel);
        let cur = -1;
        function showPair(k){
          cur = k;
          const A = KF[k], B = KF[k+1];
          setPose(a1, A); setPose(a2, B);
          const xi = logSE3(compose(invert(A), B));
          const pts = [];
          for(let i=0;i<48;i++){ const u = i/47;
            pts.push(expSE3(xi.rho.clone().multiplyScalar(u), xi.phi.clone().multiplyScalar(u)).p); }
          arc.userData.set(pts);
          setPose(relEnd, expSE3(xi.rho, xi.phi));
          const th = xi.phi.length()*180/Math.PI;
          updateLabel(read, 'θ = '+th.toFixed(0)+'°   |ρ| = '+xi.rho.length().toFixed(2), HX.amber);
        }
        showPair(0);
        return {tick(t){
          const k = Math.floor((t*0.36) % (KF.length-1));
          if(k !== cur) showPair(k);
        }};
      },

      /* 6 · the adjoint: the same screw carried by the body. The twist arrows are
             glued to the moving frame — identical coordinates at either end. */
      g=>{
        const RHO = V3(1.55, 0.4, 0.1), PHI = V3(0.1,1,0.12).normalize().multiplyScalar(2.2);
        const path = [];
        for(let i=0;i<=90;i++){ const s=i/90; path.push(expSE3(RHO.clone().multiplyScalar(s), PHI.clone().multiplyScalar(s)).p); }
        g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(path),140,0.03,6,false),
          new THREE.MeshBasicMaterial({color:COL.violet2, transparent:true, opacity:0.7})));
        const sc = screwAxis(RHO, PHI);
        if(sc) g.add(dashedLine(sc.c.clone().addScaledVector(sc.ax,-2.2), sc.c.clone().addScaledVector(sc.ax,2.8), COL.amber, 0.14));
        // the twist drawn in the body frame: a child of the frame group, so it rides along
        function twistPack(op){
          const G = new THREE.Group();
          const a = op==null ? fatArrow(COL.coral,0.04) : dimArrow(COL.coral,0.035,op);
          const b = op==null ? fatArrow(COL.teal,0.04)  : dimArrow(COL.teal,0.035,op);
          setArrow(a, V3(0,0,0), PHI.clone().multiplyScalar(0.42));
          setArrow(b, V3(0,0,0), RHO.clone().multiplyScalar(0.42));
          G.add(a); G.add(b); return G;
        }
        const start = gizmo(0.7,0.035,0.45); setPose(start, {p:V3(0,0,0), q:new THREE.Quaternion()});
        start.add(twistPack(0.4)); g.add(start);
        const endT = expSE3(RHO, PHI);
        const end = gizmo(0.7,0.035,0.45); setPose(end, endT); end.add(twistPack(0.4)); g.add(end);
        const live = gizmo(0.95,0.05); live.add(twistPack(null)); g.add(live);
        const lbl = makeLabel('Ad(exp ξ) ξ = ξ', HX.ink, 3.4); lbl.position.set(0,2.5,0); g.add(lbl);
        const PER = 5.0;
        return {tick(t){
          const u = clamp(((t%PER)-0.6)/3.4, 0, 1), s = ease(u);
          setPose(live, expSE3(RHO.clone().multiplyScalar(s), PHI.clone().multiplyScalar(s)));
        }};
      },

      /* 7 · resampling: split slerp+lerp (straight chords) against the screw geodesic
             (curved). The rotation is identical on both — only translation differs. */
      g=>{
        const KF = [
          {t:0, T:pose(V3(-3.6,-1.0,1.3), V3(0.12,-0.55,0.05))},
          {t:1, T:pose(V3(-1.3, 0.25,-1.2), V3(0.05, 0.40,0.22))},
          {t:2, T:pose(V3( 1.4,-0.45,1.1), V3(-0.18,1.35,-0.1))},
          {t:3, T:pose(V3( 3.5, 0.85,-0.7), V3(0.10, 2.45,0.28))}
        ];
        KF.forEach(k=>{ const gh = gizmo(0.6,0.03,0.5); setPose(gh, k.T); g.add(gh);
                        g.add(dot(COL.ink, 0.075, k.T.p)); });
        const seg = q => { let i=0; while(i < KF.length-2 && q > KF[i+1].t) i++; return i; };
        function splitAt(q){
          const i = seg(q), A = KF[i].T, B = KF[i+1].T;
          const u = clamp((q-KF[i].t)/(KF[i+1].t-KF[i].t), 0, 1);
          return {p: A.p.clone().lerp(B.p, u), q: A.q.clone().slerp(B.q, u)};
        }
        function screwAt(q){
          const i = seg(q), A = KF[i].T, B = KF[i+1].T;
          const u = clamp((q-KF[i].t)/(KF[i+1].t-KF[i].t), 0, 1);
          const xi = logSE3(compose(invert(A), B));
          return compose(A, expSE3(xi.rho.clone().multiplyScalar(u), xi.phi.clone().multiplyScalar(u)));
        }
        const chord = polyline(4, COL.teal, 0.85); g.add(chord);
        chord.userData.set(KF.map(k=>k.T.p));
        const sPts = []; for(let i=0;i<120;i++) sPts.push(screwAt(i/119*3).p);
        const screw = polyline(120, COL.violet2, 0.8); g.add(screw); screw.userData.set(sPts);
        const fA = gizmo(0.85,0.045); g.add(fA);
        const fB = gizmo(0.7,0.032,0.55); g.add(fB);
        const gap = dimArrow(COL.red, 0.022, 0.9); g.add(gap);
        const l1 = makeLabel('lerp', HX.teal, 1.5);          l1.position.set(-0.4,2.2,0); g.add(l1);
        const l2 = makeLabel('exp(u ξ)', HX.violet2, 2.2);   l2.position.set(2.6,2.2,0);  g.add(l2);
        let q = 0, auto = true;
        function place(){
          const A = splitAt(q), B = screwAt(q);
          setPose(fA, A); setPose(fB, B);
          const d = B.p.clone().sub(A.p);
          if(d.length() > 0.02) setArrow(gap, A.p, d); else gap.visible = false;
          if(interpApi && interpApi.onchange) interpApi.onchange(q, d.length());
        }
        place();
        interpApi = { setQ(v){ auto=false; q=clamp(v,0,3); place(); },
                      setAuto(v){ auto=v; }, isAuto(){ return auto; }, onchange:null };
        return {tick(t){ if(!auto) return; q = (t*0.42) % 3; place(); }};
      }
    ];

    function bindCard(i){
      wireBubble('se3HomInfo','se3HomNote');       // card 1
      wireBubble('se3ColInfo','se3ColNote');       // card 2
      wireBubble('se3InvInfo','se3InvNote');       // card 3
      wireBubble('se3OrdInfo','se3OrdNote');       // card 4
      wireBubble('se3SkewInfo','se3SkewNote');     // card 5
      wireBubble('se3ChaInfo','se3ChaNote');       // card 6
      wireBubble('se3HatInfo','se3HatNote');       // card 6
      wireBubble('se3IntInfo','se3IntNote');       // card 7
      wireBubble('se3SerInfo','se3SerNote');       // card 8
      wireBubble('se3AdjInfo','se3AdjNote');       // card 9
      wireBubble('se3InvarInfo','se3InvarNote');   // card 9

      // Both of these build a story from the top — a matrix filling in column by column,
      // a frame walking the chain — so they restart when their own card appears rather
      // than being joined mid-sentence at whatever phase the shared clock happens to be in.
      if(i===1 && colApi) colApi.restart();
      if(i===2 && chainApi) chainApi.restart();

      if(i===6 && jacApi){
        const sl = document.getElementById('se3jsl');
        const th = document.getElementById('se3jth'), ro = document.getElementById('se3jrho'),
              ch = document.getElementById('se3jt');
        jacApi.onchange = (rad, arc, chord)=>{
          if(th) th.textContent = Math.round(rad*180/Math.PI)+'°';
          if(ro) ro.textContent = arc.toFixed(2);
          if(ch) ch.textContent = chord.toFixed(2);
        };
        if(sl){ sl.oninput = ()=>jacApi.set(parseFloat(sl.value)); jacApi.set(parseFloat(sl.value)); }
      }
      if(i===9 && interpApi){
        const sl = document.getElementById('se3isl'), qv = document.getElementById('se3iq'),
              gv = document.getElementById('se3igap'), au = document.getElementById('se3iauto');
        let lastQ = '', lastG = '';
        interpApi.onchange = (q, d)=>{
          const a = q.toFixed(2), b = d.toFixed(3);
          if(qv && a!==lastQ){ qv.textContent = a; lastQ = a; }
          if(gv && b!==lastG){ gv.textContent = b; lastG = b; }
          if(sl && interpApi.isAuto()) sl.value = String(Math.round(q*1000/3));
        };
        if(sl) sl.oninput = ()=>interpApi.setQ(parseFloat(sl.value)*3/1000);
        if(au) au.onclick = ()=>interpApi.setAuto(true);
      }
    }

    return { stations, bindCard };
  }

  return {
    id: 'geometry-se3',
    tier: 'geometry',
    threadKey: 'violet2',
    // Curriculum position, as data rather than prose: `next` is the following moon in
    // hub.js's BRANCHES order (crossing into the next branch at a branch end), `handoffs`
    // are the topical pointers this journey's cards name, `requires` the hard
    // back-references its opening card makes. engine.js renders next+handoffs as links
    // on the last station; check.html verifies every id resolves and that the next-chain
    // still agrees with BRANCHES.
    seq: { next: 'geometry-sim3', requires: ['geometry-so3'], handoffs: ['slam-factor-graph'] },
    build,
    cards: {
      hu: [
        {t:'A póz', b:'<p>Egy <em>póz</em> arra válaszol, hogy hol áll és merre néz egy referenciakeret egy másikhoz képest. Két adat írja le: egy <span class="m">R ∈ SO(3)</span> forgatás és egy <span class="m">t ∈ ℝ<sup>3</sup></span> eltolás. Egy pont átszámolása a referenciakeretek között ennyi:</p><p class="matline"><span class="m">p<sub>W</sub> = R p<sub>B</sub> + t</span></p><p>A kettőt egyetlen <button class="termbtn" id="se3HomInfo" type="button" aria-expanded="false" aria-controls="se3HomNote">4×4-es</button> mátrixba rendezzük:</p><p class="matline"><span class="m">T =</span><span class="matrix"><span class="mbracket"></span><span class="mgrid" style="grid-template-columns:repeat(2,auto)"><span>R</span><span>t</span><span>0<sup>⊤</sup></span><span>1</span></span><span class="mbracket right"></span></span><span class="m">∈ SE(3)</span></p><p>Hat szabadsági fok — három szög, három eltolás —, de tizenkét tárolt szám. A különbséget az <span class="m">R<sup>⊤</sup>R = I</span> kényszer nyeli el, és pontosan ez teszi görbültté a teret: két pózt <em>nem</em> lehet elemenként átlagolni, mert az eredmény kiesne <span class="m">SE(3)</span>-ból.</p><p>SLAM-szótárban minden kulcskép egy póz, a térkép pontjai a világ referenciakeretben élnek, a kamera–IMU <em>extrinszik</em> szintén egy póz. A SLAM persze ennél jóval több — becslés, adattársítás, hurokzárás, optimalizálás —, de a geometriai váza végig ez az átszámolás, és minden más erre épül.</p><div class="bubble" id="se3HomNote" role="dialog" aria-label="Miert 4x4" hidden><p>A trükk a <em>homogén koordináta</em>: a három szám mellé írunk egy negyediket, és ez a negyedik mondja meg, hogy a hármas mit jelent.</p><p><strong>1</strong> a végén: <em>pont</em>. Egy hely a térben, van origótól mért helye.</p><p><strong>0</strong> a végén: <em>irányvektor</em>. Nem hely, hanem egy nyíl, amiből csak az irány és a hossz számít, a kezdőpontja nem. Ilyen egy látósugár iránya, egy felületi normális vagy egy sebességvektor. Fontos: itt nem forgatásról van szó, az az <span class="m">R</span> dolga, hanem egy közönséges háromelemű vektorról.</p><p class="matline"><span class="m">T</span><span class="matrix"><span class="mbracket"></span><span class="mgrid" style="grid-template-columns:auto"><span>p</span><span>1</span></span><span class="mbracket right"></span></span><span class="m">=</span><span class="matrix"><span class="mbracket"></span><span class="mgrid" style="grid-template-columns:auto"><span>Rp + t</span><span>1</span></span><span class="mbracket right"></span></span></p><p class="matline"><span class="m">T</span><span class="matrix"><span class="mbracket"></span><span class="mgrid" style="grid-template-columns:auto"><span>v</span><span>0</span></span><span class="mbracket right"></span></span><span class="m">=</span><span class="matrix"><span class="mbracket"></span><span class="mgrid" style="grid-template-columns:auto"><span>Rv</span><span>0</span></span><span class="mbracket right"></span></span></p><p>Az irányvektorból tehát kiesik az eltolás, és ez így helyes. Ha a kamerát elforgatjuk, a látósugár iránya elfordul. Ha viszont csak arrébb visszük két méterrel, a nyíl iránya változatlan marad. Egy pontnak van „hol”-ja, egy iránynak nincs.</p><p>A ráragasztott <span class="m">[0 0 0 1]</span> sor pedig nem dísz: ettől lesz két póz szorzata is póz. Így a láncolás közönséges mátrixszorzás, van egységelem és van inverz, vagyis a pózok <em>csoportot</em> alkotnak. Ez az <span class="m">SE(3)</span>.</p></div>'},

        {t:'Póz vagy transzformáció?', b:'<p>Ugyanaz a 4×4-es mátrix két dolgot jelent egyszerre, és érdemes tisztázni, mikor melyiket mondjuk.</p><p><strong>Referenciakeret-váltás.</strong> A pont mozdulatlan, csak más referenciakeret koordinátáiban írjuk le. Ez a <span class="m">p<sub>W</sub> = R p<sub>B</sub> + t</span> képlet, semmi nem mozdul el, csak a leolvasás módja változik.</p><p><strong>Póz.</strong> Hol áll a <span class="m">B</span> referenciakeret <span class="m">W</span>-ben. És most jön a lényeg: ez a kettő <em>ugyanaz a mátrix</em>, nem véletlen egybeesés. Nézzük meg, mit mond a referenciakeret-váltás a <span class="m">B</span>-beli bázisvektorokról:</p><p class="matline"><span class="m">e<sub>1</sub> ↦ R e<sub>1</sub> + t</span></p><p class="matline"><span class="m">e<sub>2</sub> ↦ R e<sub>2</sub> + t</span></p><p class="matline"><span class="m">e<sub>3</sub> ↦ R e<sub>3</sub> + t</span></p><p><span class="m">R</span> <button class="termbtn" id="se3ColInfo" type="button" aria-expanded="false" aria-controls="se3ColNote">oszlopai</button> tehát pontosan <span class="m">B</span> tengelyei, <span class="m">W</span> koordinátáiban kifejezve, <span class="m">t</span> pedig <span class="m">B</span> origója <span class="m">W</span>-ben. A mátrix négy oszlopa szó szerint lerajzolja a referenciakeretet, és a jelenetben pontosan ez épül fel: előbb a bázisvektorok forognak a helyükre, egyenként, és mindegyik a saját oszlopát írja be a mátrixba a maga színével, majd a kész referenciakeret kicsúszik a helyére <span class="m">t</span> mentén — az a negyedik oszlop.</p><p><strong>Mozgás.</strong> Van egy harmadik olvasat is: fogj egy testet, és told-forgasd el. Ilyenkor <span class="m">T</span> nem egy referenciakeret <em>helyzete</em>, hanem egy <em>elmozdulás</em>. A számolás ugyanaz, a jelentés más, ezért érdemes külön nevet adni neki — relatív póz, elmozdulás, <span class="m">ΔT</span>.</p><p>A jelölés ezt viszi végig. A <span class="m">T<sub>WB</sub></span> olvasható úgy, hogy „<span class="m">B</span> póza <span class="m">W</span>-ben”, és úgy is, hogy „<span class="m">B</span>-koordinátákat <span class="m">W</span>-koordinátákká alakít”. A két mondat ugyanazt jelenti. Ha viszont <span class="m">ΔT</span>-t írunk, akkor mozgásról beszélünk, és ott mindig meg kell mondani, melyik referenciakerethez képest — erről szól majd az adjungált.</p><div class="bubble" id="se3ColNote" role="dialog" aria-label="Miert az oszlopok" hidden><p>Egy mátrix <span class="m">i</span>-edik oszlopa definíció szerint az, amit az <span class="m">i</span>-edik bázisvektoron kapunk:</p><p class="matline"><span class="m">R e<sub>1</sub> = az R első oszlopa</span></p><p>Ez azért van így, mert <span class="m">e<sub>1</sub> = (1, 0, 0)</span>, a mátrixszorzás pedig az oszlopok súlyozott összege. Itt a súlyok <span class="m">1, 0, 0</span>, vagyis pontosan az első oszlop marad.</p><p>Szemléletesen: ha a <span class="m">B</span> referenciakeret <span class="m">x</span> tengelye mentén lépünk egy egységnyit, a világban az <span class="m">R</span> első oszlopával lépünk. A referenciakeret három tengelye és az origója együtt éppen a <span class="m">T</span> négy oszlopa — ezért mondjuk, hogy a póz „benne van” a mátrixban.</p></div>'},

        {t:'Referenciakeretek láncolása', b:'<p>Ha kiírjuk, melyik referenciakeretből melyikbe visz az átszámolás, a láncolás magától olvasható, mert a belső indexek kiejtik egymást:</p><p class="matline"><span class="m">T<sub>WC</sub> = T<sub>WB</sub> · T<sub>BC</sub></span></p><p>Jobbról balra kell olvasni: előbb a kamera referenciakeretéről a testére, majd a testéről a világéra váltunk.</p><p>A jelenetben a zöld pont végig ugyanott áll, meg sem rezdül. Előbb a kamera referenciakeretében olvassuk le — a lépcső komponensenként rajzolódik ki, a számok vele együtt íródnak be —, majd ugyanaz a referenciakeret átcsúszik a testébe, onnan a világéba, mindkétszer a geodetikus mentén. A lépcső követi, mert a pontot mindig az éppen aktuális tengelyek mentén bontjuk fel, és így a három szám menet közben, folyamatosan alakul át. A három számhármas mind más, a pont mégis ugyanaz. Ez a referenciakeret-váltás teljes tartalma.</p><p>A gyakorlatban <span class="m">T<sub>BC</sub></span> az extrinszik, merev és nem változik, <span class="m">T<sub>WB</sub></span> pedig a mozgó test póza. A kettő szorzata a kamera póza a világban, és ugyanez a mátrix számolja át a kamera koordinátáit a világéra.</p><p>A <button class="termbtn" id="se3InvInfo" type="button" aria-expanded="false" aria-controls="se3InvNote">megfordítás</button> pedig nem egyszerű transzponálás:</p><p class="matline"><span class="m">T<sup>−1</sup> =</span><span class="matrix"><span class="mbracket"></span><span class="mgrid" style="grid-template-columns:repeat(2,auto)"><span>R<sup>⊤</sup></span><span>−R<sup>⊤</sup>t</span><span>0<sup>⊤</sup></span><span>1</span></span><span class="mbracket right"></span></span></p><p>A forgatásnál elég a transzponálás, mert ortogonális mátrix. Az eltolást viszont vissza is kell forgatni, különben a régi referenciakeret tengelyei szerint tolnánk. SLAM-ben ez a mindennapi művelet, az odometria láncokat fűz, a relatív póz pedig <span class="m">T<sub>ab</sub> = T<sub>a</sub><sup>−1</sup>T<sub>b</sub></span>.</p><p>Egy dolgot viszont nem szabad elfelejteni: a szorzás sorrendje nem cserélhető fel. Erről szól a következő állomás.</p><div class="bubble" id="se3InvNote" role="dialog" aria-label="Az inverz levezetese" hidden><p>Két sor az egész. Induljunk a definícióból:</p><p class="matline"><span class="m">q = R p + t</span></p><p>Fejezzük ki <span class="m">p</span>-t. Vonjuk ki <span class="m">t</span>-t, majd szorozzunk balról <span class="m">R<sup>−1</sup> = R<sup>⊤</sup></span>-tal:</p><p class="matline"><span class="m">p = R<sup>⊤</sup>(q − t) = R<sup>⊤</sup>q − R<sup>⊤</sup>t</span></p><p>Ez pontosan egy póz alakja, forgatása <span class="m">R<sup>⊤</sup></span>, eltolása <span class="m">−R<sup>⊤</sup>t</span>. Szemléletesen: <span class="m">−R<sup>⊤</sup>t</span> nem más, mint a <em>régi origó helye az új referenciakeretben</em>.</p></div>'},

        {t:'A sorrend', b:'<p>A blokkalak maga is sorrendet kódol. A <span class="m">p ↦ Rp + t</span> képlet azt mondja, hogy <em>előbb forgatunk, aztán tolunk</em>. Ha fordítva csinálnánk, előbb tolnánk és utána forgatnánk, akkor <span class="m">R(p + t) = Rp + Rt</span> jönne ki, aminek az eltolása már <span class="m">Rt</span>, nem <span class="m">t</span>.</p><p>Ez nem szőrszálhasogatás, hanem magának a nem kommutativitásnak a lényege:</p><p class="matline"><span class="m">T(t) T(R) ≠ T(R) T(t)</span></p><p>A jelenetben mindkét test ugyanazt a két mozgást végzi el, csak más sorrendben. A teál előbb megfordul a helyén, aztán elindul. A lila előbb elindul, és csak utána fordul — csakhogy a forgatás a <em>világ</em> origója körül forgat, ezért a már eltolt testet körbelendíti. A két végpont láthatóan nem ugyanaz, és nemcsak máshol van, hanem merőleges irányban.</p><p>Miért a világ origója körül? Mert a bal oldali szorzás a világ referenciakeretében ható mozgást jelent. Ha a testhez rögzített tengely körül akarnánk forgatni, azt jobbról kell szorozni. <button class="termbtn" id="se3OrdInfo" type="button" aria-expanded="false" aria-controls="se3OrdNote">Számokkal</button> mindkettő két sor.</p><p>Ez a kettősség végigkíséri a SLAM-et. A becslés perturbációja lehet baloldali (világ szerinti, más néven globális) vagy jobboldali (test szerinti, más néven lokális), és a Jacobi-mátrixok alakja is emiatt tér el könyvről könyvre. Nem másról van szó, csak arról, melyik oldalról szorzunk.</p><div class="bubble" id="se3OrdNote" role="dialog" aria-label="A sorrend szamokkal" hidden><p>Legyen <span class="m">T(t)</span> tiszta eltolás <span class="m">t = (2, 0, 0)</span>-val, <span class="m">T(R)</span> pedig 90°-os forgatás a <span class="m">z</span> tengely körül:</p><p class="matline"><span class="m">R =</span><span class="matrix"><span class="mbracket"></span><span class="mgrid"><span>0</span><span>−1</span><span>0</span><span>1</span><span>0</span><span>0</span><span>0</span><span>0</span><span>1</span></span><span class="mbracket right"></span></span></p><p>A 4×4-es szorzás blokkokban egyetlen szabály — a jobb oldali tényező hat előbb:</p><p class="matline"><span class="m">[R<sub>2</sub>, t<sub>2</sub>] · [R<sub>1</sub>, t<sub>1</sub>] = [R<sub>2</sub>R<sub>1</sub>,&nbsp; R<sub>2</sub>t<sub>1</sub> + t<sub>2</sub>]</span></p><p>vagyis a jobb oldali eltolást mindig megforgatja a bal oldali forgatás. Behelyettesítve a két sorrendet:</p><p class="matline"><span class="m">T(t)T(R) = [R,&nbsp; t]</span></p><p class="matline"><span class="m">T(R)T(t) = [R,&nbsp; R t]</span></p><p>A forgatásrész mindkettőben ugyanaz. Az eltolás viszont nem:</p><p class="matline"><span class="m">t = (2, 0, 0)</span></p><p class="matline"><span class="m">R t = (0, 2, 0)</span></p><p>Ugyanaz a két mozgás, más sorrend, és a végpont nemcsak arrébb került, hanem merőleges irányba.</p></div>'},

        {t:'A csavarsebesség', b:'<p>Hogyan <em>mozog</em> egy merev test? Vegyük a sebességét minden pontjában. A merevség kényszere brutálisan leszűkíti a lehetőségeket, az egész mezőt két vektor megadja:</p><p class="matline"><span class="m">v(x) = ω × x + u</span></p><p>egy <span class="m">ω</span> szögsebesség (a korall nyíl) és egy <span class="m">u</span> haladó sebesség (teál). A képen minden apró nyíl ebből a két vektorból számolt, hat szám és semmi több. A gúlának azért van csúcsa, hogy lássuk, merre néz a test.</p><p>A <button class="termbtn" id="se3SkewInfo" type="button" aria-expanded="false" aria-controls="se3SkewNote">vektoriális szorzat</button> lineáris <span class="m">x</span>-ben, tehát mátrixként is írható, és ez a mátrix ferdén szimmetrikus. Ez a „kalap” művelet:</p><p class="matline"><span class="m">φ<sup>∧</sup> =</span><span class="matrix"><span class="mbracket"></span><span class="mgrid"><span>0</span><span>−φ<sub>3</sub></span><span>φ<sub>2</sub></span><span>φ<sub>3</sub></span><span>0</span><span>−φ<sub>1</sub></span><span>−φ<sub>2</sub></span><span>φ<sub>1</sub></span><span>0</span></span><span class="mbracket right"></span></span></p><p>A hat számot egyetlen vektorba fogjuk, és a bevett elnevezés ez: a haladó rész <span class="m">ρ := u</span>, a forgó rész <span class="m">φ := ω</span>.</p><p class="matline"><span class="m">ξ =</span><span class="matrix"><span class="mbracket"></span><span class="mgrid" style="grid-template-columns:auto"><span>ρ</span><span>φ</span></span><span class="mbracket right"></span></span><span class="m">∈ ℝ<sup>6</sup></span></p><p>A kalap 4×4-es alakja ugyanaz a doboz, amiben a póz is él:</p><p class="matline"><span class="m">ξ<sup>∧</sup> =</span><span class="matrix"><span class="mbracket"></span><span class="mgrid" style="grid-template-columns:repeat(2,auto)"><span>φ<sup>∧</sup></span><span>ρ</span><span>0<sup>⊤</sup></span><span>0</span></span><span class="mbracket right"></span></span></p><p>Ez az érintőtér az egységelemnél, a neve <span class="m">se(3)</span>. Itt már <em>szabad összeadni és skálázni</em>, pózokat nem lehet, sebességeket igen. Ezért él minden becslés, gradiens és kovariancia ebben a hatdimenziós lapos térben, nem a görbült sokaságon.</p><div class="bubble" id="se3SkewNote" role="dialog" aria-label="Ferde szimmetria es ortogonalitas" hidden><p>Deriváljuk a forgatások kényszerét egy <span class="m">R(t)</span> mozgás mentén:</p><p class="matline"><span class="m">R<sup>⊤</sup>R = I  ⟹  Ṙ<sup>⊤</sup>R + R<sup>⊤</sup>Ṙ = 0</span></p><p>Vagyis az <span class="m">Ω = R<sup>⊤</sup>Ṙ</span> mátrixra <span class="m">Ω<sup>⊤</sup> = −Ω</span>, ferdén szimmetrikus. Egy ilyen mátrixnak három szabad eleme van, épp a szögsebesség három komponense, és a hatása pontosan a vektoriális szorzat: <span class="m">Ω x = ω × x</span>.</p><p><strong>És mi köti össze a ferde szimmetriát az ortogonalitással?</strong> Az exponenciális, méghozzá két sorban. Ha <span class="m">Ω</span> ferdén szimmetrikus, akkor</p><p class="matline"><span class="m">(exp Ω)<sup>⊤</sup> = exp(Ω<sup>⊤</sup>) = exp(−Ω) = (exp Ω)<sup>−1</sup></span></p><p>ami pontosan az ortogonalitás feltétele. A determináns pedig</p><p class="matline"><span class="m">det(exp Ω) = e<sup>tr Ω</sup> = e<sup>0</sup> = 1</span></p><p>mert egy ferdén szimmetrikus mátrix átlója csupa nulla. Tehát nem tükrözést kapunk, hanem valódi forgatást.</p><p>Röviden: a ferdén szimmetrikus mátrixok a <em>végtelenül kicsi</em> forgatások, az ortogonálisak a <em>végesek</em>, és az <span class="m">exp</span> pontosan az egyikből a másikba visz. A <span class="m">log</span> visszafelé ugyanezt teszi.</p></div>'},

        {t:'exp — a csavarmozgás', b:'<p>Tartsuk a <span class="m">ξ</span> sebességet állandónak, és hagyjuk működni <em>egységnyi</em> ideig. Az eredmény az exponenciális leképezés:</p><p class="matline"><span class="m">T = exp(ξ<sup>∧</sup>)</span></p><p>Érdemes megállni annál, mi is történik itt. A <span class="m">ξ<sup>∧</sup></span> elsőre egy absztrakt 4×4-es mátrix, csupa nulla meg kereszttag, semmit nem mond — <button class="termbtn" id="se3HatInfo" type="button" aria-expanded="false" aria-controls="se3HatNote">kibontva</button> viszont ugyanaz a doboz, amit az előző hold már felírt, és valójában nagyon is kézzelfogható: <em>ez maga a mozgás</em>, egyenletes sebességgel leírva. Az <span class="m">exp</span> pedig nem csinál mást, mint lejátssza ezt a mozgást az elejétől a végéig. Az „absztrakt Lie-algebra-elem” tehát egy egyenletes mozgás, a hozzá tartozó csoportelem pedig az, ahova ezzel megérkezel.</p><p>A pálya, amit a referenciakeret bejár, mindig ugyanolyan alakú: forgás egy rögzített tengely körül, közben csúszás <em>ugyanazon</em> tengely mentén. Ez egy csavar, a bejárt pálya hélix, és ez <button class="termbtn" id="se3ChaInfo" type="button" aria-expanded="false" aria-controls="se3ChaNote">Chasles tétele</button>: minden merev mozgás csavar.</p><p>A tengely iránya <span class="m">â = φ/θ</span> (ahol <span class="m">θ = |φ|</span>), a menetemelkedés pedig a tengelyre eső eltolás, <span class="m">d = â · ρ</span>. Két elfajult eset van, és mindkettő ismerős:</p><p class="matline"><span class="m">θ = 0 → egyenes</span></p><p class="matline"><span class="m">d = 0 → tiszta forgás</span></p><p>Ez az <span class="m">SE(3)</span> geodetikusa, a „legegyenesebb” út két póz között, állandó sebességgel bejárva. Ugyanaz a szerep, mint a lapos térben a szakasznak, vagy a gömbön a főkör-ívnek.</p><p>A „legrövidebb” szóval viszont óvatosan. Hosszat mérni csak akkor tudunk, ha megmondjuk, hány méter ér fel egy radiánnal, és <span class="m">SE(3)</span>-on nincs olyan természetes mérték, ami minden referenciakeret-váltásra változatlan maradna. A csavar tehát az <em>egyenletes</em> mozgás, ez a természetes választás, de hogy egyben a legrövidebb-e, az a mértéken múlik. Tiszta forgatásokra, <span class="m">SO(3)</span>-on, ez a kérdés fel sem merül: ott van természetes mérték, és az ív valóban a legrövidebb út.</p><div class="bubble" id="se3ChaNote" role="dialog" aria-label="Chasles tetele" hidden><p>Miért kerül elő mindig egy tengely? Mert a forgatásrész <span class="m">R = exp(φ<sup>∧</sup>)</span> már kijelöl egyet, a saját forgástengelyét, <span class="m">â</span>-t. Az eltolást pedig két részre bonthatjuk: a tengellyel <em>párhuzamos</em> és arra <em>merőleges</em> részre.</p><p>A párhuzamos rész, <span class="m">d = â·t</span>, nem forgatható el sehova, ez marad a csúszás. A merőleges részt viszont a forgatás elintézi, ha a tengelyt eltoljuk a megfelelő <span class="m">c</span> pontba. Keressük azt a <span class="m">c</span>-t, amit a mozgás csak a tengely mentén visz el:</p><p class="matline"><span class="m">R c + t = c + d â</span></p><p>Ennek mindig van megoldása, ha <span class="m">θ ≠ 0</span>. A képen az így kapott sárga szaggatott vonal a csavartengely, a mozgás „gerince”.</p></div><div class="bubble" id="se3HatNote" role="dialog" aria-label="ξ-kalap kibontva" hidden><p>Emlékeztetőül, a blokkalak:</p><p class="matline"><span class="m">ξ<sup>∧</sup> =</span><span class="matrix"><span class="mbracket"></span><span class="mgrid" style="grid-template-columns:repeat(2,auto)"><span>φ<sup>∧</sup></span><span>ρ</span><span>0<sup>⊤</sup></span><span>0</span></span><span class="mbracket right"></span></span></p><p>ahol a bal felső <span class="m">3×3</span>-as blokk a forgó rész kalapja,</p><p class="matline"><span class="m">φ<sup>∧</sup> =</span><span class="matrix"><span class="mbracket"></span><span class="mgrid"><span>0</span><span>−φ<sub>3</sub></span><span>φ<sub>2</sub></span><span>φ<sub>3</sub></span><span>0</span><span>−φ<sub>1</sub></span><span>−φ<sub>2</sub></span><span>φ<sub>1</sub></span><span>0</span></span><span class="mbracket right"></span></span></p><p>a jobb felső oszlop a haladó rész, <span class="m">ρ</span>, az alsó sor pedig csupa nulla, <span class="m">[0 0 0]</span>. Ugyanaz a hat szám, ugyanaz a 4×4-es doboz, amiben a póz <span class="m">T</span> is él — csak itt még a <em>sebesség</em> áll benne, nem a végállapot, amivé az <span class="m">exp</span> viszi.</p></div>'},

        {t:'Ívhossz és húr', b:'<p>Itt van a hat szám csapdája. A <span class="m">ξ = (ρ, φ)</span> második fele ártatlan: <span class="m">φ</span> a forgásvektor, hossza a szög. Az első fele viszont <strong>nem</strong> a végpont eltolása.</p><p>Miért? Mert <span class="m">ρ</span> a <em>mozgó</em> referenciakeretben mért állandó sebesség, és miközben haladsz, a forgatás folyamatosan elfordítja az orrodat. A végpont ezeknek a folyamatosan elfordított sebességeknek az <button class="termbtn" id="se3IntInfo" type="button" aria-expanded="false" aria-controls="se3IntNote">összege</button>:</p><p class="matline"><span class="m">t = ( ∫<sub>0</sub><sup>1</sup> R(s) ds ) ρ = V(φ) ρ</span></p><p>A <span class="m">V</span> tehát nem más, mint a mozgás közben bejárt forgatások <em>átlaga</em>. Zárt alakja ugyanolyan cos/sin-mintát követ, mint a Rodrigues-formula:</p><p class="matline"><span class="m">V = I + <span class="frac"><span>1 − cos θ</span><span>θ<sup>2</sup></span></span> φ<sup>∧</sup> + <span class="frac"><span>θ − sin θ</span><span>θ<sup>3</sup></span></span> (φ<sup>∧</sup>)<sup>2</sup></span></p><p>A képen az apró lila nyilak ezek a fej-farok láncba fűzött <span class="m">R(s)ρ</span> sebességek, együtt épp a pályát rajzolják ki. A borostyán nyíl a <span class="m">t</span> húr. Mivel a sebesség hossza végig ugyanaz, a lényeg egy mondatban:</p><p class="matline"><span class="m">|ρ| = ívhossz</span></p><p class="matline"><span class="m">|t| = húr</span></p><p>Told fel a szöget. Nulla körül a kettő egybeesik (<span class="m">V → I</span>), nagy szögnél a húr összemegy, teljes körnél pedig nullára. Ezért a megtett utat, és a belőle számolt sebességet, a <span class="m">|ρ|</span> adja, nem a <span class="m">|t|</span>.</p><div class="slrow"><label>θ = <b id="se3jth">0°</b></label><input type="range" id="se3jsl" min="0" max="200" value="0" step="1"></div><div class="ro">|ρ| = <b id="se3jrho">—</b> &nbsp;·&nbsp; |t| = <b id="se3jt">—</b></div><div class="bubble" id="se3IntNote" role="dialog" aria-label="Az integral" hidden><p>A test origója <span class="m">ρ</span> sebességgel halad a <em>saját</em> referenciakeretében. A világban ezt a pillanatnyi forgatás fordítja el, tehát a világbeli sebesség <span class="m">R(s) ρ</span>, ahol <span class="m">R(s) = exp(s φ<sup>∧</sup>)</span>.</p><p>Az elmozdulás ezek összege egységnyi idő alatt:</p><p class="matline"><span class="m">t = ∫<sub>0</sub><sup>1</sup> R(s) ρ ds</span></p><p>Mivel <span class="m">ρ</span> állandó, kiemelhető, és marad a forgatások integrálja, ez a <span class="m">V(φ)</span>. Ha nincs forgás, <span class="m">R(s) = I</span> és <span class="m">V = I</span>, vagyis <span class="m">t = ρ</span>. Ez a lapos eset.</p></div>'},

        {t:'log — a mozgás visszaolvasása', b:'<p>A másik irány: adott egy póz, mi volt az a hat szám, ami odavitt? Két lépés. Előbb a forgatásból a tengely-szög vektor, <span class="m">φ = log(R)</span>, majd az eltolást „vissza kell tekerni” azzal a <span class="m">V</span>-vel, amit az előbb kaptunk:</p><p class="matline"><span class="m">ρ = V(φ)<sup>−1</sup> t</span></p><p>A <span class="m">V<sup>−1</sup></span> zárt alakja meglepően barátságos, véges sok tag, mert <span class="m">(φ<sup>∧</sup>)<sup>3</sup></span> visszavezethető az alacsonyabb hatványokra:</p><p class="matline"><span class="m">V<sup>−1</sup> = I − <span class="frac"><span>1</span><span>2</span></span> φ<sup>∧</sup> + <span class="frac"><span>1</span><span>θ<sup>2</sup></span></span>(1 − <span class="frac"><span>θ sin θ</span><span>2(1 − cos θ)</span></span>) (φ<sup>∧</sup>)<sup>2</sup></span></p><p>A harmadik <button class="termbtn" id="se3SerInfo" type="button" aria-expanded="false" aria-controls="se3SerNote">együttható</button> <span class="m">θ = 0</span>-nál <span class="m">0/0</span> alakú, de a határértéke véges: <span class="m">1/12</span>. Megszüntethető szingularitás, matematikailag semmi baj. Numerikusan viszont kis szögeknél a zárt alak fillérekből próbál milliót kiszámolni, ezért ott a sorfejtés a helyes út.</p><p>Így <span class="m">exp</span> és <span class="m">log</span> pontosan egymás inverzei, amíg <span class="m">|θ| &lt; π</span>. A határon túl a forgatás „körbeér”, a log mindig a rövidebb utat adja vissza. Ez ugyanaz a topológia, amit az <span class="m">SO(3)</span>-nál a golyó átellenes pontjai meséltek.</p><p>SLAM-ben ez a munkaló. Két kulcskép relatív póza <span class="m">T<sub>ab</sub> = T<sub>a</sub><sup>−1</sup>T<sub>b</sub></span>, ennek logja hat szám: mennyit fordult és mennyit haladt a test a két kép között. A faktorgráf reziduuma pedig szó szerint ez:</p><p class="matline"><span class="m">r = log(T<sub>mért</sub><sup>−1</sup> T<sub>becsült</sub>)<sup>∨</sup> ∈ ℝ<sup>6</sup></span></p><p>ettől lesz a póz-hibából közönséges vektor, amire ráereszthető a legkisebb négyzetek gépezete.</p><div class="bubble" id="se3SerNote" role="dialog" aria-label="A kis szogek esete" hidden><p>Fejtsük sorba a számlálót és a nevezőt <span class="m">θ = 0</span> körül:</p><p class="matline"><span class="m">1 − cos θ ≈ <span class="frac"><span>θ<sup>2</sup></span><span>2</span></span>,&nbsp;&nbsp; θ sin θ ≈ θ<sup>2</sup> − <span class="frac"><span>θ<sup>4</sup></span><span>6</span></span></span></p><p>Behelyettesítve az együttható a jól ismert <span class="m">1/12</span>-hez tart, a következő tag <span class="m">θ<sup>2</sup></span>-tel arányos.</p><p>A gyakorlati tanulság: a zárt alakban az <span class="m">1 − cos θ</span> kis <span class="m">θ</span>-nál két majdnem egyenlő szám különbsége, és a lebegőpontos ábrázolás pont ilyenkor veszíti el az értékes jegyeket. A határérték-konstans ilyenkor <em>pontosabb</em>, mint a „pontos” képlet.</p></div>'},

        {t:'Az adjungált — más néző, ugyanaz a mozgás', b:'<p>A hat szám mindig valamelyik referenciakerethez képest értendő. Ha átülünk egy másik referenciakeretbe, a mozgás fizikailag ugyanaz marad, a koordinátái viszont megváltoznak. A váltás lineáris, és a mátrixát <button class="termbtn" id="se3AdjInfo" type="button" aria-expanded="false" aria-controls="se3AdjNote">adjungáltnak</button> hívjuk:</p><p class="matline"><span class="m">ξ<sub>A</sub> = Ad<sub>T<sub>AB</sub></sub> ξ<sub>B</sub></span></p><p class="matline"><span class="m">Ad<sub>T</sub> =</span><span class="matrix"><span class="mbracket"></span><span class="mgrid" style="grid-template-columns:repeat(2,auto)"><span>R</span><span>t<sup>∧</sup>R</span><span>0</span><span>R</span></span><span class="mbracket right"></span></span></p><p>A forgásrész csak elfordul. Az eltolásrészbe viszont beszól a referenciakeretek közti <span class="m">t</span>, mert egy távolabbi pontból nézve ugyanaz a forgás már oldalirányú elmozdulásnak is látszik. Pontosan ezt érzed, ha egy körhinta szélén ülsz.</p><p>Van azonban egy <button class="termbtn" id="se3InvarInfo" type="button" aria-expanded="false" aria-controls="se3InvarNote">kivétel</button>, és ez teszi használhatóvá az egészet: egy csavar a <em>saját</em> mozgására nézve invariáns.</p><p class="matline"><span class="m">Ad<sub>exp(ξ)</sub> ξ = ξ</span></p><p>Szemléletesen: a csavartengely együtt utazik a testtel, tehát a mozgás a kiinduló és az érkező referenciakeretből nézve ugyanaz a hat szám. A képen a referenciakeretre ragasztott korall és teál nyílpár ezért néz ki egyformán mindkét végponton.</p><p>Ennek nagyon konkrét haszna van. Ha két kulcskép relatív pózából számolsz sebességet, a <span class="m">|ρ| / Δt</span> nem függ attól, melyik végpont referenciakeretében dolgoztál, ugyanaz a szám jön ki. Ugyanígy <span class="m">θ / Δt</span> a szögsebesség. Ezzel lehet IMU-val vagy kerékodometriával összevetni, kiugró mozgást szűrni.</p><div class="bubble" id="se3AdjNote" role="dialog" aria-label="Mire jo az adjungalt" hidden><p>Az adjungált a „mozgás-átszámoló”. A definíciója egy sor:</p><p class="matline"><span class="m">T exp(ξ<sup>∧</sup>) T<sup>−1</sup> = exp( (Ad<sub>T</sub> ξ)<sup>∧</sup> )</span></p><p>Magyarul: ha egy mozgást előbb átviszünk egy másik referenciakeretbe, ott elvégzünk, majd visszahozunk, az ugyanaz, mintha eleve az <em>átszámolt</em> sebességgel mozogtunk volna.</p><p>Ezért kerül elő mindenhol, ahol referenciakeretet váltunk: a bal- és jobboldali perturbáció közti átjárásnál, a Jacobi-mátrixok láncszabályánál, és a kovarianciák átszámolásánál, <span class="m">Σ<sub>A</sub> = Ad Σ<sub>B</sub> Ad<sup>⊤</sup></span>.</p></div><div class="bubble" id="se3InvarNote" role="dialog" aria-label="Miert invarians" hidden><p>Írjuk be a <span class="m">T = exp(ξ<sup>∧</sup>)</span> esetet a definícióba:</p><p class="matline"><span class="m">exp(ξ<sup>∧</sup>) exp(ξ<sup>∧</sup>) exp(ξ<sup>∧</sup>)<sup>−1</sup> = exp(ξ<sup>∧</sup>)</span></p><p>A bal oldal nyilvánvalóan <span class="m">exp(ξ<sup>∧</sup>)</span>, tehát <span class="m">Ad<sub>exp(ξ)</sub> ξ = ξ</span>. Egy elem mindig kommutál önmagával, ennyi az egész.</p><p>A következmény viszont nem triviális: a relatív póz logja ugyanazokat a koordinátákat adja a mozgás elején és a végén álló referenciakeretben is. Egy „lokális” hat szám, amit nem kell megjelölni, melyik végponthoz tartozik.</p></div>'},

        {t:'Póz tetszőleges időpillanatban', b:'<p>Gyakorlati kérdés, ami minden SLAM-rendszerben előjön: a pózok egy időrácson vannak (mondjuk 100 Hz-es odometria), a kérdés viszont máshol, egy kép, egy lidar-scan vagy egy címke időbélyegénél. Kell egy póz a két szomszéd <em>közé</em>.</p><p>A bevált recept a két részt külön kezeli. A forgatásra <strong>SLERP</strong>, a gömbi geodetikus, állandó szögsebességgel bejárva. (Elemenként átlagolni a mátrixokat nem szabad, az eredmény kiesne <span class="m">SO(3)</span>-ból.) Az eltolásra egyszerű <strong>lineáris interpoláció</strong>, komponensenként.</p><p>Érdemes látni, mennyire nem esik messze ez a csavartól. A SLERP <em>pontosan</em> a csavar forgásrésze, ugyanaz az állandó szögsebességű ív. A különbség csak az eltolásban van:</p><p class="matline"><span class="m">lerp → húr</span></p><p class="matline"><span class="m">csavar → ív</span></p><p>A képen a teál pálya a szétvágott recept, a kulcspózokat egyenes szakaszok kötik össze. A lila a valódi <span class="m">SE(3)</span>-geodetikus, <span class="m">T(u) = T<sub>a</sub> exp(u · log(T<sub>a</sub><sup>−1</sup>T<sub>b</sub>))</span>. A piros nyíl a kettő közti eltérés. Told a csúszkát: az eltérés a szakaszon belüli <em>elfordulással</em> nő, kis szögnél másodrendű, ezért sűrű és nagy frekvenciás pályánál elhanyagolható, egy fél fordulatot átugró szakasznál viszont már nem.</p><div class="slrow"><label>t = <b id="se3iq">0.00</b></label><input type="range" id="se3isl" min="0" max="1000" value="0" step="1"></div><div class="ro">eltérés: <b id="se3igap">—</b> &nbsp;·&nbsp; <button class="act" id="se3iauto" type="button" style="padding:2px 10px;font-size:16px">auto</button></div><p style="margin-top:12px">Két dolgot érdemes fejben tartani. A szétvágott recept a világ <em>referenciakeretének</em> megválasztására invariáns, balról szorozva ugyanazt kapod. A test <em>referenciakeretének</em> átdefiniálására viszont nem, a csavar-változat mindkettőre az. És mindkettő csak <em>interpoláció</em>: a szigorúan növekvő időrács és a tartományon belüli lekérdezés nem formalitás, pózokat extrapolálni rossz ötlet.</p>'}
      ],
      en: [
        {t:'The Pose', b:'<p>A <em>pose</em> answers where a reference frame sits and how it is oriented relative to another one. Two pieces describe it: a rotation <span class="m">R ∈ SO(3)</span> and a translation <span class="m">t ∈ ℝ<sup>3</sup></span>. Moving a point between the frames is just:</p><p class="matline"><span class="m">p<sub>W</sub> = R p<sub>B</sub> + t</span></p><p>The two are packed into a single <button class="termbtn" id="se3HomInfo" type="button" aria-expanded="false" aria-controls="se3HomNote">4×4</button> matrix:</p><p class="matline"><span class="m">T =</span><span class="matrix"><span class="mbracket"></span><span class="mgrid" style="grid-template-columns:repeat(2,auto)"><span>R</span><span>t</span><span>0<sup>⊤</sup></span><span>1</span></span><span class="mbracket right"></span></span><span class="m">∈ SE(3)</span></p><p>Six degrees of freedom — three angles, three offsets — but twelve stored numbers. The constraint <span class="m">R<sup>⊤</sup>R = I</span> absorbs the difference, and that is exactly what makes the space curved: you cannot average two poses entry by entry, because the result would fall out of <span class="m">SE(3)</span>.</p><p>In SLAM vocabulary every keyframe is a pose, the map points live in the world frame, and the camera–IMU <em>extrinsic</em> is a pose as well. SLAM is of course a good deal more than that — estimation, data association, loop closure, optimization — but this conversion is its geometric skeleton, and everything else is built on top of it.</p><div class="bubble" id="se3HomNote" role="dialog" aria-label="Why 4x4" hidden><p>The trick is the <em>homogeneous coordinate</em>: write a fourth number next to the three, and let that fourth number say what the triple means.</p><p><strong>1</strong> at the end: a <em>point</em>. A place in space, with a position measured from the origin.</p><p><strong>0</strong> at the end: a <em>direction vector</em>. Not a place but an arrow, of which only the direction and the length matter, not the basepoint. Think of the direction of a viewing ray, a surface normal, or a velocity vector. Note that this is not a rotation — rotations are the business of <span class="m">R</span> — it is an ordinary three-element vector.</p><p class="matline"><span class="m">T</span><span class="matrix"><span class="mbracket"></span><span class="mgrid" style="grid-template-columns:auto"><span>p</span><span>1</span></span><span class="mbracket right"></span></span><span class="m">=</span><span class="matrix"><span class="mbracket"></span><span class="mgrid" style="grid-template-columns:auto"><span>Rp + t</span><span>1</span></span><span class="mbracket right"></span></span></p><p class="matline"><span class="m">T</span><span class="matrix"><span class="mbracket"></span><span class="mgrid" style="grid-template-columns:auto"><span>v</span><span>0</span></span><span class="mbracket right"></span></span><span class="m">=</span><span class="matrix"><span class="mbracket"></span><span class="mgrid" style="grid-template-columns:auto"><span>Rv</span><span>0</span></span><span class="mbracket right"></span></span></p><p>So the translation drops out of a direction, and that is correct. Turn the camera and the direction of the viewing ray turns with it. Carry the camera two metres to the left and the arrow still points the same way. A point has a "where", a direction does not.</p><p>The appended <span class="m">[0 0 0 1]</span> row is not decoration either: it is what makes the product of two poses a pose again. Chaining becomes ordinary matrix multiplication, there is an identity and there are inverses, so poses form a <em>group</em>. That group is <span class="m">SE(3)</span>.</p></div>'},

        {t:'Pose or Transformation?', b:'<p>The same 4×4 matrix means two things at once, and it pays to be clear about which one is being said.</p><p><strong>Change of reference frame.</strong> The point does notmove, it is only described in the coordinates of another frame. That is the formula <span class="m">p<sub>W</sub> = R p<sub>B</sub> + t</span> — nothing is displaced, only the way of reading it changes.</p><p><strong>Pose.</strong> Where frame <span class="m">B</span> stands in <span class="m">W</span>. And here is the point: these two are <em>the same matrix</em>, not a coincidence. Look at what the change of frame says about the basis vectors of <span class="m">B</span>:</p><p class="matline"><span class="m">e<sub>1</sub> ↦ R e<sub>1</sub> + t</span></p><p class="matline"><span class="m">e<sub>2</sub> ↦ R e<sub>2</sub> + t</span></p><p class="matline"><span class="m">e<sub>3</sub> ↦ R e<sub>3</sub> + t</span></p><p>The <button class="termbtn" id="se3ColInfo" type="button" aria-expanded="false" aria-controls="se3ColNote">columns</button> of <span class="m">R</span> are therefore exactly the axes of <span class="m">B</span> expressed in <span class="m">W</span>, and <span class="m">t</span> is the origin of <span class="m">B</span> in <span class="m">W</span>. The four columns of the matrix literally draw the frame, and that is what the scene builds: the basis vectors rotate into place one at a time, each writing its own column in its own color, and only once all three stand does the finished frame slide out along <span class="m">t</span> — the fourth column.</p><p><strong>Motion.</strong> There is a third reading: take a body and displace it. Then <span class="m">T</span> is not the <em>position</em> of a frame but a <em>displacement</em>. The arithmetic is identical, the meaning is not, which is why it deserves its own name — relative pose, displacement, <span class="m">ΔT</span>.</p><p>The notation carries this through. <span class="m">T<sub>WB</sub></span> can be read as "the pose of <span class="m">B</span> in <span class="m">W</span>" and equally as "converts <span class="m">B</span>-coordinates into <span class="m">W</span>-coordinates". Those two sentences say the same thing. Write <span class="m">ΔT</span> instead and you are talking about a motion, where you always have to say relative to which frame — that is what the adjoint will be about.</p><div class="bubble" id="se3ColNote" role="dialog" aria-label="Why the columns" hidden><p>The <span class="m">i</span>-th column of a matrix is by definition what you get on the <span class="m">i</span>-th basis vector:</p><p class="matline"><span class="m">R e<sub>1</sub> = the first column of R</span></p><p>That is so because <span class="m">e<sub>1</sub> = (1, 0, 0)</span> and matrix multiplication is a weighted sum of the columns. Here the weights are <span class="m">1, 0, 0</span>, so exactly the first column survives.</p><p>Geometrically: step one unit along the <span class="m">x</span> axis of frame <span class="m">B</span> and in the world you have stepped by the first column of <span class="m">R</span>. The three axes of the frame together with its origin are precisely the four columns of <span class="m">T</span> — which is why we say the pose is "inside" the matrix.</p></div>'},

        {t:'Chaining Reference Frames', b:'<p>Write down which reference frame the conversion goes from and to, and chaining reads itself, because the inner indices cancel:</p><p class="matline"><span class="m">T<sub>WC</sub> = T<sub>WB</sub> · T<sub>BC</sub></span></p><p>Read right to left: first switch from the camera frame to the body frame, then from the body to the world.</p><p>In the scene the green point stays exactly where it is and never twitches. We read it in the camera frame first — the staircase draws itself out component by component, and the numbers fill in with it — and then that same frame glides into the body frame, and on from there into the world, along the geodesic each time. The staircase follows, because the point is always split along whichever axes are current, so the three numbers change over continuously while the frame travels. The three triples of numbers are all different, yet the point is the same. That is the whole content of a change of frame.</p><p>In practice <span class="m">T<sub>BC</sub></span> is the extrinsic, rigid and unchanging, while <span class="m">T<sub>WB</sub></span> is the pose of the moving body. Their product is the camera pose in the world, and that same matrix converts camera coordinates into world coordinates.</p><p>The <button class="termbtn" id="se3InvInfo" type="button" aria-expanded="false" aria-controls="se3InvNote">inverse</button> is not a plain transpose:</p><p class="matline"><span class="m">T<sup>−1</sup> =</span><span class="matrix"><span class="mbracket"></span><span class="mgrid" style="grid-template-columns:repeat(2,auto)"><span>R<sup>⊤</sup></span><span>−R<sup>⊤</sup>t</span><span>0<sup>⊤</sup></span><span>1</span></span><span class="mbracket right"></span></span></p><p>Transposing suffices for the rotation, since it is an orthogonal matrix. The translation, however, has to be rotated back as well, otherwise it would be applied along the axes of the old frame. In SLAM this is the everyday operation, odometry builds chains, and a relative pose is <span class="m">T<sub>ab</sub> = T<sub>a</sub><sup>−1</sup>T<sub>b</sub></span>.</p><p>One thing must not be forgotten: the order of the multiplication cannot be swapped. That is what the next station is about.</p><div class="bubble" id="se3InvNote" role="dialog" aria-label="Deriving the inverse" hidden><p>Two lines. Start from the definition:</p><p class="matline"><span class="m">q = R p + t</span></p><p>Solve for <span class="m">p</span>: subtract <span class="m">t</span>, then multiply from the left by <span class="m">R<sup>−1</sup> = R<sup>⊤</sup></span>:</p><p class="matline"><span class="m">p = R<sup>⊤</sup>(q − t) = R<sup>⊤</sup>q − R<sup>⊤</sup>t</span></p><p>That is exactly the shape of a pose, with rotation <span class="m">R<sup>⊤</sup></span> and translation <span class="m">−R<sup>⊤</sup>t</span>. Read geometrically, <span class="m">−R<sup>⊤</sup>t</span> is simply <em>where the old origin sits in the new frame</em>.</p></div>'},

        {t:'Order', b:'<p>The block form encodes an order all by itself. The formula <span class="m">p ↦ Rp + t</span> says <em>rotate first, then translate</em>. Do it the other way round, translate first and rotate afterwards, and you get <span class="m">R(p + t) = Rp + Rt</span>, whose translation is <span class="m">Rt</span> rather than <span class="m">t</span>.</p><p>This is not hair-splitting, it is the essence of non-commutativity:</p><p class="matline"><span class="m">T(t) T(R) ≠ T(R) T(t)</span></p><p>In the scene both bodies perform the same two moves, only in opposite order. The teal one turns in place first, then sets off. The violet one sets off first and turns afterwards — except that the rotation turns about the <em>world</em> origin, so it swings the already-translated body around. The two endpoints are visibly different, and not merely shifted: they lie in perpendicular directions.</p><p>Why about the world origin? Because multiplying from the left means a motion acting in the world frame. To turn about an axis fixed to the body, you multiply from the right instead. <button class="termbtn" id="se3OrdInfo" type="button" aria-expanded="false" aria-controls="se3OrdNote">In numbers</button> both are two lines.</p><p>This duality follows SLAM everywhere. A perturbation of an estimate can be left-handed (world, also called global) or right-handed (body, also called local), and the shape of the Jacobians differs from book to book for that reason alone. Nothing else is going on, only the side you multiply from.</p><div class="bubble" id="se3OrdNote" role="dialog" aria-label="Order in numbers" hidden><p>Let <span class="m">T(t)</span> be a pure translation by <span class="m">t = (2, 0, 0)</span> and <span class="m">T(R)</span> a 90° rotation about the <span class="m">z</span> axis:</p><p class="matline"><span class="m">R =</span><span class="matrix"><span class="mbracket"></span><span class="mgrid"><span>0</span><span>−1</span><span>0</span><span>1</span><span>0</span><span>0</span><span>0</span><span>0</span><span>1</span></span><span class="mbracket right"></span></span></p><p>The 4×4 product is one rule in block form — the right-hand factor acts first:</p><p class="matline"><span class="m">[R<sub>2</sub>, t<sub>2</sub>] · [R<sub>1</sub>, t<sub>1</sub>] = [R<sub>2</sub>R<sub>1</sub>,&nbsp; R<sub>2</sub>t<sub>1</sub> + t<sub>2</sub>]</span></p><p>that is, the right-hand translation always gets turned by the left-hand rotation. Substituting the two orders:</p><p class="matline"><span class="m">T(t)T(R) = [R,&nbsp; t]</span></p><p class="matline"><span class="m">T(R)T(t) = [R,&nbsp; R t]</span></p><p>The rotation part is the same in both. The translation is not:</p><p class="matline"><span class="m">t = (2, 0, 0)</span></p><p class="matline"><span class="m">R t = (0, 2, 0)</span></p><p>Same two motions, different order, and the endpoint has not merely moved but moved perpendicular.</p></div>'},

        {t:'The Twist', b:'<p>How does a rigid body <em>move</em>? Look at the velocity of each of its points. Rigidity narrows the options brutally, two vectors already pin down the entire field:</p><p class="matline"><span class="m">v(x) = ω × x + u</span></p><p>an angular velocity <span class="m">ω</span> (the coral arrow) and a linear velocity <span class="m">u</span> (teal). Every small arrow in the scene is computed from just those two, six numbers and nothing more. The pyramid has a nose so that the turning stays legible.</p><p>The <button class="termbtn" id="se3SkewInfo" type="button" aria-expanded="false" aria-controls="se3SkewNote">cross product</button> is linear in <span class="m">x</span>, so it can be written as a matrix, and that matrix is skew-symmetric. This is the hat operator:</p><p class="matline"><span class="m">φ<sup>∧</sup> =</span><span class="matrix"><span class="mbracket"></span><span class="mgrid"><span>0</span><span>−φ<sub>3</sub></span><span>φ<sub>2</sub></span><span>φ<sub>3</sub></span><span>0</span><span>−φ<sub>1</sub></span><span>−φ<sub>2</sub></span><span>φ<sub>1</sub></span><span>0</span></span><span class="mbracket right"></span></span></p><p>The six numbers go into one vector, and the established naming is this: the linear part is <span class="m">ρ := u</span>, the angular part is <span class="m">φ := ω</span>.</p><p class="matline"><span class="m">ξ =</span><span class="matrix"><span class="mbracket"></span><span class="mgrid" style="grid-template-columns:auto"><span>ρ</span><span>φ</span></span><span class="mbracket right"></span></span><span class="m">∈ ℝ<sup>6</sup></span></p><p>The hatted 4×4 form is the same box the pose lives in:</p><p class="matline"><span class="m">ξ<sup>∧</sup> =</span><span class="matrix"><span class="mbracket"></span><span class="mgrid" style="grid-template-columns:repeat(2,auto)"><span>φ<sup>∧</sup></span><span>ρ</span><span>0<sup>⊤</sup></span><span>0</span></span><span class="mbracket right"></span></span></p><p>This is the tangent space at the identity, and its name is <span class="m">se(3)</span>. Here you <em>may</em> add and scale — poses cannot be added, velocities can. That is why every estimate, gradient and covariance lives in this flat six-dimensional space rather than on the curved manifold.</p><div class="bubble" id="se3SkewNote" role="dialog" aria-label="Skew symmetry and orthogonality" hidden><p>Differentiate the rotation constraint along a motion <span class="m">R(t)</span>:</p><p class="matline"><span class="m">R<sup>⊤</sup>R = I  ⟹  Ṙ<sup>⊤</sup>R + R<sup>⊤</sup>Ṙ = 0</span></p><p>So the matrix <span class="m">Ω = R<sup>⊤</sup>Ṙ</span> satisfies <span class="m">Ω<sup>⊤</sup> = −Ω</span>, it is skew-symmetric. Such a matrix has three free entries, precisely the three components of angular velocity, and its action is exactly the cross product: <span class="m">Ω x = ω × x</span>.</p><p><strong>And what connects skew symmetry to orthogonality?</strong> The exponential, in two lines. If <span class="m">Ω</span> is skew-symmetric then</p><p class="matline"><span class="m">(exp Ω)<sup>⊤</sup> = exp(Ω<sup>⊤</sup>) = exp(−Ω) = (exp Ω)<sup>−1</sup></span></p><p>which is precisely the condition of orthogonality. As for the determinant,</p><p class="matline"><span class="m">det(exp Ω) = e<sup>tr Ω</sup> = e<sup>0</sup> = 1</span></p><p>because the diagonal of a skew-symmetric matrix is all zeros. So what comes out is a proper rotation, not a reflection.</p><p>Short version: skew-symmetric matrices are the <em>infinitesimal</em> rotations, orthogonal ones the <em>finite</em> rotations, and <span class="m">exp</span> carries one into the other. <span class="m">log</span> does the same going back.</p></div>'},

        {t:'exp — the Screw Motion', b:'<p>Hold the velocity <span class="m">ξ</span> constant and let it act for <em>unit</em> time. The result is the exponential map:</p><p class="matline"><span class="m">T = exp(ξ<sup>∧</sup>)</span></p><p>It is worth pausing on what happens here. At first sight <span class="m">ξ<sup>∧</sup></span> is an abstract 4×4 matrix, all zeros and cross terms, saying nothing — <button class="termbtn" id="se3HatInfo" type="button" aria-expanded="false" aria-controls="se3HatNote">unpacked</button>, though, it is the same box the previous moon already wrote out, and in truth it is entirely concrete: <em>it is the motion itself</em>, described as a constant velocity. And <span class="m">exp</span> does nothing but play that motion back from beginning to end. The "abstract Lie algebra element" is a uniform motion, and the group element belonging to it is where that motion lands you.</p><p>The path the reference frame sweeps always has the same shape: arotation about a fixed axis while sliding along <em>that same</em> axis. It is a screw, the path is a helix, and this is <button class="termbtn" id="se3ChaInfo" type="button" aria-expanded="false" aria-controls="se3ChaNote">Chasles theorem</button>: every rigid motion is a screw.</p><p>The axis direction is <span class="m">â = φ/θ</span> (with <span class="m">θ = |φ|</span>), and the pitch is the part of the translation along it, <span class="m">d = â · ρ</span>. There are two degenerate cases, both familiar:</p><p class="matline"><span class="m">θ = 0 → straight line</span></p><p class="matline"><span class="m">d = 0 → pure rotation</span></p><p>This is the geodesic of <span class="m">SE(3)</span>, the straightest path between two poses, travelled at constant speed. The same role a segment plays in flat space, or a great-circle arc on the sphere.</p><p>The word "shortest", though, needs care. Measuring length requires saying how many metres one radian is worth, and on <span class="m">SE(3)</span> there is no natural measure that stays the same under every change of frame. So the screw is the <em>uniform</em> motion, the natural choice, but whether it is also the shortest depends on the measure. For pure rotations, on <span class="m">SO(3)</span>, the question does not arise: there a natural measure exists, and the arc really is the shortest path.</p><div class="bubble" id="se3ChaNote" role="dialog" aria-label="Chasles theorem" hidden><p>Why does an axis always appear? Because the rotation part <span class="m">R = exp(φ<sup>∧</sup>)</span> already picks one, its own axis of rotation <span class="m">â</span>. And the translation splits into a part <em>parallel</em> to that axis and a part <em>perpendicular</em> to it.</p><p>The parallel part, <span class="m">d = â·t</span>, cannot be rotated away, so it remains as the slide. The perpendicular part is handled by the rotation once the axis is shifted to the right point <span class="m">c</span>. We look for the <span class="m">c</span> that the motion only carries along the axis:</p><p class="matline"><span class="m">R c + t = c + d â</span></p><p>This always has a solution when <span class="m">θ ≠ 0</span>. The dashed amber line in the scene is that screw axis, the spine of the motion.</p></div><div class="bubble" id="se3HatNote" role="dialog" aria-label="ξ-hat unpacked" hidden><p>As a reminder, the block form:</p><p class="matline"><span class="m">ξ<sup>∧</sup> =</span><span class="matrix"><span class="mbracket"></span><span class="mgrid" style="grid-template-columns:repeat(2,auto)"><span>φ<sup>∧</sup></span><span>ρ</span><span>0<sup>⊤</sup></span><span>0</span></span><span class="mbracket right"></span></span></p><p>where the top-left <span class="m">3×3</span> block is the hat of the rotational part,</p><p class="matline"><span class="m">φ<sup>∧</sup> =</span><span class="matrix"><span class="mbracket"></span><span class="mgrid"><span>0</span><span>−φ<sub>3</sub></span><span>φ<sub>2</sub></span><span>φ<sub>3</sub></span><span>0</span><span>−φ<sub>1</sub></span><span>−φ<sub>2</sub></span><span>φ<sub>1</sub></span><span>0</span></span><span class="mbracket right"></span></span></p><p>the top-right column is the translational part, <span class="m">ρ</span>, and the bottom row is all zeros, <span class="m">[0 0 0]</span>. Same six numbers, same 4×4 box the pose <span class="m">T</span> lives in — only here it holds a <em>velocity</em>, not the endpoint <span class="m">exp</span> carries it to.</p></div>'},

        {t:'Arc and Chord', b:'<p>Here is the trap hidden in the six numbers. The second half of <span class="m">ξ = (ρ, φ)</span> is innocent: <span class="m">φ</span> is the rotation vector, its length the angle. The first half, however, is <strong>not</strong> the translation of the endpoint.</p><p>Why not? Because <span class="m">ρ</span> is a constant velocity measured in the <em>moving</em> reference frame, and while you travel, the ongoing rotation keeps re-aiming your nose. The endpoint is the <button class="termbtn" id="se3IntInfo" type="button" aria-expanded="false" aria-controls="se3IntNote">sum</button> of those continuously re-aimed velocities:</p><p class="matline"><span class="m">t = ( ∫<sub>0</sub><sup>1</sup> R(s) ds ) ρ = V(φ) ρ</span></p><p>So <span class="m">V</span> is nothing but the <em>average</em> of the rotations passed through on the way. Its closed form follows the same cos/sin pattern as the Rodrigues formula:</p><p class="matline"><span class="m">V = I + <span class="frac"><span>1 − cos θ</span><span>θ<sup>2</sup></span></span> φ<sup>∧</sup> + <span class="frac"><span>θ − sin θ</span><span>θ<sup>3</sup></span></span> (φ<sup>∧</sup>)<sup>2</sup></span></p><p>In the scene the small violet arrows are those <span class="m">R(s)ρ</span> velocities laid head to tail, and together they draw the path itself. The amber arrow is the chord <span class="m">t</span>. Since the velocity keeps its length throughout, the point fits in one line:</p><p class="matline"><span class="m">|ρ| = arc length</span></p><p class="matline"><span class="m">|t| = chord</span></p><p>Push the angle up. Near zero the two coincide (<span class="m">V → I</span>), at large angles the chord shrinks, and at a full turn it collapses to nothing. So the distance travelled, and any speed derived from it, comes from <span class="m">|ρ|</span> and not from <span class="m">|t|</span>.</p><div class="slrow"><label>θ = <b id="se3jth">0°</b></label><input type="range" id="se3jsl" min="0" max="200" value="0" step="1"></div><div class="ro">|ρ| = <b id="se3jrho">—</b> &nbsp;·&nbsp; |t| = <b id="se3jt">—</b></div><div class="bubble" id="se3IntNote" role="dialog" aria-label="The integral" hidden><p>The body origin moves with velocity <span class="m">ρ</span> in its <em>own</em> frame. In the world that velocity is turned by the current rotation, so the world velocity is <span class="m">R(s) ρ</span>, with <span class="m">R(s) = exp(s φ<sup>∧</sup>)</span>.</p><p>The displacement is their sum over unit time:</p><p class="matline"><span class="m">t = ∫<sub>0</sub><sup>1</sup> R(s) ρ ds</span></p><p>Since <span class="m">ρ</span> is constant it factors out, leaving the integral of the rotations, which is <span class="m">V(φ)</span>. With no rotation, <span class="m">R(s) = I</span> and <span class="m">V = I</span>, hence <span class="m">t = ρ</span>. That is the flat case.</p></div>'},

        {t:'log — Reading the Motion Back', b:'<p>The other direction: given a pose, which six numbers took us there? Two steps. First the axis-angle vector from the rotation, <span class="m">φ = log(R)</span>, then the translation has to be unwound with the very same <span class="m">V</span>:</p><p class="matline"><span class="m">ρ = V(φ)<sup>−1</sup> t</span></p><p>The closed form of <span class="m">V<sup>−1</sup></span> is surprisingly friendly, finitely many terms, because <span class="m">(φ<sup>∧</sup>)<sup>3</sup></span> reduces to lower powers:</p><p class="matline"><span class="m">V<sup>−1</sup> = I − <span class="frac"><span>1</span><span>2</span></span> φ<sup>∧</sup> + <span class="frac"><span>1</span><span>θ<sup>2</sup></span></span>(1 − <span class="frac"><span>θ sin θ</span><span>2(1 − cos θ)</span></span>) (φ<sup>∧</sup>)<sup>2</sup></span></p><p>At <span class="m">θ = 0</span> the third <button class="termbtn" id="se3SerInfo" type="button" aria-expanded="false" aria-controls="se3SerNote">coefficient</button> takes the form <span class="m">0/0</span>, but its limit is finite: <span class="m">1/12</span>. A removable singularity, mathematically harmless. Numerically it is not: at small angles the closed form tries to build a large number out of crumbs, and there the series is the right road.</p><p>With that, <span class="m">exp</span> and <span class="m">log</span> are exact inverses as long as <span class="m">|θ| &lt; π</span>. Past that boundary rotation wraps around and log always hands back the shorter way. It is the same topology the antipodal points of the <span class="m">SO(3)</span> ball were telling us about.</p><p>In SLAM this is the workhorse. The relative pose of two keyframes is <span class="m">T<sub>ab</sub> = T<sub>a</sub><sup>−1</sup>T<sub>b</sub></span>, and its log is six numbers: how much the body turned and how far it travelled between the two frames. The residual of a factor graph is literally this:</p><p class="matline"><span class="m">r = log(T<sub>meas</sub><sup>−1</sup> T<sub>est</sub>)<sup>∨</sup> ∈ ℝ<sup>6</sup></span></p><p>and that is what turns a pose error into an ordinary vector the least-squares machinery can chew on.</p><div class="bubble" id="se3SerNote" role="dialog" aria-label="The small-angle case" hidden><p>Expand numerator and denominator around <span class="m">θ = 0</span>:</p><p class="matline"><span class="m">1 − cos θ ≈ <span class="frac"><span>θ<sup>2</sup></span><span>2</span></span>,&nbsp;&nbsp; θ sin θ ≈ θ<sup>2</sup> − <span class="frac"><span>θ<sup>4</sup></span><span>6</span></span></span></p><p>Substituting, the coefficient tends to the familiar <span class="m">1/12</span>, with the next term proportional to <span class="m">θ<sup>2</sup></span>.</p><p>The practical lesson: in the closed form <span class="m">1 − cos θ</span> is the difference of two nearly equal numbers at small <span class="m">θ</span>, and that is exactly when floating point loses its significant digits. There the limiting constant is <em>more</em> accurate than the exact formula.</p></div>'},

        {t:'The Adjoint — Another Observer', b:'<p>The six numbers are always relative to some reference frame. Move to a different frame and the motion stays physically the same, but its coordinates change. The change is linear, and its matrix is called the <button class="termbtn" id="se3AdjInfo" type="button" aria-expanded="false" aria-controls="se3AdjNote">adjoint</button>:</p><p class="matline"><span class="m">ξ<sub>A</sub> = Ad<sub>T<sub>AB</sub></sub> ξ<sub>B</sub></span></p><p class="matline"><span class="m">Ad<sub>T</sub> =</span><span class="matrix"><span class="mbracket"></span><span class="mgrid" style="grid-template-columns:repeat(2,auto)"><span>R</span><span>t<sup>∧</sup>R</span><span>0</span><span>R</span></span><span class="mbracket right"></span></span></p><p>The rotation part merely turns. The translation part picks up the offset <span class="m">t</span> between the frames, because seen from a point further out the same rotation also looks like sideways motion. Exactly what you feel sitting at the rim of a carousel.</p><p>There is one <button class="termbtn" id="se3InvarInfo" type="button" aria-expanded="false" aria-controls="se3InvarNote">exception</button>, and it is what makes all of this usable: a screw is invariant under <em>its own</em> motion.</p><p class="matline"><span class="m">Ad<sub>exp(ξ)</sub> ξ = ξ</span></p><p>Geometrically: the screw axis travels along with the body, so the motion has the same six coordinates seen from the frame at either end. That is why the coral and teal arrow pair glued to the frame looks identical at both endpoints in the scene.</p><p>This has a very concrete payoff. If you derive a speed from the relative pose of two keyframes, <span class="m">|ρ| / Δt</span> does not depend on which endpoint frame you worked in, the same number comes out either way. Likewise <span class="m">θ / Δt</span> is the angular rate. That is what makes these comparable against IMU or wheel odometry, and usable for rejecting outlier motions.</p><div class="bubble" id="se3AdjNote" role="dialog" aria-label="What the adjoint is for" hidden><p>The adjoint is the motion converter. Its definition is one line:</p><p class="matline"><span class="m">T exp(ξ<sup>∧</sup>) T<sup>−1</sup> = exp( (Ad<sub>T</sub> ξ)<sup>∧</sup> )</span></p><p>In words: carrying a motion into another frame, performing it there, and coming back is the same as moving with the <em>converted</em> velocity in the first place.</p><p>That is why it shows up wherever frames change: switching between left and right perturbations, chaining Jacobians, and converting covariances, <span class="m">Σ<sub>A</sub> = Ad Σ<sub>B</sub> Ad<sup>⊤</sup></span>.</p></div><div class="bubble" id="se3InvarNote" role="dialog" aria-label="Why invariant" hidden><p>Put <span class="m">T = exp(ξ<sup>∧</sup>)</span> into the definition:</p><p class="matline"><span class="m">exp(ξ<sup>∧</sup>) exp(ξ<sup>∧</sup>) exp(ξ<sup>∧</sup>)<sup>−1</sup> = exp(ξ<sup>∧</sup>)</span></p><p>The left side is obviously <span class="m">exp(ξ<sup>∧</sup>)</span>, hence <span class="m">Ad<sub>exp(ξ)</sub> ξ = ξ</span>. An element always commutes with itself, that is the whole argument.</p><p>The consequence is not trivial though: the log of a relative pose gives the same coordinates in the frame at the start of the motion and in the frame at its end. A local six-vector that needs no label saying which endpoint it belongs to.</p></div>'},

        {t:'A Pose at Any Instant', b:'<p>A practical question every SLAM system runs into: poses arrive on one time grid (say 100 Hz odometry), while the query sits somewhere else, at the timestamp of an image, a lidar scan, or a label. You need a pose <em>between</em> two neighbours.</p><p>The established recipe treats the two parts separately. For rotation, <strong>SLERP</strong>, the spherical geodesic travelled at constant angular speed. (Averaging the matrices entry by entry is not allowed, the result would leave <span class="m">SO(3)</span>.) For translation, plain component-wise <strong>linear interpolation</strong>.</p><p>It is worth seeing how close this stays to the screw. SLERP <em>is</em> exactly the rotation part of the screw, the same constant-angular-velocity arc. The difference lives only in the translation:</p><p class="matline"><span class="m">lerp → chord</span></p><p class="matline"><span class="m">screw → arc</span></p><p>In the scene the teal path is the split recipe, straight segments joining the keyframes. The violet one is the true <span class="m">SE(3)</span> geodesic, <span class="m">T(u) = T<sub>a</sub> exp(u · log(T<sub>a</sub><sup>−1</sup>T<sub>b</sub>))</span>. The red arrow is the gap between them. Drag the slider: the gap grows with the <em>rotation</em> inside the segment and is second order for small angles, so it is negligible for a dense, high-rate trajectory, but not for a segment that jumps half a turn.</p><div class="slrow"><label>t = <b id="se3iq">0.00</b></label><input type="range" id="se3isl" min="0" max="1000" value="0" step="1"></div><div class="ro">gap: <b id="se3igap">—</b> &nbsp;·&nbsp; <button class="act" id="se3iauto" type="button" style="padding:2px 10px;font-size:16px">auto</button></div><p style="margin-top:12px">Two things are worth keeping in mind. The split recipe is invariant to the choice of <em>world</em> frame, multiply from the left and you get the same curve. It is not invariant to a redefinition of the <em>body</em> frame, whereas the screw version is invariant to both. And both are only <em>interpolation</em>: a strictly increasing time grid and a query inside the covered range are not formalities, because extrapolating poses is a bad idea.</p>'}
      ],
      ja: [
        {t:'位置姿勢', b:'<p><em>位置姿勢（ポーズ）</em>は、ある座標系が別の座標系に対してどこに立ち、どちらを向いているかに答えます。記述するのは二つの量、回転 <span class="m">R ∈ SO(3)</span> と並進 <span class="m">t ∈ ℝ<sup>3</sup></span> です。点を座標系のあいだで移すのは、これだけです。</p><p class="matline"><span class="m">p<sub>W</sub> = R p<sub>B</sub> + t</span></p><p>この二つは、一つの <button class="termbtn" id="se3HomInfo" type="button" aria-expanded="false" aria-controls="se3HomNote">4×4</button> 行列に詰め込まれます。</p><p class="matline"><span class="m">T =</span><span class="matrix"><span class="mbracket"></span><span class="mgrid" style="grid-template-columns:repeat(2,auto)"><span>R</span><span>t</span><span>0<sup>⊤</sup></span><span>1</span></span><span class="mbracket right"></span></span><span class="m">∈ SE(3)</span></p><p>自由度は 6、つまり三つの角度と三つのずれです。ところが蓄えている数は 12 個あります。その差を吸収するのが拘束 <span class="m">R<sup>⊤</sup>R = I</span> で、まさにそれがこの空間を曲げています。ですから、二つの位置姿勢を成分ごとに平均してはいけません。結果が <span class="m">SE(3)</span> から外れてしまうからです。</p><p>SLAM の言葉でいえば、キーフレームはどれも位置姿勢であり、地図点は世界座標系に住み、カメラと IMU の<em>外部パラメータ</em>もまた位置姿勢です。もちろん SLAM はそれ以上のもの、つまり推定、データ対応付け、ループ閉じ込み、最適化を含みます。しかしこの変換こそがその幾何的な骨格で、他はすべてその上に建っています。</p><div class="bubble" id="se3HomNote" role="dialog" aria-label="なぜ 4x4 なのか" hidden><p>仕掛けは<em>同次座標</em>です。三つの数の隣に四つ目の数を書き、その四つ目に「この三つ組が何を意味するか」を言わせます。</p><p>末尾が <strong>1</strong> なら<em>点</em>です。原点から測った位置を持つ、空間の場所を表します。</p><p>末尾が <strong>0</strong> なら<em>方向ベクトル</em>です。場所ではなく矢印で、意味を持つのは向きと長さだけ、基点は関係ありません。視線の向き、面の法線、速度ベクトルを思い浮かべてください。これは回転ではありません。回転は <span class="m">R</span> の仕事です。ふつうの 3 成分ベクトルです。</p><p class="matline"><span class="m">T</span><span class="matrix"><span class="mbracket"></span><span class="mgrid" style="grid-template-columns:auto"><span>p</span><span>1</span></span><span class="mbracket right"></span></span><span class="m">=</span><span class="matrix"><span class="mbracket"></span><span class="mgrid" style="grid-template-columns:auto"><span>Rp + t</span><span>1</span></span><span class="mbracket right"></span></span></p><p class="matline"><span class="m">T</span><span class="matrix"><span class="mbracket"></span><span class="mgrid" style="grid-template-columns:auto"><span>v</span><span>0</span></span><span class="mbracket right"></span></span><span class="m">=</span><span class="matrix"><span class="mbracket"></span><span class="mgrid" style="grid-template-columns:auto"><span>Rv</span><span>0</span></span><span class="mbracket right"></span></span></p><p>つまり方向からは並進が落ちます。そしてそれで正しいのです。カメラを回せば視線の向きも一緒に回りますが、カメラを 2 メートル左へ運んでも矢印は同じ向きのままです。点には「どこ」があり、方向にはありません。</p><p>付け足された <span class="m">[0 0 0 1]</span> の行も、飾りではありません。二つの位置姿勢の積を再び位置姿勢にするのが、この行です。連鎖はふつうの行列積になり、単位元があり、逆元もあります。ですから位置姿勢は<em>群</em>をなします。その群が <span class="m">SE(3)</span> です。</p></div>'},

        {t:'位置姿勢か、変換か', b:'<p>同じ 4×4 行列が、二つのことを同時に意味します。いま自分がどちらを言っているのかを、はっきりさせておく価値があります。</p><p><strong>座標系の取り替え。</strong>点は動かず、ただ別の座標系の成分で記述されるだけです。これが <span class="m">p<sub>W</sub> = R p<sub>B</sub> + t</span> という式で、何も変位せず、読み方が変わるだけです。</p><p><strong>位置姿勢。</strong>座標系 <span class="m">B</span> が <span class="m">W</span> の中でどこに立っているか、です。そしてここが要点なのですが、この二つは<em>同じ行列</em>であり、偶然ではありません。座標系の取り替えが <span class="m">B</span> の基底ベクトルについて何と言っているかを見てください。</p><p class="matline"><span class="m">e<sub>1</sub> ↦ R e<sub>1</sub> + t</span></p><p class="matline"><span class="m">e<sub>2</sub> ↦ R e<sub>2</sub> + t</span></p><p class="matline"><span class="m">e<sub>3</sub> ↦ R e<sub>3</sub> + t</span></p><p>つまり <span class="m">R</span> の<button class="termbtn" id="se3ColInfo" type="button" aria-expanded="false" aria-controls="se3ColNote">列</button>はちょうど、<span class="m">W</span> で表した <span class="m">B</span> の軸です。そして <span class="m">t</span> は <span class="m">W</span> における <span class="m">B</span> の原点です。行列の四本の列が、文字どおり座標系を描いています。シーンが組み立てているのも、それです。基底ベクトルが一本ずつ回り込んで所定の位置に着き、それぞれが自分の色で自分の列を書き入れます。三本そろって初めて、出来上がった座標系が <span class="m">t</span> に沿って滑り出します。これが四本目の列です。</p><p><strong>運動。</strong>三つ目の読み方もあります。物体を取って変位させる、という読み方です。そのとき <span class="m">T</span> は座標系の<em>位置</em>ではなく<em>変位</em>です。計算はまったく同じで、意味だけが違います。ですから別の名前に値します。相対位置姿勢、変位、あるいは <span class="m">ΔT</span> です。</p><p>記法はこれを引き受けます。<span class="m">T<sub>WB</sub></span> は「<span class="m">W</span> における <span class="m">B</span> の位置姿勢」とも、「<span class="m">B</span> 座標を <span class="m">W</span> 座標へ変換する」とも読めます。この二つの文は、同じことを言っています。代わりに <span class="m">ΔT</span> と書けば運動の話になり、その場合はつねに「どの座標系に対してか」を言わねばなりません。それが随伴 Ad の主題になります。</p><div class="bubble" id="se3ColNote" role="dialog" aria-label="なぜ列なのか" hidden><p>行列の <span class="m">i</span> 番目の列とは、定義からして <span class="m">i</span> 番目の基底ベクトルに作用させた結果です。</p><p class="matline"><span class="m">R e<sub>1</sub> = R の第 1 列</span></p><p>そうなるのは、<span class="m">e<sub>1</sub> = (1, 0, 0)</span> であり、行列の積が列の重み付き和だからです。ここでの重みは <span class="m">1, 0, 0</span> なので、ちょうど第 1 列だけが生き残ります。</p><p>幾何的に読めばこうなります。座標系 <span class="m">B</span> の <span class="m">x</span> 軸に沿って 1 だけ進むと、世界の中では <span class="m">R</span> の第 1 列だけ進んだことになる。座標系の三本の軸とその原点が、ちょうど <span class="m">T</span> の四本の列です。だから位置姿勢は行列の「中に入っている」と言うのです。</p></div>'},

        {t:'座標系の連鎖', b:'<p>変換がどの座標系からどの座標系へ行くのかを書き下せば、内側の添字が消し合うので、連鎖はひとりでに読めます。</p><p class="matline"><span class="m">T<sub>WC</sub> = T<sub>WB</sub> · T<sub>BC</sub></span></p><p>右から左へ読みます。まずカメラ座標系から body 座標系へ、次に body から世界へ、です。</p><p>シーンの緑の点はぴくりとも動かず、まさにその場所にとどまります。まずカメラ座標系で読みます。階段状の線が成分ごとに伸びていき、数字もそれに合わせて埋まっていきます。次に、その同じ座標系が body 座標系へ、そこからさらに世界座標系へと、そのつど測地線に沿って滑っていきます。階段もそれに付いていきます。点はつねに<em>そのときの</em>軸に沿って分解されるので、座標系が移動しているあいだ、三つの数は連続的に変わり続けます。三つの数の組はどれも違うのに、点は同じ。座標系の取り替えとは、まるごとそれだけのことです。</p><p>実務では <span class="m">T<sub>BC</sub></span> が外部パラメータ（剛体なので不変）、<span class="m">T<sub>WB</sub></span> が動く body の位置姿勢です。その積が世界におけるカメラの位置姿勢であり、同じ行列がカメラ座標を世界座標へ変換します。</p><p><button class="termbtn" id="se3InvInfo" type="button" aria-expanded="false" aria-controls="se3InvNote">逆行列</button>は、単なる転置ではありません。</p><p class="matline"><span class="m">T<sup>−1</sup> =</span><span class="matrix"><span class="mbracket"></span><span class="mgrid" style="grid-template-columns:repeat(2,auto)"><span>R<sup>⊤</sup></span><span>−R<sup>⊤</sup>t</span><span>0<sup>⊤</sup></span><span>1</span></span><span class="mbracket right"></span></span></p><p>回転は直交行列なので転置で足ります。しかし並進のほうも、回し戻さなければなりません。さもないと、古い座標系の軸に沿って適用されてしまいます。SLAM ではこれが日常の操作です。オドメトリは連鎖を作り、相対位置姿勢は <span class="m">T<sub>ab</sub> = T<sub>a</sub><sup>−1</sup>T<sub>b</sub></span> です。</p><p>一つ忘れてはいけないことがあります。積の順序は入れ替えられません。それが次のステーションの主題です。</p><div class="bubble" id="se3InvNote" role="dialog" aria-label="逆行列の導出" hidden><p>二行で済みます。定義から出発しましょう。</p><p class="matline"><span class="m">q = R p + t</span></p><p>これを <span class="m">p</span> について解きます。<span class="m">t</span> を引き、左から <span class="m">R<sup>−1</sup> = R<sup>⊤</sup></span> を掛けます。</p><p class="matline"><span class="m">p = R<sup>⊤</sup>(q − t) = R<sup>⊤</sup>q − R<sup>⊤</sup>t</span></p><p>これはちょうど位置姿勢の形で、回転は <span class="m">R<sup>⊤</sup></span>、並進は <span class="m">−R<sup>⊤</sup>t</span> です。幾何的に読めば、<span class="m">−R<sup>⊤</sup>t</span> は単に<em>古い原点が新しい座標系のどこにあるか</em>を表しています。</p></div>'},

        {t:'順序', b:'<p>ブロックの形そのものが、順序を符号化しています。<span class="m">p ↦ Rp + t</span> という式は、<em>まず回して、それから動かす</em>と言っています。逆にやって、まず動かしてから回すと <span class="m">R(p + t) = Rp + Rt</span> になり、その並進は <span class="m">t</span> ではなく <span class="m">Rt</span> です。</p><p>これは揚げ足取りではなく、非可換性の本質です。</p><p class="matline"><span class="m">T(t) T(R) ≠ T(R) T(t)</span></p><p>シーンでは、二つの物体が同じ二つの動きを、順序だけ逆にして行います。青緑のほうは、その場で回ってから出発します。菫色のほうは先に出発し、あとから回ります。ただしその回転は<em>世界</em>の原点まわりなので、すでに並進した物体を大きく振り回します。二つの終点は目に見えて違い、しかも単にずれているのではなく、垂直な方向にずれています。</p><p>なぜ世界の原点まわりなのでしょうか。左から掛けることは、世界座標系で作用する運動を意味するからです。物体に固定された軸のまわりに回したければ、右から掛けます。<button class="termbtn" id="se3OrdInfo" type="button" aria-expanded="false" aria-controls="se3OrdNote">数で見れば</button>、どちらも二行で済みます。</p><p>この二面性は、SLAM のいたるところに付いてきます。推定値の摂動は左（世界、global とも言います）にも右（body、local とも言います）にも置けます。ヤコビ行列の形が本ごとに違って見える理由は、ただそれだけです。他には何も起きていません。掛ける側が違うだけです。</p><div class="bubble" id="se3OrdNote" role="dialog" aria-label="順序を数で確かめる" hidden><p><span class="m">T(t)</span> を <span class="m">t = (2, 0, 0)</span> だけの純並進、<span class="m">T(R)</span> を <span class="m">z</span> 軸まわり 90° の回転としましょう。</p><p class="matline"><span class="m">R =</span><span class="matrix"><span class="mbracket"></span><span class="mgrid"><span>0</span><span>−1</span><span>0</span><span>1</span><span>0</span><span>0</span><span>0</span><span>0</span><span>1</span></span><span class="mbracket right"></span></span></p><p>4×4 の積は、ブロックの形で見れば規則一つです。先に効くのは右側の因子です。</p><p class="matline"><span class="m">[R<sub>2</sub>, t<sub>2</sub>] · [R<sub>1</sub>, t<sub>1</sub>] = [R<sub>2</sub>R<sub>1</sub>,&nbsp; R<sub>2</sub>t<sub>1</sub> + t<sub>2</sub>]</span></p><p>つまり右側の並進は、つねに左側の回転で回されます。二つの順序を代入してみましょう。</p><p class="matline"><span class="m">T(t)T(R) = [R,&nbsp; t]</span></p><p class="matline"><span class="m">T(R)T(t) = [R,&nbsp; R t]</span></p><p>回転部分はどちらも同じです。並進だけが違います。</p><p class="matline"><span class="m">t = (2, 0, 0)</span></p><p class="matline"><span class="m">R t = (0, 2, 0)</span></p><p>同じ二つの運動、違う順序。そして終点は単に動いたのではなく、垂直に動いています。</p></div>'},

        {t:'ねじ速度（ツイスト）', b:'<p>剛体はどう<em>動く</em>のでしょうか。各点の速度を見てみましょう。剛体性が可能性を容赦なく狭め、たった二つのベクトルが場全体を決めてしまいます。</p><p class="matline"><span class="m">v(x) = ω × x + u</span></p><p>角速度 <span class="m">ω</span>（珊瑚色の矢印）と、並進速度 <span class="m">u</span>（青緑）です。シーンの小さな矢印はどれも、この二つだけから計算されています。六つの数がすべてです。角錐に鼻先が付いているのは、回りが読み取れるようにするためです。</p><p><button class="termbtn" id="se3SkewInfo" type="button" aria-expanded="false" aria-controls="se3SkewNote">外積</button>は <span class="m">x</span> について線形なので行列で書けて、その行列は歪対称になります。これがハット演算子です。</p><p class="matline"><span class="m">φ<sup>∧</sup> =</span><span class="matrix"><span class="mbracket"></span><span class="mgrid"><span>0</span><span>−φ<sub>3</sub></span><span>φ<sub>2</sub></span><span>φ<sub>3</sub></span><span>0</span><span>−φ<sub>1</sub></span><span>−φ<sub>2</sub></span><span>φ<sub>1</sub></span><span>0</span></span><span class="mbracket right"></span></span></p><p>六つの数は一本のベクトルに収められます。定着した名前づけはこうです。並進部分が <span class="m">ρ := u</span>、回転部分が <span class="m">φ := ω</span>。</p><p class="matline"><span class="m">ξ =</span><span class="matrix"><span class="mbracket"></span><span class="mgrid" style="grid-template-columns:auto"><span>ρ</span><span>φ</span></span><span class="mbracket right"></span></span><span class="m">∈ ℝ<sup>6</sup></span></p><p>ハットを付けた 4×4 の形は、位置姿勢が住むのと同じ箱に入ります。</p><p class="matline"><span class="m">ξ<sup>∧</sup> =</span><span class="matrix"><span class="mbracket"></span><span class="mgrid" style="grid-template-columns:repeat(2,auto)"><span>φ<sup>∧</sup></span><span>ρ</span><span>0<sup>⊤</sup></span><span>0</span></span><span class="mbracket right"></span></span></p><p>これが単位元における接空間で、その名は <span class="m" data-speak="エスイー 3">se(3)</span> です。ここでは足し算も定数倍も<em>してよい</em>のです。位置姿勢は足せませんが、速度は足せます。だからこそ、あらゆる推定値、勾配、共分散は、曲がった多様体の上ではなく、この平坦な 6 次元空間に住むのです。</p><div class="bubble" id="se3SkewNote" role="dialog" aria-label="歪対称性と直交性" hidden><p>回転の拘束を、運動 <span class="m">R(t)</span> に沿って微分します。</p><p class="matline"><span class="m">R<sup>⊤</sup>R = I  ⟹  Ṙ<sup>⊤</sup>R + R<sup>⊤</sup>Ṙ = 0</span></p><p>つまり行列 <span class="m">Ω = R<sup>⊤</sup>Ṙ</span> は <span class="m">Ω<sup>⊤</sup> = −Ω</span> を満たす歪対称行列です。この形の行列は自由な成分を三つ持ち、それがちょうど角速度の三成分にあたります。そしてその作用は、まさに外積です。<span class="m">Ω x = ω × x</span> となります。</p><p><strong>では、歪対称性と直交性を結ぶものは何でしょうか。</strong>指数関数です。二行で済みます。<span class="m">Ω</span> が歪対称なら、こうなります。</p><p class="matline"><span class="m">(exp Ω)<sup>⊤</sup> = exp(Ω<sup>⊤</sup>) = exp(−Ω) = (exp Ω)<sup>−1</sup></span></p><p>これはまさに直交性の条件です。行列式についても見てみましょう。</p><p class="matline"><span class="m">det(exp Ω) = e<sup>tr Ω</sup> = e<sup>0</sup> = 1</span></p><p>歪対称行列の対角成分は、すべて 0 だからです。ですから出てくるのは鏡映ではなく、正真正銘の回転です。</p><p>短く言えばこうです。歪対称行列は<em>無限小の</em>回転、直交行列は<em>有限の</em>回転で、<span class="m">exp</span> が前者を後者へ運びます。<span class="m">log</span> は同じことを逆向きにします。</p></div>'},

        {t:'exp とねじ運動', b:'<p>速度 <span class="m">ξ</span> を一定に保ち、<em>単位</em>時間だけ働かせましょう。その結果が指数写像です。</p><p class="matline"><span class="m">T = exp(ξ<sup>∧</sup>)</span></p><p>ここで何が起きているのか、少し立ち止まる価値があります。一見すると <span class="m">ξ<sup>∧</sup></span> は抽象的な 4×4 行列で、0 と交差項ばかり、何も語らないように見えます。<button class="termbtn" id="se3HatInfo" type="button" aria-expanded="false" aria-controls="se3HatNote">展開する</button>と、前の衛星ですでに書き出したのと同じ箱だとわかります。ところが実際は、まったく具体的です。<em>それは運動そのもの</em>を、一定速度として記述したものだからです。そして <span class="m">exp</span> は、その運動を最初から最後まで再生するだけです。「抽象的なリー代数の元」とは等速運動のことであり、それに対応する群の元とは、その運動が連れて行った先のことです。</p><p>座標系が掃く経路の形は、いつも同じです。固定された軸のまわりに回りながら、<em>その同じ</em>軸に沿って滑る。これがねじであり、経路は螺旋になります。そしてこれが<button class="termbtn" id="se3ChaInfo" type="button" aria-expanded="false" aria-controls="se3ChaNote">シャールの定理</button>です。すべての剛体運動はねじ運動である、という定理です。</p><p>軸の向きは <span class="m">â = φ/θ</span>（ここで <span class="m">θ = |φ|</span>）、ピッチはその軸に沿った並進成分 <span class="m">d = â · ρ</span> です。退化する場合が二つあり、どちらもおなじみのものです。</p><p class="matline"><span class="m">θ = 0 → 直線</span></p><p class="matline"><span class="m">d = 0 → 純回転</span></p><p>これが <span class="m">SE(3)</span> の測地線、つまり二つの位置姿勢を結ぶ最もまっすぐな道を、一定の速さでたどったものです。平坦な空間での線分、球面上での大円の弧と、同じ役どころです。</p><p>ただし「最短」という言葉には注意が要ります。長さを測るには、1 ラジアンが何メートル分かを決めねばなりません。ところが <span class="m">SE(3)</span> には、あらゆる座標系の取り替えのもとで変わらない自然な測り方がないのです。ですからねじ運動は<em>等速</em>の運動であり自然な選択ですが、それが最短でもあるかどうかは測り方に依ります。純回転、すなわち <span class="m">SO(3)</span> の上では、この問題は起きません。そこには自然な測り方があり、弧は本当に最短経路になります。</p><div class="bubble" id="se3ChaNote" role="dialog" aria-label="シャールの定理" hidden><p>なぜいつも軸が現れるのでしょうか。回転部分 <span class="m">R = exp(φ<sup>∧</sup>)</span> が、すでに一つ選んでいるからです。それ自身の回転軸 <span class="m">â</span> です。そして並進は、その軸に<em>平行</em>な成分と<em>垂直</em>な成分に分かれます。</p><p>平行成分 <span class="m">d = â·t</span> は回して消すことができないので、滑りとして残ります。垂直成分のほうは、軸を適切な点 <span class="m">c</span> へずらせば回転が引き受けてくれます。運動が軸に沿って運ぶだけになるような <span class="m">c</span> を探す、ということです。</p><p class="matline"><span class="m">R c + t = c + d â</span></p><p><span class="m">θ ≠ 0</span> のとき、これはつねに解を持ちます。シーンの琥珀色の破線が、そのねじ軸、いわば運動の背骨です。</p></div><div class="bubble" id="se3HatNote" role="dialog" aria-label="ξ-ハットの展開" hidden><p>復習として、ブロックの形はこうです。</p><p class="matline"><span class="m">ξ<sup>∧</sup> =</span><span class="matrix"><span class="mbracket"></span><span class="mgrid" style="grid-template-columns:repeat(2,auto)"><span>φ<sup>∧</sup></span><span>ρ</span><span>0<sup>⊤</sup></span><span>0</span></span><span class="mbracket right"></span></span></p><p>左上の <span class="m">3×3</span> ブロックが回転部分のハットです。</p><p class="matline"><span class="m">φ<sup>∧</sup> =</span><span class="matrix"><span class="mbracket"></span><span class="mgrid"><span>0</span><span>−φ<sub>3</sub></span><span>φ<sub>2</sub></span><span>φ<sub>3</sub></span><span>0</span><span>−φ<sub>1</sub></span><span>−φ<sub>2</sub></span><span>φ<sub>1</sub></span><span>0</span></span><span class="mbracket right"></span></span></p><p>右上の列が並進部分 <span class="m">ρ</span> で、下段はすべて 0、<span class="m">[0 0 0]</span> です。数は同じ六つ、箱も位置姿勢 <span class="m">T</span> が住む 4×4 と同じです。ここに入っているのは<em>速度</em>であり、<span class="m">exp</span> が運んだ先の終着点ではありません。</p></div>'},

        {t:'弧と弦', b:'<p>六つの数に隠された罠が、ここにあります。<span class="m">ξ = (ρ, φ)</span> の後半は無害です。<span class="m">φ</span> は回転ベクトルで、その長さが角度です。ところが前半は、終点の並進では<strong>ありません</strong>。</p><p>なぜでしょうか。<span class="m">ρ</span> は<em>動いている</em>座標系で測った一定速度だからです。進んでいるあいだも回転が続いて、鼻先の向きを変え続けます。終点は、そうして向きを変え続けた速度の<button class="termbtn" id="se3IntInfo" type="button" aria-expanded="false" aria-controls="se3IntNote">総和</button>です。</p><p class="matline"><span class="m">t = ( ∫<sub>0</sub><sup>1</sup> R(s) ds ) ρ = V(φ) ρ</span></p><p>つまり <span class="m">V</span> は、道すがら通り過ぎた回転たちの<em>平均</em>にほかなりません。その閉じた形は、ロドリゲスの公式と同じ cos と sin の型に従います。</p><p class="matline"><span class="m">V = I + <span class="frac"><span>1 − cos θ</span><span>θ<sup>2</sup></span></span> φ<sup>∧</sup> + <span class="frac"><span>θ − sin θ</span><span>θ<sup>3</sup></span></span> (φ<sup>∧</sup>)<sup>2</sup></span></p><p>シーンの小さな菫色の矢印が、その <span class="m">R(s)ρ</span> という速度です。頭と尾をつないで並べると、経路そのものを描きます。琥珀色の矢印が弦 <span class="m">t</span> です。速度は道中ずっと長さを保つので、要点は一行に収まります。</p><p class="matline"><span class="m">|ρ| = 弧長</span></p><p class="matline"><span class="m">|t| = 弦</span></p><p>角度を上げてみてください。0 の近くでは二つが一致します（<span class="m">V → I</span>）。角度が大きくなると弦は縮み、一回転で完全に潰れます。ですから進んだ距離、そしてそこから導かれる速さは、<span class="m">|t|</span> ではなく <span class="m">|ρ|</span> から来ます。</p><div class="slrow"><label>θ = <b id="se3jth">0°</b></label><input type="range" id="se3jsl" min="0" max="200" value="0" step="1"></div><div class="ro">|ρ| = <b id="se3jrho">—</b> &nbsp;·&nbsp; |t| = <b id="se3jt">—</b></div><div class="bubble" id="se3IntNote" role="dialog" aria-label="積分" hidden><p>body の原点は、<em>自分自身の</em>座標系で速度 <span class="m">ρ</span> で動きます。世界から見れば、その速度は現在の回転で回されます。ですから世界での速度は <span class="m">R(s) ρ</span>、ここで <span class="m">R(s) = exp(s φ<sup>∧</sup>)</span> です。</p><p>変位は、単位時間にわたるその総和です。</p><p class="matline"><span class="m">t = ∫<sub>0</sub><sup>1</sup> R(s) ρ ds</span></p><p><span class="m">ρ</span> は定数なので外へ出せて、残るのは回転の積分、すなわち <span class="m">V(φ)</span> です。回転がなければ <span class="m">R(s) = I</span>、<span class="m">V = I</span> なので <span class="m">t = ρ</span> です。それが平坦な場合にあたります。</p></div>'},

        {t:'log：運動を読み戻す', b:'<p>逆向きの問いを立てましょう。位置姿勢が与えられたとき、そこへ連れて行った六つの数は何だったのでしょうか。二段階です。まず回転から軸・角度ベクトル <span class="m">φ = log(R)</span> を取り、次に並進を、まさに同じ <span class="m">V</span> でほどきます。</p><p class="matline"><span class="m">ρ = V(φ)<sup>−1</sup> t</span></p><p><span class="m">V<sup>−1</sup></span> の閉じた形は驚くほど親切で、項は有限個です。<span class="m">(φ<sup>∧</sup>)<sup>3</sup></span> が低い冪に落ちるからです。</p><p class="matline"><span class="m">V<sup>−1</sup> = I − <span class="frac"><span>1</span><span>2</span></span> φ<sup>∧</sup> + <span class="frac"><span>1</span><span>θ<sup>2</sup></span></span>(1 − <span class="frac"><span>θ sin θ</span><span>2(1 − cos θ)</span></span>) (φ<sup>∧</sup>)<sup>2</sup></span></p><p><span class="m">θ = 0</span> では第三の<button class="termbtn" id="se3SerInfo" type="button" aria-expanded="false" aria-controls="se3SerNote">係数</button>が <span class="m">0/0</span> の形になりますが、極限は有限で <span class="m">1/12</span> です。除去可能な特異点であり、数学的には無害です。ところが数値的には無害ではありません。小さな角度では、閉じた形がごく小さな量から大きな数を組み立てようとするからです。そこでは級数展開が正しい道です。</p><p>これで <span class="m">exp</span> と <span class="m">log</span> は、<span class="m">|θ| &lt; π</span> であるかぎり厳密に互いの逆になります。その境界を越えると回転は巻き戻り、log はつねに短いほうの道を返します。<span class="m">SO(3)</span> の球体の対蹠点が語っていたのと、同じトポロジーです。</p><p>SLAM ではこれが主役級の道具です。二つのキーフレームの相対位置姿勢は <span class="m">T<sub>ab</sub> = T<sub>a</sub><sup>−1</sup>T<sub>b</sub></span> です。その log は六つの数で、二つの座標系のあいだで body がどれだけ回り、どれだけ進んだかを表します。因子グラフの残差は文字どおりこれです。</p><p class="matline"><span class="m">r = log(T<sub>meas</sub><sup>−1</sup> T<sub>est</sub>)<sup>∨</sup> ∈ ℝ<sup>6</sup></span></p><p>これによって位置姿勢の誤差が、最小二乗の機械が噛み砕けるふつうのベクトルになります。</p><div class="bubble" id="se3SerNote" role="dialog" aria-label="小さな角度の場合" hidden><p>分子と分母を <span class="m">θ = 0</span> のまわりで展開します。</p><p class="matline"><span class="m">1 − cos θ ≈ <span class="frac"><span>θ<sup>2</sup></span><span>2</span></span>,&nbsp;&nbsp; θ sin θ ≈ θ<sup>2</sup> − <span class="frac"><span>θ<sup>4</sup></span><span>6</span></span></span></p><p>代入すると、係数はおなじみの <span class="m">1/12</span> に近づき、次の項は <span class="m">θ<sup>2</sup></span> に比例します。</p><p>実務上の教訓はこうです。閉じた形にある <span class="m">1 − cos θ</span> は、<span class="m">θ</span> が小さいときには、ほぼ等しい二つの数の差です。まさにそこで、浮動小数点は有効数字を失います。ですからその領域では、極限の定数のほうが厳密な式<em>より</em>正確です。</p></div>'},

        {t:'随伴 Ad：別の観測者から見ると', b:'<p>六つの数は、つねに何らかの座標系に対して言われています。別の座標系へ移ると、運動は物理的には同じままですが、その座標は変わります。この変化は線形で、その行列を<button class="termbtn" id="se3AdjInfo" type="button" aria-expanded="false" aria-controls="se3AdjNote">随伴（アジョイント）</button>と呼びます。</p><p class="matline"><span class="m">ξ<sub>A</sub> = Ad<sub>T<sub>AB</sub></sub> ξ<sub>B</sub></span></p><p class="matline"><span class="m">Ad<sub>T</sub> =</span><span class="matrix"><span class="mbracket"></span><span class="mgrid" style="grid-template-columns:repeat(2,auto)"><span>R</span><span>t<sup>∧</sup>R</span><span>0</span><span>R</span></span><span class="mbracket right"></span></span></p><p>回転部分は、ただ回るだけです。並進部分は、座標系のあいだのずれ <span class="m">t</span> を拾います。遠くの点から見れば、同じ回転が横方向の運動としても見えるからです。回転木馬の縁に座っているときに感じるのが、まさにそれです。</p><p>ひとつだけ<button class="termbtn" id="se3InvarInfo" type="button" aria-expanded="false" aria-controls="se3InvarNote">例外</button>があり、それがこの全体を使いものにしています。ねじ運動は<em>それ自身の</em>運動のもとで不変なのです。</p><p class="matline"><span class="m">Ad<sub>exp(ξ)</sub> ξ = ξ</span></p><p>幾何的に言えばこうです。ねじ軸は物体と一緒に運ばれるので、始点側の座標系から見ても終点側から見ても、その運動は同じ六つの座標を持ちます。だからシーンで座標系に貼り付いた珊瑚色と青緑の矢印の組は、両端でまったく同じに見えるのです。</p><p>これには、非常に具体的な見返りがあります。二つのキーフレームの相対位置姿勢から速さを求めるとき、<span class="m">|ρ| / Δt</span> はどちら端の座標系で計算しても同じ数になります。同様に <span class="m">θ / Δt</span> が角速度です。だからこそこれらは IMU や車輪オドメトリと比較でき、外れ値の運動を弾くのに使えます。</p><div class="bubble" id="se3AdjNote" role="dialog" aria-label="随伴は何のためにあるのか" hidden><p>随伴は、運動の変換器です。その定義は一行で書けます。</p><p class="matline"><span class="m">T exp(ξ<sup>∧</sup>) T<sup>−1</sup> = exp( (Ad<sub>T</sub> ξ)<sup>∧</sup> )</span></p><p>言葉にすればこうです。運動を別の座標系へ運び、そこで実行し、戻ってくることは、最初から<em>変換済みの</em>速度で動くことと同じである。</p><p>ですから座標系が変わるところには、必ず顔を出します。左右の摂動の切り替え、ヤコビ行列の連鎖、そして共分散の変換 <span class="m">Σ<sub>A</sub> = Ad Σ<sub>B</sub> Ad<sup>⊤</sup></span> です。</p></div><div class="bubble" id="se3InvarNote" role="dialog" aria-label="なぜ不変なのか" hidden><p>定義に <span class="m">T = exp(ξ<sup>∧</sup>)</span> を入れてみます。</p><p class="matline"><span class="m">exp(ξ<sup>∧</sup>) exp(ξ<sup>∧</sup>) exp(ξ<sup>∧</sup>)<sup>−1</sup> = exp(ξ<sup>∧</sup>)</span></p><p>左辺は明らかに <span class="m">exp(ξ<sup>∧</sup>)</span> なので、<span class="m">Ad<sub>exp(ξ)</sub> ξ = ξ</span> です。元はつねに自分自身と可換である。議論はそれだけです。</p><p>とはいえ帰結は自明ではありません。相対位置姿勢の log は、運動の始まりの座標系でも終わりの座標系でも、同じ座標を与えます。どちら端に属するかの札を必要としない、局所的な 6 次元ベクトルなのです。</p></div>'},

        {t:'任意の時刻の位置姿勢', b:'<p>どの SLAM システムでもぶつかる、実務的な問いがあります。位置姿勢はある時間格子の上に来ます。たとえば 100 Hz のオドメトリです。ところが問い合わせは、それとは別の場所に来ます。画像やライダースキャン、ラベルのタイムスタンプなどです。つまり隣り合う二つの<em>あいだ</em>の位置姿勢が要るのです。</p><p>定着した手順は、二つの部分を別々に扱います。回転には <strong>SLERP</strong>、すなわち一定の角速度でたどる球面測地線を使います。（行列を成分ごとに平均するのは禁止です。結果が <span class="m">SO(3)</span> から出てしまいます。）並進には、成分ごとのふつうの<strong>線形補間</strong>を使います。</p><p>これがねじ運動にどれだけ近いかを見ておく価値があります。SLERP はねじ運動の回転部分<em>そのもの</em>、同じ等角速度の弧です。違いは並進だけに宿ります。</p><p class="matline"><span class="m">lerp → 弦</span></p><p class="matline"><span class="m">ねじ → 弧</span></p><p>シーンの青緑の経路が、この分割した手順です。キーフレームを結ぶ直線分になっています。菫色のほうが本物の <span class="m">SE(3)</span> 測地線 <span class="m">T(u) = T<sub>a</sub> exp(u · log(T<sub>a</sub><sup>−1</sup>T<sub>b</sub>))</span> です。赤い矢印が、その隔たりを示しています。スライダーを動かしてください。隔たりは区間内の<em>回転</em>とともに大きくなり、小さな角度では二次のオーダーです。ですから密で高レートの軌跡では無視できますが、半回転も跳ぶ区間ではそうはいきません。</p><div class="slrow"><label>t = <b id="se3iq">0.00</b></label><input type="range" id="se3isl" min="0" max="1000" value="0" step="1"></div><div class="ro">隔たり: <b id="se3igap">—</b> &nbsp;·&nbsp; <button class="act" id="se3iauto" type="button" style="padding:2px 10px;font-size:16px">自動</button></div><p style="margin-top:12px">心に留めておく価値のあることが、二つあります。一つめ、分割した手順は<em>世界</em>座標系の取り方に対して不変です。左から掛けても同じ曲線が出ます。ところが<em>body</em> 座標系の取り直しに対しては不変ではありません。ねじ版のほうは、その両方に対して不変です。二つめ、どちらもあくまで<em>内挿</em>だということです。時間格子が狭義単調で、問い合わせが覆われた範囲の内側にあること。これは形式的な条件ではありません。位置姿勢の外挿は、悪い考えだからです。</p>'}
      ]
    }
  };
})();
