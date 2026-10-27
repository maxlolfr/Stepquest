// Game controller: holds the save (meta + run), shows the right screen for the
// run's phase, and saves after every step. Screens never change game state
// themselves: they call back here, and this calls the run/ rules.
import { h, toast } from './dom.js';
import { getSettings, persistSettings, preloadSfx, playMusic, sfx } from './audio.js';
import { showTitle, hideTitle } from './screens/title.js';
import { showTeam } from './screens/team.js';
import { showMap, showCheckpoint } from './screens/map.js';
import { showCards, showRest, showShop, showEvent } from './screens/rooms.js';
import { showResults, showCamp } from './screens/camp.js';
import { runBattle } from './screens/battle.js';
import { loadSave, writeSave } from '../save/storage.js';
import { newRun, chooseDoor, battleConfig, finishBattle, pickCard, reroll, rest, buy, resolveEvent, leaveRoom, continueRun, retreat, endRun, currentDoor, refreshTeam, startFloors } from '../run/run.js';
import { buyUpgrade } from '../run/meta.js';
import { newSeed } from '../core/rng.js';
import { HEROES } from '../data/heroes.js';
import { zoneOf } from '../data/monsters.js';

const view = () => document.getElementById('view');
export const app = { data: null, lastTeam: ['aldric', 'selena', 'orin'], saveFailed: false };

export function save() {
  const ok = writeSave(app.data);
  if (!ok && !app.saveFailed) toast('⚠️ Impossible d’enregistrer la partie sur cet appareil (stockage plein ou privé).', 4500);
  app.saveFailed = !ok;
  return ok;
}

export function startApp() {
  const { data, warning } = loadSave();
  app.data = data;
  if (data.run) { refreshTeam(data.run, data.meta); app.lastTeam = data.run.team.map(t => t.id); }
  if (warning) setTimeout(() => toast(warning, 5000), 1200);
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  goTitle();
}

export function goTitle() {
  showTitle(() => {
    const { run, meta } = app.data, items = [];
    if (run) items.push({ label: 'Continuer l’expédition', sub: `Étage ${run.floor} · ${run.team.map(t => HEROES[t.id].name).join(', ')}`, primary: true, action: () => route() });
    items.push({ label: 'Nouvelle expédition', sub: run ? 'Abandonne l’expédition en cours' : '3 héros · 100 étages · 10 boss', primary: !run, action: newExpedition });
    items.push({ label: 'Le camp', sub: `💎 ${meta.shards} éclats`, action: goCamp });
    return items;
  });
}

function newExpedition() {
  if (app.data.run && !window.confirm('Abandonner l’expédition en cours ? Elle compte comme une défaite (la moitié des éclats non sécurisés est gardée).')) return;
  if (app.data.run) { app.data.run.outcome = 'lose'; endRun(app.data.meta, app.data.run); app.data.run = null; save(); }
  hideTitle();
  showTeam(view(), { initial: app.lastTeam, starts: startFloors(app.data.meta), onBack: goTitle, onStart: (ids, start) => startRun(ids, { start }) });
}

export function startRun(ids, { seed = newSeed(), floor = 0, start = 1 } = {}) {
  app.lastTeam = ids;
  const run = newRun(app.data.meta, ids, seed, start);
  if (floor) run.floor = floor; // debug panel
  app.data.run = run;
  save();
  route();
}

function goCamp() {
  hideTitle();
  const draw = () => showCamp(view(), { meta: app.data.meta, onBack: goTitle, onBuy: k => { if (buyUpgrade(app.data.meta, k)) { save(); draw(); } } });
  playMusic('m_theme');
  draw();
}

/** Shows the screen matching the run's phase. */
export function route() {
  const run = app.data.run, meta = app.data.meta;
  if (!run) return goTitle();
  hideTitle();
  const next = () => { save(); route(); };
  switch (run.phase) {
    case 'map':
      playMusic(zoneOf(run.floor).music);
      return showMap(view(), { run, onQuit: goTitle, onDoor: i => { chooseDoor(run, i); next(); } });
    case 'battle': return fight();
    case 'reward': return showCards(view(), { run, kind: 'reward', onPick: i => { pickCard(run, i, meta); next(); }, onReroll: () => { reroll(run); sfx('ui_click'); next(); } });
    case 'checkpoint': return showCheckpoint(view(), { run, onContinue: () => { continueRun(run); next(); }, onRetreat: () => { retreat(run); next(); } });
    case 'room': {
      const p = run.pending;
      if (p.kind === 'chest') return showCards(view(), { run, kind: 'chest', onPick: i => { pickCard(run, i, meta); next(); } });
      if (p.kind === 'train') return showCards(view(), { run, kind: 'train', onPick: i => { pickCard(run, i, meta); next(); }, onSkip: () => { leaveRoom(run); next(); } });
      if (p.kind === 'rest') return showRest(view(), { run, onHeal: () => { sfx('levelup'); rest(run, 'heal', meta); next(); }, onTrain: () => { rest(run, 'train', meta); next(); }, onRetreat: () => { retreat(run); next(); } });
      if (p.kind === 'shop') return showShop(view(), { run, onBuy: id => { if (buy(run, id, meta)) sfx('coin'); next(); }, onLeave: () => { leaveRoom(run); next(); } });
      if (p.kind === 'event' || p.kind === 'event-done') return showEvent(view(), { run, onChoice: i => { const r = resolveEvent(run, i, meta); if (!r.ok) toast(r.text); next(); }, onLeave: () => { leaveRoom(run); next(); } });
      break;
    }
    case 'over': {
      const summary = endRun(meta, run), team = run.team.map(t => t.id);
      app.data.run = null; save();
      return showResults(view(), { summary, team, onCamp: goCamp });
    }
    default: break;
  }
  // unknown state: never leave the player stuck
  toast('Étape inconnue : retour au menu.');
  app.data.run = null; save(); goTitle();
}

async function fight() {
  const run = app.data.run, meta = app.data.meta, door = currentDoor(run);
  const settings = getSettings();
  settings.onChange = persistSettings;
  preloadSfx(['s_impact', 'crit', 'foe_die', 'hero_hurt', 'dodge', 'ald_sword', 'sel_mace', 'ori_bolt', 'lyr_arrow', 'nyx_dagger', 'aoe_warning', 'ult_cutin', 'poison', 'burn']);
  view().replaceChildren(h('div.loading', 'Le combat se prépare…'));
  const res = await runBattle(view(), { config: battleConfig(run, meta), door, floor: run.floor, settings });
  finishBattle(run, res.result, res.heroes, res.kills, app.data.meta);
  if (run.lvUp && run.phase !== 'over') { sfx('levelup'); toast(`Niveau ${run.lv} ! Les héros sont plus forts.`); }
  save();
  route();
}
