// Draws the TC monogram, as the header's mark shows it at rest, into flat
// SVGs: public/favicon.svg (on the badge's dark round tile) and
// public/mark.svg (the lines alone, for anywhere else the mark is needed).
// The front face's edges are full strength and the rest (the back face and
// the depth between) fainter, so the wireframe reads as solid letters even
// at 16 px. Run it after changing
// src/mark-geometry.ts:
//
//   node --experimental-strip-types scripts/favicon.ts
//
// (then rasterise the PNGs as the README says).
import { writeFileSync } from 'node:fs';
import * as THREE from 'three';
import { REST, markCamera, markEdges, markGeometry } from '../src/mark-geometry.ts';

const MINT = '#21ffc0';
const size = 64; // viewBox units

const camera = markCamera();
const turn = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(REST.x, REST.y, 0));
const pos = markEdges(markGeometry()).attributes.position;
const a = new THREE.Vector3(), b = new THREE.Vector3();
const toSvg = (v: THREE.Vector3) => {
  const p = v.clone().project(camera);
  return `${(((p.x + 1) / 2) * size).toFixed(2)} ${(((1 - p.y) / 2) * size).toFixed(2)}`;
};
const front: string[] = [], back: string[] = [];
for (let i = 0; i < pos.count; i += 2) {
  a.fromBufferAttribute(pos, i);
  b.fromBufferAttribute(pos, i + 1);
  // the face toward the camera at rest is the letters' +z face
  const onFront = a.z > 0 && b.z > 0;
  a.applyMatrix4(turn);
  b.applyMatrix4(turn);
  (onFront ? front : back).push(`M${toSvg(a)}L${toSvg(b)}`);
}
const lines = (stroke: number) =>
  `<g fill="none" stroke="${MINT}" stroke-linecap="round" stroke-linejoin="round">` +
  `<path d="${back.join('')}" stroke-width="${stroke}" stroke-opacity="0.45"/>` +
  `<path d="${front.join('')}" stroke-width="${stroke}"/></g>`;

const svg = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">${body}</svg>\n`;
writeFileSync('public/favicon.svg', svg(`<circle cx="32" cy="32" r="31" fill="#141414" stroke="#2a2a2a" stroke-width="1.5"/>${lines(2.6)}`));
writeFileSync('public/mark.svg', svg(lines(2)));
console.log(`favicon.svg and mark.svg: ${front.length} front and ${back.length} other edges`);
