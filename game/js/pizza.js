// The pizza carries from step to step, so it is a small state object plus one renderer.
//
//   { sauced, baked, toppings: [{ kind, x, y, r }], cuts: [angles] }
//
// Positions are in the pizza's own 0–400 units, so the same pizza can be drawn at any size.
// It is three layers: the base SVG (crust, sauce, melted cheese), the toppings as <img>, then
// a second SVG for the cut guides, the cuts and the "eaten" wedges.
const Pizza = (() => {
  const ANGLES = [0, 45, 90, 135];
  const R = 160;                               // radius of the saucy middle, in pizza units

  const blank = () => ({ sauced: false, baked: false, toppings: [], cuts: [] });

  const topHtml = t =>
    `<img class="p-top" src="${Art.url(t.kind)}" alt="" draggable="false" ` +
    `style="left:${(t.x - 32) / 4}%;top:${(t.y - 32) / 4}%;transform:rotate(${t.r}deg)">`;

  function wedge(i) {
    const a0 = (i * 45 - 90) * Math.PI / 180, a1 = ((i + 1) * 45 - 90) * Math.PI / 180, r = 200;
    const p = a => `${200 + Math.cos(a) * r} ${200 + Math.sin(a) * r}`;
    return `<path class="p-bite" d="M200 200L${p(a0)}A${r} ${r} 0 0 1 ${p(a1)}Z" fill="#fff" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>`;
  }

  function overlay(p) {
    return `<svg class="p-over" viewBox="0 0 400 400">` +
      ANGLES.map(a => `<g transform="rotate(${a} 200 200)">` +
        `<line class="p-guide${p.cuts.includes(a) ? ' gone' : ''}" x1="22" y1="200" x2="378" y2="200"/>` +
        `<rect class="p-cut${p.cuts.includes(a) ? ' on' : ''}" data-a="${a}" x="10" y="197" width="380" height="6" rx="3"/>` +
      `</g>`).join('') +
      [0, 1, 2, 3, 4, 5, 6, 7].map(wedge).join('') +
      `</svg>`;
  }

  function make(p, w) {
    const el = document.createElement('div');
    el.className = 'pizza' + (p.sauced ? ' sauced' : '') + (p.baked ? ' baked' : '');
    el.style.width = el.style.height = `${w}px`;
    el.innerHTML = Art.pizzaBase() + `<div class="p-tops">${p.toppings.map(topHtml).join('')}</div>` + overlay(p);
    return el;
  }

  function addTopping(el, p, t) {
    p.toppings.push(t);
    el.querySelector('.p-tops').insertAdjacentHTML('beforeend', topHtml(t));
    return el.querySelector('.p-tops').lastElementChild;
  }

  // A finished pizza for the menu and the start screen.
  function sample() {
    const kinds = ['pepperoni', 'mushroom', 'olive', 'basil', 'cheese'];
    const p = blank();
    p.sauced = p.baked = true;
    for (let i = 0; i < 16; i++) {
      const a = i * 2.39996, d = 125 * Math.sqrt((i + 0.6) / 16);   // a sunflower spiral
      p.toppings.push({ kind: kinds[i % 5], x: 200 + Math.cos(a) * d, y: 200 + Math.sin(a) * d, r: i * 47 });
    }
    return p;
  }

  return { ANGLES, R, blank, make, addTopping, sample };
})();
