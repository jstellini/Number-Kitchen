// The interaction primitives.
//
// A recipe stage names one of these plus its art; the number it asks for arrives in
// `spec.n` from js/range.js. Adding a primitive is one function returning { stop() }
// plus an entry in PRIMITIVES.
//
// Art comes from two places (see tools/build_art.py): anything that repeats is an
// <img> out of assets/art/, so twenty of them cost one rasterisation; vessels are
// inlined from js/vessels.js so their parts can be animated from the stylesheet.
//
// House rules every primitive obeys (see docs/BRIEF.md):
//   * no fail state, no error sound — overshooting is allowed and always reversible
//   * the target numeral stays on screen for the whole stage
//   * ten-frames are fixed at 10 slots, so the frame never gives the answer away;
//     a second frame slides in only once the first is full
//   * animate transform and opacity only — see CLAUDE.md

const Stage = (() => {
  let active = null;

  const $ = s => document.querySelector(s);
  const area = () => $('#stage-area');
  const SVG_NS = 'http://www.w3.org/2000/svg';

  function el(tag, cls, html) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  const itemImg = id => `<img class="art" src="${artUrl(id)}" alt="" draggable="false">`;
  const vesselSvg = id => VESSELS[id] || '';
  const replay = (node, cls) => { if (node) { node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls); } };

  // ---------- shared chrome ----------
  function chrome(spec) {
    const n = spec.n;
    $('#stage-prompt').textContent = (spec.say || '').replace('{n}', n);
    const card = $('#stage-target');
    card.textContent = n;
    card.classList.toggle('two', String(n).length > 1);
    replay(card, 'pulse');

    // Two frames of ten. The second is built but hidden; it slides in when the first
    // fills, which is what makes 13 read as "a full tray and 3 more".
    const wrap = $('#stage-frames');
    wrap.innerHTML = '';
    const frames = [0, 1].map(f => {
      const fr = el('div', 'ten-frame' + (f ? ' second' : ''));
      for (let i = 0; i < 10; i++) fr.appendChild(el('span', 'slot'));
      wrap.appendChild(fr);
      return fr;
    });
    const dots = frames.flatMap(f => Array.from(f.children));

    return {
      tally(k) {
        dots.forEach((d, i) => d.classList.toggle('on', i < k));
        wrap.classList.toggle('wide', k >= 10 || n > 10);
      },
      countUp(k, at) {
        Voice.count(k);
        Sfx.rise(k - 1);
        if (at) Fx.burst(at.x, at.y, '#ffd54f', 8);
      },
      // The number is baked into the clip so the line sounds natural rather than
      // stitched, which is why the key carries it too.
      sayPrompt() { Voice.say((spec.say || '').replace('{n}', n), { key: `${spec.voiceKey || spec.id}-${n}` }); },
    };
  }

  // Every primitive ends the same way: celebrate, count it as evidence, move on.
  // `slips` is how often she overshot or took something back out — zero means she
  // read the numeral rather than arriving by trial and error.
  function finish(spec, slips, started, onDone) {
    const ms = Math.round(performance.now() - started);
    Range.record(spec.n, slips === 0, ms);
    Sfx.correct();
    Fx.confetti(60);
    area().classList.add('done');
    Voice.say(`${spec.n}! Well done!`, { key: `done-${spec.n}` });
    setTimeout(() => { if (active) onDone(); }, 1400);
  }

  // A pointer drag that also works as a plain tap, because a three-year-old's
  // "drag" is often just a poke. Both land the item.
  function draggable(node, { onDrop }) {
    node.addEventListener('pointerdown', e => {
      if (e.button) return;
      e.preventDefault();
      const start = { x: e.clientX, y: e.clientY };
      const ghost = node.cloneNode(true);
      ghost.classList.add('ghost');
      document.body.appendChild(ghost);
      const put = (x, y) => { ghost.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`; };
      put(start.x, start.y);
      try { node.setPointerCapture(e.pointerId); } catch (err) { /* unsupported */ }

      const move = ev => put(ev.clientX, ev.clientY);
      const up = ev => {
        node.removeEventListener('pointermove', move);
        node.removeEventListener('pointerup', up);
        node.removeEventListener('pointercancel', up);
        ghost.remove();
        const moved = Math.hypot(ev.clientX - start.x, ev.clientY - start.y);
        onDrop({ x: ev.clientX, y: ev.clientY, tapped: moved < 12 });
      };
      node.addEventListener('pointermove', move);
      node.addEventListener('pointerup', up);
      node.addEventListener('pointercancel', up);
    });
  }

  const inside = (rect, x, y) => x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;

  // A swipe or a poke on the vessel, whichever she manages. Deliberately forgiving:
  // the number is the point, not the motor precision.
  function onStroke(node, fn) {
    let down = false;
    node.addEventListener('pointerdown', e => { if (!e.button) { e.preventDefault(); down = true; } });
    node.addEventListener('pointerup', e => { if (down) { down = false; fn(e.clientX, e.clientY); } });
    node.addEventListener('pointercancel', () => { down = false; });
  }

  // ---------- count-place ----------
  // Read the numeral, put that many things in the vessel. The spine of the game:
  // the only primitive that trains "see numeral → know quantity" inside the cooking
  // flow itself.
  function countPlace(spec, onDone) {
    const c = chrome(spec);
    const root = area();
    // The vessel class carries where inside the art items may land (see the
    // .v-* rules in style.css) — geometry belongs with the art, not here.
    root.className = 'stage-area count-place v-' + spec.vessel;
    root.innerHTML = `
      <div class="vessel">${vesselSvg(spec.vessel)}<div class="drop"></div></div>
      <div class="supply"></div>`;

    const vessel = root.querySelector('.vessel');
    const drop = root.querySelector('.drop');
    const supply = root.querySelector('.supply');
    let placed = [], slips = 0, running = true;
    const started = performance.now();

    function add(at) {
      if (!running) return;
      const node = el('button', 'item placed', itemImg(spec.item));
      node.setAttribute('aria-label', 'remove');
      // Fly in from roughly where her finger was, so the item goes where she put it
      // rather than fading in from nowhere. One layout read per placement, never in
      // a frame loop.
      drop.appendChild(node);
      if (at) {
        const r = node.getBoundingClientRect();
        node.style.setProperty('--fx', Math.round(at.x - (r.left + r.width / 2)) + 'px');
        node.style.setProperty('--fy', Math.round(at.y - (r.top + r.height / 2)) + 'px');
      }
      placed.push(node);
      c.tally(placed.length);
      c.countUp(placed.length, at);
      Sfx.plop();
      replay(vessel, 'bump');
      if (placed.length > spec.n) slips++;

      // Taking one back out is always available, and never punished.
      node.addEventListener('pointerdown', ev => {
        if (!running) return;
        ev.preventDefault(); ev.stopPropagation();
        slips++;
        node.remove();
        placed = placed.filter(p => p !== node);
        c.tally(placed.length);
        Sfx.lift();
        if (placed.length) Voice.count(placed.length);
      });
      if (placed.length === spec.n) {
        running = false;
        finish(spec, slips, started, onDone);
      }
    }

    // A small shelf of the ingredient. Tapping one or dragging it in both work.
    for (let i = 0; i < 4; i++) {
      const src = el('button', 'item supply-item', itemImg(spec.item));
      draggable(src, { onDrop: ({ x, y, tapped }) => {
        if (tapped || inside(drop.getBoundingClientRect(), x, y)) add({ x, y });
      } });
      supply.appendChild(src);
    }

    setTimeout(() => c.sayPrompt(), 300);
    return { stop() { running = false; } };
  }

  // ---------- count-gesture ----------
  // The recipe's hands-on action, counted as it happens. The utensil is real art and
  // actually travels — a rolling pin rolls across the dough and the dough spreads
  // under it, a spoon goes round the bowl, a spatula tosses the pancake.
  function countGesture(spec, onDone) {
    const c = chrome(spec);
    const root = area();
    root.className = 'stage-area count-gesture g-' + spec.gesture + ' v-' + spec.vessel;
    root.innerHTML = `
      <div class="vessel big">${vesselSvg(spec.vessel)}
        <img class="tool" src="${artUrl(spec.tool)}" alt="" draggable="false">
      </div>
      <p class="hint">Swipe to ${spec.gesture}!</p>`;

    const vessel = root.querySelector('.vessel');
    const tool = root.querySelector('.tool');
    const blob = root.querySelector('.v-blob');
    let count = 0, slips = 0, running = true;
    const started = performance.now();
    const SOUND = { roll: 'roll', stir: 'stir', whisk: 'whisk', spread: 'stir', flip: 'plop' };

    function stroke(x, y) {
      if (!running) return;
      count++;
      c.tally(count);
      c.countUp(count, { x, y });
      (Sfx[SOUND[spec.gesture]] || Sfx.plop)();
      replay(tool, 'go');
      replay(vessel, 'react');
      // Dough actually spreads as it is rolled, so the work shows.
      if (blob) blob.style.setProperty('--spread', (1 + Math.min(count, 10) * 0.022).toFixed(3));
      if (count > spec.n) slips++;
      if (count === spec.n) { running = false; finish(spec, slips, started, onDone); }
    }

    onStroke(vessel, stroke);
    setTimeout(() => c.sayPrompt(), 300);
    return { stop() { running = false; } };
  }

  // ---------- set-dial ----------
  // Replaces the countdown timer the first draft had. A timer is passive — she
  // watches numbers change. Turning a dial to a numeral she has read is active
  // recognition, which is the actual target skill.
  function setDial(spec, onDone) {
    const c = chrome(spec);
    const root = area();
    root.className = 'stage-area set-dial d-' + spec.device;
    root.innerHTML = `
      <div class="vessel big">${vesselSvg(spec.device)}
        <span class="steam"><i></i><i></i><i></i></span>
      </div>
      <div class="dial">
        <button class="knob down" aria-label="down">−</button>
        <div class="readout"><span>0</span></div>
        <button class="knob up" aria-label="up">+</button>
      </div>`;

    const read = root.querySelector('.readout span');
    let value = 0, slips = 0, running = true, settle = 0;
    const started = performance.now();
    const MAXV = 20;

    function set(v) {
      if (!running) return;
      const next = Math.max(0, Math.min(MAXV, v));
      if (next === value) return;
      value = next;
      read.textContent = value;
      replay(read, 'bump');
      c.tally(value);
      Sfx.click();
      Voice.count(value);
      // The appliance works harder the higher it is set, so the dial has a visible
      // consequence rather than only a number changing.
      root.style.setProperty('--heat', (value / MAXV).toFixed(2));
      clearTimeout(settle);
      if (value === spec.n) {
        // A short settle so she sees the number land rather than the screen jumping
        // out from under her finger.
        settle = setTimeout(() => {
          if (!running) return;
          running = false;
          (spec.device === 'blender' ? Sfx.blender : Sfx.ding)();
          root.classList.add('running');
          setTimeout(() => finish(spec, slips, started, onDone), 900);
        }, 500);
      } else if (value > spec.n) slips++;
    }

    root.querySelector('.up').addEventListener('pointerdown', e => { e.preventDefault(); set(value + 1); });
    root.querySelector('.down').addEventListener('pointerdown', e => { e.preventDefault(); slips++; set(value - 1); });

    setTimeout(() => c.sayPrompt(), 300);
    return { stop() { running = false; clearTimeout(settle); } };
  }

  // ---------- cut-into ----------
  // Counts PIECES, not cuts: she watches the piece count, which is the number that
  // matters. One whole thing is already one piece, so each swipe adds one — and the
  // pieces genuinely come apart rather than a line being drawn over the top.
  const CRUST = '#e8c27a', SAUCE = '#d24a32', BREAD = '#e8b877', FILL = '#f7e4bd';
  const INK = '#3a2e2e';

  function wedgePaths(n, gap) {
    // A round thing (pizza) split into n equal wedges, each nudged out along its
    // own bisector so the cuts read as separation, not as drawn lines.
    const cx = 100, cy = 70, r = 66;
    const out = [];
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2 - Math.PI / 2;
      const a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
      const bis = (a0 + a1) / 2;
      const big = (a1 - a0) > Math.PI ? 1 : 0;
      const p = (rr) => `M${cx},${cy} L${(cx + rr * Math.cos(a0)).toFixed(1)},${(cy + rr * Math.sin(a0)).toFixed(1)} `
        + `A${rr},${rr} 0 ${big} 1 ${(cx + rr * Math.cos(a1)).toFixed(1)},${(cy + rr * Math.sin(a1)).toFixed(1)} Z`;
      // Two pepperoni per wedge, along its own bisector, so a cut pizza still looks
      // like the one she topped a moment ago.
      const tops = [0.42, 0.66].map(f => ({
        x: (cx + r * f * Math.cos(bis)).toFixed(1),
        y: (cy + r * f * Math.sin(bis)).toFixed(1),
      }));
      out.push({ crust: p(r), sauce: p(r * 0.82), tops, dx: Math.cos(bis) * gap, dy: Math.sin(bis) * gap });
    }
    return out;
  }

  function stripPaths(n, gap) {
    // A flat thing (sandwich) cut into n strips, spreading apart from the middle.
    const x0 = 28, x1 = 172, y0 = 30, y1 = 112, w = (x1 - x0) / n;
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = x0 + i * w, b = a + w;
      const off = (i - (n - 1) / 2) * gap;
      out.push({
        crust: `M${a.toFixed(1)},${y0 + 10} Q${a.toFixed(1)},${y0} ${(a + 6).toFixed(1)},${y0} `
             + `L${(b - 6).toFixed(1)},${y0} Q${b.toFixed(1)},${y0} ${b.toFixed(1)},${y0 + 10} `
             + `L${b.toFixed(1)},${y1 - 6} Q${b.toFixed(1)},${y1} ${(b - 6).toFixed(1)},${y1} `
             + `L${(a + 6).toFixed(1)},${y1} Q${a.toFixed(1)},${y1} ${a.toFixed(1)},${y1 - 6} Z`,
        sauce: `M${(a + 3).toFixed(1)},${y0 + 22} L${(b - 3).toFixed(1)},${y0 + 22} `
             + `L${(b - 3).toFixed(1)},${y0 + 44} L${(a + 3).toFixed(1)},${y0 + 44} Z`,
        tops: [], dx: off, dy: 0,
      });
    }
    return out;
  }

  function cutInto(spec, onDone) {
    const c = chrome(spec);
    const root = area();
    const strip = spec.shape === 'strip';
    root.className = 'stage-area cut-into ' + (strip ? 'c-strip' : 'c-wedge');
    root.innerHTML = `
      <div class="vessel big cutting">
        ${strip ? vesselSvg('plate') : ''}
        <svg class="pieces" viewBox="0 0 200 140" aria-hidden="true"></svg>
        <img class="tool knife" src="${artUrl('knife')}" alt="" draggable="false">
      </div>
      <p class="hint">Swipe to cut!</p>`;

    const vessel = root.querySelector('.vessel');
    const pieces = root.querySelector('.pieces');
    const knife = root.querySelector('.knife');
    let count = 1, slips = 0, running = true;
    const started = performance.now();

    function draw() {
      // Gap opens up as there are more pieces, but never so far they stop reading as
      // one dish.
      const gap = count < 2 ? 0 : Math.min(5, 1.5 + count * 0.35);
      const parts = strip ? stripPaths(count, gap) : wedgePaths(count, gap);
      pieces.innerHTML = parts.map(p => `
        <g class="piece" transform="translate(${p.dx.toFixed(2)} ${p.dy.toFixed(2)})">
          <path d="${p.crust}" fill="${strip ? BREAD : CRUST}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
          <path d="${p.sauce}" fill="${strip ? FILL : SAUCE}"/>
          ${(p.tops || []).map(o => `<circle cx="${o.x}" cy="${o.y}" r="6" fill="#cc3b2c" stroke="${INK}" stroke-width="2"/>`).join('')}
        </g>`).join('');
    }
    c.tally(count);
    draw();

    function cut(x, y) {
      if (!running) return;
      count++;
      c.tally(count);
      c.countUp(count, { x, y });
      Sfx.chop();
      Fx.crumbs(x, y, strip ? '#e3c58a' : '#d24a32');
      draw();
      replay(knife, 'go');
      replay(pieces, 'split');
      if (count > spec.n) slips++;
      if (count === spec.n) { running = false; finish(spec, slips, started, onDone); }
    }

    onStroke(vessel, cut);
    setTimeout(() => c.sayPrompt(), 300);
    return { stop() { running = false; } };
  }

  // ---------- match-1to1 ----------
  // The strongest mechanic in the design: everyone needs one, and the reason to care
  // is obvious. One-to-one correspondence with a purpose.
  function match1to1(spec, onDone) {
    const c = chrome(spec);
    const root = area();
    root.className = 'stage-area match';
    // A different line-up each time, and nobody twice while the cast can cover it.
    const pool = CAST.slice();
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const guests = Array.from({ length: spec.n }, (_, i) => pool[i % pool.length]);
    root.innerHTML = `
      <div class="guests">${guests.map((g, i) => `
        <div class="guest" data-i="${i}" style="--c:${g.color}">
          <span class="who"><img src="${g.img}" alt="${g.name}" draggable="false"></span>
          <span class="plate"></span>
          <span class="name">${g.name}</span>
        </div>`).join('')}</div>
      <div class="supply"></div>`;

    const supply = root.querySelector('.supply');
    const seats = Array.from(root.querySelectorAll('.guest'));
    let served = 0, slips = 0, running = true;
    const started = performance.now();

    function serve(seat, at) {
      // Serving someone twice isn't an error, it just doesn't feed anyone new.
      if (!running || seat.classList.contains('fed')) { if (running) slips++; return; }
      seat.classList.add('fed');
      seat.querySelector('.plate').innerHTML = itemImg(spec.item);
      served++;
      c.tally(served);
      c.countUp(served, at);
      Sfx.yum();
      if (served === spec.n) { running = false; finish(spec, slips, started, onDone); }
    }

    // Tap a guest to serve them, or drag a portion across from the shelf.
    seats.forEach(seat => seat.addEventListener('pointerdown', e => {
      if (e.button) return;
      e.preventDefault();
      serve(seat, { x: e.clientX, y: e.clientY });
    }));

    for (let i = 0; i < 3; i++) {
      const src = el('button', 'item supply-item', itemImg(spec.item));
      draggable(src, { onDrop: ({ x, y }) => {
        const hit = seats.find(s => inside(s.getBoundingClientRect(), x, y));
        if (hit) serve(hit, { x, y });
      } });
      supply.appendChild(src);
    }

    setTimeout(() => c.sayPrompt(), 300);
    return { stop() { running = false; } };
  }

  const PRIMITIVES = {
    'count-place': countPlace,
    'count-gesture': countGesture,
    'set-dial': setDial,
    'cut-into': cutInto,
    'match-1to1': match1to1,
  };

  // What each primitive can sensibly express. Cutting a sandwich into one piece is
  // not a cut, and nobody wants to hand out seventeen plates.
  const LIMITS = {
    'count-place': { min: 1, max: 20 },
    'count-gesture': { min: 2, max: 12 },
    'set-dial': { min: 1, max: 20 },
    'cut-into': { min: 2, max: 8 },
    'match-1to1': { min: 2, max: 6 },
  };

  return {
    limitsFor: p => LIMITS[p] || { min: 1, max: 20 },
    play(spec, onDone) {
      this.stop();
      area().classList.remove('done');
      const make = PRIMITIVES[spec.primitive];
      if (!make) { console.warn('unknown primitive', spec.primitive); onDone(); return; }
      active = make(spec, onDone);
    },
    stop() {
      if (active && active.stop) active.stop();
      active = null;
      const a = document.querySelector('#stage-area');
      if (a) { a.innerHTML = ''; a.className = 'stage-area'; a.style.cssText = ''; }
    },
  };
})();
