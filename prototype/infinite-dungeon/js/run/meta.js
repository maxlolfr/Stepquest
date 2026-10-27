// Permanent progression: shards (éclats) and camp upgrades, kept between expeditions.
import { UPGRADES } from '../data/balance.js';

export const newMeta = () => ({
  shards: 0,
  upgrades: { vie: 0, or: 0, potion: 0, relance: 0 },
  stats: { runs: 0, wins: 0, retreats: 0, defeats: 0, bestFloor: 0, shardsEarned: 0 },
});

export const upgradeCost = (meta, key) => {
  const lv = meta.upgrades[key] || 0, c = UPGRADES[key].costs;
  return lv >= c.length ? null : c[lv];
};

export function buyUpgrade(meta, key) {
  const cost = upgradeCost(meta, key);
  if (cost == null || meta.shards < cost) return false;
  meta.shards -= cost;
  meta.upgrades[key] = (meta.upgrades[key] || 0) + 1;
  return true;
}

/** Repairs a meta object read from storage (missing fields, wrong types). */
export function sanitizeMeta(m) {
  const base = newMeta();
  if (!m || typeof m !== 'object') return base;
  const num = (v, d = 0) => (Number.isFinite(v) && v >= 0 ? Math.floor(v) : d);
  base.shards = num(m.shards);
  for (const k of Object.keys(base.upgrades)) base.upgrades[k] = Math.min(UPGRADES[k].costs.length, num(m.upgrades && m.upgrades[k]));
  for (const k of Object.keys(base.stats)) base.stats[k] = num(m.stats && m.stats[k]);
  return base;
}
