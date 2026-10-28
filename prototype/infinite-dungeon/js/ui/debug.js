// Test mode (?debug): pick a seed, a floor, a team and jump straight to a
// fight; add shards; export or import a save code. Never shown otherwise.
import { h, toast } from './dom.js';
import { app, startRun, save, goTitle, route } from './app.js';
import { HERO_ORDER, HEROES } from '../data/heroes.js';
import { floorOf } from '../run/run.js';
import { chooseDoor } from '../run/run.js';
import { exportCode, importCode } from '../save/storage.js';
import { missingAssets } from './loader.js';
import { UPGRADES, BAL } from '../data/balance.js';
import { RELICS } from '../data/items.js';
import { newMeta } from '../run/meta.js';
import { GAME } from '../config.js';

export function mountDebug() {
  const box = document.getElementById('debug');
  box.hidden = false;
  const info = h('pre.dbg-info');
  const paint = () => {
    const miss = missingAssets();
    info.textContent = `debug · v${GAME.version} · ${innerWidth}×${innerHeight} @${devicePixelRatio}x\n` + (miss.length ? `Fichiers manquants (${miss.length}) :\n${miss.join('\n')}` : 'Tous les fichiers chargés.');
  };
  paint(); setInterval(paint, 2000);

  const seed = h('input', { type: 'number', value: '12345', inputmode: 'numeric', 'aria-label': 'Graine' });
  const floor = h('select', { 'aria-label': 'Étage' }, Array.from({ length: 100 }, (_, i) => h('option', { value: i + 1 }, `Étage ${i + 1}`)));
  const teamSel = HERO_ORDER.map(id => h('label', h('input', { type: 'checkbox', value: id, checked: ['aldric', 'selena', 'orin'].includes(id) ? true : null }), HEROES[id].name));
  const team = () => teamSel.map(l => l.firstChild).filter(c => c.checked).map(c => c.value);
  const go = type => {
    const ids = team();
    if (ids.length !== 3) return toast('Coche exactement 3 héros.');
    const f = type === 'boss' ? Math.ceil(+floor.value / 10) * 10 : +floor.value;
    startRun(ids, { seed: +seed.value >>> 0, floor: f });
    const run = app.data.run;
    if (type !== 'map') {
      const i = floorOf(run).doors.findIndex(d => d.type === type);
      if (i < 0) return toast(`Pas de porte « ${type} » à cet étage.`);
      chooseDoor(run, i); save(); route();
    }
    box.classList.remove('open');
  };
  const panel = h('div.dbg-panel',
    h('div.dbg-row', h('span', 'Graine'), seed, floor),
    h('div.dbg-row.team', teamSel),
    h('div.dbg-row',
      h('button', { type: 'button', onclick: () => go('map') }, 'Carte'),
      h('button', { type: 'button', onclick: () => go('fight') }, 'Combat'),
      h('button', { type: 'button', onclick: () => go('elite') }, 'Élite'),
      h('button', { type: 'button', onclick: () => go('cursed') }, 'Maudite'),
      h('button', { type: 'button', onclick: () => go('boss') }, 'Boss'),
      h('button', { type: 'button', onclick: () => { const run = app.data.run; if (!run) return toast('Lance d’abord une expédition.'); run.relics = Object.keys(RELICS).filter(k => !run.relics.includes(k)).slice(0, Math.max(0, BAL.relicMax - run.relics.length)).concat(run.relics).slice(0, BAL.relicMax); save(); toast(`Reliques : ${run.relics.length}/${BAL.relicMax}`); route(); box.classList.remove('open'); } }, 'Reliques pleines')),
    h('div.dbg-row',
      h('button', { type: 'button', onclick: () => { app.data.meta.shards += 500; app.data.meta.unlocked = 91; save(); toast('+500 éclats, départs débloqués'); goTitle(); } }, '+500 éclats'),
      h('button', { type: 'button', onclick: () => { const m = app.data.meta; let back = 0; for (const [k, U] of Object.entries(UPGRADES)) { back += U.costs.slice(0, m.upgrades[k] || 0).reduce((x, y) => x + y, 0); m.upgrades[k] = 0; } m.shards += back; save(); toast(`Camp remis à zéro : +${back} éclats rendus`); goTitle(); } }, 'Rembourser le camp'),
      h('button', { type: 'button', onclick: () => { if (!window.confirm('Tout effacer et repartir de zéro ? (camp, éclats, départs, trophées, expédition en cours)')) return; app.data = { v: app.data.v, meta: newMeta(), run: null }; save(); toast('Progression remise à zéro.'); goTitle(); } }, 'Tout effacer')),
    h('div.dbg-row',
h('button', { type: 'button', onclick: () => { const c = exportCode(app.data); navigator.clipboard && navigator.clipboard.writeText(c).catch(() => {}); window.prompt('Code de sauvegarde (copié) :', c); } }, 'Exporter'),
      h('button', { type: 'button', onclick: () => { const c = window.prompt('Colle le code de sauvegarde :'); if (!c) return; const d = importCode(c); if (!d) return toast('Code invalide.'); app.data = d; save(); toast('Sauvegarde importée.'); goTitle(); } }, 'Importer')));
  box.replaceChildren(h('button.dbg-toggle', { type: 'button', onclick: () => box.classList.toggle('open') }, '🛠'), h('div.dbg-body', info, panel));
}
