// The cursor bends space. A small velocity field (a fraction of screen size) is stirred by how the cursor
// moves, carries itself along, and fades; the final pass reads it to bend and split the image behind the
// cursor, plus a faint lens that sits under the pointer like a mass in space. Off for touch and reduced motion.
import * as THREE from "three";

export function createDistort(renderer, { LOW }) {
  const W = LOW ? 160 : 224, H = Math.round(W * 0.5625);
  const mk = () => new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
  let a = mk(), b = mk();
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), scene = new THREE.Scene();
  const mat = new THREE.ShaderMaterial({
    uniforms: { tPrev: { value: a.texture }, uMouse: { value: new THREE.Vector2(0.5, 0.5) }, uVel: { value: new THREE.Vector2() }, uAspect: { value: 1 }, uDecay: { value: 0.955 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }",
    fragmentShader: `uniform sampler2D tPrev; uniform vec2 uMouse, uVel; uniform float uAspect, uDecay; varying vec2 vUv;
      void main(){
        vec2 v0 = texture2D(tPrev, vUv).xy;
        vec2 v = texture2D(tPrev, vUv - v0 * .018).xy * uDecay;            // the field carries itself and fades
        vec2 d = (vUv - uMouse) * vec2(uAspect, 1.); float g = exp(-dot(d, d) / .0018);
        v += uVel * g;
        gl_FragColor = vec4(clamp(v, -1., 1.), 0., 1.);
      }`,
    depthTest: false, depthWrite: false,
  });
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
  const m = { x: 0.5, y: 0.5, px: 0.5, py: 0.5, lx: 0.5, ly: 0.5, on: false };
  const fine = matchMedia("(pointer: fine)").matches && !matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (fine) addEventListener("pointermove", (e) => { m.x = e.clientX / innerWidth; m.y = 1 - e.clientY / innerHeight; m.on = true; }, { passive: true });
  return {
    enabled: fine,
    get texture() { return a.texture; },
    lens: m,
    update(dt) {
      if (!fine) return;
      const vx = (m.x - m.px) / Math.max(dt, 1e-3), vy = (m.y - m.py) / Math.max(dt, 1e-3); m.px = m.x; m.py = m.y;
      m.lx += (m.x - m.lx) * (1 - Math.exp(-dt * 7)); m.ly += (m.y - m.ly) * (1 - Math.exp(-dt * 7));
      mat.uniforms.tPrev.value = a.texture; mat.uniforms.uMouse.value.set(m.x, m.y); mat.uniforms.uVel.value.set(Math.max(-4, Math.min(4, vx)) * 0.06, Math.max(-4, Math.min(4, vy)) * 0.06);
      mat.uniforms.uAspect.value = innerWidth / innerHeight;
      const prev = renderer.getRenderTarget(); renderer.setRenderTarget(b); renderer.render(scene, cam); renderer.setRenderTarget(prev);
      const t = a; a = b; b = t;
    },
  };
}
