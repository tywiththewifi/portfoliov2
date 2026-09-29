import * as THREE from 'three';
import { Kit, lathe, rbox } from '../kit';
import { MINT, canvasTexture, surface } from '../mats';

// A stoneware mug, half full: a thick-walled lathed body with a rolled lip
// and a foot ring, a D-shaped handle, and coffee inside. Built on y = 0 with
// the handle toward +x.
export function buildMug() {
  const k = new Kit({
    glaze: surface('#e9e7e1', { rough: 0.28, side: THREE.DoubleSide }),
    raw: surface('#b9ad9a', { rough: 0.9 }),
    coffee: surface('#1f140c', { rough: 0.08 }),
  }, 71);
  const R = 0.041, H = 0.098, wall = 0.005;
  // outside, over the lip and down the inside, as one profile
  k.add('glaze', lathe([
    [0, 0.004], [R - 0.006, 0.004], [R - 0.004, 0.0015], [R - 0.001, 0.002], [R, 0.008],
    [R + 0.0005, H * 0.5], [R + 0.0012, H - 0.004], [R + 0.0005, H - 0.0008], [R - wall / 2, H],
    [R - wall + 0.0004, H - 0.0012], [R - wall, H - 0.006], [R - wall - 0.0004, 0.014], [R - wall - 0.004, 0.0095], [0, 0.009],
  ], 64), { ao: 0.012, jitter: 0 });
  // the unglazed foot ring
  k.add('raw', lathe([[R - 0.0065, 0], [R - 0.0025, 0], [R - 0.0012, 0.0022], [R - 0.0055, 0.0042]], 64));
  // coffee, a little below halfway
  k.add('coffee', new THREE.CircleGeometry(R - wall - 0.0006, 48), { y: H * 0.62, rx: -Math.PI / 2 });
  // handle: a flattened D swept round a curve from the upper wall to the lower
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(R - 0.002, H - 0.02, 0), new THREE.Vector3(R + 0.022, H - 0.018, 0),
    new THREE.Vector3(R + 0.03, H * 0.5, 0), new THREE.Vector3(R + 0.02, 0.024, 0), new THREE.Vector3(R - 0.002, 0.022, 0),
  ]);
  const handle = new THREE.TubeGeometry(curve, 48, 1, 12, false);
  // squash the round tube into an oval section (wider than deep)
  const p = handle.attributes.position as THREE.BufferAttribute;
  const pts = curve.getSpacedPoints(48);
  for (let i = 0; i < p.count; i++) {
    const c = pts[Math.min(48, Math.floor(i / 13))];
    const dx = p.getX(i) - c.x, dy = p.getY(i) - c.y, dz = p.getZ(i) - c.z;
    p.setXYZ(i, c.x + dx * 0.0045, c.y + dy * 0.0045, c.z + dz * 0.0075);
  }
  handle.computeVertexNormals();
  k.add('glaze', handle, { jitter: 0 });
  const g = new THREE.Group();
  g.add(k.build('mug'));

  // a small printed mark on the side facing the camera
  const mark = new THREE.Mesh(
    new THREE.CylinderGeometry(R + 0.0008, R + 0.0008, 0.02, 48, 1, true, -0.36, 0.72),
    new THREE.MeshStandardMaterial({
      map: canvasTexture(0.03, 0.02, (c, W, H) => {
        c.fillStyle = MINT;
        c.font = `${H * 0.8}px "NB International Pro", "Helvetica Neue", Arial, sans-serif`;
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('tc', W / 2, H * 0.52);
      }), transparent: true, roughness: 0.3, polygonOffset: true, polygonOffsetFactor: -1, depthWrite: false,
    }),
  );
  mark.position.y = H * 0.55;
  g.add(mark);
  return { group: g };
}

// A cassette in its clear case, lying on the desk: the J-card's cover under
// the lid (cream paper, a mint band, handwritten-looking title), the spine
// visible along one edge, the hinge pins. Built on y = 0, long side along x.
export function buildCassetteCase() {
  const g = new THREE.Group();
  const W = 0.109, D = 0.069, H = 0.017;
  const k = new Kit({
    card: surface('#ffffff', { rough: 0.8, map: jCard(W - 0.004, D - 0.004) }),
    spine: surface('#ffffff', { rough: 0.8, map: spineCard(W - 0.004, H - 0.003) }),
    tray: surface('#15161a', { rough: 0.5 }),
  }, 81);
  // the cassette tray (dark, as seen through the base) and the card on top
  k.add('tray', rbox(W - 0.002, H - 0.004, D - 0.002, 0.002), { y: H / 2 });
  // cover panel just under the lid
  const cover = new THREE.PlaneGeometry(W - 0.004, D - 0.004);
  k.add('card', cover, { y: H - 0.0018, rx: -Math.PI / 2, jitter: 0, wear: 0 });
  // spine panel along the front edge (+z), facing out
  k.add('spine', new THREE.PlaneGeometry(W - 0.004, H - 0.003), { y: H / 2, z: D / 2 - 0.0012, jitter: 0, wear: 0 });
  g.add(k.build('case'));
  // the clear shell over all of it
  const shell = new THREE.Mesh(
    rbox(W, H, D, 0.0015),
    new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.06, metalness: 0, transparent: true, opacity: 0.16, depthWrite: false }),
  );
  shell.position.y = H / 2;
  g.add(shell);
  return { group: g };
}

function jCard(w: number, h: number) {
  return canvasTexture(w, h, (c, W, H) => {
    c.fillStyle = '#efeadf'; c.fillRect(0, 0, W, H);
    c.fillStyle = MINT; c.fillRect(0, H * 0.62, W, H * 0.14);
    c.fillStyle = '#1d1d1d';
    c.font = `${H * 0.15}px "NB International Pro", "Helvetica Neue", Arial, sans-serif`;
    c.textBaseline = 'alphabetic';
    c.fillText('night shift', W * 0.07, H * 0.3);
    c.font = `${H * 0.075}px "NB International Pro Mono", ui-monospace, monospace`;
    c.fillStyle = '#5a5750';
    c.fillText('SIDE A  ·  LO-FI HOUSE / TRIP-HOP', W * 0.07, H * 0.45);
    c.fillText('C60  ·  TC 2026', W * 0.07, H * 0.9);
  }, undefined, 8000);
}

function spineCard(w: number, h: number) {
  return canvasTexture(w, h, (c, W, H) => {
    c.fillStyle = '#efeadf'; c.fillRect(0, 0, W, H);
    c.fillStyle = MINT; c.fillRect(0, 0, W * 0.06, H);
    c.fillStyle = '#1d1d1d';
    c.font = `${H * 0.46}px "NB International Pro Mono", ui-monospace, monospace`;
    c.textBaseline = 'middle';
    c.fillText('NIGHT SHIFT — SIDE A', W * 0.1, H * 0.55);
  }, undefined, 8000);
}
