// Draws the TC monogram, as the header's mark shows it at rest, into flat
// SVGs: public/favicon.svg and public/mark.svg (the same, larger, with the
// lattice on its faces, for anywhere else the mark is needed). Both follow
// the browser's light or dark scheme, as the site's day and night. Run it
// after changing src/mark-geometry.ts:
//
//   node --experimental-strip-types scripts/favicon.ts
//
// (then rasterise the PNGs as the README says).
//
// The letters are drawn as their faces, painter's style: per letter (the
// farther first) its walls facing the camera, farthest first, then its front
// face, which nothing of the letter can cover. Each face is filled with its
// shade, then (in mark.svg) the lattice is drawn on it and then its creases.
import { writeFileSync } from 'node:fs';
import * as THREE from 'three';
import { CELL, CELL_OFFSET, CENTRE, CREASE, CURVE, FRONT, LOOKS, REST, markCamera, markShapes, shadeOf } from '../src/mark-geometry.ts';

type Face = { pts: THREE.Vector3[]; n: THREE.Vector3; creases: [THREE.Vector3, THREE.Vector3][] };

const camera = markCamera();
const turn = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(REST.x, REST.y, 0));
const turnN = new THREE.Matrix3().getNormalMatrix(turn);
const eye = camera.position;
const cosCrease = Math.cos(THREE.MathUtils.degToRad(CREASE));

// the letters' faces, in the centred object space the mark is built in
const letters = markShapes().map((shape) => {
  const outline = shape.extractPoints(CURVE).shape.map((p) => new THREE.Vector2(p.x - CENTRE.x, p.y - CENTRE.y));
  if (outline[0].equals(outline[outline.length - 1])) outline.pop();
  if (THREE.ShapeUtils.isClockWise(outline)) outline.reverse(); // counter-clockwise, so walls face out
  const at = (p: THREE.Vector2, z: number) => new THREE.Vector3(p.x, p.y, z);
  const faces: Face[] = [];
  const m = outline.length;
  const dir = (i: number) => outline[(i + 1) % m].clone().sub(outline[i]).normalize();
  for (let i = 0; i < m; i++) {
    const a = outline[i], b = outline[(i + 1) % m];
    const d = dir(i);
    const n = new THREE.Vector3(d.y, -d.x, 0);
    const pts = [at(a, -FRONT), at(b, -FRONT), at(b, FRONT), at(a, FRONT)];
    const creases: Face['creases'] = [[pts[0], pts[1]], [pts[3], pts[2]]];
    // the wall's ends are creases where the outline turns sharply
    if (dir((i + m - 1) % m).dot(d) < cosCrease) creases.push([pts[0], pts[3]]);
    if (dir((i + 1) % m).dot(d) < cosCrease) creases.push([pts[1], pts[2]]);
    faces.push({ pts, n, creases });
  }
  const cap = (z: number, n: number): Face => {
    const pts = outline.map((p) => at(p, z));
    if (n < 0) pts.reverse();
    return { pts, n: new THREE.Vector3(0, 0, n), creases: pts.map((p, i) => [p, pts[(i + 1) % pts.length]]) };
  };
  return { walls: faces, front: cap(FRONT, 1), back: cap(-FRONT, -1) };
});

// on screen: turned to rest, then projected; fitted to the icon later
const place = (v: THREE.Vector3) => v.clone().applyMatrix4(turn);
const project = (v: THREE.Vector3) => place(v).project(camera);
const faces = (() => {
  const facing = (f: Face) => {
    const c = place(f.pts.reduce((s, p) => s.add(p), new THREE.Vector3()).divideScalar(f.pts.length));
    const n = f.n.clone().applyMatrix3(turnN).normalize();
    return { f, n, c, toward: n.dot(eye.clone().sub(c)) > 0, depth: c.distanceTo(eye) };
  };
  const out: ReturnType<typeof facing>[] = [];
  const ls = letters.map((l) => ({ l, depth: facing(l.front).depth })).sort((a, b) => b.depth - a.depth);
  for (const { l } of ls) {
    const caps = [facing(l.front), facing(l.back)].filter((x) => x.toward);
    out.push(...l.walls.map(facing).filter((x) => x.toward).sort((a, b) => b.depth - a.depth), ...caps);
  }
  return out;
})();

// The lattice on a flat face: where each set of planes (x, y or z at a
// multiple of CELL) not parallel to it crosses it, clipped to its outline.
function lattice(f: Face): [THREE.Vector3, THREE.Vector3][] {
  const segs: [THREE.Vector3, THREE.Vector3][] = [];
  for (const axis of ['x', 'y', 'z'] as const) {
    if (Math.abs(f.n[axis]) > 0.9) continue;
    const o = CELL_OFFSET[axis];
    const vals = f.pts.map((p) => (p[axis] + o) / CELL);
    const lo = Math.ceil(Math.min(...vals)), hi = Math.floor(Math.max(...vals));
    const along = f.n.clone().cross(new THREE.Vector3(axis === 'x' ? 1 : 0, axis === 'y' ? 1 : 0, axis === 'z' ? 1 : 0));
    for (let k = lo; k <= hi; k++) {
      const hits: THREE.Vector3[] = [];
      f.pts.forEach((p, i) => {
        const q = f.pts[(i + 1) % f.pts.length], a = vals[i], b = vals[(i + 1) % f.pts.length];
        if ((a < k) !== (b < k)) hits.push(p.clone().lerp(q, (k - a) / (b - a)));
      });
      hits.sort((a, b) => a.dot(along) - b.dot(along));
      for (let i = 0; i + 1 < hits.length; i += 2) segs.push([hits[i], hits[i + 1]]);
    }
  }
  return segs;
}

// the colours, as the mark's shader mixes them (linear), for each scheme
const C = (s: string) => new THREE.Color(s);
const hex = (c: THREE.Color) => '#' + c.getHexString();
const looks = {
  night: {
    face: (s: number) => hex(C(LOOKS.night.holo).multiplyScalar(0.025 + 0.22 * s)),
    grid: hex(C(LOOKS.night.holo).multiplyScalar(0.025 + 0.22 * 0.6).add(C(LOOKS.night.line).multiplyScalar(0.4))),
    line: hex(C(LOOKS.night.line).lerp(C(LOOKS.night.tip), 0.4)),
  },
  day: {
    face: (s: number) => hex(new THREE.Color(0.95, 0.95, 0.95).multiplyScalar(0.8 + 0.2 * s)),
    grid: hex(new THREE.Color(0.95, 0.95, 0.95).multiplyScalar(0.92).lerp(C(LOOKS.day.line), 0.6)),
    line: hex(C(LOOKS.day.line).lerp(C(LOOKS.day.tip), 0.4)),
  },
};

// fit the projected letters to the icon's box, keeping their proportions
const SIZE = 64;
function svg(pad: number, stroke: number, grid: boolean) {
  const all = faces.flatMap(({ f }) => f.pts.map(project));
  const x0 = Math.min(...all.map((p) => p.x)), x1 = Math.max(...all.map((p) => p.x));
  const y0 = Math.min(...all.map((p) => p.y)), y1 = Math.max(...all.map((p) => p.y));
  const k = (SIZE - pad * 2) / Math.max(x1 - x0, y1 - y0);
  const ox = SIZE / 2 - ((x0 + x1) / 2) * k, oy = SIZE / 2 + ((y0 + y1) / 2) * k;
  const xy = (v: THREE.Vector3) => {
    const p = project(v);
    return `${(ox + p.x * k).toFixed(2)} ${(oy - p.y * k).toFixed(2)}`;
  };
  const path = (segs: [THREE.Vector3, THREE.Vector3][]) => segs.map(([a, b]) => `M${xy(a)}L${xy(b)}`).join('');
  // a few shades, so each scheme only needs a colour per class
  const LEVELS = 6;
  const level = (n: THREE.Vector3) => Math.round(shadeOf(n) * LEVELS);
  const used = new Set(faces.map(({ n }) => level(n)));
  const css = (look: typeof looks.night) =>
    [...used].map((l) => `.s${l}{fill:${look.face(l / LEVELS)};stroke:${look.face(l / LEVELS)}}`).join('') + `.g{stroke:${look.grid}}.l{stroke:${look.line}}`;
  const body = faces.map(({ f, n }) => {
    // each fill is stroked in its own colour too, so neighbours meet without seams
    let s = `<path class="s${level(n)}" d="M${f.pts.map(xy).join('L')}Z" stroke-width="0.6"/>`;
    if (grid) s += `<path class="g" d="${path(lattice(f))}" stroke-width="${(stroke * 0.4).toFixed(2)}"/>`;
    return s + `<path class="l" d="${path(f.creases)}" stroke-width="${stroke}"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}">` +
    `<style>path{fill:none;stroke-linecap:round;stroke-linejoin:round}${css(looks.night)}` +
    `@media (prefers-color-scheme:light){${css(looks.day)}}</style>` +
    body + '</svg>\n';
}

writeFileSync('public/favicon.svg', svg(1, 2.4, false));
writeFileSync('public/mark.svg', svg(2, 1.2, true));
console.log(`favicon.svg and mark.svg: ${faces.length} faces`);
