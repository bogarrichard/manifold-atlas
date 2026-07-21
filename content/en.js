/* English content for the Lie journey.
   Adding a language: copy this file (e.g. de.js), translate the strings, change the
   `LIE_CONTENT.en` key to the language code, and link it in index.html.
   Do NOT change the ids (expn, expsl, s5step, s5reset, s5ph, s5it, s5L) or the HTML
   structure — the engine relies on them. Translate only the visible text. */
window.LIE_CONTENT = window.LIE_CONTENT || {};
window.LIE_CONTENT.en = {
  meta: {
    htmlLang: 'en',
    langLabel: 'English',
    flag: '🇬🇧',
    title: 'Lie journey — from flat gradients to SE(3) poses'
  },
  ui: {
    stationWord: 'station',
    prevAria: 'Previous station',
    nextAria: 'Next station',
    langMenuLabel: 'Language',
    theme: { label: 'Theme', system: 'system', light: 'light', dark: 'dark' },
    hint: ['drag: look around', 'scroll: zoom', '← → : travel'],
    noscript: 'This interactive visualization requires JavaScript and WebGL. Please enable them in your browser.'
  },
  // Floating 3D labels in the scene.
  labels: {
    bowl_step: 'w − α∇L',
    s2_exit: 'R + δ — exits',
    s2_orthonormal: 'R^T R = I',
    s2_retract: 'retraction: ‖·‖ = 1',
    s3_raw: 'raw gradient',
    s3_proj: 'projected (tangent)',
    s3_drop: 'discarded',
    s4_n_prefix: 'n = ',
    s4_err: 'radial error',
    s4_exp: 'exp(v)',
    s6_deg_suffix: '°',
    s6_identified: 'antipodal points identified',
    s6_cross_prefix: 'crossings: ',
    s6_cross_sep: ' — ',
    s6_even: 'even',
    s6_odd: 'odd',
    s7_dof: 'T ∈ SE(3) — 6 DoF'
  },
  // Beat captions for the "iteration" station (6th).
  s5: {
    phases: ['1/3 · tangent plane', '2/3 · exp arc', '3/3 · step ⊞'],
    phaseText: [
      'anchor at the estimate — δ = 0',
      'tangent plane + projected gradient at the anchor',
      'the flat step wrapped into an arc — exp(δ)'
    ],
    // Live formula shown under the buttons, one per phase (math only, language-neutral).
    phaseMath: [
      'x ⊞ 0 = x',
      'δ = −α · P<sub>x</sub>(∇L)',
      'x ⊞ δ = x · exp(δ<sup>∧</sup>)'
    ]
  },
  cards: [
   {t:'The Journey', b:'<p>Five conversations’ worth of derivation, in a single space. Eight stations: from the flat world you know from deep learning, all the way to <span class="m">SE(3)</span> poses. The violet thread is the line of thought — you’ll see it as you fly between the stations.</p><p>Navigation: ← → buttons or keys, drag with the mouse to look around, scroll to zoom.</p>'},
   {t:'The Flat World', b:'<p>The familiar recipe: the parameter space is <span class="m">ℝⁿ</span>, the cost is a valley, and the <span class="m">w − α∇L</span> step always stays valid — there is nowhere to step off to. The gradient lives in the same space as the point.</p><p>This is the recipe we want to carry over into the curved world.</p>'},
   {t:'The Constraint', b:'<p>With respect to what do we differentiate? Along a motion <span class="m">R(t)</span>, with respect to time: <span class="m">Ṙ</span> is 9 scalar derivatives, entry by entry. Differentiating the constraint gives <span class="m">Ṙ<sup>⊤</sup>R + R<sup>⊤</sup>Ṙ = 0</span> — that is, <span class="m">R<sup>⊤</sup>Ṙ</span> is skew-symmetric, and the legal velocities lie in the tangent to the surface.</p><p>The raw gradient does not know this: the columns of the <span class="m">R + δ</span> step (red) are no longer unit-length nor pairwise orthogonal — <span class="m">R<sup>⊤</sup>R ≠ I</span>, so the result is not a rotation.</p><p>The teal dot is the naive fix: a radial retraction (we normalize the length). Careful — this is enough for the sphere picture, but <em>not</em> for real <span class="m">SO(3)</span>: it corrects one column’s length, but does not restore the <em>pairwise orthogonality</em> of the three columns. The full fix is Gram–Schmidt or exp — the latter being the geodesic, “noble” version that stays on the surface from the outset.</p>'},
   {t:'The Tangent Space — The Projection', b:'<p>The first half of the solution: at the point we span the tangent plane, the best flat approximation. The rotating coral vector is the raw gradient — “which way would the error grow if I could step freely in any direction”. It generally also points outward, off the sphere. We decompose it: the part perpendicular to the surface (red) leads in a forbidden direction, so we <em>discard</em> it; the part lying in the plane (teal) is where we can <em>actually</em> step on the sphere.</p><p>Why “Riemann”? He was the one who realized that on a curved surface you need not step out into the ambient space to measure distance and angle — it is enough to look at the directions that stay on the surface. The teal shadow is thus the true “downhill” <em>within the surface</em>: this is what we call the Riemannian gradient. The red, upward-pointing part is only an illusion of the flat outside world; to an inhabitant of the sphere it does not exist.</p>'},
   {t:'exp — Compound Interest', b:'<p>The second half: the flat step has to be wrapped back onto the surface. <span class="m">n</span> small steps — each along the momentary tangent — as compound interest: <span class="m">(1 + <span class="frac"><span>v</span><span>n</span></span>)<sup>n</sup> → exp(v)</span>. For small <span class="m">n</span> the amber chain strains outward — the red dashes are the radial error —, for large <span class="m">n</span> it hugs the violet arc: the error is second-order and dies off in the limit.</p><p>And the match written out, on the sphere: <span class="m">exp<sub>p</sub>(v) = cos θ · p + sin θ · v̂</span>, where <span class="m">θ = |v|</span> — the same cos/sin form as in Euler’s formula and the Rodrigues formula.</p><div class="acts" style="align-items:center"><span class="m" style="min-width:56px">n = <b id="expn" style="font-style:normal;color:var(--amber)">1</b></span><input type="range" id="expsl" min="1" max="40" value="1" style="flex:1;min-width:120px"></div>'},
   {t:'The Iteration', b:'<p>The machine, driven beat by beat. The colors are the cost (warm = large error), the green dot is the minimum. The button walks through one iteration in three beats: tangent plane and projected gradient → exp arc → displacement and a new anchor.</p><div class="acts"><button class="act" id="s5step">1/3 · tangent plane</button><button class="act" id="s5reset">Reset</button></div><div class="s5math" id="s5math"></div><div class="ro" id="s5ph">anchor at the estimate — δ = 0</div><div class="ro">iteration: <b id="s5it">0</b> &nbsp;·&nbsp; L = <b id="s5L">—</b></div><div class="s5foot"><button class="s5info" id="s5deltainfo" type="button" aria-expanded="false" aria-controls="s5deltabubble">What is δ? <span class="ic">ⓘ</span></button><div class="bubble" id="s5deltabubble" role="dialog" aria-label="What is δ" hidden><p>The step on the tangent plane, <em>three ordinary numbers</em>: <span class="m">δ = (δ<sub>x</sub>, δ<sub>y</sub>, δ<sub>z</sub>)</span> — how much to turn about each axis. The “hat” <span class="m">δ<sup>∧</sup></span> arranges these three numbers into a skew-symmetric matrix so that exp can take them in:</p><p class="matline"><span>δ<sup>∧</sup> =</span><span class="matrix"><span class="mbracket"></span><span class="mgrid"><span>0</span><span>−δ<sub>z</sub></span><span>δ<sub>y</sub></span><span>δ<sub>z</sub></span><span>0</span><span>−δ<sub>x</sub></span><span>−δ<sub>y</sub></span><span>δ<sub>x</sub></span><span>0</span></span><span class="mbracket right"></span></span></p><p>So <span class="m">⊞</span> is entirely concrete: <span class="m">x ⊞ δ := x · exp(δ<sup>∧</sup>)</span> — a generalization of ordinary <span class="m">+</span>. In flat space point + vector = point; here manifold point + tangent vector = manifold point. At the end of every round <span class="m">δ</span> resets to zero: we spread the map out afresh at the new estimate.</p></div></div>'},
   {t:'The True Shape of SO(3)', b:'<p>A point inside the ball = axis·angle: the direction is the rotation axis, the distance from the center is the angle, the boundary is 180°. Antipodal boundary points are the <em>same</em> rotation — they are identified, which is why the wanderer “jumps across”.</p><p>The wanderer travels 720°. The first loop (amber) crosses the boundary once — an odd number of crossings: such a loop cannot be contracted. With the second loop (teal) the number of crossings turns even: an even loop can be contracted. This is the content of <span class="m">π₁ = ℤ/2</span> — only the parity of the crossings matters, and this is the mathematics of the plate/belt trick: 360° leaves a twist, 720° unwinds.</p>'},
   {t:'SE(3) — A Pose in Time', b:'<p>Rotation + translation = pose: 6 degrees of freedom, a moving frame along the path. <span class="m">⊞</span> is the same recipe, only the tangent space is <span class="m">ℝ⁶</span>: three angles, three translations.</p><p>This is where SLAM begins: many such poses linked by factors, with the previous station’s iteration running on them. (The subtlety between <span class="m">v</span> and the actual <span class="m">t</span> — the left Jacobian — is the next chapter.)</p>'}
  ]
};
