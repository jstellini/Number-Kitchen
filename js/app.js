// Screens, progress, and the recipe → stages → serve flow.

const App = (() => {
  const KEY = 'number-kitchen-progress-v1';
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  let progress = load();
  let current = null;   // the recipe being cooked
  let plan = [];        // its stages, with the numbers already chosen

  // Navigation fires on pointerdown, not click. On iOS a click lands well after
  // touchend, and index.html's double-tap-zoom guard swallows the synthetic click of
  // a quick second tap — so tiles feel laggy and sometimes drop a tap. No
  // preventDefault: WebKit would suppress :active, which is the press feedback. No
  // isPrimary check: on a touchscreen every finger that isn't the first one down
  // reports isPrimary false, so a hand resting on the glass would eat every tap.
  const tap = (el, fn) => el && el.addEventListener('pointerdown', e => {
    if (e.button) return;
    fn(e);
  });
  const replayOn = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };

  function load() {
    try { const p = JSON.parse(localStorage.getItem(KEY)); if (p && p.cooked) return p; } catch (e) { /* fresh start */ }
    return { cooked: {} };
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(progress)); } catch (e) { /* private mode etc. */ } }

  const timesCooked = id => progress.cooked[id] || 0;
  // Recipes unlock in order — the novelty reward. Difficulty is not involved:
  // js/range.js decides the numbers, so any recipe can run at any range.
  function isUnlocked(i) { return i === 0 || timesCooked(RECIPES[i - 1].id) > 0; }
  const dishesMade = () => RECIPES.filter(r => timesCooked(r.id) > 0);

  function show(name) {
    $$('.screen').forEach(s => s.classList.toggle('active', s.id === 'screen-' + name));
    if (name !== 'cook') Stage.stop();
    Fx.clear();
    // The café is parked (display:none) until entered, so its animations don't run
    // from page load on every other screen.
    $('#screen-cafe').classList.toggle('parked', name !== 'cafe');
    if (name === 'book') buildBook();
    if (name === 'cafe') buildCafe();
    if (name !== 'served') Voice.stop();
  }

  // ---------- the recipe book ----------
  let bookKey = null;
  function buildBook() {
    const grid = $('#recipe-grid');
    $('#cafe-count').textContent = dishesMade().length;
    // Only rebuild when the collection changed — re-creating the cards on every
    // visit makes Safari re-rasterise the art and it can paint late.
    const key = RECIPES.map((r, i) => (isUnlocked(i) ? 'u' : 'l') + timesCooked(r.id)).join('');
    if (key === bookKey) return;
    bookKey = key;
    grid.innerHTML = '';
    RECIPES.forEach((r, i) => {
      const open = isUnlocked(i);
      const made = timesCooked(r.id);
      const card = document.createElement('button');
      card.className = 'recipe' + (open ? '' : ' locked') + (made ? ' made' : '');
      card.style.setProperty('--c', r.color);
      card.style.animationDelay = (i * 45) + 'ms';
      card.innerHTML = `
        <span class="r-icon">${open ? r.icon : '🔒'}</span>
        <span class="r-name">${r.name}</span>
        <span class="r-blurb">${open ? r.blurb : 'Cook the one before!'}</span>
        ${made ? `<span class="r-made">${'⭐'.repeat(Math.min(made, 3))}</span>` : ''}`;
      // Left tappable while locked: saying what's still needed beats a dead button.
      tap(card, () => {
        if (!open) {
          Sfx.boing(); replayOn(card, 'wobble');
          Voice.say(`Cook the ${RECIPES[i - 1].name} first!`, { key: `locked-${r.id}` });
          return;
        }
        Sfx.tap();
        startRecipe(r);
      });
      grid.appendChild(card);
    });
  }

  // ---------- cooking ----------
  // The numbers are chosen once, up front, so a stage can't re-roll under her if
  // something re-renders mid-play.
  function startRecipe(r) {
    current = r;
    plan = r.stages.map(st => {
      const lim = Stage.limitsFor(st.primitive);
      // voiceKey is recipe-scoped: 'flour' means different lines in different
      // recipes, and 'bake' is an oven in one and a stove in another.
      return Object.assign({}, st, { n: Range.next(lim), voiceKey: `${r.id}-${st.id}` });
    });
    $('#cook-name').textContent = r.name;
    $('#cook-icon').textContent = r.icon;
    document.documentElement.style.setProperty('--recipe', r.color);
    show('cook');
    step(0);
  }

  function step(i) {
    const stillCooking = () => current && $('#screen-cook').classList.contains('active');
    $('#cook-steps').innerHTML = plan.map((_, k) =>
      `<span class="pip${k < i ? ' done' : k === i ? ' now' : ''}"></span>`).join('');
    if (i >= plan.length) { served(); return; }
    Stage.play(plan[i], () => {
      if (!stillCooking()) return;
      if (i < plan.length - 1) Sfx.chime();
      step(i + 1);
    });
  }

  function served() {
    const r = current;
    progress.cooked[r.id] = timesCooked(r.id) + 1;
    save();
    const firstTime = progress.cooked[r.id] === 1;
    $('#served-icon').textContent = r.icon;
    $('#served-name').textContent = r.name;
    $('#served-badge').textContent = firstTime ? 'New recipe!' : 'Made again!';
    // Unlocking the next recipe is the reward the whole loop hangs on, so say it.
    const next = RECIPES[RECIPES.indexOf(r) + 1];
    $('#served-next').textContent = firstTime && next ? `${next.name} is open!` : '';
    show('served');
    Sfx.fanfare();
    Fx.confetti();
    setTimeout(() => Voice.say(`${r.name}! It's ready!`, { key: `served-${r.id}` }), 500);
  }

  // ---------- the café ----------
  // Minimal for now: the dishes she has cooked sit on the counter and react to a
  // poke. It exists so progress has somewhere to *live* rather than just a number
  // going up — that accumulating world is what worked in ABC Town.
  function buildCafe() {
    const counter = $('#cafe-counter');
    const made = dishesMade();
    $('#cafe-empty').classList.toggle('hidden', made.length > 0);
    counter.innerHTML = made.map(r => `
      <button class="dish" style="--c:${r.color}">
        <span class="d-icon">${r.icon}</span>
        <span class="d-name">${r.name}</span>
        <span class="d-count">${timesCooked(r.id)}</span>
      </button>`).join('');
    Array.from(counter.children).forEach((b, i) => tap(b, () => {
      Sfx.yum();
      replayOn(b, 'wobble');
      Voice.say(made[i].name, { key: `dish-${made[i].id}` });
    }));

    // The townsfolk waiting at the counter. One more joins for each dish she has
    // learned to cook, so the room fills up as the recipe book does.
    const folk = $('#cafe-folk');
    const here = CAST.slice(0, Math.min(CAST.length, 3 + made.length));
    folk.innerHTML = here.map(c => `
      <button aria-label="${c.name}"><img src="${c.img}" alt="${c.name}" draggable="false"></button>`).join('');
    Array.from(folk.children).forEach((b, i) => tap(b, () => {
      Sfx.giggle();
      replayOn(b, 'wobble');
      Voice.say(`${here[i].name}, ${here[i].job}!`, { key: `who-${here[i].id}` });
    }));
    Sfx.bell();
  }

  // ---------- grown-ups panel ----------
  function openParent() {
    $('#pp-ceiling').textContent = Range.ceiling();
    $$('#pp-pin .seg-btn').forEach(b => b.classList.toggle('sel', b.dataset.pin === String(Range.pin)));
    const rows = Range.table();
    $('#pp-table').innerHTML = rows.map(r => `
      <span class="cell${r.mastered ? ' mastered' : ''}${r.live ? '' : ' asleep'}" title="${r.firstTry}/${r.seen} first try">
        <b>${r.n}</b><i>${r.seen ? Math.round(r.firstTry / r.seen * 100) + '%' : '–'}</i>
      </span>`).join('');
    $('#parent-panel').classList.remove('hidden');
  }

  function holdToOpen(btn, ms, fn) {
    let timer = 0;
    const cancel = () => { clearTimeout(timer); btn.classList.remove('holding'); };
    btn.addEventListener('pointerdown', e => {
      e.preventDefault();
      // Capture the pointer so a finger wobble during the hold doesn't fire
      // pointerleave and cancel it before `ms` elapses.
      try { btn.setPointerCapture(e.pointerId); } catch (err) { /* unsupported */ }
      btn.classList.add('holding');
      timer = setTimeout(() => { cancel(); fn(); }, ms);
    });
    ['pointerup', 'pointercancel'].forEach(ev => btn.addEventListener(ev, cancel));
  }

  // localStorage gets evicted by Safari under storage pressure, which for a child's
  // unlock progress is a genuine heartbreak risk. Export is the insurance.
  function exportData() {
    const blob = new Blob([JSON.stringify({ progress, range: JSON.parse(Range.exportJSON()) }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `number-kitchen-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function importData(file) {
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const d = JSON.parse(fr.result);
        if (d.progress && d.progress.cooked) { progress = d.progress; save(); }
        if (d.range) Range.importJSON(JSON.stringify(d.range));
        bookKey = null;
        openParent(); buildBook();
        alert('Progress restored.');
      } catch (e) { alert("That file didn't look like a Number Kitchen save."); }
    };
    fr.readAsText(file);
  }

  // Nudge users still in the browser chrome to install the app — standalone mode
  // avoids Safari's UI eating screen space, keeps storage more durable, and makes
  // the audio unlock stick.
  function checkA2HS() {
    const note = $('#a2hs-note');
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    let dismissed = false;
    try { dismissed = localStorage.getItem('number-kitchen-a2hs-dismissed') === '1'; } catch (e) { /* private mode */ }
    if (!standalone && !dismissed) note.classList.remove('hidden');
    $('#a2hs-close').addEventListener('click', () => {
      note.classList.add('hidden');
      try { localStorage.setItem('number-kitchen-a2hs-dismissed', '1'); } catch (e) { /* private mode */ }
    });
  }

  function init() {
    Fx.init();
    checkA2HS();

    tap($('#btn-start'), () => {
      Sfx.unlock(); Voice.init();
      Sfx.correct();
      // The install prompt belongs on the title screen only: it is pinned to the
      // bottom of the viewport, which is exactly where the ingredient shelf goes.
      $('#a2hs-note').classList.add('hidden');
      show('book');
      // Decode the cast now, while she is reading the recipe book, so nobody pops
      // in halfway through a serve stage.
      CAST.forEach(c => { const i = new Image(); i.src = c.img; });
      setTimeout(() => Voice.say("Welcome to Number Kitchen! Pick a recipe!", { key: 'welcome' }), 300);
    });
    $$('[data-go]').forEach(b => tap(b, () => { Sfx.tap(); show(b.dataset.go); }));
    tap($('#stage-target'), () => { const s = plan.find(p => true); if (s) Voice.count(parseInt($('#stage-target').textContent, 10)); });
    tap($('#btn-served-cafe'), () => { Sfx.tap(); show('cafe'); });
    tap($('#btn-served-book'), () => { Sfx.tap(); show('book'); });

    holdToOpen($('#btn-parent'), 1200, openParent);
    $('#pp-close').addEventListener('click', () => $('#parent-panel').classList.add('hidden'));
    $$('#pp-pin .seg-btn').forEach(b => b.addEventListener('click', () => {
      Sfx.tap();
      Range.pin = b.dataset.pin;
      $$('#pp-pin .seg-btn').forEach(q => q.classList.toggle('sel', q === b));
      $('#pp-ceiling').textContent = Range.ceiling();
    }));
    $('#pp-unlock').addEventListener('click', () => {
      RECIPES.forEach(r => { if (!progress.cooked[r.id]) progress.cooked[r.id] = 1; });
      save(); bookKey = null; buildBook();
    });
    $('#pp-export').addEventListener('click', exportData);
    $('#pp-import').addEventListener('change', e => { if (e.target.files[0]) importData(e.target.files[0]); });
    $('#pp-reset').addEventListener('click', () => {
      if (!confirm('Reset all progress and number history?')) return;
      progress = { cooked: {} }; save();
      Range.reset();
      bookKey = null; buildBook(); openParent();
    });

    // Keep iOS from scrolling / zooming the page under the game.
    document.addEventListener('touchmove', e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
    document.addEventListener('gesturestart', e => e.preventDefault());
    document.addEventListener('contextmenu', e => e.preventDefault());
  }

  document.addEventListener('DOMContentLoaded', init);
  return { show };
})();
