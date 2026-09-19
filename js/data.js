// Digit shapes, ingredient art, and the recipe book.
//
// Recipes are DATA. A stage names a primitive from js/stages.js plus the art it
// uses; it never names a number. The number comes from js/range.js at runtime, so
// any recipe can run at any difficulty. See docs/BRIEF.md.

// ---------- digits ----------
// Each digit as chunky SVG strokes in a 100x100 box, the same convention ABC Town
// uses for letters: cap top y=12, baseline y=90, so a digit is 78 tall on a 100 box.
// Build-a-Numeral scatters these strokes as draggable pieces, so splitting a stroke
// in two makes a digit harder and merging two makes it easier.
const DIGIT_STROKES = {
  0: ['M50 12 A26 39 0 0 0 50 90', 'M50 12 A26 39 0 0 1 50 90'],
  1: ['M30 30 L52 12', 'M52 12 V90', 'M30 90 H74'],
  2: ['M24 32 A24 24 0 0 1 70 44', 'M70 44 L24 90', 'M24 90 H78'],
  3: ['M24 28 A24 20 0 0 1 62 40 A18 14 0 0 1 42 51', 'M42 51 A20 16 0 0 1 64 66 A26 22 0 0 1 24 82'],
  4: ['M62 12 L20 64', 'M20 64 H78', 'M62 40 V90'],
  5: ['M72 12 H32', 'M32 12 V44', 'M32 44 H50 A23 23 0 0 1 50 90 H26'],
  6: ['M64 16 A34 40 0 0 0 23 68', 'M23 68 A25 21 0 0 1 73 68 A25 21 0 0 1 23 68'],
  7: ['M22 12 H78', 'M78 12 L40 90'],
  8: ['M50 12 A20 19 0 0 0 50 50 A20 19 0 0 0 50 12', 'M50 50 A24 20 0 0 0 50 90 A24 20 0 0 0 50 50'],
  9: ['M36 84 A34 40 0 0 0 77 34', 'M77 34 A25 21 0 0 1 27 34 A25 21 0 0 1 77 34'],
};

// A two-digit number's strokes, laid out side by side in a 200x100 box.
function numeralStrokes(n) {
  const s = String(n);
  if (s.length === 1) return DIGIT_STROKES[s].map(d => ({ d, dx: 50 }));
  return s.split('').flatMap((ch, i) => DIGIT_STROKES[ch].map(d => ({ d, dx: i * 100 })));
}

// ---------- ingredient art ----------
// Flat SVG in a 100x100 box. No gradients, no filters, no strokes wider than they
// need to be: up to 20 of these can be on screen at once on a 2017 iPad.
const ART = {
  scoop:    '<path d="M26 32 h48 l-7 44 a9 9 0 0 1 -9 8 h-16 a9 9 0 0 1 -9 -8z" fill="#eadcbe"/><ellipse cx="50" cy="32" rx="24" ry="9" fill="#fff8ea"/>',
  egg:      '<ellipse cx="50" cy="55" rx="26" ry="33" fill="#fffaf0"/><ellipse cx="50" cy="58" rx="13" ry="11" fill="#ffc83d"/>',
  tomato:   '<circle cx="50" cy="56" r="30" fill="#e8422e"/><path d="M50 30 l-12-10 h24z" fill="#4caf50"/>',
  cheese:   '<path d="M18 68 L50 26 L82 68z" fill="#ffd43b"/><circle cx="50" cy="56" r="5" fill="#f5b800"/><circle cx="62" cy="63" r="4" fill="#f5b800"/>',
  pepperoni:'<circle cx="50" cy="50" r="30" fill="#c8362b"/><circle cx="40" cy="42" r="6" fill="#8f2119"/><circle cx="60" cy="56" r="5" fill="#8f2119"/><circle cx="44" cy="62" r="4" fill="#8f2119"/>',
  mushroom: '<path d="M20 52 a30 24 0 0 1 60 0z" fill="#c9a227"/><rect x="42" y="50" width="16" height="28" rx="6" fill="#f0e2c0"/>',
  olive:    '<ellipse cx="50" cy="52" rx="22" ry="26" fill="#3f4d2c"/><ellipse cx="50" cy="52" rx="9" ry="12" fill="#d24a3a"/>',
  basil:    '<path d="M50 20 C78 34 78 70 50 82 C22 70 22 34 50 20z" fill="#3fa34d"/><path d="M50 22 V80" stroke="#2c7a37" stroke-width="4"/>',
  berry:    '<circle cx="50" cy="56" r="26" fill="#6b2d8f"/><path d="M50 32 l-10-10 h20z" fill="#4caf50"/>',
  cherry:   '<circle cx="50" cy="62" r="24" fill="#d81b3c"/><path d="M50 40 C58 24 70 18 78 16" stroke="#4caf50" stroke-width="6" fill="none" stroke-linecap="round"/>',
  banana:   '<path d="M22 34 C30 74 70 82 82 56 C66 70 38 58 34 30z" fill="#ffd93b"/>',
  strawberry:'<path d="M50 84 C24 66 26 40 50 34 C74 40 76 66 50 84z" fill="#e8304a"/><path d="M36 34 h28 l-14 -10z" fill="#4caf50"/>',
  ham:      '<rect x="18" y="34" width="64" height="34" rx="14" fill="#f4908f"/><circle cx="38" cy="50" r="5" fill="#fbc3c2"/><circle cx="60" cy="54" r="4" fill="#fbc3c2"/>',
  lettuce:  '<path d="M16 60 q14 -26 34 -16 q20 -10 34 16 q-16 16 -34 12 q-18 4 -34 -12z" fill="#66bb3a"/>',
  bread:    '<path d="M20 40 a30 22 0 0 1 60 0 v28 a6 6 0 0 1 -6 6 h-48 a6 6 0 0 1 -6 -6z" fill="#e3a869"/>',
  butter:   '<rect x="24" y="40" width="52" height="26" rx="5" fill="#ffe27a"/><rect x="24" y="40" width="52" height="9" rx="4" fill="#fff0b8"/>',
  sprinkle: '<rect x="38" y="30" width="24" height="42" rx="12" fill="#ff5fa2"/>',
  cup:      '<path d="M28 34 h44 l-6 46 a6 6 0 0 1 -6 5 h-20 a6 6 0 0 1 -6 -5z" fill="#bfe3ff"/><rect x="26" y="28" width="48" height="9" rx="4" fill="#8ecbff"/>',
  case:     '<path d="M30 38 h40 l-5 38 a5 5 0 0 1 -5 4 h-20 a5 5 0 0 1 -5 -4z" fill="#f3a3c0"/>',
  // Finished portions — what the Serve stage hands out.
  slice:    '<path d="M50 14 L86 82 a40 15 0 0 1 -72 0z" fill="#e8c27a"/><path d="M50 28 L77 79 a28 11 0 0 1 -54 0z" fill="#d94f32"/><circle cx="46" cy="58" r="5" fill="#a8331f"/><circle cx="58" cy="70" r="4" fill="#a8331f"/>',
  cupcake:  '<path d="M32 46 h36 l-5 32 a6 6 0 0 1 -6 5 h-14 a6 6 0 0 1 -6 -5z" fill="#e8a0bf"/><path d="M28 46 a22 18 0 0 1 44 0z" fill="#fff0f5"/><circle cx="50" cy="24" r="6" fill="#d81b3c"/>',
  sandwich: '<path d="M18 70 L50 26 L82 70z" fill="#e3a869"/><path d="M27 63 L50 37 L73 63z" fill="#f4908f"/>',
  pancake:  '<ellipse cx="50" cy="68" rx="32" ry="11" fill="#b8692a"/><ellipse cx="50" cy="58" rx="32" ry="11" fill="#cf7d33"/><ellipse cx="50" cy="48" rx="32" ry="11" fill="#e0913f"/><rect x="42" y="36" width="16" height="9" rx="3" fill="#ffe27a"/>',
};

const DISH_ART = {
  // Half-ellipse bowls and full-width dishes: the art fills the 200x140 box, so a
  // vessel reads large on screen without the stage having to scale it up.
  bowl:    '<path d="M8 46 a92 84 0 0 0 184 0z" fill="#dfe7ee"/><ellipse cx="100" cy="46" rx="92" ry="17" fill="#c3d0da"/><ellipse cx="100" cy="46" rx="79" ry="12" fill="#aebdc9"/>',
  dough:   '<ellipse cx="100" cy="74" rx="88" ry="54" fill="#f0d9a8"/><ellipse cx="100" cy="70" rx="76" ry="44" fill="#f6e6c2"/>',
  pizza:   '<circle cx="100" cy="70" r="68" fill="#e8c27a"/><circle cx="100" cy="70" r="56" fill="#d94f32"/>',
  oven:    '<rect x="14" y="10" width="172" height="124" rx="16" fill="#8f9aa6"/><rect x="32" y="38" width="136" height="84" rx="12" fill="#33414f"/><rect x="42" y="48" width="116" height="64" rx="8" fill="#ffb34d"/>',
  blender: '<path d="M58 8 h84 l-9 92 a12 12 0 0 1 -12 11 h-42 a12 12 0 0 1 -12 -11z" fill="#cfe9ff" opacity="0.8"/><rect x="54" y="112" width="92" height="24" rx="8" fill="#6b7784"/>',
  plate:   '<ellipse cx="100" cy="72" rx="94" ry="52" fill="#eef3f7"/><ellipse cx="100" cy="70" rx="72" ry="38" fill="#ffffff"/>',
  // Ten cups, five across — the cupcake tray IS the ten-frame, which is what makes
  // thirteen read as "a full tray and three more". See docs/BRIEF.md.
  tray:    '<rect x="6" y="18" width="188" height="104" rx="14" fill="#9aa5b1"/><circle cx="24.8" cy="44" r="16" fill="#7c8894"/><circle cx="62.4" cy="44" r="16" fill="#7c8894"/><circle cx="100" cy="44" r="16" fill="#7c8894"/><circle cx="137.6" cy="44" r="16" fill="#7c8894"/><circle cx="175.2" cy="44" r="16" fill="#7c8894"/><circle cx="24.8" cy="96" r="16" fill="#7c8894"/><circle cx="62.4" cy="96" r="16" fill="#7c8894"/><circle cx="100" cy="96" r="16" fill="#7c8894"/><circle cx="137.6" cy="96" r="16" fill="#7c8894"/><circle cx="175.2" cy="96" r="16" fill="#7c8894"/>',
  pan:     '<ellipse cx="96" cy="78" rx="84" ry="46" fill="#4a5560"/><ellipse cx="96" cy="74" rx="72" ry="38" fill="#2f3840"/>',

};

// ---------- the recipe book ----------
// Stages name a primitive and its art. `n` is injected at runtime by the range model.
// `say` lines use {n} for the chosen number; the voice key is built from the stage id.
const RECIPES = [
  {
    id: 'pizza', name: 'Pizza', icon: '🍕', color: '#e8542f',
    blurb: 'Roll it, top it, bake it.',
    stages: [
      { id: 'flour',  primitive: 'count-place',   item: 'scoop',     vessel: 'bowl',  say: 'Put {n} scoops of flour in the bowl.' },
      { id: 'roll',   primitive: 'count-gesture', gesture: 'roll',   vessel: 'dough', say: 'Roll the dough {n} times!' },
      { id: 'bake',   primitive: 'set-dial',      device: 'oven',                     say: 'Set the oven to {n}.' },
      { id: 'top',    primitive: 'count-place',   item: 'pepperoni', vessel: 'pizza', say: 'Put {n} pepperoni on the pizza.' },
      { id: 'slice',  primitive: 'cut-into',      vessel: 'pizza',                    say: 'Cut the pizza into {n} slices.' },
      { id: 'serve',  primitive: 'match-1to1',    item: 'slice',                      say: 'Give everyone a slice!' },
    ],
  },
  {
    id: 'cupcakes', name: 'Cupcakes', icon: '🧁', color: '#e85fa2',
    blurb: 'A tray of ten, then some more.',
    stages: [
      { id: 'flour',  primitive: 'count-place',   item: 'scoop',    vessel: 'bowl', say: 'Put {n} scoops of flour in the bowl.' },
      { id: 'eggs',   primitive: 'count-place',   item: 'egg',      vessel: 'bowl', say: 'Crack {n} eggs into the bowl.' },
      { id: 'fill',   primitive: 'count-place',   item: 'case',     vessel: 'tray', say: 'Fill {n} cupcake cases.' },
      { id: 'stir',   primitive: 'count-gesture', gesture: 'stir',  vessel: 'bowl', say: 'Stir the mixture {n} times!' },
      { id: 'bake',   primitive: 'set-dial',      device: 'oven',                   say: 'Set the oven to {n}.' },
      { id: 'cherry', primitive: 'count-place',   item: 'cherry',   vessel: 'tray', say: 'Put {n} cherries on top.' },
      { id: 'serve',  primitive: 'match-1to1',    item: 'cupcake',                  say: 'Give everyone a cupcake!' },
    ],
  },
  {
    id: 'sandwich', name: 'Sandwich', icon: '🥪', color: '#d79a3c',
    blurb: 'No oven needed.',
    stages: [
      { id: 'bread',  primitive: 'count-place',   item: 'bread',   vessel: 'plate', say: 'Put {n} slices of bread on the plate.' },
      { id: 'spread', primitive: 'count-gesture', gesture: 'spread', vessel: 'plate', say: 'Spread the butter {n} times!' },
      { id: 'ham',    primitive: 'count-place',   item: 'ham',     vessel: 'plate', say: 'Add {n} pieces of ham.' },
      { id: 'cut',    primitive: 'cut-into',      vessel: 'plate',                  say: 'Cut the sandwich into {n} pieces.' },
      { id: 'serve',  primitive: 'match-1to1',    item: 'sandwich',                 say: 'Give everyone a sandwich!' },
    ],
  },
  {
    id: 'smoothie', name: 'Smoothie', icon: '🥤', color: '#8e44ff',
    blurb: 'Whizz it up and pour.',
    stages: [
      { id: 'fruit',  primitive: 'count-place', item: 'strawberry', vessel: 'blender', say: 'Put {n} strawberries in the blender.' },
      { id: 'berry',  primitive: 'count-place', item: 'berry',      vessel: 'blender', say: 'Add {n} blueberries.' },
      { id: 'whizz',  primitive: 'set-dial',    device: 'blender',                     say: 'Turn the blender to {n}.' },
      { id: 'pour',   primitive: 'count-place', item: 'cup',        vessel: 'plate',   say: 'Pour {n} cups of smoothie.' },
      { id: 'serve',  primitive: 'match-1to1',  item: 'cup',                           say: 'Give everyone a smoothie!' },
    ],
  },
  {
    id: 'pancakes', name: 'Pancakes', icon: '🥞', color: '#c9772f',
    blurb: 'Flip them and stack them high.',
    stages: [
      { id: 'flour',  primitive: 'count-place',   item: 'scoop',  vessel: 'bowl', say: 'Put {n} scoops of flour in the bowl.' },
      { id: 'whisk',  primitive: 'count-gesture', gesture: 'whisk', vessel: 'bowl', say: 'Whisk the batter {n} times!' },
      { id: 'cook',   primitive: 'set-dial',      device: 'oven',                 say: 'Set the stove to {n}.' },
      { id: 'flip',   primitive: 'count-gesture', gesture: 'flip', vessel: 'pan', say: 'Flip the pancake {n} times!' },
      { id: 'berries',primitive: 'count-place',   item: 'berry',  vessel: 'plate', say: 'Put {n} berries on the stack.' },
      { id: 'serve',  primitive: 'match-1to1',    item: 'pancake',                say: 'Give everyone a pancake!' },
    ],
  },
];

// The kitchen cast: who turns up to be served, and who fills the café.
// Generated by tools/build_cast.py — one shared kit (head, eyes, brows, mouth, arms,
// legs) with a different face and outfit each, so eight people cost about as much to
// draw as one. Referenced as <img> rather than inlined: Safari rasterises each file
// once and reuses it, which matters when six share a stage.
const CAST = [
  { id: 'pip',   name: 'Pip',   color: '#e8503a', job: 'the chef' },
  { id: 'bea',   name: 'Bea',   color: '#f0a6c0', job: 'the baker' },
  { id: 'ollie', name: 'Ollie', color: '#5d8c3f', job: 'the farmer' },
  { id: 'mimi',  name: 'Mimi',  color: '#ff5fa2', job: 'the little one' },
  { id: 'gus',   name: 'Gus',   color: '#ff9e2c', job: 'the builder' },
  { id: 'nell',  name: 'Nell',  color: '#c0563a', job: 'the gardener' },
  { id: 'rory',  name: 'Rory',  color: '#2f4f8f', job: 'the postie' },
  { id: 'tilly', name: 'Tilly', color: '#b89ad4', job: 'everyone\'s nan' },
];
CAST.forEach(c => { c.img = `assets/cast/${c.id}.svg`; });
