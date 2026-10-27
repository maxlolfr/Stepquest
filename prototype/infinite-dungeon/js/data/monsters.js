// The Tower: 100 floors in 10 zones of 10 floors = the 10 chapters of Dragonbound II;
// each chapter's 5 levels (names and backgrounds) are used for two floors each.
// Monster names, base stats, traits, weaknesses (w) and resistances (r), level
// names and backgrounds come from Dragonbound II (generated file db2-data.js).
// Floor scaling is applied in balance.js. Boss stats and mechanics are this
// game's own (Dragonbound II bosses were tuned for another progression), but
// each keeps the identity described in Dragonbound II.
import { DB2_MON, DB2_CHAPTERS, DB2_LEVELS } from './db2-data.js';

// Regular monsters (4 per chapter, in Dragonbound II order)
const REGULAR = Object.keys(DB2_MON).filter(k => !DB2_MON[k].boss);
export const MONSTERS = {};
for (const k of REGULAR) MONSTERS[k] = { ...DB2_MON[k], trait: DB2_MON[k].trait || '', w: DB2_MON[k].w || [], r: DB2_MON[k].r || [] };

// Bosses: one telegraphed special attack (announced a turn before; answer =
// Guard, or Aldric's Charge which interrupts it) and one change at half life.
//   special: { name, target: 'all' | 'one', mult, status?, chance? }
//   phase:   { kind, text, ... }  kinds: wall, thorns, enrage, regen, summonShield, rise, intangible, double
const B = (id, stats, special, phase, tip) => ({ ...DB2_MON[id], ...stats, boss: true, dir: 'db2', special, phase, tip });
export const BOSSES = {
  bossBone: B('bossBone', { hp: 1000, atk: 43, def: 10 },
    { name: 'Faux macabre', target: 'all', mult: 1.5 },
    { kind: 'wall', pct: 0.25, weak: 'feu', summon: ['skel', 'skel'], text: 's’entoure d’une muraille d’os ! Le feu la brise deux fois plus vite.' },
    'Prépare une Faux macabre sur toute l’équipe : Garde, ou Charge d’Aldric pour l’interrompre. À mi-vie : muraille d’os (le feu la brise ×2) et 2 squelettes.'),
  bossWitch: B('bossWitch', { hp: 1080, atk: 44, def: 11 },
    { name: 'Jugement des ronces', target: 'all', mult: 1.15, status: 'poison', chance: 1 },
    { kind: 'thorns', pct: 0.35, text: 'se couvre de ronces : les coups au corps à corps sont renvoyés !' },
    'Empoisonne toute l’équipe avec le Jugement des ronces. À mi-vie, ses ronces renvoient 35 % des coups au corps à corps : misez sur la magie et les flèches.'),
  bossDragon: B('bossDragon', { hp: 1050, atk: 50, def: 12, h: 0.52 },
    { name: 'Souffle de feu', target: 'all', mult: 1.35, status: 'burn', chance: 0.6 },
    { kind: 'enrage', atkMul: 1.3, text: 'rugit de fureur : ses attaques deviennent bien plus fortes !' },
    'Son Souffle de feu brûle l’équipe. À mi-vie, il enrage (+30 % d’attaque) : finissez-le vite.'),
  bossHag: B('bossHag', { hp: 1150, atk: 45, def: 12 },
    { name: 'Chaudron toxique', target: 'all', mult: 1.1, status: 'poison', chance: 1 },
    { kind: 'regen', pct: 0.03, text: 'puise dans le marais : elle se soigne à chaque tour… sauf si elle brûle !' },
    'Son chaudron empoisonne l’équipe. À mi-vie, elle se soigne de 3 % à chaque tour, sauf si elle brûle 🔥.'),
  bossQueen: B('bossQueen', { hp: 1100, atk: 47, def: 13 },
    { name: 'Blizzard royal', target: 'all', mult: 1.25, status: 'freeze', chance: 0.3 },
    { kind: 'wall', pct: 0.22, weak: 'feu', text: 'se couvre d’une armure de givre ! Le feu la fait fondre deux fois plus vite.' },
    'Son Blizzard royal peut geler vos héros. À mi-vie, armure de givre : le feu la fait fondre ×2.'),
  bossVamp: B('bossVamp', { hp: 1150, atk: 48, def: 12, trait: 'drain' },
    { name: 'Nuée de sang', target: 'all', mult: 1.25 },
    { kind: 'summonShield', summon: ['vbat', 'vbat'], taken: 0.4, text: 'appelle ses chauves-souris : tant qu’elles vivent, il ne prend presque aucun dégât !' },
    'Se soigne en mordant. À mi-vie, ses chauves-souris le protègent : abattez-les d’abord.'),
  bossLich: B('bossLich', { hp: 1100, atk: 50, def: 13 },
    { name: 'Rayon glacial', target: 'one', mult: 2.2, status: 'freeze', chance: 1 },
    { kind: 'rise', text: 'se relève grâce à son phylactère !' },
    'Son Rayon glacial gèle un héros. Son phylactère le ramène une fois à la vie avec la moitié de ses PV… sauf s’il brûle 🔥 au moment de tomber.'),
  bossRat: B('bossRat', { hp: 1200, atk: 47, def: 12 },
    { name: 'Morsure pestilente', target: 'one', mult: 2, status: 'poison', chance: 1 },
    { kind: 'summonShield', summon: ['prat', 'prat'], taken: 0.4, text: 'appelle ses rats : tant qu’un rat vit, elle ne prend presque aucun dégât !' },
    'Sa morsure empoisonne. À mi-vie, ses rats la protègent : tuez les rats d’abord.'),
  bossVoid: B('bossVoid', { hp: 1150, atk: 52, def: 14 },
    { name: 'Rayon du Néant', target: 'one', mult: 2.4 },
    { kind: 'intangible', text: 'devient intangible un tour sur deux : seule la magie le touche vraiment !' },
    'Son Rayon du Néant vise un héros. À mi-vie, un tour sur deux il devient intangible : les attaques physiques ne font presque rien.'),
  bossVort: B('bossVort', { hp: 1400, atk: 55, def: 15 },
    { name: 'Souffle du Dragon-Roi', target: 'all', mult: 1.45, status: 'burn', chance: 0.7 },
    { kind: 'double', text: 'brise une chaîne : il agit désormais deux fois par tour !' },
    'Le Dragon-Roi. Son souffle brûle toute l’équipe. À mi-vie, une chaîne cède : il agit deux fois par tour.'),
};

export const ZONE_SIZE = 10;
export const ZONE_MUSIC = ['m_crypt', 'm_forest', 'm_mines', 'm_swamp', 'm_ice', 'm_vampire', 'm_necro', 'm_sewers', 'm_void', 'm_vorthax'];

// 10 zones: 4 monsters of the chapter, 10 floors; floors 2k-1 and 2k share level k.
export const ZONES = DB2_CHAPTERS.map((c, z) => ({
  index: z,
  name: c.name,
  boss: c.boss,
  pool: REGULAR.slice(z * 4, z * 4 + 4),
  floors: Array.from({ length: ZONE_SIZE }, (_, k) => z * ZONE_SIZE + k + 1),
  levels: DB2_LEVELS.filter(l => l.ch === z),
  music: ZONE_MUSIC[z],
}));
export const TOWER_FLOORS = ZONES.length * ZONE_SIZE;
export const zoneOf = floor => ZONES[Math.min(ZONES.length - 1, Math.max(0, Math.floor((floor - 1) / ZONE_SIZE)))];
export const levelOf = floor => { const z = zoneOf(floor); return z.levels[Math.floor(((floor - 1) % ZONE_SIZE) / 2)] || z.levels[0]; };

// Elite affixes (Dragonbound II AFFIX). col = tint around the sprite.
export const AFFIXES = {
  enrage: { n: 'enragé', col: '255,70,50', tip: 'frappe plus fort quand il est blessé' },
  thorns: { n: 'épineux', col: '90,230,90', tip: 'renvoie 25 % des coups au corps à corps', ok: m => !m.fly },
  ghost:  { n: 'spectral', col: '120,170,255', tip: 'esquive un coup sur quatre' },
  gold:   { n: 'doré', col: '255,205,60', tip: 'rapporte le double d’or' },
  regen:  { n: 'régénérant', col: '120,255,170', tip: 'récupère 10 % de vie à chaque tour', ok: m => m.trait !== 'regen' },
  vamp:   { n: 'vampirique', col: '200,40,90', tip: 'se soigne de la moitié des dégâts qu’il inflige', ok: m => m.trait !== 'drain' },
  armor:  { n: 'blindé', col: '170,190,210', tip: 'protégé par un bouclier de 30 % de sa vie', ok: m => !m.fly },
  bomb:   { n: 'explosif', col: '255,140,30', tip: 'explose à sa mort : 15 % de dégâts à toute l’équipe' },
};
export const affixesFor = m => Object.keys(AFFIXES).filter(k => !AFFIXES[k].ok || AFFIXES[k].ok(m));

export const ELEMENTS = { phys: '⚔️', feu: '🔥', glace: '❄️', poison: '☠️', foudre: '⚡' };
export const ELEMENT_NAMES = { phys: 'Physique', feu: 'Feu', glace: 'Glace', poison: 'Poison', foudre: 'Foudre' };

/** Monster or boss definition by id. */
export const unitDef = id => BOSSES[id] || MONSTERS[id];
