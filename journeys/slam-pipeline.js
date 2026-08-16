'use strict';
/* Journey: SLAM — the last moon, and the one where every thread arrives.

   Three stations, deliberately shallow (docs/project/journey-status.md): the frontend /
   backend boundary as a consequence of curvature rather than of software taste; monocular
   scale as a gauge freedom no anchor can remove; and the recurring "invisible at small
   angles, decisive at large ones" pattern that the whole vault keeps running into.

   This is a convergence journey, so per D4 it recaps and hands off by name — it derives
   nothing the branch moons own. What it can show that none of them can is that the three
   traps are the SAME trap.

   Station 3 makes that quantitative instead of rhetorical: it plots ‖J_l − I‖_F against
   the rotation angle, computed from the closed form, so "6% at 5°, of order one at 90°" is
   read off the curve. Backing notes: docs/slam/frontend-backend.md,
   docs/slam/monocular-scale.md, docs/geometry/left-jacobian.md.
   Cards (hu/en/ja) in-file. Requires LIE.kit. */
window.LIE = window.LIE || {};
LIE.journeys = LIE.journeys || {};
LIE.journeys['slam-pipeline'] = (function(){
  const K = LIE.kit;
  const { V3, ease, clamp, hexStr, fatArrow, setArrow, makeLabel, updateLabel } = K;

  const SP  = [V3(0,0,0), V3(44,5,-12), V3(88,-4,10)];
  // Station 2 needs room to the right: the cloud slides out to twice its distance, and the
  // whole point is that you can still see it arrive there.
  const OFF = [V3(0,2.2,9.4), V3(0.5,2.0,11.6), V3(0,2.4,9.4)];

  const NPOSE = 11, SWEEP = 300*Math.PI/180;              // 11 poses, 30° apart

  /* ‖J_l(θ) − I‖_F for the SO(3) left Jacobian. Writing ω = θa with ‖a‖ = 1,
       J_l − I = A·θa^ + B·θ²(aaᵀ − I),   A = (1−cos θ)/θ²,  B = (θ−sin θ)/θ³
     The two parts are antisymmetric and symmetric, so orthogonal in the Frobenius inner
     product, and ‖a^‖_F = ‖aaᵀ − I‖_F = √2. Hence the closed form below. */
  function jlDev(th){
    if(th < 1e-6) return 0;
    const p = (1-Math.cos(th))/th, q = (th-Math.sin(th))/th;
    return Math.SQRT2*Math.sqrt(p*p + q*q);
  }
  const DEGS = [5, 15, 30, 45, 60, 90, 120, 150, 180];

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
      const d = new THREE.Mesh(new THREE.SphereGeometry(r||0.1,14,12),
        new THREE.MeshBasicMaterial({color, transparent:true, opacity:0.95}));
      g.add(d); return d;
    }
    function dart(g, color, op){
      const b = new THREE.Group();
      b.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(
        [V3(0,0.26,0), V3(-0.19,-0.19,0), V3(0,-0.05,0), V3(0.19,-0.19,0), V3(0,0.26,0)]),
        new THREE.LineBasicMaterial({color, transparent:true, opacity:op===undefined?0.95:op})));
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
      /* 0 · the trajectory as the argument. Eleven poses 30° apart — consecutive steps a
            frontend may treat as flat — and one chord back to the start spanning 300°,
            where there is no small δ left to appeal to. */
      g=>{
        const R = 2.3;
        const at = i => { const a = Math.PI/2 - SWEEP*i/(NPOSE-1);
          return { p: V3(Math.cos(a)*R, Math.sin(a)*R, 0), a }; };
        const ring = [];
        for(let i=0;i<=120;i++){ const a = Math.PI/2 - SWEEP*i/120;
          ring.push(V3(Math.cos(a)*R, Math.sin(a)*R, 0)); }
        line(g, ring, COL.grid1, 0.45);

        const hops = [];
        for(let i=0;i<NPOSE;i++){
          const {p, a} = at(i);
          const d = dart(g, i===0 ? COL.green : COL.violet);
          d.position.copy(p); d.rotation.z = a - Math.PI/2;
          if(i>0){
            const q = at(i-1).p;
            hops.push(line(g, [q, p], COL.green, 0.35));
          }
        }
        const loop = K.dashedLine(at(NPOSE-1).p, at(0).p, COL.coral, 0.13); g.add(loop);
        const lSmall = makeLabel('30°', HX.green, 1.5);
        lSmall.position.copy(at(1).p).add(V3(0.62,0.30,0)); g.add(lSmall);
        const lBig = makeLabel('300°', HX.coral, 1.9);
        lBig.position.set(0.35, -0.15, 0); g.add(lBig);

        const T0=3.6, T1=2.0, PER=T0+T1;
        return {tick(t){
          const tc = t % PER;
          if(tc < T0){
            // the frontend: consecutive hops, one after another
            const k = Math.floor(tc/(T0/hops.length));
            hops.forEach((h,j)=>{ h.material.opacity = j===k ? 0.95 : 0.30; });
            loop.material.opacity = 0.25;
          } else {
            const w = ease(clamp((tc-T0)/0.5, 0, 1));
            hops.forEach(h=>{ h.material.opacity = 0.30; });
            loop.material.opacity = 0.25 + 0.7*w;      // the backend: one long, honest edge
          }
        }};
      },

      /* 1 · scale, as a 2D pinhole. One cloud slides outwards along its own rays from
            distance d to 2d; the coral points where the rays cross the image line do not
            move at all, because nothing about the image depends on how far out the cloud is. */
      g=>{
        const EYE = V3(-3.2, 0, 0), IMG_X = -1.6, NEAR_X = 0.2, FAR_X = 3.6;
        const MS = [-0.30, -0.13, 0.06, 0.22, 0.37];
        dot(g, COL.ink, 0.09).position.copy(EYE);
        line(g, [V3(IMG_X,-0.95,0), V3(IMG_X,0.95,0)], COL.violet, 0.75);      // the image line
        // a token camera body
        line(g, [EYE.clone().add(V3(-0.34,0.30,0)), EYE.clone().add(V3(0.30,0.52,0)),
                 EYE.clone().add(V3(0.30,-0.52,0)), EYE.clone().add(V3(-0.34,-0.30,0)),
                 EYE.clone().add(V3(-0.34,0.30,0))], COL.ink, 0.42);

        const ghosts = [], movers = [];
        MS.forEach(m=>{
          const yAt = x => (x - EYE.x)*m;
          line(g, [EYE, V3(4.3, yAt(4.3), 0)], COL.grid1, 0.4);
          const img = dot(g, COL.coral, 0.085); img.position.set(IMG_X, yAt(IMG_X), 0);
          const gh = dot(g, COL.teal, 0.10); gh.position.set(NEAR_X, yAt(NEAR_X), 0);
          ghosts.push(gh);
          const mv = dot(g, COL.amber, 0.115); movers.push({mv, yAt});
        });
        const lbl = makeLabel('s · (R, t)', HX.amber, 2.6); lbl.position.set(0.4, 2.6, 0); g.add(lbl);

        return {tick(t){
          const s = 1 + 0.5*(1 - Math.cos(t*0.5));            // 1 … 2 … 1
          const x = EYE.x + (NEAR_X - EYE.x)*s;
          movers.forEach(({mv,yAt})=>mv.position.set(x, yAt(x), 0));
        }};
      },

      /* 2 · the pattern, measured. ‖J_l − I‖ against the angle: flat enough near zero that
            a wrong implementation is invisible, order one by 90°. The green stretch is where
            it hides; the coral stretch is where it bites. */
      g=>{
        const XS = 1.62, YS = 1.55, Y0 = -1.65;             // θ ∈ [0, π] → x ∈ [0, 5.1]
        const px = th => -2.55 + th*XS, py = v => Y0 + v*YS;
        const HIDE = 15*Math.PI/180;

        const seg = (a,b,color,op)=>{
          const pts = [];
          for(let i=0;i<=70;i++){ const th = a + (b-a)*i/70; pts.push(V3(px(th), py(jlDev(th)), 0)); }
          return line(g, pts, color, op);
        };
        seg(0, HIDE, COL.green, 0.95);
        seg(HIDE, Math.PI, COL.coral, 0.95);
        line(g, [V3(px(0),Y0,0), V3(px(Math.PI),Y0,0)], COL.grid1, 0.55);
        line(g, [V3(px(0),Y0-0.15,0), V3(px(0),py(1.85),0)], COL.grid2, 0.45);
        [0, 45, 90, 135, 180].forEach(d=>{
          const th = d*Math.PI/180;
          line(g, [V3(px(th),Y0,0), V3(px(th),Y0-0.16,0)], COL.grid1, 0.6);
        });

        const rider = dot(g, COL.amber, 0.11);
        const drop = line(g, [V3(0,0,0), V3(0,0,0)], COL.amber, 0.35);
        const lbl = makeLabel('‖J − I‖', HX.ink, 2.6); lbl.position.set(0, 2.75, 0); g.add(lbl);
        const read = makeLabel('5° · 0.06', HX.amber, 2.8); lbl.position.set(0, 2.75, 0);
        read.position.set(1.55, 2.15, 0); g.add(read);

        let cur = -1;
        return {tick(t){
          const k = Math.floor(t/1.15) % DEGS.length;
          if(k !== cur){
            cur = k;
            const th = DEGS[k]*Math.PI/180, v = jlDev(th);
            rider.position.set(px(th), py(v), 0);
            const a = drop.geometry.attributes.position;
            a.setXYZ(0, px(th), Y0, 0); a.setXYZ(1, px(th), py(v), 0); a.needsUpdate = true;
            updateLabel(read, DEGS[k] + '° · ' + v.toFixed(2), HX.amber);
          }
        }};
      }
    ];

    function bindCard(i){
      wireBubble('slPipeInfo','slPipeNote');         // card 1 · what frontend and backend are
      wireBubble('slGaugeInfo','slGaugeNote');       // card 2 · why no anchor fixes scale
      wireBubble('slPatternInfo','slPatternNote');   // card 3 · the left Jacobian, in closed form
    }

    return { stations, bindCard };
  }

  return {
    id: 'slam-pipeline',
    tier: 'slam',
    layout: { SP, OFF },
    threadKey: 'green',
    build,
    cards: {
      hu: [
        {t:'Frontend és backend', b:'<p>Egy megfigyelés a görbületről, aminek <strong>architekturális</strong> következménye van. A jelenetben egy pálya: tizenegy póz, egymástól <span class="m">30°</span>-ra, és a végén egy korall húr, ami visszaköt a kiindulóponthoz — <span class="m">300°</span> elfordulás.</p><p><strong>Kis szögeknél</strong> — például a szomszédos pózok közti lépésnél, egy frame-to-frame vizuális odometriában — a sokaság gyakorlatilag lapos. A bal Jacobi-mátrix <span class="m">≈ I</span>, a naiv összeadás alig ront, a hiba elhanyagolható. Egy <button class="termbtn" id="slPipeInfo" type="button" aria-expanded="false" aria-controls="slPipeNote">frontend</button> „megengedhet” magának egyszerűsítést.</p><p><strong>Nagy szögeknél és távoli pózok között</strong> — loop closure, globális bundle adjustment — a manifold szigorú kezelése <strong>kötelező</strong>. Itt már nincs kicsi <span class="m">δ</span>, amire hivatkozni lehetne.</p><p>És most a következmény, ami miatt ez nem csupán érdekesség:</p><p class="matline"><span class="m">a manifold-réteg kontraktusát a backend diktálja, nem a frontend</span></p><p>A frontend ennek egy <em>lazább, lokális esete</em> — nem egy másik igény, hanem ugyanaz az igény enyhébb körülmények között. Ezért nem szabad a manifold-réteget a frontend kényelméhez tervezni, és később „felhúzni” a backendhez. Fordítva működik.</p><p>Konkrétan ez azt jelenti, hogy a <em>reziduum + Jacobian + zajmodell</em> hármast <strong>mindenütt</strong> teljes szigorral kell megadni. A frontend ettől még dönthet úgy, hogy egy olcsóbb közelítést használ — de az az <em>ő</em> optimalizálása, nem a kontraktus lazasága. A kettő különbsége akkor derül ki, amikor a rendszer először zár be egy nagy hurkot.</p><div class="bubble" id="slPipeNote" role="dialog" aria-label="Frontend es backend" hidden><p><strong>Frontend:</strong> ami a nyers szenzoradatból méréseket csinál. Feature-detektálás, adattársítás, keyframe-választás, frame-to-frame odometria. Rövid időskála, kis elmozdulások, szigorú valós idejű korlát.</p><p><strong>Backend:</strong> ami a mérésekből konzisztens becslést csinál. Ez a factor graph és a solver: bundle adjustment, pózgráf-optimalizálás, loop closure. Hosszú időskála, nagy elfordulások, és itt van az összes olyan pózpár, amit sok lépés választ el egymástól.</p><p>A frontend többi része — hogy melyik feature-detektor, hogyan társítunk, mikor veszünk fel keyframe-et — kívül esik ezen az anyagon; itt kizárólag az estimation-oldal van.</p></div>'},
        {t:'A skála', b:'<p>Egyetlen kamerából <strong>a világ abszolút mérete nem határozható meg</strong>. Nem nehéz megbecsülni — <em>nem határozható meg</em>, mert az információ nincs benne a képben.</p><p>A jelenet ezt mutatja meg a lehető legegyszerűbben, 2D-ben. Egy lyukkamera, néhány sugár, és egy pontfelhő, ami kifelé csúszik a saját sugarain a kétszeres távolságra. A korall pontok — ahol a sugarak átdöfik a képsíkot — <strong>meg sem rezdülnek</strong>. Kétszer akkora világ, kétszer akkora távolságból: pixelre ugyanaz a kép.</p><p>Az <em>alak</em> tehát rekonstruálható, a <em>méret</em> nem. A monokuláris SLAM/SfM kimenete ezért önkényes egységben van — tipikusan az első baseline hosszára normálva —, nem méterben.</p><p>Ebből következik, amit a <span class="m">Sim(3)</span> holdon már láttunk a másik irányból: két rekonstrukció között pontosan egy <span class="m">SE(3)</span> transzformáció <em>és</em> egy skalár skálafaktor lehet a különbség. Hét szabadsági fok.</p><p>A skála tehát <strong>nem hiba, hanem gauge-szabadság</strong>. De egy különös fajta. A factor graph holdon láttuk, hogy egy unáris prior — „az első póz legyen az origó” — elveszi az <span class="m">SE(3)</span> gauge-t. A skálát <button class="termbtn" id="slGaugeInfo" type="button" aria-expanded="false" aria-controls="slGaugeNote">ugyanez a trükk nem oldja meg</button>: nem arról van szó, hogy elfelejtettük rögzíteni, hanem hogy nincs mihez.</p><p>Ha van metrikus mélységszenzor, a skála <em>becsülhető</em>: a két mélységkép arányának mediánja, sok pixelen és több frame-en. Medián, és nem átlag, mert okklúziók és rekonstrukciós zaj mellett az outlier nem kivétel, hanem garantált — ugyanaz a megfontolás, ami a robusztus magokhoz vezetett. A kész skála pedig <strong>csak a transzlációt érinti</strong>; a rotáció skálafüggetlen.</p><div class="bubble" id="slGaugeNote" role="dialog" aria-label="Miert nem rogzitheto a skala" hidden><p>Egy prior akkor tud egy gauge-szabadságot elvenni, ha a szabadság a <em>változókban</em> van, de a <em>mérésekben</em> nincs. „Hol van a világ origója” pontosan ilyen: minden relatív mérés változatlan marad, ha az egész térképet eltoljuk. A prior betesz egy abszolút állítást, és kész.</p><p>A skálánál a helyzet ugyanez, egészen a végéig: a reprojekciós reziduumok is változatlanok maradnak, ha az egész térképet <em>és</em> az összes póz-transzlációt ugyanazzal a <span class="m">s</span>-sel szorozzuk. Tehetnénk tehát egy priort, ami azt mondja, „a skála legyen 1”.</p><p>Csakhogy az nem <em>rögzítés</em>, hanem <strong>kitalálás</strong>. Az <span class="m">SE(3)</span>-nál a rögzített origó szabadon választható, mert semmilyen fizikai állítás nem fűződik hozzá. A skálánál viszont van fizikai jelentés: hány méter. Egy önkényes prior tehát nem a gauge-t rögzíti, hanem hamis állítást tesz — a rendszer konzisztens marad, de a kimenete nem méter.</p><p>Ezért kell <em>külső</em> információ: metrikus mélység, ismert stereo baseline, ismert méretű objektum, kerék-odometria. Bármelyik hoz egy valódi hosszúságot, és attól kezdve a skála mérve van, nem választva.</p></div>'},
        {t:'Ahol a szigor kötelező', b:'<p>Egy alakzat végigment az egész anyagon, és mindig ugyanaz a csapda: <strong>kis szögeknél nem látszik, nagyoknál hirtelen számít.</strong></p><p>Három helyen találkoztunk vele:</p><p class="matline"><span class="m">a bal Jacobi-mátrix: v ≈ t kis szögeknél</span></p><p class="matline"><span class="m">body vs. world: exp(δ)R ≈ R exp(δ) kis δ-nál</span></p><p class="matline"><span class="m">kvaterniók: q és −q ugyanaz — nagy elfordulásnál harap</span></p><p>A jelenet az elsőt méri meg. A függőleges tengelyen a <button class="termbtn" id="slPatternInfo" type="button" aria-expanded="false" aria-controls="slPatternNote">bal Jacobi-mátrix eltérése</button> az egységmátrixtól, a vízszintesen a szög. A zöld szakasz az, ahol elrejtőzik: <span class="m">5°</span>-nál az eltérés <span class="m">0.06</span> — a mérési zajban elvész. <span class="m">90°</span>-nál viszont <span class="m">1.04</span>, ami az <span class="m">I</span>-hez képest már nem korrekció, hanem egy másik mátrix. <span class="m">180°</span>-nál <span class="m">1.68</span>.</p><p>És most a lényeg, ami mindhárom esetre igaz, és ami miatt ezek a hibák olyan drágák:</p><p class="matline"><span class="m">a hibás változat is konvergál — csak rosszabbul</span></p><p>Nem összeomlik, nem <span class="m">NaN</span>-t ad, nem dob kivételt. Fut, konvergál, és <em>majdnem</em> jó eredményt ad. Ezért marad benne hetekig: a unit teszt zöld (kis szögek), a frame-to-frame odometria szép (kis szögek), és a hiba akkor jelenik meg, amikor a rendszer először zár be egy nagy hurkot — ahol már nehéz visszakeresni, honnan jött.</p><p><strong>Ez a hold a többi összefutása.</strong> Minden szál a saját ág-utazásához tartozik: a bal Jacobi-mátrix az <span class="m">SE(3)</span> holdhoz, a body/world distinkció az <span class="m">SO(3)</span>-hoz, a kvaterniók és <span class="m">SO(3)</span> igazi alakja a Riemann-gradiens holdhoz, a <span class="m">⊞</span>/<span class="m">⊟</span> és a Jacobian-struktúra a factor graph holdhoz. Itt csak az látszik, ami egyikben sem: hogy <strong>ugyanaz a csapda mind a három</strong>.</p><div class="bubble" id="slPatternNote" role="dialog" aria-label="A bal Jacobi-matrix" hidden><p>Az <span class="m">SE(3)</span> exponenciálisában a transzlációs rész nem <span class="m">v</span>, hanem <span class="m">J<sub>l</sub>(ω) v</span> — a <em>bal Jacobi-mátrix</em> forgatja és nyújtja meg a <span class="m">𝔰𝔢(3)</span>-beli <span class="m">v</span>-t, mielőtt az valódi <span class="m">t</span> eltolás lenne. <span class="m">SO(3)</span>-ra zárt alakban:</p><p class="matline"><span class="m">J<sub>l</sub> = I + <span class="frac"><span>1 − cos θ</span><span>θ²</span></span> ω<sup>∧</sup> + <span class="frac"><span>θ − sin θ</span><span>θ³</span></span> (ω<sup>∧</sup>)²</span></p><p>Kis <span class="m">θ</span>-ra sorfejtve <span class="m">J<sub>l</sub> ≈ I + ½ω<sup>∧</sup></span>, tehát az <span class="m">I</span>-től való eltérés <strong>elsőrendű</strong> a szögben: nagyjából <span class="m">θ/2</span> nagyságrendű. Ez az a görbe, amit a jelenet kirajzol (Frobenius-normában, egységnyi tengelyre).</p><p>Ami ebből számít: <em>nem</em> nulla kis szögeknél, csak kicsi. Aki a <span class="m">v = t</span> azonosítást beépíti, az nem hibátlan kódot ír kis szögekre, hanem olyat, aminek a hibája elrejtőzik.</p><p>A levezetés — hogy miért éppen ez a <span class="m">J<sub>l</sub></span>, és mi a szerepe a kovariancia terjesztésében — a jegyzetekben is nyitott szál.</p></div>'}
      ],
      en: [
        {t:'Frontend and Backend', b:'<p>An observation about curvature with an <strong>architectural</strong> consequence. The scene shows a trajectory: eleven poses <span class="m">30°</span> apart, and a coral chord at the end tying the last back to the first — <span class="m">300°</span> of rotation.</p><p><strong>At small angles</strong> — a step between neighbouring poses, in frame-to-frame visual odometry — the manifold is flat for practical purposes. The left Jacobian is <span class="m">≈ I</span>, naive addition barely hurts, the error is negligible. A <button class="termbtn" id="slPipeInfo" type="button" aria-expanded="false" aria-controls="slPipeNote">frontend</button> can “afford” a simplification.</p><p><strong>At large angles and between distant poses</strong> — loop closure, global bundle adjustment — rigorous manifold handling is <strong>mandatory</strong>. There is no small <span class="m">δ</span> left to appeal to.</p><p>And now the consequence that makes this more than a curiosity:</p><p class="matline"><span class="m">the manifold layer’s contract is dictated by the backend, not the frontend</span></p><p>The frontend is a <em>looser, local case</em> of it — not a different requirement but the same one under milder conditions. Which is why the manifold layer must not be designed for the frontend’s convenience and “raised” to the backend later. It works the other way round.</p><p>Concretely: the triple <em>residual + Jacobian + noise model</em> must be specified with full rigour <strong>everywhere</strong>. The frontend may still choose to use a cheaper approximation — but that is <em>its</em> optimisation, not slack in the contract. The difference between the two shows up the first time the system closes a large loop.</p><div class="bubble" id="slPipeNote" role="dialog" aria-label="Frontend and backend" hidden><p><strong>Frontend:</strong> what turns raw sensor data into measurements. Feature detection, data association, keyframe selection, frame-to-frame odometry. Short time scale, small displacements, a hard real-time budget.</p><p><strong>Backend:</strong> what turns measurements into a consistent estimate. This is the factor graph and the solver: bundle adjustment, pose-graph optimisation, loop closure. Long time scale, large rotations, and every pose pair separated by many steps.</p><p>The rest of the frontend — which feature detector, how to associate, when to take a keyframe — is outside this material; only the estimation side is here.</p></div>'},
        {t:'Scale', b:'<p>From a single camera <strong>the absolute size of the world cannot be determined</strong>. Not “is hard to estimate” — <em>cannot be determined</em>, because the information is not in the image.</p><p>The scene shows this as plainly as possible, in 2D. A pinhole, a few rays, and a point cloud sliding outwards along its own rays to twice the distance. The coral points — where the rays cross the image line — <strong>do not stir</strong>. A world twice as large, seen from twice as far: a pixel-identical image.</p><p>So the <em>shape</em> is recoverable and the <em>size</em> is not. Monocular SLAM/SfM output is therefore in arbitrary units — typically normalised to the length of the first baseline — and not in metres.</p><p>From which follows what the <span class="m">Sim(3)</span> moon already showed from the other side: two reconstructions can differ by exactly one <span class="m">SE(3)</span> transformation <em>and</em> one scalar scale factor. Seven degrees of freedom.</p><p>So scale is <strong>not an error but a gauge freedom</strong>. A peculiar one, though. On the factor-graph moon we saw a unary prior — “let the first pose be the origin” — remove the <span class="m">SE(3)</span> gauge. For scale, <button class="termbtn" id="slGaugeInfo" type="button" aria-expanded="false" aria-controls="slGaugeNote">the same trick does not work</button>: it is not that we forgot to pin it down, it is that there is nothing to pin it to.</p><p>Given a metric depth sensor, scale <em>can</em> be estimated: the median of the ratio of the two depth maps, over many pixels and several frames. The median rather than the mean, because with occlusions and reconstruction noise outliers are not exceptions but guaranteed — the same consideration that led to robust kernels. And the finished scale <strong>touches only the translation</strong>; rotation is scale-free.</p><div class="bubble" id="slGaugeNote" role="dialog" aria-label="Why no anchor fixes scale" hidden><p>A prior can remove a gauge freedom when the freedom is in the <em>variables</em> but not in the <em>measurements</em>. “Where is the world’s origin” is exactly that: every relative measurement is unchanged if the whole map is translated. The prior asserts an absolute, and it is done.</p><p>For scale the situation is the same right up to the end: reprojection residuals are also unchanged if the whole map <em>and</em> every pose translation are multiplied by the same <span class="m">s</span>. So we could add a prior saying “let the scale be 1”.</p><p>Except that is not <em>pinning down</em>, it is <strong>making something up</strong>. For <span class="m">SE(3)</span> the fixed origin is free to choose because no physical claim attaches to it. Scale does carry physical meaning: how many metres. An arbitrary prior therefore does not fix a gauge, it states a falsehood — the system stays self-consistent, but its output is not in metres.</p><p>Which is why <em>external</em> information is needed: metric depth, a known stereo baseline, an object of known size, wheel odometry. Any of them brings in a real length, and from then on scale is measured rather than chosen.</p></div>'},
        {t:'Where Rigour Is Mandatory', b:'<p>One shape has run through the whole subject, and the trap is always the same: <strong>invisible at small angles, suddenly decisive at large ones.</strong></p><p>We met it in three places:</p><p class="matline"><span class="m">the left Jacobian: v ≈ t at small angles</span></p><p class="matline"><span class="m">body vs. world: exp(δ)R ≈ R exp(δ) for small δ</span></p><p class="matline"><span class="m">quaternions: q and −q are the same — it bites at large rotations</span></p><p>The scene measures the first. The vertical axis is <button class="termbtn" id="slPatternInfo" type="button" aria-expanded="false" aria-controls="slPatternNote">the left Jacobian’s deviation</button> from the identity, the horizontal one is the angle. The green stretch is where it hides: at <span class="m">5°</span> the deviation is <span class="m">0.06</span> — lost in the measurement noise. At <span class="m">90°</span> it is <span class="m">1.04</span>, which next to <span class="m">I</span> is no longer a correction but a different matrix. At <span class="m">180°</span>, <span class="m">1.68</span>.</p><p>And now the point that holds for all three, and that makes these errors so expensive:</p><p class="matline"><span class="m">the wrong version converges too — just worse</span></p><p>It does not crash, does not produce <span class="m">NaN</span>, does not throw. It runs, it converges, and it gives an <em>almost</em> right answer. That is why it survives for weeks: the unit test is green (small angles), the frame-to-frame odometry looks lovely (small angles), and the error surfaces the first time the system closes a large loop — where it is hard to trace back.</p><p><strong>This moon is where the others converge.</strong> Each thread belongs to its own branch journey: the left Jacobian to the <span class="m">SE(3)</span> moon, the body/world distinction to <span class="m">SO(3)</span>, quaternions and the true shape of <span class="m">SO(3)</span> to the Riemannian-gradient moon, <span class="m">⊞</span>/<span class="m">⊟</span> and Jacobian structure to the factor-graph moon. What can only be seen from here is that <strong>all three are the same trap</strong>.</p><div class="bubble" id="slPatternNote" role="dialog" aria-label="The left Jacobian" hidden><p>In the <span class="m">SE(3)</span> exponential the translational part is not <span class="m">v</span> but <span class="m">J<sub>l</sub>(ω) v</span> — the <em>left Jacobian</em> rotates and stretches the <span class="m">𝔰𝔢(3)</span> vector <span class="m">v</span> before it becomes an actual translation <span class="m">t</span>. In closed form on <span class="m">SO(3)</span>:</p><p class="matline"><span class="m">J<sub>l</sub> = I + <span class="frac"><span>1 − cos θ</span><span>θ²</span></span> ω<sup>∧</sup> + <span class="frac"><span>θ − sin θ</span><span>θ³</span></span> (ω<sup>∧</sup>)²</span></p><p>Expanded for small <span class="m">θ</span> this is <span class="m">J<sub>l</sub> ≈ I + ½ω<sup>∧</sup></span>, so the deviation from <span class="m">I</span> is <strong>first order</strong> in the angle: of order <span class="m">θ/2</span>. That is the curve the scene plots (in the Frobenius norm, for a unit axis).</p><p>What matters about it: it is <em>not</em> zero at small angles, merely small. Someone who builds in the identification <span class="m">v = t</span> has not written code that is correct for small angles — they have written code whose error is hidden.</p><p>The derivation — why this <span class="m">J<sub>l</sub></span>, and its role in covariance propagation — is an open thread in the notes as well.</p></div>'}
      ],
      ja: [
        {t:'フロントエンドとバックエンド', b:'<p>曲率についての観察が、<strong>アーキテクチャ</strong>上の帰結を持つ話です。シーンにあるのは軌跡です: <span class="m">30°</span> 刻みの十一の姿勢と、最後に最初へ結び戻す珊瑚色の弦 — <span class="m">300°</span> の回転です。</p><p><strong>小さな角では</strong> — 隣り合う姿勢の間の一歩、フレーム間のビジュアルオドメトリなど — 多様体は実用上平坦です。左 Jacobian は <span class="m">≈ I</span>、素朴な足し算もほとんど害がなく、誤差は無視できます。<button class="termbtn" id="slPipeInfo" type="button" aria-expanded="false" aria-controls="slPipeNote">フロントエンド</button>は簡略化を「許される」のです。</p><p><strong>大きな角、離れた姿勢の間では</strong> — ループ閉じ込み、大域バンドル調整 — 厳密な多様体の扱いが<strong>必須</strong>です。もはや小さな <span class="m">δ</span> に訴えることはできません。</p><p>そしてこれを単なる小話でなくする帰結:</p><p class="matline"><span class="m">多様体層の契約はバックエンドが決める。フロントエンドではない</span></p><p>フロントエンドはその<em>ゆるい局所版</em>です — 別の要求ではなく、同じ要求のより穏やかな条件下での姿です。だからこそ多様体層をフロントエンドの都合に合わせて設計し、あとからバックエンドへ「引き上げる」ことはできません。順序が逆なのです。</p><p>具体的には、<em>残差 ＋ Jacobian ＋ 雑音モデル</em>の三点セットを<strong>どこでも</strong>完全な厳密さで与える必要があります。フロントエンドが安い近似を使うと決めるのは構いません — しかしそれは<em>そちら側の</em>最適化であって、契約のゆるさではありません。両者の差は、システムが初めて大きなループを閉じたときに現れます。</p><div class="bubble" id="slPipeNote" role="dialog" aria-label="フロントエンドとバックエンド" hidden><p><strong>フロントエンド:</strong> 生のセンサデータを観測に変えるところ。特徴検出、対応付け、キーフレーム選択、フレーム間オドメトリ。短い時間尺度、小さな変位、厳しい実時間制約。</p><p><strong>バックエンド:</strong> 観測から整合した推定を作るところ。ファクタグラフとソルバです: バンドル調整、姿勢グラフ最適化、ループ閉じ込み。長い時間尺度、大きな回転、そして多くのステップで隔てられた姿勢対のすべて。</p><p>フロントエンドの残りの部分 — どの特徴検出器か、どう対応付けるか、いつキーフレームを取るか — はこの資料の外です。ここにあるのは推定の側だけです。</p></div>'},
        {t:'スケール', b:'<p>単眼カメラ一台からは<strong>世界の絶対的な大きさが決まりません</strong>。「推定が難しい」のではなく、<em>決まらない</em>のです。情報が画像に入っていないからです。</p><p>シーンはそれを可能なかぎり平明に、2 次元で見せています。ピンホール、数本の光線、そして自分の光線に沿って二倍の距離まで滑り出す点群。珊瑚色の点 — 光線が像の線を貫くところ — は<strong>びくともしません</strong>。二倍の大きさの世界を二倍の距離から見れば、画素まで同じ画像です。</p><p>つまり<em>かたち</em>は復元でき、<em>大きさ</em>はできません。単眼 SLAM/SfM の出力が任意単位（ふつう最初のベースライン長で正規化）であってメートルでないのはこのためです。</p><p>ここから、<span class="m">Sim(3)</span> の衛星が反対側から見せたことが従います: 二つの復元結果の差は、ちょうど一つの <span class="m">SE(3)</span> 変換<em>と</em>一つのスカラー倍率でありえます。七つの自由度です。</p><p>つまりスケールは<strong>誤りではなくゲージ自由度</strong>です。ただし変わった種類の。ファクタグラフの衛星では、単項の事前分布 —「最初の姿勢を原点とせよ」— が <span class="m">SE(3)</span> のゲージを取り去るのを見ました。スケールには<button class="termbtn" id="slGaugeInfo" type="button" aria-expanded="false" aria-controls="slGaugeNote">同じ手が効きません</button>: 固定し忘れたのではなく、固定する先がないのです。</p><p>計量的な深度センサがあればスケールは<em>推定できます</em>: 二つの深度マップの比の中央値を、多数の画素と複数フレームにわたって取ります。平均ではなく中央値なのは、遮蔽と復元ノイズのもとで外れ値が例外ではなく確実だからで — ロバストなカーネルへ導いたのと同じ考えです。そして得られたスケールは<strong>並進にしか触れません</strong>。回転はスケールに依りません。</p><div class="bubble" id="slGaugeNote" role="dialog" aria-label="なぜアンカーでは固定できないのか" hidden><p>事前分布がゲージ自由度を取り去れるのは、その自由度が<em>変数</em>にはあって<em>観測</em>にはないときです。「世界の原点はどこか」はまさにそれで、地図全体を平行移動しても相対観測はどれも変わりません。事前分布が絶対的な主張を一つ入れれば、それで済みます。</p><p>スケールでも最後の一歩まで事情は同じです: 地図全体<em>と</em>すべての姿勢の並進を同じ <span class="m">s</span> 倍しても、再投影残差は変わりません。ですから「スケールを 1 とせよ」という事前分布を入れることはできます。</p><p>ただしそれは<em>固定</em>ではなく<strong>捏造</strong>です。<span class="m">SE(3)</span> では原点の選び方は自由でした。そこに物理的な主張が伴わないからです。ところがスケールには物理的な意味があります: 何メートルか、です。恣意的な事前分布はゲージを固定するのではなく偽の主張をします — 系は自己整合的なままですが、出力はメートルではありません。</p><p>だから<em>外部の</em>情報が要ります: 計量的な深度、既知のステレオベースライン、既知の大きさの物体、車輪オドメトリ。どれも実際の長さを持ち込み、そこから先スケールは選ばれるのではなく測られます。</p></div>'},
        {t:'厳密さが必須になるところ', b:'<p>一つの形が主題全体を貫いてきました。そして罠はいつも同じです: <strong>小さな角では見えず、大きな角で突然効く。</strong></p><p>三つの場所で出会いました:</p><p class="matline"><span class="m">左 Jacobian: 小さな角では v ≈ t</span></p><p class="matline"><span class="m">body / world: 小さな δ では exp(δ)R ≈ R exp(δ)</span></p><p class="matline"><span class="m">四元数: q と −q は同じ — 大きな回転で噛みつく</span></p><p>シーンは最初のものを測っています。縦軸は<button class="termbtn" id="slPatternInfo" type="button" aria-expanded="false" aria-controls="slPatternNote">左 Jacobian の単位行列からのずれ</button>、横軸は角です。緑の区間がそれが隠れているところ: <span class="m">5°</span> でずれは <span class="m">0.06</span> — 測定ノイズに埋もれます。ところが <span class="m">90°</span> では <span class="m">1.04</span>、<span class="m">I</span> の隣に置けばもはや補正ではなく別の行列です。<span class="m">180°</span> では <span class="m">1.68</span>。</p><p>そして三つすべてに当てはまり、これらの誤りを高くつかせている点:</p><p class="matline"><span class="m">誤った版も収束する — ただ悪く収束するだけ</span></p><p>落ちもせず、<span class="m">NaN</span> も出さず、例外も投げません。走り、収束し、<em>ほとんど</em>正しい答えを返します。だから何週間も生き延びるのです: 単体テストは緑（小さな角）、フレーム間オドメトリは美しい（小さな角）、そして誤りはシステムが初めて大きなループを閉じたときに現れます — 遡って原因を突き止めるのが難しいところで。</p><p><strong>この衛星は他のすべてが合流する場所です。</strong>どの糸もそれぞれの枝の旅に属します: 左 Jacobian は <span class="m">SE(3)</span> の衛星へ、body/world の区別は <span class="m">SO(3)</span> へ、四元数と <span class="m">SO(3)</span> の本当の形はリーマン勾配の衛星へ、<span class="m">⊞</span>/<span class="m">⊟</span> と Jacobian の構造はファクタグラフの衛星へ。ここからしか見えないのは、<strong>三つが同じ罠である</strong>ということだけです。</p><div class="bubble" id="slPatternNote" role="dialog" aria-label="左 Jacobian" hidden><p><span class="m">SE(3)</span> の指数写像では、並進部分は <span class="m">v</span> ではなく <span class="m">J<sub>l</sub>(ω) v</span> です — <em>左 Jacobian</em> が <span class="m">𝔰𝔢(3)</span> のベクトル <span class="m">v</span> を回し、伸ばしてから、実際の並進 <span class="m">t</span> になります。<span class="m">SO(3)</span> 上の閉じた形:</p><p class="matline"><span class="m">J<sub>l</sub> = I + <span class="frac"><span>1 − cos θ</span><span>θ²</span></span> ω<sup>∧</sup> + <span class="frac"><span>θ − sin θ</span><span>θ³</span></span> (ω<sup>∧</sup>)²</span></p><p>小さな <span class="m">θ</span> で展開すると <span class="m">J<sub>l</sub> ≈ I + ½ω<sup>∧</sup></span> なので、<span class="m">I</span> からのずれは角について<strong>一次</strong>、およそ <span class="m">θ/2</span> の大きさです。シーンが描いているのはその曲線です（Frobenius ノルム、単位軸について）。</p><p>肝心なのは: 小さな角でずれは<em>ゼロではなく</em>、小さいだけだということ。<span class="m">v = t</span> という同一視を組み込んだ人は、小さな角について正しいコードを書いたのではなく、誤差が隠れるコードを書いたのです。</p><p>導出 — なぜこの <span class="m">J<sub>l</sub></span> なのか、共分散伝播での役割は何か — は覚え書きの側でも未着手の糸です。</p></div>'}
      ]
    }
  };
})();
