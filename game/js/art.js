// All the game's art, drawn in code.
//
// The look (after Bimi Boo): rounded candy shapes with an outline tinted from each shape's own
// colour, never black. Each form is shaded by drawing it once in a darker tone and again in its
// own colour, nudged up-left and clipped to itself, which leaves a crescent of shade along the
// lower right. A soft white gloss sits top-left. Shadows are plain translucent ellipses, never
// filters. See docs/ART.md.
//
// Two kinds of output:
//   Art.url(name)  — for anything that repeats (a topping, a tool, a face). Turned into a blob
//                    URL once, drawn as <img>, so Safari rasterises it once and reuses it.
//   Art.<fn>()     — inline SVG for things whose parts move (the bowl, the oven, the pizza).
const Art = (() => {
  // ---------- colour ----------
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const hex = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => { const A = rgb(a), B = rgb(b); return hex(A.map((v, i) => v + (B[i] - v) * t)); };
  // Shade towards a warm plum rather than black, so shadows stay candy-coloured.
  const dark = (c, t = 0.2) => mix(c, '#6a2c4a', t);
  const light = (c, t = 0.4) => mix(c, '#ffffff', t);

  // ---------- shapes ----------
  // A shape is a function of fill, so the same geometry can be drawn, shaded and used as a clip.
  const C = (cx, cy, r, x = '') => f => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${f}" ${x}/>`;
  const E = (cx, cy, rx, ry, x = '') => f => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${f}" ${x}/>`;
  const R = (x0, y0, w, h, r, x = '') => f => `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="${r}" fill="${f}" ${x}/>`;
  const P = (d, x = '') => f => `<path d="${d}" fill="${f}" ${x}/>`;

  let uid = 0;
  const id = p => `${p}${++uid}`;

  // The outline colour for a fill: the same hue, much deeper.
  const ink = c => mix(c, '#4a1d33', 0.5);

  // The house shading. k = how far the lit face slides up-left, w = outline width (both in the
  // art's own units). w: 0 for no outline.
  function toon(shape, fill, o = {}) {
    const k = o.k ?? 6, cid = id('t'), w = o.w ?? 3.5;
    const sh = o.shade || dark(fill, o.t ?? 0.22);
    return `<clipPath id="${cid}">${shape('#000')}</clipPath>${shape(sh)}` +
      `<g clip-path="url(#${cid})"><g transform="translate(${-k * 0.7} ${-k})">${shape(fill)}</g></g>` +
      (w ? shape('none').replace(/\/>$/, ` stroke="${o.ink || ink(o.shade ? sh : fill)}" stroke-width="${w}" stroke-linejoin="round"/>`) : '');
  }
  const gloss = (cx, cy, rx, ry, rot = -30, op = 0.55) =>
    `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#fff" opacity="${op}" transform="rotate(${rot} ${cx} ${cy})"/>`;
  const shadow = (cx, cy, rx, ry, op = 0.14) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#4a2340" opacity="${op}"/>`;
  const line = (d, c, w, x = '') => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${x}/>`;
  const svg = (w, h, body, cls = '') =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"${cls ? ` class="${cls}"` : ''}>${body}</svg>`;

  // ======================================================================================
  // Repeating art (drawn as <img>)
  // ======================================================================================
  const D = {};

  // ---- toppings ----
  // Salami, as Bimi draws it: pinkish red with pale speckles.
  D.pepperoni = () => svg(100, 100,
    toon(C(50, 50, 42), '#e05a66', { k: 5 }) +
    [[34, 40, 4], [56, 30, 3], [66, 52, 4.5], [44, 62, 3.5], [52, 46, 2.5], [30, 58, 2.5], [60, 70, 3], [70, 36, 2.5], [40, 28, 2]]
      .map(([x, y, r]) => C(x, y, r)('#f7a8b0')).join('') +
    gloss(34, 30, 11, 5, -30, 0.5));

  D.mushroom = () => svg(100, 100,
    toon(P('M12 54C12 22 88 22 88 54C88 62 80 64 70 62L66 62C66 76 68 84 62 90L38 90C32 84 34 76 34 62L30 62C20 64 12 62 12 54Z'), '#f6e6cf', { k: 5 }) +
    line('M15 52C15 27 85 27 85 52', '#c28e5f', 6) +
    line('M34 60Q50 66 66 60', '#d8b58c', 3) +
    gloss(34, 38, 10, 5, -20, 0.6));

  D.olive = () => svg(100, 100,
    toon(P('M18 50a32 32 0 1 0 64 0a32 32 0 1 0-64 0ZM38 50a12 12 0 1 1 24 0a12 12 0 1 1-24 0Z', 'fill-rule="evenodd" clip-rule="evenodd"'), '#46425a', { k: 5 }) +
    gloss(34, 36, 9, 5, -35, 0.45));

  // A sprig: three leaves on a little stem.
  const leaf = (x, y, rot, c) => `<g transform="rotate(${rot} ${x} ${y})">` +
    toon(P(`M${x} ${y}C${x + 17} ${y - 8} ${x + 19} ${y - 30} ${x} ${y - 40}C${x - 19} ${y - 30} ${x - 17} ${y - 8} ${x} ${y}Z`), c, { k: 3, w: 3 }) +
    line(`M${x} ${y - 4}L${x} ${y - 32}`, light(c, 0.4), 2.2) + `</g>`;
  D.basil = () => svg(100, 100,
    line('M50 92L50 58', '#3f8f3a', 5) +
    leaf(50, 60, -58, '#4cb84e') + leaf(50, 60, 58, '#4cb84e') + leaf(50, 56, 0, '#58c85a'));

  // A block of cheese with holes.
  D.cheese = () => svg(100, 100, `<g transform="rotate(-12 50 50)">` +
    toon(R(14, 14, 72, 72, 14), '#ffd84d', { k: 5 }) +
    [[34, 34, 8], [62, 30, 5], [56, 58, 9], [30, 64, 5], [74, 70, 4]].map(([x, y, r]) =>
      C(x, y, r)('#f5b52e') + C(x - r * 0.25, y - r * 0.25, r * 0.6)('#ffe27a')).join('') +
    gloss(26, 22, 9, 4, 0, 0.6) + `</g>`);

  D.tomato = () => svg(100, 100,
    toon(C(50, 50, 38), '#ff5a4e', { k: 5 }) + C(50, 50, 29)('#ff8a78') +
    [0, 72, 144, 216, 288].map(a => `<ellipse cx="50" cy="32" rx="7" ry="11" fill="#ffd37a" transform="rotate(${a} 50 50)"/>`).join('') +
    C(50, 50, 7)('#ff6b5c') + gloss(36, 30, 10, 5, -30, 0.5));

  // ---- ingredients for the bowl ----
  D.flour = () => svg(160, 200,
    shadow(80, 190, 64, 8) +
    toon(P('M22 52L138 52L148 174Q149 188 134 188L26 188Q11 188 12 174Z'), '#f7eedf', { k: 8 }) +
    toon(P('M22 54L30 20Q32 12 42 12L118 12Q128 12 130 20L138 54Z'), '#eadcc2', { k: 6 }) +
    line('M34 30L126 30', '#d8c6a4', 4) +
    toon(C(80, 120, 36), '#5ab4ee', { k: 4 }) +
    line('M80 144L80 98', '#fff3c4', 5) +
    [[-1, 104], [1, 104], [-1, 116], [1, 116], [-1, 128], [1, 128]].map(([s, y]) =>
      `<ellipse cx="${80 + s * 9}" cy="${y}" rx="8" ry="4.5" fill="#ffe27a" transform="rotate(${s * -35} ${80 + s * 9} ${y})"/>`).join('') +
    `<ellipse cx="80" cy="94" rx="4.5" ry="8" fill="#ffe27a"/>` +
    gloss(40, 90, 7, 26, 0, 0.6));

  D.milk = () => svg(120, 200,
    shadow(60, 192, 46, 7) +
    toon(P('M40 20L80 20L80 44Q104 60 104 88L104 176Q104 188 92 188L28 188Q16 188 16 176L16 88Q16 60 40 44Z'), '#ffffff', { k: 7, shade: '#d4e2f2' }) +
    toon(R(34, 4, 52, 22, 8), '#4a98ee', { k: 4 }) +
    `<rect x="16" y="108" width="88" height="48" fill="#79c3fb"/>` +
    `<rect x="16" y="150" width="88" height="6" fill="#5aaaf0"/>` +
    P('M60 116Q72 132 72 138A12 12 0 0 1 48 138Q48 132 60 116Z')('#fff') +
    gloss(30, 84, 6, 20, 0, 0.9));

  D.egg = () => svg(100, 120,
    shadow(50, 112, 34, 6) +
    toon(P('M50 8C76 8 90 50 90 72C90 96 72 110 50 110C28 110 10 96 10 72C10 50 24 8 50 8Z'), '#fff3e2', { k: 7, shade: '#ebcfae' }) +
    gloss(34, 42, 9, 17, -20, 0.9));

  D.sugar = () => svg(120, 160,
    shadow(60, 152, 48, 7) +
    toon(R(14, 34, 92, 116, 26), '#ffb6cf', { k: 7 }) +
    toon(R(10, 18, 100, 26, 13), '#ff7aa8', { k: 4 }) +
    [[40, 90], [60, 80], [80, 94], [50, 110], [72, 112]].map(([x, y]) => R(x - 6, y - 6, 12, 12, 3)('#fff')).join('') +
    gloss(30, 70, 6, 22, 0, 0.6));

  // ---- utensils ----
  D.spoon = () => svg(80, 300,
    toon(R(32, 96, 16, 196, 8), '#e2a462', { k: 3 }) +
    toon(E(40, 60, 32, 50), '#e9ae6c', { k: 6 }) +
    E(40, 58, 20, 34)('#d4914f') +
    gloss(28, 44, 6, 14, -10, 0.5));

  D.rollingpin = () => svg(300, 90,
    toon(R(4, 32, 54, 26, 13), '#d9874a', { k: 3 }) + toon(R(242, 32, 54, 26, 13), '#d9874a', { k: 3 }) +
    toon(R(46, 8, 208, 74, 32), '#f5c68a', { k: 6 }) +
    gloss(150, 24, 88, 7, 0, 0.55));

  D.ladle = () => svg(120, 300,
    toon(R(52, 0, 16, 200, 8), '#ff7a66', { k: 3 }) +
    toon(C(60, 238, 54), '#ff8f7c', { k: 6 }) +
    toon(E(60, 232, 40, 32), '#d8392c', { k: 4, shade: '#b72a20' }) +
    gloss(46, 222, 12, 6, -25, 0.5));

  D.cutter = () => svg(120, 280,
    toon(R(48, 116, 24, 156, 12), '#ff7043', { k: 3 }) +
    toon(R(52, 70, 16, 56, 5), '#b8c6ce', { k: 2 }) +
    toon(C(60, 62, 54), '#e6edf1', { k: 6, shade: '#a8b8c2' }) +
    C(60, 62, 44)('none').replace('fill="none"', 'fill="none" stroke="#c9d5db" stroke-width="3"') +
    toon(C(60, 62, 13), '#90a4ae', { k: 2 }) +
    gloss(40, 38, 14, 6, -35, 0.7));

  D.whisk = () => svg(100, 300,
    toon(R(40, 170, 20, 124, 10), '#7ac8f6', { k: 3 }) +
    line('M50 170C10 130 14 30 50 16C86 30 90 130 50 170', '#c6d2d9', 6) +
    line('M50 170C30 130 30 40 50 16C70 40 70 130 50 170', '#c6d2d9', 6) +
    line('M50 170L50 16', '#dde5ea', 6));

  // ---- the hand that demonstrates (never a cursor) ----
  // Beige, with a purple cuff and a button, leaning so it points up and to the left. The index
  // finger runs up the left edge, the others are curled, the thumb is tucked across the front.
  // The fingertip is at (25, 24) in the 160×200 box; Hint relies on that.
  D.hand = () => svg(160, 200, `<g transform="translate(10 0) rotate(-20 70 100)">` +
    toon(R(28, 6, 32, 104, 16), '#f6dfbd', { k: 4, shade: '#e2bf93' }) +
    toon(R(24, 70, 100, 92, 40), '#f6dfbd', { k: 5, shade: '#e2bf93' }) +
    line('M64 74Q66 90 64 104M88 76Q90 92 88 106', '#c99f70', 3) +
    toon(R(34, 104, 64, 26, 13, 'transform="rotate(-12 66 117)"'), '#f6dfbd', { k: 3, shade: '#e2bf93' }) +
    `<ellipse cx="44" cy="17" rx="9" ry="6" fill="#fff"/>` +
    toon(R(36, 148, 80, 44, 14), '#9a62c4', { k: 4 }) + toon(C(76, 170, 8), '#6e3f96', { k: 2, w: 2 }) +
    `</g>`);

  // ---- counter furniture ----
  D.plate = () => svg(300, 300,
    shadow(156, 162, 146, 146, 0.12) +
    toon(C(150, 150, 146), '#ffffff', { k: 8, shade: '#d5e2ef' }) +
    C(150, 150, 118)('#f1f6fb') + C(150, 150, 112)('#ffffff') +
    gloss(90, 70, 40, 12, -35, 0.8));

  D.board = () => svg(470, 400,
    shadow(214, 212, 196, 196, 0.12) +
    toon(R(356, 172, 110, 56, 28), '#e39a55', { k: 5 }) + C(430, 200, 10)('#b86f33') +
    toon(C(200, 200, 192), '#eeae68', { k: 10 }) +
    line('M60 150Q200 120 340 150M40 220Q200 190 360 220M70 290Q200 262 330 290', '#f6c386', 5) +
    gloss(110, 90, 50, 16, -35, 0.35));

  D.dish = () => svg(170, 100,
    shadow(86, 92, 76, 7) +
    E(85, 34, 78, 22)('#ffd9e6') + E(85, 36, 66, 15)('#f7b6cb') +
    toon(P('M7 34Q10 92 85 92Q160 92 163 34Q150 58 85 58Q20 58 7 34Z'), '#ff86ad', { k: 5 }) +
    gloss(40, 68, 14, 5, 15, 0.5));

  // ---- the kitchen ----
  // The window is two layers so the customer can peek in between them: the sky behind, the
  // frame and curtains in front. The glass is the (32, 30, 196, 160) rectangle.
  const rr = (x, y, w, h, r) =>
    `M${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h - r}Q${x + w} ${y + h} ${x + w - r} ${y + h}` +
    `H${x + r}Q${x} ${y + h} ${x} ${y + h - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`;
  D['window-sky'] = () => svg(260, 220,
    R(32, 30, 196, 160, 18)('#a6e1ff') +
    C(186, 72, 22)('#ffe066') +
    [[70, 80, 20], [92, 72, 24], [114, 82, 18]].map(([x, y, r]) => C(x, y, r)('#fff')).join('') +
    [[150, 150, 14], [168, 144, 18], [186, 152, 13]].map(([x, y, r]) => C(x, y, r)('#fff')).join(''));
  D['window-frame'] = () => svg(260, 220,
    toon(P(rr(14, 12, 232, 196, 30) + rr(32, 30, 196, 160, 18), 'fill-rule="evenodd" clip-rule="evenodd"'), '#ffffff', { k: 5, shade: '#d6e3f0' }) +
    toon(P('M4 4Q64 4 74 4Q70 110 30 214L4 214Z'), '#ff9fbd', { k: 5 }) +
    toon(P('M256 4Q196 4 186 4Q190 110 230 214L256 214Z'), '#ff9fbd', { k: 5 }) +
    toon(R(0, 0, 260, 16, 8), '#ff7aa3', { k: 3 }));

  // ---- cupcake and smoothie things ----
  D.banana = () => svg(120, 120,
    shadow(64, 104, 44, 6) +
    toon(P('M16 36C24 92 82 112 110 84C114 78 110 72 104 75C80 88 46 74 34 34Z'), '#ffd84a', { k: 5 }) +
    C(20, 34, 6)('#8a6a3a') + C(107, 79, 4)('#8a6a3a') +
    gloss(44, 76, 14, 4, 35, 0.6));

  D.strawberry = () => svg(100, 110,
    toon(P('M50 104C24 90 8 60 12 42C16 26 34 22 50 28C66 22 84 26 88 42C92 60 76 90 50 104Z'), '#ff4b5c', { k: 5 }) +
    [[34, 50], [52, 46], [68, 52], [40, 68], [60, 70], [50, 86], [28, 56]].map(([x, y]) => E(x, y, 2.5, 4)('#ffe08a')).join('') +
    toon(P('M28 30L42 32L50 16L58 32L72 30L64 40L36 40Z'), '#4caf50', { k: 3 }) +
    gloss(32, 44, 7, 4, -30, 0.6));

  D.blueberry = () => svg(100, 100,
    [[34, 62], [66, 62], [50, 36]].map(([x, y]) =>
      toon(C(x, y, 22), '#5b6ee1', { k: 4 }) + C(x + 7, y - 9, 5)('#3a47a8') + gloss(x - 8, y - 6, 5, 3, -30, 0.5)).join(''));

  D.orange = () => svg(100, 100,
    toon(C(50, 50, 42), '#ff9f2e', { k: 5 }) + C(50, 50, 35)('#ffd08a') +
    [0, 45, 90, 135, 180, 225, 270, 315].map(a =>
      `<ellipse cx="50" cy="30" rx="7" ry="15" fill="#ffae45" transform="rotate(${a} 50 50)"/>`).join('') +
    C(50, 50, 5)('#fff3d6') + gloss(34, 28, 9, 4, -30, 0.6));

  D.straw = () => svg(60, 240,
    line('M30 236L30 30Q30 12 48 12', '#ff6fa0', 14) +
    line('M30 236L30 30Q30 12 48 12', '#ffffff', 14, 'stroke-dasharray="4 20"'));

  D.umbrella = () => svg(120, 170,
    line('M60 56L60 166', '#e7b27a', 5) +
    toon(P('M6 62Q60 -12 114 62Q100 50 87 62Q74 50 60 62Q46 50 33 62Q20 50 6 62Z'), '#ff86ad', { k: 4 }) +
    line('M60 24L34 60M60 24L86 60M60 24L60 60', '#ffc2d8', 3) +
    C(60, 22, 5)('#ffd23f'));

  D.mint = () => svg(100, 100,
    `<g transform="rotate(-35 50 60)">${toon(P('M50 12C72 24 76 54 50 76C24 54 28 24 50 12Z'), '#5ccf7a', { k: 4 })}${line('M50 20L50 70', '#a2ecb2', 2.5)}</g>` +
    `<g transform="rotate(35 50 60)">${toon(P('M50 12C72 24 76 54 50 76C24 54 28 24 50 12Z'), '#4cbd6a', { k: 4 })}${line('M50 20L50 70', '#a2ecb2', 2.5)}</g>`);

  D.sprinkles = () => svg(100, 100,
    [[20, 30, 20, '#ff5c8a'], [50, 22, -30, '#5ab4ee'], [70, 44, 60, '#ffd23f'], [30, 58, -50, '#7ad47c'],
     [58, 66, 10, '#b98cf5'], [40, 40, 80, '#ff9d3c'], [76, 20, -10, '#7ad47c'], [16, 74, 40, '#5ab4ee']]
      .map(([x, y, r, c]) => R(x, y, 20, 7, 3.5, `transform="rotate(${r} ${x + 10} ${y + 3.5})"`)(c)).join(''));

  D.cherry = () => svg(100, 110,
    line('M48 50Q52 20 74 8', '#5a8f3a', 5) +
    toon(C(46, 72, 30), '#e53950', { k: 5 }) + gloss(34, 60, 8, 5, -30, 0.7));

  D.candy = () => svg(100, 100,
    [[32, 60, '#5ab4ee'], [68, 60, '#ffd23f'], [50, 32, '#ff5c8a']].map(([x, y, c]) =>
      toon(C(x, y, 20), c, { k: 4 }) + gloss(x - 6, y - 7, 6, 3, -30, 0.7)).join(''));

  // Piping bags, one per frosting colour.
  const FROST = { pink: '#ff8fb8', choc: '#9a6240', mint: '#7fdcb8' };
  for (const [name, c] of Object.entries(FROST)) {
    D[`bag-${name}`] = () => svg(120, 210,
      toon(P('M12 24L108 24L66 172L54 172Z'), light(c, 0.35), { k: 6 }) +
      toon(E(60, 26, 48, 14), c, { k: 3 }) +
      toon(P('M50 168L70 168L66 192L54 192Z'), '#b8c6ce', { k: 2 }) +
      C(60, 198, 7)(c) + gloss(40, 70, 6, 26, -15, 0.5));
  }

  // A pitcher: a glass one shows what is inside, a coloured one shows it at the top.
  function pitcher(body, contents, glass) {
    const cid = id('jug');
    const shape = P('M30 44L130 44L120 184Q118 194 106 194L54 194Q42 194 40 184Z');
    return svg(170, 210,
      shadow(84, 200, 56, 7) +
      toon(P('M126 70Q164 74 160 118Q156 158 118 160L120 144Q142 140 144 116Q146 88 124 86Z'), glass ? '#bfe6fb' : body, { k: 4 }) +
      (glass
        ? `<clipPath id="${cid}">${shape('#000')}</clipPath>` + shape('#e8f7ff') +
          `<g clip-path="url(#${cid})">${R(20, 76, 130, 130, 0)(contents)}${R(20, 76, 130, 10, 0)(light(contents, 0.3))}</g>`
        : toon(shape, body, { k: 7 }) + E(80, 46, 50, 9)(contents)) +
      toon(P('M30 44L6 30L36 64Z'), glass ? '#cfeefd' : body, { k: 2 }) +
      gloss(48, 100, 6, 30, 0, 0.55));
  }
  D.jug = () => pitcher('#7ac8f6', '#fbe3b0', false);
  D['blender-jar'] = () => pitcher(null, '#ff8fb1', true);

  D.shelf = () => svg(320, 170,
    toon(R(30, 44, 54, 84, 16), '#d8f2ff', { k: 4, shade: '#b6dff4' }) + R(30, 84, 54, 44, 0)('#ffb74d') +
    toon(R(26, 34, 62, 18, 8), '#ff7a7a', { k: 3 }) +
    toon(R(104, 58, 48, 70, 14), '#d8f2ff', { k: 4, shade: '#b6dff4' }) + R(104, 94, 48, 34, 0)('#8bd46e') +
    toon(R(100, 48, 56, 16, 8), '#6cc3ff', { k: 3 }) +
    toon(E(214, 68, 22, 36, 'transform="rotate(-20 214 68)"'), '#5cc26a', { k: 4 }) +
    toon(E(248, 60, 22, 40, 'transform="rotate(18 248 60)"'), '#4fb35e', { k: 4 }) +
    toon(E(232, 50, 18, 38), '#6fd17c', { k: 4 }) +
    toon(P('M196 90L266 90L258 132L204 132Z'), '#ff9463', { k: 4 }) +
    gloss(44, 70, 4, 16, 0, 0.7) + gloss(116, 82, 4, 14, 0, 0.7) +
    toon(R(8, 128, 304, 22, 11), '#e39a55', { k: 4 }) +
    shadow(160, 160, 140, 6, 0.1));

  // ---- UI ----
  D.star = () => svg(120, 120,
    toon(P('M60 8L75 42L112 45L84 69L93 106L60 86L27 106L36 69L8 45L45 42Z'), '#ffd23f', { k: 6, shade: '#f5a623' }) +
    gloss(46, 40, 10, 5, -30, 0.7));

  D.heart = () => svg(100, 90,
    toon(P('M50 86C20 64 4 48 4 28C4 12 16 4 28 4C38 4 46 10 50 18C54 10 62 4 72 4C84 4 96 12 96 28C96 48 80 64 50 86Z'), '#ff5c8a', { k: 5 }) +
    gloss(26, 22, 9, 5, -30, 0.7));

  // ---- the customers ----
  // One face kit; each animal is a set of colours plus its ears and markings.
  const ANIMALS = {
    bear:  { fur: '#c68a5c', inner: '#f3c9a0', muzzle: '#f6dcbc', shirt: '#5ab4ee', ink: '#4a2c2a', iris: '#8a5a2b' },
    bunny: { fur: '#fbf5f2', shade: '#e3d2d8', inner: '#ffb3c9', muzzle: '#ffffff', shirt: '#ffcf3f', ink: '#5a3342', iris: '#4a90d9' },
    cat:   { fur: '#9aa0ab', shade: '#7c828e', inner: '#ffb6c4', muzzle: '#e8ebef', shirt: '#46404f', ink: '#3b3844', iris: '#5aa84a' },
    panda: { fur: '#ffffff', shade: '#dde2ea', inner: '#46435a', muzzle: '#ffffff', shirt: '#ff86ad', ink: '#35334a', iris: '#7a5a44' },
  };

  function face(kind, mood) {
    const a = ANIMALS[kind];
    const fur = (s, o = {}) => toon(s, a.fur, { k: 8, shade: a.shade, ...o });
    let s = '';
    // shoulders
    s += toon(E(120, 272, 98, 66), a.shirt, { k: 8 });
    s += toon(P('M92 210Q120 236 148 210L150 222Q120 250 90 222Z'), '#ffffff', { k: 3, shade: '#e1e8f0' });
    // ears (behind the head)
    if (kind === 'bunny') {
      s += fur(E(88, 46, 20, 56, 'transform="rotate(-10 88 46)"')) + E(88, 50, 9, 40, 'transform="rotate(-10 88 50)"')(a.inner);
      s += fur(E(152, 46, 20, 56, 'transform="rotate(10 152 46)"')) + E(152, 50, 9, 40, 'transform="rotate(10 152 50)"')(a.inner);
    } else if (kind === 'cat') {
      s += fur(P('M50 96L58 26L108 64Z')) + P('M62 82L66 44L94 66Z')(a.inner);
      s += fur(P('M190 96L182 26L132 64Z')) + P('M178 82L174 44L146 66Z')(a.inner);
    } else {
      const ear = kind === 'panda' ? a.inner : a.fur;
      s += toon(C(58, 60, 28), ear, { k: 5, shade: kind === 'panda' ? '#2a2838' : a.shade });
      s += toon(C(182, 60, 28), ear, { k: 5, shade: kind === 'panda' ? '#2a2838' : a.shade });
      if (kind === 'bear') s += C(58, 60, 14)(a.inner) + C(182, 60, 14)(a.inner);
    }
    // head
    s += fur(C(120, 128, 82));
    if (kind === 'cat') s += line('M108 58L112 76M120 54L120 74M132 58L128 76', '#727884', 6);
    if (kind === 'panda') {
      s += `<ellipse cx="86" cy="120" rx="22" ry="28" fill="${a.inner}" transform="rotate(25 86 120)"/>`;
      s += `<ellipse cx="154" cy="120" rx="22" ry="28" fill="${a.inner}" transform="rotate(-25 154 120)"/>`;
    }
    // muzzle, cheeks, nose
    s += E(120, 158, kind === 'bunny' ? 28 : 38, kind === 'bunny' ? 22 : 28)(a.muzzle);
    s += E(74, 152, 14, 9)('#ff8fab').replace('/>', ' opacity=".6"/>') + E(166, 152, 14, 9)('#ff8fab').replace('/>', ' opacity=".6"/>');
    const nose = kind === 'bunny' || kind === 'cat' ? '#ff7f9c' : a.ink;
    s += `<path d="M110 142Q120 136 130 142Q128 152 120 154Q112 152 110 142Z" fill="${nose}"/>` + gloss(116, 142, 3, 1.6, 0, 0.7);
    if (kind === 'cat') s += line('M58 152L30 146M58 160L30 164M182 152L210 146M182 160L210 164', '#6c7280', 3);
    // eyes
    const eyeC = kind === 'panda' ? '#1f1d2c' : a.ink;
    if (mood === 'happy') {
      const arc = kind === 'panda' ? '#ffffff' : eyeC;
      s += line('M76 122Q88 106 100 122', arc, 6) + line('M140 122Q152 106 164 122', arc, 6);
    } else {
      // Bimi eyes: a dark rim, a coloured iris, a pupil and two shines. No whites.
      for (const x of [88, 152]) {
        s += E(x, 118, 14, 17)(eyeC) + E(x, 120, 10.5, 13)(a.iris) + E(x, 121, 6, 7.5)('#1f1a2a') +
          C(x + 4, 111, 5)('#fff') + C(x - 4, 126, 2.4)('#fff');
      }
      if (kind !== 'panda') s += line('M78 94Q86 90 94 93M146 93Q154 90 162 94', a.ink, 3.5);
    }
    // mouth
    if (mood === 'happy') {
      s += `<path d="M104 164Q120 162 136 164Q134 192 120 192Q106 192 104 164Z" fill="#8e2f45"/>`;
      s += E(120, 184, 9, 5)('#ff7a90');
      if (kind === 'bunny') s += R(113, 163, 14, 10, 3)('#fff');
    } else {
      s += line('M120 154L120 162M108 164Q114 170 120 162Q126 170 132 164', a.ink, 4);
    }
    return svg(240, 300, s);
  }
  for (const k of Object.keys(ANIMALS)) {
    D[`${k}`] = () => face(k, 'idle');
    D[`${k}-happy`] = () => face(k, 'happy');
  }

  // ---------- URL cache ----------
  const urls = {};
  function url(name) {
    if (!urls[name]) {
      if (!D[name]) throw new Error(`No art named ${name}`);
      urls[name] = URL.createObjectURL(new Blob([D[name]()], { type: 'image/svg+xml' }));
    }
    return urls[name];
  }
  const img = (name, cls = '', style = '') =>
    `<img src="${url(name)}" class="${cls}" style="${style}" alt="" draggable="false">`;

  // ======================================================================================
  // Inline art (parts are animated from the stylesheet)
  // ======================================================================================

  // The mixing bowl. Contents are drawn after the inside and before the front, clipped to the
  // opening, so the front of the bowl hides the lower part of whatever is in it.
  function bowl() {
    const cl = id('bowl');
    const dots = [[70, 250], [130, 280], [200, 292], [270, 280], [330, 250], [100, 214], [300, 214], [165, 250], [235, 250]]
      .map(([x, y]) => C(x, y, 9)('#ffffff').replace('/>', ' opacity=".55"/>')).join('');
    return svg(400, 330,
      shadow(206, 318, 170, 12) +
      E(200, 110, 190, 62)('#3f9bd9') +
      E(200, 114, 176, 52)('#bfe6fb') +
      `<clipPath id="${cl}"><ellipse cx="200" cy="114" rx="176" ry="52"/></clipPath>` +
      `<g clip-path="url(#${cl})">` +
        `<g class="v-flour">${toon(E(150, 124, 80, 40), '#ffffff', { k: 6, shade: '#e4e0ea' })}</g>` +
        `<g class="v-milk">${E(250, 132, 90, 34)('#f4f8ff')}${gloss(230, 118, 30, 6, 0, 0.9)}</g>` +
        `<g class="v-egg">${E(210, 112, 36, 20)('#ffffff')}${toon(C(212, 110, 14), '#ffb627', { k: 3 })}</g>` +
        `<g class="v-sugar">${[[120, 104], [134, 110], [284, 108], [270, 116], [180, 128]].map(([x, y]) => R(x, y, 10, 10, 2)('#ffd6e5')).join('')}</g>` +
        `<g class="v-batter">${E(200, 128, 176, 52)('#fbe3b0')}${gloss(160, 114, 50, 8, 0, 0.5)}</g>` +
        `<g class="v-dough">${E(200, 134, 176, 52)('#f8dca6')}${toon(E(200, 108, 92, 44), '#fbe5b8', { k: 7, shade: '#e9c48a' })}${gloss(166, 90, 22, 8, -10, 0.7)}</g>` +
      `</g>` +
      toon(P('M10 110Q10 318 200 318Q390 318 390 110Q370 172 200 172Q30 172 10 110Z'), '#5ab8f5', { k: 10 }) +
      dots +
      gloss(70, 190, 14, 36, 30, 0.35));
  }

  // The blender. Fruit goes in through the top (lid off) and is whizzed with the lid on:
  // .v-spin turns while it runs, .v-smoothie fades in as it blends. .v-button is the big button.
  function blender() {
    const cl = id('bl');
    const jar = 'M96 58L304 58L278 294L122 294Z';
    const pieces = {
      banana: [[150, 250], [232, 232], [190, 212], [258, 270]].map(([x, y]) => C(x, y, 17)('#ffe27a') + C(x, y, 5)('#e8c24a')).join(''),
      strawberry: [[250, 250], [168, 226], [214, 272]].map(([x, y]) => `<path d="M${x} ${y + 16}C${x - 16} ${y + 6} ${x - 18} ${y - 12} ${x - 8} ${y - 14}C${x - 3} ${y - 15} ${x} ${y - 11} ${x} ${y - 9}C${x} ${y - 11} ${x + 3} ${y - 15} ${x + 8} ${y - 14}C${x + 18} ${y - 12} ${x + 16} ${y + 6} ${x} ${y + 16}Z" fill="#ff4b5c"/>`).join(''),
      blueberry: [[206, 250], [140, 212], [262, 214], [186, 276], [236, 206]].map(([x, y]) => C(x, y, 11)('#5b6ee1') + C(x + 3, y - 4, 3)('#3a47a8')).join(''),
    };
    return svg(400, 420,
      shadow(206, 406, 140, 10) +
      `<path d="${jar}" fill="#e8f7ff" opacity=".95"/>` +
      `<clipPath id="${cl}"><path d="${jar}"/></clipPath>` +
      `<g clip-path="url(#${cl})">` +
        `<rect class="v-milk" x="80" y="226" width="240" height="80" fill="#fbfdff"/>` +
        `<g class="v-spin">` + Object.entries(pieces).map(([k, v]) => `<g class="v-${k}">${v}</g>`).join('') + `</g>` +
        `<g class="v-smoothie">${R(80, 92, 240, 220, 0)('#ff8fb1')}${R(80, 92, 240, 14, 0)('#ffb3cd')}</g>` +
      `</g>` +
      `<path d="M112 70L128 70L138 284L126 284Z" fill="#fff" opacity=".6"/>` +
      toon(R(88, 50, 224, 16, 8), '#cfe9f7', { k: 2 }) +
      `<g class="v-lid">${toon(R(92, 22, 216, 34, 14), '#ff86ad', { k: 4 })}${toon(R(176, 6, 48, 22, 9), '#ff6f9c', { k: 3 })}</g>` +
      toon(R(84, 290, 232, 106, 34), '#5ccfb4', { k: 8 }) +
      `<g class="v-button">${toon(C(200, 344, 30), '#ff5c8a', { k: 5 })}${gloss(190, 334, 9, 5, -30, 0.7)}</g>` +
      C(126, 344, 7)('#ffffff').replace('/>', ' opacity=".7"/>') + C(274, 344, 7)('#ffffff').replace('/>', ' opacity=".7"/>'));
  }

  // The oven, in two layers so the pizza can sit between them: the body and the dark inside
  // behind, the glass door in front. .v-door folds down about its bottom edge.
  function ovenBack() {
    return svg(460, 430,
      shadow(236, 420, 200, 10) +
      toon(R(20, 20, 420, 396, 44), '#ff8c7a', { k: 10 }) +
      toon(R(20, 20, 420, 84, 40), '#ff7462', { k: 4 }) + R(20, 64, 420, 40, 0)('#ff7462') +
      toon(C(88, 62, 22), '#ffffff', { k: 3, shade: '#e0e6ee' }) + R(85, 44, 6, 18, 3)('#ff7462') +
      toon(C(152, 62, 22), '#ffffff', { k: 3, shade: '#e0e6ee' }) + R(149, 44, 6, 18, 3)('#ff7462') +
      `<g class="v-timer">${toon(C(290, 62, 26), '#fff4d6', { k: 3 })}<rect x="287" y="40" width="6" height="24" rx="3" fill="#ff7462"/></g>` +
      `<circle class="v-light" cx="380" cy="62" r="12" fill="#ffd23f"/>` +
      R(60, 132, 340, 248, 28)('#5c3552') +
      `<rect class="v-glow" x="60" y="132" width="340" height="248" rx="28" fill="#ff9d3c"/>` +
      R(76, 300, 308, 8, 4)('#7c4d6c'));
  }
  function ovenDoor() {
    return svg(460, 430,
      `<g class="v-door">` +
        toon(P('M44 124Q44 116 68 116L392 116Q416 116 416 124L416 390Q416 400 392 400L68 400Q44 400 44 390ZM72 144L72 368L388 368L388 144Z', 'fill-rule="evenodd" clip-rule="evenodd"'), '#ffa191', { k: 5 }) +
        `<rect x="72" y="144" width="316" height="224" rx="6" fill="#c7ecff" opacity=".28"/>` +
        `<path d="M110 150L170 150L110 360L80 360Z" fill="#fff" opacity=".22"/>` +
        toon(R(150, 124, 160, 16, 8), '#fff0dc', { k: 2 }) +
      `</g>`);
  }

  function doughBall() {
    return svg(200, 170,
      shadow(104, 150, 86, 16) +
      toon(E(100, 92, 90, 70), '#fbe5b8', { k: 10, shade: '#e8c188' }) +
      gloss(64, 58, 22, 10, -25, 0.7));
  }

  // The pizza is built in three layers: the base (crust, sauce, melt) in one SVG, the toppings
  // as <img> over it, and the cuts plus the "eaten" wedges in a second SVG on top of those.
  function pizzaBase() {
    const clip = id('pz'), bake = id('pzb');
    return svg(400, 400,
      `<defs><clipPath id="${clip}"><circle cx="200" cy="200" r="158"/></clipPath>` +
      `<radialGradient id="${bake}"><stop offset=".55" stop-color="#e59a4a" stop-opacity="0"/><stop offset="1" stop-color="#c46a22" stop-opacity=".55"/></radialGradient></defs>` +
      toon(C(200, 200, 194), '#f3c27c', { k: 10, shade: '#dea060' }) +
      `<g class="p-crust-baked">${toon(C(200, 200, 194), '#e9a55a', { k: 10, shade: '#c9803c' })}</g>` +
      C(200, 200, 160)('#fbe3b0') +
      `<g clip-path="url(#${clip})"><g class="p-sauce"></g>` +
        `<g class="p-sauce-full">${C(200, 200, 160)('#dc3f2e')}` +
        [[150, 140], [250, 170], [180, 260], [270, 250], [120, 220]].map(([x, y]) => C(x, y, 10)('#c4301f')).join('') + `</g>` +
        `<path class="p-melt" d="M200 60C260 64 300 90 318 130C340 170 330 230 310 270C286 320 240 342 200 340C150 344 110 320 88 280C64 240 62 180 82 136C104 92 146 58 200 60Z" fill="#ffd566"/>` +
      `</g>` +
      `<circle class="p-bake" cx="200" cy="200" r="194" fill="url(#${bake})"/>` +
      gloss(110, 88, 34, 10, -40, 0.35));
  }

  // The drawing kit, for the dishes in dishes.js.
  const kit = { C, E, R, P, toon, gloss, shadow, line, svg, id, dark, light };

  return { url, img, bowl, blender, ovenBack, ovenDoor, doughBall, pizzaBase, FROST, kit, names: () => Object.keys(D) };
})();
