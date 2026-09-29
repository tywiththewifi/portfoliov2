import * as THREE from 'three';
import { Kit, box, cyl, knurl, rbox, slab } from '../kit';
import { BEIGE, MINT, glow, label, segDisplay, surface } from '../mats';

// A mid-90s beige AT tower: steel shell with pressed ribs and a vent patch
// on the side, a plastic front bezel with a CD-ROM, two blanking plates and
// a floppy drive, the power/reset cluster with a keylock, a mint power LED
// and a disk LED, a two-digit MHz readout, and a vent grille at the foot.
// Built facing +z, standing on y = 0.
export function buildTower() {
  const g = new THREE.Group();
  const power = glow(MINT);
  const disk = glow('#d8fff2', 0.1);
  const k = new Kit({
    steel: surface(BEIGE.steel, { rough: 0.45 }),
    bezel: surface(BEIGE.plastic, { rough: 0.5 }),
    plate: surface('#d3c7ad', { rough: 0.5 }),
    dark: surface(BEIGE.dark, { rough: 0.7 }),
    rubber: surface(BEIGE.rubber, { rough: 0.9 }),
    chrome: surface('#cfd0d2', { rough: 0.2, metal: 1 }),
    power, disk,
  }, 23);
  const W = 0.19, H = 0.42, D = 0.42, y0 = 0.012;
  const cy = y0 + H / 2;
  // shell and a dark seam where the bezel meets it
  k.add('steel', rbox(W - 0.004, H - 0.006, D - 0.024, 0.006, 3), { y: cy, z: -0.016, ao: 0.02 });
  k.add('dark', box(W - 0.006, H - 0.008, 0.004), { y: cy, z: D / 2 - 0.026 });
  const bz = D / 2 - 0.024; // bezel back face
  k.add('bezel', slab(W, H, 0.024, 0.01, 0.004), { y: cy, z: bz, ao: 0.02, wear: 0.5 });
  const fz = bz + 0.024; // bezel front face
  const top = y0 + H;

  // a drive bay: dark opening, and a faceplate just shy of flush
  const bay = (y: number, w: number, h: number) => {
    k.add('dark', box(w + 0.004, h + 0.004, 0.002), { y, z: fz });
    k.add('plate', rbox(w, h, 0.006, 0.0015), { y, z: fz - 0.0015, wear: 0.6 });
    return fz + 0.0015;
  };
  // CD-ROM: tray seam, eject button, busy light, headphone jack and volume
  let y = top - 0.045;
  let z = bay(y, 0.148, 0.041);
  k.add('dark', box(0.128, 0.0016, 0.001), { y: y + 0.006, z });
  k.add('dark', box(0.128, 0.0012, 0.001), { y: y - 0.012, z });
  k.add('plate', rbox(0.016, 0.006, 0.005, 0.0015), { x: 0.052, y: y - 0.0125, z: z + 0.001, tint: 0.9 });
  k.add('dark', box(0.004, 0.002, 0.001), { x: 0.03, y: y - 0.0125, z: z + 0.0005 });
  k.add('dark', cyl(0.0022, 0.0022, 0.002, 12), { x: -0.058, y: y - 0.0125, z, rx: Math.PI / 2 });
  k.add('dark', knurl(0.004, 0.004, 12, 0.15), { x: -0.045, y: y - 0.0125, z: z + 0.001, rx: Math.PI / 2 });
  // two blanking plates with a finger groove
  for (const dy of [0.047, 0.094]) {
    y = top - 0.045 - dy;
    z = bay(y, 0.148, 0.041);
    k.add('dark', box(0.1, 0.0012, 0.001), { y, z });
  }
  // 3.5" floppy: slot with a metal shutter behind, eject button
  y = top - 0.19;
  z = bay(y, 0.104, 0.027);
  k.add('dark', box(0.08, 0.005, 0.001), { y: y + 0.003, z });
  k.add('chrome', box(0.05, 0.0035, 0.001), { x: -0.008, y: y + 0.003, z: z - 0.0004, tint: 0.6 });
  k.add('plate', rbox(0.012, 0.006, 0.005, 0.0015), { x: 0.036, y: y - 0.007, z: z + 0.001, tint: 0.9 });

  // control cluster: big power rocker, reset, the two LEDs, keylock
  y = top - 0.262;
  k.add('dark', rbox(0.036, 0.036, 0.004, 0.004), { x: 0.045, y, z: fz });
  k.add('bezel', rbox(0.03, 0.03, 0.012, 0.004, 3), { x: 0.045, y, z: fz + 0.004, tint: 0.97, wear: 0.7 });
  for (const x of [-0.012, 0.006]) {
    k.add('dark', cyl(0.0062, 0.0062, 0.003, 18), { x, y: y + 0.008, z: fz, rx: Math.PI / 2 });
    k.add('bezel', cyl(0.0048, 0.005, 0.007, 18), { x, y: y + 0.008, z: fz + 0.003, rx: Math.PI / 2, tint: 0.9 });
  }
  k.add('power', cyl(0.0026, 0.0026, 0.003, 12), { x: -0.012, y: y - 0.01, z: fz + 0.001, rx: Math.PI / 2 });
  k.add('disk', cyl(0.0022, 0.0022, 0.003, 10), { x: 0.006, y: y - 0.01, z: fz + 0.001, rx: Math.PI / 2 });
  k.add('chrome', cyl(0.007, 0.0075, 0.006, 24), { x: -0.05, y: y + 0.004, z: fz + 0.002, rx: Math.PI / 2 });
  k.add('dark', box(0.0012, 0.006, 0.001), { x: -0.05, y: y + 0.004, z: fz + 0.0052 });
  // MHz readout window
  k.add('dark', rbox(0.036, 0.022, 0.003, 0.002), { x: -0.03, y: y - 0.04, z: fz + 0.0005 });
  // vent grille at the foot and a rubber foot at each corner
  for (let i = 0; i < 9; i++) k.add('dark', rbox(0.12, 0.0035, 0.004, 0.0015), { y: y0 + 0.028 + i * 0.0085, z: fz - 0.001 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.add('rubber', cyl(0.011, 0.012, y0, 16), { x: sx * (W / 2 - 0.022), y: y0 / 2, z: sz * (D / 2 - 0.03) });
  // side panel (+x, toward the monitor and the camera): two pressed ribs, a
  // vent patch and the thumbscrews along the back edge
  const sx = W / 2 - 0.002;
  for (const ry of [cy + 0.12, cy - 0.12]) k.add('steel', rbox(0.004, 0.012, D - 0.1, 0.002), { x: sx, y: ry, z: -0.02, tint: 1.03, wear: 0.8 });
  for (let i = 0; i < 6; i++) for (let j = 0; j < 8; j++) k.add('dark', cyl(0.0028, 0.0028, 0.002, 8), { x: sx + 0.0012, y: cy - 0.05 + i * 0.012, z: -0.08 + j * 0.012 + (i % 2) * 0.006, rz: Math.PI / 2 });
  for (const py of [cy - 0.17, cy, cy + 0.17]) {
    k.add('chrome', cyl(0.0045, 0.0045, 0.004, 14), { x: sx + 0.002, y: py, z: -D / 2 + 0.012, rz: Math.PI / 2 });
    k.add('dark', box(0.001, 0.005, 0.001), { x: sx + 0.0042, y: py, z: -D / 2 + 0.012 });
  }
  g.add(k.build('tower'));

  // decals: the MHz readout and a model badge
  const mhz = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.017), glow('#ffffff', 0.85, segDisplay('66', MINT, '#0c2a22', '#06120e')));
  mhz.position.set(-0.03, top - 0.302, fz + 0.0022);
  g.add(mhz);
  const badge = label(0.06, 0.02, (c, _w, h) => {
    c.fillStyle = '#4c4238';
    c.font = `${h * 0.46}px "NB International Pro", "Helvetica Neue", Arial, sans-serif`;
    c.textBaseline = 'middle';
    c.fillText('486DX2', 0, h * 0.34);
    c.font = `${h * 0.28}px "NB International Pro Mono", ui-monospace, monospace`;
    c.fillStyle = '#8a7c6a';
    c.fillText('MULTIMEDIA', 0, h * 0.78);
  }, { bg: BEIGE.plastic });
  badge.position.set(0.028, top - 0.3, fz + 0.0002);
  g.add(badge);

  return { group: g, disk, back: new THREE.Vector3(0.05, 0.3, -D / 2 + 0.01) };
}
