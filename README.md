# Number Kitchen

A cooking game for a 3–4 year old, on an iPad. Pick a friend who's hungry, pick a recipe, and
cook it with your hands: pour the flour, stir the bowl, roll the dough, paint the sauce, drop on
the toppings, bake it, cut it, and watch your friend gobble it up.

**Play it:** <https://number-kitchen.netlify.app> (deployed from `main`).

- Three recipes: **pizza**, **cupcakes** and a **smoothie**.
- Eight animal friends to cook for.
- No fail states, no timers, no text to read. Every drag also works as a tap, and a little hand
  shows what to do if she pauses.

The art direction follows Bimi Boo's *Kids Cooking* (see [`game/docs/ART.md`](game/docs/ART.md)),
all drawn in code. The numbers layer the project is named for is parked until the cooking is fun.

## Running it

It's plain HTML, CSS and JavaScript with no build step. Serve the `game/` folder with any static
server (`serve.ps1` does it on Windows, `python -m http.server` from `game/` anywhere else) and
open it on the iPad over Wi-Fi.

`game/index.html?recipe=cupcakes&step=frost&friend=fox` jumps straight to any step.
`game/tools/art-sheet.html` shows every drawing on one page.

## Layout

- `game/` — the game. See [`CLAUDE.md`](CLAUDE.md) for how it is put together.
- `archive/v1/` — the first version (the numbers game), kept for reference (its last commit on main was `c53792d`).
- `build.sh`, `netlify.toml` — Netlify publishes `game/` from `main`, and a preview for every pull request.
