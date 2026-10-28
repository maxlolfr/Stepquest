// An expedition: state and transitions, no DOM. The whole run is plain JSON so
// it can be saved after every step. The dungeon itself is not saved: it is
// rebuilt from run.seed, identical every time.
//
// Phases: map -> (battle -> reward | room) -> map … ; after each zone boss -> checkpoint ; over
import { makeRng, hashSeed } from '../core/rng.js';
import { HEROES } from '../data/heroes.js';
import { gearScore } from './loot.js';
import { BAL, XP } from '../data/balance.js';
import { EVENTS, RELICS, eventsForZone, activeSynergies } from '../data/items.js';
import { zoneOf, MONSTERS } from '../data/monsters.js';
import { CURSES, NIGHTMARE_UNLOCK, curseBonus, hasCurse } from '../data/progress.js';
import { recordRun } from './meta.js';
import { generateDungeon, isFight, isBossFloor } from './dungeon.js';
import { rewardCards, shopStock, upgradeCard, makeGear, statCard, blessOffer } from './loot.js';

export const RUN_VERSION = 3;

/** Older runs continue at the same floor, back on the map (the tower layout changed):
 *  v1 = 10-floor dungeon (v0.2), v2 = 50-floor tower with 5-floor zones (v0.3.0). */
export function migrateRun(r) {
  if (!r || typeof r !== 'object') return r;
  if (r.v === 1 || r.v === 2) {
    if (!['map', 'checkpoint', 'over'].includes(r.phase)) r.phase = 'map';
    r.door = null; r.pending = null; r.rerollN = 0;
    if (r.v === 1) { r.start = 1; r.bosses = 0; r.lv = 1 + 2 * Math.max(0, (r.floor | 0) - 1); r.xp = 0; r.floor = Math.max(1, Math.min(10, r.floor | 0)); }
    if (r.phase === 'checkpoint' && r.floor % 10 !== 1) r.phase = 'map'; // checkpoints are now every 10 floors
    r.start = r.start || 1; r.lv = r.lv || 1; r.xp = r.xp || 0;
    r.v = 3;
  }
  return r;
}

/** Start floors the player may choose (checkpoints unlocked in meta). */
export const startFloors = meta => BAL.startFloors.filter(f => f <= ((meta && meta.unlocked) || 1));

// ---------------------------------------------------------------- stats

export function heroStats(h, meta, lv = 1) {
  const S = HEROES[h.id].stats, b = h.bonus || {}, g = Object.values(h.gear || {});
  const sum = k => g.reduce((n, x) => n + (x.st[k] || 0), 0);
  const U = (meta && meta.upgrades) || {}, L = Math.max(0, (lv || 1) - 1);
  const base = k => S[k] + S.gr[k] * L; // level growth (Dragonbound II curves)
  const vie = 1 + 0.06 * (U.vie || 0), force = 1 + 0.05 * (U.force || 0), garde = 1 + 0.06 * (U.garde || 0);
  return {
    hpMax: Math.round((base('hp') * (1 + (b.hp || 0)) + sum('hp')) * vie),
    atk: Math.round((base('atk') * (1 + (b.atk || 0)) + sum('atk')) * force),
    mag: Math.round((base('mag') * (1 + (b.mag || 0)) + sum('mag')) * force),
    def: Math.round((base('def') * (1 + (b.def || 0)) + sum('def')) * garde),
    crit: +(S.crit + sum('crit')).toFixed(3),
    spd: S.spd,
  };
}

export function refreshTeam(run, meta) {
  for (const h of run.team) {
    const s = heroStats(h, meta, run.lv), old = h.hpMax || s.hpMax;
    h.hpMax = s.hpMax;
    if (s.hpMax > old && h.hp > 0) h.hp += s.hpMax - old; // max HP gains also heal
    h.hp = Math.max(0, Math.min(h.hpMax, Math.round(h.hp)));
  }
}

// ---------------------------------------------------------------- creation

/** Curses the player may pick (Nightmare mode: after the floor 10 boss). */
export const nightmareOpen = meta => ((meta && meta.unlocked) || 1) >= NIGHTMARE_UNLOCK;

export function newRun(meta, teamIds, seed, start = 1, curses = []) {
  if (!Array.isArray(teamIds) || teamIds.length !== 3 || new Set(teamIds).size !== 3 || !teamIds.every(id => HEROES[id])) throw new Error('Une équipe de 3 héros différents est nécessaire.');
  const up = meta.upgrades;
  if (!startFloors(meta).includes(start)) start = 1;
  const run = {
    v: RUN_VERSION, seed: seed >>> 0, floor: start, start, bosses: 0, phase: 'map',
    lv: 1 + 2 * (up.ecole || 0), xp: 0,
    team: teamIds.map(id => ({ id, hp: 1e9, hpMax: 0, up: {}, bonus: {}, gear: {}, el: 'phys' })),
    gold: BAL.startGold + 30 * up.or, items: { pot: BAL.startItems.pot + up.potion, fea: BAL.startItems.fea },
    relics: [], shards: 0, banked: 0, rerolls: up.relance, rerollN: 0,
    door: null, pending: null, path: [], outcome: null, stats: { fights: 0, kills: 0, elites: 0, cursedWon: 0, bossIds: [], synMax: 0 },
    curses: nightmareOpen(meta) ? [...new Set(curses)].filter(k => CURSES[k]) : [],
  };
  if (hasCurse(run, 'potion')) run.items.pot = 0;
  if (start > 1) { // checkpoint start: catch up with what a run would have gathered
    const k = (start - 1) / 10, Bn = BAL.startBonus(k), rng = makeRng(hashSeed(run.seed, 'start'));
    run.gold += Bn.gold; run.items.pot += Bn.pot; run.lv = Math.max(run.lv, Bn.lv);
    run.relics = rng.shuffle(Object.keys(RELICS)).slice(0, Math.max(0, Bn.relics - 1));
    for (const h of run.team) {
      for (const st of ['hp', 'atk', 'mag', 'def']) h.bonus[st] = +Bn.stat.toFixed(3);
      h.gear.w = makeGear('w', 1, Bn.gearFloor, h.id);
      h.gear.a = makeGear('a', rng.chance(0.5) ? 1 : 0, Bn.gearFloor, h.id);
    }
  }
  refreshTeam(run, meta);
  for (const h of run.team) h.hp = h.hpMax;
  if (start > 1) { // v0.6: the last starting relic is chosen, 1 out of 3, instead of drawn at random
    run.phase = 'reward';
    run.pending = { kind: 'reward', start: true, cards: rewardCards(run, makeRng(hashSeed(run.seed, 'startrelic')), start, 'boss') };
  }
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
  else if (d.type === 'event') run.pending = { kind: 'event', event: rng.weighted(eventsForZone(zoneOf(run.floor).index)).id };
  return d;
}

/** Arguments for createBattle(). */
export function battleConfig(run, meta) {
  const d = currentDoor(run);
  let foes = d.foes.map(f => ({ ...f }));
  if (hasCurse(run, 'rage')) for (const f of foes) f.atkMul *= 1.2;
  if (hasCurse(run, 'crown')) for (const f of foes) if (f.boss) f.hpMul *= 1.3;
  if (hasCurse(run, 'horde') && !foes.some(f => f.boss)) while (foes.length < 3) foes.push({ ...foes[0], elite: undefined, id: foes[foes.length - 1].id });
  return {
    heroes: run.team.map(h => ({ id: h.id, ...heroStats(h, meta, run.lv), hp: h.hp, el: h.el, up: h.up })),
    foes,
    curses: (run.curses || []).slice(),
    relics: run.relics.slice(),
    items: run.items, // shared: potions used in combat are gone
    seed: hashSeed(run.seed, run.floor, run.door, d.seed),
  };
}

/** Called when a fight ends. heroesAfter = heroResults(B). */
export function finishBattle(run, result, heroesAfter, kills = 0, meta = null, report = null) {
  const d = currentDoor(run);
  run.stats.fights++; run.stats.kills += kills;
  for (const r of heroesAfter) { const h = run.team.find(x => x.id === r.id); if (h) h.hp = r.hp; }
  if (result !== 'win') { run.phase = 'over'; run.outcome = 'lose'; run.report = report ? { ...report, floor: run.floor } : null; return; }
  for (const h of run.team) {
    if (h.hp <= 0) h.hp = Math.max(1, Math.round(h.hpMax * 0.2)); // fallen heroes get back up after a victory
    else if (!hasCurse(run, 'fire')) h.hp = Math.min(h.hpMax, h.hp + Math.round(h.hpMax * (BAL.afterFightHeal + (activeSynergies(run.relics).includes('lumiere') ? 0.1 : 0)))); // catch one's breath
  }
  const kind = d.type === 'fight' ? 'normal' : d.type, zm = BAL.zoneMul(zoneOf(run.floor).index);
  const [g0, g1] = BAL.gold[kind];
  const rng = rngFor(run, 'loot');
  const goldMul = (run.relics.includes('bourse') ? 1.3 : 1) * (d.foes.some(f => f.elite === 'gold') ? 2 : 1) * (hasCurse(run, 'gold') ? 0.6 : 1);
  run.gold += Math.round(rng.int(g0, g1) * BAL.goldMul(zoneOf(run.floor).index) * goldMul);
  run.shards += Math.round(BAL.shards[kind] * zm * (1 + curseBonus(run.curses)));
  const st = run.stats;
  if (kind === 'elite') st.elites = (st.elites || 0) + 1;
  if (kind === 'cursed') st.cursedWon = (st.cursedWon || 0) + 1;
  if (kind === 'boss') (st.bossIds = st.bossIds || []).push(d.foes[0].id);
  gainXp(run, XP.gain[kind], meta);
  if (d.type === 'boss') {
    run.bosses = (run.bosses || 0) + 1;
    if (run.floor >= BAL.floors) { run.phase = 'over'; run.outcome = 'win'; return; }
  }
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
    case 'relic':
      if (run.relics.includes(c.key) || !RELICS[c.key]) break;
      if (relicsFull(run)) { run.relicWait = c.key; break; } // v0.6: slots full, the player picks what to drop
      run.relics.push(c.key); run.stats.synMax = Math.max(run.stats.synMax || 0, activeSynergies(run.relics).length); break;
    case 'item': run.items[c.key] = (run.items[c.key] || 0) + 1; break;
    case 'bless': run.blessN = (run.blessN || 0) + 1; for (const x of run.team) for (const st of ['atk', 'mag', 'hp']) x.bonus[st] = +((x.bonus[st] || 0) + 0.05).toFixed(3); break;
    default: throw new Error(`Carte inconnue : ${c.type}`);
  }
  refreshTeam(run, meta);
}

export function pickCard(run, idx, meta) {
  const p = run.pending;
  if (!p || !p.cards || !p.cards[idx]) throw new Error('Aucune récompense à choisir');
  applyCard(run, p.cards[idx], meta);
  if (p.start) { run.pending = null; run.phase = 'map'; return; } // starting relic: the run begins
  if (holdRelic(run, 'advance')) return;
  advance(run);
}

// ---------------------------------------------------------------- relic slots (v0.6)
// A run holds at most BAL.relicMax relics. A new one beyond that opens a choice:
// drop one of the relics held (compared side by side), or leave the new one.
export const relicsFull = run => BAL.relicMax != null && run.relics.length >= BAL.relicMax;

function holdRelic(run, next, back = null, refund = 0) {
  if (!run.relicWait) return false;
  run.pending = { kind: 'replace', key: run.relicWait, next, back, refund };
  delete run.relicWait;
  run.phase = 'room';
  return true;
}

/** drop = key of a held relic to give up for the new one, or null to leave the new one. */
export function replaceRelic(run, drop, meta) {
  const p = run.pending;
  if (!p || p.kind !== 'replace') throw new Error('Aucune relique à remplacer');
  if (drop) {
    if (!run.relics.includes(drop)) throw new Error('Relique inconnue');
    run.relics = run.relics.filter(k => k !== drop).concat(p.key);
    run.stats.replaced = (run.stats.replaced || 0) + 1;
    run.stats.synMax = Math.max(run.stats.synMax || 0, activeSynergies(run.relics).length);
  } else if (p.refund) run.gold += p.refund; // bought at the shop and left: money back
  refreshTeam(run, meta);
  if (p.next === 'advance') { advance(run); return; }
  run.pending = p.back;
  run.phase = 'room';
}

export const canReroll = run => run.rerolls > 0 && run.pending && run.pending.kind === 'reward' && !run.pending.start;
export function reroll(run) {
  if (!canReroll(run)) return false;
  run.rerolls--; run.rerollN++;
  const d = currentDoor(run), kind = d.type === 'fight' ? 'normal' : d.type;
  run.pending.cards = rewardCards(run, rngFor(run, 'reward', run.rerollN), run.floor, kind);
  return true;
}

// ---------------------------------------------------------------- rooms

export const restHealPct = run => BAL.restHeal * (run.relics.includes('braises') ? 1.5 : 1) * (hasCurse(run, 'fire') ? 0.5 : 1);

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
  if (it.type !== 'item' && it.type !== 'bless') p.bought.push(id); // potions and blessings can be bought several times
  applyCard(run, it, meta);
  if (it.type === 'bless') Object.assign(it, blessOffer(run, run.floor)); // next one costs more
  holdRelic(run, 'back', p, it.price);
  return true;
}

export function canAfford(run, cost) {
  if (!cost) return true;
  if (cost.gold && cost.gold > run.gold) return false;
  if (cost.item && !(run.items[cost.item] > 0)) return false;
  return true;
}

export function resolveEvent(run, choiceIdx, meta) {
  const p = run.pending, E = p && EVENTS.find(e => e.id === p.event);
  if (!E) throw new Error('Pas d’événement');
  const c = E.choices[choiceIdx];
  if (!canAfford(run, c.cost)) return { ok: false, text: c.cost.item ? 'Tu n’en as pas.' : 'Pas assez d’or.' };
  if (c.cost && c.cost.gold) run.gold -= c.cost.gold;
  if (c.cost && c.cost.item) run.items[c.cost.item]--;
  const rng = rngFor(run, 'event', choiceIdx), out = [];
  const apply = e => {
    if (e.healPct) { applyCard(run, { type: 'heal', pct: e.healPct }, meta); out.push(`L’équipe récupère ${Math.round(e.healPct * 100)} % de vie.`); }
    if (e.dmgPct) { for (const h of run.team) if (h.hp > 0) h.hp = Math.max(1, h.hp - Math.round(h.hpMax * e.dmgPct)); out.push(`L’équipe perd ${Math.round(e.dmgPct * 100)} % de vie.`); }
    if (e.gold) { run.gold += e.gold; out.push(`+${e.gold} or.`); }
    if (e.shards) { run.shards += e.shards; out.push(`+${e.shards} éclats.`); }
    if (e.item) { run.items[e.item]++; out.push(e.item === 'pot' ? '+1 potion.' : '+1 plume de phénix.'); }
    for (let n = 0; n < (e.relic === true ? 1 : e.relic || 0); n++) {
      const free = Object.keys(RELICS).filter(k => !run.relics.includes(k) && k !== run.relicWait);
      if (!free.length || (run.relicWait && relicsFull(run))) { run.gold += 40; out.push(free.length ? 'Une autre relique, mais plus de place : +40 or.' : 'Plus aucune relique à gagner : +40 or.'); continue; }
      const k = rng.pick(free); applyCard(run, { type: 'relic', key: k }, meta);
      out.push(run.relicWait === k ? `Relique trouvée : ${RELICS[k].name}. Tes emplacements sont pleins : choisis ce que tu gardes.` : `Relique obtenue : ${RELICS[k].name}.`);
    }
    if (e.stat) { const c2 = statCard(run, rng); applyCard(run, c2, meta); out.push(c2.desc); }
    if (e.gear) {
      const hero = rng.pick(run.team.map(h => h.id)), g = makeGear(rng.pick(['w', 'a', 'j']), rng.weighted([[1, 70], [2, 30]]), run.floor, hero);
      const h = run.team.find(x => x.id === hero), old = h.gear[g.slot];
      if (!old || gearBetter(g, old)) { applyCard(run, { type: 'gear', gear: g, hero }, meta); out.push(`${g.name} équipé.`); }
      else { run.gold += 50; out.push(`${g.name} : moins bon que l’équipement actuel, revendu 50 or.`); }
    }
    if (e.element) {
      const free = run.team.filter(h => h.el !== e.element), h = free.length ? rng.pick(free) : null;
      if (h) { h.el = e.element; out.push(`L’attaque de base de ${HEROES[h.id].name} devient de type feu.`); }
    }
    if (e.upgrade) { const c2 = upgradeCard(run, rng, run.floor); applyCard(run, c2, meta); out.push(c2.desc); }
    if (e.gamble) { const won = rng.chance(e.gamble.p); out.push(won ? 'Le coffre s’ouvre !' : 'Un piège se déclenche !'); apply(won ? e.gamble.win : e.gamble.lose); }
  };
  apply(c.effect);
  if (!out.length) out.push('Tu reprends ta route.');
  run.pending = { kind: 'event-done', event: E.id, text: out.join(' ') };
  const text = run.pending.text;
  holdRelic(run, 'back', run.pending);
  return { ok: true, text };
}

export function leaveRoom(run) {
  if (run.phase !== 'room' && run.phase !== 'reward') throw new Error('Rien à quitter');
  advance(run);
}

/** Team XP; returns the number of levels gained (also kept in run.lvUp for the UI). */
export function gainXp(run, n, meta) {
  let ups = 0;
  run.xp += n;
  while (run.lv < XP.max && run.xp >= XP.need(run.lv)) { run.xp -= XP.need(run.lv); run.lv++; ups++; }
  if (run.lv >= XP.max) run.xp = 0;
  run.lvUp = ups;
  if (ups) refreshTeam(run, meta);
  return ups;
}

const gearBetter = (g, old) => gearScore(g) > gearScore(old);

// ---------------------------------------------------------------- progress

export function advance(run) {
  run.pending = null; run.door = null; run.rerollN = 0;
  if (isBossFloor(run.floor) && run.floor < BAL.floors) {
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
  if (run.debug) return debugSummary(run); // v0.6: test runs (?debug floor jump) never touch the real progress
  const o = run.outcome;
  let kept;
  const victory = Math.round(BAL.shards.victory * (1 + curseBonus(run.curses)));
  if (o === 'win') kept = run.banked + run.shards + victory;
  else if (o === 'retreat') kept = run.banked + run.shards;
  else kept = run.banked + Math.floor(run.shards * BAL.defeatKeep);
  const lost = run.banked + run.shards + (o === 'win' ? victory : 0) - kept;
  meta.shards += kept;
  const s = meta.stats;
  s.runs++; s.shardsEarned += kept;
  const reached = o === 'win' ? BAL.floors : Math.min(BAL.floors, run.floor);
  const record = reached > s.bestFloor;
  s.bestFloor = Math.max(s.bestFloor, reached);
  if (o === 'win') s.wins++; else if (o === 'retreat') s.retreats++; else s.defeats++;
  // checkpoints: beating the boss of floor 10, 20… unlocks a start at 11, 21…
  const lastBoss = o === 'win' ? BAL.floors : Math.floor((run.floor - 1) / BAL.zoneSize) * BAL.zoneSize;
  const before = meta.unlocked || 1;
  meta.unlocked = Math.max(before, ...BAL.startFloors.filter(f => f - 1 <= lastBoss && f <= BAL.floors));
  const st = run.stats;
  const summary = { outcome: o, kept, lost, banked: run.banked, floor: reached, bosses: run.bosses || 0, report: run.report || null, relics: run.relics.slice(), start: run.start || 1, record, unlocked: meta.unlocked > before ? meta.unlocked : 0, fights: st.fights, kills: st.kills,
    elites: st.elites || 0, cursedWon: st.cursedWon || 0, bossIds: (st.bossIds || []).slice(), synergies: st.synMax || 0, team: run.team.map(h => h.id), curses: (run.curses || []).slice(),
    nightmareOpened: before < NIGHTMARE_UNLOCK && meta.unlocked >= NIGHTMARE_UNLOCK };
  summary.abandoned = !!run.abandoned;
  summary.progress = recordRun(meta, summary, undefined, { rewards: !run.abandoned }); // achievements, daily objectives, journal
  return summary;
}

function debugSummary(run) {
  const st = run.stats;
  return { outcome: run.outcome, kept: 0, lost: 0, banked: 0, floor: Math.min(BAL.floors, run.floor), bosses: run.bosses || 0, report: run.report || null, relics: run.relics.slice(), start: run.start || 1, record: false, unlocked: 0,
    fights: st.fights, kills: st.kills, elites: st.elites || 0, cursedWon: st.cursedWon || 0, bossIds: [], synergies: st.synMax || 0, team: run.team.map(h => h.id), curses: (run.curses || []).slice(), nightmareOpened: false, debug: true, progress: { dailies: [], achievements: [], shards: 0 } };
}
