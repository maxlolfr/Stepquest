// Rewards: the 3 cards after a fight, chest contents, gear stats, shop stock.
import { HEROES, SKILLS } from '../data/heroes.js';
import { RELICS, RARITY, WEAPONS, ARMORS, JEWELS, SYNERGIES, SYN_NEED, SYN_NEED3, synergyCount, relicRarity, relicLevel, relicDesc, relicPoolFor, isSignature, RELIC_LV_MAX } from '../data/items.js';
import { BAL, prog } from '../data/balance.js';
import { zoneOf, MONSTERS } from '../data/monsters.js';

const zoneIdx = floor => (floor <= 15 ? 0 : floor <= 32 ? 1 : 2); // gear name tier

export function makeGear(slot, r, floorN, hero) {
  const floor = prog(floorN), m = RARITY[r].m, z = zoneIdx(floor), st = {};
  let name, img;
  if (slot === 'w') {
    const v = Math.round((3 + 0.8 * floor) * m);
    if (hero === 'orin') st.mag = v; else if (hero === 'selena') { st.atk = Math.round(v * 0.7); st.mag = Math.round(v * 0.7); } else st.atk = v;
    name = WEAPONS[hero][r]; img = `gw_${hero}_${r + 1}`;
  } else if (slot === 'a') {
    st.hp = Math.round((10 + 3 * floor) * m); st.def = Math.round((1 + 0.3 * floor) * m);
    [name] = ARMORS[z]; img = `ga_${ARMORS[z][1] + r}`;
  } else {
    st.crit = +(0.03 * m).toFixed(3); st.hp = Math.round((5 + 1.8 * floor) * m);
    [name] = JEWELS[z]; img = `gj_${JEWELS[z][1] + r}`;
  }
  return { slot, r, hero, st, name, img, floor: floorN };
}

/** Score used to compare two pieces of gear for one hero. */
export const gearScore = g => (g ? (g.st.atk || 0) * 2 + (g.st.mag || 0) * 2 + (g.st.hp || 0) * 0.35 + (g.st.def || 0) * 2 + (g.st.crit || 0) * 120 : 0);

/** Card for one relic: rarity, style, effect, and (v0.7) the merge or synergy it brings. */
export function relicCard(run, key) {
  const R = RELICS[key], S = R.tag && SYNERGIES[R.tag], held = run.relics.includes(key);
  const lv = held ? relicLevel(run, key) : 0, rar = relicRarity(key);
  const have = S ? synergyCount(run.relics, R.tag) : 0, n = have + (held ? 0 : 1);
  const merge = held ? { from: lv, to: Math.min(RELIC_LV_MAX, lv + 1), before: relicDesc(key, lv), after: relicDesc(key, Math.min(RELIC_LV_MAX, lv + 1)) } : null;
  return { type: 'relic', key, title: R.name, ic: R.ic, img: R.art, desc: relicDesc(key, held ? Math.min(RELIC_LV_MAX, lv + 1) : 1),
    rarity: null, rel: { n: rar.n, ic: rar.ic, col: rar.col, sig: !!R.sig, hero: R.hero || null }, merge,
    syn: S ? { tag: R.tag, name: S.name, ic: S.ic, n, have, need: n >= SYN_NEED ? SYN_NEED3 : SYN_NEED, completes: !held && n === SYN_NEED, completes3: !held && n === SYN_NEED3,
      desc: S.desc, desc3: S.desc3 } : null };
}

// v0.7 relic draws: a rarity first (BAL.relicOdds), then a relic of that rarity. Duplicates of
// relics held (below level 3) can come up and merge; the team's signatures have their own chance.
export function drawRelic(run, rng, kind = 'normal', exclude = []) {
  const team = run.team.map(h => h.id);
  const can = k => !(exclude && exclude.includes(k)) && (!run.relics.includes(k) || (!isSignature(k) && relicLevel(run, k) < RELIC_LV_MAX));
  const pool = relicPoolFor(team).filter(can);
  if (!pool.length) return null;
  const sigs = pool.filter(isSignature);
  if (sigs.length && rng.chance(BAL.sigChance)) return rng.pick(sigs);
  const plain = pool.filter(k => !isSignature(k));
  if (!plain.length) return rng.pick(sigs);
  const odds = BAL.relicOdds[kind] || BAL.relicOdds.normal;
  for (let tries = 0; tries < 3; tries++) {
    const r = rng.weighted(odds), list = plain.filter(k => RELICS[k].rar === r);
    if (!list.length) continue;
    // a style the team already started comes up 3× more often (builds form); a duplicate a bit less
    return rng.weighted(list.map(k => [k, run.relics.includes(k) ? BAL.dupWeight : RELICS[k].tag && synergyCount(run.relics, RELICS[k].tag) > 0 ? 3 : 1]));
  }
  return rng.pick(plain);
}

function card(type, run, rng, floor, rarityKind, exclude) {
  const team = run.team.map(h => h.id), hero = rng.pick(team);
  switch (type) {
    case 'heal': return { type, pct: 0.3, title: 'Source de vie', ic: '💚', desc: 'Soigne toute l’équipe de 30 % et relève les héros tombés à 30 %.' };
    case 'stat': {
      const H = HEROES[hero], main = H.stats.mag > H.stats.atk ? 'mag' : 'atk';
      const stat = rng.pick([main, main, 'hp', 'def']), pct = stat === 'hp' ? 0.12 : stat === 'def' ? 0.15 : 0.1;
      const lab = { atk: 'Attaque', mag: 'Magie', hp: 'Vie', def: 'Défense' }[stat];
      return { type, hero, stat, pct, title: `${lab} +${Math.round(pct * 100)} %`, ic: { atk: '⚔️', mag: '✨', hp: '❤️', def: '🛡️' }[stat], desc: `${H.name} gagne ${Math.round(pct * 100)} % de ${lab.toLowerCase()} pour le reste de l’expédition.` };
    }
    case 'upgrade': {
      const sk = rng.pick(HEROES[hero].skills), S = SKILLS[sk], n = (run.team.find(h => h.id === hero).up[sk] || 0) + 1;
      return { type, hero, skill: sk, title: `${S.name} niv. ${n + 1}`, ic: S.ic, desc: `${HEROES[hero].name} : ${S.name} gagne +20 % de puissance.` };
    }
    case 'element': {
      const free = run.team.filter(h => h.el === 'phys').map(h => h.id);
      const who = free.length ? rng.pick(free) : hero, el = rng.pick(['feu', 'glace', 'poison', 'foudre']);
      const lab = { feu: 'Feu', glace: 'Glace', poison: 'Poison', foudre: 'Foudre' }[el], ic = { feu: '🔥', glace: '❄️', poison: '☠️', foudre: '⚡' }[el];
      const extra = { feu: ' Peut enflammer.', glace: ' Peut geler.', poison: ' Empoisonne.', foudre: '' }[el];
      // v0.6: say what it is worth here: monsters of the current zone weak or resistant to it
      const pool = zoneOf(run.floor).pool.map(k => MONSTERS[k]), weak = pool.filter(m => m.w.includes(el)).length, res = pool.filter(m => m.r.includes(el)).length;
      const here = ` Dans cette zone : ${weak} monstre${weak > 1 ? 's' : ''} sur ${pool.length} ${weak > 1 ? 'y sont faibles' : 'y est faible'}${res ? `, ${res} ${res > 1 ? 'y résistent' : 'y résiste'}` : ''}.`;
      return { type, hero: who, el, weak, res, title: `Arme de ${lab.toLowerCase()}`, ic, desc: `L’attaque de base de ${HEROES[who].name} devient de type ${lab} (×1,5 sur les ennemis faibles).${extra}${here}` };
    }
    case 'gear': {
      const slot = rng.pick(['w', 'a', 'j']), r = rng.weighted(BAL.rarityWeights[rarityKind] || BAL.rarityWeights.normal);
      const g = makeGear(slot, r, floor, hero);
      return { type, hero, gear: g, title: g.name, img: g.img, rarity: r, desc: `Pour ${HEROES[hero].name}.` };
    }
    case 'relic': {
      const key = drawRelic(run, rng, rarityKind, exclude);
      return key ? relicCard(run, key) : null;
    }
    default: return null;
  }
}

/** Three cards of different kinds. kind: normal | elite | boss | cursed | chest */
export function rewardCards(run, rng, floor, kind = 'normal') {
  // bosses and cursed doors: choose 1 relic out of 3 (topped up with other cards if the catalogue runs out)
  if (kind === 'boss' || kind === 'cursed') {
    const out = [];
    for (let i = 0; i < 3; i++) { const c = card('relic', run, rng, floor, 'elite', out.map(x => x.key)); if (c) out.push(c); }
    while (out.length < 3) out.push(card(out.length % 2 ? 'gear' : 'upgrade', run, rng, floor, 'elite'));
    return out;
  }
  const hurt = run.team.some(h => h.hp < h.hpMax * 0.75);
  const weights = kind === 'chest'
    ? [['gear', 5], ['relic', BAL.relicWeight.chest]]
    : [['heal', hurt ? 3 : 0.5], ['stat', 3], ['upgrade', 3], ['element', run.team.some(h => h.el === 'phys') ? 2 : 0.3], ['gear', 3], ['relic', kind === 'normal' ? BAL.relicWeight.normal : BAL.relicWeight.elite]];
  const rarityKind = kind === 'normal' ? 'normal' : kind === 'chest' ? 'chest' : 'elite';
  const out = [], used = new Set();
  for (let tries = 0; out.length < 3 && tries < 40; tries++) {
    const pool = weights.filter(([t]) => kind === 'chest' || !used.has(t));
    const t = rng.weighted(pool), c = card(t, run, rng, floor, rarityKind);
    if (!c) { used.add(t); continue; }
    if (out.some(o => o.type === c.type && o.key === c.key && o.hero === c.hero && o.title === c.title)) continue;
    used.add(t); out.push(c);
  }
  return out;
}

export function shopStock(run, rng, floor) {
  const pm = BAL.shopMul(zoneOf(floor).index), P = n => Math.round(n * pm / 5) * 5;
  const hero = rng.pick(run.team.map(h => h.id));
  const g = makeGear(rng.pick(['w', 'a', 'j']), rng.weighted([[1, 70], [2, 30]]), floor, hero);
  const relic = card('relic', run, rng, floor, 'elite');
  const up = card('upgrade', run, rng, floor);
  return [
    { id: 'pot', type: 'item', key: 'pot', price: P(30) * (run.curses && run.curses.includes('potion') ? 2 : 1), title: 'Potion', ic: '🧪', desc: 'Rend 50 % de vie à l’allié le plus blessé, en combat.' },
    { id: 'fea', type: 'item', key: 'fea', price: P(70), title: 'Plume de phénix', ic: '🪶', desc: 'Ramène un allié tombé avec 40 % de vie, en combat.' },
    { id: 'heal', type: 'heal', pct: 0.35, price: P(BAL.shop.heal), title: 'Soins', ic: '💚', desc: 'Soigne l’équipe de 35 % et relève les héros tombés.' },
    { id: 'gear', type: 'gear', hero, gear: g, price: P(BAL.shop.gear + 30 * g.r), title: g.name, img: g.img, rarity: g.r, desc: `Pour ${HEROES[hero].name}.` },
    relic && { id: 'relic', ...relic, price: P(BAL.shop.relic) },
    up && { id: 'up', ...up, price: P(BAL.shop.upgrade) },
    // v0.6: a use for the gold piling up late: repeatable, a little dearer each time
    blessOffer(run, floor),
  ].filter(Boolean);
}

/** One skill-upgrade card (rest "train" choice, trainer event). */
export const upgradeCard = (run, rng, floor) => card('upgrade', run, rng, floor);

/** One stat card (events). */
export const statCard = (run, rng) => card('stat', run, rng, run.floor);

/** v0.6 shop: Bénédiction, repeatable, ×1.5 dearer after each purchase in the expedition. */
export function blessOffer(run, floor) {
  const n = run.blessN || 0, price = Math.round(BAL.shop.bless * BAL.shop.blessUp ** n * BAL.shopMul(zoneOf(floor).index) / 5) * 5;
  return { id: 'bless', type: 'bless', late: true, price, title: 'Bénédiction', ic: '✨',
    desc: `Toute l’équipe gagne 5 % d’attaque, de magie et de vie pour l’expédition.${n ? ` Déjà achetée ${n} fois : +${5 * n} % en tout, +${5 * (n + 1)} % après celle-ci.` : ''}` };
}
