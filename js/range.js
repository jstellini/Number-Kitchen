// Which number does the next stage ask for?
//
// Difficulty is deliberately NOT a property of a recipe (see docs/BRIEF.md). If the
// teens lived in "Tier 2 recipes", a child who loves pizza would play it forty times
// and never meet 14. So recipes unlock for novelty, and the number range comes from
// here: a per-numeral mastery record that widens as she gets solid and re-serves the
// numerals she is shaky on.

const Range = (() => {
  const KEY = 'number-kitchen-range-v1';
  const MAX = 20;
  // A numeral counts as mastered after this many first-try-correct encounters in a row.
  const MASTER_STREAK = 2;
  // Ceilings the live set steps through. 1-5 is where a new player starts.
  const CEILINGS = [5, 10, 15, 20];

  let state = load();

  function blank() {
    return { ceiling: 5, pin: 'auto', stats: {}, log: [] };
  }
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && s.stats) return Object.assign(blank(), s);
    } catch (e) { /* private mode, cleared storage — start fresh */ }
    return blank();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } }

  function stat(n) {
    return state.stats[n] || (state.stats[n] = { seen: 0, firstTry: 0, streak: 0, ms: 0 });
  }
  const mastered = n => stat(n).streak >= MASTER_STREAK;

  // The pinned range wins when a grown-up set one; otherwise the earned ceiling.
  function ceiling() {
    if (state.pin !== 'auto') return Math.min(MAX, parseInt(state.pin, 10) || 5);
    return state.ceiling;
  }

  // Step the ceiling up once everything below it is solid.
  function maybeWiden() {
    if (state.pin !== 'auto') return;
    const top = state.ceiling;
    for (let n = 1; n <= top; n++) if (!mastered(n)) return;
    const next = CEILINGS.find(c => c > top);
    if (next) { state.ceiling = next; save(); }
  }

  return {
    // Pick the number the next stage asks for. Weighted towards numerals she has
    // not met or is shaky on, with a floor so the very first stages stay small.
    // `min` lets a primitive refuse numbers it can't express — cutting a pizza into
    // one piece isn't a cut, and nobody needs 18 slices.
    next({ min = 1, max = MAX } = {}) {
      const hi = Math.max(min, Math.min(max, ceiling()));
      const pool = [];
      for (let n = min; n <= hi; n++) {
        const s = stat(n);
        // Unseen numerals weigh most, shaky ones next, mastered ones stay in the
        // rotation at low weight so they don't rust.
        const w = s.seen === 0 ? 6 : mastered(n) ? 1 : 4;
        for (let i = 0; i < w; i++) pool.push(n);
      }
      return pool.length ? pool[Math.floor(Math.random() * pool.length)] : min;
    },

    // Called when a stage finishes. `firstTry` means she hit the target without
    // ever overshooting or backing out — the signal that she read the numeral
    // rather than arrived by trial and error.
    record(n, firstTry, ms) {
      const s = stat(n);
      s.seen++;
      if (firstTry) { s.firstTry++; s.streak++; } else { s.streak = 0; }
      s.ms = Math.round((s.ms * (s.seen - 1) + (ms || 0)) / s.seen);
      // A capped rolling log: one player, one device, so we can afford to keep
      // the detail that answers "is it 14, or all teens?".
      state.log.push({ n, ok: !!firstTry, ms: ms || 0, t: Date.now() });
      if (state.log.length > 800) state.log = state.log.slice(-800);
      maybeWiden();
      save();
    },

    ceiling,
    mastered,
    get pin() { return state.pin; },
    set pin(v) { state.pin = v; save(); },
    // A digit-by-digit picture for the grown-ups panel.
    table() {
      const rows = [];
      for (let n = 1; n <= MAX; n++) {
        const s = state.stats[n];
        rows.push({ n, seen: s ? s.seen : 0, firstTry: s ? s.firstTry : 0, mastered: mastered(n), live: n <= ceiling() });
      }
      return rows;
    },
    exportJSON() { return JSON.stringify(state, null, 2); },
    importJSON(text) {
      const s = JSON.parse(text);
      if (!s || !s.stats) throw new Error('not a Number Kitchen file');
      state = Object.assign(blank(), s); save();
    },
    reset() { const pin = state.pin; state = blank(); state.pin = pin; save(); },
  };
})();
