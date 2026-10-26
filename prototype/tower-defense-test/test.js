// Last Stand prototype tests. Usage: NODE_PATH=$(npm root -g) node test.js <outDir>
// 1) loads the page in landscape phone/tablet sizes, checks assets + JS errors, takes screenshots
// 2) runs headless balance simulations for several hero placements
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), OUT = process.argv[2] || '/tmp/ls';
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.js': 'text/javascript' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(d); }); });
srv.listen(0, async () => {
  const URL = `http://127.0.0.1:${srv.address().port}/tower-defense-test/index.html`, b = await chromium.launch(); let fail = 0;
  for (const [n, w, h] of [['iphone', 844, 390], ['iphone-max', 932, 430], ['ipad', 1180, 820]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true }), pg = await ctx.newPage(), errs = [];
    pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => m.type() === 'error' && errs.push(m.text()));
    await pg.goto(URL); await pg.waitForSelector('#bPlay', { timeout: 20000 });
    const miss = await pg.evaluate(() => LS.missing()); await pg.screenshot({ path: `${OUT}/${n}-0-titre.png` });
    await pg.click('#bPlay'); await pg.waitForTimeout(400); await pg.screenshot({ path: `${OUT}/${n}-1-placement.png` });
    // place by tapping: card then slot (real touch flow)
    const tapSlot = async i => { const p = await pg.evaluate(i => { const s = LS.SLOTS()[i], c = document.getElementById('cv'), W = innerWidth, H = innerHeight, fw = Math.max(1280, Math.min(1600, 720 * W / H)), k = Math.min(W / fw, H / 720); return [s.x * k + (W - fw * k) / 2, s.y * k + (H - 720 * k) / 2]; }, i); await pg.touchscreen.tap(p[0], p[1]); await pg.waitForTimeout(80); };
    for (const [id, sl] of [['aldric', 1], ['orin', 0], ['lyra', 3]]) { await pg.tap(`[data-sel="${id}"]`); await tapSlot(sl); }
    const placed = await pg.evaluate(() => Object.values(LS.state().h).map(h => h.slot));
    await pg.screenshot({ path: `${OUT}/${n}-2-places.png` });
    await pg.tap('#bGo'); await pg.waitForTimeout(9000);
    await pg.tap('[data-sk="orin"]'); await pg.waitForTimeout(250); await pg.screenshot({ path: `${OUT}/${n}-3-combat.png` });
    // jump to wave 3 boss for a screenshot
    await pg.evaluate(() => { const S = LS.state(); S.foes = []; S.queue = []; S.wave = 2; S.phase = 'between'; S.between = .1; });
    await pg.waitForTimeout(9000); await pg.screenshot({ path: `${OUT}/${n}-4-boss.png` });
    const ok = !miss.length && !errs.length && placed.join() === '1,0,3';
    if (!ok) fail++;
    console.log(n, ok ? 'OK' : 'ÉCHEC', 'manquants:', miss.length, 'erreurs:', errs, 'slots:', placed.join());
    await ctx.close();
  }
  const pg = await (await b.newContext()).newPage(); await pg.goto(URL + '?sim');
  const P = { 'bon (A centre, O haut-droite, L sortie)': { aldric: 1, orin: 0, lyra: 3 }, 'bon 2 (A centre, O bas, L haut)': { aldric: 1, orin: 2, lyra: 4 },
    'mauvais (tous loin du chemin central)': { aldric: 4, orin: 2, lyra: 0 }, 'Aldric seul': { aldric: 1 }, 'Lyra seule': { lyra: 1 } };
  for (const [n, pl] of Object.entries(P)) for (const sk of [true, false]) {
    const rs = await pg.evaluate(([pl, sk]) => Array.from({ length: 10 }, () => LS.simulate(pl, { skills: sk })), [pl, sk]);
    const wins = rs.filter(r => r.result === 'win').length, life = rs.reduce((a, r) => a + r.life, 0) / rs.length;
    console.log(`${n} · compétences ${sk ? 'oui' : 'non'} : ${wins}/10 victoires, vie moyenne ${life.toFixed(1)}, vague atteinte ${(rs.reduce((a, r) => a + r.wave, 0) / 10 + 1).toFixed(1)}, durée ${rs[0].time}s`);
  }
  await b.close(); srv.close(); process.exit(fail ? 1 : 0);
});
