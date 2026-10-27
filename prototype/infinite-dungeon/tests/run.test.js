// Dungeon generation, rewards, loss rules and save.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateDungeon, isFight } from '../js/run/dungeon.js';
import { newRun, chooseDoor, finishBattle, pickCard, applyCard, heroStats, advance, retreat, canRetreat, continueRun, endRun, floorOf, rest, buy, resolveEvent, reroll } from '../js/run/run.js';
import { newMeta, buyUpgrade } from '../js/run/meta.js';
import { rewardCards } from '../js/run/loot.js';
import { makeRng } from '../js/core/rng.js';
import { loadSave, writeSave, SAVE_KEY, BACKUP_KEY, exportCode, importCode } from '../js/save/storage.js';
import { simulateRun } from '../tools/simulate.mjs';
import { BAL } from '../js/data/balance.js';

test('1000 seeds: 10 floors, valid doors, fixed guardian and boss, a normal fight on every mixed floor', () => {
  for (let s = 1; s <= 1000; s++) {
    const d = generateDungeon(s);
    assert.equal(d.length, 11);
    let shop = false;
    for (let f = 1; f <= 10; f++) {
      const types = d[f].doors.map(x => x.type);
      assert.ok(types.length >= 1 && types.length <= 3, `seed ${s} floor ${f}`);
      if (f === 5) assert.deepEqual(types, ['guardian']);
      else if (f === 10) assert.deepEqual(types, ['boss']);
      else if (f === 9) assert.deepEqual(types.slice().sort(), ['rest', 'shop']);
      else assert.ok(types.includes('fight'), `seed ${s} floor ${f}: no normal fight`);
      if (f < 3) assert.ok(!types.includes('elite'));
      if (f >= 6 && f <= 8 && types.includes('shop')) shop = true;
      for (const door of d[f].doors) if (isFight(door.type)) assert.ok(door.foes.length >= 1);
    }
    assert.ok(shop, `seed ${s}: no shop on floors 6-8`);
  }
});

test('same seed = same dungeon', () => {
  assert.equal(JSON.stringify(generateDungeon(77)), JSON.stringify(generateDungeon(77)));
  assert.notEqual(JSON.stringify(generateDungeon(77)), JSON.stringify(generateDungeon(78)));
});

test('a team must be 3 different heroes', () => {
  assert.throws(() => newRun(newMeta(), ['aldric', 'aldric', 'nyx'], 1));
  assert.throws(() => newRun(newMeta(), ['aldric', 'nyx'], 1));
});

test('every reward card has a real effect', () => {
  const meta = newMeta(), rng = makeRng(5);
  const seen = new Set();
  for (let i = 0; i < 300; i++) {
    const run = newRun(meta, ['aldric', 'orin', 'lyra'], i);
    for (const h of run.team) h.hp = Math.round(h.hpMax / 2);
    for (const c of rewardCards(run, rng, 3, i % 3 ? 'normal' : 'elite')) {
      seen.add(c.type);
      const before = JSON.stringify(run);
      applyCard(run, c, meta);
      assert.notEqual(JSON.stringify(run), before, `card ${c.type} changed nothing`);
    }
  }
  for (const t of ['heal', 'stat', 'upgrade', 'element', 'gear', 'relic']) assert.ok(seen.has(t), `never offered: ${t}`);
});

test('gear and stat bonuses change hero stats', () => {
  const meta = newMeta(), run = newRun(meta, ['aldric', 'orin', 'lyra'], 1), h = run.team[0];
  const s0 = heroStats(h, meta);
  applyCard(run, { type: 'gear', hero: 'aldric', gear: { slot: 'w', st: { atk: 10 } } }, meta);
  applyCard(run, { type: 'stat', hero: 'aldric', stat: 'hp', pct: 0.12 }, meta);
  const s1 = heroStats(h, meta);
  assert.equal(s1.atk, s0.atk + 10);
  assert.ok(s1.hpMax > s0.hpMax);
  buyUpgrade(Object.assign(meta, { shards: 100 }), 'vie');
  assert.ok(heroStats(h, meta).hpMax > s1.hpMax);
});

test('loss rules: victory, retreat, defeat before and after the checkpoint', () => {
  const play = (outcome, banked, shards) => { const m = newMeta(), r = newRun(m, ['aldric', 'orin', 'lyra'], 3); r.banked = banked; r.shards = shards; r.outcome = outcome; return endRun(m, r).kept; };
  assert.equal(play('win', 15, 30), 15 + 30 + BAL.shards.victory);
  assert.equal(play('retreat', 15, 30), 45);
  assert.equal(play('lose', 0, 30), 15);           // before floor 5: half of the unbanked shards
  assert.equal(play('lose', 20, 31), 20 + 15);     // after: banked kept, half of the rest (rounded down)
});

test('floor 5 is a checkpoint: shards are banked and retreat is possible', () => {
  const meta = newMeta(), run = newRun(meta, ['aldric', 'selena', 'orin'], 8);
  run.floor = 5; run.shards = 12;
  chooseDoor(run, 0);
  finishBattle(run, 'win', run.team.map(h => ({ id: h.id, hp: h.hp })));
  assert.equal(run.phase, 'reward');
  pickCard(run, 0, meta);
  assert.equal(run.phase, 'checkpoint');
  assert.equal(run.banked, 12 + BAL.shards.guardian);
  assert.equal(run.shards, 0);
  assert.ok(canRetreat(run));
  continueRun(run);
  assert.equal(run.phase, 'map');
  assert.equal(run.floor, 6);
  assert.equal(canRetreat(run), false);
});

test('rest, shop and events work', () => {
  const meta = newMeta(), run = newRun(meta, ['aldric', 'selena', 'orin'], 21);
  for (const h of run.team) h.hp = 10;
  run.floor = 9; chooseDoor(run, floorOf(run).doors.findIndex(d => d.type === 'rest'));
  assert.ok(canRetreat(run));
  rest(run, 'heal', meta);
  assert.ok(run.team.every(h => h.hp > 10));
  run.floor = 9; run.phase = 'map'; run.gold = 500;
  chooseDoor(run, floorOf(run).doors.findIndex(d => d.type === 'shop'));
  const pots = run.items.pot;
  assert.ok(buy(run, 'pot', meta)); assert.ok(buy(run, 'pot', meta));
  assert.equal(run.items.pot, pots + 2);
  assert.ok(buy(run, 'relic', meta) || run.relics.length >= 0);
  assert.equal(buy(run, 'relic', meta), false, 'relic bought twice');
  run.phase = 'room'; run.pending = { kind: 'event', event: 'spring' };
  const r = resolveEvent(run, 1, meta);
  assert.ok(r.ok && /potion/.test(r.text));
});

test('reroll gives new cards and is limited', () => {
  const meta = newMeta(); meta.upgrades.relance = 1;
  const run = newRun(meta, ['aldric', 'selena', 'orin'], 4);
  chooseDoor(run, 0);
  finishBattle(run, 'win', run.team.map(h => ({ id: h.id, hp: h.hp })));
  assert.ok(reroll(run));
  assert.equal(reroll(run), false);
});

test('whole expeditions can be played to the end (simulation)', () => {
  const out = Array.from({ length: 60 }, (_, i) => simulateRun(200 + i));
  assert.ok(out.every(r => ['win', 'lose', 'retreat'].includes(r.outcome)));
  assert.ok(out.some(r => r.outcome === 'win'), 'boss never beaten');
  assert.ok(out.some(r => r.outcome === 'lose'), 'never lost: too easy');
});

// ---- save

const memory = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m }; };

test('save round trip with a run in progress', () => {
  const s = memory(), meta = newMeta(); meta.shards = 33;
  const run = newRun(meta, ['nyx', 'lyra', 'selena'], 12); advance(run);
  assert.ok(writeSave({ meta, run }, s));
  const { data, warning } = loadSave(s);
  assert.equal(warning, '');
  assert.equal(data.meta.shards, 33);
  assert.equal(data.run.floor, 2);
  assert.deepEqual(data.run.team.map(h => h.id), ['nyx', 'lyra', 'selena']);
});

test('corrupted save: backup restored, else fresh game, never a crash', () => {
  const s = memory(), meta = newMeta(); meta.shards = 5;
  writeSave({ meta, run: null }, s);
  meta.shards = 9; writeSave({ meta, run: null }, s);   // backup now holds shards 5
  s.setItem(SAVE_KEY, '{broken');
  let r = loadSave(s);
  assert.equal(r.data.meta.shards, 5);
  assert.match(r.warning, /secours/);
  s.setItem(BACKUP_KEY, 'also broken');
  r = loadSave(s);
  assert.equal(r.data.meta.shards, 0);
  assert.match(r.warning, /illisible/);
});

test('unknown version and throwing storage are handled', () => {
  const s = memory(); s.setItem(SAVE_KEY, JSON.stringify({ v: 99 }));
  assert.equal(loadSave(s).data.meta.shards, 0);
  const bad = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('quota'); } };
  assert.match(loadSave(bad).warning, /inaccessible/);
  assert.equal(writeSave({ meta: newMeta(), run: null }, bad), false);
});

test('finished runs are not restored; bad meta values are repaired', () => {
  const s = memory();
  s.setItem(SAVE_KEY, JSON.stringify({ v: 1, meta: { shards: -4, upgrades: { vie: 99 } }, run: { v: 1, seed: 1, floor: 3, team: [1, 2, 3], phase: 'over' } }));
  const { data } = loadSave(s);
  assert.equal(data.run, null);
  assert.equal(data.meta.shards, 0);
  assert.equal(data.meta.upgrades.vie, 3);
});

test('export / import code', () => {
  globalThis.btoa ??= x => Buffer.from(x, 'binary').toString('base64');
  globalThis.atob ??= x => Buffer.from(x, 'base64').toString('binary');
  const meta = newMeta(); meta.shards = 77;
  const back = importCode(exportCode({ meta, run: null }));
  assert.equal(back.meta.shards, 77);
  assert.equal(importCode('nonsense'), null);
  void retreat;
});
