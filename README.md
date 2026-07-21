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
| `content/hu.js` · `content/en.js` | Language text packs (every visible string). |

The only dependency is **Three.js r128 (MIT)**, loaded from cdnjs in `index.html`
and pinned with a Subresource Integrity (`integrity="sha512-…"`) hash — the browser
runs it only if the bytes match exactly, so the CDN can't serve tampered code.

## Architecture (player + journeys + kit)

The code is split so new journeys plug in without touching the engine:

- **`kit.js`** — reusable Three.js building blocks (`fatArrow`, `makeLabel`,
  `baseSphere`, `expSph`, the `COL` palette, math helpers). Any journey uses these.
- **`journeys/<id>.js`** — a journey descriptor:

  ```js
  LIE.journeys['<id>'] = {
    id, tier, layout:{ SP, OFF }, threadColor,
    build(content) { return { stations:[ g => {…build group…; return {tick(t){…}} }, … ],
                              bindCard(i) { /* wire interactive HUD controls for card i */ } }; }
  };
  ```

  `SP`/`OFF` are the per-station world positions and camera offsets; `build(pack)` binds a
  language pack and returns the station builders plus per-card wiring.
- **`engine.js`** — picks the language and the journey (`?journey=<id>`, default
  `so3-optimization`), builds the scene, lays the stations along `SP`, and drives the
  camera fly + animation loop. It is journey-agnostic.

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

That's it — the dropdown and `?lang=de` start working.

**Note on flag emojis:** flags render as real flags on macOS, iOS, Android, and Linux,
but **Windows** ships no flag glyphs, so there they show as two-letter codes (e.g. `GB`,
`HU`). That's a harmless fallback; if you'd rather avoid it, set `meta.flag` to something
non-regional (an emoji or short text) instead.

## Updating Three.js

In `index.html`, change the version in the CDN URL **and** replace the `integrity`
hash to match (cdnjs lists the SRI hash for every file, or compute it with
`openssl dgst -sha512 -binary three.min.js | openssl base64 -A`). If the hash and
file don't match, the browser silently refuses to load it. The code uses only stable
Three.js APIs (geometries, `Sprite`, `ArrowHelper`, `CatmullRomCurve3`,
`TubeGeometry`), so minor version bumps are low-risk; test after upgrading.
