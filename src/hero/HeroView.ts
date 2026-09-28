import * as THREE from 'three';
import { GLSL_COMMON, col, shared } from './materials';

// Size of one art pixel in CSS px for a given viewport width.
export function pxSize(w: number) {
  if (w < 2200) return 2;
  return 3;
}

const POST_FRAG = /* glsl */ `
  ${GLSL_COMMON}
  uniform sampler2D tColor; uniform sampler2D tDepth; uniform vec2 uRes;
  uniform float uNear, uFar, uFade, uBloom, uTime, uVignette, uExposure;
  uniform vec3 uBg, uBloomCol, uGrade;
  float isEm(vec4 t){ return (t.a > .4 && t.a < .9) ? 1. : 0.; }
  float dist(vec2 uv){ float d = texture(tDepth, uv).x; return -(uNear * uFar) / ((uFar - uNear) * d - uFar); }
  void main(){
    vec2 px = 1. / uRes; vec2 uv = gl_FragCoord.xy * px;
    vec4 s0 = texture(tColor, uv); vec3 c = s0.rgb * uGrade * uExposure;

    // emissive glow: count bright emissive neighbours on two rings, quantised
    float gs = 0.; vec3 gc = vec3(0.);
    for (int i = 0; i < 8; i++) {
      float a = float(i) * .785398; vec2 o = vec2(cos(a), sin(a));
      vec4 t1 = texture(tColor, uv + o * px * 2.), t2 = texture(tColor, uv + o * px * 5.);
      float w1 = isEm(t1) * smoothstep(.3, .9, dot(t1.rgb, vec3(.33)));
      float w2 = .55 * isEm(t2) * smoothstep(.3, .9, dot(t2.rgb, vec3(.33)));
      gs += w1 + w2; gc += t1.rgb * w1 + t2.rgb * w2;
    }
    vec3 glowCol = gs > 0. ? gc / gs : uBloomCol;
    float gq = floor(gs * .55 + bayer4(gl_FragCoord.xy)) / 5.;
    c += mix(uBloomCol, glowCol, .6) * gq * uBloom * (1. - isEm(s0) * .7);

    // ink outlines where depth jumps (objects in front of the wall)
    float d = dist(uv);
    float dm = max(max(dist(uv + vec2(px.x, 0.)), dist(uv - vec2(px.x, 0.))), max(dist(uv + vec2(0., px.y)), dist(uv - vec2(0., px.y))));
    if (dm - d > max(.06, d * .05)) c *= .55;

    // soft vignette
    vec2 q = uv - .5; c *= 1. - dot(q, q) * uVignette;

    // dissolve into the page at the bottom edge
    float y = gl_FragCoord.y - .5;
    if (y < uFade) {
      float k = (y + 1.) / (uFade + 1.);
      float h = hash12(floor(gl_FragCoord.xy / 3.) + 3.) * .55 + hash12(floor(gl_FragCoord.xy) + 7.) * .45; // clumpy, not salt
      if (h > pow(k, .55)) c = h > .985 ? uBloomCol : (h > .95 ? mix(uBg, c, .5) : uBg);
    }
    gl_FragColor = vec4(c, 1.);
  }
`;

export type Tick = (t: number, dt: number) => void;

export class HeroView {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly rt: THREE.WebGLRenderTarget;
  readonly post: THREE.ShaderMaterial;
  private postScene = new THREE.Scene();
  private postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private ticks: Tick[] = [];
  private running = false;
  private last = 0;
  P = 3;
  lw = 1;
  lh = 1;
  private scroll = 0;

  // Camera rig: a resting pose plus a focus pose we can blend into (CRT zoom).
  readonly rig = {
    pos: new THREE.Vector3(0.0, 1.28, 1.85),
    look: new THREE.Vector3(0.0, 1.2, -0.7),
    fov: 38,
    zoom: 0, // 0 = room, 1 = focused on the CRT
    focusPos: new THREE.Vector3(0.0, 1.03, 0.62),
    focusLook: new THREE.Vector3(0.0, 1.03, -0.3),
    focusFov: 34,
  };
  readonly mouse = { x: 0, y: 0, tx: 0, ty: 0 };

  constructor(readonly canvas: HTMLCanvasElement, readonly stage: HTMLElement) {
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false }));
    r.setPixelRatio(1);
    r.outputColorSpace = THREE.LinearSRGBColorSpace;
    r.setClearColor(0x1a0d12, 1);

    this.camera = new THREE.PerspectiveCamera(this.rig.fov, 16 / 9, 0.05, 60);

    this.rt = new THREE.WebGLRenderTarget(4, 4, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
    this.rt.depthTexture = new THREE.DepthTexture(4, 4);
    this.rt.depthTexture.type = THREE.UnsignedIntType;

    this.post = new THREE.ShaderMaterial({
      uniforms: {
        tColor: { value: this.rt.texture },
        tDepth: { value: this.rt.depthTexture },
        uRes: { value: new THREE.Vector2(4, 4) },
        uNear: { value: this.camera.near },
        uFar: { value: this.camera.far },
        uFade: { value: 8 },
        uBloom: { value: 0.9 },
        uBloomCol: { value: col('#ffb07a') },
        uBg: { value: col('#170c10') },
        uGrade: { value: new THREE.Vector3(1, 1, 1) },
        uExposure: { value: 1 },
        uVignette: { value: 0.9 },
        uTime: shared.uTime,
      },
      vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0., 1.); }',
      fragmentShader: POST_FRAG,
      depthTest: false,
      depthWrite: false,
    });
    const tri = new THREE.BufferGeometry();
    tri.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    const q = new THREE.Mesh(tri, this.post);
    q.frustumCulled = false;
    this.postScene.add(q);

    stage.addEventListener('pointermove', (e) => {
      const b = stage.getBoundingClientRect();
      this.mouse.tx = ((e.clientX - b.left) / b.width) * 2 - 1;
      this.mouse.ty = ((e.clientY - b.top) / b.height) * 2 - 1;
    });
    stage.addEventListener('pointerleave', () => {
      this.mouse.tx = 0;
      this.mouse.ty = 0;
    });

    new ResizeObserver(() => this.resize()).observe(stage);
    this.resize();
  }

  onTick(fn: Tick) {
    this.ticks.push(fn);
  }

  resize() {
    const w = this.stage.clientWidth || innerWidth;
    const h = this.stage.clientHeight || innerHeight;
    const P = pxSize(w);
    const lw = Math.ceil(w / P);
    const lh = Math.ceil(h / P);
    if (lw === this.lw && lh === this.lh && P === this.P) return;
    this.P = P;
    this.lw = lw;
    this.lh = lh;
    this.renderer.setSize(lw, lh, false);
    this.canvas.style.width = `${lw * P}px`;
    this.canvas.style.height = `${lh * P}px`;
    this.rt.setSize(lw, lh);
    this.post.uniforms.uRes.value.set(lw, lh);
    this.applyFade();
    this.camera.aspect = lw / lh;
    this.updateCamera();
    if (!this.running) this.render();
  }

  // Scroll progress through the hero (0..1): the dissolve band at the bottom
  // eats upward into the room as the page scrolls, like Agentic's hero.
  setScroll(p: number) {
    p = Math.max(0, Math.min(1, p));
    if (p === this.scroll) return;
    this.scroll = p;
    this.applyFade();
    if (!this.running) this.render();
  }

  private applyFade() {
    this.post.uniforms.uFade.value = Math.ceil(30 / this.P) + this.scroll * this.lh * 0.62;
  }

  // Keep the desk framed on any aspect ratio: widen the FOV on tall screens.
  private fitFov(base: number) {
    const aspect = this.camera.aspect;
    const minAspect = 1.25;
    if (aspect >= minAspect) return base;
    const t = Math.tan(THREE.MathUtils.degToRad(base / 2)) * (minAspect / aspect) ** 0.55;
    return THREE.MathUtils.radToDeg(Math.atan(t)) * 2;
  }

  updateCamera() {
    const { rig, camera, mouse } = this;
    const z = rig.zoom;
    const e = z * z * (3 - 2 * z);
    const pos = rig.pos.clone().lerp(rig.focusPos, e);
    const look = rig.look.clone().lerp(rig.focusLook, e);
    // gentle parallax from the pointer, fading out while zoomed in
    const par = 1 - e;
    pos.x += mouse.x * 0.06 * par;
    pos.y -= mouse.y * 0.035 * par;
    camera.position.copy(pos);
    camera.fov = THREE.MathUtils.lerp(this.fitFov(rig.fov), rig.focusFov, e);
    camera.updateProjectionMatrix();
    camera.lookAt(look);
    camera.updateMatrixWorld(true);
  }

  // Project a world point to CSS px within the stage.
  toScreen(p: THREE.Vector3) {
    const v = p.clone().project(this.camera);
    return { x: ((v.x + 1) / 2) * this.lw * this.P, y: ((1 - v.y) / 2) * this.lh * this.P, z: v.z };
  }

  render() {
    const r = this.renderer;
    r.setRenderTarget(this.rt);
    r.clear();
    r.render(this.scene, this.camera);
    r.setRenderTarget(null);
    r.render(this.postScene, this.postCam);
  }

  private frame = (now: number) => {
    if (!this.running) return;
    const t = now / 1000;
    const dt = Math.min(0.05, this.last ? t - this.last : 0.016);
    this.last = t;
    shared.uTime.value = t;
    this.mouse.x += (this.mouse.tx - this.mouse.x) * Math.min(1, dt * 4);
    this.mouse.y += (this.mouse.ty - this.mouse.y) * Math.min(1, dt * 4);
    for (const fn of this.ticks) fn(t, dt);
    this.updateCamera();
    this.render();
    requestAnimationFrame(this.frame);
  };

  start() {
    if (this.running) return;
    this.running = true;
    this.last = 0;
    requestAnimationFrame(this.frame);
  }

  stop() {
    this.running = false;
  }
}
