// Seeded random numbers: the same seed always gives the same dungeon and the
// same fights. Never use Math.random in game rules (only in visual effects).

export function hashSeed(...parts) {
  let h = 2166136261 >>> 0;
  for (const p of parts) {
    const s = String(p);
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    h ^= 0x9e3779b9; h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
  }
  return h >>> 0;
}

/** mulberry32 generator with a serialisable state. */
export function makeRng(seed) {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng = {
    next,
    range: (a, b) => a + next() * (b - a),
    int: (a, b) => a + Math.floor(next() * (b - a + 1)), // inclusive
    chance: p => next() < p,
    pick: arr => arr[Math.floor(next() * arr.length)],
    shuffle: arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
    weighted: entries => { // [[value, weight], …]
      const total = entries.reduce((n, [, w]) => n + w, 0); let r = next() * total;
      for (const [v, w] of entries) { if ((r -= w) < 0) return v; }
      return entries[entries.length - 1][0];
    },
    get state() { return s; },
  };
  return rng;
}

export const newSeed = () => (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
