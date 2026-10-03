import * as THREE from 'three';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { REST, markCamera, markEdges, markGeometry } from './mark-geometry';

// The header's mark: the TC monogram as a holographic wireframe, drawn in
// the accent colour over a faint fill, in a small canvas inside the round
// badge (CSS adds the glow and scanlines). It rests turned a little to show
// its depth, swaying slightly, and every 6–12 s (or when hovered) it spins
// round once. With reduced motion it holds still at rest; without WebGL the
// badge keeps its plain "TC" text. It only draws while on screen.

const SPIN = 1.6; // seconds for one turn
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

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
  const color = new THREE.Color();
  const fillMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide });
  const lineMat = new LineMaterial({ linewidth: 1.3, worldUnits: false, transparent: true, opacity: 0.95, depthTest: false });
  const lines = new LineSegments2(new LineSegmentsGeometry().fromEdgesGeometry(markEdges(geo)), lineMat);
  const group = new THREE.Group();
  group.add(new THREE.Mesh(geo, fillMat), lines);
  scene.add(group);

  const size = () => {
    const s = el.clientWidth;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    renderer.setPixelRatio(dpr);
    renderer.setSize(s, s, false);
    // (the lines set their resolution from the canvas, in CSS px, as they
    // draw, so their width is in CSS px too: thinner in the smaller phone
    // badge, so it stays a wireframe)
    lineMat.linewidth = Math.min(1.3, Math.max(0.9, s / 44));
  };
  // the accent follows night and day (it eases between them in CSS)
  const root = document.documentElement;
  const tint = () => {
    color.setStyle(getComputedStyle(root).getPropertyValue('--accent').trim() || '#21ffc0');
    fillMat.color.copy(color);
    lineMat.color.copy(color);
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
