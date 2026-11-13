// Otto, full-bodied. One model, three finishes, posed by a small set of controls.
// Feet stand at y = 0; he is about 2.3 units tall to the tip of his antenna.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export const FINISHES = {
  porcelain: { body: 0xf2efe8, bodyRough: 0.3, trim: "chrome", joint: 0x1e2129, light: 0xffc66d, name: "Porcelain and gold" },
  graphite: { body: 0x2c3039, bodyRough: 0.26, trim: "chrome", joint: 0x0f1115, light: 0xffc66d, name: "Graphite and chrome" },
  cobalt: { body: 0xf2efe8, bodyRough: 0.3, trim: "chrome", joint: 0x1e2129, light: 0x3d6bff, name: "Porcelain and cobalt" },
  blood: { body: 0xf2efe8, bodyRough: 0.3, trim: "chrome", joint: 0x1e2129, light: 0xd11a28, name: "Porcelain and blood red" },
  midnight: { body: 0x1b2a55, bodyRough: 0.22, trim: "gold", joint: 0x0c1020, light: 0xffd38a, name: "Midnight and gold" },
};

let glowTex = null;
function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d"), r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.22, "rgba(255,255,255,.55)"); r.addColorStop(0.55, "rgba(255,255,255,.12)"); r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(c); glowTex.colorSpace = THREE.SRGBColorSpace; return glowTex;
}
let shadowTex = null;
function shadowTexture() {
  if (shadowTex) return shadowTex;
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d"), r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, "rgba(0,0,0,.75)"); r.addColorStop(0.5, "rgba(0,0,0,.35)"); r.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = r; g.fillRect(0, 0, 128, 128); shadowTex = new THREE.CanvasTexture(c); return shadowTex;
}

export function buildOtto(finish = "porcelain", { shadow = true } = {}) {
  const F = FINISHES[finish] || FINISHES.porcelain;
  const body = new THREE.MeshPhysicalMaterial({ color: F.body, roughness: F.bodyRough, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08, sheen: 0.4, sheenColor: new THREE.Color(0xffffff), sheenRoughness: 0.5 });
  const trim = F.trim === "gold"
    ? new THREE.MeshStandardMaterial({ color: 0xd9b26a, metalness: 1, roughness: 0.22 })
    : new THREE.MeshStandardMaterial({ color: 0xe8ebf0, metalness: 1, roughness: 0.1 });
  const joint = new THREE.MeshStandardMaterial({ color: F.joint, metalness: 0.55, roughness: 0.38 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x04060a, roughness: 0.04, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.02 });
  const lightM = new THREE.MeshBasicMaterial({ color: F.light });
  const lightCol = new THREE.Color(F.light);

  const mesh = (geo, mat, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); return o; };
  const halo = (size, opacity = 0.6) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: lightCol, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false })); s.scale.set(size, size, 1); return s; };

  const root = new THREE.Group();           // stays on the ground
  const rig = new THREE.Group(); root.add(rig); // bobs, leans, tumbles

  if (shadow) {
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.005; sh.renderOrder = -1; root.add(sh); root.userData.shadow = sh;
  }

  // ---------- legs ----------
  const legs = [];
  for (const side of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(0.17 * side, 0.74, 0); rig.add(hip);
    hip.add(mesh(new THREE.SphereGeometry(0.11, 24, 16), joint));
    const thigh = mesh(new THREE.CapsuleGeometry(0.095, 0.12, 8, 18), body, 0, -0.14, 0); hip.add(thigh);
    const knee = new THREE.Group(); knee.position.set(0, -0.3, 0); hip.add(knee);
    knee.add(mesh(new THREE.SphereGeometry(0.085, 20, 14), joint));
    knee.add(mesh(new THREE.CapsuleGeometry(0.085, 0.12, 8, 18), body, 0, -0.13, 0));
    const ankle = new THREE.Group(); ankle.position.set(0, -0.26, 0); knee.add(ankle);
    const boot = mesh(new RoundedBoxGeometry(0.3, 0.17, 0.44, 5, 0.075), body, 0, -0.07, 0.05); ankle.add(boot);
    ankle.add(mesh(new RoundedBoxGeometry(0.31, 0.05, 0.45, 3, 0.02), joint, 0, -0.14, 0.05));
    ankle.add(mesh(new THREE.TorusGeometry(0.09, 0.012, 8, 32), trim, 0, 0.02, 0)).rotation.x = Math.PI / 2;
    legs.push({ hip, knee, ankle, side });
  }

  // ---------- torso ----------
  const pelvis = mesh(new THREE.SphereGeometry(0.25, 32, 20), joint, 0, 0.8, 0); pelvis.scale.set(1.05, 0.55, 0.82); rig.add(pelvis);
  const chest = new THREE.Group(); chest.position.y = 0.84; rig.add(chest);
  const pts = []; const prof = [[0.0, 0.0], [0.2, 0.02], [0.27, 0.12], [0.34, 0.3], [0.36, 0.42], [0.33, 0.52], [0.24, 0.58], [0.1, 0.6], [0.0, 0.6]];
  prof.forEach(([r, y]) => pts.push(new THREE.Vector2(r, y)));
  const torso = mesh(new THREE.LatheGeometry(new THREE.SplineCurve(pts).getPoints(40), 64), body); torso.scale.z = 0.86; chest.add(torso);
  const belt = mesh(new THREE.TorusGeometry(0.285, 0.018, 10, 64), trim, 0, 0.1, 0); belt.rotation.x = Math.PI / 2; belt.scale.set(1, 0.86, 1); chest.add(belt);
  const coreRing = mesh(new THREE.TorusGeometry(0.085, 0.016, 12, 40), trim, 0, 0.36, 0.305); chest.add(coreRing);
  const core = mesh(new THREE.CircleGeometry(0.07, 32), lightM, 0, 0.36, 0.31); chest.add(core);
  const coreHalo = halo(0.42, 0.55); coreHalo.position.set(0, 0.36, 0.34); chest.add(coreHalo);

  // ---------- head ----------
  const neck = new THREE.Group(); neck.position.y = 0.62; chest.add(neck);
  neck.add(mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.1, 24), trim, 0, 0.03, 0));
  const head = new THREE.Group(); head.position.y = 0.36; neck.add(head);
  const skull = mesh(new THREE.SphereGeometry(1, 64, 48), body); skull.scale.set(0.5, 0.41, 0.44); head.add(skull);
  const visor = mesh(new THREE.SphereGeometry(1, 48, 32), glass, 0, -0.01, 0.2); visor.scale.set(0.38, 0.22, 0.27); head.add(visor);
  const visorRim = mesh(new THREE.TorusGeometry(1, 0.018, 8, 80), trim, 0, -0.01, 0.235); visorRim.scale.set(0.37, 0.215, 1); head.add(visorRim);
  const eyeG = new THREE.CapsuleGeometry(0.034, 0.055, 6, 14);
  const eyeL = mesh(eyeG, lightM, -0.12, 0.02, 0.46), eyeR = mesh(eyeG, lightM, 0.12, 0.02, 0.46); head.add(eyeL, eyeR);
  const mouth = mesh(new THREE.CapsuleGeometry(0.014, 0.07, 4, 10), lightM, 0, -0.1, 0.455); mouth.rotation.z = Math.PI / 2; head.add(mouth);
  const eyeHalos = [halo(0.24, 0.5), halo(0.24, 0.5)]; eyeHalos[0].position.set(-0.12, 0.02, 0.49); eyeHalos[1].position.set(0.12, 0.02, 0.49); head.add(...eyeHalos);
  for (const side of [-1, 1]) {
    const pod = new THREE.Group(); pod.position.set(0.48 * side, -0.01, 0); pod.rotation.z = Math.PI / 2; head.add(pod);
    pod.add(mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 32), joint));
    const ring = mesh(new THREE.TorusGeometry(0.105, 0.014, 8, 40), trim, 0, 0.04 * side * -1, 0); ring.rotation.x = Math.PI / 2; pod.add(ring);
    pod.add(mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.09, 20), lightM));
  }
  const antenna = new THREE.Group(); antenna.position.set(0, 0.4, 0); head.add(antenna);
  antenna.add(mesh(new THREE.CylinderGeometry(0.014, 0.02, 0.2, 10), trim, 0, 0.09, 0));
  const bulb = mesh(new THREE.SphereGeometry(0.052, 20, 14), lightM, 0, 0.21, 0); antenna.add(bulb);
  const bulbHalo = halo(0.36, 0.55); bulbHalo.position.y = 0.21; antenna.add(bulbHalo);
  const shine = mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.0 })); shine.visible = false; head.add(shine);

  // ---------- arms ----------
  const arms = [];
  for (const side of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(0.38 * side, 0.49, 0); chest.add(sh);
    sh.add(mesh(new THREE.SphereGeometry(0.1, 24, 16), trim));
    sh.add(mesh(new THREE.CapsuleGeometry(0.072, 0.15, 8, 16), body, 0, -0.16, 0));
    const el = new THREE.Group(); el.position.set(0, -0.31, 0); sh.add(el);
    el.add(mesh(new THREE.SphereGeometry(0.066, 18, 12), joint));
    el.add(mesh(new THREE.CapsuleGeometry(0.066, 0.12, 8, 16), body, 0, -0.13, 0));
    const hand = mesh(new THREE.SphereGeometry(0.1, 24, 16), body, 0, -0.29, 0.01); hand.scale.set(1, 1.08, 0.86); el.add(hand);
    el.add(mesh(new THREE.SphereGeometry(0.042, 14, 10), body, -0.07 * side, -0.25, 0.06));
    el.add(mesh(new THREE.TorusGeometry(0.07, 0.01, 6, 24), trim, 0, -0.19, 0)).rotation.x = Math.PI / 2;
    arms.push({ sh, el, side });
  }

  // ---------- posing ----------
  const P = { t: 0, lookX: 0, lookY: 0, talk: 0, blink: 0, walk: 0, walkPhase: 0, wave: 0, jump: 0, thrown: 0, power: 1, sleep: 0 };
  const L = (a, b, k) => a + (b - a) * k;
  function pose(dt = 1 / 60) {
    P.t += dt;
    const t = P.t, w = P.walk, ph = P.walkPhase, j = P.jump, th = P.thrown, wv = P.wave, pw = P.power;
    // breathing and bob
    rig.position.y = Math.sin(t * 2.1) * 0.012 * (1 - w) + Math.abs(Math.sin(ph)) * 0.05 * w + j * 0.04;
    chest.scale.set(1 + Math.sin(t * 2.1) * 0.006, 1 + Math.sin(t * 2.1) * 0.01, 1);
    chest.rotation.x = L(0.02, 0.12, w) - j * 0.12 + th * -0.15 + P.sleep * 0.25;
    // legs
    legs.forEach(({ hip, knee, ankle, side }, i) => {
      const s = i === 0 ? 1 : -1, swing = Math.sin(ph) * 0.55 * s * w;
      hip.rotation.x = swing - j * 0.7 + th * 0.25 * s;
      hip.rotation.z = th * 0.35 * side + j * 0.06 * side;
      knee.rotation.x = Math.max(0, -Math.sin(ph) * s) * 0.9 * w + j * 1.25 + th * 0.4;
      ankle.rotation.x = -knee.rotation.x * 0.45 - hip.rotation.x * 0.3;
    });
    // arms
    arms.forEach(({ sh, el, side }, i) => {
      const s = i === 0 ? -1 : 1, swing = Math.sin(ph) * 0.45 * s * w;
      let z = 0.12 * side + j * 0.35 * side + th * 2.55 * side, x = swing - j * 0.4, ez = 0, ex = -0.25 - j * 0.6;
      if (side === 1 && wv > 0) { z = L(z, 2.65, wv); x = L(x, 0, wv); ez = L(ez, Math.sin(t * 9) * 0.45, wv); ex = L(ex, -0.15, wv); }
      sh.rotation.z = z; sh.rotation.x = x - P.sleep * 0.2; el.rotation.z = ez; el.rotation.x = ex;
    });
    // head
    head.rotation.y = P.lookX * 0.55; head.rotation.x = -P.lookY * 0.32 + Math.sin(t * 6) * 0.025 * P.talk + P.sleep * 0.45;
    head.rotation.z = -P.lookX * 0.08 + th * 0.12;
    antenna.rotation.z = Math.sin(t * 3.1) * 0.06 + P.lookX * -0.15;
    // face and lights
    const eyeOpen = Math.max(0.08, (1 - P.blink) * (1 - P.sleep * 0.92)) * (1 + th * 0.35);
    eyeL.scale.set(1 + th * 0.3, eyeOpen, 1); eyeR.scale.set(1 + th * 0.3, eyeOpen, 1);
    mouth.scale.set(1 + P.talk * 3.2 + th * 2.2, 1 + P.talk * 0.6 + th * 0.6, 1);
    const glow = pw * (0.55 + P.talk * 0.45 + th * 0.2);
    [eyeL, eyeR, mouth, core, bulb].forEach((m) => (m.visible = pw > 0.05));
    lightM.color.copy(lightCol).multiplyScalar(0.35 + 0.65 * pw);
    coreHalo.material.opacity = 0.25 + glow * 0.55; bulbHalo.material.opacity = 0.2 + glow * 0.5;
    eyeHalos.forEach((h) => (h.material.opacity = (0.25 + glow * 0.45) * (eyeOpen > 0.3 ? 1 : 0.3)));
    if (root.userData.shadow) { const lift = Math.max(0, rig.position.y) + j * 0.1; root.userData.shadow.material.opacity = 1 - Math.min(0.7, lift * 2); root.userData.shadow.scale.setScalar(1 - Math.min(0.4, lift)); }
  }
  pose(0);
  return { root, rig, head, P, pose, finish: F, materials: { body, trim, joint, glass, lightM }, parts: { arms, legs, chest, neck, antenna, core, eyes: [eyeL, eyeR], eyeHalos, bulbHalo, coreHalo } };
}

// Studio lighting that flatters him: soft key, cool fill, warm rim, and a room for reflections.
export function lightStudio(scene, renderer, { env = 0.6, rimColor = 0xffc66d } = {}) {
  const { RoomEnvironment } = scene.userData.__room || {};
  const key = new THREE.DirectionalLight(0xfff4e6, 2.4); key.position.set(3, 5, 4); scene.add(key);
  const fill = new THREE.DirectionalLight(0x9fb4ff, 0.7); fill.position.set(-4, 2, 3); scene.add(fill);
  const rim = new THREE.DirectionalLight(rimColor, 2.2); rim.position.set(-2.5, 3, -4); scene.add(rim);
  const rim2 = new THREE.DirectionalLight(0x8fb0ff, 1.4); rim2.position.set(3, 2, -4); scene.add(rim2);
  scene.add(new THREE.HemisphereLight(0x8a96b8, 0x05070d, 0.35));
  return { key, fill, rim, rim2 };
}
