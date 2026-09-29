import * as THREE from 'three';
import { buildBoombox } from './props/boombox';
import { BEIGE_CABLE, cable, drape } from './props/cable';
import { buildChair } from './props/chair';
import { buildCrt } from './props/crt';
import { DESK, buildDesk } from './props/desk';
import { buildKeyboard, buildMouse } from './props/keyboard';
import { buildCassetteCase, buildMug } from './props/mug';
import { buildTower } from './props/tower';

// The desk set, arranged. Units are metres, the desk is centred on the
// origin with its long side along x, and +z is the side you sit at.
export function buildDeskSet(screen: THREE.Texture) {
  const root = new THREE.Group();
  const T = DESK.top;
  const put = (o: THREE.Object3D, x: number, y: number, z: number, ry = 0) => {
    o.position.set(x, y, z);
    o.rotation.y = ry;
    root.add(o);
    o.updateMatrixWorld(true);
    return o;
  };

  put(buildDesk().group, 0, 0, 0);

  const tower = buildTower();
  put(tower.group, -0.63, T, -0.12, 0.06);
  const crt = buildCrt(screen);
  put(crt.group, -0.1, T, 0.05, 0.1);
  const keyboard = buildKeyboard();
  put(keyboard.group, -0.07, T, 0.23, 0.035);
  const mouse = buildMouse();
  put(mouse.group, 0.32, T, 0.24, -0.1);
  const boombox = buildBoombox();
  put(boombox.group, 0.5, T, -0.2, -0.22);
  put(buildMug().group, 0.66, T, 0.17, 2.3);
  put(buildCassetteCase().group, 0.4, T, 0.02, 0.45);

  // the chair, pushed back and turned away as if someone just stood up
  put(buildChair(), -0.42, 0, 0.92, Math.PI - 0.55).scale.setScalar(0.9);

  // cables: keyboard (coiled) and mouse to the tower, the CRT's lead to the
  // tower's back, and the boombox's mains lead off the back of the desk to
  // the floor
  const w = (o: THREE.Object3D, v: THREE.Vector3) => v.clone().applyMatrix4(o.matrixWorld);
  const towerBack = w(tower.group, tower.back);
  root.add(
    cable(w(keyboard.group, keyboard.cablePort), towerBack.clone().setY(T + 0.02), T, { beige: true, coil: 26, r: 0.0022, lift: 0.01, wander: 0.03 }),
    cable(w(crt.group, crt.back), towerBack.clone().add(new THREE.Vector3(0, 0.03, 0)), T, { r: 0.004, lift: 0.1, wander: 0.02 }),
  );
  // the mouse lead runs back under the CRT's right side and round behind it
  const tail = w(mouse.group, mouse.tail), r = 0.0024;
  root.add(drape([
    tail,
    new THREE.Vector3(tail.x - 0.04, T + r, tail.z - 0.1),
    new THREE.Vector3(0.12, T + r, -0.12),
    new THREE.Vector3(0.02, T + r, -0.36),
    new THREE.Vector3(-0.3, T + r, -0.38),
    towerBack.clone().add(new THREE.Vector3(0.03, -0.02, 0.01)),
  ], r, BEIGE_CABLE));
  // bounds for framing, taken before the floor lead below
  const bounds = new THREE.Box3().setFromObject(root);
  const bbBack = w(boombox.group, new THREE.Vector3(0.2, 0.05, -0.07));
  const edge = -DESK.depth / 2;
  root.add(drape([
    bbBack,
    new THREE.Vector3(bbBack.x + 0.02, T + 0.004, bbBack.z - 0.08),
    new THREE.Vector3(bbBack.x + 0.03, T + 0.004, edge + 0.02),
    new THREE.Vector3(bbBack.x + 0.035, T - 0.03, edge - 0.02),
    new THREE.Vector3(bbBack.x + 0.05, 0.3, edge - 0.05),
    new THREE.Vector3(bbBack.x + 0.12, 0.004, edge - 0.12),
    new THREE.Vector3(bbBack.x + 0.5, 0.004, edge - 0.3),
  ], 0.004));

  return {
    root,
    bounds,
    phosphor: crt.phosphor,
    // CRT screen centre in world space, for the glow light
    screenCenter: w(crt.group, crt.screenCenter),
    screenNormal: new THREE.Vector3(0, 0, 1).applyQuaternion(crt.group.quaternion),
    disk: tower.disk,
    boombox,
  };
}
