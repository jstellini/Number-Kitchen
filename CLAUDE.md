# Number Kitchen — working notes

A cooking-themed numeracy game for one player, age 3-4, on an iPad.
Read `docs/BRIEF.md` for the design rationale before changing how the game plays.

## Stack

Vanilla ES6. **No build step, no npm, no bundler, no framework.** Plain `<script>` tags in
`index.html` and IIFE modules (`const Foo = (() => { ... })()`). This is deliberate — it keeps
the project editable from anywhere and the iPad never has to run a toolchain.

Art is inline SVG and CSS. There are no image files and no sound files: effects are synthesised
with Web Audio, voice lines are pre-generated mp3s.

## Target device

**A 2017 iPad — A9, 2 GB RAM, 2048×1536.** Every performance rule below exists because of it.
These were learned the hard way on [ABC Town](https://github.com/jstellini/abc-town); they are
not speculative.

- **Never animate an element that also has a `filter`.** `drop-shadow` on a moving element makes
  the GPU re-blur it every frame. Put the filter on an inner element and the animation on a
  wrapper.
- **Hidden screens keep animating.** `.screen` hides with `visibility: hidden`, which does *not*
  stop CSS animations. Anything always-on needs adding to the `animation-play-state: paused`
  list under `.screen.active`. List elements individually — a blanket `:not(.active) *` is
  slower to match than the animations it saves.
- **Park heavy scenes.** A screen with many infinite animations ships with `display: none` and is
  unparked on entry, or its animations run from page load on every other screen too.
- **Navigation listens on `pointerdown`, not `click`.** On iOS a click lands well after touchend,
  and the double-tap-zoom guard in `index.html` swallows the synthetic click of a quick second
  tap. Use `tap()` in `js/app.js`.
- **Read before you write in a frame loop.** Take every `getBoundingClientRect()` up front; a read
  after a style write forces a synchronous layout of the whole scene.
- **Bake shadows into the SVG** rather than putting CSS shadows on anything that moves.
- **Animate only `transform` and `opacity`.** Never `top`/`left`/`width`/`height`, and never SVG
  geometry attributes.

**The count-specific risk:** "count to 17" means up to 20 simultaneous draggable items, far more
than ABC Town ever had on screen. Keep items in ten-frame slots so one container transform moves
them, give them no individual shadows, and stage them in rather than spawning all at once.

Health check: `document.getAnimations().filter(a => a.playState === 'running').length` should be
a handful per screen, not a hundred.

## Design rules that are not negotiable

These come from the brief and exist for the player, not for tidiness.

- **No fail state. No error sound. Ever.** Placing too many items is allowed; the counter just
  reads high against the target. Items can always be removed. A stage completes on a match and
  the count is spoken as celebration, never as a verdict. Wrong things wobble; they never buzz.
- **The target numeral stays on screen** for the whole stage, so she can always re-read it.
- **Never show the target as a count of empty slots.** Ten-frames are fixed at 10 capacity and
  fill as she places, so she still has to read the numeral. A second frame slides in only once
  the first is full — that is what makes 13 read as "a full tray and 3 more".
- **Difficulty is decoupled from content.** Number range comes from `js/range.js` at runtime, never
  from the recipe data. Any recipe can run at any range.
- **No time pressure.** No countdown timers, no stage that can be failed by being slow.

## Layout

```
index.html            screens + iOS boilerplate (viewport, double-tap-zoom guard)
css/style.css         all styling and animations
js/data.js            digit strokes, ingredient SVG, recipe definitions
js/audio.js           Web Audio sound effects + voice playback (clips, TTS fallback)
js/voice-manifest.js  key → mp3 lookup (auto-generated, do not hand-edit)
js/fx.js              sparkle / confetti particles
js/range.js           per-numeral mastery model — decides which number a stage asks for
js/stages.js          the interaction primitives
js/app.js             screen flow, progress, recipe runner, grown-ups panel
tools/generate_voice.py  regenerates assets/voice/ + js/voice-manifest.js
```

## Adding things

**A recipe** — one entry in `RECIPES` in `js/data.js`: an ordered list of stages, each naming a
primitive plus its art. No new code if it composes existing primitives. Then
`python tools/generate_voice.py --missing` for its spoken lines.

**A primitive** — one function in `js/stages.js` returning `{ stop() }`, plus an entry in the
`PRIMITIVES` registry at the top. It receives `(spec, onDone)` where `spec.n` is the target
number the range model chose.

**Voice** — every spoken line is a pre-generated mp3 (Microsoft Edge neural TTS,
`en-GB-SoniaNeural`) looked up by key in `js/voice-manifest.js`. Browser TTS is the fallback when
a clip is missing, so the game is always playable before clips exist. Regenerate with
`python tools/generate_voice.py --missing`.

## Testing

There is no test suite; this is a game for one child. Verify by playing it. `serve.ps1` runs a
local server on the PC, and Netlify publishes a preview for every pull request so a branch can be
tried on the actual iPad before merging — which is the only test that counts.
