// The cooking steps. Each is one physical action on one object: pour into a bowl, stir it round,
// roll the dough flat, paint the sauce, pipe the frosting, bake, cut, serve.
//
// A step is  (root, meal, done, spec) => { stop() }.
//   root  a fresh element to build in (thrown away afterwards, listeners and all)
//   meal  what carries across one recipe: { dish, state, added, customer }
//   spec  this step's entry in the recipe, e.g. { do: 'mix', vessel: 'bowl', items: [...] }
// Call done() once when the step is finished.
//
// Rules every step keeps:
//  - Everything that can be dragged can also just be tapped, and does the job by itself.
//  - Nothing can go wrong. A drop in the wrong place springs back; there is no error sound.
//  - No timers against her. Nothing finishes because she was slow.
const Steps = (() => {
  const { put, drag, tap, moveTo, fly, home, wait, lerp, clamp, rand, dist } = Kit;

  // ---------- shared furniture ----------
  // The board's round is centred at (cx, cy) with the handle off to the right.
  function board(root, cx, cy, w = 470) {
    const el = put(Art.img('board'), cx + w * 35 / 470, cy, w, 'board');
    root.appendChild(el);
    return el;
  }
  // The dish being cooked, w px square, centred at (cx, cy).
  function foodAt(root, meal, cx, cy, w, cls = '') {
    const box = put('', cx, cy, w, `food-box ${cls}`);
    const el = meal.dish.make(meal.state, w);
    box.appendChild(el);
    root.appendChild(box);
    return { box, el };
  }
  // Stage point ↔ dish units (0–400), for a dish w wide centred at c.
  const toDish = (p, c, w) => ({ x: (p.x - c.x) * 400 / w + 200, y: (p.y - c.y) * 400 / w + 200 });
  const toStage = (u, c, w) => ({ x: c.x + (u.x - 200) * w / 400, y: c.y + (u.y - 200) * w / 400 });

  function finish(done, at) {
    Sfx.sparkle();
    Fx.sparkle(at, 22);
    Hint.set(null);
    setTimeout(done, 900);
  }

  // A rAF loop that stops itself when fn returns false.
  function loop(fn) {
    let id = 0, last = performance.now();
    const f = now => { const dt = Math.min(50, now - last); last = now; if (fn(dt, now) !== false) id = requestAnimationFrame(f); else id = 0; };
    id = requestAnimationFrame(f);
    return { stop() { cancelAnimationFrame(id); }, get running() { return id !== 0; } };
  }

  // ---------------------------------------------------------------------------------------
  // The customer asks for their dish.
  // ---------------------------------------------------------------------------------------
  function order(root, meal, done) {
    const who = meal.customer;
    const folk = document.createElement('div');
    folk.className = 'folk solo order-folk';
    folk.innerHTML = `<div class="person">${Art.img(who, 'idle')}${Art.img(who + '-happy', 'happy')}</div>`;
    root.appendChild(folk);
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.appendChild(meal.dish.make(meal.dish.sample(), 190));
    root.appendChild(bubble);
    setTimeout(() => Sfx.pop(), 350);
    let gone = false;
    tap(root, () => {
      if (gone) return;
      gone = true;
      folk.querySelector('.person').classList.add('glad');
      bubble.classList.add('gone');
      Sfx.yay();
      Hint.set(null);
      setTimeout(done, 700);
    });
    Hint.set(() => [{ x: 770, y: 230 }, { x: 772, y: 232 }], 3000);
    return { stop() { gone = true; } };
  }

  // ---------------------------------------------------------------------------------------
  // Put the ingredients into the bowl or the blender.
  // ---------------------------------------------------------------------------------------
  const VESSELS = {
    bowl: { art: () => Art.bowl(), at: { x: 512, y: 470 }, mouth: { x: 512, y: 410 } },
    blender: { art: () => Art.blender(), at: { x: 512, y: 450 }, mouth: { x: 512, y: 292 } },
  };
  // Poured things tip and stream; dropped things fall in.
  const ITEMS = {
    flour: { w: 190, stream: '#ffffff', sfx: 'whoosh' },
    milk: { w: 170, stream: '#f4f8ff', sfx: 'plop' },
    sugar: { w: 150, stream: '#ffd6e5', sfx: 'whoosh' },
    egg: { w: 120, crack: true },
    banana: { w: 160 },
    strawberry: { w: 120 },
    blueberry: { w: 120 },
  };
  const SLOTS = [[150, 480], [870, 450], [150, 660], [870, 650]];

  function vessel(root, spec, meal, extra = '') {
    const v = VESSELS[spec.vessel || 'bowl'];
    const el = put(v.art(), v.at.x, v.at.y, 440, `vessel ${spec.vessel || 'bowl'} ${meal.added.join(' ')} ${extra}`);
    root.appendChild(el);
    return { el, ...v };
  }

  function mix(root, meal, done, spec) {
    const V = vessel(root, spec, meal, 'open'), MOUTH = V.mouth;
    const items = spec.items.map((name, i) => ({ name, ...ITEMS[name], x: SLOTS[i][0], y: SLOTS[i][1] }));
    let left = items.length, busy = false, stopped = false;

    for (const it of items) {
      const el = put(Art.img(it.name), it.x, it.y, it.w, 'source');
      it.el = el;
      root.appendChild(el);
      drag(el, {
        start: () => !busy && !it.used,
        move: p => moveTo(el, p, 'scale(1.08)'),
        end: (p, moved) => (!moved || dist(p, V.at) < 240) ? add(it) : home(el),
      });
    }

    async function add(it) {
      busy = true; it.used = true;
      Sfx.pick();
      const side = it.x < 512 ? -1 : 1;
      if (it.stream) {
        const at = { x: MOUTH.x + side * 115, y: MOUTH.y - 130 };
        await fly(it.el, at, 450, `rotate(${-side * 115}deg)`);
        if (stopped) return;
        Sfx[it.sfx]();
        const s = document.createElement('div');
        s.className = 'stream';
        s.style.cssText = `left:${MOUTH.x - 24 + side * 34}px;top:${at.y + 40}px;height:${MOUTH.y - at.y - 10}px;background:${it.stream}`;
        root.appendChild(s);
        setTimeout(() => s.remove(), 900);
        await wait(450);
        it.el.classList.add('used');
      } else {
        const at = { x: MOUTH.x, y: MOUTH.y - 120 };
        await fly(it.el, at, 450);
        if (stopped) return;
        if (it.crack) { Sfx.crack(); it.el.classList.add('crack'); await wait(350); }
        const a = it.el.animate([{ transform: it.el.style.transform, opacity: 1 },
          { transform: `translate(${MOUTH.x - it.el.home.x}px, ${MOUTH.y + 20 - it.el.home.y}px) scale(.5)`, opacity: 0 }], { duration: 300, easing: 'ease-in', fill: 'forwards' });
        await a.finished;
        it.el.classList.add('used');
      }
      if (stopped) return;
      meal.added.push(it.name);
      V.el.classList.add(it.name);
      Sfx.plop();
      Fx.sparkle(MOUTH, 8);
      busy = false;
      if (--left === 0) finish(done, MOUTH);
    }

    Hint.set(() => {
      const it = items.find(i => !i.used);
      return it && [{ x: it.x, y: it.y }, MOUTH];
    });
    return { stop() { stopped = true; } };
  }

  // ---------------------------------------------------------------------------------------
  // Stir round and round with a spoon or a whisk, until it is dough or batter.
  // ---------------------------------------------------------------------------------------
  function stir(root, meal, done, spec) {
    const A = { x: 512, y: 414 }, RX = 150, RY = 44, TURNS = 3;
    const bowl = vessel(root, { vessel: 'bowl' }, meal, 'instant').el;
    const raw = meal.added.map(n => bowl.querySelector(`.v-${n}`)).filter(Boolean);
    const batter = bowl.querySelector('.v-batter'), dough = bowl.querySelector('.v-dough');
    const toDough = spec.into !== 'batter';
    // The tool hangs from its working end: the tip is 100px below the element's centre.
    const tool = put(Art.img(spec.tool || 'spoon', 'flip'), A.x + 60, A.y - 100, 300, 'spoon');
    root.appendChild(tool);

    let angle = null, total = 0, finished = false, auto = null;

    function setTip(p) {
      let u = (p.x - A.x) / RX, v = (p.y - A.y) / RY;
      const m = Math.hypot(u, v);
      if (m > 1) { u /= m; v /= m; }
      moveTo(tool, { x: A.x + u * RX, y: A.y + v * RY - 100 }, `rotate(${u * 12}deg)`);
      const a = Math.atan2(v, u);
      if (angle !== null && m > 0.25) {
        let d = a - angle;
        if (d > Math.PI) d -= 2 * Math.PI;
        if (d < -Math.PI) d += 2 * Math.PI;
        total += Math.abs(d);
        Sfx.stir();
      }
      angle = a;
      show(total / (TURNS * 2 * Math.PI));
    }

    function show(t) {
      t = clamp(t, 0, 1);
      for (const r of raw) r.style.opacity = clamp(1 - t * 2.5, 0, 1);
      batter.style.opacity = toDough ? clamp(t * 2.5, 0, 1) * clamp((1 - t) * 3, 0, 1) : clamp(t * 2.5, 0, 1);
      dough.style.opacity = toDough ? clamp((t - 0.55) * 3, 0, 1) : 0;
      if (t >= 1 && !finished) {
        finished = true;
        bowl.classList.add('boing');
        fly(tool, { x: 880, y: 460 }, 500, 'rotate(20deg)');
        finish(done, A);
      }
    }

    // A tap stirs one full turn by itself.
    function autoStir() {
      if (auto || finished) return;
      const a0 = angle ?? 0;
      let k = 0;
      auto = loop(dt => {
        k = Math.min(1, k + dt / 1100);
        const a = a0 + k * 2 * Math.PI;
        setTip({ x: A.x + Math.cos(a) * RX * 0.7, y: A.y + Math.sin(a) * RY * 0.7 });
        if (k >= 1 || finished) { auto = null; return false; }
      });
    }

    const handlers = {
      start: () => !finished && !auto,
      move: p => setTip({ x: p.x, y: p.y + 60 }),
      end: (p, moved) => { angle = null; if (!moved) autoStir(); },
    };
    drag(tool, handlers);
    drag(bowl, handlers);
    show(0);

    Hint.set(() => [0, 1, 2, 3, 4, 5, 6].map(i => {
      const a = i / 6 * Math.PI * 2;
      return { x: A.x + Math.cos(a) * RX * 0.7, y: A.y - 60 + Math.sin(a) * RY };
    }));
    return { stop() { if (auto) auto.stop(); finished = true; } };
  }

  // ---------------------------------------------------------------------------------------
  // Put the lid on and hold the big button until the fruit is a smoothie.
  // ---------------------------------------------------------------------------------------
  function blend(root, meal, done) {
    const V = vessel(root, { vessel: 'blender' }, meal, 'instant');
    const el = V.el, BUTTON = { x: 512, y: 590 }, NEED = 3000;
    const spin = el.querySelector('.v-spin'), milk = el.querySelector('.v-milk'), smoothie = el.querySelector('.v-smoothie');
    let done_ = 0, held = false, until = 0, run = null, finished = false;

    function show() {
      const t = clamp(done_ / NEED, 0, 1);
      spin.style.opacity = milk.style.opacity = 1 - t;
      smoothie.style.opacity = t;
    }

    function go() {
      if (run || finished) return;
      el.classList.add('blending');
      run = loop((dt, now) => {
        done_ += dt;
        Sfx.whirr();
        show();
        if (done_ >= NEED) {
          finished = true;
          el.classList.remove('blending');
          run = null;
          meal.state.blended = true;
          finish(done, V.mouth);
          return false;
        }
        if (!held && now > until) { el.classList.remove('blending'); run = null; return false; }
      });
    }

    drag(el, {
      start: () => { if (finished) return false; held = true; until = performance.now() + 900; go(); },
      end: () => { held = false; },
    });
    show();

    Hint.set(() => [BUTTON, BUTTON]);
    return { stop() { if (run) run.stop(); finished = true; } };
  }

  // ---------------------------------------------------------------------------------------
  // Pour from the jug into each cup, or from the blender into the glass.
  // ---------------------------------------------------------------------------------------
  function pour(root, meal, done, spec) {
    const dish = meal.dish, s = meal.state, W = 400, C = { x: 420, y: 500 };
    const { el } = foodAt(root, meal, C.x, C.y, W);
    const T = dish.targets.map(u => toStage(u, C, W));
    const HOME = { x: 860, y: 470 }, TILT = 'rotate(-40deg)', SPOUT = { x: -106, y: -5 };
    const RATE = 1 / (T.length > 1 ? 800 : 1800);
    const jug = put(Art.img(spec.from), HOME.x, HOME.y, 220, 'jug');
    root.appendChild(jug);
    const stream = document.createElement('div');
    stream.className = 'pour-stream';
    stream.style.background = spec.color;
    root.appendChild(stream);

    let busy = false, finished = false, run = null, finger = null, onJug = false;
    const unfilled = () => T.findIndex((t, i) => s.fill[i] < 1);

    function flow(i, dt) {
      const t = T[i];
      stream.style.opacity = 1;
      stream.style.transform = `translate(${t.x - 13}px, ${t.y - 110}px) scaleY(1.1)`;
      dish.setFill(el, s, i, Math.min(1, s.fill[i] + dt * RATE));
      Sfx.pour();
      if (s.fill[i] >= 1) { Sfx.pop(); Fx.sparkle(t, 8); }
    }
    const dry = () => { stream.style.opacity = 0; };

    function checkDone() {
      if (unfilled() >= 0 || finished) return;
      finished = true;
      dry();
      fly(jug, HOME, 450);
      finish(done, C);
    }

    // The jug flies over a target and pours until it is full.
    async function autoPour(i) {
      if (i < 0 || busy || finished) return;
      busy = true;
      await fly(jug, { x: T[i].x - SPOUT.x, y: T[i].y - 110 - SPOUT.y }, 420, TILT);
      await new Promise(r => { run = loop(dt => { flow(i, dt); if (s.fill[i] >= 1 || finished) { r(); return false; } }); });
      dry();
      if (unfilled() >= 0) await fly(jug, HOME, 400);
      busy = false;
      checkDone();
    }

    drag(root, {
      start: (p, e) => {
        if (busy || finished) return false;
        onJug = !!e.target.closest('.jug');
        finger = p;
        if (!onJug) return;
        run = loop(dt => {
          if (!finger) return false;
          const sp = { x: finger.x + SPOUT.x, y: finger.y + SPOUT.y };
          const i = T.findIndex((t, k) => s.fill[k] < 1 && Math.abs(sp.x - t.x) < 60 && sp.y < t.y + 10 && sp.y > t.y - 260);
          moveTo(jug, finger, i >= 0 ? TILT : '');
          if (i >= 0) flow(i, dt); else dry();
          checkDone();
        });
      },
      move: p => { finger = p; },
      end: (p, moved) => {
        finger = null;
        if (run) run.stop();
        dry();
        if (finished) return;
        if (onJug && moved) return home(jug);
        if (onJug) return autoPour(unfilled());
        // a tap on the food: pour into the nearest cup that still needs it
        let best = -1, bd = 1e9;
        T.forEach((t, i) => { const d = dist(p, t); if (s.fill[i] < 1 && d < bd) { bd = d; best = i; } });
        if (bd < 200) autoPour(best);
      },
    });

    Hint.set(() => { const i = unfilled(); return i >= 0 && [HOME, { x: T[i].x - SPOUT.x, y: T[i].y - 110 }]; });
    return { stop() { finished = true; if (run) run.stop(); } };
  }

  // ---------------------------------------------------------------------------------------
  // Pipe frosting onto each cupcake, in whichever colour she picks up.
  // ---------------------------------------------------------------------------------------
  function frost(root, meal, done) {
    const dish = meal.dish, s = meal.state, W = 400, C = { x: 420, y: 480 };
    const { el } = foodAt(root, meal, C.x, C.y, W);
    const TOPS = dish.CUPS.map(c => toStage({ x: c.x, y: c.y - 40 }, C, W));
    const TIP = 75;
    let busy = false, finished = false, last = 'pink';
    const bags = Object.keys(Art.FROST).map((name, i) => {
      const b = put(Art.img(`bag-${name}`), 870, 300 + i * 170, 170, 'bag');
      b.colour = name;
      root.appendChild(b);
      return b;
    });
    const next = () => s.frost.findIndex(f => !f);

    async function pipe(bag, i) {
      if (busy || finished || i < 0) return home(bag);
      busy = true;
      last = bag.colour;
      await fly(bag, { x: TOPS[i].x, y: TOPS[i].y - TIP - 20 }, 400);
      bag.classList.add('squeeze');
      Sfx.squeeze();
      await wait(220);
      dish.frost(el, s, i, bag.colour);
      Sfx.pop();
      Fx.sparkle(TOPS[i], 8);
      await wait(200);
      bag.classList.remove('squeeze');
      busy = false;
      if (next() < 0) {
        finished = true;
        fly(bag, bag.home, 400);
        finish(done, C);
      } else fly(bag, bag.home, 400);
    }

    for (const bag of bags) {
      drag(bag, {
        start: () => !busy && !finished,
        move: p => moveTo(bag, p, 'rotate(-10deg)'),
        end: (p, moved) => {
          if (!moved) return pipe(bag, next());
          const u = toDish({ x: p.x, y: p.y + TIP }, C, W);
          if (u.x < -40 || u.x > 440 || u.y < -40 || u.y > 440) return home(bag);
          pipe(bag, dish.nearest(u));
        },
      });
    }
    // A tap on a cupcake frosts it in the last colour used.
    drag(el, {
      start: () => !busy && !finished,
      end: (p, moved) => { if (!moved) pipe(bags.find(b => b.colour === last), dish.nearest(toDish(p, C, W))); },
    });

    Hint.set(() => { const i = next(); return i >= 0 && [bags[0].home, { x: TOPS[i].x, y: TOPS[i].y }]; });
    return { stop() { finished = true; } };
  }

  // ---------------------------------------------------------------------------------------
  // Roll the ball of dough out flat.
  // ---------------------------------------------------------------------------------------
  function roll(root, meal, done) {
    const C = { x: 512, y: 470 }, NEED = 1500;
    board(root, C.x, C.y);
    const base = foodAt(root, meal, C.x, C.y, 370, 'rolling');
    const ball = put(Art.doughBall(), C.x, C.y, 230, 'ball');
    root.appendChild(ball);
    const pin = put(Art.img('rollingpin'), C.x, 690, 360, 'pin');
    root.appendChild(pin);

    let rolled = 0, lastY = null, finished = false, auto = null;

    function show() {
      const t = clamp(rolled / NEED, 0, 1);
      ball.style.transform = `scale(${1 + t * 0.5}, ${1 - t * 0.5})`;
      ball.style.opacity = clamp(1 - t * 1.8, 0, 1);
      base.box.style.transform = `scale(${lerp(0.45, 1, t)})`;
      base.box.style.opacity = clamp(t * 2.2, 0, 1);
      if (t >= 1 && !finished) {
        finished = true;
        fly(pin, { x: 890, y: 690 }, 500, 'rotate(-30deg)');
        finish(done, C);
      }
    }

    function setY(y) {
      y = clamp(y, 300, 660);
      moveTo(pin, { x: C.x, y });
      if (lastY !== null) { rolled += Math.abs(y - lastY); Sfx.squish(); }
      lastY = y;
      show();
    }

    function autoRoll() {
      if (auto || finished) return;
      let k = 0;
      lastY = null;
      auto = loop(dt => {
        k = Math.min(1, k + dt / 1000);
        setY(C.y + Math.cos(k * Math.PI * 2) * 170);
        if (k >= 1 || finished) { auto = null; return false; }
      });
    }

    const handlers = {
      start: () => !finished && !auto,
      move: p => setY(p.y),
      end: (p, moved) => { lastY = null; if (!moved) autoRoll(); },
    };
    drag(pin, handlers);
    drag(ball, handlers);
    show();

    Hint.set(() => [{ x: C.x, y: 690 }, { x: C.x, y: 330 }, { x: C.x, y: 620 }, { x: C.x, y: 360 }]);
    return { stop() { if (auto) auto.stop(); finished = true; } };
  }

  // ---------------------------------------------------------------------------------------
  // Paint the sauce on with the ladle. Anywhere she touches the pizza gets sauce.
  // ---------------------------------------------------------------------------------------
  function sauce(root, meal, done) {
    const C = { x: 512, y: 470 }, W = 370, BLOB = 38;
    board(root, C.x, C.y);
    const { el: pz } = foodAt(root, meal, C.x, C.y, W);
    const layer = pz.querySelector('.p-sauce');
    // The ladle's bowl is 88px below the element's centre; it rides a little above her finger.
    const ladle = put(Art.img('ladle'), 880, 470, 300, 'ladle');
    root.appendChild(ladle);

    const cells = [];
    for (let y = 48; y <= 352; y += 16) for (let x = 48; x <= 352; x += 16)
      if (Math.hypot(x - 200, y - 200) < Pizza.R - 12) cells.push({ x, y, hit: false });
    let covered = 0, last = null, finished = false, auto = null, onLadle = false;

    function paint(p) {
      moveTo(ladle, { x: p.x, y: p.y + 88 - 40 });
      const u = toDish({ x: p.x, y: p.y - 40 }, C, W);
      if (Math.hypot(u.x - 200, u.y - 200) > Pizza.R + 10) return;
      if (last && Math.hypot(u.x - last.x, u.y - last.y) < 12) return;
      last = u;
      layer.insertAdjacentHTML('beforeend', `<circle cx="${u.x.toFixed(1)}" cy="${u.y.toFixed(1)}" r="${BLOB}" fill="#dc3f2e"/>`);
      Sfx.splat();
      for (const c of cells) if (!c.hit && Math.hypot(c.x - u.x, c.y - u.y) < BLOB) { c.hit = true; covered++; }
      if (!finished && covered / cells.length > 0.88) {
        finished = true;
        meal.state.sauced = true;
        pz.classList.add('sauced');
        fly(ladle, { x: 880, y: 470 }, 500);
        finish(done, C);
      }
    }

    // A tap on the ladle paints a spiral by itself.
    function autoPaint() {
      if (auto || finished) return;
      let k = 0;
      auto = loop(dt => {
        k = Math.min(1, k + dt / 1600);
        const a = k * Math.PI * 6, r = (1 - k) * 150;
        paint({ x: C.x + Math.cos(a) * r, y: C.y + 40 + Math.sin(a) * r });
        if (k >= 1 || finished) { auto = null; return false; }
      });
    }

    drag(root, {
      start: (p, e) => {
        if (finished || auto) return false;
        last = null;
        onLadle = !!e.target.closest('.ladle');
        if (!onLadle) paint(p);                        // a press on the ladle might be a tap
      },
      move: p => paint(p),
      end: (p, moved) => { if (!moved && onLadle) autoPaint(); },
    });

    Hint.set(() => [{ x: 880, y: 430 }, { x: 420, y: 380 }, { x: 600, y: 420 }, { x: 430, y: 520 }, { x: 600, y: 560 }]);
    return { stop() { if (auto) auto.stop(); finished = true; } };
  }

  // ---------------------------------------------------------------------------------------
  // Decorate: take a topping from a dish and drop it anywhere on the food.
  // ---------------------------------------------------------------------------------------
  function decorate(root, meal, done, spec) {
    const dish = meal.dish, W = dish.board ? 370 : 400, C = { x: 390, y: dish.board ? 470 : 480 };
    const MAX = 30, ENOUGH = 5;
    if (dish.board) board(root, C.x, C.y);
    const { el } = foodAt(root, meal, C.x, C.y, W);
    const spots = [[760, 360], [905, 360], [760, 510], [905, 510], [760, 660]];
    let finished = false;

    const tick = document.createElement('button');
    tick.className = 'round-btn tick hidden';
    tick.innerHTML = Kit.icon('tick');
    tick.style.cssText = 'left:858px;top:614px';
    root.appendChild(tick);
    tap(tick, () => {
      if (finished) return;
      finished = true;
      tick.classList.add('hidden');
      finish(done, C);
    });

    spec.items.forEach((kind, i) => {
      const [x, y] = spots[i];
      const bowl = put(Art.img('dish') +
        [[-30, -8, -20], [22, -12, 30], [-4, -26, 5]].map(([dx, dy, r]) =>
          Art.img(kind, 'pile', `left:${45 + dx / 1.5}%;top:${38 + dy / 1.5}%;transform:rotate(${r}deg)`)).join(''),
        x, y, 140, 'dish');
      root.appendChild(bowl);

      let ghost = null;
      drag(bowl, {
        start: p => {
          if (finished || meal.state.toppings.length >= MAX) {
            bowl.classList.remove('wobble'); void bowl.offsetWidth; bowl.classList.add('wobble');
            return false;
          }
          Sfx.pick();
          ghost = put(Art.img(kind), p.x, p.y, 76, 'ghost');
          root.appendChild(ghost);
          moveTo(ghost, { x: p.x, y: p.y - 30 }, 'scale(1.2)');
        },
        move: p => moveTo(ghost, { x: p.x, y: p.y - 30 }, 'scale(1.2)'),
        end: async (p, moved) => {
          const g = ghost; ghost = null;
          const pl = dish.place(moved ? toDish({ x: p.x, y: p.y - 30 }, C, W) : dish.spot(kind), kind);
          if (!pl) {
            // dropped off the food: it goes back in its dish
            await fly(g, { x, y: y - 20 }, 350, 'scale(.6)');
            g.remove();
            return;
          }
          await fly(g, toStage(pl, C, W), moved ? 160 : 420, `scale(${(pl.s || 64) / 76 * W / 400})`);
          g.remove();
          const img = dish.addTopping(el, meal.state, { kind, r: Math.round(rand(-40, 40)), ...pl });
          img.classList.add('land');
          Sfx.pop();
          if (meal.state.toppings.length >= ENOUGH) tick.classList.remove('hidden');
        },
      });
    });

    Hint.set(() => {
      if (meal.state.toppings.length >= ENOUGH) return [{ x: 910, y: 660 }, { x: 905, y: 655 }];
      return [{ x: 760, y: 350 }, C];
    });
    return { stop() { finished = true; } };
  }

  // ---------------------------------------------------------------------------------------
  // Slide it into the oven. It bakes while the timer turns, then out it comes.
  // ---------------------------------------------------------------------------------------
  function bake(root, meal, done) {
    const OVEN = { x: 700, y: 440 }, WINDOW = { x: 700, y: 490 }, START = { x: 205, y: 520 };
    const back = put(Art.ovenBack(), OVEN.x, OVEN.y, 470, 'oven');
    const door = put(Art.ovenDoor(), OVEN.x, OVEN.y, 470, 'oven-door open');
    root.appendChild(back);
    if (meal.dish.board) board(root, START.x, START.y, 300);
    const { box, el } = foodAt(root, meal, START.x, START.y, 230, 'lift');
    root.appendChild(door);
    let state = 'ready';

    drag(box, {
      start: () => state === 'ready',
      move: p => moveTo(box, p, 'scale(1.06)'),
      end: (p, moved) => (!moved || dist(p, WINDOW) < 200) ? go() : home(box),
    });

    async function go() {
      state = 'baking';
      Hint.set(null);
      Sfx.whoosh();
      await fly(box, WINDOW, 500, 'scale(.9)');
      box.classList.add('inside');
      door.classList.remove('open');
      Sfx.door();
      await wait(350);
      back.classList.add('baking');
      for (let i = 0; i < 12; i++) { await wait(250); Sfx.tick(); if (state === 'stopped') return; }
      meal.dish.bake(el, meal.state);
      Sfx.ding();
      await wait(500);
      back.classList.remove('baking');
      door.classList.add('open');
      Sfx.door();
      await wait(400);
      box.classList.remove('inside');
      await fly(box, { x: 330, y: 560 }, 550, 'scale(1.35)');
      if (state !== 'stopped') finish(done, { x: 330, y: 560 });
    }

    Hint.set(() => state === 'ready' && [START, WINDOW]);
    return { stop() { state = 'stopped'; } };
  }

  // ---------------------------------------------------------------------------------------
  // Cut it into slices: roll the cutter along each dotted line.
  // ---------------------------------------------------------------------------------------
  function cut(root, meal, done) {
    const C = { x: 512, y: 470 }, W = 380;
    board(root, C.x, C.y);
    const { el: pz } = foodAt(root, meal, C.x, C.y, W, 'cutting');
    // The wheel is 78px above the element's centre; it rides a little above her finger.
    const cutter = put(Art.img('cutter'), 880, 520, 280, 'cutter');
    root.appendChild(cutter);
    const OFF = { x: 0, y: -50 };
    let trail = [], finished = false, auto = false;
    const cuts = meal.state.cuts;

    const uncut = () => Pizza.ANGLES.filter(a => !cuts.includes(a));
    const dirOf = a => ({ x: Math.cos(a * Math.PI / 180), y: Math.sin(a * Math.PI / 180) });

    function slice(a) {
      cuts.push(a);
      const r = pz.querySelector(`.p-cut[data-a="${a}"]`);
      r.classList.add('on');
      r.previousElementSibling.classList.add('gone');
      Sfx.chop();
      Fx.sparkle(C, 6);
      trail = [];
      if (!uncut().length && !finished) {
        finished = true;
        fly(cutter, { x: 880, y: 520 }, 500);
        finish(done, C);
      }
    }

    function wheel(p) {
      const w = { x: p.x + OFF.x, y: p.y + OFF.y };
      moveTo(cutter, { x: w.x, y: w.y + 78 });
      trail.push(w);
      if (trail.length > 80) trail.shift();
      // Has the wheel travelled far enough along any uncut line, while staying close to it?
      for (const a of uncut()) {
        const d = dirOf(a);
        let lo = Infinity, hi = -Infinity;
        for (const q of trail) {
          const rx = q.x - C.x, ry = q.y - C.y;
          if (Math.abs(rx * -d.y + ry * d.x) > 55) continue;
          const along = rx * d.x + ry * d.y;
          lo = Math.min(lo, along); hi = Math.max(hi, along);
        }
        if (hi - lo > W * 0.55) return slice(a);
      }
    }

    // A tap: the cutter rolls along the nearest uncut line by itself.
    async function autoCut(p) {
      if (auto || finished) return;
      const left = uncut();
      if (!left.length) return;
      let a = left[0];
      if (p) {
        let best = Infinity;
        for (const b of left) {
          const d = dirOf(b), off = Math.abs((p.x - C.x) * -d.y + (p.y - C.y) * d.x);
          if (off < best) { best = off; a = b; }
        }
      }
      auto = true;
      const d = dirOf(a), r = W / 2 - 10;
      await fly(cutter, { x: C.x - d.x * r, y: C.y - d.y * r + 78 }, 350);
      const an = cutter.animate([
        { transform: cutter.style.transform },
        { transform: `translate(${C.x + d.x * r - cutter.home.x}px, ${C.y + d.y * r + 78 - cutter.home.y}px)` },
      ], { duration: 500, easing: 'ease-in-out' });
      await an.finished;
      moveTo(cutter, { x: C.x + d.x * r, y: C.y + d.y * r + 78 });
      auto = false;
      if (!finished) slice(a);
    }

    drag(root, {
      start: () => { if (finished || auto) return false; trail = []; },
      move: p => wheel(p),
      end: (p, moved) => { if (!moved) autoCut(dist(p, C) < W / 2 ? p : null); },
    });

    Hint.set(() => {
      const a = uncut()[0];
      if (a === undefined) return null;
      const d = dirOf(a), r = W / 2 - 20;
      return [{ x: C.x - d.x * r, y: C.y - d.y * r - OFF.y }, { x: C.x + d.x * r, y: C.y + d.y * r - OFF.y }];
    });
    return { stop() { finished = true; } };
  }

  // ---------------------------------------------------------------------------------------
  // Serve it. The customer eats it, mouthful by mouthful, and loves it.
  // ---------------------------------------------------------------------------------------
  function serve(root, meal, done) {
    const who = meal.customer, dish = meal.dish;
    const FACE = { x: 512, y: 200 }, TABLE = { x: 512, y: 440 }, START = { x: 512, y: 600 };
    const folk = document.createElement('div');
    folk.className = 'folk solo serve-folk';
    folk.innerHTML = `<div class="person">${Art.img(who, 'idle')}${Art.img(who + '-happy', 'happy')}</div>`;
    root.appendChild(folk);
    const person = folk.querySelector('.person');

    const tray = put(dish.plate ? Art.img('plate') : '', START.x, START.y, 400, 'plate-box');
    const food = dish.make(meal.state, dish.plate ? 300 : 340);
    food.classList.add(dish.plate ? 'on-plate' : 'on-table');
    tray.appendChild(food);
    root.appendChild(tray);
    let state = 'ready';

    drag(tray, {
      start: () => state === 'ready',
      move: p => moveTo(tray, p, 'scale(1.04)'),
      end: (p, moved) => (!moved || p.y < 520) ? eat() : home(tray),
    });

    async function eat() {
      state = 'eating';
      Hint.set(null);
      Sfx.whoosh();
      await fly(tray, TABLE, 600, 'scale(.8)');
      person.classList.add('glad');
      Sfx.yay();
      await wait(600);
      for (const bite of dish.bites(food, meal.state)) {
        if (state === 'stopped') return;
        person.classList.remove('chomp'); void person.offsetWidth; person.classList.add('chomp');
        bite();
        await wait(420);
      }
      Sfx.tada();
      for (let i = 0; i < 5; i++) {
        const h = put(Art.img('heart'), FACE.x + rand(-140, 140), FACE.y + rand(-40, 60), rand(50, 80), 'float-heart');
        h.style.animationDelay = `${i * 0.15}s`;
        root.appendChild(h);
      }
      await wait(1400);
      if (state !== 'stopped') { Hint.set(null); done(); }
    }

    Hint.set(() => state === 'ready' && [START, TABLE]);
    return { stop() { state = 'stopped'; } };
  }

  // What each step leaves behind, for jumping straight into a later step (?step= in app.js).
  const skip = {
    mix: (meal, spec) => { meal.added = spec.items.slice(); },
    sauce: meal => { meal.state.sauced = true; },
    decorate: meal => { meal.state.toppings = meal.dish.sample().toppings; },
    bake: meal => { meal.state.baked = true; },
    cut: meal => { meal.state.cuts = Pizza.ANGLES.slice(); },
    pour: meal => { meal.state.fill = meal.state.fill.map(() => 1); },
    frost: meal => { meal.state.frost = meal.dish.sample().frost; },
    blend: meal => { meal.state.blended = true; },
  };

  return { order, mix, stir, blend, pour, frost, roll, sauce, decorate, bake, cut, serve, skip };
})();
