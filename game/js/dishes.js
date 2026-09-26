// The dishes. What is being cooked carries from step to step, so each dish is a small state
// object plus a renderer, and every dish answers the same questions so the steps can be shared:
//
//   blank() / sample()        a fresh state, and a finished one for the menu
//   make(state, w)            an element w px square, drawn from the state
//   place(u, kind)            where a topping dropped at dish point u lands (null = missed)
//   spot(kind)                somewhere good for a topping that was only tapped
//   addTopping(el, state, t)
//   targets, setFill()        the cups/glass that get poured into   (cupcakes, smoothie)
//   frost()                   pipe frosting onto one cup            (cupcakes)
//   bake(el, state)
//   bites(el, state)          a list of functions, one per mouthful, for serving
//
// Positions are in the dish's own 0–400 units, so a dish can be drawn at any size.
const Dishes = (() => {
  const { C, E, R, P, toon, gloss, shadow, line, svg } = Art.kit;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const topHtml = (t, i) => {
    const s = t.s || 64;
    return `<img class="p-top" src="${Art.url(t.kind)}" alt="" draggable="false"${t.cup !== undefined ? ` data-cup="${t.cup}"` : ''} ` +
      `style="left:${(t.x - s / 2) / 4}%;top:${(t.y - s / 2) / 4}%;width:${s / 4}%;height:${s / 4}%;transform:rotate(${t.r || 0}deg)">`;
  };
  function addTopping(el, state, t) {
    state.toppings.push(t);
    const layer = el.querySelector('.p-tops');
    layer.insertAdjacentHTML('beforeend', topHtml(t));
    return layer.lastElementChild;
  }
  function shell(cls, w, body, state) {
    const el = document.createElement('div');
    el.className = `food ${cls}`;
    el.style.width = el.style.height = `${w}px`;
    el.innerHTML = body + `<div class="p-tops">${state.toppings.map(topHtml).join('')}</div>`;
    return el;
  }

  // =====================================================================================
  // Pizza
  // =====================================================================================
  const Pizza = (() => {
    const ANGLES = [0, 45, 90, 135];
    const RAD = 160;                               // radius of the saucy middle

    const blank = () => ({ sauced: false, baked: false, toppings: [], cuts: [] });

    function wedge(i) {
      const a0 = (i * 45 - 90) * Math.PI / 180, a1 = ((i + 1) * 45 - 90) * Math.PI / 180, r = 200;
      const p = a => `${200 + Math.cos(a) * r} ${200 + Math.sin(a) * r}`;
      return `<path class="p-bite" d="M200 200L${p(a0)}A${r} ${r} 0 0 1 ${p(a1)}Z" fill="#fff" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>`;
    }

    // Above the toppings: the cut guides, the cuts, and the wedges that hide eaten slices.
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
      const el = shell('pizza' + (p.sauced ? ' sauced' : '') + (p.baked ? ' baked' : ''), w, Art.pizzaBase(), p);
      el.insertAdjacentHTML('beforeend', overlay(p));
      return el;
    }

    function place(u) {
      const d = Math.hypot(u.x - 200, u.y - 200);
      if (d > RAD + 30) return null;
      const k = Math.min(1, (RAD - 22) / (d || 1));
      return { x: 200 + (u.x - 200) * k, y: 200 + (u.y - 200) * k };
    }
    function spot() {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * (RAD - 30);
      return { x: 200 + Math.cos(a) * r, y: 200 + Math.sin(a) * r };
    }

    function sample() {
      const kinds = ['pepperoni', 'tomato', 'cheese', 'basil', 'mushroom'];
      const p = blank();
      p.sauced = p.baked = true;
      for (let i = 0; i < 16; i++) {
        const a = i * 2.39996, d = 125 * Math.sqrt((i + 0.6) / 16);   // a sunflower spiral
        p.toppings.push({ kind: kinds[i % 5], x: 200 + Math.cos(a) * d, y: 200 + Math.sin(a) * d, r: i * 47 });
      }
      return p;
    }

    return {
      ANGLES, R: RAD, board: true, plate: true,
      blank, sample, make, place, spot, addTopping,
      bake(el, p) { p.baked = true; el.classList.add('baked'); },
      bites: el => [...el.querySelectorAll('.p-bite')].map(b => () => { b.classList.add('on'); Sfx.nom(); }),
    };
  })();

  // =====================================================================================
  // Cupcakes: six in a tray, seen from the front. Each cup is filled, baked into a dome,
  // frosted in the colour she chose and decorated.
  // =====================================================================================
  const Cupcakes = (() => {
    const CUPS = [[80, 176], [200, 176], [320, 176], [80, 300], [200, 300], [320, 300]].map(([x, y]) => ({ x, y }));
    const LINERS = ['#7ac8f6', '#ffb6cf', '#ffd23f'];

    const blank = () => ({ fill: CUPS.map(() => 0), baked: false, frost: CUPS.map(() => null), toppings: [] });

    function cup(c, i) {
      const { x, y } = c, lc = LINERS[i % 3];
      const frost = Object.entries(Art.FROST).map(([name, f]) =>
        `<g class="c-frost f-${name}">` +
          toon(E(x, y - 8, 54, 17), f, { k: 4 }) + toon(E(x, y - 28, 42, 15), f, { k: 4 }) +
          toon(E(x, y - 46, 28, 12), f, { k: 3 }) + toon(P(`M${x - 12} ${y - 52}Q${x} ${y - 76} ${x + 6} ${y - 70}Q${x + 14} ${y - 56} ${x + 12} ${y - 52}Z`), f, { k: 2 }) +
          gloss(x - 22, y - 30, 10, 4, -15, 0.5) +
        `</g>`).join('');
      return `<g class="cup" data-i="${i}">` +
        toon(P(`M${x - 50} ${y}L${x + 50} ${y}L${x + 38} ${y + 72}Q${x} ${y + 80} ${x - 38} ${y + 72}Z`), lc, { k: 5 }) +
        line(`M${x - 25} ${y + 4}L${x - 20} ${y + 72}M${x} ${y + 4}L${x} ${y + 76}M${x + 25} ${y + 4}L${x + 20} ${y + 72}`, Art.kit.light(lc, 0.35), 4) +
        E(x, y, 50, 12)(Art.kit.dark(lc, 0.25)) +
        `<g class="c-batter">${E(x, y - 1, 48, 14)('#fbe3b0')}${gloss(x - 16, y - 5, 12, 3, 0, 0.7)}</g>` +
        `<g class="c-dome">${toon(P(`M${x - 52} ${y + 3}C${x - 52} ${y - 44} ${x + 52} ${y - 44} ${x + 52} ${y + 3}Z`), '#dd9a4e', { k: 5 })}${gloss(x - 22, y - 20, 12, 5, -20, 0.4)}</g>` +
        frost +
      `</g>`;
    }

    function make(s, w) {
      const el = shell('cupcakes' + (s.baked ? ' baked' : ''), w,
        svg(400, 400, shadow(204, 384, 190, 10) + toon(R(10, 200, 380, 184, 44), '#cfd8e3', { k: 8, shade: '#a9b6c4' }) +
          R(30, 214, 340, 150, 34)('#bcc7d4') + CUPS.map(cup).join('')), s);
      s.fill.forEach((v, i) => setFill(el, s, i, v));
      s.frost.forEach((f, i) => f && frost(el, s, i, f));
      return el;
    }

    function setFill(el, s, i, v) {
      s.fill[i] = v;
      const g = el.querySelectorAll('.c-batter')[i];
      g.style.transform = `scale(${v})`;
    }
    function frost(el, s, i, name) {
      s.frost[i] = name;
      el.querySelectorAll('.cup')[i].querySelectorAll('.c-frost').forEach(g => g.classList.toggle('on', g.classList.contains(`f-${name}`)));
    }

    const nearest = u => CUPS.reduce((b, c, i) => (Math.hypot(u.x - c.x, u.y - c.y + 40) < Math.hypot(u.x - CUPS[b].x, u.y - CUPS[b].y + 40) ? i : b), 0);

    function place(u) {
      if (u.x < -40 || u.x > 440 || u.y < -40 || u.y > 440) return null;
      const i = nearest(u), c = CUPS[i];
      return { x: c.x + clamp(u.x - c.x, -26, 26), y: c.y - 44 + clamp(u.y - (c.y - 44), -14, 12), cup: i, s: 52 };
    }
    const spot = () => { const c = CUPS[Math.floor(Math.random() * 6)]; return { x: c.x + (Math.random() - 0.5) * 40, y: c.y - 44 }; };

    function sample() {
      const s = blank(), kinds = ['cherry', 'sprinkles', 'strawberry', 'candy', 'blueberry', 'sprinkles'], names = Object.keys(Art.FROST);
      s.baked = true;
      CUPS.forEach((c, i) => {
        s.fill[i] = 1; s.frost[i] = names[i % 3];
        s.toppings.push({ kind: kinds[i], x: c.x, y: c.y - 58, cup: i, s: 52 });
      });
      return s;
    }

    return {
      CUPS, blank, sample, make, place, spot, addTopping, setFill, frost, nearest,
      targets: CUPS.map(c => ({ x: c.x, y: c.y })),
      bake(el, s) { s.baked = true; el.classList.add('baked'); },
      bites: el => CUPS.map((c, i) => () => {
        el.querySelectorAll('.cup')[i].classList.add('eaten');
        el.querySelectorAll(`.p-top[data-cup="${i}"]`).forEach(t => t.classList.add('eaten'));
        Sfx.nom();
      }),
    };
  })();

  // =====================================================================================
  // Smoothie: a tall glass, poured from the blender, dressed with a straw and an umbrella.
  // =====================================================================================
  const Smoothie = (() => {
    const GLASS = 'M104 92L296 92L270 372Q268 390 250 390L150 390Q132 390 130 372Z';
    const blank = () => ({ fill: [0], toppings: [] });

    function make(s, w) {
      const cl = Art.kit.id('gl');
      const el = shell('smoothie', w, svg(400, 400,
        shadow(204, 392, 100, 8) +
        toon(P(GLASS), '#eaf8ff', { k: 6, shade: '#c3e6f7' }) +
        `<clipPath id="${cl}"><path d="${GLASS}"/></clipPath>` +
        `<g clip-path="url(#${cl})"><g class="s-fill">${R(96, 112, 208, 290, 0)('#ff8fb1')}${R(96, 112, 208, 14, 0)('#ffb3cd')}</g></g>` +
        `<path d="M122 110L140 110L154 370L142 370Z" fill="#fff" opacity=".55"/>` +
        `<ellipse cx="200" cy="92" rx="96" ry="10" fill="none" stroke="#d6f0fb" stroke-width="6"/>`), s);
      setFill(el, s, 0, s.fill[0]);
      return el;
    }
    function setFill(el, s, i, v) {
      s.fill[0] = v;
      el.querySelector('.s-fill').style.transform = `scaleY(${v})`;
    }

    // Straws and umbrellas stand in the drink; fruit sits on the rim; mint floats on top.
    function place(u, kind) {
      if (u.x < -40 || u.x > 440 || u.y < -60 || u.y > 440) return null;
      if (kind === 'straw') return { x: clamp(u.x, 150, 250), y: 60, s: 190, r: (u.x - 200) / 6 };
      if (kind === 'umbrella') return { x: clamp(u.x, 140, 260), y: 44, s: 130, r: (u.x - 200) / 5 };
      if (kind === 'mint') return { x: clamp(u.x, 150, 250), y: 104, s: 60 };
      return { x: u.x < 200 ? 110 : 290, y: 88, s: 76, r: u.x < 200 ? -20 : 20 };
    }
    const spot = () => ({ x: 130 + Math.random() * 140, y: 90 });

    function sample() {
      const s = blank();
      s.fill[0] = 1;
      s.toppings.push({ kind: 'straw', x: 230, y: 60, s: 190, r: 5 }, { kind: 'umbrella', x: 165, y: 44, s: 130, r: -8 },
        { kind: 'orange', x: 290, y: 88, s: 76, r: 20 });
      return s;
    }

    return {
      blank, sample, make, place, spot, addTopping, setFill,
      targets: [{ x: 200, y: 92 }],
      bake() {},
      bites: (el, s) => [0.8, 0.6, 0.4, 0.2, 0].map(v => () => { setFill(el, s, 0, v); Sfx.slurp(); }),
    };
  })();

  return { pizza: Pizza, cupcakes: Cupcakes, smoothie: Smoothie };
})();

// The pizza-only steps (roll, sauce, cut) use it by name.
const Pizza = Dishes.pizza;
