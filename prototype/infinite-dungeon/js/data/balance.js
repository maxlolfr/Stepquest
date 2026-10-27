// Every tuning number of Infinite Dungeon in one place (tuned by tests/sim.test.js).

export const BAL = {
  floors: 10,
  guardianFloor: 5,
  bossFloor: 10,
  // monster scaling per floor (1..10)
  foeHp: f => 1.25 + 0.2 * (f - 1),
  foeAtk: f => 1.0 + 0.08 * (f - 1),
  foeDef: f => 1 + 0.06 * (f - 1),
  foeCount: (f, rng) => (f <= 1 ? 2 : f <= 3 ? rng.int(2, 3) : 3),
  elite: { hp: 1.7, atk: 1.2 },
  guardian: { hp: 1.5, atk: 0.95 },
  boss: { hp: 1.35, atk: 0.85 },
  maxRounds: 60,
  ultGainAct: 14, ultGainHit: 6, ultMax: 100,
  // rewards
  gold: { normal: [18, 28], elite: [45, 60], guardian: [70, 70], boss: [0, 0] },
  shards: { normal: 3, elite: 8, guardian: 15, boss: 40, victory: 20 },
  defeatKeep: 0.5,
  restHeal: 0.4,
  startGold: 40,
  startItems: { pot: 2, fea: 1 },
  rarityWeights: { normal: [[0, 70], [1, 25], [2, 5]], elite: [[0, 30], [1, 50], [2, 20]], chest: [[0, 25], [1, 50], [2, 25]] },
  shop: { gear: 70, relic: 110, upgrade: 60, heal: 35 },
};

// Camp upgrades, bought with shards, kept forever.
export const UPGRADES = {
  vie:     { name: 'Forge du camp', ic: '❤️', desc: lv => `Vie des héros +${8 * lv} %`, costs: [20, 45, 90] },
  or:      { name: 'Coffre de départ', ic: '💰', desc: lv => `+${30 * lv} or au départ`, costs: [15, 35, 70] },
  potion:  { name: 'Apothicaire', ic: '🧪', desc: lv => `+${lv} potion${lv > 1 ? 's' : ''} au départ`, costs: [15, 35, 70] },
  relance: { name: 'Oracle', ic: '🎲', desc: lv => `${lv} relance${lv > 1 ? 's' : ''} de récompense par expédition`, costs: [25, 50, 100] },
};
