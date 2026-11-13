// A wormhole: a tube along the route from a gate to the next dimension, made to look like a real throat
// through space rather than a tunnel of speed lines. Its walls show the actual sky (the baked nebula), pulled
// into the throat and smeared by your speed; thousands of thin starlight streaks with a natural spread of
// brightness (most faint, a few blazing); a soft gas drifting through; and light pouring in at the far mouth.
// From outside it is seen only through its gate's horizon (a stencil mask), never as a pipe in space.
import * as THREE from "three";

export function createWormhole({ curve, u0, u1, tintA, tintB, env, radius = 6 }) {
  const n = 64, pts = [];
  for (let i = 0; i <= n; i++) pts.push(curve.getPointAt(u0 + ((u1 - u0) * i) / n).add(new THREE.Vector3(0, 1.1, 0)));
  const path = new THREE.CatmullRomCurve3(pts), len = path.getLength();
  const geo = new THREE.TubeGeometry(path, 280, radius, 56, false);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, transparent: true, depthWrite: true, fog: false,
    stencilWrite: true, stencilFunc: THREE.EqualStencilFunc, stencilRef: 1, stencilZPass: THREE.KeepStencilOp,
    uniforms: { uEnv: { value: env }, uFlow: { value: 0 }, uT: { value: 0 }, uA: { value: new THREE.Color(...tintA) }, uB: { value: new THREE.Color(...tintB) }, uLen: { value: len } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }",
    fragmentShader: `uniform samplerCube uEnv; uniform float uFlow, uT, uLen; uniform vec3 uA, uB; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 3; i++){ s += a * n(p); p *= 2.03; a *= .5; } return s; }
      void main(){
        float along = vUv.x * uLen, fx = vUv.x, ang = vUv.y * 6.2831853;
        // the sky, pulled into the throat: each point of the wall shows starlight from a direction that slides
        // along the tube and twists slowly, averaged over a short exposure (so it smears with speed)
        vec3 sky = vec3(0.);
        for (int i = 0; i < 4; i++) {
          float z = (along - uFlow * 1.3 - float(i) * 2.6) * .04;
          float tw = ang + z * .3 + uT * .015;
          sky += textureCube(uEnv, normalize(vec3(cos(tw), sin(tw), sin(z) * 1.4))).rgb;
        }
        sky /= 4.;
        // starlight: thin lanes round the wall; a minority carry a streak; brightness follows a steep power law
        float ln = vUv.y * 620., id = floor(ln), fl = fract(ln);
        float r1 = h(vec2(id, 1.3)), r2 = h(vec2(id, 7.1)), r3 = h(vec2(id, 3.7));
        float w = smoothstep(.5, 0., abs(fl - .5) / (.16 + .3 * r3));
        float L = 26. + r2 * 110., seg = fract((along - uFlow * (.75 + r1 * .7)) / L + r1);
        float tail = smoothstep(0., .012, seg) * pow(1. - seg, 3.2) * step(.58, r2);
        float bright = pow(r1, 9.) * 9. + .12;
        vec3 star = mix(vec3(.72, .82, 1.), vec3(1., .9, .76), r3) * w * tail * bright;
        // the throat's own gas, slow and soft, in the colours of the two spaces it joins
        vec3 tint = mix(uA, uB, smoothstep(.2, .85, fx));
        float gas = fbm(vec2(vUv.y * 5. + sin(along * .012) * .6, along * .018 - uFlow * .012));
        vec3 c = sky * 1.3 + star + tint * pow(gas, 2.6) * .16;
        // light pouring in at the far mouth; the way you came falls dark behind you
        c += mix(vec3(.92, .95, 1.), tint, .35) * pow(smoothstep(.72, 1., fx), 2.2) * 1.1;
        c *= .3 + .7 * smoothstep(0., .1, fx);
        gl_FragColor = vec4(c, 1.);
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat); mesh.visible = false; mesh.frustumCulled = false; mesh.renderOrder = 51;
  // the planes you cross going in and coming out (for "is the camera inside")
  const a = path.getPointAt(0), ta = path.getTangentAt(0), b = path.getPointAt(1), tb = path.getTangentAt(1);
  const v = new THREE.Vector3();
  return {
    mesh, u0, u1,
    update(t, flow, cam) {
      mat.uniforms.uT.value = t; mat.uniforms.uFlow.value = flow;
      // inside (past the mouth, before the exit): no mask; outside: only through the gate's horizon
      const inside = v.copy(cam).sub(a).dot(ta) > 0.2 && v.copy(cam).sub(b).dot(tb) < 0;
      mat.stencilWrite = !inside;
      return v.copy(cam).sub(b).dot(tb) < 2;                  // still worth drawing
    },
  };
}
