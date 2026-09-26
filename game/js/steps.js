// The cooking steps. Each is one physical action on one object: pour into a bowl, stir it round,
// roll the dough flat, paint the sauce, drop the toppings, bake, cut, serve.
//
// A step is  (root, meal, done) => { stop() }.  `meal` is the state that carries across one
// recipe (the pizza, the bowl, who ordered it). Call done() once when the step is finished.
//
// Rules every step keeps:
//  - Everything that can be dragged can also just be tapped, and does the job by itself.
//  - Nothing can go wrong. A drop in the wrong place springs back; there is no error sound.
//  - No timers against her. Nothing finishes because she was slow.
const Steps = (() => {
  const { put, drag, tap, moveTo, fly, home, wait, lerp, clamp, rand, pick, dist } = Kit;

  // Shared furniture. The board's round is centred at (cx, cy) with the handle off to the right.
  function board(root, cx, cy, w = 470) {
    const el = put(Art.img('board'), cx + w * 35 / 470, cy, w, 'board');
    root.appendChild(el);
    return el;
  }
  function pizzaAt(root, meal, cx, cy, w, cls = '') {
    const box = put('', cx, cy, w, `pizza-box ${cls}`);
    const pz = Pizza.make(meal.pizza, w);
    box.appendChild(pz);
    root.appendChild(box);
    return { box, pz };
  }
  // A stage point → pizza units (0–400), for a pizza of width w centred at (cx, cy).
  const toPizza = (p, cx, cy, w) => ({ x: (p.x - cx) * 400 / w + 200, y: (p.y - cy) * 400 / w + 200 });

  function finish(done, at) {
    Sfx.sparkle();
    Fx.sparkle(at, 22);
    Hint.set(null);
    setTimeout(done, 900);
  }

  // ---------------------------------------------------------------------------------------
  // Pour the flour, milk and egg into the bowl.
  // ---------------------------------------------------------------------------------------
  function mix(root, meal, done) {
    const BOWL = { x: 512, y: 470 }, MOUTH = { x: 512, y: 410 };
    const bowl = put(Art.bowl(), BOWL.x, BOWL.y, 440, 'bowl');
    root.appendChild(bowl);

    const items = [
      { name: 'flour', x: 150, y: 540, w: 190, pour: { x: 400, y: 280 }, tilt: 115, stream: '#ffffff', sfx: 'whoosh' },
      { name: 'milk', x: 880, y: 450, w: 170, pour: { x: 630, y: 270 }, tilt: -115, stream: '#f4f8ff', sfx: 'plop' },
      { name: 'egg', x: 860, y: 640, w: 120, pour: { x: 512, y: 300 }, tilt: 0, sfx: 'crack' },
    ];
    let left = items.length, busy = false, stopped = false;

    for (const it of items) {
      const el = put(Art.img(it.name), it.x, it.y, it.w, 'source');
      it.el = el;
      root.appendChild(el);
      drag(el, {
        start: () => !busy && !it.used,
        move: p => moveTo(el, p, 'scale(1.08)'),
        end: (p, moved) => (!moved || dist(p, BOWL) < 230) ? pour(it) : home(el),
      });
    }

    async function pour(it) {
      busy = true; it.used = true;
      Sfx.pick();
      await fly(it.el, it.pour, 450, `rotate(${it.tilt}deg)`);
      if (stopped) return;
      if (it.name === 'egg') {
        Sfx.crack();
        it.el.classList.add('crack');
        await wait(350);
      } else {
        Sfx[it.sfx]();
        const s = document.createElement('div');
        s.className = 'stream';
        s.style.cssText = `left:${MOUTH.x - 24 + (it.pour.x - MOUTH.x) * 0.3}px;top:${it.pour.y + 40}px;height:${MOUTH.y - it.pour.y - 20}px;background:${it.stream}`;
        root.appendChild(s);
        setTimeout(() => s.remove(), 900);
        await wait(450);
      }
      bowl.classList.add(it.name);
      Sfx.plop();
      Fx.sparkle(MOUTH, 8);
      it.el.classList.add('used');
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
  // Stir round and round until it is dough.
  // ---------------------------------------------------------------------------------------
  function stir(root, meal, done) {
    const A = { x: 512, y: 414 }, RX = 150, RY = 44, TURNS = 3;
    const bowl = put(Art.bowl(), 512, 470, 440, 'bowl flour milk egg instant');
    root.appendChild(bowl);
    const [flour, milk, egg, batter, dough] = ['flour', 'milk', 'egg', 'batter', 'dough'].map(n => bowl.querySelector(`.v-${n}`));
    // The spoon hangs from its bowl end: the tip is 100px below the element's centre.
    const spoon = put(Art.img('spoon', 'flip'), A.x + 60, A.y - 100, 300, 'spoon');
    root.appendChild(spoon);

    let tip = { x: A.x + 60, y: A.y }, angle = null, total = 0, finished = false, auto = 0;

    function setTip(p) {
      // keep the spoon inside the bowl's mouth
      let u = (p.x - A.x) / RX, v = (p.y - A.y) / RY;
      const m = Math.hypot(u, v);
      if (m > 1) { u /= m; v /= m; }
      tip = { x: A.x + u * RX, y: A.y + v * RY };
      moveTo(spoon, { x: tip.x, y: tip.y - 100 }, `rotate(${u * 12}deg)`);
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
      const raw = clamp(1 - t * 2.5, 0, 1);
      flour.style.opacity = milk.style.opacity = egg.style.opacity = raw;
      batter.style.opacity = clamp(t * 2.5, 0, 1) * clamp((1 - t) * 3, 0, 1);
      dough.style.opacity = clamp((t - 0.55) * 3, 0, 1);
      if (t >= 1 && !finished) {
        finished = true;
        bowl.classList.add('boing');
        fly(spoon, { x: 880, y: 460 }, 500, 'rotate(20deg)');
        finish(done, A);
      }
    }

    // A tap stirs one full turn by itself.
    function autoStir() {
      if (auto || finished) return;
      const t0 = performance.now(), a0 = angle ?? 0;
      const step = now => {
        const k = Math.min(1, (now - t0) / 1100);
        const a = a0 + k * 2 * Math.PI;
        setTip({ x: A.x + Math.cos(a) * RX * 0.7, y: A.y + Math.sin(a) * RY * 0.7 });
        if (k < 1 && !finished) auto = requestAnimationFrame(step); else auto = 0;
      };
      auto = requestAnimationFrame(step);
    }

    const handlers = {
      start: () => !finished && !auto,
      move: p => setTip({ x: p.x, y: p.y + 60 }),
      end: (p, moved) => { angle = null; if (!moved) autoStir(); },
    };
    drag(spoon, handlers);
    drag(bowl, handlers);
    show(0);

    Hint.set(() => [0, 1, 2, 3, 4, 5, 6].map(i => {
      const a = i / 6 * Math.PI * 2;
      return { x: A.x + Math.cos(a) * RX * 0.7, y: A.y - 60 + Math.sin(a) * RY };
    }));
    return { stop() { cancelAnimationFrame(auto); finished = true; } };
  }

  // ---------------------------------------------------------------------------------------
  // Roll the ball of dough out flat.
  // ---------------------------------------------------------------------------------------
  function roll(root, meal, done) {
    const C = { x: 512, y: 470 }, NEED = 1500;
    board(root, C.x, C.y);
    const base = pizzaAt(root, meal, C.x, C.y, 370, 'rolling');
    const ball = put(Art.doughBall(), C.x, C.y, 230, 'ball');
    root.appendChild(ball);
    const pin = put(Art.img('rollingpin'), C.x, 690, 360, 'pin');
    root.appendChild(pin);

    let rolled = 0, lastY = null, finished = false, auto = 0;

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
      if (lastY !== null) {
        rolled += Math.abs(y - lastY);
        Sfx.squish();
      }
      lastY = y;
      show();
    }

    function autoRoll() {
      if (auto || finished) return;
      const t0 = performance.now();
      const step = now => {
        const k = Math.min(1, (now - t0) / 1000);
        setY(C.y + Math.cos(k * Math.PI * 2) * 170);
        if (k < 1 && !finished) auto = requestAnimationFrame(step); else auto = 0;
      };
      lastY = null;
      auto = requestAnimationFrame(step);
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
    return { stop() { cancelAnimationFrame(auto); finished = true; } };
  }

  // ---------------------------------------------------------------------------------------
  // Paint the sauce on with the ladle. Anywhere she touches the pizza gets sauce.
  // ---------------------------------------------------------------------------------------
  function sauce(root, meal, done) {
    const C = { x: 512, y: 470 }, W = 370, BLOB = 38;
    board(root, C.x, C.y);
    const { pz } = pizzaAt(root, meal, C.x, C.y, W);
    const layer = pz.querySelector('.p-sauce');
    // The ladle's bowl is 88px below the element's centre; it rides a little above her finger.
    const ladle = put(Art.img('ladle'), 880, 470, 300, 'ladle');
    root.appendChild(ladle);

    // Coverage: a grid of cells inside the pizza, each marked once the sauce reaches it.
    const cells = [];
    for (let y = 48; y <= 352; y += 16) for (let x = 48; x <= 352; x += 16)
      if (Math.hypot(x - 200, y - 200) < Pizza.R - 12) cells.push({ x, y, hit: false });
    let covered = 0, last = null, finished = false, auto = 0;

    function paint(p) {
      moveTo(ladle, { x: p.x, y: p.y + 88 - 40 });
      const u = toPizza({ x: p.x, y: p.y - 40 }, C.x, C.y, W);
      if (Math.hypot(u.x - 200, u.y - 200) > Pizza.R + 10) return;
      if (last && Math.hypot(u.x - last.x, u.y - last.y) < 12) return;
      last = u;
      layer.insertAdjacentHTML('beforeend', `<circle cx="${u.x.toFixed(1)}" cy="${u.y.toFixed(1)}" r="${BLOB}" fill="#dc3f2e"/>`);
      Sfx.splat();
      for (const c of cells) if (!c.hit && Math.hypot(c.x - u.x, c.y - u.y) < BLOB) { c.hit = true; covered++; }
      if (!finished && covered / cells.length > 0.88) {
        finished = true;
        meal.pizza.sauced = true;
        pz.classList.add('sauced');
        fly(ladle, { x: 880, y: 470 }, 500);
        finish(done, C);
      }
    }

    // A tap on the ladle paints a spiral by itself.
    function autoPaint() {
      if (auto || finished) return;
      const t0 = performance.now();
      const step = now => {
        const k = Math.min(1, (now - t0) / 1600);
        const a = k * Math.PI * 6, r = (1 - k) * 150;
        paint({ x: C.x + Math.cos(a) * r, y: C.y + 40 + Math.sin(a) * r });
        if (k < 1 && !finished) auto = requestAnimationFrame(step); else auto = 0;
      };
      auto = requestAnimationFrame(step);
    }

    let onLadle = false;
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
    return { stop() { cancelAnimationFrame(auto); finished = true; } };
  }

  // ---------------------------------------------------------------------------------------
  // Put toppings on. Take one from a dish and drop it anywhere on the pizza.
  // ---------------------------------------------------------------------------------------
  function toppings(root, meal, done) {
    const C = { x: 390, y: 470 }, W = 370, MAX = 30, ENOUGH = 5;
    board(root, C.x, C.y);
    const { pz } = pizzaAt(root, meal, C.x, C.y, W);
    const kinds = ['pepperoni', 'mushroom', 'olive', 'basil', 'cheese'];
    const spots = [[760, 360], [905, 360], [760, 510], [905, 510], [760, 660]];
    let finished = false;

    const tick = document.createElement('button');
    tick.className = 'round-btn tick hidden';
    tick.innerHTML = App.icon('tick');
    tick.style.cssText = 'left:858px;top:614px';
    root.appendChild(tick);
    tap(tick, () => {
      if (finished) return;
      finished = true;
      tick.classList.add('hidden');
      finish(done, C);
    });

    kinds.forEach((kind, i) => {
      const [x, y] = spots[i];
      const dish = put(Art.img('dish') +
        [[-30, -8, -20], [22, -12, 30], [-4, -26, 5]].map(([dx, dy, r]) =>
          Art.img(kind, 'pile', `left:${45 + dx / 1.5}%;top:${38 + dy / 1.5}%;transform:rotate(${r}deg)`)).join(''),
        x, y, 140, 'dish');
      root.appendChild(dish);

      let ghost = null;
      drag(dish, {
        start: p => {
          if (finished || meal.pizza.toppings.length >= MAX) { dish.classList.remove('wobble'); void dish.offsetWidth; dish.classList.add('wobble'); return false; }
          Sfx.pick();
          ghost = put(Art.img(kind), p.x, p.y, 76, 'ghost');
          root.appendChild(ghost);
          moveTo(ghost, { x: p.x, y: p.y - 30 }, 'scale(1.2)');
        },
        move: p => moveTo(ghost, { x: p.x, y: p.y - 30 }, 'scale(1.2)'),
        end: async (p, moved) => {
          const g = ghost; ghost = null;
          let at = { x: p.x, y: p.y - 30 };
          const u = toPizza(at, C.x, C.y, W);
          const d = Math.hypot(u.x - 200, u.y - 200);
          if (!moved) {
            // a tap: it hops onto a free-ish spot by itself
            const a = rand(0, Math.PI * 2), r = Math.sqrt(Math.random()) * (Pizza.R - 30);
            at = { x: C.x + Math.cos(a) * r * W / 400, y: C.y + Math.sin(a) * r * W / 400 };
            await fly(g, at, 420, 'scale(1)');
          } else if (d > Pizza.R + 20) {
            // dropped off the pizza: it goes back in the dish
            await fly(g, { x, y: y - 20 }, 350, 'scale(.6)');
            g.remove();
            return;
          }
          const pu = toPizza(at, C.x, C.y, W);
          const k = Math.min(1, (Pizza.R - 22) / Math.hypot(pu.x - 200, pu.y - 200));
          const t = { kind, x: 200 + (pu.x - 200) * k, y: 200 + (pu.y - 200) * k, r: Math.round(rand(-40, 40)) };
          g.remove();
          const img = Pizza.addTopping(pz, meal.pizza, t);
          img.classList.add('land');
          Sfx.pop();
          if (meal.pizza.toppings.length >= ENOUGH) tick.classList.remove('hidden');
        },
      });
    });

    Hint.set(() => {
      if (meal.pizza.toppings.length >= ENOUGH) return [{ x: 910, y: 660 }, { x: 905, y: 655 }];
      return [{ x: 760, y: 350 }, { x: C.x, y: C.y }];
    });
    return { stop() { finished = true; } };
  }

  // ---------------------------------------------------------------------------------------
  // Slide the pizza into the oven. It bakes while the timer turns, then out it comes.
  // ---------------------------------------------------------------------------------------
  function bake(root, meal, done) {
    const OVEN = { x: 700, y: 440 }, WINDOW = { x: 700, y: 490 }, START = { x: 205, y: 520 };
    const back = put(Art.ovenBack(), OVEN.x, OVEN.y, 470, 'oven');
    const door = put(Art.ovenDoor(), OVEN.x, OVEN.y, 470, 'oven-door open');
    root.appendChild(back);
    board(root, START.x, START.y, 300);
    const { box, pz } = pizzaAt(root, meal, START.x, START.y, 230, 'lift');
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
      pz.classList.add('baked');
      meal.pizza.baked = true;
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
    const { pz } = pizzaAt(root, meal, C.x, C.y, W, 'cutting');
    // The wheel is 78px above the element's centre; it rides a little above her finger.
    const cutter = put(Art.img('cutter'), 880, 520, 280, 'cutter');
    root.appendChild(cutter);
    const OFF = { x: 0, y: -50 };
    let trail = [], finished = false, auto = false;

    const uncut = () => Pizza.ANGLES.filter(a => !meal.pizza.cuts.includes(a));
    const dirOf = a => ({ x: Math.cos(a * Math.PI / 180), y: Math.sin(a * Math.PI / 180) });

    function slice(a) {
      meal.pizza.cuts.push(a);
      pz.querySelector(`.p-cut[data-a="${a}"]`).classList.add('on');
      pz.querySelector(`.p-cut[data-a="${a}"]`).previousElementSibling.classList.add('gone');
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
      const a0 = cutter.animate([
        { transform: cutter.style.transform },
        { transform: `translate(${C.x + d.x * r - cutter.home.x}px, ${C.y + d.y * r + 78 - cutter.home.y}px)` },
      ], { duration: 500, easing: 'ease-in-out' });
      await a0.finished;
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
  // Serve it. The customer eats it, slice by slice, and loves it.
  // ---------------------------------------------------------------------------------------
  function serve(root, meal, done) {
    const who = meal.customer;
    const FACE = { x: 512, y: 200 }, TABLE = { x: 512, y: 440 }, START = { x: 512, y: 610 };
    const folk = document.createElement('div');
    folk.className = 'folk solo serve-folk';
    folk.innerHTML = `<div class="person">${Art.img(who, 'idle')}${Art.img(who + '-happy', 'happy')}</div>`;
    root.appendChild(folk);
    const person = folk.querySelector('.person');

    const plate = put(Art.img('plate'), START.x, START.y, 400, 'plate-box');
    const pz = Pizza.make(meal.pizza, 300);
    pz.classList.add('on-plate');
    plate.appendChild(pz);
    root.appendChild(plate);
    let state = 'ready';

    drag(plate, {
      start: () => state === 'ready',
      move: p => moveTo(plate, p, 'scale(1.04)'),
      end: (p, moved) => (!moved || p.y < 520) ? eat() : home(plate),
    });

    async function eat() {
      state = 'eating';
      Hint.set(null);
      Sfx.whoosh();
      await fly(plate, TABLE, 600, 'scale(.8)');
      person.classList.add('glad');
      Sfx.pop();
      await wait(500);
      const bites = pz.querySelectorAll('.p-bite');
      for (let i = 0; i < bites.length; i++) {
        if (state === 'stopped') return;
        person.classList.remove('chomp'); void person.offsetWidth; person.classList.add('chomp');
        bites[i].classList.add('on');
        Sfx.nom();
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

  return { mix, stir, roll, sauce, toppings, bake, cut, serve };
})();
