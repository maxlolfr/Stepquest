// Dragonbound II UI smoke test: node db2ui.js <outDir> [level]
// Plays one level on Auto in a phone-sized Chromium (portrait), with a contract,
// screenshots the level sheet, the fight and the loot choice, and fails on page errors.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), OUT = process.argv[2] || '.', LV = +(process.argv[3] || 1);
const MIME = { '.html': 'text/html', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(d); }); });
srv.listen(0, async () => {
  const port = srv.address().port, b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message));
  const stars = Array(25).fill(0); for (let i = 0; i < LV; i++) stars[i] = 2;
  const save = { v: 2, gold: 400, items: { pot: 3, eth: 1, fea: 1, eli: 0 }, h: Object.fromEntries(['aldric', 'selena', 'orin', 'lyra', 'nyx'].map(k => [k, { lvl: 3 + LV, xp: 0, w: 0, a: 0 }])),
    team: ['aldric', 'selena', 'orin'], own: { aldric: 1, selena: 1, orin: 1 }, stars, seen: { in: 1, vid: 1, n07: 1 }, mute: true, ch: 0, inv: [], nid: 1, spd: 3, ctr: {} };
  await pg.addInitScript(s => { localStorage.setItem('dragonbound2.v2', s); }, JSON.stringify(save));
  await pg.goto(`http://127.0.0.1:${port}/dragonbound2/index.html`);
  await pg.click('#title'); await pg.waitForTimeout(500);
  await pg.click(`.node[data-lv="${LV}"]`); await pg.waitForTimeout(400);
  if (await pg.$('[data-ctr="alive"]')) { await pg.click('[data-ctr="alive"]'); await pg.waitForTimeout(300); }
  await pg.screenshot({ path: `${OUT}/1-niveau.png` });
  await pg.click('[data-play]');
  await pg.waitForSelector('#autoBtn', { state: 'visible' }); await pg.waitForTimeout(1500); await pg.click('#autoBtn');
  let shot = 0;
  for (let t = 0; t < 400; t++) { await pg.waitForTimeout(500);
    if (!shot && await pg.evaluate(() => { const B = window.__db2.B; return B && B.foes.some(f => f.charging && f.hp > 0) && !B.acting; })) { shot = 1; await pg.screenshot({ path: `${OUT}/2-combat.png` }); }
    if (await pg.$('[data-lpick]')) break; }
  await pg.waitForTimeout(400); await pg.screenshot({ path: `${OUT}/3-butin.png` });
  if (await pg.$('[data-lpick]')) { await pg.click('[data-lpick="0"]'); await pg.waitForTimeout(400); await pg.screenshot({ path: `${OUT}/4-objet.png` }); }
  for (let t = 0; t < 20 && !(await pg.$('[data-home]')); t++) { const n = await pg.$('[data-cnext]'); if (n) await n.click(); await pg.waitForTimeout(700); }
  await pg.screenshot({ path: `${OUT}/5-victoire.png` });
  if (await pg.$('[data-home]')) { await pg.click('[data-home]'); await pg.waitForTimeout(600); await pg.screenshot({ path: `${OUT}/6-scene.png` }); }
  console.log('combat-annonce:', shot ? 'oui' : 'non', '| erreurs:', errs.length ? errs : 'aucune');
  if (errs.length) process.exitCode = 1;
  await b.close(); srv.close();
});
