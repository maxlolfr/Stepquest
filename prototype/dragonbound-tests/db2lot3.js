// Dragonbound II 2.0 lot 3: Séléna joins after 1-3, older saves past 1-3 get her, demo = chapters 1-3 (?demo). node db2lot3.js
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'text/plain' }); r.end(d); }); });
let fails = 0; const ok = (n, c, d) => { console.log(`${c ? '✅' : '❌'} ${n}${d ? ' — ' + d : ''}`); if (!c) fails++; };
srv.listen(0, async () => { const b = await chromium.launch(), errs = [], base = `http://127.0.0.1:${srv.address().port}/dragonbound2/index.html`;
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, hasTouch: true }); const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message));
  const mk = (o = {}) => Object.assign({ v: 2, m20: 1, gold: 500, items: { pot: 3, eth: 1, fea: 1, eli: 0 }, h: Object.fromEntries(['aldric', 'selena', 'orin', 'lyra', 'nyx'].map(k => [k, { lvl: 14, xp: 0, w: 0, a: 0 }])),
    team: ['aldric'], own: { aldric: 1 }, stars: Array(50).fill(0), seen: { in: 1, vid: 1, vid2: 1, in2: 1, in3: 1, v0: 1, v1: 1, ver: '9' }, mute: true, ch: 0, inv: [], nid: 1, spd: 30, ctr: {} }, o);
  const S = () => pg.evaluate(() => JSON.parse(localStorage.getItem('dragonbound2.v2')));
  const open = async (save, q = '') => { await pg.goto(base + q); await pg.evaluate(s => localStorage.setItem('dragonbound2.v2', s), JSON.stringify(save)); await pg.goto(base + q); await pg.click('#title'); await pg.waitForTimeout(500); };
  const sheet = () => pg.textContent('#sheet').catch(() => '');
  // drive any open window: story lines, chests, item choices, item comparison, victory screen
  const drive = async () => { for (const sel of ['[data-next]', '[data-chpick="0"]', '[data-lpick="0"]', '[data-dkeep]', '#modal:not([hidden]) [data-close]']) if (await pg.$(sel)) { await pg.click(sel, { force: true, timeout: 3000 }).catch(() => {}); await pg.waitForTimeout(250); return true; } return false; };
  const winLevel = async (lv, stop) => { while (await drive()); await pg.click(`.node[data-lv="${lv}"]`); await pg.waitForTimeout(250); await pg.click('[data-play]'); await pg.waitForTimeout(300);
    while (await drive()); if (!(await pg.$('#fight.auto'))) await pg.click('#autoBtn').catch(() => {});
    for (let k = 0; k < 300; k++) { if (await stop()) return true; await pg.evaluate(() => { const B = window.__db2.B; if (B) B.foes.forEach(f => { if (f.hp > 1) f.hp = 1; }); });
      if (await pg.$('[data-home]')) await pg.click('[data-home]'); else await drive(); await pg.waitForTimeout(200); } return false; };
  // 1. new game: winning 1-3 brings Séléna, with her scene
  await open(mk({ stars: [3, 3].concat(Array(48).fill(0)) })); while (await drive());
  const sawScene = await winLevel(2, async () => (await sheet()).includes('gardienne du sanctuaire'));
  ok('Victoire 1-3 : la scène de Séléna se joue', sawScene); for (let k = 0; k < 10 && await drive(); k++);
  let s = await S(); ok('Séléna rejoint l’équipe après 1-3', s.own.selena === 1 && s.team.includes('selena'), `équipe ${s.team}`);
  // 2. an older save already past 1-3 without Séléna gets her at once
  await open(mk({ stars: [3, 3, 3, 1].concat(Array(46).fill(0)) })); const late = (await sheet()).includes('gardienne du sanctuaire');
  for (let k = 0; k < 10 && await drive(); k++); s = await S();
  ok('Ancienne partie au-delà de 1-3 : Séléna rejoint tout de suite, avec sa scène', late && s.own.selena === 1 && s.team.includes('selena') && !s.selLate, `équipe ${s.team}`);
  // 3. demo (?demo): chapter 4 is locked with an explanation; beating 3-5 shows the end of the demo and Lyra does not join
  const T = ['aldric', 'selena', 'orin'], O = { aldric: 1, selena: 1, orin: 1 };
  await open(mk({ team: T, own: O, ch: 2, stars: Array(14).fill(3).concat(Array(36).fill(0)), seen: { in: 1, vid: 1, vid2: 1, in2: 1, in3: 1, out3: 1, ver: '9' } }), '?demo'); while (await drive());
  const tab = await pg.$('#tabs [data-ch="3"][data-demo]'); ok('Démo : le chapitre 4 est marqué « version complète »', !!tab);
  if (tab) { await tab.click(); await pg.waitForTimeout(300); ok('Démo : toucher le chapitre 4 explique la version complète', (await sheet()).includes('version complète')); while (await drive()); }
  const end = await winLevel(14, async () => (await sheet()).includes('Fin de la démo'));
  ok('Démo : battre le boss 3-5 affiche « Fin de la démo »', end); while (await drive());
  s = await S(); ok('Démo : Lyra ne rejoint pas, on reste sur le chapitre 3', !s.own.lyra && s.ch === 2, `héros ${Object.keys(s.own)} · chapitre ${s.ch + 1}`);
  await open(Object.assign(s, {})); while (await drive()); ok('Version de test sans ?demo : le chapitre 4 s’ouvre normalement', !(await pg.$('#tabs [data-ch="3"][data-demo]')) && !(await pg.$('#tabs [data-ch="3"][disabled]')));
  ok('Aucune erreur JavaScript', !errs.length, errs.join(' | '));
  await b.close(); srv.close(); process.exit(fails ? 1 : 0); });
