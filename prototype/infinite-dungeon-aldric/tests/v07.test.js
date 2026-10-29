// v0.7 « Builds qui comptent » — rarities, merges (max level 3), tier-3 synergies,
// signature relics, survival tools of the offensive heroes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RELICS, relicVal, relicDesc, relicPoolFor, activeSynergies, synergies3, RELIC_LV_MAX } from '../js/data/items.js';
import { BAL } from '../js/data/balance.js';
import { createBattle, autoFight, heroesOf, foesOf, step } from '../js/engine/combat.js';
import { newRun, applyCard, canMerge, battleConfig, replaceRelic, migrateRun } from '../js/run/run.js';
import { relicCard, drawRelic } from '../js/run/loot.js';
import { newMeta } from '../js/run/meta.js';
import { makeRng } from '../js/core/rng.js';
import { HEROES } from '../js/data/heroes.js';
const heroArgs = ids => ids.map(id => { const s = HEROES[id].stats; return { id, hpMax: s.hp, hp: s.hp, atk: s.atk, mag: s.mag, def: s.def, crit: s.crit, spd: s.spd }; });

const plain = Object.keys(RELICS).filter(k => !RELICS[k].sig);

test('every relic has a rarity, 1-3 level values that never decrease, and readable descriptions', () => {
  for (const k of plain) {
    const R = RELICS[k];
    assert.ok([0, 1, 2].includes(R.rar), k);
    assert.equal(R.vals.length, 3, k);
    assert.ok(R.vals[1] >= R.vals[0] && R.vals[2] >= R.vals[1], `${k}: levels must not weaken`);
    // decreasing gains: level 3 adds less than level 2 did
    if (R.vals[0] > 0) assert.ok(R.vals[2] - R.vals[1] <= R.vals[1] - R.vals[0] + 1e-9, `${k}: gains must decrease`);
    for (let lv = 1; lv <= 3; lv++) assert.ok(!/\{v\}|\{s\}/.test(relicDesc(k, lv)), `${k} niv ${lv}`);
  }
  const n = r => plain.filter(k => RELICS[k].rar === r).length;
  assert.ok(n(0) > n(1) && n(1) > n(2) && n(2) >= 1, 'more commons than rares than legendaries');
});

test('a duplicate merges into the relic held: level +1, no slot used, max level 3, never for signatures', () => {
  const meta = newMeta(), run = newRun(meta, ['aldric', 'lyra', 'nyx'], 3);
  run.relics = plain.slice(0, BAL.relicMax);
  const k = run.relics[0];
  applyCard(run, { type: 'relic', key: k }, meta);
  assert.equal(run.relicLv[k], 2); assert.equal(run.relics.length, BAL.relicMax); assert.ok(!run.relicWait, 'no replacement screen');
  applyCard(run, { type: 'relic', key: k }, meta);
  assert.equal(run.relicLv[k], RELIC_LV_MAX);
  assert.equal(canMerge(run, k), false);
  const card = relicCard({ ...run, relicLv: { [k]: 1 } }, k);
  assert.deepEqual([card.merge.from, card.merge.to], [1, 2]);
  run.relics[1] = 'sig_lyra';
  assert.equal(canMerge(run, 'sig_lyra'), false);
  // level-3 relics and signatures held never come up again
  const rng = makeRng(5);
  for (let i = 0; i < 300; i++) { const d = drawRelic(run, rng, 'elite'); assert.notEqual(d, k); assert.notEqual(d, 'sig_lyra'); }
  // the level goes away with a replaced relic
  run.pending = { kind: 'replace', key: plain[15], next: 'back', back: null, refund: 0 };
  replaceRelic(run, k, meta);
  assert.equal(run.relicLv[k], undefined);
});

test('levels change the fight: Rempart level 3 gives a bigger starting shield', () => {
  const mk = lv => createBattle({ heroes: heroArgs(['aldric', 'lyra', 'nyx']), foes: [{ id: 'skel', hpMul: 1, atkMul: 1 }], relics: ['rempart'], relicLv: { rempart: lv }, seed: 1 });
  const s1 = heroesOf(mk(1))[0].shield, s3 = heroesOf(mk(3))[0].shield;
  assert.ok(s3 > s1, `${s1} -> ${s3}`);
  assert.equal(relicVal('rempart', 3), 25);
});

test('signatures only for their hero; they never count for a style', () => {
  assert.ok(relicPoolFor(['orin', 'lyra', 'nyx']).includes('sig_nyx'));
  assert.ok(!relicPoolFor(['orin', 'lyra', 'nyx']).includes('sig_aldric'));
  const meta = newMeta(), run = newRun(meta, ['orin', 'lyra', 'nyx'], 8), rng = makeRng(2), seen = new Set();
  for (let i = 0; i < 2000; i++) seen.add(drawRelic(run, rng, 'normal'));
  assert.ok(seen.has('sig_orin') && seen.has('sig_lyra') && seen.has('sig_nyx'));
  assert.ok(!seen.has('sig_aldric') && !seen.has('sig_selena'));
  assert.deepEqual(activeSynergies(['sig_orin', 'sig_lyra']), []);
});

test('tier 3 needs 3 distinct relics of the style (2 is tier 1 only)', () => {
  assert.deepEqual(synergies3(['venin', 'brasier']), []);
  assert.deepEqual(activeSynergies(['venin', 'brasier']), ['fleau']);
  assert.deepEqual(synergies3(['venin', 'brasier', 'peste']), ['fleau']);
  assert.deepEqual(synergies3(['venin', 'venin', 'brasier']), [], 'a duplicate does not count twice');
});

test('rarity odds: commons most often, legendaries rare (≈ BAL.relicOdds.normal)', () => {
  const meta = newMeta(), run = newRun(meta, ['aldric', 'selena', 'orin'], 1), rng = makeRng(9), c = [0, 0, 0];
  for (let i = 0; i < 4000; i++) { const k = drawRelic(run, rng, 'normal'); if (!RELICS[k].sig) c[RELICS[k].rar]++; }
  const t = c[0] + c[1] + c[2];
  assert.ok(c[0] / t > 0.55 && c[0] / t < 0.75, `communes ${c[0] / t}`);
  assert.ok(c[2] / t > 0.02 && c[2] / t < 0.09, `légendaires ${c[2] / t}`);
});

test('Tir visé interrupts a monster preparing a blow (not a boss)', () => {
  const B = createBattle({ heroes: heroArgs(['lyra', 'orin', 'nyx']), foes: [{ id: 'skel', hpMul: 20, atkMul: 0.1 }], seed: 4 });
  const f = foesOf(B)[0], ly = heroesOf(B).find(h => h.id === 'lyra');
  f.charge = { kind: 'howl', name: 'Morsure féroce' }; ly.cd.aimed = 0;
  B.queue = [ly.uid]; B.round = 1;
  step(B);
  assert.equal(f.charge, null);
});

test('Nyx’s veil and Orin’s frost barrier are applied; Lyra’s mark weakens', () => {
  const B = createBattle({ heroes: heroArgs(['orin', 'lyra', 'nyx']), foes: [{ id: 'skel', hpMul: 30, atkMul: 0.1 }, { id: 'skel', hpMul: 30, atkMul: 0.1 }], seed: 6 });
  const [orin, , nyx] = heroesOf(B);
  orin.cd.blizzard = 0; nyx.cd.blades = 0; nyx.cd.assassin = 5;
  B.queue = [orin.uid, nyx.uid]; B.round = 1;
  step(B); step(B);
  assert.ok(heroesOf(B).every(h => h.shield > 0), 'frost barrier on every hero');
  assert.ok(nyx.st.veil > 0, 'shadow veil');
  assert.ok(BAL.lyra.markWeaken > 0);
});

test('determinism: same seed, same relics and levels = same fight', () => {
  const run = () => { const B = createBattle({ heroes: heroArgs(['orin', 'lyra', 'nyx']), foes: [{ id: 'bossWitch', boss: true, hpMul: 1, atkMul: 1 }], relics: ['venin', 'brasier', 'peste', 'sig_lyra', 'duel', 'assassin', 'chasse'], relicLv: { venin: 3, duel: 2 }, seed: 77 }); autoFight(B); return [B.over, B.round, heroesOf(B).map(h => h.hp).join()]; };
  assert.deepEqual(run(), run());
});

test('extreme builds still end their fights (crit, shields, poison/burn, ultimates, all at level 3)', () => {
  const builds = [['bourreau', 'chasse', 'duel', 'assassin'], ['rempart', 'sceau', 'riposte', 'pierre'], ['venin', 'brasier', 'peste'], ['colere', 'clarte', 'prisme', 'tempete'], ['vampire', 'braises', 'calice', 'etoile']];
  for (const b of builds) for (const team of [['aldric', 'selena', 'orin'], ['orin', 'lyra', 'nyx']]) {
    const lv = Object.fromEntries(b.map(k => [k, 3]));
    const B = createBattle({ heroes: heroArgs(team), foes: [{ id: 'bossVort', boss: true, hpMul: 2, atkMul: 1.5 }], relics: [...b, ...team.map(h => `sig_${h}`)], relicLv: lv, items: { pot: 2, fea: 1 }, seed: 3 });
    autoFight(B);
    assert.ok(B.over && B.round <= BAL.maxRounds + 1, `${b.join(',')} ${team.join('+')}`);
  }
});

test('an older save (v0.6, 10 relics, no levels) still plays: level 1 everywhere', () => {
  const meta = newMeta(), run = newRun(meta, ['aldric', 'selena', 'orin'], 12);
  run.relics = plain.slice(0, 10); delete run.relicLv;
  const old = migrateRun(JSON.parse(JSON.stringify(run)));
  assert.equal(old.relics.length, 10);
  applyCard(old, { type: 'relic', key: old.relics[2] }, meta);
  assert.equal(old.relicLv[old.relics[2]], 2);
});
