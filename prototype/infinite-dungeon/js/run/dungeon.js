// Generates the 10 floors of an expedition from a seed. Each floor offers 1-3
// doors; picking one is the player's path. Rules (checked by tests/dungeon.test.js):
//  - floor 1: two normal fights; floor 5: the Guardian; floor 9: rest or shop; floor 10: boss
//  - floors 2-4 and 6-8: 2-3 doors, always including a normal fight, so an elite is never forced
//  - elites from floor 3; at least one shop on floors 6-8
//  - same seed = same dungeon, monsters included
import { makeRng, hashSeed } from '../core/rng.js';
import { BAL } from '../data/balance.js';
import { zoneOf, AFFIXES } from '../data/monsters.js';

export const DOOR_INFO = {
  fight:    { name: 'Combat', ic: '⚔️', img: 'uiDice', desc: 'Des monstres gardent le passage.' },
  elite:    { name: 'Élite', ic: '💀', img: 'uiSkull', desc: 'Un ennemi d’élite : plus dur, meilleur butin.' },
  chest:    { name: 'Coffre', ic: '🎁', img: 'chestR2', desc: 'Un équipement ou une relique, sans combat.' },
  rest:     { name: 'Repos', ic: '🔥', img: 'uiChest1', desc: 'Soigner l’équipe ou s’entraîner. Retraite possible.' },
  shop:     { name: 'Marchand', ic: '💰', img: 'uiGold', desc: 'Potions, équipement et reliques contre de l’or.' },
  event:    { name: 'Événement', ic: '❓', img: 'uiScroll', desc: 'Une rencontre étrange, un choix à faire.' },
  guardian: { name: 'Gardien', ic: '🛡️', img: 'uiTrophy', desc: 'Le gardien du donjon. Après lui, tes éclats sont à l’abri.' },
  boss:     { name: 'Roi des Os', ic: '👑', img: 'uiSkull', desc: 'Le maître du donjon.' },
};

const FIGHTS = new Set(['fight', 'elite', 'guardian', 'boss']);
export const isFight = type => FIGHTS.has(type);

function foesFor(type, floor, rng) {
  const z = zoneOf(floor), pool = z.pool;
  const mul = { hpMul: BAL.foeHp(floor), atkMul: BAL.foeAtk(floor), defMul: BAL.foeDef(floor) };
  if (type === 'boss') return [{ id: 'bossBone', boss: true, ...mul }];
  if (type === 'guardian') return [{ id: 'knight', guardian: true, elite: rng.pick(Object.keys(AFFIXES)), ...mul }, { id: rng.pick(pool), ...mul }];
  const n = BAL.foeCount(floor, rng), out = [];
  for (let i = 0; i < n; i++) out.push({ id: rng.pick(pool), ...mul });
  if (type === 'elite') { out[0].elite = rng.pick(Object.keys(AFFIXES)); if (out.length > 2) out.pop(); }
  return out;
}

function door(type, floor, rng) {
  const z = zoneOf(floor), [bg, hz] = rng.pick(z.bgs);
  const d = { type, seed: rng.int(1, 2 ** 31 - 1), bg, hz, music: type === 'boss' ? 'm_boss' : z.music };
  if (isFight(type)) d.foes = foesFor(type, floor, rng);
  return d;
}

export function generateDungeon(seed) {
  const rng = makeRng(hashSeed('dungeon', seed));
  const shopFloor = rng.int(6, 8);
  const floors = [null]; // 1-based
  for (let f = 1; f <= BAL.floors; f++) {
    let types;
    if (f === 1) types = ['fight', 'fight'];
    else if (f === BAL.guardianFloor) types = ['guardian'];
    else if (f === BAL.floors - 1) types = ['rest', 'shop'];
    else if (f === BAL.bossFloor) types = ['boss'];
    else {
      const n = rng.chance(0.55) ? 3 : 2;
      const pool = [['elite', f >= 3 ? 3 : 0], ['chest', 2], ['event', 3], ['rest', f >= 3 ? 1.5 : 0], ['shop', f >= 6 ? 1 : 0.5]].filter(([, w]) => w > 0);
      types = ['fight'];
      if (f === shopFloor) types.push('shop');
      while (types.length < n) {
        const t = rng.weighted(pool.filter(([k]) => !types.includes(k)));
        types.push(t);
      }
      types = rng.shuffle(types);
    }
    floors.push({ n: f, zone: zoneOf(f).name, doors: types.map(t => door(t, f, rng)) });
  }
  return floors;
}
