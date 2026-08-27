'use strict';
/* Shared toolkit for the Lie journeys: math helpers, the color palette, and
   Three.js primitive builders. Pure factories — no scene state — so any journey
   can use them. Requires THREE (global) to be loaded first. Exposes LIE.kit. */
window.LIE = window.LIE || {};
LIE.kit = (function () {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const UP = V3(0, 1, 0);

  // Two full scene palettes. `dark` holds the original values (pixel-identical).
  // `light` is a soft light-slate variant: marks are darkened/saturated so they
  // read on a light background, and surfaces/grids/stars are lightened.
  // The two palettes are laid out to line up row for row: that pairing is how a
  // retheme gets checked by eye, so it is held out of the formatter on purpose.
  // prettier-ignore
  const PALETTES = {
    dark: {
      teal:0x5DCAA5, violet:0xAFA9EC, violet2:0x7F77DD, coral:0xF0997B,
      amber:0xFAC775, red:0xE24B4A, green:0x97C459, ink:0xE8E6DF,
      bg:0x0d1220, fog:0x0d1220,
      sphereSurface:0x1b2b48, grid1:0x39476b, grid2:0x232e4c,
      so3shell:0x233459, se3tube:0x51608a, costWire:0x0d1220,
      cubeFace2:0x2c8f6c, cubeFace4:0x5a52b8,
      star:0x9aa4c0, starOpacity:0.5
    },
    light: {
      teal:0x2E9A78, violet:0x6E62C8, violet2:0x5A50C0, coral:0xD9663F,
      amber:0xB07E16, red:0xCE382F, green:0x5B972B, ink:0x1A2233,
      bg:0xE7ECF3, fog:0xE7ECF3,
      sphereSurface:0xBED0DE, grid1:0xAEB9D0, grid2:0xC7D0E1,
      so3shell:0xB6C2D9, se3tube:0x8A97B4, costWire:0xE7ECF3,
      cubeFace2:0x2c8f6c, cubeFace4:0x5a52b8,
      star:0x9099b2, starOpacity:0.35
    }
  };
  const palette = theme => PALETTES[theme] || PALETTES.dark;
  const hexStr = n => '#' + ((n >>> 0) & 0xffffff).toString(16).padStart(6, '0');

  function fatArrow(color, r) {
    r = r || 0.05;
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({color});
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 10), mat);
    cyl.geometry.translate(0, 0.5, 0);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r * 2.6, 0.24, 14), mat);
    g.add(cyl);
    g.add(cone);
    g.userData = {cyl, cone};
    return g;
  }
  function setArrow(g, origin, vec) {
    const L = vec.length();
    if (L < 1e-4) {
      g.visible = false;
      return;
    }
    g.visible = true;
    g.position.copy(origin);
    g.quaternion.setFromUnitVectors(UP, vec.clone().multiplyScalar(1 / L));
    g.userData.cyl.scale.set(1, Math.max(L - 0.22, 0.02), 1);
    g.userData.cone.position.y = L - 0.12;
  }
  /* ---- sprite labels ----------------------------------------------------
     A label is text rasterized by the browser's own font engine onto a canvas, then used
     as a texture — so the glyphs are already the device's real ones, at the device's real
     hinting. What decides whether they look sharp is only how many texture pixels back
     each on-screen pixel.

     The drawing below is written against a fixed 512x128 *logical* box (font 46px, fitted
     to 470px wide, baseline at y=66). `S` scales the backing store under that box without
     touching any of it. It used to be just the device pixel ratio, which silently assumed
     every label is drawn at the same world size — true for the journeys, which nearly all
     take the 3.2-unit default, and wrong for the hub, whose planet (9.5) and moon (11.5)
     labels are three times as wide in world units and so were getting a third of the
     texture density: at the hub's fixed planet-view camera distance (~23 units, a ~22.8
     unit tall frustum) a moon label covers ~390 CSS px of a 512px-wide texture, i.e. it is
     *magnified* on any display taller than about 1000 CSS px. Hence a density — texture px
     per world unit — instead: LABEL_PPU is exactly the old default's (512/3.2), so a 3.2
     label is byte-for-byte what it was, and a wider one now gets a wider canvas rather
     than a stretched one.

     The cap is the one real constraint, and it is memory, not the GL limit: a label costs
     w*h*4 bytes of GPU texture, so the hub's fifteen labels alone would run to ~60MB if
     they were allowed the 2048 every WebGL implementation is required to support. The
     11.5-unit moon labels are the worst offenders and mostly *empty* — eleven of the twelve
     show a bare number in a box sized for a full title — so the ceiling is set at 1536,
     which puts the hub at ~35MB, about what a journey page already spends on its own
     labels. That still resolves ~134 device px per world unit for a moon label: enough for
     a 3000px-tall device viewport at the hub's fixed planet-view distance, i.e. more than
     any current display asks for. It gives up a little only in system view zoomed to the
     `radius` floor, where a planet label can be magnified past it. */
  const LABEL_DPR = Math.min(window.devicePixelRatio || 1, 3);
  const LABEL_PPU = 160; // texture pixels per world unit (= the old 512/3.2)
  const LABEL_MAXPX = 1536; // widest canvas we will allocate (see above: a memory ceiling)
  const labelScale = w =>
    Math.max(LABEL_DPR, Math.min((LABEL_DPR * (w * LABEL_PPU)) / 512, LABEL_MAXPX / 512));
  function makeLabel(text, color, w, opts) {
    w = w || 3.2;
    const S = labelScale(w);
    const cv = document.createElement('canvas');
    cv.width = Math.round(512 * S);
    cv.height = Math.round(128 * S);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({transparent: true, depthTest: false}));
    sp.userData.cv = cv;
    sp.userData.labelScale = S;
    sp.scale.set(w, w * 0.25, 1);
    updateLabel(sp, text, color, opts);
    return sp;
  }
  /* The same serif stack `#hud h1` uses in style.css, not a bare `Georgia, serif`: Georgia
     carries no CJK, so a Japanese label (the hub's moon titles, for one) fell through to
     whatever the platform picked by itself — usually a sans-serif, next to Georgia's serif
     in every other label. Naming the fallbacks keeps one typeface family across languages. */
  const LABEL_FONT =
    'Georgia,"STIX Two Text","Times New Roman","Hiragino Mincho ProN",' +
    '"Noto Serif JP","Yu Mincho",serif';
  const labelFont = px => 'italic ' + Math.round(px) + 'px ' + LABEL_FONT;
  function updateLabel(sp, text, color, opts) {
    const cv = sp.userData.cv,
      ctx = cv.getContext('2d');
    const S = sp.userData.labelScale || LABEL_DPR;
    ctx.setTransform(S, 0, 0, S, 0, 0);
    ctx.clearRect(0, 0, 512, 128);
    const toks = [];
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '^') {
        if (text[i + 1] === '{') {
          const j = text.indexOf('}', i + 2);
          toks.push({t: text.slice(i + 2, j), s: 1});
          i = j;
        } else {
          toks.push({t: text[i + 1], s: 1});
          i++;
        }
      } else toks.push({t: text[i], s: 0});
    }
    let F = 46;
    // give superscripts a little breathing room from their base (^ token => s:1),
    // counted in both the width pass and the draw pass so centering stays correct
    const wOf = f => {
      let w = 0;
      toks.forEach(k => {
        ctx.font = labelFont(k.s ? f * 0.62 : f);
        if (k.s) w += f * 0.06;
        w += ctx.measureText(k.t).width;
      });
      return w;
    };
    let W = wOf(F);
    if (W > 470) {
      F = (F * 470) / W;
      W = wOf(F);
    }
    let x = (512 - W) / 2;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    // Optional halo behind the fill — the same stroke-then-fill technique numberBadge
    // (hub.js) already uses, generalized here so any label can opt in without changing
    // the ~30 call sites across the journeys that don't pass `opts`. Stronger and
    // thicker than numberBadge's, because the worst case here is a label sitting
    // directly over a surface in its own exact color, not just a starfield.
    // `haloColor` defaults to black, but a caller using a dark-on-light `color` (e.g.
    // light-theme ink, which is near-black) should pass the theme's own background
    // color instead — a black halo behind already-near-black text barely separates
    // the two, while the background color guarantees fill/halo stay distinguishable
    // in either theme, by the same logic that makes ink itself contrast with the bg.
    const halo = opts && opts.halo;
    if (halo) {
      ctx.lineWidth = Math.max(3, F * 0.13);
      ctx.strokeStyle = opts.haloColor || 'rgba(0,0,0,0.55)';
      ctx.lineJoin = 'round';
    }
    ctx.fillStyle = color || '#FAC775';
    toks.forEach(k => {
      ctx.font = labelFont(k.s ? F * 0.62 : F);
      if (k.s) x += F * 0.06;
      const y = k.s ? 46 : 66;
      if (halo) ctx.strokeText(k.t, x, y);
      ctx.fillText(k.t, x, y);
      x += ctx.measureText(k.t).width;
    });
    const tex = new THREE.CanvasTexture(cv);
    // no mipmap chain: minFilter is Linear, so it would never be sampled — it would only
    // cost a third again of the (now much larger) texture's memory to build and upload
    tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    if (sp.material.map) sp.material.map.dispose();
    sp.material.map = tex;
    sp.material.needsUpdate = true;
  }
  function baseSphere(R, PAL) {
    PAL = PAL || PALETTES.dark;
    const g = new THREE.Group();
    const surf = new THREE.Mesh(
      new THREE.SphereGeometry(R, 48, 36),
      new THREE.MeshStandardMaterial({
        color: PAL.sphereSurface,
        roughness: 0.85,
        metalness: 0.05,
        transparent: true,
        opacity: 0.94,
      })
    );
    const wire = new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.001, 24, 16),
      new THREE.MeshBasicMaterial({
        color: PAL.teal,
        wireframe: true,
        transparent: true,
        opacity: 0.07,
      })
    );
    g.add(surf);
    g.add(wire);
    return g;
  }
  function dashedLine(a, b, color, dash) {
    const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
    const li = new THREE.Line(
      geo,
      new THREE.LineDashedMaterial({
        color,
        dashSize: dash || 0.12,
        gapSize: (dash || 0.12) * 0.8,
        transparent: true,
        opacity: 0.9,
      })
    );
    li.computeLineDistances();
    return li;
  }
  function expSph(pu, v) {
    const th = v.length();
    if (th < 1e-9) return pu.clone();
    const u = v.clone().multiplyScalar(1 / th);
    return pu
      .clone()
      .multiplyScalar(Math.cos(th))
      .add(u.multiplyScalar(Math.sin(th)))
      .normalize();
  }
  function projT(g, pu) {
    return g.clone().sub(pu.clone().multiplyScalar(g.dot(pu)));
  }

  return {
    RM,
    V3,
    lerp,
    ease,
    clamp,
    UP,
    palette,
    hexStr,
    fatArrow,
    setArrow,
    makeLabel,
    updateLabel,
    baseSphere,
    dashedLine,
    expSph,
    projT,
  };
})();
