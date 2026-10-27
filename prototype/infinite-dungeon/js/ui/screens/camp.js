// End of expedition summary and the camp (permanent upgrades).
import { h, img, icon } from '../dom.js';
import { sfx, playMusic } from '../audio.js';
import { UPGRADES } from '../../data/balance.js';
import { upgradeCost } from '../../run/meta.js';
import { HEROES } from '../../data/heroes.js';

export function showResults(root, { summary, team, onCamp }) {
  const o = summary.outcome;
  const title = o === 'win' ? 'La tour est vaincue !' : o === 'retreat' ? 'Retour au camp' : 'L’équipe est tombée…';
  const pose = o === 'win' ? 'win' : o === 'retreat' ? 'win' : 'ko';
  playMusic(o === 'win' ? 'm_victory' : o === 'retreat' ? 'm_theme' : 'm_defeat');
  root.replaceChildren(h('div.page.center.results.' + o,
    h('div.res-heroes', team.map(id => img(`${HEROES[id].sprite}_${pose}`, 'res-hero'))),
    h('h2', title),
    h('p.lead', o === 'lose' ? `Défaite à l’étage ${summary.floor}.` : o === 'retreat' ? `Expédition terminée à l’étage ${summary.floor}.` : 'Vorthax le Lié est tombé. Les 50 étages sont à toi.'),
    summary.record ? h('p.record', `🏆 Nouveau record : étage ${summary.floor} !`) : null,
    summary.unlocked ? h('p.record', `🚩 Nouveau point de départ : étage ${summary.unlocked}`) : null,
    h('div.summary',
      h('p', h('b', `💎 ${summary.kept} éclats`), ' rapportés au camp'),
      summary.lost ? h('p.dim', `${summary.lost} éclats perdus dans la tour`) : null,
      h('p.dim', `${summary.fights} combats · ${summary.kills} ennemis vaincus`)),
    h('button.btn.primary.wide', { type: 'button', onclick: onCamp }, 'Aller au camp')));
}

export function showCamp(root, { meta, onBuy, onBack }) {
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
    h('p.dim.stats', `Expéditions : ${s.runs} · victoires : ${s.wins} · retraites : ${s.retreats} · défaites : ${s.defeats} · meilleur étage : ${s.bestFloor} / 50`)));
}
