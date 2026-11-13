// A portal gate: a short tunnel of hull that assembles itself in open space as Otto approaches.
// Three rings of armoured plates fly in out of the dark and lock (the flared mouth first, then the far end,
// then the middle); truss beams run the length between them; steady accent strips fade up along the
// inside; four pylons extend; dust is drawn into orbit; the event horizon (a lensing throat) opens last. `build` (0..1)
// follows how close Otto is, so the assembly plays as you scroll toward it and rewinds if you scroll back.
// Every light here is steady: things fade up, nothing blinks.
// Local +z is the direction of travel (the gate is turned to face along the route).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export function createGate({ accent, LOW, env }) {
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const acc = new THREE.Color(accent), ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();   // the same gate every load
  const group = new THREE.Group(), spin = new THREE.Group(); group.add(spin);
  const N = LOW ? 14 : 18, R1 = 4.6, R2 = 5.9, span = (Math.PI * 2) / N;
  const RINGS = [{ z: -2.7, s: 1.14, d0: 0.0 }, { z: 2.7, s: 0.96, d0: 0.13 }, { z: 0, s: 1, d0: 0.26 }];   // mouth, far end, middle

  // one hull plate: a deep annular sector, with a raised spine along its outside and a lip on the inside
  const sector = (r1, r2, a, depth, bevel) => { const sh = new THREE.Shape(); sh.absarc(0, 0, r2, -a, a, false); sh.absarc(0, 0, r1, a, -a, true);
    const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 2, curveSegments: 8 }); g.translate(0, 0, -depth / 2); return g; };
  const plateGeo = mergeGeometries([
    sector(R1, R2, span * 0.45, 1.25, 0.07),
    sector(R2 + 0.02, R2 + 0.3, span * 0.16, 0.8, 0.04),     // the spine
    sector(R1 - 0.16, R1 + 0.02, span * 0.3, 0.32, 0.03),    // the inner lip
  ].map((g) => g.toNonIndexed()));
  const hull = new THREE.MeshStandardMaterial({ color: 0x2a2e36, metalness: 0.82, roughness: 0.4, envMapIntensity: 1.05 });
  const plates = new THREE.InstancedMesh(plateGeo, hull, N * 3); plates.frustumCulled = false; spin.add(plates);
  // each panel a slightly different shade, like real hull
  const shade = new THREE.Color(); for (let i = 0; i < N * 3; i++) plates.setColorAt(i, shade.setScalar(0.78 + rnd() * 0.34));
  plates.instanceColor.needsUpdate = true;

  // the plates' paths in: from far out in space, tumbling, to their place on the ring
  const seeds = [];
  RINGS.forEach((ring, ri) => { for (let i = 0; i < N; i++) {
    const dir = V(rnd() - 0.5, rnd() - 0.5, -(0.3 + rnd() * 0.7)).normalize();
    seeds.push({ ring, ri, i, from: dir.multiplyScalar(40 + rnd() * 40), spin: V((rnd() - 0.5) * 7, (rnd() - 0.5) * 7, (rnd() - 0.5) * 7), delay: ring.d0 + (i / N) * 0.24 + rnd() * 0.05 });
  } });

  // greebles: small blocks on the outside of every plate, carried with it
  const gPer = LOW ? 1 : 2, gOff = [];
  const greebles = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), hull, N * 3 * gPer); greebles.frustumCulled = false; spin.add(greebles);
  for (let k = 0; k < N * 3 * gPer; k++) gOff.push(new THREE.Matrix4().compose(V(Math.cos((rnd() - 0.5) * span * 0.7) * (R2 + 0.12), Math.sin((rnd() - 0.5) * span * 0.7) * (R2 + 0.12), (rnd() - 0.5) * 0.9), new THREE.Quaternion(), V(0.18 + rnd() * 0.25, 0.3 + rnd() * 0.5, 0.2 + rnd() * 0.35)));

  // steady light strips along the inside of each plate (they fade up as the plate locks)
  const strips = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 1, 0.07), new THREE.MeshBasicMaterial({ color: 0xffffff }), N * 3); strips.frustumCulled = false; spin.add(strips);
  const stripCol = acc.clone().lerp(new THREE.Color(1, 1, 1), 0.5).multiplyScalar(0.38) /* faint marker lights, not light bars */, dark = new THREE.Color(0, 0, 0), tmpC = new THREE.Color();
  for (let i = 0; i < N * 3; i++) strips.setColorAt(i, dark);

  // truss beams running the length of the tunnel, between the plates
  const beams = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 0.2, 1), hull, N); beams.frustumCulled = false; spin.add(beams);
  // four pylons out of the middle ring, each with a small steady light at the tip
  const pylons = [0, 1, 2, 3].map((k) => {
    const g = new THREE.Group(); g.rotation.z = Math.PI / 4 + (k * Math.PI) / 2; spin.add(g);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.26, 1, 0.5), hull); g.add(arm);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), new THREE.MeshBasicMaterial({ color: acc.clone().multiplyScalar(1.6) })); g.add(tip);
    return { arm, tip };
  });
  // two gyroscope rings inside the opening, turning slowly
  const gyroA = new THREE.Mesh(new THREE.TorusGeometry(3.9, 0.07, 12, 220), hull);   // machined metal rings, lit by the scene
  const gyroB = new THREE.Mesh(new THREE.TorusGeometry(3.45, 0.055, 12, 220), hull);
  group.add(gyroA, gyroB);
  // the event horizon, as light would really behave at a throat: the sky behind it is bent round the opening
  // (more the closer it passes), a thin photon ring burns at the rim, and the middle is the dark way through.
  // It also marks the stencil, so the wormhole beyond is seen only through it.
  const horizon = new THREE.Mesh(new THREE.CircleGeometry(R1 - 0.1, 128), new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uOn: { value: 0 }, uEnv: { value: env } }, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    stencilWrite: true, stencilFunc: THREE.AlwaysStencilFunc, stencilRef: 1, stencilZPass: THREE.ReplaceStencilOp,
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }",
    fragmentShader: `uniform samplerCube uEnv; uniform float uT, uOn; varying vec2 vUv;
      void main(){ vec2 c = vUv - .5; float r = length(c) * 2., a = atan(c.y, c.x);
        float bend = .55 / max(r, .1), tw = a + bend * .7 + uT * .04;
        vec3 sky = textureCube(uEnv, normalize(vec3(cos(tw) * r, sin(tw) * r, -.4 - bend * .25))).rgb * 2.6;
        float ring = exp(-pow((r - .93) / .018, 2.)) * 1.4 + exp(-pow((r - .93) / .08, 2.)) * .22;
        float throat = smoothstep(.12, .7, r);
        vec3 col = sky * throat * smoothstep(1., .82, r) + vec3(.93, .96, 1.) * ring;
        float open = smoothstep(1. - uOn - .1, 1. - uOn + .02, r);
        gl_FragColor = vec4(col * (1. - smoothstep(.97, 1., r)) * open * uOn, 1.);
      }`,
  }));
  horizon.renderOrder = 50;
  group.add(horizon);
  // dust drawn into a slow orbit round the hull
  const dn = LOW ? 260 : 520, dpos = new Float32Array(dn * 3), dsd = [];
  for (let i = 0; i < dn; i++) dsd.push({ a: rnd() * 6.283, r: R2 + 0.4 + rnd() * 2.6, z: (rnd() - 0.5) * 6, from: V(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize().multiplyScalar(10 + rnd() * 18), sp: 0.05 + rnd() * 0.16 });
  const dg = new THREE.BufferGeometry(); dg.setAttribute("position", new THREE.BufferAttribute(dpos, 3));
  const dotTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 32; const g = c.getContext("2d"), r = g.createRadialGradient(16, 16, 0, 16, 16, 16); r.addColorStop(0, "#fff"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); })();
  const dm = new THREE.PointsMaterial({ size: 0.1, map: dotTex, color: acc.clone().lerp(new THREE.Color(1, 1, 1), 0.5).multiplyScalar(0.9), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
  const dust = new THREE.Points(dg, dm); dust.frustumCulled = false; group.add(dust);

  const m4 = new THREE.Matrix4(), m5 = new THREE.Matrix4(), mS = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = V(), sc = V();
  function update(t, build, dt) {
    group.visible = build > 0.004;
    if (!group.visible) return;
    // plates fly in and lock, ring by ring, each on its own beat; greebles ride on them; strips fade up as each locks
    seeds.forEach((sd, j) => {
      const k = ss(sd.delay, sd.delay + 0.36, build), ang = sd.i * span, rs = sd.ring.s;
      p.copy(sd.from).multiplyScalar((1 - k) * (1 - k)); p.z += sd.ring.z;
      e.set(sd.spin.x * (1 - k), sd.spin.y * (1 - k), ang + sd.spin.z * (1 - k)); q.setFromEuler(e);
      m4.compose(p, q, sc.set(rs, rs, 1).multiplyScalar(0.4 + 0.6 * k)); plates.setMatrixAt(j, m4);
      const gk = Math.max(0.001, ss(0.8, 1, k)); mS.makeScale(gk, gk, gk);   // the small blocks appear only as their plate docks (no loose cubes in the sky)
      for (let g = 0; g < gPer; g++) { m5.multiplyMatrices(m4, gOff[j * gPer + g]).multiply(mS); greebles.setMatrixAt(j * gPer + g, m5); }
      const lit = ss(0.9, 1, k) * ss(0.45, 0.75, build);
      e.set(0, 0, ang); q.setFromEuler(e);
      p.set(Math.cos(ang) * (R1 - 0.2) * rs, Math.sin(ang) * (R1 - 0.2) * rs, sd.ring.z + 0.5);
      m4.compose(p, q, sc.set(1, span * R1 * rs * 0.62, 1)); strips.setMatrixAt(j, m4);
      strips.setColorAt(j, tmpC.copy(stripCol).multiplyScalar(lit));
    });
    plates.instanceMatrix.needsUpdate = true; greebles.instanceMatrix.needsUpdate = true; strips.instanceMatrix.needsUpdate = true; strips.instanceColor.needsUpdate = true;
    // the truss runs out from the middle once the rings are in
    for (let i = 0; i < N; i++) {
      const g = ss(0.55 + (i / N) * 0.12, 0.74 + (i / N) * 0.12, build), ang = (i + 0.5) * span, r = (R1 + R2) / 2 + 0.75;
      e.set(0, 0, ang); q.setFromEuler(e); p.set(Math.cos(ang) * r, Math.sin(ang) * r, 0);
      m4.compose(p, q, sc.set(1, 1, Math.max(0.001, g * 6.2))); beams.setMatrixAt(i, m4);
    }
    beams.instanceMatrix.needsUpdate = true;
    pylons.forEach((py, k) => { const g = ss(0.66 + k * 0.03, 0.86 + k * 0.03, build); py.arm.scale.y = Math.max(0.001, g * 3); py.arm.position.y = R2 + 0.2 + 1.5 * g; py.tip.position.y = R2 + 0.3 + 3 * g; py.tip.visible = g > 0.05; py.tip.scale.setScalar(Math.max(0.001, g)); });
    const gy = ss(0.7, 0.9, build);
    gyroA.scale.setScalar(Math.max(0.001, gy)); gyroB.scale.setScalar(Math.max(0.001, gy));
    gyroA.rotation.set(t * 0.32 + 0.4, t * 0.21, 0); gyroB.rotation.set(-t * 0.24, t * 0.38 + 0.9, 0.3);
    horizon.material.uniforms.uT.value = t; horizon.material.uniforms.uOn.value = ss(0.82, 1, build);
    // the dust gathers into orbit
    const dk = ss(0.35, 0.85, build); dm.opacity = dk;
    dsd.forEach((d, i) => { const a = d.a + t * d.sp; dpos[i * 3] = Math.cos(a) * d.r + d.from.x * (1 - dk); dpos[i * 3 + 1] = Math.sin(a) * d.r + d.from.y * (1 - dk); dpos[i * 3 + 2] = d.z + d.from.z * (1 - dk); });
    dg.attributes.position.needsUpdate = true;
    spin.rotation.z = t * 0.025;
  }
  return { group, update };
}
