// Every tuning number of Infinite Dungeon in one place (tuned with tools/simulate.mjs).

import { ZONE_SIZE, TOWER_FLOORS } from './monsters.js';

// Scaling follows the progress through the zones: floor 10 (first boss) = step 5.5,
// floor 100 = step 50.5, so a zone of 10 floors climbs like 5 steps.
export const prog = f => 1 + (f - 1) / 2;

// Growth along the tower: rate r1 per floor up to floor 20, then r2 (heroes
// grow fast early with cards and gear, then mostly with levels and the camp).
export const climb = (f, r1, r2, knee = 20) => r1 ** (Math.min(f, knee) - 1) * r2 ** Math.max(0, f - knee);

// The Tower: 10 zones of 10 floors. Floor 10 of each zone is its boss.
export const BAL = {
  floors: TOWER_FLOORS,
  zoneSize: ZONE_SIZE,
  startFloors: [1, 11, 21, 31, 41, 51, 61, 71, 81, 91], // checkpoints, unlocked by beating the boss just before
  // Monster base stats already grow zone after zone (Dragonbound II values);
  // these multipliers follow the heroes' growth (levels, gear, cards, relics).
  foeHp: f => 1.4 * climb(prog(f), 1.18, 1.063),
  foeAtk: f => 1.1 * climb(prog(f), 1.105, 1.043),
  foeDef: f => 1,
  foeCount: (f, rng) => ((f - 1) % ZONE_SIZE < 2 ? 2 : rng.int(2, 3)),
  elite: { hp: 1.7, atk: 1.2 },
  cursedHp: 1.2, // cursed doors: their two elites have 20 % more life
  cursedChance: 0.22, // per mixed floor
  boss: { hp: 1, atk: 1 },
  // bosses: their own stats (monsters.js) times a climb along the tower
  bossHp: f => 1.6 * climb(prog(f), 1.18, 1.063),
  bossAtk: f => 0.9 * climb(prog(f), 1.105, 1.043),
  maxRounds: 60,
  ultGainAct: 14, ultGainHit: 6, ultMax: 100,
  healMult: 1.3, // Séléna's Soin (was 1.9 in v0.2)
  // rewards (gold and shards grow with the zone: zoneMul)
  zoneMul: z => 1 + 0.2 * z, // shards
  goldMul: z => 1 + 0.15 * z,
  gold: { normal: [18, 28], elite: [45, 60], cursed: [70, 90], boss: [80, 80] },
  shards: { normal: 1, elite: 3, cursed: 5, boss: 10, victory: 100 },
  defeatKeep: 0.5,
  restHeal: 0.4,
  afterFightHeal: 0.1, // every standing hero after a victory
  startGold: 40,
  startItems: { pot: 2, fea: 1 },
  // bonus when starting from a checkpoint (k = number of zones skipped)
  startBonus: k => ({ gold: 60 * k, pot: k, stat: 0.08 * k, gearFloor: 18 * k, lv: 1 + 8 * k, relics: Math.min(4, k) }),
  rarityWeights: { normal: [[0, 70], [1, 25], [2, 5]], elite: [[0, 30], [1, 50], [2, 20]], chest: [[0, 25], [1, 50], [2, 25]] },
  shop: { gear: 70, relic: 110, upgrade: 60, heal: 35 },
  shopMul: z => 1 + 0.15 * z,
};

// Hero levels inside an expedition (shared by the team): XP from each fight won.
export const XP = {
  gain: { normal: 5, elite: 11, cursed: 16, boss: 25 }, // a zone has ~2× more fights than in v0.3.0
  need: lv => Math.round(10 + 0.6 * lv), // XP from level lv to lv+1
  max: 80,
};

// Camp upgrades, bought with shards, kept forever. Costs grow ×1.4 per level.
const costs = (first, n) => Array.from({ length: n }, (_, i) => Math.round(first * 1.4 ** i / 5) * 5);
export const UPGRADES = {
  vie:     { name: 'Forge du camp', ic: '❤️', art: 'camp_vie', desc: lv => `Vie des héros +${6 * lv} %`, costs: costs(20, 10) },
  force:   { name: 'Armurerie', ic: '⚔️', art: 'camp_force', desc: lv => `Attaque et magie +${5 * lv} %`, costs: costs(25, 10) },
  garde:   { name: 'Bastion', ic: '🛡️', art: 'camp_garde', desc: lv => `Défense +${6 * lv} %`, costs: costs(20, 10) },
  ecole:   { name: 'Salle d’entraînement', ic: '📖', art: 'camp_ecole', desc: lv => `Les héros partent au niveau ${1 + 2 * lv}`, costs: costs(30, 10) },
  or:      { name: 'Coffre de départ', ic: '💰', art: 'camp_or', desc: lv => `+${30 * lv} or au départ`, costs: costs(15, 8) },
  potion:  { name: 'Apothicaire', ic: '🧪', art: 'camp_potion', desc: lv => `+${lv} potion${lv > 1 ? 's' : ''} au départ`, costs: costs(15, 5) },
  relance: { name: 'Oracle', ic: '🎲', art: 'camp_relance', desc: lv => `${lv} relance${lv > 1 ? 's' : ''} de récompense par expédition`, costs: costs(25, 5) },
};
