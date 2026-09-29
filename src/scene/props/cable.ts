import * as THREE from 'three';

const CABLE = new THREE.MeshStandardMaterial({ color: '#1a1918', roughness: 0.55 });
export const BEIGE_CABLE = new THREE.MeshStandardMaterial({ color: '#b9ab94', roughness: 0.55 });

// A cable lying on a surface at height `floor` between two points, lifting
// and wandering a little on the way; `coil` winds it into a telephone curl.
export function cable(from: THREE.Vector3, to: THREE.Vector3, floor: number, o: { beige?: boolean; r?: number; coil?: number; wander?: number; lift?: number } = {}) {
  const pts: THREE.Vector3[] = [];
  const n = o.coil ? 160 : 28;
  const r = o.r ?? 0.003;
  const side = new THREE.Vector3().subVectors(to, from).cross(new THREE.Vector3(0, 1, 0)).normalize();
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = from.clone().lerp(to, t);
    p.y = Math.max(floor + r, THREE.MathUtils.lerp(from.y, to.y, t) - Math.sin(t * Math.PI) * (o.lift ?? 0.2));
    p.addScaledVector(side, Math.sin(t * Math.PI * 2.3) * (o.wander ?? 0.02) * Math.sin(t * Math.PI));
    if (o.coil) { const a = t * o.coil * Math.PI * 2; p.addScaledVector(side, Math.cos(a) * 0.006); p.y += Math.sin(a) * 0.006 + 0.006; }
    pts.push(p);
  }
  return drape(pts, r, o.beige ? BEIGE_CABLE : CABLE, n * 2);
}

// A cable through explicit points (for runs that drop off the desk edge).
export function drape(pts: THREE.Vector3[], r: number, mat: THREE.Material = CABLE, seg = 64) {
  const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), seg, r, 6), mat);
  m.castShadow = m.receiveShadow = true;
  return m;
}
