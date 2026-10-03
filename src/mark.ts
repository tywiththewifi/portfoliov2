import * as THREE from 'three';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { CELL, CELL_OFFSET, LIGHT, LOOKS, REST, markCamera, markEdges, markGeometry } from './mark-geometry';

// The header's mark: the TC monogram as solid 3D letters drawn like the
// scene's hologram (src/scene/intro.ts): shaded faces in the line colour
// with a fine lattice over them, faint scanlines drifting up, and crisp
// edges on top (the hidden ones hidden). It rests turned a little to show
// its depth, swaying slightly, and every 6–12 s (or when hovered) it spins
// round once. With reduced motion it holds still at rest; without WebGL the
// link keeps its plain "TC" text. It only draws while on screen.

const SPIN = 1.6; // seconds for one turn
const FIT = 2.0; // how much of the mark (units) spans the link's width
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

const col = (s: string) => new THREE.Color(s);
const NIGHT = { line: col(LOOKS.night.line), tip: col(LOOKS.night.tip), holo: col(LOOKS.night.holo) };
const DAY = { line: col(LOOKS.day.line), tip: col(LOOKS.day.tip), holo: col(LOOKS.day.holo) };

export function mountMark(el: HTMLElement) {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  } catch {
    return;
  }
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.className = 'mark-3d';
  canvas.setAttribute('aria-hidden', 'true');
  el.append(canvas);
  el.classList.add('is-3d');

  const scene = new THREE.Scene();
  const camera = markCamera();
  const geo = markGeometry();
  const u = {
    uLine: { value: new THREE.Color() },
    uHolo: { value: new THREE.Color() },
    uPaint: { value: 0 },
    uTime: { value: 0 },
    uPx: { value: 1 }, // device px per CSS px
    uLight: { value: LIGHT },
    uCell: { value: CELL },
    uCellOffset: { value: CELL_OFFSET },
  };
  // the faces: the hologram's shading, as in src/scene/intro.ts (F_SHADE)
  const faceMat = new THREE.ShaderMaterial({
    uniforms: u,
    polygonOffset: true, // behind the edges drawn on them
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
    vertexShader: /* glsl */ `
      varying vec3 vP, vN, vNo;
      void main() {
        vP = position; vNo = normal;
        vN = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uLine, uHolo, uLight, uCellOffset;
      uniform float uPaint, uTime, uPx, uCell;
      varying vec3 vP, vN, vNo;
      void main() {
        // the lattice, about a pixel wide; a face is only crossed by the
        // planes not parallel to it
        vec3 q = (vP + uCellOffset) / uCell;
        vec3 g = abs(fract(q - 0.5) - 0.5) / max(fwidth(q) * max(1.0, uPx * 0.6), vec3(1e-4));
        g += step(0.9, abs(vNo)) * 1e3;
        float grid = 1.0 - clamp(min(min(g.x, g.y), g.z), 0.0, 1.0);
        float gl = 0.12 + 1.1 * max(dot(normalize(vN), uLight), 0.0);
        float shade = gl / (gl + 0.3);
        float scan = 0.86 + 0.14 * sin(gl_FragCoord.y / uPx * 2.1 - uTime * 5.0);
        vec3 night = uHolo * (0.025 + 0.22 * shade) * scan + uLine * grid * 0.4;
        vec3 day = mix(vec3(0.95) * (0.8 + 0.2 * shade), uLine, grid * 0.6);
        gl_FragColor = vec4(mix(night, day, uPaint), 1.0);
        #include <colorspace_fragment>
      }`,
  });
  // the edges: the scene's lines at their brightest, without the glow
  const lineMat = new LineMaterial({ linewidth: 1.25, worldUnits: false });
  const lines = new LineSegments2(new LineSegmentsGeometry().fromEdgesGeometry(markEdges(geo)), lineMat);
  const group = new THREE.Group();
  group.add(new THREE.Mesh(geo, faceMat), lines);
  scene.add(group);

  const size = () => {
    const w = el.clientWidth, cw = canvas.clientWidth, ch = canvas.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    renderer.setPixelRatio(dpr);
    renderer.setSize(cw, ch, false);
    u.uPx.value = dpr;
    // the canvas overhangs the link so a turn is never clipped; FIT units
    // of the mark span the link
    camera.aspect = cw / ch;
    const across = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
    camera.zoom = across / (FIT * (cw / w));
    camera.updateProjectionMatrix();
    // (the lines set their resolution from the canvas, in CSS px, as they
    // draw, so their width is in CSS px too)
    lineMat.linewidth = w < 60 ? 1.1 : 1.25;
  };
  // night and day: how far the page is from one to the other, read off its
  // background as it eases between #0a0a0a and #fafafa
  const root = document.documentElement;
  const probe = new THREE.Color();
  const tint = () => {
    probe.setStyle(getComputedStyle(root).getPropertyValue('--bg').trim() || '#0a0a0a', THREE.NoColorSpace);
    const k = THREE.MathUtils.clamp((probe.r - 10 / 255) / (240 / 255), 0, 1);
    u.uLine.value.lerpColors(NIGHT.line, DAY.line, k);
    u.uHolo.value.lerpColors(NIGHT.holo, DAY.holo, k);
    u.uPaint.value = k;
    // the line at its core: a little toward the hot tip colour
    lineMat.color.lerpColors(NIGHT.line, NIGHT.tip, 0.4).lerp(probe.lerpColors(DAY.line, DAY.tip, 0.4), k);
  };

  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let raf = 0, last = 0, t = 0, onScreen = true;
  let spinAt = 2.5 + Math.random() * 3; // the first spin, then every 6–12 s
  let spinFrom = -1;
  const pose = () => {
    let y = REST.y + Math.sin(t * 0.7) * 0.08;
    if (spinFrom >= 0) {
      const k = (t - spinFrom) / SPIN;
      if (k >= 1) {
        spinFrom = -1;
        spinAt = t + 6 + Math.random() * 6;
      } else y += ease(k) * Math.PI * 2;
    }
    group.rotation.set(REST.x + Math.sin(t * 0.5) * 0.04, y, 0);
  };
  const draw = () => {
    tint();
    u.uTime.value = t;
    renderer.render(scene, camera);
  };
  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0);
    last = now;
    t += dt;
    if (spinFrom < 0 && t >= spinAt) spinFrom = t;
    pose();
    draw();
  };
  const still = () => {
    group.rotation.set(REST.x, REST.y, 0);
    draw();
  };
  const sync = () => {
    cancelAnimationFrame(raf);
    raf = 0;
    if (reduce.matches) return still();
    if (!onScreen || document.hidden) return;
    last = 0;
    raf = requestAnimationFrame(tick);
  };

  el.addEventListener('pointerenter', () => {
    if (!reduce.matches && spinFrom < 0) spinFrom = t;
  });
  new ResizeObserver(() => { size(); if (!raf) still(); }).observe(el);
  new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; sync(); }).observe(el);
  document.addEventListener('visibilitychange', sync);
  reduce.addEventListener('change', sync);
  // redraw the still mark when the mode changes (with motion, the loop does)
  new MutationObserver(() => { if (!raf) setTimeout(still, 800); }).observe(root, { attributes: true, attributeFilter: ['data-mode'] });
  size();
  sync();
}
