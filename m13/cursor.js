// A cursor of its own, in the manner of the iPad's pointer, alongside the WebGL lens that bends space under it:
//   at rest, a small precise dot and a soft ring trailing it on a spring (stretching a little along fast moves);
//   over a button or link, the ring leaves the dot and becomes a highlight round the element itself (its size and
//     corner radius, tinted with the accent), the element leaning a few pixels toward the pointer, like a magnet;
//   over a glass tile, the ring swells into a larger soft circle; over a text field, it becomes a thin caret;
//   pressing squeezes it; a click sends a ripple out.
// Only with a real mouse (hover and a fine pointer). With reduced motion: no trailing, no lean, no stretch.
const LINK = 'a, button, [data-go], summary, label[for], .chip, [role="button"], input[type="submit"], input[type="button"]';
const TEXT = 'input:not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"]';
const TILE = ".pin .tag, .head.glass";
const MAGNET = ".pill, .start, .skip, #snd, .rooms button, .chip, #ask button, nav a";

export function createCursor({ reduced = false } = {}) {
  if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return null;
  const root = document.createElement("div"); root.className = "cur"; root.setAttribute("aria-hidden", "true");
  root.innerHTML = '<i class="cur-ring"></i><i class="cur-dot"></i>';
  document.body.append(root); document.documentElement.classList.add("has-cur");
  const ring = root.children[0], dot = root.children[1];

  const P = { x: innerWidth / 2, y: innerHeight / 2, seen: false };
  const R = { x: P.x, y: P.y, w: 34, h: 34, r: 17, px: P.x, py: P.y };      // the ring (centre, size, corner)
  let hov = null, mode = "free", down = false, magEl = null, mag = { x: 0, y: 0 }, last = performance.now(), recheck = 0;

  const setMode = (m) => { if (m !== mode) { mode = m; root.dataset.m = m; } };
  // only what can really be pressed counts: something faded out, hidden or switched off (the start screen after
  // Start, a label as it leaves) does not keep the ring round it
  const live = (el) => { for (let e = el; e && e !== document.body; e = e.parentElement) { if (e.classList.contains("gone")) return false; const cs = getComputedStyle(e); if (cs.visibility === "hidden" || cs.display === "none" || +cs.opacity < 0.05 || cs.pointerEvents === "none") return false; } return true; };
  const pick = (t) => {
    if (!t || !t.closest) return [null, "free"];
    let el = t.closest(TEXT); if (el && live(el)) return [el, "text"];
    el = t.closest(LINK); if (el && live(el)) return [el, "link"];
    el = t.closest(TILE); if (el && getComputedStyle(el).visibility !== "hidden") return [el, "tile"];
    return [null, "free"];
  };
  document.addEventListener("pointerover", (e) => { const [el, m] = pick(e.target); hov = el; setMode(m); }, { passive: true });
  addEventListener("pointermove", (e) => {
    P.x = e.clientX; P.y = e.clientY;
    if (!P.seen) { P.seen = true; R.x = R.px = P.x; R.y = R.py = P.y; root.classList.add("on"); }
  }, { passive: true });
  document.documentElement.addEventListener("pointerleave", () => root.classList.remove("on"));
  document.documentElement.addEventListener("pointerenter", () => P.seen && root.classList.add("on"));
  addEventListener("pointerdown", () => { down = true; root.classList.add("down"); }, { passive: true });
  addEventListener("pointerup", () => {
    down = false; root.classList.remove("down"); recheck = 0.05;   // a click often changes what is there
    // a ripple from where you clicked
    const rp = document.createElement("i"); rp.className = "cur-ripple"; rp.style.setProperty("--x", P.x + "px"); rp.style.setProperty("--y", P.y + "px");
    root.append(rp); setTimeout(() => rp.remove(), 600);
  }, { passive: true });
  // a scroll moves things under a still pointer: look again at what it is over
  addEventListener("scroll", () => { const t = document.elementFromPoint(P.x, P.y); const [el, m] = pick(t); hov = el; setMode(m); }, { passive: true });

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const k = (rate) => (reduced ? 1 : 1 - Math.exp(-dt * rate));
    let cx = P.x, cy = P.y, tw = 34, th = 34, tr = 17, rate = 16, lean = { x: 0, y: 0 };
    if (hov && !hov.isConnected) { hov = null; setMode("free"); }
    // look again at what is under the pointer now and then (things move and vanish under a still mouse)
    if (P.seen && (recheck -= dt) <= 0) { recheck = 0.12; const [el, m] = pick(document.elementFromPoint(P.x, P.y)); if (el !== hov || m !== mode) { hov = el; setMode(m); } }
    if (mode === "link" && hov) {
      const b = hov.getBoundingClientRect(), pad = b.height < 30 ? 7 : 6, mx = b.left + b.width / 2, my = b.top + b.height / 2;
      if (b.width < 520 && b.height < 160) {
        // the ring wraps the element (its corners too) and drifts a little with the pointer; the element leans
        const br = parseFloat(getComputedStyle(hov).borderTopLeftRadius) || 8;
        tw = b.width + pad * 2; th = b.height + pad * 2; tr = Math.min(th / 2, br + pad);
        cx = mx + (P.x - mx) * 0.1; cy = my + (P.y - my) * 0.12; rate = 22;
        if (!reduced && hov.matches(MAGNET)) lean = { x: Math.max(-5, Math.min(5, (P.x - mx) * 0.14)), y: Math.max(-4, Math.min(4, (P.y - my) * 0.18)) };
      } else { tw = th = 54; tr = 27; }
    } else if (mode === "text" && hov) {
      const b = hov.getBoundingClientRect(); tw = 2; th = Math.min(26, b.height * 0.62); tr = 1; rate = 30;
    } else if (mode === "tile") { tw = th = 60; tr = 30; rate = 14; }
    if (down) { tw *= mode === "link" ? 0.96 : 0.82; th *= mode === "link" ? 0.94 : 0.82; }
    // the spring (exponential: steady at any frame rate)
    R.x += (cx - R.x) * k(rate); R.y += (cy - R.y) * k(rate);
    R.w += (tw - R.w) * k(18); R.h += (th - R.h) * k(18); R.r += (tr - R.r) * k(18);
    // stretched a little along a fast move (only while free)
    const vx = (R.x - R.px) / Math.max(dt, 1e-3), vy = (R.y - R.py) / Math.max(dt, 1e-3); R.px = R.x; R.py = R.y;
    const sp = Math.hypot(vx, vy), st = !reduced && mode === "free" ? Math.min(0.32, sp / 4200) : 0, ang = Math.atan2(vy, vx);
    ring.style.width = R.w.toFixed(1) + "px"; ring.style.height = R.h.toFixed(1) + "px"; ring.style.borderRadius = R.r.toFixed(1) + "px";
    ring.style.transform = `translate3d(${(R.x - R.w / 2).toFixed(1)}px, ${(R.y - R.h / 2).toFixed(1)}px, 0)` + (st > 0.01 ? ` rotate(${ang}rad) scale(${1 + st}, ${1 / (1 + st)}) rotate(${-ang}rad)` : "");
    dot.style.transform = `translate3d(${P.x}px, ${P.y}px, 0) scale(${down ? 0.7 : 1})`;
    // the magnet: the hovered control leans toward the pointer, and eases back when left
    const target = lean.x || lean.y ? hov : null;
    if (magEl && magEl !== target) { mag.x += (0 - mag.x) * k(14); mag.y += (0 - mag.y) * k(14); magEl.style.translate = `${mag.x.toFixed(2)}px ${mag.y.toFixed(2)}px`; if (Math.abs(mag.x) + Math.abs(mag.y) < 0.05) { magEl.style.translate = ""; magEl = null; } }
    if (target) { if (magEl !== target) { if (magEl) magEl.style.translate = ""; magEl = target; mag = { x: 0, y: 0 }; } mag.x += (lean.x - mag.x) * k(16); mag.y += (lean.y - mag.y) * k(16); magEl.style.translate = `${mag.x.toFixed(2)}px ${mag.y.toFixed(2)}px`; }
    requestAnimationFrame(frame);
  }
  root.dataset.m = mode; requestAnimationFrame(frame);
  return { root, get mode() { return mode; } };
}
