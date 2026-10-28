// Single list of every image, sound and font Infinite Dungeon uses.
// Nothing is copied: files are read where they already live, next to this game
// on GitHub Pages (../dragonbound2/ and ../dragonbound/). If Dragonbound II renames
// or deletes a file, tests/assets.test.js fails instead of the game breaking silently.
// Pure module: no DOM access, so Node tests can import it.
import { ANIM, POSEM } from '../data/sprite-metrics.js';
import { MONSTERS, BOSSES, ZONES, ZONE_MUSIC } from '../data/monsters.js';
import { HEROES } from '../data/heroes.js';
import { RELICS, CONSUMABLES, EVENTS, SYNERGIES } from '../data/items.js';
import { UPGRADES } from '../data/balance.js';
import { CURSES, ACHIEVEMENTS } from '../data/progress.js';

export const DB2 = '../dragonbound2/';
export const DB1 = '../dragonbound/';

// hero id -> sprite base used by Dragonbound II file names
export const HERO_SPRITE = Object.fromEntries(Object.entries(HEROES).map(([id, H]) => [id, H.sprite]));

const IMG = {};
const add = (key, dir) => { IMG[key] = `${dir}img/${key}.webp`; };

// heroes: animated frames + fixed poses + portraits + ultimate cut-ins
for (const [id, b] of Object.entries(HERO_SPRITE)) {
  add(`${b}-face`, DB2); add(b, DB2); add(`ult_${id}`, DB2);
  for (const pose of ['win', 'ko', 'hit']) add(`${b}_${pose}`, DB2);
  for (const [act, n] of Object.entries(ANIM[b] || {})) for (let i = 0; i < n; i++) add(`${b}A_${act}${i}`, DB2);
}
// monsters (Dragonbound 1) and the boss (Dragonbound II): every pose that has floor metrics
for (const [id, M] of [...Object.entries(MONSTERS), ...Object.entries(BOSSES)]) {
  const dir = M.dir === 'db2' || M.boss ? DB2 : DB1;
  for (const k of Object.keys(POSEM)) if (k === id || k.startsWith(id + '_')) add(k, dir);
}
// backgrounds
IMG.bg_title = `${DB2}img/bg_c7_1.webp`;
// level backgrounds: Dragonbound II (bg_c*) or, for one level, Dragonbound 1
export const bgDir = bg => (bg.startsWith('bg_c') ? DB2 : DB1);
for (const z of ZONES) for (const L of z.levels) add(L.bg, bgDir(L.bg));
// effects, gear, interface
for (const fx of ['fire', 'heal', 'ice', 'slash', 'ult']) add(`fx_${fx}`, DB2);
for (const hero of Object.keys(HEROES)) for (let r = 1; r <= 3; r++) add(`gw_${hero}_${r}`, DB2);
for (let i = 0; i <= 8; i++) { add(`ga_${i}`, DB2); add(`gj_${i}`, DB2); }
for (const k of ['uiGem', 'uiTrophy', 'uiSkull']) add(k, DB2);
for (const k of ['uiPotion', 'uiGold', 'uiScroll', 'uiDice', 'uiChest1', 'uiChest2', 'uiChest3', 'chestR1', 'chestR2', 'chestR3', 'chestR4']) add(k, DB1);
// original images of Infinite Dungeon (img/ of this folder)
for (const R of [...Object.values(RELICS), ...EVENTS, ...Object.values(UPGRADES), ...Object.values(SYNERGIES)]) if (R.art) IMG[R.art] = `img/${R.art}.webp`;
for (const E of EVENTS) if (E.scene && !IMG[E.scene]) throw new Error(`décor manquant pour l’événement ${E.id}: ${E.scene}`);
for (const k of ['room_rest', 'room_shop', 'camp_scene', 'bg_menu', 'door_cursed', 'chest_boss', 'scr_victory', 'scr_defeat', 'scr_checkpoint']) IMG[k] = `img/${k}.webp`;
// v0.5: Nightmare curses, trophies, daily objectives
for (const k of ['scr_trophies', 'scr_nightmare', 'nm_emblem', 'daily_quest', 'daily_chest', 'ach_mystery', ...Object.values(CURSES).map(c => c.art), ...ACHIEVEMENTS.map(a => a.art)]) IMG[k] = `img/${k}.webp`;
for (const R of [...Object.values(RELICS), ...Object.values(CONSUMABLES)]) if (!IMG[R.img]) throw new Error(`asset manquant pour ${R.name}: ${R.img}`);

export const IMAGES = IMG;

const snd = (k, dir = DB2) => `${dir}audio/${k}.mp3`;
export const AUDIO = {
  // original theme of Infinite Dungeon (audio/ of this folder): title, camp, trophies
  m_title: 'audio/m_id_theme.mp3',
  ...Object.fromEntries([...ZONE_MUSIC, 'm_boss', 'm_victory', 'm_defeat', 'm_theme'].map(k => [k, snd(k)])),
  ...Object.fromEntries([
    'ald_sword', 'ald_taunt', 'ald_bash', 'ald_whirl', 'sel_mace', 'sel_heal', 'sel_smite', 'sel_raise', 'ori_bolt', 'ori_fire', 'ori_ice',
    'lyr_arrow', 'lyr_aimed', 'lyr_venom', 'lyr_rain', 'nyx_dagger', 'nyx_blades', 'nyx_assassin', 'nyx_shadow',
    'crit', 'dodge', 'foe_die', 'hero_hurt', 'poison', 'burn', 'freeze', 'stun', 'aoe_warning', 'boss_phase', 'boss_roar',
    'ult', 'ult_cutin', 'levelup', 'coin', 'chest', 'equip', 'ui_click', 'enemy_shield', 'enemy_heal',
  ].map(k => [k, snd(k)])),
  s_impact: snd('s_impact', DB1),
  s_clang: snd('s_clang', DB1),
};

export const FONTS = {
  title: `${DB2}fonts/lilita-one.woff`,
  body: `${DB2}fonts/nunito.woff`,
};

// Every path, for preloading and tests.
export const allAssets = () => [
  ...Object.entries(IMAGES).map(([key, path]) => ({ kind: 'image', key, path })),
  ...Object.entries(AUDIO).map(([key, path]) => ({ kind: 'audio', key, path })),
  ...Object.entries(FONTS).map(([key, path]) => ({ kind: 'font', key, path })),
];

/** Image keys needed to draw a unit (all its poses). */
export const spriteKeys = base => Object.keys(IMAGES).filter(k => k === base || k.startsWith(base + '_') || k.startsWith(base + 'A_'));
