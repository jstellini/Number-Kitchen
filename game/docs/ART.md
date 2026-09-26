# Art direction

The reference is Bimi Boo's *Kids Cooking: Toddler Games 2-5* (App Store id 6447359628), the
app whose pizza flow she loved. Match its feel, not its assets: everything here is drawn in
`js/art.js`.

## The look in one line

Flat, rounded, candy-coloured shapes with **no outlines**, shaded with one soft crescent and one
white gloss, sitting in a bright, tidy kitchen.

## Rules

- **No outlines.** Edges come from the colour change between shapes. This is the biggest
  difference from the previous art, which used ink outlines.
- **One crescent of shade per form.** `toon()` draws a shape in a darker tone, then again in its
  own colour nudged up-left and clipped to itself. Light always comes from the upper left.
- **Shade towards plum, not black.** `dark()` mixes towards `#6a2c4a`, so shadows stay warm and
  sweet. Nothing is ever grey-black except eyes and the olive.
- **Gloss, not texture.** One white ellipse top-left (`gloss()`) makes a thing look shiny and
  touchable. No noise, no patterns on food beyond a few spots.
- **Round everything.** Corners have large radii; nothing has a sharp point except a star.
- **Contact shadows are flat ellipses** (`shadow()`), never blur filters. The iPad hates filters.
- **Saturated but soft palette.** Mint wall `#aee6df`, warm worktop `#fad9a9`, sky blue
  `#5ab4ee`, candy pink `#ff86ad`, sunshine `#ffd23f`, tomato `#e4483a`, leaf `#46b04a`.
- **Big friendly faces.** Customers are round animals: huge dark eyes with two white glints,
  pink blush, tiny nose. Happy = closed-arc eyes and an open mouth. They stand *behind* the
  worktop so only the head and shoulders show.
- **Buttons are candy.** Round, one flat colour, an inset darker base, a gloss, a white icon.
  Green is "go/done", yellow is "navigate". No words for the child.
- **The dish gets the room.** The thing being cooked sits centre-stage and large; sources and
  tools wait at the sides of the worktop.

## Adding a drawing

Add a function to `D` in `js/art.js` returning an SVG string built from `toon`, `gloss`, `shadow`
and the shape helpers `C`/`E`/`R`/`P`. If it repeats on screen, draw it with `Art.img(name)`.
If its parts move, make it an inline function and tag the parts with `v-*` classes. Review
everything at once with `tools/art-sheet.html`.
