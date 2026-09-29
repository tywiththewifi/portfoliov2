import * as THREE from 'three';
import { Kit, box, cyl, knurl, lathe, rbox, taper } from '../kit';
import { BEIGE, MINT, glow, label, surface } from '../mats';

// A 14" beige CRT on a tilt-swivel foot: a bevelled bezel with a recessed,
// bulging tube, a tapered body with vent slots, two knobs, a power switch and
// LED on the chin, and a badge. Built facing +z with the bezel front at z = 0,
// standing on y = 0. The tube shows `screen` (the typing dev log).
export function buildCrt(screen: THREE.Texture) {
  const g = new THREE.Group();
  const k = new Kit({
    shell: surface(BEIGE.plastic, { rough: 0.5 }),
    body: surface(BEIGE.shade, { rough: 0.55 }),
    recess: surface('#2f2a25', { rough: 0.75, side: THREE.DoubleSide }),
    dark: surface(BEIGE.dark, { rough: 0.6 }),
    metal: surface('#a9a7a2', { rough: 0.3, metal: 1 }),
    led: glow(MINT),
  }, 11);
  const W = 0.44, H = 0.4, D = 0.055, cy = 0.262;
  const sw = 0.352, sh = 0.268, oy = cy + 0.022; // tube opening, a little above centre

  // tilt-swivel foot: a bevelled disc, a collar and a cradle
  k.add('body', lathe([[0, 0], [0.122, 0], [0.126, 0.005], [0.124, 0.012], [0.11, 0.018], [0.075, 0.024], [0.07, 0.03], [0, 0.03]], 48), { z: -0.19, ao: 0.012 });
  k.add('body', cyl(0.06, 0.068, 0.028, 40), { y: 0.043, z: -0.19 });
  k.add('dark', cyl(0.069, 0.069, 0.003, 40), { y: 0.031, z: -0.19 });
  k.add('body', rbox(0.2, 0.024, 0.2, 0.01), { y: 0.064, z: -0.19 });

  // bezel: a rounded slab with the tube opening cut through it
  const rr = (s: THREE.Path, w: number, h: number, r: number, cx = 0, cyy = 0) => {
    s.moveTo(cx - w / 2 + r, cyy - h / 2);
    s.lineTo(cx + w / 2 - r, cyy - h / 2); s.quadraticCurveTo(cx + w / 2, cyy - h / 2, cx + w / 2, cyy - h / 2 + r);
    s.lineTo(cx + w / 2, cyy + h / 2 - r); s.quadraticCurveTo(cx + w / 2, cyy + h / 2, cx + w / 2 - r, cyy + h / 2);
    s.lineTo(cx - w / 2 + r, cyy + h / 2); s.quadraticCurveTo(cx - w / 2, cyy + h / 2, cx - w / 2, cyy + h / 2 - r);
    s.lineTo(cx - w / 2, cyy - h / 2 + r); s.quadraticCurveTo(cx - w / 2, cyy - h / 2, cx - w / 2 + r, cyy - h / 2);
  };
  const bez = new THREE.Shape();
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

  // chin: speaker slots, two knurled knobs in cups, power switch and LED
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
  g.add(k.build('crt'));

  // badge, printed on the chin
  const badge = label(0.07, 0.014, (c, _w, h) => {
    c.fillStyle = '#5c5044';
    c.font = `${h * 0.62}px "NB International Pro", "Helvetica Neue", Arial, sans-serif`;
    c.textBaseline = 'middle';
    c.fillText('TC·14', 0, h * 0.54);
  }, { bg: BEIGE.plastic });
  badge.position.set(-0.155, chinY, 0.0012);
  g.add(badge);

  // the tube: a bulging face showing the dev log, with glass over it
  const scrW = sw - 0.012, scrH = sh - 0.012;
  const geo = new THREE.PlaneGeometry(scrW, scrH, 16, 12);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) / (scrW / 2), v = pos.getY(i) / (scrH / 2);
    pos.setZ(i, 0.012 * (1 - 0.5 * (u * u + v * v)));
  }
  geo.computeVertexNormals();
  const phosphor = new THREE.MeshBasicMaterial({ map: screen, toneMapped: false });
  const tube = new THREE.Mesh(geo, phosphor);
  tube.position.set(0, oy, -0.024);
  g.add(tube);
  const glass = new THREE.Mesh(geo.clone(), glassMat());
  glass.position.set(0, oy, -0.0225);
  g.add(glass);

  return {
    group: g,
    phosphor,
    // in the CRT's own frame
    screenCenter: new THREE.Vector3(0, oy, -0.012),
    back: new THREE.Vector3(0.06, cy - 0.07, -D - bodyD - 0.078),
  };
}

// Additive glass sheen: a cool Fresnel rim and a soft diagonal streak, as if
// something bright hung up and to the left of the tube.
function glassMat() {
  return new THREE.ShaderMaterial({
    vertexShader: `varying vec3 vN; varying vec3 vW; varying vec2 vUv;
      void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `varying vec3 vN; varying vec3 vW; varying vec2 vUv;
      void main(){
        vec3 V = normalize(cameraPosition - vW);
        float f = pow(1. - max(dot(normalize(vN), V), 0.), 3.);
        float streak = exp(-pow((vUv.x * .7 + vUv.y - 1.2) * 7., 2.)) * .07 + exp(-pow((vUv.x * .7 + vUv.y - 1.42) * 16., 2.)) * .04;
        float corner = smoothstep(.5, 0., length((vUv - vec2(.16, .86)) * vec2(1., 1.3))) * .05;
        gl_FragColor = vec4(vec3(.62, .66, .7) * (f * .35 + streak + corner) + vec3(.008), 0.);
      }`,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
  });
}
