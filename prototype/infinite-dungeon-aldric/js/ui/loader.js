// Loads images listed in assets.js and keeps track of anything missing.
import { IMAGES } from './assets.js';

const cache = new Map();   // key -> HTMLImageElement (loaded)
const missing = new Set(); // paths that failed

export function loadImage(key) {
  if (cache.has(key)) return Promise.resolve(cache.get(key));
  const src = IMAGES[key];
  if (!src) { missing.add(`(unknown key) ${key}`); return Promise.resolve(null); }
  return new Promise(resolve => {
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => {
      // decode before first draw so the first frame never stutters on iPhone
      const done = () => { cache.set(key, im); resolve(im); };
      if (im.decode) im.decode().then(done, done); else done();
    };
    im.onerror = () => { missing.add(src); resolve(null); };
    im.src = src;
  });
}

export const loadImages = keys => Promise.all(keys.map(loadImage));
export const getImage = key => cache.get(key) || null;
export const missingAssets = () => [...missing];
export const noteMissing = path => missing.add(path);
