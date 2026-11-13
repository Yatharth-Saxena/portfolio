// The path, forming. It exists only around Otto: far ahead it is loose drifting dust; as he nears, the dust
// gathers into a road of light under his feet (two rails, cross bars, a glowing bed between them), lit
// steadily (no running pulses); behind him it lets go and drifts away. Every mote is anchored to its own
// place on the route (a sliding window over the curve), so the road builds in place rather than sliding.
import * as THREE from "three";

export function createPath({ curveTex, CN, LEN, ACC, LOW, DPR, RED }) {
  const n = LOW ? 15000 : 28000, W = 104, BACK = 30, R = Math.random;
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  const aS = new Float32Array(n), aV = new Float32Array(n), aK = new Float32Array(n), aSeed = new Float32Array(n), aScat = new Float32Array(n * 3), aSize = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const k = R(); aK[i] = k < 0.22 ? 0 : k < 0.44 ? 1 : k < 0.58 ? 2 : 3;
    aS[i] = R(); aV[i] = (R() + R() + R() - 1.5); aSeed[i] = R(); aSize[i] = 0.7 + Math.pow(R(), 6) * 1.2;
    const v = new THREE.Vector3(R() - 0.5, R() - 0.5, R() - 0.5).normalize(); aScat.set([v.x, v.y, v.z], i * 3);
  }
  [["aS", aS, 1], ["aV", aV, 1], ["aK", aK, 1], ["aSeed", aSeed, 1], ["aScat", aScat, 3], ["aSize", aSize, 1]].forEach(([nm, a, s]) => g.setAttribute(nm, new THREE.BufferAttribute(a, s)));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uCurve: { value: curveTex }, uT: { value: 0 }, uPx: { value: DPR }, uLen: { value: LEN }, uS: { value: 0 }, uOn: { value: 0 },
      uAcc: { value: new THREE.Color(ACC) }, uHi: { value: RED ? new THREE.Color(1, 0.86, 0.84) : new THREE.Color(0.84, 0.9, 1) } },
    vertexShader: `uniform sampler2D uCurve; uniform float uT, uPx, uLen, uS, uOn;
      attribute float aS, aV, aK, aSeed, aSize; attribute vec3 aScat; varying float vA, vRail, vPulse, vKind;
      vec3 row(int r, float u){ float x = clamp(u, 0., 1.) * ${CN - 1}.; int i0 = int(floor(x)); int i1 = min(i0 + 1, ${CN - 1}); return mix(texelFetch(uCurve, ivec2(i0, r), 0).xyz, texelFetch(uCurve, ivec2(i1, r), 0).xyz, fract(x)); }
      void main(){
        float W = ${W}., BACK = ${BACK}.;
        float s = uS - BACK + mod(aS * W - (uS - BACK), W);          // this mote's own place on the route
        float v;
        if (aK < .5) v = -1.35 + aV * .045;
        else if (aK < 1.5) v = 1.35 + aV * .045;
        else if (aK < 2.5) { s = floor(s / 2.6) * 2.6 + aV * .03; v = (aSeed * 2. - 1.) * 1.35; }
        else v = (aSeed * 2. - 1.) * 1.2;
        float d = s - uS;                                            // how far ahead of Otto
        float u = clamp(s / uLen, 0., 1.);
        vec3 P = row(0, u), S = row(1, u), B = row(2, u);
        vec3 target = P - B * .8 + S * v + B * aV * .04;
        float f = 1. - smoothstep(10., 64., d); f = f * f * (3. - 2. * f);
        vec3 p = mix(target + aScat * (5. + aSeed * 11.), target, f);
        float back = smoothstep(-3., -BACK + 2., d);
        p += aScat * back * 5. + vec3(0., back * 1.5, 0.);
        vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv;
        float dist = -mv.z;
        vRail = aK < 1.5 ? 1. : 0.; vKind = aK;
        vPulse = 0.;
        float front = 1. - smoothstep(W - BACK - 18., W - BACK - 2., d);
        vA = uOn * front * (1. - back) * (.18 + .82 * f) * smoothstep(.6, 2.2, dist);
        float base = aK < 1.5 ? 1.5 : aK < 2.5 ? 1.15 : .85;
        gl_PointSize = vA < .002 ? 0. : clamp(aSize * base * uPx * (26. / dist) * (1. + vPulse * .8), uPx, 18. * uPx);
      }`,
    fragmentShader: `uniform vec3 uAcc, uHi; varying float vA, vRail, vPulse, vKind;
      void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, 0., d); a *= a;
        vec3 col = vKind < 1.5 ? mix(uHi, vec3(1.), .3) * 1.25 : vKind < 2.5 ? uAcc * 1.35 + uHi * .2 : uAcc * .85;
        gl_FragColor = vec4(col * a * vA, a * vA); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(g, mat); points.frustumCulled = false; points.renderOrder = 30;
  return {
    points,
    update(t, sOtto, on) { mat.uniforms.uT.value = t; mat.uniforms.uS.value = sOtto; mat.uniforms.uOn.value = on; points.visible = on > 0.002; },
    setDPR(d) { mat.uniforms.uPx.value = d; },
  };
}
