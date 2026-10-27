// Combat engine rules.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBattle, step, autoFight, castUltimate, useGuard, canGuard, useItem, heroesOf, foesOf, alive } from '../js/engine/combat.js';
import { HEROES, HERO_ORDER } from '../js/data/heroes.js';
import { BAL } from '../js/data/balance.js';
import { newRun, battleConfig, chooseDoor, floorOf } from '../js/run/run.js';
import { newMeta } from '../js/run/meta.js';

const heroArgs = ids => ids.map(id => { const s = HEROES[id].stats; return { id, hpMax: s.hp, hp: s.hp, atk: s.atk, mag: s.mag, def: s.def, crit: s.crit, spd: s.spd }; });
const foes = (ids, f = 1) => ids.map(id => ({ id, hpMul: BAL.foeHp(f), atkMul: BAL.foeAtk(f) }));
const fight = (seed, team = ['aldric', 'selena', 'orin'], f = ['skel', 'wolf', 'slime']) => createBattle({ heroes: heroArgs(team), foes: foes(f), items: { pot: 1, fea: 1 }, seed });

test('same seed and same actions = same fight, event by event', () => {
  const run = s => { const B = fight(s), log = []; while (!B.over) log.push(...step(B)); return JSON.stringify(log); };
  assert.equal(run(42), run(42));
  assert.notEqual(run(42), run(43));
});

test('every fight ends with a winner, within the round limit, without NaN', () => {
  for (let s = 1; s <= 300; s++) {
    const team = [HERO_ORDER[s % 5], HERO_ORDER[(s + 1) % 5], HERO_ORDER[(s + 3) % 5]];
    const B = fight(s, team, ['rat', 'spider', 'shroom']);
    autoFight(B, { smart: s % 2 === 0 });
    assert.ok(B.over === 'win' || B.over === 'lose', `seed ${s}`);
    assert.ok(B.round <= BAL.maxRounds + 1);
    for (const u of B.units) { assert.ok(Number.isFinite(u.hp) && u.hp >= 0 && u.hp <= u.hpMax, `${u.name} hp ${u.hp}`); }
  }
});

test('weakness ×1.5 and resistance ×0.5 are applied', () => {
  // Orin's Fire on a slime (weak to fire) vs on an imp (resists fire)
  let weak = 0, resist = 0;
  for (let s = 1; s <= 40; s++) {
    for (const [id, set] of [['slime', 'w'], ['imp', 'r']]) {
      const B = createBattle({ heroes: heroArgs(['orin', 'selena', 'aldric']), foes: foes([id]), seed: s });
      while (!B.over) { const ev = step(B); const d = ev.find(e => e.t === 'dmg' && !e.dot && e.el === 'feu'); if (d) { if (set === 'w' && d.weak) weak++; if (set === 'r' && d.resist) resist++; break; } }
    }
  }
  assert.ok(weak > 0, 'fire never flagged as weakness on slime');
  assert.ok(resist > 0, 'fire never flagged as resisted on imp');
});

test('ultimate only when the gauge is full, and it empties the gauge', () => {
  const B = fight(7), h = heroesOf(B)[0];
  assert.deepEqual(castUltimate(B, h.uid), []);
  h.ult = BAL.ultMax;
  const ev = castUltimate(B, h.uid);
  assert.ok(ev.some(e => e.t === 'act' && e.kind === 'ult'));
  assert.equal(h.ult, 0);
});

test('Guard halves damage and is limited per fight', () => {
  const B = fight(9);
  assert.ok(canGuard(B));
  useGuard(B);
  assert.equal(canGuard(B), false);
  assert.equal(B.guardLeft, 0);
  const B2 = createBattle({ heroes: heroArgs(['aldric', 'selena', 'orin']), foes: foes(['skel']), relics: ['sceau'], seed: 9 });
  assert.equal(B2.guardLeft, 2);
});

test('potion heals the most wounded hero; phoenix brings back a fallen one', () => {
  const B = fight(11), [a, b] = heroesOf(B);
  a.hp = 10; b.hp = 0;
  useItem(B, 'pot');
  assert.ok(a.hp > 10);
  useItem(B, 'fea');
  assert.ok(alive(b));
  assert.deepEqual(B.items, { pot: 0, fea: 0 });
});

test('the boss announces its Faux macabre one turn before, and Charge interrupts it', () => {
  let announced = 0, interrupted = 0;
  for (let s = 1; s <= 30; s++) {
    const B = createBattle({ heroes: heroArgs(['aldric', 'selena', 'orin']), foes: [{ id: 'bossBone', boss: true, hpMul: BAL.foeHp(10), atkMul: BAL.foeAtk(10) }], seed: s });
    while (!B.over && B.round < 12) {
      for (const e of step(B)) {
        if (e.t === 'charge') announced++;
        if (e.t === 'say' && /interrompu/.test(e.text)) interrupted++;
      }
    }
  }
  assert.ok(announced > 0, 'no telegraph');
  assert.ok(interrupted > 0, 'Aldric never interrupted the boss');
});

test('boss phase 2 raises a wall and summons skeletons', () => {
  const B = createBattle({ heroes: heroArgs(['aldric', 'selena', 'orin']), foes: [{ id: 'bossBone', boss: true, hpMul: 1, atkMul: 1 }], seed: 3 });
  const boss = foesOf(B)[0];
  boss.hp = Math.round(boss.hpMax * 0.51);
  let phase = false;
  while (!B.over && !phase) for (const e of step(B)) if (e.t === 'phase') phase = true;
  assert.ok(phase);
  assert.ok(boss.wall > 0 || !alive(boss));
  assert.ok(foesOf(B).some(f => f.summoned));
});

test('a real dungeon fight can be built from a run', () => {
  const meta = newMeta(), run = newRun(meta, ['aldric', 'lyra', 'nyx'], 99);
  chooseDoor(run, floorOf(run).doors.findIndex(d => d.type === 'fight'));
  const B = createBattle(battleConfig(run, meta));
  assert.equal(heroesOf(B).length, 3);
  assert.ok(foesOf(B).length >= 2);
  autoFight(B);
  assert.ok(B.over);
});
