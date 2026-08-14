# Lie Journey — interactive visualization

An interactive 3D explainer: from flat gradient descent to Riemannian gradients,
the exponential map, and SO(3)/SE(3) poses. Pure static files — no build step.

## Files

| File | Role |
| --- | --- |
| `index.html` | Page shell: canvas + HUD markup. Language-agnostic. |
| `style.css` | All styling. |
| `kit.js` | Shared toolkit: math helpers, color palette, Three.js primitive builders. Pure factories, no scene state. Exposes `LIE.kit`. |
| `journeys/*.js` | One file per journey. Registers a descriptor into `LIE.journeys`. Holds the station builders + layout. |
| `engine.js` | The **journey player**: scene, camera, navigation, i18n. Runs one journey descriptor. **Contains no display text and no journey-specific geometry.** |
| `content/hu.js` · `content/en.js` · `content/ja.js` | Language text packs (every visible string). |

The only dependency is **Three.js r128 (MIT)**, vendored locally at
`vendor/three.min.js` (license header intact) so that hub↔journey navigation — a
full page reload — never depends on a third-party CDN round-trip.

## Architecture (player + journeys + kit)

The code is split so new journeys plug in without touching the engine:

- **`kit.js`** — reusable Three.js building blocks (`fatArrow`, `makeLabel`,
  `baseSphere`, `expSph`, the `COL` palette, math helpers). Any journey uses these.
- **`journeys/<id>.js`** — a journey descriptor:

  ```js
  LIE.journeys['<id>'] = {
    id, tier, layout:{ SP, OFF }, threadKey,
    build(content, palette) { return { stations:[ g => {…build group…; return {tick(t){…}} }, … ],
                                       bindCard(i) { /* wire interactive HUD controls for card i */ } }; }
  };
  ```

  Registered so far: `so3-optimization` (Riemannian GD, 8 stations, text in the content
  packs), `geometry-flat` (ℝⁿ), `optimization-gd` (gradient descent), and `geometry-se3`
  (poses: the pose/transformation duality, chaining, the order of R and t, twists, the
  screw motion, the left Jacobian, log, the adjoint, and pose interpolation — 10
  stations, cards in-file).

  `SP`/`OFF` are the per-station world positions and camera offsets; `build(pack, palette)`
  binds a language pack **and the active theme palette** and returns the station builders
  plus per-card wiring. `threadKey` names the palette color for the connecting thread.
- **`engine.js`** — picks the language, theme, and journey (`?journey=<id>`, default
  `so3-optimization`), builds the scene, lays the stations along `SP`, and drives the
  camera fly + animation loop. It is journey-agnostic.

## Theming (dark / light / system)

A `◐` button in the top-right cycles **system → light → dark**, persisted in
`localStorage` (`lie-theme`) and applied via a `data-theme` attribute on `<html>`
(an inline script in `<head>` sets it before first paint to avoid a flash; `system`
follows `prefers-color-scheme` live).

- **Chrome** (HUD, dropdown, buttons, matrix, bubble) themes through CSS variables:
  `:root` holds the dark palette, `:root[data-theme="light"]` the light one.
- **The 3D scene** has two full palettes in `kit.js` (`LIE.kit.palette(theme)`): a soft
  light-slate variant with re-tuned marks, surfaces, grids, and stars. The engine sets
  the clear color + fog and **rebuilds the scene** (labels re-render) on a theme change.
  Journeys receive the active palette in `build(pack, palette)` and use `hexStr(col)` for
  label text colors, so a new journey is theme-aware for free.

Load order in `index.html` matters: `three` → content packs → `kit.js` → `journeys/*.js`
→ `engine.js`. Adding a journey = drop a `journeys/<id>.js` file and one `<script>` line.
(The upcoming hub will turn the registry of journeys into a visual main menu.)

## How language selection works

`engine.js` reads the active language, in order of preference:

1. `?lang=xx` in the URL (e.g. `lie/?lang=en`)
2. the `<html lang>` attribute
3. `hu` as the default

Each `content/<lang>.js` registers itself into `window.LIE_CONTENT.<lang>`. A flag
dropdown appears automatically in the top-right corner once more than one pack is loaded.
Shipped packs: `hu` (default), `en`, `ja`.

Self-contained journeys keep their own `cards: { hu, en, ja }` block; the engine picks
`cards[LANG]` and falls back to `hu`, then `en`, then the shared pack. A missing block is
therefore silent — the journey just shows another language, and if that block has fewer
cards than the journey has stations, the extra stations become unreachable (the dots and
the ← → range come from the card count).

## Adding a language (e.g. German)

1. Copy `content/hu.js` to `content/de.js`.
2. Change the registration key to `window.LIE_CONTENT.de = { ... }` and set the `meta`
   fields: `htmlLang: 'de'`, `langLabel: 'Deutsch'`, `flag: '🇩🇪'`, and translate `title`.
   Also translate `ui.langMenuLabel`.
3. Translate every string value. **Do not touch** the HTML element `id`s inside the
   card bodies (`expn`, `expsl`, `s5step`, `s5reset`, `s5math`, `s5ph`, `s5it`, `s5L`,
   `s5deltainfo`, `s5deltabubble`) or the structure — the engine binds to them. Math
   notation (`w − α∇L`, `exp(v)`, `s5.phaseMath`, …) usually stays as-is. Keep
   `s5.phases[0]` identical to the `#s5step` button text and `s5.phaseText[0]` identical
   to the `#s5ph` text (they must match). On station 6, the `#s5deltabubble` popup holds
   the "what is δ" explanation and `s5.phaseMath` is the live per-phase formula.
4. Add one line to `index.html`, next to the existing content packs:

   ```html
   <script src="content/de.js"></script>
   ```

5. Add a `de:` card array to every journey that ships its own cards
   (`journeys/geometry-flat.js`, `journeys/optimization-gd.js`, `journeys/geometry-se3.js`),
   with **the same count** as the existing arrays and the same element `id`s inside the
   card bodies (`gf*`, `og*`, `se3*` — the footnote toggles and the sliders bind to them).

That's it — the dropdown and `?lang=de` start working.

**Note on flag emojis:** flags render as real flags on macOS, iOS, Android, and Linux,
but **Windows** ships no flag glyphs, so there they show as two-letter codes (e.g. `GB`,
`HU`). That's a harmless fallback; if you'd rather avoid it, set `meta.flag` to something
non-regional (an emoji or short text) instead.

## Updating Three.js

Replace `vendor/three.min.js` with the new build (e.g. from cdnjs) and keep its
`@license` header intact — that's the MIT copyright/permission notice, required to
stay with the code. The code uses only stable Three.js APIs (geometries, `Sprite`,
`ArrowHelper`, `CatmullRomCurve3`, `TubeGeometry`), so minor version bumps are
low-risk; test after upgrading.
