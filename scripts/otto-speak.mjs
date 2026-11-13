// Otto's speech, shared by the voice scripts: his name said right, a breath between sentences, an unhurried pace.
//
// Pronunciation: the speech model reads "Yatharth" as YATH-arth (the a of "cat", stress on the first syllable) and
// "Saxena" as sax-EE-nuh. Its phonemes are swapped for yuh-THAARTH (यथार्थ: a light first syllable, a long aa,
// the stress on it) and suk-SAY-naa (सक्सेना). English "th" is the closest the English voices have to थ.
// Pacing: each sentence is spoken on its own and joined with a short silence, so he pauses the way people do,
// instead of running one sentence into the next.
// (American voices spell it jˈæθɑːɹθ; British ones jˈaθɑːθ, with a different a and no r: both are caught)
export const NAME_FIX = [
  [/j[ˈˌ]?[æa]θ[ɑɐ]ː?ɹ?θ/g, "jəθˈɑːɹθ"],        // Yatharth
  [/s[ˈˌ]?[æa]ks[ˈˌ]?iːn[əɐ]/g, "səksˈeɪnɑː"],  // Saxena
];

// A voice of our own: a blend of the model's voices (their style vectors mixed by weight), spoken with the first
// voice's accent. Fable alone is calm and a little formal; a share of Puck brings warmth and lift.
export async function useVoiceMix(tts, mix) {
  const fs = await import("fs"), path = await import("path"), { createRequire } = await import("module"), { Tensor, RawAudio } = await import("@huggingface/transformers");
  const voices = (createRequire(import.meta.url).resolve.paths("kokoro-js") || []).map((d) => path.join(d, "kokoro-js", "voices")).find((d) => fs.existsSync(d));   // (wherever kokoro-js is installed: under scripts/ or the project)
  let style = null;
  for (const [name, w] of Object.entries(mix)) {
    const b = fs.readFileSync(path.join(voices, name + ".bin")), v = new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4);
    if (!style) style = new Float32Array(v.length); for (let i = 0; i < v.length; i++) style[i] += v[i] * w;
  }
  tts.generate_from_ids = async (ids, { speed = 1 } = {}) => {
    const l = 256 * Math.min(Math.max(ids.dims.at(-1) - 2, 0), 509);
    const { waveform } = await tts.model({ input_ids: ids, style: new Tensor("float32", style.slice(l, l + 256), [1, 256]), speed: new Tensor("float32", [speed], [1]) });
    return new RawAudio(waveform.data, 24000);
  };
  return tts;
}
export const ALT_NAME = "jətˈɑːɹt";              // the other way to say it (a Hindi-style hard t), for comparison

export function fixNames(tts, fixes = NAME_FIX) {
  if (tts.__fixed) return tts;
  const orig = tts.tokenizer, log = [];
  tts.tokenizer = (ph, opts) => { const out = fixes.reduce((s, [a, b]) => s.replace(a, b), ph); log.push([ph, out]); return orig(out, opts); };
  tts.__fixed = true; tts.__log = log; return tts;
}

// split into sentences (keeping their punctuation); only a one-word fragment stays with the sentence before it, so
// a short line like "That's Yatharth." gets its own beat after a question
export function sentences(text) {
  // (a sentence ends at . ! ? or … followed by a space: never inside aashienterprises.store, Three.js, B.Tech or 8.4)
  const parts = text.split(/(?<=[.!?…]["”’)]*)\s+/);
  const out = [];
  for (const p of parts.map((s) => s.trim()).filter(Boolean)) { if (out.length && p.split(/\s+/).length < 2) out[out.length - 1] += " " + p; else out.push(p); }
  return out;
}

// what the voice is given (the subtitles keep the real words): "live" in his lines always means a site that is live,
// which the model sometimes reads as "liv" ("already live."); spelt "lyve" it always says it to rhyme with five
const sayable = (t) => t.replace(/\blive\b/g, "lyve").replace(/\bLive\b/g, "Lyve");

// speak a line, the way a person paces it: each sentence on its own, its pace set by what kind of sentence it is
// (a question lifts and moves; a short line lands slowly; the first settles in), a breath at a dash, colon or
// semicolon, a pause between sentences that is longer after a question or a short line and longest before the
// last one. Returns the audio and where each sentence sits in it (for subtitles).
export async function speakLine(tts, text, { voice, speed = 1.06, gap = 0.27, qGap = 0.4, clause = 0.15 } = {}) {
  fixNames(tts);
  const chunks = [], seg = [], ss = sentences(text); let rate = 24000, t = 0;
  const push = (x) => { chunks.push(x); t += x.length / rate; };
  for (let i = 0; i < ss.length; i++) {
    const sen = ss[i], words = sen.split(/\s+/).length, q = /\?["”’)]*$/.test(sen), ex = /!["”’)]*$/.test(sen), short = words <= 4;
    const sp = speed * (q ? 1.02 : ex ? 1.04 : short ? 0.96 : i === 0 && ss.length > 1 ? 0.99 : 1);
    const t0 = t;
    const parts = sen.split(/(?<=[—:;])\s+|\s+(?=—)/).filter((p) => p.trim());
    for (let k = 0; k < parts.length; k++) {
      const a = await tts.generate(sayable(parts[k]), { voice, speed: sp }); rate = a.sampling_rate;
      push(trim(a.audio, rate));
      if (k < parts.length - 1) push(new Float32Array(Math.round(rate * clause)));
    }
    seg.push([+t0.toFixed(2), +t.toFixed(2), sen]);
    if (i < ss.length - 1) { const last = i === ss.length - 2; push(new Float32Array(Math.round(rate * ((q ? qGap : ex ? 0.32 : short ? 0.33 : gap) + (last ? 0.06 : 0))))); }
  }
  const n = chunks.reduce((s, c) => s + c.length, 0), audio = new Float32Array(n); let o = 0; for (const c of chunks) { audio.set(c, o); o += c.length; }
  return { audio, rate, seg };
}
// trim the silence the model leaves at each end (keeping a few ms so nothing clicks)
function trim(x, rate) {
  const th = 0.008, pad = Math.round(rate * 0.03); let a = 0, b = x.length - 1;
  while (a < b && Math.abs(x[a]) < th) a++; while (b > a && Math.abs(x[b]) < th) b--;
  return x.slice(Math.max(0, a - pad), Math.min(x.length, b + pad));
}

// the site's voice chain, offline (for previews): high-pass 170 Hz, a +4 dB presence lift at 2.6 kHz, and the faint
// 58 Hz ring that makes him sound like a robot
export function robotTint(x, rate) {
  const biquad = (b0, b1, b2, a0, a1, a2) => { let x1 = 0, x2 = 0, y1 = 0, y2 = 0; return (v) => { const y = (b0 * v + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0; x2 = x1; x1 = v; y2 = y1; y1 = y; return y; }; };
  const hp = (() => { const w = (2 * Math.PI * 170) / rate, c = Math.cos(w), al = Math.sin(w) / (2 * 0.707); return biquad((1 + c) / 2, -(1 + c), (1 + c) / 2, 1 + al, -2 * c, 1 - al); })();
  const pk = (() => { const A = Math.pow(10, 4 / 40), w = (2 * Math.PI * 2600) / rate, c = Math.cos(w), al = Math.sin(w) / (2 * 0.8); return biquad(1 + al * A, -2 * c, 1 - al * A, 1 + al / A, -2 * c, 1 - al / A); })();
  const y = new Float32Array(x.length); let peak = 0;
  for (let i = 0; i < x.length; i++) { const v = pk(hp(x[i])) * (0.86 + 0.14 * Math.sin((2 * Math.PI * 58 * i) / rate)); y[i] = v; peak = Math.max(peak, Math.abs(v)); }
  const g = peak > 0 ? 0.89 / peak : 1; for (let i = 0; i < y.length; i++) y[i] *= g; return y;
}

export async function mp3(audio, rate, kbps = 64) {
  const { Mp3Encoder } = await import("@breezystack/lamejs");
  const pcm = new Int16Array(audio.length); for (let i = 0; i < pcm.length; i++) pcm[i] = Math.max(-1, Math.min(1, audio[i])) * 32767;
  const enc = new Mp3Encoder(1, rate, kbps), chunks = [];
  for (let i = 0; i < pcm.length; i += 1152) { const b = enc.encodeBuffer(pcm.subarray(i, i + 1152)); if (b.length) chunks.push(Buffer.from(b)); }
  const end = enc.flush(); if (end.length) chunks.push(Buffer.from(end));
  return Buffer.concat(chunks);
}
