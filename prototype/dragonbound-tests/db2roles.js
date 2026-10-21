// Counts enemy support actions and Second souffle uses over sample levels. node db2roles.js
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200); r.end(d); }); });
srv.listen(0, async () => { const b = await chromium.launch(), pg = await b.newPage(), errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(`http://127.0.0.1:${srv.address().port}/dragonbound2/index.html?sim`); await pg.waitForFunction(() => window.__db2);
  const out = await pg.evaluate(async () => { const D = window.__db2, cnt = {}, inc = k => cnt[k] = (cnt[k] || 0) + 1;
    const oSup = window.supAct; window.supAct = async f => { const r = await oSup(f); if (r) inc(f.m.sup + (f.aoeC ? '' : '')); return r; };
    const oDmg = window.damage; let aoeHits = 0;
    const oR = D.SK.rally; const res = [];
    for (const [lv, team, l] of [[0, ['aldric'], 2], [3, ['aldric'], 5], [4, ['aldric'], 6], [5, ['aldric', 'selena'], 12], [7, ['aldric', 'selena', 'orin'], 15], [11, ['aldric', 'selena', 'orin'], 18], [27, ['aldric', 'selena', 'orin'], 30], [42, ['aldric', 'selena', 'orin'], 38], [46, ['aldric', 'selena', 'orin'], 40]]) {
      for (let r = 0; r < 4; r++) { const S = D.S; S.team = team.slice(); team.forEach(id => { S.own[id] = 1; S.h[id].lvl = l; S.h[id].w = Math.floor(l / 4); S.h[id].a = Math.floor(l / 4); });
        const x = await D.runLevel(lv); for (const [k, v] of Object.entries(D.B.stat || {})) cnt[k] = (cnt[k] || 0) + v; res.push(`niv ${lv + 1} ${x.win ? 'V' : 'D'} tours ${x.rounds}`); } }
    return { cnt, res }; });
  console.log(JSON.stringify(out.cnt), '\n' + out.res.join(' | ')); if (errs.length) console.log('ERREURS', errs); await b.close(); srv.close(); });
