// An expedition: state and transitions, no DOM. The whole run is plain JSON so
// it can be saved after every step. The dungeon itself is not saved: it is
// rebuilt from run.seed, identical every time.
//
// Phases: map -> (battle -> reward | room) -> map … ; floor 5 -> checkpoint ; over
import { makeRng, hashSeed } from '../core/rng.js';
import { HEROES } from '../data/heroes.js';
import { BAL } from '../data/balance.js';
import { EVENTS, RELICS } from '../data/items.js';
import { generateDungeon, isFight } from './dungeon.js';
import { rewardCards, shopStock, upgradeCard } from './loot.js';

export const RUN_VERSION = 1;

// ---------------------------------------------------------------- stats

export function heroStats(h, meta) {
  const S = HEROES[h.id].stats, b = h.bonus || {}, g = Object.values(h.gear || {});
  const sum = k => g.reduce((n, x) => n + (x.st[k] || 0), 0);
  const vie = 1 + 0.08 * ((meta && meta.upgrades.vie) || 0);
  return {
    hpMax: Math.round((S.hp * (1 + (b.hp || 0)) + sum('hp')) * vie),
    atk: Math.round(S.atk * (1 + (b.atk || 0)) + sum('atk')),
    mag: Math.round(S.mag * (1 + (b.mag || 0)) + sum('mag')),
    def: Math.round(S.def * (1 + (b.def || 0)) + sum('def')),
    crit: +(S.crit + sum('crit')).toFixed(3),
    spd: S.spd,
  };
}

export function refreshTeam(run, meta) {
  for (const h of run.team) {
    const s = heroStats(h, meta), old = h.hpMax || s.hpMax;
    h.hpMax = s.hpMax;
    if (s.hpMax > old && h.hp > 0) h.hp += s.hpMax - old; // max HP gains also heal
    h.hp = Math.max(0, Math.min(h.hpMax, Math.round(h.hp)));
  }
}

// ---------------------------------------------------------------- creation

export function newRun(meta, teamIds, seed) {
  if (!Array.isArray(teamIds) || teamIds.length !== 3 || new Set(teamIds).size !== 3 || !teamIds.every(id => HEROES[id])) throw new Error('Une équipe de 3 héros différents est nécessaire.');
  const up = meta.upgrades;
  const run = {
    v: RUN_VERSION, seed: seed >>> 0, floor: 1, phase: 'map',
    team: teamIds.map(id => ({ id, hp: 1e9, hpMax: 0, up: {}, bonus: {}, gear: {}, el: 'phys' })),
    gold: BAL.startGold + 30 * up.or, items: { pot: BAL.startItems.pot + up.potion, fea: BAL.startItems.fea },
    relics: [], shards: 0, banked: 0, rerolls: up.relance, rerollN: 0,
    door: null, pending: null, path: [], outcome: null, stats: { fights: 0, kills: 0 },
  };
  refreshTeam(run, meta);
  for (const h of run.team) h.hp = h.hpMax;
  return run;
}

const dungeonCache = new Map();
export function dungeonOf(run) {
  if (!dungeonCache.has(run.seed)) { dungeonCache.clear(); dungeonCache.set(run.seed, generateDungeon(run.seed)); }
  return dungeonCache.get(run.seed);
}
export const floorOf = run => dungeonOf(run)[run.floor];
export const currentDoor = run => (run.door == null ? null : floorOf(run).doors[run.door]);
const rngFor = (run, ...tag) => makeRng(hashSeed(run.seed, run.floor, run.door, ...tag));

// ---------------------------------------------------------------- doors

export function chooseDoor(run, idx) {
  if (run.phase !== 'map') throw new Error(`chooseDoor en phase ${run.phase}`);
  const d = floorOf(run).doors[idx];
  if (!d) throw new Error('Porte inconnue');
  run.door = idx;
  run.path.push(d.type);
  if (isFight(d.type)) { run.phase = 'battle'; return d; }
  run.phase = 'room';
  const rng = rngFor(run, 'room');
  if (d.type === 'chest') run.pending = { kind: 'chest', cards: rewardCards(run, rng, run.floor, 'chest') };
  else if (d.type === 'rest') run.pending = { kind: 'rest' };
  else if (d.type === 'shop') run.pending = { kind: 'shop', stock: shopStock(run, rng, run.floor), bought: [] };
  else if (d.type === 'event') run.pending = { kind: 'event', event: rng.pick(EVENTS).id };
  return d;
}

/** Arguments for createBattle(). */
export function battleConfig(run, meta) {
  const d = currentDoor(run);
  return {
    heroes: run.team.map(h => ({ id: h.id, ...heroStats(h, meta), hp: h.hp, el: h.el, up: h.up })),
    foes: d.foes,
    relics: run.relics.slice(),
    items: run.items, // shared: potions used in combat are gone
    seed: hashSeed(run.seed, run.floor, run.door, d.seed),
  };
}

/** Called when a fight ends. heroesAfter = heroResults(B). */
export function finishBattle(run, result, heroesAfter, kills = 0) {
  const d = currentDoor(run);
  run.stats.fights++; run.stats.kills += kills;
  for (const r of heroesAfter) { const h = run.team.find(x => x.id === r.id); if (h) h.hp = r.hp; }
  if (result !== 'win') { run.phase = 'over'; run.outcome = 'lose'; return; }
  for (const h of run.team) if (h.hp <= 0) h.hp = Math.max(1, Math.round(h.hpMax * 0.2)); // fallen heroes get back up after a victory
  const kind = d.type === 'fight' ? 'normal' : d.type;
  const [g0, g1] = BAL.gold[kind];
  const rng = rngFor(run, 'loot');
  run.gold += Math.round(rng.int(g0, g1) * (run.relics.includes('bourse') ? 1.3 : 1));
  run.shards += BAL.shards[kind];
  if (d.type === 'boss') { run.phase = 'over'; run.outcome = 'win'; return; }
  run.pending = { kind: 'reward', cards: rewardCards(run, rngFor(run, 'reward', run.rerollN), run.floor, kind) };
  run.phase = 'reward';
}

// ---------------------------------------------------------------- cards

export function applyCard(run, c, meta) {
  const h = c.hero && run.team.find(x => x.id === c.hero);
  switch (c.type) {
    case 'heal': for (const x of run.team) x.hp = x.hp > 0 ? Math.min(x.hpMax, x.hp + Math.round(x.hpMax * c.pct)) : Math.round(x.hpMax * 0.3); break;
    case 'stat': h.bonus[c.stat] = +((h.bonus[c.stat] || 0) + c.pct).toFixed(3); break;
    case 'upgrade': h.up[c.skill] = (h.up[c.skill] || 0) + 1; break;
    case 'element': h.el = c.el; break;
    case 'gear': h.gear[c.gear.slot] = c.gear; break;
    case 'relic': if (!run.relics.includes(c.key) && RELICS[c.key]) run.relics.push(c.key); break;
    case 'item': run.items[c.key] = (run.items[c.key] || 0) + 1; break;
    default: throw new Error(`Carte inconnue : ${c.type}`);
  }
  refreshTeam(run, meta);
}

export function pickCard(run, idx, meta) {
  const p = run.pending;
  if (!p || !p.cards || !p.cards[idx]) throw new Error('Aucune récompense à choisir');
  applyCard(run, p.cards[idx], meta);
  advance(run);
}

export const canReroll = run => run.rerolls > 0 && run.pending && run.pending.kind === 'reward';
export function reroll(run) {
  if (!canReroll(run)) return false;
  run.rerolls--; run.rerollN++;
  const d = currentDoor(run), kind = d.type === 'fight' ? 'normal' : d.type;
  run.pending.cards = rewardCards(run, rngFor(run, 'reward', run.rerollN), run.floor, kind);
  return true;
}

// ---------------------------------------------------------------- rooms

export const restHealPct = run => BAL.restHeal * (run.relics.includes('braises') ? 1.5 : 1);

export function rest(run, choice, meta) {
  const p = run.pending;
  if (!p || p.kind !== 'rest') throw new Error('Pas de repos ici');
  if (choice === 'heal') { applyCard(run, { type: 'heal', pct: restHealPct(run) }, meta); advance(run); return null; }
  if (choice === 'train') {
    const rng = rngFor(run, 'train'), cards = [];
    for (let i = 0; i < 12 && cards.length < 3; i++) { const c = upgradeCard(run, rng, run.floor); if (!cards.some(x => x.hero === c.hero && x.skill === c.skill)) cards.push(c); }
    run.pending = { kind: 'train', cards };
    return run.pending;
  }
  throw new Error('Choix inconnu');
}

export function buy(run, id, meta) {
  const p = run.pending;
  if (!p || p.kind !== 'shop') return false;
  const it = p.stock.find(s => s.id === id);
  if (!it || p.bought.includes(id) || run.gold < it.price) return false;
  run.gold -= it.price;
  if (it.type !== 'item') p.bought.push(id); // potions can be bought several times
  applyCard(run, it, meta);
  return true;
}

export function resolveEvent(run, choiceIdx, meta) {
  const p = run.pending, E = p && EVENTS.find(e => e.id === p.event);
  if (!E) throw new Error('Pas d’événement');
  const c = E.choices[choiceIdx];
  if (c.cost && c.cost.gold > run.gold) return { ok: false, text: 'Pas assez d’or.' };
  if (c.cost) run.gold -= c.cost.gold;
  const rng = rngFor(run, 'event', choiceIdx), out = [];
  const apply = e => {
    if (e.healPct) { applyCard(run, { type: 'heal', pct: e.healPct }, meta); out.push(`L’équipe récupère ${Math.round(e.healPct * 100)} % de vie.`); }
    if (e.dmgPct) { for (const h of run.team) if (h.hp > 0) h.hp = Math.max(1, h.hp - Math.round(h.hpMax * e.dmgPct)); out.push(`L’équipe perd ${Math.round(e.dmgPct * 100)} % de vie.`); }
    if (e.gold) { run.gold += e.gold; out.push(`+${e.gold} or.`); }
    if (e.shards) { run.shards += e.shards; out.push(`+${e.shards} éclats.`); }
    if (e.item) { run.items[e.item]++; out.push(e.item === 'pot' ? '+1 potion.' : '+1 plume de phénix.'); }
    if (e.relic) { const free = Object.keys(RELICS).filter(k => !run.relics.includes(k)); if (free.length) { const k = rng.pick(free); applyCard(run, { type: 'relic', key: k }, meta); out.push(`Relique obtenue : ${RELICS[k].name}.`); } else { run.gold += 40; out.push('L’autel rend ton or.'); } }
    if (e.upgrade) { const c2 = upgradeCard(run, rng, run.floor); applyCard(run, c2, meta); out.push(c2.desc); }
    if (e.gamble) { const won = rng.chance(e.gamble.p); out.push(won ? 'Le coffre s’ouvre !' : 'Un piège se déclenche !'); apply(won ? e.gamble.win : e.gamble.lose); }
  };
  apply(c.effect);
  if (!out.length) out.push('Tu reprends ta route.');
  run.pending = { kind: 'event-done', event: E.id, text: out.join(' ') };
  return { ok: true, text: run.pending.text };
}

export function leaveRoom(run) {
  if (run.phase !== 'room' && run.phase !== 'reward') throw new Error('Rien à quitter');
  advance(run);
}

// ---------------------------------------------------------------- progress

export function advance(run) {
  run.pending = null; run.door = null; run.rerollN = 0;
  if (run.floor === BAL.guardianFloor) {
    run.banked += run.shards; run.shards = 0; // checkpoint: shards are safe
    run.floor++; run.phase = 'checkpoint';
    return;
  }
  run.floor++;
  run.phase = run.floor > BAL.floors ? 'over' : 'map';
}

export const canRetreat = run => run.phase === 'checkpoint' || (run.phase === 'room' && run.pending && run.pending.kind === 'rest');

export function continueRun(run) { if (run.phase === 'checkpoint') run.phase = 'map'; }

export function retreat(run) {
  if (!canRetreat(run)) return false;
  run.phase = 'over'; run.outcome = 'retreat';
  return true;
}

/** Final shard count for the camp. Mutates meta, returns a summary. */
export function endRun(meta, run) {
  const o = run.outcome;
  let kept;
  if (o === 'win') kept = run.banked + run.shards + BAL.shards.victory;
  else if (o === 'retreat') kept = run.banked + run.shards;
  else kept = run.banked + Math.floor(run.shards * BAL.defeatKeep);
  const lost = run.banked + run.shards + (o === 'win' ? BAL.shards.victory : 0) - kept;
  meta.shards += kept;
  const s = meta.stats;
  s.runs++; s.shardsEarned += kept;
  s.bestFloor = Math.max(s.bestFloor, o === 'win' ? BAL.floors : Math.min(BAL.floors, run.floor));
  if (o === 'win') s.wins++; else if (o === 'retreat') s.retreats++; else s.defeats++;
  return { outcome: o, kept, lost, banked: run.banked, floor: run.floor, fights: run.stats.fights, kills: run.stats.kills };
}
