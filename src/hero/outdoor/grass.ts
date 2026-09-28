import * as THREE from 'three';
import { lit, col } from '../materials';
import { rng } from '../../art/posters';
import { Pix } from '../../art/pix';
import { pixelTexture } from '../materials';

// One grass blade: a tapered, slightly curved strip, 1 unit tall. Normals
// lean up so a field lights evenly; the shader adds wrap light and a
// darker root.
function bladeGeometry(segs = 4, bend = 0.25) {
  const pos: number[] = [], uv: number[] = [], nrm: number[] = [], idx: number[] = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const w = 0.5 * (1 - t) ** 0.9;
    const z = bend * t * t;
    pos.push(-w, t, z, w, t, z);
    uv.push(0, t, 1, t);
    nrm.push(0, 0.7, 0.7, 0, 0.7, 0.7);
    if (i < segs) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setIndex(idx);
  return g;
}

export type Placement = { x: number; y: number; z: number; h: number; w: number };

// A field of instanced blades. `place` is asked for candidate spots and can
// veto (return null) or size them; colours are picked per blade.
export function buildGrass(o: {
  count: number;
  seed: number;
  colors: string[];
  sample: (R: () => number) => Placement | null;
  wind?: number;
  rootShade?: number;
}) {
  const R = rng(o.seed);
  const mat = lit({ grass: true, wind: o.wind ?? 0.09, rootShade: o.rootShade ?? 0.5, side: THREE.DoubleSide });
  const mesh = new THREE.InstancedMesh(bladeGeometry(), mat, o.count);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const e = new THREE.Euler();
  const cols = o.colors.map(col);
  let n = 0, tries = 0;
  while (n < o.count && tries < o.count * 6) {
    tries++;
    const pl = o.sample(R);
    if (!pl) continue;
    e.set((R() - 0.5) * 0.25, R() * Math.PI * 2, (R() - 0.5) * 0.25);
    q.setFromEuler(e);
    p.set(pl.x, pl.y, pl.z);
    s.set(pl.w, pl.h, pl.w);
    m.compose(p, q, s);
    mesh.setMatrixAt(n, m);
    const c = cols[Math.floor(R() * cols.length)].clone().multiplyScalar(0.85 + R() * 0.3);
    mesh.setColorAt(n, c);
    n++;
  }
  mesh.count = n;
  mesh.frustumCulled = false;
  return mesh;
}

// Wildflowers: a crossed-quad head on a short stem. One instanced mesh per
// petal colour so the stems stay green.
function flowerTex(petal: string, centre: string) {
  const g = new Pix(16, 16);
  g.r(7, 7, 2, 9, '#4f7a2a');
  g.p(9, 11, '#6a9a3a'); g.p(10, 10, '#6a9a3a'); g.p(5, 12, '#6a9a3a'); g.p(6, 11, '#6a9a3a');
  g.circle(8, 5, 4, petal);
  g.p(5, 3, '#ffffff'); // glint
  g.circle(8, 5, 1, centre);
  return pixelTexture(g.canvas);
}

function crossedQuad() {
  const quad = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
  const a = quad.toNonIndexed(), b = quad.clone().rotateY(Math.PI / 2).toNonIndexed();
  const geo = new THREE.BufferGeometry();
  for (const k of ['position', 'uv', 'normal'] as const) {
    const x = a.getAttribute(k).array as Float32Array, y = b.getAttribute(k).array as Float32Array;
    const out = new Float32Array(x.length + y.length);
    out.set(x); out.set(y, x.length);
    geo.setAttribute(k, new THREE.BufferAttribute(out, k === 'uv' ? 2 : 3));
  }
  return geo;
}

export function buildFlowers(o: { count: number; seed: number; kinds: { petal: string; centre: string }[]; sample: (R: () => number) => Placement | null }) {
  const R = rng(o.seed);
  const group = new THREE.Group();
  const geo = crossedQuad();
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const per = Math.ceil(o.count / o.kinds.length);
  for (const k of o.kinds) {
    const mat = lit({ map: flowerTex(k.petal, k.centre), grass: true, wind: 0.07, rootShade: 0.15, side: THREE.DoubleSide });
    const mesh = new THREE.InstancedMesh(geo, mat, per);
    let n = 0, tries = 0;
    while (n < per && tries < per * 6) {
      tries++;
      const pl = o.sample(R);
      if (!pl) continue;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), R() * Math.PI);
      p.set(pl.x, pl.y, pl.z);
      s.set(pl.w, pl.h, pl.w);
      m.compose(p, q, s);
      mesh.setMatrixAt(n++, m);
    }
    mesh.count = n;
    mesh.frustumCulled = false;
    group.add(mesh);
  }
  return group;
}
