// v0.5 — Trophy room: today's objectives, achievements, bosses beaten,
// relics discovered and records per hero. Read-only view of meta.
import { h, img, icon, toast } from '../dom.js';
import { HEROES, HERO_ORDER } from '../../data/heroes.js';
import { RELICS } from '../../data/items.js';
import { BOSSES, ZONES } from '../../data/monsters.js';
import { ACHIEVEMENTS, dailyFor, dayKey, NIGHTMARE_UNLOCK } from '../../data/progress.js';

export function showTrophies(root, { meta, onBack }) {
  const day = dayKey(), done = meta.daily.day === day ? meta.daily.done : [];
  const daily = dailyFor(day, { nightmare: (meta.unlocked || 1) >= NIGHTMARE_UNLOCK });
  const section = (title, ...kids) => h('section.tro-sec', h('h3', title), ...kids);

  const dailyEl = h('div.daily-list', daily.map(o => h('div.daily' + (done.includes(o.key) ? '.done' : ''),
    h('span.daily-check', done.includes(o.key) ? '✓' : ''), h('div.daily-body', h('b', o.text), h('span', `💎 ${o.reward} éclats`)))));

  const achEl = h('div.ach-grid', ACHIEVEMENTS.map(a => {
    const got = meta.ach.includes(a.id);
    return h('button.ach' + (got ? '.got' : ''), { type: 'button', onclick: () => toast(`${a.name} : ${a.desc} (💎 ${a.reward})${got ? ' ✓' : ''}`, 3500) },
      icon(a.art, a.ic, 'ach-img'), h('b', a.name));
  }));

  const bossEl = h('div.boss-grid', ZONES.map(z => {
    const B = BOSSES[z.boss], got = meta.bossesBeaten.includes(z.boss);
    return h('div.boss-cell' + (got ? '.got' : ''), img(z.boss, 'boss-img'), h('span', got ? B.name : '???'));
  }));

  const relicEl = h('div.relic-grid', Object.entries(RELICS).map(([k, R]) => {
    const got = meta.relicsSeen.includes(k);
    return h('button.relic' + (got ? '' : '.unseen'), { type: 'button', 'aria-label': got ? R.name : 'Relique inconnue', onclick: () => toast(got ? `${R.name} : ${R.desc}` : 'Relique pas encore découverte.', 3500) },
      got ? icon(R.art, R.ic, 'relic-img') : icon('ach_mystery', '❔', 'relic-img'));
  }));

  const heroEl = h('div.hero-best', HERO_ORDER.map(id => h('div.hb', img(`${HEROES[id].sprite}-face`, 'tface'), h('b', HEROES[id].name), h('span', `Étage ${meta.heroBest[id] || 0}`))));

  root.replaceChildren(h('div.page.trophies', { style: { '--scr': 'url(img/scr_trophies.webp)' } },
    h('header.ptop', h('button.back', { type: 'button', onclick: onBack, 'aria-label': 'Retour' }, '←'), h('h2', 'Salle des trophées')),
    section(h('span', icon('daily_quest', '📜', 'sec-ic'), ' Objectifs du jour'), h('p.dim', 'Trois défis chaque jour, réussis pendant une expédition. Aucune pénalité si tu ne joues pas.'), dailyEl),
    section(h('span', icon('ach_medal', '🏅', 'sec-ic'), ` Exploits ${meta.ach.length}/${ACHIEVEMENTS.length}`), achEl),
    section(h('span', icon('ach_trophy', '💀', 'sec-ic'), ` Boss vaincus ${meta.bossesBeaten.length}/${ZONES.length}`), bossEl),
    section(h('span', icon('ach_journal', '📖', 'sec-ic'), ` Reliques découvertes ${meta.relicsSeen.length}/${Object.keys(RELICS).length}`), relicEl),
    section(h('span', icon('ach_flag', '🚩', 'sec-ic'), ' Records par héros'), heroEl,
      h('p.dim', `Meilleur étage : ${meta.stats.bestFloor} / 100 · expéditions : ${meta.stats.runs}${meta.nmBest ? ` · Cauchemar ${meta.nmBest} vaincu` : ''}`))));
}
