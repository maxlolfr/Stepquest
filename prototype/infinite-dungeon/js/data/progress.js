// v0.5 — long-term goals: Nightmare curses, daily objectives, achievements.
// Pure data + pure functions: no DOM, no storage (run/meta.js holds the state).
import { hashSeed, makeRng } from '../core/rng.js';
import { HERO_ORDER, HEROES } from './heroes.js';
import { RELICS } from './items.js';

// ---------------------------------------------------------------- Nightmare
// Optional curses chosen before an expedition. Each makes the tower harder and
// multiplies the shards earned. Unlocked once the first boss (floor 10) is beaten.
export const CURSES = {
  rage:   { name: 'Fureur', art: 'curse_rage', ic: '😈', bonus: 0.25, desc: 'Les monstres frappent 20 % plus fort.' },
  crown:  { name: 'Tyrans', art: 'curse_crown', ic: '👑', bonus: 0.25, desc: 'Les boss ont 30 % de vie en plus.' },
  horde:  { name: 'Horde', art: 'curse_horde', ic: '👀', bonus: 0.2, desc: 'Chaque combat compte au moins 3 ennemis.' },
  venom:  { name: 'Crocs venimeux', art: 'curse_venom', ic: '🐍', bonus: 0.15, desc: 'Les coups des monstres empoisonnent une fois sur trois.' },
  potion: { name: 'Fioles fêlées', art: 'curse_potion', ic: '🧪', bonus: 0.15, desc: 'Aucune potion au départ, et elles coûtent le double chez le marchand.' },
  gold:   { name: 'Bourse percée', art: 'curse_gold', ic: '💸', bonus: 0.1, desc: '40 % d’or en moins.' },
  fire:   { name: 'Feu éteint', art: 'curse_fire', ic: '🪵', bonus: 0.15, desc: 'Les repos soignent deux fois moins, et plus de récupération après les combats.' },
  fog:    { name: 'Brume', art: 'curse_fog', ic: '🌫️', bonus: 0.1, desc: 'Les portes cachent leurs monstres et leur récompense.' },
};
export const CURSE_ORDER = Object.keys(CURSES);
export const NIGHTMARE_UNLOCK = 11; // start floor unlocked by the floor 10 boss
export const curseBonus = curses => (curses || []).reduce((n, k) => n + (CURSES[k] ? CURSES[k].bonus : 0), 0);
export const hasCurse = (run, k) => !!(run && run.curses && run.curses.includes(k));

// ---------------------------------------------------------------- daily objectives
// Three objectives per calendar day, derived from the date: no server, no streak.
// Each is checked against ONE expedition (its summary, see run.js endRun).
const DAILY_POOL = [
  { id: 'floor', make: r => { const f = r.pick([8, 12, 15, 20]); return { goal: f, text: `Atteindre l’étage ${f}`, reward: 8 + f }; }, ok: (s, g) => s.floor >= g },
  { id: 'elites', make: r => { const n = r.pick([2, 3, 4]); return { goal: n, text: `Vaincre ${n} élites dans une expédition`, reward: 6 * n }; }, ok: (s, g) => s.elites >= g },
  { id: 'boss', make: () => ({ goal: 1, text: 'Vaincre un boss', reward: 20 }), ok: s => s.bosses >= 1 },
  { id: 'cursed', make: () => ({ goal: 1, text: 'Survivre à une porte maudite', reward: 18 }), ok: s => s.cursedWon >= 1 },
  { id: 'synergy', make: () => ({ goal: 1, text: 'Activer une synergie de reliques', reward: 15 }), ok: s => s.synergies >= 1 },
  { id: 'kills', make: r => { const n = r.pick([25, 40, 60]); return { goal: n, text: `Vaincre ${n} ennemis dans une expédition`, reward: Math.round(n / 2) }; }, ok: (s, g) => s.kills >= g },
  { id: 'without', make: r => { const h = r.pick(HERO_ORDER); return { goal: h, text: `Atteindre l’étage 10 sans ${HEROES[h].name}`, reward: 20 }; }, ok: (s, g) => s.floor >= 10 && !s.team.includes(g) },
  { id: 'with', make: r => { const h = r.pick(HERO_ORDER); return { goal: h, text: `Atteindre l’étage 10 avec ${HEROES[h].name}`, reward: 12 }; }, ok: (s, g) => s.floor >= 10 && s.team.includes(g) },
  { id: 'nightmare', make: () => ({ goal: 1, text: 'Partir avec au moins une malédiction', reward: 15, needsNightmare: true }), ok: s => s.curses.length >= 1 },
];

/** Local day key, e.g. "2026-10-27". */
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** The 3 objectives of a day (same for everyone on that date). */
export function dailyFor(day, { nightmare = false } = {}) {
  const r = makeRng(hashSeed('daily', day)), out = [];
  const pool = r.shuffle(DAILY_POOL.filter(p => nightmare || p.id !== 'nightmare'));
  for (const p of pool) {
    if (out.length >= 3) break;
    if (p.id === 'without' && out.some(o => o.kind === 'with')) continue;
    if (p.id === 'with' && out.some(o => o.kind === 'without')) continue;
    out.push({ key: `${day}:${p.id}`, kind: p.id, ...p.make(r) });
  }
  return out;
}
export const dailyDone = (obj, summary) => DAILY_POOL.find(p => p.id === obj.kind).ok(summary, obj.goal);

// ---------------------------------------------------------------- achievements
// Permanent feats, each rewarded once with shards. `ok(meta, summary)`.
export const ACHIEVEMENTS = [
  { id: 'first_boss', art: 'ach_trophy', ic: '💀', name: 'Premier trophée', desc: 'Vaincre un boss.', reward: 15, ok: m => m.bossesBeaten.length >= 1 },
  { id: 'five_bosses', art: 'ach_trophy', ic: '💀', name: 'Chasseur de rois', desc: 'Vaincre 5 boss différents.', reward: 60, ok: m => m.bossesBeaten.length >= 5 },
  { id: 'all_bosses', art: 'ach_trophy', ic: '💀', name: 'Fléau des tyrans', desc: 'Vaincre les 10 boss.', reward: 150, ok: m => m.bossesBeaten.length >= 10 },
  { id: 'floor25', art: 'ach_flag', ic: '🚩', name: 'À mi-chemin', desc: 'Atteindre l’étage 25.', reward: 25, ok: m => m.stats.bestFloor >= 25 },
  { id: 'floor50', art: 'ach_flag', ic: '🚩', name: 'Au cœur de la tour', desc: 'Atteindre l’étage 50.', reward: 50, ok: m => m.stats.bestFloor >= 50 },
  { id: 'floor100', art: 'ach_medal', ic: '🏅', name: 'Le sommet', desc: 'Vaincre Vorthax à l’étage 100.', reward: 200, ok: m => m.stats.wins >= 1 },
  { id: 'all_heroes', art: 'ach_helmet', ic: '⛑️', name: 'Toute la compagnie', desc: 'Atteindre l’étage 10 avec chacun des 5 héros.', reward: 40, ok: m => HERO_ORDER.every(h => (m.heroBest[h] || 0) >= 10) },
  { id: 'relics10', art: 'ach_journal', ic: '📖', name: 'Collectionneur', desc: 'Découvrir 10 reliques différentes.', reward: 20, ok: m => m.relicsSeen.length >= 10 },
  { id: 'relics22', art: 'ach_journal', ic: '📖', name: 'Archiviste', desc: 'Découvrir les 22 reliques de style.', reward: 60, ok: m => m.relicsSeen.filter(k => RELICS[k] && !RELICS[k].sig).length >= 22 },
  { id: 'synergy3', art: 'ach_unlock', ic: '🔓', name: 'Maître des styles', desc: 'Avoir 3 synergies actives en même temps.', reward: 30, ok: (m, s) => !!s && s.synergies >= 3 },
  { id: 'nightmare1', art: 'nm_emblem', ic: '🔥', name: 'Cauchemar', desc: 'Vaincre un boss avec au moins une malédiction.', reward: 30, ok: (m, s) => !!s && s.curses.length >= 1 && s.bosses >= 1 },
  { id: 'nightmare4', art: 'nm_emblem', ic: '🔥', name: 'Cauchemar éveillé', desc: 'Vaincre un boss avec au moins 4 malédictions.', reward: 80, ok: (m, s) => !!s && s.curses.length >= 4 && s.bosses >= 1 },
  { id: 'daily10', art: 'daily_quest', ic: '📜', name: 'Habitué', desc: 'Réussir 10 objectifs du jour.', reward: 40, ok: m => m.dailyCount >= 10 },
];
