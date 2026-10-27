// Cards (reward, chest, training), rest, shop and event screens.
import { h, img, icon } from '../dom.js';
import { sfx } from '../audio.js';
import { HEROES } from '../../data/heroes.js';
import { RARITY, STAT_NAMES, SLOT_NAMES, EVENTS } from '../../data/items.js';
import { canAfford } from '../../run/run.js';
import { runHeader } from './map.js';
import { canReroll, restHealPct, canRetreat } from '../../run/run.js';

const statLine = g => Object.entries(g.st).map(([k, v]) => `${STAT_NAMES[k][0]} +${k === 'crit' ? Math.round(v * 100) + ' %' : v}`).join('  ');

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
    h('div.card-body', rar ? h('span.rar', rar.n) : null, h('b.card-title', c.title), h('p', c.desc), extra),
    price != null ? h('span.price' + (afford ? '' : '.no'), sold ? 'Vendu' : `💰 ${price}`) : null);
  el.addEventListener('click', () => { sfx(c.type === 'gear' ? 'equip' : c.type === 'relic' ? 'chest' : 'levelup', 0.6); onPick(); });
  return el;
}

export function showCards(root, { run, kind, onPick, onReroll, onSkip }) {
  const p = run.pending;
  const title = { reward: 'Victoire ! Choisis ta récompense', chest: 'Le coffre s’ouvre', train: 'Entraînement' }[kind];
  root.replaceChildren(h('div.page',
    h('header.ptop', h('h2', title)),
    kind === 'chest' ? img('chestR2', 'chest-art') : null,
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
