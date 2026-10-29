// Draws Dragonbound II sprites standing on the floor, using the same metrics.
import { POSEM, ANIM } from '../data/sprite-metrics.js';
import { getImage } from './loader.js';

// Keys of the animated frames of a hero action, e.g. heroFrames('ald', 'idle') -> ['aldA_idle0', …]
export const heroFrames = (base, action) => {
  // v0.8: opt-in Aldric animation; old sprites remain the fallback.
  if (base === 'ald' && new URLSearchParams(location.search).has('aldric08') && (action === 'idle' || action === 'atk')) {
    return Array.from({ length: action === 'idle' ? 6 : 4 }, (_, i) => `ald_v08_${action}${i}`);
  }
  return Array.from({ length: (ANIM[base] || {})[action] || 0 }, (_, i) => `${base}A_${action}${i}`);
};

// Ping-pong frame index so idle loops breathe instead of snapping back.
export function pingPong(n, t, ms) {
  if (n <= 1) return 0;
  const period = 2 * n - 2, k = Math.floor(t / ms) % period;
  return k < n ? k : period - k;
}

/**
 * Draws image `key` with its feet at (x, y). h = reference height in px (a hero
 * is about h tall). flip mirrors it horizontally.
 */
export function drawSprite(c, key, x, y, h, { flip = false, alpha = 1 } = {}) {
  const im = getImage(key), pm = POSEM[key] || (key.startsWith('ald_v08_') ? [1, 0.5] : null);
  if (!im || !pm) return false;
  const hh = h * pm[0], w = hh * im.naturalWidth / im.naturalHeight;
  c.save();
  c.globalAlpha *= alpha;
  c.translate(x, y);
  if (flip) c.scale(-1, 1);
  c.drawImage(im, -w * pm[1], -hh, w, hh);
  c.restore();
  return true;
}
