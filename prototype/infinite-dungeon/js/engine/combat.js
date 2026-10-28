// Combat engine: pure, deterministic, no DOM. Every call returns a list of events
// that the battle view plays back (animations, numbers, sounds). Same seed and same
// player actions = same fight, which the tests rely on.
//
//   const B = createBattle({ heroes, foes, relics, seed });
//   while (!B.over) events = step(B);        // one unit acts
//   castUltimate(B, uid) / useGuard(B) / useItem(B, 'pot')   // player interventions
import { makeRng } from '../core/rng.js';
import { HEROES, SKILLS } from '../data/heroes.js';
import { AFFIXES, unitDef } from '../data/monsters.js';
import { activeSynergies } from '../data/items.js';
import { BAL } from '../data/balance.js';

// ---------------------------------------------------------------- setup

/**
 * heroes: [{ id, hp, hpMax, atk, mag, def, crit, spd, el, up: {skill: n} }]  (run state, already with gear)
 * foes:   [{ id, hpMul, atkMul, defMul, elite?: affixKey, boss? }]
 * relics: array of relic keys. items: { pot, fea } (shared with the run, mutated).
 */
export function createBattle({ heroes, foes, relics = [], items = { pot: 0, fea: 0 }, seed = 1, curses = [] }) {
  const rng = makeRng(seed), R = new Set(relics);
  const B = { rng, curses: new Set(curses), relics: R, syn: new Set(activeSynergies(relics)), items, round: 0, enraged: 0, enrageMul: 1, queue: [], units: [], over: null, uidN: 0, guardLeft: R.has('sceau') ? 2 : 1, guardUntil: -1,
    seleneSave: true, starSave: R.has('etoile'), log: [], foeTurns: 0, stats: { dealt: 0, taken: 0 },
    report: { by: {}, last: null, ko: null, potUsed: 0 } }; // why a fight was lost (defeat screen)
  heroes.forEach((h, i) => B.units.push(makeHero(B, h, i)));
  foes.forEach((f, i) => B.units.push(makeFoe(B, f, i, foes.length)));
  return B;
}

function baseUnit(B, side, slot) {
  return { uid: ++B.uidN, side, slot, st: { poison: null, burn: null, stun: 0, freeze: 0, mark: 0, shadow: 0, taunt: 0 }, shield: 0, ult: 0, cd: {}, acted: false };
}

function makeHero(B, h, slot) {
  const H = HEROES[h.id], u = baseUnit(B, 'h', slot);
  Object.assign(u, { id: h.id, name: H.name, sprite: H.sprite, melee: H.melee, hpMax: h.hpMax, hp: h.hp, atk: h.atk, mag: h.mag, def: h.def, crit: h.crit, spd: h.spd,
    el: h.el || 'phys', up: h.up || {}, skills: H.skills.slice(), rage: 0, charges: 0, h: 0.25 });
  for (const k of u.skills) u.cd[k] = B.relics.has('clarte') ? 0 : Math.floor(SKILLS[k].cd / 2);
  if (B.relics.has('colere')) u.ult = 30;
  if (B.relics.has('rempart') && u.hp > 0) u.shield = Math.round(u.hpMax * 0.15);
  if (B.syn.has('riposte') && u.hp > 0) u.shield += Math.round(u.hpMax * 0.1);
  return u;
}

function makeFoe(B, f, slot, n) {
  const M = unitDef(f.id), u = baseUnit(B, 'f', slot);
  const kind = M.boss ? BAL.boss : f.elite ? BAL.elite : { hp: 1, atk: 1 };
  const hpMax = Math.round(M.hp * f.hpMul * kind.hp);
  Object.assign(u, { id: f.id, name: M.name, sprite: f.id, m: M, boss: !!M.boss, hpMax, hp: hpMax, atk: Math.round(M.atk * f.atkMul * kind.atk), mag: 0,
    def: Math.round(M.def * (f.defMul || 1)), crit: 0.05, spd: M.boss ? 8 : spdOf(M), trait: M.trait || '', w: M.w || [], r: M.r || [], h: M.h, n,
    risen: false, charge: null, turn: 0, wall: 0, phase: 1, fly: !!M.fly, mul: { hp: f.hpMul, atk: f.atkMul, def: f.defMul || 1 },
    special: M.special || null, phaseDef: M.phase || null, thornsPct: 0, stolen: 0 });
  if (f.elite && AFFIXES[f.elite]) {
    const A = AFFIXES[f.elite];
    u.aff = f.elite; u.affCol = A.col; u.affName = A.n[0].toUpperCase() + A.n.slice(1); u.name = `${M.name} ${A.n}`;
    if (f.elite === 'armor') u.shield = Math.round(u.hpMax * 0.3);
    if (f.elite === 'thorns') u.thornsPct = 0.25;
  }
  u.elite = !!f.elite;
  return u;
}

// Monster speed from its traits (Dragonbound II has no speed stat).
const spdOf = M => (M.trait === 'double' ? 12 : M.trait === 'slow' ? 6 : M.fly ? 12 : 9);

// ---------------------------------------------------------------- helpers

export const alive = u => u.hp > 0;
export const heroesOf = B => B.units.filter(u => u.side === 'h');
export const foesOf = B => B.units.filter(u => u.side === 'f');
const livingH = B => heroesOf(B).filter(alive);
const livingF = B => foesOf(B).filter(alive);
const byUid = (B, uid) => B.units.find(u => u.uid === uid);
const pct = u => u.hp / u.hpMax;
export const unitByUid = byUid;

function endCheck(B, ev) {
  if (B.over) return;
  if (!livingF(B).length) { B.over = 'win'; ev.push({ t: 'end', result: 'win' }); }
  else if (!livingH(B).length) { B.over = 'lose'; ev.push({ t: 'end', result: 'lose' }); }
}

function gainUlt(u, n, B) { if (u.side === 'h' && alive(u)) u.ult = Math.min(BAL.ultMax, u.ult + n * (B && B.syn.has('arcanes') ? 1.3 : 1)); }

// ---------------------------------------------------------------- damage

function calc(B, a, t, pow, stat = 'atk', el = 'phys', { forceCrit = false, critBonus = 0 } = {}) {
  let d = a[stat] * pow * 40 / (40 + t.def) * B.rng.range(0.92, 1.08);
  if (a.side === 'f' && a.aff === 'enrage') d *= 1 + (1 - pct(a)) * 0.8;
  if (a.side === 'f' && B.enrageMul > 1) d *= B.enrageMul; // v0.6 fight enrage
  let weak = false, resist = false;
  if (t.side === 'f') {
    if (t.w.includes(el)) { d *= B.relics.has('prisme') ? 2 : 1.5; weak = true; } else if (t.r.includes(el)) { d *= 0.5; resist = true; }
    if (t.st.mark) d *= 1.2;
    if (B.relics.has('bourreau') && pct(t) < 0.35) d *= 1.3;
    if (B.relics.has('venin') && t.st.poison) d *= 1.35;
    if (B.relics.has('chasse') && t.st.mark) d *= 1.3;
  }
  let first = false;
  if (a.side === 'h' && B.relics.has('duel') && !a.dueled) { a.dueled = true; first = true; } // Lame de duel
  if (a.side === 'h' && B.relics.has('pierre') && pct(a) < 0.35) d *= 1.3;
  const crit = forceCrit || first || B.rng.chance(a.crit + critBonus + (a.side === 'h' && B.syn.has('crit') ? 0.1 : 0));
  if (crit) d *= a.side === 'h' && B.relics.has('assassin') ? 2 : 1.6;
  if (t.side === 'h') {
    if (B.round <= B.guardUntil) d *= B.syn.has('riposte') ? 0.3 : 0.5;
    if (t.st.taunt) d *= 0.8;
    if (B.relics.has('pierre') && pct(t) < 0.35) d *= 0.7;
  }
  return { d: Math.max(1, Math.round(d)), crit, weak, resist, el, stat };
}

/** Applies a hit. Returns damage dealt (0 if dodged). */
function hit(B, ev, a, t, r, { melee = false, noShadow = false } = {}) {
  if (!alive(t)) return 0;
  if (t.side === 'f' && (t.trait === 'evade' || t.aff === 'ghost') && B.rng.chance(0.25)) { ev.push({ t: 'miss', uid: t.uid, src: a.uid }); return 0; }
  let d = r.d, absorbed = 0;
  if (t.intangible && r.stat !== 'mag') { d = Math.max(1, Math.round(d * 0.3)); absorbed += r.d - d; }
  if (t.shieldTaken && foesOf(B).some(x => x.summoned && x.guards === t.uid && alive(x))) { const nd = Math.max(1, Math.round(d * t.shieldTaken)); absorbed += d - nd; d = nd; }
  // boss wall: its weakness breaks it twice as fast
  if (t.wall > 0) {
    const eff = r.el === t.wallWeak ? 2 : 1, take = Math.min(t.wall, d * eff);
    t.wall -= take; absorbed += take / eff; d -= take / eff; d = Math.round(d);
    if (t.wall <= 0) ev.push({ t: 'say', text: `La protection de ${t.name} cède !`, uid: t.uid, big: true });
  }
  const guarded = t.side === 'h' && (B.round <= B.guardUntil || t.shield > 0);
  if (t.shield > 0 && d > 0) { const s = Math.min(t.shield, d); t.shield -= s; d -= s; absorbed += s; }
  t.hp = Math.max(0, t.hp - d);
  if (t.side === 'h' && a.side === 'f') { const k = a.name; B.report.by[k] = (B.report.by[k] || 0) + d; B.report.last = { by: a.name, atk: B.curAtk || 'Attaque', boss: !!a.boss }; }
  B.stats[a.side === 'h' ? 'dealt' : 'taken'] += d;
  ev.push({ t: 'dmg', uid: t.uid, src: a.uid, amt: d, absorbed: Math.round(absorbed), crit: r.crit, weak: r.weak, resist: r.resist, el: r.el });
  if (t.side === 'h') { gainUlt(t, BAL.ultGainHit, B); if (t.id === 'aldric') t.rage = Math.min(5, t.rage + 1); }
  if (a.side === 'h') {
    if (a.id === 'nyx' && !noShadow && alive(t)) t.st.shadow = Math.min(3, t.st.shadow + 1);
    if (B.relics.has('vampire') && d > 0) heal(B, ev, a, Math.round(d * 0.1), { quiet: true });
    if (melee && t.thornsPct && alive(a)) { const back = Math.max(1, Math.round(d * t.thornsPct)); a.hp = Math.max(0, a.hp - back); ev.push({ t: 'dmg', uid: a.uid, src: t.uid, amt: back, el: 'phys', thorns: true }); checkKo(B, ev, a); }
  } else {
    if ((a.trait === 'drain' || a.aff === 'vamp') && d > 0) heal(B, ev, a, Math.round(d * 0.5), { quiet: true });
    if (a.trait === 'steal' && d > 0 && !a.stolen && B.items.pot > 0 && B.rng.chance(0.4)) { B.items.pot--; a.stolen++; ev.push({ t: 'say', text: `${a.name} vole une potion ! Tue-le pour la récupérer.`, uid: a.uid }); }
    // Écu à pointes: a guarded or shielded hero sends 40 % of the blow back (direct damage, no chain)
    if (guarded && B.relics.has('riposte') && alive(a) && alive(t)) {
      const back = Math.max(1, Math.round(r.d * 0.4)); a.hp = Math.max(0, a.hp - back);
      ev.push({ t: 'dmg', uid: a.uid, src: t.uid, amt: back, el: 'phys', thorns: true, riposte: true }); checkKo(B, ev, a);
    }
  }
  checkKo(B, ev, t);
  if (t.boss && t.phase === 1 && alive(t) && pct(t) <= 0.5 && t.phaseDef && t.phaseDef.kind !== 'rise') bossPhase2(B, ev, t);
  return d;
}

function checkKo(B, ev, t) {
  if (t.hp > 0) return;
  if (t.side === 'h' && B.seleneSave && t.id !== 'selena' && livingH(B).some(h => h.id === 'selena')) {
    B.seleneSave = false; t.hp = 1;
    ev.push({ t: 'say', text: `Séléna retient ${t.name} au bord de la mort !`, uid: t.uid });
    ev.push({ t: 'heal', uid: t.uid, amt: 1 });
    return;
  }
  if (t.side === 'f' && (t.trait === 'rise' || (t.phaseDef && t.phaseDef.kind === 'rise')) && !t.risen && !t.st.burn) {
    t.risen = true; t.hp = Math.round(t.hpMax * 0.5);
    ev.push({ t: 'ko', uid: t.uid }); ev.push({ t: 'revive', uid: t.uid, hp: t.hp, text: `${t.name} ${t.boss ? t.phaseDef.text : 'se relève !'}` });
    if (t.boss) { t.phase = 2; ev.push({ t: 'phase', uid: t.uid, text: `${t.name} ${t.phaseDef.text}` }); }
    return;
  }
  if (t.side === 'h' && B.starSave) {
    B.starSave = false; t.hp = Math.round(t.hpMax * 0.4);
    ev.push({ t: 'revive', uid: t.uid, hp: t.hp, text: `⭐ L’Étoile du matin relève ${t.name} !` });
    return;
  }
  if (t.side === 'h' && !B.report.ko) B.report.ko = { hero: t.name, ...(B.report.last || {}) };
  if (t.side === 'f' && t.st.poison && B.relics.has('peste')) {
    const others = livingF(B).filter(f => f !== t);
    if (others.length) {
      ev.push({ t: 'say', text: '🦠 La peste se propage !', uid: t.uid });
      for (const f of others) addStatus(B, ev, f, 'poison', t.st.poison.dmg, null);
    }
  }
  if (t.side === 'f' && t.stolen) { B.items.pot += t.stolen; ev.push({ t: 'say', text: `Potion récupérée ×${t.stolen} !`, uid: t.uid }); t.stolen = 0; }
  if (t.side === 'f' && t.aff === 'bomb') {
    ev.push({ t: 'say', text: `${t.name} explose !`, uid: t.uid, big: true });
    for (const h of livingH(B)) { const d = Math.min(h.hp - 1, Math.round(h.hpMax * 0.15)); if (d > 0) { h.hp -= d; ev.push({ t: 'dmg', uid: h.uid, src: t.uid, amt: d, el: 'feu' }); } }
  }
  t.st = { poison: null, burn: null, stun: 0, freeze: 0, mark: 0, shadow: 0, taunt: 0 }; t.shield = 0; t.charge = null; t.ult = t.side === 'h' ? t.ult : 0;
  ev.push({ t: 'ko', uid: t.uid });
}

function heal(B, ev, u, amt, { overShield = false, quiet = false } = {}) {
  if (!alive(u) || amt <= 0) return 0;
  if (u.side === 'f' && B.enraged) return 0; // enraged enemies no longer heal
  if (u.side === 'h') amt = Math.round(amt * (B.relics.has('calice') ? 1.3 : 1) * (B.syn.has('lumiere') ? 1.25 : 1));
  const room = u.hpMax - u.hp, g = Math.min(room, amt);
  u.hp += g;
  if (g > 0 || !quiet) ev.push({ t: 'heal', uid: u.uid, amt: g, quiet });
  if (overShield && amt > g) { const s = Math.round((amt - g) * 0.6); u.shield = Math.min(Math.round(u.hpMax * (B.relics.has('calice') ? 0.6 : 0.4)), u.shield + s); ev.push({ t: 'shield', uid: u.uid, amt: s }); }
  return g;
}

function addStatus(B, ev, t, key, value, src) {
  if (!alive(t)) return;
  if (t.side === 'h' && ((key === 'poison' && B.relics.has('antidote')) || (key === 'burn' && B.relics.has('ignifuge')))) { ev.push({ t: 'status', uid: t.uid, st: key, immune: true }); return; }
  if (t.boss && (key === 'stun' || key === 'freeze') && t.lastCc === B.round - 1) return; // no stun-lock on the boss
  if (key === 'poison') { const p = t.st.poison || { stacks: 0, t: 0, dmg: 0 }; p.stacks = Math.min(5, p.stacks + 1); p.t = 3; p.dmg = Math.max(p.dmg, Math.round(value)); t.st.poison = p; }
  else if (key === 'burn') t.st.burn = { t: 3, dmg: Math.round(value) };
  else if (key === 'stun' || key === 'freeze') { t.st[key] = 1; t.lastCc = B.round; if (t.charge) { ev.push({ t: 'say', text: `${t.name} est interrompu !`, uid: t.uid }); t.charge = null; } }
  else t.st[key] = value;
  ev.push({ t: 'status', uid: t.uid, st: key, src: src && src.uid });
}

// ---------------------------------------------------------------- turn order

function nextActor(B, ev) {
  for (;;) {
    while (B.queue.length) {
      const u = byUid(B, B.queue.shift());
      if (u && alive(u)) return u;
    }
    B.round++;
    if (B.round > BAL.maxRounds) { B.over = 'lose'; ev.push({ t: 'say', text: `Tour ${BAL.maxRounds} : le combat a trop duré, les héros s’effondrent, épuisés.`, big: true }); ev.push({ t: 'end', result: 'lose', timeout: true }); return null; }
    B.queue = B.units.filter(alive).sort((a, b) => b.spd - a.spd || (a.side === b.side ? a.slot - b.slot : a.side === 'h' ? -1 : 1)).map(u => u.uid);
    ev.push({ t: 'round', n: B.round });
    enrageTick(B, ev);
  }
}

// v0.6 — Enrage: from round BAL.enrage.from the enemies hit harder every round and
// stop healing, so a fight always ends long before the hard limit (BAL.maxRounds).
// Announced BAL.enrage.from - BAL.enrage.warn rounds ahead, then shown every round.
export function enrageInfo(B) {
  const E = BAL.enrage, n = Math.max(0, B.round - E.from + 1);
  if (n > 0) return { state: 'on', stacks: n, mul: B.enrageMul || 1 + E.step * n, left: BAL.maxRounds - B.round };
  return { state: B.round >= E.warn ? 'soon' : 'calm', in: E.from - B.round, mul: 1 };
}
function enrageTick(B, ev) {
  const E = BAL.enrage;
  if (B.round === E.warn) ev.push({ t: 'enrage', warn: true, in: E.from - E.warn, text: `Dans ${E.from - E.warn} tours, les ennemis vont s’enrager : finissez le combat !` });
  if (B.round < E.from) return;
  const n = B.round - E.from + 1;
  B.enraged = n; B.enrageMul = +(1 + E.step * n).toFixed(2);
  ev.push({ t: 'enrage', stacks: n, mul: B.enrageMul, first: n === 1,
    text: n === 1 ? `Les ennemis s’enragent ! +${Math.round(E.step * 100)} % d’attaque à chaque tour, et plus aucun soin pour eux.` : null });
}

/** Upcoming actors of this round (for the turn bar). */
export const upcoming = B => B.queue.map(uid => byUid(B, uid)).filter(u => u && alive(u));

// start-of-turn: damage over time, regeneration, timers. Returns false if the unit can't act.
function startTurn(B, ev, u) {
  const p = u.st.poison;
  // Fléau synergy (+50 %) and Brasier toxique (×2 when poisoned AND burning) on enemies
  const dot = u.side === 'f' ? (B.syn.has('fleau') ? 1.5 : 1) * (B.relics.has('brasier') && u.st.poison && u.st.burn ? 2 : 1) : 1;
  if (p) { const d = Math.round(p.dmg * p.stacks * dot); u.hp = Math.max(0, u.hp - d); ev.push({ t: 'dmg', uid: u.uid, amt: d, el: 'poison', dot: true }); if (--p.t <= 0) u.st.poison = null; checkKo(B, ev, u); }
  if (alive(u) && u.st.burn) { const b = u.st.burn, bd = Math.round(b.dmg * dot); u.hp = Math.max(0, u.hp - bd); ev.push({ t: 'dmg', uid: u.uid, amt: bd, el: 'feu', dot: true, combo: dot >= 2 }); if (--b.t <= 0) u.st.burn = null; checkKo(B, ev, u); }
  endCheck(B, ev);
  if (!alive(u) || B.over) return false;
  if (u.side === 'f') {
    // Regeneration (v0.5.1, was 8 % + 10 %): burning stops it, poison halves it, and it
    // fades as the fight drags on, so a regenerating enemy can always be worn down.
    if (!u.st.burn) {
      const pct = (u.trait === 'regen' ? BAL.regen.trait : 0) + (u.aff === 'regen' ? BAL.regen.affix : 0) + (u.regenPct || 0);
      const k = (u.st.poison ? 0.5 : 1) * Math.max(0.25, 1 - Math.max(0, B.round - BAL.regen.fadeFrom) * BAL.regen.fade);
      if (pct > 0) heal(B, ev, u, Math.round(u.hpMax * pct * k));
    }
  }
  if (u.st.mark > 0) u.st.mark--;
  if (u.st.taunt > 0) u.st.taunt--;
  if (u.side === 'h') for (const k of u.skills) if (u.cd[k] > 0) u.cd[k]--;
  if (u.st.stun || u.st.freeze) {
    const why = u.st.freeze ? 'gelé' : 'étourdi';
    u.st.stun = 0; u.st.freeze = 0;
    ev.push({ t: 'skip', uid: u.uid, why });
    return false;
  }
  return true;
}

// ---------------------------------------------------------------- public API

/** One unit acts. Returns events. */
export function step(B) {
  const ev = [];
  if (B.over) return ev;
  const u = nextActor(B, ev);
  if (!u) return ev;
  ev.push({ t: 'turn', uid: u.uid });
  if (startTurn(B, ev, u)) {
    if (u.side === 'h') heroTurn(B, ev, u); else foeTurn(B, ev, u);
  }
  endCheck(B, ev);
  return ev;
}

export const canUlt = (B, u) => !B.over && u && u.side === 'h' && alive(u) && u.ult >= BAL.ultMax;

export function castUltimate(B, uid) {
  const ev = [], u = byUid(B, uid);
  if (!canUlt(B, u)) return ev;
  u.ult = 0;
  ULTS[u.id](B, ev, u);
  if (B.relics.has('tempete')) for (const h of livingH(B)) if (h !== u) gainUlt(h, 25, B);
  endCheck(B, ev);
  return ev;
}

export const canGuard = B => !B.over && B.guardLeft > 0 && B.round > B.guardUntil;

export function useGuard(B) {
  const ev = [];
  if (!canGuard(B)) return ev;
  B.guardLeft--; B.guardUntil = B.round + 1;
  ev.push({ t: 'guard', until: B.guardUntil });
  ev.push({ t: 'say', text: '🛡️ Garde ! L’équipe encaisse 50 % de dégâts en moins jusqu’à la fin du tour suivant.' });
  return ev;
}

export function canItem(B, key) {
  if (B.over || !(B.items[key] > 0)) return false;
  if (key === 'pot') return livingH(B).some(h => h.hp < h.hpMax);
  if (key === 'fea') return heroesOf(B).some(h => !alive(h));
  return false;
}

export function useItem(B, key) {
  const ev = [];
  if (!canItem(B, key)) return ev;
  B.items[key]--;
  if (key === 'pot') {
    const t = livingH(B).sort((a, b) => pct(a) - pct(b))[0];
    ev.push({ t: 'item', key, uid: t.uid });
    heal(B, ev, t, Math.round(t.hpMax * 0.5));
  } else {
    const t = heroesOf(B).find(h => !alive(h));
    t.hp = Math.round(t.hpMax * 0.4);
    ev.push({ t: 'item', key, uid: t.uid });
    ev.push({ t: 'revive', uid: t.uid, hp: t.hp, text: `${t.name} revient au combat !` });
  }
  return ev;
}

// ---------------------------------------------------------------- heroes

const skillPow = (u, k) => SKILLS[k].pow * (1 + 0.2 * (u.up[k] || 0));
const ready = (u, k) => u.skills.includes(k) && !(u.cd[k] > 0);
const lowestHp = list => list.slice().sort((a, b) => a.hp - b.hp || a.slot - b.slot)[0];
const highestHp = list => list.slice().sort((a, b) => b.hp - a.hp || a.slot - b.slot)[0];

function pickFoeTarget(B, u) {
  const fs = livingF(B);
  const charging = fs.find(f => f.charge);
  const marked = fs.filter(f => f.st.mark);
  if (marked.length) return lowestHp(marked);
  if (charging && u.id !== 'orin') return charging;
  return lowestHp(fs);
}

function useSkill(B, u, k) { u.cd[k] = SKILLS[k].cd; }

function basic(B, ev, u, t) {
  const H = HEROES[u.id];
  ev.push({ t: 'act', uid: u.uid, kind: 'basic', name: H.basic.name, targets: [t.uid], sfx: H.basic.sfx, fx: u.el === 'feu' ? 'fire' : u.el === 'glace' ? 'ice' : 'slash', pose: 'atk', melee: u.melee });
  let pow = u.id === 'orin' ? 0.55 : 1;
  const stat = u.id === 'orin' ? 'mag' : 'atk';
  if (u.id === 'aldric' && u.rage) { pow *= 1 + 0.15 * u.rage; u.rage = 0; }
  hit(B, ev, u, t, calc(B, u, t, pow, stat, u.el), { melee: u.melee });
  if (alive(t) && u.el === 'poison') addStatus(B, ev, t, 'poison', u.atk * 0.25, u);
  if (alive(t) && u.el === 'feu' && B.rng.chance(0.2)) addStatus(B, ev, t, 'burn', u[stat] * 0.3, u);
  if (alive(t) && u.el === 'glace' && B.rng.chance(0.1)) addStatus(B, ev, t, 'freeze', 1, u);
  if (u.id === 'lyra' && alive(t)) { t.st.mark = 3; ev.push({ t: 'status', uid: t.uid, st: 'mark' }); }
  gainUlt(u, BAL.ultGainAct, B);
}

function heroTurn(B, ev, u) {
  const fs = livingF(B), hs = livingH(B);
  if (!fs.length) return;
  const act = (k, targets, extra = {}) => { const S = SKILLS[k]; useSkill(B, u, k); ev.push({ t: 'act', uid: u.uid, kind: 'skill', key: k, name: S.name, ic: S.ic, targets: targets.map(x => x.uid), sfx: S.sfx, fx: S.fx || (S.el === 'foudre' ? 'slash' : S.tgt === 'ally' ? 'heal' : 'slash'), pose: 'cast', melee: u.melee && S.tgt === 'foe' && !S.el, ...extra }); gainUlt(u, BAL.ultGainAct, B); };
  const charging = fs.find(f => f.charge);
  switch (u.id) {
    case 'aldric': {
      if (charging && ready(u, 'bash')) { act('bash', [charging]); doBash(B, ev, u, charging); return; }
      const fragileHurt = hs.some(h => h.id !== 'aldric' && pct(h) < 0.6);
      if (ready(u, 'taunt') && !u.st.taunt && (fragileHurt || B.round <= 2)) { act('taunt', [u]); u.st.taunt = 2; u.rage = Math.min(5, u.rage + 2); ev.push({ t: 'status', uid: u.uid, st: 'taunt' }); heal(B, ev, u, Math.round(u.hpMax * BAL.aldric.taunt)); return; } // v0.6: Provocation heals him
      if (ready(u, 'bash') && fs.length) { const t = fs.slice().sort((a, b) => b.atk - a.atk)[0]; act('bash', [t]); doBash(B, ev, u, t); return; }
      break;
    }
    case 'selena': {
      const hurt = hs.filter(h => pct(h) < 0.65).sort((a, b) => pct(a) - pct(b))[0];
      if (hurt && ready(u, 'heal')) {
        act('heal', [hurt]);
        hurt.st.poison = null; hurt.st.burn = null;
        heal(B, ev, hurt, Math.round(u.mag * skillPow(u, 'heal') * BAL.healMult), { overShield: true });
        return;
      }
      if (ready(u, 'smite')) {
        const t = pickFoeTarget(B, u); act('smite', [t]);
        hit(B, ev, u, t, calc(B, u, t, skillPow(u, 'smite'), 'mag', 'foudre'));
        for (const h of livingH(B)) heal(B, ev, h, Math.round(u.mag * 0.2), { quiet: true });
        return;
      }
      break;
    }
    case 'orin': {
      const surge = () => { u.charges++; if (u.charges >= 3) { u.charges = 0; ev.push({ t: 'say', text: '⚡ Surcharge !', uid: u.uid }); return 1.5; } return 1; };
      if (ready(u, 'blizzard') && fs.length >= 2) {
        act('blizzard', fs); const m = surge();
        for (const t of fs) { hit(B, ev, u, t, calc(B, u, t, skillPow(u, 'blizzard') * m, 'mag', 'glace')); if (alive(t) && B.rng.chance(0.25)) addStatus(B, ev, t, 'freeze', 1, u); }
        return;
      }
      if (ready(u, 'fire')) {
        const t = fs.find(f => f.w.includes('feu') && f.wall === 0) || fs.find(f => f.wall > 0) || highestHp(fs);
        act('fire', [t]); const m = surge();
        hit(B, ev, u, t, calc(B, u, t, skillPow(u, 'fire') * m, 'mag', 'feu'));
        if (alive(t) && B.rng.chance(0.3)) addStatus(B, ev, t, 'burn', u.mag * 0.4, u);
        return;
      }
      break;
    }
    case 'lyra': {
      const unmarked = fs.filter(f => !f.st.mark);
      if (ready(u, 'aimed') && unmarked.length) {
        const t = highestHp(unmarked); act('aimed', [t]);
        hit(B, ev, u, t, calc(B, u, t, skillPow(u, 'aimed'), 'atk', 'phys', { forceCrit: true }));
        if (alive(t)) { t.st.mark = 3; ev.push({ t: 'status', uid: t.uid, st: 'mark' }); }
        return;
      }
      if (ready(u, 'venom')) {
        const t = fs.filter(f => !f.r.includes('poison')).sort((a, b) => b.hp - a.hp)[0] || highestHp(fs);
        act('venom', [t]);
        hit(B, ev, u, t, calc(B, u, t, skillPow(u, 'venom'), 'atk', 'poison'));
        if (alive(t) && !t.r.includes('poison')) addStatus(B, ev, t, 'poison', u.atk * 0.35 * (1 + 0.2 * (u.up.venom || 0)), u);
        return;
      }
      break;
    }
    case 'nyx': {
      const thr = f => (f.st.shadow ? 0.6 : 0.35);
      const exec = fs.filter(f => pct(f) < thr(f)).sort((a, b) => b.st.shadow - a.st.shadow)[0];
      if (ready(u, 'assassin') && (exec || fs.some(f => f.st.shadow >= 3))) {
        const t = exec || fs.find(f => f.st.shadow >= 3); act('assassin', [t]);
        let pow = skillPow(u, 'assassin') * (1 + 0.3 * t.st.shadow);
        if (pct(t) < thr(t)) pow *= 3;
        t.st.shadow = 0;
        hit(B, ev, u, t, calc(B, u, t, pow, 'atk', 'phys'), { melee: true, noShadow: true });
        return;
      }
      if (ready(u, 'blades') && fs.length >= 2) {
        act('blades', fs);
        for (let i = 0; i < 4; i++) { const ts = livingF(B); if (!ts.length) break; const t = B.rng.pick(ts); hit(B, ev, u, t, calc(B, u, t, skillPow(u, 'blades'), 'atk', 'phys')); }
        return;
      }
      break;
    }
  }
  basic(B, ev, u, pickFoeTarget(B, u));
}

function doBash(B, ev, u, t) {
  hit(B, ev, u, t, calc(B, u, t, skillPow(u, 'bash'), 'atk', 'phys'), { melee: true });
  if (alive(t)) addStatus(B, ev, t, 'stun', 1, u);
}

const ULTS = {
  aldric(B, ev, u) {
    const fs = livingF(B);
    ev.push({ t: 'act', uid: u.uid, kind: 'ult', name: HEROES.aldric.ult.name, targets: fs.map(f => f.uid), sfx: 'ald_whirl', fx: 'ult', pose: 'cast' });
    for (const t of fs) hit(B, ev, u, t, calc(B, u, t, 1.6, 'atk', 'phys'), { melee: false });
    u.st.taunt = 2; ev.push({ t: 'status', uid: u.uid, st: 'taunt' });
    for (const h of livingH(B)) heal(B, ev, h, Math.round(h.hpMax * BAL.aldric.ult)); // v0.6: the dawn light heals the team
  },
  selena(B, ev, u) {
    const hs = heroesOf(B);
    ev.push({ t: 'act', uid: u.uid, kind: 'ult', name: HEROES.selena.ult.name, targets: hs.map(h => h.uid), sfx: 'sel_raise', fx: 'heal', pose: 'cast' });
    for (const h of hs) {
      if (!alive(h)) { h.hp = Math.round(h.hpMax * 0.3); ev.push({ t: 'revive', uid: h.uid, hp: h.hp, text: `${h.name} se relève !` }); }
      else heal(B, ev, h, Math.round(h.hpMax * 0.3));
    }
  },
  orin(B, ev, u) {
    ev.push({ t: 'act', uid: u.uid, kind: 'ult', name: HEROES.orin.ult.name, targets: livingF(B).map(f => f.uid), sfx: 'ori_fire', fx: 'fire', pose: 'cast' });
    for (let i = 0; i < 6; i++) { const fs = livingF(B); if (!fs.length) break; const t = B.rng.pick(fs); hit(B, ev, u, t, calc(B, u, t, 0.75, 'mag', 'feu')); if (alive(t) && B.rng.chance(0.3)) addStatus(B, ev, t, 'burn', u.mag * 0.4, u); }
  },
  lyra(B, ev, u) {
    ev.push({ t: 'act', uid: u.uid, kind: 'ult', name: HEROES.lyra.ult.name, targets: livingF(B).map(f => f.uid), sfx: 'lyr_rain', fx: 'slash', pose: 'cast' });
    for (let i = 0; i < 9; i++) { const fs = livingF(B); if (!fs.length) break; const t = B.rng.pick(fs); hit(B, ev, u, t, calc(B, u, t, 0.5, 'atk', 'phys', { critBonus: 0.35 })); }
  },
  nyx(B, ev, u) {
    ev.push({ t: 'act', uid: u.uid, kind: 'ult', name: HEROES.nyx.ult.name, targets: [lowestHp(livingF(B)).uid], sfx: 'nyx_shadow', fx: 'slash', pose: 'atk', melee: true });
    for (let i = 0; i < 6; i++) { const fs = livingF(B); if (!fs.length) break; const t = lowestHp(fs); hit(B, ev, u, t, calc(B, u, t, 0.6, 'atk', 'phys', { forceCrit: true }), { melee: true }); }
  },
};

// ---------------------------------------------------------------- foes

function pickTarget(B) {
  const hs = livingH(B), taunter = hs.find(h => h.st.taunt);
  if (taunter) return taunter;
  // front-line heroes (Aldric, Séléna, Nyx) are hit a bit more often
  return B.rng.weighted(hs.map(h => [h, HEROES[h.id].melee ? 3 : 2]));
}

function foeStrike(B, ev, f, t, mult, name) {
  B.curAtk = name;
  ev.push({ t: 'act', uid: f.uid, kind: 'foe', name, targets: [t.uid], pose: 'atk', melee: true, sfx: f.boss ? 'boss_roar' : null });
  const d = hit(B, ev, f, t, calc(B, f, t, mult, 'atk', 'phys'));
  if (d > 0 && alive(t)) {
    if (f.trait === 'poison') addStatus(B, ev, t, 'poison', f.atk * 0.18, f);
    if (f.trait === 'burn') addStatus(B, ev, t, 'burn', f.atk * 0.22, f);
    if (f.trait === 'chill' && B.rng.chance(0.2)) addStatus(B, ev, t, 'freeze', 1, f);
    if (B.curses.has('venom') && f.trait !== 'poison' && alive(t) && B.rng.chance(1 / 3)) addStatus(B, ev, t, 'poison', f.atk * 0.15, f); // Nightmare curse
  }
  return d;
}

function foeTurn(B, ev, f) {
  f.turn++;
  if (f.boss) {
    bossAct(B, ev, f);
    if (f.actTwice && alive(f) && !B.over && livingH(B).length) bossAct(B, ev, f, true);
    return;
  }
  if (f.charge) {
    const c = f.charge; f.charge = null;
    foeStrike(B, ev, f, pickTarget(B), c.kind === 'slow' ? 2.2 : 2, c.name);
    return;
  }
  if ((f.trait === 'howl' || f.trait === 'slow') && f.lastCharge !== f.turn - 1 && B.rng.chance(0.4)) {
    f.lastCharge = f.turn;
    f.charge = { kind: f.trait, name: f.trait === 'howl' ? 'Morsure féroce' : 'Coup écrasant' };
    ev.push({ t: 'charge', uid: f.uid, name: f.charge.name, text: f.trait === 'howl' ? `${f.name} hurle : il frappera très fort au prochain tour !` : `${f.name} prend son élan…` });
    return;
  }
  const t = pickTarget(B);
  if (f.trait === 'double') { foeStrike(B, ev, f, t, 0.62, 'Double attaque'); if (alive(f) && livingH(B).length && !B.over) foeStrike(B, ev, f, alive(t) ? t : pickTarget(B), 0.62, 'Double attaque'); }
  else foeStrike(B, ev, f, t, 1, 'Attaque');
}

// Bosses: every 3rd turn they announce their special attack, released on their next turn.
function bossAct(B, ev, f, extra = false) {
  if (f.intangibleOn && !extra) {
    f.intangible = !f.intangible;
    if (f.intangible) ev.push({ t: 'say', text: `${f.name} devient intangible : seule la magie le touche vraiment !`, uid: f.uid });
  }
  if (f.charge) {
    const c = f.charge; f.charge = null; B.curAtk = c.name;
    const targets = c.target === 'all' ? livingH(B) : [pickTarget(B)];
    ev.push({ t: 'act', uid: f.uid, kind: 'foe', name: c.name, targets: targets.map(h => h.uid), pose: 'blast', big: true, sfx: 'boss_roar' });
    for (const h of targets) {
      const d = hit(B, ev, f, h, calc(B, f, h, c.mult, 'atk', 'phys'));
      if (d > 0 && alive(h) && c.status && B.rng.chance(c.chance ?? 1)) addStatus(B, ev, h, c.status, c.status === 'freeze' ? 1 : f.atk * 0.2, f);
    }
    return;
  }
  if (f.special && !extra && f.turn % 3 === 2) {
    const S = f.special;
    f.charge = { kind: 'special', ...S };
    ev.push({ t: 'charge', uid: f.uid, name: S.name, aoe: S.target === 'all',
      text: `${f.name} prépare ${S.name} : ${S.target === 'all' ? 'toute l’équipe sera frappée' : 'un héros sera frappé très fort'} à son prochain tour !` });
    return;
  }
  foeStrike(B, ev, f, pickTarget(B), 1, 'Attaque');
}

function bossPhase2(B, ev, f) {
  const P = f.phaseDef;
  f.phase = 2;
  ev.push({ t: 'phase', uid: f.uid, text: `${f.name} ${P.text}` });
  if (P.kind === 'wall') { f.wall = Math.round(f.hpMax * P.pct); f.wallWeak = P.weak; }
  if (P.kind === 'thorns') f.thornsPct = P.pct;
  if (P.kind === 'enrage') f.atk = Math.round(f.atk * P.atkMul);
  if (P.kind === 'regen') f.regenPct = P.pct;
  if (P.kind === 'intangible') f.intangibleOn = true;
  if (P.kind === 'double') f.actTwice = true;
  if (P.kind === 'summonShield') f.shieldTaken = P.taken;
  const free = Math.max(0, 3 - livingF(B).length);
  (P.summon || []).slice(0, free).forEach((id, i) => {
    const s = makeFoe(B, { id, hpMul: f.mul.hp, atkMul: f.mul.atk, defMul: f.mul.def }, 1 + i, 3);
    s.slot = 1 + i; s.summoned = true; s.guards = f.uid;
    B.units.push(s); B.queue.push(s.uid);
    ev.push({ t: 'summon', uid: s.uid, src: f.uid });
  });
}

/** Snapshot of the heroes after the fight, for the run. */
export function heroResults(B) {
  return heroesOf(B).map(h => ({ id: h.id, hp: h.hp }));
}

/** Why the fight went the way it did (defeat screen). */
export function fightReport(B) {
  const top = Object.entries(B.report.by).sort((a, b) => b[1] - a[1])[0];
  const boss = foesOf(B).find(f => f.boss);
  return {
    result: B.over, rounds: B.round, timeout: B.round > BAL.maxRounds, enraged: B.enraged || 0,
    ko: B.report.ko, top: top ? { name: top[0], dmg: top[1] } : null,
    potLeft: B.items.pot || 0, feaLeft: B.items.fea || 0, guardLeft: B.guardLeft,
    boss: boss ? { id: boss.id, name: boss.name, hpPct: Math.round(100 * boss.hp / boss.hpMax), tip: boss.m.tip || '' } : null,
  };
}

/** Runs a whole fight with the default AI (tests and simulations). Player uses ultimates
 *  as soon as ready and Guard against announced attacks when `smart` is true. */
/**
 * Auto mode (also the simulator's player): the next action a careful player
 * would take now, as a function returning its events, or null.
 * Ultimates as soon as they are full, Guard against an announced team-wide
 * attack, a potion under 30 % life, a phoenix feather on a fallen hero.
 */
export function autoNext(B) {
  if (B.over) return null;
  const h = heroesOf(B).find(x => canUlt(B, x));
  if (h) return () => castUltimate(B, h.uid);
  if (canGuard(B) && foesOf(B).some(f => alive(f) && f.charge && f.charge.kind === 'special' && f.charge.target === 'all')) return () => useGuard(B);
  if (canItem(B, 'pot') && livingH(B).some(x => pct(x) < 0.3)) return () => useItem(B, 'pot');
  if (canItem(B, 'fea')) return () => useItem(B, 'fea');
  return null;
}

export function autoFight(B, { smart = true } = {}) {
  let n = 0;
  while (!B.over && n++ < 5000) {
    if (smart) for (let a, k = 0; k < 6 && (a = autoNext(B)); k++) a();
    step(B);
  }
  return B.over;
}
