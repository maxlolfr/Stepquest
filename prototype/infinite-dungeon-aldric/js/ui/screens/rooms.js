// Cards (reward, chest, training), rest, shop and event screens.
import { h, img, icon, toast } from '../dom.js';
import { sfx } from '../audio.js';
import { HEROES } from '../../data/heroes.js';
import { RARITY, STAT_NAMES, SLOT_NAMES, EVENTS, RELICS, SYNERGIES, activeSynergies, synergies3, synergyCount, relicLevel, relicDesc, relicRarity, SYN_NEED, SYN_NEED3 } from '../../data/items.js';
import { BAL } from '../../data/balance.js';
import { canAfford } from '../../run/run.js';
import { runHeader } from './map.js';
import { canReroll, restHealPct, canRetreat, relicsFull } from '../../run/run.js';

const statLine = g => Object.entries(g.st).map(([k, v]) => `${STAT_NAMES[k][0]} +${k === 'crit' ? Math.round(v * 100) + ' %' : v}`).join('  ');

// v0.7: where the relic takes its style ("Frénésie 2/3 — prochain palier à 3")
const synLine = S => {
  if (S.completes) return h('p.syn.on', `${S.ic} ${S.name} ${S.n}/${SYN_NEED}`, h('span', ` · active la synergie : ${S.desc}`));
  if (S.completes3) return h('p.syn.on', `${S.ic} ${S.name} ${S.n}/${SYN_NEED3}`, h('span', ` · palier 3 : ${S.desc3}`));
  if (S.n >= SYN_NEED3) return h('p.syn', `${S.ic} ${S.name} : palier 3 déjà atteint`);
  return h('p.syn', `${S.ic} ${S.name} ${S.n}/${S.n >= SYN_NEED ? SYN_NEED3 : SYN_NEED}${S.n >= SYN_NEED ? ' — prochain palier à 3' : ''}`);
};

function cardEl(c, run, { onPick, price, sold, afford = true }) {
  const rar = c.rarity != null ? RARITY[c.rarity] : null;
  let extra = null;
  if (c.type === 'gear') {
    const cur = run.team.find(t => t.id === c.hero).gear[c.gear.slot];
    extra = h('div.gear-cmp', h('p', h('b', SLOT_NAMES[c.gear.slot]), ' · ', statLine(c.gear)), h('p.dim', cur ? `Remplace : ${cur.name} (${statLine(cur)})` : 'Emplacement vide'));
  }
  const art = c.img ? img(c.img, 'card-art') : h('div.card-emoji', c.ic || '✦');
  const face = c.hero ? img(`${HEROES[c.hero].sprite}-face`, 'card-face') : null;
  const el = h('button.card' + (rar ? '.r' + c.rarity : '') + (c.type ? '.t-' + c.type : ''), { type: 'button', disabled: sold || !afford ? true : null, style: rar ? { '--rc': rar.col } : null },
    h('div.card-top', art, face),
    h('div.card-body', rar ? h('span.rar', rar.n) : null, h('b.card-title', c.title), h('p', c.desc), extra,
      c.rel ? h('p.rel-rar', { style: { '--rc': c.rel.col } }, `${c.rel.ic} ${c.rel.n}`, c.rel.sig ? ` · ${HEROES[c.rel.hero].name}` : '') : null,
      c.merge ? h('p.merge', `Déjà possédée : niveau ${c.merge.from} → niveau ${c.merge.to}`, h('span', ` · avant : ${c.merge.before}`)) : null,
      c.syn ? synLine(c.syn) : null,
      c.type === 'relic' && relicsFull(run) && !c.merge ? h('p.full', `Reliques ${run.relics.length}/${BAL.relicMax} : tu choisiras laquelle remplacer`) : null),
    price != null ? h('span.price' + (afford ? '' : '.no'), sold ? 'Vendu' : `💰 ${price}`) : null);
  el.addEventListener('click', () => {
    sfx(c.type === 'gear' ? 'equip' : c.type === 'relic' ? 'chest' : 'levelup', 0.6);
    if (c.syn && c.syn.completes && !run.relics.includes(c.key)) { sfx('ult', 0.7); toast(`${c.syn.ic} Synergie ${c.syn.name} activée ! ${c.syn.desc}`, 4200); }
    else if (c.syn && c.syn.completes3 && !run.relics.includes(c.key)) { sfx('ult', 0.7); toast(`${c.syn.ic} ${c.syn.name} palier 3 ! ${c.syn.desc3}`, 4200); }
    else if (c.merge) toast(`${c.title} passe au niveau ${c.merge.to} : ${c.merge.after}`, 4200);
    onPick();
  });
  return el;
}

export function showCards(root, { run, kind, onPick, onReroll, onSkip }) {
  const p = run.pending;
  const relicChoice = kind === 'reward' && p.cards.every(c => c.type === 'relic');
  const title = p.start ? 'Départ : choisis ta relique' : relicChoice ? 'Trésor : choisis une relique' : { reward: 'Victoire ! Choisis ta récompense', chest: 'Le coffre s’ouvre', train: 'Entraînement' }[kind];
  root.replaceChildren(h('div.page',
    h('header.ptop', h('h2', title)),
    kind === 'chest' ? img('chestR2', 'chest-art') : relicChoice ? img('chest_boss', 'chest-art') : null,
    runHeader(run),
    h('div.cards', p.cards.map((c, i) => cardEl(c, run, { onPick: () => onPick(i) }))),
    h('div.pfoot.row',
      kind === 'reward' && canReroll(run) ? h('button.btn', { type: 'button', onclick: onReroll }, `🎲 Relancer (${run.rerolls})`) : null,
      onSkip ? h('button.btn.ghost', { type: 'button', onclick: onSkip }, 'Passer') : null)));
}

export function showRest(root, { run, onHeal, onTrain, onRetreat }) {
  const pct = Math.round(restHealPct(run) * 100);
  root.replaceChildren(h('div.page.center',
    img('room_rest', 'scene-art') || h('div.card-emoji.huge', '🔥'),
    h('h2', 'Feu de camp'),
    h('p.lead', 'La tour se tait un instant. Que fait l’équipe ?'),
    runHeader(run),
    h('div.choice-list',
      h('button.btn.primary.wide', { type: 'button', onclick: onHeal }, 'Se reposer', h('span.soon', `Soigne l’équipe de ${pct} % et relève les héros tombés`)),
      h('button.btn.wide', { type: 'button', onclick: onTrain }, 'S’entraîner', h('span.soon', 'Améliorer une compétence')),
      canRetreat(run) ? h('button.btn.ghost.wide', { type: 'button', onclick: onRetreat }, 'Rentrer au camp', h('span.soon', `Garder ${run.banked + run.shards} éclats et finir l’expédition`)) : null)));
}

export function showShop(root, { run, onBuy, onLeave }) {
  const p = run.pending;
  root.replaceChildren(h('div.page',
    h('header.ptop', h('h2', 'Marchand')),
    img('room_shop', 'scene-art'),
    h('p.lead', 'Un marchand encapuchonné étale sa marchandise sur une caisse.'),
    runHeader(run),
    h('div.cards.shop', p.stock.map(it => cardEl(it, run, { price: it.price, sold: p.bought.includes(it.id), afford: run.gold >= it.price, onPick: () => onBuy(it.id) }))),
    h('div.pfoot', h('button.btn.primary.wide', { type: 'button', onclick: onLeave }, 'Reprendre la route'))));
}

export function showEvent(root, { run, onChoice, onLeave }) {
  const p = run.pending, E = EVENTS.find(e => e.id === p.event);
  const done = p.kind === 'event-done';
  root.replaceChildren(h('div.page.center',
    img(E.art || E.scene, 'scene-art') || icon('uiScroll', '📜', 'big-art'),
    h('h2', E.title),
    h('p.lead', E.text),
    runHeader(run),
    done ? h('div.choice-list', h('p.result', p.text), h('button.btn.primary.wide', { type: 'button', onclick: onLeave }, 'Continuer'))
      : h('div.choice-list', E.choices.map((c, i) => h('button.btn.wide', { type: 'button', disabled: canAfford(run, c.cost) ? null : true, onclick: () => onChoice(i) }, c.label, h('span.soon', c.hint))))));
}

// v0.6 — relic slots full: compare the new relic with those held, pick one to drop, confirm.
// Nothing is lost until the confirmation button; leaving the new relic is always possible.
const relicTile = (run, k, { tag, extra, onclick, sel, lv } = {}) => {
  const R = RELICS[k], S = R.tag && SYNERGIES[R.tag], rar = relicRarity(k), L = lv || relicLevel(run, k);
  return h((onclick ? 'button' : 'div') + '.rtile' + (sel ? '.sel' : '') + (onclick ? '' : '.new'), { type: onclick ? 'button' : null, onclick, 'aria-pressed': onclick ? String(!!sel) : null, style: { '--rc': rar.col } },
    icon(R.art, R.ic, 'rtile-img'),
    h('div.rtile-body', h('b', R.name), h('span.rtile-meta', `${rar.ic} ${rar.n} · niv. ${L}`), h('p', relicDesc(k, L)),
      S ? h('span.rtile-tag', `${S.ic} ${S.name}`) : R.hero ? h('span.rtile-tag', `✦ ${HEROES[R.hero].name}`) : h('span.rtile-tag.none', 'Sans style'), tag || null, extra || null));
};
const synSummary = keys => { const a = activeSynergies(keys), t3 = synergies3(keys); return a.length ? a.map(t => `${SYNERGIES[t].ic} ${SYNERGIES[t].name}${t3.includes(t) ? ' II' : ''}`).join(' · ') : 'aucune'; };

export function showReplace(root, { run, onReplace, onLeave }) {
  const p = run.pending, nu = p.key, active = activeSynergies(run.relics), act3 = synergies3(run.relics);
  let sel = null;
  const draw = () => {
    const keys = sel ? run.relics.filter(k => k !== sel).concat(nu) : null;
    const after = keys ? activeSynergies(keys) : null, after3 = keys ? synergies3(keys) : null;
    const lost = after ? active.filter(t => !after.includes(t)) : [], won = after ? after.filter(t => !active.includes(t)) : [];
    const lost3 = after3 ? act3.filter(t => !after3.includes(t) && !lost.includes(t)) : [], won3 = after3 ? after3.filter(t => !act3.includes(t)) : [];
    const lvLost = sel && relicLevel(run, sel) > 1 ? relicLevel(run, sel) : 0;
    const bad = lost.length || lost3.length || lvLost;
    const verdict = sel ? h('p.rp-verdict' + (bad ? '.bad' : won.length || won3.length ? '.good' : ''),
      lost.length ? `⚠️ Tu perds la synergie ${lost.map(t => SYNERGIES[t].name).join(', ')}. ` : '',
      lost3.length ? `⚠️ Tu perds le palier 3 de ${lost3.map(t => SYNERGIES[t].name).join(', ')}. ` : '',
      lvLost ? `⚠️ ${RELICS[sel].name} était au niveau ${lvLost}. ` : '',
      won.length ? `✨ Tu actives la synergie ${won.map(t => SYNERGIES[t].name).join(', ')}. ` : '',
      won3.length ? `✨ Palier 3 de ${won3.map(t => SYNERGIES[t].name).join(', ')}. ` : '',
      !bad && !won.length && !won3.length ? 'Tes synergies ne changent pas.' : '') : h('p.rp-verdict', 'Touche la relique que tu veux abandonner.');
    root.replaceChildren(h('div.page.replace',
      h('header.ptop', h('h2', `Reliques ${run.relics.length}/${BAL.relicMax} : place pleine`)),
      h('p.lead', 'Une nouvelle relique, mais plus de place. Garde les plus utiles à ton équipe.'),
      h('p.rp-syn', `Synergies actives : ${synSummary(run.relics)}`),
      h('h3.rp-h', 'Nouvelle relique'),
      relicTile(run, nu, { lv: 1 }),
      h('h3.rp-h', 'Abandonner laquelle ?'),
      h('div.rtiles', run.relics.map(k => {
        const t = RELICS[k].tag, rest = run.relics.filter(x => x !== k).concat(nu);
        const breaks = t && active.includes(t) && !activeSynergies(rest).includes(t);
        const breaks3 = !breaks && t && act3.includes(t) && !synergies3(rest).includes(t);
        return relicTile(run, k, { sel: sel === k, onclick: () => { sel = sel === k ? null : k; sfx('ui_click'); draw(); },
          tag: breaks ? h('span.rtile-warn', '⚠️ casse une synergie') : breaks3 ? h('span.rtile-warn', '⚠️ casse un palier 3') : null });
      })),
      h('div.pfoot.col.rp-foot',
        verdict,
        h('button.btn.primary.wide', { type: 'button', disabled: sel ? null : true, onclick: () => { if (sel) { sfx('chest', 0.6); onReplace(sel); } } },
          sel ? `Remplacer ${RELICS[sel].name} par ${RELICS[nu].name}` : 'Choisis une relique à remplacer'),
        h('button.btn.ghost.wide', { type: 'button', onclick: onLeave }, `Laisser ${RELICS[nu].name}`, p.refund ? h('span.soon', `Le marchand te rend ${p.refund} or`) : null))));
  };
  draw();
}
