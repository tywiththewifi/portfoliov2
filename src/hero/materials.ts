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
  // 0 = pixel style (posterised, dithered light); 1 = poly style (smooth)
  uSmooth: { value: 0 },
  // outdoors: sun (with shadow map and a moving canopy "gobo") and sky light
  uSunDir: { value: new THREE.Vector3(0.4, 0.8, 0.3).normalize() },
  uSunCol: { value: col('#fff2d6') },
  uSunI: { value: 0 },
  uSkyCol: { value: col('#9fd0ff') },
  uGroundCol: { value: col('#3a4a22') },
  uHemiI: { value: 0 },
  uShadowMap: { value: null as THREE.Texture | null },
  uShadowMat: { value: new THREE.Matrix4() },
  uShadowOn: { value: 0 },
  uShadowTexel: { value: 1 / 2048 },
  uGobo: { value: null as THREE.Texture | null },
  uGoboOn: { value: 0 },
  uGoboScale: { value: 0.25 },
  uGoboOff: { value: new THREE.Vector2() },
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
  varying vec3 vN; varying vec3 vW; varying vec2 vUv; varying vec3 vTint; varying vec3 vObj;
  void main(){
    vUv = uv;
    vObj = position;
    vTint = vec3(1.);
    #ifdef USE_INSTANCING_COLOR
      vTint = instanceColor;
    #endif
    #ifdef USE_COLOR
      vTint *= color; // baked per-part tint, contact AO and edge wear
    #endif
    mat4 mm = modelMatrix;
    #ifdef USE_INSTANCING
      mm = modelMatrix * instanceMatrix;
    #endif
    vec4 wp = mm * vec4(position, 1.);
    #ifdef WIND
      float ph = aPhase + wp.x * 3.1 + wp.z * 2.3;
      #ifdef GRASS
        float h = uv.y * uv.y; // blades: tips move, roots stay planted
      #else
        float h = max(uWindAnchor - wp.y, 0.) + max(wp.y - uWindAnchor, 0.) * .4;
      #endif
      wp.x += (sin(uTime * 1.7 + ph) + .45 * sin(uTime * 3.1 + ph * 2.1)) * uWind * h;
      wp.z += cos(uTime * 1.3 + ph * 1.2) * uWind * .6 * h;
    #endif
    vW = wp.xyz;
    vN = normalize(mat3(mm) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const LIT_FRAG = /* glsl */ `
  ${GLSL_COMMON}
  uniform vec3 uColor; uniform sampler2D uMap; uniform float uHasMap;
  uniform vec3 uLampPos, uLampDir, uLampCol, uWinPos, uWinCol, uScrPos, uScrCol, uAmb, uFillPos, uFillCol;
  uniform float uLampI, uWinI, uScrI, uFillI, uLevels, uTime, uHover, uGloss, uSmooth;
  uniform vec3 uHoverCol;
  uniform vec3 uSunDir, uSunCol, uSkyCol, uGroundCol;
  uniform float uSunI, uHemiI, uShadowOn, uShadowTexel, uGoboOn, uGoboScale, uRootShade;
  uniform sampler2D uShadowMap, uGobo; uniform mat4 uShadowMat; uniform vec2 uGoboOff;
  uniform float uRough, uMetal, uGrain; uniform vec3 uGrainScale;
  varying vec3 vN; varying vec3 vW; varying vec2 vUv; varying vec3 vTint; varying vec3 vObj;

  // 3D value noise for surface grain (plastic mottling, powder coat, wood)
  float hash13(vec3 p){ p = fract(p * .1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
  float vnoise3(vec3 p){
    vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
    return mix(mix(mix(hash13(i), hash13(i + vec3(1,0,0)), f.x), mix(hash13(i + vec3(0,1,0)), hash13(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash13(i + vec3(0,0,1)), hash13(i + vec3(1,0,1)), f.x), mix(hash13(i + vec3(0,1,1)), hash13(i + vec3(1,1,1)), f.x), f.y), f.z);
  }

  // 3x3 PCF against the sun's depth map
  float sunShadow(vec3 w){
    if (uShadowOn < .5) return 1.;
    vec4 s = uShadowMat * vec4(w, 1.);
    vec3 p = s.xyz / s.w * .5 + .5;
    if (p.x < 0. || p.x > 1. || p.y < 0. || p.y > 1. || p.z > 1.) return 1.;
    float sh = 0.;
    for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++)
      sh += step(p.z - .0025, texture2D(uShadowMap, p.xy + vec2(float(i), float(j)) * uShadowTexel).x);
    return sh / 9.;
  }
  // leafy light pattern projected down the sun direction (canopy dapple)
  float gobo(vec3 w){
    if (uGoboOn < .5) return 1.;
    vec2 q = (w.xz - uSunDir.xz / max(uSunDir.y, .25) * w.y) * uGoboScale + uGoboOff;
    return texture2D(uGobo, q).r;
  }

  void main(){
    vec3 base = uColor * vTint;
    if (uHasMap > .5) {
      vec4 t = texture2D(uMap, vUv);
      if (t.a < .5) discard;
      base *= t.rgb;
    }
    // grass: darker toward the root
    base *= mix(1. - uRootShade, 1., vUv.y);
    // surface grain: two octaves of object-space noise, stretched per axis
    // (long along the grain for wood, round for plastic and powder coat)
    float grain = .5;
    if (uGrain > 0.) {
      vec3 gp = vObj * uGrainScale;
      grain = vnoise3(gp) * .65 + vnoise3(gp * 3.7 + 11.) * .35;
      base *= 1. + (grain - .5) * uGrain * 2.;
    }
    vec3 n = normalize(vN);
    if (!gl_FrontFacing) n = -n;

    // sun + sky: wrap lighting on thin things (grass, leaves) so they glow
    float ndl = dot(n, uSunDir);
    float wrap = uRootShade > 0. ? .55 + .45 * max(ndl, 0.) : max(ndl, 0.);
    float sunVis = sunShadow(vW) * gobo(vW);
    float sun = wrap * sunVis * uSunI;
    vec3 hemi = mix(uGroundCol, uSkyCol, n.y * .5 + .5) * uHemiI;

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

    vec3 light = uAmb + hemi + uSunCol * sun + uLampCol * lamp * 2.6 + uWinCol * win + uScrCol * scr + uFillCol * fill;
    // specular glint from the lamp for glossy things (CRT glass, vinyl)
    vec3 V = normalize(cameraPosition - vW);
    float spec = pow(max(dot(reflect(-L, n), V), 0.), 24.) * uGloss * uLampI;
    // physically-flavoured highlights for the detailed props: normalised
    // Blinn-Phong from the sun and lamp, and a Fresnel sky reflection, with
    // roughness broken up a little by the grain
    vec3 sheen = vec3(0.);
    if (uRough > 0.) {
      float r = clamp(uRough + (grain - .5) * .25, .04, 1.);
      float e = 2. / (r * r * r * r) - 2.;
      float nrm = (e + 8.) / 25.;
      vec3 F0 = mix(vec3(.04), base, uMetal);
      float nv = max(dot(n, V), 0.);
      vec3 Hs = normalize(uSunDir + V);
      vec3 Hl = normalize(L + V);
      vec3 F = F0 + (1. - F0) * pow(1. - nv, 5.) * (1. - r);
      sheen += uSunCol * uSunI * sunVis * pow(max(dot(n, Hs), 0.), e) * nrm * max(ndl, 0.);
      sheen += uLampCol * pow(max(dot(n, Hl), 0.), e) * nrm * max(dot(n, L), 0.) * (0.35 + cone) * uLampI * 2.6 / (1. + d * d * 1.6);
      vec3 env = mix(uGroundCol, uSkyCol, reflect(-V, n).y * .5 + .5) * uHemiI + uAmb;
      sheen = sheen * F + env * F * (1. - r * .8);
      base *= 1. - uMetal * .6;
    }

    // posterise the light with an ordered dither: the pixel-art shading
    float b = bayer4(gl_FragCoord.xy);
    if (uSmooth < .5) {
      light = floor(light * uLevels + b) / uLevels;
      spec = floor(spec * 3. + b) / 3.;
      sheen = floor(sheen * 6. + b) / 6.;
    }
    vec3 c = base * light + uLampCol * spec + sheen;

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
  rootShade?: number;
  grass?: boolean;
  color?: string;
  map?: THREE.Texture | null;
  wind?: number;
  windAnchor?: number;
  gloss?: number;
  side?: THREE.Side;
  hover?: { value: number };
  // detailed props: roughness (enables sun/lamp highlights and a sky
  // reflection), metalness, surface grain strength and its scale per axis,
  // and per-vertex colour (baked AO / tint from the prop kit)
  rough?: number;
  metal?: number;
  grain?: number;
  grainScale?: [number, number, number];
  vcol?: boolean;
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
      uRootShade: { value: o.rootShade ?? 0 },
      uRough: { value: o.rough ?? 0 },
      uMetal: { value: o.metal ?? 0 },
      uGrain: { value: o.grain ?? 0 },
      uGrainScale: { value: new THREE.Vector3(...(o.grainScale ?? [60, 60, 60])) },
    },
    vertexColors: o.vcol ?? false,
    defines: o.grass ? { WIND: 1, GRASS: 1 } : o.wind ? { WIND: 1 } : {},
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

// Unlit colour/texture, for painted backdrop layers (the post pass adds
// distance haze). Cut-out on the texture's alpha.
export function flat(o: { color?: string; map?: THREE.Texture | null; side?: THREE.Side } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: col(o.color ?? '#ffffff') }, uMap: { value: o.map ?? null }, uHasMap: { value: o.map ? 1 : 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform vec3 uColor; uniform sampler2D uMap; uniform float uHasMap; varying vec2 vUv;
      void main(){ vec3 c = uColor; if (uHasMap > .5) { vec4 t = texture2D(uMap, vUv); if (t.a < .5) discard; c *= t.rgb; } gl_FragColor = vec4(c, 1.); }`,
    side: o.side ?? THREE.FrontSide,
    userData: { backdrop: true },
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
