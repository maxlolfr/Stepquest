// Permanent progression: shards (éclats) and camp upgrades, kept between expeditions.
import { UPGRADES, BAL } from '../data/balance.js';
import { ACHIEVEMENTS, dailyFor, dailyDone, dayKey, NIGHTMARE_UNLOCK } from '../data/progress.js';
import { RELICS } from '../data/items.js';
import { HEROES } from '../data/heroes.js';
import { BOSSES } from '../data/monsters.js';

export const newMeta = () => ({
  shards: 0,
  unlocked: 1, // highest checkpoint start floor (1, 11, 21, 31, 41)
  upgrades: { vie: 0, force: 0, garde: 0, ecole: 0, or: 0, potion: 0, relance: 0 },
  stats: { runs: 0, wins: 0, retreats: 0, defeats: 0, bestFloor: 0, shardsEarned: 0 },
  // v0.5 journal
  relicsSeen: [], bossesBeaten: [], heroBest: {}, ach: [], daily: { day: '', done: [] }, dailyCount: 0, nmBest: 0,
});

/**
 * After an expedition: journal, daily objectives and achievements. Mutates meta
 * (shards included) and returns what was newly earned, for the results screen.
 */
export function recordRun(meta, s, day = dayKey()) {
  const out = { dailies: [], achievements: [], shards: 0 };
  for (const k of s.relics || []) if (RELICS[k] && !meta.relicsSeen.includes(k)) meta.relicsSeen.push(k);
  for (const b of s.bossIds || []) if (BOSSES[b] && !meta.bossesBeaten.includes(b)) meta.bossesBeaten.push(b);
  for (const h of s.team || []) meta.heroBest[h] = Math.max(meta.heroBest[h] || 0, s.floor);
  if (s.bosses >= 1) meta.nmBest = Math.max(meta.nmBest, (s.curses || []).length);
  if (meta.daily.day !== day) meta.daily = { day, done: [] };
  for (const o of dailyFor(day, { nightmare: (meta.unlocked || 1) >= NIGHTMARE_UNLOCK })) {
    if (meta.daily.done.includes(o.key) || !dailyDone(o, s)) continue;
    meta.daily.done.push(o.key); meta.dailyCount++;
    meta.shards += o.reward; out.shards += o.reward; out.dailies.push(o);
  }
  for (const a of ACHIEVEMENTS) {
    if (meta.ach.includes(a.id) || !a.ok(meta, s)) continue;
    meta.ach.push(a.id); meta.shards += a.reward; out.shards += a.reward; out.achievements.push(a);
  }
  meta.stats.shardsEarned += out.shards;
  return out;
}

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
  base.unlocked = BAL.startFloors.includes(m.unlocked) ? m.unlocked : 1;
  for (const k of Object.keys(base.upgrades)) base.upgrades[k] = Math.min(UPGRADES[k].costs.length, num(m.upgrades && m.upgrades[k]));
  for (const k of Object.keys(base.stats)) base.stats[k] = num(m.stats && m.stats[k]);
  const list = (v, ok) => (Array.isArray(v) ? [...new Set(v.filter(ok))] : []);
  base.relicsSeen = list(m.relicsSeen, k => !!RELICS[k]);
  base.bossesBeaten = list(m.bossesBeaten, k => !!BOSSES[k]);
  base.ach = list(m.ach, k => typeof k === 'string');
  for (const h of Object.keys(HEROES)) if (m.heroBest && num(m.heroBest[h])) base.heroBest[h] = num(m.heroBest[h]);
  if (m.daily && typeof m.daily.day === 'string') base.daily = { day: m.daily.day, done: list(m.daily.done, k => typeof k === 'string') };
  base.dailyCount = num(m.dailyCount); base.nmBest = num(m.nmBest);
  return base;
}
