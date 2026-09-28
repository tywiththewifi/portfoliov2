import * as THREE from 'three';
import { GLSL_COMMON, col } from '../materials';

// Dithered light shafts: long planes laid along the sun direction that add
// light through an ordered-dither mask, fading at both ends. They add to
// colour but leave alpha alone, so they don't disturb the bloom flag.
export function lightShafts(o: { sunDir: THREE.Vector3; feet: THREE.Vector3[]; len: number; width: number; col: string; strength: number }) {
  const g = new THREE.Group();
  const mat = new THREE.ShaderMaterial({
    uniforms: { uCol: { value: col(o.col) }, uA: { value: o.strength }, uTime: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: /* glsl */ `
      ${GLSL_COMMON}
      uniform vec3 uCol; uniform float uA, uTime; varying vec2 vUv;
      void main(){
        float across = 1. - abs(vUv.x - .5) * 2.;
        float along = smoothstep(0., .25, vUv.y) * smoothstep(1., .55, vUv.y);
        float a = uA * across * along * (.8 + .2 * sin(uTime * .7 + vUv.y * 6.));
        if (bayer4(gl_FragCoord.xy) > a) discard;
        gl_FragColor = vec4(uCol, 0.);
      }`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.ZeroFactor,
    blendDstAlpha: THREE.OneFactor,
  });
  const up = o.sunDir.clone().normalize();
  for (const foot of o.feet) {
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(o.width, o.len), mat);
    // long axis along the sun direction, face turned toward the viewer (+z)
    const z = new THREE.Vector3(0, 0, 1).addScaledVector(up, -up.z).normalize();
    const x = new THREE.Vector3().crossVectors(up, z).normalize();
    plane.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, up, z));
    plane.position.copy(foot).addScaledVector(up, o.len / 2);
    g.add(plane);
  }
  return { group: g, tick: (t: number) => { mat.uniforms.uTime.value = t; } };
}
