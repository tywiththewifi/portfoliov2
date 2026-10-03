import * as THREE from 'three';

// The TC monogram as solids: a T and a C side by side, extruded. The C is a
// ring open on the right, as thick as the T's strokes. The letters are 1
// unit tall and the whole is centred on the origin. Used by the header's
// spinning mark (src/mark.ts) and to draw the favicon (scripts/favicon.ts),
// so it imports nothing but three.

const STROKE = 0.22; // the strokes' thickness
const DEPTH = 0.3; // how far the letters are extruded
export const CURVE = 24; // the arcs' smoothness, as ExtrudeGeometry takes it

// the letters' outlines, in the order they're drawn (T, then C)
export function markShapes() {
  const T = new THREE.Shape();
  T.moveTo(0, 1);
  T.lineTo(0.92, 1);
  T.lineTo(0.92, 1 - STROKE);
  T.lineTo(0.46 + STROKE / 2, 1 - STROKE);
  T.lineTo(0.46 + STROKE / 2, 0);
  T.lineTo(0.46 - STROKE / 2, 0);
  T.lineTo(0.46 - STROKE / 2, 1 - STROKE);
  T.lineTo(0, 1 - STROKE);
  T.closePath();

  const C = new THREE.Shape();
  const cx = 1.53, cy = 0.5, R = 0.5, open = THREE.MathUtils.degToRad(42);
  C.absarc(cx, cy, R, open, Math.PI * 2 - open, false);
  C.absarc(cx, cy, R - STROKE, Math.PI * 2 - open, open, true);
  C.closePath();
  return [T, C];
}

// the outlines' extent: x 0..2.03, y 0..1, z 0..DEPTH; the solids are moved
// back by its centre
export const CENTRE = new THREE.Vector3(1.015, 0.5, DEPTH / 2);
export const FRONT = DEPTH / 2; // the front faces' z, centred

// the solid letters, centred
export function markGeometry() {
  const geo = new THREE.ExtrudeGeometry(markShapes(), { depth: DEPTH, bevelEnabled: false, curveSegments: CURVE });
  geo.translate(-CENTRE.x, -CENTRE.y, -CENTRE.z);
  return geo;
}

// the creases a wireframe draws: outlines front and back, the corners
// between them (the C's curved side, smooth at 24 segments, has none)
export const CREASE = 20; // degrees
export function markEdges(geo: THREE.BufferGeometry) {
  return new THREE.EdgesGeometry(geo, CREASE);
}

// The look, after the scene's hologram (src/scene/intro.ts): each face
// shaded by a light from the upper left, a lattice over the surfaces and
// the edges drawn crisply on top. By night the faces are dark mint with
// bright mint lines; by day near white with the deeper mint drawn on.
export const LIGHT = new THREE.Vector3(-0.5, 0.7, 0.55).normalize(); // toward the light, in view space
export const CELL = 1 / 7.5; // the lattice's spacing; the letters are 1 tall
export const CELL_OFFSET = new THREE.Vector3(0.031, 0.047, 0.5 / 7.5 - FRONT); // keeps faces off the lattice's planes
export const LOOKS = {
  night: { line: '#21ffc0', tip: '#dcfff4', holo: '#21ffc0', paint: 0 },
  day: { line: '#00a37a', tip: '#00543f', holo: '#00a37a', paint: 1 },
};
// a face's brightness, 0..1, from its normal (view space) — as the scene's
// is from its lit colour (gl / (gl + 0.3))
export function shadeOf(n: THREE.Vector3) {
  const gl = 0.12 + 1.1 * Math.max(0, n.dot(LIGHT));
  return gl / (gl + 0.3);
}

// the resting pose: turned to show the depth
export const REST = { x: 0.2, y: -0.5 };

// the camera both the mark and the favicon use
export function markCamera(aspect = 1) {
  const cam = new THREE.PerspectiveCamera(26, aspect, 0.1, 20);
  cam.position.set(0, 0, 5.4);
  cam.lookAt(0, 0, 0);
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();
  return cam;
}
