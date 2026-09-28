import * as THREE from 'three';
import { GLSL_COMMON, col, shared } from '../materials';

export type SkyOpts = {
  zenith: string;
  mid: string;
  horizon: string;
  below?: string;
  sunDir: THREE.Vector3; // toward the sun (or moon)
  sunCol: string;
  sunSize: number; // angular radius, as 1 - cos
  glow: number; // strength of the halo around the disc
  glowCol?: string;
  stars?: number; // 0..1 star density
  moon?: boolean; // draw the disc as a shaded moon
};

// A camera-centred sky dome: a posterised three-stop gradient with a sun or
// moon disc (flagged emissive so the post pass blooms it), an optional
// halo and a hashed star field. It never writes depth, so the post pass
// treats it as "infinitely far" and leaves it out of the distance haze.
export function buildSky(o: SkyOpts) {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uZenith: { value: col(o.zenith) },
      uMid: { value: col(o.mid) },
      uHorizon: { value: col(o.horizon) },
      uBelow: { value: col(o.below ?? o.horizon) },
      uSunDir: { value: o.sunDir.clone().normalize() },
      uSunCol: { value: col(o.sunCol) },
      uGlowCol: { value: col(o.glowCol ?? o.sunCol) },
      uSunSize: { value: o.sunSize },
      uGlow: { value: o.glow },
      uStars: { value: o.stars ?? 0 },
      uMoon: { value: o.moon ? 1 : 0 },
      uTime: { value: 0 },
      uSmooth: shared.uSmooth,
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main(){
        vDir = normalize((modelMatrix * vec4(position, 1.)).xyz - cameraPosition);
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.);
      }`,
    fragmentShader: /* glsl */ `
      ${GLSL_COMMON}
      uniform vec3 uZenith, uMid, uHorizon, uBelow, uSunDir, uSunCol, uGlowCol;
      uniform float uSunSize, uGlow, uStars, uMoon, uTime, uSmooth;
      varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 c = h < 0. ? mix(uHorizon, uBelow, smoothstep(0., .15, -h))
                        : mix(mix(uHorizon, uMid, smoothstep(0., .18, h)), uZenith, smoothstep(.18, .75, h));
        float s = dot(d, uSunDir);
        // halo: wide soft glow plus a tighter hot core
        c += uGlowCol * (pow(max(s, 0.), 6.) * .35 + pow(max(s, 0.), 60.) * .6) * uGlow;
        float a = 1.;
        // stars: one hashed cell per ~0.2 degrees, twinkling a little
        if (uStars > 0. && h > .02) {
          // stereographic cells keep stars evenly sized across the dome
          vec2 cell = floor(d.xz / (1. + d.y) * 260.);
          float r = hash12(cell);
          if (r > 1. - uStars * .02) {
            float tw = .6 + .4 * sin(uTime * (1. + r * 3.) + r * 40.);
            c += vec3(.9, .95, 1.) * tw * smoothstep(.02, .25, h);
          }
        }
        // disc
        if (s > 1. - uSunSize) {
          vec3 disc = uSunCol;
          if (uMoon > .5) {
            // shade the moon with a few craters and a terminator
            vec3 t = normalize(cross(uSunDir, vec3(0., 1., 0.)));
            vec3 b = cross(t, uSunDir);
            vec2 m = vec2(dot(d, t), dot(d, b)) / sqrt(uSunSize * 2.);
            float crater = step(.7, hash12(floor(m * 6. + 7.)));
            disc *= (.8 + .2 * smoothstep(-.6, .4, m.x)) * (1. - crater * .15);
          }
          c = disc;
          a = .6; // emissive flag for bloom
        }
        // posterise the gradient with an ordered dither, like the rest
        float b = bayer4(gl_FragCoord.xy);
        if (uSmooth < .5) c = floor(c * 28. + b) / 28.;
        gl_FragColor = vec4(c, a);
      }`,
    side: THREE.BackSide,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(200, 32, 16), mat);
  mesh.renderOrder = -10;
  mesh.frustumCulled = false;
  return {
    mesh,
    tick(t: number, camera: THREE.Camera) {
      mat.uniforms.uTime.value = t;
      mesh.position.copy(camera.position);
    },
  };
}
