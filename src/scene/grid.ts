import * as THREE from 'three';
import { MINT } from './mats';

// The floor: an infinite-looking grid drawn in a shader on a large
// transparent plane at y = 0. Quarter-unit cells with a major line every
// four, antialiased with screen-space derivatives; lines fade out between
// `near` and `far` units from the origin so the grid resolves out of the
// void around the desk; the two centre axes are a faint mint.
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
    },
    vertexShader: /* glsl */ `
      varying vec3 vW;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uCell, uMajor, uNear, uFar;
      uniform vec3 uMinor, uMajorCol, uMint;
      varying vec3 vW;
      // 1 on a line one pixel wide, 0 off it
      float lines(vec2 p, float s) {
        vec2 q = p / s;
        vec2 g = abs(fract(q - 0.5) - 0.5) / fwidth(q);
        return 1.0 - min(min(g.x, g.y), 1.0);
      }
      void main() {
        vec2 p = vW.xz;
        float minor = lines(p, uCell);
        float major = lines(p, uCell * uMajor);
        vec2 ax = abs(p) / fwidth(p);
        float axis = 1.0 - min(min(ax.x, ax.y), 1.0);
        // minor lines also fade where they crowd together toward the horizon
        float crowd = 1.0 - smoothstep(0.25, 0.6, max(fwidth(p.x), fwidth(p.y)) / uCell);
        float fade = 1.0 - smoothstep(uNear, uFar, length(p));
        vec3 col = mix(uMinor, uMajorCol, major);
        col = mix(col, uMint, axis * 0.8);
        float a = max(max(minor * 0.5 * crowd, major * 0.75), axis * 0.55);
        gl_FragColor = vec4(col, a * fade);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = -1;
  mesh.name = 'floor-grid';
  return mesh;
}
