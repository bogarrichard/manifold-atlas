'use strict';
/* Journey: LM · robust — the Optimization planet's last moon, after Gauss–Newton.

   Three stations, deliberately shallow (docs/project/journey-status.md): the Gauss–Newton
   step overreaching where the linearisation stops holding; the damped normal equation
   (H + λI)δ = −g and what λ actually interpolates between; and robust kernels, framed the
   way the vault frames them — not "less precise but sturdier" but a different noise model,
   hence a different logarithm, hence a different loss.

   One worked example carries stations 1 and 2: a saturating residual r(x) = tanh x at
   x₀ = 1.5, where r₀ = 0.9051, J = sech²(1.5) = 0.1807 and the undamped step is
   δ* = −r₀/J = −5.01. The model promises cost 0 at the landing point; the truth there is
   0.498, worse than the 0.410 we started from. Every one of those numbers is computed in
   the scene, not asserted.

   Station 3 fits both lines for real, every frame: the coral line is the least-squares fit
   over all points including the outlier, the green one the fit with the outlier dropped —
   the limit a redescending kernel approaches. Drag the outlier up and the coral line
   follows while the green one does not. Cards (hu/en/ja) in-file. Requires LIE.kit. */
window.LIE = window.LIE || {};
LIE.journeys = LIE.journeys || {};
LIE.journeys['optimization-lm'] = (function(){
  const K = LIE.kit;
  const { V3, ease, clamp, hexStr, fatArrow, setArrow, makeLabel, updateLabel } = K;

  const SP  = [V3(0,0,0), V3(44,5,-12), V3(88,-4,10)];
  const OFF = [V3(0,2.4,9.6), V3(0,2.4,9.6), V3(0,2.4,9.2)];

  // The saturating residual, and the point the cards quote.
  const rOf  = x => Math.tanh(x);
  const drOf = x => 1 - Math.tanh(x)*Math.tanh(x);          // sech²x
  const LOf  = x => 0.5*rOf(x)*rOf(x);
  const X0 = 1.5;

  // Station 2's damping sweep. δ(λ) = −J r₀ / (J² + λ) in one dimension.
  const LAMS = [0, 0.01, 0.03, 0.076, 0.2, 0.6, 2.0, 8.0];

  // Station 3's data: a clean line plus one gross outlier at x = 1.8.
  const DX = [-2.4,-1.8,-1.2,-0.6, 0, 0.6, 1.2, 1.8, 2.4];
  const DY = [-0.72,-0.50,-0.35,-0.16, 0.14, 0.28, 0.55, 0.70, 0.98];
  const OUT_I = 7, OUT_Y = 2.60;

  function lsFit(xs, ys){                                   // ordinary least squares
    const n = xs.length;
    let mx = 0, my = 0;
    for(let i=0;i<n;i++){ mx += xs[i]; my += ys[i]; }
    mx /= n; my /= n;
    let sxy = 0, sxx = 0;
    for(let i=0;i<n;i++){ sxy += (xs[i]-mx)*(ys[i]-my); sxx += (xs[i]-mx)*(xs[i]-mx); }
    const a = sxy/sxx;
    return { a, b: my - a*mx };
  }

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

    // the cost curve shared by stations 1 and 2
    const XS = 0.74, YS = 3.9, Y0 = -1.55, XMAX = 4.2;
    const px = x => x*XS, py = L => Y0 + L*YS;
    function costCurve(g){
      const pts = [];
      for(let i=0;i<=170;i++){ const x = -XMAX + 2*XMAX*i/170; pts.push(V3(px(x), py(LOf(x)), 0)); }
      line(g, pts, COL.amber, 0.95);
      line(g, [V3(px(-XMAX),Y0,0), V3(px(XMAX),Y0,0)], COL.grid1, 0.5);
      return pts;
    }

    const stations = [
      /* 0 · the overreach. The teal parabola is the Gauss–Newton model at x₀; its bottom
            sits at δ* = −5.01 with predicted cost zero. The coral marker is what the true
            cost actually is there — higher than where we started. */
      g=>{
        costCurve(g);
        const r0 = rOf(X0), J = drOf(X0), dStar = -r0/J;
        const land = X0 + dStar;

        const model = [];
        for(let i=0;i<=90;i++){
          const d = -5.8 + 7.0*i/90, v = r0 + J*d;
          model.push(V3(px(X0+d), py(0.5*v*v), 0));
        }
        line(g, model, COL.teal, 0.9);

        const at0 = dot(g, COL.coral, 0.11); at0.position.set(px(X0), py(LOf(X0)), 0);
        const promised = dot(g, COL.green, 0.10); promised.position.set(px(land), py(0), 0);
        const actual = dot(g, COL.coral, 0.12); actual.position.set(px(land), py(LOf(land)), 0);
        const gap = K.dashedLine(V3(px(land), py(0), 0), V3(px(land), py(LOf(land)), 0), COL.coral, 0.1);
        g.add(gap);
        const ball = dot(g, COL.teal, 0.115);

        const lbl = makeLabel('δ* = −5.01', HX.teal, 2.8); lbl.position.set(0, 2.95, 0); g.add(lbl);
        const lg = makeLabel('0.498', HX.coral, 1.9);            // beside the middle of the gap
        lg.position.set(px(land)+0.78, (py(0) + py(LOf(land)))/2, 0); g.add(lg);

        const T0=1.0, T1=2.0, T2=1.8, PER=T0+T1+T2;
        return {tick(t){
          const tc = t % PER;
          const u = tc < T0 ? 0 : tc < T0+T1 ? ease((tc-T0)/T1) : 1;
          const d = dStar*u, v = r0 + J*d;
          ball.position.set(px(X0+d), py(0.5*v*v), 0);
          const shown = u > 0.99;
          actual.visible = shown; gap.visible = shown; lg.material.opacity = shown ? 0.95 : 0;
        }};
      },

      /* 1 · damping. The green marker sits at x₀ + δ(λ) with δ(λ) = −J r₀/(J² + λ), stepped
            through a fixed ladder of λ so the readout is legible: λ = 0 is the Gauss–Newton
            disaster, λ ≈ 0.076 lands on the minimum, large λ barely moves at all. */
      g=>{
        costCurve(g);
        const r0 = rOf(X0), J = drOf(X0), Jr = J*r0, JJ = J*J;
        const at0 = dot(g, COL.coral, 0.11); at0.position.set(px(X0), py(LOf(X0)), 0);
        const minDot = dot(g, COL.violet, 0.09); minDot.position.set(px(0), py(0), 0);
        const land = dot(g, COL.green, 0.12);
        const step = fatArrow(COL.green, 0.042); g.add(step);
        const lbl = makeLabel('λ = 0', HX.green, 3.6); lbl.position.set(0, 2.95, 0); g.add(lbl);

        let cur = -1;
        return {tick(t){
          const k = Math.floor(t/1.35) % LAMS.length;
          if(k !== cur){
            cur = k;
            const lam = LAMS[k], d = -Jr/(JJ + lam);
            const x1 = clamp(X0 + d, -XMAX, XMAX);
            land.position.set(px(x1), py(LOf(x1)), 0);
            const from = V3(px(X0), py(LOf(X0)) + 0.42, 0);
            const len = px(x1) - from.x;
            // below ~an arrowhead's length setArrow leaves only the cone, which reads as a
            // floating triangle; at large λ the step is meant to look like nothing anyway
            setArrow(step, from, V3(len, 0, 0));
            step.visible = Math.abs(len) > 0.34;
            updateLabel(lbl, 'λ = ' + lam + '   δ = ' + d.toFixed(2), HX.green);
          }
        }};
      },

      /* 2 · one outlier, two fits. Both lines are least squares; the coral one sees all
            nine points and is recomputed every frame, the green one never sees the outlier.
            As the outlier rises, only one of them moves. */
      g=>{
        const SXP = 1.16, SYP = 1.05, YB = -0.55;
        const qx = x => x*SXP, qy = y => YB + y*SYP;
        line(g, [V3(qx(-3.0),YB,0), V3(qx(3.0),YB,0)], COL.grid1, 0.55);
        line(g, [V3(0,YB-0.6,0), V3(0,YB+3.4,0)], COL.grid2, 0.45);

        const pts = DX.map((x,i)=>{
          const d = dot(g, i===OUT_I ? COL.coral : COL.amber, i===OUT_I ? 0.135 : 0.095);
          d.position.set(qx(x), qy(DY[i]), 0); return d;
        });
        const lsLine  = line(g, [V3(0,0,0), V3(0,0,0)], COL.coral, 0.95);
        const robLine = line(g, [V3(0,0,0), V3(0,0,0)], COL.green, 0.95);

        // the green line never sees the outlier — computed once
        const inX = DX.filter((_,i)=>i!==OUT_I), inY = DY.filter((_,i)=>i!==OUT_I);
        const rob = lsFit(inX, inY);
        const ra = robLine.geometry.attributes.position;
        ra.setXYZ(0, qx(-3.0), qy(rob.a*(-3.0)+rob.b), 0);
        ra.setXYZ(1, qx( 3.0), qy(rob.a*( 3.0)+rob.b), 0);
        ra.needsUpdate = true;

        const lbl = makeLabel('ρ(r) = ½ r²', HX.coral, 3.0); lbl.position.set(0, 3.05, 0); g.add(lbl);
        const ys = DY.slice();

        return {tick(t){
          const u = 0.5*(1 - Math.cos(t*0.5));                 // outlier rises and falls
          ys[OUT_I] = DY[OUT_I] + (OUT_Y - DY[OUT_I])*u;
          pts[OUT_I].position.set(qx(DX[OUT_I]), qy(ys[OUT_I]), 0);
          const f = lsFit(DX, ys);
          const a = lsLine.geometry.attributes.position;
          a.setXYZ(0, qx(-3.0), qy(f.a*(-3.0)+f.b), 0);
          a.setXYZ(1, qx( 3.0), qy(f.a*( 3.0)+f.b), 0);
          a.needsUpdate = true;
        }};
      }
    ];

    function bindCard(i){
      wireBubble('lmStepInfo','lmStepNote');     // card 1 · why the step blows up
      wireBubble('lmLamInfo','lmLamNote');       // card 2 · why H + λI is invertible
      wireBubble('lmHuberInfo','lmHuberNote');   // card 3 · the Huber weight, and IRLS
    }

    return { stations, bindCard };
  }

  return {
    id: 'optimization-lm',
    tier: 'optimization',
    layout: { SP, OFF },
    threadKey: 'amber',
    // Curriculum position, as data rather than prose: `next` is the following moon in
    // hub.js's BRANCHES order (crossing into the next branch at a branch end), `handoffs`
    // are the topical pointers this journey's cards name, `requires` the hard
    // back-references its opening card makes. engine.js renders next+handoffs as links
    // on the last station; check.html verifies every id resolves and that the next-chain
    // still agrees with BRANCHES.
    seq: { next: 'so3-optimization', requires: ['optimization-gn'], handoffs: ['slam-factor-graph'] },
    build,
    cards: {
      hu: [
        {t:'Amikor a lépés túl merész', b:'<p>A Gauss–Newton lépése a <em>modell</em> parabolájának alja. De a modell csak lokálisan érvényes, és semmi nem garantálja, hogy a lépés az érvényességi körén belül marad.</p><p>Konkrét példa, ez a jelenet: <span class="m">r(x) = tanh x</span>, tehát <span class="m">L(x) = ½ tanh<sup>2</sup>x</span>. Ez egy <em>telítődő</em> reziduum — nagy <span class="m">x</span>-nél alig változik. A linearizáció viszont nem tud erről: azt hiszi, a reziduum ugyanazzal a meredekséggel csökken tovább.</p><p>Induljunk <span class="m">x<sub>0</sub> = 1.5</span>-ből. Ott <span class="m">r<sub>0</sub> = 0.9051</span> és <span class="m">J = sech<sup>2</sup>(1.5) = 0.1807</span>, tehát</p><p class="matline"><span class="m">δ* = −r<sub>0</sub> / J = −5.01</span></p><p>A modell azt <em>ígéri</em>, hogy odaérve a költség <strong>nulla</strong> lesz — a teál parabola tényleg ott metszi a tengelyt. A valóságban a költség ott <strong>0.498</strong>, magasabb, mint ahonnan indultunk (<span class="m">0.410</span>). <strong>A lépés rontott.</strong></p><p>És nem a Gauss–Newton hibás. A linearizáció hibája <span class="m">O(‖δ‖<sup>2</sup>)</span>, mi pedig épp most tettünk egy <em>öt egység</em> hosszú lépést. Sőt, a baj rendszerszerű: <button class="termbtn" id="lmStepInfo" type="button" aria-expanded="false" aria-controls="lmStepNote">ahol a <span class="m">J</span> kicsi, ott a <span class="m">−g/H</span> nagy</button> — vagyis pont ott lesz óriási a lépés, ahol a modellben a legkevésbé szabad bízni.</p><p>Kell tehát valami, ami visszafogja. Nem a lépés <em>irányát</em> — azzal nincs baj —, hanem a hosszát.</p><div class="bubble" id="lmStepNote" role="dialog" aria-label="Miert no meg a lepes" hidden><p>Ebben a példában a lépés zárt alakban is felírható:</p><p class="matline"><span class="m">δ*(x) = − <span class="frac"><span>tanh x</span><span>sech<sup>2</sup>x</span></span> = − tanh x · cosh<sup>2</sup>x = − sinh x cosh x = −½ sinh 2x</span></p><p>Vagyis a lépéshossz <strong>exponenciálisan</strong> nő <span class="m">x</span>-szel, miközben a valódi minimum végig a <span class="m">0</span>-ban van, tehát az odáig hátralévő út csak lineárisan nő. A kettő aránya minden határon túl nő.</p><p>Ez nem ennek a példának a különlegessége. Bármikor, amikor a reziduum telítődik — szögek, normalizált irányok, mélységek reciproka —, a <span class="m">J</span> kicsivé válik, és a nyers Gauss–Newton lépés elszáll.</p></div>'},
        {t:'A csillapítás: H + λI', b:'<p>A javítás egyetlen sor. A normálegyenletbe beírunk egy <span class="m">λ</span>-t:</p><p class="matline"><span class="m">(H + λI) δ = −g</span></p><p>Nézzük meg a két végét. <span class="m">λ → 0</span>: visszakapjuk pontosan a Gauss–Newtont, a parabola alját. <span class="m">λ → ∞</span>: a <span class="m">H</span> elhanyagolhatóvá válik mellette, és <span class="m">δ ≈ −g/λ</span> — vagyis egy nagyon kicsi lépés <strong>a gradiens irányába</strong>.</p><p>A <span class="m">λ</span> tehát a két módszer között hangol: a görbületet használó, merész Gauss–Newton és az óvatos, de megbízható gradiens-lépés között. Innen a név: <em>Levenberg–Marquardt</em>.</p><p>Egy dimenzióban ez a képlet, és ezt animálja a jelenet:</p><p class="matline"><span class="m">δ(λ) = − <span class="frac"><span>J r<sub>0</sub></span><span>J<sup>2</sup> + λ</span></span></span></p><p>Ugyanaz az <span class="m">x<sub>0</sub> = 1.5</span>. <span class="m">λ = 0</span>-nál <span class="m">δ = −5.01</span>, az előző állomás katasztrófája. <span class="m">λ ≈ 0.076</span>-nál <span class="m">δ = −1.51</span> — pontosan a minimumba. Nagy <span class="m">λ</span>-nál a lépés a nullához tart: nem lépünk sehova, de legalább nem is rontunk.</p><p><strong>Honnan tudjuk a jó <span class="m">λ</span>-t?</strong> Sehonnan — nem előre választjuk meg. A szokásos szabály: lépj, és nézd meg, <em>tényleg</em> csökkent-e a valódi költség. Ha igen: fogadd el a lépést és <strong>csökkentsd</strong> a <span class="m">λ</span>-t, mert a modell megbízhatónak bizonyult. Ha nem: vesd el a lépést, <strong>növeld</strong> a <span class="m">λ</span>-t, és próbáld újra. Ez a <em>trust region</em> gondolat — a <span class="m">λ</span> közvetve azt szabályozza, mekkora környezetben hisszük el a linearizációt.</p><p>Egy dolgot még ingyen kapunk: elég nagy <span class="m">λ</span>-nál a <button class="termbtn" id="lmLamInfo" type="button" aria-expanded="false" aria-controls="lmLamNote"><span class="m">H + λI</span> mindig invertálható</button>. Ez <em>tétel</em>. Hogy a <span class="m">λ</span>-t milyen ütemben növeljük és csökkentjük, az viszont <em>heurisztika</em> — érdemes tudni, melyik melyik.</p><div class="bubble" id="lmLamNote" role="dialog" aria-label="Miert invertalhato" hidden><p>Az előző holdról: <span class="m">H = J<sup>⊤</sup>J</span> pozitív szemidefinit, tehát minden sajátértéke <span class="m">μ<sub>i</sub> ≥ 0</span>.</p><p>Egy <span class="m">λI</span> hozzáadása minden sajátértéket pontosan <span class="m">λ</span>-val told el:</p><p class="matline"><span class="m">μ<sub>i</sub>(H + λI) = μ<sub>i</sub>(H) + λ ≥ λ > 0</span></p><p>tehát <span class="m">H + λI</span> pozitív <em>definit</em>, és így invertálható — akkor is, ha <span class="m">H</span> szinguláris volt.</p><p>Ez az oka, hogy az LM olyankor is ad lépést, amikor a nyers Gauss–Newton egyszerűen elhasal. <strong>De vigyázat:</strong> ha <span class="m">H</span> azért volt szinguláris, mert <em>információ hiányzik</em> (gauge-szabadság), akkor a <span class="m">λ</span> nem pótolja az információt — csak választ egy lépést a sok egyformán jó közül. A tünetet kezeli, nem az okot.</p></div>'},
        {t:'Robusztus magok', b:'<p>Az előző hold levezetése egyetlen feltevésen állt: <strong>a zaj Gauss.</strong> Ideje megkérdezni, mi van, ha nem az.</p><p>Egy rossz adattársítás, egy félreillesztett feature nem „nagy Gauss-zaj”. Más eloszlásból jön, és a gyakorlatban nem kivétel: okklúzió, ismétlődő textúra, mozgó objektum mellett az outlier <em>garantáltan</em> jelen van.</p><p>A négyzetösszeg pedig kifejezetten rosszul viseli. A <span class="m">ρ(r) = ½r<sup>2</sup></span> veszteség <strong>négyzetesen</strong> nő, tehát egy tízszer akkora reziduum <em>százszoros</em> súllyal esik latba. A jelenetben ez látszik: ahogy az egyetlen korall pont felfelé mászik, a korall egyenes — a mind a kilenc pontra illesztett legkisebb négyzetes megoldás — engedelmesen utána fordul. A zöld egyenes ugyanaz az illesztés, csak az outlier nélkül; meg sem rezdül.</p><p>A javítás nem hack, hanem <strong>másik zajmodell</strong>. Ha a zaj farkai nehezebbek, a negatív logaritmusa nem parabola. A Huber-mag:</p><p class="matline"><span class="m">ρ(r) = ½r<sup>2</sup></span>&nbsp;&nbsp;ha&nbsp;&nbsp;<span class="m">|r| ≤ k</span></p><p class="matline"><span class="m">ρ(r) = k(|r| − ½k)</span>&nbsp;&nbsp;egyébként</p><p>Kicsiben kvadratikus — ott a Gauss-feltevés jó, és semmit nem akarunk elrontani. Nagyban <strong>lineáris</strong>, így egy outlier <button class="termbtn" id="lmHuberInfo" type="button" aria-expanded="false" aria-controls="lmHuberNote">hatása korlátos marad</button>.</p><p>És itt egy szóhasználati csapda, amit érdemes elkerülni. Ez <em>nem</em> az a helyzet, hogy „pontosságot áldozunk robusztusságért”. A Gauss-feltevés a farkakban egyszerűen <strong>nem áll</strong>, tehát ott a négyzetösszeg nem kevésbé pontos, hanem <em>elvileg rossz</em> célfüggvény. A robusztus mag a helyes modellt használja.</p><p><strong>Ahol ez a hold megáll.</strong> Hogy melyik magot, milyen <span class="m">k</span>-val — az kalibráció, nem elmélet. A folytatás más irányba megy: eddig a reziduumok egy névtelen halmaz voltak. A következő kérdés az, hogy <em>melyik mérés melyik változóhoz tartozik</em> — ettől kap a feladat struktúrát, és ettől lesz egyáltalán megoldható nagyban. Ez a <em>factor graph</em> hold.</p><div class="bubble" id="lmHuberNote" role="dialog" aria-label="A Huber-suly es az IRLS" hidden><p>A gyakorlatban a robusztus magot nem külön solverrel oldjuk meg, hanem <strong>súlyozásként</strong> (IRLS — iteratively reweighted least squares). A súly:</p><p class="matline"><span class="m">w(r) = ρ′(r) / r</span></p><p>Huberre ez</p><p class="matline"><span class="m">w(r) = 1</span>&nbsp;&nbsp;ha&nbsp;&nbsp;<span class="m">|r| ≤ k</span></p><p class="matline"><span class="m">w(r) = k/|r|</span>&nbsp;&nbsp;egyébként</p><p>vagyis a nagy reziduumokat pontosan annyival osztjuk le, hogy a hatásuk <span class="m">k</span>-nál ne nőjön tovább. A reziduumot és a Jacobiant is <span class="m">√w</span>-vel szorozva a Gauss–Newton gépezet <em>változatlanul</em> működik tovább — ezért olcsó a robusztus mag.</p><p>A <span class="m">k</span> jelentése: hol ér véget a „még hihető” zaj. Tipikusan a zaj szórásának egy kis többszöröse, tehát a fehérítés után (lásd az előző holdat) egy dimenziótlan szám.</p><p>A Cauchy-mag ennél is tovább megy: ott a súly <span class="m">1/(1 + (r/k)<sup>2</sup>)</span>, ami nagy <span class="m">r</span>-nél nullához tart — az outlier hatása nemcsak korlátos, hanem <em>eltűnik</em>. Ez a <em>redescending</em> viselkedés, és a jelenet zöld egyenese ennek a határesete.</p></div>'}
      ],
      en: [
        {t:'When the Step Is Too Bold', b:'<p>The Gauss–Newton step is the bottom of the <em>model’s</em> parabola. But the model is only locally valid, and nothing guarantees the step stays inside the region where it holds.</p><p>A concrete example, the one in the scene: <span class="m">r(x) = tanh x</span>, so <span class="m">L(x) = ½ tanh<sup>2</sup>x</span>. This is a <em>saturating</em> residual — at large <span class="m">x</span> it barely changes. The linearisation knows nothing of that: it believes the residual keeps falling at the same slope.</p><p>Start at <span class="m">x<sub>0</sub> = 1.5</span>. There <span class="m">r<sub>0</sub> = 0.9051</span> and <span class="m">J = sech<sup>2</sup>(1.5) = 0.1807</span>, so</p><p class="matline"><span class="m">δ* = −r<sub>0</sub> / J = −5.01</span></p><p>The model <em>promises</em> that on arrival the cost will be <strong>zero</strong> — the teal parabola really does meet the axis there. In truth the cost there is <strong>0.498</strong>, higher than where we started (<span class="m">0.410</span>). <strong>The step made things worse.</strong></p><p>And Gauss–Newton is not at fault. The linearisation error is <span class="m">O(‖δ‖<sup>2</sup>)</span>, and we have just taken a step <em>five units</em> long. Worse, the failure is systematic: <button class="termbtn" id="lmStepInfo" type="button" aria-expanded="false" aria-controls="lmStepNote">where <span class="m">J</span> is small, <span class="m">−g/H</span> is large</button> — the step grows huge exactly where the model deserves least trust.</p><p>So we need something to hold it back. Not the <em>direction</em> of the step — that is fine — but its length.</p><div class="bubble" id="lmStepNote" role="dialog" aria-label="Why the step blows up" hidden><p>In this example the step has a closed form:</p><p class="matline"><span class="m">δ*(x) = − <span class="frac"><span>tanh x</span><span>sech<sup>2</sup>x</span></span> = − tanh x · cosh<sup>2</sup>x = − sinh x cosh x = −½ sinh 2x</span></p><p>So the step length grows <strong>exponentially</strong> with <span class="m">x</span>, while the true minimum stays at <span class="m">0</span> and the distance still to travel grows only linearly. Their ratio grows without bound.</p><p>This is not a peculiarity of the example. Whenever a residual saturates — angles, normalised directions, inverse depth — <span class="m">J</span> becomes small and the raw Gauss–Newton step flies off.</p></div>'},
        {t:'Damping: H + λI', b:'<p>The fix is a single line. Put a <span class="m">λ</span> into the normal equation:</p><p class="matline"><span class="m">(H + λI) δ = −g</span></p><p>Look at the two ends. <span class="m">λ → 0</span>: exactly Gauss–Newton again, the bottom of the parabola. <span class="m">λ → ∞</span>: <span class="m">H</span> becomes negligible beside it and <span class="m">δ ≈ −g/λ</span> — a very small step <strong>along the gradient</strong>.</p><p>So <span class="m">λ</span> tunes between the two methods: the bold, curvature-using Gauss–Newton and the cautious but dependable gradient step. Hence the name: <em>Levenberg–Marquardt</em>.</p><p>In one dimension it is this formula, and it is what the scene animates:</p><p class="matline"><span class="m">δ(λ) = − <span class="frac"><span>J r<sub>0</sub></span><span>J<sup>2</sup> + λ</span></span></span></p><p>Same <span class="m">x<sub>0</sub> = 1.5</span>. At <span class="m">λ = 0</span>, <span class="m">δ = −5.01</span>: the previous station’s disaster. At <span class="m">λ ≈ 0.076</span>, <span class="m">δ = −1.51</span> — exactly onto the minimum. At large <span class="m">λ</span> the step tends to zero: we go nowhere, but at least we do no harm.</p><p><strong>How do we know a good <span class="m">λ</span>?</strong> We do not — it is not chosen in advance. The usual rule: take the step, and check whether the <em>true</em> cost actually went down. If it did: accept the step and <strong>decrease</strong> <span class="m">λ</span>, because the model has proved trustworthy. If it did not: reject the step, <strong>increase</strong> <span class="m">λ</span>, and try again. That is the <em>trust region</em> idea — <span class="m">λ</span> indirectly controls how large a neighbourhood we believe the linearisation in.</p><p>One thing comes free: for large enough <span class="m">λ</span>, <button class="termbtn" id="lmLamInfo" type="button" aria-expanded="false" aria-controls="lmLamNote"><span class="m">H + λI</span> is always invertible</button>. That is a <em>theorem</em>. The schedule by which we raise and lower <span class="m">λ</span> is a <em>heuristic</em> — worth knowing which is which.</p><div class="bubble" id="lmLamNote" role="dialog" aria-label="Why it is invertible" hidden><p>From the previous moon: <span class="m">H = J<sup>⊤</sup>J</span> is positive semidefinite, so all its eigenvalues satisfy <span class="m">μ<sub>i</sub> ≥ 0</span>.</p><p>Adding <span class="m">λI</span> shifts every eigenvalue by exactly <span class="m">λ</span>:</p><p class="matline"><span class="m">μ<sub>i</sub>(H + λI) = μ<sub>i</sub>(H) + λ ≥ λ > 0</span></p><p>so <span class="m">H + λI</span> is positive <em>definite</em>, hence invertible — even where <span class="m">H</span> was singular.</p><p>That is why LM still produces a step where raw Gauss–Newton simply fails. <strong>But be careful:</strong> if <span class="m">H</span> was singular because <em>information is missing</em> (gauge freedom), then <span class="m">λ</span> does not supply the information — it merely picks one step among many equally good ones. It treats the symptom, not the cause.</p></div>'},
        {t:'Robust Kernels', b:'<p>The previous moon’s derivation rested on one assumption: <strong>the noise is Gaussian.</strong> Time to ask what happens when it is not.</p><p>A wrong data association, a mismatched feature, is not “large Gaussian noise”. It comes from a different distribution, and in practice it is not an exception: with occlusion, repeated texture, or a moving object, outliers are <em>guaranteed</em>.</p><p>And the sum of squares handles them particularly badly. The loss <span class="m">ρ(r) = ½r<sup>2</sup></span> grows <strong>quadratically</strong>, so a residual ten times larger counts <em>a hundred times</em> as much. The scene shows it: as the single coral point climbs, the coral line — least squares over all nine points — obediently follows. The green line is the same fit without the outlier, and it does not stir.</p><p>The fix is not a hack but a <strong>different noise model</strong>. If the noise has heavier tails, its negative logarithm is not a parabola. The Huber kernel:</p><p class="matline"><span class="m">ρ(r) = ½r<sup>2</sup></span>&nbsp;&nbsp;if&nbsp;&nbsp;<span class="m">|r| ≤ k</span></p><p class="matline"><span class="m">ρ(r) = k(|r| − ½k)</span>&nbsp;&nbsp;otherwise</p><p>Quadratic in the small — where the Gaussian assumption is good and we want to break nothing. <strong>Linear</strong> in the large, so an outlier’s <button class="termbtn" id="lmHuberInfo" type="button" aria-expanded="false" aria-controls="lmHuberNote">influence stays bounded</button>.</p><p>And here is a wording trap worth avoiding. This is <em>not</em> a case of “trading accuracy for robustness”. In the tails the Gaussian assumption simply <strong>does not hold</strong>, so there the sum of squares is not less accurate but <em>the wrong objective</em>. The robust kernel uses the correct model.</p><p><strong>Where this moon stops.</strong> Which kernel, with what <span class="m">k</span> — that is calibration, not theory. The continuation goes elsewhere: so far the residuals have been an anonymous heap. The next question is <em>which measurement belongs to which variable</em> — that is what gives the problem structure, and what makes it solvable at scale at all. That is the <em>factor graph</em> moon.</p><div class="bubble" id="lmHuberNote" role="dialog" aria-label="The Huber weight and IRLS" hidden><p>In practice a robust kernel is not solved with a separate solver but applied as a <strong>weight</strong> (IRLS — iteratively reweighted least squares). The weight is</p><p class="matline"><span class="m">w(r) = ρ′(r) / r</span></p><p>which for Huber is</p><p class="matline"><span class="m">w(r) = 1</span>&nbsp;&nbsp;if&nbsp;&nbsp;<span class="m">|r| ≤ k</span></p><p class="matline"><span class="m">w(r) = k/|r|</span>&nbsp;&nbsp;otherwise</p><p>i.e. large residuals are divided down by exactly enough that their influence stops growing past <span class="m">k</span>. Multiplying both the residual and the Jacobian by <span class="m">√w</span> leaves the Gauss–Newton machinery <em>unchanged</em> — which is why robust kernels are cheap.</p><p>What <span class="m">k</span> means: where “still believable” noise ends. Typically a small multiple of the noise standard deviation, so after whitening (see the previous moon) a dimensionless number.</p><p>The Cauchy kernel goes further: its weight is <span class="m">1/(1 + (r/k)<sup>2</sup>)</span>, which tends to zero for large <span class="m">r</span> — an outlier’s influence is not merely bounded but <em>vanishes</em>. That is <em>redescending</em> behaviour, and the green line in the scene is its limiting case.</p></div>'}
      ],
      ja: [
        {t:'一歩が大きすぎるとき', b:'<p>ガウス・ニュートン法の一歩は、<em>モデル</em>の放物線の底です。ところがモデルは局所的にしか正しくありません。その一歩がモデルの通用する範囲に収まる保証は、どこにもないのです。</p><p>シーンにある具体例で見てみましょう。<span class="m">r(x) = tanh x</span>、したがって <span class="m">L(x) = ½ tanh<sup>2</sup>x</span> です。これは<em>飽和する</em>残差で、<span class="m">x</span> が大きいところではほとんど変化しません。しかし線形化はそれを知りません。残差が同じ傾きのまま下がり続けると信じています。</p><p><span class="m">x<sub>0</sub> = 1.5</span> から出発します。そこでは <span class="m">r<sub>0</sub> = 0.9051</span>、<span class="m">J = sech<sup>2</sup>(1.5) = 0.1807</span> なので、一歩はこうなります。</p><p class="matline"><span class="m">δ* = −r<sub>0</sub> / J = −5.01</span></p><p>モデルは、そこに着けばコストが<strong>ゼロ</strong>になると<em>約束</em>します。青緑の放物線は、実際にそこで軸と交わっています。ところが本当のコストは <strong>0.498</strong>、出発点の <span class="m">0.410</span> より高いのです。<strong>この一歩は事態を悪くしました。</strong></p><p>とはいえ、ガウス・ニュートン法が悪いわけではありません。線形化の誤差は <span class="m">O(‖δ‖<sup>2</sup>)</span> であり、いま踏み出したのは<em>5 単位</em>もの長さでした。しかもこの失敗のしかたには規則性があります。<button class="termbtn" id="lmStepInfo" type="button" aria-expanded="false" aria-controls="lmStepNote"><span class="m">J</span> が小さいところでは <span class="m">−g/H</span> が大きくなる</button>ので、モデルがいちばん当てにならない場所で、一歩がいちばん巨大になるのです。</p><p>ですから、何か抑える仕掛けが要ります。抑えるのは一歩の<em>向き</em>ではありません。そちらは問題ないので、抑えるのは長さです。</p><div class="bubble" id="lmStepNote" role="dialog" aria-label="なぜ一歩が発散するのか" hidden><p>この例では、一歩の大きさを閉じた形で書けます。</p><p class="matline"><span class="m">δ*(x) = − <span class="frac"><span>tanh x</span><span>sech<sup>2</sup>x</span></span> = − tanh x · cosh<sup>2</sup>x = − sinh x cosh x = −½ sinh 2x</span></p><p>つまり一歩の長さは <span class="m">x</span> について<strong>指数的に</strong>増えます。ところが真の最小点は <span class="m">0</span> のままで、残りの道のりは線形にしか増えません。その比は、いくらでも大きくなります。</p><p>これはこの例に限った話ではありません。残差が飽和する場所ならどこでも、たとえば角度、正規化された方向、逆深度などでは、<span class="m">J</span> が小さくなり、素のガウス・ニュートン法の一歩は飛んでいってしまいます。</p></div>'},
        {t:'減衰：H + λI', b:'<p>直し方は一行です。正規方程式に <span class="m">λ</span> を入れます。</p><p class="matline"><span class="m">(H + λI) δ = −g</span></p><p>両端を見てみましょう。<span class="m">λ → 0</span> ではガウス・ニュートン法そのもの、つまり放物線の底に戻ります。<span class="m">λ → ∞</span> では <span class="m">H</span> が無視できるほど小さくなり、<span class="m">δ ≈ −g/λ</span>、すなわち<strong>勾配方向</strong>のごく小さな一歩になります。</p><p>つまり <span class="m">λ</span> は、二つの手法のあいだを連続的につなぐつまみです。曲率を使う大胆なガウス・ニュートン法と、慎重だが確実な勾配ステップ。その両端をつなぐわけです。これが<em>レーベンバーグ・マルカート法</em>（Levenberg–Marquardt、略して LM 法）という名前の由来です。</p><p>一次元では次の式になり、シーンが動かしているのもこれです。</p><p class="matline"><span class="m">δ(λ) = − <span class="frac"><span>J r<sub>0</sub></span><span>J<sup>2</sup> + λ</span></span></span></p><p>出発点は同じ <span class="m">x<sub>0</sub> = 1.5</span> です。<span class="m">λ = 0</span> では <span class="m">δ = −5.01</span> で、前のステーションの失敗そのもの。<span class="m">λ ≈ 0.076</span> では <span class="m">δ = −1.51</span> となり、ちょうど最小点に届きます。<span class="m">λ</span> をさらに大きくすると一歩はゼロに近づきます。どこへも進みませんが、少なくとも悪くもなりません。</p><p><strong>では、良い <span class="m">λ</span> はどうすれば分かるのでしょうか。</strong>分かりません。そもそも事前に選ぶものではないのです。ふつうの規則はこうです。一歩を取ってみて、<em>本当の</em>コストが下がったかどうかを確かめる。下がったなら受け入れて <span class="m">λ</span> を<strong>下げる</strong>。モデルは信頼できると示されたからです。下がらなければその一歩を捨て、<span class="m">λ</span> を<strong>上げて</strong>やり直す。これが<em>信頼領域</em>の考え方で、<span class="m">λ</span> は「線形化をどれくらい広い近傍まで信じるか」を間接的に決めています。</p><p>ひとつ、何もしなくても保証されることがあります。<span class="m">λ</span> が十分大きければ <button class="termbtn" id="lmLamInfo" type="button" aria-expanded="false" aria-controls="lmLamNote"><span class="m">H + λI</span> はつねに可逆</button>になるのです。これは<em>定理</em>です。一方、<span class="m">λ</span> を上げ下げする段取りのほうは<em>ヒューリスティック</em>です。どちらがどちらなのかは、知っておく価値があります。</p><div class="bubble" id="lmLamNote" role="dialog" aria-label="なぜ可逆になるのか" hidden><p>前の衛星で見たとおり、<span class="m">H = J<sup>⊤</sup>J</span> は半正定値なので、固有値はすべて <span class="m">μ<sub>i</sub> ≥ 0</span> です。</p><p><span class="m">λI</span> を足すと、どの固有値もちょうど <span class="m">λ</span> だけ持ち上がります。</p><p class="matline"><span class="m">μ<sub>i</sub>(H + λI) = μ<sub>i</sub>(H) + λ ≥ λ > 0</span></p><p>よって <span class="m">H + λI</span> は正定値、したがって可逆です。<span class="m">H</span> のほうが特異であっても構いません。</p><p>素のガウス・ニュートン法が失敗する場面でも LM 法が一歩を出せるのは、このためです。<strong>ただし注意してください。</strong><span class="m">H</span> が特異だった理由が<em>情報の欠如</em>（ゲージ自由度）なら、<span class="m">λ</span> は情報を補ってはくれません。同じくらい良い多数の一歩から、一つを選んでいるだけです。原因ではなく症状を扱っている、ということです。</p></div>'},
        {t:'ロバストカーネル', b:'<p>前の衛星の導出は、ただ一つの仮定に乗っていました。<strong>雑音はガウスである</strong>、という仮定です。そうでない場合を考える頃合いです。</p><p>誤った対応付けや取り違えた特徴点は、「大きなガウス雑音」ではありません。まったく別の分布から来ています。しかも実務では例外でもありません。遮蔽、繰り返しテクスチャ、動く物体があれば、外れ値は<em>確実に</em>現れます。</p><p>そして二乗和は、これをとりわけ苦手とします。損失 <span class="m">ρ(r) = ½r<sup>2</sup></span> は<strong>二次で</strong>増えるので、10 倍の残差は<em>100 倍</em>効いてしまうのです。シーンがそれを見せています。たった一つの珊瑚色の点が上へ登るにつれ、九点すべてに対する最小二乗解である珊瑚色の直線が、素直に引きずられていきます。緑の直線は外れ値を除いた同じ当てはめで、こちらはびくともしません。</p><p>直し方は小細工ではなく、<strong>別の雑音モデルを使う</strong>ことです。裾の重い雑音なら、その負の対数は放物線になりません。たとえばヒューバー（Huber）のカーネルはこうです。</p><p class="matline"><span class="m">ρ(r) = ½r<sup>2</sup></span>&nbsp;&nbsp;（<span class="m">|r| ≤ k</span> のとき）</p><p class="matline"><span class="m">ρ(r) = k(|r| − ½k)</span>&nbsp;&nbsp;（それ以外）</p><p>小さい範囲では二次のままです。ガウス仮定が妥当な領域なので、何も壊したくないからです。大きい範囲では<strong>線形</strong>になるので、外れ値の<button class="termbtn" id="lmHuberInfo" type="button" aria-expanded="false" aria-controls="lmHuberNote">影響は有界に留まります</button>。</p><p>ここで、避けたい言い回しの罠があります。これは<em>「精度をロバスト性と引き換えにする」</em>状況では<strong>ありません</strong>。裾ではガウス仮定がそもそも<strong>成り立っていない</strong>ので、そこでの二乗和は精度が落ちるのではなく、<em>目的関数として誤っている</em>のです。ロバストカーネルのほうが、正しいモデルを使っています。</p><p><strong>この衛星が止まるところ。</strong>どのカーネルを、どの <span class="m">k</span> で使うか。それは較正であって理論ではありません。話はここから別の方向へ進みます。ここまで残差は、名前のないひとかたまりでした。次の問いは<em>どの観測がどの変数に属するのか</em>です。それが問題に構造を与え、大規模でも解けるようにしてくれます。それが<em>因子グラフ</em>の衛星です。</p><div class="bubble" id="lmHuberNote" role="dialog" aria-label="ヒューバーの重みと IRLS" hidden><p>実務では、ロバストカーネルを別のソルバで解いたりはしません。<strong>重み</strong>として適用します。反復再重み付け最小二乗、いわゆる IRLS です。重みはこう定めます。</p><p class="matline"><span class="m">w(r) = ρ′(r) / r</span></p><p>ヒューバーのカーネルなら、次のようになります。</p><p class="matline"><span class="m">w(r) = 1</span>&nbsp;&nbsp;（<span class="m">|r| ≤ k</span> のとき）</p><p class="matline"><span class="m">w(r) = k/|r|</span>&nbsp;&nbsp;（それ以外）</p><p>つまり大きな残差を、影響が <span class="m">k</span> を超えて増えなくなる分だけ割り引きます。残差とヤコビ行列の両方に <span class="m">√w</span> を掛ければ、ガウス・ニュートン法の機構は<em>そのまま</em>使えます。ロバストカーネルが安く済むのは、このためです。</p><p><span class="m">k</span> は「まだ信じられる雑音」の終わるところを表します。ふつうは雑音の標準偏差の小さな倍数で、白色化のあと（前の衛星を参照）は無次元の数になります。</p><p>コーシー（Cauchy）のカーネルはさらに進みます。重みが <span class="m">1/(1 + (r/k)<sup>2</sup>)</span> なので、大きな <span class="m">r</span> では重みがゼロに向かいます。外れ値の影響は有界どころか<em>消えて</em>しまうのです。これが <em>redescending</em>、つまり再降下型と呼ばれる振る舞いで、シーンの緑の直線はその極限にあたります。</p></div>'}
      ]
    }
  };
})();
