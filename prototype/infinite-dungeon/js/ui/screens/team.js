// Team selection: 3 heroes out of 5.
import { h, img } from '../dom.js';
import { sfx } from '../audio.js';
import { HEROES, HERO_ORDER, SKILLS } from '../../data/heroes.js';

export function showTeam(root, { initial = ['aldric', 'selena', 'orin'], onStart, onBack }) {
  const picked = initial.filter(id => HEROES[id]).slice(0, 3);
  const go = h('button.btn.primary.wide', { type: 'button' });
  const count = h('p.hint');
  const cards = HERO_ORDER.map(id => {
    const H = HEROES[id];
    const el = h('button.hero-pick', { type: 'button', 'aria-pressed': 'false' },
      img(`${H.sprite}-face`, 'face'),
      h('div.hp-body',
        h('div.hp-head', h('b', H.name), h('span.role.' + H.role, H.roleN)),
        h('p.passive', h('b', `${H.passive.name} : `), H.passive.desc),
        h('p.skills', H.skills.map(k => h('span.sk', `${SKILLS[k].ic} ${SKILLS[k].name}`)), h('span.sk.ult', `🌟 ${H.ult.name}`))),
      h('span.check', '✓'));
    el.addEventListener('click', () => {
      const i = picked.indexOf(id);
      if (i >= 0) picked.splice(i, 1); else if (picked.length < 3) picked.push(id); else { picked.shift(); picked.push(id); }
      sfx('ui_click'); paint();
    });
    return { id, el };
  });
  function paint() {
    for (const c of cards) { const on = picked.includes(c.id); c.el.classList.toggle('on', on); c.el.setAttribute('aria-pressed', String(on)); }
    count.textContent = picked.length === 3 ? 'Équipe prête.' : `Choisis encore ${3 - picked.length} héros.`;
    go.disabled = picked.length !== 3;
    go.textContent = 'Entrer dans le donjon';
  }
  go.addEventListener('click', () => { if (picked.length === 3) onStart(picked.slice()); });
  root.replaceChildren(h('div.page',
    h('header.ptop', h('button.back', { type: 'button', onclick: onBack, 'aria-label': 'Retour' }, '←'), h('h2', 'Ton équipe')),
    h('p.lead', 'Choisis 3 héros. Une équipe avec Séléna survit plus facilement ; sans soigneuse, garde des potions.'),
    h('div.pick-list', cards.map(c => c.el)),
    h('div.pfoot', count, go)));
  paint();
}
