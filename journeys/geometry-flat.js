'use strict';
/* Journey (prototype): the flat world ℝⁿ — the Geometry planet's "start here" moon.
   A deliberately small, self-contained counterpoint to the curved SO(3) journey:
   the space you already know, where the tangent space IS the space and the step is
   plain addition. Concepts are explained by inline links in the running text (dashed
   underline) that open a footnote panel at the foot of the card. Station 2 animates a
   concrete step exp_p(v) = p + v on a coordinate frame, with faint position vectors
   O→p and O→q making the vector-addition triangle explicit. Aimed at an undergraduate
   EE/CS reader — see CLAUDE.md. Cards are bilingual and live in this file (the engine
   falls back to C.cards when a journey ships none). Requires LIE.kit.

   Stations 4 and 5 pay off what the first three keep borrowing. Station 3's footnote uses
   e^x and the limit (1 + v/n)ⁿ without either being earned, and its last line promises that
   + becomes ⊞ on a curved space without saying what ⊞ then has to be:

     4 · why e — C_a = lim (a^h − 1)/h is a constant that depends only on the base, and e is
         the one base where that constant is 1. Drawn as three secants converging on three
         different slopes, with only a = e landing on the slope-1 reference.
     5 · the three ⊞ axioms → exp. Identity, composability and initial velocity force
         p ⊞ v = exp(X)p, so ⊞ is a theorem rather than a definition. The amber polygon is
         literally (I + X/n)ⁿ p, one multiplication per vertex.

   Station 4 is drawn in the XY plane with a near head-on camera, the way geometry-so2's
   scenes are: a function graph is a 2D story and the ground-plane framing the other four
   stations use would read it at a slant. Backing notes: docs/geometry/why-e.md,
   docs/geometry/boxplus-derivation.md. */
window.LIE = window.LIE || {};
LIE.journeys = LIE.journeys || {};
LIE.journeys['geometry-flat'] = (function(){
  const K = LIE.kit;
  const { V3, ease, hexStr, fatArrow, setArrow, makeLabel, updateLabel } = K;

  // The concrete example animated at station 2 — the same numbers the card works out.
  const P0 = V3(-2,1,-1), VV = V3(3,1,2), Q0 = P0.clone().add(VV);   // (1,2,1)

  // Station 4 · the a^x graph. GP maps graph coordinates to world ones; the band is picked
  // so all three curves fit between the axes and the label column still sits on-screen.
  const GSX = 1.6, GSY = 0.80, GOX = -0.40, GOY = -0.85;
  const GP = (x,y) => V3(GOX + x*GSX, GOY + y*GSY, 0);
  const BASES = [2, Math.E, 3];                       // teal · amber · violet
  const GX0 = -1.3, GX1 = 1.1;                        // the plotted x range
  const HMAX = 1.05, HMIN = 0.06;                     // the secant offset h sweeps this

  // Station 5 · the point p on the unit sphere, the tangent direction, and how far to go.
  const SPH_R = 2.0, THETA = 1.15;
  const PU = V3(0.15,0.55,0.82).normalize();
  const WU = (function(){ const w = V3(1,0.25,0); return w.sub(PU.clone().multiplyScalar(w.dot(PU))).normalize(); })();
  const AXIS5 = PU.clone().cross(WU).normalize();     // the geodesic turns about this
  const NS5 = [1, 2, 3, 5, 8, 14, 25];                // the n values the polygon steps through

  function build(C, PAL){
    const COL = PAL || K.palette('dark');
    const HX = { teal:hexStr(COL.teal), coral:hexStr(COL.coral),
                 violet:hexStr(COL.violet), amber:hexStr(COL.amber), ink:hexStr(COL.ink) };

    function grid(g){
      const gr = new THREE.GridHelper(9, 18, COL.grid1, COL.grid2);
      gr.position.y = -0.001; g.add(gr);
    }
    // an arrow at reduced opacity (for the coordinate frame + faint position vectors)
    function dimArrow(color, r, from, to, op){
      const a = fatArrow(color, r); setArrow(a, from, to);
      a.userData.cyl.material.transparent = true; a.userData.cyl.material.opacity = op;
      return a;
    }
    function line(g, pts, color, op){
      const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({color, transparent:true, opacity:op===undefined?0.9:op}));
      g.add(l); return l;
    }
    function dot(g, color, r){
      const d = new THREE.Mesh(new THREE.SphereGeometry(r||0.1,14,12), new THREE.MeshBasicMaterial({color}));
      g.add(d); return d;
    }
    // a two-vertex line whose endpoints are rewritten every frame, in place
    function seg(g, color, op){
      const pos = new Float32Array(6), geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos,3));
      const l = new THREE.Line(geo, new THREE.LineBasicMaterial({color, transparent:true, opacity:op}));
      l.userData.set = (a,b)=>{ pos[0]=a.x; pos[1]=a.y; pos[2]=a.z; pos[3]=b.x; pos[4]=b.y; pos[5]=b.z;
        geo.attributes.position.needsUpdate = true; geo.computeBoundingSphere(); };
      g.add(l); return l;
    }
    // wire an inline link's footnote: toggle on click, keep only one panel open
    function wireBubble(infoId, popId){
      const info=document.getElementById(infoId), pop=document.getElementById(popId);
      if(!info || !pop) return;
      info.onclick=e=>{
        e.stopPropagation();
        const willOpen = pop.hidden;
        document.querySelectorAll('.bubble:not([hidden]), .pop:not([hidden])').forEach(o=>{
          if(o!==pop){ o.hidden=true; const t=document.querySelector('[aria-controls="'+o.id+'"]'); if(t) t.setAttribute('aria-expanded','false'); }
        });
        pop.hidden=!willOpen; info.setAttribute('aria-expanded', willOpen?'true':'false');
      };
    }

    const stations = [
      // 0 · the space ℝⁿ: grid + coordinate triad + a few free-floating points
      g=>{
        grid(g);
        const triad = new THREE.Group();
        [[V3(2.2,0,0),COL.coral],[V3(0,2.2,0),COL.teal],[V3(0,0,2.2),COL.violet]].forEach(([v,c])=>{
          const a=fatArrow(c,0.05); setArrow(a,V3(0,0,0),v); triad.add(a);
        });
        g.add(triad);
        const pts = new THREE.Group();
        [V3(1.6,0.8,-1.2),V3(-2.0,1.4,0.9),V3(0.6,2.0,1.8),V3(-1.2,0.5,-2.1)].forEach(p=>{
          const d=new THREE.Mesh(new THREE.SphereGeometry(0.1,12,10), new THREE.MeshBasicMaterial({color:COL.amber}));
          d.position.copy(p); pts.add(d);
        });
        g.add(pts);
        const lbl=makeLabel('ℝ^{n}', HX.ink, 2.0); lbl.position.set(0,3.0,0); g.add(lbl);
        return {tick(t){ triad.rotation.y = t*0.25; }};
      },
      // 1 · the tangent space is the space itself: the same vector, free at every basepoint
      g=>{
        grid(g);
        const bases = [V3(-2.4,0.4,1.4), V3(-0.2,0.4,-1.6), V3(2.0,0.4,0.6)];
        const items = bases.map(b=>{
          const a=fatArrow(COL.teal,0.05); g.add(a);
          const dot=new THREE.Mesh(new THREE.SphereGeometry(0.09,12,10), new THREE.MeshBasicMaterial({color:COL.violet2}));
          dot.position.copy(b); g.add(dot);
          return {a,b};
        });
        const lbl=makeLabel('Tₚℝ^{n} ≅ ℝ^{n}', HX.teal, 3.6); lbl.position.set(0,2.9,0); g.add(lbl);
        return {tick(t){
          // one vector, turned in sync at every basepoint — the point being it's the SAME vector
          const v=V3(1.5,0.9,-0.6).applyAxisAngle(V3(0,1,0), Math.sin(t*0.45)*0.6);
          items.forEach(({a,b})=>setArrow(a,b,v));
        }};
      },
      // 2 · a concrete step exp_p(v) = p + v as vector addition, on a coordinate frame.
      //     Faint O→p and O→q show the triangle; the coral v is the step; a ball walks it.
      g=>{
        grid(g);
        const O=V3(0,0,0);
        // coordinate system: a subtle triad at the origin
        [[V3(2.0,0,0),COL.coral],[V3(0,2.0,0),COL.teal],[V3(0,0,2.0),COL.violet]].forEach(([v,c])=>{
          g.add(dimArrow(c,0.03,O,v,0.4));
        });
        g.add(new THREE.Mesh(new THREE.SphereGeometry(0.07,12,10),
          new THREE.MeshBasicMaterial({color:COL.ink,transparent:true,opacity:0.55})));   // origin
        // faint position vectors O→p and O→q (the vector-addition triangle)
        g.add(dimArrow(COL.violet,0.028,O,P0,0.3));
        g.add(dimArrow(COL.amber,0.028,O,Q0,0.3));
        // start point p
        const dotP=new THREE.Mesh(new THREE.SphereGeometry(0.12,14,12), new THREE.MeshBasicMaterial({color:COL.violet}));
        dotP.position.copy(P0); g.add(dotP);
        // the tangent vector v (coral) — the step; the ball travels along it to p+v
        const arr=fatArrow(COL.coral,0.05); setArrow(arr,P0,VV); g.add(arr);
        const ball=new THREE.Mesh(new THREE.SphereGeometry(0.13,16,12), new THREE.MeshBasicMaterial({color:COL.amber}));
        g.add(ball);
        const lp=makeLabel('p', HX.violet, 2.2); lp.position.copy(P0).add(V3(-0.55,0.45,0)); g.add(lp);
        const lv=makeLabel('v', HX.coral, 2.2); lv.position.copy(P0).add(VV.clone().multiplyScalar(0.5)).add(V3(0.4,0.45,0)); g.add(lv);
        const lq=makeLabel('p + v', HX.amber, 2.6); lq.position.copy(Q0).add(V3(0,0.6,0)); g.add(lq);
        const T0=1.1, TT=1.7, T1=1.3, PER=T0+TT+T1;                               // dwell p · travel · dwell p+v
        return {tick(t){
          const tc=t%PER;
          const u = tc<T0 ? 0 : tc<T0+TT ? ease((tc-T0)/TT) : 1;
          ball.position.lerpVectors(P0,Q0,u);
          lq.material.opacity = 0.12 + 0.88*u; lq.visible = u>0.02;
        }};
      },
      /* 3 · why e. Three exponentials through (0,1); for each, the secant from (0,1) to
            (h, a^h) as h shrinks. The three slopes settle on three different numbers —
            0.69, 1.00, 1.10 — and the green dashed reference has slope exactly 1, so the
            claim "e is the base where the limit is 1" is something you watch happen
            rather than something the card asserts. The readouts are computed from the
            same h the secants are drawn from. */
      g=>{
        const CC = [COL.teal, COL.amber, COL.violet];
        g.add(dimArrow(COL.grid1, 0.02, GP(GX0,0), GP(GX1+0.15,0), 0.6));    // x axis
        g.add(dimArrow(COL.grid1, 0.02, GP(0,0), GP(0,3.7), 0.6));           // y axis
        BASES.forEach((a,i)=>{
          const pts=[]; for(let k=0;k<=96;k++){ const x=GX0+(GX1-GX0)*k/96; pts.push(GP(x, Math.pow(a,x))); }
          line(g, pts, CC[i], 0.9);
        });
        // every a^x passes through (0,1) — the one point all three share
        const p1 = GP(0,1); dot(g, COL.ink, 0.075).position.copy(p1);
        // the slope-1 reference: the line the winning secant has to land on
        const rd = V3(GSX, GSY, 0).normalize().multiplyScalar(2.15);
        g.add(K.dashedLine(p1.clone().sub(rd), p1.clone().add(rd), COL.green, 0.10));
        const lref = makeLabel('1', HX.green, 0.6); lref.position.copy(p1.clone().add(rd)).add(V3(0.2,0.18,0)); g.add(lref);

        const secs = BASES.map((a,i)=>({
          a, line: seg(g, CC[i], 0.9), chord: seg(g, CC[i], 0.28), rider: dot(g, CC[i], 0.07),
          lbl: makeLabel('', HX.ink, 1.45)
        }));
        secs.forEach((s,i)=>{ s.lbl.position.set(2.05, 1.55 - i*0.46, 0); g.add(s.lbl); });
        const lh = makeLabel('', HX.ink, 2.5); lh.position.set(-0.35, 2.25, 0); g.add(lh);

        let shown = -1;
        return {tick(t){
          const h = HMIN + (HMAX-HMIN)*0.5*(1 + Math.cos(t*0.5));
          secs.forEach(s=>{
            const m = (Math.pow(s.a,h) - 1)/h;                       // the secant slope
            const d = V3(GSX, m*GSY, 0).normalize().multiplyScalar(2.15);
            s.line.userData.set(p1.clone().sub(d), p1.clone().add(d));
            const q = GP(h, Math.pow(s.a,h));
            s.rider.position.copy(q); s.chord.userData.set(p1, q);
          });
          // the readouts change fast enough to blur; redraw them ~12×/s, not 60
          const tick12 = Math.round(t*12);
          if(tick12 !== shown){
            shown = tick12;
            const nm = ['2','e','3'];
            secs.forEach((s,i)=>{
              updateLabel(s.lbl, nm[i]+' → '+(((Math.pow(s.a,h)-1)/h)).toFixed(2), HX.ink);
            });
            updateLabel(lh, 'h = '+h.toFixed(2), HX.ink);
          }
        }};
      },
      /* 4 · the ⊞ axioms, and the limit they force. The green arc is the true geodesic
            exp_p(v); the amber polygon is (I + X/n)ⁿ p built one multiplication per vertex,
            with NO renormalisation — so its outward drift is the real second-order error,
            the same overshoot geometry-so2's polygon shows in the plane. n cycles through
            NS5 and the polygon closes onto the arc. */
      g=>{
        g.add(K.baseSphere(SPH_R, COL));
        const P = PU.clone().multiplyScalar(SPH_R);
        dot(g, COL.violet, 0.11).position.copy(P);
        // the tangent vector v = θ·w, drawn in the tangent plane at p
        const arr = fatArrow(COL.coral, 0.045); setArrow(arr, P, WU.clone().multiplyScalar(THETA*SPH_R)); g.add(arr);
        // the true geodesic, and where it lands
        const arc=[]; for(let k=0;k<=72;k++) arc.push(PU.clone().applyAxisAngle(AXIS5, THETA*k/72).multiplyScalar(SPH_R));
        line(g, arc, COL.green, 0.95);
        const qEnd = PU.clone().applyAxisAngle(AXIS5, THETA).multiplyScalar(SPH_R);
        dot(g, COL.green, 0.1).position.copy(qEnd);

        // the polygon: one (I + X/n) multiplication per vertex, drawn up to n+1 points
        const MAXN = NS5[NS5.length-1];
        const pos = new Float32Array((MAXN+1)*3), geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos,3));
        const poly = new THREE.Line(geo, new THREE.LineBasicMaterial({color:COL.amber, transparent:true, opacity:0.95}));
        geo.setDrawRange(0, 0);       // nothing to draw until the first tick fills the buffer
        g.add(poly);
        const tip = dot(g, COL.amber, 0.09);

        const lp = makeLabel('p', HX.violet, 0.7); lp.position.copy(P).add(V3(-0.42,0.34,0)); g.add(lp);
        const lq = makeLabel('exp(X) p', HX.green, 2.0); lq.position.copy(qEnd).add(V3(0.5,0.5,0)); g.add(lq);
        const ln = makeLabel('', HX.amber, 2.4); ln.position.set(0, 3.15, 0); g.add(ln);

        const DWELL = 1.5;
        let shownN = -1;
        return {tick(t){
          const n = NS5[Math.floor(t/DWELL) % NS5.length];
          if(n === shownN) return;
          shownN = n;
          // q ← q + (θ/n)(axis × q) — literally (I + X/n) applied, n times, no renormalising
          let q = PU.clone();
          for(let k=0;k<=n;k++){
            const w = q.clone().multiplyScalar(SPH_R);
            pos[k*3]=w.x; pos[k*3+1]=w.y; pos[k*3+2]=w.z;
            if(k<n) q = q.clone().add(AXIS5.clone().cross(q).multiplyScalar(THETA/n));
          }
          geo.attributes.position.needsUpdate = true;
          geo.setDrawRange(0, n+1); geo.computeBoundingSphere();
          tip.position.set(pos[n*3], pos[n*3+1], pos[n*3+2]);
          updateLabel(ln, '(I + X/n)^{n},  n = '+n, HX.amber);
        }};
      }
    ];

    function bindCard(i){
      wireBubble('gfTriadInfo','gfTriadNote');   // card 0 · footnote
      wireBubble('gfExpInfo','gfExpNote');         // card 2 · footnote
      wireBubble('gfGeoInfo','gfGeoNote');         // card 2 · footnote
      wireBubble('gfCaInfo','gfCaNote');           // card 3 · footnote
      wireBubble('gfSerInfo','gfSerNote');         // card 3 · footnote
      wireBubble('gfMulInfo','gfMulNote');         // card 4 · footnote
    }

    return { stations, bindCard };
  }

  return {
    id: 'geometry-flat',
    tier: 'geometry',
    threadKey: 'teal',
    // Curriculum position, as data rather than prose: `next` is the following moon in
    // hub.js's BRANCHES order (crossing into the next branch at a branch end), `handoffs`
    // are the topical pointers this journey's cards name, `requires` the hard
    // back-references its opening card makes. engine.js renders next+handoffs as links
    // on the last station; check.html verifies every id resolves and that the next-chain
    // still agrees with BRANCHES.
    seq: { next: 'geometry-so2', requires: [], handoffs: ['geometry-so3', 'so3-optimization'] },
    build,
    cards: {
      hu: [
        {t:'A lapos tér', b:'<p>A paramétertér a jól ismert <span class="m">ℝ<sup>n</sup></span>: egy pont <span class="m">w = (w<sub>1</sub>, …, w<sub>n</sub>)</span> egyszerűen <span class="m">n</span> darab valós szám. A korall/teál/lila <button class="termbtn" id="gfTriadInfo" type="button" aria-expanded="false" aria-controls="gfTriadNote">triád</button> a standard bázis, a rács a koordináták.</p><p>A lényeg, amit itt ingyen kapunk: nincs kényszer. Bárhonnan bármely irányba léphetsz, és az eredmény ugyanúgy <span class="m">ℝ<sup>n</sup></span>-beli pont marad — nincs honnan „kilépni”. Ezt a kényelmet veszítjük el a görbült tereken (<span class="m">SO(3)</span>, <span class="m">SE(3)</span>), és pont ezt a receptet akarjuk oda átvinni.</p><div class="bubble" id="gfTriadNote" role="dialog" aria-label="Mi az a triád" hidden><p>A három tengely-nyíl a standard bázis: <span class="m">e<sub>1</sub>, e<sub>2</sub>, e<sub>3</sub></span> — a koordinátatengelyek.</p><p class="matline"><span class="m">w = w<sub>1</sub>e<sub>1</sub> + w<sub>2</sub>e<sub>2</sub> + w<sub>3</sub>e<sub>3</sub></span></p><p>A <span class="m">w<sub>i</sub></span> számok a pont koordinátái.</p></div>'},
        {t:'Az érintőtér', b:'<p>Az <em>érintőtér</em> egy <span class="m">p</span> pontban az összes sebességvektor, amivel <span class="m">p</span>-n át lehet haladni. Vegyél egy görbét, <span class="m">γ(t)</span>-t, amire <span class="m">γ(0) = p</span> — a sebessége, <span class="m">γ′(0)</span>, egy érintővektor.</p><p>Lapos térben egy egyenes <span class="m">γ(t) = p + t·v</span>, ennek sebessége <span class="m">γ′(0) = v</span>, és <span class="m">v</span> bármi lehet. Így az érintőtér a teljes <span class="m">ℝ<sup>n</sup></span>, minden pontban ugyanaz:</p><p class="matline"><span class="m">T<sub>p</sub>ℝ<sup>n</sup> ≅ ℝ<sup>n</sup></span></p><p>Ezért olvad össze itt pont és vektor. Egy sokaságon viszont az érintőtér pontról pontra változik, és <em>nem</em> a befoglaló tér — ott a <span class="m">v</span> már nem tolható szabadon a helyéről.</p>'},
        {t:'A lépés: exp = összeadás', b:'<p>Az <button class="termbtn" id="gfExpInfo" type="button" aria-expanded="false" aria-controls="gfExpNote">exp</button><sub>p</sub> leképezés egy <span class="m">v</span> érintővektort visz pontba: indulj <span class="m">p</span>-ből <span class="m">v</span> kezdősebességgel a <button class="termbtn" id="gfGeoInfo" type="button" aria-expanded="false" aria-controls="gfGeoNote">geodetikus</button> mentén, és haladj <em>egységnyi</em> ideig. Lapos térben a geodetikus egyenes, <span class="m">γ(t) = p + t·v</span>, tehát:</p><p class="matline"><span class="m">exp<sub>p</sub>(v) = γ(1) = p + v</span></p><p>Konkrétan, a jelenetben <span class="m">p = (−2, 1, −1)</span> és <span class="m">v = (3, 1, 2)</span> — a gömb pontosan ezt a lépést járja be:</p><p class="matline"><span class="m">exp<sub>p</sub>(v) = (−2, 1, −1) + (3, 1, 2) = (1, 2, 1)</span></p><p>Ezért „csak összeadás” itt a lépés — komponensenként. A görbült világban a definíció <em>ugyanez</em>, de a geodetikus ív: <span class="m">SO(3)</span>-on <span class="m">exp</span> a mátrix-exponenciális, a <span class="m">+</span>-ból <span class="m">⊞</span> lesz.</p><div class="bubble" id="gfExpNote" role="dialog" aria-label="Miert exp" hidden><p>Az <span class="m">exp</span> az <em>exponenciális függvény</em>. A valós <span class="m">e<sup>x</sup></span> hatványsora:</p><p class="matline"><span class="m">e<sup>x</sup> = 1 + x + <span class="frac"><span>x<sup>2</sup></span><span>2!</span></span> + <span class="frac"><span>x<sup>3</sup></span><span>3!</span></span> + …</span></p><p>Ugyanez a sor működik vektorra/mátrixra is. A kulcstulajdonság:</p><p class="matline"><span class="m">e<sup>a+b</sup> = e<sup>a</sup> · e<sup>b</sup></span></p><p>vagyis az <strong>összeadást szorzássá</strong> (transzformációk összefűzésévé) alakítja. Az érintővektorokat összeadjuk; az <span class="m">exp</span> ezt viszi át a mozgások szorzására.</p><p>Konkrétan, kamatos kamatként (a <span class="m">v</span>-t <span class="m">n</span> pici lépésre bontva — ez az összeadás!):</p><p class="matline"><span class="m">exp(v) = lim<sub>n→∞</sub> (1 + <span class="frac"><span>v</span><span>n</span></span>)<sup>n</sup></span></p><p>Lapos térben a „szorzás” maga az összeadás, a magasabb rendű tagok eltűnnek, így <span class="m">exp(v) = v</span>, azaz <span class="m">exp<sub>p</sub>(v) = p + v</span>. Görbült téren a tagok nem tűnnek el — ott lesz belőle a mátrix-exponenciális.</p></div><div class="bubble" id="gfGeoNote" role="dialog" aria-label="Mi az a geodetikus" hidden><p>A geodetikus két pont közötti legrövidebb út — a görbült terek „egyenese”.</p><p>Lapos <span class="m">ℝ<sup>n</sup></span>-ben egyenes szakasz; gömbön főkör-ív; <span class="m">SO(3)</span>-on állandó tengelyű forgatás. Az <span class="m">exp<sub>p</sub></span> mindig egy geodetikus mentén lép, egységnyi ideig.</p></div>'},
        {t:'Miért pont e?', b:'<p>Az előző kártya lábjegyzete kétszer is hivatkozott az <span class="m">e</span>-re: egyszer a hatványsorával, egyszer a <span class="m">(1 + v/n)<sup>n</sup></span> határértékkel. Mielőtt ebből <span class="m">⊞</span> lesz, érdemes tudni, honnan jön maga a szám.</p><p>Deriváljunk egy tetszőleges alapú exponenciálist a definícióból, és emeljük ki az <span class="m">a<sup>x</sup></span>-et:</p><p class="matline"><span class="m"><span class="frac"><span>d</span><span>dx</span></span> a<sup>x</sup> = a<sup>x</sup> · lim<sub>h→0</sub> <span class="frac"><span>a<sup>h</sup> − 1</span><span>h</span></span></span></p><p>A zárójel <strong>nem függ <span class="m">x</span>-től</strong> — egy szám, amit kizárólag az alap határoz meg. Nevezzük <span class="m">C<sub>a</sub></span>-nak. Vagyis <em>minden</em> exponenciális önmaga deriváltja, csak egy szorzó erejéig:</p><p class="matline"><span class="m">d/dx a<sup>x</sup> = C<sub>a</sub> · a<sup>x</sup></span></p><p>És mennyi ez a szám? Ha <span class="m">h → 0</span>, akkor a számláló is, a nevező is nullába megy: <span class="m">0/0</span>. A kérdés tehát nem az, hogy nullához tartanak-e, hanem hogy <button class="termbtn" id="gfCaInfo" type="button" aria-expanded="false" aria-controls="gfCaNote">milyen sebességgel egymáshoz képest</button> — ez a versenyfutás.</p><p class="matline"><span class="m">a = 2 &nbsp;→&nbsp; C ≈ 0,69</span></p><p class="matline"><span class="m">a = 3 &nbsp;→&nbsp; C ≈ 1,10</span></p><p>Az egyiknél a számláló lassabban fogy a nevezőnél, a másiknál gyorsabban. <span class="m">C<sub>a</sub></span> pedig folytonosan nő az alapban — tehát <strong>van pontosan egy alap 2 és 3 között, ahol a versenyfutás döntetlen.</strong> Ez az <span class="m">e</span>: nem választás, hanem metszéspont.</p><p>A jelenetben ez a szelők meredeksége. Ahogy <span class="m">h</span> fogy, a teál <span class="m">0,69</span>-hez húz, a lila <span class="m">1,10</span>-hez, és csak a borostyán fekszik rá a zöld szaggatott vonalra, aminek a meredeksége pontosan <span class="m">1</span>.</p><p>Írjuk fel, mit jelent a döntetlen, és emeljük mindkét oldalt <span class="m">1/h</span>-adik hatványra:</p><p class="matline"><span class="m">e<sup>h</sup> ≈ 1 + h &nbsp;⟹&nbsp; e ≈ (1 + h)<sup>1/h</sup></span></p><p class="matline"><span class="m">e = lim<sub>n→∞</sub> (1 + 1/n)<sup>n</sup> ≈ 2,71828</span></p><p><strong>A kamatos kamat tehát nem szemléltetés, hanem maga a definíció.</strong> Ezért bukkan fel változatlanul minden szinten: <span class="m">(1 + iα/n)<sup>n</sup></span> a körön, <span class="m">(I + X/n)<sup>n</sup></span> a következő állomáson. Ugyanaz az egy határérték, más objektumokkal. <button class="termbtn" id="gfSerInfo" type="button" aria-expanded="false" aria-controls="gfSerNote">A hatványsor ugyanezt mondja</button>, más alakban.</p><div class="bubble" id="gfCaNote" role="dialog" aria-label="A hatarertek zart alakja" hidden><p>A <span class="m">t = a<sup>h</sup> − 1</span> helyettesítéssel a határérték zárt alakra hozható:</p><p class="matline"><span class="m">C<sub>a</sub> = lim<sub>t→0</sub> <span class="frac"><span>t</span><span>log<sub>a</sub>(1 + t)</span></span> = <span class="frac"><span>1</span><span>log<sub>a</sub> K</span></span></span></p><p>ahol <span class="m">K = lim<sub>t→0</sub>(1 + t)<sup>1/t</sup></span> — egy alaptól független univerzális konstans. A <span class="m">C<sub>a</sub> = 1</span> feltétel tehát szó szerint annyit mond, hogy <span class="m">a = K</span>.</p><p>Vagyis a „melyik alapnál lesz a derivált tényező 1” és a „mi a <span class="m">(1 + 1/n)<sup>n</sup></span> határértéke” <em>ugyanaz a kérdés</em>, kétféleképp feltéve. Innen a szokásos alak is: <span class="m">C<sub>a</sub> = ln a</span>.</p></div><div class="bubble" id="gfSerNote" role="dialog" aria-label="A sor onmagat reprodukalja" hidden><p>A <span class="m">e<sup>x</sup></span> hatványsorát tagonként deriválva a konstans kiesik, a többi tag pedig a <span class="m">k!</span> miatt <strong>eggyel balra csúszik</strong>:</p><p class="matline"><span class="m">e<sup>x</sup> = 1 + x + <span class="frac"><span>x<sup>2</sup></span><span>2!</span></span> + <span class="frac"><span>x<sup>3</sup></span><span>3!</span></span> + …</span></p><p class="matline"><span class="m">→ 0 + 1 + <span class="frac"><span>2x</span><span>2!</span></span> + <span class="frac"><span>3x<sup>2</sup></span><span>3!</span></span> + … = e<sup>x</sup></span></p><p>A sor szerkezete pontosan önmagát reprodukálja. A <span class="m">ẏ = y</span> egyenlet tehát nem csak teljesül — <em>látszik</em> a sor alakján.</p><p>És ez az a forma, ami mátrixra is átvihető: írj <span class="m">x</span> helyére <span class="m">A</span>-t, és ugyanaz a számolás adja az <span class="m">exp(A)</span>-t.</p></div>'},
        {t:'A ⊞ három axiómája', b:'<p>Az előbb a lépés <span class="m">exp<sub>p</sub>(v) = p + v</span> volt, mert a geodetikus egyenes. Görbült téren a lépés jele <span class="m">⊞</span>. De mi <em>lehet</em> egyáltalán a <span class="m">⊞</span>? Kiderül: nem sok minden. Három ártalmatlan elvárás egyetlen képletet hagy életben.</p><p class="matline"><span class="m">p ⊞ 0 = p</span></p><p class="matline"><span class="m">(p ⊞ t<sub>1</sub>v) ⊞ t<sub>2</sub>v = p ⊞ (t<sub>1</sub> + t<sub>2</sub>)v</span></p><p class="matline"><span class="m"><span class="frac"><span>d</span><span>dt</span></span> (p ⊞ tv) |<sub>t=0</sub> = v</span></p><p>Sorban: nulla lépés nem mozdít; két lépés ugyanabba az irányba egy nagyobb lépés; és a <span class="m">v</span> tényleg az a sebesség, amivel indulunk. Egyikben sincs exponenciális — egyikben sincs <em>képlet</em>. Mind a három csak annyit mond, hogy a mozgás legyen sima és önmagával konzisztens.</p><p>A sokaság pontjait nem adhatjuk össze. A csoport elemei viszont <em>transzformációként hatnak</em> rájuk: legyen <span class="m">g(t)</span> az a transzformáció, ami a <span class="m">tv</span> lépést végzi. Bontsuk a lépést <span class="m">n</span> egyenlő darabra — a 2. axióma szerint ez ugyanoda visz, és a transzformációk <button class="termbtn" id="gfMulInfo" type="button" aria-expanded="false" aria-controls="gfMulNote">összeszorzódnak</button>:</p><p class="matline"><span class="m">p ⊞ v = [ g(1/n) ]<sup>n</sup> · p</span></p><p>Mi <span class="m">g(0)</span>? A mozdulatlanság — vagyis a csoport egységeleme, mátrixalakban az <span class="m">I</span>. <strong>Innen jön az <span class="m">I</span></strong>, ami a képletben mindig a semmiből érkezni látszik. Mivel <span class="m">1/n</span> infinitezimális, fejtsük sorba <span class="m">g</span>-t a nulla körül:</p><p class="matline"><span class="m">g(1/n) = I + X/n + O(1/n<sup>2</sup>)</span></p><p>ahol <span class="m">X = g′(0)</span> az egységelemben vett sebesség — pontosan egy Lie-algebra-elem. Visszahelyettesítve:</p><p class="matline"><span class="m">p ⊞ v = lim<sub>n→∞</sub> (I + X/n)<sup>n</sup> · p = exp(X) · p</span></p><p>Ez ugyanaz a határérték, mint az előző kártyán, csak <span class="m">1/n</span> helyett <span class="m">X/n</span>-nel. A jelenetben a borostyán töröttvonal szó szerint ez: <em>minden csúcsa egy <span class="m">(I + X/n)</span> szorzás</em>, normálás nélkül. <span class="m">n = 1</span>-nél az egyetlen nagy lépés kilóg a gömbből; ahogy <span class="m">n</span> nő, a töröttvonal ráfekszik a zöld geodetikusra.</p><p><strong>Vagyis a ⊞ nem definíció, hanem tétel.</strong> Nem azért <span class="m">exp</span>, mert kényelmes, vagy mert történetesen megőrzi a kényszert — hanem mert a simaság és az összefűzhetőség együtt <em>nem enged mást</em>. Hogy a kilógás miért tűnik el a határértékben, azt rendekre bontva az <span class="m">SO(2)</span> hold számolja ki.</p><p>És ugyanez a konstrukció négy szinten, mindig ugyanazzal a differenciálegyenlettel:</p><p class="matline"><span class="m">ℝ: &nbsp; ẏ = c·y &nbsp;→&nbsp; e<sup>c</sup></span></p><p class="matline"><span class="m">S<sup>1</sup> ⊂ ℂ: &nbsp; ẏ = i·y &nbsp;→&nbsp; cos θ + i sin θ</span></p><p class="matline"><span class="m">Lie-csoport: &nbsp; γ̇ = X·γ &nbsp;→&nbsp; exp(X)</span></p><p class="matline"><span class="m">sokaság: &nbsp; ∇<sub>γ̇</sub> γ̇ = 0 &nbsp;→&nbsp; γ(1)</span></p><p>Minden sor ugyanazt mondja: <em>a változás üteme arányos a pillanatnyi helyzettel</em>. Sorról sorra csak az változik, mit jelent a szorzás.</p><div class="bubble" id="gfMulNote" role="dialog" aria-label="Honnan a hatvanyozas" hidden><p>A 2. axióma szerint <span class="m">n</span> darab <span class="m">v/n</span> lépés egyenértékű egyetlen <span class="m">v</span> lépéssel:</p><p class="matline"><span class="m">p ⊞ v = ( … (p ⊞ v/n) ⊞ … ⊞ v/n )</span></p><p>Minden egyes <span class="m">⊞</span> a háttérben egy transzformáció alkalmazása, és transzformációkat egymás után alkalmazni annyi, mint <strong>összeszorozni</strong> őket. Ugyanaz a lépés <span class="m">n</span>-szer ugyanaz a tényező <span class="m">n</span>-szer:</p><p class="matline"><span class="m">g(1/n) · g(1/n) · … · g(1/n) = [ g(1/n) ]<sup>n</sup></span></p><p>Itt születik a hatványozás. Nem a <em>pontot</em> emeljük hatványra — pontok szorzata értelmetlen —, hanem a transzformációt. A hatvány a kompozíció könyvelése.</p></div>'}
      ],
      en: [
        {t:'The Flat World', b:'<p>The parameter space is the familiar <span class="m">ℝ<sup>n</sup></span>: a point <span class="m">w = (w<sub>1</sub>, …, w<sub>n</sub>)</span> is just <span class="m">n</span> real numbers. The coral/teal/violet <button class="termbtn" id="gfTriadInfo" type="button" aria-expanded="false" aria-controls="gfTriadNote">triad</button> is the standard basis, the grid the coordinates.</p><p>What we get for free here: no constraint. Step from anywhere in any direction and the result is still a point of <span class="m">ℝ<sup>n</sup></span> — there is nowhere to step off to. This is the comfort we lose on curved spaces (<span class="m">SO(3)</span>, <span class="m">SE(3)</span>), and exactly the recipe we want to carry over there.</p><div class="bubble" id="gfTriadNote" role="dialog" aria-label="What is the triad" hidden><p>The three axis arrows are the standard basis: <span class="m">e<sub>1</sub>, e<sub>2</sub>, e<sub>3</sub></span> — the coordinate axes.</p><p class="matline"><span class="m">w = w<sub>1</sub>e<sub>1</sub> + w<sub>2</sub>e<sub>2</sub> + w<sub>3</sub>e<sub>3</sub></span></p><p>The numbers <span class="m">w<sub>i</sub></span> are the coordinates of the point.</p></div>'},
        {t:'The Tangent Space', b:'<p>The <em>tangent space</em> at a point <span class="m">p</span> is all the velocity vectors you can pass through <span class="m">p</span> with. Take a curve <span class="m">γ(t)</span> with <span class="m">γ(0) = p</span> — its velocity, <span class="m">γ′(0)</span>, is a tangent vector.</p><p>In flat space a straight line is <span class="m">γ(t) = p + t·v</span>, with velocity <span class="m">γ′(0) = v</span>, and <span class="m">v</span> can be anything. So the tangent space is all of <span class="m">ℝ<sup>n</sup></span>, the same at every point:</p><p class="matline"><span class="m">T<sub>p</sub>ℝ<sup>n</sup> ≅ ℝ<sup>n</sup></span></p><p>That is why points and vectors merge here. On a manifold, though, the tangent space changes point to point and is <em>not</em> the ambient space — there <span class="m">v</span> can no longer be slid freely from its basepoint.</p>'},
        {t:'The Step: exp = Addition', b:'<p>The <button class="termbtn" id="gfExpInfo" type="button" aria-expanded="false" aria-controls="gfExpNote">exp</button><sub>p</sub> map sends a tangent vector <span class="m">v</span> to a point: start at <span class="m">p</span> with initial velocity <span class="m">v</span>, follow the <button class="termbtn" id="gfGeoInfo" type="button" aria-expanded="false" aria-controls="gfGeoNote">geodesic</button>, and travel for <em>unit</em> time. In flat space the geodesic is a straight line, <span class="m">γ(t) = p + t·v</span>, so:</p><p class="matline"><span class="m">exp<sub>p</sub>(v) = γ(1) = p + v</span></p><p>Concretely, in the scene <span class="m">p = (−2, 1, −1)</span> and <span class="m">v = (3, 1, 2)</span> — the ball walks exactly this step:</p><p class="matline"><span class="m">exp<sub>p</sub>(v) = (−2, 1, −1) + (3, 1, 2) = (1, 2, 1)</span></p><p>That is why the step here is “just addition” — component by component. In the curved world the definition is the <em>same</em>, but the geodesic is an arc: on <span class="m">SO(3)</span>, <span class="m">exp</span> is the matrix exponential and <span class="m">+</span> becomes <span class="m">⊞</span>.</p><div class="bubble" id="gfExpNote" role="dialog" aria-label="Why exp" hidden><p><span class="m">exp</span> is the <em>exponential function</em>. The power series of the real <span class="m">e<sup>x</sup></span>:</p><p class="matline"><span class="m">e<sup>x</sup> = 1 + x + <span class="frac"><span>x<sup>2</sup></span><span>2!</span></span> + <span class="frac"><span>x<sup>3</sup></span><span>3!</span></span> + …</span></p><p>The same series works for vectors and matrices. The key property:</p><p class="matline"><span class="m">e<sup>a+b</sup> = e<sup>a</sup> · e<sup>b</sup></span></p><p>that is, it turns <strong>addition into multiplication</strong> (composition of transformations). Tangent vectors add; <span class="m">exp</span> carries that over to composing motions.</p><p>Concretely, as compound interest (split <span class="m">v</span> into <span class="m">n</span> tiny steps — that is the addition!):</p><p class="matline"><span class="m">exp(v) = lim<sub>n→∞</sub> (1 + <span class="frac"><span>v</span><span>n</span></span>)<sup>n</sup></span></p><p>In flat space the “multiplication” is just addition and the higher-order terms vanish, so <span class="m">exp(v) = v</span>, i.e. <span class="m">exp<sub>p</sub>(v) = p + v</span>. On curved spaces the terms do not vanish — there it becomes the matrix exponential.</p></div><div class="bubble" id="gfGeoNote" role="dialog" aria-label="What is a geodesic" hidden><p>A geodesic is the shortest path between two points — the “straight line” of curved spaces.</p><p>On flat <span class="m">ℝ<sup>n</sup></span> it is a straight segment; on a sphere, a great-circle arc; on <span class="m">SO(3)</span>, a rotation about a fixed axis. <span class="m">exp<sub>p</sub></span> always steps along a geodesic, for unit time.</p></div>'},
        {t:'Why e, of All Numbers?', b:'<p>The last card’s footnote leaned on <span class="m">e</span> twice — once for its power series, once for the limit <span class="m">(1 + v/n)<sup>n</sup></span> — without either being earned. Before that limit turns into <span class="m">⊞</span>, it is worth knowing where the number itself comes from.</p><p>Differentiate an exponential of arbitrary base straight from the definition, and factor out <span class="m">a<sup>x</sup></span>:</p><p class="matline"><span class="m"><span class="frac"><span>d</span><span>dx</span></span> a<sup>x</sup> = a<sup>x</sup> · lim<sub>h→0</sub> <span class="frac"><span>a<sup>h</sup> − 1</span><span>h</span></span></span></p><p>The bracket <strong>does not depend on <span class="m">x</span></strong> — it is a number fixed by the base alone. Call it <span class="m">C<sub>a</sub></span>. So <em>every</em> exponential is its own derivative, up to one factor:</p><p class="matline"><span class="m">d/dx a<sup>x</sup> = C<sub>a</sub> · a<sup>x</sup></span></p><p>And how big is that number? As <span class="m">h → 0</span> both the numerator and the denominator go to zero: <span class="m">0/0</span>. The question is therefore not <em>whether</em> they vanish but <button class="termbtn" id="gfCaInfo" type="button" aria-expanded="false" aria-controls="gfCaNote">how fast, relative to each other</button> — a race.</p><p class="matline"><span class="m">a = 2 &nbsp;→&nbsp; C ≈ 0.69</span></p><p class="matline"><span class="m">a = 3 &nbsp;→&nbsp; C ≈ 1.10</span></p><p>For one the numerator drains slower than the denominator, for the other faster. And <span class="m">C<sub>a</sub></span> grows continuously with the base — so <strong>there is exactly one base between 2 and 3 where the race is a draw.</strong> That is <span class="m">e</span>: not a choice, a crossing point.</p><p>In the scene that is the slope of the secants. As <span class="m">h</span> shrinks, the teal one settles on <span class="m">0.69</span> and the violet on <span class="m">1.10</span>; only the amber one lies down on the green dashed reference, whose slope is exactly <span class="m">1</span>.</p><p>Write out what the draw means, and raise both sides to the <span class="m">1/h</span> power:</p><p class="matline"><span class="m">e<sup>h</sup> ≈ 1 + h &nbsp;⟹&nbsp; e ≈ (1 + h)<sup>1/h</sup></span></p><p class="matline"><span class="m">e = lim<sub>n→∞</sub> (1 + 1/n)<sup>n</sup> ≈ 2.71828</span></p><p><strong>Compound interest is therefore not an illustration — it is the definition.</strong> Which is why the same shape reappears untouched at every level: <span class="m">(1 + iα/n)<sup>n</sup></span> on the circle, <span class="m">(I + X/n)<sup>n</sup></span> on the next station. One limit, different objects. <button class="termbtn" id="gfSerInfo" type="button" aria-expanded="false" aria-controls="gfSerNote">The power series says the same thing</button> in another form.</p><div class="bubble" id="gfCaNote" role="dialog" aria-label="The limit in closed form" hidden><p>Substituting <span class="m">t = a<sup>h</sup> − 1</span> puts the limit in closed form:</p><p class="matline"><span class="m">C<sub>a</sub> = lim<sub>t→0</sub> <span class="frac"><span>t</span><span>log<sub>a</sub>(1 + t)</span></span> = <span class="frac"><span>1</span><span>log<sub>a</sub> K</span></span></span></p><p>where <span class="m">K = lim<sub>t→0</sub>(1 + t)<sup>1/t</sup></span> is a universal constant with no base in it. The condition <span class="m">C<sub>a</sub> = 1</span> then says literally <span class="m">a = K</span>.</p><p>So “which base makes the derivative factor 1?” and “what is the limit of <span class="m">(1 + 1/n)<sup>n</sup></span>?” are <em>the same question</em>, asked twice. The familiar form follows: <span class="m">C<sub>a</sub> = ln a</span>.</p></div><div class="bubble" id="gfSerNote" role="dialog" aria-label="The series reproduces itself" hidden><p>Differentiate the series for <span class="m">e<sup>x</sup></span> term by term: the constant drops out, and every other term <strong>shifts one place left</strong>, because of the <span class="m">k!</span>:</p><p class="matline"><span class="m">e<sup>x</sup> = 1 + x + <span class="frac"><span>x<sup>2</sup></span><span>2!</span></span> + <span class="frac"><span>x<sup>3</sup></span><span>3!</span></span> + …</span></p><p class="matline"><span class="m">→ 0 + 1 + <span class="frac"><span>2x</span><span>2!</span></span> + <span class="frac"><span>3x<sup>2</sup></span><span>3!</span></span> + … = e<sup>x</sup></span></p><p>The structure of the series reproduces itself exactly. So <span class="m">ẏ = y</span> does not merely hold — it is <em>visible</em> in the shape of the series.</p><p>And this is the form that survives the move to matrices: write <span class="m">A</span> where <span class="m">x</span> stood, and the same computation gives <span class="m">exp(A)</span>.</p></div>'},
        {t:'The Three ⊞ Axioms', b:'<p>A moment ago the step was <span class="m">exp<sub>p</sub>(v) = p + v</span>, because the geodesic was a straight line. On a curved space the step is written <span class="m">⊞</span>. But what <em>can</em> <span class="m">⊞</span> be? Not much, as it turns out. Three harmless demands leave exactly one formula standing.</p><p class="matline"><span class="m">p ⊞ 0 = p</span></p><p class="matline"><span class="m">(p ⊞ t<sub>1</sub>v) ⊞ t<sub>2</sub>v = p ⊞ (t<sub>1</sub> + t<sub>2</sub>)v</span></p><p class="matline"><span class="m"><span class="frac"><span>d</span><span>dt</span></span> (p ⊞ tv) |<sub>t=0</sub> = v</span></p><p>In order: a zero step moves nothing; two steps in the same direction are one bigger step; and <span class="m">v</span> really is the velocity you leave with. None of them contains an exponential — none of them contains a <em>formula</em>. All three only ask that the motion be smooth and consistent with itself.</p><p>Points of a manifold cannot be added. Group elements, however, <em>act on them as transformations</em>: let <span class="m">g(t)</span> be the transformation that performs the <span class="m">tv</span> step. Cut the step into <span class="m">n</span> equal pieces — by axiom 2 that lands in the same place, and the transformations <button class="termbtn" id="gfMulInfo" type="button" aria-expanded="false" aria-controls="gfMulNote">multiply together</button>:</p><p class="matline"><span class="m">p ⊞ v = [ g(1/n) ]<sup>n</sup> · p</span></p><p>What is <span class="m">g(0)</span>? Standing still — that is, the identity element of the group, which in matrix form is <span class="m">I</span>. <strong>That is where the <span class="m">I</span> comes from</strong>, the one that always seems to arrive out of nowhere. Since <span class="m">1/n</span> is infinitesimal, expand <span class="m">g</span> about zero:</p><p class="matline"><span class="m">g(1/n) = I + X/n + O(1/n<sup>2</sup>)</span></p><p>where <span class="m">X = g′(0)</span> is the velocity at the identity — precisely a Lie algebra element. Substituting back:</p><p class="matline"><span class="m">p ⊞ v = lim<sub>n→∞</sub> (I + X/n)<sup>n</sup> · p = exp(X) · p</span></p><p>The same limit as on the last card, with <span class="m">X/n</span> where <span class="m">1/n</span> stood. In the scene the amber polygon is literally that: <em>one <span class="m">(I + X/n)</span> multiplication per vertex</em>, with no renormalising. At <span class="m">n = 1</span> the single big step juts out of the sphere; as <span class="m">n</span> grows, the polygon settles onto the green geodesic.</p><p><strong>So ⊞ is not a definition but a theorem.</strong> It is <span class="m">exp</span> not because that is convenient, nor because it happens to preserve the constraint, but because smoothness and composability together <em>permit nothing else</em>. Why the overshoot disappears in the limit is worked out order by order on the <span class="m">SO(2)</span> moon.</p><p>And the same construction runs at four levels, always off the same differential equation:</p><p class="matline"><span class="m">ℝ: &nbsp; ẏ = c·y &nbsp;→&nbsp; e<sup>c</sup></span></p><p class="matline"><span class="m">S<sup>1</sup> ⊂ ℂ: &nbsp; ẏ = i·y &nbsp;→&nbsp; cos θ + i sin θ</span></p><p class="matline"><span class="m">Lie group: &nbsp; γ̇ = X·γ &nbsp;→&nbsp; exp(X)</span></p><p class="matline"><span class="m">manifold: &nbsp; ∇<sub>γ̇</sub> γ̇ = 0 &nbsp;→&nbsp; γ(1)</span></p><p>Every row says the same thing: <em>the rate of change is proportional to the present position</em>. All that changes from row to row is what multiplication means.</p><div class="bubble" id="gfMulNote" role="dialog" aria-label="Where the power comes from" hidden><p>By axiom 2, <span class="m">n</span> steps of <span class="m">v/n</span> are the same as one step of <span class="m">v</span>:</p><p class="matline"><span class="m">p ⊞ v = ( … (p ⊞ v/n) ⊞ … ⊞ v/n )</span></p><p>Each <span class="m">⊞</span> applies a transformation behind the scenes, and applying transformations one after another is <strong>multiplying</strong> them. The same step <span class="m">n</span> times is the same factor <span class="m">n</span> times:</p><p class="matline"><span class="m">g(1/n) · g(1/n) · … · g(1/n) = [ g(1/n) ]<sup>n</sup></span></p><p>This is where the power is born. It is not the <em>point</em> being raised to a power — a product of points is meaningless — but the transformation. The exponent is the bookkeeping of composition.</p></div>'}
      ],
      ja: [
        {t:'平坦な世界', b:'<p>パラメータ空間は、おなじみの <span class="m">ℝ<sup>n</sup></span> です。点 <span class="m">w = (w<sub>1</sub>, …, w<sub>n</sub>)</span> は単に <span class="m">n</span> 個の実数を並べたものにすぎません。珊瑚色・青緑・菫色の<button class="termbtn" id="gfTriadInfo" type="button" aria-expanded="false" aria-controls="gfTriadNote">三本組</button>が標準基底、格子が座標です。</p><p>ここで何もしなくても手に入るのは、拘束がないという性質です。どこからどの向きに踏み出しても、結果はやはり <span class="m">ℝ<sup>n</sup></span> の点のままで、はみ出す先がそもそもありません。この快適さを、曲がった空間（<span class="m">SO(3)</span> や <span class="m">SE(3)</span>）では失います。そして、まさにこの手順をそちらへ持って行きたいのです。</p><div class="bubble" id="gfTriadNote" role="dialog" aria-label="三本組とは" hidden><p>三本の軸の矢印が標準基底です。<span class="m">e<sub>1</sub>, e<sub>2</sub>, e<sub>3</sub></span>、つまり座標軸のことです。</p><p class="matline"><span class="m">w = w<sub>1</sub>e<sub>1</sub> + w<sub>2</sub>e<sub>2</sub> + w<sub>3</sub>e<sub>3</sub></span></p><p>数 <span class="m">w<sub>i</sub></span> が、その点の座標にあたります。</p></div>'},
        {t:'接空間', b:'<p>点 <span class="m">p</span> における<em>接空間</em>とは、<span class="m">p</span> を通り抜けるときに取りうる速度ベクトルを、すべて集めたものです。<span class="m">γ(0) = p</span> となる曲線 <span class="m">γ(t)</span> を取ると、その速度 <span class="m">γ′(0)</span> が接ベクトルになります。</p><p>平坦な空間では直線が <span class="m">γ(t) = p + t·v</span>、その速度が <span class="m">γ′(0) = v</span> で、<span class="m">v</span> は何でも構いません。つまり接空間は <span class="m">ℝ<sup>n</sup></span> 全体で、しかもどの点でも同じです。</p><p class="matline"><span class="m">T<sub>p</sub>ℝ<sup>n</sup> ≅ ℝ<sup>n</sup></span></p><p>ですからここでは、点とベクトルの区別が消えてしまいます。ところが多様体の上では、接空間は点ごとに変わり、しかも周囲の空間とは<em>別物</em>です。そこではもう、<span class="m">v</span> を基点から自由に動かせません。</p>'},
        {t:'ステップ：exp は足し算', b:'<p><button class="termbtn" id="gfExpInfo" type="button" aria-expanded="false" aria-controls="gfExpNote">exp</button><sub>p</sub> という写像は、接ベクトル <span class="m">v</span> を点へ送ります。<span class="m">p</span> から初速 <span class="m">v</span> で出発し、<button class="termbtn" id="gfGeoInfo" type="button" aria-expanded="false" aria-controls="gfGeoNote">測地線</button>に沿って<em>単位</em>時間だけ進む、という意味です。平坦な空間では測地線が直線 <span class="m">γ(t) = p + t·v</span> なので、こうなります。</p><p class="matline"><span class="m">exp<sub>p</sub>(v) = γ(1) = p + v</span></p><p>具体的に見てみましょう。このシーンでは <span class="m">p = (−2, 1, −1)</span>、<span class="m">v = (3, 1, 2)</span> で、球はまさにこの一歩を歩きます。</p><p class="matline"><span class="m">exp<sub>p</sub>(v) = (−2, 1, −1) + (3, 1, 2) = (1, 2, 1)</span></p><p>ですからここでは、一歩が「ただの足し算」、それも成分ごとの足し算です。曲がった世界でも定義は<em>まったく同じ</em>で、測地線が弧になるだけです。<span class="m">SO(3)</span> では <span class="m">exp</span> が行列指数関数になり、<span class="m">+</span> が <span class="m">⊞</span> になります。</p><div class="bubble" id="gfExpNote" role="dialog" aria-label="なぜ exp なのか" hidden><p><span class="m">exp</span> は<em>指数関数</em>です。実数の <span class="m">e<sup>x</sup></span> のべき級数はこうでした。</p><p class="matline"><span class="m">e<sup>x</sup> = 1 + x + <span class="frac"><span>x<sup>2</sup></span><span>2!</span></span> + <span class="frac"><span>x<sup>3</sup></span><span>3!</span></span> + …</span></p><p>同じ級数は、ベクトルにも行列にも効きます。鍵になる性質はこれです。</p><p class="matline"><span class="m">e<sup>a+b</sup> = e<sup>a</sup> · e<sup>b</sup></span></p><p>つまり<strong>足し算を掛け算</strong>、すなわち変換の合成へ移します。接ベクトルは足し合わせるもので、<span class="m">exp</span> はそれを運動の合成へ運ぶものです。</p><p>複利の形でも書けます。<span class="m">v</span> を <span class="m">n</span> 個の小さな一歩に分ける、つまり足し算にするわけです。</p><p class="matline"><span class="m">exp(v) = lim<sub>n→∞</sub> (1 + <span class="frac"><span>v</span><span>n</span></span>)<sup>n</sup></span></p><p>平坦な空間では「掛け算」がそのまま足し算で、高次の項は消えます。ですから <span class="m">exp(v) = v</span>、すなわち <span class="m">exp<sub>p</sub>(v) = p + v</span> です。曲がった空間では項が消えず、そこで行列指数関数が必要になります。</p></div><div class="bubble" id="gfGeoNote" role="dialog" aria-label="測地線とは" hidden><p>測地線は二点を結ぶ最短経路で、曲がった空間における「直線」にあたります。</p><p>平坦な <span class="m">ℝ<sup>n</sup></span> では線分、球面では大円の弧、<span class="m">SO(3)</span> では軸を固定した回転です。<span class="m">exp<sub>p</sub></span> はつねに測地線に沿って、単位時間だけ進みます。</p></div>'},
        {t:'なぜ e なのか', b:'<p>前のカードの脚注は <span class="m">e</span> を二度使いました。一度はべき級数として、もう一度は <span class="m">(1 + v/n)<sup>n</sup></span> の極限としてです。この極限が <span class="m">⊞</span> になる前に、その数そのものがどこから来るのかを見ておく価値があります。</p><p>任意の底の指数関数を定義どおりに微分し、<span class="m">a<sup>x</sup></span> をくくり出します。</p><p class="matline"><span class="m"><span class="frac"><span>d</span><span>dx</span></span> a<sup>x</sup> = a<sup>x</sup> · lim<sub>h→0</sub> <span class="frac"><span>a<sup>h</sup> − 1</span><span>h</span></span></span></p><p>括弧の中は <strong><span class="m">x</span> に依存しません</strong>。底だけで決まる、一つの数です。これを <span class="m">C<sub>a</sub></span> と呼びましょう。つまり<em>どの</em>指数関数も、係数一つの違いを除いて自分自身の微分になっています。</p><p class="matline"><span class="m">d/dx a<sup>x</sup> = C<sub>a</sub> · a<sup>x</sup></span></p><p>ではその数はいくつでしょうか。<span class="m">h → 0</span> のとき、分子も分母も 0 に向かいます。<span class="m">0/0</span> の形です。問題は 0 に向かうかどうかではなく、<button class="termbtn" id="gfCaInfo" type="button" aria-expanded="false" aria-controls="gfCaNote">互いにどれだけの速さで向かうか</button>です。いわば競争です。</p><p class="matline"><span class="m">a = 2 &nbsp;→&nbsp; C ≈ 0.69</span></p><p class="matline"><span class="m">a = 3 &nbsp;→&nbsp; C ≈ 1.10</span></p><p>一方は分子が分母より遅く減り、他方は速く減ります。しかも <span class="m">C<sub>a</sub></span> は底について連続に増えます。<strong>したがって 2 と 3 のあいだに、競争が引き分けになる底がちょうど一つ存在します。</strong>それが <span class="m">e</span> です。選択ではなく、交点なのです。</p><p>シーンでは、それが割線の傾きとして見えます。<span class="m">h</span> が縮むにつれ、青緑は <span class="m">0.69</span> へ、菫色は <span class="m">1.10</span> へ寄っていきます。琥珀色だけが、傾きちょうど <span class="m">1</span> の緑の破線に重なります。</p><p>引き分けが何を意味するかを書き、両辺を <span class="m">1/h</span> 乗してみましょう。</p><p class="matline"><span class="m">e<sup>h</sup> ≈ 1 + h &nbsp;⟹&nbsp; e ≈ (1 + h)<sup>1/h</sup></span></p><p class="matline"><span class="m">e = lim<sub>n→∞</sub> (1 + 1/n)<sup>n</sup> ≈ 2.71828</span></p><p><strong>つまり複利は喩えではなく、定義そのものです。</strong>だからこそ同じ形が、どの階層にもそのまま現れます。円の上では <span class="m">(1 + iα/n)<sup>n</sup></span>、次のステーションでは <span class="m">(I + X/n)<sup>n</sup></span>。極限は一つで、対象が違うだけです。<button class="termbtn" id="gfSerInfo" type="button" aria-expanded="false" aria-controls="gfSerNote">べき級数も同じことを言っています</button>。別の形で、ですが。</p><div class="bubble" id="gfCaNote" role="dialog" aria-label="極限の閉じた形" hidden><p><span class="m">t = a<sup>h</sup> − 1</span> と置くと、極限は閉じた形になります。</p><p class="matline"><span class="m">C<sub>a</sub> = lim<sub>t→0</sub> <span class="frac"><span>t</span><span>log<sub>a</sub>(1 + t)</span></span> = <span class="frac"><span>1</span><span>log<sub>a</sub> K</span></span></span></p><p>ここで <span class="m">K = lim<sub>t→0</sub>(1 + t)<sup>1/t</sup></span> は、底を含まない普遍定数です。すると <span class="m">C<sub>a</sub> = 1</span> という条件は、文字どおり <span class="m">a = K</span> を意味します。</p><p>つまり「どの底で微分の係数が 1 になるか」と「<span class="m">(1 + 1/n)<sup>n</sup></span> の極限は何か」は、<em>同じ問い</em>を二通りに述べたものです。おなじみの形も、ここから従います。<span class="m">C<sub>a</sub> = ln a</span> です。</p></div><div class="bubble" id="gfSerNote" role="dialog" aria-label="級数が自分自身を再生する" hidden><p><span class="m">e<sup>x</sup></span> の級数を項ごとに微分すると、定数項は消えます。残りの項は <span class="m">k!</span> のおかげで、<strong>一つずつ左へずれます</strong>。</p><p class="matline"><span class="m">e<sup>x</sup> = 1 + x + <span class="frac"><span>x<sup>2</sup></span><span>2!</span></span> + <span class="frac"><span>x<sup>3</sup></span><span>3!</span></span> + …</span></p><p class="matline"><span class="m">→ 0 + 1 + <span class="frac"><span>2x</span><span>2!</span></span> + <span class="frac"><span>3x<sup>2</sup></span><span>3!</span></span> + … = e<sup>x</sup></span></p><p>級数の構造が、そっくりそのまま自分を再生しました。ですから <span class="m">ẏ = y</span> は成り立つだけでなく、級数の形の上に<em>見えて</em>います。</p><p>そしてこの形は、行列へもそのまま移ります。<span class="m">x</span> のあったところに <span class="m">A</span> と書けば、同じ計算が <span class="m">exp(A)</span> を与えます。</p></div>'},
        {t:'⊞ の三つの公理', b:'<p>さきほどは測地線が直線だったので、一歩は <span class="m">exp<sub>p</sub>(v) = p + v</span> でした。曲がった空間では、この一歩を <span class="m">⊞</span> と書きます。では <span class="m">⊞</span> は<em>何でありうる</em>のでしょうか。実は、ほとんど選択肢がありません。三つの無害な要求が、たった一つの式だけを生き残らせます。</p><p class="matline"><span class="m">p ⊞ 0 = p</span></p><p class="matline"><span class="m">(p ⊞ t<sub>1</sub>v) ⊞ t<sub>2</sub>v = p ⊞ (t<sub>1</sub> + t<sub>2</sub>)v</span></p><p class="matline"><span class="m"><span class="frac"><span>d</span><span>dt</span></span> (p ⊞ tv) |<sub>t=0</sub> = v</span></p><p>順に読みましょう。ゼロの一歩は何も動かしません。同じ向きの二つの一歩は、一つの大きな一歩と同じです。そして <span class="m">v</span> は本当に出発時の速度です。どれにも指数関数は入っていませんし、そもそもどれにも<em>式</em>が入っていません。三つとも、運動が滑らかで、自分自身と整合的であることだけを要求しています。</p><p>多様体の点は足せません。しかし群の元は、点に<em>変換として作用します</em>。<span class="m">tv</span> の一歩を行う変換を <span class="m">g(t)</span> としましょう。この一歩を <span class="m">n</span> 等分すると、公理 2 によって同じ場所に着き、変換のほうは<button class="termbtn" id="gfMulInfo" type="button" aria-expanded="false" aria-controls="gfMulNote">掛け合わされます</button>。</p><p class="matline"><span class="m">p ⊞ v = [ g(1/n) ]<sup>n</sup> · p</span></p><p>では <span class="m">g(0)</span> は何でしょうか。静止、すなわち群の単位元で、行列で書けば <span class="m">I</span> です。<strong>ここが <span class="m">I</span> の出どころです。</strong>いつも何もないところから現れるように見える、あの <span class="m">I</span> です。<span class="m">1/n</span> は無限小なので、<span class="m">g</span> を 0 のまわりで展開します。</p><p class="matline"><span class="m">g(1/n) = I + X/n + O(1/n<sup>2</sup>)</span></p><p>ここで <span class="m">X = g′(0)</span> は単位元における速度で、まさにリー代数の元です。代入すると、こうなります。</p><p class="matline"><span class="m">p ⊞ v = lim<sub>n→∞</sub> (I + X/n)<sup>n</sup> · p = exp(X) · p</span></p><p>前のカードと同じ極限で、<span class="m">1/n</span> が <span class="m">X/n</span> になっただけです。シーンの琥珀色の折れ線が、まさにこれです。<em>頂点ごとに <span class="m">(I + X/n)</span> を一回掛ける</em>だけで、正規化はしません。<span class="m">n = 1</span> では一回の大きな一歩が球からはみ出し、<span class="m">n</span> を増やすと折れ線は緑の測地線に重なっていきます。</p><p><strong>つまり ⊞ は定義ではなく、定理です。</strong>これが <span class="m">exp</span> であるのは、便利だからでも、たまたま拘束を保つからでもありません。滑らかさと合成可能性の二つがそろうと、<em>他を許さなくなる</em>からです。はみ出しが極限でなぜ消えるのかは、<span class="m">SO(2)</span> の衛星が次数ごとに計算します。</p><p>そして同じ構成が四つの階層で、いつも同じ微分方程式から走ります。</p><p class="matline"><span class="m">ℝ: &nbsp; ẏ = c·y &nbsp;→&nbsp; e<sup>c</sup></span></p><p class="matline"><span class="m">S<sup>1</sup> ⊂ ℂ: &nbsp; ẏ = i·y &nbsp;→&nbsp; cos θ + i sin θ</span></p><p class="matline"><span class="m">リー群: &nbsp; γ̇ = X·γ &nbsp;→&nbsp; exp(X)</span></p><p class="matline"><span class="m">多様体: &nbsp; ∇<sub>γ̇</sub> γ̇ = 0 &nbsp;→&nbsp; γ(1)</span></p><p>どの行も同じことを言っています。<em>変化の速さは、今いる位置に比例する</em>。行から行へ変わるのは、掛け算が何を意味するかだけです。</p><div class="bubble" id="gfMulNote" role="dialog" aria-label="べきはどこから来るのか" hidden><p>公理 2 により、<span class="m">v/n</span> の一歩を <span class="m">n</span> 回重ねることは、<span class="m">v</span> の一歩を一回行うことと同じです。</p><p class="matline"><span class="m">p ⊞ v = ( … (p ⊞ v/n) ⊞ … ⊞ v/n )</span></p><p>各 <span class="m">⊞</span> は裏で変換を一つ適用しており、変換を次々に適用することは、変換を<strong>掛け合わせる</strong>ことです。同じ一歩が <span class="m">n</span> 回なら、同じ因子が <span class="m">n</span> 回です。</p><p class="matline"><span class="m">g(1/n) · g(1/n) · … · g(1/n) = [ g(1/n) ]<sup>n</sup></span></p><p>ここでべきが生まれます。べき乗されるのは<em>点</em>ではありません。点どうしの積は意味を持たないからです。べき乗されるのは変換のほうで、指数は合成の帳簿づけなのです。</p></div>'}
      ]
    }
  };
})();
