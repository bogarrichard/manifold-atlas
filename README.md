# Manifold Atlas — interactive 3D journeys

An interactive 3D explainer for the geometry that robotics runs on, told as a set of
guided journeys: flat ℝⁿ and gradient descent, Lie groups (SO(3)/SE(3)), Riemannian
gradients and the exponential map, and the place where those two lines meet — SLAM.

A solar-system hub is the landing view: each branch is a planet, each journey a moon
orbiting it. Click a moon to fly into that journey; inside, you walk a line of stations,
each one a scene plus a card of text and interactive controls.

## The journeys

| Branch | Journeys |
| --- | --- |
| **Geometry** — the spaces things live in, and how they move | **ℝⁿ** ✅ · SO(2) · SE(2) · SO(3) · **SE(3)** ✅ · Sim(3) |
| **Optimization** — how a cost gets minimized, all in flat ℝⁿ | **gradient descent** ✅ · Gauss–Newton · LM · robust |
| **SLAM** — where the two meet | **Riemannian GD** ✅ · factor graphs · SLAM |

✅ = built and playable. The rest are on the hub as moons you cannot click yet.

## Controls

- **Hub** — drag to orbit the camera; hover or `←`/`→` a planet to read its summary (the
  orbits ease to a near-stop while it's selected). `↑` or a click enters it: its moons line
  up as a carousel, steered the same way, with the front moon's summary in the bar. Land on
  it with another `↑`, `Enter`, or a click; `↓`, `Esc`, or empty space backs out one level
  — all the way to the map.
- **Journey** — `←` / `→` or the dots move between stations, `↑` or `Esc` backs out
  to the hub. `Esc` first closes an open popup, if there is one.
- **Language** — the flag dropdown in the top-right, or `?lang=xx` in the URL.
  Shipped: Hungarian (default), English, Japanese.
- **Theme** — the `◐` button cycles system → light → dark, and remembers your choice.

## Running it locally

There is no build step and no dependency to install, but the page must be served over
HTTP — opening `index.html` straight from the filesystem trips the browser's `file://`
restrictions:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/`.

## License

GPLv3 — see [LICENSE](LICENSE). The only third-party code is **Three.js r128**
(MIT), vendored at `vendor/three.min.js` with its `@license` header intact.
