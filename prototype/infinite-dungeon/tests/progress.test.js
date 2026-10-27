// v0.5: Nightmare curses, daily objectives, achievements, journal.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CURSES, CURSE_ORDER, curseBonus, dailyFor, dailyDone, ACHIEVEMENTS, NIGHTMARE_UNLOCK } from '../js/data/progress.js';
import { newMeta, recordRun, sanitizeMeta } from '../js/run/meta.js';
import { newRun, nightmareOpen, chooseDoor, battleConfig, finishBattle, floorOf, endRun, restHealPct } from '../js/run/run.js';
import { createBattle, step, heroesOf } from '../js/engine/combat.js';
import { shopStock } from '../js/run/loot.js';
import { makeRng } from '../js/core/rng.js';
import { simulateRun } from '../tools/simulate.mjs';

const open = () => Object.assign(newMeta(), { unlocked: NIGHTMARE_UNLOCK });
const sum = o => ({ floor: 1, elites: 0, bosses: 0, cursedWon: 0, synergies: 0, kills: 0, team: ['aldric', 'selena', 'orin'], curses: [], relics: [], bossIds: [], ...o });

test('Nightmare opens after the floor 10 boss; curses are ignored before', () => {
  assert.equal(nightmareOpen(newMeta()), false);
  assert.deepEqual(newRun(newMeta(), ['aldric', 'selena', 'orin'], 1, 1, ['rage']).curses, []);
  assert.deepEqual(newRun(open(), ['aldric', 'selena', 'orin'], 1, 1, ['rage', 'rage', 'nope']).curses, ['rage']);
});

test('each curse does what it says', () => {
  const meta = open();
  const base = newRun(meta, ['aldric', 'selena', 'orin'], 5), cur = newRun(meta, ['aldric', 'selena', 'orin'], 5, 1, CURSE_ORDER);
  assert.equal(cur.items.pot, 0);
  assert.ok(restHealPct(cur) < restHealPct(base));
  for (const r of [base, cur]) { r.floor = 2; chooseDoor(r, floorOf(r).doors.findIndex(d => d.type === 'fight')); }
  const b = battleConfig(base, meta), c = battleConfig(cur, meta);
  assert.ok(c.foes.length === 3);
  assert.ok(c.foes[0].atkMul > b.foes[0].atkMul * 1.19);
  assert.deepEqual(c.curses.sort(), CURSE_ORDER.slice().sort());
  assert.ok(base.door != null && b.foes !== base.door); // config never mutates the tower
  const shop = shopStock(cur, makeRng(1), 5).find(s => s.id === 'pot'), shop0 = shopStock(base, makeRng(1), 5).find(s => s.id === 'pot');
  assert.equal(shop.price, shop0.price * 2);
  let poisoned = 0;
  for (let s = 1; s <= 10; s++) { const B = createBattle({ ...c, seed: s }); for (let i = 0; i < 40 && !B.over; i++) for (const e of step(B)) if (e.t === 'status' && e.st === 'poison' && heroesOf(B).some(h => h.uid === e.uid)) poisoned++; }
  assert.ok(poisoned > 0, 'venom never poisoned');
});

test('curses give more shards', () => {
  assert.equal(curseBonus([]), 0);
  assert.ok(curseBonus(CURSE_ORDER) > 1);
  const meta = open(), a = newRun(meta, ['aldric', 'selena', 'orin'], 3), b = newRun(meta, ['aldric', 'selena', 'orin'], 3, 1, ['rage', 'crown']);
  for (const r of [a, b]) { chooseDoor(r, 0); finishBattle(r, 'win', r.team.map(h => ({ id: h.id, hp: h.hp })), 2, meta); }
  assert.ok(b.shards > a.shards || a.shards <= 1);
});

test('daily objectives: 3 per day, stable, different across days, no streak', () => {
  const d1 = dailyFor('2026-10-27'), d2 = dailyFor('2026-10-28');
  assert.equal(d1.length, 3);
  assert.deepEqual(d1, dailyFor('2026-10-27'));
  assert.notDeepEqual(d1.map(o => o.key), d2.map(o => o.key));
  assert.equal(new Set(d1.map(o => o.kind)).size, 3);
  for (let i = 1; i <= 60; i++) assert.ok(!dailyFor(`2026-11-${i}`).some(o => o.kind === 'nightmare'), 'nightmare objective before Nightmare is open');
  const meta = newMeta();
  const all = recordRun(meta, sum({ floor: 30, elites: 9, bosses: 2, cursedWon: 2, synergies: 2, kills: 99, team: ['aldric', 'lyra', 'nyx'], bossIds: ['bossBone', 'bossWitch'] }), '2026-10-27');
  assert.ok(all.dailies.length >= 1);
  const again = recordRun(meta, sum({ floor: 30, elites: 9, bosses: 2, cursedWon: 2, synergies: 2, kills: 99 }), '2026-10-27');
  assert.equal(again.dailies.length, 0, 'a daily objective pays once');
});

test('achievements pay once; journal records bosses, relics and hero records', () => {
  const meta = newMeta(), s0 = meta.shards;
  const r = recordRun(meta, sum({ floor: 26, bosses: 2, bossIds: ['bossBone', 'bossWitch'], relics: ['venin', 'peste'], team: ['aldric', 'selena', 'orin'] }), '2000-01-01');
  meta.stats.bestFloor = 26;
  const r2 = recordRun(meta, sum({ floor: 26, team: ['aldric', 'selena', 'orin'] }), '2000-01-01');
  assert.ok(r.achievements.some(a => a.id === 'first_boss'));
  assert.ok(r2.achievements.some(a => a.id === 'floor25'));
  assert.ok(!r2.achievements.some(a => a.id === 'first_boss'));
  assert.deepEqual(meta.bossesBeaten, ['bossBone', 'bossWitch']);
  assert.deepEqual(meta.relicsSeen, ['venin', 'peste']);
  assert.equal(meta.heroBest.aldric, 26);
  assert.ok(meta.shards > s0);
  for (const a of ACHIEVEMENTS) assert.ok(a.reward > 0 && a.name && a.desc, a.id);
});

test('endRun returns the progress and the Nightmare unlock; old metas are repaired', () => {
  const meta = newMeta(), run = newRun(meta, ['aldric', 'selena', 'orin'], 9);
  run.floor = 11; run.phase = 'checkpoint'; run.bosses = 1; run.stats.bossIds = ['bossBone']; run.outcome = 'retreat';
  const s = endRun(meta, run);
  assert.ok(s.nightmareOpened);
  assert.ok(s.progress && s.progress.achievements.some(a => a.id === 'first_boss'));
  const fixed = sanitizeMeta({ shards: 5, relicsSeen: ['venin', 'nope', 'venin'], bossesBeaten: 'x', heroBest: { aldric: 12, bob: 3 }, daily: { day: 7 } });
  assert.deepEqual(fixed.relicsSeen, ['venin']);
  assert.deepEqual(fixed.bossesBeaten, []);
  assert.deepEqual(fixed.heroBest, { aldric: 12 });
  assert.equal(fixed.daily.day, '');
});

test('a fully cursed expedition still ends (simulation)', () => {
  const meta = open();
  for (let i = 0; i < 6; i++) { const r = simulateRun(900 + i, { meta, curses: CURSE_ORDER }); assert.ok(['win', 'lose', 'retreat'].includes(r.outcome)); }
});
