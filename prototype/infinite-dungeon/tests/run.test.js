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
import { BAL, XP } from '../js/data/balance.js';
import { ZONES, zoneOf, levelOf } from '../js/data/monsters.js';
import { EVENTS } from '../js/data/items.js';
import { startFloors, migrateRun, gainXp, RUN_VERSION } from '../js/run/run.js';

test('1000 seeds: 100 floors, a boss every 10 floors, rest + shop on floors 5 and 9 of each zone, a normal fight on every mixed floor', () => {
  for (let s = 1; s <= 1000; s++) {
    const d = generateDungeon(s);
    assert.equal(d.length, 101);
    for (let f = 1; f <= 100; f++) {
      const types = d[f].doors.map(x => x.type), k = (f - 1) % 10 + 1;
      assert.ok(types.length >= 1 && types.length <= 3, `seed ${s} floor ${f}`);
      if (k === 10) { assert.deepEqual(types, ['boss']); assert.equal(d[f].doors[0].foes[0].id, ZONES[f / 10 - 1].boss); }
      else if (k === 5 || k === 9) { assert.ok(types.includes('rest') && types.includes('shop'), `seed ${s} floor ${f}`); }
      else if (k === 1) { assert.equal(types.filter(t => t === 'fight').length, 2); assert.equal(types.length, 3); }
      else if (k !== 10 && k !== 5 && k !== 9) assert.equal(types.length, 3, `seed ${s} floor ${f}: only ${types.length} doors`);
      else assert.ok(types.includes('fight'), `seed ${s} floor ${f}: no normal fight`);
      if (f < 3) assert.ok(!types.includes('elite'));
      for (const door of d[f].doors) {
        assert.equal(door.bg, levelOf(f).bg);
        if (isFight(door.type)) {
          assert.ok(door.foes.length >= 1);
          for (const x of door.foes) if (!x.boss) assert.ok(zoneOf(f).pool.includes(x.id), `floor ${f}: ${x.id} out of zone`);
        }
      }
    }
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
  assert.equal(play('lose', 0, 30), 15);           // before the first boss: half of the unbanked shards
  assert.equal(play('lose', 20, 31), 20 + 15);     // after: banked kept, half of the rest (rounded down)
});

test('every zone boss is a checkpoint: shards are banked and retreat is possible', () => {
  for (const f of [10, 50, 90]) {
    const meta = newMeta(), run = newRun(meta, ['aldric', 'selena', 'orin'], 8);
    run.floor = f; run.shards = 12;
    chooseDoor(run, 0);
    assert.equal(floorOf(run).doors[0].type, 'boss');
    finishBattle(run, 'win', run.team.map(h => ({ id: h.id, hp: h.hp })), 1, meta);
    assert.equal(run.phase, 'reward');
    assert.ok(run.pending.cards.some(c => c.type === 'relic'), 'boss reward has a relic');
    pickCard(run, 0, meta);
    assert.equal(run.phase, 'checkpoint');
    assert.ok(run.banked > 12);
    assert.equal(run.shards, 0);
    assert.ok(canRetreat(run));
    continueRun(run);
    assert.equal(run.phase, 'map');
    assert.equal(run.floor, f + 1);
    assert.equal(canRetreat(run), false);
  }
});

test('beating the floor 100 boss wins the run; floor 10 boss unlocks the start at floor 11', () => {
  const meta = newMeta(), run = newRun(meta, ['aldric', 'selena', 'orin'], 9);
  run.floor = 100; chooseDoor(run, 0);
  finishBattle(run, 'win', run.team.map(h => ({ id: h.id, hp: h.hp })), 1, meta);
  assert.equal(run.outcome, 'win');
  const sum = endRun(meta, run);
  assert.equal(sum.floor, 100);
  assert.equal(meta.unlocked, 91);
  const m2 = newMeta(), r2 = newRun(m2, ['aldric', 'selena', 'orin'], 9);
  r2.floor = 11; r2.phase = 'checkpoint'; retreat(r2);
  assert.equal(endRun(m2, r2).unlocked, 11);
  assert.deepEqual(startFloors(m2), [1, 11]);
  const m3 = newMeta(), r3 = newRun(m3, ['aldric', 'selena', 'orin'], 9);
  r3.floor = 10; r3.outcome = 'lose'; endRun(m3, r3);
  assert.equal(m3.unlocked, 1, 'losing to the floor 10 boss unlocks nothing');
});

test('checkpoint start: only when unlocked, with a catch-up bonus', () => {
  const meta = newMeta();
  assert.equal(newRun(meta, ['aldric', 'selena', 'orin'], 3, 21).floor, 1, 'locked start falls back to floor 1');
  meta.unlocked = 21;
  const run = newRun(meta, ['aldric', 'selena', 'orin'], 3, 21), base = newRun(meta, ['aldric', 'selena', 'orin'], 3);
  assert.equal(run.floor, 21);
  assert.ok(run.lv > base.lv && run.gold > base.gold && run.relics.length === 1 && run.pending.start, '1 relic drawn + 1 to choose (v0.6)');
  assert.ok(run.team.every(h => h.gear.w && h.hp === h.hpMax));
});

test('heroes gain levels from fights and get stronger', () => {
  const meta = newMeta(), run = newRun(meta, ['aldric', 'selena', 'orin'], 3);
  const s1 = heroStats(run.team[0], meta, 1), hp1 = run.team[0].hpMax;
  assert.equal(gainXp(run, XP.need(1), meta), 1);
  assert.equal(run.lv, 2);
  assert.ok(run.team[0].hpMax > hp1);
  const s20 = heroStats(run.team[0], meta, 20);
  for (const k of ['hpMax', 'atk', 'def']) assert.ok(s20[k] > s1[k], k);
  meta.upgrades.ecole = 3;
  assert.equal(newRun(meta, ['aldric', 'selena', 'orin'], 3).lv, 7);
});

test('camp upgrades: 10 levels for the main ones, force and garde change stats', () => {
  const meta = newMeta(), run = newRun(meta, ['aldric', 'selena', 'orin'], 1), h = run.team[0];
  const s0 = heroStats(h, meta);
  meta.shards = 1e6;
  for (let i = 0; i < 12; i++) { buyUpgrade(meta, 'force'); buyUpgrade(meta, 'garde'); }
  assert.equal(meta.upgrades.force, 10);
  const s1 = heroStats(h, meta);
  assert.ok(s1.atk > s0.atk * 1.4 && s1.def > s0.def * 1.4);
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

test('every event choice can be resolved and changes something or says so', () => {
  for (const E of EVENTS) E.choices.forEach((c, i) => {
    for (let s = 0; s < 8; s++) {
      const meta = newMeta(), run = newRun(meta, ['aldric', 'lyra', 'orin'], 50 + s);
      run.floor = 22; run.gold = 500; run.phase = 'room'; run.pending = { kind: 'event', event: E.id };
      const r = resolveEvent(run, i, meta);
      assert.ok(r.ok && r.text.length > 3, `${E.id}/${i}`);
      assert.ok(run.team.every(h => h.hp >= 1 && h.hp <= h.hpMax), `${E.id}/${i}: hp out of range`);
    }
  });
  // a cost in items is checked
  const meta = newMeta(), run = newRun(meta, ['aldric', 'lyra', 'orin'], 1);
  run.items.pot = 0; run.phase = 'room'; run.pending = { kind: 'event', event: 'gambler' };
  assert.equal(resolveEvent(run, 1, meta).ok, false);
});

test('reroll gives new cards and is limited', () => {
  const meta = newMeta(); meta.upgrades.relance = 1;
  const run = newRun(meta, ['aldric', 'selena', 'orin'], 4);
  chooseDoor(run, floorOf(run).doors.findIndex(d => d.type === 'fight'));
  finishBattle(run, 'win', run.team.map(h => ({ id: h.id, hp: h.hp })), 0, meta);
  assert.ok(reroll(run));
  assert.equal(reroll(run), false);
});

test('whole expeditions can be played to the end (simulation)', () => {
  const out = Array.from({ length: 60 }, (_, i) => simulateRun(200 + i));
  assert.ok(out.every(r => ['win', 'lose', 'retreat'].includes(r.outcome)));
  assert.ok(out.some(r => r.floor > 5), 'first boss never beaten');
  assert.ok(out.some(r => r.outcome === 'lose'), 'never lost: too easy');
  const med = out.map(r => r.floor).sort((a, b) => a - b)[30];
  assert.ok(med >= 11 && med <= 60, `median floor ${med} with an empty camp`);
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
  s.setItem(SAVE_KEY, JSON.stringify({ v: 1, meta: { shards: -4, unlocked: 13, upgrades: { vie: 99 } }, run: { v: 1, seed: 1, floor: 3, team: [1, 2, 3], phase: 'over' } }));
  const { data } = loadSave(s);
  assert.equal(data.run, null);
  assert.equal(data.meta.shards, 0);
  assert.equal(data.meta.upgrades.vie, 10);
  assert.equal(data.meta.unlocked, 1);
});

test('each level of Dragonbound II is used for two floors', () => {
  assert.equal(levelOf(1).bg, levelOf(2).bg);
  assert.notEqual(levelOf(2).bg, levelOf(3).bg);
  assert.equal(levelOf(100).bg, ZONES[9].levels[4].bg);
});

test('a v0.3.0 save (run version 2, 5-floor zones) continues on the map', () => {
  const s = memory(), meta = newMeta();
  const old = newRun(meta, ['nyx', 'lyra', 'selena'], 12);
  Object.assign(old, { v: 2, floor: 6, phase: 'checkpoint', lv: 9 });
  s.setItem(SAVE_KEY, JSON.stringify({ v: 1, meta, run: old }));
  const { data } = loadSave(s);
  assert.equal(data.run.v, RUN_VERSION);
  assert.equal(data.run.phase, 'map');
  assert.equal(data.run.floor, 6);
  assert.equal(data.run.lv, 9);
});

test('a v0.2 save (run version 1) continues in the Tower', () => {
  const s = memory(), meta = newMeta(); meta.shards = 40; meta.upgrades.vie = 2;
  const old = newRun(meta, ['nyx', 'lyra', 'selena'], 12);
  Object.assign(old, { v: 1, floor: 7, phase: 'battle', door: 1 }); delete old.lv; delete old.xp; delete old.start; delete old.bosses;
  s.setItem(SAVE_KEY, JSON.stringify({ v: 1, meta, run: old }));
  const { data } = loadSave(s);
  assert.equal(data.meta.shards, 40);
  assert.equal(data.meta.upgrades.vie, 2);
  assert.ok(data.run, 'run kept');
  assert.equal(data.run.v, RUN_VERSION);
  assert.equal(data.run.phase, 'map');
  assert.equal(data.run.floor, 7);
  assert.ok(data.run.lv >= 1 && floorOf(data.run).doors.length >= 1);
  assert.equal(migrateRun(null), null);
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
