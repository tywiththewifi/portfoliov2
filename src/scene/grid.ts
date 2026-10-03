import * as THREE from 'three';
import { MINT } from './mats';
import { INTRO } from './intro';

// The floor: an infinite-looking grid drawn in a shader on a large
// transparent plane at y = 0. Quarter-unit cells with a major line every
// four, antialiased with screen-space derivatives; lines fade out between
// `near` and `far` units from the origin so the grid resolves out of the
// void around the desk; the two centre axes are a faint mint. During the
// intro (src/scene/intro.ts) the grid powers on from the desk outward, its
// edge a bright ring, and a glow pools round the desk; inside the X-ray
// lens its lines turn to the line colour. Colours are uniforms
// so day and night can blend between them.
export function floorGrid(o: { cell?: number; major?: number; near?: number; far?: number } = {}) {
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      ...INTRO,
      uCell: { value: o.cell ?? 0.25 },
      uMajor: { value: o.major ?? 4 },
      uNear: { value: o.near ?? 3.5 },
      uFar: { value: o.far ?? 16 },
      uMinor: { value: new THREE.Color('#3a3a3a') },
      uMajorCol: { value: new THREE.Color('#565656') },
      uMint: { value: new THREE.Color(MINT) },
      uMinorA: { value: 0.5 },
      uMajorA: { value: 0.75 },
      uAxisA: { value: 0.55 },
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
      uniform vec3 uMinor, uMajorCol, uMint;
      uniform float uIntroOn, uFloorR, uHaze, uLensK;
      uniform vec3 uLine, uLens;
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
        float line = max(minor * crowd * 0.7, major);

        vec3 col = mix(uMinor, uMajorCol, major);
        col = mix(col, uMint, axis * 0.8);
        float a = max(max(minor * uMinorA * crowd, major * uMajorA), axis * uAxisA);

        if (uIntroOn > 0.5) {
          // powering on: nothing past the radius, a bright ring at it that
          // dims as it spreads, and a glow round the desk
          a *= 1.0 - smoothstep(uFloorR - 0.4, uFloorR, d);
          float x = (d - uFloorR) / 0.1;
          float ring = exp(-x * x) * (1.0 - smoothstep(1.5, 9.0, uFloorR));
          float haze = exp(-d * d / 1.6) * uHaze;
          col = mix(col, uLine, clamp(ring + haze * 0.6, 0.0, 1.0));
          a += ring * (line * 0.9 + 0.12) + haze * (line * 0.22 + 0.06);
        }
        if (uLensK > 0.0) {
          float lens = uLensK * (1.0 - smoothstep(uLens.z - 1.5, uLens.z, distance(gl_FragCoord.xy, uLens.xy)));
          col = mix(col, uLine, lens * 0.8);
          a += lens * (line * 0.35 + 0.03);
        }
        gl_FragColor = vec4(col, min(a, 1.0) * fade);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = -1;
  mesh.name = 'floor-grid';
  return { mesh, uniforms: mat.uniforms };
}
