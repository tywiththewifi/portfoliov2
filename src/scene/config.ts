// Scene geometry, in the pixel space of the room artwork (public/art/room.webp).
// When the art is replaced with layered assets, only this file should need edits.

export const SCENE = { w: 2000, h: 1131 };

// Point the camera keeps in view on narrow screens (the computer).
export const FOCUS = { x: 1018, y: 640 };

export type Rect = { x: number; y: number; w: number; h: number };
export type HotspotId = 'computer' | 'bookshelf' | 'mpc' | 'camera' | 'lamp';

export type Hotspot = {
  id: HotspotId;
  label: string;
  hint: string;
  rect: Rect;
  // Optional tighter polygon for the glow mask (defaults to rect).
  poly?: number[];
};

export const HOTSPOTS: Hotspot[] = [
  { id: 'computer', label: 'Work', hint: 'open projects', rect: { x: 815, y: 490, w: 408, h: 330 } },
  { id: 'bookshelf', label: 'Bookshelf', hint: 'favourite books', rect: { x: 128, y: 92, w: 545, h: 222 } },
  { id: 'mpc', label: 'MPC', hint: 'play some pads', rect: { x: 330, y: 784, w: 364, h: 150 } },
  { id: 'camera', label: 'Camera', hint: 'photo roll', rect: { x: 1478, y: 872, w: 176, h: 118 } },
  {
    id: 'lamp', label: 'Lamp', hint: 'lights', rect: { x: 1488, y: 340, w: 344, h: 400 },
    poly: [1488, 380, 1700, 340, 1832, 500, 1832, 740, 1760, 740, 1760, 520, 1690, 500, 1488, 495],
  },
];

// The CRT's visible glass, where the work UI lives.
export const SCREEN: Rect = { x: 843, y: 517, w: 353, h: 262 };

// Lamp: bulb position (for light) and the shade region that sways.
export const LAMP = {
  bulb: { x: 1596, y: 470 },
  shade: { x: 1488, y: 360, w: 215, h: 135 },
  pivot: { x: 1690, y: 420 },
};

// Leaf regions that sway with the displacement filter.
export const PLANTS: number[][] = [
  // central potted plant
  [440, 560, 820, 560, 820, 775, 440, 775],
  // plant by the window
  [1780, 680, 1950, 680, 1950, 1010, 1780, 1010],
  // hanging greenery across the top
  [0, 0, 1770, 0, 1770, 330, 700, 330, 700, 520, 0, 760],
];

// MPC pad grid (4x4) used for the hover light-up.
export const MPC_PADS = { x: 418, y: 822, w: 128, h: 72, cols: 4, rows: 4 };

// Where the point-and-shoot camera sprite sits on the desk.
export const CAMERA_SPRITE = { x: 1486, y: 880, scale: 4 };
