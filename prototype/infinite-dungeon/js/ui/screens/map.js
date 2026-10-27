// Dungeon map: the doors of the current floor, the team, resources, relics.
// Also the floor-5 checkpoint (continue or go home).
import { h, img, icon, bar, toast } from '../dom.js';
import { sfx } from '../audio.js';
import { HEROES } from '../../data/heroes.js';
import { unitDef, AFFIXES, BOSSES, zoneOf, ZONES } from '../../data/monsters.js';
import { RELICS } from '../../data/items.js';
import { BAL, XP } from '../../data/balance.js';
import { DOOR_INFO, isFight, doorName } from '../../run/dungeon.js';
import { floorOf, dungeonOf } from '../../run/run.js';

/** Resources + team strip shared by run screens. */
export function runHeader(run, { title } = {}) {
  const res = h('div.res',
    h('span', { title: 'Or' }, icon('uiGold', '💰', 'ric'), run.gold),
    h('span', { title: 'Potions' }, icon('uiPotion', '🧪', 'ric'), run.items.pot),
    h('span', { title: 'Plumes de phénix' }, '🪶', run.items.fea),
    h('span', { title: 'Éclats' }, '💎', run.shards + run.banked, run.banked ? h('small', ` (${run.banked} à l’abri)`) : null),
    h('span.lv', { title: `Niveau de l’équipe · ${run.xp} / ${XP.need(run.lv)} XP` }, `Niv. ${run.lv}`));
  const team = h('div.team-strip', run.team.map(t => {
    const H = HEROES[t.id];
    return h('div.tm' + (t.hp <= 0 ? '.dead' : ''), img(`${H.sprite}-face`, 'tface'),
      h('div.tm-body', h('b', H.name), bar(t.hp / t.hpMax, 'hp'), h('span.num', `${Math.max(0, t.hp)} / ${t.hpMax}`)));
  }));
  const relics = run.relics.length ? h('div.relics', run.relics.map(k => h('button.relic', { type: 'button', 'aria-label': RELICS[k].name, onclick: () => toast(`${RELICS[k].name} : ${RELICS[k].desc}`) }, icon(RELICS[k].art, RELICS[k].ic, 'relic-img')))) : null;
  return h('div.runhead', title ? h('h2', title) : null, res, team, relics);
}

const foeLine = d => {
  const names = d.foes.map(f => (f.elite ? `${unitDef(f.id).name} ${AFFIXES[f.elite].n}` : unitDef(f.id).name));
  const uniq = [...new Set(names)].map(n => `${names.filter(x => x === n).length > 1 ? names.filter(x => x === n).length + '× ' : ''}${n}`);
  return uniq.join(', ');
};

export function showMap(root, { run, onDoor, onQuit }) {
  const fl = floorOf(run), next = dungeonOf(run)[run.floor + 1];
  const doors = fl.doors.map((d, i) => {
    const I = DOOR_INFO[d.type], boss = d.type === 'boss' && BOSSES[d.foes[0].id];
    return h('button.door.' + d.type, { type: 'button', onclick: () => { sfx('ui_click'); onDoor(i); } },
      h('div.door-ic' + (isFight(d.type) ? '.mon' : ''), isFight(d.type) ? img(d.foes[0].id, 'dmon') : icon(I.img, I.ic, 'dimg')),
      h('div.door-body', h('b', doorName(d, run.floor)), h('p', boss ? boss.tip : I.desc), isFight(d.type) && !boss ? h('p.foes', foeLine(d)) : null));
  });
  const preview = next ? h('p.next', 'Étage suivant : ', next.doors.map(d => h('span', { title: DOOR_INFO[d.type].name }, `${DOOR_INFO[d.type].ic} ${doorName(d, run.floor + 1)}`))) : null;
  const z = zoneOf(run.floor), z0 = z.index * BAL.zoneSize;
  const pips = h('div.pips', z.floors.map(f => h('i' + (f < run.floor ? '.done' : f === run.floor ? '.now' : '') + (f === z0 + BAL.zoneSize ? '.boss' : ''))));
  root.replaceChildren(h('div.page.map',
    h('header.ptop', h('button.back', { type: 'button', onclick: onQuit, 'aria-label': 'Menu' }, '☰'), h('h2', `Étage ${run.floor} / ${BAL.floors}`), h('span.zone', `Zone ${z.index + 1} / ${ZONES.length}`)),
    h('div.zone-banner', img(fl.doors[0].bg, 'zone-bg'), h('div.zone-txt', h('b', fl.zone), h('span', fl.level))),
    pips,
    runHeader(run),
    h('p.lead', fl.doors.length > 1 ? 'Choisis une porte.' : fl.doors[0].type === 'boss' ? `${doorName(fl.doors[0], run.floor)} t’attend.` : 'Une seule voie.'),
    h('div.doors', doors),
    preview));
}

export function showCheckpoint(root, { run, onContinue, onRetreat }) {
  root.replaceChildren(h('div.page.center',
    img(zoneOf(run.floor).levels[0].bg, 'scene-art'),
    h('h2', `${BOSSES[zoneOf(run.floor - 1).boss].name} est vaincu !`),
    h('p.lead', `Tu entres dans ${zoneOf(run.floor).name}.`),
    h('p.lead', `${run.banked} éclats sont désormais à l’abri : tu les garderas même en cas de défaite.`),
    runHeader(run),
    h('div.choice-list',
      h('button.btn.primary.wide', { type: 'button', onclick: onContinue }, `Continuer vers l’étage ${run.floor}`, h('span.soon', 'Les éclats suivants seront en jeu')),
      h('button.btn.wide', { type: 'button', onclick: onRetreat }, 'Rentrer au camp', h('span.soon', `Garder ${run.banked + run.shards} éclats`)))));
}
