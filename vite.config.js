// The production build: the tour (m13) as the site's front page, and nothing else.
//
// - public/ is not copied for the build: it also holds work files (previews of client sites, voice samples, design
//   mockups) that must never be published. Only an allowlist is copied: Otto's voice clips, the resume, and the
//   pictures the tour loads (found by reading the tour's own code, so a new picture is picked up by itself; a picture
//   it names that does not exist stops the build).
// - the output goes to site/ (dist/ holds an older build and is left alone).
// - the bundled code goes to /_app/ with hashed names (cached for a year); /assets/ keeps his portrait.
// The dev server is unchanged (it still serves public/).
import { defineConfig } from "vite";
import fs from "node:fs";
import path from "node:path";

const ROOT = import.meta.dirname, OUT = "site";

function picturesTheTourLoads() {
  const found = new Set();
  for (const f of fs.readdirSync(path.join(ROOT, "m13")).filter((f) => f.endsWith(".js"))) {
    const src = fs.readFileSync(path.join(ROOT, "m13", f), "utf8");
    for (const m of src.matchAll(/["'`]([\w/.-]+\.(?:jpe?g|png|webp|avif))["'`]/g)) found.add(m[1].startsWith("/") ? m[1].slice(1) : "m13/img/" + m[1]);
  }
  for (const p of found) if (!fs.existsSync(path.join(ROOT, p))) throw new Error("The tour loads a picture that is missing: " + p);
  return [...found];
}

const HEADERS = `/_app/*
  Cache-Control: public, max-age=31536000, immutable
/m13/img/*
  Cache-Control: public, max-age=604800
/assets/*
  Cache-Control: public, max-age=604800
/voice/*
  Cache-Control: public, max-age=86400
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: SAMEORIGIN
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
`;

const site = () => ({
  name: "portfolio-site",
  apply: "build",
  closeBundle() {
    const out = path.join(ROOT, OUT), copy = (rel, to = rel) => { fs.mkdirSync(path.dirname(path.join(out, to)), { recursive: true }); fs.copyFileSync(path.join(ROOT, rel), path.join(out, to)); };
    fs.renameSync(path.join(out, "m13/index.html"), path.join(out, "index.html"));   // the tour is the front page
    for (const f of fs.readdirSync(path.join(ROOT, "public/voice"))) if (/^[\w-]+\.(mp3|json)$/.test(f)) copy("public/voice/" + f, "voice/" + f);
    copy("public/resume.pdf", "resume.pdf");
    for (const p of picturesTheTourLoads()) copy(p);
    fs.writeFileSync(path.join(out, "_headers"), HEADERS);
    fs.writeFileSync(path.join(out, "robots.txt"), "User-agent: *\nAllow: /\n");
  },
});

export default defineConfig(({ command }) => ({
  publicDir: command === "serve" ? "public" : false,
  build: {
    outDir: OUT,
    emptyOutDir: true,
    assetsDir: "_app",
    target: "es2022",
    chunkSizeWarningLimit: 2000,
    rollupOptions: { input: { main: path.join(ROOT, "m13/index.html") } },
  },
  plugins: [site()],
}));
