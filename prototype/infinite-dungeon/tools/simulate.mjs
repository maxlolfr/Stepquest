// Balance simulation: plays whole expeditions with the default AI and a simple
// player policy, then prints where runs end. Usage: node tools/simulate.mjs [runs] [smart=1]
import { makeRng } from '../js/core/rng.js';
import { HERO_ORDER } from '../js/data/heroes.js';
import { createBattle, autoFight, heroResults, foesOf } from '../js/engine/combat.js';
import { newRun, chooseDoor, battleConfig, finishBattle, pickCard, rest, buy, resolveEvent, leaveRoom, continueRun, floorOf, endRun } from '../js/run/run.js';
import { newMeta } from '../js/run/meta.js';

export function simulateRun(seed, { team, smart = true, meta = newMeta() } = {}) {
  const rng = makeRng(seed ^ 0x5bd1e995);
  const ids = team || rng.shuffle(HERO_ORDER).slice(0, 3);
  const run = newRun(meta, ids, seed);
  const deaths = [];
  for (let guard = 0; guard < 200 && run.phase !== 'over'; guard++) {
    if (run.phase === 'checkpoint') { continueRun(run); continue; }
    if (run.phase === 'map') {
      const doors = floorOf(run).doors;
      const hurt = run.team.reduce((n, h) => n + h.hp / h.hpMax, 0) / 3 < 0.5;
      let i = doors.findIndex(d => d.type === (hurt ? 'rest' : 'elite'));
      if (i < 0) i = doors.findIndex(d => d.type === 'chest');
      if (i < 0) i = rng.int(0, doors.length - 1);
      chooseDoor(run, i);
      continue;
    }
    if (run.phase === 'battle') {
      const B = createBattle(battleConfig(run, meta));
      autoFight(B, { smart });
      finishBattle(run, B.over, heroResults(B), foesOf(B).filter(f => f.hp <= 0).length);
      if (run.outcome === 'lose') deaths.push(run.floor);
      continue;
    }
    const p = run.pending;
    if (run.phase === 'reward' || p.kind === 'chest' || p.kind === 'train') { pickCard(run, 0, meta); continue; }
    if (p.kind === 'rest') { rest(run, run.team.some(h => h.hp < h.hpMax * 0.7) ? 'heal' : 'train', meta); continue; }
    if (p.kind === 'shop') { buy(run, 'pot', meta); buy(run, 'heal', meta); leaveRoom(run); continue; }
    if (p.kind === 'event') { resolveEvent(run, 0, meta); continue; }
    if (p.kind === 'event-done') { leaveRoom(run); continue; }
    throw new Error(`policy stuck in ${run.phase}/${p && p.kind}`);
  }
  const sum = endRun(meta, run);
  return { team: ids.join('+'), outcome: run.outcome, floor: run.floor, shards: sum.kept };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const n = +(process.argv[2] || 200), smart = process.argv[3] !== '0';
  const res = Array.from({ length: n }, (_, i) => simulateRun(1000 + i, { smart }));
  const wins = res.filter(r => r.outcome === 'win').length;
  const byFloor = {};
  for (const r of res) if (r.outcome === 'lose') byFloor[r.floor] = (byFloor[r.floor] || 0) + 1;
  console.log(`${n} expéditions (${smart ? 'joueur attentif' : 'sans intervention'}) : ${wins} victoires (${Math.round(100 * wins / n)} %)`);
  console.log('Défaites par étage :', JSON.stringify(byFloor));
  const teams = {};
  for (const r of res) { const t = teams[r.team] = teams[r.team] || [0, 0]; t[0]++; if (r.outcome === 'win') t[1]++; }
  if (process.env.TEAMS) console.log('Victoires par équipe :', Object.entries(teams).map(([k, [a, b]]) => `${k} ${b}/${a}`).join(' · '));
}
