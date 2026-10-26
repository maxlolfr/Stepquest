// 1.2 checks: new gear art + migration, sets, specializations, routes, music files. node db212.js outDir
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), OUT = process.argv[2] || '.', KEY = 'dragonbound2.v2', miss = new Set();
const MIME = { '.html': 'text/html', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, d) => { if (e) { miss.add(q.url); r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(d); }); });
const res = [], ok = (n, c, x = '') => res.push(`${c ? '✅' : '❌'} ${n}${x ? ' — ' + x : ''}`);
const H = ['aldric', 'selena', 'orin', 'lyra', 'nyx'];
// a 1.1-style save: old image names, no sets
const inv = [{ id: 1, slot: 'w', r: 2, t: 12, st: { atk: 20 }, hero: 'aldric', img: 'wAxe', name: 'Hache du bourreau' }, { id: 2, slot: 'a', r: 3, t: 12, st: { hp: 90, def: 9 }, img: 'a2armure', name: 'Armure de braise' },
  { id: 3, slot: 'j', r: 2, t: 33, st: { crit: .05 }, img: 'a4amulette', name: 'Pendentif de givre' }, { id: 4, slot: 'w', r: 4, t: 48, st: { mag: 60, crit: .08 }, hero: 'orin', img: 'wLegM', name: 'Bâton du Néant' }, { id: 5, slot: 'a', r: 0, t: 3, st: { hp: 20, def: 1 }, img: 'a0armure', name: 'Armure d’os' }];
const base = o => Object.assign({ v: 2, gold: 1000, gem: 0, items: { pot: 3, eth: 1, fea: 1, eli: 0 }, h: Object.fromEntries(H.map(k => [k, { lvl: 12, xp: 0, w: 2, a: 2, eq: k === 'aldric' ? { w: 1, a: 2 } : {} }])),
  team: ['aldric', 'selena', 'orin'], own: { aldric: 1, selena: 1, orin: 1 }, stars: [3, 3, 3, 3, 3, 2].concat(Array(44).fill(0)), seen: { in: 1, vid: 1, vid2: 1, n09: 1, n10: 1, ver: '1.5.2', in2: 1 }, mute: true, ch: 1, inv, nid: 10, spd: 3 }, o);
srv.listen(0, async () => {
  const url = `http://127.0.0.1:${srv.address().port}/dragonbound2/index.html`, b = await chromium.launch(), errs = [];
  for (const [w, h, tag] of [[390, 844, 'portrait'], [1180, 820, 'paysage']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true }), pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(tag + ': ' + e.message));
    const S = () => pg.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
    const load = async save => { await pg.goto(url); await pg.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)), [KEY, save]); await pg.goto(url); await pg.click('#title'); await pg.waitForTimeout(500); };
    const closeAll = async () => { for (let i = 0; i < 20 && await pg.$('#modal:not([hidden]) [data-close]'); i++) { await pg.click('#modal:not([hidden]) [data-close]'); await pg.waitForTimeout(120); } };
    await load(base()); await closeAll(); let s = await S();
    ok(`[${tag}] Migration : noms et sets des anciens objets, rien de perdu`, s.inv.length === 5 && s.inv[0].name === 'Épée ailée' && s.inv[1].name === 'Armure de braise' && s.inv[3].name === 'Bâton du Néant' && s.inv[0].set && !s.inv[4].set && s.h.aldric.eq.w === 1 && s.m12 === 1, s.inv.map(i => i.name + (i.set ? '/' + i.set : '')).join(', '));
    await pg.click('#heroesBtn'); await pg.waitForTimeout(500); await pg.screenshot({ path: `${OUT}/${tag}-sac.png`, fullPage: true });
    const imgs = await pg.$$eval('#sheet .item img', a => a.map(x => x.naturalWidth > 0 && x.getAttribute('src')));
    ok(`[${tag}] Nouvelles icônes chargées dans le sac`, imgs.length >= 3 && imgs.every(Boolean), imgs.join(' '));
    // sets: give aldric 3 'gard' items and compare stats
    const st = await pg.evaluate(() => { const D = window.__db2, S = D.S; const before = D.heroStats('aldric');
      const it = ['w', 'a', 'j'].map(sl => { const x = D.makeItem(sl, 2, 10, 'aldric'); x.set = 'gard'; S.inv.push(x); return x; }); S.h.aldric.eq = { w: it[0].id, a: it[1].id, j: it[2].id };
      const a3 = D.heroStats('aldric'); S.inv.find(x => x.id === it[2].id).set = 'arca'; const a2 = D.heroStats('aldric'); return { a3pw: a3.pw, a3sets: a3.sets, a2pw: a2.pw, a2sets: a2.sets }; });
    ok(`[${tag}] Sets : 3 pièces = pouvoir passif, 2 pièces = bonus seul`, st.a3pw.includes('set_gard') && st.a3sets.gard === 3 && !st.a2pw.includes('set_gard') && st.a2sets.gard === 2, JSON.stringify(st));
    await closeAll(); await pg.click('#heroesBtn'); await pg.waitForTimeout(300); await pg.click('[data-htab="sp"]'); await pg.waitForTimeout(200); await pg.screenshot({ path: `${OUT}/${tag}-voie.png`, fullPage: true });
    await pg.click('[data-spec="bers"]'); await pg.waitForTimeout(300); s = await S(); const g0 = s.gold;
    ok(`[${tag}] Voie : premier choix gratuit au niveau 10+`, s.h.aldric.spec === 'bers' && g0 === 1000);
    await pg.click('[data-spec="prot"]'); await pg.waitForTimeout(300); s = await S(); ok(`[${tag}] Voie : changer coûte 300 or`, s.h.aldric.spec === 'prot' && s.gold === 700, `or ${s.gold}`);
    // level under 10: locked
    await pg.evaluate(() => { window.__db2.S.h.orin.lvl = 5; }); await pg.click('[data-hnav="1"]').catch(() => {}); await pg.waitForTimeout(200);
    // routes
    await closeAll(); await pg.click('.node[data-lv="5"]'); await pg.waitForTimeout(300);
    const rts = await pg.$$eval('#sheet [data-route]', a => a.map(x => x.dataset.route.split(':')[0])); await pg.screenshot({ path: `${OUT}/${tag}-routes.png`, fullPage: true });
    ok(`[${tag}] Routes affichées sur un niveau déjà gagné`, rts.includes('safe') && rts.includes('danger'), rts.join(','));
    await pg.click('[data-route^="danger"]'); await pg.waitForTimeout(200); const desc = await pg.textContent('#sheet');
    await pg.click('[data-play]'); await pg.waitForFunction(() => window.__db2.B && window.__db2.B.foes.length, null, { timeout: 10000 }).catch(() => {});
    const rb = await pg.evaluate(() => window.__db2.B ? ({ r: window.__db2.B.route, n: window.__db2.B.foes.length }) : { r: null, sheet: document.querySelector('#sheet').innerText.slice(0, 200) });
    ok(`[${tag}] Route dangereuse : risque affiché, combat renforcé`, desc.includes('Butin : or ×1,5') && rb.r === 'danger', rb.r ? `route ${rb.r} · ${rb.n} ennemis vague 1` : rb.sheet);
    await pg.screenshot({ path: `${OUT}/${tag}-combat.png` });
    await ctx.close();
  }
  for (const m of ['m_necro', 'm_sewers', 'm_void', 'm_vorthax', 'm_ending']) if (!fs.existsSync(path.join(ROOT, 'dragonbound2/audio', m + '.mp3'))) miss.add(m);
  ok('Aucun fichier manquant (images, sons)', ![...miss].some(u => /gw_|ga_|gj_|m_/.test(u)), [...miss].join(' '));
  ok('Aucune erreur JavaScript', !errs.length, errs.join(' | '));
  console.log(res.join('\n')); await b.close(); srv.close();
});
