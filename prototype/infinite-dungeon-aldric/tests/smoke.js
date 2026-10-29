// Browser test: serves prototype/ like GitHub Pages does, opens the game at
// iPhone sizes and plays it through the real screens: title, team, map, a
// fight, a reward, save and reload, the camp, then the boss via ?debug.
// Fails on any JavaScript error, missing file, text under 14 px or button under 44 px.
// Usage (from prototype/infinite-dungeon-aldric/): NODE_PATH=$(npm root -g) node tests/smoke.js [outDir]
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const GAME_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = path.resolve(GAME_DIR, '..');
const OUT = path.resolve(process.argv[2] || path.join(GAME_DIR, 'tests', 'out'));
fs.mkdirSync(OUT, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.woff': 'font/woff', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => {
  const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  if (!p.startsWith(ROOT)) { r.writeHead(403); return r.end(); }
  fs.readFile(p, (e, d) => {
    if (e) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(d);
  });
});

const results = [];
const check = (name, ok, extra = '') => { if (!ok) process.exitCode = 1; results.push(`${ok ? '✅' : '❌'} ${name}${extra ? ' — ' + extra : ''}`); };

// visible text under 14 px and visible buttons under 44 px
const auditUi = pg => pg.evaluate(() => {
  const vis = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden' && !el.closest('[hidden]') && !el.closest('#debug'); };
  const tiny = [...document.querySelectorAll('body *')].filter(el => vis(el) && [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(el).fontSize) < 14).map(el => `${el.tagName}.${el.className}`);
  const small = [...document.querySelectorAll('button')].filter(vis).filter(b => { const r = b.getBoundingClientRect(); return r.height < 44 || r.width < 44; }).map(b => `${b.className || b.id}:${Math.round(b.getBoundingClientRect().height)}`);
  return { tiny: [...new Set(tiny)].slice(0, 6), small: [...new Set(small)].slice(0, 6) };
});

async function waitFor(pg, fn, arg, timeout = 30000) { return pg.waitForFunction(fn, arg, { timeout }).then(() => true, () => false); }

srv.listen(0, async () => {
  const base = `http://127.0.0.1:${srv.address().port}/infinite-dungeon-aldric/index.html`;
  const browser = await chromium.launch();
  for (const [name, w, h, full] of [['iphone-se', 375, 667, false], ['iphone-15', 393, 852, true]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    const pg = await ctx.newPage(), errors = [], failed = [];
    pg.on('pageerror', e => errors.push(e.message));
    pg.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    pg.on('response', res => { if (res.status() >= 400) failed.push(`${res.status()} ${res.url()}`); });
    pg.on('dialog', d => d.accept());
    const tag = `${name} ${w}×${h}`, shot = async n => pg.screenshot({ path: path.join(OUT, `${name}-${n}.png`) });
    const ui = async where => { const a = await auditUi(pg); check(`${tag} : ${where} lisible (texte ≥ 14 px, boutons ≥ 44 px)`, !a.tiny.length && !a.small.length, [...a.tiny, ...a.small].join(', ')); };

    // fast fights for the test
    await pg.goto(base);
    await pg.evaluate(() => { localStorage.clear(); localStorage.setItem('sqid.aldric071.settings.v1', JSON.stringify({ v: 1, muted: true, speed: 4 })); });
    await pg.goto(base);
    check(`${tag} : accueil prêt`, await waitFor(pg, () => window.__sqid && window.__sqid.ready), await pg.evaluate(() => window.__sqid && window.__sqid.error || ''));
    await pg.waitForTimeout(900); await shot('1-accueil');
    await pg.tap('#tapStart'); await pg.waitForTimeout(400);
    const menu = await pg.$$eval('#menu button', b => b.map(x => x.textContent));
    check(`${tag} : menu (nouvelle expédition, camp)`, menu.some(t => /Nouvelle expédition/.test(t)) && menu.some(t => /camp/.test(t)), menu.join(' | '));
    await ui('accueil'); await shot('2-menu');

    // team
    await pg.click('#menu button:has-text("Nouvelle expédition")'); await pg.waitForTimeout(300);
    check(`${tag} : sélection d'équipe (5 héros, 3 choisis)`, (await pg.$$('.hero-pick')).length === 5 && (await pg.$$('.hero-pick.on')).length === 3);
    await ui('équipe'); await shot('3-equipe');
    await pg.click('.pfoot .btn.primary'); await pg.waitForTimeout(400);

    // map
    check(`${tag} : carte de l'étage 1`, await pg.isVisible('.doors') && /Étage 1/.test(await pg.textContent('.ptop h2')));
    await ui('carte'); await shot('4-carte');
    await pg.click('.door.fight');

    // fight
    check(`${tag} : combat lancé`, await waitFor(pg, () => !!document.querySelector('.battle'), null, 15000));
    await pg.waitForTimeout(1600); await ui('combat'); await shot('5-combat');
    await pg.click('.round-btn[aria-label="Pause"]'); await pg.waitForTimeout(200);
    check(`${tag} : pause`, await pg.isVisible('.pause-veil'));
    await pg.click('.round-btn[aria-label="Reprendre"]');
    check(`${tag} : reprise après pause`, !(await pg.isVisible('.pause-veil')));
    const ended = await waitFor(pg, () => !document.querySelector('.battle'), null, 120000);
    const after = await pg.evaluate(() => window.__sqid.app.data.run && window.__sqid.app.data.run.phase);
    check(`${tag} : le combat se termine (victoire → récompense, ou défaite → bilan)`, ended && (after === 'reward' || after === null), String(after));
    if (after === 'reward') {
      await pg.waitForTimeout(500); await ui('récompense'); await shot('6-recompense');
      check(`${tag} : 3 récompenses`, (await pg.$$('.cards .card')).length === 3);
      await pg.click('.cards .card >> nth=0'); await pg.waitForTimeout(400);
      const run = await pg.evaluate(() => window.__sqid.app.data.run);
      check(`${tag} : étage 2 atteint`, run && run.floor === 2 && run.phase === 'map');
      // save and reload
      await pg.reload(); await waitFor(pg, () => window.__sqid && window.__sqid.ready);
      await pg.tap('#tapStart'); await pg.waitForTimeout(300);
      const cont = await pg.$$eval('#menu button', b => b.map(x => x.textContent).join(' | '));
      check(`${tag} : sauvegarde restaurée après rechargement`, /Continuer/.test(cont) && /Étage 2/.test(cont), cont);
      await pg.click('#menu button:has-text("Continuer")'); await pg.waitForTimeout(300);
      check(`${tag} : reprise au bon étage`, /Étage 2/.test(await pg.textContent('.ptop h2')));
    }

    if (full) {
      // camp
      await pg.evaluate(() => { const d = window.__sqid.app.data; d.meta.shards = 60; });
      await pg.click('.ptop .back'); await pg.waitForTimeout(300);
      await pg.click('#menu button:has-text("camp")'); await pg.waitForTimeout(300);
      await ui('camp'); await shot('7-camp');
      await pg.click('.upg .btn.primary >> nth=0'); await pg.waitForTimeout(200);
      check(`${tag} : amélioration du camp achetée`, await pg.evaluate(() => Object.values(window.__sqid.app.data.meta.upgrades).some(v => v > 0)));

      // v0.5: trophy room and Nightmare picker
      await pg.evaluate(() => { window.__sqid.app.data.meta.unlocked = 11; });
      await pg.click('.ptop .back'); await pg.waitForTimeout(300);
      await pg.click('#menu button:has-text("Trophées")'); await pg.waitForTimeout(400);
      check(`${tag} : salle des trophées`, await pg.isVisible('.trophies') && (await pg.$$('.daily')).length === 3);
      await ui('trophées'); await shot('7b-trophees');
      await pg.click('.ptop .back'); await pg.waitForTimeout(300);
      await pg.click('#menu button:has-text("Nouvelle expédition")'); await pg.waitForTimeout(400);
      check(`${tag} : mode Cauchemar proposé après le 1er boss`, await pg.isVisible('.nightmare-box'));
      await pg.click('.nightmare-box summary'); await pg.click('.curse-pick >> nth=0'); await pg.click('.curse-pick >> nth=1'); await pg.waitForTimeout(200);
      await ui('Cauchemar'); await shot('7c-cauchemar');
      await pg.click('.pfoot .btn.primary'); await pg.waitForTimeout(500);
      check(`${tag} : expédition maudite lancée`, await pg.evaluate(() => window.__sqid.app.data.run && window.__sqid.app.data.run.curses.length === 2));

      // v0.6: starting relic chosen at a checkpoint
      await pg.evaluate(async () => { const A = await import('./js/ui/app.js'); A.app.data.meta.unlocked = 21; A.startRun(['aldric', 'lyra', 'nyx'], { seed: 31, start: 21 }); });
      await pg.waitForTimeout(500);
      check(`${tag} : départ à l'étage 21 → relique de départ au choix (1 parmi 3)`, /Départ/.test(await pg.textContent('.ptop h2')) && (await pg.$$('.cards .card.t-relic')).length === 3);
      await ui('relique de départ'); await shot('7d-relique-depart');
      await pg.click('.cards .card >> nth=1'); await pg.waitForTimeout(400);
      check(`${tag} : la relique choisie ne fait pas sauter d'étage`, /Étage 21/.test(await pg.textContent('.ptop h2')));

      // v0.6: relic slots full → explicit replacement
      await pg.evaluate(async () => { const A = await import('./js/ui/app.js'); const run = A.app.data.run;
        run.relics = ['venin', 'brasier', 'rempart', 'sceau', 'colere', 'clarte', 'bourreau', 'antidote', 'bourse', 'calice'];
        run.phase = 'room'; run.pending = { kind: 'replace', key: 'peste', next: 'advance', back: null, refund: 0 }; A.route(); });
      await pg.waitForTimeout(400);
      check(`${tag} : écran de remplacement (10/10, rien n'est perdu avant confirmation)`, await pg.isVisible('.replace') && await pg.isDisabled('.pfoot.col .btn.primary') && (await pg.$$('.rtiles .rtile')).length === 10);
      await pg.click('.rtile >> text=Bourse du pillard'); await pg.waitForTimeout(200);
      await ui('remplacement de relique'); await shot('7e-remplacement');
      await pg.click('.pfoot.col .btn.primary'); await pg.waitForTimeout(400);
      const rel = await pg.evaluate(() => window.__sqid.app.data.run.relics);
      check(`${tag} : relique remplacée (Bourse → Peste)`, rel.length === 10 && rel.includes('peste') && !rel.includes('bourse'), rel.join(','));

      // v0.7: rarity, levels, merge card, tier-3 synergy progress, blessing chip
      await pg.evaluate(async () => { const A = await import('./js/ui/app.js'); const L = await import('./js/run/loot.js'); const run = A.app.data.run;
        run.relicLv = { venin: 2 }; run.blessN = 2; run.relics = run.relics.filter(k => k !== 'calice').concat('sig_lyra');
        run.phase = 'reward'; run.pending = { kind: 'reward', cards: [L.relicCard(run, 'venin'), L.relicCard(run, 'peste'), L.relicCard(run, 'chasse')] }; A.route(); });
      await pg.waitForTimeout(400);
      const cardTxt = await pg.textContent('.cards');
      check(`${tag} : v0.7 carte de fusion (niveau 2 → niveau 3) et rareté affichées`, /niveau 2 → niveau 3/.test(cardTxt) && /Commune|Rare|Légendaire/.test(cardTxt), cardTxt.slice(0, 120));
      check(`${tag} : v0.7 progression de style affichée (x/2, x/3 ou palier 3)`, /\/[23]|palier 3/.test(cardTxt));
      check(`${tag} : v0.7 Bénédiction visible (×2) et badge de niveau`, /×2/.test(await pg.textContent('.bless-chip')) && (await pg.$$('.relic .rlv')).length >= 1);
      await ui('récompense v0.7'); await shot('7g-fusion');
      await pg.click('.cards .card >> nth=0'); await pg.waitForTimeout(400);
      check(`${tag} : v0.7 fusion appliquée sans emplacement en plus`, await pg.evaluate(() => { const r = window.__sqid.app.data.run; return r.relicLv.venin === 3 && r.relics.length === 10; }));

      // v0.6: enrage counter (thresholds lowered for the test only)
      await pg.evaluate(async () => { const { BAL } = await import('./js/data/balance.js'); Object.assign(BAL.enrage, { warn: 1, from: 3 }); BAL.maxRounds = 200;
        const A = await import('./js/ui/app.js'); const R = await import('./js/run/run.js');
        A.startRun(['aldric', 'selena', 'orin'], { seed: 9, floor: 30 }); const run = A.app.data.run; R.chooseDoor(run, R.floorOf(run).doors.findIndex(d => d.type === 'boss')); A.route(); });
      check(`${tag} : enrage affiché (compteur « Rage ×… »)`, await waitFor(pg, () => { const r = document.querySelector('.btop .round.enraged'); return r && /Rage ×/.test(r.textContent); }, null, 60000));
      await ui('combat enragé'); await shot('7f-enrage');
      await waitFor(pg, () => !document.querySelector('.battle'), null, 180000);

      // boss through the debug panel
      await pg.goto(`${base}?debug`); await waitFor(pg, () => window.__sqid && window.__sqid.ready);
      await pg.click('.dbg-toggle'); await pg.click('.dbg-row button:has-text("Boss")');
      check(`${tag} : combat du boss lancé (mode test)`, await waitFor(pg, () => !!document.querySelector('.battle'), null, 15000));
      await pg.click('.dbg-toggle').catch(() => {});
      await pg.evaluate(() => document.getElementById('debug').classList.remove('open'));
      await pg.waitForTimeout(2500); await shot('8-boss');
      const bossDone = await waitFor(pg, () => !document.querySelector('.battle'), null, 180000);
      const st = await pg.evaluate(() => ({ run: window.__sqid.app.data.run, meta: window.__sqid.app.data.meta }));
      if (st.run) { // boss beaten: reward, then the checkpoint between two zones
        check(`${tag} : boss vaincu → récompense`, bossDone && st.run.phase === 'reward', st.run.phase);
        check(`${tag} : le boss offre 1 relique au choix parmi 3`, st.run.pending.cards.length === 3 && st.run.pending.cards.every(c => c.type === 'relic'));
        await pg.waitForTimeout(600); await ui('trésor du boss'); await shot('9-tresor');
        await pg.click('.cards .card >> nth=0'); await pg.waitForTimeout(400);
        check(`${tag} : point de passage après le boss`, /Victoire/.test(await pg.textContent('#view h2')));
        await shot('9-checkpoint');
      } else {
        check(`${tag} : défaite contre le boss → bilan`, bossDone && await pg.isVisible('.results'));
        check(`${tag} : le bilan explique la défaite`, await pg.isVisible('.res-report') && await pg.isVisible('.res-goal'));
        await pg.waitForTimeout(400); await ui('bilan'); await shot('9-bilan');
      }

      // top of the tower: map of floor 50 and its boss door
      await pg.goto(`${base}?debug`); await waitFor(pg, () => window.__sqid && window.__sqid.ready);
      await pg.click('.dbg-toggle'); await pg.selectOption('.dbg-row select', '100'); await pg.click('.dbg-row button:has-text("Carte")');
      await pg.evaluate(() => document.getElementById('debug').classList.remove('open'));
      await pg.waitForTimeout(500);
      check(`${tag} : carte de l'étage 100 avec le dernier boss`, /Étage 100/.test(await pg.textContent('.ptop h2')) && /Vorthax/.test(await pg.textContent('.doors')));
      await ui('carte 100'); await shot('10-etage100');
    }

    check(`${tag} : aucun fichier manquant`, failed.length === 0 && (await pg.evaluate(() => window.__sqid.missingAssets())).length === 0, failed.slice(0, 5).join(', '));
    check(`${tag} : aucune erreur JavaScript`, errors.length === 0, errors.slice(0, 3).join(' | '));
    await ctx.close();
  }
  await browser.close();
  srv.close();
  console.log(results.join('\n'));
  console.log(process.exitCode ? '\nÉCHEC' : '\nOK — captures dans ' + OUT);
});
