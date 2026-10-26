// Dragonbound II 2.0 lot 1: closing the app on the chest screen must lose nothing and duplicate nothing.
// Also checks the commercial build (?release): no test menu, no ×10+ speeds. node db2close.js
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'text/plain' }); r.end(d); }); });
let fails = 0; const ok = (n, c, d) => { console.log(`${c ? '✅' : '❌'} ${n}${d ? ' — ' + d : ''}`); if (!c) fails++; };
srv.listen(0, async () => { const b = await chromium.launch(), errs = [], base = `http://127.0.0.1:${srv.address().port}/dragonbound2/index.html`;
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, hasTouch: true }); const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message));
  const seen = { in: 1, vid: 1, vid2: 1, n08: 1, n09: 1, n10: 1, in2: 1, ver: '9' };
  const save = { v: 2, gold: 100, gem: 0, en: 60, enT: Date.now(), day: new Date().toDateString(), login: { day: new Date().toDateString(), n: 1 }, items: { pot: 3, eth: 1, fea: 1, eli: 0 }, h: Object.fromEntries(['aldric', 'selena', 'orin', 'lyra', 'nyx'].map(k => [k, { lvl: 12, xp: 0, w: 0, a: 0 }])),
    team: ['aldric', 'selena'], own: { aldric: 1, selena: 1 }, stars: [3, 3, 3, 3].concat(Array(46).fill(0)), seen, mute: true, ch: 0, inv: [], nid: 1, spd: 30, ctr: {} };
  await pg.goto(base); await pg.evaluate(s => localStorage.setItem('dragonbound2.v2', s), JSON.stringify(save)); await pg.reload();
  const closeAll = async () => { for (let k = 0; k < 20 && await pg.$('#modal:not([hidden]) [data-close]'); k++) { await pg.click('#modal:not([hidden]) [data-close]'); await pg.waitForTimeout(120); } };
  const S = () => pg.evaluate(() => JSON.parse(localStorage.getItem('dragonbound2.v2')));
  await pg.click('#title'); await pg.waitForTimeout(400); await closeAll();
  // win level 1-5 (boss, first time): a chest choice AND the chapter's legendary treasure are pending
  await pg.click('.node[data-lv="4"]'); await pg.waitForTimeout(250); await pg.click('[data-play]'); await closeAll();
  await pg.waitForFunction(() => window.__db2.B && window.__db2.B.foes.length, null, { timeout: 15000 }); if (!(await pg.$('#fight.auto'))) await pg.click('#autoBtn');
  for (let k = 0; k < 200 && !(await pg.$('[data-chpick]')); k++) { await pg.evaluate(() => { const B = window.__db2.B; if (B) B.foes.forEach(f => { f.hp = 1; f.def = 0; }); }); await closeAll(); await pg.waitForTimeout(250); }
  const atChest = !!(await pg.$('[data-chpick]')); ok('Victoire contre le boss 1-5 : écran des coffres affiché', atChest);
  const s1 = await S(); ok('Butin à choisir sauvegardé avant le choix (coffre + trésor légendaire)', s1.pend && s1.pend.length === 2, `en attente : ${s1.pend ? s1.pend.length : 0}`);
  const inv1 = s1.inv.length, gold1 = s1.gold, stars1 = s1.stars[4];
  await pg.reload(); await pg.click('#title'); await pg.waitForTimeout(600);       // the app was closed on the chest screen
  ok('Après réouverture : le coffre revient', !!(await pg.$('[data-chpick]')));
  await pg.click('[data-chpick="0"]'); await pg.waitForTimeout(1500); await closeAll();
  const s2 = await S(); ok('Le coffre choisi est ajouté une seule fois', s2.inv.length === inv1 + 1 && s2.pend.length === 1, `sac ${inv1} → ${s2.inv.length}, en attente ${s2.pend.length}`);
  ok('Or et étoiles de la victoire ni perdus ni doublés', s2.gold >= gold1 && s2.stars[4] === stars1, `or ${gold1} → ${s2.gold}, étoiles ${stars1} → ${s2.stars[4]}`);
  await pg.reload(); await pg.click('#title'); await pg.waitForTimeout(600);       // closed again before the legendary choice
  ok('Après 2e réouverture : le trésor légendaire revient', !!(await pg.$('[data-lpick]')));
  await pg.click('[data-lpick="0"]'); await pg.waitForTimeout(800); await closeAll();
  const s3 = await S(); ok('Trésor légendaire reçu une seule fois, plus rien en attente', s3.inv.length === inv1 + 2 && !(s3.pend && s3.pend.length) && s3.inv.at(-1).r === 4, `sac ${s3.inv.length}, rareté ${s3.inv.at(-1).r}`);
  await pg.reload(); await pg.click('#title'); await pg.waitForTimeout(600);
  ok('3e réouverture : aucun coffre fantôme', !(await pg.$('[data-chpick], [data-lpick]')));
  // commercial build preview
  await pg.goto(base + '?release'); await pg.click('#title'); await pg.waitForTimeout(400); await closeAll();
  ok('Version commerciale : bouton du menu test absent', !(await pg.$('#adminBtn')));
  ok('Version commerciale : vitesse ×30 ramenée à ×5', (await pg.evaluate(() => window.__db2.S.spd)) <= 5);
  await pg.goto(base); await pg.click('#title'); await pg.waitForTimeout(400); await closeAll();
  ok('Version de test : menu test toujours là', !!(await pg.$('#adminBtn')));
  ok('Aucune erreur JavaScript', !errs.length, errs.join(' | '));
  await b.close(); srv.close(); process.exit(fails ? 1 : 0); });
