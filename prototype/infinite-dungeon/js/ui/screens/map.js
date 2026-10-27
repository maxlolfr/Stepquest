// Dungeon map: the doors of the current floor, the team, resources, relics.
// Also the floor-5 checkpoint (continue or go home).
import { h, img, icon, bar, toast } from '../dom.js';
import { sfx } from '../audio.js';
import { HEROES } from '../../data/heroes.js';
import { MONSTERS, AFFIXES } from '../../data/monsters.js';
import { RELICS } from '../../data/items.js';
import { BAL } from '../../data/balance.js';
import { DOOR_INFO, isFight } from '../../run/dungeon.js';
import { floorOf, dungeonOf } from '../../run/run.js';

/** Resources + team strip shared by run screens. */
export function runHeader(run, { title } = {}) {
  const res = h('div.res',
    h('span', { title: 'Or' }, icon('uiGold', '💰', 'ric'), run.gold),
    h('span', { title: 'Potions' }, icon('uiPotion', '🧪', 'ric'), run.items.pot),
    h('span', { title: 'Plumes de phénix' }, '🪶', run.items.fea),
    h('span', { title: 'Éclats' }, '💎', run.shards + run.banked, run.banked ? h('small', ` (${run.banked} à l’abri)`) : null));
  const team = h('div.team-strip', run.team.map(t => {
    const H = HEROES[t.id];
    return h('div.tm' + (t.hp <= 0 ? '.dead' : ''), img(`${H.sprite}-face`, 'tface'),
      h('div.tm-body', h('b', H.name), bar(t.hp / t.hpMax, 'hp'), h('span.num', `${Math.max(0, t.hp)} / ${t.hpMax}`)));
  }));
  const relics = run.relics.length ? h('div.relics', run.relics.map(k => h('button.relic', { type: 'button', 'aria-label': RELICS[k].name, onclick: () => toast(`${RELICS[k].name} : ${RELICS[k].desc}`) }, RELICS[k].ic))) : null;
  return h('div.runhead', title ? h('h2', title) : null, res, team, relics);
}

const foeLine = d => {
  const names = d.foes.map(f => (f.elite ? `${MONSTERS[f.id].name} ${AFFIXES[f.elite].n}` : MONSTERS[f.id].name));
  const uniq = [...new Set(names)].map(n => `${names.filter(x => x === n).length > 1 ? names.filter(x => x === n).length + '× ' : ''}${n}`);
  return uniq.join(', ');
};

export function showMap(root, { run, onDoor, onQuit }) {
  const fl = floorOf(run), next = dungeonOf(run)[run.floor + 1];
  const doors = fl.doors.map((d, i) => {
    const I = DOOR_INFO[d.type];
    return h('button.door.' + d.type, { type: 'button', onclick: () => { sfx('ui_click'); onDoor(i); } },
      h('div.door-ic' + (isFight(d.type) ? '.mon' : ''), isFight(d.type) ? img(d.foes[0].id, 'dmon') : icon(I.img, I.ic, 'dimg')),
      h('div.door-body', h('b', I.name), h('p', I.desc), isFight(d.type) ? h('p.foes', foeLine(d)) : null));
  });
  const preview = next ? h('p.next', 'Étage suivant : ', next.doors.map(d => h('span', { title: DOOR_INFO[d.type].name }, `${DOOR_INFO[d.type].ic} ${DOOR_INFO[d.type].name}`))) : null;
  const pips = h('div.pips', Array.from({ length: BAL.floors }, (_, i) => h('i' + (i + 1 < run.floor ? '.done' : i + 1 === run.floor ? '.now' : '') + (i + 1 === BAL.guardianFloor ? '.guard' : i + 1 === BAL.floors ? '.boss' : ''))));
  root.replaceChildren(h('div.page.map',
    h('header.ptop', h('button.back', { type: 'button', onclick: onQuit, 'aria-label': 'Menu' }, '☰'), h('h2', `Étage ${run.floor} / ${BAL.floors}`), h('span.zone', fl.zone)),
    pips,
    runHeader(run),
    h('p.lead', fl.doors.length > 1 ? 'Choisis une porte.' : run.floor === BAL.bossFloor ? 'Le Roi des Os t’attend.' : 'Une seule voie.'),
    h('div.doors', doors),
    preview));
}

export function showCheckpoint(root, { run, onContinue, onRetreat }) {
  root.replaceChildren(h('div.page.center',
    img('chestR3', 'big-art'),
    h('h2', 'Gardien vaincu !'),
    h('p.lead', `${run.banked} éclats sont désormais à l’abri : tu les garderas même en cas de défaite.`),
    runHeader(run),
    h('div.choice-list',
      h('button.btn.primary.wide', { type: 'button', onclick: onContinue }, `Continuer vers l’étage ${run.floor}`, h('span.soon', 'Les éclats suivants seront en jeu')),
      h('button.btn.wide', { type: 'button', onclick: onRetreat }, 'Rentrer au camp', h('span.soon', `Garder ${run.banked + run.shards} éclats`)))));
}
