// 12x12 pixel icons for the pegboard cards (drawn as tiny bitmaps).
// Each row is 12 chars; '.' = empty, other chars map to palette entries.

const PAL: Record<string, string> = {
  k: '#1a1216', w: '#f6ecd8', o: '#ff7a2e', y: '#f2c14a', r: '#e8483b', b: '#3a6ea5',
  t: '#3fbfb0', g: '#4f9a4a', p: '#b88ad8', s: '#8a8488', d: '#4a4448', c: '#dccdb6',
};

const ICONS: Record<string, string[]> = {
  pencil: [
    '.........kk.', '........kok.', '.......kook.', '......kowk..', '.....kowk...', '....kowk....',
    '...kowk.....', '..kowk......', '.kcck.......', '.kck........', '.kk.........', '............',
  ],
  monitor: [
    '.kkkkkkkkkk.', '.kccccccccck', '.kckkkkkkkck', '.kcktttttkck', '.kcktkkktkck', '.kcktttttkck',
    '.kckkkkkkkck', '.kccccccccck', '.kkkkkkkkkkk', '....kcck....', '...kccccck..', '...kkkkkk...',
  ],
  cube: [
    '.....kk.....', '...kkppkk...', '.kkppppppkk.', 'kpppppppppk.', 'kkkppppppkkk', 'kbbkkppkkddk',
    'kbbbbkkdddk.', 'kbbbbbkddddk', 'kbbbbbkddddk', '.kkbbbkddkk.', '...kkbkkk...', '.....kk.....',
  ],
  note: [
    '.....kkkkkk.', '.....kooook.', '.....kokkok.', '.....kk..kk.', '.....k....k.', '.....k....k.',
    '..kkkk..kkkk', '.koook.koook', '.koook.koook', '..kkk...kkk.', '............', '............',
  ],
  camera: [
    '............', '..kkk.......', '.kkkkkkkkkk.', 'kccccccccyck', 'kcckkkkcccck', 'kckbbbkkccck',
    'kckbwbbkccck', 'kckbbbbkccck', 'kcckkkkcccck', 'kccccccccsck', '.kkkkkkkkkk.', '............',
  ],
  floppy: [
    'kkkkkkkkkkk.', 'kbbwwwwwsbbk', 'kbbwwwwwsbbk', 'kbbwwwwwwbbk', 'kbbbbbbbbbbk', 'kbwwwwwwwwbk',
    'kbwkkkkkkwbk', 'kbwwwwwwwwbk', 'kbwkkkkkkwbk', 'kbwwwwwwwwbk', 'kbbbbbbbbbbk', 'kkkkkkkkkkkk',
  ],
  wave: [
    '............', '............', '.....k......', '....kok.....', '..k.kok.k...', '.kok.k.kok.k',
    'kok.....kokk', 'kk.......kk.', '............', 'kkkkkkkkkkkk', '............', '............',
  ],
  book: [
    '.kkkkkkkkkk.', 'krrrrrrrrrrk', 'krwwwwwwwwrk', 'krwkkkkkkwrk', 'krwwwwwwwwrk', 'krwkkkkwwwrk',
    'krwwwwwwwwrk', 'krrrrrrrrrrk', 'krrrryyrrrrk', 'krrrryyrrrrk', 'kcccccccccck', '.kkkkkkkkkk.',
  ],
  mail: [
    '............', 'kkkkkkkkkkkk', 'kwkwwwwwwkwk', 'kwwkwwwwkwwk', 'kwwwkwwkwwwk', 'kwwwwkkwwwwk',
    'kwwwwwwwwwwk', 'kwwwwwwwwwwk', 'kwwwwwwwwwwk', 'kkkkkkkkkkkk', '............', '............',
  ],
  star: [
    '.....kk.....', '.....kyk....', '....kyyk....', 'kkkkkyykkkk.', 'kyyyyyyyyyk.', '.kyyyyyyyk..',
    '..kyyyyyk...', '..kyykyyk...', '.kyyk.kyyk..', '.kyk...kyk..', '.kk.....kk..', '............',
  ],
  gear: [
    '....kkkk....', '.kk.kssk.kk.', '.kskkssskk..', '..kssssssk..', 'kksskkkkssk.', 'kssk....sskk',
    'kssk....sskk', 'kksskkkkssk.', '..kssssssk..', '.kskkssskk..', '.kk.kssk.kk.', '....kkkk....',
  ],
  globe: [
    '...kkkkkk...', '..kttgtttk..', '.kttgggttgk.', 'kttgggtttggk', 'ktttgtttggtk', 'kttttttggttk',
    'kttggtttttk.', 'kttgggtttttk', '.ktgggtttk..', '..kttgtttk..', '...kkkkkk...', '............',
  ],
};

export type IconId = keyof typeof ICONS;

const cache = new Map<string, string>();

export function iconURL(id: IconId, scale = 2) {
  const key = `${id}@${scale}`;
  if (cache.has(key)) return cache.get(key)!;
  const rows = ICONS[id];
  const c = document.createElement('canvas');
  c.width = 12 * scale;
  c.height = 12 * scale;
  const x = c.getContext('2d')!;
  rows.forEach((row, y) =>
    [...row].forEach((ch, i) => {
      const col = PAL[ch];
      if (!col) return;
      x.fillStyle = col;
      x.fillRect(i * scale, y * scale, scale, scale);
    }),
  );
  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}
