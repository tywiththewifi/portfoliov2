import * as THREE from 'three';
import { FACE_Z, Kit, box, cyl, knurl, lathe, rbox, slab, torus } from '../kit';
import { MINT, canvasTexture, glow, setGlow, surface } from '../mats';

// A graphite stereo cassette boombox: two perforated-grille speakers in
// chrome trim rings, a cassette deck behind a smoked door with the tape's
// reels turning and its tape packs winding across, a backlit tuner dial, a
// two-channel LED level meter, piano keys on top (play held down), three
// knobs, a carry handle and a telescopic antenna. Built facing +z, on y = 0.
// It plays along with the site's music (see `update`).
export function buildBoombox() {
  const g = new THREE.Group();
  const W = 0.56, H = 0.27, D = 0.14;
  const fz = D / 2; // front face
  const k = new Kit({
    body: surface('#2a2b2f', { rough: 0.5 }),
    face: surface('#34363b', { rough: 0.42, metal: 0.35 }),
    grille: surface('#ffffff', { rough: 0.45, metal: 0.6, map: grilleTexture() }),
    chrome: surface('#d0d3d8', { rough: 0.18, metal: 1 }),
    dark: surface('#0e0e10', { rough: 0.7 }),
    key: surface('#303236', { rough: 0.4, metal: 0.2 }),
    rubber: surface('#101012', { rough: 0.85 }),
    knob: surface('#8d9096', { rough: 0.3, metal: 0.9 }),
    power: glow(MINT),
  }, 61);

  // shell and a slightly inset front panel
  k.add('body', rbox(W, H, D, 0.022, 4), { y: H / 2 + 0.008, ao: 0.02 });
  k.add('face', slab(W - 0.024, H - 0.03, 0.004, 0.012, 0.0012), { y: H / 2 + 0.008, z: fz - 0.001 });
  const face = fz + 0.003;

  // speakers: a chrome trim ring, a dark surround and a domed grille
  const spY = 0.122, spR = 0.084;
  for (const x of [-0.178, 0.178]) {
    k.add('dark', cyl(spR + 0.004, spR + 0.004, 0.004, 64), { x, y: spY, z: face, rx: FACE_Z });
    k.add('chrome', torus(spR + 0.002, 0.0042, 72, 10), { x, y: spY, z: face + 0.002 });
    k.add('grille', grilleDome(spR), { x, y: spY, z: face - 0.001, rx: FACE_Z, wear: 0, jitter: 0 });
    // four screws round the ring
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (i * Math.PI) / 2;
      k.add('chrome', cyl(0.0028, 0.0028, 0.002, 12), { x: x + Math.cos(a) * (spR + 0.016), y: spY + Math.sin(a) * (spR + 0.016), z: face + 0.001, rx: FACE_Z, tint: 0.8 });
    }
  }

  // cassette deck: a dark well on the face, the tape in front of it, then
  // the door (a frame round a smoked window) and its eject tab
  const dy = 0.118, dw = 0.15, dh = 0.1;
  k.add('dark', box(dw + 0.008, dh + 0.008, 0.002), { y: dy, z: face + 0.0005 });
  const door = new THREE.Shape();
  door.moveTo(-dw / 2, -dh / 2); door.lineTo(dw / 2, -dh / 2); door.lineTo(dw / 2, dh / 2); door.lineTo(-dw / 2, dh / 2); door.lineTo(-dw / 2, -dh / 2);
  const win = new THREE.Path();
  win.moveTo(-0.06, -0.034); win.lineTo(0.06, -0.034); win.lineTo(0.06, 0.036); win.lineTo(-0.06, 0.036); win.lineTo(-0.06, -0.034);
  door.holes.push(win);
  k.add('key', new THREE.ExtrudeGeometry(door, { depth: 0.006, bevelEnabled: true, bevelThickness: 0.001, bevelSize: 0.001, bevelSegments: 1 }), { y: dy, z: face + 0.0025 });
  k.add('dark', box(0.03, 0.004, 0.003), { y: dy - dh / 2 + 0.007, z: face + 0.01 });

  // tuner dial window (lit separately) with a chrome bezel
  const dialY = 0.228, dialW = 0.22, dialH = 0.03;
  k.add('chrome', slab(dialW + 0.008, dialH + 0.008, 0.002, 0.004, 0.0006), { y: dialY, z: face - 0.0005, tint: 0.75 });
  // level meter surround, left and right of the dial
  for (const x of [-0.18, 0.18]) k.add('dark', rbox(0.1, 0.02, 0.002, 0.003), { x, y: dialY, z: face });
  // knobs: volume, bass, treble under the deck
  for (const x of [-0.04, 0, 0.04]) {
    k.add('dark', cyl(0.0105, 0.0105, 0.003, 24), { x, y: 0.043, z: face, rx: FACE_Z });
    k.add('knob', knurl(0.0085, 0.01, 24, 0.1), { x, y: 0.043, z: face + 0.005, rx: FACE_Z });
    k.add('dark', box(0.0014, 0.005, 0.001), { x, y: 0.047, z: face + 0.0101 });
  }
  k.add('power', cyl(0.0022, 0.0022, 0.002, 12), { x: 0.066, y: 0.043, z: face + 0.001, rx: FACE_Z });

  // piano keys along the top front edge: rec, play (held down), rew, ff,
  // stop/eject, pause
  const top = H + 0.008;
  k.add('dark', box(0.17, 0.006, 0.05), { y: top - 0.002, z: fz - 0.04 });
  for (let i = 0; i < 6; i++) {
    const down = i === 1 ? 0.005 : 0;
    k.add('key', rbox(0.025, 0.014, 0.045, 0.003), { x: -0.07 + i * 0.028, y: top + 0.004 - down, z: fz - 0.038, wear: 0.6 });
  }

  // carry handle: two posts and a bar with a rubber grip
  for (const x of [-0.21, 0.21]) k.add('body', rbox(0.03, 0.05, 0.03, 0.008), { x, y: top + 0.02, z: -0.015 });
  k.add('chrome', cyl(0.009, 0.009, 0.45, 24), { y: top + 0.05, z: -0.015, rz: Math.PI / 2 });
  k.add('rubber', cyl(0.013, 0.013, 0.2, 24), { y: top + 0.05, z: -0.015, rz: Math.PI / 2 });

  // telescopic antenna: a swivel at the back right, three sections, a ball tip
  const ant = new THREE.Group();
  const ka = new Kit(k.mats, 62);
  ka.add('body', cyl(0.009, 0.009, 0.016, 16), { rz: Math.PI / 2 });
  const lens = [0.09, 0.09, 0.08], rad = [0.0042, 0.0033, 0.0025];
  let y = 0;
  lens.forEach((l, i) => { ka.add('chrome', cyl(rad[i], rad[i], l, 12), { y: y + l / 2 }); y += l - 0.008; });
  ka.add('chrome', new THREE.SphereGeometry(0.005, 12, 8), { y: y + 0.008 });
  ant.add(ka.build('antenna'));
  ant.position.set(W / 2 - 0.035, top + 0.002, -D / 2 + 0.02);
  ant.rotation.set(-0.3, 0, -0.42);

  // rubber feet
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.add('rubber', cyl(0.012, 0.013, 0.008, 16), { x: sx * (W / 2 - 0.05), y: 0.004, z: sz * (D / 2 - 0.03), ao: 0.004 });
  g.add(k.build('boombox'), ant);

  // the dial: printed scales on a warm backlight, a mint needle
  const dial = new THREE.Mesh(new THREE.PlaneGeometry(dialW, dialH), glow('#ffffff', 0.9, dialTexture(dialW, dialH)));
  dial.position.set(0, dialY, face + 0.0018);
  g.add(dial);

  // the tape: shell, label, window, and two reels whose packs wind across
  const tape = buildTape();
  tape.group.position.set(0, dy + 0.001, face + 0.0045);
  g.add(tape.group);
  // smoked door glass over it
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.122, 0.072), new THREE.MeshStandardMaterial({ color: '#0a0b0c', roughness: 0.08, transparent: true, opacity: 0.3, depthWrite: false }));
  glass.position.set(0, dy + 0.001, face + 0.009);
  g.add(glass);

  // level meters: a pair of eight-segment rows (left and right channel)
  // each side of the dial; the top two segments are the white peak lights
  const meters: THREE.MeshBasicMaterial[][] = [];
  for (const x0 of [-0.222, 0.138]) {
    for (const yy of [dialY + 0.0045, dialY - 0.0045]) {
      const row: THREE.MeshBasicMaterial[] = [];
      for (let i = 0; i < 8; i++) {
        const m = glow(i >= 6 ? '#ffffff' : MINT, 0.08);
        const seg = new THREE.Mesh(new THREE.PlaneGeometry(0.0085, 0.0055), m);
        seg.position.set(x0 + i * 0.0108, yy, face + 0.0015);
        g.add(seg);
        row.push(m);
      }
      meters.push(row);
    }
  }

  // Drive the deck from the music. While it plays the reels turn and the
  // meters show the left and right channel levels (top row left, bottom
  // row right, both sides); `kick`, a decaying beat envelope, pushes the
  // speaker grilles out and gives the whole box a small bump. Stopped, the
  // reels stand still and the meters fall away.
  const grille = g.getObjectByName('boombox-grille')!;
  const grilleZ = grille.position.z;
  let wound = 0.35; // share of tape on the take-up (right) reel
  tape.wind(wound, 0); // size the packs before the first play
  let level = [0, 0, 0, 0];
  const update = (dt: number, s: { playing: boolean; left: number; right: number; kick: number }) => {
    if (s.playing) {
      wound = (wound + dt * 0.004) % 1;
      tape.wind(wound, dt);
    }
    const target = [s.left, s.right, s.left, s.right];
    level = level.map((l, i) => {
      const to = s.playing ? target[i] : 0;
      if (!dt) return to; // a still frame shows the level as it is
      return to > l ? to : Math.max(0, l - dt * 1.6); // fast attack, slow fall
    });
    meters.forEach((row, r) => row.forEach((m, i) => setGlow(m, (i + 0.5) / 8 < level[r] ? 1 : 0.08)));
    grille.position.z = grilleZ + s.kick * 0.009;
    g.scale.setScalar(1 + s.kick * 0.012);
  };
  update(0, { playing: false, left: 0, right: 0, kick: 0 });
  return { group: g, update };
}

// A compact cassette as it sits in the deck: cream shell, a label with a
// mint band, and through the label's window the two hubs turning, their
// brown tape packs winding from one to the other.
function buildTape() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.063, 0.006), new THREE.MeshStandardMaterial({ color: '#e9e5da', roughness: 0.45 }));
  g.add(body);
  const wy = 0.004; // window centre
  // dark interior behind the window, the packs and hubs, then the label
  // (window cut out of it) and the window's clear plastic
  const inside = new THREE.Mesh(new THREE.PlaneGeometry(0.064, 0.02), new THREE.MeshStandardMaterial({ color: '#0d0b0a', roughness: 0.6 }));
  inside.position.set(0, wy, 0.00305);
  g.add(inside);
  const packMat = new THREE.MeshStandardMaterial({ color: '#4a2f1c', roughness: 0.3, metalness: 0.25 });
  const hubMat = new THREE.MeshStandardMaterial({ color: '#f6f4ee', roughness: 0.4 });
  const reels: { pack: THREE.Mesh; hub: THREE.Group }[] = [];
  for (const x of [-0.021, 0.021]) {
    const pack = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.0004, 40), packMat);
    pack.rotation.x = FACE_Z;
    pack.position.set(x, wy, 0.0031);
    g.add(pack);
    const hub = new THREE.Group();
    hub.add(new THREE.Mesh(lathe([[0.0042, 0], [0.006, 0], [0.006, 0.0008], [0.0042, 0.0008]], 24), hubMat));
    for (let i = 0; i < 6; i++) {
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.0014, 0.0008, 0.002), hubMat);
      const a = (i / 6) * Math.PI * 2;
      tooth.position.set(Math.cos(a) * 0.0034, 0.0004, Math.sin(a) * 0.0034);
      tooth.rotation.y = -a;
      hub.add(tooth);
    }
    hub.rotation.x = FACE_Z;
    hub.position.set(x, wy, 0.0032);
    g.add(hub);
    reels.push({ pack, hub });
  }
  const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.05), new THREE.MeshStandardMaterial({ map: tapeLabel(0.09, 0.05), roughness: 0.6, alphaTest: 0.5 }));
  lab.position.set(0, 0.004, 0.0034);
  g.add(lab);
  const clear = new THREE.Mesh(new THREE.PlaneGeometry(0.064, 0.02), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.05, transparent: true, opacity: 0.08, depthWrite: false }));
  clear.position.set(0, wy, 0.0036);
  g.add(clear);
  const MIN = 0.0062, MAX = 0.0205; // pack radius, bare hub to full reel
  const wind = (w: number, dt: number) => {
    // tape area is conserved, so r² grows linearly with the tape wound on
    const rTake = Math.sqrt(MIN * MIN + (MAX * MAX - MIN * MIN) * w);
    const rFeed = Math.sqrt(MIN * MIN + (MAX * MAX - MIN * MIN) * (1 - w));
    reels[0].pack.scale.set(rFeed, 1, rFeed);
    reels[1].pack.scale.set(rTake, 1, rTake);
    // constant tape speed: the emptier reel turns faster
    reels[0].hub.rotation.y -= (dt * 0.02) / rFeed;
    reels[1].hub.rotation.y -= (dt * 0.02) / rTake;
  };
  return { group: g, wind };
}

function tapeLabel(w: number, h: number) {
  return canvasTexture(w, h, (c, W, H) => {
    c.fillStyle = '#f2efe6'; c.fillRect(0, 0, W, H);
    c.fillStyle = MINT; c.fillRect(0, H * 0.8, W, H * 0.2);
    c.fillStyle = '#2b2b2b';
    c.font = `${H * 0.12}px "NB International Pro Mono", ui-monospace, monospace`;
    c.textBaseline = 'middle';
    c.fillText('A', W * 0.05, H * 0.13);
    c.fillText('NIGHT SHIFT', W * 0.13, H * 0.13);
    c.textAlign = 'right';
    c.fillText('C60', W * 0.95, H * 0.13);
    // the window: cut out (alpha 0) so the hubs behind show through
    c.globalCompositeOperation = 'destination-out';
    c.beginPath(); c.roundRect(W * (0.5 - 0.064 / w / 2), H * 0.5 - (0.02 / h) * H / 2, (0.064 / w) * W, (0.02 / h) * H, H * 0.06); c.fill();
  }, undefined, 6000);
}

// Tuner scale: FM and AM rows of ticks and numbers on a warm backlight,
// with a mint needle part way along.
function dialTexture(w: number, h: number) {
  return canvasTexture(w, h, (c, W, H) => {
    const bg = c.createLinearGradient(0, 0, W, 0);
    bg.addColorStop(0, '#2a2620'); bg.addColorStop(0.5, '#6a5a44'); bg.addColorStop(1, '#2a2620');
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(0, 0, W, H);
    c.strokeStyle = '#e8e2d6'; c.fillStyle = '#e8e2d6';
    c.lineWidth = Math.max(1, H * 0.02);
    c.font = `${H * 0.22}px "NB International Pro Mono", ui-monospace, monospace`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    const x0 = W * 0.08, x1 = W * 0.96;
    c.textAlign = 'left';
    c.fillText('FM', W * 0.012, H * 0.3);
    c.fillText('AM', W * 0.012, H * 0.74);
    c.textAlign = 'center';
    const fm = [88, 92, 96, 100, 104, 108], am = [53, 60, 70, 90, 110, 140, 170];
    fm.forEach((f, i) => {
      const x = x0 + ((x1 - x0) * i) / (fm.length - 1);
      c.fillText(String(f), x, H * 0.3);
    });
    am.forEach((f, i) => {
      const x = x0 + ((x1 - x0) * i) / (am.length - 1);
      c.fillText(String(f), x, H * 0.74);
    });
    for (let i = 0; i <= 40; i++) {
      const x = x0 + ((x1 - x0) * i) / 40, t = i % 5 === 0 ? 0.12 : 0.06;
      c.beginPath(); c.moveTo(x, H * 0.5 - H * t); c.lineTo(x, H * 0.5 + H * t); c.stroke();
    }
    c.fillStyle = MINT;
    c.fillRect(x0 + (x1 - x0) * 0.62, H * 0.06, Math.max(2, W * 0.004), H * 0.88);
  }, undefined, 6000);
}

// A shallow dome for a speaker grille, UV-mapped flat (planar, across its
// face) so the perforations stay round. Built round +y.
function grilleDome(r: number) {
  const a = 0.42, sy = 0.09;
  const g = new THREE.SphereGeometry(1, 48, 12, 0, Math.PI * 2, 0, a);
  g.scale(r / Math.sin(a), sy, r / Math.sin(a));
  g.translate(0, -Math.cos(a) * sy, 0);
  const p = g.attributes.position as THREE.BufferAttribute, uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / (2 * r) + 0.5, p.getZ(i) / (2 * r) + 0.5);
  return g;
}

// Perforated steel: staggered round holes over a brushed grey.
function grilleTexture() {
  const S = 512;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const c = cv.getContext('2d')!;
  c.fillStyle = '#7b7f86'; c.fillRect(0, 0, S, S);
  c.fillStyle = '#0c0c0d';
  const step = 9;
  for (let y = 0; y < S + step; y += step * 0.866) {
    const row = Math.round(y / (step * 0.866));
    for (let x = (row % 2) * (step / 2); x < S + step; x += step) {
      c.beginPath(); c.arc(x, y, step * 0.3, 0, Math.PI * 2); c.fill();
    }
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
