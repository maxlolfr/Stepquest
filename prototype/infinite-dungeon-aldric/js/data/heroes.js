// Heroes of Infinite Dungeon. Names, roles, passives, skill and ultimate names
// and effects come from Dragonbound II 1.9.11 (HEROES and SK). Adaptations for
// automatic combat, documented here rather than hidden:
//  - 2 existing skills per hero instead of 3-4, on cooldowns instead of mana;
//  - stats = Dragonbound II base + growth per level (gr). Level 1 here = Dragonbound II level 8;
//    heroes gain levels during an expedition (XP from fights), see heroStats() in run/run.js;
//  - spd (turn order) is new: Dragonbound II had no speed stat.

const lvl = (base, gr, n = 7) => Object.fromEntries(Object.keys(gr).map(k => [k, Math.round(base[k] + gr[k] * n)]));
// stats at level 1 + growth per level
const S = (base, gr, extra) => ({ ...lvl(base, gr), ...extra, gr });

export const HEROES = {
  aldric: {
    name: 'Aldric', cls: 'Chevalier', role: 'tank', roleN: 'Tank', sprite: 'ald', melee: true, el: 'phys',
    stats: S({ hp: 140, atk: 15, mag: 4, def: 9 }, { hp: 15, atk: 2.2, mag: 0.4, def: 1.5 }, { crit: 0.06, spd: 10 }),
    basic: { name: 'Coup d’épée', sfx: 'ald_sword', fx: 'slash' },
    skills: ['taunt', 'bash'],
    passive: { name: 'Rage', desc: 'Chaque coup reçu donne 1 Rage 🔥 (max 5) : +15 % de dégâts par Rage sur son attaque suivante.' },
    ult: { name: 'Lame de l’Aube', desc: 'Frappe tous les ennemis avec une lame de lumière, les provoque 2 tours, et sa lumière soigne l’équipe de 15 %.' },
  },
  selena: {
    name: 'Séléna', cls: 'Paladine', role: 'heal', roleN: 'Soigneuse', sprite: 'sel', melee: true, el: 'phys',
    stats: S({ hp: 108, atk: 11, mag: 12, def: 7 }, { hp: 12, atk: 1.6, mag: 1.8, def: 1.1 }, { crit: 0.05, spd: 9 }),
    basic: { name: 'Coup de masse', sfx: 'sel_mace', fx: 'slash' },
    skills: ['heal', 'smite'],
    passive: { name: 'Protection', desc: 'Le soin en trop devient un bouclier 💠. Une fois par combat, retient un allié au bord de la mort.' },
    ult: { name: 'Lumière divine', desc: 'Soigne toute l’équipe de 30 % et relève les alliés tombés.' },
  },
  orin: {
    name: 'Orin', cls: 'Mage', role: 'dps', roleN: 'Mage', sprite: 'ori', melee: false, el: 'phys',
    stats: S({ hp: 78, atk: 6, mag: 16, def: 3 }, { hp: 8, atk: 0.8, mag: 2.6, def: 0.7 }, { crit: 0.05, spd: 11 }),
    basic: { name: 'Bâton', sfx: 'ori_bolt', fx: 'slash' },
    skills: ['fire', 'blizzard'],
    passive: { name: 'Surcharge', desc: 'Chaque sort charge sa magie ⚡. À 3 charges, le sort suivant fait +50 % de dégâts.' },
    ult: { name: 'Pluie de météores', desc: '6 météores de feu s’abattent sur les ennemis.' },
  },
  lyra: {
    name: 'Lyra', cls: 'Archère', role: 'ranged', roleN: 'Archère', sprite: 'lyr', melee: false, el: 'phys',
    stats: S({ hp: 88, atk: 15, mag: 6, def: 4 }, { hp: 9, atk: 2.3, mag: 0.6, def: 0.8 }, { crit: 0.1, spd: 13 }),
    basic: { name: 'Tir', sfx: 'lyr_arrow', fx: 'slash' },
    skills: ['aimed', 'venom'],
    passive: { name: 'Marque', desc: 'Ses tirs marquent 🎯 la cible : toute l’équipe la frappe 20 % plus fort, et elle frappe 12 % moins fort.' },
    ult: { name: 'Tempête de flèches', desc: '9 flèches, souvent critiques, sur les ennemis.' },
  },
  nyx: {
    name: 'Nyx', cls: 'Voleuse', role: 'crit', roleN: 'Assassin', sprite: 'nyx', melee: true, el: 'phys',
    stats: S({ hp: 92, atk: 16, mag: 5, def: 5 }, { hp: 10, atk: 2.4, mag: 0.5, def: 0.9 }, { crit: 0.2, spd: 14 }),
    basic: { name: 'Coup de dague', sfx: 'nyx_dagger', fx: 'slash' },
    skills: ['blades', 'assassin'],
    passive: { name: 'Marques d’ombre', desc: 'Chaque coup laisse une marque d’ombre 🌑 (max 3). L’Assassinat les consomme.' },
    ult: { name: 'Mille lames', desc: '6 coups critiques d’affilée sur un seul ennemi.' },
  },
};

export const HERO_ORDER = ['aldric', 'selena', 'orin', 'lyra', 'nyx'];

// cd = turns between two uses; pow = damage factor; stat = atk or mag
export const SKILLS = {
  taunt:    { hero: 'aldric', name: 'Provocation', ic: '🛡️', cd: 4, tgt: 'self', sfx: 'ald_taunt', desc: 'Tous les ennemis l’attaquent 2 tours, et il encaisse 20 % de dégâts en moins. Il récupère 10 % de sa vie. +2 Rage.' },
  bash:     { hero: 'aldric', name: 'Charge', ic: '💥', cd: 3, tgt: 'foe', pow: 1.05, stat: 'atk', sfx: 'ald_bash', desc: 'Coup de bouclier : étourdit la cible un tour et annule l’attaque qu’elle prépare.' },
  heal:     { hero: 'selena', name: 'Soin', ic: '💚', cd: 2, tgt: 'ally', pow: 1.6, stat: 'mag', sfx: 'sel_heal', desc: 'Rend beaucoup de vie à l’allié le plus blessé et guérit poison et brûlure.' },
  smite:    { hero: 'selena', name: 'Châtiment', ic: '⚡', cd: 3, tgt: 'foe', pow: 1.4, stat: 'mag', el: 'foudre', sfx: 'sel_smite', desc: 'La foudre frappe un ennemi et soigne un peu toute l’équipe.' },
  fire:     { hero: 'orin', name: 'Feu', ic: '🔥', cd: 2, tgt: 'foe', pow: 1.9, stat: 'mag', el: 'feu', sfx: 'ori_fire', fx: 'fire', desc: 'Gros dégâts de feu, peut enflammer (30 %).' },
  blizzard: { hero: 'orin', name: 'Blizzard', ic: '❄️', cd: 3, tgt: 'foes', pow: 0.85, stat: 'mag', el: 'glace', sfx: 'ori_ice', fx: 'ice', desc: 'Glace tous les ennemis, peut les geler un tour (25 %), et couvre l’équipe d’une barrière de givre 💠 (9 % de vie, 20 % au plus).' },
  aimed:    { hero: 'lyra', name: 'Tir visé', ic: '🏹', cd: 3, tgt: 'foe', pow: 1.3, stat: 'atk', sfx: 'lyr_aimed', desc: 'Toujours un coup critique, et marque 🎯 la cible 3 tours. Interrompt l’attaque qu’un monstre prépare (pas un boss).' },
  venom:    { hero: 'lyra', name: 'Venin', ic: '🧪', cd: 3, tgt: 'foe', pow: 0.7, stat: 'atk', el: 'poison', sfx: 'lyr_venom', desc: 'Empoisonne un ennemi 3 tours. Le poison s’accumule.' },
  blades:   { hero: 'nyx', name: 'Lames', ic: '🗡️', cd: 3, tgt: 'foes', pow: 0.55, hits: 4, stat: 'atk', sfx: 'nyx_blades', desc: '4 dagues sur des ennemis au hasard, puis Nyx se fond dans l’ombre : 40 % d’esquive pendant 2 tours.' },
  assassin: { hero: 'nyx', name: 'Assassinat', ic: '💀', cd: 3, tgt: 'foe', pow: 1.1, stat: 'atk', sfx: 'nyx_assassin', desc: 'Consomme les marques d’ombre (+30 % chacune). Dégâts ×3 sur un ennemi sous 35 % de vie (60 % avec des marques).' },
};

export const ULT_SFX = { aldric: 'ald_whirl', selena: 'sel_raise', orin: 'ori_fire', lyra: 'lyr_rain', nyx: 'nyx_shadow' };
