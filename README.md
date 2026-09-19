# Number Kitchen

A numbers game for 3–4 year olds. Work through a recipe book — pizza, cupcakes, sandwich,
smoothie, pancakes — where every cooking step is a counting or numeral-reading task. Finished
dishes go on the café counter.

A follow-up to [ABC Town](https://github.com/jstellini/abc-town), built the same way and reusing
a lot of its machinery. The design rationale is in [`docs/BRIEF.md`](docs/BRIEF.md); the working
rules are in [`CLAUDE.md`](CLAUDE.md).

## Running it

**On this PC** – double-click `serve.ps1` (or right-click → *Run with PowerShell*) and open
<http://localhost:8000/>.

**On the iPad** (same Wi-Fi):

1. Run `serve.ps1` once **as Administrator**. It prints an address like `http://192.168.1.23:8000/`.
   Allow it through Windows Firewall if asked.
2. Open that address in Safari on the iPad.
3. Tap Share → **Add to Home Screen**. Launching from the icon runs it full-screen, keeps the
   saved progress safer, and makes the audio unlock stick.

Hold the iPad sideways.

## How it plays

- **Recipe book** – five recipes, unlocking in order. Tapping a locked one says what to cook first.
- **A recipe** – four to seven stages in sequence. Each shows a numeral and asks for that many of
  something. The numeral stays on screen the whole time and can be tapped to hear it again.
  - **Count and place** – put that many scoops, eggs, pepperoni or cherries in. Each one flies
    from where her finger was and squashes as it lands, and the bowl takes the knock. Two scoops
    fill the bowl as two big scoops; twenty arrive small and packed.
  - **Count the action** – roll, stir, whisk, spread or flip that many times. The rolling pin
    travels across the dough and the dough spreads under it; the spoon goes right round the bowl.
  - **Set the dial** – turn the oven or blender up until it reads the number shown. The appliance
    answers: the oven brightens as she turns it, then lights up and steams; the blender churns.
  - **Cut** – swipe until there are that many pieces. It counts *pieces*, not cuts, and the pieces
    genuinely come apart rather than a line being drawn over the top.
  - **Serve** – give one to each of the townsfolk, which is one-to-one correspondence with a
    reason to care. The line-up is shuffled each time and nobody turns up twice.
- **Ten-frames** – a tally of two fixed frames of ten sits beside the numeral. Items fill the first
  frame, and the second only appears once the first is full, so 13 reads as *a full tray and 3 more*.
  The frames are always ten slots, never the target, so the frame can't hand over the answer.
- **Served** – the dish is finished, the next recipe opens.
- **The café** – everything she has cooked sits on the counter, with the townsfolk waiting
  alongside it. One more of them turns up for each recipe she has learned. Tap anyone to hear
  who they are.

**Nothing can be got wrong.** Too many is allowed — the tally just reads high against the target —
and anything placed can be taken back off. There is no buzzer, no fail state and no timer.

## Numbers

Difficulty is not a property of a recipe. Recipes unlock for novelty; the number each stage asks
for comes from `js/range.js`, which keeps a per-numeral record and widens the range as she reads
numbers correctly first time. So a favourite recipe played forty times still introduces new
numbers, and a number she is shaky on comes back round sooner.

Hold the ⚙️ button for a second for the grown-ups panel: how she's going number by number, a
manual range override (Auto / 1–5 / 1–10 / 1–20), unlock everything, save progress to a file,
restore it, or reset.

## Working on it

Netlify builds from `main` on every push and posts a deploy preview on every pull request, so a
branch can be tried on the actual iPad before merging.

- **From anywhere** – start a Claude Code cloud session on the repo, describe the change, then
  merge the pull request.
- **On this PC** – `git pull` first, edit, then commit and push.

## Tuning

- **Recipes** – `RECIPES` in `js/data.js`. A recipe is an ordered list of stages, each naming a
  primitive plus its art. Composing existing primitives needs no new code. New spoken lines then
  need `python tools/generate_voice.py --missing`.
- **Primitives** – `js/stages.js`. Adding one is a function returning `{ stop() }` plus an entry in
  `PRIMITIVES`. `LIMITS` in the same file caps what each can sensibly ask for — cutting a sandwich
  into one piece isn't a cut, and nobody wants to hand out seventeen plates.
- **The kitchen behind each recipe** – `scene` in `RECIPES` (`js/data.js`): a wall colour, a
  pattern (`gingham | stripe | tile | dot`), a worktop colour and a few props. All CSS gradients
  plus a few `<img>`; the `.p-*` and `.scene` rules in `css/style.css` draw it.
- **The hand** – `assets/art/hand.svg` and `hand-grip.svg`. The gripping one rides with a utensil.
  The pointing one demonstrates the gesture after a few seconds of stillness and then fades — it
  replaced the written hints, which she can't read. Timing is `idleDemo()` in `js/stages.js`.
- **Food, utensils and icons** – `assets/art/*.svg`, generated by `tools/build_art.py` from a
  shared kit: heavy ink outline, flat fills, one highlight — the same language as the townsfolk,
  which is what makes them look like one game. Used as `<img>`, so twenty of an ingredient cost
  one rasterisation. Open `tools/art-sheet.html` via `serve.ps1` to review the lot.
  ```
  python tools/build_art.py
  ```
- **Vessels** – bowls, ovens, blenders and pans are inlined from `js/vessels.js` (same generator)
  because their insides move: contents churn, a door glows, dough spreads. Parts are tagged `v-*`
  and driven from `css/style.css`. Where items may land inside one is the matching `.v-*` rule
  there too, so the geometry lives with the art.
- **The townsfolk** – `assets/cast/*.svg`, generated by `tools/build_cast.py`. Everyone shares one
  kit (head, eyes, brows, mouth, arms, legs) and differs by skin, hair, face mood and outfit, so a
  ninth person is one entry in `CAST` at the bottom of that file. Open `tools/cast-sheet.html` via
  `serve.ps1` to review the whole cast at once. Re-run after editing:
  ```
  python tools/build_cast.py
  ```
  Their names and jobs live in `CAST` in `js/data.js`; changing one needs
  `python tools/generate_voice.py --missing` for its café line.
- **Digits** – `DIGIT_STROKES` in `js/data.js`, chunky strokes in a 100×100 box (cap top y=12,
  baseline y=90), ready for a Build-a-Numeral port of ABC Town's Build-a-Letter.
- **Difficulty** – `MASTER_STREAK` and `CEILINGS` in `js/range.js` set how quickly the range widens.
- **Voice** – every line is a pre-generated mp3 (Microsoft Edge neural TTS, `en-GB-SoniaNeural`)
  looked up in `js/voice-manifest.js`. Browser text-to-speech covers anything missing, so the game
  talks before a single clip exists. Numbers are baked into each prompt so the line sounds like a
  sentence — about 500 clips in total.
  ```
  pip install edge-tts
  python tools/generate_voice.py            # everything
  python tools/generate_voice.py --missing  # only what's new
  ```
- **Sound effects** – `js/audio.js`. All synthesised with Web Audio; the game ships no sound files.

## Files

```
index.html            screens + iOS boilerplate
css/style.css         all styling and animations
js/data.js            digit strokes, the recipe book, the cast
js/audio.js           Web Audio sound effects + voice playback
js/voice-manifest.js  key → mp3 lookup (auto-generated)
js/fx.js              sparkle / confetti / crumb particles
js/range.js           per-numeral mastery model
js/stages.js          the interaction primitives
js/app.js             screen flow, progress, recipe runner, grown-ups panel
js/vessels.js         inline vessel svg with animatable parts (generated)
assets/art/           food, utensils and icons (svg, generated)
assets/cast/          the townsfolk (svg, generated)
tools/build_art.py    regenerates assets/art/*.svg + js/vessels.js
tools/art-sheet.html  review page for all the art
tools/build_cast.py   regenerates assets/cast/*.svg
tools/cast-sheet.html review page for the whole cast
tools/generate_voice.py  regenerates assets/voice/ + js/voice-manifest.js
serve.ps1             tiny local web server
```
