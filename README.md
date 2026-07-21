# Lie Journey — interactive visualization

An interactive 3D explainer: from flat gradient descent to Riemannian gradients,
the exponential map, and SO(3)/SE(3) poses. Pure static files — no build step.

## Files

| File | Role |
| --- | --- |
| `index.html` | Page shell: canvas + HUD markup. Language-agnostic. |
| `style.css` | All styling. |
| `engine.js` | Three.js scene, animations, navigation. **Contains no display text.** |
| `content/hu.js` | Hungarian text pack (every visible string). |
| `content/en.js` | English text pack. |

The only dependency is **Three.js r128 (MIT)**, loaded from cdnjs in `index.html`
and pinned with a Subresource Integrity (`integrity="sha512-…"`) hash — the browser
runs it only if the bytes match exactly, so the CDN can't serve tampered code.

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
   card bodies (`expn`, `expsl`, `s5step`, `s5reset`, `s5ph`, `s5it`, `s5L`) or the
   structure — the engine binds to them. Math notation (`w − α∇L`, `exp(v)`, …) usually
   stays as-is. Keep `s5.phases[0]` identical to the `#s5step` button text and
   `s5.phaseText[0]` identical to the `#s5ph` text (they must match).
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
