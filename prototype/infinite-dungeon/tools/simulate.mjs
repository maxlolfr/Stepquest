// Balance simulation: plays whole expeditions with the combat AI and a player
// policy that reads the cards, then prints where runs end.
//   node tools/simulate.mjs [runs]          fresh camp, start at floor 1
//   CAMPAIGN=1 node tools/simulate.mjs [n]  n players chaining runs: they spend
//                                           shards at the camp and start from their best checkpoint
//   TEAMS=1 / HEROES=1 / RELICS=1           extra breakdowns
import { makeRng } from '../js/core/rng.js';
import { HERO_ORDER, HEROES } from '../js/data/heroes.js';
import { UPGRADES, BAL } from '../js/data/balance.js';
import { createBattle, autoFight, heroResults, foesOf } from '../js/engine/combat.js';
import { newRun, chooseDoor, battleConfig, finishBattle, pickCard, rest, buy, resolveEvent, leaveRoom, continueRun, floorOf, endRun, startFloors, canAfford } from '../js/run/run.js';
import { gearScore } from '../js/run/loot.js';
import { EVENTS } from '../js/data/items.js';
import { newMeta, buyUpgrade, upgradeCost } from '../js/run/meta.js';

const teamHp = run => run.team.reduce((n, h) => n + Math.max(0, h.hp) / h.hpMax, 0) / 3;

/** How much a card is worth to a sensible player. */
function cardValue(run, c) {
  const hp = teamHp(run), h = c.hero && run.team.find(x => x.id === c.hero);
  switch (c.type) {
    case 'heal': return hp < 0.45 ? 9 : hp < 0.65 ? 5 : 1;
    case 'relic': return 6;
    case 'gear': return gearScore(c.gear) > gearScore(h.gear[c.gear.slot]) * 1.15 ? 4 + (gearScore(c.gear) - gearScore(h.gear[c.gear.slot])) / 25 : 0.5;
    case 'stat': return c.stat === 'hp' || c.stat === 'def' ? 3.5 : 4.5;
    case 'upgrade': return 4;
    case 'element': return h.el === 'phys' ? 3.5 : 0.5;
    default: return 1;
  }
}
const bestIdx = (run, cards) => cards.reduce((b, c, i) => (cardValue(run, c) > cardValue(run, cards[b]) ? i : b), 0);

export function simulateRun(seed, { team, smart = true, meta = newMeta(), start = 1 } = {}) {
  const rng = makeRng(seed ^ 0x5bd1e995);
  const ids = team || rng.shuffle(HERO_ORDER).slice(0, 3);
  const run = newRun(meta, ids, seed, start);
  for (let guard = 0; guard < 1000 && run.phase !== 'over'; guard++) {
    if (run.phase === 'checkpoint') { continueRun(run); continue; }
    if (run.phase === 'map') {
      const doors = floorOf(run).doors, hp = teamHp(run);
      const want = hp < 0.5 ? ['rest', 'event', 'chest', 'shop', 'fight'] : hp > 0.75 ? ['elite', 'chest', 'event', 'fight', 'shop', 'rest'] : ['chest', 'event', 'fight', 'shop', 'rest', 'elite'];
      let i = -1;
      for (const t of want) { i = doors.findIndex(d => d.type === t); if (i >= 0) break; }
      chooseDoor(run, i < 0 ? 0 : i);
      continue;
    }
    if (run.phase === 'battle') {
      const B = createBattle(battleConfig(run, meta));
      autoFight(B, { smart });
      finishBattle(run, B.over, heroResults(B), foesOf(B).filter(f => f.hp <= 0).length, meta);
      continue;
    }
    const p = run.pending;
    if (run.phase === 'reward' || p.kind === 'chest' || p.kind === 'train') { pickCard(run, smart ? bestIdx(run, p.cards) : 0, meta); continue; }
    if (p.kind === 'rest') { rest(run, teamHp(run) < 0.8 ? 'heal' : 'train', meta); continue; }
    if (p.kind === 'shop') {
      if (teamHp(run) < 0.6) buy(run, 'heal', meta);
      if (run.items.pot < 3) buy(run, 'pot', meta);
      if (smart) { buy(run, 'relic', meta); const g = p.stock.find(s => s.id === 'gear'); if (g && cardValue(run, g) > 3) buy(run, 'gear', meta); buy(run, 'up', meta); }
      if (run.items.fea < 1) buy(run, 'fea', meta);
      leaveRoom(run); continue;
    }
    if (p.kind === 'event') {
      const E = EVENTS.find(e => e.id === p.event);
      const ok = E.choices.map((c, k) => k).filter(k => canAfford(run, E.choices[k].cost));
      const hurt = teamHp(run) < 0.5;
      const k = hurt ? ok.find(k => !E.choices[k].effect.dmgPct && !(E.choices[k].effect.gamble)) ?? ok[0] : ok[0];
      resolveEvent(run, k ?? 1, meta); continue;
    }
    if (p.kind === 'event-done') { leaveRoom(run); continue; }
    throw new Error(`policy stuck in ${run.phase}/${p && p.kind}`);
  }
  const sum = endRun(meta, run);
  return { team: ids, outcome: run.outcome, floor: sum.floor, start, shards: sum.kept, relics: run.relics.slice(), run };
}

/** A player chaining expeditions: spends shards, starts at the best checkpoint. */
export function simulateCampaign(seed, { maxRuns = 80 } = {}) {
  const meta = newMeta(), rng = makeRng(seed), floors = [];
  for (let r = 0; r < maxRuns; r++) {
    for (let bought = true; bought;) {
      bought = false;
      const keys = Object.keys(UPGRADES).filter(k => upgradeCost(meta, k) != null).sort((a, b) => upgradeCost(meta, a) - upgradeCost(meta, b));
      for (const k of keys) if (buyUpgrade(meta, k)) { bought = true; break; }
    }
    const starts = startFloors(meta), start = starts[starts.length - 1];
    const res = simulateRun(seed * 1000 + r, { meta, start, team: rng.shuffle(HERO_ORDER).slice(0, 3) });
    floors.push(res.floor);
    if (res.outcome === 'win') return { runs: r + 1, floors, won: true };
  }
  return { runs: maxRuns, floors, won: false };
}

const median = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

if (import.meta.url === `file://${process.argv[1]}`) {
  const n = +(process.argv[2] || 200);
  if (process.env.CAMPAIGN) {
    const res = Array.from({ length: n }, (_, i) => simulateCampaign(1 + i));
    const won = res.filter(r => r.won);
    console.log(`${n} joueurs : ${won.length} ont fini la tour, en ${median(won.map(r => r.runs)) ?? '-'} expéditions (médiane)`);
    for (const k of [1, 3, 5, 10, 20, 30]) console.log(`  expédition ${k} : étage médian ${median(res.filter(r => r.floors.length >= k).map(r => r.floors[k - 1])) ?? '-'}`);
  } else {
    const start = +(process.env.START || 1);
    const res = Array.from({ length: n }, (_, i) => simulateRun(1000 + i, { start, smart: process.env.SMART !== '0' }));
    const byZone = {};
    for (const r of res) { const z = Math.floor((r.floor - 1) / BAL.zoneSize) + 1; byZone[z] = (byZone[z] || 0) + 1; }
    console.log(`${n} expéditions depuis l’étage ${start} (camp vide) : étage médian ${median(res.map(r => r.floor))}, victoires ${res.filter(r => r.outcome === 'win').length}`);
    console.log('Fin par zone :', JSON.stringify(byZone), '· boss 1 battu :', Math.round(100 * res.filter(r => r.floor > BAL.zoneSize).length / n) + ' %', '· boss 2 :', Math.round(100 * res.filter(r => r.floor > 2 * BAL.zoneSize).length / n) + ' %');
    if (process.env.HEROES) console.log('Étage médian par héros :', HERO_ORDER.map(h => `${HEROES[h].name} ${median(res.filter(r => r.team.includes(h)).map(r => r.floor))} (moy ${(res.filter(r => r.team.includes(h)).reduce((a, r) => a + r.floor, 0) / res.filter(r => r.team.includes(h)).length).toFixed(1)})`).join(' · '));
  }
}
