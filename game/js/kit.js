// The small toolkit every step is built from.
//
// The game is laid out on a fixed 1024×768 stage (an iPad's CSS size), scaled to fit whatever
// screen it is on. Every position in the steps is in stage pixels, so pt() converts a pointer
// event into that space.
const Kit = (() => {
  const stage = document.getElementById('stage');
  let scale = 1, ox = 0, oy = 0;

  function fit() {
    scale = Math.min(innerWidth / 1024, innerHeight / 768);
    ox = (innerWidth - 1024 * scale) / 2;
    oy = (innerHeight - 768 * scale) / 2;
    stage.style.transform = `translate(${ox}px, ${oy}px) scale(${scale})`;
  }
  addEventListener('resize', fit);
  fit();

  const pt = e => ({ x: (e.clientX - ox) / scale, y: (e.clientY - oy) / scale });
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  // Navigation and taps listen on pointerdown: on iOS a click lands late, and the double-tap
  // zoom guard in index.html can swallow it.
  function tap(el, fn) {
    el.addEventListener('pointerdown', e => { e.preventDefault(); Hint.poke(); fn(e); });
  }

  // Press, move, release — with a flag for whether it was really a drag or just a tap, so every
  // drag in the game also works as a plain tap for a child who has not got dragging yet.
  function drag(el, h) {
    el.addEventListener('pointerdown', e => {
      e.preventDefault();
      Hint.poke();
      const id = e.pointerId, p0 = pt(e);
      let moved = false;
      if (h.start && h.start(p0, e) === false) return;
      const move = ev => {
        if (ev.pointerId !== id) return;
        const p = pt(ev);
        if (!moved && dist(p, p0) > 14) moved = true;
        if (moved && h.move) h.move(p, ev);
      };
      const up = ev => {
        if (ev.pointerId !== id) return;
        removeEventListener('pointermove', move);
        removeEventListener('pointerup', up);
        removeEventListener('pointercancel', up);
        if (h.end) h.end(pt(ev), moved);
      };
      addEventListener('pointermove', move);
      addEventListener('pointerup', up);
      addEventListener('pointercancel', up);
    });
  }

  // Make an absolutely positioned element centred on (x, y), w wide.
  function put(html, x, y, w, cls = '') {
    const el = document.createElement('div');
    el.className = `thing ${cls}`;
    el.style.cssText = `left:${x - w / 2}px;top:${y - w / 2}px;width:${w}px;height:${w}px`;
    el.innerHTML = html;
    el.home = { x, y };
    return el;
  }

  // Where an element's centre is now, in stage px (reads layout: call before any writes).
  function centre(el) {
    const r = el.getBoundingClientRect();
    return { x: (r.left + r.width / 2 - ox) / scale, y: (r.top + r.height / 2 - oy) / scale };
  }

  // Move a put() element so its centre is at p, instantly (for dragging).
  function moveTo(el, p, extra = '') {
    el.style.transform = `translate(${p.x - el.home.x}px, ${p.y - el.home.y}px) ${extra}`;
  }

  // Fly a put() element to p along a little arc. Resolves when it lands.
  function fly(el, p, ms = 500, extra = '') {
    const from = el.style.transform || 'translate(0px, 0px)';
    const dx = p.x - el.home.x, dy = p.y - el.home.y;
    const a = el.animate([
      { transform: from },
      { transform: `translate(${dx / 2}px, ${dy / 2 - 80}px) ${extra}`, offset: 0.5 },
      { transform: `translate(${dx}px, ${dy}px) ${extra}` },
    ], { duration: ms, easing: 'ease-in-out' });
    return a.finished.then(() => { el.style.transform = `translate(${dx}px, ${dy}px) ${extra}`; });
  }

  // Spring back home after a drop that went nowhere. No sound, no fuss.
  function home(el) {
    const from = el.style.transform;
    el.style.transform = '';
    el.animate([{ transform: from }, { transform: 'translate(0,0)' }], { duration: 350, easing: 'cubic-bezier(.3,1.6,.5,1)' });
  }

  const wait = ms => new Promise(r => setTimeout(r, ms));
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  // White icons for the round buttons. The child never has to read a label.
  const ICON = {
    play: '<path d="M38 26L78 50L38 74Z" stroke-linejoin="round" stroke-width="10" stroke="#fff"/>',
    back: '<path d="M60 26L34 50L60 74" fill="none" stroke="#fff" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>',
    home: '<path d="M22 50L50 26L78 50M32 44V76H68V44" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>',
    tick: '<path d="M26 52L44 70L76 34" fill="none" stroke="#fff" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>',
    again: '<path d="M70 38A24 24 0 1 0 74 58" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round"/><path d="M60 24L76 36L62 48Z" stroke="#fff" stroke-width="6" stroke-linejoin="round"/>',
  };
  const icon = n => `<svg viewBox="0 0 100 100" fill="#fff">${ICON[n]}</svg>`;

  return { icon, stage, pt, dist, tap, drag, put, centre, moveTo, fly, home, wait, lerp, clamp, rand, pick };
})();

// The demonstrating hand. After a few seconds of stillness it shows the gesture once and fades.
// It replaces written instructions, which a three-year-old cannot read. It is never a cursor.
const Hint = (() => {
  const el = document.createElement('img');
  el.id = 'hint';
  el.alt = '';
  el.draggable = false;
  Kit.stage.appendChild(el);
  let path = null, timer = 0, anim = null;
  const TIP = { x: 25 * 120 / 160, y: 24 * 120 / 160 };   // fingertip, at the 120px drawn width

  function play() {
    if (!path) return;
    let pts = path();
    if (!pts) return schedule(3000);
    pts = [...pts, pts[pts.length - 1]];          // arrive, then fade where it ended
    const kf = pts.map((p, i) => ({
      transform: `translate(${p.x - TIP.x}px, ${p.y - TIP.y}px) scale(${i === 0 ? 1.15 : 1})`,
      opacity: i === 0 || i === pts.length - 1 ? 0 : 1,
    }));
    kf.splice(1, 0, { ...kf[0], transform: kf[0].transform.replace('1.15', '1'), opacity: 1, offset: 0.12 });
    anim = el.animate(kf, { duration: 700 + pts.length * 450, easing: 'ease-in-out' });
    anim.onfinish = () => schedule(4500);
  }
  function schedule(ms) { clearTimeout(timer); timer = setTimeout(play, ms); }

  return {
    // fn returns an array of stage points to trace, or null to skip this time.
    set(fn, firstDelay = 3500) {
      if (!el.src) el.src = Art.url('hand');
      path = fn;
      if (anim) anim.cancel();
      if (fn) schedule(firstDelay); else clearTimeout(timer);
    },
    // Any touch resets the clock, and hides a demo that is under way.
    poke() {
      if (anim) anim.cancel();
      if (path) schedule(4500);
    },
  };
})();

// Celebration particles on one canvas above everything. Only runs while there is something to draw.
const Fx = (() => {
  const cv = document.getElementById('fx');
  const cx = cv.getContext('2d');
  const COLORS = ['#ff5c8a', '#ffd23f', '#5ab4ee', '#7ad47c', '#ff9d3c', '#b98cf5'];
  const TWINKLE = ['#ffffff', '#ffffff', '#fff6c2', '#ffe066'];
  let parts = [], running = false;

  function size() {
    const r = devicePixelRatio > 1 ? 2 : 1;
    cv.width = innerWidth * r; cv.height = innerHeight * r;
    cx.setTransform(r, 0, 0, r, 0, 0);
  }
  addEventListener('resize', size);
  size();

  function loop() {
    cx.clearRect(0, 0, innerWidth, innerHeight);
    parts = parts.filter(p => p.life > 0);
    for (const p of parts) {
      p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life--;
      cx.save();
      cx.globalAlpha = Math.min(1, p.life / 20);
      cx.translate(p.x, p.y); cx.rotate(p.rot);
      cx.fillStyle = p.c;
      if (p.star) {
        // a four-point twinkle
        cx.beginPath();
        for (let i = 0; i < 8; i++) {
          const r = i % 2 ? p.s * 0.28 : p.s, a = i * Math.PI / 4;
          cx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        cx.fill();
      } else {
        cx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      }
      cx.restore();
    }
    if (parts.length) requestAnimationFrame(loop); else { running = false; cx.clearRect(0, 0, innerWidth, innerHeight); }
  }
  function go() { if (!running) { running = true; requestAnimationFrame(loop); } }

  // A burst of little stars at a stage point.
  function sparkle(p, n = 14) {
    const r = Kit.stage.getBoundingClientRect(), s = r.width / 1024;
    const x = r.left + p.x * s, y = r.top + p.y * s;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = 2 + Math.random() * 5;
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, g: 0.12, rot: 0, vr: 0.1,
        s: 8 + Math.random() * 10, c: Kit.pick(TWINKLE), life: 40 + Math.random() * 20, star: true });
    }
    go();
  }

  function confetti(n = 120) {
    for (let i = 0; i < n; i++) {
      parts.push({ x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight * 0.5,
        vx: Math.random() * 2 - 1, vy: 2 + Math.random() * 3, g: 0.04, rot: Math.random() * 6,
        vr: Math.random() * 0.2 - 0.1, s: 10 + Math.random() * 10, c: Kit.pick(COLORS), life: 220, star: Math.random() < 0.3 });
    }
    go();
  }

  return { sparkle, confetti };
})();
