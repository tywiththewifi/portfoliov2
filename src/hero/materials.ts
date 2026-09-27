import * as THREE from 'three';

// Colours are authored in display space and passed straight through
// (colour management off, linear output), like a palette-driven pixel game.
THREE.ColorManagement.enabled = false;

export const col = (c: string) => new THREE.Color(c);

// Uniforms shared by every lit material: one warm desk lamp, cool light
// from the window, the CRT's glow and a warm ambient.
export const shared = {
  uTime: { value: 0 },
  uLampPos: { value: new THREE.Vector3(0.9, 1.35, -0.1) },
  uLampDir: { value: new THREE.Vector3(-0.4, -1, 0.1).normalize() },
  uLampCol: { value: col('#ffc890') },
  uLampI: { value: 1 },
  uWinPos: { value: new THREE.Vector3(1.9, 1.5, -0.4) },
  uWinCol: { value: col('#4fb8b0') },
  uWinI: { value: 0.55 },
  uScrPos: { value: new THREE.Vector3(0, 1.05, -0.15) },
  uScrCol: { value: col('#bfe8ff') },
  uScrI: { value: 0.35 },
  uAmb: { value: col('#3a1a26') },
  uFillPos: { value: new THREE.Vector3(-1.7, 1.5, 0.8) },
  uFillCol: { value: col('#ff7a96') },
  uFillI: { value: 0.4 },
  uLevels: { value: 7 },
};

export const GLSL_COMMON = /* glsl */ `
  float bayer4(vec2 p){
    ivec2 i = ivec2(mod(p, 4.));
    int idx = i.x + i.y * 4;
    float m[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
    return (m[idx] + .5) / 16.;
  }
  float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
`;

const LIT_VERT = /* glsl */ `
  uniform float uTime; uniform float uWind; uniform float uWindAnchor;
  attribute float aPhase;
  varying vec3 vN; varying vec3 vW; varying vec2 vUv;
  void main(){
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.);
    #ifdef WIND
      float ph = aPhase + wp.x * 3.1 + wp.z * 2.3;
      float h = max(uWindAnchor - wp.y, 0.) + max(wp.y - uWindAnchor, 0.) * .4;
      wp.x += (sin(uTime * 1.7 + ph) + .45 * sin(uTime * 3.1 + ph * 2.1)) * uWind * h;
      wp.z += cos(uTime * 1.3 + ph * 1.2) * uWind * .6 * h;
    #endif
    vW = wp.xyz;
    vN = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const LIT_FRAG = /* glsl */ `
  ${GLSL_COMMON}
  uniform vec3 uColor; uniform sampler2D uMap; uniform float uHasMap;
  uniform vec3 uLampPos, uLampDir, uLampCol, uWinPos, uWinCol, uScrPos, uScrCol, uAmb, uFillPos, uFillCol;
  uniform float uLampI, uWinI, uScrI, uFillI, uLevels, uTime, uHover, uGloss;
  uniform vec3 uHoverCol;
  varying vec3 vN; varying vec3 vW; varying vec2 vUv;
  void main(){
    vec3 base = uColor;
    if (uHasMap > .5) {
      vec4 t = texture2D(uMap, vUv);
      if (t.a < .5) discard;
      base *= t.rgb;
    }
    vec3 n = normalize(vN);
    if (!gl_FrontFacing) n = -n;

    // desk lamp: spot-ish point light
    vec3 Lv = uLampPos - vW; float d = length(Lv); vec3 L = Lv / d;
    float cone = smoothstep(.15, .75, dot(-L, uLampDir));
    float lamp = (max(dot(n, L), 0.) * .75 + .25) * (0.35 + cone) * uLampI / (1. + d * d * 1.6);

    // window: soft cool light from the right
    vec3 Wv = uWinPos - vW; float dw = length(Wv);
    float win = (max(dot(n, Wv / dw), 0.) * .8 + .2) * uWinI / (1. + dw * dw * .35);

    // CRT glow
    vec3 Sv = uScrPos - vW; float ds = length(Sv);
    float scr = (max(dot(n, Sv / ds), 0.) * .7 + .3) * uScrI / (1. + ds * ds * 6.);

    // rose fill from the left so that side never goes fully black
    vec3 Fv = uFillPos - vW; float df = length(Fv);
    float fill = (max(dot(n, Fv / df), 0.) * .8 + .2) * uFillI / (1. + df * df * .5);

    vec3 light = uAmb + uLampCol * lamp * 2.6 + uWinCol * win + uScrCol * scr + uFillCol * fill;
    // specular glint from the lamp for glossy things (CRT glass, vinyl)
    vec3 V = normalize(cameraPosition - vW);
    float spec = pow(max(dot(reflect(-L, n), V), 0.), 24.) * uGloss * uLampI;

    // posterise the light with an ordered dither: the pixel-art shading
    float b = bayer4(gl_FragCoord.xy);
    light = floor(light * uLevels + b) / uLevels;
    vec3 c = base * light + uLampCol * floor(spec * 3. + b) / 3.;

    // hover: lift and tint toward the highlight colour
    c = mix(c, c * 1.25 + uHoverCol * .18, uHover);
    gl_FragColor = vec4(c, 1.);
  }
`;

const EMIS_FRAG = /* glsl */ `
  uniform vec3 uColor; uniform sampler2D uMap; uniform float uHasMap; uniform float uIntensity; uniform float uHover;
  varying vec2 vUv;
  void main(){
    vec3 c = uColor;
    if (uHasMap > .5) { vec4 t = texture2D(uMap, vUv); if (t.a < .5) discard; c *= t.rgb; }
    c *= uIntensity * (1. + uHover * .35);
    // alpha .6 flags emissive pixels for the bloom pass
    gl_FragColor = vec4(c, .6);
  }
`;

export type LitOpts = {
  color?: string;
  map?: THREE.Texture | null;
  wind?: number;
  windAnchor?: number;
  gloss?: number;
  side?: THREE.Side;
  hover?: { value: number };
};

export function lit(o: LitOpts = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...shared,
      uColor: { value: col(o.color ?? '#ffffff') },
      uMap: { value: o.map ?? null },
      uHasMap: { value: o.map ? 1 : 0 },
      uWind: { value: o.wind ?? 0 },
      uWindAnchor: { value: o.windAnchor ?? 0 },
      uGloss: { value: o.gloss ?? 0 },
      uHover: o.hover ?? { value: 0 },
      uHoverCol: { value: col('#ffe2b8') },
    },
    defines: o.wind ? { WIND: 1 } : {},
    vertexShader: LIT_VERT,
    fragmentShader: LIT_FRAG,
    side: o.side ?? THREE.FrontSide,
  });
}

export function emissive(o: { color?: string; map?: THREE.Texture | null; intensity?: number; hover?: { value: number } } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: col(o.color ?? '#ffffff') },
      uMap: { value: o.map ?? null },
      uHasMap: { value: o.map ? 1 : 0 },
      uIntensity: { value: o.intensity ?? 1 },
      uHover: o.hover ?? { value: 0 },
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: EMIS_FRAG,
  });
}

export function pixelTexture(canvas: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(canvas);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.NoColorSpace;
  return t;
}
