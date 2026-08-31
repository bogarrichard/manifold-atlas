'use strict';
/* Journey: the ladder — the Geometry branch's closing moon.

   It adds no group. It is the branch's own map: the seven moons on one flat 2D diagram,
   with every edge labelled by the ONE thing that step adds, so the order the branch is
   taught in becomes a picture instead of a sequence of visits. Three stations, one diagram
   each — the ladder itself, the skeleton every rung shares (G, its algebra, exp/log), and
   what each group is actually used for, which is also the handoff into the other two
   branches.

   Why a canvas texture rather than sprites and primitives. A diagram this text-heavy would
   be forty-odd makeLabel sprites, and every label allocates the same 512*dpr x 128*dpr
   backing store whatever its width (kit.js's labelScale floors at the device pixel ratio),
   so at dpr 2 that is tens of MB of texture for three stations of mostly-empty boxes. One
   canvas per station, sized to that diagram's own extent, is a few MB and draws boxes,
   arrowheads, dashes and multi-line text with the 2D API instead of by hand in geometry.
   What has to MOVE is deliberately not on the canvas: the highlight walking the reading
   order is a Three.js quad behind the node, so no frame ever re-uploads a texture.

   World units are the authority — the canvas size is derived from the layout at
   DIAGRAM_PPU, never the other way round. Backing notes: docs/project/theory-map.md (the
   ladder and why it is ordered this way), docs/geometry/exp-log.md,
   docs/geometry/lie-algebra.md. Cards (hu/en/ja) in-file. Requires LIE.kit. */
window.LIE = window.LIE || {};
LIE.journeys = LIE.journeys || {};
LIE.journeys['geometry-ladder'] = (function () {
  const K = LIE.kit;
  const {hexStr} = K;

  const DIAGRAM_PPU = 104; // canvas pixels per world unit
  const PAD = 0.6; // world-unit margin around the content
  // The same serif stack kit.js's labels use, for the same reason: Georgia has no CJK, so
  // a Japanese diagram would otherwise fall through to a sans next to Georgia everywhere
  // else. kit.js does not export it, hence the copy.
  const FONT =
    'Georgia,"STIX Two Text","Times New Roman","Hiragino Mincho ProN",' +
    '"Noto Serif JP","Yu Mincho",serif';

  /* The diagram's own words. In-file and keyed by language, the same way this journey's
     cards are: the text packs' `labels` map is shared across journeys and these are of no
     use to any other. The language comes off the pack the engine already handed us. */
  const DIA = {
    hu: {
      l_flat: 'eltolások · dim n',
      l_so2: 'forgatás a síkon · 1',
      l_se2: 'merev mozgás a síkon · 3',
      l_so3: 'forgatás a térben · 3',
      l_quat: 'egységkvaterniók · 3',
      l_se3: 'póz · 6',
      l_sim3: 'hasonlóság · 7',
      e_semi: '⋉ ℝ²',
      e_tr: '+ eltolás',
      e_scale: '+ skála',
      e_dim: '+1 dimenzió',
      e_cover: '2:1 fedés',
      e_exp: 'exp',
      e_log: 'log',
      n_alg: 'lapos érintőtér, ℝᵈ',
      n_grp: 'görbült csoport',
      h_group: 'csoport',
      h_alg: 'Lie-algebra',
      h_exp: 'mit csinál az exp',
      x_flat: 'exp(v) = v, nincs mit tenni',
      x_so2: 'θ ⟼ R(θ)',
      x_se2: '(ρ, θ) ⟼ (V ρ, R(θ))',
      x_so3: 'Rodrigues-formula',
      x_quat: '(cos θ/2, a sin θ/2)',
      x_se3: 'csavarmozgás, bal Jacobi',
      x_sim3: 'ugyanaz, plusz e^σ',
      u_so3a: 'IMU-orientáció, kamerairány',
      u_so3b: 'forgó alkatrészek',
      u_se3a: 'SLAM-pózok, vizuális odometria',
      u_se3b: 'robotkinematika',
      u_sim3a: 'monokuláris skála, hurokzárás',
      u_sim3b: 'térkép-igazítás',
      u_flata: 'a költség tere',
      u_flatb: 'minden lépés itt történik',
      p_opt: 'Optimalizálás',
      p_optsub: 'végig lapos',
      p_slam: 'SLAM',
      p_slamsub: 'itt ütközik a kettő',
    },
    en: {
      l_flat: 'translations · dim n',
      l_so2: 'rotation in the plane · 1',
      l_se2: 'rigid motion in the plane · 3',
      l_so3: 'rotation in space · 3',
      l_quat: 'unit quaternions · 3',
      l_se3: 'pose · 6',
      l_sim3: 'similarity · 7',
      e_semi: '⋉ ℝ²',
      e_tr: '+ translation',
      e_scale: '+ scale',
      e_dim: '+1 dimension',
      e_cover: '2:1 cover',
      e_exp: 'exp',
      e_log: 'log',
      n_alg: 'flat tangent space, ℝᵈ',
      n_grp: 'the curved group',
      h_group: 'group',
      h_alg: 'Lie algebra',
      h_exp: 'what exp has to do',
      x_flat: 'exp(v) = v, nothing to do',
      x_so2: 'θ ⟼ R(θ)',
      x_se2: '(ρ, θ) ⟼ (V ρ, R(θ))',
      x_so3: 'Rodrigues formula',
      x_quat: '(cos θ/2, a sin θ/2)',
      x_se3: 'screw motion, left Jacobian',
      x_sim3: 'the same, plus e^σ',
      u_so3a: 'IMU orientation, camera heading',
      u_so3b: 'rotating parts',
      u_se3a: 'SLAM poses, visual odometry',
      u_se3b: 'robot kinematics',
      u_sim3a: 'monocular scale, loop closure',
      u_sim3b: 'map alignment',
      u_flata: 'the space the cost lives in',
      u_flatb: 'every step happens here',
      p_opt: 'Optimization',
      p_optsub: 'flat throughout',
      p_slam: 'SLAM',
      p_slamsub: 'where the two collide',
    },
    ja: {
      l_flat: '並進 · dim n',
      l_so2: '平面の回転 · 1',
      l_se2: '平面の剛体運動 · 3',
      l_so3: '空間の回転 · 3',
      l_quat: '単位クォータニオン · 3',
      l_se3: '姿勢 · 6',
      l_sim3: '相似 · 7',
      e_semi: '⋉ ℝ²',
      e_tr: '+ 並進',
      e_scale: '+ スケール',
      e_dim: '+1 次元',
      e_cover: '2:1 被覆',
      e_exp: 'exp',
      e_log: 'log',
      n_alg: '平らな接空間 ℝᵈ',
      n_grp: '曲がった群',
      h_group: '群',
      h_alg: 'リー代数',
      h_exp: 'exp の仕事',
      x_flat: 'exp(v) = v、何もしない',
      x_so2: 'θ ⟼ R(θ)',
      x_se2: '(ρ, θ) ⟼ (V ρ, R(θ))',
      x_so3: 'ロドリゲスの公式',
      x_quat: '(cos θ/2, a sin θ/2)',
      x_se3: 'ねじ運動と左ヤコビ行列',
      x_sim3: '同じもの、さらに e^σ',
      u_so3a: 'IMU の姿勢、カメラの向き',
      u_so3b: '回転する部品',
      u_se3a: 'SLAM の姿勢、視覚オドメトリ',
      u_se3b: 'ロボットの運動学',
      u_sim3a: '単眼のスケール、ループ閉じ込み',
      u_sim3b: '地図の位置合わせ',
      u_flata: 'コストが住む空間',
      u_flatb: 'すべての更新はここで起きる',
      p_opt: '最適化',
      p_optsub: '最後まで平ら',
      p_slam: 'SLAM',
      p_slamsub: '二つがぶつかる場所',
    },
  };

  function build(C, PAL) {
    const COL = PAL || K.palette('dark');
    const CSS = {
      ink: hexStr(COL.ink),
      teal: hexStr(COL.teal),
      violet: hexStr(COL.violet),
      amber: hexStr(COL.amber),
      green: hexStr(COL.green),
      coral: hexStr(COL.coral),
      bg: hexStr(COL.bg),
    };
    const NUM = {
      ink: COL.ink,
      teal: COL.teal,
      violet: COL.violet,
      amber: COL.amber,
      green: COL.green,
      coral: COL.coral,
    };
    const withA = (css, a) => {
      const n = parseInt(css.slice(1), 16);
      return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
    };

    /* One diagram = one canvas plane + a few glow quads.

       `nodes` are boxes (or `plain: true` text cells, which is what a table row is made
       of), `edges` are arrows between them routed edge-to-edge, `rules` are bare separator
       lines and `glows` are the animated rectangles — kept separate from the nodes because
       station 2 highlights whole table ROWS, not boxes. Everything is in world units and
       the returned group is re-centred on its own bounds, so a station's layout can be
       written around whatever origin reads best. */
    function makeDiagram(spec) {
      const byId = {};
      spec.nodes.forEach(n => (byId[n.id] = n));
      let x0 = Infinity,
        x1 = -Infinity,
        y0 = Infinity,
        y1 = -Infinity;
      spec.nodes.forEach(n => {
        x0 = Math.min(x0, n.x - n.w / 2);
        x1 = Math.max(x1, n.x + n.w / 2);
        y0 = Math.min(y0, n.y - n.h / 2);
        y1 = Math.max(y1, n.y + n.h / 2);
      });
      x0 -= PAD;
      x1 += PAD;
      y0 -= PAD;
      y1 += PAD;
      const W = x1 - x0,
        H = y1 - y0;

      const cv = document.createElement('canvas');
      cv.width = Math.round(W * DIAGRAM_PPU);
      cv.height = Math.round(H * DIAGRAM_PPU);
      const ctx = cv.getContext('2d');
      const X = x => (x - x0) * DIAGRAM_PPU, // world -> canvas px
        Y = y => (y1 - y) * DIAGRAM_PPU,
        P = u => u * DIAGRAM_PPU;
      const font = (size, italic) => (italic ? 'italic ' : '') + Math.round(P(size)) + 'px ' + FONT;

      function roundRect(x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
      }
      // a text label on an opaque pill, so an edge label never has a line running through it
      function pill(text, x, y, css, size) {
        ctx.font = font(size, true);
        const w = ctx.measureText(text).width + P(0.22),
          h = P(size * 1.5);
        ctx.fillStyle = withA(CSS.bg, 0.94);
        roundRect(X(x) - w / 2, Y(y) - h / 2, w, h, h / 2);
        ctx.fill();
        ctx.fillStyle = css;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, X(x), Y(y));
      }
      const anchor = (n, d) =>
        d === 'r'
          ? [n.x + n.w / 2, n.y]
          : d === 'l'
            ? [n.x - n.w / 2, n.y]
            : d === 't'
              ? [n.x, n.y + n.h / 2]
              : [n.x, n.y - n.h / 2];
      function dirsFor(a, b) {
        const dx = b.x - a.x,
          dy = b.y - a.y;
        if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? ['r', 'l'] : ['l', 'r'];
        return dy > 0 ? ['t', 'b'] : ['b', 't'];
      }

      (spec.rules || []).forEach(r => {
        ctx.setLineDash([]);
        ctx.strokeStyle = withA(r.css || CSS.ink, r.a === undefined ? 0.28 : r.a);
        ctx.lineWidth = P(0.014);
        ctx.beginPath();
        ctx.moveTo(X(r.x1), Y(r.y1));
        ctx.lineTo(X(r.x2), Y(r.y2));
        ctx.stroke();
      });

      (spec.edges || []).forEach(e => {
        const a = byId[e.from],
          b = byId[e.to],
          d = e.dirs || dirsFor(a, b),
          css = e.css || CSS.ink;
        let [px, py] = anchor(a, d[0]),
          [qx, qy] = anchor(b, d[1]);
        if (e.off) {
          // perpendicular offset, for the two arrows of an exp/log pair
          const L = Math.hypot(qx - px, qy - py) || 1,
            nx = -(qy - py) / L,
            ny = (qx - px) / L;
          px += nx * e.off;
          py += ny * e.off;
          qx += nx * e.off;
          qy += ny * e.off;
        }
        const L = Math.hypot(qx - px, qy - py) || 1,
          ux = (qx - px) / L,
          uy = (qy - py) / L;
        const HEAD = 0.3,
          bx = qx - ux * HEAD,
          by = qy - uy * HEAD;
        ctx.setLineDash(e.dashed ? [P(0.2), P(0.16)] : []);
        ctx.strokeStyle = withA(css, e.dashed ? 0.55 : 0.85);
        ctx.lineWidth = P(e.dashed ? 0.02 : 0.028);
        ctx.beginPath();
        ctx.moveTo(X(px + ux * 0.1), Y(py + uy * 0.1));
        ctx.lineTo(X(bx), Y(by));
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = withA(css, e.dashed ? 0.55 : 0.9);
        ctx.beginPath(); // arrowhead
        ctx.moveTo(X(qx), Y(qy));
        ctx.lineTo(X(bx - uy * 0.13), Y(by + ux * 0.13));
        ctx.lineTo(X(bx + uy * 0.13), Y(by - ux * 0.13));
        ctx.closePath();
        ctx.fill();
        if (e.label) pill(e.label, (px + qx) / 2, (py + qy) / 2, withA(css, 0.95), 0.27);
      });

      spec.nodes.forEach(n => {
        const css = n.css || CSS.ink;
        if (!n.plain) {
          ctx.setLineDash([]);
          roundRect(X(n.x - n.w / 2), Y(n.y + n.h / 2), P(n.w), P(n.h), P(0.24));
          ctx.fillStyle = withA(css, 0.13);
          ctx.fill();
          ctx.strokeStyle = withA(css, 0.85);
          ctx.lineWidth = P(0.024);
          ctx.stroke();
        }
        const lines = n.lines || [];
        const TS = n.ts || 0.44,
          LS = n.ls || 0.28,
          GAP = 0.13;
        const block = (n.title ? TS : 0) + lines.length * (LS + GAP);
        let y = n.y + block / 2 - (n.title ? TS : 0) / 2;
        const left = n.align === 'left';
        ctx.textAlign = left ? 'left' : 'center';
        ctx.textBaseline = 'middle';
        const tx = left ? X(n.x - n.w / 2) : X(n.x);
        if (n.title) {
          ctx.fillStyle = css;
          ctx.font = font(TS, true);
          ctx.fillText(n.title, tx, Y(y));
          y -= TS / 2 + GAP;
        }
        lines.forEach(s => {
          y -= LS / 2;
          ctx.fillStyle = withA(n.lcss || CSS.ink, 0.82);
          ctx.font = font(LS, !!n.it);
          ctx.fillText(s, tx, Y(y));
          y -= LS / 2 + GAP;
        });
        if (n.num) {
          // the moon's own number, sitting on the top-left corner of its box, so the
          // diagram and the hub's ring label the same seven things the same way
          const cx = n.x - n.w / 2 + 0.42,
            cy = n.y + n.h / 2,
            r = 0.21;
          ctx.beginPath();
          ctx.arc(X(cx), Y(cy), P(r), 0, Math.PI * 2);
          ctx.fillStyle = CSS.bg;
          ctx.fill();
          ctx.strokeStyle = withA(css, 0.85);
          ctx.lineWidth = P(0.022);
          ctx.stroke();
          ctx.fillStyle = css;
          ctx.font = font(0.24, false);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(n.num), X(cx), Y(cy));
        }
      });

      const tex = new THREE.CanvasTexture(cv);
      tex.minFilter = THREE.LinearFilter; // the canvas is not power-of-two: no mipmaps
      const inner = new THREE.Group();
      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(W, H),
        new THREE.MeshBasicMaterial({map: tex, transparent: true, depthWrite: false})
      );
      plane.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0);
      inner.add(plane);

      /* A node marked `glow: true` contributes its own rect, in node order, ahead of any
         explicit `glows` — so the walker's order and the diagram's reading order cannot
         drift apart, and a moved box takes its highlight with it. Station 2's highlights
         are whole table ROWS and stay explicit. */
      const rects = spec.nodes
        .filter(n => n.glow)
        .map(n => ({x: n.x, y: n.y, w: n.w + 0.3, h: n.h + 0.3, color: n.glowColor}))
        .concat(spec.glows || []);
      const glows = rects.map(gl => {
        const m = new THREE.Mesh(
          new THREE.PlaneGeometry(gl.w, gl.h),
          new THREE.MeshBasicMaterial({
            color: gl.color === undefined ? NUM.ink : gl.color,
            transparent: true,
            opacity: 0,
            depthWrite: false,
          })
        );
        m.position.set(gl.x, gl.y, -0.02); // behind the plane, so the box fill tints it
        inner.add(m);
        return m;
      });
      inner.position.set(-(x0 + x1) / 2, -(y0 + y1) / 2, 0);
      return {inner, glows};
    }

    /* The walker: one glow at a time, in reading order, with a soft in-out. Every station
       uses it, which is the point — the three diagrams are read in the same order. */
    function walker(glows, dwell, peak) {
      const n = glows.length;
      return t => {
        const u = t / dwell,
          k = Math.floor(u) % n,
          f = u % 1;
        const a = Math.sin(Math.PI * Math.min(1, f * 1.25)) * (peak === undefined ? 0.5 : peak);
        glows.forEach((m, i) => (m.material.opacity = i === k ? a : 0));
      };
    }

    const L = DIA[(C.meta && C.meta.htmlLang) || 'hu'] || DIA.hu;
    const T = k => L[k];

    const stations = [
      // 1 — the ladder: seven groups, and one added thing per edge
      g => {
        // three columns and four rows; the boxes are as narrow as the widest sub-label in
        // any of the three languages allows (measured: 3.13 world units), because the
        // diagram's total width is what has to survive the HUD card taking a third of the
        // viewport
        const NW = 3.6,
          NH = 1.5;
        const CA = -5.3,
          CB = -0.4,
          CC = 4.5;
        // `key` is a palette name, not a color: the box needs the CSS string to draw with
        // and its highlight needs the same color as a THREE number, and deriving one from
        // the other means comparing hex strings for no reason
        const box = (id, x, y, key, title, sub, num) => ({
          id,
          x,
          y,
          w: NW,
          h: NH,
          css: CSS[key],
          title,
          lines: [sub],
          num,
          glow: true,
          glowColor: NUM[key],
        });
        const d = makeDiagram({
          nodes: [
            box('flat', (CA + CB) / 2, 4.7, 'green', 'ℝⁿ', T('l_flat'), 1),
            box('so2', CA, 1.3, 'violet', 'SO(2)', T('l_so2'), 2),
            box('se2', CB, 1.3, 'teal', 'SE(2)', T('l_se2'), 3),
            box('so3', CA, -2.3, 'violet', 'SO(3)', T('l_so3'), 4),
            box('quat', CA, -5.7, 'violet', 'S³', T('l_quat'), 5),
            box('se3', CB, -2.3, 'teal', 'SE(3)', T('l_se3'), 6),
            box('sim3', CC, -2.3, 'amber', 'Sim(3)', T('l_sim3'), 7),
          ],
          edges: [
            {from: 'flat', to: 'so2', css: CSS.green, dashed: true},
            {from: 'flat', to: 'se2', css: CSS.green, dashed: true, label: T('e_semi')},
            {from: 'so2', to: 'se2', css: CSS.teal, label: T('e_tr')},
            {from: 'so3', to: 'se3', css: CSS.teal, label: T('e_tr')},
            {from: 'se3', to: 'sim3', css: CSS.amber, label: T('e_scale')},
            {from: 'so2', to: 'so3', css: CSS.violet, label: T('e_dim')},
            {from: 'se2', to: 'se3', css: CSS.teal, label: T('e_dim')},
            {from: 'quat', to: 'so3', css: CSS.violet, label: T('e_cover')},
          ],
        });
        g.add(d.inner);
        const step = walker(d.glows, 1.6);
        return {
          tick(t) {
            step(t);
          },
        };
      },

      // 2 — the skeleton every rung shares: G, its algebra, and the exp/log pair
      g => {
        /* A table, so the cells are `plain` left-aligned text and the column widths are
           the widths of the text itself (measured across all three languages), not round
           numbers: a cell is drawn from x - w/2, so an over-wide column would pad the
           diagram's bounds with empty space and push the whole thing off the free column. */
        const CW = [1.7, 2.0, 3.5],
          CX = [-3.4, -0.8, 2.55];
        const cell = (col, y, text, css, it) => ({
          id: 'c' + col + '_' + y,
          x: CX[col],
          y,
          w: CW[col],
          h: 0.62,
          plain: true,
          align: 'left',
          lines: [text],
          lcss: css,
          ls: 0.3,
          it: it !== false,
        });
        const rows = [
          ['ℝⁿ', 'ℝⁿ', T('x_flat'), CSS.green],
          ['SO(2)', 'ℝ', T('x_so2'), CSS.violet],
          ['SE(2)', 'ℝ³', T('x_se2'), CSS.teal],
          ['SO(3)', '𝔰𝔬(3) ≅ ℝ³', T('x_so3'), CSS.violet],
          ['S³', 'ℝ³', T('x_quat'), CSS.violet],
          ['SE(3)', '𝔰𝔢(3) ≅ ℝ⁶', T('x_se3'), CSS.teal],
          ['Sim(3)', '𝔰𝔦𝔪(3) ≅ ℝ⁷', T('x_sim3'), CSS.amber],
        ];
        const nodes = [
          {
            id: 'alg',
            x: -3.6,
            y: 4.6,
            w: 4.6,
            h: 1.5,
            css: CSS.coral,
            // Unicode subscript, not `T_e`: the canvas text has no markup, and the sprite
            // labels elsewhere spell θ₁ and r₀ the same way (CLAUDE.md, math notation)
            title: '𝔤 = TₑG',
            lines: [T('n_alg')],
          },
          {
            id: 'grp',
            x: 3.6,
            y: 4.6,
            w: 4.6,
            h: 1.5,
            css: CSS.teal,
            title: 'G',
            lines: [T('n_grp')],
          },
          cell(0, 2.5, T('h_group'), CSS.ink, false),
          cell(1, 2.5, T('h_alg'), CSS.ink, false),
          cell(2, 2.5, T('h_exp'), CSS.ink, false),
        ];
        const glows = [];
        rows.forEach((r, k) => {
          const y = 1.6 - k * 0.95;
          nodes.push(cell(0, y, r[0], r[3]));
          nodes.push(cell(1, y, r[1], r[3]));
          nodes.push(cell(2, y, r[2], CSS.ink));
          glows.push({x: 0, y, w: 8.9, h: 0.8, color: NUM.ink});
        });
        const L0 = CX[0] - CW[0] / 2,
          L2 = CX[2] + CW[2] / 2;
        const d = makeDiagram({
          nodes,
          edges: [
            {
              from: 'alg',
              to: 'grp',
              css: CSS.teal,
              off: 0.4,
              dirs: ['r', 'l'],
              label: T('e_exp'),
            },
            {
              from: 'grp',
              to: 'alg',
              css: CSS.coral,
              off: 0.4,
              dirs: ['l', 'r'],
              label: T('e_log'),
            },
          ],
          rules: [{x1: L0, y1: 2.14, x2: L2, y2: 2.14}],
          glows,
        });
        g.add(d.inner);
        const step = walker(d.glows, 1.5, 0.13);
        return {
          tick(t) {
            step(t);
          },
        };
      },

      // 3 — what each one is for, and where the map continues
      g => {
        const LX = -4.6,
          RX = 0.9,
          BX = 6.2;
        const grp = (id, y, css, title, sub) => ({
          id,
          x: LX,
          y,
          w: 3.4,
          h: 1.4,
          css,
          title,
          lines: [sub],
        });
        const use = (id, y, key, lines) => ({
          id,
          x: RX,
          y,
          w: 5.0,
          h: 1.4,
          css: CSS[key],
          lines,
          lcss: CSS[key],
          ls: 0.3,
          glow: true,
          glowColor: NUM[key],
        });
        const d = makeDiagram({
          nodes: [
            grp('so3', 3.4, CSS.violet, 'SO(3)', '3 DOF'),
            use('u3', 3.4, 'violet', [T('u_so3a'), T('u_so3b')]),
            grp('se3', 0.8, CSS.teal, 'SE(3)', '6 DOF'),
            use('u6', 0.8, 'teal', [T('u_se3a'), T('u_se3b')]),
            grp('sim3', -1.8, CSS.amber, 'Sim(3)', '7 DOF'),
            use('u7', -1.8, 'amber', [T('u_sim3a'), T('u_sim3b')]),
            grp('flat', -4.4, CSS.green, 'ℝⁿ', 'dim n'),
            use('un', -4.4, 'green', [T('u_flata'), T('u_flatb')]),
            {
              id: 'opt',
              x: BX,
              y: -4.4, // level with ℝⁿ's row: the cost is what leaves for that branch
              w: 3.4,
              h: 1.4,
              css: CSS.coral,
              title: T('p_opt'),
              lines: [T('p_optsub')],
              ts: 0.34,
            },
            {
              id: 'slam',
              x: BX,
              y: -0.9, // between the SE(3) and Sim(3) rows, the two that feed it
              w: 3.4,
              h: 1.4,
              css: CSS.coral,
              title: T('p_slam'),
              lines: [T('p_slamsub')],
              ts: 0.34,
            },
          ],
          edges: [
            {from: 'so3', to: 'u3', css: CSS.violet},
            {from: 'se3', to: 'u6', css: CSS.teal},
            {from: 'sim3', to: 'u7', css: CSS.amber},
            {from: 'flat', to: 'un', css: CSS.green},
            /* Both leave rightwards, and each branch box sits level with the row that
               feeds it: a diagonal from the bottom row up to a top-right box passes
               within a tenth of a unit of the other branch box's corner. */
            {from: 'un', to: 'opt', css: CSS.coral, dashed: true, dirs: ['r', 'l']},
            {from: 'u7', to: 'slam', css: CSS.coral, dashed: true, dirs: ['r', 'l']},
          ],
        });
        g.add(d.inner);
        const step = walker(d.glows, 1.7);
        return {
          tick(t) {
            step(t);
          },
        };
      },
    ];

    function bindCard(i) {
      wireBubble('ladCoverInfo', 'ladCoverNote'); // card 1 · why S³ is not a rung
      wireBubble('ladExpInfo', 'ladExpNote'); // card 2 · what exp has to work for
      wireBubble('ladStopInfo', 'ladStopNote'); // card 3 · what this map leaves out
    }
    function wireBubble(infoId, popId) {
      const info = document.getElementById(infoId),
        pop = document.getElementById(popId);
      if (!info || !pop) return;
      info.onclick = e => {
        e.stopPropagation();
        const willOpen = pop.hidden;
        document.querySelectorAll('.bubble:not([hidden]), .pop:not([hidden])').forEach(o => {
          if (o !== pop) {
            o.hidden = true;
            const t = document.querySelector('[aria-controls="' + o.id + '"]');
            if (t) t.setAttribute('aria-expanded', 'false');
          }
        });
        pop.hidden = !willOpen;
        info.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      };
    }

    return {stations, bindCard};
  }

  return {
    id: 'geometry-ladder',
    tier: 'geometry',
    threadKey: 'teal',
    // Curriculum position as data (see check.html): this moon closes the Geometry branch,
    // so `next` crosses into Optimization. It recaps the whole branch by construction,
    // hence the four hard back-references in `requires`.
    seq: {
      next: 'optimization-gd',
      requires: ['geometry-flat', 'geometry-so3', 'geometry-se3', 'geometry-sim3'],
      handoffs: ['so3-optimization', 'slam-pipeline'],
    },
    build,
    cards: {
      hu: [
        {
          t: 'A létra egyben',
          b: '<p>Ez a hold nem tesz hozzá új csoportot. Azt csinálja, amit hét külön látogatás nem tud: egymás mellé teszi mind a hetet, egyetlen ábrán.</p><p>Az ábrán három irány van, és mindegyik pontosan egy dolgot ad hozzá.</p><ol class="steps"><li><strong>Jobbra: eltolás.</strong> A forgatáscsoportból merev mozgás lesz. Ez a félig-direkt szorzat, és itt számít először a sorrend — előbb forgatni majd tolni nem ugyanaz, mint fordítva.</li><li><strong>Lefelé: egy dimenzióval több.</strong> A síkból tér lesz, és ezzel érkezik a nem-kommutativitás. Két síkbeli forgatás felcserélhető, két térbeli nem.</li><li><strong>Jobbra a sor végén: skála.</strong> Egyetlen szám, és a hossz megőrzése elveszik. A szög megmarad.</li></ol><p>A színek azt mondják, mit őriz meg a csoport. A <strong>zöld</strong> a lapos eltolások tere, a <strong>lila</strong> a tiszta forgatás, a <strong>türkiz</strong> a merev mozgás, a <strong>borostyán</strong> a hasonlóság.</p><p>Egyetlen él van, ami nem lépcsőfok: az <span class="m">S³ → SO(3)</span>. A kvaternióhold nem <button class="termbtn" id="ladCoverInfo" type="button" aria-expanded="false" aria-controls="ladCoverNote">bővebb csoportot</button> ad, hanem ugyanazt a csoportot kétszer lefedve.</p><p>A dobozok sarkán ülő számok a holdak sorszámai. Ugyanaz a sorrend, amit a bolygó gyűrűjén végigjártál, és nem véletlen: minden lépés pontosan egy új nehézséget hoz, a többit érintetlenül hagyja.</p><div class="bubble" id="ladCoverNote" role="dialog" aria-label="Miert nem lepcsofok az S harmadik" hidden><p>Az <span class="m">S³ → SO(3)</span> leképezés szürjektív homomorfizmus, és minden forgatásnak pontosan két őse van: <span class="m">q</span> és <span class="m">−q</span>.</p><p>Ebből két dolog következik. Egyrészt a dimenzió nem nő — mindkettő háromdimenziós, tehát a Lie-algebra ugyanaz az <span class="m">ℝ³</span>. Másrészt a kvaternió nem <em>több</em> forgatást ír le, hanem ugyanannyit, kétszer.</p><p>Amiért mégis a létra része: az <span class="m">SO(3)</span> azzal zárul, hogy globális, szingularitásmentes háromszámos koordináta nem létezik. Az <span class="m">S³</span> erre a válasz — négy szám és egy kényszer, varrat nélkül. Egy tétel, ami kimond egy lehetetlenséget és utána nem mutat kiutat, félbehagyott lecke.</p></div>',
        },
        {
          t: 'Ugyanaz a váz',
          b: '<p>Ha a hét csoport között egyetlen közös dolgot kell mondani, akkor ez az: <strong>mindegyik ugyanabból a három részből áll.</strong></p><ol class="steps"><li>maga a <strong>csoport</strong>, <span class="m">G</span>, görbülten</li><li>az <strong>érintőtere az egységelemnél</strong>, <span class="m">𝔤 = T<sub>e</sub>G</span>, ami lapos <span class="m">ℝ<sup>d</sup></span></li><li>az <strong>exp</strong> és a <strong>log</strong>, ami a kettő közt oda-vissza visz</li></ol><p>A táblázat harmadik oszlopa az egyetlen, ami tényleg változik a létrán lefelé: mennyi munkája van az <span class="m">exp</span>-nek.</p><p>A lapos esetben semennyi, <span class="m">exp(v) = v</span>, hiszen az érintőtér maga a tér. <span class="m">SO(2)</span>-ben egy szögből lesz egy forgatás, hibatag nélkül, mert minden kommutál. <span class="m">SO(3)</span>-ban ugyanez már a Rodrigues-formula, és két <span class="m">exp</span> szorzata nem az összeg <span class="m">exp</span>-je. <span class="m">SE(3)</span>-ban a forgatás belefolyik az eltolásba, ezt intézi a bal Jacobi <span class="m">V</span>. A <span class="m">Sim(3)</span> pedig ugyanez, egy hetedik komponenssel.</p><p>Ez a váz nem esetleges. Az <button class="termbtn" id="ladExpInfo" type="button" aria-expanded="false" aria-controls="ladExpNote">exp nem választás</button>, hanem az egyetlen leképezés, ami teljesíti azt a néhány követelményt, amit egy „lépés a sokaságon” művelettől elvárunk.</p><p>Ezért érdemes a hét sort egyszerre látni: nem hét recept, hanem egy recept hét különböző nehézségű esete.</p><div class="bubble" id="ladExpNote" role="dialog" aria-label="Miert eppen az exp" hidden><p>A követelmények elemiek. A nulla lépés ne mozdítson (<span class="m">x ⊞ 0 = x</span>), kis lépésekre a művelet elsőrendben az összeadás legyen, és ne függjön attól, milyen koordinátákban írtuk fel a sokaságot.</p><p>Ebből következik, hogy a lépésnek az egyparaméteres részcsoportot kell követnie, annak megoldása pedig az exponenciális. A levezetés a <span class="m">ℝⁿ</span> hold utolsó két állomásán fut le, mert az érvelés bármely sokaságon áll — tehát nem tartozik egyetlen csoporthoz sem.</p></div>',
        },
        {
          t: 'Melyiket mire',
          b: '<p>A létra nem dísz. A csoport megválasztása azt jelenti, hogy <strong>eldöntöd, minek szabad változnia</strong>, és minden szabadsági fok, amit megadsz, egy szám, amit meg is kell becsülni.</p><p>Ezért a gyakorlati szabály alulról indul: a legkisebb csoport, ami leírja a feladatot. Ha a kamera csak forog, <span class="m">SO(3)</span>. Ha mozog is, <span class="m">SE(3)</span>. Ha a világ mérete sem ismert, akkor és csak akkor <span class="m">Sim(3)</span>.</p><p>A jobb szélen álló két doboz az, ahol ez a bolygó véget ér. A <strong>költség</strong>, amit minimalizálunk, végig a lapos <span class="m">ℝⁿ</span>-ben él — ezért fut az Optimalizálás ág sokaság nélkül. A SLAM ág pedig az, ahol a kettő összeér: a pózok görbült téren élnek, a lépés viszont lapos marad, és minden nehézség ebből az ütközésből jön.</p><p>Amit ez a térkép <button class="termbtn" id="ladStopInfo" type="button" aria-expanded="false" aria-controls="ladStopNote">szándékosan nem mutat</button>: mindazt, amivel a csoportokon számolni kell.</p><p>Ha csak egy mondat marad meg az egész ágból: a hét csoport nem hét külön elmélet, hanem ugyanaz a szerkezet, egyre kevesebb megőrzött tulajdonsággal.</p><div class="bubble" id="ladStopNote" role="dialog" aria-label="Ami nincs a terkepen" hidden><p>Nincs rajta a <span class="m">⊞</span>/<span class="m">⊟</span>, nincsenek rajta a Jacobianok, a kovariancia átvitele, sem a numerikus buktatók (kis szögek, újranormálás). Ezek nem fértek volna egy ábrára úgy, hogy közben olvasható marad.</p><p>Ahol megtalálod őket: a <span class="m">⊞</span>/<span class="m">⊟</span> a <span class="m">ℝⁿ</span> holdon, a bal Jacobi és az adjungált az <span class="m">SE(3)</span>-on, a görbült téren futó iteráció a Riemann-gradiens holdon. A <span class="m">Sim(3)</span> 7-DOF on-manifold kezelése pedig sehol — az tudatosan hiányzik, a jegyzetekből is.</p></div>',
        },
      ],
      en: [
        {
          t: 'The Ladder in One Picture',
          b: '<p>This moon adds no group. It does the one thing seven separate visits cannot: it puts all seven side by side, on a single diagram.</p><p>The diagram has three directions, and each adds exactly one thing.</p><ol class="steps"><li><strong>Rightwards: translation.</strong> A rotation group becomes a rigid motion. This is the semidirect product, and it is where order starts to matter — rotate then translate is not translate then rotate.</li><li><strong>Downwards: one more dimension.</strong> The plane becomes space, and non-commutativity arrives with it. Two rotations of the plane commute, two of space do not.</li><li><strong>Rightwards at the end: scale.</strong> One number, and the preservation of length is gone. The angle survives.</li></ol><p>The colours say what the group preserves. <strong>Green</strong> is the flat space of translations, <strong>violet</strong> is pure rotation, <strong>teal</strong> is rigid motion, <strong>amber</strong> is similarity.</p><p>One edge is not a rung: <span class="m">S³ → SO(3)</span>. The quaternion moon gives no <button class="termbtn" id="ladCoverInfo" type="button" aria-expanded="false" aria-controls="ladCoverNote">larger group</button>, but the same group covered twice.</p><p>The numbers on the corners of the boxes are the moons’ own. It is the order you walked on the planet’s ring, and that is not an accident: every step brings exactly one new difficulty and leaves the rest untouched.</p><div class="bubble" id="ladCoverNote" role="dialog" aria-label="Why S cubed is not a rung" hidden><p><span class="m">S³ → SO(3)</span> is a surjective homomorphism, and every rotation has exactly two preimages: <span class="m">q</span> and <span class="m">−q</span>.</p><p>Two things follow. The dimension does not grow — both are three-dimensional, so the Lie algebra is the same <span class="m">ℝ³</span>. And the quaternion describes no <em>more</em> rotations, it describes the same ones twice.</p><p>Why it belongs on the ladder anyway: <span class="m">SO(3)</span> closes on the fact that no global, singularity-free three-number coordinate exists. <span class="m">S³</span> is the answer to that — four numbers and one constraint, with no seam. A theorem that states an impossibility and then walks away from it has taught half a lesson.</p></div>',
        },
        {
          t: 'The Same Skeleton',
          b: '<p>If one thing has to be said about all seven groups at once, it is this: <strong>each is made of the same three parts.</strong></p><ol class="steps"><li>the <strong>group</strong> itself, <span class="m">G</span>, curved</li><li>its <strong>tangent space at the identity</strong>, <span class="m">𝔤 = T<sub>e</sub>G</span>, which is a flat <span class="m">ℝ<sup>d</sup></span></li><li><strong>exp</strong> and <strong>log</strong>, which carry you between the two</li></ol><p>The table’s third column is the only one that really changes going down the ladder: how much work <span class="m">exp</span> has to do.</p><p>In the flat case, none — <span class="m">exp(v) = v</span>, since the tangent space is the space. In <span class="m">SO(2)</span> an angle becomes a rotation with no error term, because everything commutes. In <span class="m">SO(3)</span> the same thing is the Rodrigues formula, and the product of two <span class="m">exp</span>s is no longer the <span class="m">exp</span> of the sum. In <span class="m">SE(3)</span> the rotation bleeds into the translation, which is what the left Jacobian <span class="m">V</span> handles. And <span class="m">Sim(3)</span> is the same again, with a seventh component.</p><p>This skeleton is not incidental. <button class="termbtn" id="ladExpInfo" type="button" aria-expanded="false" aria-controls="ladExpNote">exp is not a choice</button> — it is the only map satisfying the handful of requirements a “step on a manifold” has to meet.</p><p>Which is why the seven rows are worth seeing at once: not seven recipes, but one recipe in seven degrees of difficulty.</p><div class="bubble" id="ladExpNote" role="dialog" aria-label="Why exp and nothing else" hidden><p>The requirements are elementary. A zero step must not move anything (<span class="m">x ⊞ 0 = x</span>), for small steps the operation must agree with addition to first order, and it must not depend on the coordinates the manifold happens to be written in.</p><p>From those it follows that the step has to follow the one-parameter subgroup, whose solution is the exponential. The derivation runs on the last two stations of the <span class="m">ℝⁿ</span> moon, because the argument holds on any manifold — so it belongs to no particular group.</p></div>',
        },
        {
          t: 'Which One for What',
          b: '<p>The ladder is not decoration. Choosing a group means <strong>deciding what is allowed to vary</strong>, and every degree of freedom granted is a number that then has to be estimated.</p><p>So the practical rule starts from the bottom: the smallest group that describes the task. If the camera only turns, <span class="m">SO(3)</span>. If it also moves, <span class="m">SE(3)</span>. If the size of the world is unknown too, then and only then <span class="m">Sim(3)</span>.</p><p>The two boxes on the right are where this planet ends. The <strong>cost</strong> being minimised lives in a flat <span class="m">ℝⁿ</span> throughout — which is why the Optimization branch runs with no manifold at all. And the SLAM branch is where the two meet: the poses live on a curved space while the step stays flat, and every difficulty there comes out of that collision.</p><p>What this map <button class="termbtn" id="ladStopInfo" type="button" aria-expanded="false" aria-controls="ladStopNote">deliberately does not show</button>: everything you have to actually compute on these groups.</p><p>If one sentence survives the whole branch: the seven groups are not seven theories but one structure, preserving less and less.</p><div class="bubble" id="ladStopNote" role="dialog" aria-label="What the map leaves out" hidden><p>Not on it: <span class="m">⊞</span>/<span class="m">⊟</span>, the Jacobians, the transport of covariance, and the numerical traps (small angles, renormalisation). None of it would fit on one diagram and leave it readable.</p><p>Where to find them: <span class="m">⊞</span>/<span class="m">⊟</span> on the <span class="m">ℝⁿ</span> moon, the left Jacobian and the adjoint on <span class="m">SE(3)</span>, the iteration on a curved space on the Riemannian-gradient moon. On-manifold <span class="m">Sim(3)</span> at 7 DOF is nowhere — deliberately absent, from the notes as well.</p></div>',
        },
      ],
      ja: [
        {
          t: 'はしご全体',
          b: '<p>この衛星は新しい群を追加しません。七つの群を一枚の図に並べます。</p><p>図には三つの方向があり、それぞれがちょうど一つを足します。</p><ol class="steps"><li><strong>右へ、並進を足す。</strong>回転群が剛体運動になります。これが半直積です。ここで初めて順序が効きます。</li><li><strong>下へ、次元を一つ足す。</strong>平面が空間になり、同時に非可換性が現れます。平面の回転は交換できますが、空間の回転はできません。</li><li><strong>最後にもう一度右へ、スケールを足す。</strong>数が一つ増え、長さの保存が失われます。角度は残ります。</li></ol><p>色は何を保存するかを表します。緑は平らな並進、紫は回転だけ、青緑は剛体運動、琥珀は相似です。</p><p>段になっていない辺が一本あります。<span class="m">S³ → SO(3)</span> です。クォータニオンの衛星は<button class="termbtn" id="ladCoverInfo" type="button" aria-expanded="false" aria-controls="ladCoverNote">大きい群</button>を与えるのではありません。同じ群を二重に覆うだけです。</p><p>箱の角の数字は衛星の番号です。惑星のリングをたどった順番と同じです。偶然ではありません。各段は新しい難しさをちょうど一つだけ持ち込み、残りには手を触れません。</p><div class="bubble" id="ladCoverNote" role="dialog" aria-label="S3 が段ではない理由" hidden><p><span class="m">S³ → SO(3)</span> は全射準同型です。どの回転にも原像がちょうど二つあります。<span class="m">q</span> と <span class="m">−q</span> です。</p><p>ここから二つ言えます。次元は増えません。どちらも三次元で、リー代数（Lie algebra）は同じ <span class="m">ℝ³</span> です。そしてクォータニオンは回転を余分に表すわけではありません。同じものを二回表します。</p><p>それでもはしごに載る理由があります。<span class="m">SO(3)</span> は不可能性で終わります。特異点のない三つの数の大域座標は存在しません。<span class="m">S³</span> はその答えです。四つの数と一つの拘束で、継ぎ目がありません。不可能だと述べて出口を示さない定理は、授業の半分です。</p></div>',
        },
        {
          t: '同じ骨組み',
          b: '<p>七つの群に共通することを一つだけ言うなら、これです。<strong>どれも同じ三つの部品でできています。</strong></p><ol class="steps"><li>群そのもの <span class="m">G</span>、曲がっています</li><li>単位元での接空間 <span class="m">𝔤 = T<sub>e</sub>G</span>、平らな <span class="m">ℝ<sup>d</sup></span> です</li><li>その間を往復する <span class="m">exp</span> と <span class="m">log</span></li></ol><p>表の三列目だけが、はしごを下るにつれて本当に変わります。<span class="m">exp</span> の仕事量です。</p><p>平らな場合は何もしません。<span class="m">exp(v) = v</span> です。接空間が空間そのものだからです。<span class="m">SO(2)</span> では角が回転になります。誤差項はありません。すべてが交換するからです。<span class="m">SO(3)</span> では同じことがロドリゲスの公式（Rodrigues）になります。二つの <span class="m">exp</span> の積は、もう和の <span class="m">exp</span> ではありません。<span class="m">SE(3)</span> では回転が並進に流れ込みます。それを左ヤコビ行列（Jacobian）<span class="m">V</span> が引き受けます。<span class="m">Sim(3)</span> は同じもので、七番目の成分が付きます。</p><p>この骨組みは偶然ではありません。<button class="termbtn" id="ladExpInfo" type="button" aria-expanded="false" aria-controls="ladExpNote">exp は選択ではありません</button>。多様体の上の「一歩」に求める条件を満たす写像は、これしかないのです。</p><p>だから七行を一度に見る価値があります。七つの処方ではありません。一つの処方の、難易度が違う七つの場合です。</p><div class="bubble" id="ladExpNote" role="dialog" aria-label="なぜ exp なのか" hidden><p>条件は初等的です。ゼロの一歩は何も動かさないこと（<span class="m">x ⊞ 0 = x</span>）。小さい一歩では一次の範囲で足し算に一致すること。そして多様体をどの座標で書いたかに依らないこと。</p><p>ここから、一歩は一径数部分群に沿うと決まります。その解が指数写像です。導出は <span class="m">ℝⁿ</span> の衛星の最後の二駅で走ります。議論はどの多様体でも成り立つので、特定の群には属しません。</p></div>',
        },
        {
          t: 'どれをどこで使うか',
          b: '<p>はしごは飾りではありません。群を選ぶことは、<strong>何が変わってよいかを決めること</strong>です。与えた自由度は、そのまま推定すべき数になります。</p><p>だから実務の規則は下から始まります。課題を表せる最小の群を選びます。カメラが回るだけなら <span class="m">SO(3)</span> です。動くなら <span class="m">SE(3)</span> です。世界の大きさも不明なら、そのときだけ <span class="m">Sim(3)</span> です。</p><p>右端の二つの箱で、この惑星は終わります。最小化するコストは最後まで平らな <span class="m">ℝⁿ</span> に住みます。だから最適化の枝は多様体なしで進みます。SLAM の枝は二つが出会う場所です。姿勢は曲がった空間に住み、一歩は平らなままです。難しさはすべてこの衝突から来ます。</p><p>この地図が<button class="termbtn" id="ladStopInfo" type="button" aria-expanded="false" aria-controls="ladStopNote">意図的に描かないもの</button>は、群の上で実際に計算する部分です。</p><p>一文だけ残すなら、これです。七つの群は七つの理論ではありません。保存するものが一つずつ減っていく、同じ構造です。</p><div class="bubble" id="ladStopNote" role="dialog" aria-label="地図に載せていないもの" hidden><p><span class="m">⊞</span> と <span class="m">⊟</span>、ヤコビ行列、共分散の伝播、数値的な落とし穴（微小角、再正規化）は載っていません。一枚の図に入れると読めなくなります。</p><p>置き場所はこうです。<span class="m">⊞</span> と <span class="m">⊟</span> は <span class="m">ℝⁿ</span> の衛星にあります。左ヤコビ行列と随伴は <span class="m">SE(3)</span> にあります。曲がった空間での反復はリーマン勾配の衛星にあります。<span class="m">Sim(3)</span> の 7 自由度の扱いはどこにもありません。ノートにもなく、意図的に空けてあります。</p></div>',
        },
      ],
    },
  };
})();
