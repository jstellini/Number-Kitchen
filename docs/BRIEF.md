# Number Kitchen — Game Brief

2026-09-19 · Josh

A cooking-themed numeracy game for iPad, built as a follow-up to [ABC Town](https://github.com/jstellini/abc-town).
Structured as a recipe book: the player works through recipes (pizza, cupcakes, sandwich,
smoothie, pancakes), each a short sequence of cooking stages. Counting and numeral-recognition
tasks are embedded *in* the cooking steps rather than bolted on beside them.

The core sequence is borrowed from a reference app (*Kids Games for Toddlers 2-5*) whose
pizza-building flow — mix, roll, bake, paint sauce, cut, serve — the target player responded
to strongly. That sequence is treated as proven and kept.

---

## Learning objectives

Numbers **1-20**. Assessment going in:

- Counting fluency (saying numbers in order, 1-to-1 counting) is **already strong**
- **Numeral recognition is the gap** — she counts well but doesn't reliably read written numerals on sight
- **11-20 is not solid** — needs a visual grouping device, not abstract counting
- Addition/subtraction within 20 is a future objective, **not in v1** (see Scope)

Three consequences shape the whole design:

1. Separate *"can she count it"* from *"can she read the numeral."* The second is the target.
2. The teen range needs a **ten-frame**, so its structure is visible rather than abstract.
3. Don't introduce arithmetic while recognition is still forming — it competes for attention.

## Player context

- Single player, age 3-4. iPad only.
- Prior app: ABC Town — well received. Its tone, pacing and interaction style are the reference.
- Its *theme* is not reused, but a large amount of its *machinery* is (see Reuse).

---

## Architecture: primitives, not bespoke mini-games

The obvious way to build this is the expensive way. Six recipes × 4-6 stages, each stage with a
mechanic chosen to fit its dish, is ~30 bespoke mini-games — a studio year, and a project that
never ships.

Instead: a small library of **interaction primitives**. A recipe is **data**, not code — an
ordered list of stages, each naming a primitive plus its art set and number range.

**Cooking primitives** (new):

| Primitive | Interaction | Stage it serves |
| --- | --- | --- |
| `count-place` | Read a numeral, drag that many items into a zone | Prep, Decorate |
| `count-gesture` | Repeat a gesture N times (roll, stir, whisk, flip) | Assemble |
| `set-dial` | Read a numeral, turn a control until it matches | Cook/Finish |
| `cut-into` | Divide along guides into N pieces | Portion |
| `match-1to1` | Hand out portions until every customer has one | Serve |

**Recognition interstitials** (ported from ABC Town, already written and tuned):

| Primitive | Ported from |
| --- | --- |
| `build-numeral` | Build-a-Letter — drag chunky strokes onto a ghost glyph |
| `paint-numeral` | Paint-the-Letter — fill an outlined glyph with patterns |
| `find-numeral` | Find-the-Letter / Pop-the-Bubbles — tap the called-out numeral |

Eight primitives cover every mechanic in the game. **Recipe #7 then costs art, not engineering** —
which matters, because the real long-run value is being able to add a dish in an evening when
she gets bored of the current ones.

Contract mirrors ABC Town's `Games.play(type, ch, onDone)` → `Stage.play(primitive, spec, onDone)`,
returning `{ stop() }`. The hub-registry pattern from `js/words.js` (`GAMES` = `{id, title, icon, make}`)
is the model for the primitive registry.

One flow difference from ABC Town worth designing around: ABC Town picks a target then plays
minigames from a **rotation**. Number Kitchen runs a **sequential pipeline** within one recipe.
The recipe drives, not a rotation counter.

### Stage taxonomy

A design aid for composing recipes — *not* a schema. In the data model a recipe is just an
ordered list of primitive instances.

```mermaid
flowchart LR
    A[Prep] --> B[Assemble]
    B --> C[Cook/Finish]
    C --> D[Decorate]
    D --> E[Portion]
    E --> F[Serve]
```

Not every recipe needs every stage — a sandwich skips Cook, a smoothie skips Decorate — but
aim for 4-6 so the sequence still feels structured.

---

## Difficulty is decoupled from content

The tempting model — Tier 1 recipes carry 1-10, Tier 2 recipes carry 11-20 — fails in a specific,
predictable way: **she will love pizza, play it forty times, and never meet a teen number**,
because the teens live in content she hasn't unlocked. "Comfortable" is also undefined, and a
3-4 year old's skill isn't monotonic — solid on 12 and blank on 15 on the same day.

So the two axes are separated:

- **Recipe unlocks** are the *novelty reward*. Sequential, generous, always forward.
- **Number range** is a *per-stage parameter*, driven by a per-numeral mastery model.

Any recipe can run at any range. She can make pizza forever and still meet 14.

**Mastery model** (deliberately simple): for each numeral 1-20 store `{ seen, firstTryCorrect, lastSeen }`.
A *live set* starts around 1-5 and widens as numerals hit a mastery threshold; shaky numerals are
re-served preferentially. The grown-ups panel gets an override to pin a range for a session, for
when you want to drill one thing deliberately.

**The teen range needs no separate content.** A cupcake tray with **10 cups is a literal
ten-frame** — fill the tray, start a second one for the remainder, and 13 reads as *one full tray
plus 3*. Any counting primitive switches the ten-frame display on when the target exceeds 10.
This is why Tier 2 doesn't need its own recipes: the decoupling pays for itself immediately.

---

## No failure model

The single most consequential decision for how this feels. For a 3-4 year old: **no fail state,
no error sound, ever.**

- The target numeral stays on screen permanently — she can always re-read it
- Any placed item can be dragged back off
- Placing a 4th item against a target of 3 is *allowed*; the counter simply reads `4` against `3`
- The stage advances on match, with the count spoken aloud as **celebration, not verdict**
- Never block, never buzz, never restart

ABC Town's softer equivalents (wrong magnets wobble and slide back; after two misses the right
one glows) are the right register and should carry over.

---

## v1 recipes

Five recipes. Every one runs at whatever range the mastery model calls for.

| Recipe | Stages | Notes |
| --- | --- | --- |
| **Pizza** | Prep · Assemble · Cook · Decorate · Portion · Serve | The proven sequence. Build this first. |
| **Cupcakes** | Prep · Assemble · Cook · Decorate · Serve | **Ten-frame anchor** — the 10-cup tray. |
| **Sandwich** | Prep · Assemble · Decorate · Portion · Serve | No-cook, proves stages are genuinely optional. |
| **Smoothie** | Prep · Cook/Finish · Portion · Serve | Blender dial; pour into N cups. |
| **Pancakes** | Prep · Assemble · Cook · Decorate · Serve | Stack of N reads well at high counts. |

### One mechanic changed from the original brief

The brief had Cook/Finish as a **5-to-0 countdown timer**. Dropped, for three reasons: it's
*passive* (she watches numbers change rather than acting), counting backward is a genuinely
separate and harder skill, and timers put time pressure on a 3-4 year old.

Replaced with `set-dial`: the recipe card shows `8`, she turns the oven dial until it reads `8`.
Active numeral recognition, in the stage that was contributing least.

### The Serve stage deserves more weight than the brief gives it

1-to-1 correspondence with a genuine reason to care — everyone needs a slice — is exactly what
good early numeracy looks like. It's the strongest mechanic in the design and shouldn't be the
throwaway last step.

---

## Reward: a café that grows

ABC Town's real hook wasn't progression, it was **the town** — a persistent world that accumulates,
that she can revisit and poke at, where unlocked characters wander and react. It's ~1100 lines of
`town.js`, which tells you where the value was judged to be.

"Unlock the next recipe" is progression with nowhere to *visit*. So v1 gets a **minimal café**:
a single screen where cooked dishes appear on a counter, with a handful of tappable reactions.
Cheap to build, delivers the "my world grows" payoff, and grows toward the full town treatment
later. It's also the natural future home for arithmetic — *three customers, two cupcakes each*.

**Cast:** a new kitchen cast, generated in ABC Town's style using the shared-kit approach from
`tools/build_characters.py` (one shared face/limb kit, bespoke bodies).

---

## Technical approach

Same stack as ABC Town, for the same reasons: vanilla ES6, no build step, no npm, no bundler —
plain `<script>` tags and IIFE modules. Inline SVG and CSS for all art. Progress in localStorage.

**Target device: 2017 iPad (A9, 2 GB, 2048×1536).** Confirmed unchanged from ABC Town. ES6 and
pointer events are both fine on it.

### What we lift from abc-town

| Source | Use | Effort |
| --- | --- | --- |
| `js/audio.js` (`Sfx`) | Fully procedural Web Audio — zero sound files. `tone()`/`noise()` already cover sizzle, chop, pour, blender, oven-ding | Copy + new recipes |
| `js/fx.js` | Sparkle / confetti particles | Verbatim |
| `tools/generate_voice.py` | Swap the line builder for numbers and recipes | ~1 hour |
| `LETTER_STROKES` in `js/data.js` | → `DIGIT_STROKES`, same 100×100 box and metrics discipline. 10 glyphs vs 52 | Small |
| Build-a-Letter, Paint-the-Letter | → `build-numeral`, `paint-numeral` | **Near-free** |
| `tools/build_characters.py` | Shared-kit SVG generator → kitchen cast, ingredients, dishes | Adapt |
| `js/case.js` | Same shape for a `Range` module (which numerals are live) | Adapt |
| `js/words.js` `GAMES` registry | Model for the primitive registry | Adapt |
| `index.html` head | Viewport, `apple-mobile-web-app-*`, double-tap-zoom guard | Verbatim |
| `build.sh` + `netlify.toml` | Netlify PR deploy previews — test a branch on the iPad before merging | Verbatim |

Paint-the-Letter in particular measures glyph *ink* via canvas `measureText` rather than
`getBBox()` (which returns the font's layout box, leaving lowercase at half size). That's a
subtle bug someone already paid for — port it, don't rewrite it.

### Voice-over

Full narration, and it costs almost nothing: ABC Town's 623 clips are **not recordings** but
`edge-tts` neural TTS (`en-GB-SoniaNeural`), generated by `tools/generate_voice.py`, which parses
lines out of `js/data.js`, writes the mp3s and regenerates `js/voice-manifest.js`. `--missing`
generates only new clips, and browser TTS is the fallback for anything absent.

Numbers are the easiest content a TTS pipeline will ever get. Estimate 150-250 clips
(numerals 1-20, count-alongs, stage prompts, recipe names, celebrations) against ABC Town's 623.

### Performance rules

ABC Town's README has a hard-won *"Keeping it quick on an old iPad"* section. **It moves into
`CLAUDE.md` on day one** so every future session inherits it:

- **Never animate an element that also has a `filter`** — the GPU re-blurs it every frame. Put the
  filter on an inner element and the animation on a wrapper.
- **Hidden screens keep animating.** `visibility: hidden` does not stop CSS animations; anything
  always-on needs adding to the `animation-play-state: paused` list.
- **Park heavy scenes.** ABC Town ships `#town-view` with `display: none` until entered, or ~40
  infinite animations run from page load on every screen. The café needs the same treatment.
- **Navigation listens on `pointerdown`, not `click`** — on iOS a click lands well after touchend.
- **Read before you write in a frame loop** — a `getBoundingClientRect()` after a style write
  forces synchronous layout of the whole scene.
- Bake shadows into the SVG rather than using CSS shadows on moving elements.
- Health check: `document.getAnimations().filter(a => a.playState === 'running').length` should be
  a handful per screen, not a hundred.

**One new risk ABC Town never hit: item count.** Its busiest screen is ~6 balloons. "Count to 17"
means 17 simultaneous draggables at 2048×1536. Mitigations: ten-frame slots constrain layout so
one container moves instead of 17 elements; no per-item CSS shadow; stage items in from a tray
rather than spawning all at once.

### Instrumentation

One player, one device — so log every interaction locally: which numerals she hesitates on,
time-to-first-touch, error counts per numeral. Small amount of code, and it does double duty:
it feeds the mastery model, and it answers *"is it 14, or all teens?"* For a project whose whole
premise is targeting a measured gap, not measuring would be a miss. Surfaced in the grown-ups
panel, exportable as JSON.

### Save durability

Plain `localStorage` gets evicted by Safari under storage pressure — for a child's unlock progress
that's a genuine heartbreak risk. Mitigations: add-to-home-screen PWA install (ABC Town's README
already instructs this, and it's needed for fullscreen and audio unlock anyway), plus a quiet
export/import button in the grown-ups panel.

---

## Scope

### In v1

- 5 recipes, 4-6 stages each, composed from 8 primitives
- Numbers 1-20, with the ten-frame engaged above 10
- Per-numeral mastery model driving range; grown-ups override
- Recognition interstitials between cooking stages
- Sequential recipe unlocks
- Minimal café: dishes accumulate on a counter, a few tappable reactions
- New kitchen cast, generated in ABC Town's style
- Full TTS narration
- Local instrumentation + export/import

### Deferred

- **Addition and subtraction.** Cut from v1 deliberately. The brief's own diagnosis is that
  numeral recognition is the gap and arithmetic isn't introduced yet — building a third content
  set for a skill she may not be ready for, designed without having watched her play, is the
  wrong bet. Ship 1-10 and 11-20 done well; the two-groups-merge visual is a `count-place` variant,
  so the substrate is free when it's wanted. The café gives it a home.
- **Numeral memory match.** Weakest ROI of the four recognition mechanics — it trains pairing, not
  numeral→quantity. The other three cover the ground.
- Full town-scale café simulation.
- Native Swift port.

### Honest note on the interstitials

The brief claims the recognition mechanics are "embedded rather than separate." Three of the four
aren't — build, paint and find all use a different verb from cooking. They're an **interstitial
layer**, which is fine and worth having, but worth naming accurately. Only `count-place` trains
*see numeral → know quantity* directly inside the cooking flow, which is why it's the spine that
runs through every recipe.

---

## Open items

- Netlify site needs creating and linking to this repo for PR deploy previews (mirrors abc-town's setup)
- Recipe order for the unlock ladder
- Whether the kitchen cast gets ABC Town-style personality reactions in the café, or stays simpler in v1
