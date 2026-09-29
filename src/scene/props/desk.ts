import * as THREE from 'three';
import { Kit, box, cyl, rbox, rng } from '../kit';
import { surface } from '../mats';

export const DESK = { top: 0.75, width: 1.7, depth: 0.8 };

// A long, low work desk: an oak top with a softened edge on graphite
// powder-coated sled legs, a back stretcher, a wire cable tray with a power
// strip underneath, and levelling feet. Centred on the origin, top at y = 0.75.
export function buildDesk() {
  const { top: T, width: W, depth: D } = DESK;
  const k = new Kit({
    oak: surface('#ffffff', { rough: 0.5, map: oakTexture() }),
    edge: surface('#4a3d33', { rough: 0.55 }),
    steel: surface('#3a3b3e', { rough: 0.4, metal: 0.5 }),
    rubber: surface('#0d0d0e', { rough: 0.85 }),
    strip: surface('#e9e7e1', { rough: 0.5 }),
    socket: surface('#3a3936', { rough: 0.6 }),
  }, 5);
  const th = 0.034, legIn = 0.07, tube = 0.04;
  // top: an oak veneered board; the edge band a shade darker
  k.add('edge', rbox(W, th, D, 0.008, 3), { y: T - th / 2, ao: 0 });
  k.add('oak', box(W - 0.012, 0.002, D - 0.012), { y: T - 0.0009, wear: 0, jitter: 0 });

  // sled legs: a rectangular loop of square tube at each end, set in a
  // little, with a mounting rail under the top
  const lh = T - th; // leg height to the underside of the top
  for (const s of [-1, 1]) {
    const x = s * (W / 2 - legIn);
    for (const z of [-(D / 2 - 0.05), D / 2 - 0.05]) k.add('steel', rbox(tube, lh - tube, tube, 0.004), { x, y: tube + (lh - tube) / 2 - 0.004, z });
    k.add('steel', rbox(tube, tube, D - 0.06, 0.004), { x, y: tube / 2 + 0.008, z: 0 }); // foot bar
    k.add('steel', rbox(tube * 1.2, 0.02, D - 0.1, 0.003), { x, y: lh - 0.01, z: 0 }); // top rail
    for (const z of [-(D / 2 - 0.07), D / 2 - 0.07]) k.add('rubber', cyl(0.013, 0.015, 0.008, 16), { x, y: 0.004, z, ao: 0.004 });
  }
  // back stretcher between the two legs, just under the top
  k.add('steel', rbox(W - legIn * 2, 0.05, 0.02, 0.004), { y: lh - 0.045, z: -(D / 2 - 0.06) });

  // wire cable tray hanging under the back edge, with a power strip in it
  const trayW = 0.9, trayD = 0.12, trayY = lh - 0.12, trayZ = -(D / 2 - 0.14);
  const wire = 0.0025;
  for (let i = 0; i <= 18; i++) {
    const x = -trayW / 2 + (i * trayW) / 18;
    k.add('steel', box(wire, wire, trayD), { x, y: trayY, z: trayZ });
    k.add('steel', box(wire, 0.06, wire), { x, y: trayY + 0.03, z: trayZ - trayD / 2 });
    k.add('steel', box(wire, 0.05, wire), { x, y: trayY + 0.025, z: trayZ + trayD / 2 });
  }
  for (const [y, z] of [[trayY, trayZ - trayD / 2], [trayY, trayZ + trayD / 2], [trayY + 0.05, trayZ + trayD / 2], [trayY + 0.06, trayZ - trayD / 2], [trayY, trayZ]] as const) {
    k.add('steel', box(trayW, wire, wire), { y, z });
  }
  for (const x of [-trayW / 2 + 0.05, trayW / 2 - 0.05]) k.add('steel', box(0.012, lh - trayY, 0.012), { x, y: (lh + trayY) / 2, z: trayZ - trayD / 2 });
  k.add('strip', rbox(0.34, 0.03, 0.055, 0.008), { x: -0.12, y: trayY + 0.017, z: trayZ + 0.01 });
  for (let i = 0; i < 5; i++) k.add('socket', rbox(0.034, 0.003, 0.034, 0.012), { x: -0.26 + i * 0.056, y: trayY + 0.033, z: trayZ + 0.01 });
  return { group: k.build('desk') };
}

// Oak: long, slightly wavy grain lines over a warm mid-brown base, with
// a few darker streaks and a faint pore speckle. Mapped across the top.
function oakTexture() {
  const W = 2048, H = 1024;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d')!;
  const R = rng(77);
  c.fillStyle = '#6f5b4a';
  c.fillRect(0, 0, W, H);
  // broad colour bands
  for (let i = 0; i < 26; i++) {
    const y = R() * H, h = 20 + R() * 90;
    c.fillStyle = R() < 0.5 ? 'rgba(20,14,10,0.16)' : 'rgba(92,74,58,0.12)';
    c.fillRect(0, y, W, h);
  }
  // grain lines: gently wandering strokes along x
  for (let i = 0; i < 420; i++) {
    let y = R() * H;
    const amp = 2 + R() * 7, freq = 0.001 + R() * 0.003, ph = R() * 10;
    c.strokeStyle = R() < 0.7 ? `rgba(18,12,8,${0.08 + R() * 0.2})` : `rgba(120,98,78,${0.05 + R() * 0.1})`;
    c.lineWidth = 0.6 + R() * 1.8;
    c.beginPath();
    for (let x = 0; x <= W; x += 16) {
      const yy = y + Math.sin(x * freq + ph) * amp;
      if (x === 0) c.moveTo(x, yy); else c.lineTo(x, yy);
    }
    c.stroke();
    y += 1;
  }
  // pores
  for (let i = 0; i < 9000; i++) {
    c.fillStyle = `rgba(10,6,4,${0.1 + R() * 0.2})`;
    c.fillRect(R() * W, R() * H, 2 + R() * 6, 1);
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
