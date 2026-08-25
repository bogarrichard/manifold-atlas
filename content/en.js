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
    title: 'Manifold Atlas — from flat gradients to SE(3) poses'
  },
  ui: {
    stationWord: 'station',
    prevAria: 'Previous station',
    nextAria: 'Next station',
    hubBackAria: 'Back to the hub',
    // the last card's link block, built from the journey descriptor's `seq`
    nextStop: 'continue',
    nextMoon: 'next moon',
    alsoSee: 'related',
    whatNextAria: 'Where to go next',
    langMenuLabel: 'Language',
    menuLabel: 'Menu',
    controlsLabel: 'Controls',
    theme: { label: 'Theme', system: 'system', light: 'light', dark: 'dark' },
    textSize: { label: 'Text size', default: 'default', small: 'small', smaller: 'smaller' },
    /* Read-aloud (Web Speech API). `symbols` is the pronunciation dictionary the
       extractor in engine.js applies to card text: a synthesizer either skips these
       glyphs silently or names them in Unicode-ese ("black-letter capital R"), so the
       reading has to be spelled out here — and it is language-specific, like every
       other string in this pack. */
    speech: {
      label: 'Read aloud', off: 'off', auto: 'each station',
      playAria: 'Read this station aloud', stopAria: 'Stop reading',
      voiceLabel: 'Voice', network: 'network',
      supWord: 'to the power of', subWord: 'sub',
      matrix: 'a {r} by {c} matrix', vector: 'a column vector of {r} entries',
      symbols: {
        'ℝ':'R', 'ℤ':'Z', 'ẏ':'y dot', 'ℂ':'C', '\u0307':'dot', 'Ṙ':'R dot', '𝔰𝔢':'s e', '𝔰𝔦𝔪':'sim',
        '−':'minus', '→':'to', '←':'from', '↦':'maps to', '⟼':'maps to',
        '⟹':'implies', '⟺':'if and only if', '∝':'is proportional to',
        'θ':'theta', 'δ':'delta', 'ω':'omega', 'λ':'lambda', 'φ':'phi', 'ρ':'rho',
        'α':'alpha', 'ξ':'xi', 'σ':'sigma', 'γ':'gamma', 'π':'pi', 'τ':'tau',
        'β':'beta', 'μ':'mu', 'ζ':'zeta', 'Δ':'delta', 'Ω':'omega',
        'Σ':'the sum of', '∏':'the product of', '∫':'the integral of', '∂':'partial',
        '⊤':'transpose', '∧':'hat', '∨':'vee', '\u0302':'hat', '′':'prime',
        '⊞':'box-plus', '⊟':'box-minus', '∇':'gradient', '‖':'norm', '·':'times',
        '∈':'in', '⊂':'inside', '≈':'approximately', '≠':'is not equal to',
        '≅':'is isomorphic to', '≤':'at most', '≥':'at least',
        '√':'the square root of', '∞':'infinity', '°':'degrees', '½':'one half',
        '²':'squared', 'ⁿ':'to the n', '₀':'nought'
      }
    },
    hint: ['drag: look around', 'scroll: zoom', '← → : travel', '↓ Esc : hub'],
    noscript: 'This interactive visualization requires JavaScript and WebGL. Please enable them in your browser.'
  },
  hub: {
    eyebrow: 'star chart',
    branchWord: 'sector',
    title: 'Manifold Atlas',
    intro: '<p>Welcome aboard. One solar system orbits the central reference frame, its planets strung with worlds to land on in order. Start with <b>Geometry</b> and <b>Optimization</b>, then follow their paths to where they converge — that’s where the real payoff kicks in.</p><p>Hover a planet to see what it holds, or wind to one with <b>← →</b>. <b>↑</b> enters: you fly closer and its moons line up as a carousel, wound the same way, with the selected moon’s abstract appearing here. Click the moon at the front, or press <b>↑</b> again, to land; <b>↓</b> always backs out one level — all the way to the map.</p><p>All twelve moons are open. The shorter ones run to three stations: they say less, but they say it completely — where a subject runs deeper, the last card says where it stops and which moon carries it on.</p>',
    hintSystem: ['drag: orbit', 'scroll: zoom', '← → : planets', '↑ ⏎ : enter · ↓ Esc : deselect'],
    hintPlanet: ['drag: orbit', 'scroll: zoom', '← → : moon ring', '↑ ⏎ : enter · ↓ Esc : exit'],
    moonWord: 'destination',
    enterAria: 'Enter',
    branches: {
      geometry: { title: 'Geometry', summary: '<p>The spaces things live in — rotations, poses, similarities — and how they move. Six journeys from flat ℝ<sup>n</sup> up to Sim(3): tangent spaces, exp/log, and (for SO(3)) topology. No cost function in sight.</p>',
        moons: {
          flat: { title: 'ℝⁿ — the flat space', summary: '<p>The flat base case: the space you already know. The tangent space <em>is</em> the space, the step is plain addition, and there is nowhere to step off to.</p><p>This is the yardstick every curved case gets measured against — which is why it is worth starting here.</p>' },
          so2: { title: 'SO(2) — rotation in the plane', summary: '<p>The first curved space, and the gentlest: it is <em>commutative</em>. There is no body/world distinction here yet.</p><p>That is exactly its use — when the distinction shows up in SO(3), you will know it came from non-commutativity, not from curvature.</p>' },
          se2: { title: 'SE(2) — motion in the plane', summary: '<p>Rotation and translation together, in two dimensions. The first case where the two components talk to each other.</p><p>This is where order starts to matter: rotate-then-translate is not translate-then-rotate.</p>' },
          so3: { title: 'SO(3) — rotations in 3D', summary: '<p>The space that justifies the whole theory. Non-commutative, compact, and its true shape is not a sphere but ℝP<sup>3</sup>.</p><p>The impossibility theorem lives here too: there is no global, singularity-free three-number coordinate — gimbal lock is a consequence, not an annoyance.</p>' },
          se3: { title: 'SE(3) — the pose', summary: '<p>Rotation + translation: 6 degrees of freedom, and the geometric skeleton of SLAM.</p><p>Ten stations: the pose/transformation duality, chaining reference frames, the order of R and t, the screw motion, the left Jacobian, the adjoint and interpolation.</p>' },
          sim3: { title: 'Sim(3) — similarity', summary: '<p>A seventh degree of freedom on top of the pose: scale.</p><p>In monocular SLAM this is exactly the uncertainty between two reconstructions — one rigid motion and one unknown magnification.</p>' }
        } },
      optimization: { title: 'Optimization', summary: '<p>How we minimize a cost: gradient descent, then Gauss–Newton, then the practical variants. All of it lives happily in flat ℝ<sup>n</sup> — no manifold required.</p>',
        moons: {
          gd: { title: 'Gradient descent', summary: '<p>The valley, the gradient and the iteration — all in flat ℝ<sup>2</sup>, worked through in closed form.</p><p>This is the engine the Riemannian gradient later lifts onto curved SO(3). First watch it run where nothing complicates it.</p>' },
          gn: { title: 'Gauss–Newton', summary: '<p>Linearize the residual, and see what falls out: <span class="m">H δ = −g</span>.</p><p>Not a recipe — the bottom of the parabola. And because it uses the curvature and not just the direction, it is far faster than gradient descent.</p>' },
          lm: { title: 'LM · robust', summary: '<p>When the Gauss–Newton step is too bold: damping by a λ that tunes between the two methods.</p><p>And robust kernels — because if the noise is not Gaussian, the sum of squares is not imprecise, it is the wrong objective.</p>' }
        } },
      slam: { title: 'SLAM', summary: '<p>Where geometry and optimization meet. Riemannian GD and factor graphs — the residuals and weights a SLAM problem is built from — converge here into full SLAM.</p>',
        moons: {
          riemann: { title: 'Riemannian GD', summary: '<p>The first real collision: flat gradient descent meets curved SO(3).</p><p>The constraint, the projection of the raw gradient, exp as the way back onto the surface, and the iteration running on the manifold — the whole chain, in one arc.</p>' },
          fg: { title: 'Factor graphs', summary: '<p>The graph of the measurements: variable nodes and factor nodes. Not a separate formalism — <em>it is the picture of MAP estimation</em>.</p><p>And here is where it becomes clear why a large problem is solvable at all: the graph is sparse.</p>' },
          slam: { title: 'SLAM', summary: '<p>The whole chain at once: poses, landmarks, loop closure and scale.</p><p>Everything that ran on separate branches meets here — and the difficulties turn out not to add up, but to be consequences of the same few claims.</p>' }
        } }
    }
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
   {t:'The Reference Frame', b:'<p>Three mutually perpendicular unit axes — that is all a <em>reference frame</em> is. Every number written down in this journey is read off along the axes of one of them.</p><p>A <em>rotation</em> is what takes one frame to another. That is what the triad in the scene is doing: the space does not move, only where we read it from.</p><p>The whole journey grows out of a single question: <strong>how do we step a little way along a rotation</strong> and have the result still be a rotation? In flat space the question never comes up. Here it is the hard part.</p>'},
   {t:'The Flat World', b:'<p>The familiar recipe, in one paragraph: the parameter space is <span class="m">ℝ<sup>n</sup></span>, the cost is a valley, and the <span class="m">w − α∇L</span> step always stays valid — there is nowhere to step off to.</p><p>The <em>Geometry · ℝ<sup>n</sup></em> and <em>Optimization · gradient descent</em> journeys build this up properly. Only one thing from it matters here: <strong>the gradient lives in the same space as the point.</strong> That is exactly what breaks at the next station.</p>'},
   {t:'The Constraint', b:'<p>With respect to what do we differentiate? Along a motion <span class="m">R(t)</span>, with respect to time: <span class="m">Ṙ</span> is 9 scalar derivatives, entry by entry. Differentiating the constraint gives <span class="m">Ṙ<sup>⊤</sup>R + R<sup>⊤</sup>Ṙ = 0</span> — that is, <span class="m">R<sup>⊤</sup>Ṙ</span> is skew-symmetric, and the legal velocities lie in the tangent to the surface.</p><p>The raw gradient does not know this: the columns of the <span class="m">R + δ</span> step (red) are no longer unit-length nor pairwise orthogonal — <span class="m">R<sup>⊤</sup>R ≠ I</span>, so the result is not a rotation.</p><p>The green dot is the naive fix: a radial retraction (we normalize the length). Careful — this is enough for the sphere picture, but <em>not</em> for real <span class="m">SO(3)</span>: it corrects one column’s length, but does not restore the <em>pairwise orthogonality</em> of the three columns. The full fix is Gram–Schmidt or exp — the latter being the geodesic, “noble” version that stays on the surface from the outset.</p>'},
   {t:'The Projection — The Riemannian Gradient', b:'<p>The first half of the solution: at the point we span the tangent plane, the best flat approximation. The rotating orange vector is the raw gradient — “which way would the error grow if I could step freely in any direction”. It generally also points outward, off the sphere. We decompose it: the part perpendicular to the surface (red) leads in a forbidden direction, so we <em>discard</em> it; the part lying in the plane (green) is where we can <em>actually</em> step on the sphere.</p><p>Why “Riemann”? He was the one who realized that on a curved surface you need not step out into the ambient space to measure distance and angle — it is enough to look at the directions that stay on the surface. The green shadow is thus the true “downhill” <em>within the surface</em>: this is what we call the Riemannian gradient. The red, upward-pointing part is only an illusion of the flat outside world; to an inhabitant of the sphere it does not exist.</p>'},
   {t:'exp — Compound Interest', b:'<p>The second half: the flat step has to be wrapped back onto the surface. <span class="m">n</span> small steps — each along the momentary tangent — as compound interest: <span class="m">(1 + <span class="frac"><span>v</span><span>n</span></span>)<sup>n</sup> → exp(v)</span>. For small <span class="m">n</span> the yellow chain strains outward — the red dashes are the radial error —, for large <span class="m">n</span> it hugs the purple arc: the error is second-order and dies off in the limit.</p><p>And the match written out, on the sphere: <span class="m">exp<sub>p</sub>(v) = cos θ · p + sin θ · v̂</span>, where <span class="m">θ = |v|</span> — the same cos/sin form as in Euler’s formula and the Rodrigues formula.</p><div class="acts" style="align-items:center"><span class="m" style="min-width:56px">n = <b id="expn" style="font-style:normal;color:var(--amber)">1</b></span><input type="range" id="expsl" min="1" max="40" value="1" style="flex:1;min-width:120px"></div>'},
   {t:'The Iteration on the Manifold', b:'<p>The machine, driven beat by beat. The colors are the cost (warm = large error), the green dot is the minimum. The button walks through one iteration in three beats: tangent plane and projected gradient → exp arc → displacement and a new anchor.</p><div class="acts"><button class="act" id="s5step">1/3 · tangent plane</button><button class="act" id="s5reset">Reset</button></div><div class="s5math" id="s5math"></div><div class="ro" id="s5ph">anchor at the estimate — δ = 0</div><div class="ro">iteration: <b id="s5it">0</b> &nbsp;·&nbsp; L = <b id="s5L">—</b></div><div class="s5foot"><button class="s5info" id="s5deltainfo" type="button" aria-expanded="false" aria-controls="s5deltabubble">What is δ? <span class="ic">ⓘ</span></button><div class="bubble" id="s5deltabubble" role="dialog" aria-label="What is δ" hidden><p>The step on the tangent plane, <em>three ordinary numbers</em>: <span class="m">δ = (δ<sub>x</sub>, δ<sub>y</sub>, δ<sub>z</sub>)</span> — how much to turn about each axis. The “hat” <span class="m">δ<sup>∧</sup></span> arranges these three numbers into a skew-symmetric matrix so that exp can take them in:</p><p class="matline"><span>δ<sup>∧</sup> =</span><span class="matrix"><span class="mbracket"></span><span class="mgrid"><span>0</span><span>−δ<sub>z</sub></span><span>δ<sub>y</sub></span><span>δ<sub>z</sub></span><span>0</span><span>−δ<sub>x</sub></span><span>−δ<sub>y</sub></span><span>δ<sub>x</sub></span><span>0</span></span><span class="mbracket right"></span></span></p><p>So <span class="m">⊞</span> is entirely concrete: <span class="m">x ⊞ δ := x · exp(δ<sup>∧</sup>)</span> — a generalization of ordinary <span class="m">+</span>. In flat space point + vector = point; here manifold point + tangent vector = manifold point. At the end of every round <span class="m">δ</span> resets to zero: we spread the map out afresh at the new estimate.</p><p>And the same single step, in four forms — the literature uses all four without flagging the switch. The <strong>rule</strong>: <span class="m">Ṙ = R Ω<sub>body</sub></span>. The <strong>measurement</strong>: <span class="m">Ṙ</span> itself, the velocity as seen from outside, contaminated by the pose. The <strong>solution</strong>: <span class="m">R(t+Δt) = R(t) exp(Δt Ω<sub>body</sub>)</span>. The <strong>packaging</strong>: <span class="m">R ⊞ (Δt Ω<sub>body</sub>)</span>. One object, four times — so <span class="m">⊞</span> is not a new operation but <em>the name of that integration</em>.</p><p>And why it is <span class="m">exp</span> in the third line — why that is a <em>theorem</em> rather than a definition — is derived on the <span class="m">ℝ<sup>n</sup></span> moon from three axioms: a zero step moves nothing, two steps compose, and <span class="m">δ</span> is the initial velocity. No other formula satisfies all three.</p></div></div>'},
   {t:'The True Shape of SO(3)', b:'<p>A point inside the ball = axis·angle: the direction is the rotation axis, the distance from the center is the angle, the boundary is 180°. Antipodal boundary points are the <em>same</em> rotation — they are identified, which is why the wanderer “jumps across”.</p><p>The wanderer travels 720°. The first loop (yellow) crosses the boundary once — an odd number of crossings: such a loop cannot be contracted. With the second loop (green) the number of crossings turns even: an even loop can be contracted. This is the content of <span class="m">π<sub>1</sub> = ℤ/2</span> — only the parity of the crossings matters, and this is the mathematics of the plate/belt trick: 360° leaves a twist, 720° unwinds.</p>'},
   {t:'SE(3) — A Pose in Time', b:'<p>Rotation + translation = pose: 6 degrees of freedom, a moving reference frame along the path. <span class="m">⊞</span> is the same recipe, only the tangent space is <span class="m">ℝ<sup>6</sup></span>: three angles, three translations.</p><p>Poses have a chapter of their own: the <em>Geometry · SE(3)</em> journey takes ten stations over it — chaining, the order of R and t, the screw motion, the left Jacobian, the adjoint and interpolation.</p><p>This is where SLAM begins: many such poses linked by factors, with the previous station’s iteration running on them.</p>'}
  ]
};
