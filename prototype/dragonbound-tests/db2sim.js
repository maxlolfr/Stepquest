// Dragonbound II headless check: node db2sim.js [runs] [file]
// Loads prototype/dragonbound2/index.html?sim in Chromium, fails on page errors,
// runs __db2.simCampaign(runs) and prints a per-level summary.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const runs = +process.argv[2] || 3, file = (process.argv[3] && process.argv[3] !== '-') ? process.argv[3] : 'dragonbound2/index.html';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.json': 'application/json' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(d); }); });
srv.listen(0, async () => {
  const port = srv.address().port, b = await chromium.launch(), pg = await b.newPage(), errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(`http://127.0.0.1:${port}/${file}?sim`);
  await pg.waitForFunction(() => window.__db2, null, { timeout: 15000 }).catch(e => { console.log('ERREURS:', errs); throw e; });
  const upto = +process.argv[4] || 99;
  const out = await pg.evaluate(([n, u]) => window.__db2.simCampaign(n, u), [runs, upto]);
  const L = out[0].length, rows = [];
  for (let i = 0; i < L; i++) { const r = out.map(o => o[i]), avg = f => (r.reduce((a, x) => a + f(x), 0) / r.length);
    const rd = r.flatMap(x => x.rounds || []);
    rows.push(`${String(i + 1).padStart(2)}  essais ${avg(x => x.tries).toFixed(1).padStart(4)}  tours/vague ${(rd.reduce((a, b) => a + b, 0) / Math.max(1, rd.length)).toFixed(1).padStart(4)}  max ${Math.max(...rd)}  niv ${r[0].lvl}  pv-min ${avg(x => x.hp || 0).toFixed(0)}%`); }
  console.log(rows.join('\n'));
  if (errs.length) { console.log('ERREURS:', errs); process.exitCode = 1; }
  await b.close(); srv.close();
});
