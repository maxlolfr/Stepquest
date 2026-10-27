// Generates the 50 floors of the Tower from a seed. Each floor offers 1-3 doors;
// picking one is the player's path. Rules (checked by tests/run.test.js), per zone of 5 floors:
//  - 1st floor: two normal fights
//  - 2nd and 3rd floors: 2-3 doors, always including a normal fight, so an elite is never forced
//  - 4th floor: rest and shop (from zone 2, sometimes an elite as a third door)
//  - 5th floor: the zone boss
//  - elites from floor 3; same seed = same tower, monsters included
import { makeRng, hashSeed } from '../core/rng.js';
import { BAL } from '../data/balance.js';
import { zoneOf, levelOf, affixesFor, MONSTERS, BOSSES } from '../data/monsters.js';

export const DOOR_INFO = {
  fight: { name: 'Combat', ic: '⚔️', img: 'uiDice', desc: 'Des monstres gardent le passage.' },
  elite: { name: 'Élite', ic: '💀', img: 'uiSkull', desc: 'Un ennemi d’élite : plus dur, meilleur butin.' },
  chest: { name: 'Coffre', ic: '🎁', img: 'chestR2', desc: 'Un équipement ou une relique, sans combat.' },
  rest:  { name: 'Repos', ic: '🔥', img: 'uiChest1', desc: 'Soigner l’équipe ou s’entraîner. Retraite possible.' },
  shop:  { name: 'Marchand', ic: '💰', img: 'uiGold', desc: 'Potions, équipement et reliques contre de l’or.' },
  event: { name: 'Événement', ic: '❓', img: 'uiScroll', desc: 'Une rencontre étrange, un choix à faire.' },
  boss:  { name: 'Boss', ic: '👑', img: 'uiTrophy', desc: 'Le maître de la zone. Après lui, tes éclats sont à l’abri.' },
};
export const doorName = (d, floor) => (d.type === 'boss' ? BOSSES[zoneOf(floor).boss].name : DOOR_INFO[d.type].name);

const FIGHTS = new Set(['fight', 'elite', 'boss']);
export const isFight = type => FIGHTS.has(type);
export const isBossFloor = floor => floor % BAL.zoneSize === 0;

function foesFor(type, floor, rng) {
  const z = zoneOf(floor), pool = z.pool;
  const mul = { hpMul: BAL.foeHp(floor), atkMul: BAL.foeAtk(floor), defMul: BAL.foeDef(floor) };
  if (type === 'boss') return [{ id: z.boss, boss: true, hpMul: BAL.bossHp(floor), atkMul: BAL.bossAtk(floor), defMul: 1 }];
  const n = BAL.foeCount(floor, rng), out = [];
  for (let i = 0; i < n; i++) out.push({ id: rng.pick(pool), ...mul });
  if (type === 'elite') { out[0].elite = rng.pick(affixesFor(MONSTERS[out[0].id])); if (out.length > 2) out.pop(); }
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
    if (k === 1) types = ['fight', 'fight'];
    else if (k === 5) types = ['boss'];
    else if (k === 4) types = z.index >= 2 && rng.chance(0.4) ? rng.shuffle(['rest', 'shop', 'elite']) : ['rest', 'shop'];
    else {
      const n = rng.chance(0.55) ? 3 : 2;
      const pool = [['elite', f >= 3 ? 3 : 0], ['chest', 2], ['event', 3.5], ['shop', 0.4]].filter(([, w]) => w > 0);
      types = ['fight'];
      while (types.length < n) types.push(rng.weighted(pool.filter(([t]) => !types.includes(t))));
      types = rng.shuffle(types);
    }
    floors.push({ n: f, zone: z.name, zi: z.index, level: levelOf(f).name, doors: types.map(t => door(t, f, rng)) });
  }
  return floors;
}
