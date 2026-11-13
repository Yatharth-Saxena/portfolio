// Icons for the tour. Tech logos come from Simple Icons (CC0), line icons from Lucide (ISC), one stroke
// weight throughout. Everything is drawn white: on the glass the marks stay inside black / white / accent,
// and only status (live, rank) takes the accent.
import { siJavascript, siThreedotjs, siCloudflare, siReact, siNodedotjs, siExpress, siPython, siOllama, siWhatsapp, siGithub } from "simple-icons";
import { ShoppingCart, MapPin, Box, Mic, Volume2, Clock, AppWindow, ShoppingBag, Braces, Rotate3d, AudioLines, Mail, ArrowRight, Users } from "lucide-static";

const LINKEDIN = "M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z";
const logos = { javascript: siJavascript.path, three: siThreedotjs.path, cloudflare: siCloudflare.path, react: siReact.path, node: siNodedotjs.path, express: siExpress.path, python: siPython.path, ollama: siOllama.path, whatsapp: siWhatsapp.path, github: siGithub.path, linkedin: LINKEDIN };
const lines = { cart: ShoppingCart, pin: MapPin, box: Box, mic: Mic, speaker: Volume2, clock: Clock, window: AppWindow, bag: ShoppingBag, braces: Braces, rotate: Rotate3d, wave: AudioLines, mail: Mail, arrow: ArrowRight, people: Users };

const logoSvg = (d, fill = "#fff") => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="256" height="256"><path fill="${fill}" d="${d}"/></svg>`;
const lineSvg = (s, stroke = "#fff", w = 1.75) => s.replace(/currentColor/g, stroke).replace(/stroke-width="2"/, `stroke-width="${w}"`).replace(/width="24"/, 'width="256"').replace(/height="24"/, 'height="256"');
export const svgOf = (name, colour = "#fff") => (logos[name] ? logoSvg(logos[name], colour) : lineSvg(lines[name], colour));

// name -> a white image of it, ready for canvas
export const ICONS = {};
export function loadIcons() {
  const all = [...Object.keys(logos), ...Object.keys(lines)];
  return Promise.all(all.map((n) => new Promise((res) => {
    const im = new Image(); im.onload = () => { ICONS[n] = im; res(); }; im.onerror = res;
    im.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgOf(n));
  })));
}
// for the DOM: an inline icon sized to the text around it
export function inlineIcon(name) { return svgOf(name, "currentColor").trim().replace('width="256"', 'width="1.15em"').replace('height="256"', 'height="1.15em" aria-hidden="true" focusable="false"').replace(/class="[^"]*"/, "").replace(/^<svg/, '<svg class="ic"'); }
