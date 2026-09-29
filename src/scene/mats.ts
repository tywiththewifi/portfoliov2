import * as THREE from 'three';

// Scene colours. The page tokens live in styles.css; these are the ones the
// scene needs, kept in step by hand.
export const MINT = '#21ffc0';
export const BG = '#0a0a0a';

// Beige-box palette for the computer: case plastic that has yellowed a
// little, a slightly greyer painted steel shell, dark recesses, rubber.
export const BEIGE = { plastic: '#d9ceb6', steel: '#cfc5b0', shade: '#bcae94', dark: '#2a2622', rubber: '#1c1a19', key: '#e7e0cf', mod: '#bdb39e' };

type Surf = { rough?: number; metal?: number; side?: THREE.Side; map?: THREE.Texture | null };

// A lit surface for kit parts (vertex colours carry the baked AO and wear).
export function surface(color: THREE.ColorRepresentation, o: Surf = {}) {
  return new THREE.MeshStandardMaterial({
    color, roughness: o.rough ?? 0.6, metalness: o.metal ?? 0, vertexColors: true,
    side: o.side ?? THREE.FrontSide, map: o.map ?? null,
  });
}

// Self-lit parts: LEDs, the CRT phosphor, lamp windows. Skips tone mapping so
// the mint stays exactly the mint, and casts no shadows. `level` dims it
// (an unlit LED is the same colour at ~0.15).
export function glow(color: THREE.ColorRepresentation, level = 1, map: THREE.Texture | null = null) {
  const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(level), map, toneMapped: false, vertexColors: true });
  m.userData.noShadow = true;
  m.userData.base = new THREE.Color(color);
  return m;
}

// Set a glow material's brightness (0..1) without losing its hue.
export function setGlow(m: THREE.MeshBasicMaterial, level: number) {
  m.color.copy(m.userData.base as THREE.Color).multiplyScalar(level);
}

// Printed details (badges, dial scales, labels) drawn with the 2D canvas at
// a high texel density, so they stay crisp up close.
const DENSITY = 3000; // texels per metre

export function canvasTexture(w: number, h: number, draw: (c: CanvasRenderingContext2D, W: number, H: number) => void, bg?: string, density = DENSITY) {
  const W = Math.max(8, Math.round(w * density)), H = Math.max(8, Math.round(h * density));
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d')!;
  if (bg) { c.fillStyle = bg; c.fillRect(0, 0, W, H); }
  draw(c, W, H);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// A printed label: a small plane, `w` x `h` metres, facing +z, drawn just
// proud of the surface behind it.
export function label(w: number, h: number, draw: (c: CanvasRenderingContext2D, W: number, H: number) => void, o: { bg?: string; rough?: number; transparent?: boolean } = {}) {
  const mat = new THREE.MeshStandardMaterial({
    map: canvasTexture(w, h, draw, o.bg), roughness: o.rough ?? 0.55, transparent: o.transparent ?? false,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.receiveShadow = true;
  m.name = 'label';
  return m;
}

// Seven-segment readout: lit segments bright, unlit ones faintly visible.
export function segDisplay(text: string, on: string, off: string, bg: string) {
  const W = 120, H = 68;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d')!;
  c.fillStyle = bg; c.fillRect(0, 0, W, H);
  const SEG: Record<string, string> = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
  const digit = (x0: number, ch: string) => {
    const w = 34, h = 52, t = 7, y0 = 8, sk = 5; // skewed like real LED digits
    const seg: Record<string, [number, number, number, number]> = {
      a: [t, 0, w - t * 2, t], g: [t, h / 2 - t / 2, w - t * 2, t], d: [t, h - t, w - t * 2, t],
      f: [0, t, t, h / 2 - t * 1.5], b: [w - t, t, t, h / 2 - t * 1.5], e: [0, h / 2 + t / 2, t, h / 2 - t * 1.5], c: [w - t, h / 2 + t / 2, t, h / 2 - t * 1.5],
    };
    for (const [k, [x, y, sw, sh]] of Object.entries(seg)) {
      c.fillStyle = (SEG[ch] ?? '').includes(k) ? on : off;
      const skew = sk * (1 - (y + sh / 2) / h);
      c.beginPath();
      c.roundRect(x0 + x + skew, y0 + y, sw, sh, 2.5);
      c.fill();
    }
  };
  [...text].forEach((ch, i) => digit(14 + i * 50, ch));
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
