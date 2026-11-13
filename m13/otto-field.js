// Otto, Field edition: a rugged explorer built like field kit (white and graphite armour with panel gaps, orange
// signal parts, pistons, a backpack with radiator fins and an antenna, treaded boots). Same controls as the first
// Otto (m7/otto3d.js: root, rig, head, P, pose(), parts, materials), so the tour flies, wakes and lights him the same
// way, plus:
//   a face: two LED eyes and a voice-meter mouth drawn on the visor, with expressions (happy, excited, focused,
//     worried, curious) that blend smoothly, blinks, and eyes that follow where he looks;
//   hands: palm, three two-jointed fingers and a thumb, curling for open, relaxed, pointing and fist;
//   gestures while he talks: pointing or presenting at a world point (P.aim), arms open, hand to chest, and beats in
//     time with his voice; his head glances where he points;
//   physics: his antenna, head, arms and knees are springs driven by how his body actually accelerates, so starts,
//     stops and turns carry through his whole body; in flight his palms turn down to their thrusters.
// Feet stand at y = 0; about 2.3 units to the antenna tip.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export const FINISHES = {
  cobalt: { plate: 0xf26a1b, light: 0xffb547, name: "Field white, graphite and signal orange" },
  blood: { plate: 0xd8341f, light: 0xff4436, name: "Field white, graphite and red" },
};

const canvasTex = (w, h, draw, srgb = true) => { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
let TEX = null;
function textures() {
  if (TEX) return TEX;
  const grain = canvasTex(256, 256, (g, w, h) => { const im = g.createImageData(w, h); for (let i = 0; i < w * h; i++) { const v = 150 + Math.random() * 60; im.data.set([v, v, v, 255], i * 4); } g.putImageData(im, 0, 0); }, false);
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping; grain.repeat.set(2, 2);
  const hazard = canvasTex(256, 48, (g, w, h) => { g.fillStyle = "#f2b01e"; g.fillRect(0, 0, w, h); g.fillStyle = "#121212"; for (let x = -h; x < w; x += 32) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 16, h); g.lineTo(x + 16 + h, 0); g.lineTo(x + h, 0); g.fill(); } });
  const label = canvasTex(512, 96, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = "#2b2b2b"; g.font = "700 46px Geist, Arial, sans-serif"; g.textBaseline = "middle"; g.fillText("OTTO", 6, 30); g.font = "600 26px Geist, Arial, sans-serif"; g.fillStyle = "#555"; g.fillText("FIELD UNIT 02  ·  YS-2026", 8, 72); });
  return (TEX = { grain, hazard, label });
}

export function buildOtto(finish = "cobalt", { shadow = true } = {}) {
  const F = FINISHES[finish] || FINISHES.cobalt, T = textures();
  // ---------- materials
  const white = new THREE.MeshPhysicalMaterial({ color: 0xe7e4dd, roughness: 0.52, roughnessMap: T.grain, metalness: 0, clearcoat: 0.18, clearcoatRoughness: 0.3 });
  const frame = new THREE.MeshPhysicalMaterial({ color: 0x2c3037, roughness: 0.62, roughnessMap: T.grain, metalness: 0.05, clearcoat: 0.08 });
  const plateM = new THREE.MeshPhysicalMaterial({ color: F.plate, roughness: 0.5, roughnessMap: T.grain, metalness: 0, clearcoat: 0.2, clearcoatRoughness: 0.3 });
  const joint = new THREE.MeshStandardMaterial({ color: 0x3a3f47, metalness: 0.75, roughness: 0.34 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xb4bac2, metalness: 1, roughness: 0.26 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x141518, roughness: 0.9 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x030405, roughness: 0.05, metalness: 0.35, clearcoat: 1, clearcoatRoughness: 0.02 });
  const lightM = new THREE.MeshBasicMaterial({ color: F.light });
  const lightCol = new THREE.Color(F.light);
  const decalM = (map) => new THREE.MeshStandardMaterial({ map, transparent: true, roughness: 0.55, polygonOffset: true, polygonOffsetFactor: -2 });

  const mesh = (geo, mat, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); return o; };
  const rbox = (w, h, d, r, mat, x, y, z) => mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2) * 0.999), mat, x, y, z);
  const sph = (r, mat, x, y, z, s = 24) => mesh(new THREE.SphereGeometry(r, s, Math.max(8, s / 2)), mat, x, y, z);
  const cyl = (rt, rb, h, mat, x, y, z, s = 24) => mesh(new THREE.CylinderGeometry(rt, rb, h, s), mat, x, y, z);
  const strut = (a, b, r, mat) => { const d = new THREE.Vector3().subVectors(b, a), m = mesh(new THREE.CylinderGeometry(r, r, d.length(), 12), mat); m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return m; };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const halo = (size, opacity = 0.5) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: lightCol, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false })); s.scale.set(size, size, 1); return s; };

  const root = new THREE.Group(), rig = new THREE.Group(); root.add(rig);
  if (shadow) { const sh = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.005; sh.renderOrder = -1; root.add(sh); root.userData.shadow = sh; }

  // ---------- legs
  const legs = [];
  for (const side of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(0.17 * side, 0.74, 0); rig.add(hip);
    hip.add(sph(0.095, joint));
    hip.add(rbox(0.15, 0.26, 0.17, 0.035, frame, 0, -0.15, 0)); hip.add(rbox(0.13, 0.19, 0.05, 0.025, white, 0, -0.15, 0.095));
    hip.add(rbox(0.05, 0.16, 0.13, 0.015, white, side * 0.085, -0.15, 0));
    const knee = new THREE.Group(); knee.position.set(0, -0.3, 0); hip.add(knee);
    knee.add(sph(0.075, joint)); knee.add(rbox(0.13, 0.09, 0.05, 0.02, plateM, 0, 0.0, 0.075));
    knee.add(rbox(0.15, 0.2, 0.16, 0.035, white, 0, -0.13, 0)); knee.add(strut(V(0, -0.02, -0.085), V(0, -0.22, -0.075), 0.014, steel));
    const ankle = new THREE.Group(); ankle.position.set(0, -0.26, 0); knee.add(ankle);
    ankle.add(sph(0.058, joint));
    ankle.add(rbox(0.25, 0.13, 0.4, 0.04, frame, 0, -0.075, 0.05)); ankle.add(rbox(0.26, 0.04, 0.41, 0.015, rubber, 0, -0.145, 0.05));
    ankle.add(rbox(0.2, 0.04, 0.12, 0.012, plateM, 0, -0.025, -0.1)); ankle.add(rbox(0.21, 0.07, 0.03, 0.012, white, 0, -0.07, 0.25));
    legs.push({ hip, knee, ankle, side });
  }

  // ---------- pelvis and torso
  rig.add(rbox(0.44, 0.15, 0.27, 0.045, frame, 0, 0.8, 0));
  rig.add(cyl(0.11, 0.13, 0.12, steel, 0, 0.88, 0)); const bel = mesh(new THREE.TorusGeometry(0.12, 0.014, 8, 40), rubber, 0, 0.9, 0); bel.rotation.x = Math.PI / 2; rig.add(bel);
  const chest = new THREE.Group(); chest.position.y = 0.84; rig.add(chest);
  chest.add(rbox(0.56, 0.5, 0.34, 0.05, frame, 0, 0.34, 0));                         // the frame under the armour
  const chestPlate = rbox(0.62, 0.32, 0.09, 0.03, white, 0, 0.44, 0.17); chest.add(chestPlate);
  chest.add(rbox(0.52, 0.14, 0.08, 0.025, white, 0, 0.16, 0.16));                   // belly plate (a gap above it)
  for (const s of [-1, 1]) chest.add(rbox(0.06, 0.4, 0.3, 0.02, frame, s * 0.3, 0.35, 0));
  chest.add(mesh(new THREE.PlaneGeometry(0.32, 0.06), decalM(T.label), -0.1, 0.55, 0.2151));
  chest.add(mesh(new THREE.PlaneGeometry(0.4, 0.045), decalM(T.hazard), 0, 0.13, 0.2011));
  for (const [x, y] of [[-0.27, 0.57], [0.27, 0.57], [-0.27, 0.31], [0.27, 0.31]]) { const b = cyl(0.011, 0.011, 0.012, steel, x, y, 0.218, 10); b.rotation.x = Math.PI / 2; chest.add(b); }
  // his core: a light set in a steel ring on the chest plate
  const coreRing = mesh(new THREE.TorusGeometry(0.05, 0.011, 10, 32), steel, 0.17, 0.41, 0.218); chest.add(coreRing);
  const core = mesh(new THREE.CircleGeometry(0.042, 28), lightM, 0.17, 0.41, 0.219); chest.add(core);
  const coreHalo = halo(0.16, 0.4); coreHalo.position.set(0.17, 0.41, 0.225); chest.add(coreHalo);   // small and close, so from the side it reads as the light, not a glow beside him
  // backpack: battery box, radiator fins, a cable, and the antenna (a spring: it sways with his motion)
  const pack = new THREE.Group(); pack.position.set(0, 0.38, -0.27); chest.add(pack);
  pack.add(rbox(0.5, 0.5, 0.2, 0.04, frame, 0, 0, 0));
  for (let k = 0; k < 7; k++) pack.add(rbox(0.4, 0.014, 0.06, 0.005, steel, 0, -0.18 + k * 0.058, -0.12));
  { const hz = mesh(new THREE.PlaneGeometry(0.34, 0.045), decalM(T.hazard), 0, 0.21, -0.1011); hz.rotation.y = Math.PI; pack.add(hz); }
  pack.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(-0.2, 0.2, 0.08), V(-0.31, 0.27, 0.2), V(-0.33, 0.18, 0.3)]), 16, 0.016, 8), rubber));
  pack.add(rbox(0.12, 0.05, 0.08, 0.015, plateM, 0.15, 0.27, 0.0));   // (a cap where the antenna used to be)

  // ---------- head
  const neck = new THREE.Group(); neck.position.y = 0.68; chest.add(neck);   // a little taller than it was: the head clears the chest when he bows
  neck.add(cyl(0.075, 0.09, 0.24, steel, 0, 0.04, 0)); { const ring = mesh(new THREE.TorusGeometry(0.085, 0.012, 8, 28), rubber, 0, -0.06, 0); ring.rotation.x = Math.PI / 2; neck.add(ring); }
  const head = new THREE.Group(); head.position.y = 0.36; neck.add(head);
  head.add(rbox(0.86, 0.52, 0.66, 0.15, white, 0, 0, 0));
  head.add(rbox(0.74, 0.27, 0.08, 0.07, frame, 0, 0.0, 0.3));                         // the visor's surround
  head.add(rbox(0.7, 0.24, 0.1, 0.06, glass, 0, 0.0, 0.3));                           // the visor
  head.add(rbox(0.24, 0.05, 0.36, 0.02, plateM, 0, 0.27, -0.02));
  // the antenna: on the helmet, behind the top plate, so it moves with his head and nothing sweeps through it
  const antenna = new THREE.Group(); antenna.position.set(0.28, 0.26, -0.15); head.add(antenna);
  antenna.add(cyl(0.035, 0.042, 0.04, joint, 0, 0.0, 0)); antenna.add(cyl(0.008, 0.012, 0.34, steel, 0, 0.18, 0, 10));
  const bulb = sph(0.026, lightM, 0, 0.36, 0, 16); antenna.add(bulb); const bulbHalo = halo(0.22, 0.45); bulbHalo.position.y = 0.36; antenna.add(bulbHalo);
  for (const s of [-1, 1]) { const pod = cyl(0.11, 0.11, 0.09, joint, s * 0.46, -0.01, 0); pod.rotation.z = Math.PI / 2; head.add(pod); const lens = cyl(0.06, 0.06, 0.02, glass, s * 0.51, -0.01, 0); lens.rotation.z = Math.PI / 2; head.add(lens); const li = cyl(0.025, 0.025, 0.022, lightM, s * 0.512, -0.01, 0, 16); li.rotation.z = Math.PI / 2; head.add(li); }
  // the face: eyes and a voice meter, drawn on the visor glass (it glows; nothing here is a texture)
  const FW = 0.64, FH = 0.22;
  const faceU = { uCol: { value: lightM.color }, uPow: { value: 1 }, uMouth: { value: 0 }, uE: { value: [new THREE.Vector4(), new THREE.Vector4()] }, uF: { value: [new THREE.Vector4(), new THREE.Vector4()] }, uBars: { value: new Array(7).fill(0) } };
  const face = mesh(new THREE.PlaneGeometry(FW, FH), new THREE.ShaderMaterial({ uniforms: faceU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }",
    fragmentShader: `uniform vec3 uCol; uniform float uPow, uMouth; uniform vec4 uE[2]; uniform vec4 uF[2]; uniform float uBars[7]; varying vec2 vUv;
      float box(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - r; }
      // one eye: a rounded block; 'happy' lifts a disc from below into it (an arc), the lid line tilts and drops
      float eye(vec2 p, vec4 e, vec4 f, float side){
        vec2 q = p - e.xy; float d = box(q, e.zw, min(f.x, min(e.z, e.w)));
        if (f.y > .001) { float R = e.z * 1.3; d = max(d, -(length(q - vec2(0., -e.w - R + 2. * e.w * f.y)) - R)); }
        float tilt = f.z * side; d = max(d, dot(q - vec2(0., e.w * (1. - 2. * f.w)), normalize(vec2(tilt, 1.))));
        return d; }
      void main(){
        vec2 p = (vUv - .5) * vec2(${FW.toFixed(2)}, ${FH.toFixed(2)});
        float d = min(eye(p, uE[0], uF[0], -1.), eye(p, uE[1], uF[1], 1.));
        float led = .8 + .2 * step(.3, fract(p.x * 190.)) * step(.3, fract(p.y * 190.));   // the display's pixel pitch, faintly
        float a = smoothstep(.003, -.0015, d) * led, glow = exp(-max(d, 0.) / .011) * .24;
        float m = 1e3; for (int i = 0; i < 7; i++) { float x = (float(i) - 3.) * .021; m = min(m, box(p - vec2(x, -.074), vec2(.0062, .0035 + uBars[i] * .026), .0035)); }
        float am = smoothstep(.003, -.0015, m) * led * uMouth, mg = exp(-max(m, 0.) / .012) * .16 * uMouth;
        gl_FragColor = vec4(uCol * (a * 1.9 + glow + am * 1.5 + mg) * uPow, 1.);
      }` }), 0, 0, 0.3515);
  face.renderOrder = 5; head.add(face);
  const eyeHalos = [halo(0.2, 0.3), halo(0.2, 0.3)]; eyeHalos[0].position.set(-0.13, 0.01, 0.37); eyeHalos[1].position.set(0.13, 0.01, 0.37); head.add(...eyeHalos);

  // ---------- arms and hands
  const arms = [];
  for (const side of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(0.4 * side, 0.49, 0); chest.add(sh);
    sh.add(sph(0.095, joint));
    // the shoulder pad hangs on the chest above the joint and follows the arm only partway (see post), as real
    // pauldrons do, so a raised arm never swings it into his chest
    const pad = new THREE.Group(); pad.position.set(0.4 * side, 0.49, 0); chest.add(pad); pad.add(rbox(0.25, 0.13, 0.29, 0.04, plateM, side * 0.06, 0.1, 0));
    sh.add(mesh(new THREE.CapsuleGeometry(0.058, 0.12, 6, 14), frame, 0, -0.15, 0)); sh.add(rbox(0.13, 0.15, 0.13, 0.03, white, 0, -0.145, 0.012));
    const el = new THREE.Group(); el.position.set(0, -0.31, 0); sh.add(el);
    el.add(sph(0.064, joint)); el.add(rbox(0.16, 0.19, 0.16, 0.035, white, 0, -0.15, 0.008)); el.add(strut(V(0, 0.0, -0.075), V(0, -0.2, -0.09), 0.013, steel));
    el.add(rbox(0.17, 0.035, 0.17, 0.012, frame, 0, -0.245, 0.008));
    const wr = new THREE.Group(); wr.position.set(0, -0.27, 0.005); el.add(wr);         // the wrist (flex, twist)
    const hand = new THREE.Group(); hand.rotation.y = -side * Math.PI / 2; wr.add(hand);   // palm faces +z in here, which is in toward his body at rest
    hand.add(sph(0.04, joint));
    hand.add(rbox(0.12, 0.1, 0.065, 0.022, frame, 0, -0.055, 0)); hand.add(rbox(0.1, 0.07, 0.02, 0.008, white, 0, -0.05, -0.04));
    const fingers = [];
    for (let k = 0; k < 3; k++) {
      const x = (k - 1) * 0.038 * side;            // k = 2 is beside the thumb: the index
      const f1 = new THREE.Group(); f1.position.set(x, -0.105, 0.004); hand.add(f1);
      f1.add(sph(0.016, joint, 0, 0, 0, 10)); f1.add(rbox(0.031, 0.058, 0.035, 0.011, frame, 0, -0.03, 0));
      const f2 = new THREE.Group(); f2.position.y = -0.058; f1.add(f2); f2.add(rbox(0.029, 0.046, 0.032, 0.011, white, 0, -0.024, 0));
      fingers.push([f1, f2]);
    }
    const th1 = new THREE.Group(); th1.position.set(side * 0.064, -0.04, 0.018); th1.rotation.z = side * 0.55; hand.add(th1);
    th1.add(sph(0.017, joint, 0, 0, 0, 10)); th1.add(rbox(0.032, 0.05, 0.034, 0.011, frame, 0, -0.027, 0));
    const th2 = new THREE.Group(); th2.position.y = -0.05; th1.add(th2); th2.add(rbox(0.029, 0.04, 0.031, 0.011, white, 0, -0.02, 0));
    const palm = new THREE.Group(); palm.position.set(0, -0.06, 0.035); palm.rotation.x = -Math.PI / 2; hand.add(palm);   // a thruster mount: fires out of the palm
    arms.push({ sh, el, wr, hand, fingers, thumb: [th1, th2], palm, pad, side });
  }

  // ---------- posing
  const P = { t: 0, lookX: 0, lookY: 0, talk: 0, blink: 0, walk: 0, walkPhase: 0, wave: 0, jump: 0, thrown: 0, power: 1, sleep: 0,
    expr: { happy: 0, excited: 0, focus: 0, worried: 0, curious: 0 },   // targets, 0..1 each; blended in pose()
    gesture: "rest", aim: null, glance: 0, palm: 0, physics: 1 };
  const L = (a, b, k) => a + (b - a) * k, cl = (v, a, b) => Math.max(a, Math.min(b, v));
  // expression presets for one eye: [half width, half height, corner, happy, lid tilt, lid drop]
  // (lid tilt: + raises the inner corners, worried; - lowers them, determined)
  const EX = { neutral: [0.058, 0.044, 0.03, 0, 0, 0], happy: [0.064, 0.05, 0.05, 0.8, 0, 0], excited: [0.054, 0.062, 0.05, 0, 0.1, 0], focus: [0.066, 0.03, 0.02, 0, -0.3, 0.12], worried: [0.055, 0.042, 0.034, 0, 0.42, 0.08] };
  const exW = { happy: 0, excited: 0, focus: 0, worried: 0, curious: 0 };
  // gestures: target angles per arm [shoulder x, shoulder z, elbow x, wrist twist, wrist flex, finger curl, thumb curl, shoulder turn]
  // (shoulder turn rotates the upper arm in its socket, so a bent elbow brings the forearm across his body)
  const G = {
    rest: (s) => [0.04, s * 0.2, -0.3, 0, 0, 0.42, 0.3],
    open: (s) => [-0.5, s * 0.62, -0.55, s * 1.2, 0, 0.12, 0.05],
    beat: (s) => [-0.36, s * 0.3, -1.08, s * 0.95, 0.1, 0.3, 0.2],
    self: (s) => (s < 0 ? [-0.88, -s * 0.06, -1.5, -s * 0.15, 0.2, 0.12, 0.1, -s * 0.95] : [-0.2, s * 0.24, -0.9, s * 0.8, 0, 0.35, 0.25, 0]),
  };
  const st = arms.map(() => [0.04, 0, -0.32, 0, 0, 0.42, 0.3, 0]);    // each arm's current (eased) angles
  const fing = arms.map(() => [0.42, 0.42, 0.42]);                     // each finger's curl
  // springs (the physics): value, velocity
  const spr = { antX: [0, 0], antZ: [0, 0], head: [0, 0], arm: [0, 0], knee: [0, 0], pack: [0, 0] };
  const step = (s, target, k, c, dt) => { const a = k * (target - s[0]) - c * s[1]; s[1] += a * dt; s[0] += s[1] * dt; return s[0]; };
  const wp = new THREE.Vector3(), wpPrev = new THREE.Vector3(), vel = new THREE.Vector3(), velPrev = new THREE.Vector3(), acc = new THREE.Vector3(), accL = new THREE.Vector3(), qi = new THREE.Quaternion(), tmp = new THREE.Vector3();
  let started = 0, gaze = 0, gazeYaw = 0, gazePitch = 0, waveW = 0;
  // aim one arm at a world point: shoulder angles that put the arm (hanging along -y) on the line to it
  function aimAt(a, target, out) {
    chest.updateWorldMatrix(true, false); tmp.copy(target); chest.worldToLocal(tmp); tmp.sub(a.sh.position).normalize();
    const b = Math.asin(cl(tmp.x, -1, 1)), th = Math.atan2(-tmp.z, -tmp.y);
    out[0] = cl(th, -1.95, 1.6); out[1] = cl(b, a.side > 0 ? -0.1 : -1.3, a.side > 0 ? 1.3 : 0.1);
  }
  function pose(dt = 1 / 60) {
    P.t += dt; dt = Math.min(dt, 0.05);
    const t = P.t, w = P.walk, ph = P.walkPhase, j = P.jump, th = P.thrown, pw = P.power, k6 = 1 - Math.exp(-dt * 6), k9 = 1 - Math.exp(-dt * 9);
    // --- how his body is really moving: world acceleration, in his own frame
    root.getWorldPosition(wp);
    if (started < 3 || dt < 1e-4) { wpPrev.copy(wp); vel.set(0, 0, 0); velPrev.set(0, 0, 0); started++; }
    vel.copy(wp).sub(wpPrev).divideScalar(Math.max(dt, 1e-3)); wpPrev.copy(wp);
    if (vel.lengthSq() > 3600) vel.setLength(60);                      // a jump in place (a reload, a nav jump) is not a force
    acc.lerp(tmp.copy(vel).sub(velPrev).divideScalar(Math.max(dt, 1e-3)), 1 - Math.exp(-dt * 8)); velPrev.copy(vel);
    rig.getWorldQuaternion(qi).invert(); accL.copy(acc).applyQuaternion(qi).clampLength(0, 40).multiplyScalar(P.physics);
    // the springs: the antenna lags and whips; head, arms and pack follow through; knees take a stop
    const antX = step(spr.antX, cl(accL.z * 0.012, -0.6, 0.6), 38, 2.6, dt), antZ = step(spr.antZ, cl(-accL.x * 0.012, -0.6, 0.6), 38, 2.6, dt);
    const headLag = step(spr.head, cl(accL.z * 0.004, -0.2, 0.2), 60, 8, dt), armLag = step(spr.arm, cl(accL.z * 0.008, -0.45, 0.45), 45, 6, dt);
    const kneeLag = step(spr.knee, cl(Math.abs(accL.z) * 0.004 + Math.max(0, accL.y) * 0.008, 0, 0.4), 70, 9, dt), packLag = step(spr.pack, cl(accL.z * 0.003, -0.12, 0.12), 50, 5, dt);

    // --- breathing, bob and stance
    rig.position.y = Math.sin(t * 2.1) * 0.012 * (1 - w) + Math.abs(Math.sin(ph)) * 0.05 * w + j * 0.04 - kneeLag * 0.05;
    rig.rotation.z = Math.sin(t * 0.9) * 0.012;
    chest.scale.set(1 + Math.sin(t * 2.1) * 0.005, 1 + Math.sin(t * 2.1) * 0.008, 1);
    chest.rotation.x = L(0.02, 0.12, w) - j * 0.12 + th * -0.15 + P.sleep * 0.25 + packLag * 0.4;
    pack.rotation.x = -packLag * 0.6;
    antenna.rotation.set(antX + Math.sin(t * 2.7) * 0.03, 0, antZ + Math.sin(t * 3.1) * 0.04);

    // --- expression: ease toward the asked-for mix
    for (const k in exW) exW[k] += (cl(P.expr[k] || 0, 0, 1) - exW[k]) * k6;
    const blend = (side) => { const o = EX.neutral.slice(); for (const k of ["happy", "excited", "focus", "worried"]) { const e = EX[k], x = exW[k]; for (let i = 0; i < 6; i++) o[i] += (e[i] - EX.neutral[i]) * x; }
      // curious: one eye opens wider, the other narrows a little under a raised lid
      const c = exW.curious; if (c > 0) { if (side < 0) { o[1] += 0.014 * c; o[4] += 0.12 * c; } else { o[1] -= 0.012 * c; o[4] -= 0.2 * c; o[5] += 0.08 * c; } }
      return o; };
    const lx = P.lookX * 0.03 + gazeYaw * 0.04, ly = P.lookY * 0.02 + gazePitch * 0.02;
    [-1, 1].forEach((s, i) => {
      const o = blend(s), open = Math.max(0.1, (1 - P.blink) * (1 - P.sleep * 0.93));
      faceU.uE.value[i].set(s * 0.13 + lx, 0.012 + ly, o[0] * (1 + th * 0.3), Math.max(0.004, o[1] * open));
      faceU.uF.value[i].set(o[2], o[3] * (open > 0.5 ? 1 : 0), o[4], o[5]);
    });
    faceU.uPow.value = pw;
    // the voice meter: bars follow his voice, each with its own flicker, tallest in the middle
    const tk = cl(P.talk, 0, 1.2); faceU.uMouth.value += ((tk > 0.03 ? 1 : 0) - faceU.uMouth.value) * k9;
    for (let i = 0; i < 7; i++) { const c = 1 - Math.abs(i - 3) / 4.2, f = 0.35 + 0.65 * Math.abs(Math.sin(t * (8.5 + i * 1.9) + i * 2.3)); faceU.uBars.value[i] += (tk * c * f - faceU.uBars.value[i]) * (1 - Math.exp(-dt * 22)); }

    // --- gestures
    waveW += (cl(P.wave, 0, 1) - waveW) * (1 - Math.exp(-dt * 5));
    const gst = P.gesture || "rest", aim = P.aim;
    arms.forEach((a, i) => {
      const s = a.side; let tg;
      if ((gst === "point" || gst === "present") && aim && (P.aimSide || s) === s) {
        tg = gst === "point" ? [0, 0, -0.06, s * 0.15, 0.05, 0, 0] : [0, 0, -0.42, s * 1.45, -0.1, 0.12, 0.05];
        aimAt(a, aim, tg); if (gst === "present") tg[0] += 0.22;     // presenting: the hand a little below the line, palm up
      } else if (gst === "point" || gst === "present") tg = G.beat(s).map((v, k) => (k < 3 ? L(G.rest(s)[k], v, 0.45) : v));   // the other hand rests half up
      else tg = (G[gst] || G.rest)(s);
      // beats: the forearms lift on the stressed sounds of his voice
      if (gst !== "rest" && gst !== "point") tg[2] -= tk * 0.14 * (0.6 + 0.4 * Math.sin(t * 5.3 + i * 1.7));
      const e = st[i]; for (const k of [0, 1, 2, 3, 4, 7]) e[k] += ((tg[k] || 0) - e[k]) * (k < 3 || k === 7 ? k6 : k9);
      // the wave: upper arm out to the side just below level, forearm up, palm to you, swinging from the elbow
      // (with a little give at the wrist); never over his head or behind it
      let shx = e[0], shz = e[1], elx = e[2], elz = 0, twist = e[3], flex = e[4], wz = 0;
      const wv = s === 1 ? waveW : 0;
      if (wv > 0.001) {
        const sw = Math.sin(t * 7.2);
        shx = L(shx, -0.32, wv); shz = L(shz, s * 1.28, wv); elx = L(elx, -0.12, wv); elz = L(0, s * (1.72 + sw * 0.3), wv);
        twist = L(twist, s * Math.PI / 2, wv); flex = L(flex, 0, wv); wz = Math.sin(t * 7.2 - 0.7) * 0.18 * wv;
      }
      // walking swing, jumping, being thrown (as before)
      const swing = Math.sin(ph) * 0.45 * (i === 0 ? -1 : 1) * w;
      a.sh.rotation.set(shx + swing - j * 0.4 + armLag, e[7] * (1 - wv), shz + j * 0.35 * s + th * 2.55 * s);
      a.el.rotation.set(elx - j * 0.6 + armLag * 0.5, 0, elz);
      // in flight his palms turn down onto their thrusters, fingers spread
      const pk = cl(P.palm, 0, 1);
      a.wr.rotation.set(L(flex, 0, pk), L(twist, 0, pk), s * (Math.PI / 2) * pk * 0.95 + wz);
      // fingers: pointing keeps the index straight
      const curlT = L(L(gst === "point" && aim && (P.aimSide || s) === s ? 1 : tg[5], 0.04, wv), 0.05, pk);   // open, fingers together, to wave
      a.fingers.forEach(([f1, f2], k) => { const want = gst === "point" && aim && (P.aimSide || s) === s && k === 2 ? 0.02 : curlT; fing[i][k] += (want - fing[i][k]) * k9; f1.rotation.x = -fing[i][k] * 1.3; f2.rotation.x = -fing[i][k] * 1.5; f1.rotation.z = (k - 1) * s * (0.12 * pk + 0.05 * wv); });
      const tc = L(tg[6] !== undefined ? tg[6] : 0.3, 0, pk); a.thumb[0].rotation.x = -tc * 0.9; a.thumb[1].rotation.x = -tc * 1.2;
    });

    // --- legs: a soft hover dangle, the stop taken in the knees, walking as before
    legs.forEach(({ hip, knee, ankle, side }, i) => {
      const s = i === 0 ? 1 : -1, swingL = Math.sin(ph) * 0.55 * s * w, dangle = Math.sin(t * 1.3 + i * 1.9) * 0.03;
      hip.rotation.x = swingL - j * 0.7 + th * 0.25 * s - kneeLag * 0.5 + dangle;
      hip.rotation.z = th * 0.35 * side + j * 0.06 * side;
      knee.rotation.x = Math.min(0.55, Math.max(0, -Math.sin(ph) * s) * 0.9 * w + j * 1.25 + th * 0.4 + kneeLag + 0.05);
      ankle.rotation.x = -knee.rotation.x * 0.45 - hip.rotation.x * 0.3;
    });

    // --- head: looking, glancing where he points, following through, sleeping
    if (aim && (P.gesture === "point" || P.gesture === "present") && P.glance > 0) {
      neck.updateWorldMatrix(true, false); tmp.copy(aim); neck.worldToLocal(tmp); const yaw = Math.atan2(tmp.x, tmp.z), pitch = Math.atan2(tmp.y - 0.36, Math.hypot(tmp.x, tmp.z));
      gaze += (P.glance - gaze) * k6; gazeYaw += (cl(yaw, -0.9, 0.9) - gazeYaw) * k6; gazePitch += (cl(pitch, -0.5, 0.5) - gazePitch) * k6;
    } else { gaze += (0 - gaze) * k6; gazeYaw += (0 - gazeYaw) * k6 * 0.6; gazePitch += (0 - gazePitch) * k6 * 0.6; }
    const nod = tk * 0.05 * Math.sin(t * 6.1) + exW.excited * 0.04 * Math.sin(t * 2.2);
    head.rotation.y = L(P.lookX * 0.55, gazeYaw * 0.8, gaze);
    head.rotation.x = L(-P.lookY * 0.32, -gazePitch * 0.6, gaze) + nod + P.sleep * 0.45 + headLag;
    head.rotation.z = -P.lookX * 0.08 + th * 0.12 + exW.curious * 0.16 - exW.worried * 0.05;
    chest.rotation.y = gazeYaw * 0.18 * gaze;

    // --- lights
    const glow = pw * (0.6 + tk * 0.3);
    [core, bulb].forEach((m) => (m.visible = pw > 0.05));
    lightM.color.copy(lightCol).multiplyScalar(0.35 + 0.65 * pw);
    coreHalo.material.opacity = 0.2 + glow * 0.4; bulbHalo.material.opacity = 0.18 + glow * 0.4;
    eyeHalos.forEach((h) => (h.material.opacity = (0.12 + glow * 0.25) * (P.blink > 0.5 ? 0.4 : 1)));
    if (root.userData.shadow) { const lift = Math.max(0, rig.position.y) + j * 0.1; root.userData.shadow.material.opacity = 1 - Math.min(0.7, lift * 2); root.userData.shadow.scale.setScalar(1 - Math.min(0.4, lift)); }
  }
  // after everything else has moved him this frame (the tour adjusts him after pose): pads follow their arms
  // partway, and no part is left inside another
  function post() {
    arms.forEach((a) => {
      const s = a.side, fwd = a.sh.rotation.x < -0.45;
      if (!fwd) a.sh.rotation.z = s > 0 ? Math.max(a.sh.rotation.z, 0.12) : Math.min(a.sh.rotation.z, -0.12);   // never in through his side
      a.el.rotation.x = cl(a.el.rotation.x, -1.6, 0.05);                                                   // the elbow's own range
      a.pad.rotation.set(cl(a.sh.rotation.x * 0.22, -0.4, 0.3), 0, cl(a.sh.rotation.z * 0.3, -0.45, 0.45));
    });
    head.rotation.x = cl(head.rotation.x, -0.5, 0.4); head.position.y = Math.max(head.position.y, 0.32);   // never bowed into the chest
    legs.forEach((l) => { l.knee.rotation.x = cl(l.knee.rotation.x, -0.05, 0.7); });
  }
  pose(0); post();
  return { root, rig, head, P, pose, post, finish: F, materials: { body: white, trim: steel, joint, glass, lightM },
    parts: { arms, legs, chest, neck, antenna, core, eyes: [], eyeHalos, bulbHalo, coreHalo, face, pack } };
}

let glowTex = null;
function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d"), r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.22, "rgba(255,255,255,.55)"); r.addColorStop(0.55, "rgba(255,255,255,.12)"); r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r; g.fillRect(0, 0, 128, 128); glowTex = new THREE.CanvasTexture(c); glowTex.colorSpace = THREE.SRGBColorSpace; return glowTex;
}
let shadowTex = null;
function shadowTexture() {
  if (shadowTex) return shadowTex;
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d"), r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, "rgba(0,0,0,.75)"); r.addColorStop(0.5, "rgba(0,0,0,.35)"); r.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = r; g.fillRect(0, 0, 128, 128); shadowTex = new THREE.CanvasTexture(c); return shadowTex;
}
