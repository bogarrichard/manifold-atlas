'use strict';
/* Journey: SO(2) — the commutative curvature. The Geometry planet's second moon, between
   the flat ℝⁿ baseline and SE(2).

   Three stations, deliberately shallow (see docs/project/journey-status.md): the circle
   and R(θ₁)R(θ₂) = R(θ₁+θ₂); the compound-interest limit (1 + iα/n)ⁿ → e^{iα} with the
   first-order/second-order argument drawn rather than asserted; and the complex ↔ matrix
   ring isomorphism, closing on what 2D hides (commutativity, and therefore no body/world
   distinction) — which is the handoff to the SO(3) moon.

   Station 2 is the payoff: the polygon of n chords is built by literally multiplying by
   (1 + iα/n), so its outward overshoot IS the accumulated second-order length error, and
   the readout quotes the same numbers the card works out (n=8 → |z|=1.27, n=40 → 1.05).

   Scenes live in the XY plane, not the XZ ground plane the ℝⁿ/GD journeys use: this is a
   2D story and the camera looks straight at it. Backing note: docs/geometry/three-faces-
   of-euler.md. Cards (hu/en/ja) live in this file. Requires LIE.kit. */
window.LIE = window.LIE || {};
LIE.journeys = LIE.journeys || {};
LIE.journeys['geometry-so2'] = (function(){
  const K = LIE.kit;
  const { V3, ease, hexStr, fatArrow, setArrow, makeLabel, updateLabel } = K;

  const SP  = [V3(0,0,0), V3(42,4,-11), V3(84,-3,9)];
  const OFF = [V3(0,2.2,8.8), V3(0,2.4,8.6), V3(0,2.2,8.4)];

  // Station 1: the two rotations composed in both orders. Station 2: the angle whose
  // approximation is drawn — the same α the card quotes numbers for.
  const A1 = 0.9, A2 = 1.7;
  const ALPHA = 2.0, NS = [1, 2, 3, 4, 6, 9, 14, 22, 40];

  function build(C, PAL){
    const COL = PAL || K.palette('dark');
    const HX = { teal:hexStr(COL.teal), coral:hexStr(COL.coral), violet:hexStr(COL.violet),
                 amber:hexStr(COL.amber), green:hexStr(COL.green), ink:hexStr(COL.ink) };

    const circPts = (r,seg)=>{ const p=[]; for(let i=0;i<=seg;i++){ const a=i/seg*Math.PI*2;
      p.push(V3(Math.cos(a)*r, Math.sin(a)*r, 0)); } return p; };
    const arcPts = (r,a0,a1,seg)=>{ const p=[]; for(let i=0;i<=seg;i++){ const a=a0+(a1-a0)*i/seg;
      p.push(V3(Math.cos(a)*r, Math.sin(a)*r, 0)); } return p; };
    function line(g, pts, color, op){
      const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({color, transparent:true, opacity:op===undefined?0.9:op}));
      g.add(l); return l;
    }
    function dot(g, color, r){
      const d = new THREE.Mesh(new THREE.SphereGeometry(r||0.11,14,12),
        new THREE.MeshBasicMaterial({color}));
      g.add(d); return d;
    }
    function dimArrow(g, color, r, from, to, op){
      const a = fatArrow(color, r); setArrow(a, from, to);
      a.userData.cyl.material.transparent = true; a.userData.cyl.material.opacity = op;
      a.userData.cone.material.transparent = true; a.userData.cone.material.opacity = op;
      g.add(a); return a;
    }
    // the plane the whole journey lives in: a faint x/y cross through the origin
    function axes(g, L){
      const O = V3(0,0,0);
      dimArrow(g, COL.coral, 0.024, O, V3(L,0,0), 0.32);
      dimArrow(g, COL.teal,  0.024, O, V3(0,L,0), 0.32);
      line(g, [V3(-L,0,0), V3(0,0,0)], COL.grid1, 0.35);
      line(g, [V3(0,-L*0.55,0), V3(0,0,0)], COL.grid1, 0.35);
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
      /* 0 · the circle, and composition in both orders landing on the same point.
            Violet turns A1 then A2; amber turns A2 then A1, on a smaller radius so both
            stay visible; they meet, and the equality label fades in on the final dwell. */
      g=>{
        const R1 = 2.25, R2 = 1.80;
        axes(g, 2.95);
        line(g, circPts(R1,96), COL.teal, 0.55);
        line(g, circPts(R2,96), COL.teal, 0.22);
        const armV = fatArrow(COL.violet, 0.042); g.add(armV);
        const armA = fatArrow(COL.amber,  0.042); g.add(armA);
        const dV = dot(g, COL.violet, 0.115), dA = dot(g, COL.amber, 0.115);
        const lbl = makeLabel('SO(2) ≅ S^{1}', HX.ink, 2.7); lbl.position.set(0, 3.15, 0); g.add(lbl);
        const eq = makeLabel('θ₁ + θ₂ = θ₂ + θ₁', HX.green, 3.5); eq.position.set(0, -2.55, 0);
        eq.material.opacity = 0; g.add(eq);

        const T0=0.9, T1=1.25, T2=1.25, T3=1.5, PER=T0+T1+T2+T3;
        return {tick(t){
          const tc = t % PER;
          let a1, a2, glow = 0;
          if(tc < T0){ a1 = 0; a2 = 0; }
          else if(tc < T0+T1){ const e = ease((tc-T0)/T1); a1 = A1*e; a2 = A2*e; }
          else if(tc < T0+T1+T2){ const e = ease((tc-T0-T1)/T2); a1 = A1 + A2*e; a2 = A2 + A1*e; }
          else { a1 = a2 = A1+A2; glow = ease(Math.min(1,(tc-T0-T1-T2)/0.5)); }
          const pV = V3(Math.cos(a1)*R1, Math.sin(a1)*R1, 0);
          const pA = V3(Math.cos(a2)*R2, Math.sin(a2)*R2, 0);
          setArrow(armV, V3(0,0,0), pV); setArrow(armA, V3(0,0,0), pA);
          dV.position.copy(pV); dA.position.copy(pA);
          eq.material.opacity = glow * 0.95;
        }};
      },

      /* 1 · compound interest. Each polyline is the orbit of z ↦ z(1 + iα/n) run n times,
            so the outward drift is the accumulated length error and the shortfall in angle
            is the accumulated angle error. One n at a time; the readout is |z_n|/R. */
      g=>{
        const R = 2.15;
        axes(g, 2.95);
        line(g, circPts(R,96), COL.teal, 0.30);
        line(g, arcPts(R,0,ALPHA,64), COL.teal, 0.95);                 // the exact rotation
        const exact = dot(g, COL.teal, 0.10);
        exact.position.set(Math.cos(ALPHA)*R, Math.sin(ALPHA)*R, 0);

        const polys = NS.map(n=>{
          const c = ALPHA/n, pts = [V3(R,0,0)];
          let x = R, y = 0;
          for(let k=0;k<n;k++){ const nx = x - y*c, ny = y + x*c; x = nx; y = ny; pts.push(V3(x,y,0)); }
          const l = line(g, pts, COL.amber, 0.9); l.visible = false;
          return { n, l, end: V3(x,y,0), ratio: Math.hypot(x,y)/R };
        });
        const head = dot(g, COL.amber, 0.115);
        const lbl = makeLabel('n = 1', HX.amber, 3.4); lbl.position.set(0, 3.15, 0); g.add(lbl);
        const cap = makeLabel('exp(i α)', HX.teal, 2.2); g.add(cap);
        cap.position.copy(exact.position).add(V3(-0.75, 0.55, 0));

        let cur = -1;
        return {tick(t){
          const k = Math.floor(t/1.15) % NS.length;
          if(k !== cur){
            cur = k;
            polys.forEach((p,i)=>{ p.l.visible = (i===k); });
            head.position.copy(polys[k].end);
            updateLabel(lbl, 'n = '+polys[k].n+'   |z| = '+polys[k].ratio.toFixed(2), HX.amber);
          }
        }};
      },

      /* 2 · the ring isomorphism, drawn: the two columns of [[a,−b],[b,a]] are z and i·z —
            perpendicular, equal length, turning rigidly together. That rigidity is the
            statement that the matrix is a scaled rotation and nothing else. */
      g=>{
        const R = 2.05;
        axes(g, 2.95);
        line(g, circPts(R,96), COL.teal, 0.30);
        const c1 = fatArrow(COL.coral, 0.045);  g.add(c1);
        const c2 = fatArrow(COL.violet, 0.045); g.add(c2);
        const link = line(g, [V3(0,0,0), V3(0,0,0)], COL.green, 0.45);
        const dz = dot(g, COL.coral, 0.10), diz = dot(g, COL.violet, 0.10);
        const lz  = makeLabel('z', HX.coral, 1.5);  g.add(lz);
        const liz = makeLabel('i z', HX.violet, 1.8); g.add(liz);
        const lbl = makeLabel('J^{2} = −I', HX.ink, 2.4); lbl.position.set(0, 3.15, 0); g.add(lbl);

        return {tick(t){
          const th = t*0.34;
          const a = Math.cos(th)*R, b = Math.sin(th)*R;
          const p1 = V3(a, b, 0), p2 = V3(-b, a, 0);        // the two matrix columns
          setArrow(c1, V3(0,0,0), p1); setArrow(c2, V3(0,0,0), p2);
          dz.position.copy(p1); diz.position.copy(p2);
          lz.position.copy(p1).multiplyScalar(1.20);
          liz.position.copy(p2).multiplyScalar(1.22);
          // the rigid hypotenuse — positions rewritten in place, not reallocated per frame
          const pa = link.geometry.attributes.position;
          pa.setXYZ(0, p1.x, p1.y, 0); pa.setXYZ(1, p2.x, p2.y, 0); pa.needsUpdate = true;
        }};
      }
    ];

    function bindCard(i){
      wireBubble('so2GroupInfo','so2GroupNote');   // card 1 · what a group is
      wireBubble('so2OrderInfo','so2OrderNote');   // card 2 · the two orders, algebraically
      wireBubble('so2IsoInfo','so2IsoNote');       // card 3 · checking the isomorphism
    }

    return { stations, bindCard };
  }

  return {
    id: 'geometry-so2',
    tier: 'geometry',
    layout: { SP, OFF },
    threadKey: 'teal',
    build,
    cards: {
      hu: [
        {t:'A kör', b:'<p>Az <span class="m">SO(2)</span> a sík forgatásainak halmaza, mátrixszorzással mint művelettel — és így <button class="termbtn" id="so2GroupInfo" type="button" aria-expanded="false" aria-controls="so2GroupNote">csoport</button>. Mindegyiket egyetlen szám írja le, a <span class="m">θ</span> szög: egy szabadsági fok, ennél kevesebb már nincs.</p><p>Az egész történet ebben az egy azonosságban van:</p><p class="matline"><span class="m">R(θ<sub>1</sub>) R(θ<sub>2</sub>) = R(θ<sub>1</sub> + θ<sub>2</sub>)</span></p><p>Forgatásokat összefűzni annyi, mint szögeket összeadni. Ebből két dolog következik azonnal. Egy: <span class="m">SO(2)</span> <strong>kommutatív</strong>, mert a valós számok összeadása az — ez <em>tétel</em>, nem konvenció. Kettő: a szorzás összeadássá vált, és pontosan ez az, amit az <span class="m">exp</span> csinál; erről szól a következő állomás.</p><p>És milyen térben él a <span class="m">θ</span>? Nem egyenesben: <span class="m">θ</span> és <span class="m">θ + 2π</span> <em>ugyanaz a forgatás</em>, tehát a paramétertér körbeér.</p><p class="matline"><span class="m">SO(2) ≅ S<sup>1</sup></span></p><p>Ez az első görbült tér a sorban, és a legszelídebb fajta: görbült, de kommutatív. A jelenetben a lila jelölő előbb <span class="m">θ<sub>1</sub></span>-et fordul, aztán <span class="m">θ<sub>2</sub></span>-t; a borostyán fordítva. Ugyanoda érkeznek.</p><div class="bubble" id="so2GroupNote" role="dialog" aria-label="Mi az a csoport" hidden><p>Egy <em>csoport</em> egy halmaz egy művelettel, ami <strong>zárt</strong> (két elem szorzata is a halmazban van), <strong>asszociatív</strong>, van <strong>egységeleme</strong>, és minden elemnek van <strong>inverze</strong>.</p><p>A forgatások mindezt teljesítik: két forgatás egymásutánja forgatás, van „ne forgass” elem, és minden forgatás visszacsinálható. Mátrixalakban</p><p class="matline"><span class="m">R(θ) = ( cos θ, −sin θ ; sin θ, cos θ )</span></p><p>soronként felsorolva, <span class="m">R<sup>⊤</sup>R = I</span> és <span class="m">det R = +1</span>.</p><p>A <strong>kommutativitás nincs a listán</strong> — és ez nem véletlen. <span class="m">SO(2)</span>-ben megkapjuk ingyen, <span class="m">SO(3)</span>-ban nem.</p></div>'},
        {t:'Kamatos kamat', b:'<p>Miért éppen <span class="m">e<sup>iθ</sup></span>? Bontsuk az <span class="m">α</span> szögű forgatást <span class="m">n</span> egyenlő, pici lépésre, és közelítsük mindegyiket a lehető legdurvábban: szorozzunk <span class="m">(1 + iα/n)</span>-nel.</p><p class="matline"><span class="m">(1 + i α/n)<sup>n</sup> → e<sup>iα</sup></span>&nbsp;&nbsp;<span class="m">(n → ∞)</span></p><p>Egy <span class="m">(1 + i dα)</span>-val való szorzás majdnem forgatás, de nem az: forgat <em>és</em> nyújt. A kettő azonban nem egyforma rendű:</p><p class="matline"><span class="m">forgatás: dα</span>&nbsp;·&nbsp;<span class="m">nyúlás: √(1 + dα²) ≈ 1 + ½ dα²</span></p><p>Az egyik <button class="termbtn" id="so2OrderInfo" type="button" aria-expanded="false" aria-controls="so2OrderNote">elsőrendű, a másik másodrendű</button>. <span class="m">n</span> lépés után a felhalmozott forgás <span class="m">n · (α/n) = α</span> marad, a felhalmozott hosszhiba viszont <span class="m">n · O(1/n²) = O(1/n) → 0</span>. <strong>Ezért lesz a határértékben tiszta forgatás.</strong></p><p>A jelenetben <span class="m">α = 2</span>, és a sokszög minden csúcsa egy szorzás. Nézd a számokat: <span class="m">n = 8</span>-nál a szög már <span class="m">1.96</span> (2% hiba), de a sugár még mindig <span class="m">1.27</span> — a hossz jóval lassabban javul, mint a szög, és pontosan ez a két rend különbsége. <span class="m">n = 40</span>-nél a sugár <span class="m">1.05</span>.</p><p>És a szorzatból azért lesz <em>kompozíció</em>, mert 2D-ben a komplex szorzás eleve forgatás-kompozíció. Ezt örökli a görbült eset: <span class="m">SO(3)</span>-on ugyanez a határérték adja a mátrix-exponenciálist.</p><div class="bubble" id="so2OrderNote" role="dialog" aria-label="A ket rend" hidden><p>Legyen <span class="m">c = α/n</span>. Egyetlen lépés hatása, sorfejtve:</p><p class="matline"><span class="m">|1 + ic| = √(1 + c²) = 1 + ½c² + O(c⁴)</span></p><p class="matline"><span class="m">arg(1 + ic) = c − ⅓c³ + O(c⁵)</span></p><p>A hossz <span class="m">c</span>-ben <strong>másodrendben</strong> kezd nőni, a szög <strong>elsőrendben</strong>. <span class="m">n</span> lépés után:</p><p class="matline"><span class="m">|z<sub>n</sub>| = (1 + c²)<sup>n/2</sup> → e<sup>α²/2n</sup> → 1</span></p><p class="matline"><span class="m">arg z<sub>n</sub> = n·(c − ⅓c³ + …) = α − <span class="frac"><span>α³</span><span>3n²</span></span> + …</span></p><p>A hossz hibája <span class="m">O(1/n)</span>, a szögé <span class="m">O(1/n²)</span> — mindkettő nullába megy, csak nem egyforma tempóban. Ezt látod a jelenetben.</p></div>'},
        {t:'Három arc, egy képlet', b:'<p>A 2D-s kép nem analógia: szó szerint ugyanaz az algebra. A</p><p class="matline"><span class="m">a + bi ⟼ ( a, −b ; b, a )</span></p><p>leképezés <strong>gyűrű-izomorfizmus</strong> — összeget összegbe, szorzatot szorzatba visz —, alatta <span class="m">i ⟼ J</span>, ahol <span class="m">J<sup>2</sup> = −I</span>. <button class="termbtn" id="so2IsoInfo" type="button" aria-expanded="false" aria-controls="so2IsoNote">Két sor számolás</button>, és kész.</p><p>A jelenetben ez látszik: a mátrix két oszlopa <span class="m">(a, b)</span> és <span class="m">(−b, a)</span>. Merőlegesek, egyenlő hosszúak, és mereven együtt fordulnak — a második oszlop az elsőnek pontosan az <span class="m">i</span>-szerese. A komplex számok algebrája <em>ez</em> a mátrixalgebra, nem hasonlít rá.</p><p>Ezért vihető át minden állítás. Ugyanaz a mintázat, három kódolásban:</p><p class="matline"><span class="m">e<sup>iθ</sup></span>&nbsp;·&nbsp;<span class="m">generátor i</span>&nbsp;·&nbsp;<span class="m">i² = −1</span></p><p class="matline"><span class="m">exp(u θ/2)</span>&nbsp;·&nbsp;<span class="m">generátor u</span>&nbsp;·&nbsp;<span class="m">u² = −1</span></p><p class="matline"><span class="m">exp(â θ)</span>&nbsp;·&nbsp;<span class="m">generátor â</span>&nbsp;·&nbsp;<span class="m">â³ = −â</span></p><p>Mindhárom ugyanazt mondja: <em>a generátor exponenciálisa forgatást ad, és a generátor négyzete visszavezet</em>. A Rodrigues-sor összecsukása <span class="m">sin</span>-re és <span class="m">cos</span>-ra ugyanaz a számolás, mint az <span class="m">e<sup>iθ</sup></span> soráé. A kvaternióban a <span class="m">θ/2</span> pedig nem esetlegesség: a kvaternió kétoldalt hat, <span class="m">v ↦ q v q<sup>−1</sup></span>, tehát a szög kétszer számítódik.</p><p><strong>És amit a 2D elrejt.</strong> Itt minden forgatás felcserélhető, ezért nincs is értelme megkérdezni, hogy „a saját tengelye körül vagy a világ tengelye körül” — a kettő ugyanaz. 3D-ben <span class="m">R<sub>1</sub>R<sub>2</sub> ≠ R<sub>2</sub>R<sub>1</sub></span>, és ebből az egyetlen különbségből származik a body/world distinkció egész tartalma. Ez az <span class="m">SO(3)</span> hold.</p><div class="bubble" id="so2IsoNote" role="dialog" aria-label="Az izomorfizmus ellenorzese" hidden><p>Szorozzunk össze két komplex számot:</p><p class="matline"><span class="m">(a + bi)(c + di) = (ac − bd) + (ad + bc) i</span></p><p>Most a két mátrixot:</p><p class="matline"><span class="m">( a, −b ; b, a )( c, −d ; d, c ) = ( ac − bd, −(ad + bc) ; ad + bc, ac − bd )</span></p><p>Ez pontosan az <span class="m">(ac − bd) + (ad + bc)i</span> mátrixalakja. Az összeadásra ugyanez elemenként igaz, tehát a leképezés mindkét műveletet megőrzi.</p></div>'}
      ],
      en: [
        {t:'The Circle', b:'<p><span class="m">SO(2)</span> is the set of rotations of the plane under matrix multiplication — and so a <button class="termbtn" id="so2GroupInfo" type="button" aria-expanded="false" aria-controls="so2GroupNote">group</button>. A single number describes each one, the angle <span class="m">θ</span>: one degree of freedom, and there is no smaller number than that.</p><p>The whole story sits in one identity:</p><p class="matline"><span class="m">R(θ<sub>1</sub>) R(θ<sub>2</sub>) = R(θ<sub>1</sub> + θ<sub>2</sub>)</span></p><p>Composing rotations is adding angles. Two things follow at once. One: <span class="m">SO(2)</span> is <strong>commutative</strong>, because addition of reals is — a <em>theorem</em>, not a convention. Two: multiplication has turned into addition, which is exactly what <span class="m">exp</span> does; that is the next station.</p><p>And what space does <span class="m">θ</span> live in? Not a line: <span class="m">θ</span> and <span class="m">θ + 2π</span> are <em>the same rotation</em>, so the parameter space closes on itself.</p><p class="matline"><span class="m">SO(2) ≅ S<sup>1</sup></span></p><p>This is the first curved space in the sequence, and the gentlest kind: curved, but commutative. In the scene the violet marker turns <span class="m">θ<sub>1</sub></span> and then <span class="m">θ<sub>2</sub></span>; the amber one the other way round. They land on the same point.</p><div class="bubble" id="so2GroupNote" role="dialog" aria-label="What is a group" hidden><p>A <em>group</em> is a set with an operation that is <strong>closed</strong> (the product of two elements is in the set), <strong>associative</strong>, has an <strong>identity</strong>, and gives every element an <strong>inverse</strong>.</p><p>Rotations satisfy all of it: one rotation after another is a rotation, there is a “don’t rotate” element, and every rotation can be undone. In matrix form</p><p class="matline"><span class="m">R(θ) = ( cos θ, −sin θ ; sin θ, cos θ )</span></p><p>listed row by row, with <span class="m">R<sup>⊤</sup>R = I</span> and <span class="m">det R = +1</span>.</p><p><strong>Commutativity is not on the list</strong> — and that is no accident. In <span class="m">SO(2)</span> we get it for free; in <span class="m">SO(3)</span> we do not.</p></div>'},
        {t:'Compound Interest', b:'<p>Why <span class="m">e<sup>iθ</sup></span> of all things? Split a rotation by <span class="m">α</span> into <span class="m">n</span> equal tiny steps, and approximate each one as crudely as possible: multiply by <span class="m">(1 + iα/n)</span>.</p><p class="matline"><span class="m">(1 + i α/n)<sup>n</sup> → e<sup>iα</sup></span>&nbsp;&nbsp;<span class="m">(n → ∞)</span></p><p>Multiplying by <span class="m">(1 + i dα)</span> is almost a rotation, but not quite: it rotates <em>and</em> stretches. The two effects are not of the same order:</p><p class="matline"><span class="m">rotation: dα</span>&nbsp;·&nbsp;<span class="m">stretch: √(1 + dα²) ≈ 1 + ½ dα²</span></p><p>One is <button class="termbtn" id="so2OrderInfo" type="button" aria-expanded="false" aria-controls="so2OrderNote">first order, the other second order</button>. After <span class="m">n</span> steps the accumulated rotation is still <span class="m">n · (α/n) = α</span>, while the accumulated length error is <span class="m">n · O(1/n²) = O(1/n) → 0</span>. <strong>That is why the limit is a pure rotation.</strong></p><p>In the scene <span class="m">α = 2</span>, and every corner of the polygon is one multiplication. Watch the numbers: at <span class="m">n = 8</span> the angle is already <span class="m">1.96</span> (2% off), but the radius is still <span class="m">1.27</span> — length improves far more slowly than angle, and that gap is exactly the difference between the two orders. At <span class="m">n = 40</span> the radius is <span class="m">1.05</span>.</p><p>And the product becomes a <em>composition</em> because in 2D complex multiplication already <em>is</em> composition of rotations. The curved case inherits this: on <span class="m">SO(3)</span> the same limit gives the matrix exponential.</p><div class="bubble" id="so2OrderNote" role="dialog" aria-label="The two orders" hidden><p>Let <span class="m">c = α/n</span>. One step, expanded:</p><p class="matline"><span class="m">|1 + ic| = √(1 + c²) = 1 + ½c² + O(c⁴)</span></p><p class="matline"><span class="m">arg(1 + ic) = c − ⅓c³ + O(c⁵)</span></p><p>Length starts growing at <strong>second</strong> order in <span class="m">c</span>, angle at <strong>first</strong>. After <span class="m">n</span> steps:</p><p class="matline"><span class="m">|z<sub>n</sub>| = (1 + c²)<sup>n/2</sup> → e<sup>α²/2n</sup> → 1</span></p><p class="matline"><span class="m">arg z<sub>n</sub> = n·(c − ⅓c³ + …) = α − <span class="frac"><span>α³</span><span>3n²</span></span> + …</span></p><p>The length error is <span class="m">O(1/n)</span>, the angle error <span class="m">O(1/n²)</span> — both go to zero, at different speeds. That is what the scene shows.</p></div>'},
        {t:'Three Faces, One Formula', b:'<p>The 2D picture is not an analogy: it is literally the same algebra. The map</p><p class="matline"><span class="m">a + bi ⟼ ( a, −b ; b, a )</span></p><p>is a <strong>ring isomorphism</strong> — sums to sums, products to products — carrying <span class="m">i ⟼ J</span> with <span class="m">J<sup>2</sup> = −I</span>. <button class="termbtn" id="so2IsoInfo" type="button" aria-expanded="false" aria-controls="so2IsoNote">Two lines of arithmetic</button>, and it is done.</p><p>The scene shows it: the two columns of the matrix are <span class="m">(a, b)</span> and <span class="m">(−b, a)</span>. Perpendicular, of equal length, turning together rigidly — the second column is exactly <span class="m">i</span> times the first. The algebra of the complex numbers <em>is</em> this matrix algebra; it does not merely resemble it.</p><p>That is why every statement carries over. The same pattern, in three encodings:</p><p class="matline"><span class="m">e<sup>iθ</sup></span>&nbsp;·&nbsp;<span class="m">generator i</span>&nbsp;·&nbsp;<span class="m">i² = −1</span></p><p class="matline"><span class="m">exp(u θ/2)</span>&nbsp;·&nbsp;<span class="m">generator u</span>&nbsp;·&nbsp;<span class="m">u² = −1</span></p><p class="matline"><span class="m">exp(â θ)</span>&nbsp;·&nbsp;<span class="m">generator â</span>&nbsp;·&nbsp;<span class="m">â³ = −â</span></p><p>All three say the same thing: <em>the exponential of the generator is a rotation, and the square of the generator folds back</em>. Collapsing the Rodrigues series into <span class="m">sin</span> and <span class="m">cos</span> is the same computation as splitting the series of <span class="m">e<sup>iθ</sup></span>. And the <span class="m">θ/2</span> in the quaternion is no accident: a quaternion acts from both sides, <span class="m">v ↦ q v q<sup>−1</sup></span>, so the angle is counted twice.</p><p><strong>And what 2D hides.</strong> Here every rotation commutes, so there is no sense in asking “about its own axis, or about the world’s?” — they are the same. In 3D <span class="m">R<sub>1</sub>R<sub>2</sub> ≠ R<sub>2</sub>R<sub>1</sub></span>, and the entire content of the body/world distinction comes from that one difference. That is the <span class="m">SO(3)</span> moon.</p><div class="bubble" id="so2IsoNote" role="dialog" aria-label="Checking the isomorphism" hidden><p>Multiply two complex numbers:</p><p class="matline"><span class="m">(a + bi)(c + di) = (ac − bd) + (ad + bc) i</span></p><p>Now the two matrices:</p><p class="matline"><span class="m">( a, −b ; b, a )( c, −d ; d, c ) = ( ac − bd, −(ad + bc) ; ad + bc, ac − bd )</span></p><p>which is exactly the matrix form of <span class="m">(ac − bd) + (ad + bc)i</span>. Addition works entrywise for the same reason, so the map preserves both operations.</p></div>'}
      ],
      ja: [
        {t:'円', b:'<p><span class="m">SO(2)</span> は平面の回転全体の集合で、演算は行列の積 — したがって<button class="termbtn" id="so2GroupInfo" type="button" aria-expanded="false" aria-controls="so2GroupNote">群</button>です。どの回転もただ一つの数、角 <span class="m">θ</span> で決まります。自由度は 1 で、これより少なくはできません。</p><p>話のすべてはこの一つの等式に入っています:</p><p class="matline"><span class="m">R(θ<sub>1</sub>) R(θ<sub>2</sub>) = R(θ<sub>1</sub> + θ<sub>2</sub>)</span></p><p>回転を合成することは角を足すことです。ここから二つのことがただちに従います。一つ: <span class="m">SO(2)</span> は<strong>可換</strong>である — 実数の足し算が可換だからで、これは<em>定理</em>であって約束ではありません。二つ: 掛け算が足し算に変わっている。これこそ <span class="m">exp</span> のすることで、次の駅の主題です。</p><p>では <span class="m">θ</span> はどんな空間に住んでいるのか。直線ではありません: <span class="m">θ</span> と <span class="m">θ + 2π</span> は<em>同じ回転</em>なので、パラメータ空間は一周して戻ります。</p><p class="matline"><span class="m">SO(2) ≅ S<sup>1</sup></span></p><p>これが順路で最初の曲がった空間であり、いちばん穏やかな種類です: 曲がってはいるが可換。シーンでは菫の印がまず <span class="m">θ<sub>1</sub></span>、次に <span class="m">θ<sub>2</sub></span> 回り、琥珀の印は逆順に回ります。同じ点に着きます。</p><div class="bubble" id="so2GroupNote" role="dialog" aria-label="群とは" hidden><p><em>群</em>とは、演算をもつ集合で、<strong>閉じている</strong>（二元の積もその集合に入る）・<strong>結合的</strong>・<strong>単位元</strong>がある・どの元にも<strong>逆元</strong>がある、を満たすものです。</p><p>回転はこれをすべて満たします: 回転の次に回転はやはり回転、「回さない」元があり、どの回転も元に戻せます。行列で書けば</p><p class="matline"><span class="m">R(θ) = ( cos θ, −sin θ ; sin θ, cos θ )</span></p><p>（行ごとに並べたもの）で、<span class="m">R<sup>⊤</sup>R = I</span> かつ <span class="m">det R = +1</span>。</p><p><strong>可換性は一覧に入っていません</strong> — これは偶然ではありません。<span class="m">SO(2)</span> ではただで手に入りますが、<span class="m">SO(3)</span> では手に入りません。</p></div>'},
        {t:'複利', b:'<p>なぜよりによって <span class="m">e<sup>iθ</sup></span> なのか。角 <span class="m">α</span> の回転を <span class="m">n</span> 個の等しい小さなステップに割り、それぞれを可能なかぎり粗く近似します: <span class="m">(1 + iα/n)</span> を掛けるのです。</p><p class="matline"><span class="m">(1 + i α/n)<sup>n</sup> → e<sup>iα</sup></span>&nbsp;&nbsp;<span class="m">(n → ∞)</span></p><p><span class="m">(1 + i dα)</span> を掛けるのはほとんど回転ですが、回転ではありません: 回しも<em>すれば</em>伸ばしもします。しかし二つの効果は同じ次数ではありません:</p><p class="matline"><span class="m">回転: dα</span>&nbsp;·&nbsp;<span class="m">伸び: √(1 + dα²) ≈ 1 + ½ dα²</span></p><p>一方は<button class="termbtn" id="so2OrderInfo" type="button" aria-expanded="false" aria-controls="so2OrderNote">一次、もう一方は二次</button>です。<span class="m">n</span> ステップ後、積み上がった回転は <span class="m">n · (α/n) = α</span> のまま、積み上がった長さの誤差は <span class="m">n · O(1/n²) = O(1/n) → 0</span>。<strong>だから極限が純粋な回転になるのです。</strong></p><p>シーンでは <span class="m">α = 2</span>、多角形の頂点一つ一つが一回の掛け算です。数字を見てください: <span class="m">n = 8</span> で角はすでに <span class="m">1.96</span>（誤差 2%）ですが、半径はまだ <span class="m">1.27</span> — 長さは角よりずっと遅く改善します。その差がまさに二つの次数の差です。<span class="m">n = 40</span> では半径 <span class="m">1.05</span>。</p><p>そして積が<em>合成</em>になるのは、2D では複素数の掛け算がそもそも回転の合成だからです。曲がった場合はこれを受け継ぎます: <span class="m">SO(3)</span> では同じ極限が行列指数関数を与えます。</p><div class="bubble" id="so2OrderNote" role="dialog" aria-label="二つの次数" hidden><p><span class="m">c = α/n</span> とおきます。一ステップを展開すると:</p><p class="matline"><span class="m">|1 + ic| = √(1 + c²) = 1 + ½c² + O(c⁴)</span></p><p class="matline"><span class="m">arg(1 + ic) = c − ⅓c³ + O(c⁵)</span></p><p>長さは <span class="m">c</span> の<strong>二次</strong>から、角は<strong>一次</strong>から動き出します。<span class="m">n</span> ステップ後:</p><p class="matline"><span class="m">|z<sub>n</sub>| = (1 + c²)<sup>n/2</sup> → e<sup>α²/2n</sup> → 1</span></p><p class="matline"><span class="m">arg z<sub>n</sub> = n·(c − ⅓c³ + …) = α − <span class="frac"><span>α³</span><span>3n²</span></span> + …</span></p><p>長さの誤差は <span class="m">O(1/n)</span>、角の誤差は <span class="m">O(1/n²)</span> — どちらも 0 に行きますが、速さが違います。シーンが見せているのはこれです。</p></div>'},
        {t:'三つの顔、一つの公式', b:'<p>2D の絵は比喩ではありません。文字どおり同じ代数です。写像</p><p class="matline"><span class="m">a + bi ⟼ ( a, −b ; b, a )</span></p><p>は<strong>環同型</strong> — 和を和に、積を積に移します — で、<span class="m">i ⟼ J</span>、<span class="m">J<sup>2</sup> = −I</span> です。<button class="termbtn" id="so2IsoInfo" type="button" aria-expanded="false" aria-controls="so2IsoNote">計算二行</button>で終わります。</p><p>シーンがそれを見せています: 行列の二本の列は <span class="m">(a, b)</span> と <span class="m">(−b, a)</span>。直交し、長さが等しく、剛体のように一緒に回ります — 第二列は第一列のちょうど <span class="m">i</span> 倍です。複素数の代数はこの行列代数に<em>似ている</em>のではなく、<em>それそのもの</em>です。</p><p>だからこそすべての主張が移ります。同じ模様が三つの符号化で:</p><p class="matline"><span class="m">e<sup>iθ</sup></span>&nbsp;·&nbsp;<span class="m">生成元 i</span>&nbsp;·&nbsp;<span class="m">i² = −1</span></p><p class="matline"><span class="m">exp(u θ/2)</span>&nbsp;·&nbsp;<span class="m">生成元 u</span>&nbsp;·&nbsp;<span class="m">u² = −1</span></p><p class="matline"><span class="m">exp(â θ)</span>&nbsp;·&nbsp;<span class="m">生成元 â</span>&nbsp;·&nbsp;<span class="m">â³ = −â</span></p><p>三つとも同じことを言っています: <em>生成元の指数が回転を与え、生成元の平方が折り返す</em>。Rodrigues の級数を <span class="m">sin</span> と <span class="m">cos</span> にたたむ計算は、<span class="m">e<sup>iθ</sup></span> の級数を分ける計算と同じものです。四元数の <span class="m">θ/2</span> も偶然ではありません: 四元数は両側から作用し（<span class="m">v ↦ q v q<sup>−1</sup></span>）、角が二度数えられるからです。</p><p><strong>そして 2D が隠していること。</strong>ここではどの回転も可換なので、「自分の軸まわりか、世界の軸まわりか」と問う意味がありません — 同じものだからです。3D では <span class="m">R<sub>1</sub>R<sub>2</sub> ≠ R<sub>2</sub>R<sub>1</sub></span> であり、body/world の区別の中身はまるごとこの一つの差から生まれます。それが <span class="m">SO(3)</span> の衛星です。</p><div class="bubble" id="so2IsoNote" role="dialog" aria-label="同型の確認" hidden><p>複素数を二つ掛けます:</p><p class="matline"><span class="m">(a + bi)(c + di) = (ac − bd) + (ad + bc) i</span></p><p>次に行列を二つ:</p><p class="matline"><span class="m">( a, −b ; b, a )( c, −d ; d, c ) = ( ac − bd, −(ad + bc) ; ad + bc, ac − bd )</span></p><p>これはちょうど <span class="m">(ac − bd) + (ad + bc)i</span> の行列形です。足し算も成分ごとに同じことが成り立つので、この写像は両方の演算を保ちます。</p></div>'}
      ]
    }
  };
})();
