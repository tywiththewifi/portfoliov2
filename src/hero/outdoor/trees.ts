import * as THREE from 'three';
import { lit, col } from '../materials';
import { rng } from '../../art/posters';

// Trunk: a tapered cylinder bent by `lean` (sideways drift at the top) with
// the bark texture wrapped a few times around and up.
export function trunk(o: { h: number; r0: number; r1: number; lean?: THREE.Vector2; mat: THREE.Material; seg?: number }) {
  const g = new THREE.CylinderGeometry(o.r1, o.r0, o.h, o.seg ?? 10, 10, false);
  g.translate(0, o.h / 2, 0);
  const pos = g.attributes.position as THREE.BufferAttribute, uv = g.attributes.uv as THREE.BufferAttribute;
  const lean = o.lean ?? new THREE.Vector2();
  for (let i = 0; i < pos.count; i++) {
    const t = pos.getY(i) / o.h;
    pos.setX(i, pos.getX(i) + lean.x * t * t);
    pos.setZ(i, pos.getZ(i) + lean.y * t * t);
    uv.setXY(i, uv.getX(i) * 2, uv.getY(i) * o.h * 1.2);
  }
  g.computeVertexNormals();
  return new THREE.Mesh(g, o.mat);
}

// A bough along a curve, for the big oak.
export function branch(pts: THREE.Vector3[], r: number, mat: THREE.Material) {
  return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, r, 7, false), mat);
}

// Instanced leaf-cluster cards scattered in ellipsoids ("puffs"), each card
// turned randomly; tinted per card for depth.
export function foliage(o: {
  puffs: { c: THREE.Vector3; r: THREE.Vector3; n: number }[];
  map: THREE.Texture;
  size: [number, number];
  tints: string[];
  seed: number;
  wind?: number;
}) {
  const R = rng(o.seed);
  const total = o.puffs.reduce((a, p) => a + p.n, 0);
  const mat = lit({ map: o.map, side: THREE.DoubleSide, wind: o.wind ?? 0.012, rootShade: 0.04 });
  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), mat, total);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), e = new THREE.Euler();
  const tints = o.tints.map(col);
  let n = 0;
  for (const puff of o.puffs) {
    for (let i = 0; i < puff.n; i++) {
      // bias towards the outer shell so the silhouette stays full
      const u = R() * 2 - 1, th = R() * Math.PI * 2, rr = Math.cbrt(0.35 + R() * 0.65);
      const sx = Math.sqrt(1 - u * u) * Math.cos(th), sy = u, sz = Math.sqrt(1 - u * u) * Math.sin(th);
      p.set(puff.c.x + sx * puff.r.x * rr, puff.c.y + sy * puff.r.y * rr, puff.c.z + sz * puff.r.z * rr);
      e.set((R() - 0.5) * 1.2, R() * Math.PI * 2, (R() - 0.5) * 1.2);
      q.setFromEuler(e);
      const k = o.size[0] + R() * (o.size[1] - o.size[0]);
      s.set(k, k, k);
      m.compose(p, q, s);
      mesh.setMatrixAt(n, m);
      // lower cards sit in their own shade
      const shade = 0.75 + 0.35 * ((sy + 1) / 2);
      mesh.setColorAt(n, tints[Math.floor(R() * tints.length)].clone().multiplyScalar(shade));
      n++;
    }
  }
  mesh.frustumCulled = false;
  return mesh;
}

// A conifer from stacked, slightly drooping cones.
export function pine(o: { h: number; r: number; cols: string[]; trunkMat: THREE.Material; seed: number }) {
  const g = new THREE.Group();
  const R = rng(o.seed);
  g.add(trunk({ h: o.h * 0.3, r0: o.r * 0.12, r1: o.r * 0.09, mat: o.trunkMat, seg: 6 }));
  const tiers = 6;
  for (let i = 0; i < tiers; i++) {
    const t = i / tiers;
    const rad = o.r * (1 - t * 0.82), hh = o.h * 0.26;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(rad, hh, 9, 1, true), lit({ color: o.cols[i % o.cols.length], side: THREE.DoubleSide }));
    cone.position.y = o.h * 0.18 + t * o.h * 0.7 + hh / 2;
    cone.rotation.y = R() * Math.PI;
    g.add(cone);
  }
  return g;
}
