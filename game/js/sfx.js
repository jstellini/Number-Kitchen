// Sound effects, synthesised with Web Audio so there are no files to load.
// Nothing here ever sounds like an error: every sound is a reward or a texture.
const Sfx = (() => {
  let ctx = null, master = null, noiseBuf = null;
  const last = {};

  // iOS only lets audio start inside a user gesture; App calls this from the first tap.
  function unlock() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
  }

  function tone(type, f0, f1, dur, vol = 0.3, delay = 0) {
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function noise(dur, freq, q, vol = 0.3, delay = 0, sweepTo) {
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf;
    f.type = 'bandpass'; f.Q.value = q;
    f.frequency.setValueAtTime(freq, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(master);
    s.start(t); s.stop(t + dur + 0.02);
  }

  // Continuous gestures call these every frame; this keeps them to a pleasant patter.
  const every = (key, ms) => {
    const now = performance.now();
    if (now - (last[key] || 0) < ms) return false;
    last[key] = now; return true;
  };

  const S = {
    pop:     () => tone('sine', 520, 980, 0.12, 0.35),
    plop:    () => { tone('sine', 420, 140, 0.18, 0.4); noise(0.12, 900, 2, 0.08); },
    pick:    () => tone('triangle', 700, 1000, 0.08, 0.2),
    whoosh:  () => noise(0.35, 400, 1.2, 0.25, 0, 2400),
    squish:  () => every('squish', 180) && noise(0.16, 260, 3, 0.25),
    stir:    () => every('stir', 220) && noise(0.2, 500 + Math.random() * 200, 4, 0.12),
    splat:   () => every('splat', 120) && noise(0.1, 700, 3, 0.18),
    chop:    () => { noise(0.08, 3000, 3, 0.3); tone('square', 180, 90, 0.08, 0.08); },
    crack:   () => { noise(0.06, 2200, 5, 0.35); noise(0.1, 900, 3, 0.2, 0.06); },
    tick:    () => tone('square', 1500, 1500, 0.03, 0.05),
    ding:    () => { tone('triangle', 1318, 1318, 0.9, 0.3); tone('sine', 2637, 2637, 0.6, 0.1); },
    door:    () => { tone('sine', 180, 120, 0.2, 0.25); noise(0.15, 500, 2, 0.12); },
    nom:     () => { tone('square', 220, 160, 0.07, 0.12); tone('square', 200, 150, 0.07, 0.12, 0.1); },
    sparkle: () => [1568, 1976, 2349, 3136].forEach((f, i) => tone('sine', f, f, 0.25, 0.12, i * 0.06)),
    tada:    () => [523, 659, 784, 1046].forEach((f, i) => tone('triangle', f, f, i === 3 ? 0.8 : 0.25, 0.25, i * 0.12)),
  };

  return { unlock, ...S };
})();
