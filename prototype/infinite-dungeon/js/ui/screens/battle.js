// Battle screen: runs the engine step by step and plays its events back with
// animations. The player can pause, change speed, launch ultimates (tap a full
// portrait), use Guard, potions and phoenix feathers at any moment.
import { h, bar, icon } from '../dom.js';
import { createView } from '../battle-view.js';
import { loadImages } from '../loader.js';
import { spriteKeys, IMAGES } from '../assets.js';
import { sfx, playMusic } from '../audio.js';
import { HEROES } from '../../data/heroes.js';
import { BAL } from '../../data/balance.js';
import { DOOR_INFO } from '../../run/dungeon.js';
import { createBattle, step, castUltimate, canUlt, useGuard, canGuard, useItem, canItem, heroesOf, foesOf, alive, unitByUid, heroResults } from '../../engine/combat.js';

const SPEEDS = [1, 2, 4];
const EL_COL = { feu: '#ff8a3d', glace: '#8fd8ff', poison: '#9dff6a', foudre: '#ffe46b', phys: '#ffffff' };
const sleep = ms => new Promise(r => setTimeout(r, ms));

/** Shows a fight; resolves with the finished engine state. */
export async function runBattle(root, { config, door, floor, settings }) {
  const B = createBattle(config);
  // preload sprites for everyone on stage (+ skeletons the boss may summon)
  const keys = new Set([door.bg, 'fx_slash', 'fx_fire', 'fx_ice', 'fx_heal', 'fx_ult']);
  for (const u of B.units) for (const k of spriteKeys(u.sprite)) keys.add(k);
  if (B.units.some(u => u.boss)) for (const k of spriteKeys('skel')) keys.add(k);
  for (const u of heroesOf(B)) keys.add(`ult_${u.id}`);
  await loadImages([...keys]);
  playMusic(door.music);

  let speed = SPEEDS.includes(settings.speed) ? settings.speed : 1, paused = false, wake = null;
  const actions = [];
  const info = DOOR_INFO[door.type];

  // ---- DOM
  const canvas = h('canvas.stage-cv', { 'aria-label': 'Combat' });
  const banner = h('div.banner', { hidden: true });
  const cutin = h('div.cutin', { hidden: true });
  const pauseBtn = h('button.round-btn', { type: 'button', 'aria-label': 'Pause' }, 'II');
  const speedBtn = h('button.round-btn.speed', { type: 'button', 'aria-label': 'Vitesse' }, `×${speed}`);
  const roundLbl = h('span.round', 'Tour 1');
  const pauseVeil = h('div.pause-veil', { hidden: true }, h('p', 'Pause'), h('p.small', 'Touche l’écran pour reprendre'));
  const heroCards = heroesOf(B).map(u => {
    const el = h('button.hcard', { type: 'button', 'aria-label': `Ultime de ${u.name}` },
      h('img.face', { src: IMAGES[`${u.sprite}-face`], alt: '' }),
      h('div.hname', u.name), h('div.hpline'), h('div.ultline'), h('div.ulttag', 'ULTIME !'));
    el.addEventListener('click', () => { if (canUlt(B, u)) { actions.push(() => castUltimate(B, u.uid)); sfx('ui_click'); el.classList.add('queued'); kick(); } });
    return { u, el };
  });
  const guardBtn = h('button.act', { type: 'button' }, h('span.emoji', '🛡️'), h('b', 'Garde'), h('small'));
  const potBtn = h('button.act', { type: 'button' }, icon('uiPotion', '🧪', 'act-ic'), h('b', 'Potion'), h('small'));
  const feaBtn = h('button.act', { type: 'button' }, h('span.emoji', '🪶'), h('b', 'Phénix'), h('small'));
  guardBtn.addEventListener('click', () => { if (canGuard(B)) { actions.push(() => useGuard(B)); kick(); } });
  potBtn.addEventListener('click', () => { if (canItem(B, 'pot')) { actions.push(() => useItem(B, 'pot')); kick(); } });
  feaBtn.addEventListener('click', () => { if (canItem(B, 'fea')) { actions.push(() => useItem(B, 'fea')); kick(); } });
  const togglePause = () => { paused = !paused; pauseBtn.textContent = paused ? '▶' : 'II'; pauseBtn.setAttribute('aria-label', paused ? 'Reprendre' : 'Pause'); pauseVeil.hidden = !paused; kick(); };
  pauseBtn.addEventListener('click', togglePause);
  pauseVeil.addEventListener('click', togglePause);
  speedBtn.addEventListener('click', () => { speed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]; settings.speed = speed; speedBtn.textContent = `×${speed}`; view.speed = speed; settings.onChange && settings.onChange(); });

  root.replaceChildren(h('div.battle',
    h('header.btop', h('div.floor', h('b', `Étage ${floor}`), h('span', ` · ${info.name}`)), roundLbl, h('div.btns', speedBtn, pauseBtn)),
    h('div.stage', canvas, banner, cutin, pauseVeil),
    h('div.bpanel', h('div.hcards', heroCards.map(c => c.el)), h('div.acts', guardBtn, potBtn, feaBtn)),
  ));
  const view = createView(canvas, B, door);
  view.speed = speed;

  function refresh() {
    for (const { u, el } of heroCards) {
      el.querySelector('.hpline').replaceChildren(bar(u.hp / u.hpMax, 'hp'), h('span.num', `${u.hp}/${u.hpMax}`));
      el.querySelector('.ultline').replaceChildren(bar(u.ult / BAL.ultMax, 'ult'));
      el.classList.toggle('ready', canUlt(B, u));
      el.classList.toggle('dead', !alive(u));
      if (!canUlt(B, u)) el.classList.remove('queued');
    }
    guardBtn.disabled = !canGuard(B); guardBtn.querySelector('small').textContent = B.round <= B.guardUntil ? 'active' : `×${B.guardLeft}`;
    guardBtn.classList.toggle('warn', canGuard(B) && foesOf(B).some(f => alive(f) && f.charge));
    potBtn.disabled = !canItem(B, 'pot'); potBtn.querySelector('small').textContent = `×${B.items.pot}`;
    feaBtn.disabled = !canItem(B, 'fea'); feaBtn.querySelector('small').textContent = `×${B.items.fea}`;
    roundLbl.textContent = `Tour ${Math.max(1, B.round)}`;
  }

  function kick() { if (wake) { const w = wake; wake = null; w(); } }
  const wait = ms => new Promise(res => { const t = setTimeout(() => { wake = null; res(); }, ms / speed); wake = () => { clearTimeout(t); res(); }; });

  let bannerTimer = 0;
  function say(text, kind = '', ms = 1800) {
    banner.className = 'banner ' + kind; banner.textContent = text; banner.hidden = false;
    clearTimeout(bannerTimer); bannerTimer = setTimeout(() => { banner.hidden = true; }, ms / Math.min(speed, 2));
  }

  async function showCutin(u, name) {
    sfx('ult_cutin', 0.7);
    cutin.replaceChildren(h('img', { src: IMAGES[`ult_${u.id}`], alt: '' }), h('div.cut-txt', h('b', name), h('span', u.name)));
    cutin.hidden = false; cutin.classList.remove('go'); void cutin.offsetWidth; cutin.classList.add('go');
    view.screenFlash();
    await sleep(900 / Math.min(speed, 2));
    cutin.hidden = true;
  }

  // ---- event playback
  let lastFx = 'slash', lastActor = null;
  async function play(events) {
    for (const e of events) {
      const u = e.uid ? unitByUid(B, e.uid) : null;
      switch (e.t) {
        case 'turn': view.actor = e.uid; break;
        case 'round': break;
        case 'act': {
          lastActor = u; lastFx = e.fx || 'slash';
          if (e.kind === 'ult') { await showCutin(u, e.name); sfx(e.sfx); }
          else if (e.kind === 'skill') { say(`${e.ic || ''} ${u.name} : ${e.name}`, 'skill', 1300); sfx(e.sfx); }
          else if (e.sfx) sfx(e.sfx, 0.5);
          else if (u.side === 'f') sfx('s_impact', 0.45);
          if (e.big) { say(`☠ ${e.name} !`, 'danger', 1400); view.doShake(14, 500); }
          const tgt = e.targets && e.targets.length === 1 ? unitByUid(B, e.targets[0]) : null;
          view.pose(u, e.pose === 'blast' ? 'blast' : e.pose, 520);
          if (e.melee && tgt && tgt !== u) {
            const a = view.pos(u), b = view.pos(tgt), dir = u.side === 'h' ? -1 : 1;
            const to = { ox: b.x + dir * (b.h * 0.32 + a.h * 0.2) - (a.x - view.unit(u).ox), oy: (b.y - a.y) * 0.6 };
            await view.tween(u, to, 230);
            u._lunged = true;
          } else await wait(e.kind === 'foe' && u.boss ? 380 : 260);
          break;
        }
        case 'dmg': {
          const t = u; if (!t) break;
          const col = e.thorns ? '#9dff6a' : t.side === 'h' ? '#ff6b5e' : e.crit ? '#ffd23f' : EL_COL[e.el] || '#fff';
          const txt = e.amt > 0 ? `${e.crit ? '' : ''}${e.amt}${e.crit ? '!' : ''}` : (e.absorbed ? `(${e.absorbed})` : '0');
          view.text(t, txt, col, e.crit);
          if (e.weak) view.text(t, 'Faible !', '#ffd23f');
          if (e.resist) view.text(t, 'Résiste', '#aab');
          if (!e.dot) {
            const fx = e.el === 'feu' ? 'fire' : e.el === 'glace' ? 'ice' : lastFx === 'heal' ? 'slash' : lastFx;
            view.strip(fx, t); view.flash(t); view.pose(t, 'hit', 300);
            if (e.crit) { sfx('crit', 0.55); view.doShake(7, 220); }
            if (t.side === 'h' && e.amt > 0) sfx('hero_hurt', 0.35);
          } else { view.flash(t); sfx(e.el === 'feu' ? 'burn' : 'poison', 0.35); }
          refresh();
          await wait(e.dot ? 260 : 150);
          break;
        }
        case 'miss': view.text(u, 'Esquive', '#cfe6ff'); sfx('dodge', 0.5); await wait(180); break;
        case 'heal': if (e.amt > 0 && !e.quiet) { view.text(u, `+${e.amt}`, '#7dff9a'); view.strip('heal', u); } else if (e.amt > 0) view.text(u, `+${e.amt}`, '#7dff9a'); refresh(); await wait(e.quiet ? 60 : 200); break;
        case 'shield': view.text(u, `💠 ${e.amt}`, '#9fd4ff'); view.ring(u, '140,200,255'); await wait(120); break;
        case 'status': {
          if (e.immune) { view.text(u, 'Immunisé', '#cfe6ff'); break; }
          const lab = { poison: '☠️ Poison', burn: '🔥 Brûlure', stun: '💫 Étourdi', freeze: '❄️ Gelé', mark: '🎯 Marqué', taunt: '🛡️ Provocation' }[e.st];
          if (lab) view.text(u, lab, '#fff');
          const s = { poison: 'poison', burn: 'burn', stun: 'stun', freeze: 'freeze' }[e.st]; if (s) sfx(s, 0.45);
          await wait(140); break;
        }
        case 'skip': view.text(u, e.why === 'gelé' ? '❄️ Gelé' : '💫 Étourdi', '#cfe6ff'); await wait(420); break;
        case 'ko': view.pose(u, 'ko', 600); sfx(u.side === 'f' ? 'foe_die' : 'hero_hurt', 0.6); view.sparks(u, u.side === 'f' ? '255,200,120' : '255,90,80'); refresh(); await wait(320); break;
        case 'revive': view.text(u, 'Debout !', '#7dff9a'); view.strip('heal', u); view.unit(u).alpha = 1; say(e.text, '', 1400); refresh(); await wait(500); break;
        case 'charge': say(`⚠️ ${e.text}`, 'danger', 2600); sfx('aoe_warning', 0.8); view.ring(u, '255,60,40', view.pos(u).h); refresh(); await wait(1100); break;
        case 'phase': say(e.text, 'danger', 2600); sfx('boss_phase', 0.8); view.doShake(16, 600); view.screenFlash(); refresh(); await wait(1300); break;
        case 'summon': view.unit(u).alpha = 0; view.unit(u).spawn = performance.now(); view.sparks(u, '200,200,255', 14); await wait(400); break;
        case 'say': say(e.text, e.big ? 'danger' : '', 1700); await wait(e.big ? 700 : 450); break;
        case 'guard': sfx('enemy_shield', 0.7); for (const x of heroesOf(B)) if (alive(x)) view.ring(x, '140,200,255'); refresh(); await wait(350); break;
        case 'item': sfx('levelup', 0.5); break;
        case 'end': break;
        default: break;
      }
    }
    if (lastActor && lastActor._lunged) { lastActor._lunged = false; await view.tween(lastActor, { ox: 0, oy: 0 }, 200); }
    lastActor = null; view.actor = 0;
  }

  refresh();
  await sleep(500);
  while (!B.over) {
    while (paused) await new Promise(r => { wake = r; });
    const ev = actions.length ? actions.shift()() : step(B);
    await play(ev);
    refresh();
    if (!actions.length) await wait(B.units.some(u => u.boss) ? 240 : 170);
  }
  say(B.over === 'win' ? 'Victoire !' : 'Défaite…', B.over === 'win' ? 'win' : 'danger', 3000);
  for (const u of heroesOf(B)) if (alive(u) && B.over === 'win') view.pose(u, 'cast', 900);
  playMusic(B.over === 'win' ? 'm_victory' : 'm_defeat');
  await sleep(1500);
  view.stop();
  return { B, result: B.over, heroes: heroResults(B), kills: foesOf(B).filter(f => !alive(f)).length };
}
