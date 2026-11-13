// Deep space around the flight: a faint nebula and a band of distant light, thousands of stars that
// twinkle, a few bright ones with soft glints, close dust that streams past as you fly, and a field of
// liquid-chrome asteroids (the chrome form from the flat version), small and large, tumbling slowly.
// They keep clear of the flight line and of every room's glass, so nothing crosses the content.
import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const NOISE = `vec3 m289(vec3 x){return x-floor(x*(1./289.))*289.;} vec4 m289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 perm(vec4 x){return m289(((x*34.)+1.)*x);} vec4 tis(vec4 r){return 1.79284291400159-.85373472095314*r;}
float snoise(vec3 v){const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.); vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
 vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;i=m289(i); vec4 p=perm(perm(perm(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
 float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_); vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
 vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww; vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
 vec4 norm=tis(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w; vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m; return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}`;

export function createSpace({ scene, curve, O, ACC, LOW, DPR, renderer, holds = [] }) {
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z), UP = V(0, 1, 0), acc = new THREE.Color(ACC);
  const sky = new THREE.Group(); scene.add(sky);          // everything infinitely far travels with the camera

  // the nebula: faint clouds and a band of distant light, mostly black
  const neb = new THREE.Mesh(new THREE.SphereGeometry(700, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uAcc: { value: acc.clone() } },
    vertexShader: "varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.); gl_Position = p.xyww; }",
    fragmentShader: `uniform vec3 uAcc; varying vec3 vD;
      float hs(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      float vn(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
        return mix(mix(mix(hs(i), hs(i + vec3(1,0,0)), f.x), mix(hs(i + vec3(0,1,0)), hs(i + vec3(1,1,0)), f.x), f.y), mix(mix(hs(i + vec3(0,0,1)), hs(i + vec3(1,0,1)), f.x), mix(hs(i + vec3(0,1,1)), hs(i + vec3(1,1,1)), f.x), f.y), f.z); }
      float fbm(vec3 p){ float a = .5, s = 0.; for (int i = 0; i < 4; i++) { s += a * vn(p); p *= 2.03; a *= .5; } return s; }
      void main(){
        vec3 d = normalize(vD);
        float band = exp(-pow(dot(d, normalize(vec3(.35, 1., .2))) / .28, 2.));
        float c1 = fbm(d * 3.2 + 4.), c2 = fbm(d * 6.5 - 2.);
        float cloud = pow(smoothstep(.42, .85, c1), 2.) * (.35 + band);
        vec3 col = uAcc * cloud * .065 + vec3(.55, .6, .75) * band * pow(c2, 3.) * .05 + vec3(.9, .85, .8) * band * .008;
        gl_FragColor = vec4(col, 1.);
      }`,
  }));
  neb.renderOrder = -10;
  { const s = new THREE.Scene(); s.add(neb); const rt = new THREE.WebGLCubeRenderTarget(LOW ? 512 : 1024, { type: THREE.HalfFloatType, generateMipmaps: false });
    new THREE.CubeCamera(1, 2000, rt).update(renderer, s); scene.background = rt.texture; }

  // stars: many, of different sizes and temperatures, each twinkling at its own pace
  const starMat = (n, r0, r1, big) => {
    const p = new Float32Array(n * 3), c = new Float32Array(n * 3), sz = new Float32Array(n), sd = new Float32Array(n);
    const temps = [new THREE.Color(0.75, 0.82, 1), new THREE.Color(1, 1, 1), new THREE.Color(1, 0.9, 0.78)];
    for (let i = 0; i < n; i++) {
      // a share of the stars crowds into the band of light
      let v = V(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize();
      if (Math.random() < 0.45) { const nrm = V(0.35, 1, 0.2).normalize(); v.addScaledVector(nrm, -v.dot(nrm) * (0.75 + Math.random() * 0.2)).normalize(); }
      v.multiplyScalar(r0 + Math.random() * (r1 - r0)); p.set([v.x, v.y, v.z], i * 3);
      const rr = Math.random(), k = big ? 0.9 + Math.random() * 1.1 : 0.08 + Math.pow(rr, 4.5) * 1.6, T = Math.random();
      const col = (T < 0.12 ? new THREE.Color(0.68, 0.78, 1) : T < 0.45 ? new THREE.Color(0.9, 0.93, 1) : T < 0.8 ? new THREE.Color(1, 0.97, 0.92) : T < 0.94 ? new THREE.Color(1, 0.86, 0.7) : new THREE.Color(1, 0.72, 0.5)).multiplyScalar(k);
      c.set([col.r, col.g, col.b], i * 3); sz[i] = big ? 6 + Math.random() * 4 : 1 + Math.pow(rr, 5) * 1.4; sd[i] = Math.random();
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p, 3)); g.setAttribute("color", new THREE.BufferAttribute(c, 3)); g.setAttribute("aSize", new THREE.BufferAttribute(sz, 1)); g.setAttribute("aSeed", new THREE.BufferAttribute(sd, 1));
    const m = new THREE.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uPx: { value: DPR }, uBig: { value: big ? 1 : 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
      vertexShader: `uniform float uT, uPx; attribute vec3 color; attribute float aSize, aSeed; varying vec3 vC;
        void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv;
          gl_PointSize = aSize * uPx; vC = color; }`,
      fragmentShader: `uniform float uBig; varying vec3 vC; void main(){ vec2 q = gl_PointCoord - .5; float d = length(q); float a = exp(-d * d * (uBig > .5 ? 260. : 40.)) + exp(-d * 9.) * .1;
          // the bright ones get a soft cross of light
          float cross = uBig * (exp(-abs(q.x) * 140.) + exp(-abs(q.y) * 140.)) * exp(-d * 6.) * .5;
          gl_FragColor = vec4(vC * (a + cross), 1.); }`,
    });
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.renderOrder = -9; sky.add(pts); return m;
  };
  const stars = starMat(LOW ? 6000 : 11000, 380, 620, false), bright = starMat(LOW ? 26 : 40, 400, 560, true);

  // close dust: tiny motes in a box that wraps around the camera, so flying past them reads as speed
  const dustN = LOW ? 900 : 1800, dp = new Float32Array(dustN * 3);
  for (let i = 0; i < dustN; i++) dp.set([(Math.random() - 0.5) * 70, (Math.random() - 0.5) * 46, (Math.random() - 0.5) * 70], i * 3);
  const dg = new THREE.BufferGeometry(); dg.setAttribute("position", new THREE.BufferAttribute(dp, 3));
  const near = new THREE.ShaderMaterial({
    uniforms: { uCam: { value: V() }, uPx: { value: DPR }, uAcc: { value: acc.clone() } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    vertexShader: `uniform vec3 uCam; uniform float uPx; varying float vA; varying float vK;
      void main(){ vec3 box = vec3(70., 46., 70.); vec3 rel = mod(position - uCam + box * .5, box) - box * .5; vec4 mv = viewMatrix * vec4(uCam + rel, 1.);
        gl_Position = projectionMatrix * mv; float d = -mv.z; gl_PointSize = clamp(uPx * 30. / d, uPx, 4. * uPx);
        vA = smoothstep(1.5, 6., d) * (1. - smoothstep(22., 34., d)); vK = fract(position.x * 7.13); }`,
    fragmentShader: `uniform vec3 uAcc; varying float vA; varying float vK; void main(){ float a = smoothstep(.5, 0., length(gl_PointCoord - .5)); gl_FragColor = vec4(mix(vec3(.75, .8, .95), uAcc * 1.5, step(.8, vK)) * a * vA * .9, 1.); }`,
  });
  const dustPts = new THREE.Points(dg, near); dustPts.frustumCulled = false; scene.add(dustPts);

  // the asteroids: liquid chrome, many sizes, each with its own slow ripple and tumble
  // satin chrome: broad soft highlights, so a tumbling rock never throws a sharp glint
  const rockMats = [new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93, metalness: 0.04, envMapIntensity: 0.35 }), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0.06, envMapIntensity: 0.35 }), new THREE.MeshStandardMaterial({ vertexColors: true, color: 0xb8b0a6, roughness: 0.42, metalness: 0.78, envMapIntensity: 0.8 })];
  // where they go: around the whole route, never on the flight line, never in front of a room's glass
  const samples = curve.getSpacedPoints(600);
  const clearOfLine = (p, r) => samples.every((q) => q.distanceToSquared(p) > r * r);
  const clearOfRooms0 = (p) => O.every((o, i) => { const d = p.clone().sub(o); return i === 0 ? d.length() > 14 : !(d.x > -16 && d.x < 32 && d.y > -12 && d.y < 20 && d.z > -95 && d.z < 14); });
  // and nothing in the content side of any room's view: seen from each room's camera, a rock may sit only in
  // Otto's third of the frame (or far off), never behind the words or the portrait
  const views = holds.slice(1).map((h) => { const c = new THREE.PerspectiveCamera(40, 16 / 9, 0.1, 2000); c.position.copy(h.pos); c.lookAt(h.look); c.updateMatrixWorld(); return c; });
  const clearOfRooms = (p, s = 1) => clearOfRooms0(p) && views.every((c) => { const q = p.clone().project(c), dist = p.distanceTo(c.position); if (q.z > 1 || dist > 700) return true; const m = (s * 1.4) / (dist * 0.36); return q.x + m < -0.42 || Math.abs(q.y) > 1 + m || q.x - m > 1.05; });
  const rocks = [], want = LOW ? 72 : 120;
  for (let tries = 0; rocks.length < want && tries < 5000; tries++) {
    const u = Math.random(), p = curve.getPointAt(u), tg = curve.getTangentAt(u), side = V().crossVectors(tg, UP).normalize(), bin = V().crossVectors(side, tg).normalize();
    const big = Math.random() < 0.14, a = Math.random() * 6.283, dist = big ? 30 + Math.random() * 40 : 6 + Math.random() * 16;
    const s = big ? 4 + Math.random() * 7 : 0.35 + Math.pow(Math.random(), 1.6) * 2.6;
    const pos = p.clone().addScaledVector(side, Math.cos(a) * dist).addScaledVector(bin, Math.sin(a) * dist * 0.8);
    if (!clearOfLine(pos, Math.max(9, 4.2 + s * 1.3)) || !clearOfRooms(pos, s)) continue;   // well clear of the route (and so of the wormholes)
    rocks.push({ pos, s, ax: V(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(), sp: 0.02 + Math.random() * 0.07, ph: Math.random() * 6.28, sq: V(1, 0.75 + Math.random() * 0.35, 0.8 + Math.random() * 0.3) });
  }
  // three molten shapes, baked once (smooth noise pushed through a sphere), shared by all the rocks
  const hash = (x, y, z) => { const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return h - Math.floor(h); };
  const vnoise = (x, y, z) => { const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = x - ix, fy = y - iy, fz = z - iz, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy), sz = fz * fz * (3 - 2 * fz);
    const L = (a, b, t) => a + (b - a) * t, c = (i, j, k) => hash(ix + i, iy + j, iz + k);
    return L(L(L(c(0, 0, 0), c(1, 0, 0), sx), L(c(0, 1, 0), c(1, 1, 0), sx), sy), L(L(c(0, 0, 1), c(1, 0, 1), sx), L(c(0, 1, 1), c(1, 1, 1), sx), sy), sz) * 2 - 1; };
  // three bodies, baked once: lumpy noise at several scales, a scatter of craters with raised rims, darker in the
  // hollows (the colour is in the vertices, so it costs nothing to draw)
  const shape = (seed) => {
    let g = new THREE.IcosahedronGeometry(1, LOW ? 9 : 18); g.deleteAttribute("normal"); g.deleteAttribute("uv"); g = mergeVertices(g);
    const p = g.attributes.position, v = V(), col = new Float32Array(p.count * 3);
    const craters = Array.from({ length: 10 }, (_, k) => ({ c: V(Math.sin(seed * 3 + k * 7.1), Math.cos(seed * 5 + k * 3.3), Math.sin(seed * 1.7 + k * 5.9)).normalize(), r: 0.16 + 0.3 * Math.abs(Math.sin(seed + k * 2.3)) }));
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const nz = vnoise(v.x * 1.2 + seed, v.y * 1.2, v.z * 1.2) * 0.5 + vnoise(v.x * 2.6, v.y * 2.6 + seed, v.z * 2.6) * 0.25 + vnoise(v.x * 5.5 + seed, v.y * 5.5, v.z * 5.5 - seed) * 0.12 + vnoise(v.x * 12, v.y * 12, v.z * 12 + seed) * 0.05;
      let cr = 0; for (const c of craters) { const d = v.angleTo(c.c) / c.r; if (d < 1) cr -= (1 - d * d) * 0.38 * c.r; else if (d < 1.45) cr += (1.45 - d) * 0.22 * c.r; }
      v.multiplyScalar(1 + nz * 0.3 + cr); p.setXYZ(i, v.x, v.y, v.z);
      const sh = Math.max(0.35, 0.8 + nz * 0.55 + cr * 1.6); col.set([0.15 * sh, 0.138 * sh, 0.125 * sh], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
  };
  const kinds = [shape(1.3), shape(7.9), shape(15.2)];
  const fields = kinds.map((geo, k) => { const list = rocks.filter((_, i) => i % 3 === k); const m = new THREE.InstancedMesh(geo, rockMats[k], Math.max(1, list.length)); m.count = list.length; m.frustumCulled = false; m.userData.list = list; scene.add(m); return m; });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = V(), ps = V();
  function placeRocks(t) {
    fields.forEach((fm) => { fm.userData.list.forEach((r, i) => { q.setFromAxisAngle(r.ax, r.ph + t * r.sp); sc.copy(r.sq).multiplyScalar(r.s); ps.copy(r.pos); ps.y += Math.sin(t * 0.3 + r.ph) * 0.15 * r.s; m4.compose(ps, q, sc); fm.setMatrixAt(i, m4); }); fm.instanceMatrix.needsUpdate = true; });
  }
  placeRocks(0);

  return {
    rocks: fields,
    update(t, camera) {
      sky.position.copy(camera.position);
      stars.uniforms.uT.value = t; bright.uniforms.uT.value = t;
      near.uniforms.uCam.value.copy(camera.position);
      placeRocks(t);
    },
    setDPR(d) { stars.uniforms.uPx.value = d; bright.uniforms.uPx.value = d; near.uniforms.uPx.value = d; },
  };
}
