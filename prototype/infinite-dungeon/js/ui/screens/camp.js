// End of expedition summary and the camp (permanent upgrades).
import { h, img, icon } from '../dom.js';
import { sfx, playMusic } from '../audio.js';
import { UPGRADES } from '../../data/balance.js';
import { upgradeCost } from '../../run/meta.js';
import { HEROES } from '../../data/heroes.js';
import { ZONES, BOSSES } from '../../data/monsters.js';
import { BAL } from '../../data/balance.js';
import { RELICS } from '../../data/items.js';

/** Why the team fell, in one or two sentences, with a tip. */
function defeatLines(r) {
  if (!r) return null;
  const lines = [];
  if (r.timeout) lines.push(h('p', h('b', 'Combat trop long : '), 'les héros se sont épuisés après 60 tours. Il manquait des dégâts.'));
  else if (r.ko) lines.push(h('p', h('b', 'Premier tombé : '), `${r.ko.hero}, par ${r.ko.by}${r.ko.atk && r.ko.atk !== 'Attaque' ? ` (${r.ko.atk})` : ''}.`));
  if (r.top) lines.push(h('p', h('b', 'Le plus dangereux : '), `${r.top.name} (${r.top.dmg} dégâts).`));
  if (r.boss) lines.push(h('p', h('b', `${r.boss.name} : `), `il lui restait ${r.boss.hpPct} % de vie. ${r.boss.tip}`));
  const tip = r.boss && r.boss.hpPct > 70 ? 'Ce boss est encore trop fort pour l’équipe : améliore le camp ou gagne des niveaux et des reliques dans les étages d’avant.'
    : r.potLeft > 0 ? `Il te restait ${r.potLeft} potion${r.potLeft > 1 ? 's' : ''} : utilise-les plus tôt, ou laisse le mode AUTO le faire.`
    : r.guardLeft > 0 && r.boss ? 'La Garde n’a pas servi : garde-la pour l’attaque annoncée du boss.'
    : 'Au camp, la Forge (vie) et le Bastion (défense) aident à tenir plus longtemps.';
  lines.push(h('p.dim', '💡 ', tip));
  return h('div.res-report', lines);
}

/** Daily objectives and achievements earned by this expedition. */
function progressLines(s) {
  const p = s.progress; if (!p) return null;
  const rows = [];
  if (s.nightmareOpened) rows.push(h('p.res-unlock', icon('nm_emblem', '🔥', 'res-ic'), h('span', h('b', 'Mode Cauchemar débloqué ! '), 'Choisis des malédictions au départ pour gagner plus d’éclats.')));
  for (const o of p.dailies) rows.push(h('p.res-unlock', icon('daily_chest', '📜', 'res-ic'), h('span', h('b', 'Objectif du jour réussi : '), `${o.text} · +${o.reward} 💎`)));
  for (const a of p.achievements) rows.push(h('p.res-unlock', icon(a.art, a.ic, 'res-ic'), h('span', h('b', `Exploit : ${a.name}`), ` · +${a.reward} 💎`)));
  return rows.length ? h('div.res-progress', rows) : null;
}

/** A reachable goal for the next expedition. */
function nextGoal(summary) {
  const z = Math.min(ZONES.length - 1, Math.floor((summary.floor - 1) / BAL.zoneSize));
  const bossFloor = (z + 1) * BAL.zoneSize;
  if (summary.outcome === 'win') return 'La tour est vaincue. Le mode Cauchemar arrive bientôt…';
  return `Prochain objectif : vaincre ${BOSSES[ZONES[z].boss].name} à l’étage ${bossFloor}.`;
}

export function showResults(root, { summary, team, onCamp }) {
  const o = summary.outcome;
  const title = o === 'win' ? 'La tour est vaincue !' : o === 'retreat' ? 'Retour au camp' : 'L’équipe est tombée…';
  const pose = o === 'win' ? 'win' : o === 'retreat' ? 'win' : 'ko';
  playMusic(o === 'win' ? 'm_victory' : o === 'retreat' ? 'm_title' : 'm_defeat');
  root.replaceChildren(h('div.page.center.results.' + o, { style: { '--scr': `url(img/${o === 'lose' ? 'scr_defeat' : 'scr_victory'}.webp)` } },
    h('div.res-heroes', team.map(id => img(`${HEROES[id].sprite}_${pose}`, 'res-hero'))),
    h('h2', title),
    h('p.lead', o === 'lose' ? `Défaite à l’étage ${summary.floor}.` : o === 'retreat' ? `Expédition terminée à l’étage ${summary.floor}.` : 'Vorthax le Lié est tombé. Les 100 étages sont à toi.'),
    summary.record ? h('p.record', `🏆 Nouveau record : étage ${summary.floor} !`) : null,
    summary.unlocked ? h('p.record', `🚩 Nouveau point de départ : étage ${summary.unlocked}`) : null,
    h('div.summary',
      h('p', h('b', `💎 ${summary.kept + (summary.progress ? summary.progress.shards : 0)} éclats`), ' rapportés au camp'),
      summary.curses && summary.curses.length ? h('p.dim', `🔥 Cauchemar ${summary.curses.length}`) : null,
      summary.lost ? h('p.dim', `${summary.lost} éclats perdus dans la tour`) : null,
      h('p.dim', `${summary.fights} combat${summary.fights > 1 ? 's' : ''} · ${summary.kills} ennemi${summary.kills > 1 ? 's' : ''} vaincu${summary.kills > 1 ? 's' : ''} · ${summary.bosses || 0} boss vaincu${(summary.bosses || 0) > 1 ? 's' : ''}`),
      summary.relics && summary.relics.length ? h('p.dim', `Reliques : ${summary.relics.map(k => RELICS[k] ? RELICS[k].ic : '').join(' ')}`) : null),
    o === 'lose' ? defeatLines(summary.report) : null,
    progressLines(summary),
    h('p.res-goal', '🎯 ', nextGoal(summary)),
    h('button.btn.primary.wide', { type: 'button', onclick: onCamp }, 'Aller au camp')));
}

export function showCamp(root, { meta, onBuy, onBack, onRefund, onWipe }) {
  const s = meta.stats;
  root.replaceChildren(h('div.page',
    h('header.ptop', h('button.back', { type: 'button', onclick: onBack, 'aria-label': 'Retour' }, '←'), h('h2', 'Le camp')),
    img('camp_scene', 'scene-art'),
    h('p.lead', 'Les éclats rapportés de la tour renforcent le camp. Ces améliorations sont permanentes.'),
    h('p.shards', `💎 ${meta.shards} éclats`),
    h('div.upgrades', Object.entries(UPGRADES).map(([k, U]) => {
      const lv = meta.upgrades[k], cost = upgradeCost(meta, k);
      return h('div.upg',
        h('div.upg-ic', icon(U.art, U.ic, 'upg-img')),
        h('div.upg-body', h('b', U.name), h('p', lv ? U.desc(lv) : 'Pas encore construit'), h('div.lvl', U.costs.map((_, i) => h('i' + (i < lv ? '.on' : ''))))),
        cost == null ? h('span.max', 'Max') : h('button.btn.small' + (meta.shards >= cost ? '.primary' : ''), { type: 'button', disabled: meta.shards < cost ? true : null, onclick: () => { sfx('levelup'); onBuy(k); } }, `${cost} 💎`, h('span.soon', `→ ${U.desc(lv + 1)}`)));
    })),
    h('p.dim.stats', `Expéditions : ${s.runs} · victoires : ${s.wins} · retraites : ${s.retreats} · défaites : ${s.defeats} · meilleur étage : ${s.bestFloor} / 100`),
    // prototype: test tools, easy to remove before release
    h('div.camp-reset',
      h('p.dim', 'Outils de test (prototype)'),
      h('button.btn.wide', { type: 'button', onclick: onRefund }, '♻️ Rembourser les améliorations', h('span.soon', 'Remet le camp à zéro et rend tous les éclats dépensés')),
      h('button.btn.wide.danger', { type: 'button', onclick: onWipe }, '🗑️ Tout effacer', h('span.soon', 'Repartir de zéro : éclats, camp, départs, trophées')))));
}
