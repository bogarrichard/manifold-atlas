'use strict';
/* Journey: Riemannian optimization on SO(3) — the original 8-station storyline.
   Registers a descriptor that the engine ("journey player") consumes. The engine
   creates the station groups, positions them along `layout.SP`, calls each builder,
   and drives the tick + camera. Requires LIE.kit (loaded first).

   Descriptor shape:
     { id, tier, threadKey, build(content, palette) -> {stations, bindCard} }
     (layout lives in layouts/<id>.json)
   `build` binds a language pack + the active theme palette: `stations` are group
   builders, `bindCard(i)` wires any interactive HUD controls for card i.
   `threadKey` names the palette color used for the connecting thread. */
window.LIE = window.LIE || {};
LIE.journeys = LIE.journeys || {};
LIE.journeys['so3-optimization'] = (function () {
  const K = LIE.kit;
  const {
    V3,
    lerp,
    ease,
    clamp,
    RM,
    hexStr,
    fatArrow,
    setArrow,
    makeLabel,
    updateLabel,
    baseSphere,
    dashedLine,
    expSph,
    projT,
  } = K;

  function build(C, PAL) {
    const LB = C.labels;
    const COL = PAL || K.palette('dark');
    // label text colors, as CSS strings, derived from the active palette
    const HX = {
      coral: hexStr(COL.coral),
      red: hexStr(COL.red),
      teal: hexStr(COL.teal),
      amber: hexStr(COL.amber),
      violet: hexStr(COL.violet),
      green: hexStr(COL.green),
      ink: hexStr(COL.ink),
    };
    let expApi = null,
      s5api = null;

    const stations = [
      // 0 · the frame / gizmo
      g => {
        const triad = new THREE.Group();
        const ax = [
          [V3(1.9, 0, 0), COL.coral],
          [V3(0, 1.9, 0), COL.teal],
          [V3(0, 0, 1.9), COL.violet],
        ];
        ax.forEach(([v, c]) => {
          const a = fatArrow(c, 0.055);
          setArrow(a, V3(0, 0, 0), v);
          triad.add(a);
        });
        g.add(triad);
        const ringPts = [];
        for (let i = 0; i <= 90; i++) {
          const a = (i / 90) * Math.PI * 2;
          ringPts.push(V3(Math.cos(a) * 2.7, 0, Math.sin(a) * 2.7));
        }
        const ring = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(ringPts),
          new THREE.LineBasicMaterial({color: COL.amber, transparent: true, opacity: 0.35})
        );
        ring.rotation.x = 0.5;
        g.add(ring);
        const orbs = new THREE.Group();
        for (let i = 0; i < 7; i++) {
          const s = new THREE.Mesh(
            new THREE.SphereGeometry(0.09, 10, 8),
            new THREE.MeshBasicMaterial({color: COL.amber})
          );
          orbs.add(s);
        }
        orbs.rotation.x = 0.5;
        g.add(orbs);
        return {
          tick(t) {
            triad.rotation.y = t * 0.4;
            triad.rotation.x = Math.sin(t * 0.3) * 0.25;
            orbs.children.forEach((s, i) => {
              const a = t * 0.5 + (i / 7) * Math.PI * 2;
              s.position.set(Math.cos(a) * 2.7, 0, Math.sin(a) * 2.7);
            });
          },
        };
      },
      // 1 · the flat world (gradient descent in a bowl)
      g => {
        const H = (x, z) => 0.3 * (x * x + z * z);
        const geo = new THREE.PlaneGeometry(7.4, 7.4, 30, 30);
        geo.rotateX(-Math.PI / 2);
        const pa = geo.attributes.position;
        for (let i = 0; i < pa.count; i++) {
          pa.setY(i, H(pa.getX(i), pa.getZ(i)));
        }
        geo.computeVertexNormals();
        const bowl = new THREE.Mesh(
          geo,
          new THREE.MeshBasicMaterial({
            color: COL.teal,
            wireframe: true,
            transparent: true,
            opacity: 0.3,
          })
        );
        g.add(bowl);
        const grid = new THREE.GridHelper(7.4, 14, COL.grid1, COL.grid2);
        grid.position.y = -0.02;
        g.add(grid);
        const path = [];
        let x = 2.55,
          z = 1.75;
        for (let k = 0; k < 11; k++) {
          path.push(V3(x, H(x, z) + 0.12, z));
          x *= 0.66;
          z *= 0.66;
        }
        const ball = new THREE.Mesh(
          new THREE.SphereGeometry(0.13, 14, 12),
          new THREE.MeshBasicMaterial({color: COL.amber})
        );
        g.add(ball);
        const arr = fatArrow(COL.coral, 0.045);
        g.add(arr);
        const lbl = makeLabel(LB.bowl_step, HX.coral, 2.6);
        lbl.position.set(-2.2, 2.5, 0);
        g.add(lbl);
        return {
          tick(t) {
            const cyc = (t * 0.75) % 12,
              k = Math.floor(cyc),
              f = ease(clamp(cyc - k, 0, 1));
            const a = path[Math.min(k, 10)],
              b = path[Math.min(k + 1, 10)];
            ball.position.lerpVectors(a, b, f);
            const d = V3(b.x - a.x, 0, b.z - a.z);
            const L = d.length();
            if (L > 0.03) {
              setArrow(arr, ball.position, d.normalize().multiplyScalar(0.85));
            } else arr.visible = false;
          },
        };
      },
      // 2 · the constraint (raw step leaves the sphere; naive retraction)
      g => {
        const R = 1.7;
        g.add(baseSphere(R, COL));
        const pu = V3(0.35, 0.62, 0.7).normalize();
        const P = pu.clone().multiplyScalar(R);
        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(0.11, 14, 12),
          new THREE.MeshBasicMaterial({color: COL.violet2})
        );
        dot.position.copy(P);
        g.add(dot);
        const gAmb = V3(0.9, 0.5, -0.4);
        const arr = fatArrow(COL.coral, 0.05);
        setArrow(arr, P, gAmb);
        g.add(arr);
        const ghostP = P.clone().add(gAmb);
        const ghost = new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 14, 12),
          new THREE.MeshBasicMaterial({color: COL.red, transparent: true, opacity: 0.8})
        );
        ghost.position.copy(ghostP);
        g.add(ghost);
        g.add(dashedLine(ghostP, ghostP.clone().normalize().multiplyScalar(R), COL.red, 0.1));
        const l1 = makeLabel(LB.s2_exit, HX.red, 3.0);
        l1.position.copy(ghostP).add(V3(0, 0.55, 0));
        g.add(l1);
        const l2 = makeLabel(LB.s2_orthonormal, HX.teal, 2.4);
        l2.position.set(-1.9, -1.9, 0.6);
        g.add(l2);
        const snapP = ghostP.clone().normalize().multiplyScalar(R);
        const snap = new THREE.Mesh(
          new THREE.SphereGeometry(0.1, 12, 10),
          new THREE.MeshBasicMaterial({color: COL.teal, transparent: true, opacity: 0.9})
        );
        g.add(snap);
        const l3 = makeLabel(LB.s2_retract, HX.teal, 3.0);
        l3.position.copy(snapP).add(V3(0, -0.62, 0));
        g.add(l3);
        return {
          tick(t) {
            const s = 1 + Math.sin(t * 2.6) * 0.18;
            ghost.scale.set(s, s, s);
            const u = ease(clamp((Math.sin(t * 0.9) + 1) * 0.75, 0, 1));
            snap.position.lerpVectors(ghostP, snapP, u);
          },
        };
      },
      // 3 · the tangent space (project the ambient gradient)
      g => {
        const R = 1.7;
        g.add(baseSphere(R, COL));
        const pu = V3(0.15, 0.72, 0.62).normalize();
        const P = pu.clone().multiplyScalar(R);
        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(0.11, 14, 12),
          new THREE.MeshBasicMaterial({color: COL.violet2})
        );
        dot.position.copy(P);
        g.add(dot);
        const disk = new THREE.Mesh(
          new THREE.CircleGeometry(1.55, 48),
          new THREE.MeshBasicMaterial({
            color: COL.teal,
            transparent: true,
            opacity: 0.14,
            side: THREE.DoubleSide,
          })
        );
        disk.position.copy(P);
        disk.quaternion.setFromUnitVectors(V3(0, 0, 1), pu);
        g.add(disk);
        const rim = new THREE.Mesh(
          new THREE.RingGeometry(1.53, 1.56, 64),
          new THREE.MeshBasicMaterial({
            color: COL.teal,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide,
          })
        );
        rim.position.copy(P);
        rim.quaternion.copy(disk.quaternion);
        g.add(rim);
        const aAmb = fatArrow(COL.coral, 0.05),
          aTan = fatArrow(COL.teal, 0.055);
        g.add(aAmb);
        g.add(aTan);
        let nLine = null,
          pLine = null;
        const l1 = makeLabel(LB.s3_raw, HX.coral, 3.0);
        g.add(l1);
        const l2 = makeLabel(LB.s3_proj, HX.teal, 3.2);
        g.add(l2);
        const l3 = makeLabel(LB.s3_drop, HX.red, 2.2);
        g.add(l3);
        return {
          tick(t) {
            const b1 = projT(V3(1, 0, 0), pu).normalize(),
              b2 = pu.clone().cross(b1);
            const ang = t * 0.45;
            const gA = b1
              .clone()
              .multiplyScalar(Math.cos(ang) * 1.15)
              .add(b2.clone().multiplyScalar(Math.sin(ang) * 1.15))
              .add(pu.clone().multiplyScalar(0.85));
            const gT = projT(gA, pu),
              gN = gA.clone().sub(gT);
            setArrow(aAmb, P, gA);
            setArrow(aTan, P, gT);
            if (nLine) {
              g.remove(nLine);
              nLine.geometry.dispose();
            }
            if (pLine) {
              g.remove(pLine);
              pLine.geometry.dispose();
            }
            const tip = P.clone().add(gA),
              tTip = P.clone().add(gT);
            nLine = dashedLine(tTip, tip, COL.red, 0.09);
            g.add(nLine);
            pLine = dashedLine(P.clone().add(gN), tip, COL.teal, 0.07);
            pLine.material.opacity = 0.35;
            g.add(pLine);
            l1.position.copy(tip).add(V3(0, 0.4, 0));
            l2.position.copy(tTip).add(V3(0, -0.42, 0));
            l3.position.copy(tTip.clone().lerp(tip, 0.55)).add(V3(0.65, 0, 0));
          },
        };
      },
      // 4 · exp (compound-interest chain vs. the geodesic) — exposes expApi
      g => {
        const R = 1.7;
        g.add(baseSphere(R, COL));
        const pu = V3(-0.25, 0.55, 0.79).normalize();
        const P = pu.clone().multiplyScalar(R);
        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(0.1, 14, 12),
          new THREE.MeshBasicMaterial({color: COL.violet2})
        );
        dot.position.copy(P);
        g.add(dot);
        const u = projT(V3(1, 0.15, 0), pu).normalize();
        const TH = 1.85;
        const aTan = fatArrow(COL.teal, 0.05);
        setArrow(aTan, P, u.clone().multiplyScalar(TH * R));
        g.add(aTan);
        const arcPts = [];
        for (let i = 0; i <= 60; i++) {
          arcPts.push(expSph(pu, u.clone().multiplyScalar((TH * i) / 60)).multiplyScalar(R));
        }
        const arc = new THREE.Mesh(
          new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arcPts), 60, 0.035, 6, false),
          new THREE.MeshBasicMaterial({color: COL.violet2, transparent: true, opacity: 0.85})
        );
        g.add(arc);
        const end = new THREE.Mesh(
          new THREE.SphereGeometry(0.11, 12, 10),
          new THREE.MeshBasicMaterial({color: COL.violet})
        );
        end.position.copy(arcPts[60]);
        g.add(end);
        const chord = new THREE.Line(
          new THREE.BufferGeometry(),
          new THREE.LineBasicMaterial({color: COL.amber, transparent: true, opacity: 0.95})
        );
        g.add(chord);
        const tip = new THREE.Mesh(
          new THREE.SphereGeometry(0.09, 12, 10),
          new THREE.MeshBasicMaterial({color: COL.red, transparent: true, opacity: 0.85})
        );
        g.add(tip);
        let errLine = null;
        const axisC = pu.clone().cross(u).normalize();
        const lbl = makeLabel(LB.s4_n_prefix + '1', HX.amber, 2.0);
        lbl.position.copy(P).add(V3(0, 1.25, 0));
        g.add(lbl);
        const ler = makeLabel(LB.s4_err, HX.red, 2.2);
        g.add(ler);
        const l2 = makeLabel(LB.s4_exp, HX.violet, 2.0);
        l2.position.copy(arcPts[60]).add(V3(0.15, -0.5, 0));
        g.add(l2);
        const ns = [1, 2, 4, 8, 32];
        let last = -1,
          pts = [],
          nIdx = 0,
          drawT = 0;
        buildChain(1);
        function buildChain(n) {
          pts = [];
          let q = pu.clone();
          pts.push(q.clone().multiplyScalar(R));
          for (let k = 1; k <= n; k++) {
            q = q.clone().add(
              axisC
                .clone()
                .cross(q)
                .multiplyScalar(TH / n)
            );
            pts.push(q.clone().multiplyScalar(R));
          }
          chord.geometry.dispose();
          chord.geometry = new THREE.BufferGeometry().setFromPoints(pts);
          updateLabel(lbl, LB.s4_n_prefix + n, HX.amber);
        }
        expApi = {
          setN(n) {
            buildChain(n);
            drawT = 0;
          },
        };
        return {
          tick(t) {
            drawT = Math.min(drawT + 0.03, 1);
            const n = pts.length - 1;
            const seg = Math.max(1, Math.min(n, Math.floor(ease(drawT) * n + 0.999)));
            chord.geometry.setDrawRange(0, seg + 1);
            const e = pts[seg];
            tip.position.copy(e);
            if (errLine) {
              g.remove(errLine);
              errLine.geometry.dispose();
            }
            const eOn = e.clone().normalize().multiplyScalar(R);
            errLine = dashedLine(e, eOn, COL.red, 0.08);
            g.add(errLine);
            ler.position.copy(e).add(V3(0, 0.42, 0));
            ler.visible = e.distanceTo(eOn) > 0.12;
          },
        };
      },
      // 5 · the iteration (Riemannian gradient descent) — exposes s5api
      g => {
        const R = 1.9;
        const t1 = V3(0.2, 0.9, 0.35).normalize(),
          t2 = V3(-0.6, 0.4, 0.7).normalize();
        const w1 = 1.0,
          w2 = 0.6;
        const M = t1.clone().multiplyScalar(w1).add(t2.clone().multiplyScalar(w2));
        const m = M.clone().normalize();
        const Lf = p => w1 * (1 - p.dot(t1)) + w2 * (1 - p.dot(t2));
        const Lmin = Lf(m),
          Lmax = Lf(m.clone().negate());
        const geo = new THREE.SphereGeometry(R, 72, 52);
        const pos = geo.attributes.position,
          cols = new Float32Array(pos.count * 3),
          c = new THREE.Color();
        for (let i = 0; i < pos.count; i++) {
          const p = V3(pos.getX(i), pos.getY(i), pos.getZ(i)).normalize();
          const u = clamp((Lf(p) - Lmin) / (Lmax - Lmin), 0, 1);
          c.setHSL(lerp(0.46, 0.02, u), 0.6, lerp(0.3, 0.55, Math.pow(u, 0.8)));
          cols[3 * i] = c.r;
          cols[3 * i + 1] = c.g;
          cols[3 * i + 2] = c.b;
        }
        geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
        g.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({vertexColors: true})));
        g.add(
          new THREE.Mesh(
            new THREE.SphereGeometry(R * 1.001, 24, 16),
            new THREE.MeshBasicMaterial({
              color: COL.costWire,
              wireframe: true,
              transparent: true,
              opacity: 0.1,
            })
          )
        );
        const minDot = new THREE.Mesh(
          new THREE.SphereGeometry(0.1, 14, 12),
          new THREE.MeshBasicMaterial({color: COL.green})
        );
        minDot.position.copy(m.clone().multiplyScalar(R * 1.005));
        g.add(minDot);
        const p0 = V3(-0.45, -0.72, 0.53).normalize();
        let pu = p0.clone();
        const cur = new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 16, 12),
          new THREE.MeshBasicMaterial({color: COL.ink})
        );
        g.add(cur);
        const disk = new THREE.Mesh(
          new THREE.CircleGeometry(1.1, 40),
          new THREE.MeshBasicMaterial({
            color: COL.teal,
            transparent: true,
            opacity: 0.16,
            side: THREE.DoubleSide,
          })
        );
        g.add(disk);
        disk.visible = false;
        const aStep = fatArrow(COL.teal, 0.05);
        g.add(aStep);
        aStep.visible = false;
        const trail = new THREE.Group();
        g.add(trail);
        let arcMesh = null,
          anim = null,
          iter = 0,
          phase = 0,
          pend = null;
        function place() {
          cur.position.copy(pu.clone().multiplyScalar(R));
        }
        place();
        function clearArc() {
          if (arcMesh) {
            g.remove(arcMesh);
            arcMesh.geometry.dispose();
            arcMesh = null;
          }
        }
        function notify() {
          s5api.onchange && s5api.onchange(iter, Lf(pu), phase);
        }
        s5api = {
          step() {
            if (anim) return;
            if (phase === 0) {
              const dT = projT(M, pu);
              let v = dT.multiplyScalar(0.85);
              if (v.length() > 1.1) v.multiplyScalar(1.1 / v.length());
              if (v.length() < 0.004) return;
              pend = {v, pn: expSph(pu, v)};
              const P = pu.clone().multiplyScalar(R);
              disk.position.copy(P);
              disk.quaternion.setFromUnitVectors(V3(0, 0, 1), pu);
              disk.visible = true;
              setArrow(aStep, P, pend.v.clone().multiplyScalar(R * 0.62));
              aStep.visible = true;
              phase = 1;
              notify();
            } else if (phase === 1) {
              const pts = [];
              for (let i = 0; i <= 40; i++) {
                pts.push(
                  expSph(pu, pend.v.clone().multiplyScalar(i / 40)).multiplyScalar(R * 1.002)
                );
              }
              clearArc();
              arcMesh = new THREE.Mesh(
                new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.03, 6, false),
                new THREE.MeshBasicMaterial({color: COL.violet2})
              );
              g.add(arcMesh);
              phase = 2;
              notify();
            } else {
              const P = pu.clone().multiplyScalar(R);
              const ts = new THREE.Mesh(
                new THREE.SphereGeometry(0.06, 10, 8),
                new THREE.MeshBasicMaterial({color: COL.violet, transparent: true, opacity: 0.8})
              );
              ts.position.copy(P);
              trail.add(ts);
              anim = {t0: performance.now(), from: pu.clone(), v: pend.v, pn: pend.pn};
            }
          },
          reset() {
            pu = p0.clone();
            iter = 0;
            phase = 0;
            pend = null;
            place();
            disk.visible = false;
            aStep.visible = false;
            clearArc();
            while (trail.children.length) trail.remove(trail.children[0]);
            anim = null;
            notify();
          },
          L() {
            return Lf(pu);
          },
          iter() {
            return iter;
          },
          phase() {
            return phase;
          },
        };
        return {
          tick() {
            if (anim) {
              const u = RM ? 1 : clamp((performance.now() - anim.t0) / 650, 0, 1);
              const e = ease(u);
              const q = expSph(anim.from, anim.v.clone().multiplyScalar(e));
              cur.position.copy(q.multiplyScalar(R));
              if (u >= 1) {
                pu = anim.pn;
                anim = null;
                iter++;
                phase = 0;
                pend = null;
                setTimeout(() => {
                  disk.visible = false;
                  aStep.visible = false;
                  clearArc();
                }, 420);
                notify();
              }
            }
            const s = 1 + Math.sin(performance.now() * 0.004) * 0.15;
            minDot.scale.set(s, s, s);
          },
        };
      },
      // 6 · the true shape of SO(3) (the π₁ = ℤ/2 ball)
      g => {
        const S = 0.8,
          RB = Math.PI * S;
        const shell = new THREE.Mesh(
          new THREE.SphereGeometry(RB, 48, 36),
          new THREE.MeshStandardMaterial({
            color: COL.so3shell,
            roughness: 0.9,
            transparent: true,
            opacity: 0.12,
          })
        );
        g.add(shell);
        g.add(
          new THREE.Mesh(
            new THREE.SphereGeometry(RB * 1.001, 24, 16),
            new THREE.MeshBasicMaterial({
              color: COL.violet2,
              wireframe: true,
              transparent: true,
              opacity: 0.08,
            })
          )
        );
        const nax = V3(0.3, 0.9, 0.32).normalize();
        g.add(
          dashedLine(
            nax.clone().multiplyScalar(-RB),
            nax.clone().multiplyScalar(RB),
            COL.violet2,
            0.16
          )
        );
        [1, -1].forEach(s => {
          const ring = new THREE.Mesh(
            new THREE.TorusGeometry(0.16, 0.02, 8, 24),
            new THREE.MeshBasicMaterial({color: COL.amber})
          );
          ring.position.copy(nax.clone().multiplyScalar(RB * s));
          ring.quaternion.setFromUnitVectors(V3(0, 0, 1), nax);
          g.add(ring);
        });
        const walkMat = new THREE.MeshBasicMaterial({color: COL.amber});
        const walker = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 12), walkMat);
        g.add(walker);
        const cube = new THREE.Mesh(
          new THREE.BoxGeometry(1.05, 1.05, 1.05),
          [COL.teal, COL.cubeFace2, COL.violet, COL.cubeFace4, COL.coral, COL.amber].map(
            c => new THREE.MeshStandardMaterial({color: c, roughness: 0.6})
          )
        );
        cube.position.set(RB + 2.0, 0.3, 0);
        g.add(cube);
        const lbl = makeLabel('0' + LB.s6_deg_suffix, HX.amber, 1.7);
        lbl.position.set(RB + 2.0, 1.7, 0);
        g.add(lbl);
        const l2 = makeLabel(LB.s6_identified, HX.violet, 3.6);
        l2.position.copy(nax.clone().multiplyScalar(RB)).add(V3(0, 0.55, 0));
        g.add(l2);
        const l3 = makeLabel(
          LB.s6_cross_prefix + '0' + LB.s6_cross_sep + LB.s6_even,
          HX.green,
          3.2
        );
        l3.position.set(RB + 2.0, -1.1, 0);
        g.add(l3);
        let lastDeg = -1,
          lastCr = -1;
        return {
          tick(t) {
            const u = (t * 0.05) % 1,
              th = 4 * Math.PI * u,
              thm = th % (2 * Math.PI);
            const w =
              thm <= Math.PI
                ? nax.clone().multiplyScalar(thm * S)
                : nax.clone().multiplyScalar((thm - 2 * Math.PI) * S);
            walker.position.copy(w);
            walkMat.color.setHex(th <= 2 * Math.PI ? COL.amber : COL.teal);
            cube.quaternion.setFromAxisAngle(nax, th);
            const deg = Math.round((th * 180) / Math.PI / 5) * 5;
            if (deg !== lastDeg) {
              lastDeg = deg;
              updateLabel(lbl, deg + LB.s6_deg_suffix, HX.amber);
            }
            const cr = (th > Math.PI ? 1 : 0) + (th > 3 * Math.PI ? 1 : 0);
            if (cr !== lastCr) {
              lastCr = cr;
              updateLabel(
                l3,
                LB.s6_cross_prefix + cr + LB.s6_cross_sep + (cr % 2 ? LB.s6_odd : LB.s6_even),
                cr % 2 ? HX.red : HX.green
              );
            }
          },
        };
      },
      // 7 · SE(3) — a moving frame along a path
      g => {
        const curvePts = [];
        for (let i = 0; i <= 140; i++) {
          const s = i / 140;
          curvePts.push(
            V3(Math.cos(s * Math.PI * 3.2) * 2.4, s * 4.4 - 2.2, Math.sin(s * Math.PI * 3.2) * 2.4)
          );
        }
        const curve = new THREE.CatmullRomCurve3(curvePts);
        g.add(
          new THREE.Mesh(
            new THREE.TubeGeometry(curve, 180, 0.03, 6, false),
            new THREE.MeshBasicMaterial({color: COL.se3tube, transparent: true, opacity: 0.7})
          )
        );
        function frameAt(s) {
          const p = curve.getPointAt(s),
            T = curve.getTangentAt(s).normalize();
          let N = V3(0, 1, 0).cross(T);
          if (N.length() < 1e-3) N = V3(1, 0, 0).cross(T);
          N.normalize();
          const B = T.clone().cross(N);
          const M4 = new THREE.Matrix4().makeBasis(N, B, T);
          return {p, q: new THREE.Quaternion().setFromRotationMatrix(M4)};
        }
        for (let k = 0; k < 11; k++) {
          const {p, q} = frameAt(k / 10.5);
          [
            [V3(0.62, 0, 0), COL.coral],
            [V3(0, 0.62, 0), COL.teal],
            [V3(0, 0, 0.62), COL.violet],
          ].forEach(([v, c]) => {
            const a = new THREE.ArrowHelper(
              v.clone().normalize().applyQuaternion(q),
              p,
              0.62,
              c,
              0.14,
              0.07
            );
            a.line.material.transparent = true;
            a.line.material.opacity = 0.35;
            a.cone.material.transparent = true;
            a.cone.material.opacity = 0.35;
            g.add(a);
          });
        }
        const live = new THREE.Group();
        const la = [
          [V3(0.95, 0, 0), COL.coral],
          [V3(0, 0.95, 0), COL.teal],
          [V3(0, 0, 0.95), COL.violet],
        ].map(([v, c]) => {
          const a = fatArrow(c, 0.045);
          live.add(a);
          return {a, v};
        });
        g.add(live);
        const lbl = makeLabel(LB.s7_dof, HX.ink, 3.4);
        lbl.position.set(0, 3.1, 0);
        g.add(lbl);
        return {
          tick(t) {
            const s = (t * 0.055) % 1;
            const {p, q} = frameAt(s);
            la.forEach(({a, v}) => setArrow(a, p, v.clone().applyQuaternion(q)));
          },
        };
      },
    ];

    // Per-card interactive wiring. Called by the engine after each card renders.
    function bindCard(i) {
      if (i === 4 && expApi) {
        const sl = document.getElementById('expsl'),
          nl = document.getElementById('expn');
        if (sl) {
          sl.oninput = () => {
            nl.textContent = sl.value;
            expApi.setN(parseInt(sl.value));
          };
          expApi.setN(parseInt(sl.value));
        }
      }
      if (i === 5 && s5api) {
        document.getElementById('s5step').onclick = () => s5api.step();
        document.getElementById('s5reset').onclick = () => s5api.reset();
        const PH = C.s5.phases,
          PT = C.s5.phaseText,
          PM = C.s5.phaseMath || [];
        const info = document.getElementById('s5deltainfo'),
          bub = document.getElementById('s5deltabubble');
        if (info && bub) {
          info.onclick = e => {
            e.stopPropagation();
            const v = bub.hidden;
            bub.hidden = !v;
            info.setAttribute('aria-expanded', v ? 'true' : 'false');
          };
        }
        s5api.onchange = (it, L, ph) => {
          const a = document.getElementById('s5it'),
            b = document.getElementById('s5L'),
            s = document.getElementById('s5step'),
            p = document.getElementById('s5ph'),
            mm = document.getElementById('s5math');
          if (a) a.textContent = it;
          if (b) b.textContent = L.toFixed(3);
          if (s) s.textContent = PH[ph % 3];
          if (p) p.textContent = PT[ph % 3];
          if (mm) mm.innerHTML = PM[ph % 3] || '';
        };
        s5api.onchange(s5api.iter(), s5api.L(), s5api.phase());
      }
    }

    return {stations, bindCard};
  }

  return {
    id: 'so3-optimization',
    // 'slam', not 'optimization': this is the convergence journey and it sits on the
    // SLAM planet in hub.js. It read 'optimization' from back when the site was this
    // one journey — nothing consumed the field, so the drift went unnoticed.
    tier: 'slam',
    threadKey: 'violet2',
    // Curriculum position, as data rather than prose: `next` is the following moon in
    // hub.js's BRANCHES order (crossing into the next branch at a branch end), `handoffs`
    // are the topical pointers this journey's cards name, `requires` the hard
    // back-references its opening card makes. engine.js renders next+handoffs as links
    // on the last station; check.html verifies every id resolves and that the next-chain
    // still agrees with BRANCHES.
    seq: {
      next: 'slam-factor-graph',
      requires: ['geometry-flat', 'optimization-gd'],
      handoffs: ['geometry-so3', 'geometry-se3'],
    },
    build,
  };
})();
