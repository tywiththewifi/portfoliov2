import * as THREE from 'three';
import { emissive, lit } from '../materials';
import { DESK_Y } from '../room';
import { Kit, box, cyl, knurl, lathe, rbox, slab, spring, torus, tube } from './kit';
import { label } from './decals';

export type Hover = { value: number };

// Invisible material for enlarged pointer hit areas.
const HIT = new THREE.MeshBasicMaterial({ visible: false });
const FACE_Z = (THREE.MathUtils.degToRad(90)); // lathe profiles are built around +y; this turns them to face +z

// ---------------------------------------------------------------- speakers
// Walnut bookshelf monitors: veneered cabinet, satin black baffle with a
// dome tweeter in a shallow waveguide, a woofer with a rolled rubber
// surround, paper cone and dust cap, screws, a flared bass port, power LED
// and rubber feet.
export function buildSpeakers(at: [number, number, number][], toward: THREE.Vector3) {
  const g = new THREE.Group();
  const SW = 0.13, SH = 0.215, SD = 0.16;
  const speakers: THREE.Group[] = [];
  at.forEach(([x, y, z], si) => {
    const k = new Kit({
      veneer: lit({ color: '#7a4228', vcol: true, rough: 0.38, grain: 0.32, grainScale: [260, 7, 260] }),
      baffle: lit({ color: '#1d1a1a', vcol: true, rough: 0.62, grain: 0.06, grainScale: [500, 500, 500] }),
      frame: lit({ color: '#2b2828', vcol: true, rough: 0.4, metal: 0.3 }),
      rubber: lit({ color: '#141212', vcol: true, rough: 0.75 }),
      cone: lit({ color: '#262322', vcol: true, rough: 0.85, grain: 0.12, grainScale: [900, 900, 900] }),
      dome: lit({ color: '#3a3634', vcol: true, rough: 0.2, metal: 0.6 }),
      screw: lit({ color: '#77736e', vcol: true, rough: 0.3, metal: 1 }),
      led: emissive({ color: '#62ff7a', intensity: 1 }),
    }, 50 + si);
    // cabinet with a baffle inset into the front
    k.add('veneer', rbox(SW, SH, SD, 0.006, 3), { y: SH / 2, ao: 0.015 });
    k.add('baffle', slab(SW - 0.008, SH - 0.008, 0.006, 0.004, 0.0015), { y: SH / 2, z: SD / 2 - 0.004 });
    const fz = SD / 2 + 0.002;
    // tweeter
    const ty = SH - 0.042;
    k.add('frame', lathe([[0.026, 0], [0.026, 0.002], [0.022, 0.004], [0.016, 0.0015], [0.0125, 0.0005], [0.0125, 0]], 40), { y: ty, z: fz, rx: FACE_Z });
    k.add('dome', new THREE.SphereGeometry(0.0115, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2.4), { y: ty, z: fz - 0.004, rx: FACE_Z, s: [1, 0.55, 1] });
    // woofer
    const wy = 0.083;
    k.add('frame', lathe([[0.052, 0], [0.052, 0.0025], [0.047, 0.0025], [0.047, 0.0005]], 48), { y: wy, z: fz, rx: FACE_Z });
    k.add('rubber', torus(0.0425, 0.0048, 48, 10, Math.PI * 2), { y: wy, z: fz + 0.0005 });
    k.add('cone', lathe([[0.038, 0.0005], [0.032, -0.004], [0.022, -0.011], [0.013, -0.016], [0.012, -0.0165]], 48), { y: wy, z: fz, rx: FACE_Z });
    k.add('dome', new THREE.SphereGeometry(0.0145, 24, 8, 0, Math.PI * 2, 0, Math.PI / 3), { y: wy, z: fz - 0.023, rx: FACE_Z, s: [1, 0.9, 1], tint: 0.6 });
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (i * Math.PI) / 2;
      k.add('screw', cyl(0.0026, 0.0026, 0.0018, 12), { x: Math.cos(a) * 0.0495, y: wy + Math.sin(a) * 0.0495, z: fz + 0.0028, rx: FACE_Z });
      k.add('screw', cyl(0.0022, 0.0022, 0.0015, 10), { x: Math.cos(a) * 0.022, y: ty + Math.sin(a) * 0.022, z: fz + 0.0035, rx: FACE_Z });
    }
    // flared port, power LED, feet
    k.add('frame', lathe([[0.012, 0.004], [0.0105, 0.001], [0.01, -0.012]], 32), { x: -0.032, y: 0.022, z: fz - 0.002, rx: FACE_Z });
    k.add('rubber', cyl(0.0102, 0.0102, 0.001, 32), { x: -0.032, y: 0.022, z: fz - 0.0125, rx: FACE_Z });
    k.add('led', cyl(0.0018, 0.0018, 0.002, 10), { x: 0.045, y: 0.022, z: fz + 0.001, rx: FACE_Z });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.add('rubber', cyl(0.009, 0.01, 0.006, 14), { x: sx * (SW / 2 - 0.018), y: -0.003, z: sz * (SD / 2 - 0.022) });
    const s = new THREE.Group();
    s.add(k.build('speaker'));
    s.position.set(x, y + 0.006, z);
    s.lookAt(toward.x, y + 0.006, toward.z);
    g.add(s);
    speakers.push(s);
  });
  return { group: g, speakers };
}

// ---------------------------------------------------------------- lamp
// A balanced-arm architect lamp: weighted base with a rocker switch, a
// yoke, twin rods per arm with real coil springs, bolted knuckles with wing
// nuts, and a spun-metal shade with a rolled rim and a vent ring. The arm
// groups keep the structure the hero's IK rig drives.
export function buildLamp(hover: Hover, base: THREE.Vector3, armL = 0.46, armU = 0.38) {
  const g = new THREE.Group();
  const mats = {
    enamel: lit({ hover, color: '#e9dcc3', vcol: true, rough: 0.3, grain: 0.04, grainScale: [300, 300, 300] }),
    steel: lit({ hover, color: '#b9b4ac', vcol: true, rough: 0.24, metal: 1 }),
    dark: lit({ hover, color: '#3a342e', vcol: true, rough: 0.5 }),
    spring: lit({ hover, color: '#cfc8bc', vcol: true, rough: 0.2, metal: 1 }),
    red: lit({ hover, color: '#d8452f', vcol: true, rough: 0.4 }),
    inner: lit({ hover, color: '#fff4dc', vcol: true, rough: 0.6, side: THREE.BackSide }),
  };
  const kit = (seed: number) => new Kit(mats, seed);
  const baseX = base.x, baseZ = base.z;

  // base, collar and switch housing
  const kb = kit(61);
  kb.add('enamel', lathe([[0, 0], [0.078, 0], [0.082, 0.004], [0.082, 0.014], [0.076, 0.021], [0.05, 0.026], [0.032, 0.03], [0, 0.03]], 56), { ao: 0.01 });
  kb.add('dark', cyl(0.083, 0.083, 0.002, 56), { y: 0.001 });
  kb.add('steel', cyl(0.022, 0.026, 0.02, 24), { y: 0.038 });
  // yoke: two cheeks and a bolt the lower arm pivots on
  for (const s of [-1, 1]) kb.add('steel', rbox(0.006, 0.034, 0.03, 0.002), { y: 0.058, z: s * 0.015 });
  kb.add('steel', cyl(0.0035, 0.0035, 0.044, 12), { y: 0.064, rx: Math.PI / 2 });
  kb.add('dark', rbox(0.034, 0.014, 0.042, 0.004), { x: 0.052, y: 0.03, z: 0.028 });
  // cord out of the back of the base
  kb.add('dark', tube([new THREE.Vector3(-0.05, 0.012, -0.02), new THREE.Vector3(-0.1, 0.004, -0.06), new THREE.Vector3(-0.12, 0.003, -0.16), new THREE.Vector3(-0.06, 0.003, -0.3)], 0.0028, 40, 6));
  const baseMesh = kb.build('lamp-base');
  baseMesh.position.set(baseX, DESK_Y, baseZ);
  g.add(baseMesh);
  const rocker = new THREE.Mesh(rbox(0.022, 0.008, 0.03, 0.003), mats.red);
  rocker.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(rocker.geometry.attributes.position.count * 3).fill(1), 3));
  const switchPivot = new THREE.Group();
  switchPivot.position.set(baseX + 0.052, DESK_Y + 0.039, baseZ + 0.028);
  switchPivot.add(rocker);
  g.add(switchPivot);

  // an arm: twin rods, a coil spring with its hook rod, end plates
  const armPair = (len: number, seed: number) => {
    const grp = new THREE.Group();
    const k = kit(seed);
    for (const s of [-1, 1]) k.add('enamel', cyl(0.0048, 0.0048, len, 12), { y: len / 2, z: s * 0.011 });
    for (const y of [0.02, len - 0.02]) k.add('steel', rbox(0.012, 0.016, 0.028, 0.002), { y });
    k.add('spring', spring(0.0055, 0.0011, len * 0.42, 26), { x: 0.02, y: len * 0.3 });
    k.add('steel', cyl(0.0012, 0.0012, len * 0.3, 6), { x: 0.02, y: len * 0.15 });
    k.add('steel', cyl(0.0012, 0.0012, len * 0.26, 6), { x: 0.02, y: len * 0.85 });
    grp.add(k.build('lamp-arm'));
    // invisible, fatter grab target: the real arms are only 10mm thick
    grp.add(new THREE.Mesh(new THREE.BoxGeometry(0.08, len, 0.08).translate(0.008, len / 2, 0), HIT));
    return grp;
  };
  const knuckle = (seed: number, r = 0.016) => {
    const k = kit(seed);
    k.add('steel', cyl(r, r, 0.036, 24), { rx: Math.PI / 2 });
    k.add('dark', cyl(r * 0.45, r * 0.45, 0.044, 12), { rx: Math.PI / 2 });
    // wing nut on the near side
    k.add('steel', cyl(0.006, 0.006, 0.006, 12), { z: 0.025, rx: Math.PI / 2 });
    k.add('steel', rbox(0.03, 0.009, 0.002, 0.001), { z: 0.028 });
    return k.build('lamp-knuckle');
  };
  const lower = new THREE.Group();
  lower.position.set(baseX, DESK_Y + 0.064, baseZ);
  lower.rotation.z = 0.35;
  lower.add(armPair(armL, 62));
  g.add(lower);
  const elbow = new THREE.Group();
  elbow.position.set(0, armL, 0);
  lower.add(elbow);
  elbow.add(knuckle(63));
  const upper = new THREE.Group();
  upper.rotation.z = 1.25;
  elbow.add(upper);
  upper.add(armPair(armU, 64));
  const head = new THREE.Group();
  head.position.set(0, armU, 0);
  upper.add(head);
  head.add(knuckle(65, 0.014));

  // shade: spun metal, a vent ring at the neck, a rolled rim, pale inside
  const shadeHolder = new THREE.Group();
  shadeHolder.rotation.z = -1.98;
  head.add(shadeHolder);
  const ks = kit(66);
  const prof: [number, number][] = [[0.001, 0.02], [0.03, 0.02], [0.038, 0.012], [0.046, -0.004], [0.052, -0.03], [0.078, -0.09], [0.11, -0.145], [0.132, -0.172]];
  ks.add('enamel', lathe(prof, 64));
  ks.add('inner', lathe(prof.map(([r, y]) => [r * 0.985, y - 0.001]), 64));
  ks.add('enamel', torus(0.1325, 0.0035, 64, 8), { y: -0.172, rx: Math.PI / 2, wear: 0.6 });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ks.add('dark', box(0.008, 0.012, 0.002), { x: Math.cos(a) * 0.0415, y: 0.004, z: Math.sin(a) * 0.0415, ry: -a + Math.PI / 2, rz: 0 });
  }
  ks.add('steel', cyl(0.014, 0.014, 0.03, 20), { y: 0.03 });
  ks.add('dark', cyl(0.018, 0.02, 0.03, 24), { y: -0.06 }); // bulb socket
  shadeHolder.add(ks.build('lamp-shade'));
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.038, 24, 16), emissive({ color: '#fff2c8', intensity: 1.3 }));
  bulb.scale.set(1, 1.15, 1);
  bulb.position.set(0, -0.11, 0);
  shadeHolder.add(bulb);
  const inner = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.128, 48), emissive({ color: '#ffdca0', intensity: 1 }));
  inner.rotation.x = Math.PI / 2;
  inner.position.set(0, -0.168, 0);
  shadeHolder.add(inner);
  return { group: g, base: new THREE.Vector3(baseX, DESK_Y + 0.064, baseZ), lower, upper, head, shadeHolder, bulb, inner, switchPivot, rocker, armL, armU };
}

// ---------------------------------------------------------------- camera
// A compact point-and-shoot: brushed silver body with a rubber grip, a
// stepped lens barrel with a knurled ring and coated glass, a flash window
// that really fires, viewfinder, AF lamp, shutter button, mode dial and a
// wrist strap trailing on the desk. Sits on y = 0.
export function buildCamera(hover: Hover, at: THREE.Vector3, ry = 0) {
  const g = new THREE.Group();
  const k = new Kit({
    silver: lit({ hover, color: '#c9ccd2', vcol: true, rough: 0.3, metal: 0.85, grain: 0.18, grainScale: [2400, 40, 40] }),
    grip: lit({ hover, color: '#2a2a2e', vcol: true, rough: 0.9, grain: 0.3, grainScale: [1200, 1200, 1200] }),
    black: lit({ hover, color: '#18181b', vcol: true, rough: 0.45 }),
    ring: lit({ hover, color: '#8c8f96', vcol: true, rough: 0.28, metal: 1 }),
    glass: lit({ hover, color: '#10141f', vcol: true, rough: 0.05, metal: 0.4 }),
    coat: lit({ hover, color: '#3a2a5a', vcol: true, rough: 0.08, metal: 0.8 }),
    window: lit({ hover, color: '#dfe6ee', vcol: true, rough: 0.15 }),
    red: lit({ hover, color: '#d8452f', vcol: true, rough: 0.35 }),
    strap: lit({ hover, color: '#1d1f26', vcol: true, rough: 0.85, grain: 0.2, grainScale: [1500, 1500, 1500] }),
  }, 71);
  const W = 0.118, H = 0.072, D = 0.036, cy = H / 2 + 0.001;
  k.add('silver', rbox(W, H, D, 0.009, 3), { y: cy, ao: 0.008 });
  k.add('grip', rbox(0.026, H - 0.012, 0.006, 0.003), { x: W / 2 - 0.018, y: cy, z: D / 2 });
  const fz = D / 2;
  // lens: mount ring, two telescoping barrels, a knurled ring, the glass
  const lx = -0.012, ly = cy - 0.002;
  k.add('ring', lathe([[0.032, 0], [0.032, 0.004], [0.029, 0.006]], 48), { x: lx, y: ly, z: fz, rx: FACE_Z });
  k.add('silver', cyl(0.027, 0.028, 0.016, 48), { x: lx, y: ly, z: fz + 0.012, rx: FACE_Z });
  k.add('black', cyl(0.024, 0.024, 0.002, 48), { x: lx, y: ly, z: fz + 0.021, rx: FACE_Z });
  k.add('silver', cyl(0.022, 0.023, 0.012, 48), { x: lx, y: ly, z: fz + 0.027, rx: FACE_Z });
  k.add('ring', knurl(0.0232, 0.004, 60, 0.03), { x: lx, y: ly, z: fz + 0.031, rx: FACE_Z });
  k.add('black', lathe([[0.02, 0], [0.0205, 0.002], [0.016, 0.003], [0.013, 0.002]], 40), { x: lx, y: ly, z: fz + 0.033, rx: FACE_Z });
  k.add('glass', new THREE.SphereGeometry(0.03, 32, 8, 0, Math.PI * 2, 0, 0.45), { x: lx, y: ly, z: fz + 0.006, rx: FACE_Z });
  k.add('coat', cyl(0.006, 0.006, 0.0005, 24), { x: lx, y: ly, z: fz + 0.0352, rx: FACE_Z });
  // flash window, viewfinder, AF lamp
  k.add('black', rbox(0.03, 0.013, 0.002, 0.002), { x: 0.02, y: cy + 0.022, z: fz });
  k.add('window', rbox(0.027, 0.0105, 0.002, 0.0015), { x: 0.02, y: cy + 0.022, z: fz + 0.0008 });
  for (let i = 0; i < 7; i++) k.add('window', box(0.0008, 0.009, 0.0008), { x: 0.0085 + i * 0.0038, y: cy + 0.022, z: fz + 0.0019, tint: 0.85 });
  k.add('black', rbox(0.012, 0.008, 0.002, 0.0015), { x: -0.001, y: cy + 0.024, z: fz });
  k.add('coat', box(0.007, 0.004, 0.0006), { x: -0.001, y: cy + 0.024, z: fz + 0.001 });
  k.add('red', new THREE.SphereGeometry(0.0022, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), { x: 0.042, y: cy + 0.01, z: fz, rx: FACE_Z });
  // top plate: shutter button in a collar, zoom lever, mode dial
  const ty = H + 0.001;
  k.add('ring', cyl(0.0075, 0.0075, 0.002, 24), { x: W / 2 - 0.02, y: ty + 0.001 });
  k.add('silver', cyl(0.0055, 0.006, 0.003, 24), { x: W / 2 - 0.02, y: ty + 0.003, tint: 1.08 });
  k.add('black', rbox(0.014, 0.003, 0.005, 0.0012), { x: W / 2 - 0.02, y: ty + 0.0015, z: 0.009 });
  k.add('black', knurl(0.008, 0.004, 24, 0.12), { x: -W / 2 + 0.02, y: ty + 0.002 });
  k.add('red', box(0.0012, 0.0006, 0.004), { x: -W / 2 + 0.02, y: ty + 0.0042, z: 0.004 });
  // strap lug and wrist strap, lying in a loose loop on the desk
  k.add('ring', torus(0.004, 0.0012, 16, 6), { x: W / 2 + 0.002, y: cy + 0.02, ry: Math.PI / 2 });
  const strap: THREE.Vector3[] = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24, a = t * Math.PI * 1.9;
    strap.push(new THREE.Vector3(W / 2 + 0.004 + Math.sin(a) * 0.05 + t * 0.02, Math.max(0.003, cy + 0.02 - t * 0.2), 0.03 - Math.cos(a) * 0.05 + 0.02));
  }
  k.add('strap', tube(strap, 0.0028, 60, 5));
  g.add(k.build('camera'));
  const brand = label(0.034, 0.006, (c, _w, h) => {
    c.fillStyle = '#4c5058'; c.font = `700 ${h * 0.82}px "Space Grotesk", "Helvetica Neue", Arial, sans-serif`;
    c.textBaseline = 'middle'; c.fillText('CYBERSNAP', 0, h * 0.55);
  }, { hover, bg: '#c9ccd2', rough: 0.3 });
  brand.position.set(0.028, cy - 0.024, fz + 0.0003);
  g.add(brand);
  // the flash tube: dark until it fires
  const flashMat = emissive({ color: '#ffffff', intensity: 0, hover });
  const flash = new THREE.Mesh(new THREE.PlaneGeometry(0.025, 0.0095), flashMat);
  flash.position.set(0.02, cy + 0.022, fz + 0.0022);
  flash.visible = false;
  g.add(flash);
  const body = g.children[0] as THREE.Object3D;
  g.position.copy(at);
  g.rotation.y = ry;
  const setFlash = (on: boolean) => { flash.visible = on; flashMat.uniforms.uIntensity.value = on ? 3 : 0; };
  return { group: g, body, setFlash };
}
