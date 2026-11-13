# PRODUCT

## What this is
The personal portfolio of Yatharth Saxena, a full-stack developer and third-year B.Tech CSE student at Galgotias University (Greater Noida, India, graduating 2028, CGPA 8.40/10). "Yatharth" is Hindi for "real".

## Who it is for
1. Freelance clients first: small businesses and founders in India who want a website or online store. They judge in seconds on how good the page looks and feels, and whether real client work is shown.
2. Recruiters and engineers second: hiring for software internships and entry-level roles. They want proof he can build, links to code, and a resume.

## What it must make them do
- Clients: send a project enquiry (WhatsApp message written for them, or a call).
- Recruiters: open the one-page resume and the GitHub repos.

## Real proof (nothing may be invented)
- Aashi Enterprises (aashienterprises.store): a live devotional-electronics store taking real customer orders. He designed it, built it and wrote its APIs (cart, order tracking, pincode delivery check, WhatsApp enquiries, 3D room preview).
- Drona Tek (dronatek.in): an API-driven product catalogue with interactive Three.js 3D product models and a per-product design picker, built ahead of the brand's online launch. The user considers this his best-looking work and the quality bar for the portfolio: soft light, glossy 3D product, pill controls, product callouts, serif italic with grotesk.
- Aethon: AI assistant for space experiments (Smart India Hackathon 2026 internal pre-qualifiers, Rank 3 in Software, Top 10 overall, team of 6). He built the React/Three.js mission-control dashboard and the voice pipeline (speech to text, local LLM via Ollama, text to speech).
- QuickBite: food ordering with a pickup-time engine that counts walk-in load (React, Node, Express; VibeCon finalist, team of 3).
- Jarvis: Python voice assistant.
- Tech Lead, IEEE Computer Society, Galgotias University. Certifications: Red Hat, Oracle Academy, GUVI/HCL.
- No public pricing. No earnings figures.

## The unique mechanism
Otto: a small robot character that travels through the page as the visitor scrolls, explains each section out loud in a natural voice, can be picked up and thrown (physics), and answers typed questions from a local answer bank. It must cost nothing to run.

## Assets that exist
- One portrait photo (assets/yatharth.webp): sage-green backdrop, black blazer, glasses, big smile.
- Real screenshots of both client sites (desktop and phone).
- Pre-generated voice clips for Otto. No video. No image-generation tool.

## What the owner wants it to feel like
Very premium, heavy and creative: a creative background, strong scroll-driven animation, premium button styles, custom cursor, sound. He rejected two rounds as not good enough: a flat cobalt giant-type page ("literally shit" next to his Drona site) and three mockups (dark aurora glass, soft pastel silk, black with neon lime) which he called "AI slop". A polished result that looks like a template or like every other AI-made portfolio is the failure.

## Constraints
Vite + vanilla JS, GSAP ScrollTrigger and Lenis already in place. Must run well on mid-range Android phones. Free hosting (Cloudflare Pages).

## Pinned by the owner (2026-11-11, third round)
He rejected a third round too (a build-manual page, a green studio "launch" page, a torn-poster wall). He has now pinned the aesthetic himself, so it is no longer open:
- **Claymorphism or spatial UI**: soft, inflated, tactile 3D forms with real depth, light and shadow. Good components, a rich background, and real material texture on elements.
- His reference for "premium" is the Awwwards nominees list. What those sites have that the rejected rounds did not: a real rendered 3D world (materials, lighting, depth) as the page itself, for example a developer portfolio where a 3D character sits in a sky scene (codeofsagar.in), a clay-like 3D desert scene, real 3D objects you can touch. One coherent scene, restrained type and UI on top, sound toggle, smooth scroll. Not CSS gradients, blobs, glass panels or flat SVG drawings standing in for 3D.
- So Otto and the world must be real-time 3D (Three.js, which he already uses on Drona Tek), with clay or soft-plastic materials and soft shadows, and the interface components must share that material.
