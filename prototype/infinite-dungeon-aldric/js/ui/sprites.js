// Draws Dragonbound II sprites standing on the floor, using the same metrics.
import { POSEM, ANIM } from '../data/visual-metrics.js';
import { getImage } from './loader.js';

// Keys of the animated frames of a hero action, e.g. heroFrames('ald', 'idle') -> ['aldA_idle0', …]
export const heroFrames = (base, action) =>
  Array.from({ length: (ANIM[base] || {})[action] || 0 }, (_, i) => `${base}A_${action}${i}`);

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
  const im = getImage(key), pm = POSEM[key];
  if (!im || !pm) return false;
  const hh = h * pm[0], w = hh * im.naturalWidth / im.naturalHeight;
  c.save();
  c.globalAlpha *= alpha;
  c.translate(x, y);
  if (flip) c.scale(-1, 1);
  // Trial KO pose: lay the same knight on the floor; never swap back to old art.
  if (key === 'ald_ko' || key.startsWith('aldA_ko')) {
    c.translate(-h * 0.4, -h * 0.15);
    c.rotate(Math.PI / 2);
    c.scale(0.72, 0.72);
  }
  c.drawImage(im, -w * pm[1], -hh, w, hh);
  c.restore();
  return true;
}
