// Screen flow: start → menu → cook (one step at a time) → done.
const App = (() => {
  const $ = s => document.querySelector(s);
  const { tap, put } = Kit;

  // White icons for the round buttons. The child never has to read a label.
  const ICON = {
    play: '<path d="M38 26L78 50L38 74Z" stroke-linejoin="round" stroke-width="10" stroke="#fff"/>',
    back: '<path d="M60 26L34 50L60 74" fill="none" stroke="#fff" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>',
    home: '<path d="M22 50L50 26L78 50M32 44V76H68V44" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>',
    tick: '<path d="M26 52L44 70L76 34" fill="none" stroke="#fff" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>',
    again: '<path d="M70 38A24 24 0 1 0 74 58" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round"/><path d="M60 24L76 36L62 48Z" stroke="#fff" stroke-width="6" stroke-linejoin="round"/>',
  };
  const icon = n => `<svg viewBox="0 0 100 100" fill="#fff">${ICON[n]}</svg>`;

  let current = null, step = null, meal = null, recipe = null, index = 0;

  function show(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === `screen-${name}`));
    document.querySelector('.kitchen').dataset.screen = name;
    current = name;
  }

  function folk(el, kinds, happy) {
    el.innerHTML = kinds.map(k =>
      `<div class="person${happy ? ' glad' : ''}">${Art.img(k, 'idle')}${Art.img(k + '-happy', 'happy')}</div>`).join('');
  }

  // ---------- start ----------
  function buildStart() {
    folk($('#start-folk'), CUSTOMERS);
    const props = $('#start-props');
    props.appendChild(put(Art.img('flour'), 150, 560, 170, 'deco'));
    props.appendChild(put(Art.img('egg'), 270, 640, 100, 'deco'));
    props.appendChild(put(Art.img('milk'), 870, 540, 160, 'deco'));
    props.appendChild(put(Art.img('tomato'), 760, 650, 90, 'deco'));
    $('#btn-play').innerHTML = icon('play');
    // Each face beams when poked. Pure fun, nothing to get right.
    $('#start-folk').querySelectorAll('.person').forEach(p => tap(p, () => {
      Sfx.unlock(); Sfx.pop();
      p.classList.add('glad');
      setTimeout(() => p.classList.remove('glad'), 900);
    }));
    tap($('#btn-play'), () => { Sfx.unlock(); Sfx.pop(); openMenu(); });
  }

  // ---------- menu ----------
  function openMenu() {
    stopStep();
    const cards = $('#menu-cards');
    cards.innerHTML = '';
    for (const r of RECIPES) {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = Art.img('plate', 'card-plate');
      const pz = Pizza.make(Pizza.sample(), 250);
      pz.classList.add('card-food');
      card.appendChild(pz);
      tap(card, () => { Sfx.pop(); startRecipe(r); });
      cards.appendChild(card);
    }
    show('menu');
  }

  // ---------- cooking ----------
  function startRecipe(r) {
    recipe = r;
    index = 0;
    meal = { pizza: Pizza.blank(), customer: Kit.pick(CUSTOMERS) };
    show('cook');
    runStep();
  }

  function runStep() {
    stopStep();
    const area = $('#stage-area');
    area.innerHTML = '';
    area.classList.remove('enter'); void area.offsetWidth; area.classList.add('enter');
    $('#dots').innerHTML = recipe.steps.map((_, i) =>
      `<i class="${i < index ? 'done' : i === index ? 'now' : ''}"></i>`).join('');
    const name = recipe.steps[index];
    step = Steps[name](area, meal, () => {
      step = null;
      index++;
      if (index < recipe.steps.length) runStep(); else finishRecipe();
    });
  }

  function stopStep() {
    if (step) step.stop();
    step = null;
    Hint.set(null);
  }

  // ---------- done ----------
  function finishRecipe() {
    folk($('#done-folk'), [meal.customer], true);
    $('#done-star').innerHTML = Art.img('star');
    show('done');
    Sfx.tada();
    Fx.confetti();
  }

  // ?step=bake opens a step directly, with the meal as it would be by then. For development.
  function devJump(name) {
    const r = RECIPES[0], i = r.steps.indexOf(name);
    if (i < 0) return false;
    recipe = r; index = i;
    meal = { pizza: Pizza.blank(), customer: Kit.pick(CUSTOMERS) };
    const p = meal.pizza;
    if (i > r.steps.indexOf('sauce')) p.sauced = true;
    if (i > r.steps.indexOf('toppings')) p.toppings = Pizza.sample().toppings;
    if (i > r.steps.indexOf('bake')) p.baked = true;
    if (i > r.steps.indexOf('cut')) p.cuts = Pizza.ANGLES.slice();
    show('cook');
    runStep();
    return true;
  }

  function init() {
    document.querySelector('.prop-window').style.backgroundImage = `url(${Art.url('window')})`;
    document.querySelector('.prop-shelf').style.backgroundImage = `url(${Art.url('shelf')})`;
    buildStart();
    document.querySelectorAll('.round-btn.back').forEach(b => {
      b.innerHTML = icon(b.dataset.go === 'menu' ? 'home' : 'back');
      tap(b, () => { Sfx.pop(); b.dataset.go === 'menu' ? openMenu() : (stopStep(), show('start')); });
    });
    $('#btn-again').innerHTML = icon('again');
    $('#btn-home').innerHTML = icon('home');
    tap($('#btn-again'), () => { Sfx.pop(); startRecipe(recipe); });
    tap($('#btn-home'), () => { Sfx.pop(); openMenu(); });
    document.addEventListener('pointerdown', () => Sfx.unlock(), { once: true });
    const jump = new URLSearchParams(location.search).get('step');
    if (jump === 'done') { recipe = RECIPES[0]; meal = { pizza: Pizza.sample(), customer: 'bunny' }; finishRecipe(); }
    else if (jump === 'menu') openMenu();
    else if (!jump || !devJump(jump)) show('start');
  }

  init();
  return { icon, show };
})();
