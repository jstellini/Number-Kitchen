# Art direction

The reference is Bimi Boo's *Kids Cooking: Toddler Games 2-5* (App Store id 6447359628), the
app whose pizza flow she loved. Match its feel, not its assets: everything here is drawn in
`js/art.js`. Never copy its characters or artwork.

## The look in one line

Rounded candy shapes with **outlines tinted from their own colour**, one soft crescent of shade
and a white gloss, on pastel gingham tablecloths, served to big-eyed animals in a pink room.

(Checked against the App Store screenshots. An earlier pass guessed "no outlines" from memory;
the screenshots showed that was wrong.)

## Rules

- **Tinted outlines, never black.** `toon()` outlines every form in a much deeper version of its
  own fill (`ink()`): dark red round a tomato, orange-brown round cheese, grey round a glove.
  Details inside a form (seeds, speckles, holes) have no outline.
- **One crescent of shade per form.** `toon()` draws a shape in a darker tone, then again in its
  own colour nudged up-left and clipped to itself. Light comes from the upper left.
- **Shade towards plum, not black.** `dark()` mixes towards `#6a2c4a`, so shadows stay warm.
- **Gloss, plus a little texture on food.** One white ellipse top-left. Food gets simple texture
  the way Bimi does it: pale speckles on salami, holes in cheese, seeds in a tomato slice, basil
  as a sprig of leaves.
- **Contact shadows are flat ellipses** (`shadow()`), never blur filters. The iPad hates filters.
- **Two places.** Cooking happens top-down on a **gingham tablecloth** in the recipe's colour
  (`cloth` in recipes.js; pizza blue, cupcakes pink, smoothie mint). The customer is met and fed in
  the **room**: pink striped wallpaper, a window, a shelf of jars, a wooden worktop.
- **The food is big.** The dish is centre-stage and large (a pizza about 430px across on the
  1024px stage); tools wait at the side. The bowl, blender and oven stay side-on by choice.
- **Toppings wait in round white slots on a cream panel**; the one in hand gets a teal ring.
- **The cast:** our own eight animals (Bruno bear, Poppy bunny, Milo cat, Pip panda, Rosie pig,
  Biscuit puppy, Mimi mouse, Ziggy fox), full-bodied with a big head and a small body: an outfit
  (overalls, dress or shorts), arms, short legs, shoes, and a tail for some. Eyes are a dark rim,
  a coloured iris, a pupil and two white shines; small brows; pink blush; tiny nose. Happy =
  closed-arc eyes, an open mouth and both arms in the air. Behind the worktop only the top half
  shows; the full figure is on the "who's hungry?" cards, each with a name tab.
- **The hand** that demonstrates is beige with a purple cuff and button, pointing up-left.
- **Buttons:** navigation is a purple rounded square with a pale ring; going on is a round green
  (or yellow) button with a pale ring. White icons, no words.
- **Titles:** white letters in a fat coloured outline.
- **Sparkles are white four-point twinkles**; confetti is for the finish only.
- **Swipes leave a glowing trail:** white with a lilac glow, fading in about a quarter of a
  second (`Fx.swipe`). Cutting also sprays juice and crumbs (`Fx.spray`). No canvas blur: the
  glow is a wide pale stroke under a white one.
- **Palette:** gingham blue `#9fbdf2`, pink `#f5a3c7`, mint `#8fd9c4`; wallpaper `#f9c8dd`; nav
  purple `#9b6fe0`; go green `#5bcb62`; sunshine `#ffd23f`; salami `#e05a66`; leaf `#4cb84e`.

## Adding a drawing

Add a function to `D` in `js/art.js` returning an SVG string built from `toon`, `gloss`, `shadow`
and the shape helpers `C`/`E`/`R`/`P`. If it repeats on screen, draw it with `Art.img(name)`.
If its parts move, make it an inline function and tag the parts with `v-*` classes. Review
everything at once with `tools/art-sheet.html`.
