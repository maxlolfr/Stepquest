// v0.4: relics that change how a run plays, synergies, boss rewards, cursed doors.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBattle, step, castUltimate, useGuard, heroesOf, foesOf, alive, fightReport, autoFight } from '../js/engine/combat.js';
import { HEROES } from '../js/data/heroes.js';
import { BAL } from '../js/data/balance.js';
import { RELICS, SYNERGIES, activeSynergies, EVENTS, eventsForZone } from '../js/data/items.js';
import { generateDungeon, doorDanger, DOOR_REWARD, DOOR_INFO } from '../js/run/dungeon.js';
import { newRun, chooseDoor, finishBattle, floorOf, resolveEvent } from '../js/run/run.js';
import { rewardCards, relicCard } from '../js/run/loot.js';
import { newMeta } from '../js/run/meta.js';
import { makeRng } from '../js/core/rng.js';

const heroArgs = ids => ids.map(id => { const s = HEROES[id].stats; return { id, hpMax: s.hp, hp: s.hp, atk: s.atk, mag: s.mag, def: s.def, crit: s.crit, spd: s.spd }; });
const battle = (relics, foes = [{ id: 'skel', hpMul: 6, atkMul: 1 }], seed = 1, team = ['aldric', 'lyra', 'nyx']) =>
  createBattle({ heroes: heroArgs(team), foes, relics, items: { pot: 0, fea: 0 }, seed });
const events = (B, n = 400) => { const out = []; for (let i = 0; i < n && !B.over; i++) out.push(...step(B)); return out; };

test('every relic has a style (or none on purpose), a name and a description; styles have a synergy', () => {
  for (const [k, R] of Object.entries(RELICS)) {
    assert.ok(R.name && R.desc && R.ic, k);
    assert.ok(R.tag === '' || SYNERGIES[R.tag], `${k}: unknown style ${R.tag}`);
  }
  for (const t of Object.keys(SYNERGIES)) assert.ok(Object.values(RELICS).filter(R => R.tag === t).length >= 3, `style ${t} needs at least 3 relics`);
  assert.equal(Object.values(RELICS).filter(R => !R.sig).length, 22);
  assert.equal(Object.values(RELICS).filter(R => R.sig).length, 5, 'v0.7: one signature per hero');
  for (const t of Object.keys(SYNERGIES)) assert.ok(Object.values(RELICS).filter(R => R.tag === t && R.rar < 2).length >= 3, `style ${t}: tier 3 must not need a legendary`);
});

test('two relics of one style activate its synergy, one does not', () => {
  assert.deepEqual(activeSynergies(['venin']), []);
  assert.deepEqual(activeSynergies(['venin', 'peste']), ['fleau']);
  assert.ok(battle(['duel', 'assassin']).syn.has('crit'));
});

test('Lame de duel: the first attack of each hero is critical', () => {
  const B = battle(['duel']);
  const firstByHero = new Map();
  for (const e of events(B, 60)) if (e.t === 'dmg' && !e.dot && heroesOf(B).some(h => h.uid === e.src) && !firstByHero.has(e.src)) firstByHero.set(e.src, e.crit);
  assert.ok(firstByHero.size >= 2);
  for (const c of firstByHero.values()) assert.equal(c, true);
});

test('Prisme: weakness ×2 instead of ×1.5', () => {
  const avg = relics => { let s = 0; for (let i = 1; i <= 40; i++) { const B = battle(relics, [{ id: 'skel', hpMul: 50, atkMul: 0.01 }], i, ['orin', 'lyra', 'nyx']); const e = events(B, 40).filter(x => x.t === 'dmg' && x.weak && !x.dot); s += e.reduce((n, x) => n + x.amt, 0) / Math.max(1, e.length); } return s / 40; };
  const r = avg(['prisme']) / avg([]);
  assert.ok(r > 1.2 && r < 1.5, `ratio ${r}`);
});

test('Peste: a poisoned enemy that dies spreads its poison', () => {
  let spread = 0;
  for (let s = 1; s <= 20 && !spread; s++) {
    const B = battle(['peste'], [{ id: 'rat', hpMul: 0.4, atkMul: 0.5 }, { id: 'skel', hpMul: 6, atkMul: 0.5 }, { id: 'slime', hpMul: 6, atkMul: 0.5 }], s, ['lyra', 'aldric', 'nyx']);
    for (const f of foesOf(B)) f.st.poison = { stacks: 1, t: 3, dmg: 5 };
    if (events(B, 200).some(e => e.t === 'say' && /peste se propage/.test(e.text))) spread++;
  }
  assert.ok(spread > 0);
});

test('Étoile du matin: the first fallen hero gets back up, once', () => {
  const B = battle(['etoile'], [{ id: 'golem', hpMul: 20, atkMul: 8 }], 3, ['orin', 'lyra', 'nyx']);
  const ev = events(B, 600);
  assert.equal(ev.filter(e => e.t === 'revive' && /Étoile/.test(e.text)).length, 1);
});

test('Écu à pointes: a shielded hero sends part of the blow back', () => {
  let back = 0;
  for (let s = 1; s <= 10; s++) {
    const B = battle(['riposte'], [{ id: 'wolf', hpMul: 10, atkMul: 1 }], s);
    for (const h of heroesOf(B)) h.shield = 500; // behind a shield 💠
    back += events(B, 60).filter(e => e.riposte).length;
  }
  assert.ok(back > 0);
});

test('Brasier toxique and Fléau: damage over time is stronger on poisoned + burning enemies', () => {
  const tick = relics => { const B = battle(relics, [{ id: 'golem', hpMul: 50, atkMul: 0.01 }]); const f = foesOf(B)[0]; f.st.poison = { stacks: 1, t: 3, dmg: 10 }; f.st.burn = { t: 3, dmg: 10 }; f.spd = 99; return events(B, 3).filter(e => e.t === 'dmg' && e.dot).reduce((n, e) => n + e.amt, 0); };
  assert.equal(tick([]), 20);
  assert.equal(tick(['brasier']), 40);
  assert.equal(tick(['brasier', 'venin']), 60); // + Fléau synergy (×1.5)
});

test('Orbe des tempêtes: an ultimate charges the other heroes', () => {
  const B = battle(['tempete']);
  const [a, b] = heroesOf(B);
  a.ult = BAL.ultMax; b.ult = 0;
  castUltimate(B, a.uid);
  assert.ok(b.ult >= 25);
});

test('heavy relic combinations stay finite and NaN-free', () => {
  const all = Object.keys(RELICS);
  for (let s = 1; s <= 30; s++) {
    const B = createBattle({ heroes: heroArgs(['aldric', 'selena', 'orin']), foes: [{ id: 'bossVort', boss: true, hpMul: 2, atkMul: 1.5 }], relics: all, items: { pot: 2, fea: 1 }, seed: s });
    autoFight(B);
    assert.ok(['win', 'lose'].includes(B.over));
    for (const u of B.units) assert.ok(Number.isFinite(u.hp) && Number.isFinite(u.shield));
  }
});

test('fight report explains a defeat', () => {
  const B = battle([], [{ id: 'golem', hpMul: 30, atkMul: 10 }], 2, ['orin', 'lyra', 'nyx']);
  autoFight(B, { smart: false });
  const r = fightReport(B);
  assert.equal(r.result, 'lose');
  assert.ok(r.ko && r.ko.hero && r.ko.by);
  assert.ok(r.top && r.top.dmg > 0);
});

test('boss and cursed doors reward 1 relic out of 3 distinct ones; relic cards show their style', () => {
  const meta = newMeta(), run = newRun(meta, ['aldric', 'selena', 'orin'], 4);
  run.relics = ['venin'];
  for (const kind of ['boss', 'cursed']) {
    const cards = rewardCards(run, makeRng(9), 10, kind);
    assert.equal(cards.length, 3);
    assert.ok(cards.every(c => c.type === 'relic'));
    assert.equal(new Set(cards.map(c => c.key)).size, 3);
  }
  const c = relicCard(run, 'peste');
  assert.ok(c.syn && c.syn.completes && c.syn.name === 'Fléau');
  run.relics = Object.keys(RELICS).slice(0, 21);
  assert.equal(rewardCards(run, makeRng(1), 10, 'boss').length, 3, 'catalogue almost empty: still 3 cards');
});

test('cursed doors: never forced, elite foes, danger 3, better gold', () => {
  let cursed = 0;
  for (let s = 1; s <= 200; s++) {
    const d = generateDungeon(s);
    for (let f = 1; f <= 100; f++) for (const door of d[f].doors) {
      if (door.type !== 'cursed') continue;
      cursed++;
      assert.ok(d[f].doors.some(x => x.type === 'fight'), 'a normal fight is always offered next to a cursed door');
      assert.ok(door.foes.filter(x => x.elite).length >= 2);
      assert.equal(doorDanger(door), 3);
    }
  }
  assert.ok(cursed > 100);
  for (const t of Object.keys(DOOR_INFO)) assert.ok(DOOR_REWARD[t], `no reward text for ${t}`);
  assert.ok(BAL.gold.cursed[0] > BAL.gold.elite[1]);
  // a won cursed fight gives the relic choice
  const meta = newMeta(), run = newRun(meta, ['aldric', 'selena', 'orin'], 1);
  for (let s = 1; s < 500; s++) { run.seed = s; for (let f = 4; f < 100; f++) { run.floor = f; const i = floorOf(run).doors.findIndex(x => x.type === 'cursed'); if (i >= 0) { chooseDoor(run, i); s = 1e9; break; } } }
  finishBattle(run, 'win', run.team.map(h => ({ id: h.id, hp: h.hp })), 3, meta);
  assert.ok(run.pending.cards.every(c => c.type === 'relic'));
});

test('zone events are 3× more likely in their zone; the Néant pact gives 2 relics', () => {
  const w = eventsForZone(8);
  assert.equal(w.find(([e]) => e.id === 'pact')[1], 3);
  assert.equal(w.find(([e]) => e.id === 'shrine')[1], 1);
  assert.ok(!eventsForZone(0).some(([e]) => e.id === 'pact'));
  for (let z = 1; z < 10; z++) assert.ok(EVENTS.some(e => e.zones && e.zones.includes(z)) || z === 3, `zone ${z} has no own event`);
  const meta = newMeta(), run = newRun(meta, ['aldric', 'selena', 'orin'], 2);
  run.floor = 85; run.phase = 'room'; run.pending = { kind: 'event', event: 'pact' };
  resolveEvent(run, 0, meta);
  assert.equal(run.relics.length, 2);
});
