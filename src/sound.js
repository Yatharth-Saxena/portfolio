// Sound: small synthesised interface sounds and Otto's voice.
// Nothing plays until the visitor turns sound on (browsers require a gesture anyway).

let ctx = null, master = null, voiceBus = null, analyser = null;
let enabled = false, manifest = null, current = null, bed = null, speakGen = 0;
const cache = new Map();
const listeners = new Set();

export const sound = {
  get on() { return enabled; },
  get ctx() { return ctx; },          // for the soundscape, which plays through the same output
  get out() { return master; },
  onChange(fn) { listeners.add(fn); },

  async enable(v = true) {
    enabled = v;
    try { localStorage.setItem("otto-sound", v ? "1" : "0"); } catch {}
    if (v) {
      if (!ctx) build();
      if (ctx.state === "suspended") await ctx.resume();
      if (!manifest) manifest = await fetch("/voice/manifest.json", { cache: "no-store" }).then((r) => r.json()).catch(() => ({}));
    } else { this.stopVoice(); this.ambient(false); }
    listeners.forEach((fn) => fn(v));
  },
  wanted() { try { return localStorage.getItem("otto-sound") === "1"; } catch { return false; } },

  // --- interface sounds ---------------------------------------------------
  tick() { blip({ f: 1900, to: 1500, t: 0.035, g: 0.035, type: "triangle" }); },
  click() { blip({ f: 520, to: 260, t: 0.09, g: 0.1, type: "square", lp: 1400 }); },
  pop() { blip({ f: 380, to: 920, t: 0.09, g: 0.09, type: "sine" }); },
  boing() { blip({ f: 190, to: 620, t: 0.22, g: 0.12, type: "sine", wob: 22 }); },
  thud(power = 1) { blip({ f: 150, to: 52, t: 0.16, g: Math.min(0.26, 0.1 + power * 0.12), type: "sine" }); noise(0.05, 0.05 * power, 900); },
  whoosh() { noise(0.42, 0.07, 700, 3200); },
  boom() { blip({ f: 78, to: 32, t: 1.4, g: 0.24, type: "sine" }); noise(1.1, 0.045, 260, 70); },
  // a quiet low bed: three detuned tones through a slowly moving filter
  ambient(on) {
    if (!ctx) return;
    if (on && enabled && !bed) {
      const g = ctx.createGain(); g.gain.value = 0.0001; g.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 4);
      const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 320; f.Q.value = 0.6;
      const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 0.07; lg.gain.value = 140; l.connect(lg); lg.connect(f.frequency); l.start();
      const os = [[55, "sine", 1], [82.6, "sine", 0.55], [110.3, "triangle", 0.22], [164.9, "sine", 0.12]].map(([hz, type, v]) => { const o = ctx.createOscillator(), og = ctx.createGain(); o.type = type; o.frequency.value = hz; og.gain.value = v; o.connect(og); og.connect(f); o.start(); return o; });
      f.connect(g); g.connect(master); bed = { g, os, l };
    } else if (!on && bed) {
      const b = bed; bed = null; b.g.gain.cancelScheduledValues(ctx.currentTime); b.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.4);
      setTimeout(() => { b.os.forEach((o) => o.stop()); b.l.stop(); }, 2500);
    }
  },
  slide(v) { blip({ f: 300 + v * 40, to: 320 + v * 40, t: 0.05, g: 0.03, type: "sine" }); },

  // --- voice --------------------------------------------------------------
  // the clips' manifest (lengths and sentence timings), fetched once even with sound off, for the subtitles
  prime() { if (!manifest && !this._p) this._p = fetch("/voice/manifest.json", { cache: "no-store" }).then((r) => r.json()).then((m) => { manifest = manifest || m; }).catch(() => {}); return this._p; },
  meta(id) { return manifest && manifest[id]; },
  // Plays the pre-generated clip for `id`; falls back to the browser's voice for unscripted text.
  async speak(id, text, onLevel) {
    this.stopVoice(); const gen = ++speakGen;
    if (!enabled) return 0;
    const meta = manifest && manifest[id];
    if (!meta) return speakBrowser(text, onLevel);
    try {
      let buf = cache.get(id);
      if (!buf) {
        const raw = await fetch(`/voice/${id}.mp3?v=${meta.hash || ""}`).then((r) => r.arrayBuffer());   // (a regenerated clip has a new address, so no old copy is ever played)
        buf = await ctx.decodeAudioData(raw);
        cache.set(id, buf);
      }
      if (gen !== speakGen) return 0;   // a newer line started while this one was loading
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const rate = meta.rate || 1.13; src.playbackRate.value = rate;   // new clips play at true speed; the first ones were sped up
      const g = ctx.createGain(); src.connect(g); g.connect(voiceBus);   // its own fader, so a cut line fades rather than clicks
      src.start();
      const token = { src, g, raf: 0, onLevel };
      current = token;
      const data = new Uint8Array(analyser.fftSize);
      const loop = () => {
        if (current !== token) return;
        analyser.getByteTimeDomainData(data);
        let peak = 0;
        for (let i = 0; i < data.length; i += 4) peak = Math.max(peak, Math.abs(data[i] - 128));
        onLevel && onLevel(Math.min(1, peak / 46));
        token.raf = requestAnimationFrame(loop);
      };
      loop();
      src.onended = () => { if (current === token) { current = null; onLevel && onLevel(0); } };
      return buf.duration / rate;
    } catch { return speakBrowser(text, onLevel); }
  },
  stopVoice() {
    if (current) { const c = current, t = ctx.currentTime; current = null; cancelAnimationFrame(c.raf); c.onLevel && c.onLevel(0);
      try { c.g.gain.setTargetAtTime(0, t, 0.025); c.src.stop(t + 0.12); } catch {} }
    if ("speechSynthesis" in window) speechSynthesis.cancel();
  },
};

function build() {
  // a larger output buffer than the default: a few tens of milliseconds later, but it does not break up when the
  // page is busy (the wormhole, a fast scroll); nothing here needs lower latency than that
  ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: "playback" });
  master = ctx.createGain(); master.gain.value = 0.9;
  // a safety limiter on everything (voice, interface sounds, the soundscape): nothing can clip, however much plays at once
  const safe = ctx.createDynamicsCompressor(); safe.threshold.value = -4; safe.knee.value = 3; safe.ratio.value = 20; safe.attack.value = 0.002; safe.release.value = 0.15;
  master.connect(safe); safe.connect(ctx.destination);
  // Voice chain: a little high-pass and a faint ring modulation make the voice read as a small robot.
  voiceBus = ctx.createGain();
  const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 170;
  const presence = ctx.createBiquadFilter(); presence.type = "peaking"; presence.frequency.value = 2600; presence.gain.value = 4; presence.Q.value = 0.8;
  const ring = ctx.createGain(); ring.gain.value = 0.86;
  const lfo = ctx.createOscillator(); lfo.frequency.value = 58; lfo.type = "sine";
  const depth = ctx.createGain(); depth.gain.value = 0.14;
  lfo.connect(depth); depth.connect(ring.gain); lfo.start();
  analyser = ctx.createAnalyser(); analyser.fftSize = 256;
  voiceBus.connect(hp); hp.connect(presence); presence.connect(ring); ring.connect(analyser); analyser.connect(master);
}

function blip({ f, to, t, g, type, lp, wob }) {
  if (!enabled || !ctx) return;
  const now = ctx.currentTime, o = ctx.createOscillator(), a = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, now); o.frequency.exponentialRampToValueAtTime(Math.max(20, to), now + t);
  if (wob) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = wob; lg.gain.value = 40; l.connect(lg); lg.connect(o.frequency); l.start(now); l.stop(now + t); }
  a.gain.setValueAtTime(0.0001, now); a.gain.exponentialRampToValueAtTime(g, now + 0.008); a.gain.exponentialRampToValueAtTime(0.0001, now + t);
  let node = o;
  if (lp) { const fl = ctx.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.value = lp; o.connect(fl); node = fl; }
  node.connect(a); a.connect(master); o.start(now); o.stop(now + t + 0.02);
}

function noise(t, g, from, to) {
  if (!enabled || !ctx) return;
  const now = ctx.currentTime, len = Math.floor(ctx.sampleRate * t), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const s = ctx.createBufferSource(); s.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 0.9; f.frequency.setValueAtTime(from, now);
  if (to) f.frequency.exponentialRampToValueAtTime(to, now + t);
  const a = ctx.createGain(); a.gain.setValueAtTime(0.0001, now); a.gain.exponentialRampToValueAtTime(g, now + t * 0.3); a.gain.exponentialRampToValueAtTime(0.0001, now + t);
  s.connect(f); f.connect(a); a.connect(master); s.start(now);
}

function speakBrowser(text, onLevel) {
  if (!("speechSynthesis" in window) || !text) return 0;
  const u = new SpeechSynthesisUtterance(text);
  u.pitch = 1.7; u.rate = 1.05;
  const v = speechSynthesis.getVoices().find((x) => /en-(US|GB|IN)/.test(x.lang) && /female|zira|samantha|google/i.test(x.name));
  if (v) u.voice = v;
  let t = 0;
  u.onstart = () => { t = setInterval(() => onLevel && onLevel(0.3 + Math.random() * 0.7), 90); };
  u.onend = u.onerror = () => { clearInterval(t); onLevel && onLevel(0); };
  speechSynthesis.speak(u);
  return text.length * 0.06;
}
