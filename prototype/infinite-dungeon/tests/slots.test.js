// v0.6 — relic slots: at most BAL.relicMax relics, an explicit replacement, never a silent loss.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BAL } from '../js/data/balance.js';
import { RELICS, activeSynergies } from '../js/data/items.js';
import { newRun, pickCard, replaceRelic, buy, resolveEvent, relicsFull, migrateRun } from '../js/run/run.js';
import { newMeta } from '../js/run/meta.js';
import { relicCard } from '../js/run/loot.js';

const KEYS = Object.keys(RELICS);
const fullRun = () => { const meta = newMeta(), run = newRun(meta, ['aldric', 'selena', 'orin'], 7); run.relics = KEYS.slice(0, BAL.relicMax); run.floor = 12; return { meta, run }; };
const newKey = run => KEYS.find(k => !run.relics.includes(k));

test('the limit is 10 slots', () => { assert.equal(BAL.relicMax, 10); });

test('under the limit a relic card is simply added', () => {
  const meta = newMeta(), run = newRun(meta, ['aldric', 'selena', 'orin'], 7);
  run.phase = 'reward'; run.pending = { kind: 'reward', cards: [relicCard(run, 'peste')] };
  pickCard(run, 0, meta);
  assert.deepEqual(run.relics, ['peste']);
  assert.equal(run.phase, 'map');
});

test('full slots: picking a relic opens the replacement, nothing changes until a choice', () => {
  const { meta, run } = fullRun(), before = run.relics.slice(), k = newKey(run);
  assert.ok(relicsFull(run));
  run.phase = 'reward'; run.pending = { kind: 'reward', cards: [relicCard(run, k)] };
  pickCard(run, 0, meta);
  assert.equal(run.phase, 'room');
  assert.equal(run.pending.kind, 'replace');
  assert.equal(run.pending.key, k);
  assert.deepEqual(run.relics, before, 'no relic lost before the confirmation');
  assert.throws(() => replaceRelic(run, 'not-a-relic', meta));
  replaceRelic(run, before[3], meta);
  assert.equal(run.relics.length, BAL.relicMax);
  assert.ok(run.relics.includes(k) && !run.relics.includes(before[3]));
  assert.equal(run.phase, 'map', 'the run goes on after the choice');
  assert.equal(run.stats.replaced, 1);
});

test('leaving the new relic keeps the 10 relics untouched', () => {
  const { meta, run } = fullRun(), before = run.relics.slice();
  run.phase = 'reward'; run.pending = { kind: 'reward', cards: [relicCard(run, newKey(run))] };
  pickCard(run, 0, meta);
  replaceRelic(run, null, meta);
  assert.deepEqual(run.relics, before);
  assert.equal(run.phase, 'map');
});

test('shop: buying with full slots asks too; leaving the relic gives the money back and returns to the shop', () => {
  const { meta, run } = fullRun(), k = newKey(run);
  run.gold = 1000; run.phase = 'room';
  const shop = { kind: 'shop', stock: [{ id: 'relic', price: 200, ...relicCard(run, k) }], bought: [] };
  run.pending = shop;
  assert.ok(buy(run, 'relic', meta));
  assert.equal(run.pending.kind, 'replace');
  assert.equal(run.gold, 800);
  replaceRelic(run, null, meta);
  assert.equal(run.gold, 1000, 'refunded');
  assert.equal(run.pending.kind, 'shop');
  assert.equal(run.phase, 'room');
});

test('event relic with full slots: replacement, then back to the event result', () => {
  const { meta, run } = fullRun();
  run.gold = 100; run.phase = 'room'; run.pending = { kind: 'event', event: 'shrine' };
  const r = resolveEvent(run, 0, meta);
  assert.ok(r.ok && /pleins/.test(r.text));
  assert.equal(run.pending.kind, 'replace');
  replaceRelic(run, run.relics[0], meta);
  assert.equal(run.pending.kind, 'event-done');
  assert.equal(run.relics.length, BAL.relicMax);
});

test('the Néant pact (2 relics) with 9 relics: one fits, the other asks, nothing is lost', () => {
  const meta = newMeta(), run = newRun(meta, ['aldric', 'selena', 'orin'], 2);
  run.relics = KEYS.slice(0, BAL.relicMax - 1); run.floor = 85; run.phase = 'room'; run.pending = { kind: 'event', event: 'pact' };
  resolveEvent(run, 0, meta);
  assert.equal(run.relics.length, BAL.relicMax);
  assert.equal(run.pending.kind, 'replace');
});

test('an older save holding more than 10 relics keeps them all (no silent loss)', () => {
  const meta = newMeta(), run = newRun(meta, ['aldric', 'selena', 'orin'], 3);
  run.relics = KEYS.slice(0, 20);
  const old = migrateRun(JSON.parse(JSON.stringify(run)));
  assert.equal(old.relics.length, 20);
  old.phase = 'reward'; old.pending = { kind: 'reward', cards: [relicCard(old, KEYS[21])] };
  pickCard(old, 0, meta);
  assert.equal(old.pending.kind, 'replace');
  replaceRelic(old, old.relics[0], meta);
  assert.equal(old.relics.length, 20);
  assert.ok(activeSynergies(old.relics).length >= 1);
});
