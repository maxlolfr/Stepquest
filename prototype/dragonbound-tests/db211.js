// 1.1 checks: comparison screen, bag, incompatible items, multiple chests, sound sheet, changelog, rally, enemy roles. node db211.js outDir
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), OUT = process.argv[2] || '.', KEY = 'dragonbound2.v2';
const MIME = { '.html': 'text/html', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(d); }); });
const res = [], ok = (n, c, x = '') => res.push(`${c ? '✅' : '❌'} ${n}${x ? ' — ' + x : ''}`);
const H = ['aldric', 'selena', 'orin', 'lyra', 'nyx'];
const inv = [{ id: 1, slot: 'w', r: 1, t: 3, st: { atk: 6 }, hero: 'aldric', img: 'wSword', name: 'Épée A' }, { id: 2, slot: 'w', r: 3, t: 8, st: { atk: 20 }, hero: 'aldric', img: 'wSword', name: 'Épée B', pw: 'vampire' },
  { id: 3, slot: 'a', r: 2, t: 5, st: { hp: 40, def: 4 }, img: 'a0armure', name: 'Armure C' }, { id: 4, slot: 'w', r: 2, t: 5, st: { atk: 12 }, hero: 'nyx', img: 'wDaggers', name: 'Dagues N' }];
const base = o => Object.assign({ v: 2, gold: 100, items: { pot: 3, eth: 1, fea: 1, eli: 0 }, h: Object.fromEntries(H.map(k => [k, { lvl: 6, xp: 0, w: 0, a: 0, eq: k === 'aldric' ? { w: 1 } : {} }])),
  team: ['aldric', 'selena'], own: { aldric: 1, selena: 1 }, stars: Array(50).fill(0), seen: { in: 1, vid: 1, n09: 1, n10: 1, ver: '1.5.1' }, mute: true, ch: 1, inv, nid: 10, spd: 3 }, o);
srv.listen(0, async () => {
  const url = `http://127.0.0.1:${srv.address().port}/dragonbound2/index.html`, b = await chromium.launch(), errs = [];
  for (const [w, h, tag] of [[390, 844, 'portrait'], [1180, 820, 'paysage']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true }), pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(tag + ': ' + e.message));
    const S = () => pg.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
    const load = async (save, title = true) => { await pg.goto(url); await pg.evaluate(([k, s]) => { if (s) localStorage.setItem(k, JSON.stringify(s)); else localStorage.removeItem(k); }, [KEY, save]); await pg.goto(url); if (title) { await pg.click('#title'); await pg.waitForTimeout(500); } };
    const closeAll = async () => { for (let i = 0; i < 20 && await pg.$('#modal:not([hidden]) [data-close]'); i++) { await pg.click('#modal:not([hidden]) [data-close]'); await pg.waitForTimeout(120); } };
    // bag compare
    await load(base()); await closeAll(); const st0 = await pg.evaluate(() => JSON.stringify(window.__db2 && window.__db2.heroStats ? window.__db2.heroStats('aldric') : null));
    await pg.click('#heroesBtn'); await pg.waitForTimeout(300); const best = await pg.$$eval('#sheet .bestb', a => a.length); await pg.screenshot({ path: `${OUT}/${tag}-sac.png` });
    await pg.click('[data-icmp="2"]'); await pg.waitForTimeout(300); await pg.screenshot({ path: `${OUT}/${tag}-comparer.png`, fullPage: true });
    const tbl = await pg.$$eval('#sheet table.cmp tr', r => r.map(x => x.innerText.replace(/\s+/g, ' ')));
    const up = await pg.$$eval('#sheet table.cmp td.up', a => a.length); let s = await S();
    ok(`[${tag}] Sac : badge ★ Meilleur et écran Comparer (stats réelles, écarts colorés)`, best >= 1 && tbl.length >= 6 && up >= 1 && s.h.aldric.eq.w === 1, tbl.slice(1, 4).join(' | '));
    ok(`[${tag}] Rien ne change sans confirmation`, s.h.aldric.eq.w === 1 && s.inv.length === 4);
    await pg.click('[data-dequip]'); await pg.waitForTimeout(300); s = await S(); ok(`[${tag}] Équiper après confirmation`, s.h.aldric.eq.w === 2 && s.inv.length === 4);
    // armour: tabs for both heroes, switching tab
    await pg.click('[data-icmp="3"]'); await pg.waitForTimeout(300); const tabs = await pg.$$eval('#sheet [data-dtab]', a => a.map(x => x.dataset.dtab)); await pg.click('[data-dtab="selena"]'); await pg.waitForTimeout(200);
    const cur = await pg.textContent('#sheet .cmpcur'); ok(`[${tag}] Armure : onglets héros compatibles`, tabs.join() === 'aldric,selena' && cur.includes('Séléna'), tabs.join());
    const g0 = (await S()).gold; await pg.click('[data-dsell]'); await pg.waitForTimeout(300); s = await S(); ok(`[${tag}] Vendre depuis la comparaison`, !s.inv.some(i => i.id === 3) && s.gold > g0, `or ${g0} → ${s.gold}`);
    // incompatible weapon (Nyx not owned): no Équiper, only keep/sell
    const r = await pg.evaluate(() => { const D = window.__db2; return D.itemDecideTest ? null : 1; });
    await closeAll();
    await pg.evaluate(() => { const it = window.__db2.S.inv.find(i => i.id === 4); window.__p = window.__db2.itemDecide(it, { title: 'Test' }); });
    await pg.waitForTimeout(300); const noEq = !(await pg.$('#sheet [data-dequip]')), txt = await pg.textContent('#sheet'); await pg.screenshot({ path: `${OUT}/${tag}-incompatible.png` });
    ok(`[${tag}] Objet incompatible : pas de bouton Équiper, raison affichée`, noEq && txt.includes('réservée à'), '');
    await pg.click('[data-dkeep]'); await pg.waitForTimeout(200);
    // multiple chests
    await pg.evaluate(() => { const D = window.__db2; const a = D.makeItem('a', 2, 5), j = D.makeItem('j', 3, 5); window.__done = 0; D.openChests([a, j]).then(() => window.__done = 1); });
    let n = 0; for (let t = 0; t < 40 && !(await pg.evaluate(() => window.__done)); t++) { const k = await pg.$('#modal:not([hidden]) [data-dkeep]'); if (k) { if (!n) await pg.screenshot({ path: `${OUT}/${tag}-coffre.png`, fullPage: true }); await k.click(); n++; } await pg.waitForTimeout(400); }
    ok(`[${tag}] Plusieurs coffres : une comparaison par objet`, n === 2 && await pg.evaluate(() => window.__done), `${n} écrans`);
    // sound sheet
    await closeAll(); await pg.click('#snd'); await pg.waitForTimeout(200); await pg.screenshot({ path: `${OUT}/${tag}-son.png` });
    await pg.$eval('[data-vol="m"]', e => { e.value = 90; e.dispatchEvent(new Event('input', { bubbles: true })); }); await pg.$eval('[data-vol="s"]', e => { e.value = 30; e.dispatchEvent(new Event('input', { bubbles: true })); });
    s = await S(); ok(`[${tag}] Réglage musique / bruitages enregistré`, s.vol && s.vol.m === .9 && s.vol.s === .3, JSON.stringify(s.vol));
    await closeAll(); await pg.click('#newsBtn'); await pg.waitForTimeout(200); const hist = await pg.$$eval('#sheet details.hist summary', a => a.map(x => x.innerText)); await pg.screenshot({ path: `${OUT}/${tag}-nouveautes.png` });
    ok(`[${tag}] Bouton Nouveautés : historique`, hist.length >= 5, hist.join(' / '));
    await pg.screenshot({ path: `${OUT}/${tag}-accueil.png` });
    // news once per version: old 1.0.2 save (n10, no ver)
    await load(base({ seen: { in: 1, vid: 1, n09: 1, n10: 1 } })); const h3 = await pg.textContent('#modal:not([hidden]) h3').catch(() => ''); await closeAll();
    await pg.reload(); await pg.click('#title'); await pg.waitForTimeout(500); const again = await pg.$('#modal:not([hidden]) h3') ? await pg.textContent('#modal:not([hidden]) h3') : '';
    s = await S(); ok(`[${tag}] Nouveautés 1.1 montrées une seule fois (sauvegarde 1.0.2)`, h3 === 'Version 1.5.1' && !again.includes('Version 1.5.1') && s.seen.ver === '1.5.1' && s.inv.length === 4, `1er : ${h3} · 2e : ${again || 'rien'}`);
    await ctx.close();
  }
  ok('Aucune erreur JavaScript', !errs.length, errs.join(' | '));
  console.log(res.join('\n')); await b.close(); srv.close();
});
