# Number Kitchen — working notes

A cooking game for one player, age 3-4, on an iPad. **The live code is in `game/`.** The files
outside it (`js/`, `css/`, `assets/`, `tools/`, root `index.html`) are the first version, kept
only for reference until they are removed. Do not build on them.

The numeracy layer is parked: **the priority is a fun cooking game first**, with learning added
on top later. The art
direction follows Bimi Boo's *Kids Cooking* app — read `game/docs/ART.md` before drawing anything.

## Stack

Vanilla ES6. **No build step, no npm, no bundler, no framework.** Plain `<script>` tags and IIFE
modules (`const Foo = (() => { ... })()`).

All art is SVG drawn in code in `game/js/art.js`. No bitmaps, no sound files (effects are
synthesised in `game/js/sfx.js`), **no emoji anywhere**.

## Layout

```
game/index.html      the screens and iOS boilerplate (viewport, double-tap-zoom guard)
game/css/style.css   all styling and animation
game/js/art.js       every drawing; Art.img(name) for repeating art, inline fns for moving parts
game/js/sfx.js       Web Audio sound effects
game/js/kit.js       stage scaling, drag/tap, fly, the demonstrating hand (Hint), particles (Fx)
game/js/dishes.js    the dishes (pizza, cupcakes, smoothie): state + renderer + a shared interface
game/js/steps.js     the cooking steps: order, mix, stir, blend, pour, frost, roll, sauce,
                     decorate, bake, cut, serve
game/js/recipes.js   the recipe book (data) and the customers
game/js/app.js       screen flow: start → menu → cook (order, steps, serve) → done
game/tools/art-sheet.html   every drawing on one page
```

Open `game/index.html?recipe=cupcakes&step=frost` (any recipe id and step name, or `step=menu` /
`step=done`) to jump straight to a step. `Steps.skip` fills in what the earlier steps would have done.

## The stage

Everything is laid out on a fixed **1024×768** stage (an iPad's CSS size) scaled to fit the
screen. All positions in the steps are stage pixels; `Kit.pt(e)` converts a pointer event.

## Target device and performance

**A 2017 iPad — A9, 2 GB RAM.** These rules were learned on ABC Town and are not speculative.

- **Animate only `transform` and `opacity`.** Never `top`/`left`/`width`/`height` or SVG geometry.
- **Never animate an element that has a `filter`.** Use no filters at all; shadows are drawn.
- **Hidden screens keep animating.** Any always-on animation needs adding to the
  `animation-play-state: paused` list at the bottom of `style.css`.
- **Navigation listens on `pointerdown`, not `click`.** Use `Kit.tap()` / `Kit.drag()`.
- **Read before you write in a frame loop.**
- **Repeating art is `<img>`** (`Art.img`) so Safari rasterises it once; only art whose parts
  move is inlined, and only one such thing is on screen at a time.

Health check: `document.getAnimations().filter(a => a.playState === 'running').length` should be
a handful, not a hundred.

## Design rules that are not negotiable

- **No fail state. No error sound. Ever.** A drop in the wrong place springs back quietly.
- **Every drag also works as a tap.** Tapping a source or tool does the job by itself, so a child
  who has not got dragging yet is never locked out.
- **No time pressure.** Nothing finishes or fails because she was slow.
- **No text for the child.** Instructions are the demonstrating hand (`Hint`), which plays after
  a few seconds of stillness. It is never a cursor.
- **Make it physical.** A step is a specific action on a specific object: pour the flour into the
  bowl, stir it round, roll the dough. What she picks up is a real thing, not a button.

## Adding things

**A recipe** — an entry in `RECIPES` in `game/js/recipes.js`: the dish it makes and its steps,
each `{ do: '<step>', ...details }` (which items go in, which tool, which toppings). No code if it
reuses existing steps and dishes. The customer's order is added in front of every recipe.

**A step** — a function in `game/js/steps.js`: `(root, meal, done, spec) => ({ stop() })`. `meal`
is `{ dish, state, added, customer }`; `spec` is the recipe's entry. Build into `root` (a fresh
element per step), call `done()` once, give `Hint.set()` a path for the hand, and add an entry to
`Steps.skip` if it leaves state behind.

**A dish** — an object in `game/js/dishes.js` answering the shared interface documented at the
top of the file (make, place a topping, fill, bake, bites...). Only implement what its steps use.

**The customer** orders at the start (a speech bubble with the dish), watches through the window
while she cooks, cheers when each step finishes, and eats it at the end.

**A customer** — a colour set in `ANIMALS` in `game/js/art.js` (plus ears/markings in `face()`)
and its name in `CUSTOMERS`.

## Testing

There is no test suite; this is a game for one child. Verify by playing it. `main` deploys to
<https://number-kitchen.netlify.app> via `build.sh`, which now publishes `game/`, and Netlify
publishes a preview for every pull request so a branch can be tried on the actual iPad.
