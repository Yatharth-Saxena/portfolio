// The sound of the dimensions, built so it cannot break up.
//
// Every sound is still synthesised here, but not live. When sound comes on, each world's bed (its chord, its air, its
// own regular events), each world's bells and chimes, the portal impacts and blooms, the notification, Otto's servos,
// and the textures of motion (air, thruster rumble and hiss, the tunnel, the endless rise, the portal swell) are
// rendered once, in the background, by OfflineAudioContexts (their own thread), into short clips; the worlds and
// textures into seamless loops. What plays live is only those clips: one looping source and one gain per world or
// texture, one source per one-shot. Nothing live runs filters swept by oscillators (which Chrome recomputes every
// sample), nothing is built at a portal, parameter changes are sent only when a value really changes, and one-shots
// are spaced and capped so a fast scroll through several portals cannot pile them up.
//
// The tour drives it each frame: update(now, dt, state) and cue(name, now, world). Times are explicit, so a whole trip
// can also be rendered offline for a preview (after `ready`).
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);

// each world: its pad chord, its bell notes (midi), how bright its pad is, and which textures and events it has
export const WORLDS = [
  { name: "Launch pad", chord: [45, 52, 59], bells: [69, 76, 81], bright: 500, level: 0.35, hum: true },
  { name: "Hello", chord: [45, 52, 59, 61, 68], bells: [76, 78, 80, 81, 83, 85, 87], bright: 1100, level: 1, shimmer: [88, 93, 95], rumble: true, bellEvery: [5, 10] },
  { name: "About", chord: [50, 57, 60, 64, 65], drone: [38, 45], bells: [74, 76, 77, 79, 81, 83, 86], bright: 800, level: 0.9, wind: true, wood: true, bellEvery: [4, 9] },
  { name: "What I make", chord: [40, 47, 56, 63, 66, 70], bells: [76, 78, 80, 82, 83, 87, 88], bright: 1600, level: 0.85, plasma: true, rings: true, arp: true },
  { name: "Work", chord: [36, 43, 51, 55, 58, 62], bells: [72, 75, 79, 82, 84], bright: 900, level: 0.85, pulse: 66, ticks: true },
  { name: "Let's talk", chord: [41, 48, 57, 64, 67], bells: [77, 79, 81, 84, 88], bright: 1000, level: 0.9, orb: true, ocean: true, bellEvery: [6, 12] },
];
const BED_RATE = 12000, TEX_RATE = 16000, FX_RATE = 22050, LOOP = 20, PRE = 2, FADE = 2.5;   // (beds are background: 12 kHz carries all they have)

// ---------------------------------------------------------------- synthesis (runs inside an OfflineAudioContext)
// noise and the reverb's impulse, made once per sample rate and copied into each render
const RAW = {};
function raw(SR) {
  if (RAW[SR]) return RAW[SR];
  const white = new Float32Array(SR * 3); for (let i = 0; i < white.length; i++) white[i] = Math.random() * 2 - 1;
  const brown = new Float32Array(SR * 4); let l = 0; for (let i = 0; i < brown.length; i++) { l = (l + 0.02 * (Math.random() * 2 - 1)) / 1.02; brown[i] = l * 3.5; }
  const n = Math.round(SR * 2.8), imp = [0, 1].map(() => { const d = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / SR; d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.2) * (t < 0.02 ? t / 0.02 : 1); } return d; });
  return (RAW[SR] = { white, brown, imp });
}
function synth(ctx) {
  const SR = ctx.sampleRate, RW = raw(SR);
  const mk = (chs) => { const b = ctx.createBuffer(chs.length, chs[0].length, SR); chs.forEach((c, i) => b.copyToChannel(c, i)); return b; };
  const white = mk([RW.white]), brown = mk([RW.brown]);
  const noise = (isBrown, when = 0) => { const s = ctx.createBufferSource(); s.buffer = isBrown ? brown : white; s.loop = true; s.start(when, Math.random() * 2); return s; };
  const lfo = (rate, depth, target, when = 0) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = rate; g.gain.value = depth; o.connect(g); g.connect(target); o.start(when); return o; };
  const verb = ctx.createConvolver(); verb.buffer = mk(RW.imp); const verbOut = ctx.createGain(); verbOut.gain.value = 0.9; verb.connect(verbOut);
  const send = (node, amt) => { const g = ctx.createGain(); g.gain.value = amt; node.connect(g); g.connect(verb); };
  // an FM bell: glassy (ratio 3.5) or woody (1.4)
  function bell(dest, t, midi, { gain = 0.08, decay = 2.4, ratio = 3.5, index = 2.2, pan = 0, wetAmt = 0.6 } = {}) {
    const f = hz(midi), c = ctx.createOscillator(), m = ctx.createOscillator(), mg = ctx.createGain(), a = ctx.createGain(), p = ctx.createStereoPanner();
    c.frequency.value = f; m.frequency.value = f * ratio; m.connect(mg); mg.connect(c.frequency);
    mg.gain.setValueAtTime(f * index, t); mg.gain.exponentialRampToValueAtTime(f * 0.02, t + decay * 0.6);
    a.gain.setValueAtTime(0.0001, t); a.gain.exponentialRampToValueAtTime(gain, t + 0.004); a.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    p.pan.value = pan; c.connect(a); a.connect(p); p.connect(dest); send(p, wetAmt);
    c.start(t); m.start(t); c.stop(t + decay + 0.05); m.stop(t + decay + 0.05);
  }
  // a filtered noise gesture
  function swoosh(dest, t, { from = 3000, to = 600, dur = 0.5, gain = 0.1, type = "bandpass", q = 0.9, panFrom = 0, panTo = 0, attack = 0.35, isBrown = false, wetAmt = 0.25 } = {}) {
    const s = noise(isBrown, t), f = ctx.createBiquadFilter(), a = ctx.createGain(), p = ctx.createStereoPanner();
    f.type = type; f.Q.value = q; f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, to), t + dur);
    a.gain.setValueAtTime(0.0001, t); a.gain.exponentialRampToValueAtTime(gain, t + dur * attack); a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    p.pan.setValueAtTime(panFrom, t); p.pan.linearRampToValueAtTime(panTo, t + dur);
    s.connect(f); f.connect(a); a.connect(p); p.connect(dest); if (wetAmt) send(p, wetAmt); s.stop(t + dur + 0.05);
  }
  // a pitched drop: the body of an impact or a thump
  function drop(dest, t, { from = 80, to = 30, dur = 1, gain = 0.4 } = {}) {
    const o = ctx.createOscillator(), a = ctx.createGain();
    o.frequency.setValueAtTime(from, t); o.frequency.exponentialRampToValueAtTime(to, t + dur);
    a.gain.setValueAtTime(0.0001, t); a.gain.exponentialRampToValueAtTime(gain, t + 0.012); a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(a); a.connect(dest); o.start(t); o.stop(t + dur + 0.05);
  }
  // a world's bed, from t0 to t1: pad, textures, and its regular events (the sparse bells play live, from clips)
  function bed(dest, z, t0, t1) {
    const W = WORLDS[z], out = ctx.createGain(); out.connect(dest); send(out, 0.35);
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = W.bright; lp.Q.value = W.plasma ? 1.6 : 0.5; lp.connect(out);
    lfo(rnd(0.03, 0.06), W.bright * 0.35, lp.frequency, t0);
    const padG = ctx.createGain(); padG.gain.value = (0.11 * W.level) / Math.sqrt(W.chord.length); padG.connect(lp);
    W.chord.forEach((m) => { const g = ctx.createGain(); g.gain.value = 0.7; g.connect(padG); lfo(rnd(0.025, 0.07), 0.3, g.gain, t0);
      [["sawtooth", -6], ["triangle", 6]].forEach(([type, cents]) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = hz(m); o.detune.value = cents + rnd(-2, 2); o.connect(g); o.start(t0); }); });
    if (W.drone) { const g = ctx.createGain(); g.gain.value = 0.05; g.connect(out); W.drone.forEach((m) => { const o = ctx.createOscillator(); o.frequency.value = hz(m); o.connect(g); o.start(t0); }); }
    if (W.hum) { const g = ctx.createGain(); g.gain.value = 0.05; const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 420; g.connect(f); f.connect(out);
      [[50, 1], [100, 0.45], [150, 0.22], [250, 0.08]].forEach(([fr, a]) => { const o = ctx.createOscillator(); o.frequency.value = fr; const og = ctx.createGain(); og.gain.value = a; o.connect(og); og.connect(g); o.start(t0); });
      const r = noise(true, t0), rf = ctx.createBiquadFilter(), rg = ctx.createGain(); rf.type = "lowpass"; rf.frequency.value = 260; rg.gain.value = 0.06; r.connect(rf); rf.connect(rg); rg.connect(out); }
    if (W.shimmer) { const g = ctx.createGain(); g.gain.value = 0.012; g.connect(out); send(g, 0.8);
      W.shimmer.forEach((m) => { const o = ctx.createOscillator(), og = ctx.createGain(), p = ctx.createStereoPanner(); o.frequency.value = hz(m); og.gain.value = 0.5; lfo(rnd(0.08, 0.2), 0.45, og.gain, t0); lfo(rnd(0.02, 0.05), 0.8, p.pan, t0); o.connect(og); og.connect(p); p.connect(g); o.start(t0); }); }
    if (W.rumble) { const r = noise(true, t0), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = "lowpass"; f.frequency.value = 95; g.gain.value = 0.12; lfo(0.035, 0.07, g.gain, t0); r.connect(f); f.connect(g); g.connect(out); }
    if (W.wind) { const mg = ctx.createChannelMerger(2), wg = ctx.createGain(); wg.gain.value = 0.09; mg.connect(wg); wg.connect(out);
      [0, 1].forEach((ch) => { const s = noise(false, t0), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = "bandpass"; f.Q.value = 1.1; f.frequency.value = 650 + ch * 140; lfo(rnd(0.05, 0.11), 260, f.frequency, t0); g.gain.value = 0.55; lfo(rnd(0.06, 0.13), 0.42, g.gain, t0); s.connect(f); f.connect(g); g.connect(mg, 0, ch); }); }
    if (W.plasma) { const f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = "lowpass"; f.Q.value = 7; f.frequency.value = 700; lfo(0.06, 500, f.frequency, t0); g.gain.value = 0.022; f.connect(g); g.connect(out);
      [[40, 0], [40, 9], [47, -5]].forEach(([m, c]) => { const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = hz(m); o.detune.value = c; o.connect(f); o.start(t0); }); }
    if (W.orb) { const g = ctx.createGain(); g.gain.value = 0.05; g.connect(out); [[53, 1], [41, 0.6]].forEach(([m, a]) => { const o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.value = hz(m); lfo(0.18, 1.4, o.frequency, t0); og.gain.value = a; o.connect(og); og.connect(g); o.start(t0); }); }
    if (W.ocean) { const r = noise(true, t0), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = "lowpass"; f.frequency.value = 650; g.gain.value = 0.07; lfo(0.075, 0.06, g.gain, t0); r.connect(f); f.connect(g); g.connect(out); }
    // its regular events, all through the stretch
    if (W.arp) for (let t = t0 + 0.5; t < t1; t += (60 / 84 / 2) * (Math.random() < 0.2 ? 2 : 1)) if (Math.random() < 0.62) bell(out, t, W.bells[(Math.random() * W.bells.length) | 0], { gain: 0.03, decay: 1.2, ratio: 2.01, index: 1.2, pan: rnd(-0.5, 0.5) });
    if (W.rings) for (let t = t0 + rnd(1, 3); t < t1; t += rnd(6, 9)) { const l2r = Math.random() < 0.5; swoosh(out, t, { from: 380, to: 1500, dur: 3.2, gain: 0.05, q: 1.4, panFrom: l2r ? -0.9 : 0.9, panTo: l2r ? 0.9 : -0.9, attack: 0.5 }); }
    if (W.pulse) for (let t = t0 + 0.4; t < t1; t += 60 / W.pulse) { drop(out, t, { from: 72, to: 48, dur: 0.32, gain: 0.16 }); drop(out, t + 0.27, { from: 64, to: 46, dur: 0.28, gain: 0.09 }); }
    if (W.ticks) for (let t = t0 + rnd(0.5, 2); t < t1; t += rnd(2.2, 5.5)) { const n = 2 + ((Math.random() * 5) | 0); for (let k = 0; k < n; k++) swoosh(out, t + k * rnd(0.05, 0.11), { from: rnd(2800, 5200), to: rnd(2600, 5000), dur: 0.018, gain: 0.03, q: 6, panFrom: rnd(-0.7, 0.7), attack: 0.1, wetAmt: 0.1 }); }
  }
  return { SR, noise, lfo, verbOut, send, bell, swoosh, drop, bed, white, brown };
}

// render something offline: fn(synth, out, ctx) schedules it; the result is an AudioBuffer
async function bake(rate, secs, channels, fn) {
  const ctx = new OfflineAudioContext(channels, Math.ceil(secs * rate), rate), S = synth(ctx), out = ctx.createGain();
  out.connect(ctx.destination); S.verbOut.connect(out); fn(S, out, ctx); return ctx.startRendering();
}
// a seamless loop: [start, start + len) of a render, its head crossfaded (equal power) with what followed its end
function loopOf(buf, start, len, fade) {
  const r = buf.sampleRate, s0 = Math.round(start * r), L = Math.round(len * r), F = Math.round(fade * r);
  const out = new AudioBuffer({ length: L, numberOfChannels: buf.numberOfChannels, sampleRate: r });
  for (let c = 0; c < buf.numberOfChannels; c++) { const a = buf.getChannelData(c), o = out.getChannelData(c); o.set(a.subarray(s0, s0 + L));
    for (let i = 0; i < F; i++) { const k = (i / F) * (Math.PI / 2); o[i] = a[s0 + i] * Math.sin(k) + a[s0 + L + i] * Math.cos(k); } }
  return out;
}

// ---------------------------------------------------------------- the bank: everything, baked in priority order
function makeBank(onReady) {
  const B = { bed: [], bells: [], cue: {}, loop: {}, done: 0, total: 0, log: [] };
  const jobs = [];
  const job = (fn) => { jobs.push(fn); B.total++; };
  const texture = (name, ch, secs, build) => job(async () => { B.loop[name] = loopOf(await bake(TEX_RATE, 0.5 + secs + 1, ch, build), 0.5, secs, 1); });
  // per world: the bed, its bells, its portal and notification sounds
  const worldJobs = (z, bedOnly = false) => {
    const W = WORLDS[z];
    job(async () => { B.bed[z] = loopOf(await bake(BED_RATE, PRE + LOOP + FADE, 2, (S, out) => S.bed(out, z, 0, PRE + LOOP + FADE)), PRE, LOOP, FADE); });
    if (bedOnly) return;   // (the launch pad has no notification and no labels)
    if (W.bellEvery) job(async () => { B.bells[z] = await Promise.all(W.bells.map((m) => bake(FX_RATE, 3.4, 1, (S, out) => S.bell(out, 0.02, m, W.wood ? { ratio: 1.4, index: 1.6, decay: 1.6, gain: 0.07 } : { gain: 0.05, decay: 3.2 })))); });
    if (z > 0) {
      job(async () => { (B.cue.enter ||= [])[z] = await bake(FX_RATE, 4.4, 2, (S, out) => {   // into a wormhole: a breath in, then the impact
        S.swoosh(out, 0.02, { from: 200, to: 5000, dur: 0.45, gain: 0.08, type: "highpass", q: 0.7, attack: 0.9 });
        S.drop(out, 0.4, { from: 78, to: 27, dur: 1.5, gain: 0.5 });
        S.swoosh(out, 0.4, { from: 6000, to: 140, dur: 1.1, gain: 0.22, type: "lowpass", q: 0.8, attack: 0.04 });
        [0, 1, 2].forEach((k) => S.bell(out, 0.4, WORLDS[z - 1].chord[0] - 12 + [0, 7, 15][k], { gain: 0.06, decay: 2.8, ratio: 2.76, index: 3.2, pan: [-0.5, 0, 0.5][k], wetAmt: 0.9 })); }); });
      job(async () => { (B.cue.exit ||= [])[z] = await bake(FX_RATE, 4.8, 2, (S, out) => {    // out into a world: a whoosh opening up, its chord strummed, a soft landing
        S.swoosh(out, 0.02, { from: 7000, to: 700, dur: 0.75, gain: 0.12, type: "highpass", q: 0.6, attack: 0.25, panFrom: -0.4, panTo: 0.4 });
        S.drop(out, 0.07, { from: 110, to: 44, dur: 0.6, gain: 0.26 });
        W.chord.slice(-4).forEach((m, k) => S.bell(out, 0.1 + k * 0.055, m + 24, { gain: 0.045, decay: 3, ratio: 3.5, index: 1.8, pan: -0.6 + k * 0.4, wetAmt: 0.8 }));
        S.bell(out, 0.52, W.bells[W.bells.length - 1] + 12, { gain: 0.025, decay: 3.4, wetAmt: 1 }); }); });
    }
    job(async () => { (B.cue.notify ||= [])[z] = await bake(FX_RATE, 3, 2, (S, out) => {         // a soft drop, two glass notes a fifth apart
      S.drop(out, 0.02, { from: 170, to: 105, dur: 0.16, gain: 0.12 });
      S.bell(out, 0.18, W.chord[0] + 36, { gain: 0.07, decay: 1.7, ratio: 3.5, index: 2.4, pan: -0.15 });
      S.bell(out, 0.3, W.chord[0] + 43, { gain: 0.06, decay: 2.1, ratio: 3.5, index: 2.2, pan: 0.15 }); }); });
    job(async () => { (B.cue.tick ||= [])[z] = await Promise.all([0, 1, 2].map(() => bake(FX_RATE, 0.9, 1, (S, out) => S.bell(out, 0.01, W.bells[(Math.random() * W.bells.length) | 0] + 12, { gain: 0.018, decay: 0.35, ratio: 3.5, index: 1, wetAmt: 0.5 })))); });
  };
  // first what the wake-up needs, then the textures of flight and the first world, then the rest in the order you reach them
  worldJobs(0, true);
  job(async () => { B.cue.powerUp = await bake(FX_RATE, 3.6, 2, (S, out, c) => {   // waking: a hum rising through the octave
    const o = c.createOscillator(), o2 = c.createOscillator(), f = c.createBiquadFilter(), a = c.createGain(), t = 0.02;
    o.type = "sawtooth"; o.frequency.setValueAtTime(55, t); o.frequency.exponentialRampToValueAtTime(220, t + 1.8); o2.frequency.setValueAtTime(110, t); o2.frequency.exponentialRampToValueAtTime(440, t + 1.8);
    f.type = "lowpass"; f.frequency.setValueAtTime(200, t); f.frequency.exponentialRampToValueAtTime(2400, t + 1.8);
    a.gain.setValueAtTime(0.0001, t); a.gain.exponentialRampToValueAtTime(0.06, t + 1.2); a.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
    o.connect(f); o2.connect(f); f.connect(a); a.connect(out); S.send(a, 0.5); o.start(t); o2.start(t); o.stop(t + 2.5); o2.stop(t + 2.5);
    S.bell(out, t + 1.7, 81, { gain: 0.04, decay: 2.4 }); S.bell(out, t + 1.82, 88, { gain: 0.03, decay: 2.6 }); }); });
  // the textures of motion
  texture("rumble", 1, 4, (S, out, c) => { const n = S.noise(true), f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 240; n.connect(f); f.connect(out); });
  texture("hiss", 1, 4, (S, out, c) => { const n = S.noise(false), f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 1600; f.Q.value = 0.7; n.connect(f); f.connect(out); });
  [["airLo", 600], ["airHi", 2600]].forEach(([name, fr]) => texture(name, 2, 4, (S, out, c) => { const m = c.createChannelMerger(2); m.connect(out); [0, 1].forEach((ch) => { const n = S.noise(false), f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = fr * (1 + ch * 0.08); f.Q.value = 0.6; n.connect(f); f.connect(m, 0, ch); }); }));
  texture("riser", 1, 4, (S, out, c) => { const n = S.noise(false), f = c.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 2000; f.Q.value = 1.4; n.connect(f); f.connect(out); });
  [["tunDark", [300, 450], true], ["tunBright", [1800, 2700], false]].forEach(([name, frs, low]) => texture(name, 2, 4, (S, out, c) => {
    const p = c.createStereoPanner(); p.connect(out); S.lfo(0.25, 0.75, p.pan);   // it turns round you (once per loop; faster when played faster)
    frs.forEach((fr) => { const n = S.noise(false), f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = fr; f.Q.value = 5; const g = c.createGain(); g.gain.value = 0.7; n.connect(f); f.connect(g); g.connect(p); });
    if (low) { const n = S.noise(true), f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 160; n.connect(f); f.connect(p); } }));
  // the endless rise: seven sines an octave apart sliding up one octave every 8 s, fading in at the bottom and out
  // at the top; after 8 s it sounds just as it began, so it loops forever
  job(async () => { const secs = 9, buf = await bake(FX_RATE, secs, 1, (S, out, c) => {
      for (let i = 0; i < 7; i++) { const o = c.createOscillator(), a = c.createGain(), N = secs * 60, fq = new Float32Array(N), gq = new Float32Array(N);
        for (let k = 0; k < N; k++) { const t = (k / N) * secs, x = (((i + t / 8) % 7) + 7) % 7 / 7; fq[k] = 55 * Math.pow(2, x * 7); gq[k] = Math.exp(-Math.pow((x - 0.5) / 0.18, 2)) * 0.3; }
        o.frequency.setValueCurveAtTime(fq, 0, secs); a.gain.setValueCurveAtTime(gq, 0, secs); o.connect(a); a.connect(out); o.start(0); } });
    B.loop.shep = loopOf(buf, 0, 8, 1); });
  worldJobs(1);
  job(async () => { B.cue.servo = await Promise.all([0, 1, 2].map(() => bake(FX_RATE, 0.6, 1, (S, out, c) => {   // his motors: a short rising whirr and a click
    const o = c.createOscillator(), f = c.createBiquadFilter(), a = c.createGain(), t = 0.01, dur = rnd(0.2, 0.32), f0 = rnd(150, 200);
    o.type = "sawtooth"; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * 1.45, t + dur);
    f.type = "bandpass"; f.frequency.value = 1150; f.Q.value = 5; a.gain.setValueAtTime(0.0001, t); a.gain.exponentialRampToValueAtTime(0.03, t + 0.03); a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(a); a.connect(out); o.start(t); o.stop(t + dur + 0.05);
    S.swoosh(out, t + dur, { from: 3000, to: 2800, dur: 0.02, gain: 0.03, q: 3, attack: 0.1, wetAmt: 0 }); }))); });
  job(async () => { B.cue.notifyClose = await bake(FX_RATE, 0.8, 2, (S, out) => S.swoosh(out, 0.01, { from: 2600, to: 700, dur: 0.38, gain: 0.04, q: 1.2, attack: 0.3, wetAmt: 0.15 })); });
  for (let z = 2; z < WORLDS.length; z++) worldJobs(z);
  // one at a time, so baking never takes much at once
  // two at a time (each render runs on its own thread), in the order they are needed
  let next = 0;
  const lane = async () => { while (next < jobs.length) { const j = jobs[next++], t0 = performance.now(); try { await j(); } catch (e) { console.warn("soundscape bake", e); } B.log.push(Math.round(performance.now() - t0)); B.done++; await new Promise((r) => setTimeout(r, 0)); } };
  Promise.all([lane(), lane()]).then(() => onReady());
  return B;
}

// the bank is made once per page; warm() starts baking early (it needs no audio output or user gesture)
let BANK = null, BANK_READY = null;
export const bankInfo = () => BANK && { done: BANK.done, total: BANK.total, log: BANK.log };
export function warmSoundscape() { if (!BANK) { let r; BANK_READY = new Promise((x) => (r = x)); BANK = makeBank(() => r()); } return BANK_READY; }

// ---------------------------------------------------------------- the live side: only clips, gains and rates
export function createSoundscape({ ctx, out }) {
  const ready = warmSoundscape(), bank = BANK;
  const master = ctx.createGain(); master.gain.value = 0;
  const lim = ctx.createDynamicsCompressor(); lim.threshold.value = -14; lim.knee.value = 10; lim.ratio.value = 4; lim.attack.value = 0.012; lim.release.value = 0.3;
  master.connect(lim); lim.connect(out);
  const worldBus = ctx.createGain(); worldBus.gain.value = 0.5; const duck = ctx.createGain(), fx = ctx.createGain();
  worldBus.connect(duck); duck.connect(master); fx.connect(master);
  // parameter changes go to the audio thread only when the value has really moved (and not every frame)
  const last = new Map();
  const set = (p, v, now, tc = 0.08) => { const L = last.get(p); if (L && (Math.abs(v - L.v) <= Math.max(2e-4, Math.abs(L.v) * 0.02) || (now - L.t < 0.04 && Math.abs(v - L.v) < 0.05 + Math.abs(L.v) * 0.25))) return; p.setTargetAtTime(v, now, tc); last.set(p, { v, t: now }); };
  // a looping clip with its own gain (and a panner if asked), started once its clip exists
  const loops = {};
  const loopLayer = (name, dest, pan = false) => {
    const L = loops[name]; if (L) return L; const buf = bank.loop[name]; if (!buf) return null;
    const src = ctx.createBufferSource(), g = ctx.createGain(); src.buffer = buf; src.loop = true; g.gain.value = 0; src.connect(g);
    let p = null; if (pan) { p = ctx.createStereoPanner(); g.connect(p); p.connect(dest); } else g.connect(dest);
    src.start(ctx.currentTime, Math.random() * buf.duration); return (loops[name] = { src, g, p });
  };
  const worlds = [], bellNext = [];
  let on = false, zoneNow = -1, recent = [];
  const lastBy = {};
  // one-shots: a clip through a gain (and a panner)
  const play = (buf, when, { gain = 1, pan = 0 } = {}) => {
    if (!buf) return; const src = ctx.createBufferSource(), g = ctx.createGain(); src.buffer = buf; g.gain.value = gain; src.connect(g);
    if (pan) { const p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(fx); } else g.connect(fx);
    src.start(when); src.onended = () => { src.disconnect(); g.disconnect(); };
  };

  function update(now, dt, st) {
    set(master.gain, on ? 0.72 : 0, now, 0.3);
    if (!on) return;
    const worm = st.inWorm ? Math.sin(Math.PI * clamp(st.wf, 0, 1)) : 0, sp = clamp(st.spK, 0, 1), near = clamp(st.near, 0, 1);
    // the worlds: the one you are in up, the rest down; the next one already playing (silently) as its portal nears
    for (let z = 0; z < WORLDS.length; z++) {
      const want = z === st.zone ? (z === 0 ? 0.25 + 0.75 * clamp(st.boot, 0, 1) : 1) * (1 - 0.8 * worm) : 0;
      const soon = near > 0.12 && Math.abs(z - st.zone) === 1;
      let w = worlds[z];
      if (!w && (want > 0.001 || soon) && bank.bed[z]) {
        const src = ctx.createBufferSource(), g = ctx.createGain(); src.buffer = bank.bed[z]; src.loop = true; g.gain.value = 0; src.connect(g); g.connect(worldBus);
        src.start(now, Math.random() * bank.bed[z].duration); w = worlds[z] = { src, g, gain: 0, idle: 0 };
      }
      if (!w) continue;
      w.gain += (want - w.gain) * (1 - Math.exp(-dt * 0.9)); set(w.g.gain, w.gain, now, 0.12);
      w.idle = want < 0.001 && w.gain < 0.003 && !soon ? w.idle + dt : 0;
      if (w.idle > 8) { try { w.src.stop(now + 0.05); } catch {} worlds[z] = null; continue; }
      // its sparse bells, from clips, at random notes and places
      const W = WORLDS[z];
      if (W.bellEvery && bank.bells[z] && w.gain > 0.05) {
        if (!bellNext[z] || bellNext[z] < now - 1) bellNext[z] = now + rnd(1, 3);
        if (bellNext[z] < now + 0.1) { const pick = () => bank.bells[z][(Math.random() * bank.bells[z].length) | 0];
          play(pick(), Math.max(now, bellNext[z]), { gain: w.gain * 0.5, pan: rnd(-0.6, 0.6) });
          if (Math.random() < 0.35) play(pick(), Math.max(now, bellNext[z]) + rnd(0.18, 0.4), { gain: w.gain * 0.35, pan: rnd(-0.6, 0.6) });
          bellNext[z] += rnd(...W.bellEvery); }
      }
    }
    set(duck.gain, 1 - 0.55 * clamp(st.talk * 1.6, 0, 1), now, 0.15);
    // the air at speed: a low rush, then a brighter one over it the faster you go
    const aLo = loopLayer("airLo", fx), aHi = loopLayer("airHi", fx);
    if (aLo) set(aLo.g.gain, 0.15 * Math.pow(sp, 1.4) * (1 - worm * 0.6), now, 0.1);
    if (aHi) set(aHi.g.gain, 0.12 * sp * sp * (1 - worm * 0.6), now, 0.1);
    // his thrusters: rumble (idle almost silent while he hovers) and hiss, where he is on screen
    const th = clamp(st.thrust, 0, 1.6), rum = loopLayer("rumble", fx, true), his = loopLayer("hiss", fx, true);
    if (rum) { set(rum.g.gain, 0.11 * Math.pow(Math.max(0, th - 0.35) / 1.25, 1.2) + 0.006 * th, now, 0.08); set(rum.p.pan, clamp(st.ottoX, -1, 1) * 0.6, now, 0.1); }
    if (his) { set(his.g.gain, 0.022 * th + 0.02 * clamp(st.palm, 0, 1), now, 0.08); set(his.p.pan, clamp(st.ottoX, -1, 1) * 0.6, now, 0.1); set(his.src.playbackRate, 0.85 + 0.4 * clamp(th, 0, 1), now, 0.15); }
    // a portal nearing: a rush rising in level and pitch (easing back if you turn round)
    const ris = loopLayer("riser", fx);
    if (ris) { set(ris.g.gain, 0.07 * near * near, now, 0.1); set(ris.src.playbackRate, 0.7 + 1.1 * near, now, 0.1); }
    // inside: the tunnel turns round you, darker going in and brighter coming out, faster the faster you go
    const tD = loopLayer("tunDark", fx), tB = loopLayer("tunBright", fx), wf = clamp(st.wf, 0, 1), rate = 0.8 + 1.4 * sp;
    if (tD) { set(tD.g.gain, 0.22 * worm * (1 - wf * 0.8), now, 0.08); set(tD.src.playbackRate, rate, now, 0.15); }
    if (tB) { set(tB.g.gain, 0.16 * worm * (0.2 + wf), now, 0.08); set(tB.src.playbackRate, rate, now, 0.15); }
    // the endless rise under it (and a little as a portal nears)
    const sh = loopLayer("shep", fx);
    if (sh) { set(sh.g.gain, 0.16 * Math.max(worm, near * 0.5), now, 0.15); set(sh.src.playbackRate, 0.7 + 1.5 * sp, now, 0.2); }
    zoneNow = st.zone;
  }

  function cue(name, now, z = zoneNow) {
    if (!on) return;
    if (lastBy[name] && now - lastBy[name] < (name === "servo" ? 1.2 : 0.45)) return;   // his motors are heard now and then, not at every move
    recent = recent.filter((t) => now - t < 2); if (recent.length >= 6 && name !== "notify") return;   // a fast scroll through portals cannot pile them up
    lastBy[name] = now; recent.push(now);
    const zz = clamp(z, 0, WORLDS.length - 1), C = bank.cue;
    if (name === "enter") play(C.enter && C.enter[Math.max(1, zz)], now);
    else if (name === "exit") play(C.exit && C.exit[Math.max(1, zz)], Math.max(now, (lastBy.enter || -9) + 0.55));   // after the impact, never on top of it
    else if (name === "notify") play(C.notify && C.notify[zz], now);
    else if (name === "notifyClose") play(C.notifyClose, now);
    else if (name === "tick") { if (now - (lastBy.tickAt || -9) < 0.35) return; lastBy.tickAt = now; const t = C.tick && C.tick[zz]; play(t && t[(Math.random() * t.length) | 0], now, { pan: rnd(-0.4, 0.4) }); }
    else if (name === "servo") { const s = C.servo; play(s && s[(Math.random() * s.length) | 0], now); }
    else if (name === "powerUp") play(C.powerUp, now);
  }
  return { update, cue, setOn(v) { on = !!v; }, get on() { return on; }, ready, get progress() { return bank.done / Math.max(1, bank.total); }, WORLDS };
}
