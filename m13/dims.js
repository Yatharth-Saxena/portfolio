// The five dimensions: what is in each, where it stands, and where Otto and the camera go to see it.
// Local coordinates per dimension: x right, y up, z forward (you travel toward -z). Each set is built in
// idle time, and only the current dimension is drawn. Things you look at are physical: photos in thick
// glass slabs, rock islands, rings, light. The big words (his name, the numerals) are crisp page text
// placed in 3D (CSS3D), so they never blur or pixelate.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { CSS3DSprite, CSS3DObject } from "three/examples/jsm/renderers/CSS3DRenderer.js";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const _cr = new THREE.Vector3();
const IMG = "/m13/img/";

// grade: the dimension's light (multiplies the frame before tone mapping); tint: its colour in the wormhole
// What I make is an orbit round its star: a point at angle a (degrees, 0 = the side you arrive from), radius r, height dy
const MAKE = { c: [0.5, 5.2, -44], r: 21, dy: 1.0 };
const mk = (a, r, dy) => [MAKE.c[0] + r * Math.sin((a * Math.PI) / 180), MAKE.c[1] + dy, MAKE.c[2] + r * Math.cos((a * Math.PI) / 180)];
const MAKE_STOPS = [[18, 0], [92, 0], [166, 0]];   // the camera's angle at each stop, and where Otto waits (degrees off it): ahead of the camera, over the star

export const DIMS = [
  { name: "launch", grade: [1, 1, 1], tint: [0.4, 0.5, 0.8], fog: 0x020203,
    exit: [[-2.4, 3.4, -4], [-6, 9, -15], [-12, 16, -31], [10, -1, -49], [-7, 10, -64], [2.5, 9, -78]], gate: [0, 8, -95] },
  { name: "hello", grade: [0.92, 0.98, 1.1], tint: [0.38, 0.5, 0.85], fog: 0x040818, arrive: [0, 3, 45],
    beats: [
      { otto: [-4.6, 3.2, -6], cam: [-0.4, 1.4, 9], look: [5.5, 4.2, -40], fov: 38 },        // far: the figure on the horizon
      { otto: [-3.4, 3.4, -22], cam: [-0.6, 3.0, -11], look: [5.2, 5.2, -40], fov: 38 },     // close: beside him
    ],
    exit: [[-7, 6, -38], [6, 9, -58], [-4, 7, -78]], gate: [0, 7, -98] },
  { name: "about", grade: [1.12, 1.0, 0.85], tint: [0.9, 0.7, 0.45], fog: 0x140b04, arrive: [0, 3, 45],
    beats: [
      { otto: [3.8, 3.6, -8], cam: [3.2, 2.6, 8], look: [-4.5, 3.2, -12], fov: 40 },         // wide, the 2
      { otto: [0.2, 4.9, -28], cam: [-2.6, 3.8, -16], look: [6.5, 4.6, -36], fov: 40 },     // the 3, and the team
      { otto: [3.8, 5.4, -52], cam: [3.6, 4.4, -40], look: [-4, 5.4, -60], fov: 40 },        // 8.40
    ],
    exit: [[-6, 8, -70], [5, 5, -84]], gate: [0, 7, -102] },
  { name: "make", grade: [1.04, 0.95, 1.1], tint: [0.6, 0.5, 0.85], fog: 0x0b0516, arrive: [0, 3, 45],
    // the camera circles the star: websites and stores, then apps and 3D, then voice AI from behind it
    orbit: MAKE,
    beats: MAKE_STOPS.map(([a, d], j) => ({ ang: a, otto: mk(a + d, 10.5, 1.45) /* his feet: he hangs whole above the star, between it and the camera */, cam: mk(a, MAKE.r, MAKE.dy), look: [MAKE.c[0], MAKE.c[1] + 0.4, MAKE.c[2]], fov: 42,
      via: j ? mk((MAKE_STOPS[j - 1][0] + MAKE_STOPS[j - 1][1] + a + d) / 2, 13.5, 4.0) : null })),   // over the tiles' ring, never through it
    exit: [[7, 9, -62], [-5, 6, -82]], gate: [0, 7, -104] },
  { name: "work", grade: [0.9, 0.97, 1.08], tint: [0.4, 0.55, 0.85], fog: 0x030713, arrive: [0, 3, 45],
    beats: [
      { otto: [-9.6, 4.6, -16], cam: [2.0, 3.8, -3], look: [-4.6, 4.0, -21], fov: 40 },       // client e-commerce
      { otto: [11.6, 5.0, -37], cam: [-2.0, 4.2, -26], look: [5.2, 4.6, -43], fov: 40 },     // Aethon
      { otto: [-11.8, 5.4, -59], cam: [2.0, 4.4, -48], look: [-4.6, 4.6, -65], fov: 42 },      // QuickBite
      { otto: [10.2, 4.8, -82], cam: [-2.0, 4.0, -70], look: [5.0, 4.2, -87], fov: 40 },     // Jarvis
    ],
    exit: [[-6, 8, -96], [4, 6, -108]], gate: [0, 7, -122] },
  { name: "talk", grade: [0.97, 1.0, 1.05], tint: [0.72, 0.78, 0.92], fog: 0x05070c, arrive: [0, 3, 45],
    beats: [
      { otto: [-2.4, 2.6, -6], cam: [0.0, 3.0, 6], look: [5, 4.6, -30], fov: 40 },            // the orb, wide
      { otto: [9.8, 6.0, -21], cam: [-1.2, 3.8, -9], look: [4.4, 4.8, -30], fov: 40 },      // the form
    ] },
];

export function createDims({ scene, O, ACC, LOW, renderer, envCube, css3d, crisp, crispR, paneU }) {
  const acc = new THREE.Color(ACC), loader = new THREE.TextureLoader(), aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const idle = window.requestIdleCallback ? (f) => requestIdleCallback(f, { timeout: 400 }) : (f) => setTimeout(f, 50);
  const textures = [];
  const tex = (url) => { const t = loader.load(IMG + url, (tt) => idle(() => crispR.initTexture(tt))); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; textures.push(t); return t; };
  const groups = [], updaters = [], cssObjs = [], crispObjs = [];
  const at = (d, x, y, z) => O[d].clone().add(V(x, y, z));
  const ease = (x) => 1 - Math.pow(1 - x, 3), stag = (p, i, n) => Math.min(1, Math.max(0, (p - i * 0.12) / (1 - (n - 1) * 0.12)));

  // ------------------------------------------------ shared pieces
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x0a0c12, metalness: 0.92, roughness: 0.16, envMapIntensity: 1.3 });
  // a photo in a thick glass slab. It is drawn twice: in the main scene (that copy is what glass in front of it
  // blurs), and sharp in the crisp layer (a second canvas at the screen's full resolution, true colours), which
  // leaves out whatever lies under a glass pane, so glass in front still softens it as glass should.
  const photoSlabs = [];
  // the recess: how deep the photo sits behind the frame's face, how far the lip covers its edge, the bevel
  const REC = 0.1, LIP = 0.02, BEV = 0.025;
  const INSET_V = "varying vec3 vLP, vLC; void setInset(){ vLP = position; vLC = (inverse(modelMatrix) * vec4(cameraPosition, 1.)).xyz; }";
  // the photo as seen through the mouth of the recess and the glass over it; alpha < 0 where the lip hides it
  const INSET_F = `uniform vec2 uHalf; varying vec3 vLP, vLC;
    vec4 inset(vec3 c){
      vec3 Vd = normalize(vLC - vLP);
      vec2 q = abs(vLP.xy + Vd.xy * (${(REC - BEV).toFixed(3)} / max(Vd.z, .05)));   // where the sight line leaves the recess
      if (q.x > uHalf.x || q.y > uHalf.y) return vec4(0., 0., 0., -1.);
      vec2 e = uHalf - abs(vLP.xy);
      c *= mix(.42, 1., smoothstep(0., .14, min(e.x, e.y)));          // the walls keep light off its edges
      c *= mix(.72, 1., smoothstep(0., .11, uHalf.y - vLP.y));         // and the top wall shades a band below it
      float ct = clamp(Vd.z, 0., 1.), F = .04 + .96 * pow(1. - ct, 5.);   // the glass: more mirror the flatter you look
      vec2 r = -Vd.xy;
      float sky = smoothstep(-.7, .9, r.y);
      float band = exp(-pow((vLP.x * .5 + vLP.y + (r.x * 2.4 - r.y) * uHalf.y) / (uHalf.y * .8), 2.));   // one broad soft reflection, sliding as you pass
      vec3 refl = vec3(.55, .63, .78) * (.1 + .45 * sky) + vec3(.92, .95, 1.) * band * .5;
      return vec4(c * (1. - F) * vec3(.965, .98, 1.) + refl * (F + .045), 1.);
    }`;
  const crispMat = (map) => new THREE.ShaderMaterial({ fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { map: { value: null }, uHalf: { value: new THREE.Vector2(1, 1) } }]),
    vertexShader: INSET_V + " varying vec2 vUv; varying float vD; void main(){ vUv = uv; setInset(); vec4 mv = modelViewMatrix * vec4(position, 1.); vD = -mv.z; gl_Position = projectionMatrix * mv; }",
    fragmentShader: `uniform sampler2D map; uniform vec3 fogColor; uniform float fogDensity; uniform vec4 uPane[6]; uniform int uPaneN; uniform vec2 uView, uOff; uniform float uDpr, uCH; varying vec2 vUv; varying float vD;
      ${INSET_F}
      void main(){ vec2 px = vec2(gl_FragCoord.x, uCH - gl_FragCoord.y) / uDpr + uOff;   // this canvas covers only part of the screen
        for (int i = 0; i < 6; i++) { if (i >= uPaneN) break; vec4 R = uPane[i]; if (px.x > R.x + 2. && px.x < R.x + R.z - 2. && px.y > R.y + 2. && px.y < R.y + R.w - 2.) discard; }
        vec4 ph = inset(texture2D(map, vUv).rgb); if (ph.a < 0.) discard;
        vec3 c = mix(ph.rgb, fogColor, 1. - exp(-pow(fogDensity * vD, 2.)));
        gl_FragColor = vec4(c, 1.);
        #include <colorspace_fragment>
      }`,
  });
  // a frame with an opening, extruded with a small bevel: the opening's chamfer narrows to just inside the photo's edge
  const rrect = (p, hw, hh, r) => { p.moveTo(-hw + r, -hh); p.lineTo(hw - r, -hh); p.absarc(hw - r, -hh + r, r, -Math.PI / 2, 0); p.lineTo(hw, hh - r); p.absarc(hw - r, hh - r, r, 0, Math.PI / 2); p.lineTo(-hw + r, hh); p.absarc(-hw + r, hh - r, r, Math.PI / 2, Math.PI); p.lineTo(-hw, -hh + r); p.absarc(-hw + r, -hh + r, r, Math.PI, Math.PI * 1.5); return p; };
  function frameGeo(w, h, depth) {
    const sh = rrect(new THREE.Shape(), (w + 0.34) / 2 - BEV, (h + 0.34) / 2 - BEV, 0.13);
    sh.holes.push(rrect(new THREE.Path(), w / 2 - LIP + BEV, h / 2 - LIP + BEV, 0.035));
    const geo = new THREE.ExtrudeGeometry(sh, { depth: depth - 2 * BEV, bevelEnabled: true, bevelThickness: BEV, bevelSize: BEV, bevelSegments: 3, curveSegments: 6 });
    geo.translate(0, 0, -(depth - 2 * BEV) / 2); return geo;
  }
  function slab(url, w, h, depth = 0.26, turn = 0, d = 0) {
    const g = new THREE.Group(), pz = depth / 2 - REC;
    g.add(new THREE.Mesh(frameGeo(w, h, depth), frameMat));
    const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), frameMat); back.position.z = pz - 0.004; back.rotation.y = Math.PI; g.add(back);   // the back of the recess, seen from behind
    const map = tex(url), geo = turn ? new THREE.PlaneGeometry(h, w) : new THREE.PlaneGeometry(w, h);
    const half = turn ? new THREE.Vector2(h / 2 - LIP, w / 2 - LIP) : new THREE.Vector2(w / 2 - LIP, h / 2 - LIP);
    // the main-scene copy (softer; lifted for the tone map)
    const soft = new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms: { map: { value: map }, uHalf: { value: half } },
      vertexShader: INSET_V + " varying vec2 vUv; void main(){ vUv = uv; setInset(); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }",
      fragmentShader: "uniform sampler2D map; varying vec2 vUv; " + INSET_F + " void main(){ vec3 c = texture2D(map, vUv).rgb; float l = dot(c, vec3(.2126, .7152, .0722)); c = max(mix(vec3(l), c, 1.3), 0.) * 1.5; gl_FragColor = vec4(inset(c).rgb, 1.); }" }));
    soft.position.z = pz; soft.rotation.z = turn; g.add(soft);
    // the crisp copy
    const mat = crispMat(); mat.uniforms.map.value = map; mat.uniforms.uHalf.value = half; Object.assign(mat.uniforms, paneU);
    const ph = new THREE.Mesh(geo, mat); ph.matrixAutoUpdate = false; ph.visible = false; crisp.add(ph); (crispObjs[d] ||= []).push(ph);
    const off = new THREE.Matrix4().makeTranslation(0, 0, pz); if (turn) off.multiply(new THREE.Matrix4().makeRotationZ(turn));
    g.userData = { w, h, photo: ph, off };
    photoSlabs.push(g);
    return g;
  }
  // a cone of soft light from above, with dust turning in it
  function spot(h = 16, r = 4.6) {
    const g = new THREE.Group();
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 40, 1, true), new THREE.ShaderMaterial({
      uniforms: { uC: { value: acc.clone().lerp(new THREE.Color(1, 1, 1), 0.65) }, uK: { value: 1 } }, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      vertexShader: "varying vec2 vUv; varying vec3 vN, vV; void main(){ vUv = uv; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }",
      fragmentShader: "uniform vec3 uC; uniform float uK; varying vec2 vUv; varying vec3 vN, vV; float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); } float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); } void main(){ float e = pow(abs(dot(normalize(vN), normalize(vV))), 2.4); float hz = .55 + .45 * n(vec2(vUv.x * 34., vUv.y * 7.)) * n(vec2(vUv.x * 11. + 3., vUv.y * 3.)); float a = e * pow(vUv.y, 1.8) * .13 * hz * uK; gl_FragColor = vec4(uC * a, a); }",
    }));
    cone.position.y = -h / 2; g.add(cone); g.userData.cone = cone.material;
    const n = LOW ? 70 : 140, p = new Float32Array(n * 3), seed = new Float32Array(n);
    for (let i = 0; i < n; i++) { const y = -Math.random() * h * 0.95, rr = Math.random() * r * (-y / h) * 0.9, a = Math.random() * 6.283; p.set([Math.cos(a) * rr, y, Math.sin(a) * rr], i * 3); seed[i] = Math.random(); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(p, 3)); geo.setAttribute("aS", new THREE.BufferAttribute(seed, 1));
    const dm = new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 }, uPx: { value: 1 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: "uniform float uT, uPx; attribute float aS; varying float vA; void main(){ vec3 q = position; q.x += sin(uT * .3 + aS * 30.) * .25; q.z += cos(uT * .27 + aS * 21.) * .25; q.y += sin(uT * .2 + aS * 9.) * .3; vec4 mv = modelViewMatrix * vec4(q, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = clamp(uPx * 22. / -mv.z, 1., 4.); vA = .5 + .5 * aS; }",
      fragmentShader: "varying float vA; void main(){ float a = smoothstep(.5, 0., length(gl_PointCoord - .5)) * vA * .7; gl_FragColor = vec4(vec3(1., .97, .92) * a, a); }" });
    g.add(new THREE.Points(geo, dm)); g.userData.dust = dm;
    return g;
  }
  // a floating island of real-looking basalt: a nearly level top where dust has settled, a jagged underside
  // that hangs and narrows like a root, darker in its hollows. Dense geometry and smooth shading: no facets.
  const hash3 = (x, y, z) => { const q = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return q - Math.floor(q); };
  const noise3 = (x, y, z) => {
    const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = x - ix, fy = y - iy, fz = z - iz;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), uz = fz * fz * (3 - 2 * fz), L = (a, b, t) => a + (b - a) * t, c = (a, b, d) => hash3(ix + a, iy + b, iz + d);
    return L(L(L(c(0, 0, 0), c(1, 0, 0), ux), L(c(0, 1, 0), c(1, 1, 0), ux), uy), L(L(c(0, 0, 1), c(1, 0, 1), ux), L(c(0, 1, 1), c(1, 1, 1), ux), uy), uz);
  };
  const fbm3 = (x, y, z, o = 5) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * noise3(x * f, y * f, z * f); f *= 2.07; a *= 0.5; } return s; };
  const BASALT = new THREE.Color(0.12, 0.112, 0.105), DUST = new THREE.Color(0.36, 0.32, 0.27);
  function island(r, seed, detail = LOW ? 22 : 34) {
    let geo = new THREE.IcosahedronGeometry(1, detail); geo.deleteAttribute("normal"); geo.deleteAttribute("uv"); geo = mergeVertices(geo);
    const p = geo.attributes.position, v = V(), col = new Float32Array(p.count * 3), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const nz = fbm3(v.x * 1.7 + seed, v.y * 1.7, v.z * 1.7 - seed) - 0.5;
      const rid = 1 - Math.abs(fbm3(v.x * 3.3 - seed, v.y * 3.3 + seed, v.z * 3.3, 4) * 2 - 1);
      const fine = fbm3(v.x * 9 + seed, v.y * 9, v.z * 9, 3) - 0.5;
      let x = v.x, y = v.y, z = v.z;
      if (y > 0) y = 0.16 + y * 0.2 + nz * 0.1 + fine * 0.035;
      else { const k = -y; y = 0.16 * Math.max(0, 1 - k * 8) - k * (1.5 + nz * 0.9 + rid * 0.5); const tp = 1 - k * 0.5; x *= tp; z *= tp; }
      const d = 1 + nz * 0.32 + fine * 0.07 + (v.y < 0 ? rid * 0.16 : 0);
      x *= d; z *= d; p.setXYZ(i, x * r, y * r, z * r);
      const top = Math.min(1, Math.max(0, (y - 0.1) / 0.18)), cav = Math.min(1, Math.max(0, 0.55 + nz * 1.6 + fine * 0.8));
      c.copy(BASALT).lerp(DUST, top * 0.85).multiplyScalar(0.55 + 0.6 * cav); col.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
    return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.94, metalness: 0, envMapIntensity: 0.35 }));
  }
  // drifting motes, tinted
  function motes(n, box, col, size = 3) {
    const p = new Float32Array(n * 3), s = new Float32Array(n);
    for (let i = 0; i < n; i++) { p.set([(Math.random() - 0.5) * box[0], (Math.random() - 0.5) * box[1], -Math.random() * box[2]], i * 3); s[i] = Math.random(); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(p, 3)); geo.setAttribute("aS", new THREE.BufferAttribute(s, 1));
    const m = new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 }, uC: { value: new THREE.Color(...col) }, uSz: { value: size } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: "uniform float uT, uSz; attribute float aS; varying float vA; void main(){ vec3 q = position; q.y += sin(uT * .15 + aS * 40.) * .6; q.x += cos(uT * .11 + aS * 23.) * .6; vec4 mv = modelViewMatrix * vec4(q, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = clamp(uSz * 18. / -mv.z, 1., uSz * 2.); vA = (.35 + .65 * aS) * smoothstep(1.5, 6., -mv.z); }",
      fragmentShader: "uniform vec3 uC; varying float vA; void main(){ float a = smoothstep(.5, 0., length(gl_PointCoord - .5)) * vA; gl_FragColor = vec4(uC * a, a); }" });
    const pts = new THREE.Points(geo, m); pts.frustumCulled = false; pts.userData.m = m; return pts;
  }
  // crisp page text standing in space
  function cssSprite(d, el, worldH, pos) { el.style.pointerEvents = "none"; const o = new CSS3DSprite(el); const px = parseFloat(el.dataset.h || 600); o.scale.setScalar(worldH / px); o.position.copy(pos); o.visible = false; css3d.add(o); (cssObjs[d] ||= []).push(o); return o; }

  // ------------------------------------------------ the sets
  const builders = [];
  // 1 · hello: a night horizon. The dark face of a planet below (its airglow on the limb, see backdrops.js),
  // the Milky Way arching across the sky, and him: a figure made of stars, rising over the horizon. The stars
  // stream in from the whole sky as you come out of the wormhole and settle into his face.
  builders[1] = (g) => {
    // the Milky Way: ESO's photograph of it (S. Brunier), the band either side of the galactic centre, rising
    // from behind the horizon on the left, clear of his face. The sky's own grey is taken out and its ends feathered.
    const mwTex = loader.load(IMG + "milky-way-eso.webp"); mwTex.colorSpace = THREE.SRGBColorSpace; mwTex.anisotropy = aniso;
    const mw = new THREE.Mesh(new THREE.PlaneGeometry(2600, (2600 * 498) / 2560), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { map: { value: mwTex }, uK: { value: 0 } },
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }",
      fragmentShader: "uniform sampler2D map; uniform float uK; varying vec2 vUv; void main(){ vec3 c = max(texture2D(map, vUv).rgb - .0045, 0.); float e = smoothstep(0., .2, vUv.x) * smoothstep(1., .8, vUv.x) * smoothstep(0., .32, vUv.y) * smoothstep(1., .68, vUv.y); gl_FragColor = vec4(c * e * uK, 1.); }" }));
    { // placed by the view from the camera's stop beside him: its core up and to the left, the band rising at about 65 degrees
      const cb = DIMS[1].beats[1], cam = new THREE.PerspectiveCamera(cb.fov, 16 / 9, 0.1, 5000); cam.position.copy(at(1, ...cb.cam)); cam.lookAt(at(1, ...cb.look)); cam.updateMatrixWorld();
      const dir = V(-0.55, 0.55, 0.5).unproject(cam).sub(cam.position).normalize();
      mw.position.copy(cam.position).addScaledVector(dir, 700); mw.quaternion.copy(cam.quaternion); mw.rotateZ(1.13);
    }
    g.add(mw); g.userData.mw = mw;
    // his portrait, made of stars: sampled from the photo's light and colour, with a slight depth to it
    const port = new THREE.Points(new THREE.BufferGeometry(), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uForm: { value: 0 }, uT: { value: 0 }, uPx: { value: crispR.getPixelRatio() } },
      vertexShader: `uniform float uForm, uT, uPx; attribute vec3 aStart, aCol; attribute float aSize, aDelay; varying vec3 vC; varying float vA;
        void main(){ float p = clamp((uForm - aDelay) / .55, 0., 1.); p = p * p * (3. - 2. * p);
          vec3 q = mix(aStart, position, p);
          q += vec3(sin(uT * .3 + aDelay * 40.), cos(uT * .27 + aDelay * 31.), 0.) * .012 * p;
          vec4 mv = modelViewMatrix * vec4(q, 1.); gl_Position = projectionMatrix * mv;
          gl_PointSize = clamp(aSize * uPx * 28. / -mv.z, .9, 9.);
          vC = aCol; vA = .2 + .8 * p; }`,
      fragmentShader: "varying vec3 vC; varying float vA; void main(){ float d = length(gl_PointCoord - .5); float a = exp(-d * d * 14.) * vA; vec3 c = 1. - exp(-vC * 1.15); gl_FragColor = vec4(c * a, a);\n #include <colorspace_fragment>\n }" }));
    port.frustumCulled = false; port.position.copy(at(1, 9.0, 5.5, -42)); port.visible = false; crisp.add(port); (crispObjs[1] ||= []).push(port); g.userData.portrait = port;
    const im = new Image(); im.src = "/assets/yatharth-cut.webp";
    im.onload = () => {
      // one cell of the grid is about two screen pixels where the camera stops beside him: fine enough for his
      // glasses and smile, coarse enough that each star stays a point of light
      const rows = LOW ? 560 : 660, cols = Math.round((rows * im.width) / im.height), N = cols * rows;
      const cv = document.createElement("canvas"); cv.width = cols; cv.height = rows;
      const cx = cv.getContext("2d", { willReadFrequently: true }); cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = "high"; cx.drawImage(im, 0, 0, cols, rows);
      const px = cx.getImageData(0, 0, cols, rows).data, lin = (v) => Math.pow(v / 255, 2.2);
      const A = new Float32Array(N), Lp = new Float32Array(N);
      for (let i = 0; i < N; i++) { A[i] = px[i * 4 + 3] / 255; Lp[i] = (0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2]) / 255; }
      // his tones, stretched between the 2nd and 99.5th percentile of what lies inside the cut
      const vals = []; for (let i = 0; i < N; i++) if (A[i] > 0.5) vals.push(Lp[i]); vals.sort((a, b) => a - b);
      const lo = vals[Math.floor(vals.length * 0.02)], hi = vals[Math.floor(vals.length * 0.995)];
      const T = new Float32Array(N), Ln = new Float32Array(N), rim = new Uint8Array(N), fadeOf = (y) => 1 - Math.min(1, Math.max(0, (y / rows - 0.64) / 0.27));
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const i = y * cols + x; if (A[i] < 0.4) continue;
        const ln = Math.min(1, Math.max(0, (Lp[i] - lo) / (hi - lo))); Ln[i] = ln;
        let amin = 1; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const xx = x + dx, yy = y + dy, a = xx < 0 || yy < 0 || xx >= cols || yy >= rows ? 0 : A[yy * cols + xx]; if (a < amin) amin = a; }
        rim[i] = amin < 0.4 ? 1 : 0;   // the edge of the cut: a rim of starlight round his hair and shoulders
        const f = fadeOf(y);
        T[i] = (0.055 + 0.9 * Math.pow(ln, 1.1)) * (0.2 + 0.8 * f);   // hair and jacket keep a sparse field of stars
        if (rim[i]) T[i] = Math.max(T[i], 0.1 + 0.42 * f);
      }
      // error diffusion (serpentine Floyd-Steinberg): the tone is carried by how many stars there are, evenly
      // spread, so his face reads cleanly instead of as random speckle
      const on = new Uint8Array(N), E = Float32Array.from(T);
      for (let y = 0; y < rows; y++) { const ltr = (y & 1) === 0, s = ltr ? 1 : -1;
        for (let k = 0; k < cols; k++) { const x = ltr ? k : cols - 1 - k, i = y * cols + x; if (A[i] < 0.4) continue;
          const o = E[i] >= 0.5 ? 1 : 0, e = E[i] - o; on[i] = o;
          if (x + s >= 0 && x + s < cols) E[i + s] += (e * 7) / 16;
          if (y + 1 < rows) { if (x - s >= 0 && x - s < cols) E[i + cols - s] += (e * 3) / 16; E[i + cols] += (e * 5) / 16; if (x + s >= 0 && x + s < cols) E[i + cols + s] += e / 16; } } }
      const WH = 16.4, WW = (WH * im.width) / im.height, pos = [], col = [], st = [], size = [], del = [];
      for (let i = 0; i < N; i++) {
        if (!on[i]) continue;
        const x = i % cols, y = (i / cols) | 0, ln = Ln[i], f = fadeOf(y), scat = (1 - f) * 0.7;
        pos.push(((x + 0.5 + (Math.random() - 0.5) * 0.7) / cols - 0.5) * WW + (Math.random() - 0.5) * scat, (0.5 - (y + 0.5 + (Math.random() - 0.5) * 0.7) / rows) * WH + (Math.random() - 0.5) * scat, (ln - 0.4) * 0.5 + (Math.random() - 0.5) * (0.04 + scat));
        // colour: lit skin keeps the photo's warmth; hair, jacket and the rim are cool starlight
        const r = lin(px[i * 4]), gg = lin(px[i * 4 + 1]), b = lin(px[i * 4 + 2]), l = 0.2126 * r + 0.7152 * gg + 0.0722 * b + 1e-4;
        const w = rim[i] ? 0.12 : Math.min(1, Math.max(0, (ln - 0.12) / 0.35)), k = (0.55 + 1.25 * ln) * (rim[i] ? 1.1 : 1) * (0.35 + 0.65 * f) * (rim[i] || y / rows < 0.66 ? 1 : 0.5);   // the open collar below his chin stays quiet
        const big = !rim[i] && ln < 0.2 && Math.random() < 0.012;   // a few brighter stars in the dark of his hair and jacket
        if (big) col.push(1.15, 1.2, 1.3);
        else col.push((0.78 + (Math.min(r / l, 2.2) * 0.8 + 0.2 - 0.78) * w) * k, (0.86 + (Math.min(gg / l, 2.2) * 0.8 + 0.2 - 0.86) * w) * k, (1.0 + (Math.min(b / l, 2.2) * 0.8 + 0.2 - 1.0) * w) * k);
        size.push(big ? 4.4 + Math.random() * 2 : 2.4 * (0.85 + Math.random() * 0.3));
        const th = Math.random() * 6.283, ph = Math.acos(Math.random() * 2 - 1), R = 50 + Math.random() * 90;
        st.push(Math.sin(ph) * Math.cos(th) * R, Math.cos(ph) * R * 0.6 + 10, -Math.abs(Math.sin(ph) * Math.sin(th)) * R - 20);
        del.push(Math.random() * 0.42 + (1 - f) * 0.03);
      }
      const geo = port.geometry, F = (a, n) => new THREE.BufferAttribute(new Float32Array(a), n);
      geo.setAttribute("position", F(pos, 3)); geo.setAttribute("aCol", F(col, 3)); geo.setAttribute("aStart", F(st, 3)); geo.setAttribute("aSize", F(size, 1)); geo.setAttribute("aDelay", F(del, 1));
      g.userData.stars = pos.length / 3;
    };
    g.add(motes(LOW ? 220 : 420, [80, 26, 120], [0.75, 0.82, 1.0], 2.2));
    g.userData.anim = (p, t) => { port.material.uniforms.uForm.value = p * 1.12; port.material.uniforms.uT.value = t; mw.material.uniforms.uK.value = (0.3 + 0.7 * p) * 0.8; };
  };
  // 2 · about: gold dusk; three rock islands, each holding a number
  builders[2] = (g) => {
    const spots = [[-5.2, 0, -12, 3.6, 1.7], [6.2, 1.6, -36, 4.2, 3.3], [-4.4, 2.2, -60, 4.6, 5.1]];
    const isl = spots.map(([x, y, z, r, s]) => { const m = island(r, s); m.userData.home = at(2, x, y - 0.4, z); m.position.copy(m.userData.home); m.rotation.y = s; g.add(m); return m; });
    for (let k = 0; k < (LOW ? 7 : 12); k++) { const m = island(0.4 + Math.random() * 0.9, k * 3.1, 9); m.position.copy(at(2, (Math.random() - 0.5) * 26, -1 + Math.random() * 9, -8 - Math.random() * 60)); g.add(m); }
    const num = (txt, h, pos) => { const el = document.createElement("div"); el.className = "num"; el.dataset.h = "520"; el.textContent = txt; el.setAttribute("aria-hidden", "true"); const o = cssSprite(2, el, h, pos); o.userData.home = pos.clone(); return o; };
    const nums = [num("2", 5.2, at(2, -5.2, 0.6 + 2.8, -12)), num("3", 6.0, at(2, 6.2, 2.2 + 3.2, -36)), num("8.40", 5.6, at(2, -4.4, 2.8 + 3.0, -60))];
    const team = slab("li/sih-4.jpg", 2.6, 3.47, 0.18, 0, 2); team.position.copy(at(2, 10.6, 5.6, -40)); team.lookAt(at(2, -2.6, 3.8, -16)); team.rotateY(-0.12); g.add(team); const teamHome = team.position.clone();
    g.userData.anim = (p, t) => {
      isl.forEach((m, i) => { const e = ease(stag(p, i, 3)); m.position.copy(m.userData.home); m.position.y += -(1 - e) * 11 + Math.sin(t * 0.3 + i * 2) * 0.08; });
      nums.forEach((o, i) => { const e = ease(stag(p, i, 3)); o.position.copy(o.userData.home); o.position.y += -(1 - e) * 11 + Math.sin(t * 0.3 + i * 2) * 0.08; const op = Math.min(1, e * 1.4).toFixed(2); if (o.element.style.opacity !== op) o.element.style.opacity = op; });
      const e = ease(stag(p, 1.4, 3)); team.position.copy(teamHome); team.position.x += (1 - e) * 12; team.position.y += Math.sin(t * 0.45 + 1) * 0.1;
    };
    g.add(motes(LOW ? 360 : 700, [60, 22, 90], [1.0, 0.86, 0.66], 2.2));
  };
  // 3 · what I make: an orrery; five photographs ride tilted rings round a small star
  builders[3] = (g) => {
    const c = at(3, 0.5, 5.2, -44);
    // a real small star: granulated, darker at the limb, with its corona glow round it (warm white, not a tint)
    const star = new THREE.Mesh(new THREE.SphereGeometry(1.25, 64, 40), new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 }, uK: { value: 1 } },
      vertexShader: "varying vec3 vN, vP, vV; void main(){ vN = normalize(normalMatrix * normal); vP = position; vec4 mv = modelViewMatrix * vec4(position, 1.); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }",
      fragmentShader: `uniform float uT, uK; varying vec3 vN, vP, vV;
        float h(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
        float n(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
          return mix(mix(mix(h(i), h(i + vec3(1, 0, 0)), f.x), mix(h(i + vec3(0, 1, 0)), h(i + vec3(1, 1, 0)), f.x), f.y), mix(mix(h(i + vec3(0, 0, 1)), h(i + vec3(1, 0, 1)), f.x), mix(h(i + vec3(0, 1, 1)), h(i + vec3(1, 1, 1)), f.x), f.y), f.z); }
        void main(){ float mu = max(dot(normalize(vN), normalize(vV)), 0.);
          float g = n(vP * 9. + uT * .12) * .6 + n(vP * 23. - uT * .08) * .4;
          gl_FragColor = vec4(vec3(1., .86, .67) * (2.3 + g * .9) * (.36 + .64 * pow(mu, .55)) * uK, 1.); }` }));
    star.position.copy(c); g.add(star); g.userData.star = star;
    const glowTex = (() => { const cv = document.createElement("canvas"); cv.width = cv.height = 128; const x = cv.getContext("2d"), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.18, "rgba(255,255,255,.42)"); gr.addColorStop(0.5, "rgba(255,255,255,.08)"); gr.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(cv); })();
    // its glow, as a lens sees it from afar; close up (the voice stop is 11 units off) it would veil the whole frame, so it gives way to the disc
    const glows = [[7, 0.9], [22, 0.28]].map(([sc, op]) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(1, 0.88, 0.72), transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending })); s.scale.setScalar(sc); s.position.copy(c); s.userData.op = op; g.add(s); return s; });
    g.userData.near = (cam) => { const d = cam.distanceTo(c), k = Math.min(1, Math.max(0, (d - 12) / 18)), e = k * k * (3 - 2 * k); glows.forEach((s, i) => { s.material.opacity = s.userData.op * (i ? e : 0.35 + 0.65 * e); s.visible = s.material.opacity > 0.005; }); star.material.uniforms.uK.value = 0.42 + 0.58 * e; };   // and the exposure comes down, as a camera's would: no veil of bloom
    // its rings are orbiting dust, not drawn lines
    g.userData.rings = [[7.5, 0.18, 0.08], [10.5, -0.08, 0.14], [14.5, 0.08, -0.12]].map(([r, tx, tz], k) => {
      const nn = LOW ? 520 : 950, pp = new Float32Array(nn * 3), ss2 = new Float32Array(nn);
      for (let i = 0; i < nn; i++) { const a = Math.random() * 6.283, rr = r + (Math.random() + Math.random() - 1) * 0.45; pp.set([Math.cos(a) * rr, (Math.random() - 0.5) * 0.16, Math.sin(a) * rr], i * 3); ss2[i] = Math.random(); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pp, 3)); geo.setAttribute("aS", new THREE.BufferAttribute(ss2, 1));
      const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uT: { value: 0 } },
        vertexShader: "attribute float aS; varying float vA; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = clamp((1. + aS * 2.) * 26. / -mv.z, 1., 5.); vA = .25 + .75 * pow(aS, 3.); }",
        fragmentShader: "varying float vA; void main(){ float a = smoothstep(.5, 0., length(gl_PointCoord - .5)) * vA * .8; gl_FragColor = vec4(vec3(1., .94, .86) * a, a); }" });
      const pts = new THREE.Points(geo, m); pts.position.copy(c); pts.rotation.set(tx, k * 1.3, tz); pts.frustumCulled = false; g.add(pts); return pts;
    });
    // [photo, width, the stop it belongs to, degrees off that stop's angle (- left, + right of the star), height]
    // (websites: his own site on a laptop at night; stores: a sample shop page on a phone; 3D: Otto in a web 3D viewer)
    const items = [["make-websites.jpg", 3.4, 0, -25, 1.5], ["make-stores.jpg", 3.2, 0, 25, -0.4], ["make-apis.jpg", 3.4, 1, -25, 1.5], ["make-3d.jpg", 3.6, 1, 25, -0.4], ["make-voice.jpg", 3.4, 2, 22, 0.5]];
    const aspect = {};
    const sl = items.map(([u, w, b, d, dy]) => { const bt = DIMS[3].beats[b], s = slab(u, w, w / (aspect[u] || 1.5), 0.26, 0, 3); s.position.copy(at(3, ...mk(bt.ang + d, 10.5, dy))); s.lookAt(at(3, ...bt.cam)); s.userData.home = s.position.clone(); g.add(s); return s; });   // each faces its stop
    g.userData.anim = (p, t) => {
      sl.forEach((s, i) => { const e = ease(stag(p, i, 5)); s.position.copy(c).lerp(s.userData.home, e); s.position.y += Math.sin(t * 0.45 + i * 1.7) * 0.12 * e; s.scale.setScalar(Math.max(0.001, 0.3 + 0.7 * e)); });
      const e = ease(p); g.userData.rings.forEach((r) => r.scale.setScalar(Math.max(0.001, 0.25 + 0.75 * e))); star.scale.setScalar(0.5 + 0.5 * e);
    };
    g.add(motes(LOW ? 300 : 560, [70, 24, 110], [0.86, 0.82, 1.0], 2.2));
  };
  // 4 · work: a gallery in the dark; each project hangs in its own cone of light
  builders[4] = (g) => {
    const hang = (url, w, h, x, y, z, face, tilt = 0, turn = 0) => { const s = slab(url, w, h, 0.26, turn, 4); s.position.copy(at(4, x, y, z)); s.lookAt(face); s.rotateY(tilt); s.userData.home = s.position.clone(); s.userData.ph = x + z; g.add(s); return s; };
    const sl = [];
    sl.push(hang("work-delivery.jpg", 5.4, 3.6, -4.8, 4.0, -21, at(4, 2, 3.8, -3), 0.06));
    sl.push(hang("li/sih-1.jpg", 5.15, 2.9, 5.4, 4.7, -43, at(4, -2, 4.2, -26), -0.05, Math.PI / 2));   // stored sideways: turned upright
    sl.push(hang("li/sih-3.jpg", 2.6, 1.46, 9.8, 1.9, -39.5, at(4, -2, 4.2, -26), -0.18));
    sl.push(hang("li/quickbite-1.jpg", 5.0, 2.78, -4.6, 5.0, -65, at(4, 2, 4.4, -48), 0.05));
    sl.push(hang("li/quickbite-2.jpg", 1.5, 3.38, -8.6, 4.2, -62, at(4, 2, 4.4, -48), 0.22));
    sl.push(hang("li/quickbite-3.jpg", 1.5, 2.98, -1.2, 3.0, -61.5, at(4, 2, 4.4, -48), -0.16));
    sl.push(hang("work-jarvis.jpg", 4.8, 2.7, 5.0, 4.0, -87, at(4, -2, 4.0, -70), -0.06));
    [[-4.8, -21], [5.6, -42], [-4.6, -64], [5.0, -87]].forEach(([x, z]) => { const s = spot(); s.position.copy(at(4, x, 13, z)); g.add(s); (g.userData.spots ||= []).push(s); });
    const grp = [0, 1, 1, 2, 2, 2, 3];   // which light each photo hangs under
    g.userData.anim = (p, t) => {
      sl.forEach((s, i) => { const e = ease(stag(p, grp[i], 4)); s.position.copy(s.userData.home); s.position.y += (1 - e) * 4 + Math.sin(t * 0.45 + s.userData.ph) * 0.12; s.position.z -= (1 - e) * 26; });
      g.userData.spots.forEach((sp, i) => { sp.userData.cone.uniforms.uK.value = ease(stag(p, i, 4)); });
    };
    g.add(motes(LOW ? 220 : 400, [60, 24, 120], [0.55, 0.75, 1.0], 2.2));
  };
  // 5 · let's talk: the chrome orb sends slow rings of signal outward (they grow and fade; nothing flashes)
  builders[5] = (g, extra) => {
    const c = at(5, 6.5, 5, -30);
    if (extra.orb) { extra.orb.mesh.position.copy(c); extra.orb.mesh.scale.setScalar(2.4); extra.ring.position.copy(c); extra.ring.scale.setScalar(1.7); }
    const rings = [0, 1, 2].map((k) => { const m = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.012, 6, 220), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.95, 1.05), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); m.position.copy(c); m.rotation.set(1.2, 0.1, -0.3); m.userData.ph = k / 3; g.add(m); return m; });
    g.userData.pulse = rings;
    if (extra.orb) g.userData.anim = (p) => { const e = ease(p); extra.orb.mesh.scale.setScalar(Math.max(0.001, 2.4 * e)); extra.ring.scale.setScalar(Math.max(0.001, 1.7 * e)); };
    g.add(motes(LOW ? 260 : 480, [70, 24, 90], [0.8, 0.86, 1.0], 2.4));
  };

  function build(d, extra = {}) {
    if (groups[d] || !builders[d]) return groups[d];
    const g = new THREE.Group(); g.visible = false; scene.add(g); groups[d] = g; builders[d](g, extra); return g;
  }
  return {
    build, groups, textures,
    update(t, zone, arrive = 1, cam = null) {
      groups.forEach((g, d) => { if (!g) return; g.visible = d === zone; });
      (cssObjs).forEach((list, d) => list && list.forEach((o) => (o.visible = d === zone)));
      crispObjs.forEach((list, d) => list && list.forEach((o) => (o.visible = d === zone)));
      const g = groups[zone]; if (!g) return;
      g.traverse((o) => { if (o.isPoints && o.material.uniforms && o.material.uniforms.uT) o.material.uniforms.uT.value = t; });
      if (g.userData.star) g.userData.star.material.uniforms.uT.value = t;
      (g.userData.rings || []).forEach((r, k) => (r.rotation.y = k * 1.3 + t * (0.02 - k * 0.004)));
      (g.userData.pulse || []).forEach((m) => { const k = (t / 7 + m.userData.ph) % 1; m.scale.setScalar(1 + k * 3.2); m.material.opacity = Math.sin(k * Math.PI) * 0.09; });
      (g.userData.spots || []).forEach((s) => { const dm = s.userData.dust; if (dm) dm.uniforms.uT.value = t; });
      if (g.userData.anim) g.userData.anim(arrive, t);
      if (g.userData.near && cam) g.userData.near(cam);
    },
    // the page photos follow their slabs exactly (after the scene has been drawn this frame)
    syncCrisp() { photoSlabs.forEach((sl) => { const o = sl.userData.photo; if (!o.visible) return; o.matrix.multiplyMatrices(sl.matrixWorld, sl.userData.off); o.matrixWorldNeedsUpdate = true; }); },
    crispOn: (zone) => !!(crispObjs[zone] && crispObjs[zone].length),
    // the screen rectangle (CSS px) the crisp layer has anything in; null when nothing of it is on screen
    crispRect(cam, vw, vh) {
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, any = false;
      for (const list of crispObjs) if (list) for (const o of list) {
        if (!o.visible || !o.geometry.attributes.position) continue;
        if (o.isPoints) { if (o.material.uniforms.uForm.value < 1.08) return [0, 0, vw, vh]; o.updateMatrixWorld(); }   // stars still streaming in from the whole sky
        const M = o.isPoints ? o.matrixWorld : o.matrix, bb = o.geometry.boundingBox || (o.geometry.computeBoundingBox(), o.geometry.boundingBox);
        let a0 = 1e9, b0 = 1e9, a1 = -1e9, b1 = -1e9, behind = 0;
        for (let k = 0; k < 8; k++) {
          _cr.set(k & 1 ? bb.max.x : bb.min.x, k & 2 ? bb.max.y : bb.min.y, k & 4 ? bb.max.z : bb.min.z).applyMatrix4(M).applyMatrix4(cam.matrixWorldInverse);
          if (_cr.z > -cam.near) { behind++; continue; }
          _cr.applyMatrix4(cam.projectionMatrix); const X = (_cr.x + 1) * 0.5 * vw, Y = (1 - _cr.y) * 0.5 * vh;
          a0 = Math.min(a0, X); a1 = Math.max(a1, X); b0 = Math.min(b0, Y); b1 = Math.max(b1, Y);
        }
        if (behind === 8) continue; if (behind) return [0, 0, vw, vh];
        a0 = Math.max(a0, 0); b0 = Math.max(b0, 0); a1 = Math.min(a1, vw); b1 = Math.min(b1, vh); if (a1 <= a0 || b1 <= b0) continue;   // off screen
        x0 = Math.min(x0, a0); y0 = Math.min(y0, b0); x1 = Math.max(x1, a1); y1 = Math.max(y1, b1); any = true;
      }
      return any ? [x0, y0, x1, y1] : null;
    },
  };
}
