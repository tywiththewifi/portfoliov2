import * as THREE from 'three';
import { Kit, box, cyl, lathe, rbox, tube } from '../kit';
import { surface } from '../mats';

// Graphite fabric swivel chair: a five-star base with twin-wheel casters, a
// gas lift in a stepped shroud, a tilt mechanism with its lever, a
// cushioned seat and back with piped edges and channel stitching, a
// headrest on chrome posts and padded armrests. Built facing +z, on y = 0.
export function buildChair() {
  const g = new THREE.Group();
  const k = new Kit({
    leather: surface('#46474b', { rough: 0.78 }),
    seam: surface('#2a2b2e', { rough: 0.8 }),
    plastic: surface('#222326', { rough: 0.5 }),
    chrome: surface('#c4c8d0', { rough: 0.16, metal: 1 }),
    rubber: surface('#0f0f10', { rough: 0.8 }),
  }, 13);
  // base: hub, tapered arms, casters
  k.add('plastic', lathe([[0, 0.06], [0.05, 0.06], [0.058, 0.075], [0.05, 0.115], [0.036, 0.12], [0, 0.12]], 32));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3, ca = Math.cos(a), sa = Math.sin(a);
    const arm = new THREE.CylinderGeometry(0.014, 0.022, 0.29, 6, 1).toNonIndexed();
    arm.scale(1.4, 1, 1);
    arm.rotateZ(Math.PI / 2 - 0.1);
    k.add('plastic', arm, { x: ca * 0.16, y: 0.082, z: sa * 0.16, ry: -a, wear: 0.5 });
    k.add('plastic', rbox(0.034, 0.022, 0.034, 0.006), { x: ca * 0.3, y: 0.06, z: sa * 0.3 });
    k.add('chrome', cyl(0.004, 0.004, 0.03, 8), { x: ca * 0.3, y: 0.04, z: sa * 0.3 });
    for (const s of [-1, 1]) k.add('rubber', cyl(0.024, 0.024, 0.011, 20), { x: ca * 0.3 + s * sa * 0.009, y: 0.025, z: sa * 0.3 - s * ca * 0.009, rx: Math.PI / 2, ry: -a + Math.PI / 2, ao: 0.004 });
  }
  // gas lift: chrome piston in a three-step shroud
  k.add('chrome', cyl(0.014, 0.014, 0.16, 20), { y: 0.3 });
  for (let i = 0; i < 3; i++) k.add('plastic', cyl(0.028 - i * 0.004, 0.03 - i * 0.004, 0.055, 24), { y: 0.14 + i * 0.05 });
  // tilt mechanism and lever
  k.add('plastic', rbox(0.2, 0.035, 0.24, 0.006), { y: 0.395 });
  k.add('chrome', tube([new THREE.Vector3(0.08, 0.39, 0.05), new THREE.Vector3(0.2, 0.38, 0.08), new THREE.Vector3(0.26, 0.37, 0.1)], 0.005, 12, 6));
  k.add('plastic', rbox(0.04, 0.018, 0.022, 0.008), { x: 0.27, y: 0.37, z: 0.1 });
  // seat: shell, cushion, piping round the top edge, channel stitching
  k.add('plastic', rbox(0.52, 0.03, 0.5, 0.02), { y: 0.425, z: 0.01 });
  k.add('leather', rbox(0.54, 0.09, 0.52, 0.04, 4), { y: 0.48, z: 0.01 });
  const pipe = (w: number, d: number, r: number) => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      const x = Math.sign(Math.cos(a)) * Math.min(Math.abs(Math.cos(a)) * 1.6, 1) * (w / 2 - r);
      const z = Math.sign(Math.sin(a)) * Math.min(Math.abs(Math.sin(a)) * 1.6, 1) * (d / 2 - r);
      pts.push(new THREE.Vector3(x + Math.cos(a) * r, 0, z + Math.sin(a) * r));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 160, 0.005, 6, true);
  };
  k.add('seam', pipe(0.53, 0.51, 0.05), { y: 0.518, z: 0.01 });
  for (const x of [-0.09, 0.09]) k.add('seam', box(0.004, 0.003, 0.4), { x, y: 0.5245, z: 0.02 });
  // back: cushion with a lumbar roll and stitching, a hard shell behind
  const back = new THREE.Group();
  const kb = new Kit(k.mats, 14);
  kb.add('leather', rbox(0.5, 0.64, 0.09, 0.04, 4), { y: 0.36 });
  kb.add('leather', rbox(0.46, 0.13, 0.05, 0.025, 3), { y: 0.14, z: 0.05 });
  kb.add('plastic', rbox(0.48, 0.62, 0.03, 0.02), { y: 0.36, z: -0.05 });
  for (const y of [0.3, 0.46]) kb.add('seam', box(0.4, 0.004, 0.004), { y, z: 0.0455 });
  kb.add('seam', box(0.004, 0.44, 0.004), { y: 0.42, z: 0.0455 });
  // headrest on two posts
  for (const s of [-1, 1]) kb.add('chrome', cyl(0.006, 0.006, 0.12, 12), { x: s * 0.09, y: 0.72, z: -0.02 });
  kb.add('leather', rbox(0.34, 0.14, 0.085, 0.035, 4), { y: 0.8, z: -0.01 });
  // spine bracket down to the mechanism
  kb.add('plastic', rbox(0.07, 0.3, 0.03, 0.01), { y: 0.02, z: -0.06 });
  back.add(kb.build('chair-back'));
  back.position.set(0, 0.5, -0.24);
  back.rotation.x = -0.14;
  // armrests: T supports and padded tops
  for (const s of [-1, 1]) {
    k.add('plastic', rbox(0.04, 0.2, 0.045, 0.008), { x: s * 0.29, y: 0.6, z: 0.0 });
    k.add('plastic', rbox(0.1, 0.02, 0.05, 0.006), { x: s * 0.26, y: 0.51, z: 0.0 });
    k.add('leather', rbox(0.075, 0.035, 0.3, 0.015, 3), { x: s * 0.29, y: 0.715, z: 0.03, tint: 0.9 });
  }
  g.add(k.build('chair'), back);
  return g;
}
