'use strict';
/* Journey: factor graphs — the SLAM planet's second moon, after Riemannian GD.

   Three stations, deliberately shallow (docs/project/journey-status.md): the bipartite
   graph of variables and factors; the graph as a picture of the MAP sum rather than a
   notation laid over it (with the prior as the unary factor that fixes the gauge); and
   sparsity, drawn as the block pattern of J.

   The same graph carries all three stations — 4 poses, 3 landmarks, 10 factors (3 odometry,
   6 observations, 1 prior) — and station 3's matrix is generated FROM that graph, not drawn
   by hand: a cell is filled exactly when the factor on that row touches the variable on
   that column. So the claim "at most two blocks per row" is something the scene computes.

   Backing notes: docs/slam/factor-graph.md, docs/slam/jacobian-structure.md,
   docs/geometry/gauge-freedom.md. Cards (hu/en/ja) in-file. Requires LIE.kit. */
window.LIE = window.LIE || {};
LIE.journeys = LIE.journeys || {};
LIE.journeys['slam-factor-graph'] = (function(){
  const K = LIE.kit;
  const { V3, ease, clamp, hexStr, makeLabel } = K;

  const SP  = [V3(0,0,0), V3(44,5,-12), V3(88,-4,10)];
  const OFF = [V3(0,2.0,9.4), V3(0,2.0,9.4), V3(0,2.0,10.6)];

  // The one graph the whole journey uses. Variables first, then the factors over them.
  const POSES = [[-3.0,-1.25], [-1.0,-1.25], [1.0,-1.25], [3.0,-1.25]];
  const LANDS = [[-2.0, 1.55], [0.0, 1.55], [2.0, 1.55]];
  const NV = POSES.length + LANDS.length;                 // 7 variable columns
  const vPos = i => i < POSES.length ? POSES[i] : LANDS[i - POSES.length];
  // each factor lists the variable indices it touches (poses 0..3, landmarks 4..6)
  const FACTORS = [
    {v:[0],   kind:'prior'},
    {v:[0,1], kind:'odom'}, {v:[1,2], kind:'odom'}, {v:[2,3], kind:'odom'},
    {v:[0,4], kind:'obs'},  {v:[1,4], kind:'obs'},  {v:[1,5], kind:'obs'},
    {v:[2,5], kind:'obs'},  {v:[2,6], kind:'obs'},  {v:[3,6], kind:'obs'},
  ];

  function build(C, PAL){
    const COL = PAL || K.palette('dark');
    const HX = { teal:hexStr(COL.teal), coral:hexStr(COL.coral), violet:hexStr(COL.violet),
                 amber:hexStr(COL.amber), green:hexStr(COL.green), ink:hexStr(COL.ink) };

    function line(g, pts, color, op){
      const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({color, transparent:true, opacity:op===undefined?0.9:op}));
      g.add(l); return l;
    }
    function sphere(g, color, r){
      const d = new THREE.Mesh(new THREE.SphereGeometry(r||0.16,16,12),
        new THREE.MeshBasicMaterial({color, transparent:true, opacity:0.95}));
      g.add(d); return d;
    }
    // factor nodes are squares, variables are circles — the standard notation
    function square(g, color, s, op){
      const h = s/2;
      const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(
        [V3(-h,-h,0), V3(h,-h,0), V3(h,h,0), V3(-h,h,0), V3(-h,-h,0)]),
        new THREE.LineBasicMaterial({color, transparent:true, opacity:op===undefined?0.95:op}));
      g.add(l); return l;
    }
    function cell(g, color, s, op){
      const m = new THREE.Mesh(new THREE.PlaneGeometry(s,s),
        new THREE.MeshBasicMaterial({color, transparent:true, opacity:op}));
      g.add(m); return m;
    }

    /* Build the graph into a group, at a given scale. Returns everything a station might
       want to light up: the variable spheres, the factor squares, and the edges grouped
       by the factor that owns them. */
    function graph(parent, scale, ox, oy){
      const G = new THREE.Group(); G.position.set(ox||0, oy||0, 0); G.scale.setScalar(scale||1);
      parent.add(G);
      const vars = [], facts = [], edges = [];
      for(let i=0;i<NV;i++){
        const p = vPos(i);
        const s = sphere(G, i < POSES.length ? COL.violet : COL.teal, 0.17);
        s.position.set(p[0], p[1], 0);
        vars.push(s);
      }
      FACTORS.forEach(f=>{
        // the factor node sits between the variables it touches; a unary one hangs below
        let fx, fy;
        if(f.v.length === 1){ fx = vPos(f.v[0])[0]; fy = vPos(f.v[0])[1] - 1.15; }
        else { fx = (vPos(f.v[0])[0] + vPos(f.v[1])[0])/2; fy = (vPos(f.v[0])[1] + vPos(f.v[1])[1])/2; }
        const col = f.kind === 'prior' ? COL.green : COL.amber;
        const sq = square(G, col, 0.30);
        sq.position.set(fx, fy, 0);
        const own = f.v.map(vi=>{
          const p = vPos(vi);
          return line(G, [V3(fx,fy,0), V3(p[0],p[1],0)], col, 0.4);
        });
        facts.push(sq); edges.push(own);
      });
      return { G, vars, facts, edges };
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
      /* 0 · the bipartite graph itself. Circles are what we estimate, squares are what we
            know; each square pulses in turn, checking the variables it is tied to. */
      g=>{
        const gr = graph(g, 1.0, 0, -0.1);
        const lbl = makeLabel('x · l · factor', HX.ink, 3.4); lbl.position.set(0, 3.15, 0); g.add(lbl);
        return {tick(t){
          gr.facts.forEach((sq,k)=>{
            const ph = (t*0.8 - k*0.22) % (FACTORS.length*0.22);
            const w = Math.max(0, 1 - Math.abs(ph)/0.5);
            sq.material.opacity = 0.55 + 0.45*w;
            gr.edges[k].forEach(e=>{ e.material.opacity = 0.28 + 0.55*w; });
          });
        }};
      },

      /* 1 · one factor at a time: the highlighted square and its edges are one term of the
            sum, and the variables it touches are what that term depends on. The prior comes
            last and stays green — one edge, one variable, and the gauge is gone. */
      g=>{
        const gr = graph(g, 1.0, 0, -0.1);
        const lbl = makeLabel('Σ ½ r ᵀ Σ^{−1} r', HX.amber, 4.0); lbl.position.set(0, 3.15, 0); g.add(lbl);
        const order = [1,4,5,2,6,7,3,8,9,0];              // odometry/observations first, prior last
        let cur = -1;
        return {tick(t){
          const k = Math.floor(t/1.1) % order.length;
          if(k !== cur){
            cur = k;
            const on = order[k];
            gr.facts.forEach((sq,j)=>{ sq.material.opacity = j===on ? 1.0 : 0.16; });
            gr.edges.forEach((es,j)=>es.forEach(e=>{ e.material.opacity = j===on ? 0.95 : 0.08; }));
            const touched = FACTORS[on].v;
            gr.vars.forEach((s,j)=>{ s.material.opacity = touched.indexOf(j) >= 0 ? 1.0 : 0.22; });
          }
        }};
      },

      /* 2 · the same graph, and the block pattern of J generated from it. Rows are factors,
            columns are variables; a cell is filled exactly when that factor touches that
            variable — so the "at most two per row" is read off, not asserted. */
      g=>{
        graph(g, 0.62, -3.7, -0.1);

        const S = 0.30, GAP = 0.345, X0 = 0.75, Y0 = 1.95;
        const mx = c => X0 + c*GAP, my = r => Y0 - r*GAP;
        const live = [];
        for(let r=0;r<FACTORS.length;r++){
          for(let c=0;c<NV;c++){
            const on = FACTORS[r].v.indexOf(c) >= 0;
            const col = !on ? COL.grid2 : (FACTORS[r].kind === 'prior' ? COL.green
                        : (c < POSES.length ? COL.violet : COL.teal));
            const m = cell(g, col, S, on ? 0.92 : 0.13);
            m.position.set(mx(c), my(r), 0);
            if(on) live.push({m, r});
          }
        }
        // column/row rules, so the block structure reads as a matrix
        line(g, [V3(mx(0)-GAP*0.62, my(-1)+0.02, 0), V3(mx(NV-1)+GAP*0.62, my(-1)+0.02, 0)], COL.grid1, 0.5);
        line(g, [V3(mx(POSES.length)-GAP*0.5, my(-1), 0),
                 V3(mx(POSES.length)-GAP*0.5, my(FACTORS.length), 0)], COL.grid1, 0.45);

        const lbl = makeLabel('J', HX.ink, 1.9); lbl.position.set(mx(3), Y0+0.70, 0); g.add(lbl);
        return {tick(t){
          // sweep a highlight down the rows: one factor, at most two non-zero blocks
          const row = Math.floor(t*1.3) % FACTORS.length;
          live.forEach(({m,r})=>{ m.material.opacity = r===row ? 1.0 : 0.55; });
        }};
      }
    ];

    function bindCard(i){
      wireBubble('fgTypesInfo','fgTypesNote');   // card 1 · the standard factor types
      wireBubble('fgPriorInfo','fgPriorNote');   // card 2 · the prior as a measurement
      wireBubble('fgBlockInfo','fgBlockNote');   // card 3 · where 2×6 and 2×3 come from
    }

    return { stations, bindCard };
  }

  return {
    id: 'slam-factor-graph',
    tier: 'slam',
    layout: { SP, OFF },
    threadKey: 'green',
    build,
    cards: {
      hu: [
        {t:'Változók és factorok', b:'<p>Az Optimization-ágon a reziduumok egy névtelen halmaz voltak: <span class="m">Σ<sub>i</sub> ½‖r<sub>i</sub>‖²</span>, és ennyi. Ideje megnézni, <em>mi tartozik mihez</em>.</p><p>A <strong>factor graph</strong> egy <em>páros gráf</em>, kétféle csúccsal:</p><p><strong>Változó-csúcsok</strong> — amit becsülni akarunk: pózok, landmarkok, IMU-bias, sebesség. A jelenetben ezek a körök: lila a póz, teál a landmark.</p><p><strong>Factor-csúcsok</strong> — amit tudunk: mérések és kényszerek. Ezek a négyzetek.</p><p>Egy él azt jelenti: <em>„ez a mérés függ ettől a változótól”</em>. És minden factor a hozzá kötött változók pillanatnyi értékéből egy <strong>reziduumot</strong> ad vissza: mennyire nem teljesül az, amit ez a mérés állít.</p><p>A páros szerkezet nem stílus kérdése. Két változó soha nincs közvetlenül összekötve — mindig egy factoron keresztül —, mert két becsülendő mennyiség között nincs is más kapcsolat, mint az, hogy valamilyen <em>mérés</em> egyszerre szól mindkettőről.</p><p>A <button class="termbtn" id="fgTypesInfo" type="button" aria-expanded="false" aria-controls="fgTypesNote">szokásos factor-típusok</button> mind ugyanebbe a formába illenek, a legegyszerűbbtől a legbonyolultabbig.</p><div class="bubble" id="fgTypesNote" role="dialog" aria-label="Factor-tipusok" hidden><p><strong>Reprojekciós mérés</strong> — egy kamerapóz + egy landmark. A reziduum a pixelhiba: hova vetül a landmark a modell szerint, mínusz hol látjuk.</p><p><strong>IMU-preintegráció</strong> — két egymást követő póz, tipikusan sebességgel és biasszal együtt. A reziduum: mit mond a tehetetlenségi mérés a két állapot közti változásról.</p><p><strong>Odometria / relatív póz</strong> — két egymást követő póz. Ez van a jelenetben a lila körök között.</p><p><strong>Loop closure</strong> — két, időben <em>távoli</em> póz. Szerkezetileg ugyanaz, mint az odometria; a különbség az, hogy itt nagy az elfordulás, és ezért itt lesz kötelező a szigorú manifold-kezelés.</p><p><strong>Prior</strong> — egyetlen változó. <em>Unáris</em> factor, egyetlen éllel; a jelenetben a zöld négyzet.</p><p>Mindegyik ugyanazt csinálja: néhány változóból egy reziduumot és egy zajmodellt ad. A solvernek ennél többet nem is kell tudnia róluk.</p></div>'},
        {t:'A gráf a MAP-összeg képe', b:'<p>Könnyű a factor graphot úgy nézni, mint egy kényelmes ábrázolást, amit utólag ráterítettünk a feladatra. Nem az. <strong>A gráf a MAP-becslés képe.</strong></p><p>Idézzük fel, mit kaptunk a Gauss–Newton hold első állomásán:</p><p class="matline"><span class="m">x̂ = arg min<sub>x</sub> Σ<sub>i</sub> ½ r<sub>i</sub><sup>⊤</sup>Σ<sub>i</sub><sup>−1</sup>r<sub>i</sub></span></p><p>Ennek az összegnek <strong>minden tagja egy factor</strong>. És hogy egy tag <em>mely</em> változóktól függ — az éppen a gráf élei. Semmi több nincs a gráfban, és semmi kevesebb.</p><p>A jelenetben ezért világít egyszerre egy factor: az a négyzet, a hozzá tartozó élek és a végükön a körök együtt <em>egy tag</em> az összegben. Ha végigpörgetjük mindet, megkaptuk a teljes célfüggvényt.</p><p>Ez nem szójáték: a gráf nem <em>rátehető</em> a MAP-becslésre, a MAP-becslés <em>maga</em> a gráf. Ezért lehet a solvert a gráf szerkezetéből felépíteni, és ezért mond bármit a gráf alakja a feladat nehézségéről.</p><p>A sorozat végén a zöld négyzet jön: a <strong>prior</strong>, egyetlen éllel. És ez több, mint egy kényelmi tag. Az előző ágon láttuk, hogy a <span class="m">H</span> lehet szinguláris <em>információhiány</em> miatt. A <button class="termbtn" id="fgPriorInfo" type="button" aria-expanded="false" aria-controls="fgPriorNote">gauge-szabadság</button> pontosan ilyen: az egész térkép együtt eltolható és elforgatható anélkül, hogy bármelyik reziduum megváltozna — a relatív mérések nem tudják, hol van a világ origója.</p><p>A prior ezt a szabadságot veszi el. És figyeld meg, <em>hogyan</em>: nem külön mechanizmussal, nem a solverbe drótozott kivétellel, hanem egy taggal, ami pontosan úgy néz ki, mint bármelyik mérés. Az „első póz legyen az origó” egy unáris factor — ennyi.</p><div class="bubble" id="fgPriorNote" role="dialog" aria-label="A prior mint meres" hidden><p>A prior <span class="m">p(x)</span> a Bayes-szabályból jött, és a logaritmus után ugyanúgy egy <span class="m">½ r<sup>⊤</sup>Σ<sup>−1</sup>r</span> tag lett belőle, mint a mérésekből. Ezért fér el ugyanabban a gráfban.</p><p>A <span class="m">Σ</span> itt azt mondja meg, <em>mennyire</em> rögzítünk. Nagyon kicsi <span class="m">Σ</span>: „az első póz gyakorlatilag pontosan az origó” — kemény rögzítés. Nagyobb <span class="m">Σ</span>: lágy prior, ami elveszi a szingularitást, de hagy mozgásteret.</p><p>A gauge-szabadság megszüntetéséhez elvileg elég egyetlen póz rögzítése. Ha <em>több</em> priort teszünk be, mint amennyi a szabadság, azzal már nem gauge-t rögzítünk, hanem valódi állítást teszünk a világról — és ha az állítás rossz, a megoldás romlik.</p></div>'},
        {t:'A ritkaság', b:'<p>Egy factor csak <em>néhány</em> változót érint. Ez nem esztétikai megfigyelés — ez teszi a nagy feladatot egyáltalán megoldhatóvá.</p><p>A jelenet jobb oldalán a <span class="m">J</span> Jacobian blokkszerkezete: tíz sor (a tíz factor) és hét oszlop (a négy póz meg a három landmark). Nézd meg a sorokat: egyikben sincs <strong>kettőnél több</strong> nem-nulla blokk, a prior sorában pedig csak egy. Ez nem véletlen — pontosan az, hogy egy mérés hány változóról szól.</p><p>Egy <button class="termbtn" id="fgBlockInfo" type="button" aria-expanded="false" aria-controls="fgBlockNote">reprojekciós factor</button> például <span class="m">r ∈ ℝ²</span> pixelhibát ad, a póz szerinti blokkja <span class="m">2×6</span>, a landmark szerinti <span class="m">2×3</span> — és a sor <em>összes többi</em> blokkja nulla.</p><p>A <span class="m">H = J<sup>⊤</sup>J</span> ugyanezt örökli, csak áttéve a változók közti kapcsolatokra:</p><p class="matline"><span class="m">H<sub>ij</sub> ≠ 0&nbsp; ⟺ &nbsp;van olyan factor, ami i-t és j-t is érinti</span></p><p>Vagyis a <span class="m">H</span> mintázata <strong>a gráf szomszédsági mátrixa</strong>. A struktúra, amit a modellezésnél rajzoltunk, szó szerint ugyanaz, mint amit a lineáris algebra lát.</p><p>Miért számít ez. Egy tízezer pózos, százezer landmarkos feladatnál a sűrű <span class="m">H</span> már <em>tárolni</em> sem lenne mit, nemhogy invertálni. A ritka <span class="m">H</span> viszont ritka Cholesky-val megoldható, és a költség a gráf <em>szerkezetétől</em> függ — nem pusztán a méretétől.</p><p><strong>Ahol ez a hold megáll.</strong> Hogy hogyan használjuk ki a ritkaságot — változó-sorrend, Schur-komplemens, marginalizálás — az technika, és nincs kidolgozva sem itt, sem a jegyzetekben. Ami viszont megvan, és ami a legdrágább hiba szokott lenni: hogy <em>hol kötelező</em> a szigorú manifold-kezelés, és hol elég a közelítés. Ez az utolsó hold.</p><div class="bubble" id="fgBlockNote" role="dialog" aria-label="Honnan jonnek a blokkmeretek" hidden><p>Egy reprojekciós reziduum: vedd az <span class="m">l</span> landmarkot, vidd a <span class="m">T</span> kamerapózba, vetítsd, és vond ki a mért pixelt.</p><p>A blokkméretek egyszerűen a dimenziók szorzatai:</p><p class="matline"><span class="m">∂r/∂δ<sub>póz</sub> : 2 × 6</span></p><p class="matline"><span class="m">∂r/∂l : 2 × 3</span></p><p>A <span class="m">2</span> a pixelhiba két komponense, a <span class="m">6</span> az <span class="m">SE(3)</span> szabadsági fokai, a <span class="m">3</span> a landmark koordinátái.</p><p>És figyelj a nevezőre: <span class="m">∂r/∂δ</span>, nem <span class="m">∂r/∂T</span>. A derivált a <em>tangens-térbeli lépés</em> szerint van véve — ez az, amit a Gauss–Newton hold változócseréje csinált, csak ott lapos volt a tér. Itt ettől lesz <span class="m">6</span> az oszlopszám <span class="m">12</span> helyett, és <strong>itt dől el a body/world konvenció is</strong>: hogy balról vagy jobbról perturbálunk, más <span class="m">J</span>-t ad. Mindkettő helyes, ha végig ugyanazt használjuk.</p></div>'}
      ],
      en: [
        {t:'Variables and Factors', b:'<p>On the Optimization branch the residuals were an anonymous heap: <span class="m">Σ<sub>i</sub> ½‖r<sub>i</sub>‖²</span>, and that was that. Time to look at <em>what belongs to what</em>.</p><p>A <strong>factor graph</strong> is a <em>bipartite graph</em> with two kinds of node:</p><p><strong>Variable nodes</strong> — what we want to estimate: poses, landmarks, IMU bias, velocity. In the scene these are the circles: violet for poses, teal for landmarks.</p><p><strong>Factor nodes</strong> — what we know: measurements and constraints. These are the squares.</p><p>An edge means <em>“this measurement depends on this variable”</em>. And every factor returns a <strong>residual</strong> computed from the current values of the variables tied to it: how badly what this measurement claims is failing to hold.</p><p>The bipartite structure is not a stylistic choice. Two variables are never joined directly — always through a factor — because there is no other kind of connection between two estimated quantities than that some <em>measurement</em> speaks about both at once.</p><p>The <button class="termbtn" id="fgTypesInfo" type="button" aria-expanded="false" aria-controls="fgTypesNote">standard factor types</button> all fit this same shape, from the simplest to the most elaborate.</p><div class="bubble" id="fgTypesNote" role="dialog" aria-label="Factor types" hidden><p><strong>Reprojection measurement</strong> — one camera pose + one landmark. The residual is the pixel error: where the model says the landmark projects, minus where we see it.</p><p><strong>IMU preintegration</strong> — two consecutive poses, typically with velocity and bias. The residual: what the inertial measurement says about the change between the two states.</p><p><strong>Odometry / relative pose</strong> — two consecutive poses. That is what sits between the violet circles in the scene.</p><p><strong>Loop closure</strong> — two poses <em>far apart in time</em>. Structurally identical to odometry; the difference is that the rotation here is large, which is why rigorous manifold handling becomes mandatory precisely here.</p><p><strong>Prior</strong> — a single variable. A <em>unary</em> factor with one edge; the green square in the scene.</p><p>They all do the same thing: turn a few variables into a residual and a noise model. The solver needs to know nothing else about them.</p></div>'},
        {t:'The Graph Is a Picture of the MAP Sum', b:'<p>It is easy to read a factor graph as a convenient notation laid over the problem after the fact. It is not. <strong>The graph is a picture of the MAP estimate.</strong></p><p>Recall what came out of the Gauss–Newton moon’s first station:</p><p class="matline"><span class="m">x̂ = arg min<sub>x</sub> Σ<sub>i</sub> ½ r<sub>i</sub><sup>⊤</sup>Σ<sub>i</sub><sup>−1</sup>r<sub>i</sub></span></p><p><strong>Every term of that sum is a factor.</strong> And <em>which</em> variables a term depends on — those are precisely the graph’s edges. There is nothing more in the graph, and nothing less.</p><p>That is why the scene lights one factor at a time: that square, its edges, and the circles at their ends are together <em>one term</em> of the sum. Cycle through all of them and you have the whole objective.</p><p>This is not word-play: the graph is not <em>applied to</em> the MAP estimate, the MAP estimate <em>is</em> the graph. It is why a solver can be built from the graph’s structure, and why the shape of the graph says anything at all about the difficulty of the problem.</p><p>Last in the cycle comes the green square: the <strong>prior</strong>, with a single edge. And it is more than a convenience term. On the previous branch we saw that <span class="m">H</span> can be singular through <em>missing information</em>. A <button class="termbtn" id="fgPriorInfo" type="button" aria-expanded="false" aria-controls="fgPriorNote">gauge freedom</button> is exactly that: the whole map can be translated and rotated together without changing any residual — relative measurements do not know where the world’s origin is.</p><p>The prior removes that freedom. And notice <em>how</em>: not with a separate mechanism, not with an exception wired into the solver, but with a term that looks exactly like any other measurement. “Let the first pose be the origin” is a unary factor — that is all.</p><div class="bubble" id="fgPriorNote" role="dialog" aria-label="The prior as a measurement" hidden><p>The prior <span class="m">p(x)</span> came from Bayes’ rule, and after the logarithm it became a <span class="m">½ r<sup>⊤</sup>Σ<sup>−1</sup>r</span> term just like the measurements. That is why it fits in the same graph.</p><p>Here <span class="m">Σ</span> says <em>how hard</em> we pin things down. A very small <span class="m">Σ</span>: “the first pose is essentially exactly the origin” — a hard anchor. A larger <span class="m">Σ</span>: a soft prior that removes the singularity but leaves room to move.</p><p>In principle one pose is enough to kill the gauge freedom. Adding <em>more</em> priors than there is freedom is no longer fixing a gauge but making a real claim about the world — and if the claim is wrong, the solution gets worse.</p></div>'},
        {t:'Sparsity', b:'<p>A factor touches only a <em>few</em> variables. This is not an aesthetic observation — it is what makes the large problem solvable at all.</p><p>On the right of the scene is the block structure of the Jacobian <span class="m">J</span>: ten rows (the ten factors) and seven columns (four poses and three landmarks). Look along the rows: none has <strong>more than two</strong> non-zero blocks, and the prior’s row has only one. That is not a coincidence — it is exactly how many variables one measurement talks about.</p><p>A <button class="termbtn" id="fgBlockInfo" type="button" aria-expanded="false" aria-controls="fgBlockNote">reprojection factor</button>, for instance, gives a pixel error <span class="m">r ∈ ℝ²</span>, with a <span class="m">2×6</span> block for the pose and a <span class="m">2×3</span> block for the landmark — and <em>every other</em> block on that row is zero.</p><p><span class="m">H = J<sup>⊤</sup>J</span> inherits the same thing, transposed onto relations between variables:</p><p class="matline"><span class="m">H<sub>ij</sub> ≠ 0&nbsp; ⟺ &nbsp;some factor touches both i and j</span></p><p>So the pattern of <span class="m">H</span> is <strong>the adjacency matrix of the graph</strong>. The structure we drew while modelling is literally the structure the linear algebra sees.</p><p>Why it matters. In a problem with ten thousand poses and a hundred thousand landmarks, a dense <span class="m">H</span> could not even be <em>stored</em>, let alone inverted. A sparse <span class="m">H</span>, on the other hand, yields to sparse Cholesky, and the cost depends on the graph’s <em>structure</em> — not on its size alone.</p><p><strong>Where this moon stops.</strong> How the sparsity is exploited — variable ordering, the Schur complement, marginalisation — is technique, and it is written up neither here nor in the notes. What is written up, and what tends to be the most expensive mistake, is <em>where</em> rigorous manifold handling is mandatory and where an approximation will do. That is the last moon.</p><div class="bubble" id="fgBlockNote" role="dialog" aria-label="Where the block sizes come from" hidden><p>A reprojection residual: take the landmark <span class="m">l</span>, carry it into the camera pose <span class="m">T</span>, project it, and subtract the measured pixel.</p><p>The block sizes are simply products of dimensions:</p><p class="matline"><span class="m">∂r/∂δ<sub>pose</sub> : 2 × 6</span></p><p class="matline"><span class="m">∂r/∂l : 2 × 3</span></p><p>The <span class="m">2</span> is the two components of the pixel error, the <span class="m">6</span> is the degrees of freedom of <span class="m">SE(3)</span>, the <span class="m">3</span> is the landmark’s coordinates.</p><p>And look at the denominator: <span class="m">∂r/∂δ</span>, not <span class="m">∂r/∂T</span>. The derivative is taken with respect to the <em>step in the tangent space</em> — which is what the Gauss–Newton moon’s change of variable did, except the space was flat there. It is why the column count is <span class="m">6</span> and not <span class="m">12</span>, and <strong>it is also where the body/world convention is decided</strong>: perturbing from the left or from the right gives a different <span class="m">J</span>. Both are correct, provided the same one is used throughout.</p></div>'}
      ],
      ja: [
        {t:'変数とファクタ', b:'<p>Optimization の枝では、残差は名もない山でした: <span class="m">Σ<sub>i</sub> ½‖r<sub>i</sub>‖²</span>、それだけです。そろそろ<em>何が何に属するのか</em>を見る頃です。</p><p><strong>ファクタグラフ</strong>は二種類の節点をもつ<em>二部グラフ</em>です:</p><p><strong>変数節点</strong> — 推定したいもの: 姿勢、ランドマーク、IMU バイアス、速度。シーンでは円です: 菫が姿勢、青緑がランドマーク。</p><p><strong>ファクタ節点</strong> — わかっていること: 観測と拘束。こちらは四角です。</p><p>辺は<em>「この観測はこの変数に依存する」</em>という意味です。そして各ファクタは、つながる変数の現在の値から<strong>残差</strong>を返します: この観測の主張がどれだけ満たされていないか、です。</p><p>二部構造は様式の問題ではありません。二つの変数が直接つながることは決してなく、つねにファクタを介します — 推定量どうしの関係は、ある<em>観測</em>が両方について同時に語っている、という形以外にありえないからです。</p><p><button class="termbtn" id="fgTypesInfo" type="button" aria-expanded="false" aria-controls="fgTypesNote">標準的なファクタの種類</button>は、いちばん単純なものからいちばん凝ったものまで、すべてこの同じ形に収まります。</p><div class="bubble" id="fgTypesNote" role="dialog" aria-label="ファクタの種類" hidden><p><strong>再投影観測</strong> — カメラ姿勢一つ ＋ ランドマーク一つ。残差は画素誤差: モデルの言う投影位置から、実際に見えている位置を引いたもの。</p><p><strong>IMU 事前積分</strong> — 連続する二つの姿勢、ふつうは速度とバイアスも一緒に。残差は、慣性観測が二状態間の変化について言っていることです。</p><p><strong>オドメトリ / 相対姿勢</strong> — 連続する二つの姿勢。シーンで菫の円の間にあるものです。</p><p><strong>ループ閉じ込み</strong> — 時間的に<em>離れた</em>二つの姿勢。構造はオドメトリと同一で、違いは回転が大きいこと。だからこそ厳密な多様体の扱いがまさにここで必須になります。</p><p><strong>事前分布</strong> — 変数一つ。辺が一本の<em>単項</em>ファクタで、シーンの緑の四角です。</p><p>どれも同じことをしています: いくつかの変数から残差と雑音モデルを作る。ソルバはそれ以上を知る必要がありません。</p></div>'},
        {t:'グラフは MAP の和の絵', b:'<p>ファクタグラフを、問題にあとから被せた便利な記法として読むのは簡単です。そうではありません。<strong>グラフは MAP 推定の絵</strong>です。</p><p>Gauss–Newton の衛星の最初の駅で出てきたものを思い出しましょう:</p><p class="matline"><span class="m">x̂ = arg min<sub>x</sub> Σ<sub>i</sub> ½ r<sub>i</sub><sup>⊤</sup>Σ<sub>i</sub><sup>−1</sup>r<sub>i</sub></span></p><p><strong>この和の各項が一つのファクタ</strong>です。そして各項が<em>どの</em>変数に依存するか — それがまさにグラフの辺です。グラフにはそれ以上のものも、それ以下のものもありません。</p><p>だからシーンは一度に一つのファクタを光らせます: その四角と、その辺と、辺の先の円が、合わせて和の<em>一項</em>です。全部を巡れば目的関数の全体になります。</p><p>これは言葉遊びではありません: グラフが MAP 推定に<em>被せられて</em>いるのではなく、MAP 推定が<em>グラフそのもの</em>なのです。だからソルバをグラフの構造から組み上げられるし、グラフの形が問題の難しさについて何かを語るのです。</p><p>巡回の最後に緑の四角が来ます: 辺が一本の<strong>事前分布</strong>です。これは単なる便宜的な項ではありません。前の枝で、<span class="m">H</span> が<em>情報の欠如</em>によって特異になりうることを見ました。<button class="termbtn" id="fgPriorInfo" type="button" aria-expanded="false" aria-controls="fgPriorNote">ゲージ自由度</button>とはまさにそれです: 地図全体をまとめて平行移動・回転しても、どの残差も変わらない — 相対観測は世界の原点がどこかを知らないのです。</p><p>事前分布はこの自由度を取り去ります。しかも<em>やり方</em>に注目してください: 別立ての仕組みでもなく、ソルバに配線された例外でもなく、他のどの観測ともまったく同じ見かけの一項として、です。「最初の姿勢を原点とせよ」は単項ファクタ — それだけです。</p><div class="bubble" id="fgPriorNote" role="dialog" aria-label="観測としての事前分布" hidden><p>事前分布 <span class="m">p(x)</span> はベイズ則から来たもので、対数の後は観測とまったく同じ <span class="m">½ r<sup>⊤</sup>Σ<sup>−1</sup>r</span> の項になりました。だから同じグラフに収まるのです。</p><p>ここでの <span class="m">Σ</span> は<em>どれだけ強く</em>留めるかを言います。とても小さな <span class="m">Σ</span>: 「最初の姿勢は事実上ぴったり原点」 — 硬い固定です。大きめの <span class="m">Σ</span>: 特異性は消しつつ動く余地を残す、柔らかい事前分布です。</p><p>原理的にはゲージ自由度を殺すには姿勢一つで足ります。自由度より<em>多く</em>の事前分布を入れるのは、もはやゲージの固定ではなく世界についての実質的な主張です — その主張が誤っていれば、解は悪くなります。</p></div>'},
        {t:'疎性', b:'<p>一つのファクタが触れる変数は<em>わずか</em>です。これは美的な観察ではなく、大きな問題をそもそも解けるものにしている当のものです。</p><p>シーンの右にあるのが Jacobian <span class="m">J</span> のブロック構造です: 十行（十個のファクタ）と七列（四つの姿勢と三つのランドマーク）。行に沿って見てください: どの行にも非零ブロックは<strong>二つより多くありません</strong>し、事前分布の行には一つだけです。偶然ではありません — 一つの観測が何個の変数について語るか、そのものです。</p><p>たとえば<button class="termbtn" id="fgBlockInfo" type="button" aria-expanded="false" aria-controls="fgBlockNote">再投影ファクタ</button>は画素誤差 <span class="m">r ∈ ℝ²</span> を与え、姿勢についてのブロックは <span class="m">2×6</span>、ランドマークについては <span class="m">2×3</span> — その行の<em>他のすべて</em>のブロックはゼロです。</p><p><span class="m">H = J<sup>⊤</sup>J</span> は同じことを、変数どうしの関係へ移し替えて受け継ぎます:</p><p class="matline"><span class="m">H<sub>ij</sub> ≠ 0&nbsp; ⟺ &nbsp;i と j の両方に触れるファクタが存在する</span></p><p>つまり <span class="m">H</span> の模様は<strong>グラフの隣接行列</strong>です。モデル化のときに描いた構造が、線形代数の見る構造と文字どおり同じなのです。</p><p>なぜ重要か。姿勢一万、ランドマーク十万の問題では、密な <span class="m">H</span> は逆行列どころか<em>保存</em>すらできません。疎な <span class="m">H</span> なら疎 Cholesky が効き、コストはグラフの<em>構造</em>に依存します — 大きさだけではなく。</p><p><strong>この衛星が止まるところ。</strong>疎性をどう使うか — 変数順序、Schur 補元、周辺化 — は技術であり、ここにも覚え書きにも書かれていません。書かれているのは、そしてたいてい最も高くつく間違いは、厳密な多様体の扱いが<em>どこで必須</em>で、どこなら近似で足りるか、です。それが最後の衛星です。</p><div class="bubble" id="fgBlockNote" role="dialog" aria-label="ブロックの大きさの出どころ" hidden><p>再投影の残差: ランドマーク <span class="m">l</span> を取り、カメラ姿勢 <span class="m">T</span> へ運び、投影し、測った画素を引く。</p><p>ブロックの大きさは単に次元の積です:</p><p class="matline"><span class="m">∂r/∂δ<sub>pose</sub> : 2 × 6</span></p><p class="matline"><span class="m">∂r/∂l : 2 × 3</span></p><p><span class="m">2</span> は画素誤差の二成分、<span class="m">6</span> は <span class="m">SE(3)</span> の自由度、<span class="m">3</span> はランドマークの座標です。</p><p>そして分母に注目: <span class="m">∂r/∂T</span> ではなく <span class="m">∂r/∂δ</span> です。微分は<em>接空間でのステップ</em>について取られています — Gauss–Newton の衛星の変数変換がしたことと同じで、ただしあちらでは空間が平坦でした。列数が <span class="m">12</span> でなく <span class="m">6</span> になるのはこのためで、<strong>body/world の約束が決まるのもここ</strong>です: 左から摂動するか右からかで <span class="m">J</span> は変わります。終始同じものを使うかぎり、どちらも正しいのです。</p></div>'}
      ]
    }
  };
})();
