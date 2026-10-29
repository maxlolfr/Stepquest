// Dungeon map: the doors of the current floor, the team, resources, relics.
// Also the floor-5 checkpoint (continue or go home).
import { h, img, icon, bar, toast } from '../dom.js';
import { sfx } from '../audio.js';
import { HEROES } from '../../data/heroes.js';
import { unitDef, AFFIXES, BOSSES, zoneOf, ZONES } from '../../data/monsters.js';
import { RELICS, SYNERGIES, activeSynergies, synergies3, synergyCount, relicLevel, relicDesc, relicRarity, SYN_NEED3 } from '../../data/items.js';
import { CURSES, hasCurse } from '../../data/progress.js';
import { BAL, XP } from '../../data/balance.js';
import { DOOR_INFO, DOOR_REWARD, doorDanger, isFight, doorName } from '../../run/dungeon.js';
import { floorOf, dungeonOf } from '../../run/run.js';

/** Resources + team strip shared by run screens. */
export function runHeader(run, { title } = {}) {
  const res = h('div.res',
    h('span', { title: 'Or' }, icon('uiGold', '💰', 'ric'), run.gold),
    h('span', { title: 'Potions' }, icon('uiPotion', '🧪', 'ric'), run.items.pot),
    h('span', { title: 'Plumes de phénix' }, '🪶', run.items.fea),
    h('span', { title: 'Éclats' }, '💎', run.shards + run.banked, run.banked ? h('small', ` (${run.banked} à l’abri)`) : null),
    h('span.lv', { title: `Niveau de l’équipe · ${run.xp} / ${XP.need(run.lv)} XP` }, `Niv. ${run.lv}`),
    // v0.7: the shop blessings bought in this expedition, with their total
    run.blessN ? h('button.bless-chip', { type: 'button', 'aria-label': 'Bénédictions', onclick: () => toast(blessText(run), 4200) }, icon('ui_bless', '✨', 'ric'), `×${run.blessN}`) : null);
  const team = h('div.team-strip', run.team.map(t => {
    const H = HEROES[t.id];
    return h('div.tm' + (t.hp <= 0 ? '.dead' : ''), img(`${H.sprite}-face`, 'tface'),
      h('div.tm-body', h('b', H.name), bar(t.hp / t.hpMax, 'hp'), h('span.num', `${Math.max(0, t.hp)} / ${t.hpMax}`)));
  }));
  const relics = run.relics.length ? h('div.relics', h('span.relic-count' + (BAL.relicMax != null && run.relics.length >= BAL.relicMax ? '.full' : ''), { title: 'Emplacements de reliques' }, `${run.relics.length}/${BAL.relicMax ?? '∞'}`), run.relics.map(k => relicButton(run, k))) : null;
  const syns = activeSynergies(run.relics), s3 = synergies3(run.relics);
  const synRow = syns.length ? h('div.syns', syns.map(t => h('button.synchip' + (s3.includes(t) ? '.t3' : ''), { type: 'button', onclick: () => toast(`${SYNERGIES[t].ic} ${SYNERGIES[t].name} ${s3.includes(t) ? '3/3' : `${synergyCount(run.relics, t)}/${SYN_NEED3}`} : ${SYNERGIES[t].desc}${s3.includes(t) ? ` · Palier 3 : ${SYNERGIES[t].desc3}` : ` · À 3 reliques : ${SYNERGIES[t].desc3}`}`, 5200) }, icon(SYNERGIES[t].art, SYNERGIES[t].ic, 'syn-img'), SYNERGIES[t].name, h('small', s3.includes(t) ? ' II' : ` ${synergyCount(run.relics, t)}/3`)))) : null;
  const curseRow = run.curses && run.curses.length ? h('div.curses-row', h('span.nm-tag', `🔥 Cauchemar ${run.curses.length}`), run.curses.map(k => h('button.curse-chip', { type: 'button', 'aria-label': CURSES[k].name, onclick: () => toast(`${CURSES[k].name} : ${CURSES[k].desc}`, 3500) }, icon(CURSES[k].art, CURSES[k].ic, 'curse-mini')))) : null;
  return h('div.runhead', title ? h('h2', title) : null, res, team, curseRow, synRow, relics);
}

/** v0.7 — one relic in the strip: rarity border + level badge; touch for the details. */
export function relicButton(run, k) {
  const R = RELICS[k], lv = relicLevel(run, k), rar = relicRarity(k), on = R.tag && activeSynergies(run.relics).includes(R.tag);
  const style = R.tag ? ` · style ${SYNERGIES[R.tag].name} ${synergyCount(run.relics, R.tag)}/${SYN_NEED3}` : R.hero ? ` · signature de ${HEROES[R.hero].name}` : '';
  return h('button.relic' + (on ? '.syn-on' : ''), { type: 'button', 'aria-label': `${R.name}, ${rar.n}, niveau ${lv}`, style: { '--rc': rar.col },
    onclick: () => toast(`${rar.ic} ${R.name} (${rar.n}, niv. ${lv}) : ${relicDesc(k, lv)}${style}`, 4500) },
  icon(R.art, R.ic, 'relic-img'), lv > 1 ? h('span.rlv', String(lv)) : null);
}
export const blessText = run => `✨ Bénédiction ×${run.blessN} : toute l’équipe a +${5 * run.blessN} % d’attaque, de magie et de vie pour cette expédition.`;

const foeLine = d => {
  const names = d.foes.map(f => (f.elite ? `${unitDef(f.id).name} ${AFFIXES[f.elite].n}` : unitDef(f.id).name));
  const uniq = [...new Set(names)].map(n => `${names.filter(x => x === n).length > 1 ? names.filter(x => x === n).length + '× ' : ''}${n}`);
  return uniq.join(', ');
};

export function showMap(root, { run, onDoor, onQuit }) {
  const fl = floorOf(run), next = dungeonOf(run)[run.floor + 1];
  const doors = fl.doors.map((d, i) => {
    const I = DOOR_INFO[d.type], boss = d.type === 'boss' && BOSSES[d.foes[0].id], fog = hasCurse(run, 'fog') && d.type !== 'boss';
    return h('button.door.' + d.type, { type: 'button', onclick: () => { sfx('ui_click'); onDoor(i); } },
      h('div.door-ic' + (isFight(d.type) && !fog ? '.mon' : ''), isFight(d.type) && !fog ? img(d.foes[0].id, 'dmon') : icon(I.img, I.ic, 'dimg')),
      h('div.door-body', h('div.door-head', h('b', doorName(d, run.floor)), h('span.danger', { 'aria-label': `Danger ${doorDanger(d)} sur 3` }, '💀'.repeat(doorDanger(d)) || '🕊️')),
        h('p', boss ? boss.tip : I.desc), isFight(d.type) && !boss ? h('p.foes', fog ? '🌫️ La brume cache ce qui t’attend.' : foeLine(d)) : null,
        fog ? null : h('p.gain', '🎁 ', DOOR_REWARD[d.type])));
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
  root.replaceChildren(h('div.page.center.checkpoint', { style: { '--scr': 'url(img/scr_checkpoint.webp)' } },
    h('h2', `Victoire : ${BOSSES[zoneOf(run.floor - 1).boss].name} !`),
    h('p.lead', `Tu entres dans ${zoneOf(run.floor).name}.`),
    h('p.lead', `${run.banked} éclats sont désormais à l’abri : tu les garderas même en cas de défaite.`),
    runHeader(run),
    h('div.choice-list',
      h('button.btn.primary.wide', { type: 'button', onclick: onContinue }, `Continuer vers l’étage ${run.floor}`, h('span.soon', 'Les éclats suivants seront en jeu')),
      h('button.btn.wide', { type: 'button', onclick: onRetreat }, 'Rentrer au camp', h('span.soon', `Garder ${run.banked + run.shards} éclats`)))));
}
