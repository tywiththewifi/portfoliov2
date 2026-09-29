import * as THREE from 'three';
import { Kit, box, rbox, slab } from '../kit';
import { BEIGE, MINT, glow, surface } from '../mats';

// A buckling-spring style board: sculpted rows of faceted keycaps (alphas
// light, modifiers darker), function row, navigation cluster and numpad, a
// recessed plate, lock LEDs and fold-out feet. Built facing +z, on y = 0.
export function buildKeyboard() {
  const g = new THREE.Group();
  const k = new Kit({
    case: surface(BEIGE.plastic, { rough: 0.5 }),
    plate: surface('#4a4238', { rough: 0.8 }),
    key: surface(BEIGE.key, { rough: 0.45 }),
    mod: surface(BEIGE.mod, { rough: 0.45 }),
    led: glow(MINT),
    ledOff: surface('#1d302a', { rough: 0.3 }),
  }, 31);
  const U = 0.0188, W = 0.462, Dp = 0.172;
  // case: a wedge that rises toward the back, with a recessed plate
  k.add('case', rbox(W, 0.024, Dp, 0.008, 3), { y: 0.012, ao: 0.006 });
  k.add('case', rbox(W - 0.004, 0.012, 0.02, 0.005), { y: 0.03, z: -Dp / 2 + 0.011 });
  k.add('plate', box(0.444, 0.002, 0.126), { y: 0.0245, z: -0.003 });
  // one keycap: a faceted square frustum
  const cap = (wu: number, hu = 1) => {
    const w = wu * U - 0.0024, d = hu * U - 0.0024, h = 0.0105;
    const geo = new THREE.CylinderGeometry(Math.SQRT1_2, Math.SQRT1_2 * 1.28, 1, 4, 1).toNonIndexed();
    geo.rotateY(Math.PI / 4);
    geo.scale(w / 1.28, h, d / 1.28);
    geo.translate(0, h / 2, 0);
    geo.computeVertexNormals();
    return geo;
  };
  type K = [number, number, string?]; // width, gap before, material
  const rows: K[][] = [
    [[1, 0, 'mod'], [1, 1, 'mod'], [1, 0, 'mod'], [1, 0, 'mod'], [1, 0, 'mod'], [1, 0.5], [1, 0], [1, 0], [1, 0], [1, 0.5, 'mod'], [1, 0, 'mod'], [1, 0, 'mod'], [1, 0, 'mod']],
    [...Array.from({ length: 13 }, (): K => [1, 0]), [2, 0, 'mod']],
    [[1.5, 0, 'mod'], ...Array.from({ length: 12 }, (): K => [1, 0]), [1.5, 0, 'mod']],
    [[1.75, 0, 'mod'], ...Array.from({ length: 11 }, (): K => [1, 0]), [2.25, 0, 'mod']],
    [[2.25, 0, 'mod'], ...Array.from({ length: 10 }, (): K => [1, 0]), [2.75, 0, 'mod']],
    [[1.5, 0, 'mod'], [1.5, 1, 'mod'], [7, 0], [1.5, 0, 'mod'], [1.5, 1, 'mod']],
  ];
  const x0 = -W / 2 + 0.012, zRow = (r: number) => -0.054 + r * U + (r > 0 ? 0.005 : 0);
  // sculpted profile: each row sits at its own height and tilt
  const rowY = [0.028, 0.029, 0.027, 0.026, 0.026, 0.027], rowTilt = [-0.12, -0.1, -0.02, 0.04, 0.1, 0.16];
  rows.forEach((row, r) => {
    let x = x0;
    for (const [wu, gap, mat] of row) {
      x += gap * U;
      k.add(mat ?? 'key', cap(wu), { x: x + (wu * U) / 2, y: rowY[r], z: zRow(r), rx: rowTilt[r] });
      x += wu * U;
    }
  });
  // navigation cluster and arrows
  const nx = x0 + 15.5 * U;
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) k.add('mod', cap(1), { x: nx + (c + 0.5) * U, y: rowY[r], z: zRow(r), rx: rowTilt[r] });
  k.add('mod', cap(1), { x: nx + 1.5 * U, y: rowY[4], z: zRow(4), rx: rowTilt[4] });
  for (let c = 0; c < 3; c++) k.add('mod', cap(1), { x: nx + (c + 0.5) * U, y: rowY[5], z: zRow(5), rx: rowTilt[5] });
  // numpad
  const px = nx + 3.5 * U;
  for (let c = 0; c < 4; c++) k.add('mod', cap(1), { x: px + (c + 0.5) * U, y: rowY[1], z: zRow(1), rx: rowTilt[1] });
  for (let r = 2; r <= 4; r++) for (let c = 0; c < 3; c++) k.add('key', cap(1), { x: px + (c + 0.5) * U, y: rowY[r], z: zRow(r), rx: rowTilt[r] });
  k.add('mod', cap(1, 2), { x: px + 3.5 * U, y: rowY[2], z: zRow(2) + U / 2, rx: rowTilt[2] });
  k.add('mod', cap(1, 2), { x: px + 3.5 * U, y: rowY[4], z: zRow(4) + U / 2, rx: rowTilt[4] });
  k.add('key', cap(2), { x: px + U, y: rowY[5], z: zRow(5), rx: rowTilt[5] });
  k.add('key', cap(1), { x: px + 2.5 * U, y: rowY[5], z: zRow(5), rx: rowTilt[5] });
  // lock LEDs above the numpad (num lock on)
  for (let i = 0; i < 3; i++) k.add(i === 0 ? 'led' : 'ledOff', rbox(0.004, 0.002, 0.0025, 0.0008), { x: px + (i + 0.6) * U * 1.2, y: 0.0365, z: -Dp / 2 + 0.011 });
  // fold-out feet at the back
  for (const s of [-1, 1]) k.add('plate', box(0.03, 0.006, 0.012), { x: s * 0.19, y: -0.001, z: -Dp / 2 + 0.01 });
  g.add(k.build('keyboard'));
  g.rotation.x = 0.045;
  const wrap = new THREE.Group();
  wrap.add(g);
  return { group: wrap, cablePort: new THREE.Vector3(-0.14, 0.03, -Dp / 2) };
}

// A two-button ball mouse on a cloth pad. Built with the buttons toward -z
// (away from the user), on y = 0.
export function buildMouse() {
  const g = new THREE.Group();
  const k = new Kit({
    shell: surface(BEIGE.plastic, { rough: 0.45 }),
    dark: surface(BEIGE.dark, { rough: 0.7 }),
    pad: surface('#1c1d1f', { rough: 0.95 }),
    padEdge: surface('#121314', { rough: 0.8 }),
  }, 41);
  k.add('padEdge', slab(0.23, 0.19, 0.004, 0.018, 0.0012), { rx: -Math.PI / 2, ao: 0.002 });
  k.add('pad', slab(0.226, 0.186, 0.0005, 0.017, 0), { rx: -Math.PI / 2, y: 0.0041 });
  // body: a squashed egg, flat underneath, lower toward the buttons
  const mouse = new THREE.Group();
  const km = new Kit(k.mats, 42);
  const body = new THREE.SphereGeometry(1, 32, 20);
  const p = body.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i);
    const z = p.getZ(i);
    if (y < 0) y *= 0.15;
    x *= z < 0 ? 1 + z * 0.12 : 1; // a touch narrower at the tail
    y *= 1 - Math.max(0, z) * 0.35;
    p.setXYZ(i, x * 0.031, y * 0.024, z * 0.052);
  }
  body.computeVertexNormals();
  km.add('shell', body, { y: 0.0085, ao: 0.01 });
  // the buttons: a groove down the middle and one across behind them
  km.add('dark', box(0.0016, 0.006, 0.03), { y: 0.0255, z: 0.03, rx: -0.3 });
  km.add('dark', box(0.05, 0.004, 0.0016), { y: 0.0305, z: 0.013 });
  mouse.add(km.build('mouse'));
  mouse.position.set(0.012, 0.0045, 0.01);
  mouse.rotation.y = Math.PI - 0.16;
  g.add(k.build('mousepad'), mouse);
  mouse.updateMatrix();
  // where the cable leaves the mouse, in the pad's frame
  return { group: g, tail: new THREE.Vector3(0, 0.01, 0.05).applyMatrix4(mouse.matrix) };
}
