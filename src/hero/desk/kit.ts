import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rng } from '../../art/posters';

// A small parts builder for the detailed desk props, after the one in
// ThreeUI's Sakura River Valley: every prop is dozens of small bevelled
// pieces, grouped by material and merged into one mesh each. Each piece gets
// a slight random tint, and the kit bakes two cheap lighting cues into
// vertex colours: contact darkening where a piece meets whatever it stands
// on, and a lighter, worn edge on its bevels.

export type Place = { x?: number; y?: number; z?: number; rx?: number; ry?: number; rz?: number; s?: number | [number, number, number] };
export type PartOpts = Place & {
  tint?: number; // brightness multiplier on top of the random jitter
  jitter?: number; // random tint range (default ±4%)
  ao?: number; // contact darkening depth in metres at the part's base (0 = off)
  wear?: number; // bevel lightening strength (default .3)
};

export function place(g: THREE.BufferGeometry, p: Place = {}) {
  const s = p.s ?? 1;
  if (Array.isArray(s)) g.scale(s[0], s[1], s[2]);
  else if (s !== 1) g.scale(s, s, s);
  if (p.rx) g.rotateX(p.rx);
  if (p.rz) g.rotateZ(p.rz);
  if (p.ry) g.rotateY(p.ry);
  g.translate(p.x ?? 0, p.y ?? 0, p.z ?? 0);
  return g;
}

// ---------------------------------------------------------------- primitives
export const rbox = (w: number, h: number, d: number, r = Math.min(w, h, d) * 0.12, seg = 2) =>
  new RoundedBoxGeometry(w, h, d, seg, Math.min(r, Math.min(w, h, d) / 2 - 1e-4));
export const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
export const cyl = (rt: number, rb: number, h: number, seg = 24, open = false) => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open);
export const tube = (pts: THREE.Vector3[], r: number, seg = 48, rad = 6) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, r, rad, false);
export const torus = (R: number, r: number, seg = 32, rad = 8, arc = Math.PI * 2) => new THREE.TorusGeometry(R, r, rad, seg, arc);

// Surface of revolution from a [radius, height] profile, around +y.
export function lathe(profile: [number, number][], seg = 32) {
  return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 1e-4), y)), seg);
}

// A cylinder with fine ridges round its side (knurled knobs, lens rings).
export function knurl(r: number, h: number, ridges = 36, depth = 0.08) {
  const g = new THREE.CylinderGeometry(r, r, h, ridges * 2, 1);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), rr = Math.hypot(x, z);
    if (rr < r * 0.98) continue;
    const a = Math.atan2(z, x);
    const k = 1 - depth * (0.5 + 0.5 * Math.cos(a * ridges));
    pos.setX(i, x * k); pos.setZ(i, z * k);
  }
  g.computeVertexNormals();
  return g;
}

// Coil spring along +y, `turns` loops of radius R over length L.
export function spring(R: number, r: number, L: number, turns: number) {
  const pts: THREE.Vector3[] = [];
  const n = Math.round(turns * 12);
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = t * turns * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * R, t * L, Math.sin(a) * R));
  }
  return tube(pts, r, n * 2, 5);
}

// Rounded-rectangle slab (in x/y), extruded d along +z with a small bevel.
export function slab(w: number, h: number, d: number, r: number, bevel = Math.min(0.002, d * 0.3)) {
  const s = new THREE.Shape();
  const x0 = -w / 2, y0 = -h / 2;
  r = Math.min(r, w / 2, h / 2);
  s.moveTo(x0 + r, y0);
  s.lineTo(x0 + w - r, y0); s.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r);
  s.lineTo(x0 + w, y0 + h - r); s.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h);
  s.lineTo(x0 + r, y0 + h); s.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r);
  s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0);
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(1e-4, d - bevel * 2), bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 6 });
  g.translate(0, 0, bevel);
  return g;
}

// A hollow tapered shell (four walls from a front rectangle to a smaller
// back one), for CRT bodies. Front face at z = 0, back at z = -d.
export function taper(w0: number, h0: number, w1: number, h1: number, d: number, dy = 0, cap = true) {
  const f = [[-w0 / 2, -h0 / 2], [w0 / 2, -h0 / 2], [w0 / 2, h0 / 2], [-w0 / 2, h0 / 2]];
  const b = [[-w1 / 2, -h1 / 2 + dy], [w1 / 2, -h1 / 2 + dy], [w1 / 2, h1 / 2 + dy], [-w1 / 2, h1 / 2 + dy]];
  const pos: number[] = [];
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    const A = [f[i][0], f[i][1], 0], B = [f[j][0], f[j][1], 0], C = [b[j][0], b[j][1], -d], D = [b[i][0], b[i][1], -d];
    pos.push(...A, ...D, ...B, ...B, ...D, ...C);
  }
  // back cap
  if (cap) pos.push(b[0][0], b[0][1], -d, b[2][0], b[2][1], -d, b[1][0], b[1][1], -d, b[0][0], b[0][1], -d, b[3][0], b[3][1], -d, b[2][0], b[2][1], -d);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------- the kit
export class Kit {
  private parts = new Map<string, THREE.BufferGeometry[]>();
  private R: () => number;

  constructor(readonly mats: Record<string, THREE.Material>, seed = 1) {
    this.R = rng(seed);
  }

  add(key: string, geo: THREE.BufferGeometry, o: PartOpts = {}) {
    if (!this.mats[key]) throw new Error(`kit: no material "${key}"`);
    let g = geo.index ? geo.toNonIndexed() : geo;
    if (!g.attributes.normal) g.computeVertexNormals();
    // contact AO is measured in the part's own frame, before placement
    g.computeBoundingBox();
    const minY = g.boundingBox!.min.y;
    const pos = g.attributes.position as THREE.BufferAttribute, nor = g.attributes.normal as THREE.BufferAttribute;
    const n = pos.count;
    const c = new Float32Array(n * 3);
    const j = o.jitter ?? 0.04;
    const tint = (o.tint ?? 1) * (1 + (this.R() * 2 - 1) * j);
    const wear = o.wear ?? 0.3, ao = o.ao ?? 0;
    for (let i = 0; i < n; i++) {
      let k = tint;
      if (ao > 0) k *= 0.62 + 0.38 * THREE.MathUtils.smoothstep(pos.getY(i) - minY, 0, ao);
      // bevel vertices have normals between the axes: lift them a touch
      const edge = 1 - Math.max(Math.abs(nor.getX(i)), Math.abs(nor.getY(i)), Math.abs(nor.getZ(i)));
      k *= 1 + Math.min(edge, 0.42) * wear;
      c[i * 3] = c[i * 3 + 1] = c[i * 3 + 2] = k;
    }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    place(g, o);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
    for (const a of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(a)) g.deleteAttribute(a);
    g.morphAttributes = {};
    (this.parts.get(key) ?? this.parts.set(key, []).get(key)!).push(g);
    return g;
  }

  // Merge everything added so far into one mesh per material.
  build(name = 'kit') {
    const out = new THREE.Group();
    out.name = name;
    for (const [key, list] of this.parts) {
      const geo = mergeGeometries(list, false);
      if (!geo) throw new Error(`kit: merge failed for "${key}"`);
      geo.computeBoundingSphere();
      const m = new THREE.Mesh(geo, this.mats[key]);
      m.name = `${name}-${key}`;
      out.add(m);
    }
    this.parts.clear();
    return out;
  }
}
