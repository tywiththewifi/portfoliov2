import * as THREE from 'three';
import { rng } from './kit';

// The intro: the first time the hero is shown, the scene is built in front
// of you, in two steps.
//   1. Trace. Out of the black, the floor grid powers on from the desk
//      outward and a soft glow pools on it. Then the set is drawn in glowing
//      lines from the floor up, each object starting a beat after the one
//      before (the desk first, the cables last), the lines growing along
//      their length with a hot tip; behind them the surfaces appear as a
//      hologram: a monochrome render in the line colour, with a 4 cm grid
//      and faint scanlines drifting up.
//   2. Fill. Once the whole set stands there as a hologram, a bright plane
//      sweeps quickly through it on a diagonal (from bottom left to top
//      right, as you see it); behind the plane the real materials, colours
//      and shadows take over, and the lines fade away.
// Mint by night, where the light adds up like a glow; by day the darker
// mint, drawn on rather than added. With reduced motion there's no intro.
//
// Afterwards the hologram is still there to see: an X-ray lens (setLens,
// driven from the scene) shows the set inside a circle on screen as it was
// before the fill, lines, grid and all.
// One set of uniforms drives every patched material, the lines and the
// floor grid; colours are set per mode in `LOOKS` (src/scene/index.ts).

export const INTRO = {
  uIntroOn: { value: 1 }, // 0 once it's over: everything renders as normal
  uTrace: { value: -1 }, // the trace's progress, 0..1 over the build order
  uFill: { value: -99 }, // the fill plane: how far along uFillAxis it has come (m)
  uFillAxis: { value: new THREE.Vector3(0, 1, 0) },
  uY0: { value: 0 }, uY1: { value: 1 }, // the set's heights (m), for the trace
  uWire: { value: 1 }, // the lines' strength
  uFloorR: { value: 0 }, // the floor grid's radius as it powers on (m)
  uHaze: { value: 0 }, // the glow on the floor round the desk
  uIntroTime: { value: 0 },
  uLine: { value: new THREE.Color() }, // the lines and the grid
  uTip: { value: new THREE.Color() }, // their hot ends
  uHolo: { value: new THREE.Color() }, // the hologram's tint
  uPaint: { value: 0 }, // 0: light adds (night); 1: colour is drawn on (day)
  uLens: { value: new THREE.Vector3(-1e4, -1e4, 0) }, // the X-ray lens: centre and radius in drawing-buffer px
  uLensK: { value: 0 }, // and its strength
};

// inside the X-ray lens, 0..1 (a crisp edge); GLSL, for the shaders below
const LENS = `uLensK * (1.0 - smoothstep(uLens.z - 1.5, uLens.z, distance(gl_FragCoord.xy, uLens.xy)))`;

// When a point is traced, in the trace's 0..1: RISE of it comes from its
// height in the set, the rest from its object's place in the build order;
// surfaces appear just behind the lines.
const RISE = 0.58;
const LAG = 0.05;

const V_DECL = 'attribute float aBuild; varying float vBuild; varying vec3 vIntroW;';
const V_MAIN = `
  { vec4 iw = vec4(transformed, 1.0);
    #ifdef USE_INSTANCING
      iw = instanceMatrix * iw;
    #endif
    vIntroW = (modelMatrix * iw).xyz; vBuild = aBuild; }`;
const F_DECL = `varying float vBuild; varying vec3 vIntroW;
  uniform float uIntroOn, uTrace, uFill, uY0, uY1, uPaint, uIntroTime, uLensK;
  uniform vec3 uFillAxis, uLine, uHolo, uLens;
  // a 4 cm lattice in world space, one pixel wide
  float introGrid(vec3 p) { vec3 q = p * 25.0; vec3 g = abs(fract(q - 0.5) - 0.5) / max(fwidth(q), vec3(1e-4)); return 1.0 - clamp(min(min(g.x, g.y), g.z), 0.0, 1.0); }`;
// not traced yet: not there
const F_CLIP = `
  float introD = 1.0;
  if (uIntroOn > 0.5) {
    float yN = clamp((vIntroW.y - uY0) / (uY1 - uY0), 0.0, 1.0);
    if (uTrace - ${LAG.toFixed(3)} < vBuild + ${RISE.toFixed(3)} * yN) discard;
    introD = uFill - dot(vIntroW, uFillAxis); // metres; > 0 once filled
  }`;
// the hologram, then the real thing behind the fill plane (or outside the
// X-ray lens)
const F_SHADE = `
  float introLens = uLensK > 0.0 ? ${LENS} : 0.0;
  if (uIntroOn > 0.5 || introLens > 0.0) {
    float gl = dot(outgoingLight, vec3(0.2126, 0.7152, 0.0722));
    float shade = gl / (gl + 0.3);
    float grid = introGrid(vIntroW);
    float scan = 0.86 + 0.14 * sin(vIntroW.y * 520.0 - uIntroTime * 5.0);
    vec3 holoNight = uHolo * (0.025 + 0.22 * shade) * scan + uLine * grid * 0.4;
    vec3 holoDay = mix(vec3(0.95) * (0.8 + 0.2 * shade), uLine, grid * 0.6);
    vec3 holo = mix(holoNight, holoDay, uPaint);
    vec3 col = mix(holo, outgoingLight, smoothstep(0.0, 0.015, introD) * (1.0 - introLens));
    // the fill plane: a bright cut, a band of light and the grid round it
    float fw = max(fwidth(introD), 1e-5);
    float cut = 1.0 - smoothstep(0.0, fw * 1.5, abs(introD));
    float band = exp(-abs(introD) * 35.0);
    float near = exp(-abs(introD) * 11.0) * grid;
    vec3 lit = col + uLine * (cut * 4.0 + band * 1.1 + near * 0.8);
    vec3 drawn = mix(col, uLine, clamp(cut + band * 0.55 + near * 0.6, 0.0, 1.0));
    outgoingLight = mix(lit, drawn, uPaint);
  }`;

function patch(m: THREE.Material) {
  if (m.userData.intro || !(m instanceof THREE.MeshStandardMaterial || m instanceof THREE.MeshBasicMaterial)) return;
  m.userData.intro = true;
  const prev = m.onBeforeCompile.bind(m);
  m.onBeforeCompile = (sh, r) => {
    prev(sh, r);
    Object.assign(sh.uniforms, INTRO);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\n' + V_DECL)
      .replace('#include <project_vertex>', V_MAIN + '\n#include <project_vertex>');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + F_DECL)
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n' + F_CLIP)
      .replace('#include <opaque_fragment>', F_SHADE + '\n#include <opaque_fragment>');
  };
  m.customProgramCacheKey = () => `${m.type}|intro`;
  m.needsUpdate = true;
}

// The lines: every feature edge of the set (creases sharper than 24°) as a
// screen-space quad, a few pixels wide, whose fragment shader draws a thin
// core and a soft glow round the part of the edge traced so far.
function traceLines(segs: Float32Array, times: Float32Array) {
  const n = times.length / 2;
  const g = new THREE.InstancedBufferGeometry();
  // x: 0 at the edge's start, 1 at its end; y: across, -1..1
  g.setAttribute('position', new THREE.Float32BufferAttribute([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, -1, 0, 1, 1, 0, 0, 1, 0], 3));
  const a = new Float32Array(n * 3), b = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    a.set(segs.subarray(i * 6, i * 6 + 3), i * 3);
    b.set(segs.subarray(i * 6 + 3, i * 6 + 6), i * 3);
  }
  g.setAttribute('aA', new THREE.InstancedBufferAttribute(a, 3));
  g.setAttribute('aB', new THREE.InstancedBufferAttribute(b, 3));
  g.setAttribute('aT', new THREE.InstancedBufferAttribute(times, 2));
  g.instanceCount = n;
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, toneMapped: false,
    premultipliedAlpha: true,
    blending: THREE.CustomBlending,
    blendEquation: THREE.MaxEquation,
    uniforms: { ...INTRO, uRes: { value: new THREE.Vector2(1, 1) }, uPx: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute vec3 aA, aB;
      attribute vec2 aT;
      uniform vec2 uRes;
      uniform float uPx;
      varying vec2 vS, vAc, vT;
      varying float vLen;
      varying vec3 vW;
      void main() {
        float half_ = 11.0 * uPx; // the quad's half width, device px
        vec4 a = projectionMatrix * viewMatrix * vec4(aA, 1.0);
        vec4 b = projectionMatrix * viewMatrix * vec4(aB, 1.0);
        vec2 sa = a.xy / a.w * uRes * 0.5, sb = b.xy / b.w * uRes * 0.5;
        vec2 dir = sb - sa;
        float len = length(dir);
        dir = len > 1e-3 ? dir / len : vec2(1.0, 0.0);
        float side = position.x;
        vec4 p = side < 0.5 ? a : b;
        float ext = (side * 2.0 - 1.0) * half_; // ends pushed out so the glow rounds them
        p.xy += (vec2(-dir.y, dir.x) * position.y * half_ + dir * ext) / (uRes * 0.5) * p.w;
        p.z -= 0.00004 * p.w; // just in front of the surfaces they outline
        gl_Position = p;
        // along and across in px, interpolated linearly on screen (times w, over w)
        vS = vec2((side * len + ext) * p.w, p.w);
        vAc = vec2(position.y * half_ * p.w, p.w);
        vLen = len;
        vT = aT;
        vW = side < 0.5 ? aA : aB;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTrace, uFill, uWire, uPx, uLensK;
      uniform vec3 uFillAxis, uLine, uTip, uLens;
      varying vec2 vS, vAc, vT;
      varying float vLen;
      varying vec3 vW;
      void main() {
        float f = clamp((uTrace - vT.x) / max(vT.y - vT.x, 0.03), 0.0, 1.0);
        if (f <= 0.0) discard;
        float s = vS.x / vS.y, across = vAc.x / vAc.y;
        float e = f * vLen; // the traced part: 0..e px along
        float d = length(vec2(max(0.0, max(-s, s - e)), across));
        float core = exp(-d * d / (0.7 * uPx * uPx));
        float glow = exp(-d * d / (6.0 * uPx * uPx));
        vec2 tv = vec2(s - e, across);
        float tip = f < 1.0 ? exp(-dot(tv, tv) / (5.0 * uPx * uPx)) : 0.0;
        // gone once the fill has passed, flaring as it does
        float past = uFill - dot(vW, uFillAxis);
        float keep = (1.0 - smoothstep(0.025, 0.2, past)) * (1.0 + exp(-abs(past) * 24.0));
        // (and drawn whole inside the X-ray lens)
        float lens = ${LENS};
        float a = min((core * 0.85 + glow * 0.3 + tip) * max(keep * uWire, lens), 1.0);
        if (a < 0.003) discard;
        // premultiplied, so the lines can be combined by keeping the brighter
        // (by night) rather than adding up into white where they crowd
        vec4 c = linearToOutputTexel(vec4(mix(uLine, uTip, clamp(core * 0.4 + tip * 0.8, 0.0, 1.0)), 1.0));
        gl_FragColor = vec4(c.rgb * a, a);
      }`,
  });
  const lines = new THREE.Mesh(g, mat);
  lines.frustumCulled = false;
  lines.renderOrder = 10;
  lines.name = 'intro-lines';
  return lines;
}

// Set the intro up on the desk set. Each top-level part of `root` is an
// object in the build order; `bounds` is the set's box; the fill sweeps
// along `fillAxis` (a unit vector).
export function mountIntro(root: THREE.Object3D, bounds: THREE.Box3, fillAxis: THREE.Vector3) {
  root.updateMatrixWorld(true);
  const parts = root.children;
  const step = (1 - RISE) / Math.max(1, parts.length - 1);
  const y0 = bounds.min.y - 0.02, y1 = bounds.max.y + 0.02;
  const rand = rng(7);
  let last = 0; // the trace's value once every line and surface is in
  const segs: number[] = [], times: number[] = [];
  const v = new THREE.Vector3(), w = new THREE.Vector3();
  const hidden: THREE.Object3D[] = []; // drawn by their own shaders: shown once filled
  parts.forEach((part, i) => {
    const start = i * step;
    const when = (y: number) => start + RISE * THREE.MathUtils.clamp((y - y0) / (y1 - y0), 0, 1);
    part.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      if (mats.some((m) => m instanceof THREE.ShaderMaterial)) { hidden.push(o); return; }
      const g = o.geometry as THREE.BufferGeometry;
      const count = g.attributes.position.count;
      g.setAttribute('aBuild', new THREE.BufferAttribute(new Float32Array(count).fill(start), 1));
      if (!g.boundingBox) g.computeBoundingBox();
      last = Math.max(last, when(g.boundingBox!.clone().applyMatrix4(o.matrixWorld).max.y) + LAG);
      mats.forEach(patch);
      // cables (tubes) appear as surfaces only: their edges would be a bundle of lines
      if (g.type === 'TubeGeometry' || count > 60000) return;
      const eg = new THREE.EdgesGeometry(g, 24), p = eg.attributes.position;
      for (let k = 0; k < p.count; k += 2) {
        v.fromBufferAttribute(p, k).applyMatrix4(o.matrixWorld);
        w.fromBufferAttribute(p, k + 1).applyMatrix4(o.matrixWorld);
        // each edge is drawn from its lower end, as the trace climbs the object
        const [lo, hi] = v.y <= w.y ? [v, w] : [w, v];
        const jitter = rand() * 0.04;
        const t0 = when(lo.y) + jitter, t1 = Math.max(when(hi.y) + jitter, t0 + 0.03 + rand() * 0.04);
        segs.push(lo.x, lo.y, lo.z, hi.x, hi.y, hi.z);
        times.push(t0, t1);
        last = Math.max(last, t1);
      }
      eg.dispose();
    });
  });
  const lines = traceLines(new Float32Array(segs), new Float32Array(times));
  INTRO.uY0.value = y0;
  INTRO.uY1.value = y1;
  // how far along the fill's axis the set itself reaches (its geometry,
  // not its box, so the fill starts the moment it's under way)
  INTRO.uFillAxis.value.copy(fillAxis);
  let fill0 = Infinity, fill1 = -Infinity;
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const pos = (o.geometry as THREE.BufferGeometry).attributes.position;
    for (let k = 0; k < pos.count; k++) {
      const a = v.fromBufferAttribute(pos, k).applyMatrix4(o.matrixWorld).dot(fillAxis);
      fill0 = Math.min(fill0, a);
      fill1 = Math.max(fill1, a);
    }
  });

  // the timeline, in seconds from `begin`
  const smooth = (a: number, b: number, x: number) => THREE.MathUtils.smoothstep(x, a, b);
  const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
  const TRACE = [0.6, 3.2];
  // the trace is finished once it passes `last` (inverting its easing for
  // when), then the fill follows almost at once
  const unease = (y: number) => (y < 0.5 ? Math.sqrt(y / 2) : 1 - Math.sqrt((1 - y) * 2) / 2);
  const traced = TRACE[0] + unease(Math.min(1, last / 1.1)) * (TRACE[1] - TRACE[0]);
  const HOLD = 0.05;
  const FILL = [traced + HOLD, traced + HOLD + 0.75], END = FILL[1] + 0.8;
  let start = -1;
  let done = false;
  let shadow = 0; // how far the shadows are in, 0..1
  const set = (o: { on: number; trace: number; fill: number; wire: number; floor: number; haze: number }) => {
    INTRO.uIntroOn.value = o.on;
    INTRO.uTrace.value = o.trace;
    INTRO.uFill.value = o.fill;
    INTRO.uWire.value = o.wire;
    INTRO.uFloorR.value = o.floor;
    INTRO.uHaze.value = o.haze;
    lines.visible = o.on > 0.5;
    hidden.forEach((h) => (h.visible = o.on < 0.5 || o.fill > fill1));
  };
  const finish = () => {
    done = true;
    shadow = 1;
    set({ on: 0, trace: 99, fill: 99, wire: 0, floor: 99, haze: 0 });
  };
  set({ on: 1, trace: -1, fill: -99, wire: 1, floor: 0, haze: 0 });

  return {
    lines,
    get done() { return done; },
    get shadow() { return shadow; },
    // the X-ray lens: centre and radius in drawing-buffer px, strength 0..1,
    // and the time (for the hologram's scanlines)
    setLens(x: number, y: number, r: number, k: number, t: number) {
      INTRO.uLens.value.set(x, y, r);
      INTRO.uLensK.value = k;
      if (done) {
        INTRO.uIntroTime.value = t;
        lines.visible = k > 0;
      }
    },
    // the canvas's drawing buffer size, and device pixels per CSS pixel
    setResolution(width: number, height: number, dpr: number) {
      lines.material.uniforms.uRes.value.set(width, height);
      lines.material.uniforms.uPx.value = dpr;
    },
    begin(t: number) { if (start < 0) start = t; },
    apply(t: number) {
      if (done) return;
      INTRO.uIntroTime.value = t;
      const e = start < 0 ? -1 : t - start;
      if (e >= END) return finish();
      const trace = e < TRACE[0] ? -1 : ease(Math.min(1, (e - TRACE[0]) / (TRACE[1] - TRACE[0]))) * 1.1;
      // (half eased, half steady, so the plane is already moving when it sets off)
      const fx = Math.min(1, (e - FILL[0]) / (FILL[1] - FILL[0]));
      const fill = e < FILL[0] ? -99 : fill0 - 0.02 + (ease(fx) + fx) / 2 * (fill1 - fill0 + 0.27);
      shadow = smooth(FILL[0] + 0.15, FILL[1] + 0.25, e);
      set({
        on: 1, trace, fill,
        wire: 1 - smooth(FILL[1], FILL[1] + 0.4, e),
        floor: e < 0 ? 0 : 18 * Math.pow(Math.min(1, e / 1.7), 2),
        haze: smooth(0.15, 1.1, e) * (1 - smooth(FILL[1] - 0.3, END, e)),
      });
    },
    finish,
  };
}
