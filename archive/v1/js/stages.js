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

  // ---------- the shell ----------
  // Two thirds dish, one third bench. The food is what she is looking at, so it gets
  // the room; the thing she takes from and the number she has to read sit together
  // on the bench below, where her hands are.
  function shell(spec, dishHtml, sourceHtml) {
    return sceneHtml(spec) + `
      <div class="dish">${dishHtml}</div>
      <div class="bench">
        <p class="prompt" id="stage-prompt"></p>
        <div class="bench-row">
          <div class="source">${sourceHtml || ''}</div>
          <button class="target" id="stage-target"></button>
          <div class="frames" id="stage-frames"></div>
        </div>
      </div>`;
  }

  // What is in the bowl carries across the stages of one recipe: the flour she
  // scooped is still there when she cracks the eggs into it. App resets it per recipe.
  let carry = { fill: 0 };
  // `instant` for the level a stage inherits: what she poured in last time is
  // already there, it does not pour itself in again as the stage opens.
  function setFill(root, v, instant) {
    carry.fill = Math.max(0, Math.min(1, v));
    const f = root.querySelector('.v-fill');
    if (!f) return;
    if (instant) f.style.transition = 'none';
    f.style.setProperty('--fill', carry.fill.toFixed(3));
    if (instant) { void f.getBoundingClientRect(); f.style.transition = ''; }
  }

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
  const centreOf = node => { const r = node.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };

  // Take something OUT of a source and carry it somewhere — a cup out of the flour
  // bag, an egg out of the carton. What you pick up is not what you pressed, which
  // is the difference between scooping and tapping a shelf.
  //
  // A plain tap still works: the thing flies over on its own. A three-year-old who
  // has not got the hang of dragging yet must not be locked out of the game.
  function dragOut(node, ghostHtml, onLand) {
    node.addEventListener('pointerdown', e => {
      if (e.button) return;
      e.preventDefault();
      const ghost = el('div', 'carried', ghostHtml);
      document.body.appendChild(ghost);
      const put = (x, y) => { ghost.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`; };
      const start = { x: e.clientX, y: e.clientY };
      put(start.x, start.y);
      node.classList.add('taking');
      try { node.setPointerCapture(e.pointerId); } catch (err) { /* unsupported */ }

      const move = ev => put(ev.clientX, ev.clientY);
      const up = ev => {
        node.removeEventListener('pointermove', move);
        node.removeEventListener('pointerup', up);
        node.removeEventListener('pointercancel', up);
        node.classList.remove('taking');
        const tapped = Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < 12;
        onLand({ x: ev.clientX, y: ev.clientY, tapped, ghost, put });
      };
      node.addEventListener('pointermove', move);
      node.addEventListener('pointerup', up);
      node.addEventListener('pointercancel', up);
    });
  }

  // The kitchen behind the stage: a patterned wall, a worktop, a board under the
  // vessel and a few props on the side. All CSS gradients plus a handful of <img>,
  // so it costs one rasterisation and nothing per frame.
  function sceneHtml(spec) {
    const sc = spec.scene || {};
    const props = (sc.props || []).map((id, i) =>
      `<img class="prop p${i}" src="${artUrl(id)}" alt="" draggable="false">`).join('');
    return `<div class="scene p-${sc.pattern || 'tile'}" aria-hidden="true"
              style="--wall:${sc.wall || '#ffd9c4'};--counter:${sc.counter || '#c58a52'}">
        <span class="wall"></span><span class="counter"></span>
        ${spec.vessel ? '<span class="board"></span>' : ''}
        <span class="props">${props}</span>
      </div>`;
  }

  // A cartoon hand that shows the gesture when she has been still for a few seconds.
  // It is a demonstrator, not a cursor — it never competes with her finger, and a
  // three-year-old cannot read "Swipe to roll!", which is what this replaces.
  function idleDemo(root, kind) {
    const hand = el('img', 'demo-hand d-' + kind);
    hand.src = artUrl('hand');
    hand.alt = '';
    hand.draggable = false;
    root.appendChild(hand);
    let timer = 0, alive = true;
    const fire = () => {
      if (!alive) return;
      replay(hand, 'show');
      timer = setTimeout(fire, 7000);
    };
    const arm = () => { clearTimeout(timer); if (alive) timer = setTimeout(fire, 4200); };
    arm();
    return { poke: arm, stop() { alive = false; clearTimeout(timer); hand.remove(); } };
  }

  // A swipe or a poke on the vessel, whichever she manages. Deliberately forgiving:
  // the number is the point, not the motor precision.
  function onStroke(node, fn) {
    let down = false;
    node.addEventListener('pointerdown', e => { if (!e.button) { e.preventDefault(); down = true; } });
    node.addEventListener('pointerup', e => { if (down) { down = false; fn(e.clientX, e.clientY); } });
    node.addEventListener('pointercancel', () => { down = false; });
  }

  // How many rows of ingredients each vessel can hold before they stop looking like
  // they are inside it. Deep-but-narrow vessels get fewer rows and more columns.
  const DEPTH = { bowl: 3, blender: 3, dough: 3, pizza: 3, plate: 2, tray: 2, pan: 2, oven: 2 };

  // ---------- scoop-bag ----------
  // A sack of flour on the bench. Press it and a heaped cup comes away in your hand;
  // carry it to the bowl and tip it in. The bowl fills as you go, so the count is
  // visible in the dish and not only in the tally.
  function scoopBag(spec, onDone) {
    const root = area();
    root.className = 'stage-area scoop-bag v-bowl';
    root.innerHTML = shell(spec, `<div class="vessel">${vesselSvg('bowl')}</div>`,
      `<img class="bag" src="${artUrl('flour-bag')}" alt="" draggable="false">`);
    const c = chrome(spec);

    const dish = root.querySelector('.dish');
    const vessel = root.querySelector('.vessel');
    const bag = root.querySelector('.bag');
    let count = 0, slips = 0, running = true;
    const started = performance.now();
    const base = carry.fill;
    setFill(root, base, true);
    const demo = idleDemo(root, 'place');

    function pourIn(ghost, at) {
      ghost.classList.add('pour');
      Sfx.pour();
      setTimeout(() => ghost.remove(), 520);
      count++;
      demo.poke();
      c.tally(count);
      c.countUp(count, at);
      Fx.crumbs(at.x, at.y, '#fffaf0', 14);
      replay(vessel, 'bump');
      // Fill the bowl to about two thirds over the whole stage, whatever the target.
      setFill(root, base + (1 - base) * 0.66 * (count / spec.n));
      if (count > spec.n) slips++;
      if (count === spec.n) { running = false; demo.stop(); finish(spec, slips, started, onDone); }
    }

    dragOut(bag, `<img src="${artUrl('scoop')}" alt="">`, ({ x, y, tapped, ghost, put }) => {
      if (!running) { ghost.remove(); return; }
      const box = vessel.getBoundingClientRect();
      if (inside(box, x, y)) { pourIn(ghost, { x, y }); return; }
      if (tapped) {
        // A tap sends the cup over by itself, then tips it in.
        const to = centreOf(vessel);
        ghost.classList.add('fly');
        put(to.x, to.y);
        setTimeout(() => { if (running) pourIn(ghost, to); else ghost.remove(); }, 420);
        return;
      }
      ghost.classList.add('drop-away');       // carried somewhere that isn't the bowl
      setTimeout(() => ghost.remove(), 300);
    });

    setTimeout(() => c.sayPrompt(), 300);
    return { stop() { running = false; demo.stop(); } };
  }

  // ---------- crack-eggs ----------
  // A carton of six. Lift one out, carry it to the bowl, and it breaks over the rim:
  // the shell comes apart and the yolk drops in. The carton refills when it empties.
  function crackEggs(spec, onDone) {
    const root = area();
    root.className = 'stage-area crack-eggs v-bowl';
    const eggs = Array.from({ length: 6 }, (_, i) =>
      `<img class="egg e${i}" src="${artUrl('egg-whole')}" alt="" draggable="false">`).join('');
    root.innerHTML = shell(spec, `<div class="vessel">${vesselSvg('bowl')}</div>`,
      `<span class="carton"><img class="box" src="${artUrl('egg-carton')}" alt="" draggable="false">${eggs}</span>`);
    const c = chrome(spec);

    const vessel = root.querySelector('.vessel');
    const shelfEggs = Array.from(root.querySelectorAll('.source .egg'));
    let count = 0, slips = 0, running = true;
    const started = performance.now();
    const base = carry.fill;
    setFill(root, base, true);
    const demo = idleDemo(root, 'place');

    function refillIfEmpty() {
      if (shelfEggs.some(e => !e.classList.contains('gone'))) return;
      setTimeout(() => shelfEggs.forEach((e, i) => {
        setTimeout(() => { e.classList.remove('gone'); replay(e, 'arrive'); }, i * 70);
      }), 260);
    }

    function crack(at, ghost) {
      ghost.remove();
      // Two halves fly apart where it broke, and the yolk goes in.
      const bits = el('div', 'crack-bits');
      bits.style.left = at.x + 'px';
      bits.style.top = at.y + 'px';
      bits.innerHTML = `<img class="half l" src="${artUrl('shell-l')}" alt="">`
        + `<img class="half r" src="${artUrl('shell-r')}" alt="">`
        + `<span class="yolk"></span>`;
      document.body.appendChild(bits);
      setTimeout(() => bits.remove(), 700);
      Sfx.crack();
      count++;
      demo.poke();
      c.tally(count);
      c.countUp(count, at);
      replay(vessel, 'bump');
      setFill(root, base + (1 - base) * 0.5 * (count / spec.n));
      if (count > spec.n) slips++;
      if (count === spec.n) { running = false; demo.stop(); finish(spec, slips, started, onDone); }
    }

    shelfEggs.forEach(eggEl => dragOut(eggEl, `<img src="${artUrl('egg-whole')}" alt="">`,
      ({ x, y, tapped, ghost, put }) => {
        if (!running || eggEl.classList.contains('gone')) { ghost.remove(); return; }
        const box = vessel.getBoundingClientRect();
        const land = to => { eggEl.classList.add('gone'); refillIfEmpty(); crack(to, ghost); };
        if (inside(box, x, y)) { land({ x, y }); return; }
        if (tapped) {
          const to = centreOf(vessel);
          ghost.classList.add('fly');
          put(to.x, to.y);
          setTimeout(() => { if (running) land(to); else ghost.remove(); }, 420);
          return;
        }
        ghost.classList.add('drop-away');
        setTimeout(() => ghost.remove(), 300);
      }));

    setTimeout(() => c.sayPrompt(), 300);
    return { stop() { running = false; demo.stop(); } };
  }

  // ---------- stir-bowl ----------
  // Drag the whisk round and round. A whole turn is one stir, so it is the circling
  // that counts rather than a tap — and it is forgiving: 300 degrees will do.
  function stirBowl(spec, onDone) {
    const root = area();
    root.className = 'stage-area stir-bowl v-bowl';
    root.innerHTML = shell(spec,
      `<div class="vessel">${vesselSvg('bowl')}
         <img class="whisk" src="${artUrl(spec.tool || 'whisk')}" alt="" draggable="false">
       </div>`, '');
    const c = chrome(spec);

    const dish = root.querySelector('.dish');
    const vessel = root.querySelector('.vessel');
    const whisk = root.querySelector('.whisk');
    const fillEl = root.querySelector('.v-fill');
    let count = 0, slips = 0, running = true;
    let turning = false, lastA = 0, swept = 0, angle = 0;
    const started = performance.now();
    setFill(root, Math.max(carry.fill, 0.45), true);
    const demo = idleDemo(root, 'stir');

    const TURN = 300;                          // degrees that count as one stir
    // The whisk goes round inside the bowl, so the orbit is a fraction of the bowl,
    // not of the whisk's own height. One layout read, at stage start.
    const R = Math.round(vessel.getBoundingClientRect().width * 0.12);
    // Orbit without spin: the counter-rotation keeps the whisk upright as it goes
    // round. Without it the handle swings down through the side of the bowl.
    const place = deg => {
      whisk.style.transform = `translate(-50%, -50%) rotate(${deg}deg) translateY(${-R}px) rotate(${-deg}deg)`;
    };
    place(0);

    const angleAt = (x, y) => {
      const c0 = centreOf(vessel);
      return Math.atan2(y - c0.y, x - c0.x) * 180 / Math.PI;
    };

    function begin(e) {
      if (!running) return;
      e.preventDefault();
      turning = true;
      lastA = angleAt(e.clientX, e.clientY);
      whisk.classList.add('held');
      demo.poke();
    }
    function turn(e) {
      if (!turning || !running) return;
      const a = angleAt(e.clientX, e.clientY);
      let d = a - lastA;
      while (d > 180) d -= 360;                // shortest way round, so the wrap at
      while (d < -180) d += 360;               // ±180 does not read as a huge sweep
      lastA = a;
      angle += d;
      swept += Math.abs(d);
      place(angle);
      if (swept >= TURN) {
        swept -= TURN;
        count++;
        c.tally(count);
        c.countUp(count, { x: e.clientX, y: e.clientY });
        Sfx.stir();
        replay(vessel, 'react');
        if (fillEl) replay(fillEl, 'slosh');
        if (count > spec.n) slips++;
        if (count === spec.n) { running = false; turning = false; demo.stop(); finish(spec, slips, started, onDone); }
      }
    }
    const end = () => { turning = false; whisk.classList.remove('held'); };

    dish.addEventListener('pointerdown', begin);
    dish.addEventListener('pointermove', turn);
    dish.addEventListener('pointerup', end);
    dish.addEventListener('pointercancel', end);

    setTimeout(() => c.sayPrompt(), 300);
    return { stop() { running = false; demo.stop(); } };
  }

  // ---------- count-place ----------
  // Read the numeral, put that many things in the vessel. The spine of the game:
  // the only primitive that trains "see numeral → know quantity" inside the cooking
  // flow itself.
  function countPlace(spec, onDone) {
    const root = area();
    // The vessel class carries where inside the art items may land (see the
    // .v-* rules in style.css) — geometry belongs with the art, not here.
    root.className = 'stage-area count-place v-' + spec.vessel;
    root.innerHTML = shell(spec,
      `<div class="vessel">${vesselSvg(spec.vessel)}<div class="drop"></div></div>`,
      `<button class="item supply-item">${itemImg(spec.item)}</button>`);
    const c = chrome(spec);

    const vessel = root.querySelector('.vessel');
    const drop = root.querySelector('.drop');
    // Lay the vessel's contents out to suit the count AND the vessel's shape: two
    // big scoops read as two big scoops, twenty read as a full bowl. Rows are capped
    // per vessel because a bowl seen from the side narrows towards the bottom — a
    // square grid of twenty spilled straight out of it.
    const rowCap = DEPTH[spec.vessel] || 3;
    const cols = Math.min(7, Math.max(2, Math.ceil(spec.n / rowCap)));
    drop.style.setProperty('--cols', cols);
    drop.style.setProperty('--rows', Math.ceil(spec.n / cols));
    let placed = [], slips = 0, running = true;
    const started = performance.now();
    const demo = idleDemo(root, 'place');

    function add(at) {
      if (!running) return;
      demo.poke();
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
        demo.poke();
        Sfx.lift();
        if (placed.length) Voice.count(placed.length);
      });
      if (placed.length === spec.n) {
        running = false;
        demo.stop();
        finish(spec, slips, started, onDone);
      }
    }

    // One source on the bench. Tapping it or dragging from it both place an item.
    draggable(root.querySelector('.supply-item'), { onDrop: ({ x, y, tapped }) => {
      if (tapped || inside(drop.getBoundingClientRect(), x, y)) add({ x, y });
    } });

    setTimeout(() => c.sayPrompt(), 300);
    return { stop() { running = false; demo.stop(); } };
  }

  // ---------- count-gesture ----------
  // The recipe's hands-on action, counted as it happens. The utensil is real art and
  // actually travels — a rolling pin rolls across the dough and the dough spreads
  // under it, a spoon goes round the bowl, a spatula tosses the pancake.
  function countGesture(spec, onDone) {
    const root = area();
    root.className = 'stage-area count-gesture g-' + spec.gesture + ' v-' + spec.vessel;
    // The rig translates, the tool inside it spins: a rolling pin should turn while
    // the hand holding it does not.
    root.innerHTML = shell(spec, `
      <div class="vessel big">${vesselSvg(spec.vessel)}
        <span class="tool-rig">
          <img class="tool" src="${artUrl(spec.tool)}" alt="" draggable="false">
          <img class="grip" src="${artUrl('hand-grip')}" alt="" draggable="false">
        </span>
      </div>`, '');
    const c = chrome(spec);

    const vessel = root.querySelector('.vessel');
    const rig = root.querySelector('.tool-rig');
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
      replay(rig, 'go');
      replay(tool, 'spin');
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
    const root = area();
    root.className = 'stage-area set-dial d-' + spec.device;
    root.innerHTML = shell(spec, `
      <div class="vessel big">${vesselSvg(spec.device)}
        <span class="steam"><i></i><i></i><i></i></span>
      </div>`, `
      <div class="dial">
        <button class="knob down" aria-label="down">−</button>
        <div class="readout"><span>0</span></div>
        <button class="knob up" aria-label="up">+</button>
      </div>`);
    const c = chrome(spec);

    const read = root.querySelector('.readout span');
    let value = 0, slips = 0, running = true, settle = 0;
    const started = performance.now();
    const MAXV = 20;
    const demo = idleDemo(root, 'dial');

    function set(v) {
      if (!running) return;
      const next = Math.max(0, Math.min(MAXV, v));
      if (next === value) return;
      demo.poke();
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
          demo.stop();
          (spec.device === 'blender' ? Sfx.blender : Sfx.ding)();
          root.classList.add('running');
          setTimeout(() => finish(spec, slips, started, onDone), 900);
        }, 500);
      } else if (value > spec.n) slips++;
    }

    root.querySelector('.up').addEventListener('pointerdown', e => { e.preventDefault(); set(value + 1); });
    root.querySelector('.down').addEventListener('pointerdown', e => { e.preventDefault(); slips++; set(value - 1); });

    setTimeout(() => c.sayPrompt(), 300);
    return { stop() { running = false; clearTimeout(settle); demo.stop(); } };
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
    const root = area();
    const strip = spec.shape === 'strip';
    root.className = 'stage-area cut-into ' + (strip ? 'c-strip' : 'c-wedge');
    root.innerHTML = shell(spec, `
      <div class="vessel big cutting">
        ${strip ? vesselSvg('plate') : ''}
        <svg class="pieces" viewBox="0 0 200 140" aria-hidden="true"></svg>
        <span class="tool-rig knife-rig">
          <img class="tool knife" src="${artUrl('knife')}" alt="" draggable="false">
          <img class="grip" src="${artUrl('hand-grip')}" alt="" draggable="false">
        </span>
      </div>`, '');
    const c = chrome(spec);

    const vessel = root.querySelector('.vessel');
    const pieces = root.querySelector('.pieces');
    const knifeRig = root.querySelector('.knife-rig');
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
      replay(knifeRig, 'go');
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
    const root = area();
    root.className = 'stage-area match';
    // A different line-up each time, and nobody twice while the cast can cover it.
    const pool = CAST.slice();
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const guests = Array.from({ length: spec.n }, (_, i) => pool[i % pool.length]);
    root.innerHTML = shell(spec, `
      <div class="guests">${guests.map((g, i) => `
        <div class="guest" data-i="${i}" style="--c:${g.color}">
          <span class="who"><img src="${g.img}" alt="${g.name}" draggable="false"></span>
          <span class="plate"></span>
          <span class="name">${g.name}</span>
        </div>`).join('')}</div>`,
      `<button class="item supply-item">${itemImg(spec.item)}</button>`);
    const c = chrome(spec);

    const seats = Array.from(root.querySelectorAll('.guest'));
    let served = 0, slips = 0, running = true;
    const started = performance.now();
    const demo = idleDemo(root, 'serve');

    function serve(seat, at) {
      demo.poke();
      // Serving someone twice isn't an error, it just doesn't feed anyone new.
      if (!running || seat.classList.contains('fed')) { if (running) slips++; return; }
      seat.classList.add('fed');
      seat.querySelector('.plate').innerHTML = itemImg(spec.item);
      served++;
      c.tally(served);
      c.countUp(served, at);
      Sfx.yum();
      if (served === spec.n) { running = false; demo.stop(); finish(spec, slips, started, onDone); }
    }

    // Tap a guest to serve them, or drag a portion across from the shelf.
    seats.forEach(seat => seat.addEventListener('pointerdown', e => {
      if (e.button) return;
      e.preventDefault();
      serve(seat, { x: e.clientX, y: e.clientY });
    }));

    draggable(root.querySelector('.supply-item'), { onDrop: ({ x, y }) => {
      const hit = seats.find(s => inside(s.getBoundingClientRect(), x, y));
      if (hit) serve(hit, { x, y });
    } });

    setTimeout(() => c.sayPrompt(), 300);
    return { stop() { running = false; demo.stop(); } };
  }

  const PRIMITIVES = {
    'scoop-bag': scoopBag,
    'crack-eggs': crackEggs,
    'stir-bowl': stirBowl,
    'count-place': countPlace,
    'count-gesture': countGesture,
    'set-dial': setDial,
    'cut-into': cutInto,
    'match-1to1': match1to1,
  };

  // What each primitive can sensibly express. Cutting a sandwich into one piece is
  // not a cut, and nobody wants to hand out seventeen plates.
  const LIMITS = {
    'scoop-bag': { min: 1, max: 20 },
    'crack-eggs': { min: 1, max: 12 },     // the carton holds six and refills
    'stir-bowl': { min: 2, max: 10 },      // twenty turns of a whisk is a chore
    'count-place': { min: 1, max: 20 },
    'count-gesture': { min: 2, max: 12 },
    'set-dial': { min: 1, max: 20 },
    'cut-into': { min: 2, max: 8 },
    'match-1to1': { min: 2, max: 6 },
  };

  return {
    limitsFor: p => LIMITS[p] || { min: 1, max: 20 },
    // What is in the bowl carries between the stages of one recipe, not between
    // recipes — App calls this when a new one starts.
    resetCarry() { carry = { fill: 0 }; },
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
