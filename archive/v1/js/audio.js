// Sound effects (Web Audio, no audio files) and voice (pre-recorded clips with a
// browser text-to-speech fallback).
//
// Lifted from ABC Town — the tone()/noise() pair below synthesises everything, so
// the game ships no sound assets at all. Only the recipe list at the bottom of Sfx
// is new: kitchen noises instead of a town's.

const Sfx = (() => {
  let ctx = null;

  function ensure() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // A single note. freq can slide to `slide` over the duration.
  function tone({ freq = 440, dur = 0.15, type = 'sine', vol = 0.25, at = 0, slide = null, attack = 0.01 }) {
    const c = ensure();
    const t0 = c.currentTime + at;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  // Short burst of filtered noise – sizzles, chops, pours.
  function noise({ dur = 0.12, vol = 0.3, at = 0, freq = 1200, q = 1, type = 'bandpass' }) {
    const c = ensure();
    const t0 = c.currentTime + at;
    const len = Math.ceil(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(c.destination);
    src.start(t0);
  }

  return {
    // iOS needs the first sound to happen inside a user tap.
    unlock() {
      const c = ensure();
      const b = c.createBuffer(1, 1, c.sampleRate);
      const s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(0);
    },
    tap()     { tone({ freq: 600, slide: 900, dur: 0.08, type: 'triangle', vol: 0.15 }); },
    correct() { [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, dur: 0.22, type: 'triangle', vol: 0.22, at: i * 0.08 })); },
    sparkle() { [1568, 2093, 2637, 3136].forEach((f, i) => tone({ freq: f, dur: 0.12, type: 'sine', vol: 0.10, at: i * 0.05 })); },
    whoosh()  { noise({ dur: 0.35, vol: 0.18, freq: 600, q: 0.5 }); },
    boing()   { tone({ freq: 160, slide: 480, dur: 0.3, type: 'sawtooth', vol: 0.10 }); },
    giggle()  { [0, 0.11, 0.22, 0.33].forEach((at, i) => tone({ freq: 700 + i * 90, slide: 500 + i * 90, dur: 0.1, type: 'triangle', vol: 0.15, at })); },
    chime()   { [784, 988, 1175, 1568].forEach((f, i) => tone({ freq: f, dur: 0.3, type: 'sine', vol: 0.12, at: i * 0.07 })); },

    // One rung higher per item counted, so a growing pile sounds like it is
    // getting somewhere. Climbs a major scale and then holds at the top.
    rise(step = 0) {
      const RUNGS = [392, 440, 494, 523, 587, 659, 698, 784, 880, 988];
      const base = RUNGS[Math.min(step, RUNGS.length - 1)];
      tone({ freq: base, slide: base * 1.5, dur: 0.2, type: 'triangle', vol: 0.18 });
      [2, 2.5, 3].forEach((m, i) => tone({ freq: base * m, dur: 0.1, type: 'sine', vol: 0.07, at: 0.05 + i * 0.05 }));
    },

    // ---------- kitchen ----------
    // A soft landing when an ingredient goes in. Never a verdict, just a thunk.
    plop()    { tone({ freq: 340, slide: 180, dur: 0.12, type: 'sine', vol: 0.18 }); noise({ dur: 0.07, vol: 0.12, freq: 700, q: 1, type: 'lowpass' }); },
    // Taking something back out. Deliberately as friendly as putting it in.
    lift()    { tone({ freq: 220, slide: 420, dur: 0.1, type: 'sine', vol: 0.12 }); },
    crack()   { noise({ dur: 0.07, vol: 0.4, freq: 2200, q: 0.8, type: 'highpass' }); tone({ freq: 500, slide: 260, dur: 0.1, type: 'triangle', vol: 0.1 }); },
    chop()    { noise({ dur: 0.06, vol: 0.45, freq: 900, q: 1.2, type: 'lowpass' }); tone({ freq: 300, slide: 180, dur: 0.07, type: 'square', vol: 0.07 }); },
    roll()    { noise({ dur: 0.32, vol: 0.16, freq: 380, q: 0.7, type: 'lowpass' }); },
    stir()    { noise({ dur: 0.26, vol: 0.13, freq: 900, q: 0.6 }); tone({ freq: 260, slide: 340, dur: 0.24, type: 'sine', vol: 0.05 }); },
    whisk()   { for (let i = 0; i < 4; i++) noise({ dur: 0.06, vol: 0.14, freq: 2600, q: 0.7, type: 'highpass', at: i * 0.06 }); },
    pour()    { noise({ dur: 0.6, vol: 0.14, freq: 1600, q: 0.4 }); tone({ freq: 400, slide: 700, dur: 0.6, type: 'sine', vol: 0.05 }); },
    sizzle()  { noise({ dur: 1.4, vol: 0.12, freq: 4200, q: 0.3, type: 'highpass' }); },
    // The oven dial clicking round a notch.
    click()   { noise({ dur: 0.04, vol: 0.35, freq: 2500, q: 0.8 }); tone({ freq: 1300, slide: 900, dur: 0.06, type: 'triangle', vol: 0.12 }); },
    // Oven finished.
    ding()    { tone({ freq: 1568, dur: 0.5, type: 'sine', vol: 0.15 }); tone({ freq: 2093, dur: 0.35, type: 'sine', vol: 0.08, at: 0.02 }); },
    blender() { noise({ dur: 1.5, vol: 0.18, freq: 700, q: 0.5, type: 'lowpass' }); tone({ freq: 120, slide: 220, dur: 1.5, type: 'sawtooth', vol: 0.09, attack: 0.15 }); },
    // Someone's happy with their order.
    yum()     { [523, 659, 587].forEach((f, i) => tone({ freq: f, slide: f * 1.1, dur: 0.18, type: 'triangle', vol: 0.16, at: i * 0.14 })); },
    // Café door.
    bell()    { [0, 0.3].forEach(at => { tone({ freq: 1760, dur: 0.5, type: 'sine', vol: 0.14, at }); tone({ freq: 2637, dur: 0.3, type: 'sine', vol: 0.05, at }); }); },

    fanfare() {
      [523, 523, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone({ freq: f, dur: i === 7 ? 0.6 : 0.16, type: 'triangle', vol: 0.22, at: i * 0.13 }));
      [262, 330, 392, 523].forEach((f, i) => tone({ freq: f, dur: 0.7, type: 'sine', vol: 0.10, at: 0.9 + i * 0.02 }));
    },
  };
})();

const Voice = (() => {
  let voice = null;
  let ready = false;
  const synth = window.speechSynthesis;
  let clip = null; // shared <audio> element for recorded clips

  function pick() {
    if (!synth) return;
    const voices = synth.getVoices();
    if (!voices.length) return;
    const score = v => {
      const l = (v.lang || '').toLowerCase().replace('_', '-');
      let s = 0;
      if (l === 'en-au') s += 100; else if (l === 'en-gb') s += 50; else if (l.startsWith('en')) s += 20;
      if (/karen|catherine|natural|premium|enhanced/i.test(v.name)) s += 5;
      if (/google/i.test(v.name)) s += 2;
      return s;
    };
    voice = voices.slice().sort((a, b) => score(b) - score(a))[0];
    ready = true;
  }

  function speak(text, rate, pitch) {
    if (!synth) return;
    if (!ready) pick();
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-AU';
    if (voice) u.voice = voice;
    u.rate = rate;
    u.pitch = pitch;
    synth.speak(u);
  }

  return {
    init() {
      if (!clip) clip = new Audio();
      // Play (then immediately pause) inside the user gesture so later clips are
      // allowed to autoplay on iOS.
      clip.play().catch(() => {}); clip.pause();
      if (!synth) return;
      pick();
      synth.onvoiceschanged = pick;
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      synth.speak(u);
    },
    // Speak a line, interrupting anything already being said. Plays the recorded
    // clip for `key` when one exists, else falls back to browser text-to-speech,
    // so the game is fully playable before any clip has been generated.
    say(text, { rate = 0.9, pitch = 1.1, key = null } = {}) {
      const src = key && (window.VOICE_MANIFEST || {})[key];
      if (src) {
        if (synth) synth.cancel();
        if (!clip) clip = new Audio();
        clip.pause();
        clip.onerror = () => { if (clip.src.endsWith(src)) speak(text, rate, pitch); };
        clip.src = src;
        clip.currentTime = 0;
        clip.play().catch(() => {});
        return;
      }
      speak(text, rate, pitch);
    },
    // Say a number on its own — the count-along every counting primitive uses.
    count(n) { this.say(String(n), { key: `n-${n}`, rate: 1 }); },
    stop() { if (synth) synth.cancel(); if (clip) clip.pause(); },
  };
})();
