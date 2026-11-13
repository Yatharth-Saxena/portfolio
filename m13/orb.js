// The liquid-chrome orb from the flat version, and the ring of dust that orbits it.
import * as THREE from "three";

export function chromeOrb() {
    const NOISE = `vec3 m289(vec3 x){return x-floor(x*(1./289.))*289.;} vec4 m289(vec4 x){return x-floor(x*(1./289.))*289.;}
    vec4 perm(vec4 x){return m289(((x*34.)+1.)*x);} vec4 tis(vec4 r){return 1.79284291400159-.85373472095314*r;}
    float snoise(vec3 v){const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.); vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
     vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;i=m289(i); vec4 p=perm(perm(perm(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
     float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_); vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
     vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww; vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
     vec4 norm=tis(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w; vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m; return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}
    uniform float uT, uAmp; vec3 flow(vec3 p){ float n = snoise(p*.55 + vec3(0., uT*.16, uT*.11)) * .7 + snoise(p*1.15 - vec3(uT*.12)) * .12; return p + normalize(p) * n * uAmp; }`;
    const mat = new THREE.MeshPhysicalMaterial({ color: 0x70747d, metalness: 1, roughness: 0.1, clearcoat: 0.6, clearcoatRoughness: 0.05, iridescence: 0.3, iridescenceIOR: 1.6, iridescenceThicknessRange: [180, 520], envMapIntensity: 0.42 });
    const U = { uT: { value: 0 }, uAmp: { value: 0.3 } };
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\n" + NOISE)
        .replace("#include <beginnormal_vertex>", `vec3 pp = flow(position); vec3 tng = normalize(cross(normal, abs(normal.y) < .99 ? vec3(0.,1.,0.) : vec3(1.,0.,0.))); vec3 btg = normalize(cross(normal, tng)); float e = .012;
          vec3 objectNormal = normalize(cross(flow(position + tng*e) - pp, flow(position + btg*e) - pp)); if (dot(objectNormal, normal) < 0.) objectNormal = -objectNormal;`)
        .replace("#include <begin_vertex>", "vec3 transformed = pp;");
    };
    return { mesh: new THREE.Mesh(new THREE.IcosahedronGeometry(1.55, 44), mat), U };
  }

  // a flat ring of dust orbiting a point (it passes in front of and behind the orb)
export function dustRing(R, accent) {
    const n = 5000, g = new THREE.BufferGeometry(), a = new Float32Array(n * 3);
    for (let k = 0; k < n; k++) a.set([Math.random(), (Math.random() + Math.random() + Math.random() - 1.5) * 0.7, Math.random()], k * 3);
    g.setAttribute("position", new THREE.BufferAttribute(a, 3));
    const m = new THREE.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uR: { value: R }, uAcc: { value: new THREE.Color(accent) } },
      vertexShader: `uniform float uT, uR; varying float vA, vC; void main(){ float ang = position.x * 6.2832 + uT * (.08 + position.z * .05); float r = uR + position.y * .35;
        vec3 p = vec3(cos(ang) * r, position.y * .05, sin(ang) * r); vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv;
        vC = 1. - smoothstep(0., .5, abs(position.y)); gl_PointSize = clamp((1. + pow(position.z, 6.) * 4.) * 26. / -mv.z, 1., 18.); vA = .55 + .45 * sin(uT * (1. + position.z * 2.) + position.z * 50.); }`,
      fragmentShader: `uniform vec3 uAcc; varying float vA, vC; void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, 0., d); a *= a; gl_FragColor = vec4(mix(uAcc, vec3(1.), vC * .7) * a * vA * 2.6, a * vA); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.renderOrder = 31; return pts;
  }

