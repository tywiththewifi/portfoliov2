import * as THREE from 'three';

// The TC monogram as solids: a T and a C side by side, extruded. The C is a
// ring open on the right, as thick as the T's strokes. The letters are 1
// unit tall and the whole is centred on the origin. Used by the header's
// spinning mark (src/mark.ts) and to draw the favicon (scripts/favicon.ts),
// so it imports nothing but three.

const STROKE = 0.22; // the strokes' thickness
export const DEPTH = 0.3; // how far the letters are extruded

function shapes() {
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

// the solid letters, centred
export function markGeometry() {
  const geo = new THREE.ExtrudeGeometry(shapes(), { depth: DEPTH, bevelEnabled: false, curveSegments: 24 });
  geo.center();
  return geo;
}

// the creases a wireframe draws: outlines front and back, the corners
// between them (the C's curved side, smooth at 24 segments, has none)
export function markEdges(geo: THREE.BufferGeometry) {
  return new THREE.EdgesGeometry(geo, 20);
}

// the resting pose: turned to show the depth
export const REST = { x: 0.2, y: -0.5 };

// the camera both the mark and the favicon use
export function markCamera() {
  const cam = new THREE.PerspectiveCamera(26, 1, 0.1, 20);
  cam.position.set(0, 0, 5.4);
  cam.lookAt(0, 0, 0);
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();
  return cam;
}
