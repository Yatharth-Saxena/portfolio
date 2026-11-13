// Full-resolution cutout of assets/yatharth.webp: keys off the flat sage background,
// removes green spill, unmixes edge colour, writes assets/yatharth-cut.webp (RGBA, lossless).
import sharp from "sharp";

const SRC = "assets/yatharth.webp", OUT = "assets/yatharth-cut.webp";
const { data, info } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const w = info.width, h = info.height, N = w * h, C = info.channels;

const avg = (x0, y0, n) => { let r = 0, g = 0, b = 0, c = 0; for (let y = y0; y < y0 + n; y++) for (let x = x0; x < x0 + n; x++) { const k = (y * w + x) * C; r += data[k]; g += data[k + 1]; b += data[k + 2]; c++; } return [r / c / 255, g / c / 255, b / c / 255]; };
const n = Math.round(w * 0.04), a1 = avg(6, 6, n), a2 = avg(w - n - 6, 6, n), a3 = avg(6, Math.round(h * 0.4), n), a4 = avg(w - n - 6, Math.round(h * 0.4), n);
const K = [0, 1, 2].map((i) => (a1[i] + a2[i] + a3[i] + a4[i]) / 4);
const ss = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

let A = new Float32Array(N);
for (let q = 0; q < N; q++) {
  const k = q * C, r = data[k] / 255, g = data[k + 1] / 255, b = data[k + 2] / 255;
  const d = Math.hypot(r - K[0], g - K[1], b - K[2]);
  let a = ss(0.07, 0.2, d);
  const greenish = g - Math.max(r, b); // sage is green-dominant; skin, hair and jacket are not
  if (greenish > 0.015) a *= 1 - ss(0.015, 0.06, greenish) * (1 - ss(0.22, 0.34, d));
  A[q] = a;
}
// keep only the subject: flood-fill background from the border, anything not reachable is solid
const bg = new Uint8Array(N), st = [];
for (let x = 0; x < w; x++) { st.push(x, (h - 1) * w + x); }
for (let y = 0; y < h; y++) { st.push(y * w, y * w + w - 1); }
while (st.length) { const q = st.pop(); if (bg[q] || A[q] > 0.5) continue; bg[q] = 1; const x = q % w, y = (q / w) | 0; if (x > 0) st.push(q - 1); if (x < w - 1) st.push(q + 1); if (y > 0) st.push(q - w); if (y < h - 1) st.push(q + w); }
for (let q = 0; q < N; q++) if (!bg[q] && A[q] <= 0.5) A[q] = 1; // fill holes (glasses, teeth highlights)

const T = new Float32Array(N);
const pass = (S, rad, op) => {
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let v = op === "min" ? 1 : 0, c = 0; for (let i = -rad; i <= rad; i++) { const xx = x + i; if (xx < 0 || xx >= w) continue; const s = S[y * w + xx]; if (op === "min") v = Math.min(v, s); else { v += s; c++; } } T[y * w + x] = op === "min" ? v : v / c; }
  for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) { let v = op === "min" ? 1 : 0, c = 0; for (let i = -rad; i <= rad; i++) { const yy = y + i; if (yy < 0 || yy >= h) continue; const s = T[yy * w + x]; if (op === "min") v = Math.min(v, s); else { v += s; c++; } } S[y * w + x] = op === "min" ? v : v / c; }
};
const inner = new Float32Array(N); for (let q = 0; q < N; q++) inner[q] = bg[q] ? 0 : 1;
pass(inner, 8, "min");
pass(A, 3, "min"); pass(A, 2, "box"); pass(A, 1, "box");
for (let q = 0; q < N; q++) if (inner[q] > 0.5) A[q] = 1; // no pin-holes inside the face/glasses

// edge colour: take it from pixels well inside the edge (kills the light halo + dark outline)
const deep = Float32Array.from(A); pass(deep, 7, "min");
const S = new Float32Array(N), CH = [new Float32Array(N), new Float32Array(N), new Float32Array(N)];
for (let q = 0; q < N; q++) { const s = deep[q] > 0.98 ? 1 : 0; deep[q] = s; S[q] = s; for (let i = 0; i < 3; i++) CH[i][q] = s * data[q * C + i] / 255; }
const R = 12; pass(S, R, "box"); CH.forEach((M) => pass(M, R, "box"));
const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

const out = Buffer.alloc(N * 4);
for (let q = 0; q < N; q++) {
  const k = q * C, a = A[q];
  let r = data[k] / 255, g = data[k + 1] / 255, b = data[k + 2] / 255;
  if (!deep[q] && a > 0 && S[q] > 1e-4) {
    const ir = CH[0][q] / S[q], ig = CH[1][q] / S[q], ib = CH[2][q] / S[q];
    const lighter = Math.max(0, lum(r, g, b) - lum(ir, ig, ib)), greenish = Math.max(0, g - Math.max(r, b));
    const t = Math.min(1, Math.max(1 - ss(0.6, 0.985, a), lighter * 3.5, greenish * 12));
    r += (ir - r) * t; g += (ig - g) * t; b += (ib - b) * t;
  }
  g = Math.min(g, Math.max(r, b) + 0.01); // despill
  const o = q * 4;
  out[o] = Math.round(Math.min(1, Math.max(0, r)) * 255); out[o + 1] = Math.round(Math.min(1, Math.max(0, g)) * 255); out[o + 2] = Math.round(Math.min(1, Math.max(0, b)) * 255); out[o + 3] = Math.round(a * 255);
}
await sharp(out, { raw: { width: w, height: h, channels: 4 } }).webp({ lossless: true }).toFile(OUT);
await sharp(out, { raw: { width: w, height: h, channels: 4 } }).flatten({ background: "#7a0010" }).jpeg({ quality: 90 }).toFile(process.env.CHECK || "cut-check.jpg");
console.log("ok", w, h, "key", K.map((v) => v.toFixed(3)).join(","));
