// The interaction primitives.
//
// A recipe stage names one of these plus its art; the number it asks for arrives in
// `spec.n` from js/range.js. Adding a primitive is one function returning { stop() }
// plus an entry in PRIMITIVES.
//
// House rules every primitive obeys (see docs/BRIEF.md):
//   * no fail state, no error sound — overshooting is allowed and always reversible
//   * the target numeral stays on screen for the whole stage
//   * ten-frames are fixed at 10 slots, so the frame never gives the answer away;
//     a second frame slides in only once the first is full

const Stage = (() => {
  let active = null;

  const $ = s => document.querySelector(s);
  const area = () => $('#stage-area');

  function el(tag, cls, html) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  const itemSvg = id => `<svg viewBox="0 0 100 100" aria-hidden="true">${ART[id] || ''}</svg>`;
  const dishSvg = id => `<svg viewBox="0 0 200 140" aria-hidden="true">${DISH_ART[id] || ''}</svg>`;
  const centre = e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };

  // ---------- shared chrome ----------
  // Prompt, the target numeral card, and the ten-frame tally. Returns the handles a
  // primitive needs to drive them.
  function chrome(spec) {
    const n = spec.n;
    $('#stage-prompt').textContent = (spec.say || '').replace('{n}', n);
    const card = $('#stage-target');
    card.textContent = n;
    card.classList.toggle('two', String(n).length > 1);
    card.classList.remove('pulse'); void card.offsetWidth; card.classList.add('pulse');

    // Two frames of ten. The second is built but hidden; it slides in when the
    // first fills, which is what makes 13 read as "a full tray and 3 more".
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
      // Fill the tally to `k` and reveal the second frame once the first is full.
      tally(k) {
        dots.forEach((d, i) => d.classList.toggle('on', i < k));
        wrap.classList.toggle('wide', k >= 10 || n > 10);
      },
      // The count-along: a number spoken, a rung of the scale, a sparkle.
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
      <div class="vessel">${dishSvg(spec.vessel)}<div class="drop"></div></div>
      <div class="supply"></div>`;

    const drop = root.querySelector('.drop');
    const supply = root.querySelector('.supply');
    let placed = [], slips = 0, running = true;
    const started = performance.now();

    // The drop zone is a five-column grid, mirroring a ten-frame row. Items are
    // plain children, so removing one reflows the rest for free and there is no
    // per-item positioning to get wrong. (Percentages in a `transform` resolve
    // against the element's own box, not its container — which is exactly the trap
    // this replaced.)
    function add(at) {
      if (!running) return;
      const node = el('button', 'item placed', itemSvg(spec.item));
      node.setAttribute('aria-label', 'remove');
      drop.appendChild(node);
      placed.push(node);
      c.tally(placed.length);
      c.countUp(placed.length, at);
      Sfx.plop();
      // Overshooting is allowed — the counter simply reads high against the target.
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
      const src = el('button', 'item supply-item', itemSvg(spec.item));
      draggable(src, { onDrop: ({ x, y, tapped }) => {
        if (tapped || inside(drop.getBoundingClientRect(), x, y)) add({ x, y });
      } });
      supply.appendChild(src);
    }

    setTimeout(() => c.sayPrompt(), 300);
    return { stop() { running = false; } };
  }

  // ---------- count-gesture ----------
  // The recipe's hands-on action, counted as it happens. Any swipe or poke on the
  // vessel counts — deliberately forgiving, since the number is the point, not the
  // motor precision.
  function countGesture(spec, onDone) {
    const c = chrome(spec);
    const root = area();
    root.className = 'stage-area count-gesture g-' + spec.gesture;
    root.innerHTML = `
      <div class="vessel big">${dishSvg(spec.vessel)}<div class="tool"></div></div>
      <p class="hint">Swipe to ${spec.gesture}!</p>`;

    const vessel = root.querySelector('.vessel');
    const tool = root.querySelector('.tool');
    let count = 0, slips = 0, running = true, down = null;
    const started = performance.now();
    const SOUND = { roll: 'roll', stir: 'stir', whisk: 'whisk', spread: 'stir', flip: 'plop' };

    function stroke(x, y) {
      if (!running) return;
      count++;
      c.tally(count);
      c.countUp(count, { x, y });
      (Sfx[SOUND[spec.gesture]] || Sfx.plop)();
      tool.classList.remove('go'); void tool.offsetWidth; tool.classList.add('go');
      if (count > spec.n) slips++;
      if (count === spec.n) { running = false; finish(spec, slips, started, onDone); }
    }

    vessel.addEventListener('pointerdown', e => { if (!e.button) { e.preventDefault(); down = { x: e.clientX, y: e.clientY }; } });
    vessel.addEventListener('pointerup', e => { if (down) { stroke(e.clientX, e.clientY); down = null; } });
    vessel.addEventListener('pointercancel', () => { down = null; });

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
      <div class="vessel big">${dishSvg(spec.device)}</div>
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
      read.classList.remove('bump'); void read.offsetWidth; read.classList.add('bump');
      c.tally(value);
      Sfx.click();
      Voice.count(value);
      clearTimeout(settle);
      if (value === spec.n) {
        // A short settle so she sees the number land rather than the screen
        // jumping out from under her finger.
        settle = setTimeout(() => {
          if (!running) return;
          running = false;
          (spec.device === 'blender' ? Sfx.blender : Sfx.ding)();
          root.classList.add('running');
          setTimeout(() => finish(spec, slips, started, onDone), 700);
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
  // matters. One whole thing is already one piece, so each swipe adds one.
  function cutInto(spec, onDone) {
    const c = chrome(spec);
    const root = area();
    root.className = 'stage-area cut-into';
    root.innerHTML = `
      <div class="vessel big cutting">${dishSvg(spec.vessel)}<svg class="cuts" viewBox="0 0 200 140"></svg></div>
      <p class="hint">Swipe to cut!</p>`;

    const vessel = root.querySelector('.vessel');
    const cuts = root.querySelector('.cuts');
    let pieces = 1, slips = 0, running = true, down = null;
    const started = performance.now();

    // Redraw as `pieces` equal wedges each time, so the cut always looks deliberate.
    function draw() {
      cuts.innerHTML = '';
      if (pieces < 2) return;
      for (let i = 0; i < pieces; i++) {
        const a = (i / pieces) * Math.PI * 2 - Math.PI / 2;
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', 100); line.setAttribute('y1', 70);
        line.setAttribute('x2', 100 + Math.cos(a) * 70);
        line.setAttribute('y2', 70 + Math.sin(a) * 52);
        line.setAttribute('class', 'cut');
        cuts.appendChild(line);
      }
    }
    c.tally(pieces);
    draw();

    function cut(x, y) {
      if (!running) return;
      pieces++;
      c.tally(pieces);
      c.countUp(pieces, { x, y });
      Sfx.chop();
      Fx.crumbs(x, y);
      draw();
      vessel.classList.remove('shake'); void vessel.offsetWidth; vessel.classList.add('shake');
      if (pieces > spec.n) slips++;
      if (pieces === spec.n) { running = false; finish(spec, slips, started, onDone); }
    }

    vessel.addEventListener('pointerdown', e => { if (!e.button) { e.preventDefault(); down = true; } });
    vessel.addEventListener('pointerup', e => { if (down) { cut(e.clientX, e.clientY); down = false; } });
    vessel.addEventListener('pointercancel', () => { down = false; });

    setTimeout(() => c.sayPrompt(), 300);
    return { stop() { running = false; } };
  }

  // ---------- match-1to1 ----------
  // The strongest mechanic in the design: everyone needs one, and the reason to
  // care is obvious. One-to-one correspondence with a purpose.
  function match1to1(spec, onDone) {
    const c = chrome(spec);
    const root = area();
    root.className = 'stage-area match';
    const guests = Array.from({ length: spec.n }, (_, i) => CAST[i % CAST.length]);
    root.innerHTML = `
      <div class="guests">${guests.map((g, i) => `
        <div class="guest" data-i="${i}" style="--c:${g.color}">
          <span class="face"><svg viewBox="0 0 100 100">
            <circle cx="50" cy="54" r="34" fill="${g.color}"/>
            <circle cx="39" cy="48" r="5" fill="#2b2b2b"/><circle cx="61" cy="48" r="5" fill="#2b2b2b"/>
            <path d="M38 66 q12 10 24 0" stroke="#2b2b2b" stroke-width="4" fill="none" stroke-linecap="round"/>
          </svg></span>
          <span class="plate"></span>
          <span class="name">${g.name}</span>
        </div>`).join('')}</div>
      <div class="supply"></div>`;

    const supply = root.querySelector('.supply');
    const seats = Array.from(root.querySelectorAll('.guest'));
    let served = 0, slips = 0, running = true;
    const started = performance.now();

    function serve(seat, at) {
      if (!running || seat.classList.contains('fed')) { if (running) slips++; return; }
      seat.classList.add('fed');
      seat.querySelector('.plate').innerHTML = itemSvg(spec.item);
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
      const src = el('button', 'item supply-item', itemSvg(spec.item));
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
      if (a) { a.innerHTML = ''; a.className = 'stage-area'; }
    },
  };
})();
