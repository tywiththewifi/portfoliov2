import * as THREE from 'three';

// The wireframe scan, after the hero of ThreeUI's Sunseto template:
//   build: once, when the scene is first shown, a level plane rises through
//          the set. Above it the set is a pale study with a faint ink drawing
//          of its edges; at the plane, a bright cut line, a glowing band and
//          a world-space grid; below it, the finished render, its edges
//          cooling from bright to nothing.
//   sweep: then, every twelve seconds, an upright plane crosses the set
//          diagonally, fading in and out: nothing is hidden, a thin band
//          with the grid lights the surfaces and the edges glow, with dashes
//          running along them.
// Sunseto's house is about ten times the desk's size, so its distances
// (band widths, grid cell, glow falloffs) are a tenth of the original's; the
// timings are the original's. One set of uniforms drives every patched
// material, the edge drawing and the floor grid. Colours are set per mode
// in `LOOKS` (src/scene/index.ts).
export const SCAN = {
  uScanPos: { value: 1e6 }, // the plane: distance along the axis
  uScanAxis: { value: new THREE.Vector3(0, 1, 0) },
  uScanOn: { value: 0 }, // 1 while building
  uScanK: { value: 0 }, // strength
  uScanTime: { value: 0 },
  uScanCol: { value: new THREE.Color() }, // the band's light on surfaces
  uScanPaint: { value: 0 }, // 0: the band adds light (night); 1: it paints the colour on (day)
  uScanLine: { value: new THREE.Color() }, // the edges
  uScanInk: { value: new THREE.Color() }, // edges ahead of the build
  uScanGhost: { value: new THREE.Color() }, // the study ahead of the build
};

type ScanState = { pos?: number; axis?: THREE.Vector3; on?: number; k?: number };
function scanSet({ pos = 1e6, axis, on = 0, k = 0 }: ScanState = {}) {
  SCAN.uScanPos.value = pos;
  SCAN.uScanOn.value = on;
  SCAN.uScanK.value = k;
  if (axis) SCAN.uScanAxis.value.copy(axis);
}
export const scanOff = () => scanSet();
// is the build running? (the scene dims while it does)
export const scanBuilding = () => SCAN.uScanOn.value > 0.5 && SCAN.uScanK.value > 0;

const V_DECL = 'varying vec3 vScanW;';
const V_MAIN = `
  { vec4 sw = vec4(transformed, 1.0);
    #ifdef USE_INSTANCING
      sw = instanceMatrix * sw;
    #endif
    vScanW = (modelMatrix * sw).xyz; }`;
const F_DECL = `varying vec3 vScanW;
  uniform float uScanPos, uScanOn, uScanK, uScanPaint;
  uniform vec3 uScanAxis, uScanCol, uScanGhost;
  // a 4 cm lattice in world space, one pixel wide
  float scanGrid(vec3 p) { vec3 q = p * 25.0; vec3 g = abs(fract(q - 0.5) - 0.5) / max(fwidth(q), vec3(1e-4)); return 1.0 - clamp(min(min(g.x, g.y), g.z), 0.0, 1.0); }`;
const F_AHEAD = `
  float scanD = dot(vScanW, uScanAxis) - uScanPos;
  float scanAhead = uScanOn > 0.5 ? smoothstep(0.0, 0.025, scanD) : 0.0;`;
// ahead of the build plane the set is already there as a pale study: the
// shading kept, the colour washed out
const F_GHOST = `
  if (scanAhead > 0.0) {
    float gl = dot(outgoingLight, vec3(0.2126, 0.7152, 0.0722));
    vec3 ghost = uScanGhost * (0.62 + 0.55 * gl / (gl + 0.35));
    outgoingLight = mix(outgoingLight, ghost, scanAhead * 0.78);
  }`;
const F_GLOW = `
  if (uScanK > 0.0) {
    float fw = max(fwidth(scanD), 1e-4);
    float cut = 1.0 - smoothstep(0.0, fw * 1.8, abs(scanD)); // 1-2 px bright line where the plane cuts
    float band = exp(-abs(scanD) * 90.0);
    float near = exp(-abs(scanD) * 32.0);
    float grid = scanGrid(vScanW) * near;
    outgoingLight = mix(outgoingLight, outgoingLight * 0.55, near * 0.6); // the lit band reads against a darker surface
    vec3 lit = outgoingLight + uScanCol * uScanK * (cut * 6.0 + band * 0.9 + grid * 1.1);
    vec3 painted = mix(outgoingLight, uScanCol, clamp(uScanK * (cut * 1.2 + band * 0.45 + grid * 0.7), 0.0, 1.0));
    outgoingLight = mix(lit, painted, uScanPaint);
  }`;

function patch(m: THREE.Material, glow: boolean) {
  if (m.userData.scan || !(m instanceof THREE.MeshStandardMaterial || m instanceof THREE.MeshBasicMaterial)) return;
  m.userData.scan = true;
  const prev = m.onBeforeCompile.bind(m);
  m.onBeforeCompile = (sh, r) => {
    prev(sh, r);
    Object.assign(sh.uniforms, SCAN);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\n' + V_DECL)
      .replace('#include <project_vertex>', V_MAIN + '\n#include <project_vertex>');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + F_DECL)
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n' + F_AHEAD)
      .replace('#include <opaque_fragment>', F_GHOST + (glow ? F_GLOW : '') + '\n#include <opaque_fragment>');
  };
  m.customProgramCacheKey = () => `${m.type}|scan|${glow ? 1 : 0}`;
  m.needsUpdate = true;
}

// Patch every lit and self-lit material under `root`.
export function applyScan(root: THREE.Object3D) {
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    (Array.isArray(o.material) ? o.material : [o.material]).forEach((m: THREE.Material) => patch(m, true));
  });
}

// The set's feature edges (creases sharper than `threshold` degrees), merged
// in world space into one drawing that the scan lights.
export function scanWireframe(root: THREE.Object3D, { threshold = 24, skip = (_: THREE.Mesh): boolean => false } = {}) {
  root.updateMatrixWorld(true);
  const pos: number[] = [];
  const v = new THREE.Vector3();
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || o instanceof THREE.InstancedMesh || skip(o)) return;
    const g = o.geometry as THREE.BufferGeometry;
    if (!g.attributes.position || g.attributes.position.count > 60000) return;
    const eg = new THREE.EdgesGeometry(g, threshold), p = eg.attributes.position;
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld); pos.push(v.x, v.y, v.z); }
    eg.dispose();
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, toneMapped: false,
    uniforms: SCAN,
    vertexShader: /* glsl */ `
      varying vec3 vW;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
        gl_Position.z -= 0.0002 * gl_Position.w; // just in front of the surfaces they outline
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vW;
      uniform float uScanPos, uScanOn, uScanK, uScanTime;
      uniform vec3 uScanAxis, uScanLine, uScanInk;
      void main() {
        float d = dot(vW, uScanAxis) - uScanPos;
        vec3 col; float a;
        if (uScanOn > 0.5 && d > 0.0) {
          // ahead of the build: a faint ink drawing of every edge, a little hot just above the plane
          float hot = clamp(exp(-d * 22.0) * uScanK, 0.0, 1.0);
          col = mix(uScanInk, mix(uScanLine, vec3(1.0), 0.3), hot); a = 0.3 + 0.6 * hot;
        } else if (uScanOn > 0.5) {
          // just built: the edges cool from bright to nothing
          a = exp(d * 80.0) * 0.9 * uScanK; col = uScanLine;
        } else {
          if (uScanK <= 0.0) discard;
          a = exp(-abs(d) * 26.0) * 0.9 * uScanK; col = uScanLine;
        }
        if (a < 0.004) discard;
        // dashes travelling along the wires read as data moving through them
        float dash = 0.7 + 0.3 * sin(dot(vW, vec3(90.0, 130.0, 70.0)) - uScanTime * 6.0);
        gl_FragColor = vec4(col, a * mix(1.0, dash, step(0.5, uScanK)));
        #include <colorspace_fragment>
      }`,
  });
  const lines = new THREE.LineSegments(geo, mat);
  lines.frustumCulled = false;
  lines.renderOrder = 10;
  lines.name = 'scan-wireframe';
  return lines;
}

// Build once, from `y0` to `y1`, when first shown; then sweep along `axis`
// from `x0` to `x1` every `period` seconds.
export function scanTimeline({ y0, y1, x0, x1, axis, buildDur = 3.2, period = 12, sweepDur = 2.8, k = 1 }:
  { y0: number; y1: number; x0: number; x1: number; axis: THREE.Vector3; buildDur?: number; period?: number; sweepDur?: number; k?: number }) {
  let start = -1;
  const up = new THREE.Vector3(0, 1, 0);
  const lerp = THREE.MathUtils.lerp;
  return {
    begin(t: number) { if (start < 0) start = t; },
    apply(t: number) {
      SCAN.uScanTime.value = t;
      const e = start < 0 ? -1 : t - start;
      // not begun: nothing built yet
      if (e < 0) return scanSet({ pos: y0 - 1, axis: up, on: 1, k: 0 });
      if (e < buildDur) {
        const u = e / buildDur, eased = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
        return scanSet({ pos: lerp(y0, y1, eased), axis: up, on: 1, k });
      }
      const c = (e - buildDur) % period;
      if (c < sweepDur) {
        const u = c / sweepDur;
        return scanSet({ pos: lerp(x0, x1, u), axis, on: 0, k: k * 0.55 * Math.sin(u * Math.PI) });
      }
      scanOff();
    },
  };
}
