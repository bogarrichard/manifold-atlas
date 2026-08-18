'use strict';
/* Journey (prototype): gradient descent — the Optimization planet's "start here" moon.
   A concrete quadratic cost L(w) = ½ wᵀQ w with Q = 0.64·I in flat ℝ², the exact bowl
   that's drawn; the gradient ∇L = Qw and the update w ← (I − αQ)w derived in the cards,
   and the animated iterates (2.70,1.90) → (2.22,1.56) → … are literally the numbers the
   text works out. The longer matrix derivations (why a quadratic form; the least-squares
   gradient) sit in inline-link footnote panels at the foot of the card. The flat "engine"
   that Riemannian GD later lifts onto a curved manifold. Aimed at an undergraduate EE/CS
   reader (see CLAUDE.md). Self-contained (cards bilingual, in-file); same descriptor shape
   as so3-optimization. Requires LIE.kit. */
window.LIE = window.LIE || {};
LIE.journeys = LIE.journeys || {};
LIE.journeys['optimization-gd'] = (function(){
  const K = LIE.kit;
  const { V3, ease, clamp, hexStr, fatArrow, setArrow, makeLabel } = K;

  const SP  = [V3(0,0,0), V3(44,5,-12), V3(88,-4,10)];
  const OFF = [V3(0,3.0,8.8), V3(0,2.6,8.0), V3(0,3.2,9.2)];

  // The drawn bowl is the graph of the cost: H(x,z) = 0.32·(x²+z²) = ½ wᵀQ w with
  // Q = 0.64·I. So ∇L = Qw = 0.64·w, and one GD step multiplies w by (1 − α·0.64).
  const Q = 0.64, ALPHA = 0.28, SHRINK = 1 - ALPHA*Q;   // = 0.8208

  function build(C, PAL){
    const COL = PAL || K.palette('dark');
    const HX = { amber:hexStr(COL.amber), coral:hexStr(COL.coral),
                 teal:hexStr(COL.teal), green:hexStr(COL.green), ink:hexStr(COL.ink) };
    const H = (x,z)=>0.5*Q*(x*x+z*z);

    function bowl(g){
      const geo=new THREE.PlaneGeometry(7.4,7.4,30,30); geo.rotateX(-Math.PI/2);
      const pa=geo.attributes.position;
      for(let i=0;i<pa.count;i++) pa.setY(i, H(pa.getX(i), pa.getZ(i)));
      geo.computeVertexNormals();
      g.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({color:COL.teal,wireframe:true,transparent:true,opacity:0.28})));
      const grid=new THREE.GridHelper(7.4,14,COL.grid1,COL.grid2); grid.position.y=-0.02; g.add(grid);
      const minDot=new THREE.Mesh(new THREE.SphereGeometry(0.11,14,12), new THREE.MeshBasicMaterial({color:COL.green}));
      minDot.position.set(0, H(0,0)+0.02, 0); g.add(minDot);
      return minDot;
    }
    function wireBubble(infoId, popId){
      const info=document.getElementById(infoId), pop=document.getElementById(popId);
      if(!info || !pop) return;
      info.onclick=e=>{
        e.stopPropagation();
        const willOpen = pop.hidden;
        document.querySelectorAll('.pop:not([hidden]), .bubble:not([hidden])').forEach(o=>{
          if(o!==pop){ o.hidden=true; const t=document.querySelector('[aria-controls="'+o.id+'"]'); if(t) t.setAttribute('aria-expanded','false'); }
        });
        pop.hidden=!willOpen; info.setAttribute('aria-expanded', willOpen?'true':'false');
      };
    }

    const stations = [
      // 0 · the cost surface L(w) — a concrete quadratic bowl in flat space
      g=>{
        bowl(g);
        const ball=new THREE.Mesh(new THREE.SphereGeometry(0.14,16,12), new THREE.MeshBasicMaterial({color:COL.amber}));
        g.add(ball);
        const lbl=makeLabel('L(w)', HX.ink, 2.0); lbl.position.set(0,3.3,0); g.add(lbl);
        return {tick(t){
          const a=t*0.5, px=Math.cos(a)*2.6, pz=Math.sin(a)*2.6;
          ball.position.set(px, H(px,pz)+0.14, pz);
        }};
      },
      // 1 · the gradient (uphill) and the descent step −α∇L (downhill)
      g=>{
        bowl(g);
        const p=V3(2.4, 0, 1.5);
        const ball=new THREE.Mesh(new THREE.SphereGeometry(0.15,16,12), new THREE.MeshBasicMaterial({color:COL.amber}));
        ball.position.set(p.x, H(p.x,p.z)+0.15, p.z); g.add(ball);
        const up=fatArrow(COL.coral,0.05), dn=fatArrow(COL.teal,0.055); g.add(up); g.add(dn);
        const l1=makeLabel('∇L = Q w', HX.coral, 2.4), l2=makeLabel('−α∇L', HX.teal, 2.2); g.add(l1); g.add(l2);
        // grad points "uphill" in the xz-plane; lay both arrows tangent to the ground plane
        const gdir=V3(p.x,0,p.z).normalize();
        return {tick(){
          const bp=ball.position;
          setArrow(up, bp, gdir.clone().multiplyScalar(1.6));
          setArrow(dn, bp, gdir.clone().multiplyScalar(-1.4));
          l1.position.copy(bp).add(gdir.clone().multiplyScalar(1.9)).add(V3(0,0.35,0));
          l2.position.copy(bp).add(gdir.clone().multiplyScalar(-1.7)).add(V3(0,0.35,0));
        }};
      },
      // 2 · the iteration w ← (I − αQ)w, rolling into the minimum, leaving a trail
      g=>{
        bowl(g);
        const path=[]; let x=2.7, z=1.9;
        for(let k=0;k<16;k++){ path.push(V3(x, H(x,z)+0.13, z)); x*=SHRINK; z*=SHRINK; }
        const N=path.length;
        const ball=new THREE.Mesh(new THREE.SphereGeometry(0.14,16,12), new THREE.MeshBasicMaterial({color:COL.amber})); g.add(ball);
        const trail=new THREE.Group(); g.add(trail);
        const dots=path.map(pt=>{
          const d=new THREE.Mesh(new THREE.SphereGeometry(0.055,10,8),
            new THREE.MeshBasicMaterial({color:COL.violet2,transparent:true,opacity:0.7}));
          d.position.copy(pt); d.visible=false; trail.add(d); return d;
        });
        const arr=fatArrow(COL.coral,0.045); g.add(arr);
        const lbl=makeLabel('w − α∇L', HX.coral, 2.8); lbl.position.set(0,3.3,0); g.add(lbl);
        return {tick(t){
          const cyc=(t*1.1)%(N+3), k=Math.floor(cyc);
          const shown=Math.min(k, N-1);
          dots.forEach((d,i)=>d.visible = i<=shown);
          if(k>=N-1){ ball.position.copy(path[N-1]); arr.visible=false; return; }
          const f=ease(clamp(cyc-k,0,1));
          ball.position.lerpVectors(path[k], path[k+1], f);
          const d=V3(path[k+1].x-path[k].x, 0, path[k+1].z-path[k].z), L=d.length();
          if(L>0.02) setArrow(arr, ball.position, d.normalize().multiplyScalar(0.6)); else arr.visible=false;
        }};
      }
    ];

    function bindCard(i){
      wireBubble('ogQuadInfo','ogQuadNote');   // card 0 · footnote
      wireBubble('ogLsqInfo','ogLsqNote');       // card 1 · footnote
    }

    return { stations, bindCard };
  }

  return {
    id: 'optimization-gd',
    tier: 'optimization',
    layout: { SP, OFF },
    threadKey: 'amber',
    // Curriculum position, as data rather than prose: `next` is the following moon in
    // hub.js's BRANCHES order (crossing into the next branch at a branch end), `handoffs`
    // are the topical pointers this journey's cards name, `requires` the hard
    // back-references its opening card makes. engine.js renders next+handoffs as links
    // on the last station; check.html verifies every id resolves and that the next-chain
    // still agrees with BRANCHES.
    seq: { next: 'optimization-gn', requires: [], handoffs: ['so3-optimization'] },
    build,
    cards: {
      hu: [
        {t:'A völgy', b:'<p>Minimalizáljuk a</p><p class="matline"><span class="m">L(w) = <span class="frac"><span>1</span><span>2</span></span> w<sup>⊤</sup>Q w</span></p><p class="matline"><span class="m">Q =</span><span class="matrix"><span class="mbracket"></span><span class="mgrid" style="grid-template-columns:repeat(2,auto)"><span>0.64</span><span>0</span><span>0</span><span>0.64</span></span><span class="mbracket right"></span></span></p><p><button class="termbtn" id="ogQuadInfo" type="button" aria-expanded="false" aria-controls="ogQuadNote">kvadratikus</button> völgyet a lapos <span class="m">w ∈ ℝ<sup>2</sup></span> fölött. A borostyán gömb a jelenlegi <span class="m">w</span>, a zöld pont a minimum (<span class="m">w<sub>*</sub> = 0</span>). Ugyanez a legkisebb négyzetek völgye is, ahol <span class="m">Q = A<sup>⊤</sup>A</span>. Sokaság nincs — minden a lapos <span class="m">ℝ<sup>2</sup></span>-ben történik.</p><div class="bubble" id="ogQuadNote" role="dialog" aria-label="Miert negyzetes alak" hidden><p>Skalár eset: egy változóra a völgy <span class="m">L(w) = <span class="frac"><span>1</span><span>2</span></span> q w<sup>2</sup></span>, a deriváltja <span class="m">q w</span>.</p><p>Több változóra a <span class="m">w<sup>2</sup></span> helyére a <span class="m">w<sup>⊤</sup>Q w</span> lép — ez a <em>négyzetes alak</em>:</p><p class="matline"><span class="m">w<sup>⊤</sup>Q w = Σ<sub>i,j</sub> w<sub>i</sub> Q<sub>ij</sub> w<sub>j</sub></span></p><p>A mi <span class="m">Q = 0.64·I</span> mátrixunkkal csak az átlós tagok maradnak, <span class="m">0.64 (w<sub>1</sub><sup>2</sup> + w<sub>2</sub><sup>2</sup>)</span>. A derivált a skalár <span class="m">q w</span> mátrixos párja: <span class="m">∇L = Q w</span>.</p></div>'},
        {t:'A gradiens', b:'<p>A gradiens a kvadratikus alakból közvetlenül adódik:</p><p class="matline"><span class="m">∇L(w) = Q w = 0.64 · w</span></p><p>Ez a legmeredekebb <em>emelkedő</em> iránya (korall nyíl). Lefelé a mínusza visz, és ez a lépés: <span class="m">−α∇L</span> (teál). Az <span class="m">α</span> a tanulási ráta — mekkorát lépünk a negatív gradiens mentén. Általános <button class="termbtn" id="ogLsqInfo" type="button" aria-expanded="false" aria-controls="ogLsqNote">legkisebb négyzeteknél</button> <span class="m">∇L = A<sup>⊤</sup>(Aw − b)</span> — ugyanez az alak.</p><div class="bubble" id="ogLsqNote" role="dialog" aria-label="Legkisebb negyzetek gradiense" hidden><p>A legkisebb négyzetek a <span class="m">r = Aw − b</span> reziduum hosszának négyzetét minimalizálják:</p><p class="matline"><span class="m">L(w) = <span class="frac"><span>1</span><span>2</span></span> ‖Aw − b‖<sup>2</sup> = <span class="frac"><span>1</span><span>2</span></span> (Aw − b)<sup>⊤</sup>(Aw − b)</span></p><p>Kifejtve, a <span class="m">(Aw)<sup>⊤</sup>b = w<sup>⊤</sup>A<sup>⊤</sup>b</span> azonossággal:</p><p class="matline"><span class="m">L = <span class="frac"><span>1</span><span>2</span></span> w<sup>⊤</sup>A<sup>⊤</sup>A w − w<sup>⊤</sup>A<sup>⊤</sup>b + <span class="frac"><span>1</span><span>2</span></span> b<sup>⊤</sup>b</span></p><p>A gradiens (épp a fenti négyzetes alak, <span class="m">Q = A<sup>⊤</sup>A</span>):</p><p class="matline"><span class="m">∇L = A<sup>⊤</sup>A w − A<sup>⊤</sup>b = A<sup>⊤</sup>(Aw − b)</span></p></div>'},
        {t:'Az iteráció', b:'<p>A frissítést behelyettesítve zárt alak marad:</p><p class="matline"><span class="m">w<sub>k+1</sub> = w<sub>k</sub> − α∇L(w<sub>k</sub>) = (I − αQ) w<sub>k</sub> = 0.82 · w<sub>k</sub></span></p><p>itt <span class="m">α = 0.28</span>. A hiba tehát mértani sorként fogy, <span class="m">w<sub>k</sub> = 0.82<sup>k</sup> · w<sub>0</sub></span> — a gömb, amit látsz, pontosan ezt járja be, <span class="m">w<sub>0</sub> = (2.7, 1.9)</span>-ből:</p><p class="matline"><span class="m">(2.70, 1.90) → (2.22, 1.56) → (1.82, 1.28) → … → 0</span></p><p>Ez a lapos motor. A <em>Riemann-gradiens</em> pontosan ezt emeli a görbült <span class="m">SO(3)</span>-ra: érintősík + vetítés + <span class="m">exp</span>.</p>'}
      ],
      en: [
        {t:'The Valley', b:'<p>We minimize the</p><p class="matline"><span class="m">L(w) = <span class="frac"><span>1</span><span>2</span></span> w<sup>⊤</sup>Q w</span></p><p class="matline"><span class="m">Q =</span><span class="matrix"><span class="mbracket"></span><span class="mgrid" style="grid-template-columns:repeat(2,auto)"><span>0.64</span><span>0</span><span>0</span><span>0.64</span></span><span class="mbracket right"></span></span></p><p><button class="termbtn" id="ogQuadInfo" type="button" aria-expanded="false" aria-controls="ogQuadNote">quadratic</button> valley over flat <span class="m">w ∈ ℝ<sup>2</sup></span>. The amber sphere is the current <span class="m">w</span>, the green dot the minimum (<span class="m">w<sub>*</sub> = 0</span>). This is also the least-squares valley, where <span class="m">Q = A<sup>⊤</sup>A</span>. No manifold — it all happens in flat <span class="m">ℝ<sup>2</sup></span>.</p><div class="bubble" id="ogQuadNote" role="dialog" aria-label="Why a quadratic form" hidden><p>Scalar case: for one variable the valley is <span class="m">L(w) = <span class="frac"><span>1</span><span>2</span></span> q w<sup>2</sup></span>, with derivative <span class="m">q w</span>.</p><p>For several variables, <span class="m">w<sup>2</sup></span> becomes <span class="m">w<sup>⊤</sup>Q w</span> — the <em>quadratic form</em>:</p><p class="matline"><span class="m">w<sup>⊤</sup>Q w = Σ<sub>i,j</sub> w<sub>i</sub> Q<sub>ij</sub> w<sub>j</sub></span></p><p>With our <span class="m">Q = 0.64·I</span> only the diagonal terms survive, <span class="m">0.64 (w<sub>1</sub><sup>2</sup> + w<sub>2</sub><sup>2</sup>)</span>. The derivative is the matrix analogue of the scalar <span class="m">q w</span>: <span class="m">∇L = Q w</span>.</p></div>'},
        {t:'The Gradient', b:'<p>The gradient follows directly from the quadratic form:</p><p class="matline"><span class="m">∇L(w) = Q w = 0.64 · w</span></p><p>This is the direction of steepest <em>ascent</em> (coral arrow). Downhill is its negative, and that is the step: <span class="m">−α∇L</span> (teal). <span class="m">α</span> is the learning rate — how far we move along the negative gradient. For general <button class="termbtn" id="ogLsqInfo" type="button" aria-expanded="false" aria-controls="ogLsqNote">least squares</button> <span class="m">∇L = A<sup>⊤</sup>(Aw − b)</span> — the same shape.</p><div class="bubble" id="ogLsqNote" role="dialog" aria-label="Least-squares gradient" hidden><p>Least squares minimizes the squared length of the residual <span class="m">r = Aw − b</span>:</p><p class="matline"><span class="m">L(w) = <span class="frac"><span>1</span><span>2</span></span> ‖Aw − b‖<sup>2</sup> = <span class="frac"><span>1</span><span>2</span></span> (Aw − b)<sup>⊤</sup>(Aw − b)</span></p><p>Expanding, using the identity <span class="m">(Aw)<sup>⊤</sup>b = w<sup>⊤</sup>A<sup>⊤</sup>b</span>:</p><p class="matline"><span class="m">L = <span class="frac"><span>1</span><span>2</span></span> w<sup>⊤</sup>A<sup>⊤</sup>A w − w<sup>⊤</sup>A<sup>⊤</sup>b + <span class="frac"><span>1</span><span>2</span></span> b<sup>⊤</sup>b</span></p><p>The gradient (exactly the quadratic form above, with <span class="m">Q = A<sup>⊤</sup>A</span>):</p><p class="matline"><span class="m">∇L = A<sup>⊤</sup>A w − A<sup>⊤</sup>b = A<sup>⊤</sup>(Aw − b)</span></p></div>'},
        {t:'The Iteration', b:'<p>Substituting the update leaves a closed form:</p><p class="matline"><span class="m">w<sub>k+1</sub> = w<sub>k</sub> − α∇L(w<sub>k</sub>) = (I − αQ) w<sub>k</sub> = 0.82 · w<sub>k</sub></span></p><p>with <span class="m">α = 0.28</span>. The error therefore decays as a geometric series, <span class="m">w<sub>k</sub> = 0.82<sup>k</sup> · w<sub>0</sub></span> — the sphere you see walks exactly this, starting from <span class="m">w<sub>0</sub> = (2.7, 1.9)</span>:</p><p class="matline"><span class="m">(2.70, 1.90) → (2.22, 1.56) → (1.82, 1.28) → … → 0</span></p><p>This is the flat engine. The <em>Riemannian gradient</em> lifts exactly this onto the curved <span class="m">SO(3)</span>: tangent plane + projection + <span class="m">exp</span>.</p>'}
      ],
      ja: [
        {t:'谷', b:'<p>最小化するのは</p><p class="matline"><span class="m">L(w) = <span class="frac"><span>1</span><span>2</span></span> w<sup>⊤</sup>Q w</span></p><p class="matline"><span class="m">Q =</span><span class="matrix"><span class="mbracket"></span><span class="mgrid" style="grid-template-columns:repeat(2,auto)"><span>0.64</span><span>0</span><span>0</span><span>0.64</span></span><span class="mbracket right"></span></span></p><p>という、平坦な <span class="m">w ∈ ℝ<sup>2</sup></span> の上の<button class="termbtn" id="ogQuadInfo" type="button" aria-expanded="false" aria-controls="ogQuadNote">二次</button>の谷です。琥珀色の球が現在の <span class="m">w</span>、緑の点が最小値（<span class="m">w<sub>*</sub> = 0</span>）。これは最小二乗法の谷でもあり、そのとき <span class="m">Q = A<sup>⊤</sup>A</span> です。多様体はありません — すべては平坦な <span class="m">ℝ<sup>2</sup></span> の中で起こります。</p><div class="bubble" id="ogQuadNote" role="dialog" aria-label="なぜ二次形式か" hidden><p>スカラーの場合: 変数が一つなら谷は <span class="m">L(w) = <span class="frac"><span>1</span><span>2</span></span> q w<sup>2</sup></span>、その微分は <span class="m">q w</span> です。</p><p>変数が増えると <span class="m">w<sup>2</sup></span> の代わりに <span class="m">w<sup>⊤</sup>Q w</span> が来ます — これが<em>二次形式</em>です:</p><p class="matline"><span class="m">w<sup>⊤</sup>Q w = Σ<sub>i,j</sub> w<sub>i</sub> Q<sub>ij</sub> w<sub>j</sub></span></p><p>ここでの <span class="m">Q = 0.64·I</span> では対角項だけが残り、<span class="m">0.64 (w<sub>1</sub><sup>2</sup> + w<sub>2</sub><sup>2</sup>)</span> になります。微分はスカラーの <span class="m">q w</span> の行列版: <span class="m">∇L = Q w</span>。</p></div>'},
        {t:'勾配', b:'<p>勾配は二次形式から直ちに出ます:</p><p class="matline"><span class="m">∇L(w) = Q w = 0.64 · w</span></p><p>これが最も急な<em>上り</em>の方向（珊瑚色の矢印）です。下りはその符号を反転したもので、それがステップ <span class="m">−α∇L</span>（青緑）です。<span class="m">α</span> は学習率 — 負の勾配に沿ってどれだけ進むか。一般の<button class="termbtn" id="ogLsqInfo" type="button" aria-expanded="false" aria-controls="ogLsqNote">最小二乗</button>では <span class="m">∇L = A<sup>⊤</sup>(Aw − b)</span> — 同じ形です。</p><div class="bubble" id="ogLsqNote" role="dialog" aria-label="最小二乗の勾配" hidden><p>最小二乗は残差 <span class="m">r = Aw − b</span> の長さの二乗を最小化します:</p><p class="matline"><span class="m">L(w) = <span class="frac"><span>1</span><span>2</span></span> ‖Aw − b‖<sup>2</sup> = <span class="frac"><span>1</span><span>2</span></span> (Aw − b)<sup>⊤</sup>(Aw − b)</span></p><p><span class="m">(Aw)<sup>⊤</sup>b = w<sup>⊤</sup>A<sup>⊤</sup>b</span> を使って展開すると:</p><p class="matline"><span class="m">L = <span class="frac"><span>1</span><span>2</span></span> w<sup>⊤</sup>A<sup>⊤</sup>A w − w<sup>⊤</sup>A<sup>⊤</sup>b + <span class="frac"><span>1</span><span>2</span></span> b<sup>⊤</sup>b</span></p><p>勾配は（まさに上の二次形式で <span class="m">Q = A<sup>⊤</sup>A</span> としたもの）:</p><p class="matline"><span class="m">∇L = A<sup>⊤</sup>A w − A<sup>⊤</sup>b = A<sup>⊤</sup>(Aw − b)</span></p></div>'},
        {t:'反復', b:'<p>更新式を代入すると、閉じた形が残ります:</p><p class="matline"><span class="m">w<sub>k+1</sub> = w<sub>k</sub> − α∇L(w<sub>k</sub>) = (I − αQ) w<sub>k</sub> = 0.82 · w<sub>k</sub></span></p><p>ここで <span class="m">α = 0.28</span>。したがって誤差は等比数列として減り、<span class="m">w<sub>k</sub> = 0.82<sup>k</sup> · w<sub>0</sub></span> — 見えている球は <span class="m">w<sub>0</sub> = (2.7, 1.9)</span> から、まさにこれをたどります:</p><p class="matline"><span class="m">(2.70, 1.90) → (2.22, 1.56) → (1.82, 1.28) → … → 0</span></p><p>これが平坦なエンジンです。<em>リーマン勾配</em>は、まさにこれを曲がった <span class="m">SO(3)</span> の上へ持ち上げます: 接平面 + 射影 + <span class="m">exp</span>。</p>'}
      ]
    }
  };
})();
