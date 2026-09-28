import type * as THREE from 'three';
import type { WallArt } from '../room';

export type SceneId = 'clearing' | 'meadow' | 'lake';

// Everything a concept needs to set the stage around the shared desk:
// its world, its light, its haze and post grade, and where the camera sits.
export type OutdoorScene = {
  id: SceneId;
  label: string;
  group: THREE.Group;
  sun: { dir: THREE.Vector3; col: string; i: number };
  hemi: { sky: string; ground: string; i: number };
  amb: string;
  // repurposed point lights from the room rig: a rim ("win") and a front fill
  rim?: { pos: THREE.Vector3; col: string; i: number };
  fill?: { pos: THREE.Vector3; col: string; i: number };
  lampI?: number; // lamp strength when switched on (1 = room)
  screenI?: number;
  fog: { col: string; den: number; start: number };
  post: { bloomCol: string; bloom: number; vignette: number; outlineFar: number; grade?: [number, number, number]; bg?: string };
  gobo?: { tex: THREE.Texture; scale: number; drift: [number, number] };
  shadow: { center: THREE.Vector3; half: number };
  camera: { pos: THREE.Vector3; look: THREE.Vector3; fov: number };
  tick?: (t: number, dt: number, camera: THREE.Camera) => void;
};

export type SceneBuilder = (art: WallArt) => OutdoorScene;
