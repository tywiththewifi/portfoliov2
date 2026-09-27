import * as THREE from 'three';
import { GLSL_COMMON, shared } from './materials';

// Glowing dust motes drifting through the room. They brighten near the lamp,
// twinkle, and get pushed aside by the cursor.
export function buildDust(count = 420) {
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = -1.9 + Math.random() * 3.9;
    pos[i * 3 + 1] = 0.7 + Math.random() * 1.8;
    pos[i * 3 + 2] = -0.62 + Math.random() * 1.9;
    seed[i * 4] = Math.random() * 100;
    seed[i * 4 + 1] = 0.4 + Math.random() * 0.8; // speed
    seed[i * 4 + 2] = Math.random(); // size class
    seed[i * 4 + 3] = Math.random(); // hue
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));

  const uniforms = {
    uTime: shared.uTime,
    uLampPos: shared.uLampPos,
    uLampI: shared.uLampI,
    uMouse: { value: new THREE.Vector3(0, 1.2, 0.4) },
    uMouseOn: { value: 0 },
    uPx: { value: 3 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      uniform float uTime; uniform vec3 uLampPos; uniform float uLampI; uniform vec3 uMouse; uniform float uMouseOn;
      attribute vec4 aSeed;
      varying float vA; varying float vHue;
      void main(){
        vec3 p = position;
        float t = uTime * .06 * aSeed.y + aSeed.x;
        // slow rise with curling drift, wrapped inside the room volume
        p.y = .7 + mod(p.y - .7 + t * .9, 1.8);
        p.x += sin(t * 2.3 + aSeed.x) * .09 + sin(t * 5.1 + aSeed.x * 1.7) * .03;
        p.z += cos(t * 1.9 + aSeed.x * 1.3) * .08;
        // cursor pushes motes away
        vec3 dm = p - uMouse; float dd = length(dm);
        p += normalize(dm + 1e-4) * uMouseOn * .22 * smoothstep(.45, 0., dd);
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        gl_Position = projectionMatrix * mv;
        float near = smoothstep(1.3, .1, distance(p, uLampPos)) * uLampI;
        float tw = .55 + .45 * sin(uTime * (1.5 + aSeed.y * 2.) + aSeed.x * 7.);
        vA = clamp(tw * (.5 + near * 1.2), 0., 1.4);
        vHue = aSeed.w;
        gl_PointSize = aSeed.z > .78 ? 2. : 1.;
      }`,
    fragmentShader: /* glsl */ `
      ${GLSL_COMMON}
      varying float vA; varying float vHue;
      void main(){
        if (vA < bayer4(gl_FragCoord.xy) * .9) discard;
        vec3 c = mix(vec3(1., .86, .62), vec3(1., .7, .78), step(.65, vHue));
        c = mix(c, vec3(.7, 1., .92), step(.9, vHue));
        gl_FragColor = vec4(c * (.7 + vA * .6), .6);
      }`,
    transparent: false,
    depthWrite: false,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  return { points, uniforms };
}
