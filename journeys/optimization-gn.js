'use strict';
/* Journey: Gauss–Newton — the Optimization planet's second moon, after gradient descent.

   Three stations, deliberately shallow (docs/project/journey-status.md): why the objective
   is a sum of squares at all (MAP → least squares, the note the vault wanted as this
   journey's opening); the single approximation r ≈ r₀ + Jδ, out of which g and H fall; and
   the normal equation as the bottom of a parabola.

   Station 1 draws the actual argument: a Gaussian bell and, below it, its own negative
   logarithm — a parabola. The square is not a modelling choice, it is the shape of that
   curve, and the two riders share one r.

   Station 3 reuses `optimization-gd`'s bowl verbatim (Q = 0.64) and its starting point
   w₀ = (2.70, 1.90), so the comparison is exact rather than rhetorical: gradient descent
   multiplies by 0.8208 per step forever, Gauss–Newton lands in one — because on a genuinely
   quadratic cost the linearisation is exact. That is the vault's own checking observation
   (docs/optimization/gauss-newton.md), and the card says why it does NOT generalise.

   Everything here is flat ℝⁿ, per D3: the step is x₀ + δ, never x ⊞ δ. ⊞ is named as
   something the SLAM branch does, not used. Cards (hu/en/ja) in-file. Requires LIE.kit. */
window.LIE = window.LIE || {};
LIE.journeys = LIE.journeys || {};
LIE.journeys['optimization-gn'] = (function(){
  const K = LIE.kit;
  const { V3, ease, clamp, hexStr, fatArrow, setArrow, makeLabel } = K;

  // Station 3 sits further back than the gradient-descent moon's view of the same bowl:
  // there the subject is one ball near the bottom, here it is two whole paths across it.

  // Station 2's cost: L(x) = ½ r(x)² with a deliberately non-quadratic residual.
  const rOf  = x => Math.sin(1.15*x) + 0.32*x;
  const drOf = x => 1.15*Math.cos(1.15*x) + 0.32;
  const LOf  = x => 0.5*rOf(x)*rOf(x);

  // Station 3: the neighbouring moon's bowl and its numbers, unchanged.
  const Q = 0.64, ALPHA = 0.28, SHRINK = 1 - ALPHA*Q;      // 0.8208
  const W0 = [2.70, 1.90];

  function build(C, PAL){
    const COL = PAL || K.palette('dark');
    const HX = { teal:hexStr(COL.teal), coral:hexStr(COL.coral), violet:hexStr(COL.violet),
                 amber:hexStr(COL.amber), green:hexStr(COL.green), ink:hexStr(COL.ink) };

    function line(g, pts, color, op){
      const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({color, transparent:true, opacity:op===undefined?0.9:op}));
      g.add(l); return l;
    }
    function dot(g, color, r){
      const d = new THREE.Mesh(new THREE.SphereGeometry(r||0.1,14,12), new THREE.MeshBasicMaterial({color}));
      g.add(d); return d;
    }
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
      /* 0 · where the square comes from: a Gaussian, and directly below it its own negative
            logarithm. One rider on each, sharing the same r — the parabola is not a model
            of the bell, it IS its logarithm. */
      g=>{
        const RX = 1.02, RMAX = 2.7;
        const bellY = r => 1.30 + 1.62*Math.exp(-0.5*r*r);
        const paraY = r => -2.25 + 0.52*(0.5*r*r);

        const bell = [], para = [];
        for(let i=0;i<=110;i++){ const r = -RMAX + 2*RMAX*i/110;
          bell.push(V3(r*RX, bellY(r), 0)); para.push(V3(r*RX, paraY(r), 0)); }
        line(g, bell, COL.teal, 0.95);
        line(g, para, COL.amber, 0.95);
        line(g, [V3(-RMAX*RX,1.30,0), V3(RMAX*RX,1.30,0)], COL.grid1, 0.5);
        line(g, [V3(-RMAX*RX,-2.25,0), V3(RMAX*RX,-2.25,0)], COL.grid1, 0.5);
        line(g, [V3(0,-2.45,0), V3(0,3.05,0)], COL.grid2, 0.45);

        const rb = dot(g, COL.teal, 0.10), rp = dot(g, COL.amber, 0.10);
        const link = line(g, [V3(0,0,0), V3(0,0,0)], COL.ink, 0.3);
        const lb = makeLabel('p(r) = e^{−r²/2}', HX.teal, 3.5); lb.position.set(0, 3.35, 0); g.add(lb);
        const lp = makeLabel('−log p = r²/2', HX.amber, 3.2); lp.position.set(0, -2.95, 0); g.add(lp);

        return {tick(t){
          const r = RMAX*0.86*Math.sin(t*0.5);
          rb.position.set(r*RX, bellY(r), 0);
          rp.position.set(r*RX, paraY(r), 0);
          const a = link.geometry.attributes.position;
          a.setXYZ(0, r*RX, bellY(r), 0); a.setXYZ(1, r*RX, paraY(r), 0); a.needsUpdate = true;
        }};
      },

      /* 1 · the single approximation. Amber: the true cost L. Teal: the Gauss–Newton model
            ½(r₀ + Jδ)², rebuilt as x₀ slides — it meets L in value and slope at δ = 0, and
            its curvature is J²; nothing else is claimed for it. */
      g=>{
        const XS = 0.85, YS = 1.30, Y0 = -1.35, XMAX = 3.6;
        const px = x => x*XS, py = L => Y0 + L*YS;

        const curve = [];
        for(let i=0;i<=160;i++){ const x = -XMAX + 2*XMAX*i/160; curve.push(V3(px(x), py(LOf(x)), 0)); }
        line(g, curve, COL.amber, 0.95);
        line(g, [V3(px(-XMAX),Y0,0), V3(px(XMAX),Y0,0)], COL.grid1, 0.5);

        const NM = 60, DMAX = 1.45;
        const modelPts = [];
        for(let i=0;i<=NM;i++) modelPts.push(V3(0,0,0));
        const model = line(g, modelPts, COL.teal, 0.9);
        const here = dot(g, COL.coral, 0.105);
        const foot = line(g, [V3(0,0,0), V3(0,0,0)], COL.coral, 0.35);
        const lbl = makeLabel('r(δ) ≈ r₀ + J δ', HX.teal, 3.6); lbl.position.set(0, 3.0, 0); g.add(lbl);

        return {tick(t){
          const x0 = 2.15*Math.sin(t*0.28);
          const r0 = rOf(x0), J = drOf(x0);
          here.position.set(px(x0), py(LOf(x0)), 0);
          const a = foot.geometry.attributes.position;
          a.setXYZ(0, px(x0), Y0, 0); a.setXYZ(1, px(x0), py(LOf(x0)), 0); a.needsUpdate = true;
          const mp = model.geometry.attributes.position;
          for(let i=0;i<=NM;i++){
            const d = -DMAX + 2*DMAX*i/NM;
            const v = r0 + J*d;
            mp.setXYZ(i, px(x0 + d), py(0.5*v*v), 0);
          }
          mp.needsUpdate = true;
        }};
      },

      /* 2 · the normal equation on the gradient-descent moon's own bowl. Amber walks the
            geometric sequence 0.8208^k; green takes the single Gauss–Newton step. Same
            surface, same w₀ — the difference on screen is the difference in the maths. */
      g=>{
        const H = (x,z)=>0.5*Q*(x*x + z*z);
        const geo = new THREE.PlaneGeometry(7.4,7.4,30,30); geo.rotateX(-Math.PI/2);
        const pa = geo.attributes.position;
        for(let i=0;i<pa.count;i++) pa.setY(i, H(pa.getX(i), pa.getZ(i)));
        geo.computeVertexNormals();
        g.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({color:COL.teal, wireframe:true,
          transparent:true, opacity:0.26})));
        const grid = new THREE.GridHelper(7.4,14,COL.grid1,COL.grid2); grid.position.y = -0.02; g.add(grid);

        const NIT = 9;
        const chain = [];
        for(let k=0;k<=NIT;k++){
          const f = Math.pow(SHRINK,k), x = W0[0]*f, z = W0[1]*f;
          chain.push(V3(x, H(x,z)+0.04, z));
        }
        line(g, chain, COL.amber, 0.55);
        chain.forEach((p,k)=>{ if(k>0){ const d = dot(g, COL.amber, 0.06); d.position.copy(p); } });
        const start = V3(W0[0], H(W0[0],W0[1])+0.04, W0[1]);
        const goal  = V3(0, 0.04, 0);
        line(g, [start, goal], COL.green, 0.5);
        const minDot = dot(g, COL.green, 0.11); minDot.position.copy(goal);

        const gdBall = dot(g, COL.amber, 0.135);
        const gnBall = dot(g, COL.green, 0.135);
        const step = fatArrow(COL.green, 0.05); g.add(step);
        const lbl = makeLabel('H δ = −g', HX.green, 2.6); lbl.position.set(0, 4.35, 0); g.add(lbl);

        const DW=1.0, GN=1.5, PER=DW+GN+7.2;
        return {tick(t){
          const tc = t % PER;
          if(tc < DW){ gdBall.position.copy(start); gnBall.position.copy(start); setArrow(step, start, V3(0,0,0)); }
          else {
            // Gauss–Newton: one step, straight to the bottom
            const u = clamp((tc-DW)/GN, 0, 1);
            gnBall.position.lerpVectors(start, goal, ease(u));
            const rem = goal.clone().sub(gnBall.position);
            setArrow(step, gnBall.position, rem);
            // gradient descent: one iterate every 0.8s, never arriving
            const k = clamp(Math.floor((tc-DW)/0.8), 0, NIT);
            const f = clamp(((tc-DW)/0.8) - k, 0, 1);
            const p0 = chain[k], p1 = chain[Math.min(k+1,NIT)];
            gdBall.position.lerpVectors(p0, p1, ease(f));
          }
        }};
      }
    ];

    function bindCard(i){
      wireBubble('gnSigmaInfo','gnSigmaNote');   // card 1 · what Σ does, and whitening
      wireBubble('gnCrossInfo','gnCrossNote');   // card 2 · why the cross terms merge
      wireBubble('gnHInfo','gnHNote');           // card 3 · differentiating the model
    }

    return { stations, bindCard };
  }

  return {
    id: 'optimization-gn',
    tier: 'optimization',
    threadKey: 'amber',
    // Curriculum position, as data rather than prose: `next` is the following moon in
    // hub.js's BRANCHES order (crossing into the next branch at a branch end), `handoffs`
    // are the topical pointers this journey's cards name, `requires` the hard
    // back-references its opening card makes. engine.js renders next+handoffs as links
    // on the last station; check.html verifies every id resolves and that the next-chain
    // still agrees with BRANCHES.
    seq: { next: 'optimization-lm', requires: ['optimization-gd'], handoffs: ['slam-factor-graph'] },
    build,
    cards: {
      hu: [
        {t:'Miért négyzetösszeg', b:'<p>A gradiens-módszernél adottnak vettük, hogy van egy <span class="m">L(w)</span> költség, és minimalizáljuk. Most kérdezzünk rá: <em>miért éppen négyzetösszeget?</em> A válasz nem az, hogy kényelmes — hanem hogy a Gauss-zaj logaritmusa ez.</p><p>Amit keresünk, az a <em>maximum a posteriori</em> becslés:</p><p class="matline"><span class="m">x̂ = arg max<sub>x</sub> p(x | z)</span></p><p><strong>(1) Bayes.</strong> <span class="m">p(x | z) ∝ p(z | x) p(x)</span> — a nevezőben álló <span class="m">p(z)</span> nem függ <span class="m">x</span>-től, tehát az argmaxot nem mozdítja.</p><p><strong>(2) Függetlenség.</strong> A mérések feltételesen függetlenek, tehát a likelihood <em>szorzattá</em> esik: <span class="m">∏<sub>i</sub> p(z<sub>i</sub> | x)</span>.</p><p><strong>(3) Gauss-zaj.</strong> <span class="m">p(z<sub>i</sub> | x) ∝ exp(−½ r<sub>i</sub><sup>⊤</sup>Σ<sub>i</sub><sup>−1</sup>r<sub>i</sub>)</span>, ahol <span class="m">r<sub>i</sub> = h<sub>i</sub>(x) − z<sub>i</sub></span> a <em>reziduum</em>: amit a modell mondana, mínusz amit mértünk.</p><p><strong>(4) Logaritmus.</strong> Monoton, tehát az argmaxot nem mozdítja — de szorzatot összeggé tesz és kiüti az <span class="m">exp</span>-et. <strong>Ez az egész trükk.</strong></p><p><strong>(5) Előjelfordítás</strong>, max → min:</p><p class="matline"><span class="m">x̂ = arg min<sub>x</sub> Σ<sub>i</sub> ½ r<sub>i</sub><sup>⊤</sup>Σ<sub>i</sub><sup>−1</sup>r<sub>i</sub></span></p><p>A jelenetben egyetlen reziduumon látszik a (4) lépés: fent a Gauss-haranggörbe, lent a <em>saját negatív logaritmusa</em> — egy parabola. A négyzet nem modellezési választás; ennek a görbének az alakja.</p><p><strong>A legkisebb négyzetek tehát tétel, nem választás.</strong> Amiből az is következik, hogy ha a zaj <em>nem</em> Gauss — outlierek —, akkor a négyzetösszeg nem „kevésbé pontos”, hanem <strong>elvileg rossz</strong>: más zajmodell, más logaritmus, más veszteségfüggvény. Innen jönnek a robusztus kernelek, és ez a szomszéd hold témája.</p><p>És <button class="termbtn" id="gnSigmaInfo" type="button" aria-expanded="false" aria-controls="gnSigmaNote">mit csinál a <span class="m">Σ</span></button>?</p><div class="bubble" id="gnSigmaNote" role="dialog" aria-label="Mit csinal a szigma" hidden><p>A <span class="m">Σ<sup>−1</sup></span> a <strong>súlyozás</strong>: a pontosabban mért reziduum nagyobb súllyal esik latba.</p><p>A <span class="m">Σ = LL<sup>⊤</sup></span> Cholesky-felbontással a súlyozott feladat <strong>fehéríthető</strong>: az <span class="m">L<sup>−1</sup>r</span> bevezetésével visszakapunk egy közönséges, súlyozatlan négyzetösszeget.</p><p class="matline"><span class="m">½ r<sup>⊤</sup>Σ<sup>−1</sup>r = ½ ‖L<sup>−1</sup>r‖<sup>2</sup></span></p><p>Ezért elég a solvernek az egyszerű alakot ismernie — a súlyozás a reziduum definíciójába költözik. A következő két kártya végig ezt az egyszerű alakot használja.</p><p>A <span class="m">p(x)</span> prior ugyanígy beleolvad: egy reziduum, ami egyetlen változóhoz kapcsolódik — <em>unáris factor</em>. Erről a factor graph hold szól.</p></div>'},
        {t:'Az egyetlen közelítés', b:'<p>Meg akarjuk oldani a <span class="m">min<sub>x</sub> Σ ½‖r<sub>i</sub>(x)‖<sup>2</sup></span> feladatot. Az első lépés egy változócsere, ami első ránézésre semmit nem csinál: nem <span class="m">x</span>-et tesszük ismeretlenné, hanem <strong>a lépést</strong>.</p><p class="matline"><span class="m">x(δ) = x<sub>0</sub> + δ</span></p><p>A <span class="m">δ = 0</span> jelentése: „még nem léptünk”, vagyis a jelenlegi becslés. Innentől <span class="m">L(δ)</span> egy közönséges függvény egy közönséges vektoron. <em>(Görbült téren a <span class="m">+</span> helyére <span class="m">⊞</span> kerül, és pont ez teszi ott is laposssá a feladatot — de az a SLAM-ág dolga; itt minden lapos.)</em></p><p>Most jön az <strong>egyetlen közelítés az egész pipeline-ban</strong>: linearizáljuk a reziduumot.</p><p class="matline"><span class="m">r(δ) ≈ r<sub>0</sub> + J δ</span></p><p class="matline"><span class="m">J = ∂r/∂δ |<sub>δ=0</sub></span></p><p>Minden más lépés egzakt; a hiba <span class="m">O(‖δ‖<sup>2</sup>)</span>. Írjuk be, és bontsuk ki tagról tagra:</p><p class="matline"><span class="m">L(δ) ≈ ½(r<sub>0</sub> + Jδ)<sup>⊤</sup>(r<sub>0</sub> + Jδ)</span></p><p class="matline"><span class="m">= ½r<sub>0</sub><sup>⊤</sup>r<sub>0</sub> + δ<sup>⊤</sup>J<sup>⊤</sup>r<sub>0</sub> + ½δ<sup>⊤</sup>J<sup>⊤</sup>Jδ</span></p><p>A <button class="termbtn" id="gnCrossInfo" type="button" aria-expanded="false" aria-controls="gnCrossNote">két kereszttag összeolvadt</button>. És most a lényeg: itt <strong>keletkezik</strong> a gradiens és a Hesse-mátrix. Nem definiáljuk őket — kiesnek:</p><p class="matline"><span class="m">g := J<sup>⊤</sup>r<sub>0</sub></span></p><p class="matline"><span class="m">H := J<sup>⊤</sup>J</span></p><p>A jelenetben a teál görbe ez a modell, az amber pedig az igazi költség. A modell <em>értékben és meredekségben</em> megegyezik vele a <span class="m">δ = 0</span> pontban, a görbülete pedig <span class="m">J<sup>⊤</sup>J</span>. Ennél többet nem állítunk róla — és ahogy <span class="m">x<sub>0</sub></span> csúszik, jól látszik, hogy a modell csak <em>ott</em> jó, ahol felvettük.</p><div class="bubble" id="gnCrossNote" role="dialog" aria-label="Miert olvad ossze a ket kereszttag" hidden><p>A kibontásban két kereszttag keletkezik:</p><p class="matline"><span class="m">½ r<sub>0</sub><sup>⊤</sup>Jδ&nbsp; + &nbsp;½ δ<sup>⊤</sup>J<sup>⊤</sup>r<sub>0</sub></span></p><p>Mindkettő egy <strong>szám</strong>, azaz <span class="m">1×1</span>-es mátrix. Egy szám pedig a saját transzponáltja:</p><p class="matline"><span class="m">r<sub>0</sub><sup>⊤</sup>Jδ = (r<sub>0</sub><sup>⊤</sup>Jδ)<sup>⊤</sup> = δ<sup>⊤</sup>J<sup>⊤</sup>r<sub>0</sub></span></p><p>tehát a kettő ugyanaz, és az összegük <span class="m">δ<sup>⊤</sup>J<sup>⊤</sup>r<sub>0</sub></span>. Ez az egy sor az oka, hogy a gradiens <span class="m">J<sup>⊤</sup>r<sub>0</sub></span> lesz, és nem a fele.</p></div>'},
        {t:'A parabola alja', b:'<p>A modellünk egy parabola <span class="m">δ</span>-ban. Egy parabola minimumát nem keresni kell, hanem <button class="termbtn" id="gnHInfo" type="button" aria-expanded="false" aria-controls="gnHNote">kiszámolni</button>: deriváljuk <span class="m">δ</span> szerint, és nullázzuk.</p><p class="matline"><span class="m">H δ* = −g</span></p><p><strong>Ez nem recept, hanem a parabola alja.</strong> Skalárban pontosan <span class="m">−b/a</span>. A neve <em>normálegyenlet</em>, és ennyi a Gauss–Newton.</p><p>Amit a <span class="m">H</span> jelent: <span class="m">H = J<sup>⊤</sup>J</span> <strong>pozitív szemidefinit</strong>, mert <span class="m">δ<sup>⊤</sup>Hδ = ‖Jδ‖<sup>2</sup> ≥ 0</span> — egyfajta „abszolút élesség”. A <em>görbületet</em> méri, és az inverze a kovariancia (<span class="m">Σ ≈ H<sup>−1</sup></span>). Ha <span class="m">H</span> szinguláris, az nem numerikus balszerencse, hanem <strong>információhiány</strong>: valamelyik irányban a mérések egyszerűen nem mondanak semmit.</p><p><strong>És ezért gyorsabb a gradiens-módszernél:</strong> nem csak az irányt használja, hanem a görbületet is. A jelenetben ugyanaz a tál és ugyanaz a <span class="m">w<sub>0</sub> = (2.70, &nbsp;1.90)</span> kezdőpont, mint a szomszéd holdon. Ott minden lépés <span class="m">0.8208</span>-cal szoroz — mértani sorozat, ami sosem ér oda. A Gauss–Newton <strong>egyetlen lépésben</strong> a minimumban van.</p><p>Miért egyetlen lépésben? Mert ez a költség <em>pontosan</em> kvadratikus, tehát a linearizáció <strong>egzakt</strong> — nincs mit iterálni. Ez a jelenet határesete, nem az általános helyzet. Egy valódi, nemlineáris feladatban a linearizáció csak lokálisan pontos, ezért iterálni kell:</p><p class="matline"><span class="m">x<sub>1</sub> = x<sub>0</sub> + δ*</span>, majd újra, <span class="m">x<sub>1</sub></span>-nél, <span class="m">δ</span> megint nulláról</p><p>És azért <em>elég</em> iterálni, mert minden körben friss, lokálisan egzakt közelítésben dolgozunk.</p><p><strong>Ahol ez a hold megáll.</strong> Ha a lépés túl merész, vagy <span class="m">H</span> rosszul kondicionált, csillapítani kell — <span class="m">H + λI</span>, és a robusztus magok: a szomszéd hold. Ha pedig <span class="m">x</span> görbült téren él, a <span class="m">+</span> helyére <span class="m">⊞</span> kerül és a <span class="m">J</span> tartalma is megváltozik — az a SLAM-ág.</p><div class="bubble" id="gnHNote" role="dialog" aria-label="A derivalas" hidden><p>A modell:</p><p class="matline"><span class="m">L(δ) ≈ L<sub>0</sub> + g<sup>⊤</sup>δ + ½ δ<sup>⊤</sup>Hδ</span></p><p>Deriváljuk <span class="m">δ</span> szerint. A konstans eltűnik; a lineáris tag deriváltja <span class="m">g</span>; a kvadratikusé <span class="m">Hδ</span> — itt használjuk, hogy <span class="m">H = J<sup>⊤</sup>J</span> <strong>szimmetrikus</strong>, és az <span class="m">½</span> pontosan kiüti a deriválásból jövő kettest:</p><p class="matline"><span class="m">∇<sub>δ</sub>L = g + Hδ = 0</span>&nbsp;⟹&nbsp;<span class="m">Hδ* = −g</span></p><p>Ha <span class="m">H</span> pozitív <em>definit</em> (nem csak szemidefinit), ez valóban minimum, és egyértelmű.</p></div>'}
      ],
      en: [
        {t:'Why a Sum of Squares', b:'<p>On the gradient-descent moon we took it for granted that there is a cost <span class="m">L(w)</span> and we minimise it. Now ask the question: <em>why squares?</em> The answer is not that they are convenient — it is that they are the logarithm of Gaussian noise.</p><p>What we want is the <em>maximum a posteriori</em> estimate:</p><p class="matline"><span class="m">x̂ = arg max<sub>x</sub> p(x | z)</span></p><p><strong>(1) Bayes.</strong> <span class="m">p(x | z) ∝ p(z | x) p(x)</span> — the denominator <span class="m">p(z)</span> does not depend on <span class="m">x</span>, so it cannot move the argmax.</p><p><strong>(2) Independence.</strong> The measurements are conditionally independent, so the likelihood falls apart into a <em>product</em>: <span class="m">∏<sub>i</sub> p(z<sub>i</sub> | x)</span>.</p><p><strong>(3) Gaussian noise.</strong> <span class="m">p(z<sub>i</sub> | x) ∝ exp(−½ r<sub>i</sub><sup>⊤</sup>Σ<sub>i</sub><sup>−1</sup>r<sub>i</sub>)</span>, where <span class="m">r<sub>i</sub> = h<sub>i</sub>(x) − z<sub>i</sub></span> is the <em>residual</em>: what the model would say, minus what we measured.</p><p><strong>(4) Logarithm.</strong> Monotone, so it cannot move the argmax — but it turns the product into a sum and kills the <span class="m">exp</span>. <strong>That step is the whole trick.</strong></p><p><strong>(5) Flip the sign</strong>, max → min:</p><p class="matline"><span class="m">x̂ = arg min<sub>x</sub> Σ<sub>i</sub> ½ r<sub>i</sub><sup>⊤</sup>Σ<sub>i</sub><sup>−1</sup>r<sub>i</sub></span></p><p>The scene shows step (4) on a single residual: above, the Gaussian bell; below, <em>its own negative logarithm</em> — a parabola. The square is not a modelling choice; it is the shape of that curve.</p><p><strong>Least squares is therefore a theorem, not a choice.</strong> From which it also follows that if the noise is <em>not</em> Gaussian — outliers — then the sum of squares is not “less accurate”, it is <strong>the wrong objective</strong>: a different noise model, a different logarithm, a different loss. That is where robust kernels come from, and it is the next moon’s subject.</p><p>And <button class="termbtn" id="gnSigmaInfo" type="button" aria-expanded="false" aria-controls="gnSigmaNote">what does <span class="m">Σ</span> do</button>?</p><div class="bubble" id="gnSigmaNote" role="dialog" aria-label="What sigma does" hidden><p><span class="m">Σ<sup>−1</sup></span> is the <strong>weighting</strong>: a residual measured more precisely counts for more.</p><p>With the Cholesky factorisation <span class="m">Σ = LL<sup>⊤</sup></span> the weighted problem can be <strong>whitened</strong>: introducing <span class="m">L<sup>−1</sup>r</span> gives back an ordinary, unweighted sum of squares.</p><p class="matline"><span class="m">½ r<sup>⊤</sup>Σ<sup>−1</sup>r = ½ ‖L<sup>−1</sup>r‖<sup>2</sup></span></p><p>So the solver only ever has to know the simple form — the weighting moves into the definition of the residual. The next two cards use that simple form throughout.</p><p>The prior <span class="m">p(x)</span> folds in the same way: a residual attached to a single variable — a <em>unary factor</em>. That is the factor-graph moon’s subject.</p></div>'},
        {t:'The Single Approximation', b:'<p>We want to solve <span class="m">min<sub>x</sub> Σ ½‖r<sub>i</sub>(x)‖<sup>2</sup></span>. The first move is a change of variable that appears to do nothing: the unknown is not <span class="m">x</span> but <strong>the step</strong>.</p><p class="matline"><span class="m">x(δ) = x<sub>0</sub> + δ</span></p><p><span class="m">δ = 0</span> means “we have not stepped yet”, i.e. the current estimate. From here on <span class="m">L(δ)</span> is an ordinary function of an ordinary vector. <em>(On a curved space the <span class="m">+</span> becomes <span class="m">⊞</span>, and that is exactly what keeps the problem flat there too — but that belongs to the SLAM branch; here everything is flat.)</em></p><p>Now comes <strong>the single approximation in the entire pipeline</strong>: linearise the residual.</p><p class="matline"><span class="m">r(δ) ≈ r<sub>0</sub> + J δ</span></p><p class="matline"><span class="m">J = ∂r/∂δ |<sub>δ=0</sub></span></p><p>Every other step is exact; the error is <span class="m">O(‖δ‖<sup>2</sup>)</span>. Substitute it and expand term by term:</p><p class="matline"><span class="m">L(δ) ≈ ½(r<sub>0</sub> + Jδ)<sup>⊤</sup>(r<sub>0</sub> + Jδ)</span></p><p class="matline"><span class="m">= ½r<sub>0</sub><sup>⊤</sup>r<sub>0</sub> + δ<sup>⊤</sup>J<sup>⊤</sup>r<sub>0</sub> + ½δ<sup>⊤</sup>J<sup>⊤</sup>Jδ</span></p><p>The <button class="termbtn" id="gnCrossInfo" type="button" aria-expanded="false" aria-controls="gnCrossNote">two cross terms have merged</button>. And here is the point: the gradient and the Hessian are <strong>produced</strong> here. We do not define them — they fall out:</p><p class="matline"><span class="m">g := J<sup>⊤</sup>r<sub>0</sub></span></p><p class="matline"><span class="m">H := J<sup>⊤</sup>J</span></p><p>In the scene the teal curve is this model and the amber one is the true cost. The model agrees with it <em>in value and in slope</em> at <span class="m">δ = 0</span>, and its curvature is <span class="m">J<sup>⊤</sup>J</span>. We claim nothing more for it — and as <span class="m">x<sub>0</sub></span> slides, it is plain that the model is only good <em>where it was taken</em>.</p><div class="bubble" id="gnCrossNote" role="dialog" aria-label="Why the cross terms merge" hidden><p>Expanding produces two cross terms:</p><p class="matline"><span class="m">½ r<sub>0</sub><sup>⊤</sup>Jδ&nbsp; + &nbsp;½ δ<sup>⊤</sup>J<sup>⊤</sup>r<sub>0</sub></span></p><p>Each is a <strong>number</strong>, i.e. a <span class="m">1×1</span> matrix. And a number is its own transpose:</p><p class="matline"><span class="m">r<sub>0</sub><sup>⊤</sup>Jδ = (r<sub>0</sub><sup>⊤</sup>Jδ)<sup>⊤</sup> = δ<sup>⊤</sup>J<sup>⊤</sup>r<sub>0</sub></span></p><p>so the two are the same thing and their sum is <span class="m">δ<sup>⊤</sup>J<sup>⊤</sup>r<sub>0</sub></span>. That one line is why the gradient comes out as <span class="m">J<sup>⊤</sup>r<sub>0</sub></span> and not half of it.</p></div>'},
        {t:'The Bottom of the Parabola', b:'<p>Our model is a parabola in <span class="m">δ</span>. The minimum of a parabola is not something to search for but something to <button class="termbtn" id="gnHInfo" type="button" aria-expanded="false" aria-controls="gnHNote">compute</button>: differentiate with respect to <span class="m">δ</span> and set it to zero.</p><p class="matline"><span class="m">H δ* = −g</span></p><p><strong>Not a recipe — the bottom of the parabola.</strong> In the scalar case exactly <span class="m">−b/a</span>. It is called the <em>normal equation</em>, and it is all there is to Gauss–Newton.</p><p>What <span class="m">H</span> means: <span class="m">H = J<sup>⊤</sup>J</span> is <strong>positive semidefinite</strong>, because <span class="m">δ<sup>⊤</sup>Hδ = ‖Jδ‖<sup>2</sup> ≥ 0</span> — a kind of “absolute sharpness”. It measures <em>curvature</em>, and its inverse is the covariance (<span class="m">Σ ≈ H<sup>−1</sup></span>). If <span class="m">H</span> is singular that is not numerical bad luck but <strong>missing information</strong>: in some direction the measurements simply say nothing.</p><p><strong>And this is why it beats gradient descent:</strong> it uses the curvature, not just the direction. The scene has the same bowl and the same starting point <span class="m">w<sub>0</sub> = (2.70, &nbsp;1.90)</span> as the neighbouring moon. There, every step multiplies by <span class="m">0.8208</span> — a geometric sequence that never arrives. Gauss–Newton is at the minimum in <strong>one step</strong>.</p><p>Why one step? Because this cost is <em>exactly</em> quadratic, so the linearisation is <strong>exact</strong> — there is nothing left to iterate. That is the limiting case of this scene, not the general situation. In a real, non-linear problem the linearisation is only locally accurate, so we must iterate:</p><p class="matline"><span class="m">x<sub>1</sub> = x<sub>0</sub> + δ*</span>, then again at <span class="m">x<sub>1</sub></span>, with <span class="m">δ</span> back at zero</p><p>And iterating is <em>enough</em>, because each round works in a fresh, locally exact approximation.</p><p><strong>Where this moon stops.</strong> If the step is too bold, or <span class="m">H</span> is badly conditioned, it needs damping — <span class="m">H + λI</span>, and robust kernels: the next moon. And if <span class="m">x</span> lives on a curved space, the <span class="m">+</span> becomes <span class="m">⊞</span> and the content of <span class="m">J</span> changes with it — that is the SLAM branch.</p><div class="bubble" id="gnHNote" role="dialog" aria-label="Differentiating the model" hidden><p>The model:</p><p class="matline"><span class="m">L(δ) ≈ L<sub>0</sub> + g<sup>⊤</sup>δ + ½ δ<sup>⊤</sup>Hδ</span></p><p>Differentiate with respect to <span class="m">δ</span>. The constant drops; the linear term gives <span class="m">g</span>; the quadratic gives <span class="m">Hδ</span> — this is where we use that <span class="m">H = J<sup>⊤</sup>J</span> is <strong>symmetric</strong>, and the <span class="m">½</span> exactly cancels the 2 that differentiation brings down:</p><p class="matline"><span class="m">∇<sub>δ</sub>L = g + Hδ = 0</span>&nbsp;⟹&nbsp;<span class="m">Hδ* = −g</span></p><p>If <span class="m">H</span> is positive <em>definite</em> (not merely semidefinite) this really is a minimum, and it is unique.</p></div>'}
      ],
      ja: [
        {t:'なぜ二乗和なのか', b:'<p>勾配降下法の衛星では、コスト <span class="m">L(w)</span> があってそれを最小化する、というところを出発点にしていました。ここで一度立ち止まって問いましょう。<em>なぜ二乗なのでしょうか。</em>答えは「計算が楽だから」ではありません。それがガウス雑音の対数だからです。</p><p>求めたいのは<em>最大事後確率推定</em>、いわゆる MAP 推定です。</p><p class="matline"><span class="m">x̂ = arg max<sub>x</sub> p(x | z)</span></p><p><strong>(1) ベイズの定理。</strong><span class="m">p(x | z) ∝ p(z | x) p(x)</span> です。分母の <span class="m">p(z)</span> は <span class="m">x</span> に依らないので、argmax の位置を動かせません。</p><p><strong>(2) 独立性。</strong>観測は条件付き独立なので、尤度は<em>積</em>に分かれます。<span class="m">∏<sub>i</sub> p(z<sub>i</sub> | x)</span> です。</p><p><strong>(3) ガウス雑音。</strong><span class="m">p(z<sub>i</sub> | x) ∝ exp(−½ r<sub>i</sub><sup>⊤</sup>Σ<sub>i</sub><sup>−1</sup>r<sub>i</sub>)</span>。ここで <span class="m">r<sub>i</sub> = h<sub>i</sub>(x) − z<sub>i</sub></span> が<em>残差</em>、つまりモデルの言う値から測った値を引いたものです。</p><p><strong>(4) 対数をとる。</strong>対数は単調なので argmax は動きません。それでいて積は和に変わり、<span class="m">exp</span> は消えます。<strong>この一手ですべてが決まります。</strong></p><p><strong>(5) 符号を反転。</strong>これで max が min になります。</p><p class="matline"><span class="m">x̂ = arg min<sub>x</sub> Σ<sub>i</sub> ½ r<sub>i</sub><sup>⊤</sup>Σ<sub>i</sub><sup>−1</sup>r<sub>i</sub></span></p><p>シーンは残差一つについて (4) を描いています。上がガウスの釣鐘、下が<em>その負の対数</em>、すなわち放物線です。二乗はモデル化のときの選択ではなく、この曲線のかたちそのものだったわけです。</p><p><strong>つまり最小二乗は選択ではなく定理です。</strong>ここから、もう一つ大事なことも出てきます。雑音がガウス<em>でない</em>場合、たとえば外れ値が混じる場合には、二乗和は「精度が落ちる」のではなく<strong>目的関数として誤っている</strong>のです。雑音モデルが違えば対数も違い、損失も違います。ロバストカーネルはそこから出てくるもので、隣の衛星の主題です。</p><p>ではもう一つ、<button class="termbtn" id="gnSigmaInfo" type="button" aria-expanded="false" aria-controls="gnSigmaNote"><span class="m">Σ</span> は何をしているのか</button>を見ておきましょう。</p><div class="bubble" id="gnSigmaNote" role="dialog" aria-label="共分散の役割" hidden><p><span class="m">Σ<sup>−1</sup></span> は<strong>重み</strong>です。より精確に測られた残差ほど、重く効きます。</p><p>コレスキー分解 <span class="m">Σ = LL<sup>⊤</sup></span> を使うと、重み付きの問題を<strong>白色化</strong>できます。<span class="m">L<sup>−1</sup>r</span> を新しい残差とすれば、ふつうの重みなし二乗和に戻るということです。</p><p class="matline"><span class="m">½ r<sup>⊤</sup>Σ<sup>−1</sup>r = ½ ‖L<sup>−1</sup>r‖<sup>2</sup></span></p><p>ですからソルバは単純な形だけ知っていれば足ります。重みのほうは残差の定義に吸収されるからです。次の二枚のカードは、この単純な形しか使いません。</p><p>事前分布 <span class="m">p(x)</span> も同じように溶け込みます。変数一つにだけつながる残差、いわゆる<em>単項因子</em>になるのです。それは因子グラフの衛星の主題です。</p></div>'},
        {t:'ただ一つの近似', b:'<p>解きたいのは <span class="m">min<sub>x</sub> Σ ½‖r<sub>i</sub>(x)‖<sup>2</sup></span> です。最初の一手は、一見なにもしていないような変数変換です。未知数を <span class="m">x</span> ではなく<strong>一歩ぶんの変位</strong>に取り直します。</p><p class="matline"><span class="m">x(δ) = x<sub>0</sub> + δ</span></p><p><span class="m">δ = 0</span> は「まだ踏み出していない」、つまり現在の推定値を意味します。ここから先、<span class="m">L(δ)</span> はふつうのベクトルのふつうの関数です。<em>（曲がった空間では <span class="m">+</span> が <span class="m">⊞</span> に変わり、それがあちらでも問題を平坦に保つ仕掛けになります。ただしそれは SLAM の分野の仕事で、ここではすべて平坦です。）</em></p><p>そして<strong>この手順全体でただ一つの近似</strong>が登場します。残差を線形化するのです。</p><p class="matline"><span class="m">r(δ) ≈ r<sub>0</sub> + J δ</span></p><p class="matline"><span class="m">J = ∂r/∂δ |<sub>δ=0</sub></span></p><p>これ以外の手順はすべて厳密で、誤差は <span class="m">O(‖δ‖<sup>2</sup>)</span> です。代入して項ごとに展開してみましょう。</p><p class="matline"><span class="m">L(δ) ≈ ½(r<sub>0</sub> + Jδ)<sup>⊤</sup>(r<sub>0</sub> + Jδ)</span></p><p class="matline"><span class="m">= ½r<sub>0</sub><sup>⊤</sup>r<sub>0</sub> + δ<sup>⊤</sup>J<sup>⊤</sup>r<sub>0</sub> + ½δ<sup>⊤</sup>J<sup>⊤</sup>Jδ</span></p><p><button class="termbtn" id="gnCrossInfo" type="button" aria-expanded="false" aria-controls="gnCrossNote">二つの交差項は一つにまとまります</button>。そして肝心なのはここです。勾配とヘッセ行列は、ここで<strong>生まれます</strong>。こちらが定義するのではなく、計算から落ちてくるのです。</p><p class="matline"><span class="m">g := J<sup>⊤</sup>r<sub>0</sub></span></p><p class="matline"><span class="m">H := J<sup>⊤</sup>J</span></p><p>シーンの青緑の曲線がこのモデル、琥珀色が真のコストです。モデルは <span class="m">δ = 0</span> で<em>値と傾き</em>が一致し、曲率は <span class="m">J<sup>⊤</sup>J</span> で決まります。主張しているのはそこまでです。<span class="m">x<sub>0</sub></span> を滑らせてみると、モデルが<em>その場所でしか</em>良くないことがはっきり見えます。</p><div class="bubble" id="gnCrossNote" role="dialog" aria-label="なぜ交差項がまとまるのか" hidden><p>展開すると交差項が二つ出ます。</p><p class="matline"><span class="m">½ r<sub>0</sub><sup>⊤</sup>Jδ&nbsp; + &nbsp;½ δ<sup>⊤</sup>J<sup>⊤</sup>r<sub>0</sub></span></p><p>どちらも<strong>数</strong>、すなわち <span class="m">1×1</span> 行列です。そして数は自分自身の転置に等しくなります。</p><p class="matline"><span class="m">r<sub>0</sub><sup>⊤</sup>Jδ = (r<sub>0</sub><sup>⊤</sup>Jδ)<sup>⊤</sup> = δ<sup>⊤</sup>J<sup>⊤</sup>r<sub>0</sub></span></p><p>ですから二つは同じもので、和は <span class="m">δ<sup>⊤</sup>J<sup>⊤</sup>r<sub>0</sub></span> です。この一行が、勾配が半分ではなく <span class="m">J<sup>⊤</sup>r<sub>0</sub></span> になる理由です。</p></div>'},
        {t:'放物線の底', b:'<p>モデルは <span class="m">δ</span> についての放物線です。放物線の最小値は探すものではなく、<button class="termbtn" id="gnHInfo" type="button" aria-expanded="false" aria-controls="gnHNote">計算するもの</button>です。<span class="m">δ</span> で微分してゼロと置きましょう。</p><p class="matline"><span class="m">H δ* = −g</span></p><p><strong>これは天下り式の処方ではなく、放物線の底そのものです。</strong>スカラーならちょうど <span class="m">−b/a</span> にあたります。名前は<em>正規方程式</em>で、ガウス・ニュートン法（Gauss–Newton）の中身はこれだけです。</p><p><span class="m">H</span> の意味も見ておきましょう。<span class="m">H = J<sup>⊤</sup>J</span> は<strong>半正定値</strong>です。<span class="m">δ<sup>⊤</sup>Hδ = ‖Jδ‖<sup>2</sup> ≥ 0</span> だからで、いわば絶対的な「鋭さ」を測っています。測っているのは<em>曲率</em>で、その逆行列が共分散です（<span class="m">Σ ≈ H<sup>−1</sup></span>）。<span class="m">H</span> が特異になったら、それは数値的な不運ではなく<strong>情報の欠如</strong>です。ある方向について、観測が何も語っていないということです。</p><p><strong>そして、これが勾配降下法より速い理由です。</strong>向きだけでなく曲率まで使うからです。シーンの椀も出発点 <span class="m">w<sub>0</sub> = (2.70, &nbsp;1.90)</span> も、隣の衛星とまったく同じものです。あちらでは毎ステップ <span class="m">0.8208</span> 倍で、決して到着しない等比数列でした。ガウス・ニュートン法は<strong>一歩</strong>で最小点に着きます。</p><p>なぜ一歩なのでしょうか。このコストが<em>厳密に</em>二次だからです。線形化が<strong>厳密</strong>になるので、反復すべきものが残りません。これはこのシーンだからこその極端な場合で、一般には成り立ちません。現実の非線形問題では線形化が局所的にしか正しくないので、反復が必要になります。</p><p class="matline"><span class="m">x<sub>1</sub> = x<sub>0</sub> + δ*</span>、次は <span class="m">x<sub>1</sub></span> で、<span class="m">δ</span> はまたゼロから</p><p>それでも反復すれば<em>足りる</em>のは、毎回あらたに、局所的に厳密な近似の中で作業しているからです。</p><p><strong>この衛星が止まるところ。</strong>一歩が大きすぎる場合や、<span class="m">H</span> の条件が悪い場合には減衰が要ります。<span class="m">H + λI</span> とロバストカーネルの話で、これは隣の衛星が扱います。<span class="m">x</span> が曲がった空間に住むなら <span class="m">+</span> は <span class="m">⊞</span> になり、<span class="m">J</span> の中身も変わります。そちらは SLAM の分野です。</p><div class="bubble" id="gnHNote" role="dialog" aria-label="モデルを微分する" hidden><p>モデルはこれでした。</p><p class="matline"><span class="m">L(δ) ≈ L<sub>0</sub> + g<sup>⊤</sup>δ + ½ δ<sup>⊤</sup>Hδ</span></p><p><span class="m">δ</span> で微分します。定数は消え、一次の項からは <span class="m">g</span>、二次の項からは <span class="m">Hδ</span> が出ます。ここで <span class="m">H = J<sup>⊤</sup>J</span> が<strong>対称</strong>であることを使うと、微分から降りてくる 2 が <span class="m">½</span> とちょうど打ち消し合います。</p><p class="matline"><span class="m">∇<sub>δ</sub>L = g + Hδ = 0</span>&nbsp;⟹&nbsp;<span class="m">Hδ* = −g</span></p><p><span class="m">H</span> が半正定値ではなく正定値なら、これは本当に最小であり、しかも一意です。</p></div>'}
      ]
    }
  };
})();
