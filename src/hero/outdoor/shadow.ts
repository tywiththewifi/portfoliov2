import * as THREE from 'three';
import { shared } from '../materials';

// Shadow layer: only objects with this layer enabled cast sun shadows (the
// desk, props, trunks). Grass and foliage cards receive but don't cast;
// canopy dapple comes from the gobo instead, which reads better in pixels.
export const CAST = 1;

export function castShadows(root: THREE.Object3D) {
  root.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.layers.enable(CAST); });
  return root;
}

// A directional "sun" depth map rendered from an orthographic camera and
// sampled by the lit shader (3x3 PCF).
export class SunShadow {
  readonly rt: THREE.WebGLRenderTarget;
  readonly cam = new THREE.OrthographicCamera(-4, 4, 4, -4, 0.1, 60);
  private depth = new THREE.MeshDepthMaterial();

  constructor(size = 2048) {
    this.rt = new THREE.WebGLRenderTarget(size, size, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
    this.rt.depthTexture = new THREE.DepthTexture(size, size);
    this.rt.depthTexture.type = THREE.UnsignedIntType;
    this.cam.layers.set(CAST);
    shared.uShadowMap.value = this.rt.depthTexture;
    shared.uShadowTexel.value = 1 / size;
  }

  // Aim the light down `dir` (pointing toward the sun) at `center`, covering
  // a square `half` metres each way.
  aim(dir: THREE.Vector3, center: THREE.Vector3, half: number) {
    const c = this.cam;
    c.left = -half; c.right = half; c.top = half; c.bottom = -half;
    c.position.copy(center).addScaledVector(dir.clone().normalize(), 25);
    c.lookAt(center);
    c.updateProjectionMatrix();
    c.updateMatrixWorld();
  }

  render(r: THREE.WebGLRenderer, scene: THREE.Scene) {
    const prev = r.getRenderTarget();
    scene.overrideMaterial = this.depth;
    r.setRenderTarget(this.rt);
    r.clear();
    r.render(scene, this.cam);
    scene.overrideMaterial = null;
    r.setRenderTarget(prev);
    shared.uShadowMat.value.multiplyMatrices(this.cam.projectionMatrix, this.cam.matrixWorldInverse);
  }
}
