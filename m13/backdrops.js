// What each room is set against: real space, not props. Every texture is painted once at load (no noise
// computed per pixel per frame), and each room has one star, which is also where Otto's key light comes
// from, so he, the asteroids and the planet are lit from the same side.
//   0 launch pad   a planet's night-side horizon below, a sun just rising over its limb
//   1 hello        a ringed gas giant, lower right, the sun high to the left
//   2 about        a star close enough to blaze, behind the words
//   3 what I make  a nebula bank and a small cratered moon
//   4 work         a blue ice world with a thin atmosphere
//   5 let's talk   the chrome orb with its ring of dust, and a far nebula
import * as THREE from "three";
import { DIMS } from "/m13/dims.js";

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
// ---------- painting, once ----------
function hash(x, y) { const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return h - Math.floor(h); }
function vnoise(x, y) { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1); return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy; }
const fbm = (x, y, o = 5) => { let s = 0, a = 0.5; for (let i = 0; i < o; i++) { s += a * vnoise(x, y); x *= 2.03; y *= 2.03; a *= 0.5; } return s; };
const canvasTex = (w, h, paint, srgb = true) => { const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d"), im = g.createImageData(w, h); paint(im.data, w, h); g.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
function ramp(stops, t) { t = Math.min(0.999, Math.max(0, t)); const n = stops.length - 1, i = Math.floor(t * n); return mixc(stops[i], stops[i + 1], t * n - i); }
// a planet's surface as an equirectangular map: bands bent by turbulence, or a rocky/icy surface
function planetMap(w, h, kind, stops, seed) {
  return canvasTex(w, h, (d) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const u = x / w, v = y / h, i = (y * w + x) * 4;
      let t;
      if (kind === "bands") { const warp = fbm(u * 6 + seed, v * 12, 4) * 0.55; t = 0.5 + 0.5 * Math.sin((v + warp * 0.12) * 38 + fbm(u * 3, v * 40 + seed, 3) * 2.2); t = t * 0.75 + fbm(u * 18 + seed, v * 36, 3) * 0.25; }
      else if (kind === "rock") { t = fbm(u * 10 + seed, v * 5, 6); const cr = vnoise(u * 40 + seed, v * 20); t -= Math.max(0, cr - 0.78) * 1.4; }
      else { t = fbm(u * 7 + seed, v * 3.5, 5) * 0.8 + Math.abs(Math.sin(v * 9 + fbm(u * 4, v * 4 + seed, 3) * 3)) * 0.2; }
      const c = ramp(stops, t); d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
    }
  });
}
function ringMap() { return canvasTex(1024, 4, (d, w, h) => { for (let x = 0; x < w; x++) { const u = x / w; let a = 0.25 + 0.75 * fbm(u * 60, 1.3, 4); a *= Math.min(1, u * 8) * Math.min(1, (1 - u) * 5); if (u > 0.55 && u < 0.6) a *= 0.12; const c = 200 + 40 * vnoise(u * 90, 3); for (let y = 0; y < h; y++) { const i = (y * w + x) * 4; d[i] = c; d[i + 1] = c * 0.97; d[i + 2] = c * 0.93; d[i + 3] = a * 255; } } }); }
const CLOUDS = [];
function cloudMap(seed) { const k = CLOUDS.length < 3 ? CLOUDS.length : Math.floor(Math.abs(seed * 7)) % 3; if (CLOUDS[k]) return CLOUDS[k]; return (CLOUDS[k] = canvasTex(256, 256, (d, w, h) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const u = x / w - 0.5, v = y / h - 0.5, r = Math.sqrt(u * u + v * v) * 2, i = (y * w + x) * 4;
  const n = fbm(x / 45 + seed, y / 45 - seed, 5), rn = 1 - Math.abs(fbm(x / 26 - seed, y / 26 + seed, 5) * 2 - 1), m = Math.max(0, n - 0.4) * 1.7 * Math.max(0, 1 - r * r) * (0.3 + 0.7 * Math.pow(rn, 3)); const a = Math.min(1, m * m * 1.5); d[i] = 255; d[i + 1] = 255; d[i + 2] = 255; d[i + 3] = a * 255; } }, false)); }
let GLOW = null;
function glowMap() { if (GLOW) return GLOW; return (GLOW = canvasTex(256, 256, (d, w, h) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const u = (x / w - 0.5) * 2, v = (y / h - 0.5) * 2, r = Math.sqrt(u * u + v * v), i = (y * w + x) * 4; const e = Math.min(1, Math.max(0, (1 - r) / 0.3)), a = (Math.exp(-r * r * 9) + Math.exp(-r * 3.2) * 0.35) * e * e * (3 - 2 * e); /* falls to exactly 0 at the edge: no visible sprite square */ d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = Math.min(255, a * 255); } }, false)); }
function coronaMap() { return canvasTex(256, 256, (d, w, h) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const u = (x / w - 0.5) * 2, v = (y / h - 0.5) * 2, r = Math.sqrt(u * u + v * v), a0 = Math.atan2(v, u), i = (y * w + x) * 4;
  const rays = Math.pow(vnoise(a0 * 9 + 20, 3) * 0.6 + vnoise(a0 * 31 + 5, 7) * 0.4, 2.2); const a = Math.max(0, 1 - r) ** 2 * (0.25 + rays * 1.4) * Math.min(1, Math.max(0, (r - 0.08) * 6)); d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = Math.min(255, a * 255); } }, false); }

// ---------- objects ----------
// the night side of the Earth from about 1,300 km up: NASA's Black Marble (city lights over moonlit land), with
// a sharper crop over India, set so Delhi lies just below the horizon under his portrait; a thin green airglow
// line on the limb (the real one, at about 100 km), a fainter red layer above it, and a dawn far off to the right.
function nightEarth(R, centre, sunDir, aim) {
  const L = new THREE.TextureLoader(), tex = (u) => { const t = L.load(u); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16; return t; };
  const U = { tReg: { value: tex("/m13/img/earth-india.jpg") }, tGlob: { value: tex("/m13/img/earth-night-2k.jpg") }, uL: { value: sunDir.clone() }, uC: { value: centre.clone() }, uR: { value: R }, uT: { value: 0 } };
  const g = new THREE.Group(); g.position.copy(centre);
  const body = new THREE.Mesh(new THREE.SphereGeometry(R, 256, 128), new THREE.ShaderMaterial({ uniforms: U,
    vertexShader: "varying vec3 vP, vN, vW; void main(){ vP = position; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
    fragmentShader: `uniform sampler2D tReg, tGlob; uniform vec3 uL; varying vec3 vP, vN, vW;
      void main(){
        vec3 p = normalize(vP); float lat = degrees(asin(clamp(p.y, -1., 1.))), lon = degrees(atan(p.x, p.z));
        vec3 c = texture2D(tGlob, vec2((lon + 180.) / 360., (lat + 90.) / 180.)).rgb;
        vec2 ru = vec2((lon - 50.) / 60., lat / 50.);   // the India crop: 50E..110E, 0..50N
        float inR = smoothstep(0., .03, ru.x) * smoothstep(1., .97, ru.x) * smoothstep(0., .03, ru.y) * smoothstep(1., .97, ru.y);
        c = mix(c, texture2D(tReg, clamp(ru, 0., 1.)).rgb, inR);
        c *= .2 + 1.6 * smoothstep(.015, .2, dot(c, vec3(.2126, .7152, .0722)));   // moonlit land stays dark; the cities carry the light
        vec3 n = normalize(vN), v = normalize(cameraPosition - vW); float mu = max(dot(n, v), 0.), air = pow(1. - mu, 4.);
        c *= mix(vec3(1.), vec3(.42, .3, .2), air);                          // through more air toward the limb: dimmer, warmer
        c += vec3(.008, .026, .016) * pow(1. - mu, 9.);                           // the airglow layer, seen through from above
        float dawn = pow(max(dot(n, uL) + .18, 0.), 3.);
        c += vec3(.5, .22, .08) * pow(1. - mu, 6.) * dawn * .5;
        gl_FragColor = vec4(c, 1.); }` }));
  g.add(body);
  // the layers above the limb: computed from how close each sight line passes to the planet
  const shell = new THREE.Mesh(new THREE.SphereGeometry(R * 1.06, 160, 80), new THREE.ShaderMaterial({ uniforms: U, side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: "varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
    fragmentShader: `uniform vec3 uL, uC; uniform float uR; varying vec3 vW;
      void main(){
        vec3 d = normalize(vW - cameraPosition), oc = uC - cameraPosition; float tca = dot(oc, d);
        vec3 cp = cameraPosition + d * tca; float h = (length(cp - uC) - uR) / uR;   // the sight line's lowest height, in radii
        if (h < 0. || tca < 0.) discard;
        float sun = dot(normalize(cp - uC), uL);
        float green = exp(-pow((h - .0158) / .0024, 2.)) * .26;                   // 557.7 nm oxygen line, ~100 km up
        float red = exp(-pow((h - .036) / .01, 2.)) * .01;                      // 630 nm, higher and fainter
        float dawn = pow(max(sun + .15, 0.), 4.);
        vec3 tw = vec3(1., .4, .12) * exp(-h / .0028) + vec3(.22, .48, 1.) * exp(-h / .009) * .6;
        gl_FragColor = vec4(vec3(.42, 1., .6) * green + vec3(1., .3, .22) * red + tw * dawn * .55, 1.); }` }));
  g.add(shell);
  // turn it so that Delhi (28.6 N, 77.2 E) sits at the aim point, north running away toward the horizon
  const la = THREE.MathUtils.degToRad(28.6), lo = THREE.MathUtils.degToRad(77.2);
  const nL = V(Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)), northL = V(-Math.sin(la) * Math.sin(lo), Math.cos(la), -Math.sin(la) * Math.cos(lo)), eastL = V().crossVectors(northL, nL);
  const nW = aim.n, northW = aim.north, eastW = V().crossVectors(northW, nW);
  const Mw = new THREE.Matrix4().makeBasis(eastW, northW, nW), Ml = new THREE.Matrix4().makeBasis(eastL, northL, nL).transpose();
  body.quaternion.setFromRotationMatrix(Mw.multiply(Ml));
  g.userData.U = U; return g;
}

const PLANET_VS = "varying vec3 vN; varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }";
function planet(R, map, { light, atm = [0.45, 0.6, 1], night = 0.012, spin = 0.0015, cityK = 0 } = {}) {
  const g = new THREE.Group();
  const U = { map: { value: map }, uL: { value: light.clone() }, uAtm: { value: new THREE.Color(...atm) }, uT: { value: 0 }, uNight: { value: night }, uSpin: { value: spin }, uCity: { value: cityK } };
  const body = new THREE.Mesh(new THREE.SphereGeometry(R, 128, 64), new THREE.ShaderMaterial({ uniforms: U, vertexShader: PLANET_VS,
    fragmentShader: `uniform sampler2D map; uniform vec3 uL, uAtm; uniform float uT, uNight, uSpin, uCity; varying vec3 vN; varying vec2 vUv; varying vec3 vW;
      float h(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
      void main(){ vec3 n = normalize(vN), v = normalize(cameraPosition - vW); float l = dot(n, uL);
        vec3 base = texture2D(map, vec2(vUv.x + uT * uSpin, vUv.y)).rgb;
        float day = smoothstep(-.12, .4, l);
        vec3 col = base * (day * 1.25 + uNight);
        // city lights on the night side, scattered and faint
        float city = step(.985, h(floor(vUv * vec2(900., 450.)))) * (1. - smoothstep(-.25, .05, l)) * uCity;
        col += vec3(1., .78, .5) * city * 1.4;
        float fr = pow(1. - max(dot(n, v), 0.), 2.6);
        col += uAtm * fr * (smoothstep(-.35, .45, l) * 1.5 + .04);
        gl_FragColor = vec4(col, 1.); }` }));
  g.add(body);
  // the atmosphere, seen edge-on as a glowing shell
  const shell = new THREE.Mesh(new THREE.SphereGeometry(R * 1.035, 96, 48), new THREE.ShaderMaterial({ uniforms: U, vertexShader: PLANET_VS, side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    fragmentShader: `uniform vec3 uL, uAtm; varying vec3 vN; varying vec3 vW; void main(){ vec3 n = normalize(vN), v = normalize(cameraPosition - vW); float fr = pow(1. - abs(dot(n, v)), 4.); float lit = smoothstep(-.4, .5, dot(n, uL)); gl_FragColor = vec4(uAtm * fr * lit * 1.8, 1.); }` }));
  g.add(shell);
  g.userData.U = U; return g;
}
function rings(R, light, tilt) {
  const geo = new THREE.RingGeometry(R * 1.35, R * 2.35, 256, 1);
  const m = new THREE.Mesh(geo, new THREE.ShaderMaterial({ side: THREE.DoubleSide, transparent: true, depthWrite: false,
    uniforms: { map: { value: ringMap() }, uL: { value: light.clone() }, uR0: { value: R * 1.35 }, uR1: { value: R * 2.35 }, uPR: { value: R } },
    vertexShader: "varying vec3 vP; varying vec3 vW; varying vec3 vC; void main(){ vP = position; vC = (modelMatrix * vec4(0., 0., 0., 1.)).xyz; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
    fragmentShader: `uniform sampler2D map; uniform vec3 uL; uniform float uR0, uR1, uPR; varying vec3 vP; varying vec3 vW; varying vec3 vC;
      void main(){ float r = length(vP.xy); vec4 t = texture2D(map, vec2((r - uR0) / (uR1 - uR0), .5));
        // the planet's shadow across the rings (in world space, the planet sits at the group's origin)
        vec3 p = vW - vC; float d = dot(p, uL); float perp = length(p - uL * d);
        float shadow = (d < 0. && perp < uPR) ? .12 : 1.;
        float lit = .35 + .65 * abs(dot(normalize(cross(dFdx(vW), dFdy(vW))), uL));
        gl_FragColor = vec4(t.rgb * .8 * shadow * lit, t.a * .9); }` }));
  m.rotation.set(Math.PI / 2 + tilt[0], tilt[1], tilt[2]); return m;
}
function star(size, color, { corona = true, streak = false } = {}) {
  const g = new THREE.Group(), glow = glowMap();
  const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: new THREE.Color(color).multiplyScalar(5), blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); core.scale.setScalar(size); g.add(core);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: new THREE.Color(color).multiplyScalar(0.9), blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8, fog: false })); halo.scale.setScalar(size * 5); g.add(halo);
  if (corona) { const c = new THREE.Sprite(new THREE.SpriteMaterial({ map: coronaMap(), color: new THREE.Color(color).multiplyScalar(1.6), blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); c.scale.setScalar(size * 3.2); g.add(c); g.userData.corona = c; }
  // an anamorphic streak, the way a lens catches a star
  if (streak) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: new THREE.Color(color).lerp(new THREE.Color(0.6, 0.75, 1), 0.5).multiplyScalar(1.1), blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.55, fog: false })); s.scale.set(size * 18, size * 0.35, 1); g.add(s); }
  return g;
}
function nebula(seed, n, spread, tints, scale) {
  const g = new THREE.Group(), maps = [cloudMap(seed), cloudMap(seed + 7.3), cloudMap(seed + 13.1)];
  for (let i = 0; i < n; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: maps[i % 3], color: new THREE.Color(...tints[i % tints.length]), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.18 + Math.random() * 0.22, fog: false }));
    s.position.set((Math.random() - 0.5) * spread[0], (Math.random() - 0.5) * spread[1], (Math.random() - 0.5) * spread[2]); s.scale.setScalar(scale * (0.6 + Math.random() * 0.8)); s.material.rotation = Math.random() * 6.28; s.userData.rs = (Math.random() - 0.5) * 0.01; g.add(s);
  }
  return g;
}

export function createBackdrops({ scene, O, ACC, LOW, holds }) {
  const acc = new THREE.Color(ACC), accA = [acc.r * 1.4 + 0.2, acc.g * 1.4 + 0.25, acc.b * 1.4 + 0.3];
  const W = LOW ? 384 : 640, H = W / 2;
  const zones = [], lightDirs = [];
  const frame = (i) => { const h = holds[i], f = h.look.clone().sub(h.pos).normalize(), r = V().crossVectors(f, V(0, 1, 0)).normalize(), u = V().crossVectors(r, f).normalize(); return { pos: h.pos, f, r, u }; };
  const at = (fr, d, x, y) => fr.pos.clone().addScaledVector(fr.f, d).addScaledVector(fr.r, x).addScaledVector(fr.u, y);
  const zoneGroup = (i) => { const g = new THREE.Group(); scene.add(g); zones[i] = g; return g; };

  const builders = [];
  // 0 · the launch pad, above a planet's night side; the sun just over the limb behind him
  {
    const g = zoneGroup(0), pc = V(0, -560, -120), sunPos = V(150, -300, -860), farSun = V(300, -1820, -2820);   // light from ~25° under the horizon: the terminator lies just past the limb
    lightDirs[0] = V(170, -14, -720).normalize();                          // Otto's key light: the dawn, low and ahead
    const p = planet(520, planetMap(W, H, "rock", [[6, 9, 18], [16, 22, 38], [30, 40, 58], [52, 62, 80]], 3.1), { light: farSun.clone().sub(pc).normalize(), atm: accA, night: 0.035, cityK: 1 });
    p.position.copy(pc); g.add(p);
    const s = star(22, 0xfff2e0, { streak: true }); s.position.copy(sunPos); g.add(s);   // drawn just above the far limb; the planet hides it as you sink
  }
  // 1 · hello: a night horizon. The dark face of a planet below, its cities faint, the airglow a thin line on
  // the limb (its light comes from far beyond the horizon). Otto's key light is a soft cool one from the front.
  {
    const g = zoneGroup(1), fr = frame(1), pc = at(fr, 300, 0, -575);
    lightDirs[1] = V(0.35, 0.55, 0.75).normalize();
    // Delhi goes just below the horizon, a little right of centre, as seen from the camera's stop beside him
    const cb = DIMS[1].beats[1], camW = O[1].clone().add(V(...cb.cam)), lookW = O[1].clone().add(V(...cb.look));
    const cam = new THREE.PerspectiveCamera(cb.fov, 16 / 9, 0.1, 5000); cam.position.copy(camW); cam.lookAt(lookW); cam.updateMatrixWorld();
    const R = 540, hit = (x, y) => { const dd = V(x, y, 0.5).unproject(cam).sub(camW).normalize(), oc = camW.clone().sub(pc), bb = oc.dot(dd), D = bb * bb - (oc.lengthSq() - R * R); return D < 0 ? null : camW.clone().addScaledVector(dd, -bb - Math.sqrt(D)); };
    let yH = null; for (let y = -1; y <= 1; y += 0.01) { if (hit(0.12, y)) yH = y; else if (yH !== null) break; }
    const p = (yH !== null && hit(0.12, yH - 0.14)) || pc.clone().add(camW.clone().sub(pc).setLength(R));
    const nW = p.clone().sub(pc).normalize(), fw = lookW.clone().sub(camW), north = fw.addScaledVector(nW, -fw.dot(nW)).normalize();
    const sun = fr.f.clone().multiplyScalar(Math.cos(0.14) * Math.cos(0.9)).addScaledVector(fr.r, Math.cos(0.14) * Math.sin(0.9)).addScaledVector(fr.u, -Math.sin(0.14)).normalize();
    g.add(nightEarth(R, pc, sun, { n: nW, north }));
    g.userData.aim = { yH, delhi: p };
  }
  // 2 · about: a near star behind Otto's shoulder, off the words (he is rim-lit by it; his key light stays in front)
  builders[2] = () => {
    const g = zoneGroup(2), fr = frame(2), sp = at(fr, 520, -205, 62); lightDirs[2] = V(-0.4, 0.45, 0.8).normalize();
    const s = star(40, 0xfff0d8); s.position.copy(sp); g.add(s); g.userData.spin = s.userData.corona;
    const n = nebula(4.2, LOW ? 4 : 8, [700, 400, 200], [accA, [0.9, 0.85, 0.8]], 520); n.position.copy(at(fr, 820, 40, 0)); g.add(n);
  };
  // 3 · what I make: a nebula bank across the back, a small cratered moon above
  builders[3] = () => {
    const g = zoneGroup(3), fr = frame(3), mp = at(fr, 260, 120, 80), sunPos = at(fr, 900, -500, 300);
    const L = sunPos.clone().sub(mp).normalize(); lightDirs[3] = L;
    const n = nebula(9.7, LOW ? 6 : 11, [1100, 420, 260], [accA, [0.75, 0.8, 0.95], [0.55, 0.45, 0.8]], 560); n.position.copy(at(fr, 760, 60, 10)); g.add(n);
    const m = planet(26, planetMap(W / 2, H / 2, "rock", [[40, 40, 44], [92, 90, 92], [150, 148, 146], [205, 202, 198]], 8.8), { light: L, atm: [0.3, 0.3, 0.35], night: 0.006 }); m.position.copy(mp); g.add(m);
    const s = star(10, 0xfff4e6, { corona: false }); s.position.copy(sunPos); g.add(s);
  };
  // 4 · work: a small blue ice world low under Otto (the cards keep the right two thirds); its sun in the top-left corner
  builders[4] = () => {
    const g = zoneGroup(4), fr = frame(4), pc = at(fr, 340, -150, -100), sunPos = at(fr, 900, -720, 360);   // the sun just off-frame, top left: its glow never sits behind the words
    const L = sunPos.clone().sub(pc).normalize(); lightDirs[4] = L;
    const p = planet(38, planetMap(W, H, "ice", [[14, 30, 66], [40, 80, 140], [120, 170, 220], [220, 236, 250]], 5.5), { light: L, atm: [0.45, 0.65, 1.2], night: 0.01, spin: 0.001 });
    p.position.copy(pc); g.add(p);
    const s = star(14, 0xeef4ff); s.position.copy(sunPos); g.add(s);
  };
  // 5 · let's talk: a far nebula behind the chrome orb
  builders[5] = () => {
    const g = zoneGroup(5), fr = frame(5); lightDirs[5] = V(-0.4, 0.5, 0.6).normalize();
    const n = nebula(15.3, LOW ? 4 : 8, [800, 360, 200], [accA, [0.85, 0.85, 0.95]], 480); n.position.copy(at(fr, 800, 120, 40)); g.add(n);
  };
  // the light direction of each room is known up front (Otto needs it); the rest paints in idle time
  [1, 2, 3, 4, 5].forEach((i) => { if (!lightDirs[i]) { const f = frame(i); lightDirs[i] = f.f.clone().multiplyScalar(-0.3).add(V(-0.6, 0.5, 0.2)).normalize(); } });
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 60));
  const next = (i) => { if (i > 5) return; idle(() => { if (!zones[i]) builders[i](); next(i + 1); }); };
  next(1);
  return {
    zones, lightDirs,
    update(t, zone) {
      if (!zones[zone] && builders[zone]) builders[zone]();
      zones.forEach((g, i) => { if (!g) return; g.visible = i === zone; if (!g.visible) return;
        g.traverse((o) => { if (o.userData.U) o.userData.U.uT.value = t; if (o.isSprite && o.userData.rs) o.material.rotation += o.userData.rs * 0.016; });
        if (g.userData.spin) g.userData.spin.material.rotation = t * 0.02;
      });
    },
  };
}
