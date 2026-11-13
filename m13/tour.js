// Otto's tour, m13: dimensions. Start -> Otto's eyes wake and he greets you -> your scroll brings each part
// of him online -> he lifts off -> a gate assembles -> through a wormhole into a dimension: a world with its
// own light, where the content physically stands (photos in glass slabs, numbers on rock islands, his figure
// on a chrome sea) and the camera moves from one thing to the next -> its gate -> the next dimension.
// The page scrolls natively and you are always the one driving; nothing ever scrolls it for you. See DIMENSIONS.md.
import * as THREE from "three";
import gsap from "gsap";
import { animate, stagger } from "motion";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { Pass, FullScreenQuad } from "three/examples/jsm/postprocessing/Pass.js";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader.js";
import { lightStudio } from "/m13/otto3d.js";
import { buildOtto } from "/m13/otto-field.js";   // Otto, Field edition
import { sound } from "/src/sound.js";
import { allLines, CHIPS, byId, GUIDE } from "/src/data.js";
import { createSpace } from "/m13/space.js";
import { createGate } from "/m13/gate.js";
import { createPath } from "/m13/path.js";
import { loadIcons, inlineIcon } from "/m13/icons.js";
import { createBackdrops } from "/m13/backdrops.js";
import { createDistort } from "/m13/distort.js";
import { chromeOrb, dustRing } from "/m13/orb.js";
import { DIMS, createDims } from "/m13/dims.js";
import { createSoundscape, warmSoundscape } from "/m13/soundscape.js";
import { createCursor } from "/m13/cursor.js";
import { createScrollbar } from "/m13/scrollbar.js";
import { createWormhole } from "/m13/wormhole.js";
import { CSS3DRenderer } from "three/examples/jsm/renderers/CSS3DRenderer.js";

const Q = new URLSearchParams(location.search);
const RED = Q.get("c") !== "blue";   // blood red is the site's colour (?c=blue shows the cobalt version)
document.documentElement.classList.toggle("red", RED);
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const ACC = RED ? 0xd11a28 : 0x2350ff;
const LINES = allLines();
const $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = THREE.MathUtils.lerp, clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const UP = V(0, 1, 0);

// ---------------------------------------------------------------- renderer: never below the screen's own 1x
const canvas = $("#gl");
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" }); }
catch (e) { document.documentElement.classList.add("nogl"); throw e; }   // (the page shows its plain card instead)
const GPU = (() => { const gl = renderer.getContext(), e = gl.getExtension("WEBGL_debug_renderer_info"); return e ? String(gl.getParameter(e.UNMASKED_RENDERER_WEBGL)) : ""; })();
// Phones get the light tier, as the reference site does (a touch screen whose short side is under 700 px): no MSAA,
// a lighter bloom, fewer particles, one light fewer, and at most 1.25 pixels per CSS pixel. Tablets keep the full
// scene at up to 1.5.
const TOUCH = matchMedia("(pointer: coarse)").matches;
const PHONE = TOUCH && Math.min(innerWidth, innerHeight) < 700;
const LOW = Q.has("low") || PHONE || (/Intel|Mali|Adreno|PowerVR|SwiftShader|llvmpipe|Microsoft Basic/i.test(GPU) && !/Arc/i.test(GPU) && !Q.has("high"));
const DPR = Math.min(devicePixelRatio || 1, PHONE ? 1.25 : LOW ? 1 : TOUCH ? 1.5 : 1.6);
// The size the 3D is drawn at, and the unit the scroll is counted in (one screen). On a phone the browser's bars
// slide in and out as you scroll, changing the window's height each time: the journey would jump and the renderer
// re-size (a blank frame). There the large viewport's height is used (it ignores the bars) until the width changes.
const VP = { w: innerWidth, h: innerHeight };
const lvhProbe = document.createElement("div"); lvhProbe.style.cssText = "position:absolute;left:-9px;top:0;width:1px;height:100vh;height:100lvh;pointer-events:none;visibility:hidden"; document.body.append(lvhProbe);
function measureVP() { const w = innerWidth, h = TOUCH ? Math.max(lvhProbe.offsetHeight, innerHeight) : innerHeight; if (w === VP.w && h === VP.h) return false; VP.w = w; VP.h = h; return true; }
measureVP();
renderer.setPixelRatio(DPR);
renderer.toneMapping = THREE.AgXToneMapping; renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x020203);
scene.fog = new THREE.FogExp2(0x020203, 0.0095);
const camera = new THREE.PerspectiveCamera(40, VP.w / VP.h, 0.05, 2400);
// On a tall screen the camera opens out: its field of view is vertical, so a phone held upright would see a narrow
// slice of what a laptop sees. It widens with the narrowness (eased, so a phone still sees him close), to about 76°.
const fitFov = (f) => { const a = VP.w / VP.h; if (a >= 1.2) return f; const k = Math.min(2.1, Math.pow(1.2 / a, 0.85)); return Math.min(76, (Math.atan(Math.tan((f * Math.PI) / 360) * k) * 360) / Math.PI); };

// The post chain, kept lean (every full-screen pass costs real time on a laptop GPU):
// the scene (HDR; MSAA only on strong GPUs) → bloom, whose bright-pass also drops any non-finite pixel so a
// single bad value can never bloom into a black frame → a quarter-size softened copy of the frame for the
// glass → one final pass: cursor lens, the glass panes, transition, vignette, grain, bars, tone mapping.
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: LOW ? 0 : 4, stencilBuffer: true }));   // stencil: a wormhole is seen only through its gate
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.15, 1.5);   // tight, soft halos round what glows; a wide radius veils the whole frame in grey
// the bright pass reads the whole patch of screen each of its pixels stands for (13 taps, each 2x2 group weighted
// by 1/(1 + its brightness), as film and game engines do): one tap per 4x4 pixels made the glow flicker whenever a
// glint moved by less than a pixel
{ const m = bloom.materialHighPassFilter; m.uniforms.uPx = { value: new THREE.Vector2(1 / 256, 1 / 256) }; m.fragmentShader = "uniform sampler2D tDiffuse; uniform vec3 defaultColor; uniform float defaultOpacity; uniform float luminosityThreshold; uniform float smoothWidth; uniform vec2 uPx; varying vec2 vUv;\nvec3 tap(vec2 o){ vec4 t = texture2D(tDiffuse, vUv + o * uPx * .5); return (any(isnan(t)) || any(isinf(t))) ? vec3(0.) : min(t.rgb, vec3(60.)); }\nfloat lum(vec3 c){ return dot(c, vec3(.2126, .7152, .0722)); }\nvec3 grp(vec3 p, vec3 q, vec3 r, vec3 s, float w, inout float ws){ vec3 a = (p + q + r + s) * .25; float k = w / (1. + lum(a)); ws += k; return a * k; }\nvoid main(){\n  vec3 a = tap(vec2(-2., -2.)), b = tap(vec2(0., -2.)), c = tap(vec2(2., -2.)), d = tap(vec2(-1., -1.)), e = tap(vec2(1., -1.)), f = tap(vec2(-2., 0.)), g = tap(vec2(0., 0.)),\n       h = tap(vec2(2., 0.)), i = tap(vec2(-1., 1.)), j = tap(vec2(1., 1.)), k = tap(vec2(-2., 2.)), l = tap(vec2(0., 2.)), m = tap(vec2(2., 2.));\n  float ws = 0.; vec3 col = grp(d, e, i, j, .5, ws) + grp(a, b, f, g, .125, ws) + grp(b, c, g, h, .125, ws) + grp(f, g, k, l, .125, ws) + grp(g, h, l, m, .125, ws); col /= max(ws, 1e-5);\n  float v = lum(col), alpha = smoothstep(luminosityThreshold, luminosityThreshold + smoothWidth, v);\n  gl_FragColor = mix(vec4(defaultColor.rgb, defaultOpacity), vec4(col, 1.), alpha);\n}"; m.needsUpdate = true;
  const set = bloom.setSize.bind(bloom), f = LOW ? 0.33 : 0.5;
  bloom.setSize = (w, h) => { const bw = Math.round(w * f), bh = Math.round(h * f); set(bw, bh); m.uniforms.uPx.value.set(1 / Math.max(1, Math.round(bw / 2)), 1 / Math.max(1, Math.round(bh / 2))); }; }
composer.addPass(bloom);
// the glass's softened view of the scene: down to a quarter and an eighth, and back up to a quarter (a dual
// filter: wide and smooth for almost nothing)
class GlassBlurPass extends Pass {
  constructor() {
    super(); this.needsSwap = false;
    const rt = () => new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthBuffer: false });
    this.q = rt(); this.e = rt(); this.out = rt();
    const vs = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }";
    const down = "uniform sampler2D t; uniform vec2 px; varying vec2 vUv; vec3 s(vec2 o){ vec4 c = texture2D(t, vUv + o * px); return (any(isnan(c)) || any(isinf(c))) ? vec3(0.) : min(c.rgb, vec3(30.)); } void main(){ gl_FragColor = vec4((s(vec2(0.)) * 4. + s(vec2(-1., -1.)) + s(vec2(1., -1.)) + s(vec2(-1., 1.)) + s(vec2(1., 1.))) / 8., 1.); }";
    const up = "uniform sampler2D t; uniform vec2 px; varying vec2 vUv; vec3 s(vec2 o){ return texture2D(t, vUv + o * px).rgb; } void main(){ vec3 c = s(vec2(-2., 0.)) + s(vec2(2., 0.)) + s(vec2(0., -2.)) + s(vec2(0., 2.)) + (s(vec2(-1., 1.)) + s(vec2(1., 1.)) + s(vec2(-1., -1.)) + s(vec2(1., -1.))) * 2.; gl_FragColor = vec4(c / 12., 1.); }";
    const mat = (fs) => new THREE.ShaderMaterial({ uniforms: { t: { value: null }, px: { value: new THREE.Vector2() } }, vertexShader: vs, fragmentShader: fs, depthTest: false, depthWrite: false });
    this.mDown = mat(down); this.mUp = mat(up); this.quad = new FullScreenQuad(this.mDown);
  }
  setSize(w, h) { this.q.setSize(Math.max(1, w >> 2), Math.max(1, h >> 2)); this.e.setSize(Math.max(1, w >> 3), Math.max(1, h >> 3)); this.out.setSize(Math.max(1, w >> 2), Math.max(1, h >> 2)); }
  render(renderer, writeBuffer, readBuffer) {
    if (!this.on) return;
    const pass = (m, src, dst, texel) => { this.quad.material = m; m.uniforms.t.value = src.texture; m.uniforms.px.value.set(texel / src.width, texel / src.height); renderer.setRenderTarget(dst); this.quad.render(renderer); };
    pass(this.mDown, readBuffer, this.q, 1); pass(this.mDown, this.q, this.e, 1); pass(this.mUp, this.e, this.out, 1);
  }
}
const glassBlur = new GlassBlurPass(); composer.addPass(glassBlur);
// edges: MSAA on strong GPUs; on a laptop GPU, FXAA (one cheap pass) so nothing stair-steps
const fxaa = new ShaderPass(FXAAShader); fxaa.enabled = false; composer.addPass(fxaa);   // off: the final pass smooths edges itself, for a fraction of the cost
const distort = createDistort(renderer, { LOW });
// the lens: the cursor's bend in space, chromatic split and radial streaks with speed, the full-screen
// transition, vignette, grain, letterbox, fade
const cinema = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, tVel: { value: null }, uLens: { value: new THREE.Vector3(0.5, 0.5, 0) }, uDist: { value: distort.enabled ? 1 : 0 }, uT: { value: 0 }, uCA: { value: 0 }, uWarp: { value: 0 }, uBars: { value: 0 }, uAspect: { value: 1 }, uFade: { value: 0 }, uTrans: { value: 0 }, uAcc: { value: new THREE.Color(ACC) }, uGrade: { value: new THREE.Vector3(1, 1, 1) },
    tBlur: { value: null }, uView: { value: new THREE.Vector2(1, 1) }, uTexel: { value: new THREE.Vector2(0.001, 0.001) }, uMouse: { value: new THREE.Vector2(-999, -999) }, uPaneH: { value: [0, 0, 0, 0, 0, 0] }, uHue: { value: new THREE.Vector2(RED ? 0.97 : 0.62, RED ? 1.05 : 0.73) }, uPaneN: { value: 0 }, uPane: { value: Array.from({ length: 6 }, () => new THREE.Vector4()) }, uPaneE: { value: Array.from({ length: 6 }, () => new THREE.Vector4()) } },
  vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }",
  fragmentShader: `uniform sampler2D tDiffuse, tVel, tBlur; uniform vec3 uLens, uAcc; uniform float uDist, uT, uCA, uWarp, uBars, uAspect, uFade, uTrans; varying vec2 vUv;
    uniform vec2 uView; uniform int uPaneN; uniform vec4 uPane[6]; uniform vec4 uPaneE[6]; uniform vec3 uGrade; uniform vec2 uTexel, uMouse, uHue; uniform float uPaneH[6];
    vec3 hsv(vec3 c){ vec3 p = abs(fract(c.xxx + vec3(1., 2. / 3., 1. / 3.)) * 6. - 3.); return c.z * mix(vec3(1.), clamp(p - 1., 0., 1.), c.y); }
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    float h1(float n){ return fract(sin(n * 91.7) * 43758.5453); }
    void main(){
      // the cursor: a small mass that pinches space under it, and a wake that follows where it moved
      vec2 vel = texture2D(tVel, vUv).xy * uDist;
      vec2 lc = (vUv - uLens.xy) * vec2(uAspect, 1.); float lr2 = dot(lc, lc);
      vec2 uv = vUv - vel * .05 - (lc / vec2(uAspect, 1.)) * uLens.z * exp(-lr2 / .01) * uDist;
      float vm = length(vel);
      vec2 c = uv - .5; vec3 col = vec3(0.); vec2 d = c * uCA * .0045 * (1. + length(c)) + vel * .018;
      float warp = uWarp + uTrans * 5.;
      if (warp < .08) {
        vec3 cC = texture2D(tDiffuse, uv).rgb, cE = texture2D(tDiffuse, uv + vec2(uTexel.x, 0.)).rgb, cW = texture2D(tDiffuse, uv - vec2(uTexel.x, 0.)).rgb, cN = texture2D(tDiffuse, uv + vec2(0., uTexel.y)).rgb, cS = texture2D(tDiffuse, uv - vec2(0., uTexel.y)).rgb;
        col = vec3(texture2D(tDiffuse, uv + d).r, cC.g, texture2D(tDiffuse, uv - d).b);
        // anti-aliasing here, in place of a separate FXAA pass (which cost more than this whole pass): where the
        // neighbours say there is an edge, smooth along it. Luma on a compressed scale, so bright edges count like dark.
        vec3 W3 = vec3(.2126, .7152, .0722);
        float lC = dot(cC, W3), lE = dot(cE, W3), lW = dot(cW, W3), lN = dot(cN, W3), lS = dot(cS, W3);
        lC /= 1. + lC; lE /= 1. + lE; lW /= 1. + lW; lN /= 1. + lN; lS /= 1. + lS;
        float hi = max(lC, max(max(lE, lW), max(lN, lS))), rng = hi - min(lC, min(min(lE, lW), min(lN, lS))), th = max(.035, hi * .125);
        float edge = smoothstep(th, th + .1, rng);
        vec2 tg = vec2(lS - lN, lE - lW); float tl = length(tg);
        if (edge > 0. && tl > 1e-4) { tg *= uTexel / tl;   // two pairs of taps along the edge: long shallow stair-steps smooth out too
          vec3 aa = cC * .2 + (texture2D(tDiffuse, uv + tg * .75).rgb + texture2D(tDiffuse, uv - tg * .75).rgb) * .25 + (texture2D(tDiffuse, uv + tg * 1.75).rgb + texture2D(tDiffuse, uv - tg * 1.75).rgb) * .15;
          col = mix(col, aa, edge * .9); }
        // a light sharpen away from edges, undoing the softening of the upscale: the centre against its neighbours
        col = max(col + (col - (cE + cW + cN + cS) * .25) * .38 * (1. - edge), 0.);
      }
      else { for (int i = 0; i < 3; i++) { float k = 1. - warp * .03 * float(i) / 3.; vec2 q = .5 + c * k; col += vec3(texture2D(tDiffuse, q + d).r, texture2D(tDiffuse, q).g, texture2D(tDiffuse, q - d).b); } col /= 3.; }
      col += uAcc * vm * .25;
      if (any(isnan(col)) || any(isinf(col))) col = vec3(0.);
      // the glass panes (the page draws their tint, rim and words on top): through each, the scene softened;
      // along the rim it bends inward the way a thick rounded slab bends light, the colours parting slightly
      vec2 px = vec2(vUv.x, 1. - vUv.y) * uView;                          // CSS pixels, y down, as the page has them
      vec3 glow = vec3(0.);
      for (int i = 0; i < 6; i++) {
        if (i >= uPaneN) break;
        vec4 R = uPane[i], E = uPaneE[i];                                   // R: x, y, w, h · E: radius, opacity, rim band
        vec2 hs = R.zw * .5, cp = px - (R.xy + hs), q = abs(cp) - (hs - E.x);
        float inside = -(length(max(q, 0.)) + min(max(q.x, q.y), 0.) - E.x);
        // the hover glow (after the 21st.dev spotlight card): near the pointer the rim lights up in a hue that moves
        // from cobalt to violet across the card, a soft light spills past the edge, and a faint one falls inside
        float hv = uPaneH[i];
        if (hv > .002 && inside > -90.) {
          float dm = length(px - uMouse), spot = exp(-dm * dm / 72000.);                    // a wide, soft pool round the pointer
          vec3 gc = hsv(vec3(mix(uHue.x, uHue.y, clamp((uMouse.x - R.x) / max(R.z, 1.), 0., 1.)), .42, 1.));
          // one continuous light that peaks on the edge itself and fades both ways, into the glass and out into the
          // dark: no thin line of its own, so it reads as light on the glass, not as a second border
          float edge = inside > 0. ? exp(-inside / 9.) : exp(inside / 14.);
          float fill = inside > 0. ? exp(-dm * dm / 52000.) * .045 : 0.;
          glow += gc * (edge * spot * .4 + fill) * hv;
        }
        if (inside <= -1.) continue;
        vec2 sg = vec2(cp.x < 0. ? -1. : 1., cp.y < 0. ? -1. : 1.), n;     // the rim's outward normal
        if (q.x > 0. && q.y > 0.) n = normalize(q) * sg; else if (q.x > q.y) n = vec2(sg.x, 0.); else n = vec2(0., sg.y);
        float m = pow(1. - clamp(inside / E.z, 0., 1.), 1.8);
        vec2 off = -n * m * E.z * .8 / uView; off.y = -off.y;
        vec2 bu = vUv + off;
        vec3 g = vec3(texture2D(tBlur, bu).r, texture2D(tBlur, bu - off * .07).g, texture2D(tBlur, bu - off * .14).b);
        float lum = dot(g, vec3(.2126, .7152, .0722)); g = max(mix(vec3(lum), g, 1.7), 0.) * 1.05;
        col = mix(col, g, clamp(inside + .5, 0., 1.) * E.y);
      }
      col += glow;
      if (uTrans > .001) {
        vec2 pc = (vUv - .5) * vec2(uAspect, 1.); float r = length(pc), a = atan(pc.y, pc.x);
        float lane = floor((a / 6.2832 + .5) * 260.), s = h1(lane);
        float z = fract(s * 7.3 - uT * (1.1 + s * 2.4) + .32 / (r + .06));
        float streak = smoothstep(0., .015, z) * (1. - smoothstep(.015, .35, z)) * step(.42, s) * smoothstep(.04, .5, r);
        vec3 field = mix(uAcc * 2.4, vec3(2.6), step(.86, s)) * streak + uAcc * .06 * (1. - r);
        float k = smoothstep(.15, .7, uTrans), burst = smoothstep(.35, .55, uTrans) * (1. - smoothstep(.55, .9, uTrans));
        col = mix(col, field, k) + vec3(.85, .9, 1.) * burst * .32 * (1. - r * .6);
      }
      col *= uGrade;                                                       // the dimension's own light
      float vg = smoothstep(1.25, .25, length((vUv - .5) * vec2(uAspect, 1.) * .9)); col *= mix(.55, 1., vg);
      col += (h(vUv * 1137. + fract(uT * 7.) * 91.) - .5) * .0035;   // grain: barely there
      float bar = uBars * .1; col *= step(bar, vUv.y) * step(vUv.y, 1. - bar);
      gl_FragColor = vec4(max(col, 0.) * uFade, 1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
});
composer.addPass(cinema);   // the last pass: it tone-maps and writes sRGB itself (no separate output pass)
cinema.uniforms.tBlur.value = glassBlur.out.texture;

// ---------------------------------------------------------------- the studio light (for reflections) and Otto's lights
function studioEnv() {
  const s = new THREE.Scene(); s.background = new THREE.Color(0x07070a);
  const box = (w, h, x, y, z, ry, rx, k = 1, col = 0xffffff) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); s.add(m); };
  box(14, 1.4, 0, 6, -2, 0, Math.PI / 2, 3.2); box(1.2, 9, -7, 0.5, 2, Math.PI / 2, 0, 2.2); box(1.2, 7, 7.5, -0.5, -1, -Math.PI / 2, 0, 3, ACC); box(10, 0.35, 0, -4.5, 4, 0, -Math.PI / 3, 0.5); box(1.6, 1.6, 2.6, 2.6, 7, Math.PI, 0, 1.6, 0xfff1dc);
  const pm = new THREE.PMREMGenerator(renderer), t = pm.fromScene(s, 0.02).texture; pm.dispose(); return t;
}
scene.environment = studioEnv(); scene.environmentIntensity = 0.8;
const lights = lightStudio(scene, renderer, { rimColor: ACC });
if (LOW) { lights.fill.visible = false; lights.rim2.visible = false; }

// ---------------------------------------------------------------- the route, built from the dimensions
// One curve carries Otto everywhere: the launch, each dimension's beats, the flight to its gate, and the
// wormhole (a gentle S) to the next dimension's arrival point. Dimensions sit 300 apart along -z.
const N = DIMS.length;                                          // 0 = the launch orbit; 1..5 the dimensions
const O = DIMS.map((_, i) => V(0, 0, -300 * i));
const loc = (i, a) => O[i].clone().add(V(...a));
const pts = [], marks = [];
const mark = (kind, i, p, extra = {}) => { marks.push({ kind, i, idx: pts.length, ...extra }); pts.push(p); };
mark("station", 0, O[0]);
for (let i = 0; i < N; i++) {
  const D = DIMS[i];
  // between two things he arcs up and over (never through a photo), then settles beside the next
  const via = (A, B) => A.clone().lerp(B, 0.5).setY(Math.max(A.y, B.y) + 4.5).add(V(0, 0, 2));
  if (i > 0) { mark("arrive", i, loc(i, D.arrive)); D.beats.forEach((b, j) => { if (j > 0) pts.push(b.via ? loc(i, b.via) : via(loc(i, D.beats[j - 1].otto), loc(i, b.otto))); mark("beat", i, loc(i, b.otto), { j }); }); }
  if (i < N - 1) {
    if (i > 0) pts.push(via(loc(i, D.beats[D.beats.length - 1].otto), loc(i, D.exit[0])));
    D.exit.forEach((e) => pts.push(loc(i, e)));
    mark("portal", i, loc(i, D.gate));
    const A = loc(i, D.gate), B = loc(i + 1, DIMS[i + 1].arrive);
    pts.push(A.clone().lerp(B, 0.33).add(V(5, 2, 0)), A.clone().lerp(B, 0.66).add(V(-4.5, -1, 0)));
  }
}
pts.push(pts[pts.length - 1].clone().add(V(0, 0.4, -6)));
const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
const LEN = curve.getLength();
{ const D = 4000, lens = curve.getLengths(D); marks.forEach((m) => { const x = (m.idx / (pts.length - 1)) * D, i = Math.floor(x), f = x - i; m.u = (lens[i] + ((lens[Math.min(D, i + 1)] - lens[i]) * f)) / lens[D]; }); }
const uPortal = [], uArrive = [], beatsU = [];
marks.forEach((m) => { if (m.kind === "portal") uPortal[m.i] = m.u; if (m.kind === "arrive") uArrive[m.i] = m.u; if (m.kind === "beat") (beatsU[m.i] ||= [])[m.j] = m.u; });
// the world swaps halfway through each wormhole, while you are inside it
const zoneAt = (u) => { for (let k = 0; k < N - 1; k++) if (u < (uPortal[k] + uArrive[k + 1]) / 2) return k; return N - 1; };
const at = (i, x, y, z) => O[i].clone().add(V(x, y, z));
// the first view of each dimension (its backdrop is placed relative to it), and every beat's view (asteroids keep out of them)
const holds = O.map((_, i) => (i === 0 ? { pos: at(0, 2.7, 2.35, 7.0), look: at(0, 2.7, 1.5, -10) } : { pos: loc(i, DIMS[i].beats[0].cam), look: loc(i, DIMS[i].beats[0].look) }));
const beatViews = [holds[0]]; for (let i = 1; i < N; i++) DIMS[i].beats.forEach((b) => beatViews.push({ pos: loc(i, b.cam), look: loc(i, b.look) }));

// ---------------------------------------------------------------- the scroll timeline (in screens)
// Keyframes of (scroll s, route u); u(s) is a monotone cubic through them, so it never stops between them
// (you cross a portal at an even speed) and only holds where two keyframes share a u: the beats.
const BOOT_S = 1.05, DRIFT = 1.4 / LEN;
const KF = []; let sAcc = 0; const kf = (u) => KF.push({ s: sAcc, u });
kf(0); sAcc += BOOT_S; kf(0);
const dimS = [0], formS = { s: 0 }, HOLDS = [], ARRS = [BOOT_S];   // ARRS: where you come out of each portal
for (let k = 0; k < N - 1; k++) {
  sAcc += k === 0 ? 1.0 : 0.8; kf(uPortal[k] - 14 / LEN);       // to the gate
  sAcc += 1.2; kf(uArrive[k + 1]); ARRS.push(sAcc + 0.12);       // through the wormhole (its stop just clear of the mouth)
  beatsU[k + 1].forEach((ub, j) => {
    sAcc += j === 0 ? 0.5 : 0.6; kf(ub - DRIFT); if (j === 0) dimS[k + 1] = sAcc;
    const s0 = sAcc; sAcc += 0.55; kf(ub + DRIFT); HOLDS.push({ s0, s1: sAcc, d: k + 1, j });
  });
}
sAcc += 0.2; kf(beatsU[N - 1][beatsU[N - 1].length - 1] + DRIFT * 1.3);
const S_TOTAL = sAcc;
formS.s = HOLDS.find((h) => h.d === N - 1 && h.j === 1).s0 + 0.1;
const KS = KF.map((k) => k.s), KU = KF.map((k) => k.u);
const KM = (() => {                                              // Fritsch-Carlson tangents
  const n = KF.length, d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d[i] = (KU[i + 1] - KU[i]) / Math.max(1e-6, KS[i + 1] - KS[i]);
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) { if (Math.abs(d[i]) < 1e-9) { m[i] = m[i + 1] = 0; continue; } const a = m[i] / d[i], b = m[i + 1] / d[i], h = a * a + b * b; if (h > 9) { const t = 3 / Math.sqrt(h); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; } }
  return m;
})();
function uOfS(x) {
  x = clamp(x, 0, S_TOTAL); let i = 0; while (i < KF.length - 2 && x > KS[i + 1]) i++;
  const h = KS[i + 1] - KS[i]; if (h < 1e-6) return KU[i + 1];
  const t = (x - KS[i]) / h, t2 = t * t, t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * KU[i] + (t3 - 2 * t2 + t) * h * KM[i] + (-2 * t3 + 3 * t2) * KU[i + 1] + (t3 - t2) * h * KM[i + 1];
}
const holdAt = (x) => { for (const h of HOLDS) if (x >= h.s0 && x <= h.s1) return { ...h, p: (x - h.s0) / (h.s1 - h.s0) }; return null; };
// how much a dimension's own camera has taken over from the chase camera (0 in flight and in the wormhole)
function exploreW(d, u) {
  if (d === 0) return 0;
  const bu = beatsU[d], first = bu[0], lastU = bu[bu.length - 1];
  if (u < first) return ss(uArrive[d], first, u);
  if (u <= lastU || d === N - 1) return 1;
  return 1 - ss(lastU, lastU + (uPortal[d] - lastU) * 0.5, u);
}
// the camera's key at u inside dimension d: between two beats it cranes up and back a little, never straight across
function beatCam(d, u, pos, look) {
  const bs = DIMS[d].beats, bu = beatsU[d];
  let j = 0; while (j < bu.length - 2 && u > bu[j + 1]) j++;
  const A = bs[j], B = bs[Math.min(j + 1, bs.length - 1)], f = bu.length > 1 ? ss(bu[j], bu[Math.min(j + 1, bu.length - 1)], u) : 0;
  const Ob = DIMS[d].orbit;
  if (Ob) { const a = (lerp(A.ang, B.ang, f) * Math.PI) / 180, c = loc(d, Ob.c); pos.set(c.x + Ob.r * Math.sin(a), c.y + Ob.dy + Math.sin(Math.PI * f) * 0.7, c.z + Ob.r * Math.cos(a)); }   // round the star, on its arc
  else { pos.copy(loc(d, A.cam)).lerp(loc(d, B.cam), f); pos.y += Math.sin(Math.PI * f) * 1.4; pos.z += Math.sin(Math.PI * f) * 2.2; }
  look.copy(loc(d, A.look)).lerp(loc(d, B.look), f);
  // near a beat the camera keeps easing in as you scroll: it never stands still
  let jn = 0, best = 1e9; bu.forEach((b, i) => { const dd = Math.abs(u - b); if (dd < best) { best = dd; jn = i; } });
  const du = (u - bu[jn]) * LEN, w = 1 - ss(0, 7, Math.abs(du)), fw = look.clone().sub(pos).normalize(), rt = V().crossVectors(fw, UP).normalize();
  pos.addScaledVector(fw, Ob ? 0 : du * 0.5 * w).addScaledVector(rt, du * (Ob ? 0.45 : 0.32) * w);   // on the orbit: drift along it, never a push in
  return lerp(A.fov, B.fov, f);
}
// how close Otto is to each beat of a dimension (1 at the beat)
const beatK = (d, u) => (beatsU[d] || []).map((ub) => 1 - ss(0, 7, Math.abs(u - ub) * LEN));

// ---------------------------------------------------------------- space, the path, the gates, the wormholes, the dimensions
const space = createSpace({ scene, curve, O, ACC, LOW, DPR, renderer, holds: beatViews });
const CN = 4096;
const curveTex = (() => { const d = new Float32Array(CN * 3 * 4); for (let k = 0; k < CN; k++) { const u = k / (CN - 1), p = curve.getPointAt(u), t = curve.getTangentAt(u), sd = V().crossVectors(t, UP).normalize(), b = V().crossVectors(sd, t).normalize(); d.set([p.x, p.y, p.z, 1], k * 4); d.set([sd.x, sd.y, sd.z, 1], (CN + k) * 4); d.set([b.x, b.y, b.z, 1], (2 * CN + k) * 4); } const tx = new THREE.DataTexture(d, CN, 3, THREE.RGBAFormat, THREE.FloatType); tx.needsUpdate = true; return tx; })();
const path = createPath({ curveTex, CN, LEN, ACC, LOW, DPR, RED }); scene.add(path.points);
const gates = uPortal.map((u) => { const gt = createGate({ accent: ACC, LOW, env: scene.background }), c = curve.getPointAt(u).add(V(0, 1.1, 0)), tg = curve.getTangentAt(u); gt.group.position.copy(c); gt.group.lookAt(c.clone().add(tg)); scene.add(gt.group); gt.s = u * LEN; return gt; });
const back = createBackdrops({ scene, O, ACC, LOW, holds });
const orb = chromeOrb(); scene.add(orb.mesh);
const ring = dustRing(3.4, ACC); ring.rotation.set(1.15, 0, -0.3); scene.add(ring);
// the wormholes, one per gate, each to the next dimension's arrival
const worms = uPortal.map((u0, k) => { const w = createWormhole({ curve, u0, u1: uArrive[k + 1], tintA: DIMS[k].tint, tintB: DIMS[k + 1].tint, env: scene.background }); scene.add(w.mesh); return w; });
// crisp page things standing in 3D (his figure, the numbers): their own layer, drawn with the same camera
const css3d = new THREE.Scene(), cssR = new CSS3DRenderer(); cssR.domElement.className = "css3d"; document.body.insertBefore(cssR.domElement, $("#track"));
// the crisp layer: the photos and his star portrait, drawn at the screen's full resolution in their true colours
const crispCanvas = document.createElement("canvas"); crispCanvas.className = "crisp"; crispCanvas.setAttribute("aria-hidden", "true"); document.body.insertBefore(crispCanvas, $("#track"));
const crispR = new THREE.WebGLRenderer({ canvas: crispCanvas, alpha: true, antialias: false, powerPreference: "high-performance" });   // no MSAA: flat photos and points do not need it
crispR.setPixelRatio(Math.min(devicePixelRatio || 1, 1.25)); crispR.toneMapping = THREE.NoToneMapping; crispR.outputColorSpace = THREE.SRGBColorSpace; crispR.setClearColor(0x000000, 0);
const crisp = new THREE.Scene(); crisp.fog = new THREE.FogExp2(0x000000, 0.0095);
const CR = { cw: 0, ch: 0, x: -1, y: -1, small: 0, shown: false };   // the crisp canvas: its size and place (CSS px)
const paneU = { uPane: cinema.uniforms.uPane, uPaneN: cinema.uniforms.uPaneN, uView: cinema.uniforms.uView, uDpr: { value: crispR.getPixelRatio() }, uOff: { value: new THREE.Vector2() }, uCH: { value: 1 } };   // shared: crisp photos leave out what lies under glass
const dims = createDims({ scene, O, ACC, LOW, renderer, envCube: scene.background, css3d, crisp, crispR, paneU });
let dimsDone; const dimsReady = new Promise((r) => (dimsDone = r));
{ const idle = window.requestIdleCallback ? (f) => requestIdleCallback(f, { timeout: 300 }) : (f) => setTimeout(f, 40); let d = 1; const next = () => { if (d >= N) { dimsDone(); return; } dims.build(d, { orb, ring }); d++; idle(next); }; idle(next); }

// ---------------------------------------------------------------- Otto
const otto = buildOtto(RED ? "blood" : "cobalt");
const holder = new THREE.Group(), pivot = new THREE.Group(); pivot.position.y = 1.1; otto.root.position.y = -1.1;
holder.add(pivot); pivot.add(otto.root); scene.add(holder);
if (otto.root.userData.shadow) otto.root.userData.shadow.visible = false;
const PR = otto.parts;
const LM = otto.materials.lightM, LCOL = LM.color.clone();
const MOUTH = otto.head.children.find((o) => o.isMesh && o.material === LM && o.geometry.type === "CapsuleGeometry" && o.position.y < -0.05);
PR.core.material = PR.core.material.clone();
const partMats = {};
const ownJoints = (name, root) => { const m = otto.materials.joint.clone(); m.emissive = new THREE.Color(ACC); m.emissiveIntensity = 0; partMats[name] = m; root.traverse((o) => { if (o.isMesh && o.material === otto.materials.joint) o.material = m; }); };
ownJoints("head", PR.neck); PR.arms.forEach((a, i) => ownJoints("arm" + i, a.sh)); PR.legs.forEach((l, i) => ownJoints("leg" + i, l.hip)); ownJoints("torso", otto.rig);
const partFlash = {};
const scanRing = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.008, 8, 120), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.15, 1.2, 1.32), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
scanRing.rotation.x = Math.PI / 2; scanRing.visible = false; otto.rig.add(scanRing);
// thrusters: real exhaust, not a glowing cone. A short white-hot core with standing shock diamonds at the
// nozzle, inside a long translucent plume whose turbulence flows steadily away from the boot and thins to
// nothing at the tail. Its length and strength follow one eased thrust value (never jittered); a soft glow
// sits on each nozzle and a light under his boots warms his legs while they burn.
const plumeShader = (core) => ({ uniforms: { uT: { value: 0 }, uAcc: { value: new THREE.Color(ACC) }, uThr: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  vertexShader: "varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }",
  fragmentShader: `uniform float uT, uThr; uniform vec3 uAcc; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
    void main(){
      float s = 1. - vUv.y;                                                    // 0 at the nozzle, 1 at the tail
      float body = pow(abs(dot(normalize(vN), normalize(vV))), ${core ? "2.4" : "1.25"});   // dense through the middle, thin at the silhouette
      float a6 = vUv.x * 6.2832;
      ${core
        ? `float dia = .72 + .28 * pow(.5 + .5 * cos(s * 30.), 3.);                  // shock diamonds: standing still, as they do
      float a = body * pow(1. - s, 1.3) * dia;
      vec3 col = vec3(1.75, 1.8, 1.95);`
        : `float flow = n(vec2(cos(a6) * 1.6 + 7., s * 5. - uT * 6.)) * .55 + n(vec2(sin(a6) * 3.1, s * 11. - uT * 10.)) * .45;   // turbulence, flowing downstream
      float a = body * pow(1. - s, 1.5) * smoothstep(0., .05, s) * (.6 + .4 * flow);
      vec3 col = mix(uAcc * .9, mix(uAcc, vec3(1.), .55) * 1.45, pow(1. - s, 2.6));`}
      a *= uThr; gl_FragColor = vec4(col * a, a); }` });
const bootMats = [new THREE.ShaderMaterial(plumeShader(false)), new THREE.ShaderMaterial(plumeShader(true))];
const palmMats = [new THREE.ShaderMaterial(plumeShader(false)), new THREE.ShaderMaterial(plumeShader(true))];
const nozzleTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"), r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.3, "rgba(255,255,255,.35)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
const thruster = (r, l, mats) => {
  const g = new THREE.Group();
  const outer = new THREE.CylinderGeometry(r, r * 0.16, l, 28, 14, true); outer.translate(0, -l / 2, 0);
  const core = new THREE.CylinderGeometry(r * 0.6, r * 0.1, l * 0.42, 20, 10, true); core.translate(0, -l * 0.21, 0);
  const plume = new THREE.Mesh(outer, mats[0]), hot = new THREE.Mesh(core, mats[1]); plume.renderOrder = hot.renderOrder = 40; g.add(plume, hot);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: nozzleTex, color: new THREE.Color(ACC).lerp(new THREE.Color(1, 1, 1), 0.55), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
  glow.scale.setScalar(r * 4); glow.position.y = -r * 0.3; g.add(glow);
  g.userData = { plume, hot, glow }; return g;
};
const flame = new THREE.Group(); flame.visible = false;
for (const x of [-0.17, 0.17]) { const t = thruster(0.1, 0.7, bootMats); t.position.set(x, -0.02, 0.04); flame.add(t); }
otto.root.add(flame);
const palms = PR.arms.map((a) => { const t = thruster(0.055, 0.4, palmMats); t.visible = false; if (a.palm) a.palm.add(t); else { t.position.set(0, -0.36, 0.01); a.el.add(t); } return t; });   // out of his palms
const thrustLight = new THREE.PointLight(new THREE.Color(ACC).lerp(new THREE.Color(1, 1, 1), 0.5), 0, 3.2, 2); thrustLight.position.set(0, -0.35, 0.05); thrustLight.visible = !LOW; otto.root.add(thrustLight);   // on a laptop GPU, one light less for every lit surface
const coreLight = new THREE.PointLight(ACC, 0, 7, 1.6); coreLight.position.set(0, 1.25, 0.45); otto.root.add(coreLight);

// sparks off the boot thrusters
const softDot = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"), r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.35, "rgba(255,255,255,.5)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
const trail = (() => {
  const n = LOW ? 200 : 380, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), vel = new Float32Array(n * 3), age = new Float32Array(n).fill(9);
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.setAttribute("aAge", new THREE.BufferAttribute(age, 1));
  const pts = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: { uPx: { value: DPR }, uH: { value: VP.h } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: "uniform float uPx, uH; attribute float aAge; attribute vec3 color; varying vec3 vC; void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; float d = max(.2, -mv.z); gl_PointSize = aAge > 1. ? 0. : clamp(.14 * uH * .5 / d * uPx * 1.2, 1., 24.); }",
    fragmentShader: "varying vec3 vC; void main(){ float r = length(gl_PointCoord - .5); float a = smoothstep(.5, 0., r); a *= a; gl_FragColor = vec4(vC * a, a); }" }));
  pts.frustumCulled = false; scene.add(pts);
  const a = new THREE.Color(ACC), v = V(), down = V(), q = new THREE.Quaternion(); let idx = 0, carry = 0;
  return { update(dt, rate) {
    carry += rate * dt * 60;
    if (carry >= 1) { pivot.getWorldQuaternion(q); down.set(0, -1, 0).applyQuaternion(q);
      while (carry >= 1) { carry -= 1; flame.children[idx % 2].getWorldPosition(v); v.addScaledVector(down, 0.55);
        pos.set([v.x + (Math.random() - 0.5) * 0.08, v.y, v.z + (Math.random() - 0.5) * 0.08], idx * 3);
        vel.set([down.x * 5 + (Math.random() - 0.5), down.y * 5 + (Math.random() - 0.5), down.z * 5 + (Math.random() - 0.5)], idx * 3); age[idx] = 0; idx = (idx + 1) % n; } }
    for (let k = 0; k < n; k++) { if (age[k] > 1) { col[k * 3] = col[k * 3 + 1] = col[k * 3 + 2] = 0; continue; } age[k] += dt; const f = Math.max(0, 1 - age[k] / 0.9);
      pos[k * 3] += vel[k * 3] * dt; pos[k * 3 + 1] += vel[k * 3 + 1] * dt; pos[k * 3 + 2] += vel[k * 3 + 2] * dt; vel[k * 3] *= 0.94; vel[k * 3 + 1] *= 0.94; vel[k * 3 + 2] *= 0.94;
      col[k * 3] = (a.r * 2 + f * f) * f * 0.7; col[k * 3 + 1] = (a.g * 2 + f * f) * f * 0.7; col[k * 3 + 2] = (a.b * 2 + f * f) * f * 0.7; }
    g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true; g.attributes.aAge.needsUpdate = true;
  } };
})();
// the launch pad
const pad = (() => {
  const g = new THREE.Group();
  const floor = new THREE.Mesh(new THREE.CircleGeometry(4.2, 96), new THREE.MeshStandardMaterial({ color: 0x0a0b0e, metalness: 0.75, roughness: 0.3 })); floor.rotation.x = -Math.PI / 2; g.add(floor);
  const ringM = new THREE.MeshBasicMaterial({ color: new THREE.Color(ACC).multiplyScalar(4) }), whiteM = new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 5, 5.2) });
  const r1 = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.03, 12, 160), ringM); r1.rotation.x = Math.PI / 2; r1.position.y = 0.02; g.add(r1);
  const r2 = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.012, 8, 120), whiteM); r2.rotation.x = Math.PI / 2; r2.position.y = 0.02; g.add(r2);
  const scan = new THREE.Mesh(new THREE.TorusGeometry(1, 0.02, 8, 160), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.65, 1.8), transparent: true, opacity: 0 })); scan.rotation.x = Math.PI / 2; scan.position.y = 0.03; g.add(scan);
  scene.add(g); return { g, scan, ringM, whiteM };
})();

// ---------------------------------------------------------------- state
const DBG = { raw: false };   // debugging only: draw without the post chain
const S = { s: 0, st: 0, flow: 0, u: 0, uPrev: 0, speed: 0, fly: 0, lean: 0, roll: 0, croll: 0, dive: 0, climb: 0, started: false, fade: 0, eyes: 0, wake: 0, look: 0, talk: 0, fake: 0, mx: 0, my: 0, tmx: 0, tmy: 0, trans: 0, thrust: 0, palm: 0, blinkT: 0, blinkAt: 4, mouth: 0, px: -999, py: -999 };
// The 3D's resolution follows the machine. The page's words are HTML and always sharp; on a laptop GPU the
// scene gives up a little resolution (never below 0.8, with FXAA) to hold the frame rate, and takes it back when it can.
const AQ = { q: LOW ? 0.85 : 1, min: LOW ? 0.8 : 0.85, lo: LOW ? 26 : 45, hi: LOW ? 40 : 57, n: 0, t0: 0, low: 0, high: 0, changed: 0, downAt: -1e9 };   // 0.8 of a 1.25x screen = the reference site's own ratio
function adapt(now) {
  if (!AQ.t0) { AQ.t0 = now; AQ.n = 0; return; }
  AQ.n++; const el = now - AQ.t0; if (el < 1500) return;
  const fps = (AQ.n * 1000) / el; AQ.t0 = now; AQ.n = 0; window.__fps = Math.round(fps);
  // steady: down only after two slow stretches in a row, up only after four fast ones, never two changes within
  // 4 s, and not back up within 20 s of going down (a scene that sits on the line no longer flips back and forth)
  AQ.low = fps < AQ.lo ? AQ.low + 1 : 0; AQ.high = fps > AQ.hi ? AQ.high + 1 : 0;
  if (now - AQ.changed < 4000) return;
  let q = AQ.q;
  if (AQ.low >= 2) q = Math.max(AQ.min, AQ.q - 0.05); else if (AQ.high >= 4 && now - AQ.downAt > 20000) q = Math.min(1, AQ.q + 0.05);
  if (Math.abs(q - AQ.q) > 1e-3) { if (q < AQ.q) AQ.downAt = now; AQ.q = q; AQ.changed = now; AQ.low = AQ.high = 0; size(); }
}
function size() {
  const w = VP.w, h = VP.h; TAGR.gen++;
  renderer.setPixelRatio(DPR * AQ.q); renderer.setSize(w, h, false); composer.setPixelRatio(DPR * AQ.q); composer.setSize(w, h);
  fxaa.material.uniforms.resolution.value.set(1 / (w * DPR * AQ.q), 1 / (h * DPR * AQ.q)); cinema.uniforms.uTexel.value.set(1 / (w * DPR * AQ.q), 1 / (h * DPR * AQ.q));
  camera.aspect = w / h; camera.updateProjectionMatrix();
  cinema.uniforms.uAspect.value = w / h; cinema.uniforms.uView.value.set(w, h);
  $("#track").style.height = VP.h * (S_TOTAL + 1) + "px";
  cssR.setSize(w, h); CR.cw = CR.ch = 0;   // the crisp canvas is re-sized on its next frame
}
let lastScroll = 0, scrollDir = 1, lastY = 0;
addEventListener("scroll", () => { lastScroll = performance.now(); scrollDir = scrollY >= lastY ? 1 : -1; lastY = scrollY; }, { passive: true });
document.documentElement.style.overflow = "hidden";   // nothing scrolls behind the Start screen
// nav and arrow keys: user-asked moves, which any scroll takes over
const goRoom = (i) => { i = clamp(i, 0, N - 1); let x = i === N - 1 ? formS.s : i === 0 ? 0 : dimS[i] + 0.15; if (PAGED && i > 0) x = STOPS.reduce((a, b) => (Math.abs(b - x) < Math.abs(a - x) ? b : a)); scrollTo({ top: x * VP.h, behavior: reduced ? "auto" : "smooth" }); };
// The scroll, in detents. Between stops the wheel moves you freely, but each stop (the middle of a beat's hold)
// catches you: the rest of that flick, and a trackpad's momentum after it, is dropped there, so one long flick can
// never carry you past a tile unseen. A fresh push (after a short pause, a harder swipe, or the other way) moves on.
const STOPS = [...ARRS, ...HOLDS.map((h) => (h.s0 + h.s1) / 2)].sort((a, b) => a - b);
// On a touch screen the stops are pages: a swipe up takes you on to the next stop, a swipe down back to the one
// before, and the journey flies there at its own pace, so a fling can never carry you past a tile unseen. (A
// fling's momentum belongs to the browser and cannot be caught, so there the page does not scroll by itself: the
// swipe is read here.) While the finger is down the journey leans a little after it, so the swipe is felt. A row of
// questions still scrolls sideways, a card taller than the screen scrolls inside itself, two fingers still zoom.
const PAGED = TOUCH;
const TD = { on: false, x0: 0, y0: 0, from: 0, axis: 0, pts: [], box: null };
const stopNear = (x) => [0, ...STOPS].reduce((a, b) => (Math.abs(b - x) < Math.abs(a - x) ? b : a));
const stopNext = (x, dir) => (dir > 0 ? STOPS.find((v) => v > x + 0.02) : [0, ...STOPS].findLast((v) => v < x - 0.02));
if (PAGED) {
  document.addEventListener("touchstart", (e) => {
    TD.on = false; if (!S.started || e.touches.length !== 1 || (e.target.closest && e.target.closest(".sb, input, textarea"))) return;
    const t = e.touches[0]; Object.assign(TD, { on: true, x0: t.clientX, y0: t.clientY, from: stopNear(scrollY / VP.h), axis: 0, pts: [[t.clientY, e.timeStamp]], box: e.target.closest ? e.target.closest(".ask, .head.talk") : null });
  }, { passive: true });
  document.addEventListener("touchmove", (e) => {
    if (!TD.on) return;
    if (e.touches.length !== 1) { TD.on = false; scrollTo(0, TD.from * VP.h); return; }   // two fingers: the browser's zoom
    const t = e.touches[0], dx = t.clientX - TD.x0, dy = t.clientY - TD.y0;
    if (!TD.axis) { if (Math.hypot(dx, dy) < 8) return; TD.axis = Math.abs(dx) > Math.abs(dy) ? 1 : 2; }
    if (TD.box && TD.axis === 1 && TD.box.matches(".ask")) { TD.on = false; return; }   // the questions, sideways
    if (TD.box && TD.axis === 2 && TD.box.scrollHeight > TD.box.clientHeight + 2) {      // a tall card, inside itself (until its end)
      const b = TD.box, atTop = b.scrollTop <= 0, atEnd = b.scrollTop + b.clientHeight >= b.scrollHeight - 1;
      if (!((dy > 0 && atTop) || (dy < 0 && atEnd))) { TD.on = false; return; }
    }
    e.preventDefault();
    TD.pts.push([t.clientY, e.timeStamp]); if (TD.pts.length > 6) TD.pts.shift();
    scrollTo(0, clamp(TD.from + clamp(-dy / VP.h, -0.28, 0.28), 0, S_TOTAL) * VP.h);   // up is forward
  }, { passive: false });
  const release = (e) => {
    if (!TD.on) return; TD.on = false;
    const a = TD.pts[0], b = TD.pts[TD.pts.length - 1], v = ((a[0] - b[0]) / Math.max(1, b[1] - a[1])) * 1000, moved = TD.y0 - b[0];   // px/s and px, up positive
    const dir = e.type === "touchcancel" ? 0 : Math.abs(v) > 300 ? Math.sign(v) : Math.abs(moved) > 46 ? Math.sign(moved) : 0;
    scrollTo(0, (dir ? stopNext(TD.from, dir) ?? TD.from : TD.from) * VP.h);
  };
  document.addEventListener("touchend", release, { passive: true }); document.addEventListener("touchcancel", release, { passive: true });
}
const DET = { dir: 0, t: 0, last: 0, m: 0, p: 0 };
addEventListener("wheel", (e) => {
  if (!S.started || e.ctrlKey) return;   // ctrl+wheel is the browser's zoom
  e.preventDefault();
  const ts = e.timeStamp, dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? VP.h : 1), dir = Math.sign(dy), mag = Math.abs(dy);
  const quiet = ts - DET.last, m = DET.m; DET.last = ts; DET.m = mag; if (!dir) return;
  if (DET.dir) {
    // held at a stop. Going back always lets go. Going on needs a moment there first, then a fresh push: a pause,
    // or pressure that builds and does not fade the way a flick's dying momentum (or a janky frame's backlog) does
    DET.p = DET.p * Math.exp(-Math.min(quiet, 1000) / 110) + mag;
    if (dir === DET.dir && (ts - DET.t < 650 || Math.abs(S.s - S.st) > 0.012 || (quiet < 350 && !(DET.p > 240 && mag >= m * 0.98)))) return;   // (and only once the camera has arrived)
    DET.dir = 0;
  }
  const cur = scrollY / VP.h; let to = clamp(cur + dy / VP.h, 0, S_TOTAL);
  const stop = dir > 0 ? STOPS.find((x) => x > cur + 0.004 && x <= to) : STOPS.findLast((x) => x < cur - 0.004 && x >= to);
  if (stop !== undefined) { to = stop; DET.dir = dir; DET.t = ts; DET.p = 0; }
  scrollTo(0, to * VP.h);
}, { passive: false });
// keys go from stop to stop (and never a whole page at once)
addEventListener("keydown", (e) => {
  if (!S.started || e.altKey || e.ctrlKey || e.metaKey || e.target.closest("input, textarea, select, button, a")) return;
  const fw = ["ArrowDown", "PageDown", " "].includes(e.key) && !e.shiftKey, bw = ["ArrowUp", "PageUp"].includes(e.key) || (e.key === " " && e.shiftKey);
  if (!fw && !bw && e.key !== "Home" && e.key !== "End") return;
  e.preventDefault();
  const cur = scrollY / VP.h;
  const to = e.key === "Home" ? 0 : e.key === "End" ? S_TOTAL : fw ? (STOPS.find((x) => x > cur + 0.01) ?? S_TOTAL) : (STOPS.findLast((x) => x < cur - 0.01) ?? 0);
  scrollTo({ top: to * VP.h, behavior: reduced ? "auto" : "smooth" });
});
$$("[data-go]").forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); if (S.started) goRoom(+b.dataset.go); }));
addEventListener("pointermove", (e) => { S.tmx = (e.clientX / innerWidth) * 2 - 1; S.tmy = -((e.clientY / innerHeight) * 2 - 1); S.px = e.clientX; S.py = e.clientY; }, { passive: true });
// a finger lifted leaves nothing behind: no tilt, and no glass left lit where it last touched
const lift = (e) => { if (e.pointerType !== "mouse") { S.tmx = S.tmy = 0; S.px = S.py = -999; } };
addEventListener("pointerup", lift, { passive: true }); addEventListener("pointercancel", lift, { passive: true });
// typing on a phone: its keyboard scrolls the page to show the box, which would move the journey; the journey is
// held where it is until you leave the box, and the page goes back to it
const FREEZE = { at: -1 };
document.addEventListener("focusin", (e) => { if (TOUCH && S.started && e.target.matches("input, textarea")) FREEZE.at = S.st; });
document.addEventListener("focusout", (e) => { if (FREEZE.at < 0 || !e.target.matches("input, textarea")) return; const x = FREEZE.at; FREEZE.at = -1; setTimeout(() => scrollTo(0, x * VP.h), 60); });

// ---------------------------------------------------------------- subtitles, questions, voice, time
let subTimer = 0, sayGen = 0, wordTimers = [];
// how Otto delivers each line: a lead gesture (point or present at the tile it is about, arms open for a new place,
// a hand to his chest when he talks about himself) and an expression; beats in time with his voice after that
const LINE_ACT = {
  "tour-start": ["open", "happy"], "m13-1-in": ["open", "excited"], "m13-1-0": ["present", "happy"], "m13-1-1": ["self", "happy"],
  "m13-2-in": ["open", "happy"], "m13-2-0": ["point", "excited"], "m13-2-1": ["point", "excited"], "m13-2-2": ["present", "happy"],
  "tour-make": ["open", "happy"], "m13-3-0": ["present", "happy"], "m13-3-1": ["point", "curious"], "m13-3-2": ["self", "happy"],
  "m13-4-in": ["open", "focus"], "m13-4-0": ["present", "excited"], "m13-4-1": ["point", "excited"], "tour-quickbite": ["point", "curious"],
  "m13-4-3": ["present", "happy"], "m13-5-0": ["wave", "happy"], "tour-contact": ["point", "happy"],
};
const ACT = { id: null, t0: -99, dur: 0, g: "beat", e: "happy", aims: [] };
function startAct(id, dur) {
  const [g, e] = LINE_ACT[id] || ["beat", "happy"];
  // the tiles this line is about: the pins of its stop
  let aims = [];
  for (const z in GUIDE) { const j = GUIDE[z].beats.indexOf(id); if (j >= 0 && pinData[z]) aims = pinData[z].filter((p) => p.beat === j).map((p) => p.at); }
  Object.assign(ACT, { id, t0: performance.now() / 1000, dur, g, e, aims });
}
const NARR = { until: 0, view: null, said: null, from: true, t: 0 };   // Otto is talking until 'until'; the view he is on
// Subtitles follow his voice a sentence at a time: each sentence appears as he starts it (from the clip's own
// timings, or an estimate if a line has no clip), its words light as he says them (longer words take longer), and
// they stay up through his pauses and clear soon after he stops. Without sound his mouth still moves only while a
// sentence is being said.
const FAKE = { t0: 0, k: 1, segs: null };
function estSegs(text) {
  const ss = text.split(/(?<=[.!?…]["”’)]*)\s+/).filter((s) => s.trim()); let t = 0;   // (never split inside Three.js or 8.4)
  return ss.map((s) => { const a = t, d = Math.max(0.9, s.trim().split(/\s+/).length * 0.36); t = a + d + 0.38; return [a, a + d, s.trim()]; });
}
function showSentence(text, len) {
  const sub = $("#sub"), words = text.split(/\s+/).filter(Boolean);
  sub.innerHTML = "<span>" + words.map((w) => "<i>" + w + "</i>").join(" ") + "</span>";
  const L = words.map((w) => w.replace(/[^\p{L}\p{N}]/gu, "").length + 1.5), tot = L.reduce((a, b) => a + b, 0); let acc = 0;
  [...sub.querySelectorAll("i")].forEach((el, k) => { const at = (acc / tot) * len * 0.92; acc += L[k]; wordTimers.push(setTimeout(() => el.classList.add("on"), at * 1000)); });
}
async function say(id, text) {
  const gen = ++sayGen; wordTimers.forEach(clearTimeout); wordTimers = []; clearTimeout(subTimer);
  const meta = sound.meta(id), segs = meta && meta.seg && meta.seg.length ? meta.seg : estSegs(text), est = segs[segs.length - 1][1];
  $("#sub").innerHTML = "";
  NARR.until = performance.now() + est * 1000 + 450;   // until the clip's real length is known
  startAct(id, est);
  let dur = sound.on ? await sound.speak(id, text, (v) => (S.talk = v)) : 0;
  if (gen !== sayGen) return;   // a newer line took over while this one loaded
  const k = dur ? dur / est : 1;
  if (!dur) { dur = est; S.fake = dur; Object.assign(FAKE, { t0: performance.now() / 1000, k, segs }); } else FAKE.segs = null;
  if (ACT.id === id) { ACT.t0 = performance.now() / 1000; ACT.dur = dur; }   // the real clip starts now
  NARR.until = performance.now() + dur * 1000 + 450;
  segs.forEach(([a, b, s]) => wordTimers.push(setTimeout(() => showSentence(s, (b - a) * k), a * k * 1000)));
  subTimer = setTimeout(() => ($("#sub").innerHTML = ""), dur * 1000 + 1400);
}
// Otto as a guide: he talks about what is in front of you, while it is in front of you. Coming out of a portal he
// says where you are; at each stop, what you are looking at. A new view cuts the line before it (unless that line
// is about to end), and leaving something and coming back to it later makes him say its line again.
function guide(zone, u, E, hks, inWorm, now, fast) {
  const G = GUIDE[zone];
  let j = -1, hj = 0; hks.forEach((k, i) => { if (k > hj) { hj = k; j = i; } });
  if (inWorm || !G) { NARR.view = null; NARR.said = null; NARR.from = true; return; }   // through a portal: what comes next is new
  // what is in front of you: a stop once you are close to it (and until you have clearly left it), or, just out
  // of the portal, the dimension itself
  const bi = NARR.view ? G.beats.indexOf(NARR.view) : -1;
  let view = null;
  if (bi >= 0 && bi === j && hj > 0.3 && E > 0.4) view = NARR.view;
  else if (j >= 0 && E > 0.6 && hj > 0.85) view = G.beats[j];
  else if (G.in && NARR.from && u > uArrive[zone] - 4 / LEN && u < beatsU[zone][0] - 2 / LEN) view = G.in;
  if (view && view !== G.in) NARR.from = false;   // past the first stop: going back towards the portal is not arriving
  if (view !== NARR.view) { NARR.view = view; NARR.t = now; if (!view) NARR.said = null; }
  if (!view || view === NARR.said || fast) return;
  if (now - NARR.t < 200) return;   // let the view settle
  if (NARR.said && now < NARR.until && NARR.until - now < 700) return;   // the line before is nearly done: let it end
  NARR.said = view; say(view, LINES[view] || "");
}
const ASK = ["otto", "hero", "about", "stack", "work", "contact"];
let askRoom = -1;
function showAsk(i) { if (i === askRoom) return; askRoom = i; const box = $("#ask"); box.innerHTML = ""; (CHIPS[ASK[i]] || []).slice(0, 3).forEach(([q, id]) => { const b = document.createElement("button"); b.type = "button"; b.textContent = q; b.onclick = () => byId[id] && say("a-" + id, byId[id].a); box.append(b); }); }
$("#snd").addEventListener("click", async () => { await sound.enable(!sound.on); $("#snd").textContent = sound.on ? "Sound on" : "Sound off"; });
// the soundscape (m13/soundscape.js): each world's sound, the portals, the notification, Otto's motion
let SFX = null;
createCursor({ reduced });   // the custom cursor (a real mouse only)
// the journey's own scrollbar: a marker for each world (where its first stop begins)
const SB = createScrollbar({ total: S_TOTAL, reduced, unit: () => VP.h, marks: [1, 2, 3, 4, 5].map((d) => ({ d, s: dimS[d], label: ["", "Hello", "About", "What I make", "Work", "Let's talk"][d] })), go: (m) => goRoom(m.d) });
setTimeout(() => (window.requestIdleCallback ? requestIdleCallback(() => warmSoundscape(), { timeout: 2000 }) : warmSoundscape()), 2500);   // bake the sounds in the background soon after load
const SFXcue = (name, z) => { if (SFX && sound.on && sound.ctx) SFX.cue(name, sound.ctx.currentTime, z); };
const clock = () => { const t = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }).toLowerCase(); $$("[data-time]").forEach((e) => (e.textContent = t + " IST")); };
clock(); setInterval(clock, 30000);
$("#project-form").addEventListener("submit", (e) => { e.preventDefault(); const v = e.target.need.value.trim(); window.open("https://wa.me/917704833769?text=" + encodeURIComponent("Hi Yatharth, I found you through your site. " + (v || "I'd like to talk about a project.")), "_blank", "noopener"); });

// ---------------------------------------------------------------- the wake-up, driven by your scroll
// the camera moves continuously round him as each part comes online (scroll back and it all goes back)
const BOOTCAM = [   // (aimed at Field Otto: his visor is at about y 1.6 while he is bowed, 1.8 standing; his chest light at 1.16)
  { k: 0.0, pos: V(0.2, 1.52, 1.42), look: V(0, 1.6, 0.45), fov: 26 },      // the visor, from just below: his two eyes are the first light
  { k: 0.08, pos: V(0.2, 1.52, 1.42), look: V(0, 1.6, 0.45), fov: 26 },     // (held while they come up)
  { k: 0.17, pos: V(1.45, 1.98, 1.02), look: V(0, 1.74, 0.12), fov: 30 },   // his head, side on, lifting
  { k: 0.3, pos: V(0.56, 1.12, 1.32), look: V(0.12, 1.16, 0.25), fov: 26 }, // the chest light
  { k: 0.5, pos: V(-2.3, 0.5, 4.6), look: V(0, 1.25, 0), fov: 34 },          // low and wide: arms and legs lock out
  { k: 0.66, pos: V(0.9, 0.34, 1.8), look: V(0, 0.22, 0.08), fov: 30 },     // his boots: the thrusters test-fire
  { k: 0.82, pos: V(2.2, 1.75, 4.4), look: V(0, 1.55, 0), fov: 36 },         // the mid shot: he waves
];
const passed = new Set();
const once = (key, fn) => { if (!passed.has(key)) { passed.add(key); fn(); } };
function bootState(bk, t) {
  // each part, on its own stretch of the scroll
  const B = {
    headF: 1 - ss(0.05, 0.2, bk), core: ss(0.22, 0.3, bk),
    armF: 1 - ss(0.38, 0.47, bk), legF: 1 - ss(0.5, 0.6, bk), pad: ss(0.34, 0.42, bk), light: lerp(0.05, 1, ss(0.2, 0.85, bk)),
    scanOn: ss(0.04, 0.08, bk) * (1 - ss(0.62, 0.68, bk)), scanY: lerp(2.35, 0.02, ss(0.06, 0.64, bk)),
    jets: Math.max(ss(0.65, 0.71, bk) * (1 - ss(0.75, 0.8, bk)) * 0.75, ss(0.88, 0.95, bk)),   // one smooth test burn, then for good
    shock: ss(0.76, 0.88, bk), wave: ss(0.8, 0.84, bk) * (1 - ss(0.9, 0.94, bk)), turn: ss(0.86, 0.98, bk), lift: ss(0.93, 1, bk),
  };
  // a flash on each part as it locks, with its sound (once, going forward)
  if (bk > 0.2) once("head", () => { partFlash.head = 0; sound.click(); });
  if (bk > 0.235) once("core", () => { partFlash.torso = 0; sound.pop(); });
  if (bk > 0.47) once("arms", () => { partFlash.arm0 = partFlash.arm1 = 0; sound.click(); });
  if (bk > 0.6) once("legs", () => { partFlash.leg0 = partFlash.leg1 = 0; sound.thud(1); });
  if (bk > 0.67) once("jet", () => sound.whoosh());
  if (bk > 0.77) once("shock", () => sound.boom());
  return B;
}
function bootCamera(bk, pos, look) {
  let i = 0; while (i < BOOTCAM.length - 2 && bk > BOOTCAM[i + 1].k) i++;
  const a = BOOTCAM[i], b = BOOTCAM[i + 1], f = ss(a.k, b.k, bk);
  pos.copy(a.pos).lerp(b.pos, f); look.copy(a.look).lerp(b.look, f); return lerp(a.fov, b.fov, f);
}

// ---------------------------------------------------------------- the page in each dimension
// a headline block, and labels pinned to the things in the world: each pin's dot sits on a 3D point and
// follows it as the camera moves; its tag hangs off a hairline leader
const dimEls = DIMS.map((_, d) => $("#dim-" + d));
const headEls = dimEls.map((el) => (el ? [...el.querySelectorAll(".head:not(.vh)")] : []));
const pinData = dimEls.map((el, d) => (el ? [...el.querySelectorAll(".pin")].map((p) => {
  const dx = +p.dataset.dx, dy = +p.dataset.dy;
  p.style.setProperty("--dx", dx + "px"); p.style.setProperty("--dy", dy + "px");
  p.style.setProperty("--l", Math.hypot(dx, dy).toFixed(1) + "px"); p.style.setProperty("--a", Math.atan2(dy, dx).toFixed(4) + "rad");
  return { el: p, pi: p.firstElementChild, tag: p.querySelector(".tag"), side: p.dataset.side === "l" ? -1 : 1, dx, dy, gen: -1, fit: null, beat: +p.dataset.beat, at: V(...p.dataset.at.split(",").map(Number)).add(O[d]), on: false };
}) : []));
const headOn = new Map(), proj = V(), fogB = new THREE.Color();
// the location notification: on arriving in a dimension its name drops in at the top, like a phone's notification:
// a small glass capsule drops, spreads sideways on a spring, the words come up; it holds, then folds back up and away
const locEls = dimEls.map((el) => { if (!el || !el.dataset.loc) return null; const w = document.createElement("div"); w.className = "loc-wrap"; w.setAttribute("aria-hidden", "true");
  w.innerHTML = `<div class="loc glass"><div class="loc-in"><p class="loc-t">${el.dataset.loc}</p><p class="loc-s">${el.dataset.sub || ""}</p></div></div>`; el.prepend(w); return w.firstElementChild; });
let locRun = 0, locZone = -1;
const locWait = (ms) => new Promise((r) => setTimeout(r, ms));
async function showLoc(z) {
  const el = locEls[z]; locEls.forEach((o) => o && o !== el && (o.style.opacity = 0)); if (!el) return;
  const run = ++locRun, inn = el.firstElementChild, W = Math.ceil(inn.offsetWidth), H = Math.ceil(inn.offsetHeight) + 30, P = 46, live = () => run === locRun;
  if (reduced) { Object.assign(el.style, { width: W + "px", height: H + "px", opacity: 1 }); inn.style.opacity = 1; await locWait(3400); if (live()) el.style.opacity = 0; return; }
  inn.style.opacity = 0; el.style.width = el.style.height = P + "px";
  SFXcue("notify", z); animate(el, { opacity: [0, 1], y: [-28, 0] }, { type: "spring", visualDuration: 0.42, bounce: 0.34 }); await locWait(230); if (!live()) return;   // the drop; it spreads before it has quite settled
  animate(el, { width: [P, W], height: [P, H] }, { type: "spring", visualDuration: 0.52, bounce: 0.26 });                                  // the spread
  await animate(inn, { opacity: [0, 1], y: [8, 0] }, { duration: 0.42, delay: 0.16, ease: [0.22, 1, 0.36, 1] }); if (!live()) return;
  await locWait(2900); if (!live()) return;
  await animate(inn, { opacity: 0, y: -4 }, { duration: 0.2, ease: [0.55, 0, 1, 0.45] }); if (!live()) return;
  SFXcue("notifyClose", z); await animate(el, { width: P, height: P }, { type: "spring", visualDuration: 0.36, bounce: 0.12 }); if (!live()) return;            // folds back
  await animate(el, { opacity: 0, y: -28 }, { duration: 0.3, ease: [0.55, 0, 1, 0.45] });                                           // and lifts away
}
const roomBtns = $$("#rooms button"); let lastCur = -2;
function reveal(el, on, y0) {
  if (reduced) { el.style.opacity = on ? 1 : 0; return; }
  animate(el, on ? { opacity: [0, 1], y: [y0, 0] } : { opacity: 0, y: -8 }, on ? { duration: 0.7, ease: [0.22, 1, 0.36, 1] } : { duration: 0.28, ease: [0.55, 0, 1, 0.45] });
}
const paneCache = {};
function glassPanes(el) {
  const U = cinema.uniforms; let n = 0;
  if (el) for (const p of (paneCache[el.id] ||= [...el.querySelectorAll(".glass")].map((e) => ({ e, host: e.closest(".pi, .head, .loc"), pin: e.closest(".pin"), r: getComputedStyle(e).borderTopLeftRadius })))) {
    if (n >= 6) break;
    const op = p.host ? (p.host.style.opacity === "" ? 0 : +p.host.style.opacity) : 1;
    if (op < 0.01 || (p.pin && p.pin.style.visibility === "hidden")) continue;
    const b = p.e.getBoundingClientRect(); if (b.width < 4 || b.bottom < 0 || b.top > innerHeight || b.right < 0 || b.left > innerWidth) continue;
    const k = b.width / (p.e.offsetWidth || b.width), rad = p.r.endsWith("%") ? (Math.min(b.width, b.height) * parseFloat(p.r)) / 100 : parseFloat(p.r) * k;
    const dx = Math.max(b.left - S.px, 0, S.px - b.right), dy = Math.max(b.top - S.py, 0, S.py - b.bottom), want = 1 - ss(0, 90, Math.hypot(dx, dy));
    p.h = (p.h || 0) + (want - (p.h || 0)) * 0.16; U.uPaneH.value[n] = p.h * op;
    U.uPane.value[n].set(b.left, b.top, b.width, b.height); U.uPaneE.value[n].set(Math.min(rad, b.width / 2, b.height / 2), op, Math.min(30 * k, Math.min(b.width, b.height) * 0.2), 0); n++;
  }
  U.uPaneN.value = n; glassBlur.on = n > 0; U.uMouse.value.set(S.px, S.py);
}
// On a phone (or any small window) a label never leaves the screen: it hangs closer to its dot, stays inside the
// band between the top bar and the subtitles, and its leader runs from the dot to the nearest point of its edge.
// Its size is measured once (again after a resize), never every frame.
const TAGR = { gen: 0 };
// A small screen gathers the live labels in the band at the bottom instead (the reference's own phone layout: the
// scene above, the words below): held upright they stack, turned sideways they stand in a row, each under its thing
// as far as it can be and never on top of another, its leader running up to its dot.
const TAGB = { pad: 14, top: 66, bot: () => innerHeight - (VP.w < VP.h ? 158 : 128) };   // (room under it for four lines of subtitle and the questions)
function sizeTag(p) { if (p.gen !== TAGR.gen) { p.gen = TAGR.gen; p.tw = p.tag.offsetWidth; p.th = p.tag.offsetHeight; p.fit = null; } }
function fitTag(p, x, y) {
  sizeTag(p);
  let L = x + p.dx * 0.5 - (p.side < 0 ? p.tw : 0), T = y + p.dy * 0.5 - p.th / 2;
  L = clamp(L, TAGB.pad, Math.max(TAGB.pad, VP.w - TAGB.pad - p.tw)); T = clamp(T, TAGB.top, Math.max(TAGB.top, TAGB.bot() - p.th));
  placeTag(p, x, y, L, T);
}
function dockTags(list) {
  if (VP.w < VP.h) {
    let b = TAGB.bot();
    for (let i = list.length - 1; i >= 0; i--) {
      const [p, x, y] = list[i]; sizeTag(p);
      const T = Math.max(TAGB.top, b - p.th), L = clamp(x - p.tw / 2, TAGB.pad, Math.max(TAGB.pad, VP.w - TAGB.pad - p.tw));
      placeTag(p, x, y, L, T); b = T - 10;
    }
    return;
  }
  const row = list.map(([p, x, y]) => { sizeTag(p); return { p, x, y, L: x - p.tw / 2 }; }).sort((a, b) => a.x - b.x);
  let right = TAGB.pad; for (const it of row) { it.L = Math.max(it.L, right); right = it.L + it.p.tw + 12; }
  const over = right - 12 - (VP.w - TAGB.pad); if (over > 0) for (const it of row) it.L -= over;
  for (const it of row) placeTag(it.p, it.x, it.y, Math.max(TAGB.pad, it.L), Math.max(TAGB.top, TAGB.bot() - it.p.th));
}
// anywhere else a label keeps the place it was designed for, unless that would take it off the screen
function keepOn(p, x, y) {
  sizeTag(p);
  const L0 = x + p.dx - (p.side < 0 ? p.tw : 0), T0 = y + p.dy - p.th / 2, pad = 16;
  const L = clamp(L0, pad, Math.max(pad, VP.w - pad - p.tw)), T = clamp(T0, 84, Math.max(84, innerHeight - 24 - p.th));
  if (Math.abs(L - L0) < 0.5 && Math.abs(T - T0) < 0.5) { if (p.fit) unfit(p); return; }
  placeTag(p, x, y, L, T);
}
function placeTag(p, x, y, L, T) {
  const tx = Math.round(L - x), ty = Math.round(T - y);
  if (p.fit && p.fit[0] === tx && p.fit[1] === ty) return;
  if (!p.fit) p.el.classList.add("fit");
  p.fit = [tx, ty];
  const cx = clamp(0, tx, tx + p.tw), cy = clamp(0, ty, ty + p.th), st = p.el.style;
  st.setProperty("--tx", tx + "px"); st.setProperty("--ty", ty + "px"); st.setProperty("--l", Math.max(0, Math.hypot(cx, cy) - 2).toFixed(1) + "px"); st.setProperty("--a", Math.atan2(cy, cx).toFixed(4) + "rad");
}
function unfit(p) { p.fit = null; p.el.classList.remove("fit"); const st = p.el.style; st.removeProperty("--tx"); st.removeProperty("--ty"); st.setProperty("--l", Math.hypot(p.dx, p.dy).toFixed(1) + "px"); st.setProperty("--a", Math.atan2(p.dy, p.dx).toFixed(4) + "rad"); }
function updatePins(zone, E, hks) {
  let live = null; const compact = document.documentElement.classList.contains("compact"), dock = compact, docked = [];
  dimEls.forEach((el, d) => {
    if (!el) return;
    const vis = S.started && d === zone && E > 0.02;
    el.style.visibility = vis ? "visible" : "hidden"; if (vis) live = el;
    headEls[d].forEach((h) => { const b = h.dataset.beat, want = vis && E > 0.6 && (b === undefined || (hks[+b] || 0) > 0.6); if (want !== !!headOn.get(h)) { headOn.set(h, want); reveal(h, want, 24); h.classList.toggle("live", want); if (want && compact) { locRun++; locEls.forEach((o) => o && (o.style.opacity = 0)); } }   /* (on a small screen the place name gives way to the card, which takes its spot under the bar) */ });
    pinData[d].forEach((p) => {
      const want = vis && (hks[p.beat] || 0) > 0.55;
      if (want !== p.on) { p.on = want; reveal(p.pi, want, 10); p.el.classList.toggle("live", want); if (want) SFXcue("tick", d); }
      if (!vis) return;
      proj.copy(p.at).project(camera);
      const x = (proj.x * 0.5 + 0.5) * VP.w, y = (-proj.y * 0.5 + 0.5) * VP.h;
      p.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      p.el.style.visibility = proj.z < 1 ? "" : "hidden";
      if (p.on && compact) { if (dock) docked.push([p, x, y]); else fitTag(p, x, y); } else if (p.on) keepOn(p, x, y); else if (p.fit) unfit(p);
    });
  });
  if (docked.length) dockTags(docked);
  glassPanes(live);
}

// ---------------------------------------------------------------- loading, the one button, the opening
await Promise.all([document.fonts ? document.fonts.ready : 0, loadIcons()]);
$$("[data-ic]").forEach((el) => el.insertAdjacentHTML("afterbegin", inlineIcon(el.dataset.ic)));
const gateEl = $("#gate"), pct = $("#pct");
const photo = new Promise((res) => { const im = new Image(); im.onload = im.onerror = res; im.src = "/assets/yatharth-cut.webp"; });
// every material in every dimension compiled now, behind the loader (each one would otherwise stall the first frame it is seen)
const warm = dimsReady.then(() => new Promise((res) => setTimeout(() => {
  const saved = []; scene.traverse((o) => { saved.push([o, o.visible]); o.visible = true; });
  try { renderer.compile(scene, camera); } catch (e) { /* a compile failure shows up when that thing is drawn */ }
  const sv = []; crisp.traverse((o) => { sv.push([o, o.visible]); o.visible = true; }); try { crispR.compile(crisp, camera); } catch (e) { /* as above */ } sv.forEach(([o, v]) => (o.visible = v));
  saved.forEach(([o, v]) => (o.visible = v)); res();
}, 30)));
let shownPct = 0; const loads = [photo, warm, new Promise((r) => requestAnimationFrame(() => r()))];
let loaded = 0; loads.forEach((p) => p.then(() => loaded++));
const tick = setInterval(() => { shownPct += ((loaded / loads.length) * 100 - shownPct) * 0.25 + 0.6; pct.textContent = Math.min(100, Math.round(shownPct)); }, 50);
Promise.all(loads).then(() => { clearInterval(tick); pct.textContent = 100; setTimeout(() => gateEl.classList.add("ready"), 200); });
function start(quick) {
  if (S.started) return; S.started = true; document.documentElement.style.overflow = "";
  // an iPhone with its silent switch on mutes web audio unless the page asks to be heard as media (Safari 17+)
  try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) { /* older browsers: nothing to set */ }
  sound.enable(true).then(() => SFXcue("powerUp"));
  gateEl.classList.add("gone");
  // the opening, short and automatic: the light comes up on him, his eyes flicker on, he greets you
  const tl = gsap.timeline();
  tl.to(S, { fade: 1, duration: quick ? 0 : 1.2, ease: "power2.out" }, 0);
  if (!quick && !reduced) tl.to(S, { eyes: 1, duration: 1.1, ease: "power2.inOut" }, 0.4);
  else tl.set(S, { eyes: 1 }, 0);
  tl.call(() => sound.tick(), null, 0.46).call(() => sound.pop(), null, 1.06)
    .to(S, { wake: 1, duration: 0.5, ease: "power2.out" }, 1.15)
    .call(() => say("tour-start", LINES["tour-start"]), null, quick ? 0 : 1.4)
    .call(() => { $("#hud").classList.add("on"); $("#cue").classList.add("on"); $("#skip").classList.add("on"); SB.show(true); }, null, quick ? 0 : 2.2);
}
$("#start").addEventListener("click", () => start(false));
sound.prime();   // the clips' timings, for the subtitles, even with sound off
const BOOTPACE = { fast: false };
$("#skip").addEventListener("click", () => { BOOTPACE.fast = true; scrollTo({ top: BOOT_S * VP.h, behavior: "smooth" }); });
// debug: ?t=<1..5> opens in a dimension, ?s=<screens> anywhere; ?skip starts straight away
if (Q.has("t") || Q.has("s") || Q.has("skip")) { gateEl.classList.add("gone"); start(true); const d = +(Q.get("t") || 0), x = Q.has("s") ? +Q.get("s") : d > 0 ? dimS[d] + 0.2 : 0; requestAnimationFrame(() => scrollTo(0, x * VP.h)); S.s = S.st = x; S.u = S.uPrev = uOfS(x); }

// ---------------------------------------------------------------- Otto's body
// the director: from the line he is saying, his gesture and where it points, his expression; flying changes his face
const _aimL = V(), WAVE = { on: 0 };
function direct(t, near, hw) {
  const P = otto.P, now = performance.now() / 1000, el = now - ACT.t0, talking = el < ACT.dur + 0.2, lead = ACT.g === "wave" ? 2.6 : Math.min(2.0, Math.max(1.1, ACT.dur * 0.42));   // a wave needs a few swings to read
  let g = "rest", aim = null, side = 0;
  if (talking && S.fly < 0.4) {
    g = el < lead ? ACT.g : "beat";
    if ((g === "point" || g === "present") && ACT.aims.length) {
      aim = ACT.aims[ACT.aims.length > 1 && el > lead * 0.5 ? 1 : 0];              // two tiles: this one, then that one
      _aimL.copy(aim); holder.worldToLocal(_aimL);
      if (_aimL.z < -0.4 && Math.abs(_aimL.x) < -_aimL.z * 1.5) { g = "open"; aim = null; } else side = _aimL.x >= 0 ? 1 : -1;   // never reach behind his back
    } else if (g === "point" || g === "present") g = "open";
  }
  WAVE.on = g === "wave" ? 1 : 0; if (g === "wave") g = "rest";
  if (g !== P.gesture && /^(point|present|open|self)$/.test(g) && S.fly < 0.2) SFXcue("servo");   // (not while he is flying past)   // his motors, when he moves into a gesture
  P.gesture = g; P.aim = aim; P.aimSide = side || undefined; P.glance = aim && el < lead ? 1 : 0;
  // his face: the line's mood while he says it and a moment after; focused at speed; wide-eyed in a dive
  const x = P.expr; for (const k in x) x[k] = 0;
  if (el < ACT.dur + 1.2 && ACT.e && ACT.e !== "neutral") x[ACT.e] = el < ACT.dur ? 1 : 0.6;
  else if (Math.sin(t * 0.31) > 0.94) x.curious = 0.7;                                  // now and then, idly curious
  if (near === 5 && hw > 0.5) x.happy = Math.max(x.happy, 0.8);
  const fl = Math.min(1, S.fly * 1.6); for (const k in x) x[k] *= 1 - fl; x.focus = Math.max(x.focus, fl * 0.85 * (1 - S.dive)); x.excited = Math.max(x.excited, S.dive * 0.9);
}
function poseOtto(t, dt, near, hw, spK, B) {
  const P = otto.P;
  P.power = S.eyes; P.sleep = 1 - S.wake; P.wave = Math.max(B.wave, WAVE.on); P.thrown = 0; P.jump = 0.1 * B.lift;
  // his mouth moves with his voice (eased), but none of his lights follow it
  const ft = (performance.now() / 1000 - FAKE.t0) / FAKE.k, inSeg = !FAKE.segs || FAKE.segs.some(([a, b]) => ft >= a && ft <= b);
  const talkTo = S.fake > 0 ? (inSeg ? 0.3 + 0.26 * Math.sin(t * 11) * Math.sin(t * 3.3) : 0) : S.talk; if (S.fake > 0) S.fake -= dt;
  P.talk += (talkTo - P.talk) * (1 - Math.exp(-dt * 16));
  P.lookX = S.mx * (0.12 + 0.3 * hw); P.lookY = S.my * (0.1 + 0.18 * hw);
  // a soft blink every few seconds: the lids close and open over a quarter second, nothing switches
  S.blinkT += dt; if (S.blinkT > S.blinkAt) { S.blinkT = 0; S.blinkAt = 3.5 + Math.random() * 4; }
  { const b = S.blinkT < 0.26 ? Math.sin((S.blinkT / 0.26) * Math.PI) : 0; P.blink = b * b * (3 - 2 * b) * 0.92; }
  direct(t, near, hw);
  P.palm = Math.min(1, S.palm * 1.6);
  otto.pose(dt);
  LM.color.copy(LCOL).multiplyScalar(S.eyes);
  S.mouth += (P.talk - S.mouth) * (1 - Math.exp(-dt * 10)); if (MOUTH) MOUTH.scale.set(1 + Math.min(1, S.mouth) * 0.22, 1 + Math.min(1, S.mouth) * 0.12, 1);
  // his halos hold steady (the model would pulse them with his voice and drop them on a blink)
  { const st = S.eyes * (0.62 + 0.04 * Math.sin(t * 0.9));
    PR.bulbHalo.material.opacity = 0.18 + st * 0.42;
    PR.eyeHalos.forEach((h) => (h.material.opacity = (0.22 + st * 0.4) * (1 - P.blink * 0.5))); }
  const fly = S.fly;
  otto.head.rotation.x -= S.lean * 0.62;
  PR.arms.forEach((a, i) => {
    const sd = a.side, swept = fly * (1 - S.dive) * (1 - S.climb * 0.6);
    a.sh.rotation.x = lerp(a.sh.rotation.x, 0.42, swept); a.sh.rotation.z = lerp(a.sh.rotation.z, sd * 0.2, swept); a.el.rotation.x = lerp(a.el.rotation.x, -0.1, swept);
    a.sh.rotation.x = lerp(a.sh.rotation.x, -2.7, S.dive * 0.9); a.sh.rotation.z = lerp(a.sh.rotation.z, sd * 0.14, S.dive);
    a.sh.rotation.z = lerp(a.sh.rotation.z, sd * 0.62, S.climb); a.sh.rotation.x = lerp(a.sh.rotation.x, 0.15, S.climb * 0.6);
    a.sh.rotation.z += sd * Math.max(0, -sd * S.roll) * 0.7;
    a.sh.rotation.x += Math.sin(t * 6.3 + i * 2) * 0.03 * fly;
  });
  PR.legs.forEach((l) => { l.hip.rotation.x = lerp(l.hip.rotation.x, 0.06 + S.climb * 0.15, fly); l.knee.rotation.x = lerp(l.knee.rotation.x, 0.16 + S.climb * 0.35, fly); l.ankle.rotation.x = lerp(l.ankle.rotation.x, 0.45 - S.climb * 0.2, fly); l.hip.rotation.z = lerp(l.hip.rotation.z, -l.side * 0.035, fly); });
  // folded until each part locks out
  otto.rig.position.y -= B.legF * 0.07;
  PR.legs.forEach((l) => { l.hip.rotation.x -= B.legF * 0.32; l.knee.rotation.x += B.legF * 0.6; l.ankle.rotation.x -= B.legF * 0.28; });
  PR.arms.forEach((a) => { a.sh.rotation.x += B.armF * 0.3; a.el.rotation.x -= B.armF * 0.75; });
  otto.head.position.y = 0.36 - B.headF * 0.04; otto.head.rotation.x += B.headF * 0.34; PR.chest.rotation.x += B.headF * 0.12;
  PR.core.visible = B.core > 0.02; PR.core.material.color.copy(new THREE.Color(ACC)).multiplyScalar(0.3 + 0.9 * B.core);
  PR.coreHalo.material.opacity = B.core * (0.36 + 0.06 * (1 + Math.sin(t * 1.1)));
  coreLight.intensity = B.core * 0.9;
  Object.keys(partMats).forEach((k) => { if (partFlash[k] == null) { partMats[k].emissiveIntensity = 0; return; } partFlash[k] += dt; const x = partFlash[k], f = Math.min(1, x / 0.18) * Math.max(0, 1 - Math.max(0, x - 0.18) / 1.1); partMats[k].emissiveIntensity = f * f * (3 - 2 * f) * 0.9; if (x > 1.3) delete partFlash[k]; });
  scanRing.visible = B.scanOn > 0.01; scanRing.position.y = B.scanY; scanRing.material.opacity = B.scanOn * 0.55;
  scanRing.scale.setScalar(B.scanY > 1.55 ? 0.97 : B.scanY < 0.75 ? 0.6 : 1.08);   // sized to Field Otto: clear of his head pods, shoulder pads and legs; dimmer, so passing the camera it never floods the frame
  // thrust: one eased value. Hovering it idles low; flying it opens up; climbing it burns long; diving it eases off
  const want = B.jets * Math.max(B.lift * 0.42, 0.45 + spK * 0.8 + S.climb * 1.4 - S.dive * 0.25);
  S.thrust += (want - S.thrust) * (1 - Math.exp(-dt * 5));
  const on = Math.min(1, S.thrust * 2.2);
  flame.visible = S.thrust > 0.02;
  bootMats.forEach((m) => { m.uniforms.uT.value = t; m.uniforms.uThr.value = on; });
  flame.children.forEach((g) => { const u = g.userData; u.plume.scale.set(1 + S.climb * 0.3, Math.max(0.01, S.thrust), 1 + S.climb * 0.3); u.hot.scale.y = 0.45 + S.thrust * 0.55; u.glow.material.opacity = on * 0.5; });
  thrustLight.intensity = LOW ? 0 : on * (0.5 + S.thrust * 0.5);
  const pk = Math.max(fly * 0.8, S.climb * 1.3, (1 - fly) * B.lift * 0.4) * B.jets;
  S.palm += (pk - S.palm) * (1 - Math.exp(-dt * 5));
  palmMats.forEach((m) => { m.uniforms.uT.value = t; m.uniforms.uThr.value = Math.min(1, S.palm * 2); });
  palms.forEach((p) => { const u = p.userData; p.visible = S.palm > 0.03; u.plume.scale.y = Math.max(0.01, S.palm); u.hot.scale.y = 0.45 + S.palm * 0.55; u.glow.material.opacity = Math.min(1, S.palm * 2) * 0.4; });
  if (otto.post) otto.post();   // the model's last pass: nothing left inside anything else
}

// ---------------------------------------------------------------- frame
const camPos = V(), camLook = V(), camOff = V(), lookOff = V(), tgtPos = V(), tgtLook = V(), qT = new THREE.Quaternion(), m4 = new THREE.Matrix4(), qRoll = new THREE.Quaternion(), ZAX = V(0, 0, 1);
let first = true, last = performance.now(), t0 = performance.now();
const _p = V(), _tg = V(), _tgp = V(), _bp = V(), _bl = V(), _sx = V(), ACCC = new THREE.Color(ACC);
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05); last = now; const t = (now - t0) / 1000;
  if (S.started) adapt(now);   // before anything is drawn: a resize clears the canvas
  distort.update(dt);
  // your scroll is the only driver: one damping step from the page's scroll position (in screens). Nothing
  // ever scrolls the page for you.
  if (S.started) {
    S.st = FREEZE.at >= 0 ? FREEZE.at : clamp(scrollY / VP.h, 0, S_TOTAL); let ds = (S.st - S.s) * (1 - Math.exp(-dt * (PAGED ? 3.2 : 7)));
    if (PAGED) ds = clamp(ds, -dt * 2.6, dt * 2.6);   // (a swipe moves the page a whole stop at once: the journey flies there, never faster than this)
    // the wake-up keeps its own pace: however hard you scroll, it takes about six seconds (back again, half that);
    // the skip button lets it run quicker
    if (S.s < BOOT_S - 0.001 || (S.st < BOOT_S && ds < 0)) { const cap = (dt * BOOT_S) / (BOOTPACE.fast ? 1.4 : 6.2); ds = clamp(ds, -cap * 2, cap); }
    else BOOTPACE.fast = false;
    S.s += ds;
  }
  const s = S.s;
  S.uPrev = S.u; S.u = uOfS(s);
  const u = S.u, sO = u * LEN, speed = (Math.abs(S.u - S.uPrev) * LEN) / Math.max(dt, 1e-3);
  S.speed += (speed - S.speed) * 0.08; const spK = Math.min(1, S.speed / 30);
  S.fly += (spK - S.fly) * 0.06;
  S.mx += (S.tmx - S.mx) * (1 - Math.exp(-dt * 3.2)); S.my += (S.tmy - S.my) * (1 - Math.exp(-dt * 3.2));
  const zone = zoneAt(u), E = exploreW(zone, u), hks = zone > 0 ? beatK(zone, u) : [], hk = hks.length ? Math.max(...hks) : 0, hw = hk * E;
  const bk = ss(0, BOOT_S, s) * (S.started ? 1 : 0), B = bootState(bk, t);
  // inside a wormhole? which, and how far through
  let worm = -1, wf = 0;
  for (let k = 0; k < N - 1; k++) if (u > uPortal[k] - 45 / LEN && u < uArrive[k + 1] + 6 / LEN) { worm = k; wf = clamp((u - uPortal[k]) / (uArrive[k + 1] - uPortal[k]), 0, 1); }
  const inWorm = worm >= 0 && wf > 0 && wf < 1;

  // the dimension's own camera key at this point (used by Otto to know where you are, and by the camera)
  const bp = _bp, bl = _bl; let bfov = 40;
  if (zone > 0) bfov = beatCam(zone, u, bp, bl);

  // Otto: placed on the route, turned smoothly toward where he's going, banked into turns
  const p = curve.getPointAt(u, _p), tg = curve.getTangentAt(u, _tg);
  holder.position.copy(p).addScaledVector(UP, 0.42 * B.lift + Math.sin(t * 1.6) * 0.05 * B.lift);
  const tgPrev = curve.getTangentAt(Math.max(0, u - 0.002), _tgp);
  const yawRate = Math.atan2(tgPrev.x * tg.z - tgPrev.z * tg.x, tgPrev.x * tg.x + tgPrev.z * tg.z) * 500 * spK;
  const diveK = clamp(-tg.y * 1.8, 0, 1) * spK, climbK = clamp(tg.y * 1.8, 0, 1) * spK;
  S.dive += (diveK - S.dive) * 0.06; S.climb += (climbK - S.climb) * 0.06;
  S.roll += (clamp(-yawRate * 1.3, -0.8, 0.8) - S.roll) * 0.05;
  let fwd;
  if (s < BOOT_S + 0.14) { const yaw = lerp(0, Math.PI, B.turn); fwd = V(Math.sin(yaw), 0, Math.cos(yaw)).lerp(V(tg.x, tg.y * 0.3, tg.z).normalize(), ss(BOOT_S, BOOT_S + 0.14, s)).normalize(); }
  else {
    fwd = V(tg.x, tg.y * 0.7, tg.z).normalize();
    if (hw > 0.001) {
      // at a beat he turns toward you and the thing you are looking at
      const toCam = bp.clone().sub(p).setY(0).normalize(), toLook = bl.clone().sub(p).setY(0).normalize();
      // (only the sideways part of the look target counts: when he is between you and it, the two would cancel)
      const face = toCam.clone().addScaledVector(toLook.clone().addScaledVector(toCam, -toLook.dot(toCam)), 0.45).normalize();
      // while he points at or presents a tile, he turns partly toward it
      const PA = otto.P.aim; if (PA && (otto.P.gesture === "point" || otto.P.gesture === "present")) face.lerp(PA.clone().sub(p).setY(0).normalize(), 0.5).normalize();
      fwd.lerp(face, hw); if (fwd.lengthSq() < 0.04) fwd.add(V(0.3, 0, 0)); fwd.normalize();
    }
  }
  m4.lookAt(fwd, V(0, 0, 0), UP); qT.setFromRotationMatrix(m4); qRoll.setFromAxisAngle(ZAX, S.roll); qT.multiply(qRoll);
  if (first) holder.quaternion.copy(qT); else holder.quaternion.slerp(qT, 1 - Math.exp(-dt * 5));
  S.lean += (spK * (1.1 + S.dive * 0.45 - S.climb * 0.85) - S.lean) * (1 - Math.exp(-dt * 4));
  pivot.rotation.set(S.lean + Math.sin(t * 2.3) * 0.025 * S.fly, 0, Math.sin(t * 1.7) * 0.035 * S.fly);
  poseOtto(t, dt, zone, hw, spK, B);
  if (S.started) SB.update(s, dt, spK, inWorm);
  // ---- the soundscape: what you hear follows where you are and how you are moving
  if (sound.on && sound.ctx) {
    if (!SFX) SFX = createSoundscape({ ctx: sound.ctx, out: sound.out });
    SFX.setOn(true);
    const now = sound.ctx.currentTime, du = (u - S.uPrev) * LEN;
    let near = 0; for (let k = 0; k < N - 1; k++) { const d = (uPortal[k] - u) * LEN; if (d > 0 && d < 70) near = Math.max(near, 1 - d / 70); }
    _sx.copy(holder.position).project(camera);
    SFX.update(now, dt, { zone, inWorm, wf, spK, thrust: S.thrust, palm: S.palm, talk: otto.P.talk, ottoX: _sx.x, near, boot: bk });
    // crossing a portal's mouth or the far end, either way (not on a jump in place)
    if (Math.abs(du) < 60) for (let k = 0; k < N - 1; k++) {
      if (S.uPrev < uPortal[k] && u >= uPortal[k]) SFXcue("enter", k + 1);
      else if (S.uPrev >= uPortal[k] && u < uPortal[k]) SFXcue("exit", k);
      if (S.uPrev < uArrive[k + 1] && u >= uArrive[k + 1]) SFXcue("exit", k + 1);
      else if (S.uPrev >= uArrive[k + 1] && u < uArrive[k + 1]) SFXcue("enter", k);
    }
  } else if (SFX && SFX.on) { SFX.setOn(false); SFX.update(sound.ctx ? sound.ctx.currentTime : 0, dt, { zone, inWorm, wf, spK: 0, thrust: 0, palm: 0, talk: 0, ottoX: 0, near: 0, boot: 1 }); }
  trail.update(dt, flame.visible && !inWorm ? spK * 1.6 + S.climb * 2.4 : 0);

  // the pad, the opening's light, the key light from the current dimension's star
  pad.g.visible = zone === 0;
  pad.ringM.color.copy(ACCC).multiplyScalar(2 * B.pad);
  pad.whiteM.color.setScalar(1.8 * B.pad * S.eyes);
  pad.scan.scale.setScalar(0.5 + B.shock * 5); pad.scan.material.opacity = (1 - B.shock) * (B.shock > 0 ? 1 : 0);
  const light = zone === 0 ? B.light : 1;
  lights.key.position.copy(back.lightDirs[zone]).multiplyScalar(10); lights.key.intensity = 2.6 * light;
  lights.rim.intensity = 2 * Math.max(0.25, light); lights.fill.intensity = 0.6 * light; lights.rim2.intensity = 1.2 * light;
  scene.environmentIntensity = 0.12 + 0.6 * light;

  // the camera: round him during the wake-up; over his shoulder in flight and through the wormholes; in a
  // dimension, its own camera, moving from one thing to the next
  let fovT = 40 + spK * 9 + S.dive * 6 + (inWorm ? 10 * Math.sin(Math.PI * wf) : 0);
  {
    // inside a wormhole the camera tucks in close behind him, so the curves of the throat never swing it out
    const wk = inWorm ? ss(0, 0.06, wf) * (1 - ss(0.94, 1, wf)) : 0;
    const tc = V(tg.x, tg.y * 0.55, tg.z).normalize(), side = V().crossVectors(tc, UP).normalize();
    tgtPos.copy(p).addScaledVector(side, lerp(1.3, 0.5, wk)).addScaledVector(UP, lerp(2.05, 1.05, wk)).addScaledVector(tc, lerp(-4.6 - spK * 1.3, -4.3, wk));
    tgtLook.copy(p).addScaledVector(UP, lerp(2, 1.2, wk)).addScaledVector(tc, 14).addScaledVector(side, lerp(0.7, 0.2, wk));
  }
  if (E > 0.001) { tgtPos.lerp(bp, E); tgtLook.lerp(bl, E); fovT = lerp(fovT, bfov, E); }
  if (s < BOOT_S) { const cp = V(), cl = V(), fov = bootCamera(bk, cp, cl); const g = ss(0.82, 1, bk); tgtPos.copy(cp).lerp(tgtPos, g); tgtLook.copy(cl).lerp(tgtLook, g); fovT = lerp(fov, fovT, g); }
  tgtPos.x += S.mx * 0.2 * (0.4 + hw); tgtPos.y += S.my * 0.12 * (0.4 + hw);
  // a chase rig: what is smoothed is where the camera sits relative to Otto, never its place in the world
  const k = first ? 1 : 1 - Math.exp(-dt * (s < BOOT_S ? 9 : inWorm ? 7 : 4.2));
  camOff.lerp(tgtPos.sub(p), k); lookOff.lerp(tgtLook.sub(p), k); first = false;
  camPos.copy(p).add(camOff); camLook.copy(p).add(lookOff);
  camera.position.copy(camPos); camera.lookAt(camLook);
  S.croll += ((s > BOOT_S ? S.roll * 0.3 * (1 - E) : 0) - S.croll) * (1 - Math.exp(-dt * 4)); camera.rotateZ(S.croll);
  // a phone held upright keeps its labels in the band at the bottom, so there the camera looks a little lower and
  // the things being shown ride in the upper part of the screen, clear of them (not in Let's talk, whose card is on top)
  { const up = VP.w < VP.h && document.documentElement.classList.contains("compact"), want = up && zone >= 1 && zone <= 4 ? E * Math.atan(0.26 * Math.tan((camera.fov * Math.PI) / 360)) : 0;
    S.tilt = (S.tilt || 0) + (want - (S.tilt || 0)) * (1 - Math.exp(-dt * 3)); if (S.tilt > 1e-4) camera.rotateX(-S.tilt); }
  camera.fov += (fitFov(fovT) - camera.fov) * (1 - Math.exp(-dt * 6)); camera.updateProjectionMatrix();
  space.update(t, camera);

  // only the current dimension exists
  back.update(t, zone);
  dims.update(t, zone, zone > 0 ? ss(uArrive[zone] - 10 / LEN, beatsU[zone][0] - 1 / LEN, u) : 0, camera.position);
  orb.mesh.visible = ring.visible = zone === N - 1; orb.U.uT.value = t; orb.mesh.rotation.y = t * 0.12; ring.material.uniforms.uT.value = t;
  gates.forEach((gt, i) => { gt.built = i === zone ? 1 - ss(16, 70, gt.s - sO) : 0; gt.update(t, gt.built, dt); });
  S.flow += dt * (2.5 + S.speed * 1.1);
  worms.forEach((w, i) => { w.mesh.visible = i === worm && (inWorm || gates[i].built > 0.85) && w.update(t, S.flow, camera.position); });
  path.update(t, sO, ss(BOOT_S * 0.9, BOOT_S, s) * (1 - E) * (worm >= 0 || zone === 1 ? 0 : 1));   // none over the Earth in Hello
  updatePins(zone, E, hks);

  // each dimension's own light (a grade on the whole frame) and air; through a wormhole one turns into the next
  const da = worm >= 0 ? worm : zone, db = worm >= 0 ? worm + 1 : zone, gk = worm >= 0 ? ss(0.25, 0.8, wf) : 0, gA = DIMS[da].grade, gB = DIMS[db].grade;
  cinema.uniforms.uGrade.value.set(lerp(gA[0], gB[0], gk), lerp(gA[1], gB[1], gk), lerp(gA[2], gB[2], gk));
  scene.fog.color.setHex(DIMS[da].fog).lerp(fogB.setHex(DIMS[db].fog), gk);

  // the lens
  cinema.uniforms.tVel.value = distort.texture;
  cinema.uniforms.uLens.value.set(distort.lens.lx, distort.lens.ly, distort.enabled ? 0.018 : 0);
  cinema.uniforms.uT.value = t; cinema.uniforms.uFade.value = S.fade; cinema.uniforms.uTrans.value = 0;
  cinema.uniforms.uCA.value = 0.03 + spK * 0.8 + (inWorm ? 0.4 : 0); cinema.uniforms.uWarp.value = spK * 0.3;
  cinema.uniforms.uBars.value = Math.max(s < BOOT_S ? 1 - ss(BOOT_S * 0.75, BOOT_S, s) : 0, spK * 0.4);

  // the HUD
  const cur = S.started && E > 0.5 ? zone : -1;
  if (cur !== lastCur) { lastCur = cur; roomBtns.forEach((b) => b.setAttribute("aria-current", String(+b.dataset.go === cur))); }
  if (s > 0.08) $("#cue").classList.remove("on");
  if (s > BOOT_S) $("#skip").classList.remove("on");
  if (hw > 0.8) showAsk(zone);
  $("#ask").classList.toggle("on", S.started && hw > 0.8);
  if (S.started && zone >= 1) guide(zone, u, E, hks, inWorm, now, spK > 0.45);
  // the location notification, once on coming out into a dimension (not while racing through one)
  if (S.started && zone >= 1 && zone !== locZone && !inWorm && u >= uArrive[zone] - 2 / LEN && spK < 0.6) { locZone = zone; showLoc(zone); }
  else if (inWorm && locZone >= 0) { locRun++; locEls.forEach((o) => o && (o.style.opacity = 0)); locZone = -1; }

  if (DBG.raw) renderer.render(scene, camera); else composer.render(dt);
  crispFrame(zone);
  cssR.render(css3d, camera);
  // (render quality is adjusted at the start of the frame, before drawing)
  requestAnimationFrame(frame);
}
// the crisp layer, drawn over just the part of the screen its photos and portrait cover
function crispFrame(zone) {
  const vw = VP.w, vh = VP.h; let r = null;
  if (dims.crispOn(zone) && S.fade > 0.01) { dims.syncCrisp(); r = dims.crispRect(camera, vw, vh); }
  const hide = () => { if (CR.shown) { crispCanvas.style.visibility = "hidden"; CR.shown = false; } };
  if (!r) return hide();
  const x0 = Math.max(0, Math.floor((r[0] - 12) / 4) * 4), y0 = Math.max(0, Math.floor((r[1] - 12) / 4) * 4), rw = Math.min(vw, r[2] + 12) - x0, rh = Math.min(vh, r[3] + 12) - y0;
  if (rw < 2 || rh < 2) return hide();
  const q = (v, m) => Math.min(m, Math.ceil(v / 128) * 128);
  let grow = rw > CR.cw || rh > CR.ch;
  if (!grow && rw < CR.cw * 0.6 && rh < CR.ch * 0.6) grow = ++CR.small > 45; else if (!grow) CR.small = 0;   // shrink only after it has stayed small
  if (grow) { CR.cw = q(rw, vw); CR.ch = q(rh, vh); CR.small = 0; crispR.setSize(CR.cw, CR.ch, false); crispCanvas.style.width = CR.cw + "px"; crispCanvas.style.height = CR.ch + "px"; CR.x = -1; }
  const x = Math.min(x0, vw - CR.cw), y = Math.min(y0, vh - CR.ch);
  if (x !== CR.x || y !== CR.y) { crispCanvas.style.transform = `translate(${x}px, ${y}px)`; CR.x = x; CR.y = y; }
  paneU.uOff.value.set(x, y); paneU.uCH.value = crispCanvas.height;
  crisp.fog.color.copy(scene.fog.color);
  camera.setViewOffset(vw, vh, x, y, CR.cw, CR.ch); crispR.render(crisp, camera); camera.clearViewOffset();
  if (!CR.shown) { crispCanvas.style.visibility = "visible"; CR.shown = true; }
}
size(); addEventListener("resize", () => { TAGR.gen++; const at = S.st; if (measureVP()) { size(); if (S.started) scrollTo(0, at * VP.h); } });
// if the browser takes the 3D away (a phone may, to save memory, when you switch apps) three.js rebuilds it when it
// comes back; if it does not come back, say so and offer a reload
let glLost = false;
canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); glLost = true; const check = () => { if (!glLost) return; if (document.visibilityState === "visible") $("#lost").hidden = false; else setTimeout(check, 1000); }; setTimeout(check, 3000); });
canvas.addEventListener("webglcontextrestored", () => { glLost = false; $("#lost").hidden = true; });
$("#lost button").addEventListener("click", () => location.reload());
camera.position.copy(BOOTCAM[0].pos); camera.lookAt(BOOTCAM[0].look);
requestAnimationFrame(frame);
window.__tour = { VP, TOUCH, PHONE, PAGED, fitFov, distort, fxaa, AQ, S, curve, LEN, camera, GPU, LOW, DPR, goRoom, scene, back, cinema, bloom, holder, renderer, composer, crispR, crisp, glassBlur, NARR, STOPS, showLoc, say, ACT, otto, sfx: () => SFX, DBG, uOfS, dimS, formS, S_TOTAL, HOLDS, dims, worms, zoneAt, beatsU, uPortal, uArrive };
