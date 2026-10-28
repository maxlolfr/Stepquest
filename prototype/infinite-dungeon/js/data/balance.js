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
  // v0.6: after the knee (floor ~39) life grows slower and attack faster than in v0.5,
  // so late fights stay short and dangerous instead of long and harmless.
  // late(f) eases in from floor `from` to floor `to`: life is trimmed and attack lifted there.
  curve: { hp2: 1.03, atk2: 1.05, bossHp2: 1.03, bossAtk2: 1.05, from: 21, to: 45, hpTrim: 0.5, atkLift: 1.65, bossTrim: 0.6 },
  late: (f, v) => 1 + (v - 1) * Math.min(1, Math.max(0, (f - BAL.curve.from) / (BAL.curve.to - BAL.curve.from))),
  foeHp: f => 1.4 * climb(prog(f), 1.2, BAL.curve.hp2) * BAL.late(f, BAL.curve.hpTrim),
  foeAtk: f => 1.1 * climb(prog(f), 1.12, BAL.curve.atk2) * BAL.late(f, BAL.curve.atkLift),
  foeDef: f => 1,
  foeCount: (f, rng) => ((f - 1) % ZONE_SIZE < 2 ? 2 : rng.int(2, 3)),
  elite: { hp: 1.7, atk: 1.2 }, // zones 1-2 (unchanged)
  eliteLate: { hp: 2, atk: 1.5 }, // v0.6: reached by floor 45 (same easing as `late`): mid-tower elites are a real risk
  cursedHp: 1.2, // cursed doors: their two elites have 20 % more life
  cursedChance: 0.3, // per mixed floor
  boss: { hp: 1, atk: 1 },
  // bosses: their own stats (monsters.js) times a climb along the tower
  bossHp: f => 1.6 * climb(prog(f), 1.2, BAL.curve.bossHp2) * BAL.late(f, BAL.curve.hpTrim * BAL.curve.bossTrim),
  bossAtk: f => 0.9 * climb(prog(f), 1.12, BAL.curve.bossAtk2) * BAL.late(f, BAL.curve.atkLift),
  // v0.6: per-boss correction measured with tools/bench.mjs (1 = unchanged)
  // (Dragon and Morgane lighter: they were walls; zones 5-10 heavier: they had become easy once the
  // late curve shortened the fights). Bench targets: a steady decline from boss to boss.
  bossTune: {
    bossDragon: { hp: 0.8, atk: 0.8 }, bossHag: { hp: 1.1, atk: 1.05 }, bossQueen: { hp: 1.6, atk: 1.95 },
    bossVamp: { hp: 1.9, atk: 1.9 }, bossLich: { hp: 2.1, atk: 2.1 }, bossRat: { hp: 1.8, atk: 1.65 },
    bossVoid: { hp: 2.5, atk: 2.4 }, bossVort: { hp: 1.5, atk: 1.45 },
  },
  maxRounds: 60, // hard limit: explicit defeat (should almost never happen thanks to the enrage)
  // v0.6: warning at round 25, then enemies +10 % attack per round from round 30 and no more healing
  enrage: { warn: 25, from: 30, step: 0.1 },
  // enemy regeneration per turn (share of max life): stopped by burn, halved by poison, fades after round 8
  regen: { trait: 0.04, affix: 0.05, fadeFrom: 8, fade: 0.1 },
  ultGainAct: 14, ultGainHit: 6, ultMax: 100,
  healMult: 1.3, // Séléna's Soin (was 1.9 in v0.2)
  // v0.6: Aldric's sustain, so teams without Séléna hold (measured with tools/bench.mjs, all 10 teams)
  aldric: { taunt: 0.1, ult: 0.15 },
  // rewards (gold and shards grow with the zone: zoneMul)
  zoneMul: z => 1 + 0.2 * z, // shards
  goldMul: z => 1 + 0.15 * z,
  gold: { normal: [16, 24], elite: [30, 40], cursed: [50, 60], boss: [60, 60] },
  // v0.4.1: relics are rarer, so a run builds 1-2 styles instead of collecting everything
  relicWeight: { normal: 0.35, elite: 1.2, chest: 1.2 },
  relicMax: 10, // v0.6: relic slots per expedition (null = no limit). 10 vs 8 vs 6 compared with tools/bench.mjs: 10 keeps most of the variety with fewer broken synergies
  shards: { normal: 1, elite: 3, cursed: 5, boss: 10, victory: 100 },
  defeatKeep: 0.5,
  restHeal: 0.4,
  afterFightHeal: 0.1, // every standing hero after a victory
  startGold: 40,
  startItems: { pot: 2, fea: 1 },
  // bonus when starting from a checkpoint (k = number of zones skipped)
  startBonus: k => ({ gold: 60 * k, pot: k, stat: 0.08 * k, gearFloor: 18 * k, lv: 1 + 8 * k, relics: Math.min(4, k) }),
  rarityWeights: { normal: [[0, 70], [1, 25], [2, 5]], elite: [[0, 30], [1, 50], [2, 20]], chest: [[0, 25], [1, 50], [2, 25]] },
  shop: { gear: 70, relic: 180, upgrade: 60, heal: 35, bless: 120, blessUp: 1.5 }, // bless: repeatable team boost, ×1.5 per purchase
  shopMul: z => 1 + 0.15 * z,
};

// Hero levels inside an expedition (shared by the team): XP from each fight won.
export const XP = {
  gain: { normal: 8, elite: 8, cursed: 16, boss: 25 }, // v0.6 (was 5 / 11): an elite no longer gives more XP, only better loot for more risk
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
