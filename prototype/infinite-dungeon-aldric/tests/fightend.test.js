// v0.6 — every fight ends: enrage from round 25, explicit defeat at round 60.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBattle, step, autoFight, enrageInfo, fightReport, foesOf, heroesOf } from '../js/engine/combat.js';
import { HEROES } from '../js/data/heroes.js';
import { BAL } from '../js/data/balance.js';
import { campMeta, playRun } from '../tools/bench.mjs';

const hero = (id, k = 1) => { const s = HEROES[id].stats; return { id, hpMax: s.hp * k, hp: s.hp * k, atk: s.atk, mag: s.mag, def: s.def, crit: s.crit, spd: s.spd }; };
// a slow fight: sturdy regenerating monsters against a weak team
const slowFight = (seed, heroK = 1) => createBattle({ heroes: ['selena', 'aldric', 'orin'].map(id => hero(id, heroK)), foes: ['slime', 'slime'].map(id => ({ id, hpMul: 60, atkMul: 0.3, elite: 'regen' })), seed });

test('enrage: warned at round 20, then +step per round from round 25', () => {
  const B = slowFight(3), seen = [];
  while (!B.over && B.round < 30) for (const e of step(B)) if (e.t === 'enrage') seen.push({ ...e, round: B.round });
  assert.ok(B.round >= 30, 'the fight should last long enough');
  const warn = seen.find(e => e.warn), first = seen.find(e => e.first);
  assert.equal(warn.round, BAL.enrage.warn);
  assert.equal(first.round, BAL.enrage.from);
  assert.ok(first.text && warn.text);
  assert.equal(B.enrageMul, +(1 + BAL.enrage.step * (B.round - BAL.enrage.from + 1)).toFixed(2));
  const info = enrageInfo(B);
  assert.equal(info.state, 'on');
});

test('before round 25 nothing changes; enraged enemies hit harder and stop healing', () => {
  const B = slowFight(5);
  while (B.round < BAL.enrage.from - 1) step(B);
  assert.equal(B.enraged, 0);
  assert.equal(enrageInfo(B).state, 'soon');
  while (B.round < BAL.enrage.from + 2) step(B);
  assert.ok(B.enraged >= 3);
  // no foe heal event once enraged (they have the regenerating affix)
  for (let i = 0; i < 40 && !B.over; i++) for (const e of step(B)) {
    const u = B.units.find(x => x.uid === e.uid);
    if (e.t === 'heal' && u && u.side === 'f') assert.equal(e.amt, 0);
  }
});

test('round 60: an explicit defeat event, reported as a timeout', () => {
  // unkillable heroes against unkillable monsters: only the limit can end it
  const B = createBattle({ heroes: ['selena', 'aldric', 'orin'].map(id => hero(id, 400)), foes: [{ id: 'slime', hpMul: 5000, atkMul: 0.01 }], seed: 9 });
  let last = [];
  while (!B.over) last = step(B);
  assert.equal(B.over, 'lose');
  const end = last.find(e => e.t === 'end');
  assert.ok(end.timeout);
  assert.ok(last.some(e => e.t === 'say' && /trop duré/.test(e.text)));
  const r = fightReport(B);
  assert.ok(r.timeout && r.enraged > 0);
});

test('bosses never reach the round limit any more (bench sample)', () => {
  let bossFights = 0, timeouts = 0;
  for (const [z, lvl] of [[3, 0.25], [5, 0.5], [6, 0.5], [7, 0.5], [9, 1]]) {
    for (let i = 0; i < 6; i++) playRun(4242 + z * 100 + i, { meta: campMeta(lvl, z * 10 + 1), start: z * 10 + 1, hooks: { onFight: f => { if (f.type === 'boss') { bossFights++; if (f.timeout) timeouts++; } } } });
  }
  assert.ok(bossFights >= 20);
  assert.equal(timeouts, 0);
});

test('speed does not exist in the engine: the same fight at any UI speed is identical', () => {
  const a = slowFight(11), b = slowFight(11);
  autoFight(a); autoFight(b);
  assert.equal(a.round, b.round);
  assert.deepEqual(heroesOf(a).map(h => h.hp), heroesOf(b).map(h => h.hp));
  assert.deepEqual(foesOf(a).map(h => h.hp), foesOf(b).map(h => h.hp));
});
