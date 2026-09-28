import * as THREE from 'three';
import { lit } from '../materials';

// Crisp printed details (badges, logos, readouts) drawn with the 2D canvas
// at a high texel density and smooth-filtered, so they stay legible in the
// full-resolution poly render.
const DENSITY = 4000; // texels per metre

function smoothTexture(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = 4;
  return t;
}

export function labelTexture(w: number, h: number, draw: (c: CanvasRenderingContext2D, W: number, H: number) => void, bg?: string) {
  const W = Math.max(8, Math.round(w * DENSITY)), H = Math.max(8, Math.round(h * DENSITY));
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d')!;
  if (bg) { c.fillStyle = bg; c.fillRect(0, 0, W, H); }
  draw(c, W, H);
  return smoothTexture(cv);
}

// A printed label: a small plane, `w` x `h` metres, facing +z.
export function label(w: number, h: number, draw: (c: CanvasRenderingContext2D, W: number, H: number) => void, o: { hover?: { value: number }; bg?: string; rough?: number } = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lit({ map: labelTexture(w, h, draw, o.bg), hover: o.hover, rough: o.rough ?? 0.5 }));
  m.name = 'label';
  return m;
}

// Seven-segment readout (lit segments bright, unlit ones faintly visible).
export function segDisplay(text: string, on = '#ff3b2a', off = '#3a0f0c', bg = '#140605') {
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
  const t = smoothTexture(cv);
  return t;
}

// Soft contact shadow: a rounded-rectangle falloff multiplied onto the
// surface underneath (colour only; alpha, which flags bloom, is untouched).
export function contactShadow(w: number, d: number, o: { strength?: number; spread?: number; round?: boolean } = {}) {
  const spread = o.spread ?? 0.025;
  const mat = new THREE.ShaderMaterial({
    uniforms: { uSize: { value: new THREE.Vector2(w / 2, d / 2) }, uSpread: { value: spread }, uK: { value: o.strength ?? 0.5 }, uRound: { value: o.round ? 1 : 0 } },
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform vec2 uSize; uniform float uSpread, uK, uRound; varying vec2 vP;
      void main(){
        float dist = uRound > .5 ? length(vP / uSize) * min(uSize.x, uSize.y) - min(uSize.x, uSize.y)
                                 : length(max(abs(vP) - uSize + uSpread * .5, 0.)) - uSpread * .5;
        float a = 1. - smoothstep(-uSpread * .6, uSpread, dist);
        gl_FragColor = vec4(vec3(1. - uK * a * a), 1.);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.DstColorFactor, blendDst: THREE.ZeroFactor,
    blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w + spread * 2, d + spread * 2), mat);
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 1;
  m.name = 'contact-shadow';
  return m;
}
