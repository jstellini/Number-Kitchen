// Screen flow: start → menu → cook (one step at a time) → done.
const App = (() => {
  const $ = s => document.querySelector(s);
  const { tap, put } = Kit;

  const { icon } = Kit;

  let current = null, step = null, meal = null, recipe = null, index = 0;

  function show(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === `screen-${name}`));
    document.querySelector('.kitchen').dataset.screen = name;
    if (name !== 'cook') document.querySelector('.kitchen').dataset.scene = 'room';
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
      const dish = Dishes[r.dish];
      const card = document.createElement('div');
      card.className = `card card-${r.id}`;
      if (dish.plate) card.innerHTML = Art.img('plate', 'card-plate');
      const food = dish.make(dish.sample(), dish.plate ? 200 : 250);
      food.classList.add('card-food');
      card.appendChild(food);
      tap(card, () => { Sfx.pop(); startRecipe(r); });
      cards.appendChild(card);
    }
    show('menu');
  }

  // ---------- cooking ----------
  // Every recipe opens with the customer ordering; the dots only count the cooking.
  const ORDER = { do: 'order' };

  function newMeal(r) {
    const dish = Dishes[r.dish];
    return { dish, state: dish.blank(), added: [], customer: Kit.pick(CUSTOMERS) };
  }

  function startRecipe(r) {
    recipe = r;
    index = -1;
    meal = newMeal(r);
    peek(meal.customer);
    show('cook');
    runStep();
  }

  const specAt = i => (i < 0 ? ORDER : recipe.steps[i]);

  function runStep() {
    stopStep();
    const area = $('#stage-area');
    area.innerHTML = '';
    area.classList.remove('enter'); void area.offsetWidth; area.classList.add('enter');
    // A fresh root per step, so its listeners go when it does.
    const root = document.createElement('div');
    root.className = 'step-root';
    area.appendChild(root);
    $('#dots').innerHTML = index < 0 ? '' : recipe.steps.map((_, i) =>
      `<i class="${i < index ? 'done' : i === index ? 'now' : ''}"></i>`).join('');
    const spec = specAt(index);
    // The customer is met in the room; the cooking happens on the tablecloth.
    const kitchen = document.querySelector('.kitchen');
    kitchen.dataset.scene = spec.do === 'order' || spec.do === 'serve' ? 'room' : 'table';
    kitchen.style.setProperty('--cloth', recipe.cloth);
    step = Steps[spec.do](root, meal, () => {
      step = null;
      if (spec.do !== 'order' && spec.do !== 'serve') cheer();
      index++;
      if (index < recipe.steps.length) runStep(); else finishRecipe();
    }, spec);
  }

  function stopStep() {
    if (step) step.stop();
    step = null;
    Hint.set(null);
  }

  // ---------- the customer popping up to cheer ----------
  function peek(who) {
    $('#peek').innerHTML = `<div class="person">${Art.img(who, 'idle')}${Art.img(who + '-happy', 'happy')}</div>`;
  }
  function cheer() {
    const p = $('#peek .person');
    if (!p) return;
    $('#peek').classList.add('up');
    p.classList.add('glad');
    Sfx.yay();
    setTimeout(() => { $('#peek').classList.remove('up'); p.classList.remove('glad'); }, 1100);
  }

  // ---------- done ----------
  function finishRecipe() {
    folk($('#done-folk'), [meal.customer], true);
    $('#done-star').innerHTML = Art.img('star');
    show('done');
    Sfx.tada();
    Fx.confetti();
  }

  // ?recipe=cupcakes&step=frost opens a step directly, with the meal as it would be by then.
  // For development.
  function devJump(id, name) {
    const r = RECIPES.find(x => x.id === id) || RECIPES[0];
    const i = r.steps.findIndex(x => x.do === name);
    if (i < 0 && name !== 'order') return false;
    recipe = r; index = i;
    meal = newMeal(r);
    for (const sp of r.steps.slice(0, Math.max(0, i))) if (Steps.skip[sp.do]) Steps.skip[sp.do](meal, sp);
    peek(meal.customer);
    show('cook');
    runStep();
    return true;
  }

  function init() {
    document.querySelector('.prop-window-sky').style.backgroundImage = `url(${Art.url('window-sky')})`;
    document.querySelector('.prop-window').style.backgroundImage = `url(${Art.url('window-frame')})`;
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
    const q = new URLSearchParams(location.search), jump = q.get('step');
    if (jump === 'done') { recipe = RECIPES[0]; meal = newMeal(recipe); finishRecipe(); }
    else if (jump === 'menu') openMenu();
    else if (!jump || !devJump(q.get('recipe'), jump)) show('start');
  }

  init();
  return { show };
})();
