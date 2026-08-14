'use strict';
/* Journey (prototype): the flat world ℝⁿ — the Geometry planet's "start here" moon.
   A deliberately small, self-contained counterpoint to the curved SO(3) journey:
   the space you already know, where the tangent space IS the space and the step is
   plain addition. Concepts are explained by inline links in the running text (dashed
   underline) that open a footnote panel at the foot of the card. Station 2 animates a
   concrete step exp_p(v) = p + v on a coordinate frame, with faint position vectors
   O→p and O→q making the vector-addition triangle explicit. Aimed at an undergraduate
   EE/CS reader — see CLAUDE.md. Cards are bilingual and live in this file (the engine
   falls back to C.cards when a journey ships none). Requires LIE.kit. */
window.LIE = window.LIE || {};
LIE.journeys = LIE.journeys || {};
LIE.journeys['geometry-flat'] = (function(){
  const K = LIE.kit;
  const { V3, ease, hexStr, fatArrow, setArrow, makeLabel } = K;

  // Station world positions + the camera offset used to view each one.
  const SP  = [V3(0,0,0), V3(40,4,-10), V3(80,-3,9)];
  const OFF = [V3(0,2.4,8.6), V3(0,2.8,8.8), V3(0,3.1,10.0)];

  // The concrete example animated at station 2 — the same numbers the card works out.
  const P0 = V3(-2,1,-1), VV = V3(3,1,2), Q0 = P0.clone().add(VV);   // (1,2,1)

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
      }
    ];

    function bindCard(i){
      wireBubble('gfTriadInfo','gfTriadNote');   // card 0 · footnote
      wireBubble('gfExpInfo','gfExpNote');         // card 2 · footnote
      wireBubble('gfGeoInfo','gfGeoNote');         // card 2 · footnote
    }

    return { stations, bindCard };
  }

  return {
    id: 'geometry-flat',
    tier: 'geometry',
    layout: { SP, OFF },
    threadKey: 'teal',
    build,
    cards: {
      hu: [
        {t:'A lapos tér', b:'<p>A paramétertér a jól ismert <span class="m">ℝ<sup>n</sup></span>: egy pont <span class="m">w = (w<sub>1</sub>, …, w<sub>n</sub>)</span> egyszerűen <span class="m">n</span> darab valós szám. A korall/teál/lila <button class="termbtn" id="gfTriadInfo" type="button" aria-expanded="false" aria-controls="gfTriadNote">triád</button> a standard bázis, a rács a koordináták.</p><p>A lényeg, amit itt ingyen kapunk: nincs kényszer. Bárhonnan bármely irányba léphetsz, és az eredmény ugyanúgy <span class="m">ℝ<sup>n</sup></span>-beli pont marad — nincs honnan „kilépni”. Ezt a kényelmet veszítjük el a görbült tereken (<span class="m">SO(3)</span>, <span class="m">SE(3)</span>), és pont ezt a receptet akarjuk oda átvinni.</p><div class="bubble" id="gfTriadNote" role="dialog" aria-label="Mi az a triád" hidden><p>A három tengely-nyíl a standard bázis: <span class="m">e<sub>1</sub>, e<sub>2</sub>, e<sub>3</sub></span> — a koordinátatengelyek.</p><p class="matline"><span class="m">w = w<sub>1</sub>e<sub>1</sub> + w<sub>2</sub>e<sub>2</sub> + w<sub>3</sub>e<sub>3</sub></span></p><p>A <span class="m">w<sub>i</sub></span> számok a pont koordinátái.</p></div>'},
        {t:'Az érintőtér', b:'<p>Az <em>érintőtér</em> egy <span class="m">p</span> pontban az összes sebességvektor, amivel <span class="m">p</span>-n át lehet haladni. Vegyél egy görbét, <span class="m">γ(t)</span>-t, amire <span class="m">γ(0) = p</span> — a sebessége, <span class="m">γ′(0)</span>, egy érintővektor.</p><p>Lapos térben egy egyenes <span class="m">γ(t) = p + t·v</span>, ennek sebessége <span class="m">γ′(0) = v</span>, és <span class="m">v</span> bármi lehet. Így az érintőtér a teljes <span class="m">ℝ<sup>n</sup></span>, minden pontban ugyanaz:</p><p class="matline"><span class="m">T<sub>p</sub>ℝ<sup>n</sup> ≅ ℝ<sup>n</sup></span></p><p>Ezért olvad össze itt pont és vektor. Egy sokaságon viszont az érintőtér pontról pontra változik, és <em>nem</em> a befoglaló tér — ott a <span class="m">v</span> már nem tolható szabadon a helyéről.</p>'},
        {t:'A lépés: exp = összeadás', b:'<p>Az <button class="termbtn" id="gfExpInfo" type="button" aria-expanded="false" aria-controls="gfExpNote">exp</button><sub>p</sub> leképezés egy <span class="m">v</span> érintővektort visz pontba: indulj <span class="m">p</span>-ből <span class="m">v</span> kezdősebességgel a <button class="termbtn" id="gfGeoInfo" type="button" aria-expanded="false" aria-controls="gfGeoNote">geodetikus</button> mentén, és haladj <em>egységnyi</em> ideig. Lapos térben a geodetikus egyenes, <span class="m">γ(t) = p + t·v</span>, tehát:</p><p class="matline"><span class="m">exp<sub>p</sub>(v) = γ(1) = p + v</span></p><p>Konkrétan, a jelenetben <span class="m">p = (−2, 1, −1)</span> és <span class="m">v = (3, 1, 2)</span> — a gömb pontosan ezt a lépést járja be:</p><p class="matline"><span class="m">exp<sub>p</sub>(v) = (−2, 1, −1) + (3, 1, 2) = (1, 2, 1)</span></p><p>Ezért „csak összeadás” itt a lépés — komponensenként. A görbült világban a definíció <em>ugyanez</em>, de a geodetikus ív: <span class="m">SO(3)</span>-on <span class="m">exp</span> a mátrix-exponenciális, a <span class="m">+</span>-ból <span class="m">⊞</span> lesz.</p><div class="bubble" id="gfExpNote" role="dialog" aria-label="Miert exp" hidden><p>Az <span class="m">exp</span> az <em>exponenciális függvény</em>. A valós <span class="m">e<sup>x</sup></span> hatványsora:</p><p class="matline"><span class="m">e<sup>x</sup> = 1 + x + <span class="frac"><span>x<sup>2</sup></span><span>2!</span></span> + <span class="frac"><span>x<sup>3</sup></span><span>3!</span></span> + …</span></p><p>Ugyanez a sor működik vektorra/mátrixra is. A kulcstulajdonság:</p><p class="matline"><span class="m">e<sup>a+b</sup> = e<sup>a</sup> · e<sup>b</sup></span></p><p>vagyis az <strong>összeadást szorzássá</strong> (transzformációk összefűzésévé) alakítja. Az érintővektorokat összeadjuk; az <span class="m">exp</span> ezt viszi át a mozgások szorzására.</p><p>Konkrétan, kamatos kamatként (a <span class="m">v</span>-t <span class="m">n</span> pici lépésre bontva — ez az összeadás!):</p><p class="matline"><span class="m">exp(v) = lim<sub>n→∞</sub> (1 + <span class="frac"><span>v</span><span>n</span></span>)<sup>n</sup></span></p><p>Lapos térben a „szorzás” maga az összeadás, a magasabb rendű tagok eltűnnek, így <span class="m">exp(v) = v</span>, azaz <span class="m">exp<sub>p</sub>(v) = p + v</span>. Görbült téren a tagok nem tűnnek el — ott lesz belőle a mátrix-exponenciális.</p></div><div class="bubble" id="gfGeoNote" role="dialog" aria-label="Mi az a geodetikus" hidden><p>A geodetikus két pont közötti legrövidebb út — a görbült terek „egyenese”.</p><p>Lapos <span class="m">ℝ<sup>n</sup></span>-ben egyenes szakasz; gömbön főkör-ív; <span class="m">SO(3)</span>-on állandó tengelyű forgatás. Az <span class="m">exp<sub>p</sub></span> mindig egy geodetikus mentén lép, egységnyi ideig.</p></div>'}
      ],
      en: [
        {t:'The Flat World', b:'<p>The parameter space is the familiar <span class="m">ℝ<sup>n</sup></span>: a point <span class="m">w = (w<sub>1</sub>, …, w<sub>n</sub>)</span> is just <span class="m">n</span> real numbers. The coral/teal/violet <button class="termbtn" id="gfTriadInfo" type="button" aria-expanded="false" aria-controls="gfTriadNote">triad</button> is the standard basis, the grid the coordinates.</p><p>What we get for free here: no constraint. Step from anywhere in any direction and the result is still a point of <span class="m">ℝ<sup>n</sup></span> — there is nowhere to step off to. This is the comfort we lose on curved spaces (<span class="m">SO(3)</span>, <span class="m">SE(3)</span>), and exactly the recipe we want to carry over there.</p><div class="bubble" id="gfTriadNote" role="dialog" aria-label="What is the triad" hidden><p>The three axis arrows are the standard basis: <span class="m">e<sub>1</sub>, e<sub>2</sub>, e<sub>3</sub></span> — the coordinate axes.</p><p class="matline"><span class="m">w = w<sub>1</sub>e<sub>1</sub> + w<sub>2</sub>e<sub>2</sub> + w<sub>3</sub>e<sub>3</sub></span></p><p>The numbers <span class="m">w<sub>i</sub></span> are the coordinates of the point.</p></div>'},
        {t:'The Tangent Space', b:'<p>The <em>tangent space</em> at a point <span class="m">p</span> is all the velocity vectors you can pass through <span class="m">p</span> with. Take a curve <span class="m">γ(t)</span> with <span class="m">γ(0) = p</span> — its velocity, <span class="m">γ′(0)</span>, is a tangent vector.</p><p>In flat space a straight line is <span class="m">γ(t) = p + t·v</span>, with velocity <span class="m">γ′(0) = v</span>, and <span class="m">v</span> can be anything. So the tangent space is all of <span class="m">ℝ<sup>n</sup></span>, the same at every point:</p><p class="matline"><span class="m">T<sub>p</sub>ℝ<sup>n</sup> ≅ ℝ<sup>n</sup></span></p><p>That is why points and vectors merge here. On a manifold, though, the tangent space changes point to point and is <em>not</em> the ambient space — there <span class="m">v</span> can no longer be slid freely from its basepoint.</p>'},
        {t:'The Step: exp = Addition', b:'<p>The <button class="termbtn" id="gfExpInfo" type="button" aria-expanded="false" aria-controls="gfExpNote">exp</button><sub>p</sub> map sends a tangent vector <span class="m">v</span> to a point: start at <span class="m">p</span> with initial velocity <span class="m">v</span>, follow the <button class="termbtn" id="gfGeoInfo" type="button" aria-expanded="false" aria-controls="gfGeoNote">geodesic</button>, and travel for <em>unit</em> time. In flat space the geodesic is a straight line, <span class="m">γ(t) = p + t·v</span>, so:</p><p class="matline"><span class="m">exp<sub>p</sub>(v) = γ(1) = p + v</span></p><p>Concretely, in the scene <span class="m">p = (−2, 1, −1)</span> and <span class="m">v = (3, 1, 2)</span> — the ball walks exactly this step:</p><p class="matline"><span class="m">exp<sub>p</sub>(v) = (−2, 1, −1) + (3, 1, 2) = (1, 2, 1)</span></p><p>That is why the step here is “just addition” — component by component. In the curved world the definition is the <em>same</em>, but the geodesic is an arc: on <span class="m">SO(3)</span>, <span class="m">exp</span> is the matrix exponential and <span class="m">+</span> becomes <span class="m">⊞</span>.</p><div class="bubble" id="gfExpNote" role="dialog" aria-label="Why exp" hidden><p><span class="m">exp</span> is the <em>exponential function</em>. The power series of the real <span class="m">e<sup>x</sup></span>:</p><p class="matline"><span class="m">e<sup>x</sup> = 1 + x + <span class="frac"><span>x<sup>2</sup></span><span>2!</span></span> + <span class="frac"><span>x<sup>3</sup></span><span>3!</span></span> + …</span></p><p>The same series works for vectors and matrices. The key property:</p><p class="matline"><span class="m">e<sup>a+b</sup> = e<sup>a</sup> · e<sup>b</sup></span></p><p>that is, it turns <strong>addition into multiplication</strong> (composition of transformations). Tangent vectors add; <span class="m">exp</span> carries that over to composing motions.</p><p>Concretely, as compound interest (split <span class="m">v</span> into <span class="m">n</span> tiny steps — that is the addition!):</p><p class="matline"><span class="m">exp(v) = lim<sub>n→∞</sub> (1 + <span class="frac"><span>v</span><span>n</span></span>)<sup>n</sup></span></p><p>In flat space the “multiplication” is just addition and the higher-order terms vanish, so <span class="m">exp(v) = v</span>, i.e. <span class="m">exp<sub>p</sub>(v) = p + v</span>. On curved spaces the terms do not vanish — there it becomes the matrix exponential.</p></div><div class="bubble" id="gfGeoNote" role="dialog" aria-label="What is a geodesic" hidden><p>A geodesic is the shortest path between two points — the “straight line” of curved spaces.</p><p>On flat <span class="m">ℝ<sup>n</sup></span> it is a straight segment; on a sphere, a great-circle arc; on <span class="m">SO(3)</span>, a rotation about a fixed axis. <span class="m">exp<sub>p</sub></span> always steps along a geodesic, for unit time.</p></div>'}
      ],
      ja: [
        {t:'平坦な世界', b:'<p>パラメータ空間はおなじみの <span class="m">ℝ<sup>n</sup></span>: 点 <span class="m">w = (w<sub>1</sub>, …, w<sub>n</sub>)</span> は単に <span class="m">n</span> 個の実数です。珊瑚／青緑／菫の<button class="termbtn" id="gfTriadInfo" type="button" aria-expanded="false" aria-controls="gfTriadNote">三本組</button>が標準基底、格子が座標です。</p><p>ここでただで手に入るもの: 拘束がないこと。どこからどの向きに踏み出しても、結果はやはり <span class="m">ℝ<sup>n</sup></span> の点のまま — 外に出て行く先がありません。この快適さを曲がった空間（<span class="m">SO(3)</span>、<span class="m">SE(3)</span>）では失うのであり、まさにこのレシピをそちらへ持って行きたいのです。</p><div class="bubble" id="gfTriadNote" role="dialog" aria-label="三本組とは" hidden><p>三本の軸の矢印が標準基底です: <span class="m">e<sub>1</sub>, e<sub>2</sub>, e<sub>3</sub></span> — 座標軸のことです。</p><p class="matline"><span class="m">w = w<sub>1</sub>e<sub>1</sub> + w<sub>2</sub>e<sub>2</sub> + w<sub>3</sub>e<sub>3</sub></span></p><p>数 <span class="m">w<sub>i</sub></span> がその点の座標です。</p></div>'},
        {t:'接空間', b:'<p>点 <span class="m">p</span> における<em>接空間</em>とは、<span class="m">p</span> を通り抜けるときに取りうるすべての速度ベクトルのことです。<span class="m">γ(0) = p</span> となる曲線 <span class="m">γ(t)</span> を取ると、その速度 <span class="m">γ′(0)</span> が接ベクトルです。</p><p>平坦な空間では直線は <span class="m">γ(t) = p + t·v</span>、その速度は <span class="m">γ′(0) = v</span> で、<span class="m">v</span> は何でも構いません。つまり接空間は <span class="m">ℝ<sup>n</sup></span> 全体で、どの点でも同じです:</p><p class="matline"><span class="m">T<sub>p</sub>ℝ<sup>n</sup> ≅ ℝ<sup>n</sup></span></p><p>だからここでは点とベクトルが融け合います。ところが多様体の上では接空間は点ごとに変わり、しかも周囲の空間とは<em>別物</em>です — そこでは <span class="m">v</span> をもう自由に基点から動かせません。</p>'},
        {t:'ステップ: exp = 足し算', b:'<p><button class="termbtn" id="gfExpInfo" type="button" aria-expanded="false" aria-controls="gfExpNote">exp</button><sub>p</sub> という写像は接ベクトル <span class="m">v</span> を点へ送ります: <span class="m">p</span> から初速 <span class="m">v</span> で出発し、<button class="termbtn" id="gfGeoInfo" type="button" aria-expanded="false" aria-controls="gfGeoNote">測地線</button>に沿って<em>単位</em>時間だけ進む。平坦な空間では測地線は直線 <span class="m">γ(t) = p + t·v</span> なので:</p><p class="matline"><span class="m">exp<sub>p</sub>(v) = γ(1) = p + v</span></p><p>具体的には、このシーンで <span class="m">p = (−2, 1, −1)</span>、<span class="m">v = (3, 1, 2)</span> — 球はまさにこのステップを歩きます:</p><p class="matline"><span class="m">exp<sub>p</sub>(v) = (−2, 1, −1) + (3, 1, 2) = (1, 2, 1)</span></p><p>だからここではステップが「ただの足し算」— 成分ごとの足し算です。曲がった世界でも定義は<em>まったく同じ</em>で、測地線が弧になるだけ: <span class="m">SO(3)</span> では <span class="m">exp</span> は行列指数関数で、<span class="m">+</span> は <span class="m">⊞</span> になります。</p><div class="bubble" id="gfExpNote" role="dialog" aria-label="なぜ exp か" hidden><p><span class="m">exp</span> は<em>指数関数</em>です。実数の <span class="m">e<sup>x</sup></span> のべき級数:</p><p class="matline"><span class="m">e<sup>x</sup> = 1 + x + <span class="frac"><span>x<sup>2</sup></span><span>2!</span></span> + <span class="frac"><span>x<sup>3</sup></span><span>3!</span></span> + …</span></p><p>同じ級数はベクトルや行列にも効きます。鍵になる性質:</p><p class="matline"><span class="m">e<sup>a+b</sup> = e<sup>a</sup> · e<sup>b</sup></span></p><p>つまり<strong>足し算を掛け算</strong>（変換の合成）へ移します。接ベクトルは足し合わせるもの、<span class="m">exp</span> はそれを運動の合成へ運ぶものです。</p><p>具体的には、複利として（<span class="m">v</span> を <span class="m">n</span> 個の小さなステップに分ける — これが足し算です）:</p><p class="matline"><span class="m">exp(v) = lim<sub>n→∞</sub> (1 + <span class="frac"><span>v</span><span>n</span></span>)<sup>n</sup></span></p><p>平坦な空間では「掛け算」がそのまま足し算で、高次の項は消えるので <span class="m">exp(v) = v</span>、すなわち <span class="m">exp<sub>p</sub>(v) = p + v</span>。曲がった空間では項が消えず — そこで行列指数関数になります。</p></div><div class="bubble" id="gfGeoNote" role="dialog" aria-label="測地線とは" hidden><p>測地線は二点を結ぶ最短経路 — 曲がった空間の「直線」です。</p><p>平坦な <span class="m">ℝ<sup>n</sup></span> では線分、球面では大円の弧、<span class="m">SO(3)</span> では軸を固定した回転。<span class="m">exp<sub>p</sub></span> はつねに測地線に沿って、単位時間だけ進みます。</p></div>'}
      ]
    }
  };
})();
