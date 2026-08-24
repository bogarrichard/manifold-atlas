'use strict';
/* Journey: SE(2) — the semidirect product. The Geometry planet's third moon: rotation and
   translation stop being independent.

   Three stations, deliberately shallow (docs/project/journey-status.md): T = (R(θ), t) and
   the composition rule whose entire content is the R₁t₂ term; the two orders of one
   rotation and one translation landing (I − R)t apart; and Chasles in the plane — every
   planar rigid motion with θ ≠ 0 is a single rotation about c = (I − R)⁻¹t.

   The three stations are one argument, not three facts: station 2 makes (I − R)t visible
   as the gap between two routes, and station 3 inverts that same operator to find the
   centre. This is exp in SE(2), and the 2D shadow of the SE(3) screw — which is where the
   journey hands off, rather than re-deriving what the SE(3) moon owns.

   One worked example throughout: θ = 1.25 rad, t = (2.5, 0.7), giving c ≈ (0.765, 2.083)
   at radius 2.219. Model coordinates are drawn through P()/S so the cards can quote the
   numbers while the scene is scaled to the camera. Cards (hu/en/ja) in-file. Requires LIE.kit. */
window.LIE = window.LIE || {};
LIE.journeys = LIE.journeys || {};
LIE.journeys['geometry-se2'] = (function(){
  const K = LIE.kit;
  const { V3, ease, hexStr, fatArrow, setArrow, makeLabel } = K;

  const SP  = [V3(0,0,0), V3(43,4,-11), V3(86,-3,10)];
  const OFF = [V3(0,2.2,9.0), V3(0,2.4,9.4), V3(0,2.4,9.2)];

  // The worked example the cards quote, in model coordinates.
  const TH = 1.25, TX = 2.5, TY = 0.7;
  const CT = Math.cos(TH), ST = Math.sin(TH);
  const rot = (x,y,a)=>[x*Math.cos(a) - y*Math.sin(a), x*Math.sin(a) + y*Math.cos(a)];
  const RT = rot(TX, TY, TH);                          // R t — where "translate first" ends
  const DET = 2*(1-CT);                                // det(I − R) = 2(1 − cos θ)
  const CX = ((1-CT)*TX - ST*TY)/DET, CY = (ST*TX + (1-CT)*TY)/DET;   // c = (I − R)⁻¹ t
  const RAD = Math.hypot(CX, CY);                      // the arc radius, |c − 0| = |c − t|

  // Model → scene: recentre on the action and scale it up to the camera's framing.
  const MX = 1.15, MY = 1.2, SC = 1.3;

  function build(C, PAL){
    const COL = PAL || K.palette('dark');
    const HX = { teal:hexStr(COL.teal), coral:hexStr(COL.coral), violet:hexStr(COL.violet),
                 amber:hexStr(COL.amber), green:hexStr(COL.green), ink:hexStr(COL.ink) };

    const P = (x,y)=>V3(x-MX, y-MY, 0);
    function frame(g){                                  // the scaled, recentred model space
      const G = new THREE.Group(); G.position.set(0,0.55,0); G.scale.setScalar(SC); g.add(G);
      return G;
    }
    function line(G, pts, color, op){
      const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({color, transparent:true, opacity:op===undefined?0.9:op}));
      G.add(l); return l;
    }
    function dot(G, color, r){
      const d = new THREE.Mesh(new THREE.SphereGeometry(r||0.09,14,12), new THREE.MeshBasicMaterial({color}));
      G.add(d); return d;
    }
    function dimArrow(G, color, r, from, to, op){
      const a = fatArrow(color, r); setArrow(a, from, to);
      a.userData.cyl.material.transparent = true; a.userData.cyl.material.opacity = op;
      a.userData.cone.material.transparent = true; a.userData.cone.material.opacity = op;
      G.add(a); return a;
    }
    function axes(G){
      dimArrow(G, COL.coral, 0.022, P(0,0), V3(2.0,0,0), 0.30);
      dimArrow(G, COL.teal,  0.022, P(0,0), V3(0,2.0,0), 0.30);
    }
    /* A little dart, so orientation is readable at a glance: nose up the local +y, and a
       dot at its own origin — that origin is the point the algebra actually moves. */
    function dart(G, color, op){
      const b = new THREE.Group();
      const pts = [V3(0,0.36,0), V3(-0.27,-0.26,0), V3(0,-0.07,0), V3(0.27,-0.26,0), V3(0,0.36,0)];
      b.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({color, transparent:true, opacity:op===undefined?0.95:op})));
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.075,12,10),
        new THREE.MeshBasicMaterial({color, transparent:true, opacity:op===undefined?0.95:op}));
      b.add(d); G.add(b); return b;
    }
    const place = (b,x,y,a)=>{ b.position.copy(P(x,y)); b.rotation.z = a; };
    // an arc of the circle about (cx,cy), swept from angle a0 to a1
    function arcAbout(cx,cy,r,a0,a1,seg){
      const p=[]; for(let i=0;i<=seg;i++){ const a=a0+(a1-a0)*i/seg;
        p.push(P(cx + Math.cos(a)*r, cy + Math.sin(a)*r)); } return p;
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
      /* 0 · T = (R, t) built out of its two halves: turn in place by θ, then slide by t.
            The ghost stays at the identity so the total motion stays legible. */
      g=>{
        const G = frame(g);
        axes(G);
        dart(G, COL.ink, 0.25);                                   // identity ghost, at the origin
        const b = dart(G, COL.amber);
        const tArrow = dimArrow(G, COL.violet, 0.032, P(0,0), V3(TX,TY,0), 0.75);
        line(G, arcAbout(0,0,0.85,Math.PI/2,Math.PI/2+TH,28), COL.coral, 0.8);   // the θ sweep
        const lt = makeLabel('t', HX.violet, 1.3);
        lt.position.copy(P(TX*0.55, TY*0.55)).add(V3(0.1,-0.34,0)); G.add(lt);
        const lth = makeLabel('θ', HX.coral, 1.2); lth.position.copy(P(0,0)).add(V3(-0.62,0.82,0)); G.add(lth);
        const lbl = makeLabel('SE(2) = [R(θ), t]', HX.ink, 3.4); lbl.position.set(0, 3.05, 0); g.add(lbl);

        const T0=0.8, T1=1.3, T2=1.3, T3=1.2, PER=T0+T1+T2+T3;
        return {tick(t){
          const tc = t % PER;
          let a=0, u=0;
          if(tc < T0){ a=0; u=0; }
          else if(tc < T0+T1){ a = TH*ease((tc-T0)/T1); u = 0; }             // turn in place
          else if(tc < T0+T1+T2){ a = TH; u = ease((tc-T0-T1)/T2); }         // then slide by t
          else { a = TH; u = 1; }
          place(b, TX*u, TY*u, a);
          tArrow.visible = u > 0.001;
        }};
      },

      /* 1 · the two orders. Amber: rotate, then translate → (R, t). Violet: translate, then
            rotate about the origin → (R, R t). Same orientation, different place; the dashed
            gap between the endpoints is (I − R)t, the operator station 3 inverts. */
      g=>{
        const G = frame(g);
        axes(G);
        dart(G, COL.ink, 0.22);
        const bA = dart(G, COL.amber), bV = dart(G, COL.violet);
        const endA = dot(G, COL.amber, 0.075); endA.position.copy(P(TX,TY));
        const endV = dot(G, COL.violet, 0.075); endV.position.copy(P(RT[0],RT[1]));
        const gap = K.dashedLine(P(TX,TY), P(RT[0],RT[1]), COL.green, 0.10); G.add(gap);
        const lg = makeLabel('(I − R) t', HX.green, 2.4);
        lg.position.copy(P((TX+RT[0])/2, (TY+RT[1])/2)).add(V3(0.15,0.3,0)); G.add(lg);
        const lA = makeLabel('R p + t', HX.amber, 2.2); lA.position.copy(P(TX,TY)).add(V3(0.35,-0.42,0)); G.add(lA);
        const lV = makeLabel('R p + R t', HX.violet, 2.6); lV.position.copy(P(RT[0],RT[1])).add(V3(-0.5,0.5,0)); G.add(lV);

        const T0=0.8, T1=1.4, T2=1.4, T3=1.5, PER=T0+T1+T2+T3;
        return {tick(t){
          const tc = t % PER;
          let e1=0, e2=0;
          if(tc < T0){ e1=0; e2=0; }
          else if(tc < T0+T1){ e1 = ease((tc-T0)/T1); e2 = 0; }
          else if(tc < T0+T1+T2){ e1 = 1; e2 = ease((tc-T0-T1)/T2); }
          else { e1 = 1; e2 = 1; }
          // amber: first turn (e1), then slide (e2)
          place(bA, TX*e2, TY*e2, TH*e1);
          // violet: first slide (e1), then swing about the origin (e2)
          const a = TH*e2, p = rot(TX*e1, TY*e1, a);
          place(bV, p[0], p[1], a);
          const vis = e2 > 0.985;
          gap.material.opacity = vis ? 0.85 : 0.0;
          lg.material.opacity = vis ? 0.95 : 0.0;
        }};
      },

      /* 2 · the fixed point. The same (R, t), but performed as one rotation about
            c = (I − R)⁻¹t: the body rides an arc of radius |c|, and the translation turns
            out to have been an artefact of watching from the wrong centre. */
      g=>{
        const G = frame(g);
        axes(G);
        dart(G, COL.ink, 0.22);                                   // start pose, at the origin
        const ghost = dart(G, COL.ink, 0.22); place(ghost, TX, TY, TH);   // end pose
        const a0 = Math.atan2(-CY, -CX);                          // c → origin
        line(G, arcAbout(CX,CY,RAD,a0,a0+TH,64), COL.green, 0.85);
        line(G, [P(CX,CY), P(0,0)], COL.green, 0.28);
        line(G, [P(CX,CY), P(TX,TY)], COL.green, 0.28);
        const cDot = dot(G, COL.green, 0.105); cDot.position.copy(P(CX,CY));
        const lc = makeLabel('c', HX.green, 1.3); lc.position.copy(P(CX,CY)).add(V3(-0.36,0.3,0)); G.add(lc);
        const b = dart(G, COL.amber);
        const lbl = makeLabel('c = (I − R)^{−1} t', HX.ink, 3.6); lbl.position.set(0, 3.05, 0); g.add(lbl);

        const T0=0.9, T1=2.0, T2=1.2, PER=T0+T1+T2;
        return {tick(t){
          const tc = t % PER;
          const s = tc < T0 ? 0 : tc < T0+T1 ? ease((tc-T0)/T1) : 1;
          const a = TH*s;
          // rigid rotation about c, applied to the start pose at the origin
          const p = rot(-CX, -CY, a);
          place(b, CX + p[0], CY + p[1], a);
        }};
      }
    ];

    function bindCard(i){
      wireBubble('se2HomInfo','se2HomNote');       // card 1 · the homogeneous 3×3 form
      wireBubble('se2OrderInfo','se2OrderNote');   // card 2 · the two products, worked out
      wireBubble('se2FixInfo','se2FixNote');       // card 3 · when (I − R) is invertible
    }

    return { stations, bindCard };
  }

  return {
    id: 'geometry-se2',
    tier: 'geometry',
    layout: { SP, OFF },
    threadKey: 'teal',
    // Curriculum position, as data rather than prose: `next` is the following moon in
    // hub.js's BRANCHES order (crossing into the next branch at a branch end), `handoffs`
    // are the topical pointers this journey's cards name, `requires` the hard
    // back-references its opening card makes. engine.js renders next+handoffs as links
    // on the last station; check.html verifies every id resolves and that the next-chain
    // still agrees with BRANCHES.
    seq: { next: 'geometry-so3', requires: ['geometry-so2'], handoffs: ['geometry-se3'] },
    build,
    cards: {
      hu: [
        {t:'Forgatás és eltolás egyben', b:'<p>Az <span class="m">SE(2)</span> a sík <em>merev</em> mozgásai: ami a hosszakat és a szögeket megtartja, és nem tükröz. Egy elemet két adat ír le — egy <span class="m">θ</span> szög és egy <span class="m">t</span> eltolásvektor —, összesen <strong>3 szabadsági fok</strong>.</p><p class="matline"><span class="m">T = [R(θ), t]</span></p><p class="matline"><span class="m">p ⟼ R p + t</span></p><p>A jelenetben ez a két fél külön látszik: a test előbb elfordul a helyén <span class="m">θ</span>-val, aztán elcsúszik <span class="m">t</span>-vel.</p><p>Most fűzzünk össze kettőt — előbb <span class="m">T<sub>1</sub></span>, aztán <span class="m">T<sub>2</sub></span>. <button class="termbtn" id="se2HomInfo" type="button" aria-expanded="false" aria-controls="se2HomNote">Homogén alakban</button> ez sima mátrixszorzás, és ennyi jön ki:</p><p class="matline"><span class="m">T<sub>2</sub> T<sub>1</sub> = [R<sub>2</sub>R<sub>1</sub>, &nbsp;R<sub>2</sub>t<sub>1</sub> + t<sub>2</sub>]</span></p><p>Az egész állomás tartalma az <span class="m">R<sub>2</sub>t<sub>1</sub></span> tag. Az <em>első</em> eltolást a <em>második</em> forgatás <strong>elforgatja</strong> — a két rész nem él egymás mellett függetlenül, hanem az egyik <em>hat</em> a másikra. Ezt hívják <em>fél-direkt szorzatnak</em>.</p><p>Ha ez a tag nem lenne ott, <span class="m">SE(2)</span> egyszerűen <span class="m">SO(2) × ℝ<sup>2</sup></span> volna: egy szög és egy vektor, egymástól függetlenül, és minden felcserélhető. A következő állomás megmutatja, mennyire nem az.</p><div class="bubble" id="se2HomNote" role="dialog" aria-label="A homogen alak" hidden><p>A <span class="m">p ↦ Rp + t</span> hozzárendelés nem lineáris (a <span class="m">t</span> miatt), de eggyel nagyobb dimenzióban azzá tehető. Fűzzünk a ponthoz egy <span class="m">1</span>-est, a transzformációt pedig írjuk <span class="m">3×3</span>-asként:</p><p class="matline"><span class="m">T =</span><span class="matrix"><span class="mbracket"></span><span class="mgrid" style="grid-template-columns:repeat(2,auto)"><span>R</span><span>t</span><span>0<sup>⊤</sup></span><span>1</span></span><span class="mbracket right"></span></span></p><p>Ekkor</p><p class="matline"><span class="m">T</span><span class="matrix"><span class="mbracket"></span><span class="mgrid" style="grid-template-columns:auto"><span>p</span><span>1</span></span><span class="mbracket right"></span></span><span class="m">=</span><span class="matrix"><span class="mbracket"></span><span class="mgrid" style="grid-template-columns:auto"><span>Rp + t</span><span>1</span></span><span class="mbracket right"></span></span></p><p>és két mozgás összefűzése <strong>mátrixszorzás</strong> lesz. Ez nem trükk, hanem a csoportszerkezet felmutatása: a szorzatmátrix bal felső blokkja <span class="m">R<sub>2</sub>R<sub>1</sub></span>, a jobb felső <span class="m">R<sub>2</sub>t<sub>1</sub> + t<sub>2</sub></span> — a fenti szabály egy sor számolás.</p><p>Ugyanez az alak megy tovább <span class="m">SE(3)</span>-ba és <span class="m">Sim(3)</span>-ba, csak nagyobb blokkokkal.</p></div>'},
        {t:'A sorrend számít', b:'<p>Vegyünk két nagyon egyszerű elemet: egy tiszta forgatást és egy tiszta eltolást.</p><p class="matline"><span class="m">R = [R(θ), 0]</span></p><p class="matline"><span class="m">Tr = [I, t]</span></p><p>Fűzzük őket össze mindkét sorrendben. <button class="termbtn" id="se2OrderInfo" type="button" aria-expanded="false" aria-controls="se2OrderNote">Az előző szabályból</button>:</p><p class="matline"><span class="m">Tr · R = [R, t]</span>&nbsp;→&nbsp;<span class="m">p ↦ R p + t</span></p><p class="matline"><span class="m">R · Tr = [R, R t]</span>&nbsp;→&nbsp;<span class="m">p ↦ R(p + t) = R p + R t</span></p><p>Az <em>orientáció</em> mindkét esetben ugyanaz. A <em>hely</em> nem. A különbség pontosan:</p><p class="matline"><span class="m">t − R t = (I − R) t</span></p><p>A jelenetben <span class="m">θ = 1.25 rad</span> (≈ 72°) és <span class="m">t = (2.5, &nbsp;0.7)</span>. A borostyán test — előbb fordul, aztán csúszik — a <span class="m">(2.5, &nbsp;0.7)</span> pontban áll meg. A lila — előbb csúszik, aztán fordul — a <span class="m">(0.12, &nbsp;2.59)</span> pontban. Ugyanaz a két mozdulat, két nagyon különböző hely.</p><p>És most figyelj arra, honnan jön ez. <span class="m">SO(2)</span> <em>kommutatív</em> volt; a forgatásrész itt is az. A nem-kommutativitás nem a forgatásokból származik, hanem abból, hogy <strong>a forgatás megfogja az eltolást</strong>. Ez tétel, nem konvenció: amíg az <span class="m">R<sub>2</sub>t<sub>1</sub></span> tag ott van, addig a sorrend számít.</p><p>Jegyezd meg az <span class="m">(I − R)</span> operátort. A következő állomáson pontosan ezt fogjuk invertálni.</p><div class="bubble" id="se2OrderNote" role="dialog" aria-label="A ket szorzat" hidden><p>A szabály — <span class="m">T<sub>1</sub></span> hat előbb: <span class="m">T<sub>2</sub>T<sub>1</sub> = [R<sub>2</sub>R<sub>1</sub>, R<sub>2</sub>t<sub>1</sub> + t<sub>2</sub>]</span>.</p><p>Előbb forgatás, aztán eltolás — <span class="m">T<sub>1</sub> = R = [R, 0]</span>, <span class="m">T<sub>2</sub> = Tr = [I, t]</span>:</p><p class="matline"><span class="m">[I·R, &nbsp;I·0 + t] = [R, t]</span></p><p>Most fordítva — <span class="m">T<sub>1</sub> = Tr</span>, <span class="m">T<sub>2</sub> = R</span>:</p><p class="matline"><span class="m">[R·I, &nbsp;R·t + 0] = [R, R t]</span></p><p>A bal oldali tényező forgatása mindig ráül a jobb oldali eltolására — ezért nem mindegy, melyik van bal oldalt.</p></div>'},
        {t:'Minden síkbeli mozgás egy forgatás — valahol', b:'<p>A <span class="m">T = [R(θ), t]</span> mozgásra eddig úgy néztünk, mint „elfordulás <em>plusz</em> elcsúszás”. Ez a felbontás azonban a mi választásunk volt — az origó választása. Kérdezzünk mást: van-e olyan pont, amit a mozgás <strong>helyben hagy</strong>?</p><p class="matline"><span class="m">R c + t = c</span>&nbsp;⟹&nbsp;<span class="m">(I − R) c = t</span>&nbsp;⟹&nbsp;<span class="m">c = (I − R)<sup>−1</sup> t</span></p><p>Ugyanaz az <span class="m">(I − R)</span>, ami az előző állomáson a két sorrend közti rést adta — most megoldunk vele egy egyenletet. És <button class="termbtn" id="se2FixInfo" type="button" aria-expanded="false" aria-controls="se2FixNote">invertálható is</button>, pontosan akkor, ha <span class="m">θ ≠ 0</span>.</p><p>Vagyis a mozgás nem forgatás <em>és</em> eltolás. <strong>Egyetlen forgatás a <span class="m">c</span> pont körül</strong> — az eltolás annak a látszata, hogy rossz pont körül néztük.</p><p>A számokkal: <span class="m">θ = 1.25</span>, <span class="m">t = (2.5, &nbsp;0.7)</span>, ebből <span class="m">c ≈ (0.76, &nbsp;2.08)</span>. A test a <span class="m">c</span> körüli, <span class="m">2.22</span> sugarú íven halad — ezt látod a jelenetben, és a végpont pontosan <span class="m">t</span>.</p><p>Mi történik <span class="m">θ = 0</span>-nál? Az <span class="m">(I − R)</span> szinguláris, <span class="m">c</span> „végtelenbe fut”: tiszta eltolás. Ez nem kivétel a szabály alól, hanem a határesete — a végtelen sugarú kör.</p><p><strong>És ez az <span class="m">exp</span> az <span class="m">SE(2)</span>-ben.</strong> Az egyparaméteres pálya, <span class="m">exp(s·ξ)</span>, pontosan ez az ív, nem az egyenes szakasz. <span class="m">SE(3)</span>-ban ugyanez a tétel egy fokkal gazdagabb: fix <em>pont</em> helyett fix <em>tengely</em> van, a test forog körülötte <em>és</em> halad mentén — ez a <strong>csavarmozgás</strong>. A levezetés az <span class="m">SE(3)</span> holdon.</p><div class="bubble" id="se2FixNote" role="dialog" aria-label="Mikor invertalhato" hidden><p>Írjuk ki:</p><p class="matline"><span class="m">I − R =</span><span class="matrix"><span class="mbracket"></span><span class="mgrid" style="grid-template-columns:repeat(2,auto)"><span>1 − cos θ</span><span>sin θ</span><span>−sin θ</span><span>1 − cos θ</span></span><span class="mbracket right"></span></span></p><p>A determináns:</p><p class="matline"><span class="m">det(I − R) = (1 − cos θ)<sup>2</sup> + sin<sup>2</sup>θ = 2(1 − cos θ)</span></p><p>Ez pontosan akkor nulla, ha <span class="m">cos θ = 1</span>, vagyis <span class="m">θ = 0</span>. Minden más szögnél az inverz létezik, tehát <strong>minden</strong> nem-triviális síkbeli merev mozgásnak van fixpontja.</p><p>Az is látszik, hogy kis <span class="m">θ</span>-nál a determináns <span class="m">≈ θ<sup>2</sup></span>, tehát <span class="m">c</span> nagyon gyorsan nő — a majdnem-eltolás forgásközéppontja nagyon messze van.</p></div>'}
      ],
      en: [
        {t:'Rotation and Translation at Once', b:'<p><span class="m">SE(2)</span> is the set of <em>rigid</em> motions of the plane: what preserves lengths and angles and does not reflect. Two pieces of data describe one — an angle <span class="m">θ</span> and a translation <span class="m">t</span> — for <strong>3 degrees of freedom</strong>.</p><p class="matline"><span class="m">T = [R(θ), t]</span></p><p class="matline"><span class="m">p ⟼ R p + t</span></p><p>The scene shows the two halves separately: the body first turns in place by <span class="m">θ</span>, then slides by <span class="m">t</span>.</p><p>Now compose two of them — <span class="m">T<sub>1</sub></span> first, then <span class="m">T<sub>2</sub></span>. <button class="termbtn" id="se2HomInfo" type="button" aria-expanded="false" aria-controls="se2HomNote">In homogeneous form</button> this is plain matrix multiplication, and out comes:</p><p class="matline"><span class="m">T<sub>2</sub> T<sub>1</sub> = [R<sub>2</sub>R<sub>1</sub>, &nbsp;R<sub>2</sub>t<sub>1</sub> + t<sub>2</sub>]</span></p><p>The whole content of this station is the <span class="m">R<sub>2</sub>t<sub>1</sub></span> term. The <em>second</em> rotation <strong>turns</strong> the <em>first</em> translation — the two parts do not sit independently side by side, one <em>acts on</em> the other. That is what a <em>semidirect product</em> means.</p><p>Without that term <span class="m">SE(2)</span> would simply be <span class="m">SO(2) × ℝ<sup>2</sup></span>: an angle and a vector, independent, everything commuting. The next station shows how far from that we are.</p><div class="bubble" id="se2HomNote" role="dialog" aria-label="The homogeneous form" hidden><p>The map <span class="m">p ↦ Rp + t</span> is not linear (because of <span class="m">t</span>), but it becomes linear one dimension up. Append a <span class="m">1</span> to the point and write the transformation as a <span class="m">3×3</span>:</p><p class="matline"><span class="m">T =</span><span class="matrix"><span class="mbracket"></span><span class="mgrid" style="grid-template-columns:repeat(2,auto)"><span>R</span><span>t</span><span>0<sup>⊤</sup></span><span>1</span></span><span class="mbracket right"></span></span></p><p>Then</p><p class="matline"><span class="m">T</span><span class="matrix"><span class="mbracket"></span><span class="mgrid" style="grid-template-columns:auto"><span>p</span><span>1</span></span><span class="mbracket right"></span></span><span class="m">=</span><span class="matrix"><span class="mbracket"></span><span class="mgrid" style="grid-template-columns:auto"><span>Rp + t</span><span>1</span></span><span class="mbracket right"></span></span></p><p>and composing two motions becomes <strong>matrix multiplication</strong>. This is not a trick but the group structure made visible: the product’s top-left block is <span class="m">R<sub>2</sub>R<sub>1</sub></span> and its top-right is <span class="m">R<sub>2</sub>t<sub>1</sub> + t<sub>2</sub></span> — the rule above is one line of arithmetic.</p><p>The same form carries into <span class="m">SE(3)</span> and <span class="m">Sim(3)</span>, with bigger blocks.</p></div>'},
        {t:'Order Matters', b:'<p>Take two very simple elements: a pure rotation and a pure translation.</p><p class="matline"><span class="m">R = [R(θ), 0]</span></p><p class="matline"><span class="m">Tr = [I, t]</span></p><p>Compose them both ways round. <button class="termbtn" id="se2OrderInfo" type="button" aria-expanded="false" aria-controls="se2OrderNote">From the rule above</button>:</p><p class="matline"><span class="m">Tr · R = [R, t]</span>&nbsp;→&nbsp;<span class="m">p ↦ R p + t</span></p><p class="matline"><span class="m">R · Tr = [R, R t]</span>&nbsp;→&nbsp;<span class="m">p ↦ R(p + t) = R p + R t</span></p><p>The <em>orientation</em> is the same either way. The <em>place</em> is not. The difference is exactly:</p><p class="matline"><span class="m">t − R t = (I − R) t</span></p><p>In the scene <span class="m">θ = 1.25 rad</span> (≈ 72°) and <span class="m">t = (2.5, &nbsp;0.7)</span>. The amber body — turn first, then slide — stops at <span class="m">(2.5, &nbsp;0.7)</span>. The violet one — slide first, then turn — stops at <span class="m">(0.12, &nbsp;2.59)</span>. The same two moves, two very different places.</p><p>Now notice where this comes from. <span class="m">SO(2)</span> was <em>commutative</em>, and its rotation part still is. The non-commutativity does not come from the rotations; it comes from <strong>the rotation getting hold of the translation</strong>. That is a theorem, not a convention: as long as the <span class="m">R<sub>2</sub>t<sub>1</sub></span> term is there, order matters.</p><p>Remember the operator <span class="m">(I − R)</span>. The next station inverts exactly this.</p><div class="bubble" id="se2OrderNote" role="dialog" aria-label="The two products" hidden><p>The rule, <span class="m">T<sub>1</sub></span> acting first: <span class="m">T<sub>2</sub>T<sub>1</sub> = [R<sub>2</sub>R<sub>1</sub>, R<sub>2</sub>t<sub>1</sub> + t<sub>2</sub>]</span>.</p><p>Turn first, then slide — <span class="m">T<sub>1</sub> = R = [R, 0]</span>, <span class="m">T<sub>2</sub> = Tr = [I, t]</span>:</p><p class="matline"><span class="m">[I·R, &nbsp;I·0 + t] = [R, t]</span></p><p>Now the other way — <span class="m">T<sub>1</sub> = Tr</span>, <span class="m">T<sub>2</sub> = R</span>:</p><p class="matline"><span class="m">[R·I, &nbsp;R·t + 0] = [R, R t]</span></p><p>The left factor’s rotation always lands on the right factor’s translation — which is why it matters which one is on the left.</p></div>'},
        {t:'Every Planar Motion Is a Rotation — Somewhere', b:'<p>So far we have read <span class="m">T = [R(θ), t]</span> as “a turn <em>plus</em> a slide”. But that split was our choice — the choice of origin. Ask something else instead: is there a point the motion <strong>leaves where it is</strong>?</p><p class="matline"><span class="m">R c + t = c</span>&nbsp;⟹&nbsp;<span class="m">(I − R) c = t</span>&nbsp;⟹&nbsp;<span class="m">c = (I − R)<sup>−1</sup> t</span></p><p>The same <span class="m">(I − R)</span> that gave the gap between the two orders one station ago — now we solve an equation with it. And it <button class="termbtn" id="se2FixInfo" type="button" aria-expanded="false" aria-controls="se2FixNote">is invertible</button>, exactly when <span class="m">θ ≠ 0</span>.</p><p>So the motion is not a rotation <em>and</em> a translation. It is <strong>a single rotation about the point <span class="m">c</span></strong> — the translation was an artefact of watching from the wrong centre.</p><p>With the numbers: <span class="m">θ = 1.25</span>, <span class="m">t = (2.5, &nbsp;0.7)</span>, giving <span class="m">c ≈ (0.76, &nbsp;2.08)</span>. The body rides an arc of radius <span class="m">2.22</span> about <span class="m">c</span> — that is the scene, and it ends exactly at <span class="m">t</span>.</p><p>What happens at <span class="m">θ = 0</span>? <span class="m">(I − R)</span> is singular and <span class="m">c</span> “runs off to infinity”: pure translation. Not an exception to the rule but its limiting case — the circle of infinite radius.</p><p><strong>And this is <span class="m">exp</span> in <span class="m">SE(2)</span>.</strong> The one-parameter orbit <span class="m">exp(s·ξ)</span> is precisely this arc, not the straight segment. In <span class="m">SE(3)</span> the same theorem is one notch richer: instead of a fixed <em>point</em> there is a fixed <em>axis</em>, and the body turns about it <em>while</em> advancing along it — a <strong>screw motion</strong>. That derivation belongs to the <span class="m">SE(3)</span> moon.</p><div class="bubble" id="se2FixNote" role="dialog" aria-label="When it is invertible" hidden><p>Written out:</p><p class="matline"><span class="m">I − R =</span><span class="matrix"><span class="mbracket"></span><span class="mgrid" style="grid-template-columns:repeat(2,auto)"><span>1 − cos θ</span><span>sin θ</span><span>−sin θ</span><span>1 − cos θ</span></span><span class="mbracket right"></span></span></p><p>The determinant:</p><p class="matline"><span class="m">det(I − R) = (1 − cos θ)<sup>2</sup> + sin<sup>2</sup>θ = 2(1 − cos θ)</span></p><p>which is zero exactly when <span class="m">cos θ = 1</span>, i.e. <span class="m">θ = 0</span>. At every other angle the inverse exists, so <strong>every</strong> non-trivial planar rigid motion has a fixed point.</p><p>It also shows that for small <span class="m">θ</span> the determinant is <span class="m">≈ θ<sup>2</sup></span>, so <span class="m">c</span> grows very fast — the centre of rotation of a near-translation is very far away.</p></div>'}
      ],
      ja: [
        {t:'回転と並進を同時に', b:'<p><span class="m">SE(2)</span> は、平面の<em>剛体</em>運動をすべて集めたものです。長さと角を保ち、鏡映はしません。一つの元は二つのデータ、すなわち角 <span class="m">θ</span> と並進 <span class="m">t</span> で決まり、<strong>自由度は 3</strong> です。</p><p class="matline"><span class="m">T = [R(θ), t]</span></p><p class="matline"><span class="m">p ⟼ R p + t</span></p><p>シーンでは、この二つの半分が別々に見えます。物体はまずその場で <span class="m">θ</span> だけ回り、次に <span class="m">t</span> だけ滑ります。</p><p>では二つ合成してみましょう。先に <span class="m">T<sub>1</sub></span>、次に <span class="m">T<sub>2</sub></span> です。<button class="termbtn" id="se2HomInfo" type="button" aria-expanded="false" aria-controls="se2HomNote">同次形</button>で書けばただの行列の積で、結果はこうなります。</p><p class="matline"><span class="m">T<sub>2</sub> T<sub>1</sub> = [R<sub>2</sub>R<sub>1</sub>, &nbsp;R<sub>2</sub>t<sub>1</sub> + t<sub>2</sub>]</span></p><p>このステーションの中身は、まるごと <span class="m">R<sub>2</sub>t<sub>1</sub></span> という項に詰まっています。<em>第二</em>の回転が<em>第一</em>の並進を<strong>回してしまう</strong>のです。二つの部分は独立に並んでいるのではなく、一方が他方に<em>作用</em>しています。これが<em>半直積</em>という言葉の中身です。</p><p>この項がなければ、<span class="m">SE(2)</span> はただの <span class="m">SO(2) × ℝ<sup>2</sup></span> でした。角とベクトルが独立で、すべてが可換になっていたはずです。次のステーションで、その隔たりを見ます。</p><div class="bubble" id="se2HomNote" role="dialog" aria-label="同次形" hidden><p>写像 <span class="m">p ↦ Rp + t</span> は、<span class="m">t</span> があるせいで線形ではありません。ところが次元を一つ上げると線形になります。点に <span class="m">1</span> を付け足し、変換を <span class="m">3×3</span> にするのです。</p><p class="matline"><span class="m">T =</span><span class="matrix"><span class="mbracket"></span><span class="mgrid" style="grid-template-columns:repeat(2,auto)"><span>R</span><span>t</span><span>0<sup>⊤</sup></span><span>1</span></span><span class="mbracket right"></span></span></p><p>すると、こうなります。</p><p class="matline"><span class="m">T</span><span class="matrix"><span class="mbracket"></span><span class="mgrid" style="grid-template-columns:auto"><span>p</span><span>1</span></span><span class="mbracket right"></span></span><span class="m">=</span><span class="matrix"><span class="mbracket"></span><span class="mgrid" style="grid-template-columns:auto"><span>Rp + t</span><span>1</span></span><span class="mbracket right"></span></span></p><p>二つの運動の合成が、そのまま<strong>行列の積</strong>になりました。これは小手先の技ではなく、群構造を目に見える形にしたものです。積の左上のブロックが <span class="m">R<sub>2</sub>R<sub>1</sub></span>、右上が <span class="m">R<sub>2</sub>t<sub>1</sub> + t<sub>2</sub></span> です。上の規則は、計算一行で出てきます。</p><p>同じ形が <span class="m">SE(3)</span> や <span class="m">Sim(3)</span> にも、ブロックを大きくしただけで受け継がれます。</p></div>'},
        {t:'順序が効く', b:'<p>とても単純な二つの元を取ります。純粋な回転と、純粋な並進です。</p><p class="matline"><span class="m">R = [R(θ), 0]</span></p><p class="matline"><span class="m">Tr = [I, t]</span></p><p>これを両方の順序で合成します。<button class="termbtn" id="se2OrderInfo" type="button" aria-expanded="false" aria-controls="se2OrderNote">上の規則から</button>、こうなります。</p><p class="matline"><span class="m">Tr · R = [R, t]</span>&nbsp;→&nbsp;<span class="m">p ↦ R p + t</span></p><p class="matline"><span class="m">R · Tr = [R, R t]</span>&nbsp;→&nbsp;<span class="m">p ↦ R(p + t) = R p + R t</span></p><p>どちらでも<em>姿勢</em>は同じです。違うのは<em>場所</em>で、その差はちょうどこれだけです。</p><p class="matline"><span class="m">t − R t = (I − R) t</span></p><p>シーンでは <span class="m">θ = 1.25 rad</span>（およそ 72°）、<span class="m">t = (2.5, &nbsp;0.7)</span> です。琥珀色の物体は先に回って後で滑るので、<span class="m">(2.5, &nbsp;0.7)</span> で止まります。菫色の物体は先に滑って後で回るので、<span class="m">(0.12, &nbsp;2.59)</span> です。同じ二つの動作なのに、まるで違う場所に着きました。</p><p>この差がどこから来たのかに注意してください。<span class="m">SO(2)</span> は<em>可換</em>でしたし、ここでも回転部分は可換です。非可換性は回転から来るのではありません。<strong>回転が並進をつかまえる</strong>ことから来ています。これは約束ではなく定理です。<span class="m">R<sub>2</sub>t<sub>1</sub></span> の項がある限り、順序は効きます。</p><p>演算子 <span class="m">(I − R)</span> を覚えておいてください。次のステーションで逆を取るのは、まさにこれです。</p><div class="bubble" id="se2OrderNote" role="dialog" aria-label="二つの積" hidden><p>規則はこうでした。先に効くのが <span class="m">T<sub>1</sub></span> で、<span class="m">T<sub>2</sub>T<sub>1</sub> = [R<sub>2</sub>R<sub>1</sub>, R<sub>2</sub>t<sub>1</sub> + t<sub>2</sub>]</span> です。</p><p>先に回転、次に並進の場合。<span class="m">T<sub>1</sub> = R = [R, 0]</span>、<span class="m">T<sub>2</sub> = Tr = [I, t]</span> です。</p><p class="matline"><span class="m">[I·R, &nbsp;I·0 + t] = [R, t]</span></p><p>次は逆の順序で、<span class="m">T<sub>1</sub> = Tr</span>、<span class="m">T<sub>2</sub> = R</span> とします。</p><p class="matline"><span class="m">[R·I, &nbsp;R·t + 0] = [R, R t]</span></p><p>左の因子の回転が、つねに右の因子の並進に乗ります。だから、どちらが左にあるかが効くのです。</p></div>'},
        {t:'平面のどんな運動も、どこかを中心とする回転', b:'<p>ここまで <span class="m">T = [R(θ), t]</span> を「回転<em>と</em>並進」と読んできました。しかしこの分け方は、私たちの選択です。正確には、原点の選び方の問題でした。そこで別の問いを立てましょう。この運動が<strong>その場に残す</strong>点はあるでしょうか。</p><p class="matline"><span class="m">R c + t = c</span>&nbsp;⟹&nbsp;<span class="m">(I − R) c = t</span>&nbsp;⟹&nbsp;<span class="m">c = (I − R)<sup>−1</sup> t</span></p><p>一つ前のステーションで二つの順序の差を与えたのと同じ <span class="m">(I − R)</span> を、今度は方程式を解くのに使っています。しかも <span class="m">θ ≠ 0</span> のときには、ちょうど<button class="termbtn" id="se2FixInfo" type="button" aria-expanded="false" aria-controls="se2FixNote">逆が存在します</button>。</p><p>つまりこの運動は、回転<em>と</em>並進ではありません。<strong>点 <span class="m">c</span> を中心とする一つの回転</strong>です。並進のほうは、間違った中心から眺めていたことの見かけにすぎませんでした。</p><p>数で確かめましょう。<span class="m">θ = 1.25</span>、<span class="m">t = (2.5, &nbsp;0.7)</span> から <span class="m">c ≈ (0.76, &nbsp;2.08)</span> です。物体は <span class="m">c</span> を中心とする半径 <span class="m">2.22</span> の弧を進みます。それがこのシーンで、終点はちょうど <span class="m">t</span> になっています。</p><p><span class="m">θ = 0</span> ではどうなるでしょうか。<span class="m">(I − R)</span> が特異になり、<span class="m">c</span> は無限遠へ逃げていきます。純粋な並進です。これは規則の例外ではなく、その極限、つまり半径無限大の円だと考えてください。</p><p><strong>そしてこれが <span class="m">SE(2)</span> における <span class="m">exp</span> です。</strong>一径数の軌道 <span class="m">exp(s·ξ)</span> はまさにこの弧であって、直線分ではありません。<span class="m">SE(3)</span> では同じ定理が一段豊かになります。不動<em>点</em>のかわりに不動<em>軸</em>があり、物体はそのまわりを回り<em>ながら</em>、その軸に沿って進みます。これが<strong>ねじ運動</strong>です。その導出は <span class="m">SE(3)</span> の衛星のものです。</p><div class="bubble" id="se2FixNote" role="dialog" aria-label="いつ逆が存在するか" hidden><p>書き下してみましょう。</p><p class="matline"><span class="m">I − R =</span><span class="matrix"><span class="mbracket"></span><span class="mgrid" style="grid-template-columns:repeat(2,auto)"><span>1 − cos θ</span><span>sin θ</span><span>−sin θ</span><span>1 − cos θ</span></span><span class="mbracket right"></span></span></p><p>行列式はこうなります。</p><p class="matline"><span class="m">det(I − R) = (1 − cos θ)<sup>2</sup> + sin<sup>2</sup>θ = 2(1 − cos θ)</span></p><p>これがゼロになるのは <span class="m">cos θ = 1</span>、すなわち <span class="m">θ = 0</span> のときだけです。他のどの角でも逆は存在するので、<strong>自明でない平面剛体運動にはすべて</strong>不動点があります。</p><p>小さな <span class="m">θ</span> では行列式が <span class="m">≈ θ<sup>2</sup></span> なので、<span class="m">c</span> が非常に速く大きくなることも読み取れます。ほとんど並進に近い運動では、回転中心がはるか遠くにあるのです。</p></div>'}
      ]
    }
  };
})();
