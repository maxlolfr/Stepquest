// Dragonbound II: screenshot the start of every level. node db2shots.js <outDir> <w> <h> [from] [to]
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), OUT = process.argv[2], W = +process.argv[3], H = +process.argv[4], A = +(process.argv[5] || 0), Z = +(process.argv[6] || 29);
const MIME = { '.html': 'text/html', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(d); }); });
srv.listen(0, async () => { const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true });
  for (let i = A; i <= Z; i++) { const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(i + ':' + e.message));
    const ch = Math.floor(i / 5), seen = { in: 1, vid: 1, vid2: 1, n08: 1, n10: 1, n09: 1, in2: 1, in3: 1, in4: 1, in5: 1, in6: 1, in7: 1, in8: 1, in9: 1, in10: 1, ver: '1.6.1' };
    const save = { v: 2, gold: 0, en: 999, enT: Date.now(), day: '', items: { pot: 3, eth: 1, fea: 1, eli: 0 }, h: Object.fromEntries(['aldric', 'selena', 'orin', 'lyra', 'nyx'].map(k => [k, { lvl: 10, xp: 0, w: 0, a: 0 }])),
      team: ch ? ['aldric', 'selena', 'orin'] : ['aldric'], own: { aldric: 1, selena: 1, orin: 1, lyra: 1, nyx: 1 }, stars: Array(50).fill(1), seen, mute: true, ch, inv: [], nid: 1, spd: 1, ctr: {} };
    await pg.addInitScript(s => { localStorage.setItem('dragonbound2.v2', s); }, JSON.stringify(save));
    await pg.goto(`http://127.0.0.1:${srv.address().port}/dragonbound2/index.html`); await pg.click('#title'); await pg.waitForTimeout(300);
    while (await pg.$('#modal:not([hidden]) [data-close]')) { await pg.click('#modal:not([hidden]) [data-close]'); await pg.waitForTimeout(100); }
    await pg.click(`.node[data-lv="${i}"]`); await pg.waitForTimeout(200); await pg.click('[data-play]');
    await pg.waitForFunction(() => window.__db2.B && window.__db2.B.foes.length && window.__db2.B.foes.every(f => f.alpha >= .99), null, { timeout: 15000 }).catch(() => {});
    await pg.waitForTimeout(1200); await pg.screenshot({ path: `${OUT}/${String(i).padStart(2, '0')}.png` }); await pg.close(); }
  console.log('erreurs:', errs.length ? errs : 'aucune'); await b.close(); srv.close(); });
