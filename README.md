# Yatharth Saxena · portfolio

A scroll-driven 3D tour of my work, guided by Otto, a robot I built. Five worlds (Hello, About, What I make, Work,
Let's talk) joined by wormholes, with Otto narrating each stop in his own voice.

Live: https://yatharthportfolio.pages.dev

Built with Three.js, GSAP and Motion, bundled with Vite. Otto's voice is generated offline with Kokoro TTS, and the
sounds are synthesised in the browser with Web Audio.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173/m13/index.html (the cobalt version: `?c=blue`).

## Build

```bash
npm run build
```

The site is written to `site/`, with the tour as its front page. Only what the tour uses is copied in: Otto's voice
clips, the resume and the pictures the tour's code names (see `vite.config.js`).

Cloudflare Pages builds and publishes the site on every push to `main` (build command `npm run build`, output
folder `site`).

## Layout

- `m13/`: the site (the tour, its worlds, Otto, the sound, the scrollbar, the cursor, the icons and the studio
  lights) and its pictures in `m13/img/` (credits in `m13/img/credits.json`). Notes on every round of work are in
  `m13/DIMENSIONS.md`.
- `src/`: Otto's lines and answers (`data.js`) and his voice player (`sound.js`).
- `public/`: Otto's voice clips and the resume the site links to.
- `assets/`: my portrait (`yatharth-cut.webp` is made from `yatharth.webp` by `scripts/cutout.mjs`).
- `scripts/`: Otto's voice clips (`npm install --prefix scripts`, then `npm run voice`) and the portrait cut-out.
- `resume/`: the resume and the script that builds it.
