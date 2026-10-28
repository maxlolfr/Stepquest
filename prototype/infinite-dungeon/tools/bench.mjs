// v0.6 balance bench: measures what the audit asked for, with the real engine.
//   node tools/bench.mjs [section] [runs]
// sections: bosses | teams | doors | cards | relics | fights | all (default)
// Camp levels are a share of every upgrade bought (0, 25 %, 50 %, 100 %).
// Deterministic: same code + same arguments = same numbers.
import { makeRng } from '../js/core/rng.js';
import { HERO_ORDER, HEROES } from '../js/data/heroes.js';
import { UPGRADES, BAL } from '../js/data/balance.js';
import { BOSSES, ZONES } from '../js/data/monsters.js';
import { EVENTS, RELICS, activeSynergies } from '../js/data/items.js';
import * as C from '../js/engine/combat.js';
import * as R from '../js/run/run.js';
import { gearScore } from '../js/run/loot.js';
import { newMeta } from '../js/run/meta.js';

const teamHp = run => run.team.reduce((n, h) => n + Math.max(0, h.hp) / h.hpMax, 0) / 3;
export const campMeta = (lvl, unlocked = 1) => {
  const m = newMeta();
  for (const k in UPGRADES) m.upgrades[k] = Math.round(UPGRADES[k].costs.length * lvl);
  m.unlocked = unlocked;
  return m;
};
export const TEAMS = (() => { const out = []; for (let a = 0; a < 5; a++) for (let b = a + 1; b < 5; b++) for (let c = b + 1; c < 5; c++) out.push([HERO_ORDER[a], HERO_ORDER[b], HERO_ORDER[c]]); return out; })();

/** A sensible player's value for a card (same reading as tools/simulate.mjs). */
export function cardValue(run, c) {
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

/** One expedition. hooks: { door(run, doors) -> idx, card(run, cards) -> idx, onFight(info) } */
export function playRun(seed, { meta, team, start = 1, curses = [], hooks = {} }) {
  const rng = makeRng(seed ^ 0x2545f491);
  const ids = team || rng.shuffle(HERO_ORDER).slice(0, 3);
  const run = R.newRun(meta, ids, seed, start, curses);
  const log = { fights: [], doors: [], picks: [], offers: [], replaced: 0, bossTry: null, bossWin: false };
  for (let g = 0; g < 1500 && run.phase !== 'over'; g++) {
    if (run.phase === 'checkpoint') { R.continueRun(run); continue; }
    if (run.phase === 'map') {
      const doors = R.floorOf(run).doors, hp = teamHp(run);
      let i = hooks.door ? hooks.door(run, doors) : -1;
      if (i < 0) {
        const want = hp < 0.5 ? ['rest', 'event', 'chest', 'shop', 'fight'] : hp > 0.85 ? ['cursed', 'elite', 'chest', 'event', 'fight', 'shop', 'rest'] : hp > 0.75 ? ['elite', 'chest', 'event', 'fight', 'shop', 'rest'] : ['chest', 'event', 'fight', 'shop', 'rest', 'elite'];
        for (const t of want) { i = doors.findIndex(d => d.type === t); if (i >= 0) break; }
      }
      const d = R.chooseDoor(run, i < 0 ? 0 : i);
      log.doors.push(d.type);
      continue;
    }
    if (run.phase === 'battle') {
      const d = R.currentDoor(run), B = C.createBattle(R.battleConfig(run, meta));
      const hp0 = teamHp(run), gold0 = run.gold;
      if (hooks.fight) hooks.fight(B, d, run); else C.autoFight(B);
      const rep = C.fightReport(B);
      R.finishBattle(run, B.over, C.heroResults(B), C.foesOf(B).filter(f => f.hp <= 0).length, meta, rep);
      const info = { type: d.type, floor: run.floor, won: B.over === 'win', rounds: B.round, timeout: !!rep.timeout, enraged: !!B.enraged, hpLost: hp0 - (B.over === 'win' ? teamHpRaw(B) : 0), gold: run.gold - gold0, boss: d.type === 'boss' ? d.foes[0].id : null };
      log.fights.push(info);
      if (info.boss) { log.bossTry = info.boss; log.bossWin = info.won; }
      if (hooks.onFight) hooks.onFight(info, run);
      continue;
    }
    const p = run.pending;
    if (p.kind === 'replace') { // v0.6: relic slots full
      const k = hooks.replace ? hooks.replace(run, p) : defaultReplace(run, p);
      R.replaceRelic(run, k, meta); log.replaced += k ? 1 : 0; continue;
    }
    if (run.phase === 'reward' || p.kind === 'chest' || p.kind === 'train') {
      log.offers.push(...p.cards.map(c => c.type));
      let i = hooks.card ? hooks.card(run, p.cards) : -1;
      if (i < 0) i = p.cards.reduce((b, c, j) => (cardValue(run, c) > cardValue(run, p.cards[b]) ? j : b), 0);
      log.picks.push(p.cards[i].type);
      R.pickCard(run, i, meta); continue;
    }
    if (p.kind === 'rest') { R.rest(run, teamHp(run) < 0.8 ? 'heal' : 'train', meta); continue; }
    if (p.kind === 'shop') {
      if (hooks.shop) hooks.shop(run, p, meta);
      else {
        if (teamHp(run) < 0.6) R.buy(run, 'heal', meta);
        if (run.items.pot < 3) R.buy(run, 'pot', meta);
        R.buy(run, 'relic', meta);
        const gd = p.stock.find(s => s.id === 'gear'); if (gd && cardValue(run, gd) > 3) R.buy(run, 'gear', meta);
        R.buy(run, 'up', meta);
        for (const s of p.stock) if (s.late) R.buy(run, s.id, meta); // v0.6 late-game offers
        if (run.items.fea < 1) R.buy(run, 'fea', meta);
      }
      if (run.phase === 'room' && run.pending && run.pending.kind === 'replace') continue;
      R.leaveRoom(run); continue;
    }
    if (p.kind === 'event') {
      const E = EVENTS.find(e => e.id === p.event);
      const ok = E.choices.map((c, k) => k).filter(k => R.canAfford(run, E.choices[k].cost));
      const k = teamHp(run) < 0.5 ? ok.find(k => !E.choices[k].effect.dmgPct && !E.choices[k].effect.gamble) ?? ok[0] : ok[0];
      R.resolveEvent(run, k ?? 1, meta); continue;
    }
    if (p.kind === 'event-done') { R.leaveRoom(run); continue; }
    throw new Error(`bench stuck in ${run.phase}/${p && p.kind}`);
  }
  return { run, log, team: ids, floor: run.outcome === 'win' ? BAL.floors : run.floor, outcome: run.outcome };
}
const teamHpRaw = B => C.heroesOf(B).reduce((n, h) => n + Math.max(0, h.hp) / h.hpMax, 0) / 3;

/** Relic to drop when slots are full: the one outside the run's main styles. */
export function defaultReplace(run, p) {
  const tags = {}; for (const k of run.relics) { const t = RELICS[k].tag; if (t) tags[t] = (tags[t] || 0) + 1; }
  const score = k => { const t = RELICS[k].tag; return t ? (tags[t] || 0) + (k === p.key ? 1 : 0) : 0.5; };
  const all = [...run.relics, p.key];
  const worst = all.reduce((w, k) => (score(k) < score(w) ? k : w), all[0]);
  return worst === p.key ? null : worst;
}

// ---------------------------------------------------------------- stats helpers
const med = a => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };
const avg = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
const pc = (a, b) => (b ? Math.round(100 * a / b) : 0);
export const LEVELS = [0, 0.25, 0.5, 1];

/** Win rate against each zone boss, starting from that zone's checkpoint. */
export function benchBosses(N = 120, levels = LEVELS) {
  const out = {};
  for (const lvl of levels) {
    out[lvl] = ZONES.map(z => {
      const start = z.index * 10 + 1, meta = () => campMeta(lvl, start);
      let tries = 0, wins = 0, rounds = [], timeouts = 0;
      for (let i = 0; i < N; i++) {
        const r = playRun(50000 + z.index * 1000 + i, { meta: meta(), start, hooks: { onFight: f => { if (f.boss === z.boss) { tries++; if (f.won) wins++; rounds.push(f.rounds); if (f.timeout) timeouts++; } } } });
        void r;
      }
      return { boss: BOSSES[z.boss].name, tries, wins, rate: pc(wins, tries), rounds: med(rounds), p90: q(rounds, 0.9), timeouts };
    });
  }
  return out;
}

/** Floor reached by each of the 10 teams. */
export function benchTeams(N = 60, levels = [0, 0.5]) {
  const out = {};
  for (const lvl of levels) out[lvl] = TEAMS.map(t => {
    const fl = []; for (let i = 0; i < N; i++) fl.push(playRun(70000 + i, { meta: campMeta(lvl), team: t }).floor);
    return { team: t.join('+'), mean: +avg(fl).toFixed(1), med: med(fl) };
  });
  return out;
}

/** Cost and reward of each door type, and how fights end. */
export function benchDoors(N = 300, lvl = 0) {
  const by = {}, all = [];
  for (let i = 0; i < N; i++) {
    const { log } = playRun(90000 + i, { meta: campMeta(lvl) });
    for (const f of log.fights) { const b = by[f.type] = by[f.type] || { n: 0, lost: 0, dead: 0, hp: [], gold: [] }; b.n++; if (!f.won) b.dead++; else b.hp.push(f.hpLost); b.gold.push(f.gold); all.push(f); }
  }
  const rounds = all.map(f => f.rounds);
  return { doors: Object.fromEntries(Object.entries(by).map(([k, b]) => [k, { n: b.n, deathPct: +(100 * b.dead / b.n).toFixed(1), hpLost: Math.round(100 * avg(b.hp)), gold: Math.round(avg(b.gold)) }])),
    fights: { n: all.length, med: med(rounds), p90: q(rounds, 0.9), p99: q(rounds, 0.99), timeouts: all.filter(f => f.timeout).length, enraged: all.filter(f => f.enraged).length } };
}

/** Card value: force one card type whenever offered, compare the mean floor. */
export function benchCards(N = 200, lvl = 0) {
  const types = ['baseline', 'heal', 'stat', 'upgrade', 'element', 'gear', 'relic'], out = {};
  for (const t of types) {
    const fl = [], seen = { offered: 0, picked: 0 };
    for (let i = 0; i < N; i++) fl.push(playRun(110000 + i, { meta: campMeta(lvl), hooks: { card: (run, cards) => { const j = cards.findIndex(c => c.type === t); if (j >= 0) seen.picked++; return j; } } }).floor);
    out[t] = { mean: +avg(fl).toFixed(1), med: med(fl), forced: seen.picked };
  }
  // natural pick rate with the default player
  const off = {}, pick = {};
  for (let i = 0; i < N; i++) { const { log } = playRun(130000 + i, { meta: campMeta(lvl) }); for (const c of log.offers) off[c] = (off[c] || 0) + 1; for (const c of log.picks) pick[c] = (pick[c] || 0) + 1; }
  out.pickRate = Object.fromEntries(Object.keys(off).map(k => [k, `${pick[k] || 0}/${off[k]} (${pc(pick[k] || 0, off[k])} %)`]));
  return out;
}

/** End-of-run relics: count, synergies, how many different builds. */
export function benchRelics(N = 200, lvl = 0.5) {
  const cnt = [], syn = [], sets = new Set(), synSets = new Set(), repl = [], fl = [];
  for (let i = 0; i < N; i++) {
    const { run, log, floor } = playRun(150000 + i, { meta: campMeta(lvl) });
    cnt.push(run.relics.length); const s = activeSynergies(run.relics); syn.push(s.length);
    sets.add(run.relics.slice().sort().join(',')); synSets.add(s.sort().join(',')); repl.push(log.replaced); fl.push(floor);
  }
  return { relics: +avg(cnt).toFixed(1), synergies: +avg(syn).toFixed(1), distinctBuilds: sets.size, distinctSynergyMixes: synSets.size, replacements: +avg(repl).toFixed(1), floor: +avg(fl).toFixed(1), median: med(fl) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const sec = process.argv[2] || 'all', n = +(process.argv[3] || 0) || undefined;
  const show = (t, o) => console.log(`\n== ${t}\n` + JSON.stringify(o, null, 1).replace(/\n\s+(?=[^"{\[]*[,}\]])/g, ' '));
  if (sec === 'bosses' || sec === 'all') { const b = benchBosses(n); for (const l in b) console.log(`\n== boss, camp ${l * 100} % : ` + b[l].map(x => `${x.boss} ${x.rate}% (${x.wins}/${x.tries}, ${x.rounds}t p90 ${x.p90}${x.timeouts ? `, ${x.timeouts} délais` : ''})`).join(' · ')); }
  if (sec === 'teams' || sec === 'all') { const t = benchTeams(n); for (const l in t) console.log(`\n== équipes, camp ${l * 100} % : ` + t[l].slice().sort((a, b) => b.mean - a.mean).map(x => `${x.team} ${x.mean}`).join(' · ')); }
  if (sec === 'doors' || sec === 'all') show('portes (camp 0)', benchDoors(n));
  if (sec === 'cards' || sec === 'all') show('cartes (camp 0)', benchCards(n));
  if (sec === 'relics' || sec === 'all') show('reliques (camp 50 %)', benchRelics(n));
}
