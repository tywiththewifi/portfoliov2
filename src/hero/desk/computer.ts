import * as THREE from 'three';
import { emissive, lit, shared } from '../materials';
import { DESK_Y } from '../room';
import { Kit, box, cyl, knurl, lathe, rbox, slab, taper } from './kit';
import { label, segDisplay } from './decals';

export type Hover = { value: number };

// Beige-box palette: case plastic that has yellowed a little over the years,
// a slightly greyer painted steel shell, dark recesses and black rubber.
export const BEIGE = { plastic: '#ddd0b6', steel: '#d3c8b2', shade: '#bcae94', dark: '#2a2622', rubber: '#1c1a19', key: '#e9e2d0', mod: '#bdb39e' };

const plastic = (hover: Hover, color = BEIGE.plastic, extra: Parameters<typeof lit>[0] = {}) =>
  lit({ hover, color, vcol: true, rough: 0.52, grain: 0.07, grainScale: [260, 260, 260], ...extra });

// ---------------------------------------------------------------- CRT monitor
// A 14" beige CRT on a tilt-swivel foot: a bevelled bezel with a recessed,
// bulging tube, a tapered body with vent slots, knobs, a power switch and
// LED on the chin, and a badge. Front face at z = 0 in its own frame.
export function buildMonitor(hover: Hover, screenTex: THREE.Texture, at: THREE.Vector3) {
  const g = new THREE.Group();
  const k = new Kit({
    shell: plastic(hover),
    body: plastic(hover, BEIGE.shade),
    recess: lit({ hover, color: '#3a342e', vcol: true, rough: 0.7, side: THREE.DoubleSide }),
    dark: lit({ hover, color: BEIGE.dark, vcol: true, rough: 0.6, grain: 0.05 }),
    metal: lit({ hover, color: '#a9a7a2', vcol: true, rough: 0.28, metal: 1, grain: 0.05 }),
    led: emissive({ color: '#7dff9a', intensity: 1.2, hover }),
  }, 11);
  const W = 0.44, H = 0.4, D = 0.055, cy = 0.262;
  const sw = 0.352, sh = 0.268, oy = cy + 0.022; // tube opening, a little above centre

  // tilt-swivel foot: a bevelled disc, a collar and a cradle
  k.add('body', lathe([[0, 0], [0.122, 0], [0.126, 0.005], [0.124, 0.012], [0.11, 0.018], [0.075, 0.024], [0.07, 0.03], [0, 0.03]], 48), { z: -0.19, ao: 0.012 });
  k.add('body', cyl(0.06, 0.068, 0.028, 40), { y: 0.043, z: -0.19 });
  k.add('dark', cyl(0.069, 0.069, 0.003, 40), { y: 0.031, z: -0.19 });
  k.add('body', rbox(0.2, 0.024, 0.2, 0.01), { y: 0.064, z: -0.19 });

  // bezel: a rounded slab with the tube opening cut through it
  const bez = new THREE.Shape();
  const rr = (s: THREE.Path, w: number, h: number, r: number, cx = 0, cyy = 0) => {
    s.moveTo(cx - w / 2 + r, cyy - h / 2);
    s.lineTo(cx + w / 2 - r, cyy - h / 2); s.quadraticCurveTo(cx + w / 2, cyy - h / 2, cx + w / 2, cyy - h / 2 + r);
    s.lineTo(cx + w / 2, cyy + h / 2 - r); s.quadraticCurveTo(cx + w / 2, cyy + h / 2, cx + w / 2 - r, cyy + h / 2);
    s.lineTo(cx - w / 2 + r, cyy + h / 2); s.quadraticCurveTo(cx - w / 2, cyy + h / 2, cx - w / 2, cyy + h / 2 - r);
    s.lineTo(cx - w / 2, cyy - h / 2 + r); s.quadraticCurveTo(cx - w / 2, cyy - h / 2, cx - w / 2 + r, cyy - h / 2);
  };
  rr(bez, W, H, 0.022);
  const hole = new THREE.Path();
  rr(hole, sw, sh, 0.02, 0, oy - cy);
  bez.holes.push(hole);
  const bezGeo = new THREE.ExtrudeGeometry(bez, { depth: D - 0.012, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 3, curveSegments: 8 });
  k.add('shell', bezGeo, { y: cy, z: -D + 0.006, wear: 0.5 });
  // the tube recess: a short tunnel stepping in from the opening to the glass
  k.add('recess', taper(sw + 0.006, sh + 0.006, sw - 0.012, sh - 0.012, 0.024, 0, false), { y: oy, z: 0 });

  // body: tapers back to the neck; vent slots across the sloping top
  const bodyD = 0.3;
  k.add('body', taper(W - 0.02, H - 0.02, 0.26, 0.22, bodyD, 0.012), { y: cy, z: -D + 0.002 });
  k.add('body', rbox(0.22, 0.19, 0.08, 0.012), { y: cy + 0.012, z: -D - bodyD - 0.02 });
  const topY0 = cy + H / 2 - 0.01, topY1 = cy + 0.11 + 0.012, slope = Math.atan2(topY0 - topY1, bodyD);
  for (let i = 0; i < 11; i++) {
    const t = 0.18 + i * 0.065;
    k.add('dark', box(0.2 - i * 0.006, 0.003, 0.009), { y: topY0 - (topY0 - topY1) * t + 0.001, z: -D - bodyD * t, rx: slope });
  }
  // side vents, both sides
  for (const s of [-1, 1]) for (let i = 0; i < 7; i++) {
    const t = 0.35 + i * 0.07, wx = (W - 0.02) / 2 - ((W - 0.02 - 0.26) / 2) * t;
    k.add('dark', box(0.003, 0.11, 0.006), { x: s * (wx + 0.0005), y: cy - 0.02, z: -D - bodyD * t, ry: s * Math.atan2((W - 0.28) / 2, bodyD) });
  }

  // chin: badge, speaker slots, two knurled knobs in cups, power switch + LED
  const chinY = cy - H / 2 + 0.036;
  for (let i = 0; i < 6; i++) k.add('dark', rbox(0.004, 0.02, 0.004, 0.0015), { x: -0.045 + i * 0.009, y: chinY, z: 0.0015 });
  for (const x of [0.078, 0.104]) {
    k.add('recess', cyl(0.0105, 0.0105, 0.004, 24), { x, y: chinY, z: 0.0005, rx: Math.PI / 2 });
    k.add('shell', knurl(0.0085, 0.012, 18, 0.12), { x, y: chinY, z: 0.006, rx: Math.PI / 2, tint: 0.92 });
    k.add('dark', box(0.0015, 0.006, 0.001), { x, y: chinY + 0.004, z: 0.0122 });
  }
  k.add('recess', rbox(0.034, 0.024, 0.004, 0.004), { x: 0.166, y: chinY, z: 0.0005 });
  k.add('shell', rbox(0.028, 0.019, 0.01, 0.004), { x: 0.166, y: chinY, z: 0.004, tint: 0.95, wear: 0.6 });
  k.add('led', cyl(0.0022, 0.0022, 0.003, 12), { x: 0.138, y: chinY, z: 0.0015, rx: Math.PI / 2 });
  // rear: vent grille on the neck and the cable gland
  for (let i = 0; i < 6; i++) k.add('dark', box(0.16, 0.004, 0.003), { y: cy - 0.03 + i * 0.016, z: -D - bodyD - 0.061 });
  k.add('dark', cyl(0.012, 0.014, 0.02, 16), { x: 0.06, y: cy - 0.07, z: -D - bodyD - 0.068, rx: Math.PI / 2 });
  k.add('metal', cyl(0.003, 0.003, 0.004, 8), { x: -0.08, y: cy + 0.08, z: -D - bodyD - 0.061, rx: Math.PI / 2 });
  g.add(k.build('monitor'));

  // badge, printed on the chin
  const badge = label(0.07, 0.014, (c, w, h) => {
    c.fillStyle = '#5c5044'; c.font = `600 ${h * 0.62}px "Space Grotesk", "Helvetica Neue", Arial, sans-serif`;
    c.textBaseline = 'middle'; c.fillText('DESK-86', 0, h * 0.54);
    c.fillStyle = '#c9483a'; c.fillRect(w * 0.84, h * 0.3, w * 0.12, h * 0.42);
  }, { hover, bg: BEIGE.plastic });
  badge.position.set(-0.155, chinY, 0.0012);
  g.add(badge);

  // the tube: a bulging glass face showing the idle terminal
  const scrW = sw - 0.012, scrH = sh - 0.012;
  const geo = new THREE.PlaneGeometry(scrW, scrH, 16, 12);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) / (scrW / 2), v = pos.getY(i) / (scrH / 2);
    pos.setZ(i, 0.012 * (1 - 0.5 * (u * u + v * v)));
  }
  geo.computeVertexNormals();
  const screen = new THREE.Mesh(geo, emissive({ map: screenTex, intensity: 1, hover }));
  screen.position.set(0, oy, -0.024);
  g.add(screen);
  // the glass itself: a faint Fresnel sheen and a soft window reflection
  const glass = new THREE.Mesh(geo.clone(), glassMat());
  glass.position.set(0, oy, -0.0225);
  g.add(glass);

  g.position.copy(at);
  g.updateMatrixWorld(true);
  const screenCenter = new THREE.Vector3(0, oy, -0.024 + 0.012).applyMatrix4(g.matrixWorld);
  return { group: g, screen, screenCenter, screenSize: { w: scrW, h: scrH }, back: new THREE.Vector3(0.06, cy - 0.07, -D - bodyD - 0.078).applyMatrix4(g.matrixWorld) };
}

// Additive glass sheen for the CRT: sky-tinted Fresnel plus a soft diagonal
// streak, leaving alpha alone so it doesn't flag the bloom pass.
function glassMat() {
  return new THREE.ShaderMaterial({
    uniforms: { uSky: shared.uSkyCol, uHemi: shared.uHemiI, uAmb: shared.uAmb },
    vertexShader: `varying vec3 vN; varying vec3 vW; varying vec2 vUv;
      void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform vec3 uSky, uAmb; uniform float uHemi; varying vec3 vN; varying vec3 vW; varying vec2 vUv;
      void main(){
        vec3 V = normalize(cameraPosition - vW);
        float f = pow(1. - max(dot(normalize(vN), V), 0.), 3.);
        float streak = exp(-pow((vUv.x * .7 + vUv.y - 1.2) * 7., 2.)) * .09 + exp(-pow((vUv.x * .7 + vUv.y - 1.42) * 16., 2.)) * .05;
        float corner = smoothstep(.5, 0., length((vUv - vec2(.16, .86)) * vec2(1., 1.3))) * .06;
        vec3 env = uSky * uHemi + uAmb;
        gl_FragColor = vec4(env * (f * .5 + streak + corner) + vec3(.012), 0.);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
  });
}

// ---------------------------------------------------------------- PC tower
// A mid-90s beige AT tower: steel shell with pressed ribs and a vent patch
// on the side, a plastic front bezel with a CD-ROM, two blanking plates and
// a floppy drive, the power/reset/turbo cluster with a keylock, power and
// disk LEDs, a red two-digit MHz readout, and a vent grille at the foot.
// Built facing +z, standing on y = 0.
export function buildTower(hover: Hover, at: THREE.Vector3, ry = 0) {
  const g = new THREE.Group();
  const hddLed = emissive({ color: '#ffb23a', intensity: 0.4, hover });
  const k = new Kit({
    steel: lit({ hover, color: BEIGE.steel, vcol: true, rough: 0.42, grain: 0.05, grainScale: [180, 180, 180] }),
    bezel: plastic(hover),
    plate: plastic(hover, '#d6c9ae'),
    dark: lit({ hover, color: BEIGE.dark, vcol: true, rough: 0.7 }),
    rubber: lit({ hover, color: BEIGE.rubber, vcol: true, rough: 0.9 }),
    chrome: lit({ hover, color: '#cfd0d2', vcol: true, rough: 0.16, metal: 1 }),
    ledG: emissive({ color: '#6dff8e', intensity: 1.1, hover }),
    ledY: emissive({ color: '#ffc94a', intensity: 0.9, hover }),
    hdd: hddLed,
  }, 23);
  const W = 0.19, H = 0.42, D = 0.42, y0 = 0.012;
  const cy = y0 + H / 2;
  // shell and a dark seam where the bezel meets it
  k.add('steel', rbox(W - 0.004, H - 0.006, D - 0.024, 0.006, 3), { y: cy, z: -0.012 - 0.004, ao: 0.02 });
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
  // CD-ROM: tray seam, eject button, busy LED, headphone jack and volume
  let y = top - 0.045;
  let z = bay(y, 0.148, 0.041);
  k.add('dark', box(0.128, 0.0016, 0.001), { y: y + 0.006, z });
  k.add('dark', box(0.128, 0.0012, 0.001), { y: y - 0.012, z });
  k.add('plate', rbox(0.016, 0.006, 0.005, 0.0015), { x: 0.052, y: y - 0.0125, z: z + 0.001, tint: 0.9 });
  k.add('ledY', box(0.004, 0.002, 0.001), { x: 0.03, y: y - 0.0125, z: z + 0.0005 });
  k.add('dark', cyl(0.0022, 0.0022, 0.002, 12), { x: -0.058, y: y - 0.0125, z, rx: Math.PI / 2 });
  k.add('dark', knurl(0.004, 0.004, 12, 0.15), { x: -0.045, y: y - 0.0125, z: z + 0.001, rx: Math.PI / 2 });
  // two blanking plates with a finger groove
  for (const dy of [0.047, 0.094]) {
    y = top - 0.045 - dy;
    z = bay(y, 0.148, 0.041);
    k.add('dark', box(0.1, 0.0012, 0.001), { y, z });
  }
  // 3.5" floppy: slot with a metal shutter behind, eject button, LED
  y = top - 0.19;
  z = bay(y, 0.104, 0.027);
  k.add('dark', box(0.08, 0.005, 0.001), { y: y + 0.003, z });
  k.add('chrome', box(0.05, 0.0035, 0.001), { x: -0.008, y: y + 0.003, z: z - 0.0004, tint: 0.6 });
  k.add('plate', rbox(0.012, 0.006, 0.005, 0.0015), { x: 0.036, y: y - 0.007, z: z + 0.001, tint: 0.9 });
  k.add('ledG', box(0.004, 0.002, 0.001), { x: -0.038, y: y - 0.007, z: z + 0.0005 });

  // control cluster: big power rocker, turbo and reset, LEDs, keylock
  y = top - 0.262;
  k.add('dark', rbox(0.036, 0.036, 0.004, 0.004), { x: 0.045, y, z: fz });
  k.add('bezel', rbox(0.03, 0.03, 0.012, 0.004, 3), { x: 0.045, y, z: fz + 0.004, tint: 0.97, wear: 0.7 });
  for (const [x, tint] of [[-0.012, 0.9], [0.006, 0.9]] as const) {
    k.add('dark', cyl(0.0062, 0.0062, 0.003, 18), { x, y: y + 0.008, z: fz, rx: Math.PI / 2 });
    k.add('bezel', cyl(0.0048, 0.005, 0.007, 18), { x, y: y + 0.008, z: fz + 0.003, rx: Math.PI / 2, tint });
  }
  k.add('ledG', cyl(0.0022, 0.0022, 0.003, 10), { x: -0.012, y: y - 0.01, z: fz + 0.001, rx: Math.PI / 2 });
  k.add('hdd', cyl(0.0022, 0.0022, 0.003, 10), { x: 0.006, y: y - 0.01, z: fz + 0.001, rx: Math.PI / 2 });
  k.add('chrome', cyl(0.007, 0.0075, 0.006, 24), { x: -0.05, y: y + 0.004, z: fz + 0.002, rx: Math.PI / 2 });
  k.add('dark', box(0.0012, 0.006, 0.001), { x: -0.05, y: y + 0.004, z: fz + 0.0052 });
  // MHz readout window
  k.add('dark', rbox(0.036, 0.022, 0.003, 0.002), { x: -0.03, y: y - 0.04, z: fz + 0.0005 });
  // vent grille at the foot and a rubber foot at each corner
  for (let i = 0; i < 9; i++) k.add('dark', rbox(0.12, 0.0035, 0.004, 0.0015), { y: y0 + 0.028 + i * 0.0085, z: fz - 0.001 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.add('rubber', cyl(0.011, 0.012, y0, 16), { x: sx * (W / 2 - 0.022), y: y0 / 2, z: sz * (D / 2 - 0.03) });
  // side panel (+x, facing the monitor): two pressed ribs, a vent patch and
  // the thumbscrews along the back edge
  const sx = W / 2 - 0.002;
  for (const ry of [cy + 0.12, cy - 0.12]) k.add('steel', rbox(0.004, 0.012, D - 0.1, 0.002), { x: sx, y: ry, z: -0.02, tint: 1.03, wear: 0.8 });
  for (let i = 0; i < 6; i++) for (let j = 0; j < 8; j++) k.add('dark', cyl(0.0028, 0.0028, 0.002, 8), { x: sx + 0.0012, y: cy - 0.05 + i * 0.012, z: -0.08 + j * 0.012 + (i % 2) * 0.006, rz: Math.PI / 2 });
  for (const py of [cy - 0.17, cy, cy + 0.17]) {
    k.add('chrome', cyl(0.0045, 0.0045, 0.004, 14), { x: sx + 0.002, y: py, z: -D / 2 + 0.012, rz: Math.PI / 2 });
    k.add('dark', box(0.001, 0.005, 0.001), { x: sx + 0.0042, y: py, z: -D / 2 + 0.012 });
  }
  g.add(k.build('tower'));

  // decals: the MHz readout and a model badge
  const seg = segDisplay('66');
  const mhz = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.017), emissive({ map: seg, intensity: 1, hover }));
  mhz.position.set(-0.03, top - 0.302, fz + 0.0022);
  g.add(mhz);
  const badge = label(0.06, 0.02, (c, _w, h) => {
    c.fillStyle = '#4c4238'; c.font = `700 ${h * 0.46}px "Space Grotesk", "Helvetica Neue", Arial, sans-serif`;
    c.textBaseline = 'middle'; c.fillText('486DX2', 0, h * 0.34);
    c.font = `500 ${h * 0.3}px "Space Grotesk", Arial, sans-serif`; c.fillStyle = '#8a7c6a'; c.fillText('MULTIMEDIA', 0, h * 0.78);
  }, { hover, bg: BEIGE.plastic });
  badge.position.set(0.028, top - 0.3, fz + 0.0002);
  g.add(badge);

  g.position.copy(at);
  g.rotation.y = ry;
  g.updateMatrixWorld(true);
  return { group: g, hddLed, back: new THREE.Vector3(0.05, 0.3, -D / 2 + 0.01).applyMatrix4(g.matrixWorld) };
}

// ---------------------------------------------------------------- keyboard
// A buckling-spring style board: sculpted rows of faceted keycaps (alphas
// light, modifiers darker), function row, navigation cluster and numpad, a
// recessed plate, lock LEDs and fold-out feet.
export function buildKeyboard(hover: Hover, at: THREE.Vector3, ry = 0) {
  const g = new THREE.Group();
  const k = new Kit({
    case: plastic(hover),
    plate: lit({ hover, color: '#4a4238', vcol: true, rough: 0.8 }),
    key: lit({ hover, color: BEIGE.key, vcol: true, rough: 0.45, grain: 0.05, grainScale: [400, 400, 400] }),
    mod: lit({ hover, color: BEIGE.mod, vcol: true, rough: 0.45, grain: 0.05, grainScale: [400, 400, 400] }),
    accent: lit({ hover, color: '#c96a4c', vcol: true, rough: 0.45 }),
    led: emissive({ color: '#6dff8e', intensity: 1, hover }),
    ledOff: lit({ hover, color: '#1e3a24', vcol: true, rough: 0.3 }),
  }, 31);
  const U = 0.0188, W = 0.462, Dp = 0.172;
  // case: a wedge that rises toward the back, with a recessed plate
  k.add('case', rbox(W, 0.024, Dp, 0.008, 3), { y: 0.012, ao: 0.006 });
  k.add('case', rbox(W - 0.004, 0.012, 0.02, 0.005), { y: 0.03, z: -Dp / 2 + 0.011 });
  k.add('plate', box(0.444, 0.002, 0.126), { y: 0.0245, z: -0.003 });
  // one keycap: a faceted square frustum, dished a little at the top
  const cap = (wu: number, hu = 1) => {
    const w = wu * U - 0.0024, d = hu * U - 0.0024, h = 0.0105;
    const geo = new THREE.CylinderGeometry(Math.SQRT1_2, Math.SQRT1_2 * 1.28, 1, 4, 1).toNonIndexed();
    geo.rotateY(Math.PI / 4);
    geo.scale(w / 1.28, h, d / 1.28);
    geo.translate(0, h / 2, 0);
    geo.computeVertexNormals();
    return geo;
  };
  type K = [number, number, string?, number?]; // width, gap before, material, height (rows)
  const rows: K[][] = [
    [[1, 0, 'accent'], [1, 1, 'mod'], [1, 0, 'mod'], [1, 0, 'mod'], [1, 0, 'mod'], [1, 0.5], [1, 0], [1, 0], [1, 0], [1, 0.5, 'mod'], [1, 0, 'mod'], [1, 0, 'mod'], [1, 0, 'mod']],
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
  // lock LEDs above the numpad
  for (let i = 0; i < 3; i++) k.add(i === 0 ? 'led' : 'ledOff', rbox(0.004, 0.002, 0.0025, 0.0008), { x: px + (i + 0.6) * U * 1.2, y: 0.0365, z: -Dp / 2 + 0.011 });
  // fold-out feet at the back
  for (const s of [-1, 1]) k.add('plate', box(0.03, 0.006, 0.012), { x: s * 0.19, y: -0.001, z: -Dp / 2 + 0.01 });
  g.add(k.build('keyboard'));
  g.position.copy(at);
  g.rotation.set(0.045, ry, 0);
  g.updateMatrixWorld(true);
  return { group: g, cablePort: new THREE.Vector3(-0.14, 0.03, -Dp / 2).applyMatrix4(g.matrixWorld) };
}

// ---------------------------------------------------------------- mouse
// A two-button ball mouse on a cloth pad.
export function buildMouse(hover: Hover, at: THREE.Vector3, ry = 0) {
  const g = new THREE.Group();
  const k = new Kit({
    shell: plastic(hover),
    dark: lit({ hover, color: BEIGE.dark, vcol: true, rough: 0.7 }),
    pad: lit({ hover, color: '#2f4254', vcol: true, rough: 0.95, grain: 0.18, grainScale: [700, 700, 700] }),
    padEdge: lit({ hover, color: '#1f2c38', vcol: true, rough: 0.8 }),
  }, 41);
  k.add('padEdge', slab(0.23, 0.19, 0.004, 0.018, 0.0012), { rx: -Math.PI / 2, ao: 0.002 });
  k.add('pad', slab(0.226, 0.186, 0.0005, 0.017, 0), { rx: -Math.PI / 2, y: 0.0041 });
  // body: a squashed egg, flat underneath
  const body = new THREE.SphereGeometry(1, 32, 20);
  const p = body.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (y < 0) y *= 0.15;
    const back = z < 0 ? 1 + z * 0.12 : 1; // a touch narrower at the tail
    x *= back;
    y *= 1 - Math.max(0, z) * 0.35; // lower toward the buttons
    p.setXYZ(i, x * 0.031, y * 0.024, z * 0.052);
  }
  body.computeVertexNormals();
  k.add('shell', body, { y: 0.0085, ao: 0.01 });
  // the buttons: a groove down the middle and one across behind them
  k.add('dark', box(0.0016, 0.006, 0.03), { y: 0.0255, z: 0.03, rx: -0.3 });
  k.add('dark', box(0.05, 0.004, 0.0016), { y: 0.0305, z: 0.013 });
  g.add(k.build('mouse'));
  g.position.copy(at);
  g.rotation.y = ry;
  g.updateMatrixWorld(true);
  return { group: g, tail: new THREE.Vector3(0, 0.01, 0.05).applyMatrix4(g.matrixWorld) };
}

// A cable lying on the desk between two points, sagging and wandering a
// little; `coil` winds it into a telephone-style curl.
export function deskCable(from: THREE.Vector3, to: THREE.Vector3, o: { color?: string; r?: number; coil?: number; wander?: number; lift?: number; hover?: Hover } = {}) {
  const pts: THREE.Vector3[] = [];
  const n = o.coil ? 160 : 24;
  const side = new THREE.Vector3().subVectors(to, from).cross(new THREE.Vector3(0, 1, 0)).normalize();
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = from.clone().lerp(to, t);
    const floor = DESK_Y + (o.r ?? 0.003);
    p.y = Math.max(floor, THREE.MathUtils.lerp(from.y, to.y, t) - Math.sin(t * Math.PI) * (o.lift ?? 0.2));
    p.addScaledVector(side, Math.sin(t * Math.PI * 2.3) * (o.wander ?? 0.02) * Math.sin(t * Math.PI));
    if (o.coil) { const a = t * o.coil * Math.PI * 2; p.addScaledVector(side, Math.cos(a) * 0.006); p.y += Math.sin(a) * 0.006 + 0.006; }
    pts.push(p);
  }
  const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 2, o.r ?? 0.003, 6), lit({ color: o.color ?? '#b8a58c', rough: 0.6, hover: o.hover }));
  return m;
}

