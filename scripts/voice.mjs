// Pre-generates Otto's voice with Kokoro (free, open model, runs locally) and writes small MP3s.
// Run: npm run voice                (only regenerates lines whose text or voice changed)
//      OTTO_VOICE=am_michael npm run voice   (a different voice; see lab/voices.html for samples)
// Every line: his name said right, a pause between sentences, an unhurried pace (scripts/otto-speak.mjs). New clips
// play at their true speed (rate 1 in the manifest); the old clips were sped up 1.13x to sound smaller.
import { KokoroTTS } from "kokoro-js";
import fs from "fs";
import crypto from "crypto";
import { allLines } from "../src/data.js";
import { speakLine, mp3, useVoiceMix } from "./otto-speak.mjs";

// Fable (chosen by Yatharth), warmed with a share of Puck; OTTO_VOICE=<id> for one plain voice instead
const MIX = process.env.OTTO_VOICE ? { [process.env.OTTO_VOICE]: 1 } : { bm_fable: 0.7, am_puck: 0.3 }, VOICE = Object.keys(MIX)[0];
const SPEED = 1.06, PIPE = "v5-friendly-mix-" + JSON.stringify(MIX), OUT = "public/voice";
const manifestPath = `${OUT}/manifest.json`;
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : {};
const tts = await useVoiceMix(await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { dtype: "q8", device: "cpu" }), MIX);

for (const [id, text] of Object.entries(allLines())) {
  const hash = crypto.createHash("md5").update(PIPE + VOICE + SPEED + text).digest("hex").slice(0, 8);
  if (manifest[id]?.hash === hash && fs.existsSync(`${OUT}/${id}.mp3`)) continue;
  const { audio, rate, seg } = await speakLine(tts, text, { voice: VOICE, speed: SPEED });
  fs.writeFileSync(`${OUT}/${id}.mp3`, await mp3(audio, rate, 64));
  manifest[id] = { hash, dur: +(audio.length / rate).toFixed(2), rate: 1, voice: MIX, seg };   // seg: [start, end, sentence] for subtitles
  fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  console.log("voiced", id);
}
console.log("done", Object.keys(manifest).length);
