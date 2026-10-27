// Single list of every image, sound and font Infinite Dungeon uses.
// Nothing is copied: files are read where they already live, next to this game
// on GitHub Pages (../dragonbound2/ and ../dragonbound/). If Dragonbound II renames
// or deletes a file, tests/assets.test.js fails instead of the game breaking silently.
// Pure module: no DOM access, so Node tests can import it.
import { ANIM } from '../data/sprite-metrics.js';

export const DB2 = '../dragonbound2/';
export const DB1 = '../dragonbound/';

// hero id -> sprite base used by Dragonbound II file names
export const HERO_SPRITE = { aldric: 'ald', selena: 'sel', orin: 'ori', lyra: 'lyr', nyx: 'nyx' };

const heroImages = () => {
  const out = {};
  for (const b of Object.values(HERO_SPRITE)) {
    out[`${b}-face`] = `${DB2}img/${b}-face.webp`;
    out[b] = `${DB2}img/${b}.webp`;
    for (const [act, n] of Object.entries(ANIM[b] || {})) {
      for (let i = 0; i < n; i++) out[`${b}A_${act}${i}`] = `${DB2}img/${b}A_${act}${i}.webp`;
    }
  }
  return out;
};

// key -> path. Keys match Dragonbound II image names so sprite metrics apply as is.
export const IMAGES = {
  bg_title: `${DB2}img/bg_c7_1.webp`,
  ...heroImages(),
};

export const AUDIO = {
  m_title: `${DB2}audio/m_crypt.mp3`,
  ui_click: `${DB2}audio/ui_click.mp3`,
};

export const FONTS = {
  title: `${DB2}fonts/lilita-one.woff`,
  body: `${DB2}fonts/nunito.woff`,
};

// Every path, for preloading and tests.
export const allAssets = () => [
  ...Object.entries(IMAGES).map(([key, path]) => ({ kind: 'image', key, path })),
  ...Object.entries(AUDIO).map(([key, path]) => ({ kind: 'audio', key, path })),
  ...Object.entries(FONTS).map(([key, path]) => ({ kind: 'font', key, path })),
];
