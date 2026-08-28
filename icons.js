'use strict';
/* One inline-SVG icon set for every piece of chrome. Exposes LIE.icons.

   Why not characters. The controls used to be Unicode glyphs, and they were not one set:
   the rail arrows (⬅︎ ➡︎ ⬆︎ ⬇︎) are from the *emoji* block with a text-presentation
   selector taped on, which many platforms ignore — on Android and iOS they come back as
   full-color emoji arrows sitting next to `▶︎ ■ ◐ ☀ ☾ ▷ − + ✓`, which are plain text
   glyphs from four unrelated Unicode blocks and four unrelated designs. Even where the
   selector is honoured, each glyph's weight, optical size and baseline are whatever the
   platform's fallback font happens to draw, so the same button is a thin outline on one
   device and a heavy block on another, and nothing in `.nbtn`'s CSS can correct for it
   (`#speak` carried a hand-tuned smaller `font-size` purely to make ▶︎ sit next to the
   arrows — that hack is gone with the glyphs).

   These are drawn instead: one 24×24 grid, one 2px stroke, round caps and joins,
   `currentColor` so every existing `color`/`:hover`/`:disabled` rule keeps working
   untouched. `aria-hidden` because every button that carries one already has its own
   `aria-label` from the content pack — the icon must not be announced twice, and it
   carries no text a screen reader could read anyway.

   Sizing is CSS, not markup: `.svgic` has no width/height of its own, so the per-context
   rules in style.css (`.nbtn .svgic`, `.ticon .svgic`, `.tsbtn .svgic`) decide. The one
   icon *not* here is the language list's check mark, which is a CSS `::after` — `content`
   cannot hold markup, so it is the same path re-encoded as a mask-image in style.css.
   Keep the two in step. */
window.LIE = window.LIE || {};
LIE.icons = (function () {
  // stroked: the default — outlines on the 24×24 grid
  const S = body =>
    '<svg class="svgic" viewBox="0 0 24 24" aria-hidden="true" focusable="false" ' +
    'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    body +
    '</svg>';
  // solid: play/stop read as *transport* controls rather than directions, and that
  // convention is filled everywhere. Stroking the same path as well keeps their optical
  // weight equal to the outlined icons' and rounds the corners to match.
  const F = body =>
    '<svg class="svgic" viewBox="0 0 24 24" aria-hidden="true" focusable="false" ' +
    'fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    body +
    '</svg>';
  const p = d => '<path d="' + d + '"/>';

  return {
    // ---- direction: shaft + head, identical geometry rotated four ways, so the rail
    // reads as one control cluster rather than four unrelated symbols
    left: S(p('M19 12H5') + p('M11 18l-6-6 6-6')),
    right: S(p('M5 12h14') + p('M13 6l6 6-6 6')),
    up: S(p('M12 19V5') + p('M6 11l6-6 6 6')),
    down: S(p('M12 5v14') + p('M18 13l-6 6-6-6')),

    // ---- read-aloud transport
    play: F(p('M9 5.8v12.4L19 12z')),
    stop: F('<rect x="7" y="7" width="10" height="10" rx="1.5"/>'),

    // ---- theme cycle: system is the light/dark split disc the old ◐ stood for
    themeSystem: S(
      '<circle cx="12" cy="12" r="8.5"/>' +
        '<path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" stroke="none"/>'
    ),
    themeLight: S(
      '<circle cx="12" cy="12" r="4.2"/>' +
        p(
          'M12 2.5v2.2M12 19.3v2.2M4.28 4.28l1.56 1.56M18.16 18.16l1.56 1.56' +
            'M2.5 12h2.2M19.3 12h2.2M4.28 19.72l1.56-1.56M18.16 5.84l1.56-1.56'
        )
    ),
    themeDark: S(p('M20.5 14.6A8.6 8.6 0 0 1 9.4 3.5a8.6 8.6 0 1 0 11.1 11.1z')),

    // ---- read-aloud mode: a speaker that is either sounding or crossed out, rather than
    // the old ▷/▶ pair, whose two states differed only by fill
    speechOn: S(
      p('M11 5L6.5 9H3.5v6h3L11 19z') +
        p('M14.8 9.4a3.6 3.6 0 0 1 0 5.2') +
        p('M17.6 6.8a7.4 7.4 0 0 1 0 10.4')
    ),
    speechOff: S(p('M11 5L6.5 9H3.5v6h3L11 19z') + p('M15.5 10l4.5 4') + p('M20 10l-4.5 4')),

    // ---- text size stepper
    minus: S(p('M5.5 12h13')),
    plus: S(p('M12 5.5v13') + p('M5.5 12h13')),

    // ---- menu drawer close (the drawer covers its own rail trigger when open)
    close: S(p('M6 6l12 12') + p('M18 6l-12 12')),
  };
})();
