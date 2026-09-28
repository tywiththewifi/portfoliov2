import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { GLSL_COMMON } from '../materials';
import { QUALITY } from './shadow';

// A still lake: a planar reflection (three's Reflector) read back with a
// gentle animated ripple, darkened toward the viewer by a fresnel term and
// posterised with a dither. Reflected light sources keep their emissive
// flag so the lamp, CRT and moon bloom in the water too.
export function buildWater(o: { size: number; y: number; deep: string; res: number }) {
  const shader = {
    name: 'PixelLake',
    uniforms: {
      color: { value: new THREE.Color(o.deep) },
      tDiffuse: { value: null },
      textureMatrix: { value: null },
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      uniform mat4 textureMatrix;
      varying vec4 vUv; varying vec3 vW;
      void main(){
        vUv = textureMatrix * vec4(position, 1.);
        vW = (modelMatrix * vec4(position, 1.)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
      }`,
    fragmentShader: /* glsl */ `
      ${GLSL_COMMON}
      uniform vec3 color; uniform sampler2D tDiffuse; uniform float uTime;
      varying vec4 vUv; varying vec3 vW;
      void main(){
        vec2 w = vW.xz;
        vec2 off = vec2(sin(w.y * 3.1 + uTime * 1.2) + sin(w.x * 1.7 - uTime * .8),
                        cos(w.x * 2.3 + uTime * 1.0) + sin(w.y * 1.3 + uTime * .6)) * .0035;
        float d = length(vW - cameraPosition);
        off *= clamp(10. / d, .25, 1.);
        vec4 uv = vUv; uv.xy += off * uv.w;
        vec4 r = texture2DProj(tDiffuse, uv);
        vec3 v = normalize(cameraPosition - vW);
        float fres = .35 + .65 * pow(1. - abs(v.y), 3.);
        vec3 c = mix(color, r.rgb, fres);
        c = floor(c * 24. + bayer4(gl_FragCoord.xy)) / 24.;
        float em = (r.a > .4 && r.a < .9) ? .6 : 1.;
        gl_FragColor = vec4(c, em);
      }`,
  };
  const water = new Reflector(new THREE.PlaneGeometry(o.size, o.size), {
    textureWidth: Math.round(o.res * QUALITY), textureHeight: Math.round(o.res * QUALITY * 0.56), clipBias: 0.003, shader, color: o.deep,
  });
  water.rotation.x = -Math.PI / 2;
  water.position.y = o.y;
  const mat = water.material as THREE.ShaderMaterial;
  return { mesh: water, tick: (t: number) => { mat.uniforms.uTime.value = t; } };
}
