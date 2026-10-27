// Dragonbound II lot 6: English version (?lang / saved language / phone language), no French left on the main screens, language button. node db2lang.js
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
let fails = 0; const ok = (n, c, d) => { console.log(`${c ? '✅' : '❌'} ${n}${d ? ' — ' + d : ''}`); if (!c) fails++; };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.woff': 'font/woff' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'text/plain' }); r.end(d); }); });
srv.listen(0, async () => { const b = await chromium.launch(), errs = [], miss = new Set(); 
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true }); const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message));
  const save = { v: 2, m20: 1, m30: 1, lang: 'en', gold: 9000, items: { pot: 5, eth: 3, fea: 2, eli: 1 }, h: Object.fromEntries(['aldric', 'selena', 'orin', 'lyra', 'nyx'].map(k => [k, { lvl: 12, xp: 0, w: 1, a: 1, eq: {} }])),
    team: ['aldric', 'selena', 'orin'], own: { aldric: 1, selena: 1, orin: 1, lyra: 1 }, stars: Array(16).fill(3).concat(Array(34).fill(0)), tst: { 1: Array(5).fill(3) }, tier: {}, seen: { in: 1, vid: 1, vid2: 1, in2: 1, in3: 1, in4: 1, ver: '0' }, mute: true, ch: 3, inv: [], nid: 1, spd: 30, ctr: {}, tc: { kills: 400 } };
  await pg.addInitScript(s => { if (!sessionStorage.getItem('db2init')) { sessionStorage.setItem('db2init', '1'); localStorage.setItem('dragonbound2.v2', s); } }, JSON.stringify(save));
  const grab = async () => (await pg.evaluate(() => [...window.__tmiss])).forEach(x => miss.add(x));
  const shot = async n => { await grab(); };
  const drive = async () => { for (const sel of ['[data-next]', '[data-chpick="0"]', '[data-lpick="0"]', '[data-dkeep]', '#modal:not([hidden]) [data-close]']) if (await pg.$(sel)) { await pg.click(sel, { force: true, timeout: 3000 }).catch(() => {}); await pg.waitForTimeout(250); await grab(); return true; } return false; };
  await pg.goto(`http://127.0.0.1:${srv.address().port}/dragonbound2/index.html`); await pg.click('#title'); await pg.waitForTimeout(600); await shot('00-news'); while (await drive());
  await shot('01-home');
  for (const [btn, name] of [['#shopBtn', '02-shop'], ['#helpBtn', '03-help'], ['#trBtn', '04-trophies'], ['#heroesBtn', '05-heroes'], ['#forgeBtn', '06-forge'], ['#newsBtn', '07-news'], ['#snd', '08-sound']]) {
    if (await pg.$(btn)) { await pg.click(btn, { force: true }); await pg.waitForTimeout(400); await shot(name); while (await drive()); } }
  await pg.evaluate(() => document.getElementById('creditsBtn').click()); await pg.waitForTimeout(300); await shot('09-credits'); while (await drive());
  await pg.click('#snd', { force: true }); await pg.waitForTimeout(200); await pg.click('[data-svsheet]', { force: true }); await pg.waitForTimeout(300); await shot('10-save'); while (await drive());
  // a level sheet, then fights on Auto: a normal level and a boss
  for (const lv of [14, 4]) { await pg.evaluate(c => { window.__db2.S.ch = c; }, Math.floor(lv / 5)); await pg.click('#tabs [data-ch="' + Math.floor(lv / 5) + '"]', { force: true }).catch(() => {}); await pg.waitForTimeout(300);
    await pg.click(`.node[data-lv="${lv}"]`, { force: true }); await pg.waitForTimeout(300); await shot('11-level-' + lv); await pg.click('[data-play]', { force: true }); await pg.waitForTimeout(300); while (await drive());
    if (!(await pg.$('#fight.auto'))) await pg.click('#autoBtn').catch(() => {}); await pg.evaluate(() => { window.__db2.S.spd = 3; });
    let shotF = 0; for (let k = 0; k < 500 && !(await pg.$('[data-home]')); k++) { await pg.waitForTimeout(150); await grab(); if (!shotF && k === 30) { shotF = 1; await shot('12-fight-' + lv); }
      if (k > 60 && k % 10 === 0) await pg.evaluate(() => { const B = window.__db2.B; if (B) B.foes.forEach(f => { if (f.hp > f.hpMax * .45) f.hp = Math.round(f.hpMax * .4); }); });
      if (k > 200) await pg.evaluate(() => { const B = window.__db2.B; if (B) B.foes.forEach(f => { if (f.hp > 1) f.hp = 1; }); });
      if (await pg.$('#modal:not([hidden])')) await drive(); }
    await shot('13-victory-' + lv); await pg.click('[data-home]', { force: true }).catch(() => {}); await pg.waitForTimeout(400); for (let k = 0; k < 20 && await drive(); k++); }
  const left = [...miss].filter(x => x !== '🌐 Français'); if (process.env.DB2MISS) fs.writeFileSync(process.env.DB2MISS, JSON.stringify(left));
  ok('Anglais : aucun texte français oublié sur les écrans parcourus', !left.length, left.slice(0, 60).join(' | '));
  ok('Anglais : la page est marquée en anglais', await pg.evaluate(() => document.documentElement.lang === 'en'));
  // the language button switches back to French and keeps the game
  await pg.click('#snd', { force: true }); await pg.waitForTimeout(300);
  await Promise.all([pg.waitForNavigation(), pg.click('[data-lang="fr"]', { force: true })]); await pg.waitForTimeout(500);
  const st = await pg.evaluate(() => JSON.parse(localStorage.getItem('dragonbound2.v2')));
  ok('Bouton langue : passe en français, partie conservée', st.lang === 'fr' && st.gold >= 9000 && await pg.evaluate(() => document.documentElement.lang !== 'en'), `lang ${st.lang} · or ${st.gold}`);
  // an existing save without a language stays in French whatever the phone language
  const c2 = await b.newContext({ locale: 'en-US' }); const p2 = await c2.newPage(); const u = `http://127.0.0.1:${srv.address().port}/dragonbound2/index.html`;
  await p2.goto(u); await p2.evaluate(() => localStorage.setItem('dragonbound2.v2', JSON.stringify({ v: 2, m20: 1, gold: 5 }))); await p2.goto(u); await p2.waitForTimeout(400);
  ok('Ancienne partie sans langue : reste en français', await p2.evaluate(() => document.documentElement.lang !== 'en'));
  await p2.evaluate(() => localStorage.clear()); await p2.goto(u); await p2.waitForTimeout(400);
  ok('Nouveau joueur avec un téléphone en anglais : jeu en anglais', await p2.evaluate(() => document.documentElement.lang === 'en'));
  ok('Aucune erreur JavaScript', !errs.length, errs.slice(0, 3).join(' | '));
  await b.close(); srv.close(); process.exit(fails ? 1 : 0); });
