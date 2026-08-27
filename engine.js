'use strict';

/* ---- language / content selection -------------------------------------- */
const LANGS = window.LIE_CONTENT || {};
function pickLang() {
  const q = new URLSearchParams(location.search).get('lang');
  if (q && LANGS[q]) return q;
  const h = document.documentElement.getAttribute('lang');
  if (h && LANGS[h]) return h;
  if (LANGS.hu) return 'hu';
  return Object.keys(LANGS)[0];
}
const LANG = pickLang();
const C = LANGS[LANG];
if (!C) {
  throw new Error('No LIE_CONTENT loaded — include a content/<lang>.js file.');
}
document.documentElement.lang = (C.meta && C.meta.htmlLang) || LANG;
if (C.meta && C.meta.title) document.title = C.meta.title;
document.getElementById('prev').setAttribute('aria-label', C.ui.prevAria);
document.getElementById('next').setAttribute('aria-label', C.ui.nextAria);

/* ---- icons ---------------------------------------------------------------
   One drawn set for every control (see icons.js for why they are not characters).
   The markup in index.html ships the rail's buttons empty and they are filled here, so
   the four arrows can never drift apart: there is exactly one definition of each. The
   hub gets the same object through `run()`'s ctx rather than reaching for the global,
   matching how it already receives THREE, the kit and the palette. */
const ICON = LIE.icons;
document.getElementById('prev').innerHTML = ICON.left;
document.getElementById('next').innerHTML = ICON.right;
document.getElementById('tohub').innerHTML = ICON.down;
document.getElementById('toenter').innerHTML = ICON.up;

/* Language list (only shown when more than one pack is loaded). It lives inside the
   top-right menu panel, so it is a plain always-visible list — a dropdown nested in a
   dropdown would need two clicks to reach one link. */
(function () {
  const codes = Object.keys(LANGS);
  const sec = document.getElementById('msec-lang');
  if (codes.length < 2) {
    sec.hidden = true;
    return;
  }
  const menu = document.createElement('ul');
  menu.id = 'langmenu';
  menu.setAttribute('role', 'listbox');
  codes.forEach(code => {
    const m = LANGS[code].meta || {};
    const li = document.createElement('li');
    li.setAttribute('role', 'option');
    // keep the rest of the query (notably ?journey=) so switching language stays
    // on the current journey instead of dropping back to the default one
    const q = new URLSearchParams(location.search);
    q.set('lang', code);
    const a = document.createElement('a');
    a.href = '?' + q.toString();
    if (code === LANG) {
      a.className = 'on';
      li.setAttribute('aria-selected', 'true');
    }
    a.innerHTML =
      '<span class="flag">' +
      (m.flag || '🌐') +
      '</span><span>' +
      (m.langLabel || code) +
      '</span>';
    li.appendChild(a);
    menu.appendChild(li);
  });
  document.getElementById('lang').appendChild(menu);
})();

/* ---- toolkit + mode selection ------------------------------------------ */
const K = window.LIE && LIE.kit;
if (!K) {
  throw new Error('LIE.kit not loaded — include kit.js before engine.js.');
}
const {V3, ease, clamp, RM, palette} = K;

const JOURNEYS = (window.LIE && LIE.journeys) || {};
const DEFAULT_JOURNEY = 'so3-optimization';
const journeyId = new URLSearchParams(location.search).get('journey');
// no ?journey= at all => land on the hub; an explicit id always wins
const hubMode = (journeyId === 'hub' || !journeyId) && !!(window.LIE && LIE.hub);
let journeyDef = null;
if (!hubMode) {
  journeyDef =
    (journeyId && JOURNEYS[journeyId]) || JOURNEYS[DEFAULT_JOURNEY] || Object.values(JOURNEYS)[0];
  if (!journeyDef) {
    throw new Error('No journey registered — include a journeys/<id>.js before engine.js.');
  }
}
document.body.classList.toggle('hub', hubMode);

/* ---- theme (dark / light / system) ------------------------------------- */
const THEME_KEY = 'lie-theme';
const mqlDark = matchMedia('(prefers-color-scheme: dark)');
function storedPref() {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === 'light' || v === 'dark' || v === 'system' ? v : 'system';
  } catch (e) {
    return 'system';
  }
}
function resolveTheme(pref) {
  if (pref === 'light' || pref === 'dark') return pref;
  return mqlDark.matches ? 'dark' : 'light';
}
let themePref = storedPref();
let theme = resolveTheme(themePref);
document.documentElement.setAttribute('data-theme', theme);
let PAL = palette(theme);

/* ---- three.js scene (shared) ------------------------------------------- */
const cv = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({canvas: cv, antialias: true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 900);
scene.add(new THREE.AmbientLight(0xbdc4d6, 0.75));
const key = new THREE.DirectionalLight(0xffffff, 0.55);
key.position.set(3, 6, 4);
scene.add(key);
function applySceneTheme() {
  renderer.setClearColor(PAL.bg);
  scene.fog = new THREE.FogExp2(PAL.fog, 0.0052);
}
applySceneTheme();

/* ---- theme toggle (shared; content re-theme delegated per mode) -------- */
let rethemeContent = () => {};
const THEME_ICON = {system: ICON.themeSystem, light: ICON.themeLight, dark: ICON.themeDark};
const THEME_NEXT = {system: 'light', light: 'dark', dark: 'system'};
const themeBtn = document.createElement('button');
themeBtn.id = 'themebtn';
themeBtn.type = 'button';
document.getElementById('theme').appendChild(themeBtn);
function updateThemeBtn() {
  const tl = (C.ui && C.ui.theme) || {};
  const name = tl[themePref] || themePref;
  // inside the menu the button has room to say where it currently stands, not just show a glyph
  themeBtn.innerHTML =
    '<span class="ticon" aria-hidden="true">' + THEME_ICON[themePref] + '</span><span></span>';
  themeBtn.lastChild.textContent = name;
  themeBtn.title = (tl.label || 'Theme') + ': ' + name;
  themeBtn.setAttribute('aria-label', (tl.label || 'Theme') + ': ' + name);
}
function setTheme(next) {
  if (next === theme) return;
  theme = next;
  document.documentElement.setAttribute('data-theme', theme);
  PAL = palette(theme);
  applySceneTheme();
  rethemeContent();
}
function applyPref(pref) {
  themePref = pref;
  try {
    localStorage.setItem(THEME_KEY, pref);
  } catch (e) {}
  setTheme(resolveTheme(pref));
  updateThemeBtn();
}
themeBtn.addEventListener('click', () => applyPref(THEME_NEXT[themePref]));
updateThemeBtn();

/* ---- text size (smaller / small / default) ------------------------------
   A plus/minus slider over three steps, replacing the old cycling button. The steps
   scale `--text-scale`, which every fluid font-size in style.css (`clamp(...) *
   var(--text-scale)`) multiplies in — so this stacks with, rather than replaces, the
   viewport-based scaling already there. `default` is 1 (matches every size already
   chosen for the "default" case) and is deliberately the *largest* step, with two
   smaller ones below it — not tied to any OS-level signal: unlike color scheme, there is
   no cross-browser media query for a user's preferred text scale to default to, so
   "unless you ask, nothing shrinks" is the honest default, and it sits at the slider's
   top end rather than its middle. The two steps down are deliberately uneven rather than
   an even 3-way split: the first press of `−` already carries most of the drop (1 → 0.78),
   so one click reads as a real change instead of a barely-visible nudge, and the second
   press finishes the descent to the floor (0.78 → 0.62) rather than repeating the first
   jump's size. */
const TEXTSIZE_KEY = 'lie-textsize';
const TEXT_STEPS = ['smaller', 'small', 'default'];
const TEXT_SCALE = {smaller: 0.62, small: 0.78, default: 1};
function storedTextSizePref() {
  try {
    const v = localStorage.getItem(TEXTSIZE_KEY);
    return TEXT_SCALE[v] ? v : 'default';
  } catch (e) {
    return 'default';
  }
}
let textSizePref = storedTextSizePref();
document.documentElement.style.setProperty('--text-scale', TEXT_SCALE[textSizePref]);

const tsWrap = document.createElement('div');
tsWrap.id = 'textsizectl';
const tsMinus = document.createElement('button');
tsMinus.id = 'tsminus';
tsMinus.type = 'button';
tsMinus.className = 'tsbtn';
tsMinus.innerHTML = ICON.minus;
const tsTrack = document.createElement('div');
tsTrack.id = 'tstrack';
tsTrack.setAttribute('role', 'slider');
tsTrack.setAttribute('aria-valuemin', '0');
tsTrack.setAttribute('aria-valuemax', String(TEXT_STEPS.length - 1));
tsTrack.tabIndex = 0;
tsTrack.innerHTML =
  '<span class="tsfill"></span>' +
  TEXT_STEPS.map((_, i) => '<span class="tsdot" data-i="' + i + '"></span>').join('');
const tsPlus = document.createElement('button');
tsPlus.id = 'tsplus';
tsPlus.type = 'button';
tsPlus.className = 'tsbtn';
tsPlus.innerHTML = ICON.plus;
const tsName = document.createElement('span');
tsName.id = 'tsname';
tsWrap.append(tsMinus, tsTrack, tsPlus, tsName);
document.getElementById('textsize').appendChild(tsWrap);

function tsIndex() {
  return TEXT_STEPS.indexOf(textSizePref);
}
function updateTextSizeCtl() {
  const tl = (C.ui && C.ui.textSize) || {};
  const i = tsIndex();
  const name = tl[textSizePref] || textSizePref;
  tsName.textContent = name;
  const label = (tl.label || 'Text size') + ': ' + name;
  tsTrack.setAttribute('aria-valuenow', String(i));
  tsTrack.setAttribute('aria-valuetext', label);
  tsTrack.setAttribute('aria-label', tl.label || 'Text size');
  tsTrack
    .querySelectorAll('.tsdot')
    .forEach(d => d.classList.toggle('on', Number(d.dataset.i) <= i));
  tsTrack.style.setProperty('--tsi', String(i));
  tsMinus.disabled = i === 0;
  tsMinus.setAttribute('aria-label', (tl.label || 'Text size') + ' −');
  tsPlus.disabled = i === TEXT_STEPS.length - 1;
  tsPlus.setAttribute('aria-label', (tl.label || 'Text size') + ' +');
}
function applyTextSizePref(pref) {
  textSizePref = pref;
  try {
    localStorage.setItem(TEXTSIZE_KEY, pref);
  } catch (e) {}
  document.documentElement.style.setProperty('--text-scale', TEXT_SCALE[pref]);
  updateTextSizeCtl();
}
function stepTextSize(delta) {
  const i = Math.min(TEXT_STEPS.length - 1, Math.max(0, tsIndex() + delta));
  applyTextSizePref(TEXT_STEPS[i]);
}
tsMinus.addEventListener('click', () => stepTextSize(-1));
tsPlus.addEventListener('click', () => stepTextSize(1));
tsTrack.addEventListener('click', e => {
  const dot = e.target.closest('.tsdot');
  if (dot) applyTextSizePref(TEXT_STEPS[Number(dot.dataset.i)]);
});
tsTrack.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
    e.preventDefault();
    stepTextSize(1);
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
    e.preventDefault();
    stepTextSize(-1);
  }
});
updateTextSizeCtl();
mqlDark.addEventListener('change', () => {
  if (themePref === 'system') setTheme(resolveTheme('system'));
});

/* ---- read aloud (Web Speech API) — Chrome-only prototype ----------------
   `speechSynthesis` is in the browser, so this adds no dependency and no build step.
   The API half is trivial; the work is turning a card into speakable text, because a
   card body is math markup, not prose. Four things the extractor has to do that a bare
   `bo.textContent` does not:

   - **Skip the footnote bubbles.** They are `hidden` dialogs sitting *inside* the card
     body, so textContent recites the "what is δ" popup in the middle of a sentence.
   - **Say what `<sup>`/`<sub>` mean.** `ℝ<sup>n</sup>` flattens to "ℝn"; markup is the
     only place the exponent is marked at all (that is why CLAUDE.md forbids precomposed
     Unicode there), so the reading has to be reconstructed from the tags.
   - **Not read matrices cell by cell.** `.mgrid` is a CSS grid of loose numbers — read
     in DOM order it is number soup. It gets announced by its shape instead.
   - **Name the symbols.** A voice either skips ℝ/∇/⊞/θ silently or reads the Unicode
     character name. `ui.speech.symbols` in each content pack is the pronunciation
     dictionary; it is per-language because everything a reader hears is.

   Where auto-extraction still reads badly, `data-speak` on any element overrides its
   whole subtree — `<span class="m" data-speak="R to the n">ℝ<sup>n</sup></span>`. Card
   bodies are already per-language, so that override is in the right language for free,
   and only the formulas that actually need it have to carry one.

   Chrome specifics this leans on (it is a prototype, not a portable feature): utterances
   are chunked to a few sentences because Chrome cuts off a single long one at ~15s;
   `getVoices()` is populated asynchronously, hence the `voiceschanged` re-check; and
   `cancel()` immediately followed by `speak()` drops the new utterance, hence the tick
   between them. */
// Named `reader`, not `speech`: the menu's container div is `<div id="speech">`, and an
// element id is exposed as a window property — same name, two things, one of them silent.
const SPEECH_KEY = 'lie-speech';
const SPEECH_ICON = {off: ICON.speechOff, auto: ICON.speechOn};
const SPEECH_NEXT = {off: 'auto', auto: 'off'};
const reader = (function () {
  const synth = window.speechSynthesis;
  const sec = document.getElementById('msec-speech');
  const rail = document.getElementById('speak');
  const sp = (C.ui && C.ui.speech) || {};
  // Scoped to journeys: the ask was the stations, and the hub's bar text is rewritten on
  // every hover — a reader there would stutter rather than speak.
  if (hubMode || !synth || !window.SpeechSynthesisUtterance || !sec) return null;

  document.getElementById('mspeech-h').textContent = sp.label || 'Read aloud';
  const btn = document.createElement('button');
  btn.id = 'speechbtn';
  btn.type = 'button';
  document.getElementById('speech').appendChild(btn);
  // Voice picker: once a second engine is installed (Android in particular — Samsung's
  // own TTS sits next to Google's, and a sideloaded engine like RHVoice/Piper adds a
  // third) there is no way to know in advance which one a given user will find best.
  // Auto-pick just seeds a reasonable default; this lets a user override it.
  const voiceSel = document.createElement('select');
  voiceSel.id = 'speechvoice';
  voiceSel.setAttribute('aria-label', sp.voiceLabel || 'Voice');
  voiceSel.title = sp.voiceLabel || 'Voice';
  document.getElementById('speech').appendChild(voiceSel);

  let pref = (function () {
    try {
      return localStorage.getItem(SPEECH_KEY) === 'auto' ? 'auto' : 'off';
    } catch (e) {
      return 'off';
    }
  })();
  let voice = null,
    speaking = false;

  /* ---- voice ------------------------------------------------------------
     Auto-pick seeds a default; a manual choice (stored per page language, since a
     language switch here is a full page reload, not a live re-render) always wins over
     it once made, and self-heals back to auto if that engine ever disappears — voiceId()
     just stops matching anything candidateVoices() returns. */
  const VOICE_KEY =
    'lie-speech-voice:' + (document.documentElement.lang || 'en').toLowerCase().split('-')[0];
  function candidateVoices() {
    const base = (document.documentElement.lang || 'en').toLowerCase().split('-')[0];
    return synth
      .getVoices()
      .filter(v => v.lang.toLowerCase().replace('_', '-').split('-')[0] === base);
  }
  function voiceId(v) {
    return v.name + '::' + v.lang;
  }
  function bestVoice(all) {
    // Chrome lists Google's *network* voices next to any locally installed ones. Prefer
    // local: card text going off-device for synthesis is a heavier dependency than the
    // CDN round-trip this project vendors three.min.js to avoid. Network is the fallback
    // rather than nothing, since on desktop Linux it is often all Chrome has.
    return all.find(v => v.localService) || all[0] || null;
  }
  function pickVoice() {
    const all = candidateVoices();
    let stored = null;
    try {
      stored = localStorage.getItem(VOICE_KEY);
    } catch (e) {}
    return (stored && all.find(v => voiceId(v) === stored)) || bestVoice(all);
  }

  /* ---- card -> speakable text ----------------------------------------- */
  const SYM = sp.symbols || {};
  // Alternation rather than a character class: the Lie-algebra names are Fraktur letters
  // outside the BMP (𝔰𝔢, 𝔰𝔦𝔪 — surrogate pairs), so they are multi-unit keys and a class
  // would match their halves separately. Longest-first, so a multi-letter key wins.
  const SYM_KEYS = Object.keys(SYM).sort((a, b) => b.length - a.length);
  const SYM_RE = SYM_KEYS.length
    ? new RegExp(SYM_KEYS.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g')
    : null;
  const SKIP_CLASS = ['bubble', 'whatnext', 'dotctr'];

  function matrixPhrase(el) {
    // resolved track count, so `repeat(2,auto)` and a bare `auto` column vector both work
    const cols = (getComputedStyle(el).gridTemplateColumns.match(/\S+/g) || ['x']).length;
    const rows = Math.max(1, Math.ceil(el.children.length / cols));
    const tpl = (cols === 1 ? sp.vector : sp.matrix) || '{r} by {c} matrix';
    return tpl.replace('{r}', rows).replace('{c}', cols);
  }

  function walk(node, out) {
    if (node.nodeType === 3) {
      out.push(node.nodeValue);
      return out;
    }
    if (node.nodeType !== 1) return out;
    const el = node,
      tag = el.tagName;
    if (el.hidden || el.getAttribute('aria-hidden') === 'true') return out;
    if (el.dataset && el.dataset.speak != null) {
      out.push(' ' + el.dataset.speak + ' ');
      return out;
    }
    if (SKIP_CLASS.some(c => el.classList.contains(c))) return out;
    if (el.classList.contains('mgrid')) {
      out.push(' ' + matrixPhrase(el) + ' ');
      return out;
    }
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'SVG' || tag === 'CANVAS') return out;
    // .termbtn is a word inside a sentence (it opens a footnote); every other button in a
    // card is a control — "step", "reset" — and reading it aloud makes no sense.
    if (tag === 'BUTTON' && !el.classList.contains('termbtn')) return out;
    if (tag === 'SUP') out.push(' ' + (sp.supWord || 'to the power of') + ' ');
    if (tag === 'SUB') out.push(' ' + (sp.subWord || 'sub') + ' ');
    for (const kid of el.childNodes) walk(kid, out);
    if (tag === 'SUP' || tag === 'SUB') out.push(' ');
    return out;
  }

  function textOf(el) {
    let s = walk(el, []).join('');
    if (SYM_RE) s = s.replace(SYM_RE, ch => ' ' + SYM[ch] + ' ');
    return s.replace(/\s+/g, ' ').trim();
  }

  // Chrome silently truncates one long utterance at ~15s, so the card is queued as
  // several short ones. Japanese packs ~3x the speech into the same character count,
  // hence the smaller budget there.
  const BUDGET = LANG === 'ja' ? 60 : 150;
  function chunk(s) {
    const out = [];
    let buf = '';
    for (const part of s.split(/(?<=[.!?;:。！？])\s*/)) {
      if (!part) continue;
      if (buf && buf.length + part.length > BUDGET) {
        out.push(buf);
        buf = part;
      } else buf = buf ? buf + ' ' + part : part;
    }
    if (buf) out.push(buf);
    return out;
  }

  function cardChunks() {
    const out = [];
    const t = textOf(document.getElementById('ti'));
    if (t) out.push(t);
    for (const block of document.getElementById('bo').children) {
      const s = textOf(block);
      if (s) out.push.apply(out, chunk(s));
    }
    return out;
  }

  /* ---- speaking -------------------------------------------------------- */
  function stop() {
    speaking = false;
    synth.cancel();
    sync();
  }
  function speakCard() {
    const parts = cardChunks();
    if (!voice || !parts.length) return;
    synth.cancel();
    speaking = true;
    sync();
    // cancel() + speak() in the same tick drops the new utterance in Chrome
    setTimeout(() => {
      if (!speaking) return;
      // A throw here (a voice that went away between pick and use, say) would otherwise
      // leave `speaking` stuck true and the rail button locked on its stop glyph, with no
      // error event coming to clear it — onerror only fires for utterances that started.
      try {
        parts.forEach((text, i) => {
          const u = new SpeechSynthesisUtterance(text);
          u.voice = voice;
          u.lang = voice.lang;
          u.rate = 0.97;
          if (i === parts.length - 1)
            u.onend = () => {
              speaking = false;
              sync();
            };
          u.onerror = () => {
            speaking = false;
            sync();
          };
          synth.speak(u);
        });
      } catch (e) {
        speaking = false;
        synth.cancel();
        sync();
      }
    }, 60);
  }

  function sync() {
    const has = !!voice;
    sec.hidden = !has;
    rail.hidden = !has;
    if (!has) return;
    const name = sp[pref] || pref;
    btn.innerHTML =
      '<span class="ticon" aria-hidden="true">' + SPEECH_ICON[pref] + '</span><span></span>';
    btn.lastChild.textContent = name;
    // which voice actually got picked is worth surfacing: "network" means the card text
    // is being synthesized off-device
    const via = voice.name + (voice.localService ? '' : ' · ' + (sp.network || 'network'));
    btn.title = (sp.label || 'Read aloud') + ': ' + name + ' — ' + via;
    btn.setAttribute('aria-label', (sp.label || 'Read aloud') + ': ' + name);
    rail.innerHTML = speaking ? ICON.stop : ICON.play;
    rail.classList.toggle('speaking', speaking);
    const ra = speaking ? sp.stopAria || 'Stop reading' : sp.playAria || 'Read aloud';
    rail.title = ra;
    rail.setAttribute('aria-label', ra);
  }

  function syncVoiceOptions() {
    const all = candidateVoices();
    // Nothing to choose between with zero or one candidate — same "don't show a control
    // with nothing to control" rule the language list already follows.
    voiceSel.hidden = all.length < 2;
    voiceSel.innerHTML = '';
    all.forEach(v => {
      const opt = document.createElement('option');
      opt.value = voiceId(v);
      opt.textContent = v.name + (v.localService ? '' : ' · ' + (sp.network || 'network'));
      voiceSel.appendChild(opt);
    });
    if (voice) voiceSel.value = voiceId(voice);
  }
  voiceSel.addEventListener('change', () => {
    const picked = candidateVoices().find(v => voiceId(v) === voiceSel.value);
    if (!picked) return;
    voice = picked;
    try {
      localStorage.setItem(VOICE_KEY, voiceId(picked));
    } catch (e) {}
    sync();
    // demonstrate the new voice immediately rather than waiting for the next station
    if (pref === 'auto' || speaking) speakCard();
  });

  btn.addEventListener('click', () => {
    pref = SPEECH_NEXT[pref];
    try {
      localStorage.setItem(SPEECH_KEY, pref);
    } catch (e) {}
    if (pref === 'auto') speakCard();
    else stop();
    sync();
  });
  rail.addEventListener('click', () => {
    if (speaking) stop();
    else speakCard();
  });

  // getVoices() is empty on first call in Chrome and fills in asynchronously
  synth.addEventListener('voiceschanged', () => {
    voice = pickVoice();
    syncVoiceOptions();
    sync();
  });
  voice = pickVoice();
  syncVoiceOptions();
  sync();

  // Chrome keeps speaking across a navigation (hub<->journey is a full page load)
  addEventListener('pagehide', () => synth.cancel());

  return {
    // called from renderCard: whatever was being read belongs to the station just left
    onCard() {
      stop();
      if (pref === 'auto' && voice) speakCard();
    },
    stop,
    chunks: cardChunks,
  };
})();

/* ---- top-right menu: theme + language + the control legend ------------- */
(function () {
  const ui = C.ui || {},
    tl = ui.theme || {};
  const btn = document.getElementById('menubtn');
  const panel = document.getElementById('menupanel');
  const cluster = document.getElementById('topctl');
  btn.setAttribute('aria-label', ui.menuLabel || 'Menu');
  btn.title = ui.menuLabel || 'Menu';
  document.getElementById('mtheme-h').textContent = tl.label || 'Theme';
  document.getElementById('mtextsize-h').textContent =
    (ui.textSize && ui.textSize.label) || 'Text size';
  document.getElementById('mlang-h').textContent = ui.langMenuLabel || 'Language';
  document.getElementById('mhint-h').textContent = ui.controlsLabel || 'Controls';
  /* Dev switch: reveals the station/camera tuning overlay built further down (journey
     mode only — a no-op in the hub, which has no SP/OFF to tune). Persisted so it survives
     the full-page reload a hub<->journey nav is, which is what lets you flip it on once and
     then walk moon to moon accumulating tuned layouts. A reload on toggle (rather than
     wiring the overlay to appear/disappear live) is the deliberately cheap way to keep this
     one flag in sync with a feature built at page-load time. */
  const devBtn = document.createElement('button');
  devBtn.id = 'devbtn';
  devBtn.type = 'button';
  devBtn.innerHTML = '<span class="devdot" aria-hidden="true"></span><span>Station tuning</span>';
  document.getElementById('dev').appendChild(devBtn);
  const devOn = () => {
    try {
      return localStorage.getItem('lie-dev') === '1';
    } catch (e) {
      return false;
    }
  };
  devBtn.setAttribute('aria-pressed', devOn() ? 'true' : 'false');
  devBtn.addEventListener('click', () => {
    try {
      localStorage.setItem('lie-dev', devOn() ? '0' : '1');
    } catch (e) {}
    location.reload();
  });
  const setOpen = v => {
    panel.hidden = !v;
    btn.setAttribute('aria-expanded', v ? 'true' : 'false');
  };
  btn.addEventListener('click', e => {
    e.stopPropagation();
    setOpen(panel.hidden);
  });
  document.addEventListener('click', e => {
    if (!panel.hidden && !cluster.contains(e.target)) setOpen(false);
  });
  // Escape closes the menu first and stops there — the journey's own Escape handler backs
  // out to the hub, which would be a surprise when you only meant to dismiss this panel.
  // Document fires before the window-level handler, so stopping propagation here is enough.
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || panel.hidden) return;
    e.stopPropagation();
    setOpen(false);
    btn.focus();
  });
})();

/* ---- resize (shared) --------------------------------------------------- */
/* The canvas covers the whole window, but the text card eats into it. Shifting the
   frustum re-centers the scene in what is left, so nothing important ends up hidden
   behind the card. Journeys shift sideways (the card sits on the left, full-height);
   the hub shifts vertically (the card is now a bottom mission bar, full-width) — a
   fixed amount rather than the card's measured height, so hovering a branch (which
   changes the card's content, hence its height) does not jiggle the framing. Below the
   mobile breakpoint both cards go full-width bars and there is no free column/row left
   to center in, so neither shifts. The hub also skips the *sideways* shift regardless of
   width: its outermost orbit already fills the viewport, so nudging it sideways would
   swing the far planet off the edge. */
const hudEl = document.getElementById('hud');
/* Confirmed on a real device, independent of any of the above: the very first paint of
   #hud after page load can come back completely blank — no background, no border, no
   text — while #nav/#topctl (static markup, not their own scroll container) paint
   correctly from the first frame. The very next station's fade transition (which toggles
   this same element's class, forcing a style recalc) fixes it on its own, which is why
   the bug is easy to miss testing past the first screen. #hud is the only fixed-position
   element here that is ALSO its own overflow:auto scroll container with content and a
   custom property (`--bubmax`) set by JS before that first paint — a combination some
   engines mishandle on the very first frame. Forcing an extra reflow right after that
   content lands closes the gap between "the DOM is correct" and "the browser actually
   painted it". */
function forceRepaint(el) {
  el.style.display = 'none';
  void el.offsetHeight;
  el.style.display = '';
}
/* px the scene shifts up, off a bottom-anchored card — the hub bar always, and now (once
   the mobile breakpoint hits) a journey's card too, since it also docks to the bottom
   there. The card has a *fixed* height on that edge (the hub bar's is set in the CSS; a
   mobile journey card is capped by `.scrolls`), so this can be derived from it instead of
   hard-coded: lifting by half the space it occupies centers the rest of the scene in what
   is left. Deriving it also means a hover-driven height change on desktop never needs to
   fight a stale fixed value. The `bottom` offset itself is read live too (12px on mobile,
   26px for the hub on desktop) rather than hard-coded, so it can never drift out of step
   with the CSS. Falls back to a rough guess only if the card has not been laid out yet. */
function bottomLift() {
  const h = hudEl.getBoundingClientRect().height || innerHeight * (hubMode ? 0.4 : 0.5);
  const gap = parseFloat(getComputedStyle(hudEl).bottom) || 12;
  return Math.round((h + gap) / 2);
}
// Returns the (ox, oy) pair to hand straight to camera.setViewOffset — signs verified
// empirically (a positive ox pushes content left, a positive oy pushes it up), not
// derived from the setViewOffset docs, which describe the sub-rectangle it reads from a
// larger virtual sensor rather than the on-screen effect that has.
function viewShift() {
  // Below the mobile breakpoint both cards go full-width bottom bars (see style.css), so
  // there is no free side column to center in either — but lifting the scene up and out
  // from under whichever one is showing still applies the same way it does for the hub on
  // desktop, hence sharing bottomLift() rather than returning {0,0} here.
  if (innerWidth <= 640 || hubMode) return {ox: 0, oy: bottomLift()}; // positive oy => content moves up
  return {ox: -(hudEl.getBoundingClientRect().right / 2), oy: 0}; // negative ox => content moves right
}
/* Declared above resize() on purpose: resize() runs once during startup, below, and reads
   both of these — as `let`s declared after that call they would be in the temporal dead
   zone and throw. Module scope, not the drag block's, because an authored card width
   (layouts/<id>.json's `CARD`) has to clamp exactly the way a drag does and the journey
   player is a separate top-level block. HUD_MIN_W is the card's old fixed width; the
   `innerWidth - 380` term keeps the 3D view from being squeezed off a narrow window. */
const HUD_MIN_W = 460,
  HUD_MAX_W = 900;
const clampCardW = w => Math.max(HUD_MIN_W, Math.min(Math.min(HUD_MAX_W, innerWidth - 380), w));
// set by the journey player when the tuning panel is up, so a drag writes back into CARD[cur]
let onCardDrag = null;
// set by the journey player; re-clamps an authored CARD width on a window resize
let reapplyCardWidth = null;

function resize() {
  camera.aspect = innerWidth / innerHeight;
  // an authored CARD width clamps against innerWidth, so it has to be re-clamped here;
  // this only writes the style (it does not call resize back), so there is no recursion
  if (reapplyCardWidth) reapplyCardWidth();
  const s = viewShift();
  // setViewOffset re-derives aspect from the full size, so the image is not stretched
  if (s.ox || s.oy)
    camera.setViewOffset(innerWidth, innerHeight, s.ox, s.oy, innerWidth, innerHeight);
  else camera.clearViewOffset();
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  syncHudScroll();
}
/* The longest cards do not fit a short viewport. Those get `.scrolls`, which makes the
   card a scroll box — and since a scroll box clips whatever hangs out of it, the CSS then
   moves the footnote panels into the flow. A card that fits keeps `overflow:visible` and
   with it the floating panel, whose height is clamped here to the room actually left below
   the card; when even that is too small to read, the card takes the inline treatment too.
   Measured off the flow content: `scrollHeight` counts an open floating panel, which hangs
   below the card on purpose, and would report a card that fits as overflowing. */
const boEl = document.getElementById('bo');
const navEl = document.getElementById('nav');
const resizeEl = document.getElementById('hudresize');
const PANEL_MIN = 200; // a floating panel shorter than this is not worth reading
/* The controls used to float *below* the card, so the card had to stop 78px short of the
   bottom to leave them room. They are inside it now (the console rail), so all that is
   still owed is the same breathing room the card keeps at the top. Mirrors `.scrolls`. */
const BOTTOM_KEEP = 22;
function syncHudScroll() {
  const top = hudEl.offsetTop;
  /* Measured off the flow content plus the rail, and deliberately NOT off `navEl.offsetTop`
     or `hudEl.scrollHeight`: the rail is `position:sticky`, so once it sticks `offsetTop`
     reports where it is *painted*, not where it sits in layout (810 instead of ~1305 on a
     long card) — which under-reports the card's height and leaves `.scrolls` off, running
     the card straight off the bottom of the window. `scrollHeight` is right for the rail
     but wrong for the bubble (it counts an open floating panel, which hangs below the card
     on purpose). `offsetHeight` and the computed margin are stable under sticky, so the
     rail's contribution is added explicitly. No padding term appears here because the card
     now has *no* bottom padding — the rail carries that gutter itself, which is what lets
     it stick flush to the card's bottom edge instead of floating a padding's width above it. */
  const navMt = parseFloat(getComputedStyle(navEl).marginTop) || 0;
  const need = boEl.offsetTop + boEl.offsetHeight + navMt + navEl.offsetHeight;
  // the hub card has no ↑ button competing for room below it, and is bottom-anchored
  // besides, so there is no bottom margin to reserve
  const avail = innerHeight - top - (hubMode ? 0 : BOTTOM_KEEP);
  const room = innerHeight - (top + Math.min(need, avail)) - 24; // the 12px gap under the card, and as much again below
  hudEl.style.setProperty('--bubmax', Math.max(0, room) + 'px');
  /* The `.scrolls` cap, published to the CSS rather than left to a `vh` expression there.
     On a phone or tablet browser with a retractable URL bar, `100vh` is the *large*
     viewport (as if the bar were hidden) while `innerHeight` — the number `avail` above is
     computed from, and the number the card actually has to fit into — is the smaller,
     visible one. Nothing here ever scrolls the document, so that bar never retracts and
     the two never converge: the CSS capped the card ~60px taller than the screen, and the
     console rail, sticky to the card's *bottom* edge, sat just below the fold. It showed up
     only from the second station on, because station 1 is usually short enough to fit
     without `.scrolls` at all — the exact shape of the bug report. Deriving the cap from
     the same `innerHeight` that decides `.scrolls` in the first place keeps the CSS and the
     JS from disagreeing about how tall the window is. */
  hudEl.style.setProperty('--hudmax', Math.max(0, avail) + 'px');
  // the hub has no floating footnote panel to reserve room for — it never needs `room`
  // (which is near-zero anyway: the hub card sits close to the bottom edge on purpose)
  hudEl.classList.toggle('scrolls', need > avail || (!hubMode && room < PANEL_MIN));
  syncHudResizeHandle();
}
/* #hudresize is a sibling of #hud, not a child (see index.html's comment): #hud is
   itself the scroll container once `.scrolls` is on, and a clipped/scrolling ancestor
   would both clip and swallow the clicks of a child that pokes out past its box, which
   this handle deliberately does to stay grabbable right on the card's border. Called from
   syncHudScroll() (not just resize()) for the same reason that function itself is called
   synchronously from renderCard() — a station's own height change has to reposition this
   before the next paint, not whenever the ResizeObserver backstop gets around to it. */
function syncHudResizeHandle() {
  if (hubMode) return;
  const r = hudEl.getBoundingClientRect();
  resizeEl.style.top = r.top + 'px';
  resizeEl.style.height = r.height + 'px';
  resizeEl.style.left = r.right - 5 + 'px';
}
// resize() (not just syncHudScroll()) so the mobile edgeLift() shift — which reads the
// card's live height — stays correct as a station's content changes it, not only on an
// actual window resize; resize() already calls syncHudScroll() itself at its tail.
if (window.ResizeObserver) new ResizeObserver(resize).observe(boEl);
addEventListener('resize', resize);
resize();

/* Desktop-only manual card-width resize (see style.css's #hudresize comment for why this
   is a custom drag handle rather than the native `resize` property). Skipped entirely in
   hub mode: the hub's card is a bottom-anchored bar sized by CSS (`48dvh` height, a
   viewport-relative width), not the side card this handle widens. Setting an inline
   `width` overrides the responsive `clamp()` in style.css on purpose — a deliberate
   user override — but the CSS `max-width` there still caps it on a later window shrink,
   so no extra reflow handling is needed here. */
if (!hubMode) {
  let dragStartX = 0,
    dragStartW = 0;
  function onDragMove(e) {
    const w = clampCardW(dragStartW + (e.clientX - dragStartX));
    hudEl.style.width = w + 'px';
    if (onCardDrag) onCardDrag(w);
    resize();
  }
  function onDragEnd() {
    resizeEl.classList.remove('dragging');
    removeEventListener('pointermove', onDragMove);
    removeEventListener('pointerup', onDragEnd);
    document.body.style.userSelect = '';
  }
  resizeEl.addEventListener('pointerdown', e => {
    if (innerWidth <= 640) return; // mobile breakpoint collapses the card to a full-width bar
    dragStartX = e.clientX;
    dragStartW = hudEl.getBoundingClientRect().width;
    resizeEl.classList.add('dragging');
    document.body.style.userSelect = 'none';
    addEventListener('pointermove', onDragMove);
    addEventListener('pointerup', onDragEnd);
    e.preventDefault();
  });
}

/* ========================================================================
   HUB MODE
   ===================================================================== */
if (hubMode) {
  // hub.js's syncFocus() owns this from here on (it swaps system/planet hints); this initial
  // value only covers the instant before that first runs, so it always starts in system mode
  document.getElementById('hint').innerHTML = ((C.hub && C.hub.hintSystem) || []).join('<br>');
  // hidden on the map; hub.js brings the nav strip back as the planet view's carousel control
  document.getElementById('nav').style.display = 'none';
  const eb = document.getElementById('eb'),
    ti = document.getElementById('ti'),
    bo = document.getElementById('bo');
  eb.textContent = (C.hub && C.hub.eyebrow) || '';
  ti.textContent = (C.meta && C.meta.title) || '';
  bo.innerHTML = (C.hub && C.hub.intro) || '';

  const hubApi = LIE.hub.run({
    THREE,
    kit: K,
    scene,
    camera,
    renderer,
    canvas: cv,
    C,
    PAL,
    icons: ICON,
  });
  rethemeContent = () => {
    hubApi.retheme(PAL);
  };
  requestAnimationFrame(() => forceRepaint(hudEl)); // see forceRepaint's comment above

  /* ========================================================================
   JOURNEY MODE
   ===================================================================== */
} else {
  document.getElementById('hint').innerHTML = C.ui.hint.join('<br>');

  const urlLang = () => new URLSearchParams(location.search).get('lang');
  function goHub() {
    const l = urlLang();
    // stamp which planet+moon this journey lives on, so the hub can land back on the
    // exact spot left rather than always resetting to the system map
    const m = LIE.hub && LIE.hub.moonOf ? LIE.hub.moonOf(journeyId) : null;
    const spot = m
      ? '&planet=' + encodeURIComponent(m.branchId) + '&moon=' + encodeURIComponent(m.moonKey)
      : '';
    location.href = '?journey=hub' + (l ? '&lang=' + l : '') + spot;
  }

  /* The last station is where a reader decides what to read next, and until now that
     decision was only ever *stated* — eleven journeys end by naming a destination ("that
     is the SO(3) moon", "the next moon") with nothing to act on. The only control there
     was ↓, which lands in system view: from a named moon, four or five more interactions
     to reach it. `journeyDef.seq` turns those sentences into links.

     Rendered inside #bo, not appended after it, for two reasons: syncHudScroll() measures
     the card off `boEl`, so anything outside it is invisible to the `.scrolls` decision;
     and a synthetic extra *card* — the other obvious shape for this — would break the
     `cards[LANG].length === stations.length` invariant that check.html exists to defend,
     taking OFF[i]/camPose() with it. This adds no station and no dot.

     Link text is the moon's own title from the content pack (via LIE.hub.moonOf), so no
     journey name lives in the engine. `handoffs` minus `next` because a journey may name
     the same moon both ways round and one link is enough. */
  function whatNext() {
    const seq = journeyDef.seq || {};
    const label = id => {
      const m = LIE.hub && LIE.hub.moonOf ? LIE.hub.moonOf(id) : null;
      if (!m) return id;
      const br = ((C.hub && C.hub.branches) || {})[m.branchId] || {};
      return ((br.moons || {})[m.moonKey] || {}).title || m.fallback || id;
    };
    const l = urlLang();
    const href = id =>
      '?journey=' + encodeURIComponent(id) + (l ? '&lang=' + encodeURIComponent(l) : '');
    const link = (id, cls) =>
      '<a class="' + cls + '" href="' + href(id) + '">' + label(id) + '</a>';
    const row = (lab, body) =>
      '<p class="wnrow"><span class="wnlab">' + lab + '</span>' + body + '</p>';
    const U = C.ui || {};
    let h = '';
    if (seq.next) h += row(U.nextStop || '', link(seq.next, 'wngo'));
    const also = (seq.handoffs || []).filter(id => id !== seq.next);
    if (also.length) h += row(U.alsoSee || '', also.map(id => link(id, 'wnalso')).join(''));
    // A same-planet "next moon", purely from the BRANCHES order — independent of (and often
    // redundant with) the hand-authored seq.next/handoffs above, so only added when it names
    // a moon those don't already offer.
    const nm = LIE.hub && LIE.hub.nextMoon ? LIE.hub.nextMoon(journeyId) : null;
    if (nm && nm !== seq.next && !also.includes(nm))
      h += row(U.nextMoon || U.nextStop || '', link(nm, 'wngo'));
    return h
      ? '<nav class="whatnext" aria-label="' + (U.whatNextAria || '') + '">' + h + '</nav>'
      : '';
  }
  const toHubBtn = document.getElementById('tohub');
  toHubBtn.hidden = false;
  toHubBtn.setAttribute('aria-label', (C.ui && C.ui.hubBackAria) || 'Hub');
  toHubBtn.title = (C.ui && C.ui.hubBackAria) || 'Hub';
  toHubBtn.onclick = goHub;

  /* Where a journey's layout comes from, innermost last:

       1. `layouts/<id>.json`  — the journey's default, and the file to edit in the repo.
       2. `layouts.json`       — an optional whole-repo override on top, for trying a
                                 tuning out before committing it into (1).
       3. a synthesized fallback — only if (1) is missing or unreadable.

     Both are fetched by index.html and parked on LIE.layoutDefault / LIE.layouts before
     this file is injected, because the scene is built the moment engine.js runs: a layout
     arriving later could only be applied as a visible jump. Each is SP / OFF / optional
     PAN as [x, y, z] triples — the shape the dev tuning panel downloads, so its output is
     a drop-in either way.

     Layers 1 and 2 are validated per key and ignored (with a warning) if an array does not
     match the station count or is not all finite triples. Being lenient rather than
     throwing is deliberate — this is authoring data meant to be droppable, and a
     wrong-length array would otherwise take out `camPose()` on the last station exactly
     the way a mismatched card array does, the failure check.html exists to catch. Silent
     at runtime, loud at the gate: check.html validates both layers against every journey's
     real station count.

     Layer 3 exists so that a missing layouts/<id>.json degrades to a usable-but-obviously-
     plain scene (stations in a straight line, one standard camera offset) instead of a
     blank page, since the station geometry itself is perfectly fine without it. It reads
     the count from `build().stations`, which is an array of *builder functions* — cheap to
     measure, nothing is constructed by asking for its length. */
  const DEFAULT_OFF = V3(0, 2.6, 9.2),
    STATION_GAP = 46;
  const LAYOUT = (function () {
    const tripsOK = (a, n) =>
      Array.isArray(a) &&
      a.length === n &&
      a.every(
        p =>
          Array.isArray(p) && p.length === 3 && p.every(v => typeof v === 'number' && isFinite(v))
      );
    const L = window.LIE || {};
    const def = L.layoutDefault && typeof L.layoutDefault === 'object' ? L.layoutDefault : null;
    const over = (L.layouts || {})[journeyId] || null;

    // station count: from the default file when it is sane, else from the journey itself
    let n = def && Array.isArray(def.SP) ? def.SP.length : 0;
    if (!n) {
      try {
        n = journeyDef.build(C, PAL).stations.length;
      } catch (e) {
        n = 0;
      }
      console.error(
        '[layouts] layouts/' +
          journeyId +
          '.json is missing or has no SP — ' +
          'falling back to ' +
          n +
          ' evenly spaced stations. Run check.html.'
      );
    }
    const synth = {
      SP: Array.from({length: n}, (_, i) => V3(i * STATION_GAP, 0, 0)),
      OFF: Array.from({length: n}, () => DEFAULT_OFF.clone()),
    };
    const pick = key => {
      let out = synth[key] || null;
      [
        ['layouts/' + journeyId + '.json', def],
        ['layouts.json', over],
      ].forEach(([who, src]) => {
        const a = src && src[key];
        if (a === undefined || a === null) return;
        if (!tripsOK(a, n)) {
          console.warn(
            '[' +
              who +
              '] ignoring ' +
              key +
              ' — expected ' +
              n +
              ' [x, y, z] triples ' +
              'to match the station count'
          );
          return;
        }
        out = a.map(p => V3(p[0], p[1], p[2]));
      });
      return out;
    };
    /* CARD is the odd one out: plain pixel widths for the HUD text card, not [x, y, z]
       triples. Accepts either one number for the whole journey or one per station, since
       both are things you actually want — a journey that just reads better wide, and a
       single station whose matrix needs more room than its neighbours. Normalized to a
       per-station array here so the caller never has to care which was written. */
    const pickCard = () => {
      let out = null;
      const num = v => typeof v === 'number' && isFinite(v) && v > 0;
      [
        ['layouts/' + journeyId + '.json', def],
        ['layouts.json', over],
      ].forEach(([who, src]) => {
        const a = src && src.CARD;
        if (a === undefined || a === null) return;
        if (num(a)) {
          out = Array.from({length: n}, () => a);
          return;
        }
        if (Array.isArray(a) && a.length === n && a.every(num)) {
          out = a.slice();
          return;
        }
        console.warn(
          '[' +
            who +
            '] ignoring CARD — expected one positive number, or ' +
            n +
            ' of them to match the station count'
        );
      });
      return out;
    };
    return {SP: pick('SP'), OFF: pick('OFF'), PAN: pick('PAN'), CARD: pickCard()};
  })();

  const SP = LAYOUT.SP;
  const OFF = LAYOUT.OFF;
  const LOOK = SP.map(p => p.clone().add(V3(0, 0.55, 0)));
  // Optional per-station translation, in the station's own (unrotated) local axes, applied
  // to the camera's pivot only — never to SP/LOOK, so it never moves the built geometry.
  // No journey currently sets `layout.PAN`, so this is always a zero vector today; it
  // exists so the dev tuning panel (below) has a "camera position relative to the grid"
  // knob that's independent of SP (content position), OFF's orbit angle, and OFF's radius
  // (zoom) — see pivot()/camPose(). A journey can adopt a tuned PAN by adding the array to
  // its `layout`, same shape as SP/OFF.
  const PAN = (LAYOUT.PAN || SP.map(() => V3(0, 0, 0))).map(v => v.clone());
  let CARD = LAYOUT.CARD; // per-station HUD card width in px, or null for the CSS default
  /* Skipped below the mobile breakpoint, where the card is a full-width bottom sheet and an
     inline px width would fight `#hud{left:0;width:100vw}` — the same guard the drag handle
     uses. Callers do the resize(): this only touches the style, so that the window-resize
     path can re-clamp (innerWidth is in the clamp) without recursing back into resize(). */
  function applyCardWidth(i) {
    if (!CARD || innerWidth <= 640) return;
    hudEl.style.width = clampCardW(CARD[i]) + 'px';
  }
  // registered unconditionally: applyCardWidth no-ops while CARD is null, and the tuning
  // panel can turn CARD on partway through a session
  reapplyCardWidth = () => applyCardWidth(travel ? travel.target : cur);
  const pivot = i => LOOK[i].clone().add(PAN[i]);

  let world = null,
    stations = [],
    curInst = null;
  function disposeWorld() {
    if (!world) return;
    world.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const arr = Array.isArray(o.material) ? o.material : [o.material];
        arr.forEach(m => {
          if (m.map) m.map.dispose();
          m.dispose();
        });
      }
    });
    scene.remove(world);
    world = null;
  }
  function buildScene() {
    disposeWorld();
    world = new THREE.Group();
    scene.add(world);
    const tc = new THREE.CatmullRomCurve3(SP.map(p => p.clone().add(V3(0, -2.5, 0))));
    world.add(
      new THREE.Mesh(
        new THREE.TubeGeometry(tc, 200, 0.05, 6, false),
        new THREE.MeshBasicMaterial({
          color: PAL[journeyDef.threadKey || 'violet2'],
          transparent: true,
          opacity: 0.16,
        })
      )
    );
    const cx = SP.reduce((s, p) => s + p.x, 0) / SP.length;
    const N = 1100,
      pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const r = 180 + Math.random() * 520,
        a = Math.random() * Math.PI * 2,
        b = Math.acos(2 * Math.random() - 1);
      pos[3 * i] = cx + r * Math.sin(b) * Math.cos(a);
      pos[3 * i + 1] = r * Math.cos(b) * 0.55;
      pos[3 * i + 2] = r * Math.sin(b) * Math.sin(a);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    world.add(
      new THREE.Points(
        sg,
        new THREE.PointsMaterial({
          color: PAL.star,
          size: 1.1,
          sizeAttenuation: false,
          transparent: true,
          opacity: PAL.starOpacity,
          fog: false,
        })
      )
    );
    curInst = journeyDef.build(C, PAL);
    stations = [];
    curInst.stations.forEach((b, i) => {
      const grp = new THREE.Group();
      grp.position.copy(SP[i]);
      const st = b(grp) || {};
      st.group = grp;
      world.add(grp);
      stations.push(st);
    });
  }
  buildScene();
  rethemeContent = () => {
    buildScene();
    renderCard(cur);
  };

  // a journey may ship its own per-language cards (self-contained prototypes do);
  // otherwise fall back to the shared content-pack cards.
  const CARDS =
    (journeyDef.cards && (journeyDef.cards[LANG] || journeyDef.cards.hu || journeyDef.cards.en)) ||
    C.cards;
  let cur = 0,
    travel = null;
  let yaw = 0,
    pitch = 0,
    zoomF = 1;
  let tuneRefresh = null; // set below when ?tune=1; renderCard() pokes it after every station change
  const hud = document.getElementById('hud'),
    eb = document.getElementById('eb'),
    ti = document.getElementById('ti'),
    bo = document.getElementById('bo'),
    dots = document.getElementById('dots'),
    dotctr = document.getElementById('dotctr');
  // real <button>s, matching the hub's strip: a <div> is not focusable, cannot be
  // activated from the keyboard, and announces nothing — yet these dots are the only
  // way to jump straight to a station.
  const dotLabel = i =>
    C.ui.stationWord + ' ' + (i + 1) + ' / ' + CARDS.length + ' — ' + CARDS[i].t;
  CARDS.forEach((_, i) => {
    const d = document.createElement('button');
    d.type = 'button';
    d.className = 'dot' + (i === 0 ? ' on' : '');
    d.title = CARDS[i].t;
    d.setAttribute('aria-label', dotLabel(i));
    d.onclick = () => go(i);
    dots.appendChild(d);
  });
  // Nav-only redraw: dots, the eyebrow/mobile counters, and prev/next disabled state.
  // Split out of renderCard so a mid-flight retarget (see go()) can move these onto the
  // new target the instant the button is pressed again, without waiting for arrival to
  // rebuild the card body — #dots and #dotctr aren't part of #hud.fade's opacity rule, so
  // they're the one piece of the HUD actually visible while the camera is still moving.
  function updateNav(i) {
    eb.textContent = C.ui.stationWord + ' ' + (i + 1) + ' / ' + CARDS.length;
    ti.textContent = CARDS[i].t; // moved out of renderCard: the sticky #hudhead is visible
    // the whole time the camera is flying, unlike #bo (which
    // stays hidden behind #hud.fade until arrival), so a
    // retarget should snap the title onto the new destination
    // immediately — same tempo as the dots below, not the
    // ~1900ms flight + 0.35s cross-fade the body still gets.
    dotctr.textContent = i + 1 + ' / ' + CARDS.length; // the dot row's mobile stand-in (style.css)
    [...dots.children].forEach((d, k) => {
      d.classList.toggle('on', k === i);
      // aria-current is what carries "you are here" to a screen reader; the .on class
      // is purely visual. Removed rather than set to "false" — false still announces.
      if (k === i) d.setAttribute('aria-current', 'true');
      else d.removeAttribute('aria-current');
    });
    document.getElementById('prev').disabled = i === 0;
    document.getElementById('next').disabled = i === CARDS.length - 1;
    // width belongs with the rest of the readout swap, so a retarget mid-flight resizes the
    // card at the same moment the title and dots move onto the new station
    applyCardWidth(i);
    resize();
    if (tuneRefresh) tuneRefresh();
  }
  function renderCard(i) {
    updateNav(i);
    bo.innerHTML = CARDS[i].b + (i === CARDS.length - 1 ? whatNext() : '');
    if (reader) reader.onCard(); // stop the previous station mid-sentence; auto-read this one
    hud.scrollTop = 0; // a long previous card may have left the box scrolled down
    syncHudScroll(); // the card's own length decides whether it scrolls — measure it now
    // rather than waiting on the ResizeObserver, whose delivery rides
    // the rendering steps and so lags (or stalls) exactly when a long
    // card most needs clamping. The observer stays as the backstop for
    // reflows this path cannot see (font swap, viewport-driven rewrap).
    curInst.bindCard(i);
    if (tuneRefresh) tuneRefresh();
  }
  function camPose(i) {
    const piv = pivot(i);
    const s = new THREE.Spherical().setFromVector3(OFF[i]);
    s.theta -= yaw;
    s.phi = clamp(s.phi - pitch, 0.15, Math.PI - 0.15);
    s.radius *= zoomF;
    return {pos: piv.clone().add(V3(0, 0, 0).setFromSpherical(s)), look: piv};
  }
  // While a flight is in progress, camPose(cur) is stale — cur only updates on arrival.
  // Re-deriving the in-flight camera pose (the same lerp the render loop applies) lets a
  // second arrow/dot press retarget from wherever the camera actually is right now,
  // instead of snapping back to the pose it left.
  function travelPose() {
    const u = clamp((performance.now() - travel.t0) / travel.dur, 0, 1),
      e = ease(u);
    return {
      pos: travel.from.pos.clone().lerp(travel.to.pos, e),
      look: travel.from.look.clone().lerp(travel.to.look, e),
    };
  }
  function go(i) {
    if (i < 0 || i >= CARDS.length) return;
    if (travel ? i === travel.target : i === cur) return;
    const from = travel ? travelPose() : camPose(cur);
    yaw = 0;
    pitch = 0;
    zoomF = 1;
    const to = camPose(i);
    hud.classList.add('fade');
    if (RM) {
      cur = i;
      travel = null;
      camera.position.copy(to.pos);
      camera.lookAt(to.look);
      renderCard(i);
      hud.classList.remove('fade');
      return;
    }
    travel = {t0: performance.now(), dur: 1900, from, to, target: i};
    updateNav(i); // move the dots/counters onto the new target now — see updateNav's note
  }
  document.getElementById('prev').onclick = () => go((travel ? travel.target : cur) - 1);
  document.getElementById('next').onclick = () => go((travel ? travel.target : cur) + 1);
  // One meaning per key across the whole site: up/Enter go deeper, down/Escape back out.
  // A journey has no deeper level, so up/Enter simply do nothing here — they are NOT
  // recycled as "back", which is what they used to mean and what made the direction you
  // press to leave depend on where you were standing.
  addEventListener('keydown', e => {
    const t = travel ? travel.target : cur;
    if (e.key === 'ArrowRight') go(t + 1);
    if (e.key === 'ArrowLeft') go(t - 1);
    if (e.key === 'ArrowDown') goHub();
  });

  /* close any open explanatory bubble (a "what is δ"-style popover) on outside-click;
     Escape closes it too, or — if none is open — backs out to the hub. Generic over any
     .bubble whose trigger carries aria-controls="<bubble id>", so journeys can add their
     own bubbles without touching the engine. Only one card (hence one bubble) is live. */
  const openBubble = () => document.querySelector('.bubble:not([hidden]), .pop:not([hidden])');
  const bubbleTrigger = bub =>
    bub ? document.querySelector('[aria-controls="' + bub.id + '"]') : null;
  document.addEventListener('click', e => {
    const bub = openBubble();
    if (!bub) return;
    const info = bubbleTrigger(bub);
    if (!bub.contains(e.target) && !(info && info.contains(e.target))) {
      bub.hidden = true;
      if (info) info.setAttribute('aria-expanded', 'false');
    }
  });
  /* In a scrolling card the panel is in the flow at the very bottom (see `.scrolls` in the
     CSS), so opening one from a term near the top would look like nothing happened. The
     journeys' own toggles stop propagation, so this listens in the capture phase — and
     reads the resulting state one frame later, once they have run. */
  document.addEventListener(
    'click',
    e => {
      if (!e.target.closest) return;
      const trig = e.target.closest('[aria-controls]');
      if (!trig) return;
      const bub = document.getElementById(trig.getAttribute('aria-controls'));
      if (!bub) return;
      requestAnimationFrame(() => {
        if (!bub.hidden && hud.classList.contains('scrolls'))
          bub.scrollIntoView({block: 'nearest', behavior: 'smooth'});
      });
    },
    true
  );
  addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const bub = openBubble();
    if (bub) {
      bub.hidden = true;
      const info = bubbleTrigger(bub);
      if (info) {
        info.setAttribute('aria-expanded', 'false');
        info.focus();
      }
      return;
    }
    goHub();
  });

  let dragging = false,
    lx = 0,
    ly = 0;
  // A second simultaneous pointer means a pinch, not a drag — tracked by id so either
  // finger can lift first without confusing which one is still down. `wheel` (below)
  // covers zoom for a mouse; touch has no wheel event, so this is the touch equivalent.
  const touches = new Map();
  let pinchD0 = null,
    zoom0 = null;
  function pinchDist() {
    const p = [...touches.values()];
    return Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
  }
  cv.addEventListener('pointerdown', e => {
    touches.set(e.pointerId, {x: e.clientX, y: e.clientY});
    cv.setPointerCapture(e.pointerId);
    if (touches.size === 2) {
      dragging = false;
      pinchD0 = pinchDist();
      zoom0 = zoomF;
      return;
    }
    if (touches.size > 2) return; // a stray third touch: ignore, keep the pinch running
    dragging = true;
    lx = e.clientX;
    ly = e.clientY;
    cv.classList.add('grabbing');
  });
  cv.addEventListener('pointermove', e => {
    if (!touches.has(e.pointerId)) return;
    touches.set(e.pointerId, {x: e.clientX, y: e.clientY});
    if (touches.size === 2) {
      if (!travel && pinchD0) zoomF = clamp(zoom0 * (pinchD0 / pinchDist()), 0.55, 2.1);
      return;
    }
    if (!dragging || travel) return;
    yaw += (e.clientX - lx) * 0.005;
    pitch += (e.clientY - ly) * 0.004;
    pitch = clamp(pitch, -1.1, 1.1);
    lx = e.clientX;
    ly = e.clientY;
  });
  function endTouch(e) {
    touches.delete(e.pointerId);
    if (touches.size < 2) pinchD0 = null;
    dragging = false;
    cv.classList.remove('grabbing');
  }
  cv.addEventListener('pointerup', endTouch);
  cv.addEventListener('pointercancel', endTouch);
  cv.addEventListener(
    'wheel',
    e => {
      if (travel) return;
      e.preventDefault();
      zoomF = clamp(zoomF * (1 + Math.sign(e.deltaY) * 0.08), 0.55, 2.1);
    },
    {passive: false}
  );

  /* Dev-only station/camera tuning overlay, gated on the menu's "Station tuning" switch
     (or ?tune=1, kept as a quick manual override) — nothing a reader can stumble into.
     Four independent knobs, matching the four things that actually vary between a good
     and a bad station framing:
       - SP[i]      — the built geometry's position (moves the station's whole content
                       group; see buildScene()'s `grp.position.copy(SP[i])`).
       - Orientation — OFF[i]'s direction as (θ azimuth, φ polar), the angle the camera
                       views the pivot from.
       - Zoom        — OFF[i]'s magnitude, i.e. the orbit radius (distance from pivot).
       - Pan (x/y/z) — PAN[i], a straight local-axis translation of the pivot itself (see
                       pivot()/camPose() above), independent of SP: it slides the camera
                       and its look-at target together without changing the angle or the
                       distance, and without moving the geometry SP anchors. This is what
                       WASD+QE drives (A/D on x, W/S on z, Q/E on y) — deliberately a translation in the
                       station's own axes rather than the camera's facing, since a camera-
                       relative "forward" would fight the Orientation control above the
                       moment you rotate away from the default angle.
     Orientation and Zoom write back into OFF[i] as a single Cartesian vector (still the
     exact shape every journey's `layout.OFF` already uses — Spherical.setFromVector3 is
     how camPose() has always read it), so no journey file's data format has to change to
     pick up this panel; only Pan is new state (`layout.PAN`, optional, default zero — see
     its declaration above), and only a journey that intentionally saves a nonzero Pan use
     it going forward.

     "Capture current camera" folds whatever the built-in drag/zoom controls (the ones
     every visitor has) are currently showing back into Orientation+Zoom: newOFF =
     camera.position − pivot(i), then yaw/pitch/zoomF reset to 0/0/1 so OFF alone
     reproduces the pose next time. It does not touch Pan — eyeball the angle with a drag,
     capture it, then fine-tune Pan/SP with the fields or WASD.

     "Save JSON" downloads this journey's whole layout as `layouts/<id>.json` — the file to
     drop into the repo, replacing the one already there. There is no accumulate-then-batch
     step any more: one file per journey *is* the storage, so walking the moons means one
     download each, and the dev switch persisting across the full page reload a hub<->journey
     nav is what makes that walk uninterrupted.

     A horizontal bar along the top of the free 3D column, not a floating box: the fields
     are the thing being read while the scene moves under them, and stacking ten of them in
     a right-hand column put the ones you use most (pan, zoom) furthest from the view.
     `positionBar()` pins its left edge to the card's right edge, so it never covers the
     text card — including when CARD itself is what is being dragged. Inline-styled rather
     than routed through style.css: scaffolding for editing a journey, not chrome a reader
     ever sees. */
  const devMode =
    (() => {
      try {
        return localStorage.getItem('lie-dev') === '1';
      } catch (e) {
        return false;
      }
    })() || /[?&]tune=1(&|$)/.test(location.search);
  const panKeys = {w: false, a: false, s: false, d: false, q: false, e: false};
  if (devMode) {
    const panel = document.createElement('div');
    panel.style.cssText =
      'position:fixed;top:12px;right:12px;z-index:9;' +
      'display:flex;flex-wrap:wrap;align-items:center;gap:4px 12px;' +
      'background:rgba(10,14,24,.92);border:1px solid #445566;border-radius:10px;' +
      'padding:7px 10px;font:12px ui-monospace,Menlo,monospace;color:#dde;' +
      'backdrop-filter:blur(6px)';
    document.body.appendChild(panel);
    const title = document.createElement('div');
    title.style.cssText = 'font-weight:600;color:#ffcc55;white-space:nowrap';
    panel.appendChild(title);
    // one labelled cluster of inputs, e.g.  SP [x][y][z]
    const group = (name, specs) => {
      const g = document.createElement('div');
      g.style.cssText = 'display:flex;align-items:center;gap:4px';
      const l = document.createElement('span');
      l.textContent = name;
      l.style.cssText =
        'color:#7799bb;text-transform:uppercase;font-size:10px;' +
        'letter-spacing:.05em;white-space:nowrap';
      g.appendChild(l);
      const inputs = specs.map(([ph, step, w]) => {
        const inp = document.createElement('input');
        inp.type = 'number';
        inp.step = step;
        inp.title = ph;
        inp.placeholder = ph;
        inp.style.cssText =
          'width:' +
          (w || 52) +
          'px;background:#131a29;border:1px solid #334455;' +
          'border-radius:5px;color:#eeeeff;padding:2px 4px;font:inherit';
        g.appendChild(inp);
        return inp;
      });
      panel.appendChild(g);
      return inputs;
    };
    const btn = (label, bg) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.style.cssText =
        'padding:4px 10px;background:' +
        bg +
        ';white-space:nowrap;' +
        'border:1px solid #445566;border-radius:6px;color:#ddeeff;cursor:pointer;font:inherit';
      panel.appendChild(b);
      return b;
    };
    const [spX, spY, spZ] = group('sp', [
      ['x', '0.1'],
      ['y', '0.1'],
      ['z', '0.1'],
    ]);
    const [thI, phI] = group('θ φ', [
      ['θ', '1', 46],
      ['φ', '1', 46],
    ]);
    const [zmI] = group('zoom', [['r', '0.1']]);
    const [pnX, pnY, pnZ] = group('pan', [
      ['x', '0.1'],
      ['y', '0.1'],
      ['z', '0.1'],
    ]);
    const [cwI] = group('card', [['px', '10', 56]]);
    const captureBtn = btn('Capture', '#223344');
    const saveBtn = btn('Save JSON', '#223a2a');
    const out = document.createElement('div');
    out.style.cssText = 'color:#88bb88;font-size:10px;white-space:nowrap';
    out.textContent = 'WASD/QE pan · drag edge = card';
    panel.appendChild(out);
    /* Pin the bar to the free column right of the text card, so it can never sit on top of
       the card it is also able to resize. Re-run on every station change and window resize
       because both can move that edge. */
    function positionBar() {
      panel.style.left = Math.round(hudEl.getBoundingClientRect().right + 14) + 'px';
    }
    addEventListener('resize', positionBar);

    const curIdx = () => (travel ? travel.target : cur);
    const R2D = THREE.MathUtils.radToDeg,
      D2R = THREE.MathUtils.degToRad;
    function refresh() {
      const i = curIdx();
      title.textContent = 'Station ' + (i + 1) + ' / ' + SP.length;
      spX.value = SP[i].x;
      spY.value = SP[i].y;
      spZ.value = SP[i].z;
      const s = new THREE.Spherical().setFromVector3(OFF[i]);
      thI.value = Math.round(R2D(s.theta));
      phI.value = Math.round(R2D(s.phi));
      zmI.value = Math.round(s.radius * 100) / 100;
      pnX.value = PAN[i].x;
      pnY.value = PAN[i].y;
      pnZ.value = PAN[i].z;
      cwI.value = Math.round(CARD ? CARD[i] : hudEl.getBoundingClientRect().width);
      positionBar();
    }
    /* A journey with no authored CARD gets one seeded from whatever the card is currently
       showing (the CSS clamp's result), so the first drag or keystroke starts from what is
       on screen rather than snapping to some default. Every station is seeded to that same
       width, which is also what makes the scalar form the natural output. */
    function ensureCard() {
      if (!CARD) {
        const w = Math.round(hudEl.getBoundingClientRect().width);
        CARD = SP.map(() => w);
      }
      return CARD;
    }
    function applyCard() {
      ensureCard()[curIdx()] = clampCardW(+cwI.value || HUD_MIN_W);
      applyCardWidth(curIdx());
      resize();
      positionBar();
    }
    // dragging the card's right edge is the natural gesture for this, so let it author too
    onCardDrag = w => {
      ensureCard()[curIdx()] = Math.round(w);
      cwI.value = Math.round(w);
      positionBar();
    };
    function applySP() {
      const i = curIdx();
      SP[i].set(+spX.value || 0, +spY.value || 0, +spZ.value || 0);
      stations[i].group.position.copy(SP[i]);
      LOOK[i].copy(SP[i]).add(V3(0, 0.55, 0));
    }
    function applyOrientOrZoom() {
      const i = curIdx();
      const s = new THREE.Spherical(+zmI.value || 0.01, D2R(+phI.value || 0), D2R(+thI.value || 0));
      OFF[i].setFromSpherical(s);
    }
    function applyPan() {
      PAN[curIdx()].set(+pnX.value || 0, +pnY.value || 0, +pnZ.value || 0);
    }
    [spX, spY, spZ].forEach(inp => inp.addEventListener('input', applySP));
    [thI, phI, zmI].forEach(inp => inp.addEventListener('input', applyOrientOrZoom));
    [pnX, pnY, pnZ].forEach(inp => inp.addEventListener('input', applyPan));
    cwI.addEventListener('input', applyCard);

    captureBtn.onclick = () => {
      const i = curIdx();
      OFF[i].copy(camera.position).sub(pivot(i));
      yaw = 0;
      pitch = 0;
      zoomF = 1;
      refresh();
      out.textContent = 'Captured station ' + (i + 1) + "'s camera into orientation+zoom.";
    };

    const round = n => Math.round(n * 100) / 100;
    const panUsed = () => PAN.some(v => v.x || v.y || v.z);
    const download = (filename, text, mime) => {
      const url = URL.createObjectURL(new Blob([text], {type: mime || 'text/plain'}));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    };
    /* Hand-rolled rather than JSON.stringify(…, null, 2): the pretty-printer breaks every
       [x,y,z] across three lines, which turns a ten-station journey into 90 lines of single
       numbers and makes a diff between two tunings unreadable. One station per line is the
       whole point. Output is still ordinary JSON — the exact shape engine.js reads back and
       check.html validates. CARD is written as one number when every station agrees, which
       is both the common case and much easier to hand-edit afterwards. */
    const journeyJSON = d => {
      const val = k =>
        k === 'CARD'
          ? d.CARD.every(w => w === d.CARD[0])
            ? String(d.CARD[0])
            : '[' + d.CARD.join(', ') + ']'
          : '[\n    ' +
            d[k].map(p => '[' + p[0] + ', ' + p[1] + ', ' + p[2] + ']').join(',\n    ') +
            '\n  ]';
      const keys = ['SP', 'OFF'].concat(d.PAN ? ['PAN'] : []).concat(d.CARD ? ['CARD'] : []);
      return '{\n' + keys.map(k => '  "' + k + '": ' + val(k)).join(',\n') + '\n}\n';
    };
    const entryFor = () => {
      const trip = v => [round(v.x), round(v.y), round(v.z)];
      const e = {SP: SP.map(trip), OFF: OFF.map(trip)};
      if (panUsed()) e.PAN = PAN.map(trip);
      if (CARD) e.CARD = CARD.map(w => Math.round(w));
      return e;
    };

    saveBtn.onclick = () => {
      const text = journeyJSON(entryFor());
      console.log('[layouts/' + journeyId + '.json]\n' + text);
      download(journeyId + '.json', text, 'application/json');
      (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(
        () => {},
        () => {}
      );
      out.textContent = 'Saved ' + journeyId + '.json — replace layouts/' + journeyId + '.json';
    };

    tuneRefresh = refresh;
    refresh();

    // Pan via WASD+QE: a straight translation in the station's own local axes (A/D on x,
    // W/S on z, Q/E on y — see the block comment above for why this is Pan, not a camera-
    // facing fly). Continuous while held, driven from loop() below so it shares one delta clock
    // with everything else per-frame; the panel's Pan fields are kept live so the numbers
    // you'd export always match what's on screen.
    addEventListener('keydown', e => {
      const tag = (document.activeElement && document.activeElement.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const k = e.key.toLowerCase();
      if (k in panKeys) {
        panKeys[k] = true;
        e.preventDefault();
      }
    });
    addEventListener('keyup', e => {
      const k = e.key.toLowerCase();
      if (k in panKeys) panKeys[k] = false;
    });
  }

  renderCard(0);
  {
    const p = camPose(0);
    camera.position.copy(p.pos);
    camera.lookAt(p.look);
  }
  requestAnimationFrame(() => forceRepaint(hudEl)); // see forceRepaint's comment above

  const clock = new THREE.Clock();
  let panLastT = performance.now(); // devMode Pan-via-WASD's own delta clock — kept
  // separate from THREE.Clock so it never perturbs
  // stations' tick(t)
  const PAN_SPEED = 10; // local units/sec
  function loop() {
    requestAnimationFrame(loop);
    const t = clock.getElapsedTime();
    if (devMode) {
      const now = performance.now(),
        dt = Math.min((now - panLastT) / 1000, 0.1);
      panLastT = now;
      if (panKeys.w || panKeys.a || panKeys.s || panKeys.d || panKeys.q || panKeys.e) {
        const d = PAN_SPEED * dt,
          p = PAN[cur];
        if (panKeys.s) p.z += d;
        if (panKeys.w) p.z -= d;
        if (panKeys.d) p.x += d;
        if (panKeys.a) p.x -= d;
        if (panKeys.e) p.y += d; // rise
        if (panKeys.q) p.y -= d; // fall
        if (tuneRefresh) tuneRefresh(); // keep the panel's Pan fields live while flying
      }
    }
    // Pan[cur] feeds camPose() through pivot() (see its declaration above), so the WASD
    // edit above needs no special-case here — the easing below just chases the new pivot
    // like any other camPose() change (an SP/OFF field edit, a mouse drag, a nav press).
    if (travel) {
      const u = clamp((performance.now() - travel.t0) / travel.dur, 0, 1),
        e = ease(u);
      camera.position.lerpVectors(travel.from.pos, travel.to.pos, e);
      const lk = travel.from.look.clone().lerp(travel.to.look, e);
      camera.lookAt(lk);
      if (u >= 1) {
        cur = travel.target;
        travel = null;
        renderCard(cur);
        hud.classList.remove('fade');
      }
    } else {
      const p = camPose(cur);
      camera.position.lerp(p.pos, 0.14);
      camera.lookAt(p.look);
    }
    stations.forEach((s, i) => {
      if (Math.abs(i - cur) <= 1 && s.tick) s.tick(t);
    });
    renderer.render(scene, camera);
  }
  loop();
}
