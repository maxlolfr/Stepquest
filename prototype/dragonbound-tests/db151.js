// 1.5.1: claim all trophies, bulk sell. node db151.js
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), KEY = 'dragonbound2.v2';
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': p.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); r.end(d); }); });
const H = ['aldric', 'selena', 'orin', 'lyra', 'nyx'], res = [], ok = (n, c, x = '') => res.push(`${c ? '✅' : '❌'} ${n}${x ? ' — ' + x : ''}`);
const it = (id, slot, r, st, hero) => ({ id, slot, r, t: 5, st, hero, name: 'x' });
const inv = [it(1, 'w', 0, { atk: 5 }, 'aldric'), it(2, 'w', 4, { atk: 50 }, 'aldric'), it(3, 'a', 0, { hp: 10, def: 1 }), it(4, 'a', 1, { hp: 15, def: 1 }), it(5, 'a', 3, { hp: 80, def: 8 }), it(6, 'j', 2, { crit: .01 }), it(7, 'a', 4, { hp: 200, def: 20 })];
const save = { v: 2, gold: 100, gem: 0, items: { pot: 3, eth: 1, fea: 1, eli: 0 }, h: Object.fromEntries(H.map(k => [k, { lvl: 10, xp: 0, w: 0, a: 0, eq: k === 'aldric' ? { w: 2, a: 7 } : {} }])), team: ['aldric'], own: { aldric: 1 }, stars: Array(50).fill(0), seen: { in: 1, vid: 1, vid2: 1, n09: 1, n10: 1, ver: '1.5.2' }, mute: true, ch: 0, inv, nid: 20, spd: 1, m12: 1, tc: { kills: 1200, thermal: 20, embrase: 20, brise: 20 } };
srv.listen(0, async () => { const b = await chromium.launch(), pg = await b.newPage(), errs = []; pg.on('pageerror', e => errs.push(e.message));
  const url = `http://127.0.0.1:${srv.address().port}/dragonbound2/index.html`, S = () => pg.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
  await pg.goto(url); await pg.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)), [KEY, save]); await pg.goto(url); await pg.click('#title'); await pg.waitForTimeout(500);
  for (let i = 0; i < 10 && await pg.$('#modal:not([hidden]) [data-close]'); i++) { await pg.click('#modal:not([hidden]) [data-close]'); await pg.waitForTimeout(100); }
  await pg.click('#trBtn'); await pg.waitForTimeout(300); const btn = await pg.textContent('[data-trall]').catch(() => ''); await pg.click('[data-trall]'); await pg.waitForTimeout(600);
  for (let i = 0; i < 10; i++) { const x = await pg.$('#modal:not([hidden]) [data-lpick]') || await pg.$('#modal:not([hidden]) [data-dkeep]'); if (!x) break; await x.click(); await pg.waitForTimeout(300); }
  let s = await S(); const n = Object.keys(s.trd || {}).length; ok('Tout réclamer : tous les trophées finis d’un coup', n >= 4 && s.gold > 100 && s.gem > 0, `${btn.trim()} → ${n} réclamés · or ${s.gold} · gemmes ${s.gem}`);
  await pg.click('#modal:not([hidden]) [data-close]').catch(() => {}); await pg.waitForTimeout(200);
  await pg.click('#heroesBtn'); await pg.waitForTimeout(300); await pg.click('[data-sellall]'); await pg.waitForTimeout(300); const g0 = (await S()).gold;
  const labels = await pg.$$eval('[data-sellg]', a => a.map(x => x.innerText.replace(/\s+/g, ' ')));
  await pg.click('[data-sellg="worse"]'); await pg.waitForTimeout(300); s = await S();
  ok('Vendre en lot « moins bien » : communs à rares inutiles vendus, portés/épiques/légendaires gardés', s.inv.map(i => i.id).sort().join() === '2,5,6,7' && s.gold > g0, `reste ${s.inv.map(i => i.id)} · or ${g0} → ${s.gold}`);
  ok('Aucune erreur JavaScript', !errs.length, errs.join(' | ')); console.log(labels.join(' | ')); console.log(res.join('\n')); await b.close(); srv.close(); });
