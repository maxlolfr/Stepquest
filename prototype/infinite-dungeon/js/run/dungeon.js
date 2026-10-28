// Generates the 100 floors of the Tower from a seed. Each floor offers 1-3 doors;
// picking one is the player's path. Rules (checked by tests/run.test.js), per zone of 10 floors:
//  - 1st floor: two normal fights and an event or a chest
//  - 5th floor: rest and shop; 9th floor: rest and shop (from zone 2, sometimes an elite too)
//  - other floors: 3 doors, always including a normal fight, so an elite is never forced
//  - 10th floor: the zone boss
//  - elites from floor 3, cursed doors (never forced) from floor 4; same seed = same tower, monsters included
import { makeRng, hashSeed } from '../core/rng.js';
import { BAL } from '../data/balance.js';
import { zoneOf, levelOf, affixesFor, MONSTERS, BOSSES } from '../data/monsters.js';

export const DOOR_INFO = {
  fight: { name: 'Combat', ic: '⚔️', img: 'uiDice', desc: 'Des monstres gardent le passage.' },
  elite: { name: 'Élite', ic: '💀', img: 'uiSkull', desc: 'Un ennemi d’élite : plus dur, meilleur butin.' },
  chest: { name: 'Coffre', ic: '🎁', img: 'chestR2', desc: 'Un équipement ou une relique, sans combat.' },
  rest:  { name: 'Repos', ic: '🔥', img: 'door_rest', desc: 'Soigner l’équipe ou s’entraîner. Retraite possible.' },
  shop:  { name: 'Marchand', ic: '💰', img: 'uiGold', desc: 'Potions, équipement et reliques contre de l’or.' },
  event: { name: 'Événement', ic: '❓', img: 'uiScroll', desc: 'Une rencontre étrange, un choix à faire.' },
  boss:  { name: 'Boss', ic: '👑', img: 'uiTrophy', desc: 'Le maître de la zone. Après lui, tes éclats sont à l’abri.' },
  cursed: { name: 'Porte maudite', ic: '⛓️', img: 'door_cursed', desc: 'Des élites renforcés. Si tu survis : 1 relique au choix parmi 3.' },
};

// What each door promises (shown on the map) and how dangerous it is (0-3 skulls)
export const DOOR_REWARD = {
  fight: '3 cartes · or', elite: 'Carte rare · relique fréquente · plus d’or', cursed: '1 relique au choix parmi 3 · or ×3',
  chest: 'Équipement ou relique, sans combat', rest: 'Soigner ou s’entraîner', shop: 'Achats contre de l’or',
  event: 'Un choix, avec un risque', boss: '1 relique au choix parmi 3 · éclats à l’abri',
};
export function doorDanger(d) {
  if (d.type === 'boss' || d.type === 'cursed') return 3;
  if (d.type === 'elite') return 2;
  if (d.type === 'fight') return d.foes.length >= 3 ? 2 : 1;
  return d.type === 'event' ? 1 : 0;
}
export const doorName = (d, floor) => (d.type === 'boss' ? BOSSES[zoneOf(floor).boss].name : DOOR_INFO[d.type].name);

const FIGHTS = new Set(['fight', 'elite', 'boss', 'cursed']);
export const isFight = type => FIGHTS.has(type);
export const isBossFloor = floor => floor % BAL.zoneSize === 0;

function foesFor(type, floor, rng) {
  const z = zoneOf(floor), pool = z.pool;
  const mul = { hpMul: BAL.foeHp(floor), atkMul: BAL.foeAtk(floor), defMul: BAL.foeDef(floor) };
  if (type === 'boss') { const T = BAL.bossTune[z.boss] || {}; return [{ id: z.boss, boss: true, hpMul: BAL.bossHp(floor) * (T.hp || 1), atkMul: BAL.bossAtk(floor) * (T.atk || 1), defMul: 1 }]; }
  const n = BAL.foeCount(floor, rng), out = [];
  for (let i = 0; i < n; i++) out.push({ id: rng.pick(pool), ...mul });
  // v0.6: elites get tougher along the tower (BAL.elite at floor 21, BAL.eliteLate from floor 45)
  const lateElite = f => { f.hpMul *= BAL.late(floor, BAL.eliteLate.hp / BAL.elite.hp); f.atkMul *= BAL.late(floor, BAL.eliteLate.atk / BAL.elite.atk); };
  if (type === 'elite') { out[0].elite = rng.pick(affixesFor(MONSTERS[out[0].id])); lateElite(out[0]); if (out.length > 2) out.pop(); }
  if (type === 'cursed') {
    while (out.length < 3) out.push({ id: rng.pick(pool), ...mul });
    for (const f of out.slice(0, 2)) { f.elite = rng.pick(affixesFor(MONSTERS[f.id])); f.hpMul *= BAL.cursedHp; }
  }
  return out;
}

function door(type, floor, rng) {
  const z = zoneOf(floor), L = levelOf(floor);
  const d = { type, seed: rng.int(1, 2 ** 31 - 1), bg: L.bg, hz: L.hz, music: type === 'boss' ? 'm_boss' : z.music };
  if (isFight(type)) d.foes = foesFor(type, floor, rng);
  return d;
}

export function generateDungeon(seed) {
  const rng = makeRng(hashSeed('tower', seed));
  const floors = [null]; // 1-based
  for (let f = 1; f <= BAL.floors; f++) {
    const k = (f - 1) % BAL.zoneSize + 1, z = zoneOf(f);
    let types;
    if (k === 1) types = rng.shuffle(['fight', 'fight', rng.pick(['event', 'chest'])]); // v0.5.2: always 3 doors
    else if (k === BAL.zoneSize) types = ['boss'];
    else if (k === 5) types = ['rest', 'shop'];
    else if (k === BAL.zoneSize - 1) types = z.index >= 2 && rng.chance(0.4) ? rng.shuffle(['rest', 'shop', 'elite']) : ['rest', 'shop'];
    else {
      const n = 3; // v0.5.2: always 3 doors on mixed floors (was 2 or 3)
      const pool = [['elite', f >= 3 ? 3 : 0], ['chest', 2], ['event', 3.5], ['shop', 0.4]].filter(([, w]) => w > 0);
      types = ['fight'];
      while (types.length < n) types.push(rng.weighted(pool.filter(([t]) => !types.includes(t))));
      if (f >= 4 && rng.chance(BAL.cursedChance)) { if (types.length >= 3) types.pop(); types.push('cursed'); }
      types = rng.shuffle(types);
    }
    floors.push({ n: f, zone: z.name, zi: z.index, level: levelOf(f).name, doors: types.map(t => door(t, f, rng)) });
  }
  return floors;
}
