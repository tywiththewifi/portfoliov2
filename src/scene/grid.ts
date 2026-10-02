import * as THREE from 'three';
import { MINT } from './mats';

// The floor: an infinite-looking grid drawn in a shader on a large
// transparent plane at y = 0. Quarter-unit cells with a major line every
// four, antialiased with screen-space derivatives; lines fade out between
// `near` and `far` units from the origin so the grid resolves out of the
// void around the desk; the two centre axes are a faint mint. Rings of light
// (mint by night, light grey by day) pulse outward from the desk (the
// origin) along the lines, fading out as they spread: two at a time on a
// steady beat when it's quiet, and one per beat of the music while it plays
// (`beat()`). Colours and strengths are uniforms so day and night can blend
// between them.
export function floorGrid(o: { cell?: number; major?: number; near?: number; far?: number } = {}) {
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uCell: { value: o.cell ?? 0.25 },
      uMajor: { value: o.major ?? 4 },
      uNear: { value: o.near ?? 3.5 },
      uFar: { value: o.far ?? 16 },
      uMinor: { value: new THREE.Color('#3a3a3a') },
      uMajorCol: { value: new THREE.Color('#565656') },
      uMint: { value: new THREE.Color(MINT) },
      uRing: { value: new THREE.Color(MINT) },
      uRingA: { value: 1 },
      uMinorA: { value: 0.5 },
      uMajorA: { value: 0.75 },
      uAxisA: { value: 0.55 },
      // pulse: seconds, strength (0 = off), seconds between rings, how far they travel
      uTime: { value: 0 },
      uPulse: { value: 1 },
      // rings set off by the music: birth times (seconds), strengths, lifetime
      uBeats: { value: new THREE.Vector4(-99, -99, -99, -99) },
      uBeatAmp: { value: new THREE.Vector4() },
      uBeatLife: { value: 1.8 },
      uPeriod: { value: 4.2 },
      uReach: { value: 9 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vW;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uCell, uMajor, uNear, uFar, uMinorA, uMajorA, uAxisA;
      uniform float uTime, uPulse, uPeriod, uReach, uRingA, uBeatLife;
      uniform vec4 uBeats, uBeatAmp;
      uniform vec3 uMinor, uMajorCol, uMint, uRing;
      varying vec3 vW;
      // 1 on a line one pixel wide, 0 off it
      float lines(vec2 p, float s) {
        vec2 q = p / s;
        vec2 g = abs(fract(q - 0.5) - 0.5) / fwidth(q);
        return 1.0 - min(min(g.x, g.y), 1.0);
      }
      void main() {
        vec2 p = vW.xz;
        float d = length(p);
        float minor = lines(p, uCell);
        float major = lines(p, uCell * uMajor);
        vec2 ax = abs(p) / fwidth(p);
        float axis = 1.0 - min(min(ax.x, ax.y), 1.0);
        // minor lines also fade where they crowd together toward the horizon
        float crowd = 1.0 - smoothstep(0.25, 0.6, max(fwidth(p.x), fwidth(p.y)) / uCell);
        float fade = 1.0 - smoothstep(uNear, uFar, d);

        // two steady rings, half a period apart, widening and fading as they go
        float ring = 0.0;
        for (int i = 0; i < 2; i++) {
          float k = fract(uTime / uPeriod + float(i) * 0.5);
          float w = 0.12 + k * 0.42;
          float x = (d - k * uReach) / w;
          ring += exp(-x * x) * (1.0 - k) * (1.0 - k) * smoothstep(0.0, 0.08, k);
        }
        ring *= uPulse;
        // plus one ring per beat of the music, leaving from the desk's edge
        for (int i = 0; i < 4; i++) {
          float k = (uTime - uBeats[i]) / uBeatLife;
          if (k > 0.0 && k < 1.0) {
            float w = 0.1 + k * 0.38;
            float x = (d - 0.8 - k * (uReach - 0.8)) / w;
            ring += exp(-x * x) * (1.0 - k) * (1.0 - k) * uBeatAmp[i];
          }
        }
        // strongest near the desk, gone before they reach the camera
        ring *= 1.0 - smoothstep(2.0, 7.5, d);
        float line = max(minor * crowd * 0.7, major);

        vec3 col = mix(uMinor, uMajorCol, major);
        col = mix(col, uMint, axis * 0.8);
        col = mix(col, uRing, clamp(ring * 0.85, 0.0, 1.0));
        float a = max(max(minor * uMinorA * crowd, major * uMajorA), axis * uAxisA);
        a += ring * (line * 0.45 + 0.02) * uRingA;
        gl_FragColor = vec4(col, min(a, 1.0) * fade);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = -1;
  mesh.name = 'floor-grid';
  // set off a ring from the desk now (t: the same clock as uTime)
  let next = 0;
  const beat = (t: number, strength = 1) => {
    const i = next++ % 4;
    mat.uniforms.uBeats.value.setComponent(i, t);
    mat.uniforms.uBeatAmp.value.setComponent(i, strength);
  };
  return { mesh, uniforms: mat.uniforms, beat };
}
