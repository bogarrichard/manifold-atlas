'use strict';
/* Journey: Sim(3) — scale as a seventh degree of freedom. The Geometry planet's last moon.

   Three stations, deliberately shallow (docs/project/journey-status.md): S = [sR, t] and
   its 7 DOF; why the parameterisation is σ = log s and why that is forced rather than
   convenient; and the hierarchy SO(3) ⊂ SE(3) ⊂ Sim(3) closing on monocular scale, which
   is the reason this group is worth a moon at all.

   Where this journey deliberately stops: ⊞/⊟, Jacobians and covariance for the 7-DOF case
   are not written up in the vault either (see docs/meta/open-threads.md), so the last card
   says so out loud instead of improvising them. Extending later is cheap; contradicting
   the vault is not.

   Station 2 plots s = e^σ for real — the dot rides the actual exponential, the drop lines
   are its actual coordinates, and the coral stretch of the s-axis is the s ≤ 0 region a
   step taken directly on s can fall into. Backing notes: docs/geometry/sim3.md,
   docs/slam/monocular-scale.md. Cards (hu/en/ja) in-file. Requires LIE.kit. */
window.LIE = window.LIE || {};
LIE.journeys = LIE.journeys || {};
LIE.journeys['geometry-sim3'] = (function(){
  const K = LIE.kit;
  const { V3, ease, hexStr, fatArrow, setArrow, makeLabel } = K;

  const SP  = [V3(0,0,0), V3(44,5,-12), V3(90,-4,10)];
  const OFF = [V3(0,2.6,9.2), V3(0,2.2,9.4), V3(0,2.8,12.2)];

  const SIG = 1.15;                       // the σ range plotted at station 2: −SIG … +SIG
  const XS = 1.75, YS = 0.80;             // plot scale: σ → x, s → y

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
    function dimArrow(g, color, r, from, to, op){
      const a = fatArrow(color, r); setArrow(a, from, to);
      a.userData.cyl.material.transparent = true; a.userData.cyl.material.opacity = op;
      a.userData.cone.material.transparent = true; a.userData.cone.material.opacity = op;
      g.add(a); return a;
    }
    /* One rigid body, drawn twice over: a triad for orientation and a wireframe box for
       size. Returned as a group, so scale/rotation/position are set from the outside — the
       point of the journey being that those are three separate things. */
    function body(g, L, op){
      const b = new THREE.Group();
      [[V3(L,0,0),COL.coral],[V3(0,L,0),COL.teal],[V3(0,0,L),COL.violet]].forEach(([v,c])=>{
        const a = fatArrow(c, 0.048); setArrow(a, V3(0,0,0), v);
        if(op !== undefined){
          a.userData.cyl.material.transparent = true; a.userData.cyl.material.opacity = op;
          a.userData.cone.material.transparent = true; a.userData.cone.material.opacity = op;
        }
        b.add(a);
      });
      b.add(new THREE.Mesh(new THREE.BoxGeometry(L*0.72,L*0.72,L*0.72),
        new THREE.MeshBasicMaterial({color:COL.amber, wireframe:true, transparent:true,
                                     opacity:(op===undefined?0.32:op*0.4)})));
      g.add(b); return b;
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
      /* 0 · the three parts of S = [sR, t], each moving on its own: the ghost holds the
            identity, the live body turns, slides, and breathes in size. */
      g=>{
        body(g, 1.5, 0.16);                                     // identity ghost
        const b = body(g, 1.5);
        const tArrow = dimArrow(g, COL.green, 0.03, V3(0,0,0), V3(1,0,0), 0.6);
        const lbl = makeLabel('S = [sR, t]', HX.ink, 3.0); lbl.position.set(0, 3.05, 0); g.add(lbl);
        const dof = makeLabel('7 DOF', HX.green, 1.9); dof.position.set(0, -2.5, 0); g.add(dof);

        return {tick(t){
          const s = 1.0 + 0.45*Math.sin(t*0.55);
          const tv = V3(1.5 + 0.4*Math.sin(t*0.33), 0.5*Math.sin(t*0.41), 0.35*Math.cos(t*0.29));
          b.scale.setScalar(s);
          b.quaternion.setFromAxisAngle(V3(0.4,0.86,0.31).normalize(), t*0.38);
          b.position.copy(tv);
          setArrow(tArrow, V3(0,0,0), tv);
        }};
      },

      /* 1 · s = e^σ, plotted. The σ axis is additive and unbounded; the s axis is the
            multiplicative half-line, and the coral stretch below zero is where a step taken
            on s directly can land — the thing σ makes unreachable. */
      g=>{
        const px = sg => sg*XS, py = s => s*YS;
        line(g, [V3(px(-SIG-0.35),0,0), V3(px(SIG+0.35),0,0)], COL.teal, 0.55);    // σ axis
        line(g, [V3(0,py(0),0), V3(0,py(3.4),0)], COL.grid1, 0.5);                 // s axis
        line(g, [V3(0,py(0),0), V3(0,py(-1.5),0)], COL.coral, 0.85);               // s ≤ 0: forbidden
        line(g, [V3(px(-SIG-0.35),py(1),0), V3(px(SIG+0.35),py(1),0)], COL.grid2, 0.55);

        const curve = [];
        for(let i=0;i<=90;i++){ const sg = -SIG-0.25 + (2*SIG+0.5)*i/90; curve.push(V3(px(sg), py(Math.exp(sg)), 0)); }
        line(g, curve, COL.amber, 0.95);
        const one = dot(g, COL.green, 0.085); one.position.set(px(0), py(1), 0);    // the identity

        const rider = dot(g, COL.amber, 0.105);
        const dropV = line(g, [V3(0,0,0), V3(0,0,0)], COL.amber, 0.4);
        const dropH = line(g, [V3(0,0,0), V3(0,0,0)], COL.amber, 0.4);
        const cube = new THREE.Mesh(new THREE.BoxGeometry(0.9,0.9,0.9),
          new THREE.MeshBasicMaterial({color:COL.violet, wireframe:true, transparent:true, opacity:0.75}));
        cube.position.set(3.3, py(1), 0); g.add(cube);

        const lbl = makeLabel('s = e^{σ}', HX.amber, 2.4); lbl.position.set(0, 3.15, 0); g.add(lbl);
        // right beside the forbidden stretch, not off at the edge — the label is what says
        // what that stretch of axis means
        const lz = makeLabel('s ≤ 0', HX.coral, 1.9); lz.position.set(0.95, py(-0.85), 0); g.add(lz);

        return {tick(t){
          const sg = SIG*Math.sin(t*0.45), s = Math.exp(sg);
          const P = V3(px(sg), py(s), 0);
          rider.position.copy(P);
          const av = dropV.geometry.attributes.position;
          av.setXYZ(0, P.x, 0, 0); av.setXYZ(1, P.x, P.y, 0); av.needsUpdate = true;
          const ah = dropH.geometry.attributes.position;
          ah.setXYZ(0, 0, P.y, 0); ah.setXYZ(1, P.x, P.y, 0); ah.needsUpdate = true;
          cube.scale.setScalar(s);
          cube.rotation.set(t*0.2, t*0.31, 0);
        }};
      },

      /* 2 · the hierarchy, as three bodies allowed successively more. Left keeps the
            origin, middle gives it up, right gives up size as well — and all three keep
            their angles, which is what "similarity" means. */
      g=>{
        const slots = [-3.6, 0, 3.6];
        const names = ['SO(3)', 'SE(3)', 'Sim(3)'];
        const items = slots.map((x,i)=>{
          const hold = new THREE.Group(); hold.position.set(x, 0, 0); g.add(hold);
          body(hold, 1.25, 0.15);                                   // where it started
          const b = body(hold, 1.25);
          const l = makeLabel(names[i], i===0?HX.teal:(i===1?HX.violet:HX.amber), 2.3);
          l.position.set(x, -2.15, 0); g.add(l);
          return b;
        });
        const lbl = makeLabel('SO(3) ⊂ SE(3) ⊂ Sim(3)', HX.ink, 5.0);
        lbl.position.set(0, 2.85, 0); g.add(lbl);

        const ax = V3(0.35,0.88,0.32).normalize();
        return {tick(t){
          const q = new THREE.Quaternion().setFromAxisAngle(ax, t*0.4);
          items.forEach(b=>b.quaternion.copy(q));
          items[1].position.set(0.55*Math.sin(t*0.5), 0.4*Math.cos(t*0.43), 0);
          items[2].position.set(0.55*Math.sin(t*0.5), 0.4*Math.cos(t*0.43), 0);
          items[2].scale.setScalar(1.0 + 0.42*Math.sin(t*0.55));
        }};
      }
    ];

    function bindCard(i){
      wireBubble('sim3ActInfo','sim3ActNote');       // card 1 · the composition rule
      wireBubble('sim3LogInfo','sim3LogNote');       // card 2 · exp/log in one dimension
      wireBubble('sim3ScaleInfo','sim3ScaleNote');   // card 3 · applying a metric scale
    }

    return { stations, bindCard };
  }

  return {
    id: 'geometry-sim3',
    tier: 'geometry',
    layout: { SP, OFF },
    threadKey: 'teal',
    // Curriculum position, as data rather than prose: `next` is the following moon in
    // hub.js's BRANCHES order (crossing into the next branch at a branch end), `handoffs`
    // are the topical pointers this journey's cards name, `requires` the hard
    // back-references its opening card makes. engine.js renders next+handoffs as links
    // on the last station; check.html verifies every id resolves and that the next-chain
    // still agrees with BRANCHES.
    seq: { next: 'optimization-gd', requires: ['geometry-se3'], handoffs: ['slam-pipeline'] },
    build,
    cards: {
      hu: [
        {t:'A hetedik szabadsági fok', b:'<p>A <span class="m">Sim(3)</span> a <em>hasonlósági</em> transzformációk csoportja: forgatás, eltolás, és egy új dolog — <strong>skála</strong>.</p><p class="matline"><span class="m">S =</span><span class="matrix"><span class="mbracket"></span><span class="mgrid" style="grid-template-columns:repeat(2,auto)"><span>sR</span><span>t</span><span>0<sup>⊤</sup></span><span>1</span></span><span class="mbracket right"></span></span>,&nbsp;&nbsp;<span class="m">s ∈ ℝ<sup>+</sup></span></p><p class="matline"><span class="m">p ⟼ s R p + t</span></p><p>A szabadsági fokok: <span class="m">SE(3)</span> hat, plusz egy skalár. Összesen <strong>7</strong>.</p><p>Mit őriz meg? A <strong>szöget</strong> igen, a <strong>hosszat</strong> nem — ezért „hasonlósági”: az alak marad, a méret nem. A jelenetben a test forog, csúszik és <em>lélegzik</em>, de a három tengelye végig merőleges egymásra.</p><p>És most a részlet, ami az egész következő állomást megalapozza. <button class="termbtn" id="sim3ActInfo" type="button" aria-expanded="false" aria-controls="sim3ActNote">Fűzzünk össze kettőt</button>:</p><p class="matline"><span class="m">S<sub>2</sub> S<sub>1</sub> = [s<sub>2</sub>s<sub>1</sub> R<sub>2</sub>R<sub>1</sub>, &nbsp;s<sub>2</sub>R<sub>2</sub>t<sub>1</sub> + t<sub>2</sub>]</span></p><p>A forgatások szorzódnak, az eltolások — a szokott módon — összeadódnak, a skálák pedig <strong>szorzódnak</strong>. Nem összeadódnak. Ez a különbség fogja megmondani, milyen számmal érdemes a skálát paraméterezni.</p><div class="bubble" id="sim3ActNote" role="dialog" aria-label="A kompozicios szabaly" hidden><p>Alkalmazzuk a kettőt egymás után egy <span class="m">p</span> pontra. Előbb <span class="m">S<sub>1</sub></span>:</p><p class="matline"><span class="m">S<sub>1</sub> p = s<sub>1</sub>R<sub>1</sub> p + t<sub>1</sub></span></p><p>Erre <span class="m">S<sub>2</sub></span>:</p><p class="matline"><span class="m">s<sub>2</sub>R<sub>2</sub>(s<sub>1</sub>R<sub>1</sub> p + t<sub>1</sub>) + t<sub>2</sub> = s<sub>2</sub>s<sub>1</sub>R<sub>2</sub>R<sub>1</sub> p + (s<sub>2</sub>R<sub>2</sub>t<sub>1</sub> + t<sub>2</sub>)</span></p><p>Ugyanaz a <span class="m">R<sub>2</sub>t<sub>1</sub></span> fél-direkt tag, amit <span class="m">SE(2)</span>-ben láttunk, most még a <span class="m">s<sub>2</sub></span>-vel is megszorozva. A skálarész pedig önmagában egy csoport: az <span class="m">(ℝ<sup>+</sup>, ·)</span>.</p></div>'},
        {t:'Miért log s', b:'<p>Az előző állomás mellékterméke: a skálák <strong>szorzódnak</strong>. Tehát a skálák az <span class="m">(ℝ<sup>+</sup>, ·)</span> multiplikatív csoportot alkotják, nem az <span class="m">(ℝ, +)</span>-t.</p><p>Egy Lie-csoport érintőtere az egységelemnél a Lie-algebra. Itt az egységelem <span class="m">s = 1</span>, és az érintőtér az <em>additív</em> <span class="m">ℝ</span>. A kettő közti <button class="termbtn" id="sim3LogInfo" type="button" aria-expanded="false" aria-controls="sim3LogNote">oda-vissza leképezés</button> pedig pontosan az, amit a jelenet kirajzol:</p><p class="matline"><span class="m">s = e<sup>σ</sup></span></p><p class="matline"><span class="m">σ = log s</span></p><p>Így lesz a Lie-algebra <span class="m">𝔰𝔦𝔪(3) ≅ ℝ<sup>7</sup></span>, a <span class="m">ζ = (ρ, ω, σ)</span> hetedik komponensével.</p><p><strong>Ez kényszer, nem kényelem.</strong> Két okból, és mindkettő elemi:</p><p>Egy: a skála szigorúan pozitív. Ha közvetlenül <span class="m">s</span>-en optimalizálnánk, egy elég nagy lépés átvinné a nullán — a jelenet korall szakaszára. Egy nulla skála összeomlasztja a világot, egy negatív pedig tükröz; egyik sem hasonlósági transzformáció. Ezt a kényszert külön kellene őrizni minden lépésnél. A <span class="m">σ</span>-n nincs mit őrizni: <em>minden</em> valós <span class="m">σ</span> érvényes pozitív <span class="m">s</span>-t ad.</p><p>Kettő: a természetes távolság multiplikatív. A kétszerezés és a felezés ugyanolyan messze van az egytől — <span class="m">σ</span>-ban <span class="m">log 2</span> és <span class="m">−log 2</span>, szimmetrikusan. <span class="m">s</span>-ben ugyanez <span class="m">+1</span> és <span class="m">−0.5</span> volna: egy szimmetrikus lépés aszimmetrikus hatást tenne.</p><p>Ez pontosan ugyanaz a szerep, amit a mátrix-<span class="m">log</span> játszik <span class="m">SO(3)</span>-ban. Ott a görbült, szorzásos csoportból visz a lapos, összeadós érintőtérbe; itt a félegyenesből az egyenesbe. Ugyanaz a minta, egy dimenzióban — ezért érdemes ránézni: itt nincs hova elbújnia.</p><div class="bubble" id="sim3LogNote" role="dialog" aria-label="exp es log egy dimenzioban" hidden><p>Az <span class="m">(ℝ<sup>+</sup>, ·)</span> csoporton az egységelem <span class="m">1</span>. Egy görbe rajta <span class="m">s(τ)</span> alakú; ha <span class="m">s(0) = 1</span>, akkor a sebessége <span class="m">s′(0)</span> egy szám — az érintőtér tehát <span class="m">ℝ</span>.</p><p>Az egyparaméteres részcsoport, ami <span class="m">σ</span> sebességgel indul:</p><p class="matline"><span class="m">s(τ) = e<sup>στ</sup></span></p><p class="matline"><span class="m">s(0) = 1</span></p><p class="matline"><span class="m">s′(0) = σ</span></p><p>és <span class="m">τ = 1</span>-nél éppen <span class="m">exp(σ) = e<sup>σ</sup></span>. Vagyis az <span class="m">e<sup>σ</sup></span>, amit középiskolából ismersz, <em>szó szerint</em> a Lie-exponenciális ezen az egydimenziós csoporton — nem analógia.</p><p>Az <span class="m">e<sup>σ<sub>1</sub></sup>e<sup>σ<sub>2</sub></sup> = e<sup>σ<sub>1</sub>+σ<sub>2</sub></sup></span> azonosság pedig az „összeadást szorzássá” tulajdonság, ugyanaz, ami <span class="m">SO(3)</span>-on a kompozíciót adja. Itt viszont hibatag nélkül, mert egy dimenzióban minden kommutál.</p></div>'},
        {t:'A hierarchia', b:'<p class="matline"><span class="m">SO(3) ⊂ SE(3) ⊂ Sim(3)</span></p><p>Mindhárom Lie-csoport, mindháromnak van Lie-algebrája és <span class="m">exp</span>/<span class="m">log</span> párja. Felfelé haladva egyre <em>kevesebbet</em> őriznek meg — ezt mutatja a három test a jelenetben:</p><p class="matline"><span class="m">SO(3): hossz, szög, origó</span></p><p class="matline"><span class="m">SE(3): hossz, szög</span></p><p class="matline"><span class="m">Sim(3): csak szög</span></p><p>És most: miért éppen ez a hét szabadsági fok érdemel egy holdat?</p><p>Mert egyetlen kamerából <strong>a világ abszolút mérete nem határozható meg</strong>. Egy kétszer akkora szoba, kétszer akkora távolságból, pixelre ugyanazt a képet adja. Az <em>alak</em> rekonstruálható, a <em>méret</em> nem — a monokuláris SLAM/SfM kimenete ezért önkényes egységben van, tipikusan az első baseline hosszára normálva, nem méterben.</p><p>Ebből következik, hogy két rekonstrukció között pontosan egy <span class="m">SE(3)</span> transzformáció <em>és</em> egy skalár skálafaktor lehet a különbség. Ez a hét szám. Ezért a <span class="m">Sim(3)</span> a loop closure és a térkép-igazítás természetes csoportja monokuláris rendszerekben.</p><p>A skála tehát <strong>nem hiba, hanem gauge-szabadság</strong> — csak épp olyan fajta, amit nem lehet egy anchorral rögzíteni, mert az információ egyszerűen nincs benne a mérésekben. Ha van metrikus mélységszenzor, <button class="termbtn" id="sim3ScaleInfo" type="button" aria-expanded="false" aria-controls="sim3ScaleNote">a skála becsülhető</button>.</p><p><strong>És itt ez a hold megáll.</strong> A <span class="m">Sim(3)</span> on-manifold kezelése — a <span class="m">⊞</span>/<span class="m">⊟</span>, a Jacobianok és a kovariancia a 7-DOF esetre — nincs kidolgozva; sem itt, sem a jegyzetekben. Ez tudatos döntés: inkább hiányozzon, mint hogy rosszul álljon itt. Hogy a skála hol lép be egy valódi pipeline-ba, azt a <em>SLAM</em> hold mutatja.</p><div class="bubble" id="sim3ScaleNote" role="dialog" aria-label="A skala becslese" hidden><p>Metrikus mélységgel (RGB-D vagy stereo) a skála a két mélységérték arányából jön, pixelenként:</p><p class="matline"><span class="m">r(u,v) = <span class="frac"><span>D<sub>metric</sub>(u,v)</span><span>D<sub>slam</sub>(u,v)</span></span></span></p><p>és sok pixelen, több frame-en aggregálva:</p><p class="matline"><span class="m">s = medián { r(u,v) }</span></p><p><strong>Miért medián és nem átlag:</strong> okklúziók és rekonstrukciós zaj miatt az outlierek nem kivételek, hanem garantáltan jelen vannak. Ugyanaz a megfontolás, ami a robusztus kernelekhez vezet.</p><p>A kész skála pedig <strong>csak a transzlációt érinti</strong> — a rotáció skálafüggetlen:</p><p class="matline"><span class="m">T<sup>metric</sup> =</span><span class="matrix"><span class="mbracket"></span><span class="mgrid" style="grid-template-columns:repeat(2,auto)"><span>R</span><span>s t</span><span>0<sup>⊤</sup></span><span>1</span></span><span class="mbracket right"></span></span></p><p>Ez matematikailag egy <span class="m">Sim(3) → SE(3)</span> leképezés rögzített <span class="m">s</span>-sel, és az eredmény méterben mért <span class="m">SE(3)</span> póz.</p></div>'}
      ],
      en: [
        {t:'The Seventh Degree of Freedom', b:'<p><span class="m">Sim(3)</span> is the group of <em>similarity</em> transformations: rotation, translation, and one new thing — <strong>scale</strong>.</p><p class="matline"><span class="m">S =</span><span class="matrix"><span class="mbracket"></span><span class="mgrid" style="grid-template-columns:repeat(2,auto)"><span>sR</span><span>t</span><span>0<sup>⊤</sup></span><span>1</span></span><span class="mbracket right"></span></span>,&nbsp;&nbsp;<span class="m">s ∈ ℝ<sup>+</sup></span></p><p class="matline"><span class="m">p ⟼ s R p + t</span></p><p>Degrees of freedom: the six of <span class="m">SE(3)</span>, plus one scalar. <strong>7</strong> in total.</p><p>What does it preserve? <strong>Angles</strong> yes, <strong>lengths</strong> no — hence “similarity”: the shape survives, the size does not. In the scene the body turns, slides and <em>breathes</em>, but its three axes stay perpendicular throughout.</p><p>And now the detail the whole next station rests on. <button class="termbtn" id="sim3ActInfo" type="button" aria-expanded="false" aria-controls="sim3ActNote">Compose two of them</button>:</p><p class="matline"><span class="m">S<sub>2</sub> S<sub>1</sub> = [s<sub>2</sub>s<sub>1</sub> R<sub>2</sub>R<sub>1</sub>, &nbsp;s<sub>2</sub>R<sub>2</sub>t<sub>1</sub> + t<sub>2</sub>]</span></p><p>Rotations multiply, translations add as usual — and the scales <strong>multiply</strong>. They do not add. That difference is what decides which number to parameterise scale by.</p><div class="bubble" id="sim3ActNote" role="dialog" aria-label="The composition rule" hidden><p>Apply the two in turn to a point <span class="m">p</span>. First <span class="m">S<sub>1</sub></span>:</p><p class="matline"><span class="m">S<sub>1</sub> p = s<sub>1</sub>R<sub>1</sub> p + t<sub>1</sub></span></p><p>Then <span class="m">S<sub>2</sub></span> on that:</p><p class="matline"><span class="m">s<sub>2</sub>R<sub>2</sub>(s<sub>1</sub>R<sub>1</sub> p + t<sub>1</sub>) + t<sub>2</sub> = s<sub>2</sub>s<sub>1</sub>R<sub>2</sub>R<sub>1</sub> p + (s<sub>2</sub>R<sub>2</sub>t<sub>1</sub> + t<sub>2</sub>)</span></p><p>The same semidirect <span class="m">R<sub>2</sub>t<sub>1</sub></span> term we met in <span class="m">SE(2)</span>, now scaled by <span class="m">s<sub>2</sub></span> as well. And the scale part is a group in its own right: <span class="m">(ℝ<sup>+</sup>, ·)</span>.</p></div>'},
        {t:'Why log s', b:'<p>A by-product of the last station: scales <strong>multiply</strong>. So the scales form the multiplicative group <span class="m">(ℝ<sup>+</sup>, ·)</span>, not <span class="m">(ℝ, +)</span>.</p><p>The tangent space of a Lie group at its identity is its Lie algebra. Here the identity is <span class="m">s = 1</span> and the tangent space is the <em>additive</em> <span class="m">ℝ</span>. The <button class="termbtn" id="sim3LogInfo" type="button" aria-expanded="false" aria-controls="sim3LogNote">map between them</button> is exactly what the scene plots:</p><p class="matline"><span class="m">s = e<sup>σ</sup></span></p><p class="matline"><span class="m">σ = log s</span></p><p>which is what makes the Lie algebra <span class="m">𝔰𝔦𝔪(3) ≅ ℝ<sup>7</sup></span>, with <span class="m">ζ = (ρ, ω, σ)</span> and <span class="m">σ</span> as its seventh component.</p><p><strong>This is forced, not convenient.</strong> For two reasons, both elementary:</p><p>One: scale is strictly positive. Optimising on <span class="m">s</span> directly, a large enough step would carry it across zero — onto the coral stretch in the scene. A zero scale collapses the world and a negative one reflects it; neither is a similarity transformation. That constraint would have to be policed at every step. On <span class="m">σ</span> there is nothing to police: <em>every</em> real <span class="m">σ</span> gives a valid positive <span class="m">s</span>.</p><p>Two: the natural distance is multiplicative. Doubling and halving are equally far from one — in <span class="m">σ</span> that is <span class="m">log 2</span> and <span class="m">−log 2</span>, symmetrically. In <span class="m">s</span> the same pair is <span class="m">+1</span> and <span class="m">−0.5</span>: a symmetric step would have an asymmetric effect.</p><p>This is precisely the role the matrix <span class="m">log</span> plays in <span class="m">SO(3)</span>. There it leads from the curved, multiplicative group to the flat, additive tangent space; here from the half-line to the line. The same pattern in one dimension — worth looking at for that reason: there is nowhere for it to hide.</p><div class="bubble" id="sim3LogNote" role="dialog" aria-label="exp and log in one dimension" hidden><p>On the group <span class="m">(ℝ<sup>+</sup>, ·)</span> the identity is <span class="m">1</span>. A curve on it looks like <span class="m">s(τ)</span>; if <span class="m">s(0) = 1</span> then its velocity <span class="m">s′(0)</span> is a number — so the tangent space is <span class="m">ℝ</span>.</p><p>The one-parameter subgroup leaving the identity at velocity <span class="m">σ</span>:</p><p class="matline"><span class="m">s(τ) = e<sup>στ</sup></span></p><p class="matline"><span class="m">s(0) = 1</span></p><p class="matline"><span class="m">s′(0) = σ</span></p><p>and at <span class="m">τ = 1</span> it is exactly <span class="m">exp(σ) = e<sup>σ</sup></span>. That is, the <span class="m">e<sup>σ</sup></span> you know from school <em>is</em> the Lie exponential of this one-dimensional group — not an analogy for it.</p><p>And the identity <span class="m">e<sup>σ<sub>1</sub></sup>e<sup>σ<sub>2</sub></sup> = e<sup>σ<sub>1</sub>+σ<sub>2</sub></sup></span> is the “addition into multiplication” property, the same one that gives composition on <span class="m">SO(3)</span> — here with no error term, because in one dimension everything commutes.</p></div>'},
        {t:'The Hierarchy', b:'<p class="matline"><span class="m">SO(3) ⊂ SE(3) ⊂ Sim(3)</span></p><p>All three are Lie groups, all three have a Lie algebra and an <span class="m">exp</span>/<span class="m">log</span> pair. Going up, they preserve <em>less and less</em> — which is what the three bodies in the scene are doing:</p><p class="matline"><span class="m">SO(3): length, angle, origin</span></p><p class="matline"><span class="m">SE(3): length, angle</span></p><p class="matline"><span class="m">Sim(3): angle only</span></p><p>So why do these seven degrees of freedom deserve a moon?</p><p>Because from a single camera <strong>the absolute size of the world cannot be determined</strong>. A room twice as large, seen from twice as far, gives a pixel-identical image. The <em>shape</em> is recoverable, the <em>size</em> is not — which is why monocular SLAM/SfM output is in arbitrary units, typically normalised to the length of the first baseline, and not in metres.</p><p>It follows that two reconstructions can differ by exactly one <span class="m">SE(3)</span> transformation <em>and</em> one scalar scale factor. Those are the seven numbers. That is what makes <span class="m">Sim(3)</span> the natural group for loop closure and map alignment in monocular systems.</p><p>Scale is therefore <strong>not an error but a gauge freedom</strong> — of a kind that cannot be pinned down with an anchor, because the information is simply not in the measurements. Given a metric depth sensor, <button class="termbtn" id="sim3ScaleInfo" type="button" aria-expanded="false" aria-controls="sim3ScaleNote">scale can be estimated</button>.</p><p><strong>And this moon stops here.</strong> On-manifold handling of <span class="m">Sim(3)</span> — <span class="m">⊞</span>/<span class="m">⊟</span>, the Jacobians and covariance for the 7-DOF case — is not worked out, here or in the notes. That is deliberate: better absent than wrong. Where scale enters an actual pipeline is what the <em>SLAM</em> moon shows.</p><div class="bubble" id="sim3ScaleNote" role="dialog" aria-label="Estimating the scale" hidden><p>With metric depth (RGB-D or stereo) the scale comes from the ratio of the two depth values, per pixel:</p><p class="matline"><span class="m">r(u,v) = <span class="frac"><span>D<sub>metric</sub>(u,v)</span><span>D<sub>slam</sub>(u,v)</span></span></span></p><p>aggregated over many pixels and several frames:</p><p class="matline"><span class="m">s = median { r(u,v) }</span></p><p><strong>Why the median and not the mean:</strong> because of occlusions and reconstruction noise, outliers are not exceptions but guaranteed. The same consideration that leads to robust kernels.</p><p>The finished scale then <strong>touches only the translation</strong> — rotation is scale-free:</p><p class="matline"><span class="m">T<sup>metric</sup> =</span><span class="matrix"><span class="mbracket"></span><span class="mgrid" style="grid-template-columns:repeat(2,auto)"><span>R</span><span>s t</span><span>0<sup>⊤</sup></span><span>1</span></span><span class="mbracket right"></span></span></p><p>Mathematically a <span class="m">Sim(3) → SE(3)</span> map at fixed <span class="m">s</span>, whose result is an <span class="m">SE(3)</span> pose in metres.</p></div>'}
      ],
      ja: [
        {t:'七番目の自由度', b:'<p><span class="m">Sim(3)</span> は<em>相似</em>変換の群です: 回転、並進、そして新しいもの一つ — <strong>スケール</strong>。</p><p class="matline"><span class="m">S =</span><span class="matrix"><span class="mbracket"></span><span class="mgrid" style="grid-template-columns:repeat(2,auto)"><span>sR</span><span>t</span><span>0<sup>⊤</sup></span><span>1</span></span><span class="mbracket right"></span></span>,&nbsp;&nbsp;<span class="m">s ∈ ℝ<sup>+</sup></span></p><p class="matline"><span class="m">p ⟼ s R p + t</span></p><p>自由度は <span class="m">SE(3)</span> の 6 にスカラー 1 を足して、合計 <strong>7</strong>。</p><p>何を保つのか。<strong>角</strong>は保ち、<strong>長さ</strong>は保ちません — だから「相似」です: かたちは残り、大きさは残らない。シーンでは物体が回り、滑り、そして<em>呼吸</em>しますが、三本の軸は終始直交したままです。</p><p>そして次の駅がまるごと乗っている細部です。<button class="termbtn" id="sim3ActInfo" type="button" aria-expanded="false" aria-controls="sim3ActNote">二つ合成してみましょう</button>:</p><p class="matline"><span class="m">S<sub>2</sub> S<sub>1</sub> = [s<sub>2</sub>s<sub>1</sub> R<sub>2</sub>R<sub>1</sub>, &nbsp;s<sub>2</sub>R<sub>2</sub>t<sub>1</sub> + t<sub>2</sub>]</span></p><p>回転は掛かり、並進はいつもどおり足され、スケールは<strong>掛かります</strong>。足されません。この違いが、スケールをどの数でパラメータ化すべきかを決めます。</p><div class="bubble" id="sim3ActNote" role="dialog" aria-label="合成の規則" hidden><p>点 <span class="m">p</span> に順に作用させます。まず <span class="m">S<sub>1</sub></span>:</p><p class="matline"><span class="m">S<sub>1</sub> p = s<sub>1</sub>R<sub>1</sub> p + t<sub>1</sub></span></p><p>その結果に <span class="m">S<sub>2</sub></span>:</p><p class="matline"><span class="m">s<sub>2</sub>R<sub>2</sub>(s<sub>1</sub>R<sub>1</sub> p + t<sub>1</sub>) + t<sub>2</sub> = s<sub>2</sub>s<sub>1</sub>R<sub>2</sub>R<sub>1</sub> p + (s<sub>2</sub>R<sub>2</sub>t<sub>1</sub> + t<sub>2</sub>)</span></p><p><span class="m">SE(2)</span> で出会ったのと同じ半直積の <span class="m">R<sub>2</sub>t<sub>1</sub></span> 項が、さらに <span class="m">s<sub>2</sub></span> 倍されています。そしてスケール部分はそれ自体で一つの群です: <span class="m">(ℝ<sup>+</sup>, ·)</span>。</p></div>'},
        {t:'なぜ log s なのか', b:'<p>前の駅の副産物: スケールは<strong>掛かります</strong>。つまりスケール全体は乗法群 <span class="m">(ℝ<sup>+</sup>, ·)</span> をなし、<span class="m">(ℝ, +)</span> ではありません。</p><p>Lie 群の単位元における接空間が Lie 代数です。ここでの単位元は <span class="m">s = 1</span> で、接空間は<em>加法的</em>な <span class="m">ℝ</span>。その<button class="termbtn" id="sim3LogInfo" type="button" aria-expanded="false" aria-controls="sim3LogNote">行き来の写像</button>こそ、シーンが描いているものです:</p><p class="matline"><span class="m">s = e<sup>σ</sup></span></p><p class="matline"><span class="m">σ = log s</span></p><p>これにより Lie 代数は <span class="m">𝔰𝔦𝔪(3) ≅ ℝ<sup>7</sup></span>、<span class="m">ζ = (ρ, ω, σ)</span> の第七成分が <span class="m">σ</span> になります。</p><p><strong>これは便宜ではなく強制です。</strong>理由は二つ、どちらも初等的です。</p><p>一つ: スケールは厳密に正です。<span class="m">s</span> の上で直接最適化すれば、十分大きな一歩がゼロを越えてしまいます — シーンの珊瑚色の区間へ。スケール 0 は世界をつぶし、負のスケールは鏡映します。どちらも相似変換ではありません。この拘束を毎ステップ見張る必要が出ます。<span class="m">σ</span> には見張るものがありません: <em>どの</em>実数 <span class="m">σ</span> も正の <span class="m">s</span> を与えます。</p><p>二つ: 自然な距離が乗法的です。2 倍と 1/2 倍は 1 から等距離であるべきで、<span class="m">σ</span> では <span class="m">log 2</span> と <span class="m">−log 2</span>、対称です。<span class="m">s</span> では同じ対が <span class="m">+1</span> と <span class="m">−0.5</span>: 対称な一歩が非対称な効果を持ってしまいます。</p><p>これは <span class="m">SO(3)</span> における行列 <span class="m">log</span> とまったく同じ役回りです。あちらは曲がった乗法的な群から平坦で加法的な接空間へ、こちらは半直線から直線へ。同じ模様が一次元で現れている — だから見る価値があります: ここには隠れる場所がないのです。</p><div class="bubble" id="sim3LogNote" role="dialog" aria-label="一次元の exp と log" hidden><p>群 <span class="m">(ℝ<sup>+</sup>, ·)</span> の単位元は <span class="m">1</span> です。その上の曲線は <span class="m">s(τ)</span> の形をしていて、<span class="m">s(0) = 1</span> なら速度 <span class="m">s′(0)</span> は一つの数 — つまり接空間は <span class="m">ℝ</span> です。</p><p>速度 <span class="m">σ</span> で単位元を出る一径数部分群:</p><p class="matline"><span class="m">s(τ) = e<sup>στ</sup></span></p><p class="matline"><span class="m">s(0) = 1</span></p><p class="matline"><span class="m">s′(0) = σ</span></p><p><span class="m">τ = 1</span> でちょうど <span class="m">exp(σ) = e<sup>σ</sup></span>。つまり学校で習う <span class="m">e<sup>σ</sup></span> は、この一次元群の Lie 指数<em>そのもの</em>であって、その比喩ではありません。</p><p>そして <span class="m">e<sup>σ<sub>1</sub></sup>e<sup>σ<sub>2</sub></sup> = e<sup>σ<sub>1</sub>+σ<sub>2</sub></sup></span> は「足し算を掛け算へ」の性質で、<span class="m">SO(3)</span> 上で合成を与えるものと同じです。ただしここでは誤差項がありません — 一次元ではすべてが可換だからです。</p></div>'},
        {t:'階層', b:'<p class="matline"><span class="m">SO(3) ⊂ SE(3) ⊂ Sim(3)</span></p><p>三つとも Lie 群であり、三つとも Lie 代数と <span class="m">exp</span>/<span class="m">log</span> の対を持ちます。上に行くほど保つものは<em>減って</em>いきます — シーンの三つの物体がしているのがそれです:</p><p class="matline"><span class="m">SO(3): 長さ・角・原点</span></p><p class="matline"><span class="m">SE(3): 長さ・角</span></p><p class="matline"><span class="m">Sim(3): 角のみ</span></p><p>では、なぜこの七つの自由度が衛星に値するのか。</p><p>単眼カメラ一台からは<strong>世界の絶対的な大きさが決まらない</strong>からです。二倍の広さの部屋を二倍の距離から見れば、画素まで同じ画像になります。<em>かたち</em>は復元でき、<em>大きさ</em>はできない — だから単眼 SLAM/SfM の出力は任意単位（ふつう最初のベースライン長で正規化）であって、メートルではありません。</p><p>したがって二つの復元結果の差は、ちょうど一つの <span class="m">SE(3)</span> 変換<em>と</em>一つのスカラー倍率でありえます。その七つの数です。これが単眼系においてループ閉じ込みと地図の位置合わせにとって <span class="m">Sim(3)</span> が自然な群である理由です。</p><p>つまりスケールは<strong>誤りではなくゲージ自由度</strong>です — ただしアンカーでは固定できない種類の。情報がそもそも観測に入っていないからです。計量的な深度センサがあれば<button class="termbtn" id="sim3ScaleInfo" type="button" aria-expanded="false" aria-controls="sim3ScaleNote">スケールは推定できます</button>。</p><p><strong>そしてこの衛星はここで止まります。</strong><span class="m">Sim(3)</span> の多様体上の扱い — 7 自由度に対する <span class="m">⊞</span>/<span class="m">⊟</span>、Jacobian、共分散 — はここにも覚え書きにも書かれていません。これは意図的です: 誤っているより、無いほうがよい。スケールが実際のパイプラインのどこで入るかは <em>SLAM</em> の衛星が見せます。</p><div class="bubble" id="sim3ScaleNote" role="dialog" aria-label="スケールの推定" hidden><p>計量的な深度（RGB-D やステレオ）があれば、スケールは二つの深度値の比から画素ごとに得られます:</p><p class="matline"><span class="m">r(u,v) = <span class="frac"><span>D<sub>metric</sub>(u,v)</span><span>D<sub>slam</sub>(u,v)</span></span></span></p><p>多数の画素・複数フレームで集約して:</p><p class="matline"><span class="m">s = median { r(u,v) }</span></p><p><strong>なぜ平均でなく中央値か:</strong> 遮蔽と復元ノイズのため、外れ値は例外ではなく確実に存在するからです。ロバストなカーネルへ導くのと同じ考えです。</p><p>得られたスケールは<strong>並進にしか触れません</strong> — 回転はスケールに依りません:</p><p class="matline"><span class="m">T<sup>metric</sup> =</span><span class="matrix"><span class="mbracket"></span><span class="mgrid" style="grid-template-columns:repeat(2,auto)"><span>R</span><span>s t</span><span>0<sup>⊤</sup></span><span>1</span></span><span class="mbracket right"></span></span></p><p>数学的には <span class="m">s</span> を固定した <span class="m">Sim(3) → SE(3)</span> の写像で、結果はメートル単位の <span class="m">SE(3)</span> 姿勢です。</p></div>'}
      ]
    }
  };
})();
