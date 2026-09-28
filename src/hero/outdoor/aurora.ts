import * as THREE from 'three';
import { GLSL_COMMON, col, shared } from '../materials';

// Aurora curtains: tall, gently curved ribbons far off over the water. The
// shader folds them with slow travelling waves, streaks them with vertical
// rays, and runs green at the hem into teal and a pink crown. Drawn with an
// ordered-dither mask and added to the sky (alpha untouched), so they read
// as pixel light and show up in the lake's reflection.
export function buildAurora(o: { bands: { x: number; z: number; w: number; h: number; y: number; bend: number; phase: number }[]; strength: number }) {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uA: { value: col('#3cff9a') },
      uB: { value: col('#2ee0d0') },
      uC: { value: col('#ff6ea8') },
      uS: { value: o.strength },
      uSmooth: shared.uSmooth,
    },
    vertexShader: /* glsl */ `
      attribute float aPhase;
      varying vec2 vUv; varying float vPhase;
      void main(){ vUv = uv; vPhase = aPhase; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: /* glsl */ `
      ${GLSL_COMMON}
      uniform float uTime, uS, uSmooth; uniform vec3 uA, uB, uC;
      varying vec2 vUv; varying float vPhase;
      void main(){
        float x = vUv.x * 6. + vPhase;
        float fold = sin(x * 1.3 + uTime * .12) * .5 + sin(x * 3.7 - uTime * .21) * .25 + sin(x * 9. + uTime * .5) * .08;
        float rays = pow(.5 + .5 * sin(vUv.x * 70. + fold * 14. + uTime * .35), 2.) * .45 + .55;
        float hem = .12 + .07 * sin(x * 2. + uTime * .25) + .03 * sin(x * 7. - uTime * .4);
        float y = vUv.y - hem;
        if (y < 0.) discard;
        float body = smoothstep(0., .04, y) * (1. - smoothstep(.1, .95, y)) * (.55 + .45 * sin(x * .8 + uTime * .08));
        float ends = smoothstep(0., .12, vUv.x) * smoothstep(1., .88, vUv.x);
        vec3 c = mix(uA, uB, smoothstep(.02, .35, y));
        c = mix(c, uC, smoothstep(.35, .85, y));
        float a = uS * body * rays * ends;
        vec3 lit = c * (.35 + .65 * (1. - y));
        if (uSmooth > .5) { gl_FragColor = vec4(lit * min(a, 1.) * .8, 0.); return; }
        if (bayer4(gl_FragCoord.xy) > a) discard;
        gl_FragColor = vec4(lit, 0.);
      }`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.ZeroFactor,
    blendDstAlpha: THREE.OneFactor,
  });
  const g = new THREE.Group();
  for (const b of o.bands) {
    const geo = new THREE.PlaneGeometry(b.w, b.h, 60, 1);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const ph = new Float32Array(pos.count).fill(b.phase);
    for (let i = 0; i < pos.count; i++) {
      const u = pos.getX(i) / b.w; // -0.5..0.5
      pos.setZ(i, Math.sin(u * Math.PI * 1.6) * b.bend);
    }
    geo.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
    const m = new THREE.Mesh(geo, mat);
    m.position.set(b.x, b.y + b.h / 2, b.z);
    m.renderOrder = -9;
    m.frustumCulled = false;
    g.add(m);
  }
  return { group: g, tick: (t: number) => { mat.uniforms.uTime.value = t; } };
}
