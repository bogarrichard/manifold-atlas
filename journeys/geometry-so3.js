'use strict';
/* Journey: SO(3) — the non-commutative case. The Geometry planet's fourth moon.

   Three stations, chosen so that nothing here re-derives what `so3-optimization` already
   owns (see D4 in docs/project/design-decisions.md). That journey covers the constraint
   RᵀR = I as an obstacle to optimization, exp as compound interest, and the true shape of
   SO(3). None of it covers Euler's theorem, the failure of commutativity, or gimbal lock —
   which is exactly what this moon takes:

     1 · every rotation has an axis (Euler), so R = R(a, θ) and the tangent vector is ω = aθ
     2 · R_x R_z ≠ R_z R_x, worked on one basis vector, and why body/world descends from it
     3 · gimbal lock as a theorem — compactness and π₁ = ℤ/2 forbid ANY global 3-parameter
         chart, so no cleverer choice repairs it

   Station 3's scene is the honest one: three nested gimbal rings, and the roll axis
   projected on the yaw axis is exactly sin β, so the collapse at β = 90° is computed, not
   faked. Backing notes: docs/geometry/so3.md, docs/geometry/topology-obstruction.md.
   Cards (hu/en/ja) in-file. Requires LIE.kit. */
window.LIE = window.LIE || {};
LIE.journeys = LIE.journeys || {};
LIE.journeys['geometry-so3'] = (function(){
  const K = LIE.kit;
  const { V3, ease, clamp, hexStr, fatArrow, setArrow, makeLabel } = K;

  const SP  = [V3(0,0,0), V3(44,5,-12), V3(88,-4,10)];
  const OFF = [V3(0,2.6,9.0), V3(1.1,2.9,10.4), V3(0,2.6,9.6)];

  const AXIS = V3(0.55, 0.78, 0.30).normalize();     // the invariant axis at station 1
  const HALF = Math.PI/2;

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
    // a body whose orientation is readable from any angle: a coral/teal/violet triad
    function triad(g, L, r){
      const t = new THREE.Group();
      [[V3(L,0,0),COL.coral],[V3(0,L,0),COL.teal],[V3(0,0,L),COL.violet]].forEach(([v,c])=>{
        const a = fatArrow(c, r||0.05); setArrow(a, V3(0,0,0), v); t.add(a);
      });
      g.add(t); return t;
    }
    // the circle a point sweeps when the body turns about `ax`
    function orbitPts(p, ax, seg){
      const out = [];
      for(let i=0;i<=seg;i++) out.push(p.clone().applyAxisAngle(ax, i/seg*Math.PI*2));
      return out;
    }
    // a circle of radius r in the plane spanned by the two given unit vectors
    function ringPts(r, u, v, seg){
      const out = [];
      for(let i=0;i<=seg;i++){ const a = i/seg*Math.PI*2;
        out.push(u.clone().multiplyScalar(Math.cos(a)*r).add(v.clone().multiplyScalar(Math.sin(a)*r))); }
      return out;
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
      /* 0 · Euler's theorem, made visible: one line stays put while everything else sweeps
            a circle around it. The orbits are drawn for two corners of the body, so the
            axis reads as "the only place where nothing happens". */
      g=>{
        const A = AXIS;
        line(g, [A.clone().multiplyScalar(-2.9), A.clone().multiplyScalar(2.9)], COL.green, 0.45);
        dimArrow(g, COL.green, 0.045, V3(0,0,0), A.clone().multiplyScalar(2.5), 0.95);
        const fixed = dot(g, COL.green, 0.1); fixed.position.copy(A.clone().multiplyScalar(1.35));

        const body = triad(g, 1.7, 0.05);
        const box = new THREE.Mesh(new THREE.BoxGeometry(1.15,1.15,1.15),
          new THREE.MeshBasicMaterial({color:COL.teal, wireframe:true, transparent:true, opacity:0.30}));
        body.add(box);

        // two body points and the circles they will travel
        const marks = [V3(1.7,0,0), V3(0,0,1.7)];
        marks.forEach(p=>line(g, orbitPts(p, A, 72), COL.amber, 0.30));
        const riders = marks.map(()=>dot(g, COL.amber, 0.085));

        const lbl = makeLabel('R = R(a, θ)', HX.green, 3.0); lbl.position.set(0, 3.15, 0); g.add(lbl);
        return {tick(t){
          const th = t*0.42;
          body.quaternion.setFromAxisAngle(A, th);
          marks.forEach((p,i)=>riders[i].position.copy(p.clone().applyAxisAngle(A, th)));
        }};
      },

      /* 1 · the same two right angles in both orders. Left: about world z, then world y.
            Right: y, then z. Each new rotation is composed on the LEFT, because both are
            rotations about the world's axes.
            The axis pair is chosen for legibility: following the violet z-arm, one order
            lands it on +x and the other on +y — both in the screen plane. Rotating about
            x and z instead would send one result straight at the camera, where a 90°
            difference reads as a dot. */
      g=>{
        const qz = new THREE.Quaternion(), qy = new THREE.Quaternion();
        const mk = (x, txt, hx)=>{
          const holder = new THREE.Group(); holder.position.set(x, 0, 0); g.add(holder);
          const t = triad(holder, 1.55, 0.052);
          t.add(new THREE.Mesh(new THREE.BoxGeometry(1.0,1.0,1.0),
            new THREE.MeshBasicMaterial({color:COL.teal, wireframe:true, transparent:true, opacity:0.22})));
          const l = makeLabel(txt, hx, 2.9); l.position.set(x, -2.35, 0); g.add(l);
          return t;
        };
        const bodyA = mk(-2.6, 'R(y) R(z)', HX.amber);     // z applied first
        const bodyB = mk( 2.6, 'R(z) R(y)', HX.violet);    // y applied first
        // the world frame both are measured against
        dimArrow(g, COL.coral, 0.02, V3(0,-0.2,0), V3(1.0,-0.2,0), 0.22);
        dimArrow(g, COL.teal,  0.02, V3(0,-0.2,0), V3(0,0.8,0), 0.22);

        const T0=0.9, T1=1.5, T2=0.6, T3=1.5, T4=1.8, PER=T0+T1+T2+T3+T4;
        return {tick(t){
          const tc = t % PER;
          let a=0, b=0;
          if(tc < T0){ a=0; b=0; }
          else if(tc < T0+T1){ a = HALF*ease((tc-T0)/T1); b = 0; }
          else if(tc < T0+T1+T2){ a = HALF; b = 0; }
          else if(tc < T0+T1+T2+T3){ a = HALF; b = HALF*ease((tc-T0-T1-T2)/T3); }
          else { a = HALF; b = HALF; }
          // A: first about z (angle a), then about y (angle b) → q = qy(b) · qz(a)
          qz.setFromAxisAngle(V3(0,0,1), a); qy.setFromAxisAngle(V3(0,1,0), b);
          bodyA.quaternion.copy(qy).multiply(qz);
          // B: first about y (angle a), then about z (angle b) → q = qz(b) · qy(a)
          qy.setFromAxisAngle(V3(0,1,0), a); qz.setFromAxisAngle(V3(0,0,1), b);
          bodyB.quaternion.copy(qz).multiply(qy);
        }};
      },

      /* 2 · gimbal lock. Three nested rings; the roll axis in world coordinates is
            (cos β sin α, −sin β, cos β cos α), so its overlap with the yaw axis is exactly
            |sin β| — the coral warning arrow is driven by that number, not by a timer. */
      g=>{
        const ex = V3(1,0,0), ey = V3(0,1,0), ez = V3(0,0,1);
        const Gy = new THREE.Group(); g.add(Gy);                       // yaw, about world y
        line(Gy, ringPts(2.45, ex, ez, 80), COL.teal, 0.5);
        const Gp = new THREE.Group(); Gy.add(Gp);                      // pitch, about local x
        line(Gp, ringPts(1.90, ey, ez, 80), COL.violet, 0.5);
        const Gr = new THREE.Group(); Gp.add(Gr);                      // roll, about local z
        line(Gr, ringPts(1.38, ex, ey, 80), COL.amber, 0.5);
        triad(Gr, 1.0, 0.045);

        dimArrow(Gy, COL.teal,   0.03, V3(0,-2.7,0), V3(0,5.4,0), 0.55);   // yaw axis
        dimArrow(Gp, COL.violet, 0.03, V3(-2.1,0,0), V3(4.2,0,0), 0.45);   // pitch axis
        dimArrow(Gr, COL.amber,  0.03, V3(0,0,-1.6), V3(0,0,3.2), 0.45);   // roll axis
        const warn = dimArrow(g, COL.coral, 0.055, V3(0,-2.9,0), V3(0,5.8,0), 0.0);
        const lbl = makeLabel('β → 90°', HX.coral, 2.6); lbl.position.set(0, 3.25, 0);
        lbl.material.opacity = 0; g.add(lbl);

        return {tick(t){
          const beta = HALF * 0.5 * (1 - Math.cos(t*0.55));      // 0 … 90° … 0
          Gy.rotation.y = t*0.23;
          Gp.rotation.x = beta;
          Gr.rotation.z = t*0.37;
          // |roll axis · yaw axis| = |sin β| — one when the two dials turn the same way
          const overlap = Math.abs(Math.sin(beta));
          const w = clamp((overlap - 0.90)/0.09, 0, 1);
          warn.userData.cyl.material.opacity = w*0.75;
          warn.userData.cone.material.opacity = w*0.75;
          lbl.material.opacity = w;
        }};
      }
    ];

    function bindCard(i){
      wireBubble('so3gEulerInfo','so3gEulerNote');   // card 1 · why 1 is always an eigenvalue
      wireBubble('so3gCommInfo','so3gCommNote');     // card 2 · BCH, and why small angles hide it
      wireBubble('so3gTopInfo','so3gTopNote');       // card 3 · the two invariants
    }

    return { stations, bindCard };
  }

  return {
    id: 'geometry-so3',
    tier: 'geometry',
    layout: { SP, OFF },
    threadKey: 'teal',
    build,
    cards: {
      hu: [
        {t:'Minden forgatásnak van tengelye', b:'<p>Mit csinál egy <span class="m">R ∈ SO(3)</span> <em>valójában</em>? A válasz Euler tétele, és meglepően erős: <strong>minden</strong> forgatásnak van egy tengelye — egy egyenes, amit helyben hagy.</p><p>Nem „a legtöbbnek”, nem „a szépeknek”. Mindegyiknek, és a <button class="termbtn" id="so3gEulerInfo" type="button" aria-expanded="false" aria-controls="so3gEulerNote">bizonyítás három sor</button>.</p><p>A jelenetben ez látszik: a zöld egyenes áll, minden más pont kört ír le körülötte. Ezért írható minden forgatás így:</p><p class="matline"><span class="m">R = R(a, θ)</span>,&nbsp;&nbsp;<span class="m">‖a‖ = 1</span></p><p>Egy <span class="m">a</span> egységvektor és egy <span class="m">θ</span> szög. Számoljuk meg a szabadsági fokokat innen: az <span class="m">a</span> az egységgömb egy pontja, az <strong>2</strong>; a <span class="m">θ</span> egy szám, az <strong>1</strong>. Összesen <strong>3</strong> — ugyanaz a három, ami a <span class="m">R<sup>⊤</sup>R = I</span> kényszerből is kijön, csak egészen más úton.</p><p>És most a lényeg, amiért ez itt van: a tengely és a szög összeszorozható <em>egyetlen</em> vektorrá.</p><p class="matline"><span class="m">ω = a θ ∈ ℝ³</span></p><p>Ez már egy közönséges 3-vektor: összeadható, skálázható, deriválható. Ez lesz az az érintőtér-vektor, amit az <span class="m">exp</span> visszavisz a csoportba. A tér, ahol a <span class="m">ω</span> él, lapos; a tér, ahol az <span class="m">R</span> él, nem — és a kettő közti oda-vissza az egész gépezet.</p><div class="bubble" id="so3gEulerNote" role="dialog" aria-label="Euler tetelenek bizonyitasa" hidden><p>Azt kell megmutatni, hogy <span class="m">1</span> sajátértéke <span class="m">R</span>-nek, azaz <span class="m">det(R − I) = 0</span>. Használjuk, hogy <span class="m">R R<sup>⊤</sup> = I</span> és <span class="m">det R = 1</span>:</p><p class="matline"><span class="m">det(R − I) = det(R − R R<sup>⊤</sup>) = det R · det(I − R<sup>⊤</sup>)</span></p><p class="matline"><span class="m">= det((I − R)<sup>⊤</sup>) = det(I − R) = (−1)³ det(R − I)</span></p><p>Tehát <span class="m">det(R − I) = −det(R − I)</span>, vagyis <span class="m">det(R − I) = 0</span>. Van olyan nemnulla <span class="m">a</span>, amire <span class="m">R a = a</span>: ez a tengely.</p><p>Figyeld meg, hol dolgozik a <strong>páratlan</strong> dimenzió: a <span class="m">(−1)³</span> tényezőben. Páros dimenzióban a bizonyítás elromlik, és jogosan — egy síkbeli forgatásnak (<span class="m">SO(2)</span>) <em>nincs</em> fix iránya, csak fix pontja.</p></div>'},
        {t:'A sorrend számít, 3D-ben', b:'<p><span class="m">SO(2)</span> kommutatív volt. <span class="m">SE(2)</span> már nem — de ott a nem-kommutativitás az eltolásból jött, a forgatásrész továbbra is jól viselkedett. Itt maga a forgatás romlik el.</p><p>Vegyünk két derékszöget: forgatás a világ <span class="m">z</span> tengelye körül, és forgatás a világ <span class="m">y</span> tengelye körül. Kövessük a lila <span class="m">e<sub>z</sub></span> irányt.</p><p class="matline"><span class="m">előbb z, aztán y:&nbsp; e<sub>z</sub> → e<sub>z</sub> → e<sub>x</sub></span></p><p class="matline"><span class="m">előbb y, aztán z:&nbsp; e<sub>z</sub> → e<sub>x</sub> → e<sub>y</sub></span></p><p>Ugyanaz a két mozdulat, és a lila tengely az egyik esetben <span class="m">x</span>-re, a másikban <span class="m">y</span>-ra mutat. Nem finom eltérés: <strong>90°</strong>.</p><p class="matline"><span class="m">R<sub>y</sub> R<sub>z</sub> ≠ R<sub>z</sub> R<sub>y</sub></span></p><p>Ez a <em>theory-map</em> szerinti „egy új dolog” <span class="m">SO(3)</span>-ban, és sokkal messzebbre gyűrűzik, mint elsőre látszik. Ha a szorzás sorrendje számít, akkor számít az is, hogy egy <span class="m">δ</span> perturbációt <strong>balról vagy jobbról</strong> szorzunk rá a becslésre:</p><p class="matline"><span class="m">exp(δ) R</span>&nbsp;&nbsp;vagy&nbsp;&nbsp;<span class="m">R exp(δ)</span></p><p>Az első a világ koordinátáiban perturbál, a második a testében. Ez a <em>body vs. world</em> distinkció, és a teljes tartalma ez az egy egyenlőtlenség. Hogy melyiket hívjuk „body”-nak, az <em>konvenció</em>; hogy a kettő <em>különbözik</em>, az <em>tétel</em>.</p><p>Csak <button class="termbtn" id="so3gCommInfo" type="button" aria-expanded="false" aria-controls="so3gCommNote">kis szögeknél alig látszik</button> — és pontosan ezért marad hetekig észrevétlen egy rossz Jacobian.</p><div class="bubble" id="so3gCommNote" role="dialog" aria-label="Miert nem latszik kis szogeknel" hidden><p>A Baker–Campbell–Hausdorff-formula első két tagja:</p><p class="matline"><span class="m">exp(ω<sub>1</sub>) exp(ω<sub>2</sub>) = exp(ω<sub>1</sub> + ω<sub>2</sub> + ½[ω<sub>1</sub>, ω<sub>2</sub>] + …)</span></p><p><span class="m">SO(3)</span>-ban a kommutátor éppen a vektoriális szorzat: <span class="m">[ω<sub>1</sub>, ω<sub>2</sub>] = ω<sub>1</sub> × ω<sub>2</sub></span>.</p><p>A hibatag tehát a szögek nagyságában <strong>másodrendű</strong>. Ha <span class="m">‖ω‖ ~ 10<sup>−3</sup></span>, a sorrendcsere hatása <span class="m">~10<sup>−6</sup></span> — a mérési zaj alatt.</p><p>Ez ugyanaz a mintázat, ami végigmegy az egész anyagon: <em>kis szögeknél nem látszik, nagyoknál hirtelen számít</em>. A rossz változat is konvergál, csak rosszabbul — ezért nem bukik ki a teszteken, és ezért harap loop closure-nél.</p></div>'},
        {t:'A gimbal lock tétel, nem bosszúság', b:'<p>Az Euler-szögek három egymásba ágyazott forgatást tesznek egymásra — a jelenet három gyűrűje. Nézd, mi történik, ahogy a középső <span class="m">β</span> a 90°-hoz közelít: a külső és a belső gyűrű tengelye <strong>egybeesik</strong>. Három tárcsa, de már csak két független irány. Egy szabadsági fok eltűnt.</p><p>A szokásos reakció az, hogy ez az Euler-szögek ügyetlensége, és egy okosabb paraméterezés megjavítja. <strong>Nem javítja meg.</strong> Ez az anyag egyetlen lehetetlenségi tétele:</p><p class="matline"><span class="m">nincs globális, szingularitásmentes 3-paraméteres koordináta SO(3)-ra</span></p><p>Egy ilyen koordináta definíció szerint egy <button class="termbtn" id="so3gTopInfo" type="button" aria-expanded="false" aria-controls="so3gTopNote">diffeomorfizmus</button> lenne <span class="m">SO(3)</span> és <span class="m">ℝ³</span> egy nyílt része között. A diffeomorfizmusok viszont minden topológiai invariánst megőriznek, és itt <em>kettő</em> is elromlik, egymástól függetlenül:</p><p class="matline"><span class="m">SO(3) kompakt</span>&nbsp;·&nbsp;<span class="m">ℝ³ nyílt részei nem</span></p><p class="matline"><span class="m">π<sub>1</sub>(SO(3)) = ℤ/2</span>&nbsp;·&nbsp;<span class="m">π<sub>1</sub>(ℝ³) = 0</span></p><p>Az első önmagában elég. Vagyis <em>bármely</em> 3-paraméteres reprezentáció — Euler-szögek, Rodrigues-vektor, az axis-angle 3-vektorként — <strong>valahol kötelezően elromlik</strong>. Nem a választás rossz; a 3 lapos szám kevés.</p><p>Ami menekülésnek látszik, és amit valójában ad. A <strong>kvaternió</strong> eggyel feljebb lép: <span class="m">S³</span> sima és szingularitásmentes, egy <em>kényszert</em> (<span class="m">‖q‖ = 1</span>) cserél <em>simaságra</em> — de <span class="m">S³</span> továbbra is kompakt és görbült, tehát a laposságtól nem kerültünk közelebb. Az <strong>atlasz</strong> — több lokális chart, átfedésekkel — működik, de akkor a „globális lapos koordináta” ambíciót adtuk fel, nem teljesítettük.</p><p>A gyakorlati megoldás a kettő kombinációja: a forgatást <em>redundánsan</em> tároljuk (mátrix vagy kvaternió), a <em>növekményt</em> viszont 3-vektorként vesszük a lokális érintőtérben. Hogy ez pontosan hogyan működik — és hogy hogy néz ki <span class="m">SO(3)</span> igazi, <span class="m">ℤ/2</span>-es alakja —, azt a <em>Riemann-gradiens</em> hold mutatja meg.</p><div class="bubble" id="so3gTopNote" role="dialog" aria-label="A ket invarians" hidden><p>Egy <em>diffeomorfizmus</em> oda-vissza sima, kölcsönösen egyértelmű megfeleltetés. Ha két tér között van ilyen, akkor topológiailag ugyanaz a tér, csak másképp rajzolva.</p><p><strong>Kompaktság.</strong> <span class="m">SO(3)</span> zárt és korlátos (a mátrixelemek <span class="m">[−1, 1]</span>-ben vannak): minden végtelen sorozatnak van konvergens részsorozata. <span class="m">ℝ³</span> egy nyílt részhalmazából viszont ki lehet „szökni” a peremre. Egy sima megfeleltetés ezt nem hidalja át.</p><p><strong>Egyszeres összefüggőség.</strong> A <span class="m">π<sub>1</sub></span> azt méri, hányféle lényegében különböző hurok van a térben. <span class="m">ℝ³</span>-ban minden hurok összehúzható egy pontba, tehát <span class="m">π<sub>1</sub> = 0</span>. <span class="m">SO(3)</span>-ban a 360°-os forgatás hurka <strong>nem</strong> húzható össze — a 720°-os viszont igen. Ez a <span class="m">ℤ/2</span>, és ez az, amit a szíjtrükk mutat.</p><p>Bármelyik önmagában megöli a globális lapos koordinátát; hogy mindkettő igaz, csak nyomatékosítja.</p></div>'}
      ],
      en: [
        {t:'Every Rotation Has an Axis', b:'<p>What does an <span class="m">R ∈ SO(3)</span> <em>actually</em> do? The answer is Euler’s theorem, and it is surprisingly strong: <strong>every</strong> rotation has an axis — a line it leaves where it is.</p><p>Not “most of them”, not “the nice ones”. All of them, and the <button class="termbtn" id="so3gEulerInfo" type="button" aria-expanded="false" aria-controls="so3gEulerNote">proof is three lines</button>.</p><p>The scene shows it: the green line stands still while every other point traces a circle around it. That is why every rotation can be written</p><p class="matline"><span class="m">R = R(a, θ)</span>,&nbsp;&nbsp;<span class="m">‖a‖ = 1</span></p><p>a unit vector <span class="m">a</span> and an angle <span class="m">θ</span>. Count the degrees of freedom from here: <span class="m">a</span> is a point of the unit sphere, worth <strong>2</strong>; <span class="m">θ</span> is one number, worth <strong>1</strong>. Total <strong>3</strong> — the same three that falls out of the constraint <span class="m">R<sup>⊤</sup>R = I</span>, arrived at along a completely different road.</p><p>And now the point of putting this first: axis and angle multiply into a <em>single</em> vector.</p><p class="matline"><span class="m">ω = a θ ∈ ℝ³</span></p><p>That is an ordinary 3-vector: you can add it, scale it, differentiate it. It is the tangent vector that <span class="m">exp</span> carries back into the group. The space <span class="m">ω</span> lives in is flat; the space <span class="m">R</span> lives in is not — and the traffic between them is the whole machine.</p><div class="bubble" id="so3gEulerNote" role="dialog" aria-label="Proof of Euler theorem" hidden><p>We must show that <span class="m">1</span> is an eigenvalue of <span class="m">R</span>, i.e. <span class="m">det(R − I) = 0</span>. Use <span class="m">R R<sup>⊤</sup> = I</span> and <span class="m">det R = 1</span>:</p><p class="matline"><span class="m">det(R − I) = det(R − R R<sup>⊤</sup>) = det R · det(I − R<sup>⊤</sup>)</span></p><p class="matline"><span class="m">= det((I − R)<sup>⊤</sup>) = det(I − R) = (−1)³ det(R − I)</span></p><p>So <span class="m">det(R − I) = −det(R − I)</span>, hence <span class="m">det(R − I) = 0</span>. There is a non-zero <span class="m">a</span> with <span class="m">R a = a</span>: the axis.</p><p>Notice where the <strong>odd</strong> dimension does its work: in the factor <span class="m">(−1)³</span>. In even dimensions the proof breaks, and rightly so — a planar rotation (<span class="m">SO(2)</span>) has <em>no</em> fixed direction, only a fixed point.</p></div>'},
        {t:'Order Matters, in 3D', b:'<p><span class="m">SO(2)</span> was commutative. <span class="m">SE(2)</span> was not — but there the non-commutativity came from the translation, while the rotation part still behaved. Here the rotation itself goes wrong.</p><p>Take two right angles: a rotation about the world’s <span class="m">z</span> axis, and one about the world’s <span class="m">y</span> axis. Follow the violet direction <span class="m">e<sub>z</sub></span>.</p><p class="matline"><span class="m">z first, then y:&nbsp; e<sub>z</sub> → e<sub>z</sub> → e<sub>x</sub></span></p><p class="matline"><span class="m">y first, then z:&nbsp; e<sub>z</sub> → e<sub>x</sub> → e<sub>y</sub></span></p><p>The same two moves, and the violet axis ends up pointing at <span class="m">x</span> in one case and at <span class="m">y</span> in the other. Not a subtle discrepancy: <strong>90°</strong>.</p><p class="matline"><span class="m">R<sub>y</sub> R<sub>z</sub> ≠ R<sub>z</sub> R<sub>y</sub></span></p><p>This is the “one new thing” <span class="m">SO(3)</span> adds, and it reaches further than it first appears. If the order of multiplication matters, then it also matters whether a perturbation <span class="m">δ</span> multiplies the estimate <strong>from the left or from the right</strong>:</p><p class="matline"><span class="m">exp(δ) R</span>&nbsp;&nbsp;or&nbsp;&nbsp;<span class="m">R exp(δ)</span></p><p>The first perturbs in the world’s coordinates, the second in the body’s. That is the <em>body vs. world</em> distinction, and its entire content is this one inequality. Which side we call “body” is a <em>convention</em>; that the two <em>differ</em> is a <em>theorem</em>.</p><p>It is just that <button class="termbtn" id="so3gCommInfo" type="button" aria-expanded="false" aria-controls="so3gCommNote">at small angles you can barely see it</button> — which is exactly why a wrong Jacobian survives for weeks.</p><div class="bubble" id="so3gCommNote" role="dialog" aria-label="Why small angles hide it" hidden><p>The first two terms of the Baker–Campbell–Hausdorff formula:</p><p class="matline"><span class="m">exp(ω<sub>1</sub>) exp(ω<sub>2</sub>) = exp(ω<sub>1</sub> + ω<sub>2</sub> + ½[ω<sub>1</sub>, ω<sub>2</sub>] + …)</span></p><p>In <span class="m">SO(3)</span> the commutator is exactly the cross product: <span class="m">[ω<sub>1</sub>, ω<sub>2</sub>] = ω<sub>1</sub> × ω<sub>2</sub></span>.</p><p>So the error term is <strong>second order</strong> in the size of the angles. With <span class="m">‖ω‖ ~ 10<sup>−3</sup></span>, swapping the order costs <span class="m">~10<sup>−6</sup></span> — below the measurement noise.</p><p>This is the pattern that runs through the whole subject: <em>invisible at small angles, suddenly decisive at large ones</em>. The wrong version converges too, just worse — which is why it passes the tests, and why it bites at loop closure.</p></div>'},
        {t:'Gimbal Lock Is a Theorem, Not a Nuisance', b:'<p>Euler angles stack three rotations inside one another — the three rings in the scene. Watch what happens as the middle one, <span class="m">β</span>, approaches 90°: the outer and the inner ring’s axes <strong>coincide</strong>. Three dials, but only two independent directions left. A degree of freedom has vanished.</p><p>The usual reaction is that this is clumsiness on the part of Euler angles, and that a smarter parameterisation repairs it. <strong>It does not.</strong> This is the one impossibility theorem in the subject:</p><p class="matline"><span class="m">there is no global, singularity-free 3-parameter coordinate for SO(3)</span></p><p>Such a coordinate would by definition be a <button class="termbtn" id="so3gTopInfo" type="button" aria-expanded="false" aria-controls="so3gTopNote">diffeomorphism</button> between <span class="m">SO(3)</span> and an open piece of <span class="m">ℝ³</span>. But diffeomorphisms preserve every topological invariant, and <em>two</em> of them break here, independently:</p><p class="matline"><span class="m">SO(3) is compact</span>&nbsp;·&nbsp;<span class="m">open subsets of ℝ³ are not</span></p><p class="matline"><span class="m">π<sub>1</sub>(SO(3)) = ℤ/2</span>&nbsp;·&nbsp;<span class="m">π<sub>1</sub>(ℝ³) = 0</span></p><p>The first alone is enough. So <em>any</em> 3-parameter representation — Euler angles, the Rodrigues vector, axis-angle packed as a 3-vector — <strong>must break somewhere</strong>. The choice is not bad; three flat numbers are too few.</p><p>What looks like an escape, and what it actually buys. The <strong>quaternion</strong> steps up one dimension: <span class="m">S³</span> is smooth and singularity-free, trading a <em>constraint</em> (<span class="m">‖q‖ = 1</span>) for <em>smoothness</em> — but <span class="m">S³</span> is still compact and still curved, so we are no closer to flat. An <strong>atlas</strong> — several local charts with overlaps — does work, but then we have abandoned the ambition of a global flat coordinate rather than met it.</p><p>The practical answer is the combination of the two: store the rotation <em>redundantly</em> (matrix or quaternion), but take the <em>increment</em> as a 3-vector in the local tangent space. Exactly how that works — and what <span class="m">SO(3)</span>’s true, <span class="m">ℤ/2</span>-shaped form looks like — is what the <em>Riemannian gradient</em> moon shows.</p><div class="bubble" id="so3gTopNote" role="dialog" aria-label="The two invariants" hidden><p>A <em>diffeomorphism</em> is a one-to-one correspondence that is smooth in both directions. If two spaces admit one, they are topologically the same space drawn differently.</p><p><strong>Compactness.</strong> <span class="m">SO(3)</span> is closed and bounded (its matrix entries lie in <span class="m">[−1, 1]</span>): every infinite sequence has a convergent subsequence. From an open subset of <span class="m">ℝ³</span> you can instead “escape” towards the boundary. A smooth correspondence cannot bridge that.</p><p><strong>Simple connectedness.</strong> <span class="m">π<sub>1</sub></span> counts how many essentially different loops a space has. In <span class="m">ℝ³</span> every loop contracts to a point, so <span class="m">π<sub>1</sub> = 0</span>. In <span class="m">SO(3)</span> the loop of a 360° rotation <strong>does not</strong> contract — while the 720° one does. That is the <span class="m">ℤ/2</span>, and it is what the belt trick demonstrates.</p><p>Either one alone kills the global flat coordinate; that both hold only underlines it.</p></div>'}
      ],
      ja: [
        {t:'どの回転にも軸がある', b:'<p><span class="m">R ∈ SO(3)</span> は<em>実際には</em>何をしているのか。答えは Euler の定理で、驚くほど強い主張です: <strong>どの</strong>回転にも軸がある — その場に残す直線がある、ということです。</p><p>「たいていの回転には」でも「行儀のよい回転には」でもありません。すべてに、です。しかも<button class="termbtn" id="so3gEulerInfo" type="button" aria-expanded="false" aria-controls="so3gEulerNote">証明は三行</button>。</p><p>シーンがそれを見せています: 緑の直線は静止し、他のどの点もそのまわりに円を描きます。だからどの回転もこう書けます:</p><p class="matline"><span class="m">R = R(a, θ)</span>,&nbsp;&nbsp;<span class="m">‖a‖ = 1</span></p><p>単位ベクトル <span class="m">a</span> と角 <span class="m">θ</span>。ここから自由度を数えましょう: <span class="m">a</span> は単位球面上の点で <strong>2</strong>、<span class="m">θ</span> は数一つで <strong>1</strong>。合わせて <strong>3</strong> — 拘束 <span class="m">R<sup>⊤</sup>R = I</span> から出てくるのと同じ 3 に、まったく別の道から着きました。</p><p>そしてこれを先に置く理由: 軸と角は<em>一つの</em>ベクトルに掛け合わせられます。</p><p class="matline"><span class="m">ω = a θ ∈ ℝ³</span></p><p>これはふつうの 3 次元ベクトルです: 足せる、スケールできる、微分できる。これこそ <span class="m">exp</span> が群へ戻す接ベクトルです。<span class="m">ω</span> の住む空間は平坦で、<span class="m">R</span> の住む空間はそうではない — この二つの間の往復が、機械のすべてです。</p><div class="bubble" id="so3gEulerNote" role="dialog" aria-label="Euler の定理の証明" hidden><p><span class="m">1</span> が <span class="m">R</span> の固有値であること、すなわち <span class="m">det(R − I) = 0</span> を示します。<span class="m">R R<sup>⊤</sup> = I</span> と <span class="m">det R = 1</span> を使って:</p><p class="matline"><span class="m">det(R − I) = det(R − R R<sup>⊤</sup>) = det R · det(I − R<sup>⊤</sup>)</span></p><p class="matline"><span class="m">= det((I − R)<sup>⊤</sup>) = det(I − R) = (−1)³ det(R − I)</span></p><p>したがって <span class="m">det(R − I) = −det(R − I)</span>、ゆえに <span class="m">det(R − I) = 0</span>。<span class="m">R a = a</span> となる非零の <span class="m">a</span> が存在します: それが軸です。</p><p><strong>奇数</strong>次元がどこで効いているかに注目してください: <span class="m">(−1)³</span> の因子です。偶数次元では証明が壊れますが、それは正当です — 平面回転（<span class="m">SO(2)</span>）には不動の<em>方向</em>はなく、不動点があるだけだからです。</p></div>'},
        {t:'3D でも順序が効く', b:'<p><span class="m">SO(2)</span> は可換でした。<span class="m">SE(2)</span> はもう可換ではありませんでしたが、そこでの非可換性は並進から来ていて、回転部分はまだ行儀よくしていました。ここでは回転そのものが壊れます。</p><p>直角を二つ取ります: 世界の <span class="m">z</span> 軸まわりの回転と、世界の <span class="m">y</span> 軸まわりの回転。菫色の向き <span class="m">e<sub>z</sub></span> を追ってください。</p><p class="matline"><span class="m">先に z、次に y:&nbsp; e<sub>z</sub> → e<sub>z</sub> → e<sub>x</sub></span></p><p class="matline"><span class="m">先に y、次に z:&nbsp; e<sub>z</sub> → e<sub>x</sub> → e<sub>y</sub></span></p><p>同じ二つの動作なのに、菫色の軸は一方では <span class="m">x</span> を、他方では <span class="m">y</span> を指して終わります。微妙な食い違いではありません: <strong>90°</strong> です。</p><p class="matline"><span class="m">R<sub>y</sub> R<sub>z</sub> ≠ R<sub>z</sub> R<sub>y</sub></span></p><p>これが <span class="m">SO(3)</span> の加える「一つの新しいこと」であり、見た目より遠くまで波及します。掛ける順序が効くなら、摂動 <span class="m">δ</span> を推定値に<strong>左から掛けるか右から掛けるか</strong>も効くからです:</p><p class="matline"><span class="m">exp(δ) R</span>&nbsp;&nbsp;または&nbsp;&nbsp;<span class="m">R exp(δ)</span></p><p>前者は世界の座標で、後者は物体の座標で摂動します。これが <em>body / world</em> の区別であり、その中身はまるごとこの一つの不等式です。どちらを「body」と呼ぶかは<em>約束</em>、二つが<em>異なる</em>ことは<em>定理</em>です。</p><p>ただし<button class="termbtn" id="so3gCommInfo" type="button" aria-expanded="false" aria-controls="so3gCommNote">小さな角ではほとんど見えません</button> — だからこそ誤った Jacobian が何週間も生き延びるのです。</p><div class="bubble" id="so3gCommNote" role="dialog" aria-label="なぜ小さな角では見えないのか" hidden><p>Baker–Campbell–Hausdorff の公式の最初の二項:</p><p class="matline"><span class="m">exp(ω<sub>1</sub>) exp(ω<sub>2</sub>) = exp(ω<sub>1</sub> + ω<sub>2</sub> + ½[ω<sub>1</sub>, ω<sub>2</sub>] + …)</span></p><p><span class="m">SO(3)</span> では交換子はちょうど外積です: <span class="m">[ω<sub>1</sub>, ω<sub>2</sub>] = ω<sub>1</sub> × ω<sub>2</sub></span>。</p><p>つまり誤差項は角の大きさについて<strong>二次</strong>です。<span class="m">‖ω‖ ~ 10<sup>−3</sup></span> なら順序の入れ替えの代償は <span class="m">~10<sup>−6</sup></span> — 測定ノイズの下です。</p><p>これは主題全体を貫く模様です: <em>小さな角では見えず、大きな角で突然効く</em>。誤った版も収束はします、ただ悪く収束するだけ — だからテストを通ってしまい、だからループ閉じ込みで噛みつくのです。</p></div>'},
        {t:'ジンバルロックは定理であって不便ではない', b:'<p>Euler 角は三つの回転を入れ子にします — シーンの三つの環です。真ん中の <span class="m">β</span> が 90° に近づくとどうなるか見てください: 外側の環と内側の環の軸が<strong>一致します</strong>。ダイヤルは三つあるのに、独立な向きは二つしか残っていません。自由度が一つ消えたのです。</p><p>よくある反応は、これは Euler 角の不器用さであって、賢いパラメータ化なら直る、というものです。<strong>直りません。</strong>これはこの主題における唯一の不可能性定理です:</p><p class="matline"><span class="m">SO(3) に大域的で特異点のない 3 パラメータ座標は存在しない</span></p><p>そのような座標は定義上、<span class="m">SO(3)</span> と <span class="m">ℝ³</span> の開集合との間の<button class="termbtn" id="so3gTopInfo" type="button" aria-expanded="false" aria-controls="so3gTopNote">微分同相</button>になります。しかし微分同相はあらゆる位相不変量を保ち、ここでは<em>二つ</em>が独立に壊れます:</p><p class="matline"><span class="m">SO(3) はコンパクト</span>&nbsp;·&nbsp;<span class="m">ℝ³ の開集合はそうでない</span></p><p class="matline"><span class="m">π<sub>1</sub>(SO(3)) = ℤ/2</span>&nbsp;·&nbsp;<span class="m">π<sub>1</sub>(ℝ³) = 0</span></p><p>最初の一つだけで十分です。つまり<em>どんな</em> 3 パラメータ表現も — Euler 角も、Rodrigues ベクトルも、3 次元ベクトルに詰めた axis-angle も — <strong>どこかで必ず壊れます</strong>。選び方が悪いのではなく、平坦な三つの数では足りないのです。</p><p>逃げ道に見えるもの、そして実際に得られるもの。<strong>四元数</strong>は次元を一つ上げます: <span class="m">S³</span> は滑らかで特異点がなく、<em>拘束</em>（<span class="m">‖q‖ = 1</span>）を<em>滑らかさ</em>と交換します — しかし <span class="m">S³</span> は依然コンパクトで曲がっており、平坦には一歩も近づいていません。<strong>アトラス</strong>（重なりをもつ複数の局所チャート）は機能しますが、それは「大域的な平坦座標」という望みを達成したのではなく、放棄したということです。</p><p>実務上の答えは両者の組み合わせです: 回転は<em>冗長に</em>保存し（行列か四元数）、<em>増分</em>は局所接空間の 3 次元ベクトルとして取る。それが具体的にどう働くか — そして <span class="m">SO(3)</span> の本当の、<span class="m">ℤ/2</span> の形がどう見えるか — は<em>リーマン勾配</em>の衛星が見せます。</p><div class="bubble" id="so3gTopNote" role="dialog" aria-label="二つの不変量" hidden><p><em>微分同相</em>とは、両方向に滑らかな一対一対応のことです。二つの空間の間にそれがあれば、位相的には同じ空間を別の描き方で見ているだけです。</p><p><strong>コンパクト性。</strong><span class="m">SO(3)</span> は閉かつ有界です（行列成分が <span class="m">[−1, 1]</span> に入る）: どの無限列にも収束部分列があります。ところが <span class="m">ℝ³</span> の開集合からは境界へ「逃げ出す」ことができます。滑らかな対応ではその差は埋まりません。</p><p><strong>単連結性。</strong><span class="m">π<sub>1</sub></span> は本質的に異なるループが何種類あるかを測ります。<span class="m">ℝ³</span> ではどのループも一点に縮むので <span class="m">π<sub>1</sub> = 0</span>。<span class="m">SO(3)</span> では 360° 回転のループは<strong>縮みません</strong> — 720° のループは縮みます。これが <span class="m">ℤ/2</span> であり、ベルトの手品が示しているものです。</p><p>どちらか一方だけでも大域的な平坦座標は否定されます。両方成り立つことは、それを念押ししているにすぎません。</p></div>'}
      ]
    }
  };
})();
