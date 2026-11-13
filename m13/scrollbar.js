// The scrollbar, made for the trip: a slim line on the right with a marker for each world, the current one lit and
// named; a thumb that glides with the journey (not jumping with the raw scroll) and stretches into a comet when you
// fly fast or go through a portal; markers that pop as you reach them. Hover widens it and names every world; click
// a marker to go there, click the line to jump, drag the thumb to scrub. It dims when you have not moved for a while.
// The browser's own scrollbar is hidden (the wheel, trackpad and keys work as before).
import { animate } from "motion";

export function createScrollbar({ total, marks, go, reduced = false, unit = () => innerHeight }) {   // unit: one screen of scroll, in px
  const el = document.createElement("div"); el.className = "sb"; el.setAttribute("role", "scrollbar"); el.setAttribute("aria-orientation", "vertical"); el.setAttribute("aria-label", "Journey");
  el.innerHTML = `<i class="sb-track"></i><i class="sb-fill"></i>${marks.map((m, i) => `<button class="sb-mark" type="button" data-i="${i}" style="top:${((m.s / total) * 100).toFixed(2)}%" aria-label="Go to ${m.label}"><i></i><span>${m.label}</span></button>`).join("")}<i class="sb-thumb"></i>`;
  document.body.append(el);
  const thumb = el.querySelector(".sb-thumb"), fill = el.querySelector(".sb-fill"), btns = [...el.querySelectorAll(".sb-mark")];
  const st = { p: 0, shown: 0, idle: 0, cur: -1, drag: false, h: 1, top: 0 };
  const measure = () => { const r = el.getBoundingClientRect(); st.h = r.height; st.top = r.top; };
  measure(); addEventListener("resize", measure);
  btns.forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); go(marks[+b.dataset.i]); }));
  // click the line to jump there; drag the thumb (or the line) to scrub
  const toS = (y) => Math.max(0, Math.min(1, (y - st.top) / st.h)) * total;
  el.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".sb-mark")) return;
    measure(); st.drag = true; el.classList.add("drag"); el.setPointerCapture(e.pointerId);
    scrollTo({ top: toS(e.clientY) * unit(), behavior: e.target === thumb || reduced ? "auto" : "smooth" });
  });
  el.addEventListener("pointermove", (e) => { if (st.drag) scrollTo(0, toS(e.clientY) * unit()); });
  const end = () => { st.drag = false; el.classList.remove("drag"); }; el.addEventListener("pointerup", end); el.addEventListener("pointercancel", end);
  addEventListener("scroll", () => (st.idle = 0), { passive: true });
  el.addEventListener("pointerenter", () => (st.idle = 0));

  return {
    show(on) { el.classList.toggle("on", on); if (on && !reduced) animate(el.querySelector(".sb-track"), { scaleY: [0, 1] }, { duration: 0.9, ease: [0.22, 1, 0.36, 1] }); },
    // s: where the journey is (eased), speed: 0..1, inWorm: going through a portal
    update(s, dt, speed, inWorm) {
      const p = Math.max(0, Math.min(1, s / total)), y = p * st.h;
      // the comet: stretched along the way you are going, brighter, when fast or in a portal
      const v = (p - st.p) / Math.max(dt, 1e-3), dir = v >= 0 ? 1 : -1, len = reduced ? 0 : Math.min(70, Math.abs(v) * st.h * 0.12 + (inWorm ? 26 : 0) * Math.min(1, speed * 2));
      st.p = p;
      thumb.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0) translateY(-50%)`;
      thumb.style.setProperty("--tail", len.toFixed(1) + "px"); thumb.classList.toggle("fast", len > 6); thumb.classList.toggle("down", dir > 0); thumb.classList.toggle("up", dir < 0);
      fill.style.transform = `scaleY(${p.toFixed(4)})`;
      // the world you are in, lit; a pop as you reach it
      let cur = -1; marks.forEach((m, i) => { if (s >= m.s - 0.25) cur = i; });
      if (cur !== st.cur) { if (st.cur >= 0) btns[st.cur].classList.remove("cur"); if (cur >= 0) { btns[cur].classList.add("cur"); if (!reduced) animate(btns[cur].firstElementChild, { scale: [1, 2.1, 1] }, { duration: 0.6, ease: [0.22, 1, 0.36, 1] }); } st.cur = cur; }
      // it dims when nothing has moved for a while
      st.idle += dt; el.classList.toggle("idle", st.idle > 2.6 && !st.drag);
    },
  };
}
