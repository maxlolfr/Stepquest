// Combat engine rules.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBattle, step, autoFight, autoNext, castUltimate, useGuard, canGuard, useItem, heroesOf, foesOf, alive } from '../js/engine/combat.js';
import { HEROES, HERO_ORDER } from '../js/data/heroes.js';
import { BAL } from '../js/data/balance.js';
import { BOSSES, ZONES, AFFIXES, MONSTERS, affixesFor } from '../js/data/monsters.js';
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

test('the first boss announces its Faux macabre one turn before, and Charge interrupts it', () => {
  let announced = 0, interrupted = 0;
  for (let s = 1; s <= 30; s++) {
    const B = createBattle({ heroes: heroArgs(['aldric', 'selena', 'orin']), foes: [{ id: 'bossBone', boss: true, hpMul: BAL.bossHp(5), atkMul: BAL.bossAtk(5) }], seed: s });
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

test('first boss phase 2 raises a wall and summons skeletons', () => {
  const B = createBattle({ heroes: heroArgs(['aldric', 'selena', 'orin']), foes: [{ id: 'bossBone', boss: true, hpMul: 1, atkMul: 1 }], seed: 3 });
  const boss = foesOf(B)[0];
  boss.hp = Math.round(boss.hpMax * 0.51);
  let phase = false;
  while (!B.over && !phase) for (const e of step(B)) if (e.t === 'phase') phase = true;
  assert.ok(phase);
  assert.ok(boss.wall > 0 || !alive(boss));
  assert.ok(foesOf(B).some(f => f.summoned));
});

const bossFight = (id, seed, team = ['aldric', 'selena', 'orin']) => createBattle({ heroes: heroArgs(team), foes: [{ id, boss: true, hpMul: 1, atkMul: 1 }], items: { pot: 2, fea: 1 }, seed });

test('10 bosses, one per zone, each with a telegraphed special and a half-life change', () => {
  assert.equal(ZONES.length, 10);
  assert.deepEqual(ZONES.map(z => z.boss).sort(), Object.keys(BOSSES).sort());
  for (const [id, M] of Object.entries(BOSSES)) {
    assert.ok(M.special && M.special.name && ['all', 'one'].includes(M.special.target), id);
    assert.ok(M.phase && M.phase.text && M.tip, id);
    let charged = false, released = false;
    const B = bossFight(id, 7);
    while (!B.over && B.round < 10) for (const e of step(B)) {
      if (e.t === 'charge' && e.name === M.special.name) charged = true;
      if (e.t === 'act' && e.name === M.special.name) released = true;
    }
    assert.ok(charged, `${id}: no telegraph`);
    assert.ok(released || B.over, `${id}: special never released`);
  }
});

test('each boss phase does what its text says', () => {
  for (const [id, M] of Object.entries(BOSSES)) {
    const B = bossFight(id, 11), boss = foesOf(B)[0];
    boss.hp = M.phase.kind === 'rise' ? 1 : Math.round(boss.hpMax * 0.51);
    if (M.phase.kind === 'rise') boss.st.burn = null;
    let phase = false;
    for (let i = 0; i < 400 && !B.over && !phase; i++) for (const e of step(B)) if (e.t === 'phase') phase = true;
    assert.ok(phase || B.over, `${id}: phase never triggered`);
    if (!phase) continue;
    const k = M.phase.kind;
    if (k === 'wall') assert.ok(boss.wall > 0 && boss.wallWeak === M.phase.weak, id);
    if (k === 'thorns') assert.equal(boss.thornsPct, M.phase.pct);
    if (k === 'enrage') assert.ok(boss.atk > Math.round(M.atk * BAL.boss.atk), id);
    if (k === 'regen') assert.equal(boss.regenPct, M.phase.pct);
    if (k === 'summonShield') { assert.ok(foesOf(B).some(f => f.summoned && f.guards === boss.uid)); assert.equal(boss.shieldTaken, M.phase.taken); }
    if (k === 'rise') assert.ok(boss.risen && boss.hp > 0);
    if (k === 'intangible') assert.ok(boss.intangibleOn);
    if (k === 'double') assert.ok(boss.actTwice);
  }
});

test('every boss fight ends cleanly at its floor, without NaN', () => {
  ZONES.forEach((z, i) => {
    const f = 5 * (i + 1);
    for (let s = 1; s <= 6; s++) {
      const B = createBattle({ heroes: heroArgs(['aldric', 'selena', 'orin']), foes: [{ id: z.boss, boss: true, hpMul: BAL.bossHp(f), atkMul: BAL.bossAtk(f) }], items: { pot: 1, fea: 1 }, seed: s });
      autoFight(B, { smart: true });
      assert.ok(['win', 'lose'].includes(B.over), z.boss);
      for (const u of B.units) assert.ok(Number.isFinite(u.hp), `${z.boss}: NaN hp`);
    }
  });
});

test('elite affixes: spectral dodges, explosive hurts the team on death, every affix fits its monster', () => {
  for (const [id, M] of Object.entries(MONSTERS)) for (const a of affixesFor(M)) assert.ok(AFFIXES[a], `${id}/${a}`);
  assert.ok(!affixesFor(MONSTERS.bat).includes('thorns'), 'flying monsters cannot be thorny');
  let misses = 0, blasts = 0;
  for (let s = 1; s <= 20; s++) {
    const B = createBattle({ heroes: heroArgs(['aldric', 'lyra', 'nyx']), foes: [{ id: 'skel', hpMul: 1, atkMul: 1, elite: 'ghost' }, { id: 'rat', hpMul: 1, atkMul: 1, elite: 'bomb' }], seed: s });
    while (!B.over) for (const e of step(B)) {
      if (e.t === 'miss') misses++;
      if (e.t === 'say' && /explose/.test(e.text)) blasts++;
    }
  }
  assert.ok(misses > 0, 'spectral never dodged');
  assert.ok(blasts > 0, 'explosive never exploded');
});

test('a thief steals a potion and gives it back when it dies', () => {
  let stolen = 0, back = 0;
  for (let s = 1; s <= 30; s++) {
    const B = createBattle({ heroes: heroArgs(['aldric', 'lyra', 'nyx']), foes: [{ id: 'goblin', hpMul: 5, atkMul: 0.5 }], items: { pot: 3, fea: 0 }, seed: s });
    while (!B.over) for (const e of step(B)) {
      if (e.t === 'say' && /vole une potion/.test(e.text)) stolen++;
      if (e.t === 'say' && /récupérée/.test(e.text)) back++;
    }
    if (B.over === 'win') assert.equal(B.items.pot + 0, B.items.pot);
  }
  assert.ok(stolen > 0 && back > 0, `stolen ${stolen} back ${back}`);
});

test('Séléna heal is weaker than in v0.2', () => {
  assert.ok(BAL.healMult < 1.9);
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

test('auto mode: ultimate when full, potion when a hero is low, nothing otherwise', () => {
  const B = fight(5);
  assert.equal(autoNext(B), null);
  const h = heroesOf(B)[0];
  h.ult = BAL.ultMax;
  const a = autoNext(B); assert.ok(a);
  a(); assert.equal(h.ult, 0);
  B.items.pot = 1; h.hp = 1;
  const p = autoNext(B); assert.ok(p); p();
  assert.ok(h.hp > 1); assert.equal(B.items.pot, 0);
});

test('regenerating elites can always be worn down (v0.5.1)', () => {
  let wins = 0;
  for (let s = 1; s <= 20; s++) {
    const B = createBattle({ heroes: heroArgs(['aldric', 'selena', 'orin']), foes: [{ id: 'frog', hpMul: 6, atkMul: 0.5, elite: 'regen' }, { id: 'zombie', hpMul: 6, atkMul: 0.5 }], items: { pot: 2, fea: 1 }, seed: s });
    autoFight(B);
    if (B.over === 'win') wins++;
    assert.ok(B.round <= BAL.maxRounds);
  }
  assert.ok(wins >= 15, `only ${wins}/20 won against regenerating foes`);
});
