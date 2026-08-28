'use strict';
/* Journey: the quaternion — S³, the double cover of SO(3). The Geometry planet's fifth
   moon, spliced in directly after SO(3) because it is the answer to the question that
   journey ends on: there is no global, singularity-free three-number coordinate for
   rotations, so what is used instead, and what does it cost?

   Five stations:

     1 · four numbers and one constraint. q = (cos θ/2, u sin θ/2), the two-sided action
         q p q⁻¹, and the half-angle DERIVED rather than asserted — the footnote pushes q
         through v (they anticommute for v ⊥ u), the two factors square, and the square is
         where the doubling comes from.
     2 · one rotation, three notations, so it can be PLACED: the bright triad is the
         matrix (its arrows are the columns of R), the axis and outer arc are the
         axis-angle reading, and the inner arc is the quaternion's half of the same
         angle. A slider drives all three and the card prints R live next to q.
     3 · the double cover, interactive. One axis at a time the picture is exact: the
         rotations about u form a circle, the quaternions along ±u form a circle, and the
         map between them is 2:1. Turn the body 360° and the quaternion is at −q; 720°
         brings it home. Closes on the sign trap every comparison has to fix.
     4 · what it buys and what it does not. The surface has no bad point (the marker
         glides over the ring where a chart's pole would be), but it is still curved: the
         componentwise average of two unit quaternions sinks inside, by exactly cos(Ω/2).
     5 · the product. Swapping the order flips only the cross term, so the two orders share
         a rotation ANGLE and differ by a mirrored axis — 3D non-commutativity localized to
         one cross product.
     6 · storage vs. increment. The radial direction is the cost's null direction (the
         footnote derives Hq = 0 from L(αq) = L(q)), hence store in four, step in three:
         q ⊞ δ = q ⊗ (cos(‖δ‖/2), sin(‖δ‖/2) δ̂) — the same halving as station 1.

   What this moon deliberately does NOT re-derive (D4 in docs/project/design-decisions.md):
   the ℝP³ ball and the ℤ/2 loop argument (so3-optimization station 7), gimbal lock and
   "one chart is never enough" (geometry-so3 stations 3–5), the three-encodings table
   (geometry-so2, docs/geometry/three-faces-of-euler.md), the ⊞ axioms (geometry-flat
   station 5), interpolation and SLERP (geometry-se3 station 10), and the iteration on the
   manifold (so3-optimization station 6). Each is named where it comes up.

   Station 4 and station 6 draw S³ one rung down, as S² — the S¹ → S² → S³ ladder
   geometry-so3 builds is what makes that stand-in legitimate rather than a fudge, and
   both cards say so out loud. Every label in the scenes is symbolic, so nothing here is
   language-specific. Backing notes: docs/geometry/quaternions.md,
   docs/geometry/three-faces-of-euler.md, docs/slam/storage-vs-increment.md.
   Cards (hu/en/ja) in-file. Requires LIE.kit. */
window.LIE = window.LIE || {};
LIE.journeys = LIE.journeys || {};
LIE.journeys['geometry-quaternion'] = (function () {
  const K = LIE.kit;
  const {V3, clamp, hexStr, fatArrow, setArrow, makeLabel, updateLabel, baseSphere, expSph} = K;

  const AX = V3(0.34, 0.87, 0.36).normalize(); // the one rotation axis stations 1–2 use
  const TAU = Math.PI * 2;

  function build(C, PAL) {
    const COL = PAL || K.palette('dark');
    const HX = {
      teal: hexStr(COL.teal),
      coral: hexStr(COL.coral),
      violet: hexStr(COL.violet),
      amber: hexStr(COL.amber),
      green: hexStr(COL.green),
      ink: hexStr(COL.ink),
    };

    function line(g, pts, color, op) {
      const l = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({
          color,
          transparent: true,
          opacity: op === undefined ? 0.9 : op,
        })
      );
      g.add(l);
      return l;
    }
    function dashed(g, a, b, color, op) {
      const l = K.dashedLine(a, b, color, 0.14);
      l.material.opacity = op === undefined ? 0.7 : op;
      g.add(l);
      return l;
    }
    function dot(g, color, r) {
      const d = new THREE.Mesh(
        new THREE.SphereGeometry(r || 0.1, 14, 12),
        new THREE.MeshBasicMaterial({color})
      );
      g.add(d);
      return d;
    }
    function arrow(g, color, r, op) {
      const a = fatArrow(color, r || 0.045);
      if (op !== undefined) {
        a.userData.cyl.material.transparent = true;
        a.userData.cyl.material.opacity = op;
        a.userData.cone.material.transparent = true;
        a.userData.cone.material.opacity = op;
      }
      g.add(a);
      return a;
    }
    function label(g, text, color, w) {
      const l = makeLabel(text, color, w || 1.6);
      g.add(l);
      return l;
    }
    // a triad, so the body's orientation is readable from any angle
    function triad(g, L, r) {
      const t = new THREE.Group();
      [
        [V3(L, 0, 0), COL.coral],
        [V3(0, L, 0), COL.teal],
        [V3(0, 0, L), COL.violet],
      ].forEach(([v, c]) => {
        const a = fatArrow(c, r || 0.045);
        setArrow(a, V3(0, 0, 0), v);
        t.add(a);
      });
      g.add(t);
      return t;
    }
    // any unit vector perpendicular to u
    function perpOf(u) {
      const a = Math.abs(u.x) < 0.9 ? V3(1, 0, 0) : V3(0, 1, 0);
      return a.sub(u.clone().multiplyScalar(a.dot(u))).normalize();
    }
    // a circle in the plane spanned by two orthonormal vectors, centered at c
    function ringPts(c, r, e1, e2, seg) {
      const out = [];
      for (let i = 0; i <= seg; i++) {
        const a = (i / seg) * TAU;
        out.push(
          c
            .clone()
            .add(e1.clone().multiplyScalar(Math.cos(a) * r))
            .add(e2.clone().multiplyScalar(Math.sin(a) * r))
        );
      }
      return out;
    }
    /* A line whose visible length grows: allocated once at full vertex count, with every
       vertex past the current angle parked on the end point. Mutating a fixed-size buffer
       is the only way to animate a Line in Three.js without rebuilding its geometry (and
       leaking one) every frame. */
    function growLine(g, n, color, op) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((n + 1) * 3), 3));
      const l = new THREE.Line(
        geo,
        new THREE.LineBasicMaterial({
          color,
          transparent: true,
          opacity: op === undefined ? 0.9 : op,
        })
      );
      g.add(l);
      return {
        line: l,
        // at(k) must return the point at parameter k ∈ [0, 1] of the swept path
        set(at) {
          const p = geo.attributes.position;
          for (let i = 0; i <= n; i++) {
            const P = at(i / n);
            p.setXYZ(i, P.x, P.y, P.z);
          }
          p.needsUpdate = true;
        },
      };
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

    // ---- quaternion helpers, written out rather than borrowed from THREE.Quaternion, so
    // the composition order the cards claim (q₂q₁ applies q₁ first) is visible in the code.
    const qMake = (u, ang) => {
      const s = Math.sin(ang / 2);
      return {w: Math.cos(ang / 2), v: u.clone().multiplyScalar(s)};
    };
    const qMul = (a, b) => ({
      w: a.w * b.w - a.v.dot(b.v),
      v: b.v
        .clone()
        .multiplyScalar(a.w)
        .add(a.v.clone().multiplyScalar(b.w))
        .add(a.v.clone().cross(b.v)),
    });
    const qThree = q => new THREE.Quaternion(q.v.x, q.v.y, q.v.z, q.w);

    let repApi = null, // station 2 · the three notations, on a slider
      dcApi = null; // station 3 · the slider-driven double cover

    const stations = [
      /* 0 · what a quaternion is, and where the half angle comes from. The body's vector p
            sweeps θ around the axis while the dial below shows the two angles side by
            side: the rotation's θ and the quaternion's own θ/2, one hand at half the
            speed of the other. */
      g => {
        const R = 1.95;
        const e1 = perpOf(AX),
          e2 = AX.clone().cross(e1).normalize();

        const ax = arrow(g, COL.teal, 0.05);
        setArrow(ax, V3(0, 0, 0), AX.clone().multiplyScalar(3.1));
        const uL = label(g, 'u', HX.teal, 1.4);
        uL.position.copy(AX.clone().multiplyScalar(3.45));

        const pv = e1.clone().multiplyScalar(R);
        const pA = arrow(g, COL.coral, 0.042);
        setArrow(pA, V3(0, 0, 0), pv);
        const pL = label(g, 'p', HX.coral, 1.4);
        pL.position.copy(pv.clone().multiplyScalar(1.22));

        const rA = arrow(g, COL.amber, 0.042);
        const rL = label(g, 'q p q^{-1}', HX.amber, 3.0);

        const sweep = growLine(g, 72, COL.amber, 0.75);
        // the circle p would sweep in a full turn, as the faint backdrop of the arc
        line(g, ringPts(V3(0, 0, 0), R, e1, e2, 90), COL.grid1, 0.4);

        // the dial: one hand at θ, one at θ/2, from the same zero mark
        const D = V3(0, -3.05, 0),
          DR = 1.15;
        const dx = V3(1, 0, 0),
          dy = V3(0, 1, 0);
        line(g, ringPts(D, DR, dx, dy, 72), COL.grid1, 0.55);
        line(g, [D.clone(), D.clone().add(dx.clone().multiplyScalar(DR))], COL.grid2, 0.9);
        const handFull = line(g, [D.clone(), D.clone()], COL.amber, 0.95);
        const handHalf = line(g, [D.clone(), D.clone()], COL.teal, 0.95);
        const fullL = label(g, 'θ', HX.amber, 1.2);
        const halfL = label(g, 'θ/2', HX.teal, 1.8);
        const qL = label(g, 'q = (cos θ/2,  u sin θ/2)', HX.ink, 5.4);
        qL.position.set(0, 3.35, 0);

        const setHand = (l, ang, len) => {
          const p = l.geometry.attributes.position;
          p.setXYZ(0, D.x, D.y, D.z);
          p.setXYZ(1, D.x + Math.cos(ang) * len, D.y + Math.sin(ang) * len, D.z);
          p.needsUpdate = true;
        };

        return {
          tick(t) {
            const th = (t * 0.42) % TAU;
            const at = k =>
              e1
                .clone()
                .multiplyScalar(Math.cos(th * k) * R)
                .add(e2.clone().multiplyScalar(Math.sin(th * k) * R));
            const P = at(1);
            setArrow(rA, V3(0, 0, 0), P);
            rL.position.copy(P.clone().multiplyScalar(1.42));
            sweep.set(at);
            setHand(handFull, th, DR);
            setHand(handHalf, th / 2, DR * 0.72);
            fullL.position.set(
              D.x + Math.cos(th) * (DR + 0.42),
              D.y + Math.sin(th) * (DR + 0.42),
              0
            );
            halfL.position.set(
              D.x + Math.cos(th / 2) * (DR * 0.72 + 0.5),
              D.y + Math.sin(th / 2) * (DR * 0.72 + 0.5),
              0
            );
          },
        };
      },

      /* 1 · one rotation, three notations, so the quaternion can be placed against what
            geometry-so3 already handed the reader. The bright triad IS the matrix — its
            three arrows are the columns of R, i.e. where the basis vectors landed — the
            axis and the outer arc are the axis-angle reading, and the inner arc is the
            quaternion's own half of that same angle. One slider drives all three; the
            card prints the numbers, including R live, because watching nine numbers churn
            while four stay tidy is the whole argument in one glance. */
      g => {
        const L = 1.55;
        const e1 = perpOf(AX),
          e2 = AX.clone().cross(e1).normalize();

        // where the basis vectors started, and where they land: the columns of R
        triad(g, L, 0.045).children.forEach(a => {
          a.userData.cyl.material.transparent = true;
          a.userData.cyl.material.opacity = 0.15;
          a.userData.cone.material.transparent = true;
          a.userData.cone.material.opacity = 0.15;
        });
        const cols = triad(g, L, 0.05);

        const axA = arrow(g, COL.green, 0.036, 0.9);
        setArrow(axA, AX.clone().multiplyScalar(-1.1), AX.clone().multiplyScalar(4.6));
        const axL = label(g, 'a', HX.green, 1.4);
        axL.position.copy(AX.clone().multiplyScalar(3.85));

        /* The two arcs are a protractor around the axis, parked clear of the triad rather
           than drawn through it: centred on the origin they would cross the very arrows
           whose motion they are measuring. Same plane the rotation sweeps, so the halving
           is still read off the real axis and not from a dial parked somewhere else. */
        const HUB = AX.clone().multiplyScalar(1.75);
        const RO = 1.4,
          RI = 0.95;
        const onArc = (r, a) =>
          HUB.clone()
            .add(e1.clone().multiplyScalar(Math.cos(a) * r))
            .add(e2.clone().multiplyScalar(Math.sin(a) * r));
        line(g, [onArc(RO, 0), onArc(RO + 0.32, 0)], COL.grid1, 0.6);
        const arcFull = growLine(g, 60, COL.amber, 0.95);
        const arcHalf = growLine(g, 60, COL.teal, 0.95);
        const thL = label(g, 'θ', HX.amber, 1.4);
        const halfL = label(g, 'θ/2', HX.teal, 2.0);
        const rL = label(g, 'R', HX.ink, 1.5);
        rL.position.set(0, -1.5, 0);

        let manual = false,
          th = 0;
        function apply(v) {
          th = v;
          const q = qMake(AX, th);
          cols.quaternion.copy(qThree(q));
          arcFull.set(k => onArc(RO, th * k));
          arcHalf.set(k => onArc(RI, (th / 2) * k));
          thL.position.copy(onArc(RO + 0.42, th));
          halfL.position.copy(onArc(RI - 0.4, th / 2));
          if (api.onchange) api.onchange(th, q);
        }
        const api = {
          onchange: null,
          set(v) {
            manual = true;
            apply(v);
          },
          setAuto() {
            manual = false;
          },
          isAuto: () => !manual,
          sync() {
            apply(th);
          },
        };
        repApi = api;
        apply(0.9);

        return {
          tick(t) {
            // a slow sweep short of a half turn: past π the axis-angle reading starts
            // telling the story station 4 owns, and this station is only placing the three
            if (!manual) apply(0.15 + 1.4 * (0.5 + 0.5 * Math.sin(t * 0.28)));
          },
        };
      },

      /* 2 · the double cover, made touchable. Restricted to ONE axis the picture is exact
            rather than a stand-in: the rotations about u are a circle, the unit
            quaternions along ±u are a circle, and the map is 2:1. The outer marker (the
            rotation) laps the inner one (the quaternion), and both inner markers are tied
            to the outer one by a dashed link — that pair of links IS the covering map. */
      g => {
        /* Stacked, not side by side: the free 3D column is portrait on a typical laptop
           (~710 x 886), and a body-left/circles-right layout ran the R(θ) label off the
           right edge while leaving two thirds of the height empty. */
        const body = new THREE.Group();
        body.position.set(0, 2.9, 0);
        g.add(body);
        // the ghost holds the start pose, so the turn is read against something
        triad(body, 1.35, 0.05).children.forEach(a => {
          // a fatArrow is a Group; its cylinder and cone carry the material, not it
          a.userData.cyl.material.transparent = true;
          a.userData.cyl.material.opacity = 0.16;
          a.userData.cone.material.transparent = true;
          a.userData.cone.material.opacity = 0.16;
        });
        const bodyQ = triad(body, 1.35, 0.05);

        const Cc = V3(0, -1.2, 0),
          RO = 1.8,
          RI = 1.05;
        const dx = V3(1, 0, 0),
          dy = V3(0, 1, 0);
        line(g, ringPts(Cc, RO, dx, dy, 90), COL.grid1, 0.5); // the rotations about u
        line(g, ringPts(Cc, RI, dx, dy, 90), COL.teal, 0.5); // the unit quaternions along ±u

        const one = dot(g, COL.green, 0.075);
        one.position.copy(Cc.clone().add(dx.clone().multiplyScalar(RI)));
        const oneL = label(g, '1', HX.green, 1.6);
        oneL.position.copy(Cc.clone().add(dx.clone().multiplyScalar(RI + 0.38)));
        const mOne = dot(g, COL.grid1, 0.06);
        mOne.position.copy(Cc.clone().sub(dx.clone().multiplyScalar(RI)));
        const mOneL = label(g, '−1', HX.ink, 2.0);
        mOneL.position.copy(Cc.clone().sub(dx.clone().multiplyScalar(RI + 0.45)));
        mOneL.material.opacity = 0.55;

        const rot = dot(g, COL.amber, 0.1); // the rotation, at angle θ
        const rotL = label(g, 'R(θ)', HX.amber, 2.4);
        const qd = dot(g, COL.teal, 0.1); // the quaternion, at angle θ/2
        const qdL = label(g, 'q', HX.teal, 2.0);
        const qm = dot(g, COL.violet, 0.1); // and its antipode
        const qmL = label(g, '−q', HX.violet, 2.4);
        const chord = line(g, [Cc.clone(), Cc.clone()], COL.violet, 0.35);
        const link1 = line(g, [Cc.clone(), Cc.clone()], COL.teal, 0.3);
        const link2 = line(g, [Cc.clone(), Cc.clone()], COL.violet, 0.3);
        const setSeg = (l, a, b) => {
          const p = l.geometry.attributes.position;
          p.setXYZ(0, a.x, a.y, a.z);
          p.setXYZ(1, b.x, b.y, b.z);
          p.needsUpdate = true;
        };
        const onRing = (r, a) =>
          Cc.clone()
            .add(dx.clone().multiplyScalar(Math.cos(a) * r))
            .add(dy.clone().multiplyScalar(Math.sin(a) * r));

        let manual = false,
          th = 0;
        function apply(v) {
          th = v;
          const q = qMake(AX, th);
          bodyQ.quaternion.copy(qThree(q));
          const P = onRing(RO, th),
            A = onRing(RI, th / 2),
            B = onRing(RI, th / 2 + Math.PI);
          rot.position.copy(P);
          rotL.position.copy(onRing(RO + 0.42, th));
          qd.position.copy(A);
          qdL.position.copy(onRing(RI - 0.36, th / 2));
          qm.position.copy(B);
          qmL.position.copy(onRing(RI - 0.4, th / 2 + Math.PI));
          setSeg(chord, A, B);
          setSeg(link1, A, P);
          setSeg(link2, B, P);
          if (api.onchange) api.onchange(th, q);
        }
        const api = {
          onchange: null,
          set(v) {
            manual = true;
            apply(v);
          },
          setAuto() {
            manual = false;
          },
          isAuto: () => !manual,
          // re-emit the current state without touching auto/manual: the first apply()
          // happens at build time, before bindCard has an onchange to push into, so
          // without this the readout reads "—" until the slider is first moved
          sync() {
            apply(th);
          },
        };
        dcApi = api;
        apply(0);

        return {
          tick(t) {
            if (!manual) apply((t * 0.55) % (2 * TAU)); // two laps of the rotation per cycle
          },
        };
      },

      /* 3 · what S³ buys and what it does not, drawn one rung down on S². The marker
            glides over the ring where a lat/long chart's pole sits — the surface has no
            bad point. But the chord between two unit quaternions still cuts inside: the
            componentwise average is short by exactly cos(Ω/2), and the arrow is the
            division that puts it back. */
      g => {
        const R = 2.0;
        /* Translucent, unlike station 5's: the whole point here is the chord CUTTING
           THROUGH the sphere, and baseSphere's 0.94 surface hides everything inside it.
           depthWrite off as well, so the interior lines are not depth-sorted away. */
        const sph = baseSphere(R, COL);
        sph.children[0].material.opacity = 0.3;
        sph.children[0].material.depthWrite = false;
        sph.children[1].material.opacity = 0.07; // both hemispheres show through now
        g.add(sph);
        const sL = label(g, 'S^{3}', HX.ink, 1.8);
        sL.position.set(0, R + 1.05, 0);
        sL.material.opacity = 0.75;

        // the pole a chart dies at, and a marker that crosses it without noticing
        const pole = V3(0, 1, 0);
        line(g, ringPts(V3(0, R * 0.965, 0), 0.42, V3(1, 0, 0), V3(0, 0, 1), 48), COL.coral, 0.85);
        const poleL = label(g, 'φ = 90°', HX.coral, 1.9);
        poleL.position.set(1.35, R + 0.34, 0);
        const merU = V3(0, 1, 0),
          merV = V3(0.42, 0, 0.91).normalize();
        line(g, ringPts(V3(0, 0, 0), R * 1.004, merU, merV, 96), COL.grid1, 0.55);
        const rider = dot(g, COL.green, 0.095);

        // the chord test: two points on the surface, their midpoint, and the way back
        const q0d = dot(g, COL.teal, 0.1);
        const q1d = dot(g, COL.teal, 0.1);
        const mid = dot(g, COL.coral, 0.09);
        const q0L = label(g, 'q₀', HX.teal, 1.3);
        const q1L = label(g, 'q₁', HX.teal, 1.3);
        const midL = label(g, '(q₀ + q₁)/2', HX.coral, 2.9);
        const ch = line(g, [V3(0, 0, 0), V3(0, 0, 0)], COL.coral, 0.8);
        const back = arrow(g, COL.amber, 0.032, 0.9);
        const arc = growLine(g, 48, COL.teal, 0.95);

        /* The plane the two points share is tilted ~30° out of the screen plane rather than
           lying flat: with the great circle seen edge-on the arc collapses onto the chord
           and the pair reads as a diameter, and with it seen face-on the arc IS the
           silhouette. In between, both are drawn and the gap between them is the point. */
        const bU = V3(1, 0, 0);
        const bV = V3(0, 0.87, -0.5).normalize();
        const H0 = -1.05; // where the pair sits on that circle: front-low, clear of the pole
        const setSeg = (l, a, b) => {
          const p = l.geometry.attributes.position;
          p.setXYZ(0, a.x, a.y, a.z);
          p.setXYZ(1, b.x, b.y, b.z);
          p.needsUpdate = true;
        };

        return {
          tick(t) {
            // the marker runs the meridian, straight over the pole
            const a = (t * 0.4) % TAU;
            rider.position.copy(
              merU
                .clone()
                .multiplyScalar(Math.cos(a) * R * 1.02)
                .add(merV.clone().multiplyScalar(Math.sin(a) * R * 1.02))
            );
            // the opening between the two points breathes, so the sinking is seen to
            // depend on it rather than looking like a fixed quirk of the picture
            const om = 0.4 + 0.55 * (0.5 + 0.5 * Math.sin(t * 0.34));
            const dir = h =>
              bU
                .clone()
                .multiplyScalar(Math.cos(h))
                .add(bV.clone().multiplyScalar(Math.sin(h)))
                .normalize();
            const u0 = dir(H0 - om),
              u1 = dir(H0 + om);
            const P0 = u0.clone().multiplyScalar(R),
              P1 = u1.clone().multiplyScalar(R);
            const M = P0.clone().add(P1).multiplyScalar(0.5); // short by cos(Ω/2)
            const S = M.clone().normalize().multiplyScalar(R);
            q0d.position.copy(P0);
            q1d.position.copy(P1);
            mid.position.copy(M);
            q0L.position.copy(P0.clone().multiplyScalar(1.2));
            q1L.position.copy(P1.clone().multiplyScalar(1.2));
            midL.position.copy(M.clone().add(V3(0, -0.62, 0)));
            setSeg(ch, P0, P1);
            setArrow(back, M, S.clone().sub(M));
            arc.set(k =>
              expSph(
                u0,
                u1
                  .clone()
                  .sub(u0.clone().multiplyScalar(u0.dot(u1)))
                  .normalize()
                  .multiplyScalar(2 * om * k)
              ).multiplyScalar(R * 1.008)
            );
          },
        };
      },

      /* 4 · the product, and the one term the order sits in. Swapping the factors flips
            only v₂ × v₁, which is perpendicular to the plane of the two axes — so the two
            composed rotations share an angle (the scalar part is untouched) and their axes
            are mirror images in that plane. The plane is drawn nearly edge-on on purpose:
            seen face-on the two axes would project onto each other. */
      g => {
        /* The disc's tilt is a compromise measured on screen, not a guess. Face-on, the two
           composed axes point at and away from the camera and the mirror is invisible;
           edge-on, the two INPUT axes project onto each other. At this tilt the inputs open
           ~89° apart on screen and the composed pair separates by 73-187px over the sweep. */
        const N = V3(0, 0.82, 0.58).normalize();
        const e1 = V3(1, 0, 0).sub(N.clone().multiplyScalar(N.x)).normalize();
        const e2 = N.clone().cross(e1).normalize();
        const inPlane = a =>
          e1
            .clone()
            .multiplyScalar(Math.cos(a))
            .add(e2.clone().multiplyScalar(Math.sin(a)))
            .normalize();
        const u1 = inPlane(-0.9),
          u2 = inPlane(0.9);

        const disc = new THREE.Mesh(
          new THREE.CircleGeometry(2.75, 48),
          new THREE.MeshBasicMaterial({
            color: COL.grid1,
            transparent: true,
            opacity: 0.14,
            side: THREE.DoubleSide,
          })
        );
        disc.quaternion.setFromUnitVectors(V3(0, 0, 1), N);
        g.add(disc);
        line(g, ringPts(V3(0, 0, 0), 2.75, e1, e2, 90), COL.grid1, 0.45);

        const a1 = arrow(g, COL.teal, 0.04, 0.85);
        setArrow(a1, V3(0, 0, 0), u1.clone().multiplyScalar(2.5));
        const a2 = arrow(g, COL.violet, 0.04, 0.85);
        setArrow(a2, V3(0, 0, 0), u2.clone().multiplyScalar(2.5));
        const l1 = label(g, 'u₁', HX.teal, 1.0);
        l1.position.copy(u1.clone().multiplyScalar(2.85));
        const l2 = label(g, 'u₂', HX.violet, 1.0);
        l2.position.copy(u2.clone().multiplyScalar(2.85));

        const nrm = arrow(g, COL.green, 0.028, 0.75);
        setArrow(nrm, V3(0, 0, 0), u2.clone().cross(u1).normalize().multiplyScalar(1.7));
        const nL = label(g, 'u₂ × u₁', HX.green, 2.0);
        nL.position.copy(u2.clone().cross(u1).normalize().multiplyScalar(2.05));

        const cA = arrow(g, COL.amber, 0.05);
        const cB = arrow(g, COL.coral, 0.05);
        const cAL = label(g, 'q₂q₁', HX.amber, 1.7);
        const cBL = label(g, 'q₁q₂', HX.coral, 1.7);
        const thL = label(g, 'θ = 0°', HX.ink, 2.2);
        thL.position.set(0, 3.3, 0);
        let last = '';

        return {
          tick(t) {
            const b1 = 1.15 + 0.55 * Math.sin(t * 0.31),
              b2 = 1.35 + 0.55 * Math.sin(t * 0.24 + 1.1);
            const q1 = qMake(u1, b1),
              q2 = qMake(u2, b2);
            const A = qMul(q2, q1), // q₁ first, then q₂
              B = qMul(q1, q2);
            const dA = A.v.clone().normalize().multiplyScalar(2.35),
              dB = B.v.clone().normalize().multiplyScalar(2.35);
            setArrow(cA, V3(0, 0, 0), dA);
            setArrow(cB, V3(0, 0, 0), dB);
            cAL.position.copy(dA.clone().multiplyScalar(1.19));
            cBL.position.copy(dB.clone().multiplyScalar(1.19));
            // both orders share this number — it is the scalar part, and the swap does
            // not touch the scalar part
            const deg = Math.round((2 * Math.acos(clamp(A.w, -1, 1)) * 180) / Math.PI);
            const txt = 'θ = ' + deg + '°';
            if (txt !== last) {
              updateLabel(thL, txt, HX.ink);
              last = txt;
            }
          },
        };
      },

      /* 5 · storage vs. increment, again one rung down on S². The tangent disc is where
            the step is taken (three numbers up on S³, two here); the dashed radial arrow
            is the direction the cost cannot see, which is why the fourth stored number is
            not a fourth parameter. */
      g => {
        const R = 1.85;
        g.add(baseSphere(R, COL));
        const n = V3(0.36, 0.62, 0.7).normalize();
        const P = n.clone().multiplyScalar(R);
        const t1 = perpOf(n),
          t2 = n.clone().cross(t1).normalize();

        const disc = new THREE.Mesh(
          new THREE.CircleGeometry(1.02, 40),
          new THREE.MeshBasicMaterial({
            color: COL.teal,
            transparent: true,
            opacity: 0.12,
            side: THREE.DoubleSide,
          })
        );
        disc.quaternion.setFromUnitVectors(V3(0, 0, 1), n);
        disc.position.copy(P);
        g.add(disc);
        line(g, ringPts(P, 1.02, t1, t2, 64), COL.teal, 0.55);

        const qd = dot(g, COL.amber, 0.1);
        qd.position.copy(P);
        const qL = label(g, 'q', HX.amber, 1.0);
        qL.position.copy(
          P.clone().add(n.clone().multiplyScalar(0.34)).add(t2.clone().multiplyScalar(-0.42))
        );

        const dA = arrow(g, COL.green, 0.03);
        const dL = label(g, 'δ', HX.green, 1.0);
        const nd = dot(g, COL.violet, 0.095);
        const ndL = label(g, 'q′', HX.violet, 1.2);
        const geo = growLine(g, 40, COL.violet, 0.85);

        // the radial direction: drawn dashed and going nowhere, because that is the point
        const rad = dashed(
          g,
          P.clone(),
          P.clone().add(n.clone().multiplyScalar(1.05)),
          COL.coral,
          0.85
        );
        const radL = label(g, '‖q‖', HX.coral, 1.3);
        radL.position.copy(P.clone().add(n.clone().multiplyScalar(1.4)));

        return {
          tick(t) {
            const a = t * 0.5;
            const len = 0.76 + 0.14 * Math.sin(t * 0.7);
            const d = t1
              .clone()
              .multiplyScalar(Math.cos(a) * len)
              .add(t2.clone().multiplyScalar(Math.sin(a) * len));
            setArrow(dA, P, d);
            dL.position.copy(P.clone().add(d.clone().multiplyScalar(1.34)));
            const dir = d.clone().normalize();
            const Q = expSph(n, dir.multiplyScalar(len)).multiplyScalar(R);
            nd.position.copy(Q);
            ndL.position.copy(Q.clone().multiplyScalar(1.16));
            geo.set(k =>
              expSph(
                n,
                d
                  .clone()
                  .normalize()
                  .multiplyScalar(len * k)
              ).multiplyScalar(R)
            );
            rad.material.opacity = 0.7 + 0.25 * Math.sin(t * 1.6);
          },
        };
      },
    ];

    /* Per-card wiring. Only station 2 has controls; the rest are footnote toggles. */
    function bindCard(i) {
      wireBubble('quHalfInfo', 'quHalfNote'); // card 1 · where the half angle comes from
      wireBubble('quConvInfo', 'quConvNote'); // card 2 · the four conversions, both ways
      wireBubble('quSignInfo', 'quSignNote'); // card 3 · the angle between two rotations
      wireBubble('quChordInfo', 'quChordNote'); // card 4 · how short the chord midpoint is
      wireBubble('quProdInfo', 'quProdNote'); // card 5 · the Hamilton product, derived
      wireBubble('quNullInfo', 'quNullNote'); // card 6 · why H has a null direction

      /* The same rotation printed three ways. R is filled in cell by cell rather than by
         id, so the nine numbers cost the card markup one id instead of nine — and the
         placeholders ship in the body, so the matrix does not resize as it fills. */
      if (i === 1 && repApi) {
        const sl = document.getElementById('quRepSl'),
          th = document.getElementById('quRepTh'),
          ax = document.getElementById('quRepA'),
          qv = document.getElementById('quRepQ'),
          mg = document.getElementById('quRepM'),
          au = document.getElementById('quRepAuto');
        const f2 = x => (x < 0 ? '−' : '') + Math.abs(x).toFixed(2);
        if (ax) ax.textContent = '(' + [AX.x, AX.y, AX.z].map(f2).join(', ') + ')';
        let lastT = '',
          lastQ = '';
        repApi.onchange = (rad, q) => {
          const a = Math.round((rad * 180) / Math.PI) + '°';
          if (th && a !== lastT) {
            th.textContent = a;
            lastT = a;
          }
          const b = '(' + [q.w, q.v.x, q.v.y, q.v.z].map(f2).join(', ') + ')';
          if (qv && b !== lastQ) {
            qv.textContent = b;
            lastQ = b;
          }
          if (mg && mg.children.length === 9) {
            const e = new THREE.Matrix4().makeRotationFromQuaternion(qThree(q)).elements;
            // .elements is column-major: R[row][col] = e[col * 4 + row]
            for (let r = 0; r < 3; r++)
              for (let c = 0; c < 3; c++) mg.children[r * 3 + c].textContent = f2(e[c * 4 + r]);
          }
          if (sl && repApi.isAuto()) sl.value = String(Math.round((rad * 180) / Math.PI));
        };
        if (sl) sl.oninput = () => repApi.set((parseFloat(sl.value) * Math.PI) / 180);
        if (au) au.onclick = () => repApi.setAuto();
        repApi.sync();
      }

      if (i === 2 && dcApi) {
        const sl = document.getElementById('quDcSl'),
          th = document.getElementById('quDcTh'),
          qv = document.getElementById('quDcQ'),
          au = document.getElementById('quDcAuto');
        let lastT = '',
          lastQ = '';
        dcApi.onchange = (rad, q) => {
          const deg = Math.round((rad * 180) / Math.PI);
          const a = deg + '°';
          if (th && a !== lastT) {
            th.textContent = a;
            lastT = a;
          }
          const f = x => (x < 0 ? '−' : '+') + Math.abs(x).toFixed(2);
          const b = '(' + f(q.w) + ', ' + f(q.v.x) + ', ' + f(q.v.y) + ', ' + f(q.v.z) + ')';
          if (qv && b !== lastQ) {
            qv.textContent = b;
            lastQ = b;
          }
          if (sl && dcApi.isAuto()) sl.value = String(deg);
        };
        if (sl) sl.oninput = () => dcApi.set((parseFloat(sl.value) * Math.PI) / 180);
        if (au) au.onclick = () => dcApi.setAuto();
        dcApi.sync();
      }
    }

    return {stations, bindCard};
  }

  return {
    id: 'geometry-quaternion',
    tier: 'geometry',
    threadKey: 'teal',
    // Curriculum position, as data rather than prose: `next` is the following moon in
    // hub.js's BRANCHES order, `handoffs` are the topical pointers this journey's cards
    // name, `requires` the hard back-references its opening card makes. engine.js renders
    // next+handoffs as links on the last station; check.html verifies every id resolves
    // and that the next-chain still agrees with BRANCHES.
    seq: {
      next: 'geometry-se3',
      requires: ['geometry-so3'],
      handoffs: ['geometry-so2', 'so3-optimization'],
    },
    build,
    cards: {
      hu: [
        {
          t: 'Négy szám, egy kényszer',
          b: '<p>Az <span class="m">SO(3)</span> hold azzal zárt, hogy <strong>nincs</strong> globális, szingularitásmentes háromszámos koordináta a forgatásokra. Ez tétel, nem ügyetlenség — tehát nem ügyesebb három számot kell keresni, hanem el kell dönteni, mivel fizetünk helyette.</p><p>A kvaternió válasza: <strong>négy szám és egy kényszer</strong>.</p><p class="matline"><span class="m">q = w + xi + yj + zk = (w, v)</span>,&nbsp;&nbsp;<span class="m">v ∈ ℝ<sup>3</sup></span></p><p class="matline"><span class="m">‖q‖<sup>2</sup> = w<sup>2</sup> + x<sup>2</sup> + y<sup>2</sup> + z<sup>2</sup> = 1</span></p><p>A <span class="m">‖q‖ = 1</span> feltétel az <span class="m">ℝ<sup>4</sup></span> egységgömbjét jelöli ki. Ez az <span class="m">S<sup>3</sup></span>. Egy forgatást tehát nem egy háromelemű vektor ad meg, hanem egy <em>pont ezen a felületen</em>.</p><p>A forgatás maga <strong>kétoldali</strong> hatás. A forgatandó <span class="m">p</span> vektort tiszta kvaternióként írjuk — nulla skalárrésszel, <span class="m">(0, p)</span> —, és:</p><p class="matline"><span class="m">p′ = q p q<sup>−1</sup></span></p><p>Az inverz pedig egységkvaternióra egyszerűen a konjugált, <span class="m">q<sup>−1</sup> = (w, −v)</span>, éppen mert <span class="m">‖q‖ = 1</span>.</p><p>És most az egyetlen dolog, amit ebből a képletből fejben kell tartani. Ha a tengely <span class="m">u</span>, a szög <span class="m">θ</span>, akkor</p><p class="matline"><span class="m">q = (cos θ/2,&nbsp; u sin θ/2)</span></p><p>A tengely ugyanaz az <span class="m">u</span>, amit az <span class="m">SO(3)</span> holdon Euler tétele adott. A szög viszont <strong>feleakkora</strong>. A jelenetben ezt mutatja a két mutató: a test <span class="m">θ</span>-t fordul, a kvaternió saját paramétere közben csak <span class="m">θ/2</span>-ig ér.</p><p>Ez nem konvenció és nem elírás: <button class="termbtn" id="quHalfInfo" type="button" aria-expanded="false" aria-controls="quHalfNote">a kétoldali hatásból következik</button>. A <span class="m">q</span> kétszer szerepel a képletben, tehát a szög kétszer számítódik — a feleakkora generátor pontosan ezt egyenlíti ki.</p><p>Hogy ez a kódolás nem magányos ötlet, hanem egy család középső tagja — komplex szám a síkon, kvaternió a térben, Rodrigues-vektor a mátrixok felől —, azt az <em>SO(2)</em> hold táblázata mutatja meg. Itt most az a kérdés, mit ad és mit kér cserébe a középső sor.</p><div class="bubble" id="quHalfNote" role="dialog" aria-label="Honnan jon a felezes" hidden><p>Két szabály kell, mindkettő közvetlenül a kvaterniószorzás definíciójából (<span class="m">i<sup>2</sup> = j<sup>2</sup> = k<sup>2</sup> = ijk = −1</span>).</p><p><strong>Egy:</strong> két <em>tiszta</em> kvaternió szorzata két ismerős darabra esik szét:</p><p class="matline"><span class="m" data-speak="a b egyenlő mínusz a skalárszorzat b plusz a vektoriális szorzat b">a b = −a·b + a×b</span></p><p><strong>Kettő:</strong> ha <span class="m">u</span> és <span class="m">v</span> egységnyi és <em>merőleges</em>, akkor a skalárszorzat eltűnik, tehát <span class="m" data-speak="u v egyenlő u vektoriálisan v">uv = u×v</span> és <span class="m" data-speak="v u egyenlő mínusz u vektoriálisan v">vu = −u×v</span>. A kettő ugyanaz, ellenkező előjellel: <strong>antikommutálnak</strong>.</p><p>Legyen most <span class="m">c = cos θ/2</span>, <span class="m">s = sin θ/2</span>, és <span class="m">v</span> merőleges a tengelyre. Told át a <span class="m">q</span>-t a <span class="m">v</span> másik oldalára:</p><p class="matline"><span class="m">q v = (c + s u) v = c v + s (u v) = c v − s (v u) = v (c − s u)</span></p><p>Ez a lépés az egész magyarázat. A szendvicsben ezért a két tényező <em>összeszorzódik</em>:</p><p class="matline"><span class="m">q v q<sup>−1</sup> = v (c − s u)(c − s u) = v (c − s u)<sup>2</sup></span></p><p class="matline"><span class="m">(c − s u)<sup>2</sup> = (c<sup>2</sup> − s<sup>2</sup>) − 2cs u = cos θ − u sin θ</span></p><p>(itt <span class="m">u<sup>2</sup> = −1</span>, mert <span class="m">u</span> egységnyi tiszta kvaternió — ugyanaz az azonosság, ami a komplex <span class="m">i</span>-t is jellemzi). Az utolsó lépés pedig visszaolvasva:</p><p class="matline"><span class="m" data-speak="v szorozva kifejezés kozinusz théta mínusz u szinusz théta egyenlő v kozinusz théta plusz u vektoriálisan v szorozva szinusz théta">v (cos θ − u sin θ) = v cos θ + (u × v) sin θ</span></p><p>Ez pontosan a <span class="m">θ</span> szögű forgatás. A <strong>négyzet</strong> az, ami megduplázza a szöget, tehát a két tényezőnek fejenként <span class="m">θ/2</span>-t kell hoznia.</p><p>A tengely irányú komponens pedig változatlan marad: ha <span class="m">v</span> párhuzamos <span class="m">u</span>-val, akkor a kettő <em>kommutál</em>, így <span class="m">q v q<sup>−1</sup> = v q q<sup>−1</sup> = v</span>. Ami a tengelyen van, az helyben marad — ahogy egy forgatástól elvárjuk.</p></div>',
        },
        {
          t: 'Ugyanaz a forgatás, három írásmód',
          b: '<p>Mielőtt továbbmegyünk, tegyük egymás mellé a hármat. A hold hátralévő része — és minden library — folyamatosan mozog köztük, tehát érdemes egyszer tisztán látni, melyik micsoda.</p><p><strong>A mátrix: ahová a bázisvektorok kerültek.</strong> A jelenetben a három fényes nyíl nem illusztráció, hanem szó szerint az <span class="m">R</span> három <em>oszlopa</em>. Egy forgatásmátrix nem kilenc független szám, hanem három kép: hová vitte a forgatás az <span class="m">x̂</span>, <span class="m">ŷ</span> és <span class="m">ẑ</span> tengelyt. A halvány triád mutatja, honnan indultak.</p><p class="matline"><span class="m">R =</span><span class="matrix"><span class="mbracket"></span><span class="mgrid"><span>x̂′</span><span>ŷ′</span><span>ẑ′</span></span><span class="mbracket right"></span></span></p><p><strong>A tengely és a szög: Euler olvasata.</strong> A zöld tengely és a narancssárga ív. Ezt az <span class="m">SO(3)</span> hold adta: minden forgatásnak van egy fix tengelye, és a forgatás ekörül fordít <span class="m">θ</span>-t. Négy szám, egy kényszerrel (<span class="m">‖a‖ = 1</span>).</p><p><strong>A kvaternió: ugyanaz a tengely, feleakkora szöggel.</strong> Ez a belső, kék ív. És itt jön az, amiért érdemes volt egymás mellé rakni őket: a kvaternió <em>nem</em> egy negyedik, független ötlet. Pontosan ugyanazt a két adatot hordozza, mint az axis-angle — egy tengelyt és egy szöget —, csak másképp csomagolva.</p><p class="matline"><span class="m">(a, θ) ⟶ q = (cos θ/2,&nbsp; a sin θ/2)</span></p><p>És a csomagolás az, ami számít. A Rodrigues-vektor <span class="m">ω = aθ</span> a szöget <em>lineárisan</em> tárolja, tehát a vektor hossza maga a szög. Ettől kényelmes olvasni, de ettől van varrata <span class="m">θ = π</span>-nél, és ettől határozatlan a tengelye <span class="m">θ = 0</span>-nál. A kvaternió ugyanazt a szöget egy <span class="m">sin</span>-be és egy <span class="m">cos</span>-ba teszi, és így mindkét helyen sima marad.</p><p>Húzd a csúszkát, és nézd a számokat. Kilenc mozog a mátrixban, négy a kvaternióban, és a kettő végig <em>ugyanazt</em> a forgatást írja le. Az <button class="termbtn" id="quConvInfo" type="button" aria-expanded="false" aria-controls="quConvNote">oda-vissza váltás</button> mindegyik pár között zárt képlet, és egy kivétellel egyik sem drága.</p><p class="matline"><span class="m">R =</span><span class="matrix"><span class="mbracket"></span><span class="mgrid" id="quRepM"><span>—</span><span>—</span><span>—</span><span>—</span><span>—</span><span>—</span><span>—</span><span>—</span><span>—</span></span><span class="mbracket right"></span></span></p><div class="slrow"><label>θ = <b id="quRepTh">0°</b></label><input type="range" id="quRepSl" min="0" max="180" value="52" step="1" aria-label="theta"></div><div class="ro">a = <b id="quRepA">—</b> &nbsp;·&nbsp; q = <b id="quRepQ">—</b> &nbsp;·&nbsp; <button class="act" id="quRepAuto" type="button" style="padding:2px 10px;font-size:16px">auto</button></div><p>Amit tehát érdemes fejben tartani, az nem rangsor, hanem munkamegosztás:</p><p class="matline"><span class="m">R — 9 szám, 6 kényszer — ezt engeded rá egy pontra</span></p><p class="matline"><span class="m">(a, θ) — 4 szám, 1 kényszer — ezt olvasod, ha tudni akarod, mit csinál</span></p><p class="matline"><span class="m">q — 4 szám, 1 kényszer — ebben tárolsz és ezzel szorzol</span></p><p>Hogy az utolsó sor <em>miért</em> nyeri meg a tárolást és a szorzást, arra a hold hátralévő négy állomása felel. Az első kettő arról szól, mit ad a kvaternió a másik kettőhöz képest, a másik kettő arról, mit kér érte cserébe.</p><div class="bubble" id="quConvNote" role="dialog" aria-label="A negy valtas" hidden><p><strong>(a, θ) → q.</strong> Odafelé puszta beírás, nincs benne semmi:</p><p class="matline"><span class="m">q = (cos θ/2,&nbsp; a sin θ/2)</span></p><p>Visszafelé:</p><p class="matline"><span class="m">θ = 2 arccos w</span>,&nbsp;&nbsp;<span class="m">a = v / ‖v‖</span></p><p>Egyetlen rossz pontja van, a <span class="m">‖v‖ = 0</span>, vagyis a <span class="m">θ = 0</span>. Ott nincs tengely, mert nincs mi körül forgatni. Ez viszont nem a kvaternió baja, hanem az <em>axis-angle</em>-é: a <span class="m">q = (1, 0, 0, 0)</span> tökéletesen rendben van, csak nem lehet belőle tengelyt kiolvasni.</p><p><strong>q → R.</strong> Zárt képlet, csupa szorzás és összeadás, trigonometria nélkül:</p><p class="matline"><span class="m" data-speak="R egyenlő I plusz kétszer w v kalap plusz kétszer v kalap négyzet">R = I + 2w v<sup>∧</sup> + 2(v<sup>∧</sup>)<sup>2</sup></span></p><p>ahol <span class="m">v<sup>∧</sup></span> a kalap-operátor az <span class="m">SO(3)</span> holdról. A kártya kilenc száma is ezen a képleten keresztül jön ki abból a <span class="m">q</span>-ból, amit fölötte olvasol.</p><p><strong>R → q.</strong> Ez az egy, ami figyelmet kér. A nyomból (a főátló összegéből) indulunk, mert <span class="m">tr R = 4w<sup>2</sup> − 1</span>:</p><p class="matline"><span class="m">w = ½ √(1 + tr R)</span></p><p class="matline"><span class="m">v = (R<sub>32</sub> − R<sub>23</sub>,&nbsp; R<sub>13</sub> − R<sub>31</sub>,&nbsp; R<sub>21</sub> − R<sub>12</sub>) / 4w</span></p><p>Ez viszont szétesik, ha <span class="m">w</span> nulla közelébe kerül, vagyis <span class="m">θ</span> közel van <span class="m">π</span>-hez, hiszen <span class="m">4w</span>-vel osztunk. Ezért választ minden komoly implementáció négy ág közül aszerint, hogy <span class="m">w</span>, <span class="m">x</span>, <span class="m">y</span>, <span class="m">z</span> közül melyik a legnagyobb. Ez a Shepperd-módszer, és ha láttál már kvaternió-konverziót négy <em>if</em>-ággal, most már tudod, miért néz ki úgy.</p><p><strong>R → (a, θ)</strong> pedig a <span class="m">log</span>: <span class="m">cos θ = (tr R − 1)/2</span>, a tengely pedig <span class="m">R</span> egyhez tartozó sajátvektora. Ez az <span class="m">SO(3)</span> hold anyaga, itt csak a kör bezárása kedvéért áll.</p></div>',
        },
        {
          t: 'Kettős fedés: q és −q ugyanaz',
          b: '<p>Húzd végig a csúszkát, és nézd a két kört. A külső jelölő a <em>forgatás</em>, a belső a <em>kvaternió</em>. Egyetlen tengely körül maradunk, és ott ez a kép nem hasonlat, hanem a teljes igazság: az <span class="m">u</span> körüli forgatások egy kört alkotnak, a <span class="m">±u</span> irányú egységkvaterniók szintén egy kört, a köztük lévő leképezést pedig a két szaggatott vonal rajzolja ki.</p><p><span class="m">360°</span>-nál a külső jelölő visszaér oda, ahonnan indult: a test egy teljes fordulat után ugyanúgy áll. A belső viszont csak félúton jár — a <span class="m">−1</span>-nél. A test tehát ugyanott van, a kvaternió mégis előjelet váltott.</p><p>Ez nem hiba, hanem a lényeg:</p><p class="matline"><span class="m">(−q) p (−q)<sup>−1</sup> = q p q<sup>−1</sup></span></p><p>A szendvicsben a két mínusz kiejti egymást, tehát <strong>q és −q ugyanaz a forgatás</strong>. Az <span class="m">S<sup>3</sup> → SO(3)</span> leképezés ezért pontosan <strong>kétszeres fedés</strong>: minden forgatásnak két őse van, és a kettő egymás átellenese a gömbön.</p><p><span class="m">720°</span> kell ahhoz, hogy a kvaternió is hazaérjen. Ez ugyanaz a <span class="m">ℤ/2</span>, amit az <span class="m">SO(3)</span> hold a hurkokkal és a szíjtrükkel mutat meg, a <em>Riemann-gradiens</em> hold pedig a golyó átellenes pontjaival — csak most a fedés felől nézve. Mivel az <span class="m">S<sup>3</sup></span> egyszeresen összefüggő, ő az <span class="m">SO(3)</span> <em>univerzális</em> fedése, és ezzel:</p><p class="matline"><span class="m">SO(3) ≅ ℝP<sup>3</sup></span></p><p>vagyis az <span class="m">S<sup>3</sup></span> az átellenes pontok azonosításával. Ez a legpontosabb válasz arra a kérdésre, hogy milyen alakú valójában a forgatások tere.</p><p><strong>És most a csapda, ami ebből következik.</strong> Ha <span class="m">q</span> és <span class="m">−q</span> ugyanaz a forgatás, akkor a komponensek különbsége <em>nem</em> távolság. Két <em>azonos</em> forgatás úgy is kijöhet, hogy <span class="m">‖q − q′‖ = 2</span>, ami a lehető legnagyobb érték: a nulla helyett a maximum.</p><p>Ezért kezdődik minden komoly kvaterniós összehasonlítás, interpoláció és átlagolás ugyanazzal a fél sorral: <em>ha</em> <span class="m">q·q′ &lt; 0</span>, cseréld <span class="m">q′</span>-t <span class="m">−q′</span>-re. Ugyanaz a forgatás, csak a közelebbi őse — és ettől lesz <button class="termbtn" id="quSignInfo" type="button" aria-expanded="false" aria-controls="quSignNote">a szög is a rövidebbik</button>.</p><div class="slrow"><label>θ = <b id="quDcTh">0°</b></label><input type="range" id="quDcSl" min="0" max="720" value="0" step="1" aria-label="theta"></div><div class="ro">q = <b id="quDcQ">—</b> &nbsp;·&nbsp; <button class="act" id="quDcAuto" type="button" style="padding:2px 10px;font-size:16px">auto</button></div><div class="bubble" id="quSignNote" role="dialog" aria-label="Ket forgatas kozti szog" hidden><p>Két forgatás közti <em>valódi</em> (geodetikus) szög a két kvaternió skalárszorzatából jön:</p><p class="matline"><span class="m" data-speak="delta théta egyenlő kétszer arkusz kozinusz q skalárszorzat q vessző abszolút értéke">Δθ = 2 arccos |q · q′|</span></p><p>Két dolog van benne, és mindkettő ismerős.</p><p>Az <strong>abszolút érték</strong> maga a kettős fedés javítása. Nélküle <span class="m">q</span> és <span class="m">−q</span> között <span class="m">180°</span>-ot mérnél a gömbön, ami forgatásban <span class="m">360°</span> — azaz a semmit, a hosszabbik úton körbe. Az abszolút érték mindig a két lehetséges ős közül a közelebbit választja.</p><p>A <strong>kettes szorzó</strong> pedig ugyanaz a felezés visszafelé, mint az előző állomáson: a gömbön mért szög fele a forgatás szögének.</p><p>Innen már látszik, miért nem lehet reziduumot építeni nyers komponensekből. Amit egy megoldó össze akar hasonlítani, az két forgatás <em>különbsége</em>, nem két számnégyes különbsége — és ennek a különbségnek a helyes alakja a <span class="m">⊟</span>, aminek az utolsó állomás adja meg a kvaterniós képletét.</p></div>',
        },
        {
          t: 'A szingularitást veszi le, nem a görbületet',
          b: '<p>Ezt a jelenetet — és a következőt — egy fokkal lejjebb rajzoljuk: az <span class="m">S<sup>3</sup></span> helyén egy közönséges gömbfelület áll. Ez nem csalás, hanem az <span class="m">SO(3)</span> holdon felépített <span class="m">S<sup>1</sup> → S<sup>2</sup> → S<sup>3</sup></span> létra következő foka lefelé: ugyanaz a szerkezet, eggyel kevesebb dimenzióval, és minden, ami itt látszik, ott is igaz.</p><p><strong>Amit a kvaternió megvesz.</strong> A zöld jelölő átcsúszik a narancssárga gyűrűn, és nem történik semmi. Pedig épp ott hal el a szélesség–hosszúság chart: a póluson a hosszúság értelmét veszti, és ez az, amit az <span class="m">SO(3)</span> holdon gimbal lockként láttunk rangvesztésnek. A pólus a <em>koordinátáé</em>, nem a felületé. Az <span class="m">S<sup>3</sup></span> ugyanígy sima és szingularitásmentes: nincs rajta kitüntetett rossz pont, se rangvesztés, se varrat.</p><p>Ez már önmagában komoly nyereség. Az Euler-szögek rangot veszítenek, a Rodrigues-vektornak varrata van a <span class="m">θ = π</span> gömbhéjon (ott <span class="m">+πa</span> és <span class="m">−πa</span> ugyanaz a forgatás), a kvaterniónak <em>egyik sem</em>.</p><p><strong>És most, amit nem vesz meg.</strong> Vegyük a felület két pontját, és átlagoljuk őket komponensenként. Az eredmény — a jelenet narancssárga pontja — <em>a felület alatt</em> van. Nem forgatás, csak egy számnégyes, ami nem egységnyi. A húr belevág a gömbbe, és minél nagyobb a nyílás, annál mélyebbre.</p><p>Pontosan <button class="termbtn" id="quChordInfo" type="button" aria-expanded="false" aria-controls="quChordNote">ennyivel rövidebb</button>: <span class="m">cos(Ω/2)</span>, ahol <span class="m">Ω</span> a két kvaternió közti szög. <span class="m">Ω = 90°</span>-nál ez <span class="m">0,707</span> — az „átlag” majdnem 30 százalékkal rövid.</p><p>A javítás egyetlen osztás a normával, és itt érdemes megállni egy pillanatra, mert ez a kvaternió legpraktikusabb előnye. Egy elsodródott forgatásmátrixon ugyanez a javítás <strong>hat</strong> feltétel helyreállítása (a három oszlop egységnyi és páronként merőleges), tehát Gram–Schmidt vagy SVD. Egy elsodródott kvaternión egy osztás.</p><p>De a görbület ettől nem tűnt el. Ez a csere, egy táblázatban:</p><p class="matline"><span class="m">Euler / Rodrigues — 3 szám, szingularitással</span></p><p class="matline"><span class="m">kvaternió — 4 szám, egy kényszerrel</span></p><p class="matline"><span class="m">„3 lapos szám, kényszer nélkül” — lehetetlen</span></p><p>A harmadik sor nem nehéz, hanem <em>kizárt</em> — ezt bizonyítja az <span class="m">SO(3)</span> hold a kompaktsággal és a hurkokkal. A kvaternió úgy menekül, hogy <strong>eggyel feljebb lép dimenzióban</strong>: egy kényszert cserél simaságra.</p><p>Amit tehát <em>nem</em> kapunk, az a laposság. Márpedig épp az kellene: összeadni, skálázni, átlagolni, deriválni — mindez vektortérbeli művelet, és az <span class="m">S<sup>3</sup></span> ugyanúgy kompakt és görbült, mint az <span class="m">SO(3)</span>. Ez a két tulajdonság — szingularitásmentesség és laposság — külön dolog, és az összekeverésük a téma leggyakoribb félreértése. Az utolsó állomás erről szól.</p><div class="bubble" id="quChordNote" role="dialog" aria-label="Mennyivel rovid a hur felezopontja" hidden><p>Legyen <span class="m">q<sub>0</sub></span> és <span class="m">q<sub>1</sub></span> egységnyi, és <span class="m">Ω</span> a köztük lévő szög, azaz <span class="m">q<sub>0</sub>·q<sub>1</sub> = cos Ω</span>. Ekkor</p><p class="matline"><span class="m">‖q<sub>0</sub> + q<sub>1</sub>‖<sup>2</sup> = 2 + 2 cos Ω = 4 cos<sup>2</sup>(Ω/2)</span></p><p class="matline"><span class="m">‖(q<sub>0</sub> + q<sub>1</sub>)/2‖ = cos(Ω/2)</span></p><p>A második sor a felezési azonosság, semmi több. És mivel a gömbön mért <span class="m">Ω</span> a forgatások közti szög fele, egy <span class="m">90°</span>-os <em>forgatáskülönbség</em> itt <span class="m">Ω = 45°</span>, tehát <span class="m">cos 22,5° = 0,924</span>: nyolc százalék hiba. Egy <span class="m">180°</span>-osnál viszont <span class="m">0,707</span>.</p><p>Egy pontosítás, hogy a kép ne legyen félrevezető: <em>két</em> kvaternióra a normált átlag véletlenül épp a geodetikus felezőpont — a szimmetria miatt ez a SLERP fele útja. <em>Kettőnél többre</em> viszont már nem az. Ott a normált átlag közelítés, aminek a hibája a szórással nő.</p></div>',
        },
        {
          t: 'A szorzat: azonos szög, tükrözött tengely',
          b: '<p>Két forgatás egymás után: a két kvaternió szorzata. A sorrend olvasata a szokásos — ha előbb <span class="m">q<sub>1</sub></span> hat, aztán <span class="m">q<sub>2</sub></span>, akkor az eredő <span class="m">q<sub>2</sub>q<sub>1</sub></span>, ugyanúgy, ahogy a mátrixoknál <span class="m">T<sub>2</sub>T<sub>1</sub></span>.</p><p class="matline"><span class="m" data-speak="q kettő q egy egyenlő nyitó zárójel w kettő w egy mínusz v kettő skalárszorzat v egy, vessző, w kettő v egy plusz w egy v kettő plusz v kettő vektoriálisan v egy">q<sub>2</sub>q<sub>1</sub> = (w<sub>2</sub>w<sub>1</sub> − v<sub>2</sub>·v<sub>1</sub>,&nbsp; w<sub>2</sub>v<sub>1</sub> + w<sub>1</sub>v<sub>2</sub> + v<sub>2</sub>×v<sub>1</sub>)</span></p><p>Egy skalárszorzat és egy vektoriális szorzat — <button class="termbtn" id="quProdInfo" type="button" aria-expanded="false" aria-controls="quProdNote">ennyi az egész</button>, és mindkettő közvetlenül a definícióból esik ki.</p><p>Most cseréljük fel a sorrendet, és nézzük meg, mi változik. A skalárrész nem: a skalárszorzat szimmetrikus. Az első két vektortag sem: az összeadás kommutál. <strong>Egyedül a vektoriális szorzat vált előjelet</strong>, mert az antiszimmetrikus:</p><p class="matline"><span class="m" data-speak="q egy q kettő egyenlő ugyanaz, de mínusz v kettő vektoriálisan v egy">q<sub>1</sub>q<sub>2</sub> = (w<sub>2</sub>w<sub>1</sub> − v<sub>2</sub>·v<sub>1</sub>,&nbsp; w<sub>2</sub>v<sub>1</sub> + w<sub>1</sub>v<sub>2</sub> − v<sub>2</sub>×v<sub>1</sub>)</span></p><p>Két következmény, és mindkettő ott van a jelenetben.</p><p><strong>Egy: a két sorrend ugyanakkora szöggel forgat.</strong> A szöget a skalárrész adja (<span class="m">w = cos θ/2</span>), az pedig változatlan. A jelenet <span class="m">θ</span>-ja ezért <em>egy</em> szám mindkét nyílra: bárhogy hullámzik a két bemeneti szög, ez a kettő együtt mozog.</p><p><strong>Kettő: a két tengely egymás tükörképe.</strong> A különbség <span class="m" data-speak="kétszer v kettő vektoriálisan v egy">2 v<sub>2</sub>×v<sub>1</sub></span>, ami merőleges a két bemeneti tengely síkjára — a jelenetben halványan kirajzolt korongra. Ezért ül a két eredő tengely szimmetrikusan a korong fölött és alatt, és ezért látszik a különbség csak akkor, ha a korongot élből nézzük.</p><p>Vagyis a 3D nem-kommutativitása — amit az <span class="m">SO(3)</span> holdon <span class="m">R<sub>x</sub>R<sub>z</sub> ≠ R<sub>z</sub>R<sub>x</sub></span> alakban láttunk — <strong>egyetlen vektoriális szorzatban lakik</strong>. Ez nem szójáték: ugyanez a tag marad meg elsőrendben a Lie-zárójelben is, <span class="m" data-speak="szögletes zárójel ómega egy vessző ómega kettő egyenlő ómega egy vektoriálisan ómega kettő">[ω<sub>1</sub>, ω<sub>2</sub>] = ω<sub>1</sub> × ω<sub>2</sub></span> az <span class="m">𝔰𝔬(3)</span>-on. Ha egy tengely körül maradunk, a vektoriális szorzat eltűnik, és a szorzás kommutatívvá válik — pontosan ezért volt szelíd az <span class="m">SO(2)</span>.</p><p>Végül két gyakorlati megjegyzés, amiért a library-k egyáltalán kvaterniót tárolnak. A szorzat <strong>16 szorzás</strong> egy <span class="m">3×3</span> mátrixszorzat 27-e helyett, a tárolás pedig négy szám kilenc helyett. És mivel a kvaternió normája multiplikatív — <span class="m">‖q<sub>2</sub>q<sub>1</sub>‖ = ‖q<sub>2</sub>‖‖q<sub>1</sub>‖</span> —, két egységkvaternió szorzata pontosan egységnyi: a kompozíció sosem lép le az <span class="m">S<sup>3</sup></span>-ról.</p><div class="bubble" id="quProdNote" role="dialog" aria-label="A Hamilton-szorzat levezetese" hidden><p>A kiindulás Hamilton három azonossága, semmi más:</p><p class="matline"><span class="m">i<sup>2</sup> = j<sup>2</sup> = k<sup>2</sup> = ijk = −1</span></p><p>Ebből következik a többi: <span class="m">ij = k</span>, <span class="m">ji = −k</span>, és ciklikusan. Írjuk most a kvaterniót <span class="m">q = w + v</span> alakban, ahol <span class="m">v</span> a tiszta (vektor) rész, és szorozzuk össze őket tagonként:</p><p class="matline"><span class="m">q<sub>2</sub>q<sub>1</sub> = (w<sub>2</sub> + v<sub>2</sub>)(w<sub>1</sub> + v<sub>1</sub>) = w<sub>2</sub>w<sub>1</sub> + w<sub>2</sub>v<sub>1</sub> + w<sub>1</sub>v<sub>2</sub> + v<sub>2</sub>v<sub>1</sub></span></p><p>Az első három tag közönséges skalár-vektor szorzás. Az utolsó az egyetlen érdekes, és a bázisokon kiszámolva pontosan ez jön ki:</p><p class="matline"><span class="m" data-speak="v kettő v egy egyenlő mínusz v kettő skalárszorzat v egy plusz v kettő vektoriálisan v egy">v<sub>2</sub>v<sub>1</sub> = −v<sub>2</sub>·v<sub>1</sub> + v<sub>2</sub>×v<sub>1</sub></span></p><p>Vagyis <em>két tiszta kvaternió szorzatában együtt van a skalár- és a vektoriális szorzat</em>: az <span class="m">i<sup>2</sup> = −1</span>-féle tagokból lesz a negatív skalárszorzat, az <span class="m">ij = k</span>-féle tagokból a vektoriális. A skalár- és vektorrész szétválogatása után éppen a kártya képlete marad.</p><p>Ez egyben a legrövidebb magyarázat arra is, miért <em>négy</em> szám. Három nem volna elég: a szorzatnak van skalárrésze (a <span class="m">−v·v</span> tag), ami nem fér el egy tiszta vektorban. A négy dimenzió nem díszítés, hanem az, ami a szorzást zárttá teszi.</p></div>',
        },
        {
          t: 'Tárolni négyben, lépni háromban',
          b: '<p>Egy kérdés maradt, és ettől lesz az egész holdnak gyakorlati tétje. Ha a kvaternió ennyire jó, miért nem egyszerűen a négy számán optimalizálunk?</p><p>Mert a négy szám nem négy szabadsági fok. A <span class="m">‖q‖ = 1</span> kényszer egyet elvesz, és a jelenet szaggatott nyila megmutatja, melyiket: <strong>sugárirányban a költség nem lát semmit</strong>. Egy ilyen lépés megváltoztatja a számokat, de nem változtatja meg a forgatást — a kód úgyis normál, mielőtt használná.</p><p>Ennek pontos következménye van a megoldóra nézve. Ha a költség nem változik egy irány mentén, akkor a második deriváltja is nulla arra: a Hesse-mátrixnak <button class="termbtn" id="quNullInfo" type="button" aria-expanded="false" aria-controls="quNullNote">van egy nullirányú vektora</button>, méghozzá maga a <span class="m">q</span>. A <span class="m">H δ = −g</span> rendszer így szinguláris, a megoldás nem egyértelmű, és ugyanez a rangvesztés jelenik meg a kovarianciában is. Nem numerikus rosszullét: a paraméterezés mondja meg rosszul, hány ismeretlen van.</p><p>A megoldás nem trükk, hanem <strong>munkamegosztás</strong> — és ez az egész téma mérnöki kifutása:</p><p class="matline"><span class="m">tárolj négyben, lépj háromban</span></p><p><strong>Tárolj</strong> kvaternióként: globális, szingularitásmentes, olcsón szorozható, egy osztással normálható. <strong>Lépj</strong> az érintőtérben: ott a dimenzió pontosan 3, nincs kényszer, és a Hesse-mátrix jól kondicionált. A jelenetben ez a két dolog látszik egymás mellett — a felület, amin <span class="m">q</span> él, és a korong, amiben <span class="m">δ</span> mozog.</p><p>A kettő közti kapcsolat a <span class="m">⊞</span>:</p><p class="matline"><span class="m" data-speak="q dobozos plusz delta egyenlő q szorozva exp delta">q ⊞ δ = q ⊗ exp(δ)</span></p><p class="matline"><span class="m">exp(δ) = (cos(‖δ‖/2),&nbsp; sin(‖δ‖/2) δ/‖δ‖)</span></p><p>ahol <span class="m">δ ∈ ℝ<sup>3</sup></span> a tangensvektor, a szorzás pedig <em>jobbról</em> jön: a lépést a test saját tengelyeiben mérjük, ami a body/world megkülönböztetés — az <span class="m">SO(3)</span> hold második állomása. Balról szorozva a világ tengelyeiben lépnénk, és a kettő nem ugyanaz, és pont ez volt a nem-kommutativitás ára.</p><p>És figyeld meg, mi bukkan fel újra: a <strong>felezés</strong>. Ugyanaz és ugyanazért, mint az első állomáson — a kvaternió kétoldalt hat, tehát a saját paramétere mindig a szög fele. Az <span class="m">exp</span> maga nem itt van levezetve: a lapos <span class="m">ℝ<sup>n</sup></span> hold utolsó állomása mondja meg, miért éppen ez a <span class="m">⊞</span> egyetlen lehetséges alakja, a sokaságon futó iterációt pedig a <em>Riemann-gradiens</em> hold járja végig.</p><p>Ez az, amit egy solver „manifold”-nak vagy „local parameterization”-nak hív. A Ceres <span class="m">QuaternionManifold</span>-ja négy számot tárol és 3-DOF <span class="m">Plus</span>-t használ. A Sophus <span class="m">SO3</span>-ja kvaterniót tárol és három dimenzióban léptet. Amikor egy library ezt kéri, pontosan ezt a szétválasztást kéri, és semmi mást.</p><p><strong>És itt ez a hold megáll.</strong> A kvaterniós reziduumok Jacobijai, a SLERP zárt alakja és a Hamilton-szorzat algebrai gyakorlása nincs itt. Az interpoláció az <span class="m">SE(3)</span> hold utolsó állomásáé, ahol <span class="m">exp</span>/<span class="m">log</span> párként áll elő — a kvaterniós SLERP ugyanannak a zárt alakja, nem másik állítás.</p><div class="bubble" id="quNullNote" role="dialog" aria-label="Miert szingularis a Hesse-matrix" hidden><p>Egy sor algebra, és pontosan látszik.</p><p>A költség csak a <em>forgatástól</em> függ, a számnégyes hosszától nem — bármelyik implementáció normálja <span class="m">q</span>-t, mielőtt használná. Tehát minden <span class="m">α &gt; 0</span>-ra:</p><p class="matline"><span class="m">L(α q) = L(q)</span></p><p>Nézzük ezt <span class="m">α = 1 + ε</span> mellett: a <span class="m">q</span> irányában elmozdulva a költség <em>végig</em> ugyanannyi. Egy konstans függvénynek pedig az első és a második deriváltja is nulla:</p><p class="matline"><span class="m" data-speak="g skalárszorzat q egyenlő nulla">g·q = 0</span></p><p class="matline"><span class="m">H q = 0</span></p><p>A második sor azt mondja, hogy <span class="m">q</span> benne van a <span class="m">H</span> magterében. Egy szinguláris <span class="m">H</span>-val a <span class="m">H δ = −g</span> normálegyenletnek nincs egyértelmű megoldása: ha <span class="m">δ</span> megoldás, akkor <span class="m">δ + c q</span> is, bármely <span class="m">c</span>-re.</p><p>Ez nem javítható csillapítással sem igazán: egy <span class="m">λ</span> hozzáadása (a <em>LM</em> hold trükkje) a mátrixot megoldhatóvá teszi, de a felesleges irányba tett lépés akkor is értelmetlen — a rendszer nem rosszul kondicionált, hanem <em>túlparaméterezett</em>. A gyógymód nem a numerika, hanem hogy az a szabadsági fok eleve be se kerüljön a paramétervektorba.</p></div>',
        },
      ],
      en: [
        {
          t: 'Four Numbers, One Constraint',
          b: '<p>The <span class="m">SO(3)</span> moon closed on a theorem: there is <strong>no</strong> global, singularity-free three-number coordinate for rotations. That is not clumsiness to be worked around — so the question is not which three numbers to pick, but what to pay instead.</p><p>The quaternion’s answer: <strong>four numbers and one constraint</strong>.</p><p class="matline"><span class="m">q = w + xi + yj + zk = (w, v)</span>,&nbsp;&nbsp;<span class="m">v ∈ ℝ<sup>3</sup></span></p><p class="matline"><span class="m">‖q‖<sup>2</sup> = w<sup>2</sup> + x<sup>2</sup> + y<sup>2</sup> + z<sup>2</sup> = 1</span></p><p><span class="m">‖q‖ = 1</span> cuts out the unit sphere of <span class="m">ℝ<sup>4</sup></span>, which is <span class="m">S<sup>3</sup></span>. A rotation is therefore not given by a three-vector but by a <em>point on that surface</em>.</p><p>The rotation itself is a <strong>two-sided</strong> action. Write the vector <span class="m">p</span> as a pure quaternion — zero scalar part, <span class="m">(0, p)</span> — and:</p><p class="matline"><span class="m">p′ = q p q<sup>−1</sup></span></p><p>For a unit quaternion the inverse is just the conjugate, <span class="m">q<sup>−1</sup> = (w, −v)</span>, precisely because <span class="m">‖q‖ = 1</span>.</p><p>And now the one thing to keep in mind from the formula. With axis <span class="m">u</span> and angle <span class="m">θ</span>:</p><p class="matline"><span class="m">q = (cos θ/2,&nbsp; u sin θ/2)</span></p><p>The axis is the same <span class="m">u</span> Euler’s theorem produced on the <span class="m">SO(3)</span> moon. The angle, though, is <strong>halved</strong>. That is what the dial in the scene shows: the body turns by <span class="m">θ</span> while the quaternion’s own parameter only reaches <span class="m">θ/2</span>.</p><p>Not a convention and not a typo: <button class="termbtn" id="quHalfInfo" type="button" aria-expanded="false" aria-controls="quHalfNote">it follows from the two-sided action</button>. <span class="m">q</span> appears twice in the formula, so the angle is counted twice — and the half-size generator is exactly what compensates.</p><p>That this encoding is not a lone trick but the middle member of a family — complex numbers in the plane, quaternions in space, the Rodrigues vector from the matrix side — is what the <em>SO(2)</em> moon’s table shows. The question here is what that middle row buys, and what it charges.</p><div class="bubble" id="quHalfNote" role="dialog" aria-label="Where the half angle comes from" hidden><p>Two rules are needed, both straight from the definition of the quaternion product (<span class="m">i<sup>2</sup> = j<sup>2</sup> = k<sup>2</sup> = ijk = −1</span>).</p><p><strong>One:</strong> the product of two <em>pure</em> quaternions splits into two familiar pieces:</p><p class="matline"><span class="m" data-speak="a b equals minus a dot b plus a cross b">a b = −a·b + a×b</span></p><p><strong>Two:</strong> if <span class="m">u</span> and <span class="m">v</span> are unit and <em>perpendicular</em>, the dot product vanishes, so <span class="m" data-speak="u v equals u cross v">uv = u×v</span> and <span class="m" data-speak="v u equals minus u cross v">vu = −u×v</span>. Same thing, opposite sign: they <strong>anticommute</strong>.</p><p>Now let <span class="m">c = cos θ/2</span>, <span class="m">s = sin θ/2</span>, and take <span class="m">v</span> perpendicular to the axis. Push <span class="m">q</span> through to the other side of <span class="m">v</span>:</p><p class="matline"><span class="m">q v = (c + s u) v = c v + s (u v) = c v − s (v u) = v (c − s u)</span></p><p>That step is the whole explanation. In the sandwich the two factors therefore <em>multiply together</em>:</p><p class="matline"><span class="m">q v q<sup>−1</sup> = v (c − s u)(c − s u) = v (c − s u)<sup>2</sup></span></p><p class="matline"><span class="m">(c − s u)<sup>2</sup> = (c<sup>2</sup> − s<sup>2</sup>) − 2cs u = cos θ − u sin θ</span></p><p>(using <span class="m">u<sup>2</sup> = −1</span>, since <span class="m">u</span> is a unit pure quaternion — the same identity that characterises the complex <span class="m">i</span>). Reading the last step back:</p><p class="matline"><span class="m" data-speak="v times cosine theta minus u sine theta equals v cosine theta plus u cross v sine theta">v (cos θ − u sin θ) = v cos θ + (u × v) sin θ</span></p><p>which is exactly rotation by <span class="m">θ</span>. The <strong>square</strong> is what doubles the angle, so each factor has to carry <span class="m">θ/2</span>.</p><p>And the component along the axis is untouched: if <span class="m">v</span> is parallel to <span class="m">u</span> the two <em>commute</em>, so <span class="m">q v q<sup>−1</sup> = v q q<sup>−1</sup> = v</span>. What lies on the axis stays put, as a rotation ought to leave it.</p></div>',
        },
        {
          t: 'One Rotation, Three Notations',
          b: '<p>Before going on, put the three side by side. The rest of this moon — and every library — moves between them constantly, so it is worth seeing once, clearly, which is which.</p><p><strong>The matrix: where the basis vectors landed.</strong> The three bright arrows in the scene are not an illustration but literally the three <em>columns</em> of <span class="m">R</span>. A rotation matrix is not nine independent numbers; it is three images: where the rotation took <span class="m">x̂</span>, <span class="m">ŷ</span> and <span class="m">ẑ</span>. The faint triad shows where they started.</p><p class="matline"><span class="m">R =</span><span class="matrix"><span class="mbracket"></span><span class="mgrid"><span>x̂′</span><span>ŷ′</span><span>ẑ′</span></span><span class="mbracket right"></span></span></p><p><strong>The axis and the angle: Euler’s reading.</strong> The green axis and the orange arc. This came from the <span class="m">SO(3)</span> moon: every rotation has a fixed axis, and turns by <span class="m">θ</span> about it. Four numbers with one constraint (<span class="m">‖a‖ = 1</span>).</p><p><strong>The quaternion: the same axis, half the angle.</strong> That is the inner, blue arc. And here is why it was worth lining them up: the quaternion is <em>not</em> a fourth, independent idea. It carries exactly the same two things axis-angle does — an axis and an angle — differently packaged.</p><p class="matline"><span class="m">(a, θ) ⟶ q = (cos θ/2,&nbsp; a sin θ/2)</span></p><p>And the packaging is what matters. The Rodrigues vector <span class="m">ω = aθ</span> stores the angle <em>linearly</em>, so the vector’s length is the angle itself. Convenient to read, but it is also why it has a seam at <span class="m">θ = π</span> and an undefined axis at <span class="m">θ = 0</span>. The quaternion puts that same angle inside a <span class="m">sin</span> and a <span class="m">cos</span>, and so stays smooth at both.</p><p>Drag the slider and watch the numbers. Nine of them move in the matrix, four in the quaternion, and the two describe the <em>same</em> rotation throughout. <button class="termbtn" id="quConvInfo" type="button" aria-expanded="false" aria-controls="quConvNote">Converting between them</button> is a closed formula in every direction, and cheap in all but one.</p><p class="matline"><span class="m">R =</span><span class="matrix"><span class="mbracket"></span><span class="mgrid" id="quRepM"><span>—</span><span>—</span><span>—</span><span>—</span><span>—</span><span>—</span><span>—</span><span>—</span><span>—</span></span><span class="mbracket right"></span></span></p><div class="slrow"><label>θ = <b id="quRepTh">0°</b></label><input type="range" id="quRepSl" min="0" max="180" value="52" step="1" aria-label="theta"></div><div class="ro">a = <b id="quRepA">—</b> &nbsp;·&nbsp; q = <b id="quRepQ">—</b> &nbsp;·&nbsp; <button class="act" id="quRepAuto" type="button" style="padding:2px 10px;font-size:16px">auto</button></div><p>So what to keep in mind is not a ranking but a division of labour:</p><p class="matline"><span class="m">R — 9 numbers, 6 constraints — this is what you apply to a point</span></p><p class="matline"><span class="m">(a, θ) — 4 numbers, 1 constraint — this is what you read to see what it does</span></p><p class="matline"><span class="m">q — 4 numbers, 1 constraint — this is what you store in and multiply with</span></p><p><em>Why</em> the last line wins storage and multiplication is what the remaining four stations answer. The first two are about what the quaternion gives over the other two; the last two are about what it charges for it.</p><div class="bubble" id="quConvNote" role="dialog" aria-label="The four conversions" hidden><p><strong>(a, θ) → q.</strong> Going in, it is pure transcription, with nothing to it:</p><p class="matline"><span class="m">q = (cos θ/2,&nbsp; a sin θ/2)</span></p><p>Coming back:</p><p class="matline"><span class="m">θ = 2 arccos w</span>,&nbsp;&nbsp;<span class="m">a = v / ‖v‖</span></p><p>It has exactly one bad point, <span class="m">‖v‖ = 0</span>, that is <span class="m">θ = 0</span>. There is no axis there, because there is nothing to turn about. But that is not the quaternion’s problem, it is <em>axis-angle’s</em>: <span class="m">q = (1, 0, 0, 0)</span> is perfectly well behaved, it simply has no axis to read out of it.</p><p><strong>q → R.</strong> A closed formula, all multiplication and addition, no trigonometry:</p><p class="matline"><span class="m" data-speak="R equals I plus two w v hat plus two v hat squared">R = I + 2w v<sup>∧</sup> + 2(v<sup>∧</sup>)<sup>2</sup></span></p><p>where <span class="m">v<sup>∧</sup></span> is the hat operator from the <span class="m">SO(3)</span> moon. The card’s nine numbers come through this formula from the <span class="m">q</span> printed above them.</p><p><strong>R → q.</strong> This is the one that asks for attention. It starts from the trace, since <span class="m">tr R = 4w<sup>2</sup> − 1</span>:</p><p class="matline"><span class="m">w = ½ √(1 + tr R)</span></p><p class="matline"><span class="m">v = (R<sub>32</sub> − R<sub>23</sub>,&nbsp; R<sub>13</sub> − R<sub>31</sub>,&nbsp; R<sub>21</sub> − R<sub>12</sub>) / 4w</span></p><p>And it falls apart as <span class="m">w</span> approaches zero, that is as <span class="m">θ</span> approaches <span class="m">π</span>, because the division is by <span class="m">4w</span>. Which is why every serious implementation picks between four branches according to which of <span class="m">w</span>, <span class="m">x</span>, <span class="m">y</span>, <span class="m">z</span> is largest — Shepperd’s method. If you have ever seen a quaternion conversion with four <em>if</em> branches, that is why it looks like that.</p><p><strong>R → (a, θ)</strong> is the <span class="m">log</span>: <span class="m">cos θ = (tr R − 1)/2</span>, with the axis the eigenvector of <span class="m">R</span> for eigenvalue one. That belongs to the <span class="m">SO(3)</span> moon; it is here only to close the circle.</p></div>',
        },
        {
          t: 'The Double Cover: q and −q Are One Rotation',
          b: '<p>Drag the slider and watch the two circles. The outer marker is the <em>rotation</em>, the inner one is the <em>quaternion</em>. We stay about a single axis, and there this picture is not an analogy but the whole truth: the rotations about <span class="m">u</span> form a circle, the unit quaternions along <span class="m">±u</span> form a circle, and the two dashed links draw the map between them.</p><p>At <span class="m">360°</span> the outer marker is back where it started — a full turn leaves the body as it was. The inner one is only halfway, sitting at <span class="m">−1</span>. Same body, and yet the quaternion has changed sign.</p><p>That is not a defect. It is the point:</p><p class="matline"><span class="m">(−q) p (−q)<sup>−1</sup> = q p q<sup>−1</sup></span></p><p>The two minus signs cancel inside the sandwich, so <strong>q and −q are the same rotation</strong>. The map <span class="m">S<sup>3</sup> → SO(3)</span> is therefore exactly a <strong>double cover</strong>: every rotation has two preimages, antipodal to each other on the sphere.</p><p>It takes <span class="m">720°</span> for the quaternion to come home too. This is the same <span class="m">ℤ/2</span> the <span class="m">SO(3)</span> moon shows with loops and the belt trick, and the <em>Riemannian GD</em> moon with the ball’s identified boundary points — seen here from the covering side. Since <span class="m">S<sup>3</sup></span> is simply connected it is the <em>universal</em> cover of <span class="m">SO(3)</span>, which is to say:</p><p class="matline"><span class="m">SO(3) ≅ ℝP<sup>3</sup></span></p><p><span class="m">S<sup>3</sup></span> with antipodal points identified. That is the most precise answer to what shape the space of rotations actually is.</p><p><strong>And now the trap that follows from it.</strong> If <span class="m">q</span> and <span class="m">−q</span> are one rotation, then the difference of the components is <em>not</em> a distance. Two <em>identical</em> rotations can come out at <span class="m">‖q − q′‖ = 2</span>, the largest value there is: the maximum instead of zero.</p><p>Which is why every serious quaternion comparison, interpolation and average opens with the same half line: <em>if</em> <span class="m">q·q′ &lt; 0</span>, replace <span class="m">q′</span> by <span class="m">−q′</span>. The same rotation, but the nearer preimage — and that is what makes <button class="termbtn" id="quSignInfo" type="button" aria-expanded="false" aria-controls="quSignNote">the angle the shorter one</button> as well.</p><div class="slrow"><label>θ = <b id="quDcTh">0°</b></label><input type="range" id="quDcSl" min="0" max="720" value="0" step="1" aria-label="theta"></div><div class="ro">q = <b id="quDcQ">—</b> &nbsp;·&nbsp; <button class="act" id="quDcAuto" type="button" style="padding:2px 10px;font-size:16px">auto</button></div><div class="bubble" id="quSignNote" role="dialog" aria-label="The angle between two rotations" hidden><p>The <em>true</em> (geodesic) angle between two rotations comes from the dot product of their quaternions:</p><p class="matline"><span class="m" data-speak="delta theta equals two arc cosine of the absolute value of q dot q prime">Δθ = 2 arccos |q · q′|</span></p><p>Two things are in there, and both are familiar.</p><p>The <strong>absolute value</strong> is the double cover’s repair. Without it you would measure <span class="m">180°</span> on the sphere between <span class="m">q</span> and <span class="m">−q</span>, which is <span class="m">360°</span> of rotation — that is, nothing at all, taken the long way round. The absolute value always picks the nearer of the two preimages.</p><p>The <strong>factor of two</strong> is the halving of the previous station, read backwards: the angle measured on the sphere is half the rotation angle.</p><p>From here it is clear why a residual cannot be built from raw components. What a solver wants to compare is the <em>difference of two rotations</em>, not the difference of two quadruples — and the right form of that difference is <span class="m">⊟</span>, whose quaternion formula the last station gives.</p></div>',
        },
        {
          t: 'It Removes the Singularity, Not the Curvature',
          b: '<p>This scene — and the next — is drawn one rung down: an ordinary sphere stands in for <span class="m">S<sup>3</sup></span>. Not a cheat but the next rung down the <span class="m">S<sup>1</sup> → S<sup>2</sup> → S<sup>3</sup></span> ladder the <span class="m">SO(3)</span> moon builds: the same structure with one dimension fewer, and everything visible here is true up there.</p><p><strong>What the quaternion buys.</strong> The green marker slides across the orange ring and nothing happens. Yet that is exactly where the latitude–longitude chart dies: at the pole, longitude loses its meaning, and that is what we saw as the rank collapse of gimbal lock on the <span class="m">SO(3)</span> moon. The pole belongs to the <em>coordinate</em>, not to the surface. <span class="m">S<sup>3</sup></span> is smooth and singularity-free in the same way: no distinguished bad point, no rank loss, no seam.</p><p>That alone is a real gain. Euler angles lose rank, the Rodrigues vector has a seam on the <span class="m">θ = π</span> shell (where <span class="m">+πa</span> and <span class="m">−πa</span> are the same rotation), the quaternion has <em>neither</em>.</p><p><strong>And now what it does not buy.</strong> Take two points of the surface and average them componentwise. The result — the orange dot in the scene — sits <em>below the surface</em>. It is not a rotation; it is a quadruple that is not of unit length. The chord cuts into the sphere, and the wider the opening, the deeper it cuts.</p><p>Short by exactly <button class="termbtn" id="quChordInfo" type="button" aria-expanded="false" aria-controls="quChordNote">this much</button>: <span class="m">cos(Ω/2)</span>, where <span class="m">Ω</span> is the angle between the two quaternions. At <span class="m">Ω = 90°</span> that is <span class="m">0.707</span> — the “average” is nearly 30 per cent short.</p><p>The repair is one division by the norm, and this is worth a pause, because it is the quaternion’s most practical advantage. On a rotation matrix that has drifted, the same repair means restoring <strong>six</strong> conditions (three columns of unit length, pairwise perpendicular): Gram–Schmidt, or an SVD. On a quaternion that has drifted, it is one division.</p><p>But none of that removed the curvature. The trade, as a table:</p><p class="matline"><span class="m">Euler / Rodrigues — 3 numbers, with singularities</span></p><p class="matline"><span class="m">quaternion — 4 numbers, with one constraint</span></p><p class="matline"><span class="m">“3 flat numbers, no constraint” — impossible</span></p><p>The third row is not hard but <em>excluded</em> — which is what the <span class="m">SO(3)</span> moon proves, with compactness and with loops. The quaternion escapes by <strong>going up one dimension</strong>: it trades a constraint for smoothness.</p><p>So what we do <em>not</em> get is flatness. And flatness is precisely what is wanted: adding, scaling, averaging, differentiating are all vector-space operations, and <span class="m">S<sup>3</sup></span> is every bit as compact and curved as <span class="m">SO(3)</span>. These two properties — being singularity-free and being flat — are different things, and confusing them is the commonest misunderstanding in the subject. The last station is about that.</p><div class="bubble" id="quChordNote" role="dialog" aria-label="How short the chord midpoint is" hidden><p>Let <span class="m">q<sub>0</sub></span> and <span class="m">q<sub>1</sub></span> be unit, with <span class="m">Ω</span> the angle between them, so <span class="m">q<sub>0</sub>·q<sub>1</sub> = cos Ω</span>. Then</p><p class="matline"><span class="m">‖q<sub>0</sub> + q<sub>1</sub>‖<sup>2</sup> = 2 + 2 cos Ω = 4 cos<sup>2</sup>(Ω/2)</span></p><p class="matline"><span class="m">‖(q<sub>0</sub> + q<sub>1</sub>)/2‖ = cos(Ω/2)</span></p><p>The second line is the half-angle identity, nothing more. And since the angle <span class="m">Ω</span> on the sphere is half the angle between the rotations, a <span class="m">90°</span> <em>rotation</em> difference is <span class="m">Ω = 45°</span> here, giving <span class="m">cos 22.5° = 0.924</span>: eight per cent of error. A <span class="m">180°</span> one gives <span class="m">0.707</span>.</p><p>One clarification so the picture does not mislead: for <em>two</em> quaternions the normalised average happens to be exactly the geodesic midpoint — by symmetry it is SLERP at one half. For <em>more than two</em> it is not; there the normalised average is an approximation whose error grows with the spread.</p></div>',
        },
        {
          t: 'The Product: Same Angle, Mirrored Axis',
          b: '<p>Two rotations in succession: the product of the two quaternions. The reading of the order is the usual one — if <span class="m">q<sub>1</sub></span> acts first and then <span class="m">q<sub>2</sub></span>, the result is <span class="m">q<sub>2</sub>q<sub>1</sub></span>, exactly as <span class="m">T<sub>2</sub>T<sub>1</sub></span> for matrices.</p><p class="matline"><span class="m" data-speak="q two q one equals w two w one minus v two dot v one, comma, w two v one plus w one v two plus v two cross v one">q<sub>2</sub>q<sub>1</sub> = (w<sub>2</sub>w<sub>1</sub> − v<sub>2</sub>·v<sub>1</sub>,&nbsp; w<sub>2</sub>v<sub>1</sub> + w<sub>1</sub>v<sub>2</sub> + v<sub>2</sub>×v<sub>1</sub>)</span></p><p>One dot product and one cross product; <button class="termbtn" id="quProdInfo" type="button" aria-expanded="false" aria-controls="quProdNote">that is all of it</button>, and both fall straight out of the definition.</p><p>Now swap the order and see what changes. Not the scalar part: the dot product is symmetric. Not the first two vector terms either: addition commutes. <strong>Only the cross product changes sign</strong>, because it is antisymmetric:</p><p class="matline"><span class="m" data-speak="q one q two equals the same, but minus v two cross v one">q<sub>1</sub>q<sub>2</sub> = (w<sub>2</sub>w<sub>1</sub> − v<sub>2</sub>·v<sub>1</sub>,&nbsp; w<sub>2</sub>v<sub>1</sub> + w<sub>1</sub>v<sub>2</sub> − v<sub>2</sub>×v<sub>1</sub>)</span></p><p>Two consequences, and both are in the scene.</p><p><strong>One: the two orders rotate by the same angle.</strong> The angle comes from the scalar part (<span class="m">w = cos θ/2</span>), which is unchanged. That is why the scene’s <span class="m">θ</span> is <em>one</em> number for both arrows: however the two input angles swing, these two move together.</p><p><strong>Two: the two axes are mirror images.</strong> The difference is <span class="m" data-speak="two v two cross v one">2 v<sub>2</sub>×v<sub>1</sub></span>, perpendicular to the plane of the two input axes — the faint disc in the scene. So the two resulting axes sit symmetrically above and below that disc, which is also why the difference is only visible with the disc seen edge-on.</p><p>In other words, non-commutativity in 3D — met as <span class="m">R<sub>x</sub>R<sub>z</sub> ≠ R<sub>z</sub>R<sub>x</sub></span> on the <span class="m">SO(3)</span> moon — <strong>lives in a single cross product</strong>. That is not wordplay: the same term is what survives to first order as the Lie bracket, <span class="m" data-speak="bracket omega one comma omega two equals omega one cross omega two">[ω<sub>1</sub>, ω<sub>2</sub>] = ω<sub>1</sub> × ω<sub>2</sub></span> on <span class="m">𝔰𝔬(3)</span>. Stay about one axis and the cross product vanishes, so the multiplication commutes — which is precisely why <span class="m">SO(2)</span> was so mild.</p><p>Finally, two practical notes on why libraries store quaternions at all. The product is <strong>16 multiplications</strong> against 27 for a <span class="m">3×3</span> matrix product, and storage is four numbers against nine. And because the quaternion norm is multiplicative — <span class="m">‖q<sub>2</sub>q<sub>1</sub>‖ = ‖q<sub>2</sub>‖‖q<sub>1</sub>‖</span> — the product of two unit quaternions is exactly unit: composition never steps off <span class="m">S<sup>3</sup></span>.</p><div class="bubble" id="quProdNote" role="dialog" aria-label="Deriving the Hamilton product" hidden><p>The starting point is Hamilton’s three identities and nothing else:</p><p class="matline"><span class="m">i<sup>2</sup> = j<sup>2</sup> = k<sup>2</sup> = ijk = −1</span></p><p>The rest follows: <span class="m">ij = k</span>, <span class="m">ji = −k</span>, and cyclically. Write a quaternion as <span class="m">q = w + v</span> with <span class="m">v</span> the pure (vector) part, and multiply out term by term:</p><p class="matline"><span class="m">q<sub>2</sub>q<sub>1</sub> = (w<sub>2</sub> + v<sub>2</sub>)(w<sub>1</sub> + v<sub>1</sub>) = w<sub>2</sub>w<sub>1</sub> + w<sub>2</sub>v<sub>1</sub> + w<sub>1</sub>v<sub>2</sub> + v<sub>2</sub>v<sub>1</sub></span></p><p>The first three terms are ordinary scalar-times-vector. The last is the only interesting one, and worked out on the basis elements it comes to exactly this:</p><p class="matline"><span class="m" data-speak="v two v one equals minus v two dot v one plus v two cross v one">v<sub>2</sub>v<sub>1</sub> = −v<sub>2</sub>·v<sub>1</sub> + v<sub>2</sub>×v<sub>1</sub></span></p><p>That is, <em>the product of two pure quaternions carries the dot product and the cross product at once</em>: the <span class="m">i<sup>2</sup> = −1</span> terms make the negative dot product, the <span class="m">ij = k</span> terms make the cross product. Sorting scalar from vector part leaves exactly the formula on the card.</p><p>It is also the shortest answer to why <em>four</em> numbers. Three would not do: the product has a scalar part (the <span class="m">−v·v</span> term) and there is nowhere in a pure vector to put it. The fourth dimension is not decoration — it is what makes the multiplication closed.</p></div>',
        },
        {
          t: 'Store in Four, Step in Three',
          b: '<p>One question is left, and it is the one that gives this moon its practical stake. If the quaternion is this good, why not simply optimise on its four numbers?</p><p>Because four numbers are not four degrees of freedom. The constraint <span class="m">‖q‖ = 1</span> takes one away, and the dashed arrow in the scene shows which: <strong>along the radius the cost sees nothing</strong>. Such a step changes the numbers but not the rotation — the code normalises before using it anyway.</p><p>That has an exact consequence for the solver. If the cost does not change along a direction, its second derivative along that direction is zero too: the Hessian <button class="termbtn" id="quNullInfo" type="button" aria-expanded="false" aria-controls="quNullNote">has a null vector</button>, and it is <span class="m">q</span> itself. The system <span class="m">H δ = −g</span> is then singular, its solution is not unique, and the same rank loss reappears in the covariance. This is not numerical malaise: the parameterisation is misreporting how many unknowns there are.</p><p>The answer is not a trick but a <strong>division of labour</strong> — and it is the engineering upshot of the whole subject:</p><p class="matline"><span class="m">store in four, step in three</span></p><p><strong>Store</strong> as a quaternion: global, singularity-free, cheap to multiply, repaired by one division. <strong>Step</strong> in the tangent space: there the dimension is exactly 3, there is no constraint, and the Hessian is well conditioned. Both are visible side by side in the scene — the surface <span class="m">q</span> lives on, and the disc <span class="m">δ</span> moves in.</p><p>What connects them is <span class="m">⊞</span>:</p><p class="matline"><span class="m" data-speak="q box plus delta equals q times exp delta">q ⊞ δ = q ⊗ exp(δ)</span></p><p class="matline"><span class="m">exp(δ) = (cos(‖δ‖/2),&nbsp; sin(‖δ‖/2) δ/‖δ‖)</span></p><p>where <span class="m">δ ∈ ℝ<sup>3</sup></span> is the tangent vector and the multiplication comes from the <em>right</em>: the step is measured in the body’s own axes, which is the body/world distinction — station 2 of the <span class="m">SO(3)</span> moon. Multiplying from the left would step in world axes; the two are not the same, and that difference was exactly the price of non-commutativity.</p><p>And notice what surfaces again: the <strong>halving</strong>. The same one, for the same reason as at the first station — the quaternion acts from both sides, so its own parameter is always half the angle. <span class="m">exp</span> itself is not derived here: the flat <span class="m">ℝ<sup>n</sup></span> moon’s last station says why this is the only possible form of <span class="m">⊞</span>, and the <em>Riemannian GD</em> moon walks the whole iteration on the manifold.</p><p>This is what a solver calls a “manifold” or a “local parameterization”. Ceres’s <span class="m">QuaternionManifold</span> stores four numbers and uses a 3-DOF <span class="m">Plus</span>; Sophus’s <span class="m">SO3</span> stores a quaternion and steps in three dimensions. When a library asks for this, it is asking for exactly that split and nothing else.</p><p><strong>And this moon stops here.</strong> Jacobians of quaternion residuals, the closed form of SLERP, and drill on the algebra of the Hamilton product are not here. Interpolation belongs to the <span class="m">SE(3)</span> moon’s last station, where it comes out as an <span class="m">exp</span>/<span class="m">log</span> pair — quaternion SLERP being the closed form of that same statement, not a different one.</p><div class="bubble" id="quNullNote" role="dialog" aria-label="Why the Hessian is singular" hidden><p>One line of algebra, and it is plain.</p><p>The cost depends only on the <em>rotation</em>, not on the length of the quadruple — every implementation normalises <span class="m">q</span> before using it. So for every <span class="m">α &gt; 0</span>:</p><p class="matline"><span class="m">L(α q) = L(q)</span></p><p>Take <span class="m">α = 1 + ε</span>: moving in the direction of <span class="m">q</span>, the cost stays the same <em>throughout</em>. And a constant function has first and second derivative zero:</p><p class="matline"><span class="m" data-speak="g dot q equals zero">g·q = 0</span></p><p class="matline"><span class="m">H q = 0</span></p><p>The second line says <span class="m">q</span> lies in the null space of <span class="m">H</span>. With a singular <span class="m">H</span> the normal equation <span class="m">H δ = −g</span> has no unique solution: if <span class="m">δ</span> solves it, so does <span class="m">δ + c q</span> for any <span class="m">c</span>.</p><p>Nor is damping a real fix: adding a <span class="m">λ</span> (the <em>LM</em> moon’s device) makes the matrix solvable, but a step taken in the redundant direction is still meaningless — the system is not ill-conditioned, it is <em>over-parameterised</em>. The cure is not numerical; it is to keep that degree of freedom out of the parameter vector in the first place.</p></div>',
        },
      ],
      ja: [
        {
          t: '四つの数と一つの拘束',
          b: '<p><span class="m">SO(3)</span> の衛星は、一つの定理で終わりました。回転に対して、大域的で特異点のない三つの数の座標は<strong>存在しません</strong>。これは工夫の足りなさではありません。ですから問いは、どの三つの数を選ぶかではなく、代わりに何を支払うかになります。</p><p>四元数（quaternion）の答えは、<strong>四つの数と一つの拘束</strong>です。</p><p class="matline"><span class="m">q = w + xi + yj + zk = (w, v)</span>,&nbsp;&nbsp;<span class="m">v ∈ ℝ<sup>3</sup></span></p><p class="matline"><span class="m">‖q‖<sup>2</sup> = w<sup>2</sup> + x<sup>2</sup> + y<sup>2</sup> + z<sup>2</sup> = 1</span></p><p><span class="m">‖q‖ = 1</span> は <span class="m">ℝ<sup>4</sup></span> の単位球面を切り出します。これが <span class="m">S<sup>3</sup></span> です。つまり回転を与えるのは三次元ベクトルではなく、<em>この曲面の上の一点</em>です。</p><p>回転そのものは<strong>両側から</strong>の作用です。ベクトル <span class="m">p</span> をスカラー部が 0 の純四元数 <span class="m">(0, p)</span> と書くと、こうなります。</p><p class="matline"><span class="m">p′ = q p q<sup>−1</sup></span></p><p>単位四元数の逆元は共役そのもの、<span class="m">q<sup>−1</sup> = (w, −v)</span> です。<span class="m">‖q‖ = 1</span> だからです。</p><p>さて、この式から覚えておくべきことが一つだけあります。軸を <span class="m">u</span>、角を <span class="m">θ</span> とすると、</p><p class="matline"><span class="m">q = (cos θ/2,&nbsp; u sin θ/2)</span></p><p>軸は <span class="m">SO(3)</span> の衛星でオイラーの定理が与えたのと同じ <span class="m">u</span> です。ところが角は<strong>半分</strong>です。シーンの二本の針が示しているのがそれです。物体が <span class="m">θ</span> だけ回る間に、四元数自身のパラメータは <span class="m">θ/2</span> までしか進みません。</p><p>これは約束事でも書き誤りでもありません。<button class="termbtn" id="quHalfInfo" type="button" aria-expanded="false" aria-controls="quHalfNote">両側作用から出てきます</button>。式の中に <span class="m">q</span> が二度現れるので、角も二度数えられます。半分の生成子は、それをちょうど打ち消すためのものです。</p><p>この符号化が単独の思いつきではなく、一つの族の真ん中の一員であること、つまり平面の複素数、空間の四元数、行列側から見たロドリゲスベクトルが同じ一つの主張であることは、<em>SO(2)</em> の衛星の表が見せてくれます。ここでの問いは、その真ん中の行が何を与え、何を要求するかです。</p><div class="bubble" id="quHalfNote" role="dialog" aria-label="半角はどこから来るのか" hidden><p>必要な規則は二つで、どちらも四元数の積の定義（<span class="m">i<sup>2</sup> = j<sup>2</sup> = k<sup>2</sup> = ijk = −1</span>）から直接出ます。</p><p><strong>一つめ。</strong><em>純</em>四元数どうしの積は、見慣れた二つの部分に分かれます。</p><p class="matline"><span class="m" data-speak="a b は マイナス a と b の内積 プラス a と b の外積">a b = −a·b + a×b</span></p><p><strong>二つめ。</strong><span class="m">u</span> と <span class="m">v</span> が単位で<em>直交</em>していれば内積は消えるので、<span class="m" data-speak="u v は u と v の外積">uv = u×v</span> かつ <span class="m" data-speak="v u は マイナス u と v の外積">vu = −u×v</span> です。同じものが符号違いで現れます。つまり<strong>反交換</strong>します。</p><p>ここで <span class="m">c = cos θ/2</span>、<span class="m">s = sin θ/2</span> とし、<span class="m">v</span> を軸に直交させます。<span class="m">q</span> を <span class="m">v</span> の反対側へ押し通してみます。</p><p class="matline"><span class="m">q v = (c + s u) v = c v + s (u v) = c v − s (v u) = v (c − s u)</span></p><p>この一手が説明のすべてです。おかげでサンドイッチの中で、二つの因子が<em>掛け合わさります</em>。</p><p class="matline"><span class="m">q v q<sup>−1</sup> = v (c − s u)(c − s u) = v (c − s u)<sup>2</sup></span></p><p class="matline"><span class="m">(c − s u)<sup>2</sup> = (c<sup>2</sup> − s<sup>2</sup>) − 2cs u = cos θ − u sin θ</span></p><p>ここで <span class="m">u<sup>2</sup> = −1</span> を使いました。<span class="m">u</span> は単位の純四元数だからです。複素数の <span class="m">i</span> を特徴づけるのと同じ等式です。最後の行を読み直すと、</p><p class="matline"><span class="m" data-speak="v かける コサイン シータ マイナス u サイン シータ は v コサイン シータ プラス u と v の外積 かける サイン シータ">v (cos θ − u sin θ) = v cos θ + (u × v) sin θ</span></p><p>これはちょうど角 <span class="m">θ</span> の回転です。角を二倍にしているのは<strong>二乗</strong>です。だから因子一つあたり <span class="m">θ/2</span> でなければなりません。</p><p>軸方向の成分はどうでしょうか。<span class="m">v</span> が <span class="m">u</span> と平行なら二つは<em>交換</em>するので、<span class="m">q v q<sup>−1</sup> = v q q<sup>−1</sup> = v</span> です。軸の上にあるものはその場に留まります。回転に期待するとおりです。</p></div>',
        },
        {
          t: '一つの回転、三つの書き方',
          b: '<p>先へ進む前に、三つを並べておきます。この衛星の残りも、そしてどのライブラリも、この三つの間を絶えず行き来します。ですから一度きちんと、どれが何なのかを見ておく価値があります。</p><p><strong>行列は、基底ベクトルの行き先です。</strong>シーンの明るい三本の矢は説明用の飾りではありません。文字どおり <span class="m">R</span> の三つの<em>列</em>です。回転行列は独立な九つの数ではありません。<span class="m">x̂</span>、<span class="m">ŷ</span>、<span class="m">ẑ</span> がどこへ移ったか、という三つの像です。薄いほうの三脚が、出発点を示しています。</p><p class="matline"><span class="m">R =</span><span class="matrix"><span class="mbracket"></span><span class="mgrid"><span>x̂′</span><span>ŷ′</span><span>ẑ′</span></span><span class="mbracket right"></span></span></p><p><strong>軸と角は、オイラーの読み方です。</strong>緑の軸とオレンジの弧がそれです。これは <span class="m">SO(3)</span> の衛星が与えてくれました。どの回転にも固定された軸があり、そのまわりに <span class="m">θ</span> だけ回す、という読み方です。数は四つ、拘束は一つ（<span class="m">‖a‖ = 1</span>）です。</p><p><strong>四元数は、同じ軸で角が半分です。</strong>内側の青い弧がそれです。ここが、三つを並べた甲斐のあるところです。四元数は四つめの独立した発想では<em>ありません</em>。軸と角という、axis-angle とまったく同じ二つを運んでいます。包み方が違うだけです。</p><p class="matline"><span class="m">(a, θ) ⟶ q = (cos θ/2,&nbsp; a sin θ/2)</span></p><p>そして、効いてくるのがその包み方です。ロドリゲスベクトル <span class="m">ω = aθ</span> は角を<em>線形に</em>持ちます。ベクトルの長さがそのまま角です。読むには便利ですが、<span class="m">θ = π</span> に継ぎ目ができ、<span class="m">θ = 0</span> で軸が定まらなくなるのも、そのためです。四元数は同じ角を <span class="m">sin</span> と <span class="m">cos</span> の中に入れるので、どちらの場所でも滑らかなままです。</p><p>スライダーを動かして、数を見てください。行列では九つが動き、四元数では四つが動きます。そして両者は最後まで<em>同じ</em>回転を表しています。<button class="termbtn" id="quConvInfo" type="button" aria-expanded="false" aria-controls="quConvNote">相互の変換</button>はどの向きも閉じた式で、一つを除いて安く済みます。</p><p class="matline"><span class="m">R =</span><span class="matrix"><span class="mbracket"></span><span class="mgrid" id="quRepM"><span>—</span><span>—</span><span>—</span><span>—</span><span>—</span><span>—</span><span>—</span><span>—</span><span>—</span></span><span class="mbracket right"></span></span></p><div class="slrow"><label>θ = <b id="quRepTh">0°</b></label><input type="range" id="quRepSl" min="0" max="180" value="52" step="1" aria-label="theta"></div><div class="ro">a = <b id="quRepA">—</b> &nbsp;·&nbsp; q = <b id="quRepQ">—</b> &nbsp;·&nbsp; <button class="act" id="quRepAuto" type="button" style="padding:2px 10px;font-size:16px">自動</button></div><p>覚えておきたいのは順位ではなく、役割分担です。</p><p class="matline"><span class="m">R：9 個、拘束 6 個。点に作用させるのはこれです</span></p><p class="matline"><span class="m">(a, θ)：4 個、拘束 1 個。何をする回転かを読むのはこれです</span></p><p class="matline"><span class="m">q：4 個、拘束 1 個。保存し、掛けるのはこれです</span></p><p>最後の行が<em>なぜ</em>保存と積を勝ち取るのかは、残り四つのステーションが答えます。はじめの二つは、四元数が他の二つに対して何を与えるかの話です。あとの二つは、その代わりに何を要求するかの話です。</p><div class="bubble" id="quConvNote" role="dialog" aria-label="四つの変換" hidden><p><strong>(a, θ) から q へ。</strong>行きは書き写すだけで、中身は何もありません。</p><p class="matline"><span class="m">q = (cos θ/2,&nbsp; a sin θ/2)</span></p><p>戻りはこうです。</p><p class="matline"><span class="m">θ = 2 arccos w</span>,&nbsp;&nbsp;<span class="m">a = v / ‖v‖</span></p><p>悪い点はちょうど一つ、<span class="m">‖v‖ = 0</span>、つまり <span class="m">θ = 0</span> です。そこには軸がありません。まわるべき相手がないからです。ただしこれは四元数の欠点ではなく、<em>axis-angle</em> の欠点です。<span class="m">q = (1, 0, 0, 0)</span> は何の問題もなく、ただ軸が読み出せないだけです。</p><p><strong>q から R へ。</strong>閉じた式で、掛け算と足し算だけです。三角関数は要りません。</p><p class="matline"><span class="m" data-speak="R は I プラス 二かける w かける v ハット プラス 二かける v ハットの二乗">R = I + 2w v<sup>∧</sup> + 2(v<sup>∧</sup>)<sup>2</sup></span></p><p>ここで <span class="m">v<sup>∧</sup></span> は <span class="m">SO(3)</span> の衛星で出てきたハット演算子です。カードの九つの数も、その上に出ている <span class="m">q</span> からこの式を通って出てきています。</p><p><strong>R から q へ。</strong>注意が要るのはこれ一つです。<span class="m">tr R = 4w<sup>2</sup> − 1</span> なので、トレース（対角成分の和）から始めます。</p><p class="matline"><span class="m">w = ½ √(1 + tr R)</span></p><p class="matline"><span class="m">v = (R<sub>32</sub> − R<sub>23</sub>,&nbsp; R<sub>13</sub> − R<sub>31</sub>,&nbsp; R<sub>21</sub> − R<sub>12</sub>) / 4w</span></p><p>ところがこれは <span class="m">w</span> がゼロに近づくと、つまり <span class="m">θ</span> が <span class="m">π</span> に近づくと崩れます。<span class="m">4w</span> で割っているからです。だから実用的な実装はどれも、<span class="m">w</span>、<span class="m">x</span>、<span class="m">y</span>、<span class="m">z</span> のうち最大のものに応じて四つの分岐から選びます。シェパード（Shepperd）の方法です。四元数の変換に <em>if</em> が四本並んでいるのを見たことがあるなら、理由はこれです。</p><p><strong>R から (a, θ) へ</strong>は <span class="m">log</span> です。<span class="m">cos θ = (tr R − 1)/2</span> で、軸は固有値 1 に対する <span class="m">R</span> の固有ベクトルです。これは <span class="m">SO(3)</span> の衛星の内容で、ここでは輪を閉じるために置いてあります。</p></div>',
        },
        {
          t: '二重被覆：q と −q は同じ回転',
          b: '<p>スライダーを動かして、二つの円を見てください。外側の印が<em>回転</em>、内側の印が<em>四元数</em>です。ここでは一つの軸のまわりだけを見ています。そしてその範囲では、この図は例えではなく事実そのものです。<span class="m">u</span> のまわりの回転は円をなし、<span class="m">±u</span> 方向の単位四元数も円をなし、その間の写像を二本の破線が描いています。</p><p><span class="m">360°</span> で外側の印は出発点に戻ります。一回転すれば物体の姿勢は元どおりです。ところが内側の印はまだ半分、<span class="m">−1</span> のところにいます。物体は同じ場所にいるのに、四元数は符号が変わったわけです。</p><p>これは不具合ではなく、要点です。</p><p class="matline"><span class="m">(−q) p (−q)<sup>−1</sup> = q p q<sup>−1</sup></span></p><p>サンドイッチの中で二つのマイナスが打ち消し合います。つまり <strong>q と −q は同じ回転</strong>です。写像 <span class="m">S<sup>3</sup> → SO(3)</span> はちょうど<strong>二重被覆</strong>になります。どの回転にも原像が二つあり、その二つは球面上で対蹠の位置にあります。</p><p>四元数が家に帰るには <span class="m">720°</span> 必要です。これは <span class="m">SO(3)</span> の衛星がループとベルトの技で見せ、<em>リーマン勾配</em>の衛星が球の同一視された境界点で見せる <span class="m">ℤ/2</span> と同じものです。ここでは被覆の側から見ています。<span class="m">S<sup>3</sup></span> は単連結なので <span class="m">SO(3)</span> の<em>普遍</em>被覆であり、したがって、</p><p class="matline"><span class="m">SO(3) ≅ ℝP<sup>3</sup></span></p><p>対蹠点を同一視した <span class="m">S<sup>3</sup></span> です。回転の空間が本当はどんな形なのか、という問いへの最も正確な答えがこれです。</p><p><strong>そして、ここから出てくる落とし穴です。</strong><span class="m">q</span> と <span class="m">−q</span> が同じ回転なら、成分の差は<em>距離ではありません</em>。<em>同一の</em>回転どうしでも <span class="m">‖q − q′‖ = 2</span> になりえます。ゼロどころか、取りうる最大値です。</p><p>だから四元数の比較、補間、平均は、どれも同じ半行から始まります。<span class="m">q·q′ &lt; 0</span> なら <span class="m">q′</span> を <span class="m">−q′</span> に取り替える、というものです。同じ回転の、近いほうの原像を選ぶわけです。そしてこれで<button class="termbtn" id="quSignInfo" type="button" aria-expanded="false" aria-controls="quSignNote">角も短いほうになります</button>。</p><div class="slrow"><label>θ = <b id="quDcTh">0°</b></label><input type="range" id="quDcSl" min="0" max="720" value="0" step="1" aria-label="theta"></div><div class="ro">q = <b id="quDcQ">—</b> &nbsp;·&nbsp; <button class="act" id="quDcAuto" type="button" style="padding:2px 10px;font-size:16px">自動</button></div><div class="bubble" id="quSignNote" role="dialog" aria-label="二つの回転のあいだの角" hidden><p>二つの回転のあいだの<em>本当の</em>角、つまり測地的な角は、四元数の内積から出ます。</p><p class="matline"><span class="m" data-speak="デルタ シータ は 二かける q と q プライム の内積の絶対値の アークコサイン">Δθ = 2 arccos |q · q′|</span></p><p>ここには二つのものが入っていて、どちらも見覚えがあるはずです。</p><p><strong>絶対値</strong>は二重被覆の手当てです。これがないと <span class="m">q</span> と <span class="m">−q</span> のあいだに球面上で <span class="m">180°</span> を測ってしまい、回転としては <span class="m">360°</span>、つまり遠回りした「何もしない」になります。絶対値は、二つの原像のうち近いほうを常に選びます。</p><p><strong>係数の 2</strong> は前のステーションの半角を逆に読んだものです。球面上で測った角は、回転の角の半分だからです。</p><p>ここまで来ると、なぜ生の成分から残差を作れないかも見えます。ソルバが比べたいのは<em>二つの回転の差</em>であって、四つ組どうしの差ではありません。そしてその差の正しい形が <span class="m">⊟</span> で、四元数での式は最後のステーションで与えます。</p></div>',
        },
        {
          t: '取り除くのは特異点であって曲率ではない',
          b: '<p>このシーンと次のシーンは、一段下げて描いています。<span class="m">S<sup>3</sup></span> の代わりにふつうの球面を置いてあります。ごまかしではありません。<span class="m">SO(3)</span> の衛星が組み立てた <span class="m">S<sup>1</sup> → S<sup>2</sup> → S<sup>3</sup></span> という梯子の、一段下の段です。構造は同じで次元が一つ少ないだけなので、ここで見えることは上でも成り立ちます。</p><p><strong>四元数が買うもの。</strong>緑の印はオレンジの輪をすっと通り抜け、何も起きません。ところがそこは、緯度経度のチャートが死ぬ場所です。極では経度が意味を失います。<span class="m">SO(3)</span> の衛星でジンバルロックの階数落ちとして見たのが、これです。極は<em>座標</em>のものであって、曲面のものではありません。<span class="m">S<sup>3</sup></span> も同じように滑らかで特異点がありません。特別に悪い点も、階数落ちも、継ぎ目もありません。</p><p>これだけでも大きな利得です。オイラー角は階数を失い、ロドリゲスベクトルは <span class="m">θ = π</span> の殻に継ぎ目を持ちます。そこでは <span class="m">+πa</span> と <span class="m">−πa</span> が同じ回転です。四元数には<em>どちらもありません</em>。</p><p><strong>では、買わないものです。</strong>曲面上の二点を取り、成分ごとに平均してみます。結果はシーンのオレンジの点で、<em>曲面より内側</em>にあります。これは回転ではありません。長さが 1 でない四つ組です。弦は球を切り込み、開きが大きいほど深く切り込みます。</p><p>短くなる量はちょうど<button class="termbtn" id="quChordInfo" type="button" aria-expanded="false" aria-controls="quChordNote">これだけ</button>です。<span class="m">cos(Ω/2)</span> で、<span class="m">Ω</span> は二つの四元数のあいだの角です。<span class="m">Ω = 90°</span> なら <span class="m">0.707</span>、つまり「平均」は三割近く短いことになります。</p><p>直し方はノルムで一度割るだけです。ここは一度立ち止まる価値があります。四元数のいちばん実用的な利点だからです。ずれてしまった回転行列で同じ修復をするなら、<strong>六つ</strong>の条件を回復する話になります。三本の列が単位長で、互いに直交する、という条件です。グラム・シュミット（Gram-Schmidt）か SVD が要ります。ずれた四元数なら、割り算一回です。</p><p>とはいえ、それで曲率が消えたわけではありません。この取引を表にすると、こうなります。</p><p class="matline"><span class="m">オイラー / ロドリゲス：3 個、特異点あり</span></p><p class="matline"><span class="m">四元数：4 個、拘束 1 個</span></p><p class="matline"><span class="m">「拘束なしの平坦な 3 個」：不可能</span></p><p>三行目は難しいのではなく<em>排除されて</em>います。それを <span class="m">SO(3)</span> の衛星がコンパクト性とループで証明しています。四元数は<strong>次元を一つ上げて</strong>逃げます。拘束一つと引き換えに滑らかさを買うわけです。</p><p>ですから<em>手に入らない</em>のは平坦さです。そして欲しかったのは、まさにそれでした。足す、スケールする、平均する、微分する。どれもベクトル空間の演算です。<span class="m">S<sup>3</sup></span> は <span class="m">SO(3)</span> と同じくコンパクトで曲がっています。特異点がないことと平坦であることは別の性質で、この二つの混同がこの話題で最もよくある誤解です。最後のステーションはその話です。</p><div class="bubble" id="quChordNote" role="dialog" aria-label="弦の中点はどれだけ短いか" hidden><p><span class="m">q<sub>0</sub></span> と <span class="m">q<sub>1</sub></span> を単位とし、そのあいだの角を <span class="m">Ω</span>、つまり <span class="m">q<sub>0</sub>·q<sub>1</sub> = cos Ω</span> とします。すると、</p><p class="matline"><span class="m">‖q<sub>0</sub> + q<sub>1</sub>‖<sup>2</sup> = 2 + 2 cos Ω = 4 cos<sup>2</sup>(Ω/2)</span></p><p class="matline"><span class="m">‖(q<sub>0</sub> + q<sub>1</sub>)/2‖ = cos(Ω/2)</span></p><p>二行目は半角の公式そのものです。そして球面で測る <span class="m">Ω</span> は回転どうしの角の半分なので、<span class="m">90°</span> の<em>回転</em>差はここでは <span class="m">Ω = 45°</span> にあたり、<span class="m">cos 22.5° = 0.924</span>、つまり誤差は 8 パーセントです。<span class="m">180°</span> なら <span class="m">0.707</span> になります。</p><p>図が誤解を招かないように、一点だけ補足します。<em>二つ</em>の四元数なら、正規化した平均はたまたま測地線の中点そのものです。対称性から、SLERP の 1/2 に一致します。<em>三つ以上</em>ではそうなりません。そこでは正規化した平均は近似であり、ばらつきが大きいほど誤差も大きくなります。</p></div>',
        },
        {
          t: '積：角は同じ、軸は鏡像',
          b: '<p>回転を二つ続けることは、四元数の積です。順序の読み方はいつもどおりです。先に <span class="m">q<sub>1</sub></span> が働き、次に <span class="m">q<sub>2</sub></span> が働くなら、合成は <span class="m">q<sub>2</sub>q<sub>1</sub></span> です。行列の <span class="m">T<sub>2</sub>T<sub>1</sub></span> と同じです。</p><p class="matline"><span class="m" data-speak="q 2 q 1 は 括弧 w 2 w 1 マイナス v 2 と v 1 の内積 カンマ w 2 v 1 プラス w 1 v 2 プラス v 2 と v 1 の外積">q<sub>2</sub>q<sub>1</sub> = (w<sub>2</sub>w<sub>1</sub> − v<sub>2</sub>·v<sub>1</sub>,&nbsp; w<sub>2</sub>v<sub>1</sub> + w<sub>1</sub>v<sub>2</sub> + v<sub>2</sub>×v<sub>1</sub>)</span></p><p>内積が一つと外積が一つ。<button class="termbtn" id="quProdInfo" type="button" aria-expanded="false" aria-controls="quProdNote">これで全部です</button>。どちらも定義から直接落ちてきます。</p><p>では順序を入れ替えて、何が変わるか見ましょう。スカラー部は変わりません。内積が対称だからです。ベクトル部の最初の二項も変わりません。足し算は交換するからです。<strong>変わるのは外積の符号だけ</strong>です。外積が反対称だからです。</p><p class="matline"><span class="m" data-speak="q 1 q 2 は 同じ式 ただし マイナス v 2 と v 1 の外積">q<sub>1</sub>q<sub>2</sub> = (w<sub>2</sub>w<sub>1</sub> − v<sub>2</sub>·v<sub>1</sub>,&nbsp; w<sub>2</sub>v<sub>1</sub> + w<sub>1</sub>v<sub>2</sub> − v<sub>2</sub>×v<sub>1</sub>)</span></p><p>ここから結論が二つ出ます。どちらもシーンに描かれています。</p><p><strong>一つめ。二つの順序は同じ角だけ回します。</strong>角はスカラー部から決まり（<span class="m">w = cos θ/2</span>）、そのスカラー部が変わらないからです。シーンの <span class="m">θ</span> が二本の矢に対して<em>一つ</em>の数なのは、そのためです。入力の二つの角がどう揺れても、この二つはいっしょに動きます。</p><p><strong>二つめ。二つの軸は互いに鏡像です。</strong>差は <span class="m" data-speak="二かける v 2 と v 1 の外積">2 v<sub>2</sub>×v<sub>1</sub></span> で、これは入力の二軸が張る平面に直交します。シーンでうすく描かれた円盤がその平面です。だから合成後の二つの軸は円盤の上下に対称に立ちます。円盤を真横から見ないと差が見えないのも、同じ理由です。</p><p>つまり 3 次元の非可換性は、<span class="m">SO(3)</span> の衛星で <span class="m">R<sub>x</sub>R<sub>z</sub> ≠ R<sub>z</sub>R<sub>x</sub></span> として見たあれですが、<strong>たった一つの外積に宿っています</strong>。言葉遊びではありません。同じ項が一次の近似で残ったものが、リー括弧 <span class="m" data-speak="カッコ オメガ 1 カンマ オメガ 2 は オメガ 1 と オメガ 2 の外積">[ω<sub>1</sub>, ω<sub>2</sub>] = ω<sub>1</sub> × ω<sub>2</sub></span>（<span class="m">𝔰𝔬(3)</span> 上）です。一つの軸のまわりに留まれば外積は消え、積は可換になります。<span class="m">SO(2)</span> があれほど穏やかだったのは、まさにそのためです。</p><p>最後に、ライブラリが四元数を保存する実務的な理由を二つ。積は<strong>掛け算 16 回</strong>で、<span class="m">3×3</span> の行列積の 27 回より少なく、保存も 9 個ではなく 4 個です。そして四元数のノルムは乗法的なので（<span class="m">‖q<sub>2</sub>q<sub>1</sub>‖ = ‖q<sub>2</sub>‖‖q<sub>1</sub>‖</span>）、単位四元数どうしの積はちょうど単位です。合成が <span class="m">S<sup>3</sup></span> から降りることはありません。</p><div class="bubble" id="quProdNote" role="dialog" aria-label="ハミルトン積の導出" hidden><p>出発点はハミルトン（Hamilton）の三つの等式だけです。</p><p class="matline"><span class="m">i<sup>2</sup> = j<sup>2</sup> = k<sup>2</sup> = ijk = −1</span></p><p>残りはここから出ます。<span class="m">ij = k</span>、<span class="m">ji = −k</span>、あとは巡回です。四元数を <span class="m">q = w + v</span> と書き（<span class="m">v</span> が純虚部、つまりベクトル部）、項ごとに掛けてみます。</p><p class="matline"><span class="m">q<sub>2</sub>q<sub>1</sub> = (w<sub>2</sub> + v<sub>2</sub>)(w<sub>1</sub> + v<sub>1</sub>) = w<sub>2</sub>w<sub>1</sub> + w<sub>2</sub>v<sub>1</sub> + w<sub>1</sub>v<sub>2</sub> + v<sub>2</sub>v<sub>1</sub></span></p><p>最初の三項はふつうのスカラー倍です。面白いのは最後の項だけで、基底の上で計算するとちょうどこうなります。</p><p class="matline"><span class="m" data-speak="v 2 v 1 は マイナス v 2 と v 1 の内積 プラス v 2 と v 1 の外積">v<sub>2</sub>v<sub>1</sub> = −v<sub>2</sub>·v<sub>1</sub> + v<sub>2</sub>×v<sub>1</sub></span></p><p>つまり<em>純四元数どうしの積は、内積と外積を同時に含んでいます</em>。<span class="m">i<sup>2</sup> = −1</span> 型の項が負の内積になり、<span class="m">ij = k</span> 型の項が外積になります。スカラー部とベクトル部に仕分ければ、カードの式がそのまま残ります。</p><p>これは、なぜ<em>四つ</em>なのかへの最短の答えでもあります。三つでは足りません。積にはスカラー部（<span class="m">−v·v</span> の項）があり、純ベクトルにはそれを置く場所がないからです。四つめの次元は飾りではなく、積を閉じさせているものです。</p></div>',
        },
        {
          t: '四つで持ち、三つで進む',
          b: '<p>問いが一つ残っています。そしてそれが、この衛星に実務上の意味を与えます。四元数がこれほど良いなら、なぜその四つの数の上で最適化しないのでしょうか。</p><p>四つの数は四つの自由度ではないからです。<span class="m">‖q‖ = 1</span> という拘束が一つ奪います。どれを奪うかは、シーンの破線の矢が示しています。<strong>半径方向にはコストが何も見ていません</strong>。その向きの一歩は数を変えますが、回転は変えません。どのみち使う前に正規化されるからです。</p><p>これはソルバにとって、はっきりした帰結を持ちます。ある方向にコストが変わらないなら、その方向の二階微分もゼロです。つまりヘッセ行列には<button class="termbtn" id="quNullInfo" type="button" aria-expanded="false" aria-controls="quNullNote">零空間のベクトルがあります</button>。それは <span class="m">q</span> 自身です。すると <span class="m">H δ = −g</span> は特異になり、解は一意に決まりません。同じ階数落ちは共分散にも現れます。数値的な不調ではありません。未知数がいくつあるかを、パラメータ化が誤って申告しているのです。</p><p>答えは小手先の工夫ではなく、<strong>役割分担</strong>です。そしてこれが、この主題全体の工学的な帰結です。</p><p class="matline"><span class="m">四つで持ち、三つで進む</span></p><p><strong>持つ</strong>のは四元数として。大域的で、特異点がなく、積が安く、割り算一回で直せます。<strong>進む</strong>のは接空間で。そこでは次元がちょうど 3 で、拘束がなく、ヘッセ行列の条件も良好です。シーンではこの二つが並んで見えています。<span class="m">q</span> が乗っている曲面と、<span class="m">δ</span> が動く円盤です。</p><p>両者をつなぐのが <span class="m">⊞</span> です。</p><p class="matline"><span class="m" data-speak="q ボックスプラス デルタ は q かける exp デルタ">q ⊞ δ = q ⊗ exp(δ)</span></p><p class="matline"><span class="m">exp(δ) = (cos(‖δ‖/2),&nbsp; sin(‖δ‖/2) δ/‖δ‖)</span></p><p>ここで <span class="m">δ ∈ ℝ<sup>3</sup></span> が接ベクトルで、掛け算は<em>右から</em>です。一歩を物体自身の軸で測る、ということです。これが body と world の区別で、<span class="m">SO(3)</span> の衛星の第 2 ステーションの話です。左から掛ければ世界座標の軸で進むことになります。二つは同じではなく、その違いこそ非可換性の代償でした。</p><p>そして、また顔を出すものに注目してください。<strong>半分</strong>です。第 1 ステーションと同じもので、理由も同じです。四元数は両側から作用するので、自分のパラメータは常に角の半分になります。<span class="m">exp</span> 自体はここでは導きません。なぜこれが <span class="m">⊞</span> の唯一ありうる形なのかは平坦な <span class="m">ℝ<sup>n</sup></span> の衛星の最後のステーションが述べ、多様体上の反復は<em>リーマン勾配</em>の衛星が最後まで歩きます。</p><p>ソルバが「manifold」や「local parameterization」と呼ぶのは、これです。Ceres の <span class="m">QuaternionManifold</span> は四つの数を保存し、3 自由度の <span class="m">Plus</span> を使います。Sophus の <span class="m">SO3</span> は四元数を保存し、三次元で進みます。ライブラリがこれを求めるとき、求めているのはこの分離であって、それ以外の何物でもありません。</p><p><strong>そして、この衛星はここで止まります。</strong>四元数の残差のヤコビ行列、SLERP の閉じた形、ハミルトン積の代数の練習は、ここにはありません。補間は <span class="m">SE(3)</span> の衛星の最後のステーションのもので、そこでは <span class="m">exp</span> と <span class="m">log</span> の対として出てきます。四元数の SLERP は同じ主張の閉じた形であって、別の主張ではありません。</p><div class="bubble" id="quNullNote" role="dialog" aria-label="なぜヘッセ行列が特異になるのか" hidden><p>代数一行で、はっきり見えます。</p><p>コストは<em>回転</em>だけに依存し、四つ組の長さには依存しません。どの実装も使う前に <span class="m">q</span> を正規化するからです。ですから任意の <span class="m">α &gt; 0</span> について、</p><p class="matline"><span class="m">L(α q) = L(q)</span></p><p><span class="m">α = 1 + ε</span> と置いてみます。<span class="m">q</span> の向きに動いても、コストは<em>ずっと</em>同じです。そして定数関数は、一階微分も二階微分もゼロです。</p><p class="matline"><span class="m" data-speak="g と q の内積 は ゼロ">g·q = 0</span></p><p class="matline"><span class="m">H q = 0</span></p><p>二行目は、<span class="m">q</span> が <span class="m">H</span> の零空間に入っていることを言っています。<span class="m">H</span> が特異なら正規方程式 <span class="m">H δ = −g</span> の解は一意ではありません。<span class="m">δ</span> が解なら、任意の <span class="m">c</span> について <span class="m">δ + c q</span> も解だからです。</p><p>減衰でも本当の解決にはなりません。<span class="m">λ</span> を足せば（<em>LM</em> の衛星の道具です）行列は解けるようになりますが、余分な向きへの一歩はやはり無意味です。系は条件が悪いのではなく、<em>過剰にパラメータ化されて</em>います。処方は数値の側ではなく、その自由度をそもそもパラメータベクトルに入れないことです。</p></div>',
        },
      ],
    },
  };
})();
