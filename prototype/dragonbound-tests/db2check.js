// Dragonbound II validation: node db2check.js <outDir>
// New save, old save, trophies + reload, daily gift + clock, energy + gems, tiers, chapter-1 boss -> Séléna joins.
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), OUT = process.argv[2] || '.', KEY = 'dragonbound2.v2';
const MIME = { '.html': 'text/html', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(d); }); });
const res = [], ok = (name, cond, extra = '') => (cond || (process.exitCode = 1), res.push(`${cond ? '✅' : '❌'} ${name}${extra ? ' — ' + extra : ''}`));
const base = over => Object.assign({ v: 2, gold: 100, items: { pot: 3, eth: 1, fea: 1, eli: 0 }, h: Object.fromEntries(['aldric', 'selena', 'orin', 'lyra', 'nyx'].map(k => [k, { lvl: 3, xp: 0, w: 0, a: 0 }])),
  team: ['aldric'], own: { aldric: 1 }, stars: Array(30).fill(0), seen: { in: 1, vid: 1, vid2: 1, n09: 1, n10: 1, ver: '1.9.9' }, mute: true, ch: 0, inv: [], nid: 1, spd: 3 }, over);
srv.listen(0, async () => {
  const url = `http://127.0.0.1:${srv.address().port}/dragonbound2/index.html`, b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
  const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message)); pg.on('dialog', d => d.accept());
  const S = () => pg.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
  const load = async save => { await pg.goto(url); await pg.evaluate(([k, s]) => { if (s) localStorage.setItem(k, JSON.stringify(s)); else localStorage.removeItem(k); }, [KEY, save]); await pg.goto(url); await pg.click('#title'); await pg.waitForTimeout(500); };
  const closeAll = async () => { for (let i = 0; i < 30 && await pg.$('#modal:not([hidden]) [data-next], #modal:not([hidden]) [data-close]'); i++) { const n = await pg.$('#modal:not([hidden]) [data-next]') || await pg.$('#modal:not([hidden]) [data-close]'); await n.click(); await pg.waitForTimeout(120); } };
  // 1. new player
  await load(null); await closeAll(); let s = await S();
  ok('Nouveau joueur : sauvegarde créée, Aldric seul, ni énergie ni gemmes affichées', s && s.team.join() === 'aldric' && !(await pg.$('#enBtn')) && !(await pg.$('#gemBtn')), s && `équipe ${s.team}`);
  await pg.screenshot({ path: `${OUT}/c1-accueil.png` });
  // 2. old 0.8 save (no tiers, trophies, gems, login)
  const old = base({ stars: [3, 2, 0].concat(Array(27).fill(0)), en: 12, enT: Date.now(), day: '', ctr: {} }); await load(old); await closeAll(); s = await S();
  ok('Ancienne sauvegarde 0.8 chargée sans perte', s.stars[0] === 3 && s.stars[1] === 2 && s.login && s.tc && s.m20 === 1, `étoiles ${s.stars.slice(0, 3)}`);
  // 3. trophy claim + reload
  await load(base({ tc: { kills: 60 }, gold: 100 })); await closeAll(); await pg.click('#trBtn'); await pg.waitForTimeout(300); await pg.screenshot({ path: `${OUT}/c2-trophees.png` });
  await pg.click('[data-trc="k50"]'); await pg.waitForTimeout(400); s = await S(); const g1 = s.gold;
  await pg.reload(); await pg.click('#title'); await pg.waitForTimeout(400); await closeAll(); await pg.click('#trBtn'); await pg.waitForTimeout(300);
  const again = await pg.$('[data-trc="k50"]'); s = await S();
  ok('Trophée réclamé une seule fois (+150 or, toujours réclamé après rechargement)', g1 === 250 && !again && s.trd.k50 === 1 && s.gold === 250, `or ${g1} puis ${s.gold}`);
  // 4. 2.0 lot 2: no daily gift any more (covered by db2lot2.js)
  // 5. 2.0 lot 2: an old save with gems and 5 tiers is migrated (gems → gold, Héroïque → Difficile, Enfer → Cauchemar) and plays with no energy
  const T5 = n => Array(30).fill(0).map((_, k) => k < 5 ? n : 0);
  await load(base({ en: 0, enT: Date.now(), gem: 20, gold: 100, tier: { 0: 4 }, tst: { 1: T5(1), 2: T5(3), 3: T5(2), 4: [0, 0, 1].concat(Array(27).fill(0)) }, trd: { t2: 1, t4: 1 } })); await closeAll(); s = await S();
  ok('Migration : 20 gemmes → +800 or', s.gold === 900 && s.gem === 0, `or ${s.gold} · gemmes ${s.gem}`);
  ok('Migration : Héroïque fusionné dans Difficile, Enfer dans Cauchemar', s.tier[0] === 2 && s.tst[1][0] === 3 && s.tst[2][0] === 2 && s.tst[2][2] === 2 && !s.tst[3] && !s.tst[4], `palier ${s.tier[0]} · Difficile ${s.tst[1].slice(0, 3)} · Cauchemar ${s.tst[2].slice(0, 3)}`);
  ok('Migration : trophées de difficulté déjà réclamés conservés', s.trd.t1 === 1 && s.trd.t2 === 1 && !s.trd.t3 && !s.trd.t4, JSON.stringify(s.trd));
  await load(base({ en: 0, enT: Date.now() })); await closeAll(); await pg.click('.node[data-lv="0"]'); await pg.waitForTimeout(200); await pg.click('[data-play]'); await pg.waitForTimeout(600);
  ok('Sans énergie : le combat se lance quand même', await pg.evaluate(() => !!window.__db2.B && !document.getElementById('fight').hidden));
  // 6. tiers: beating chapter 1's boss opens Difficile (2.0 lot 2), Cauchemar stays locked
  await load(base({ stars: [3, 3, 3, 3, 3].concat(Array(25).fill(0)), team: ['aldric', 'selena'], own: { aldric: 1, selena: 1 } })); await closeAll();
  const tierBtn = await pg.$('#tiers [data-tier="1"]:not([disabled])'), locked = await pg.$('#tiers [data-tier="2"][disabled]'); await pg.screenshot({ path: `${OUT}/c5-difficultes.png` });
  if (tierBtn) { await tierBtn.click(); await pg.waitForTimeout(200); await pg.click('.node[data-lv="0"]'); await pg.waitForTimeout(200); }
  const sheet = await pg.textContent('#sheet').catch(() => '');
  ok('Boss du chapitre 1 battu → Difficile ouvert, Cauchemar fermé', !!tierBtn && !!locked && sheet.includes('Difficile'), sheet.includes('Difficile') ? 'fiche du niveau en Difficile' : '');
  await pg.click('[data-play]'); await pg.waitForFunction(() => window.__db2.B && window.__db2.B.foes.length, null, { timeout: 10000 }).catch(() => {});
  const tb = await pg.evaluate(() => ({ t: window.__db2.B.tier, n: window.__db2.B.foes.length, lv: window.__db2.B.lvIdx }));
  ok('Combat en Difficile : ennemis renforcés', tb.t === 1 && tb.lv === 14, `palier ${tb.t} · indice ${tb.lv} · ${tb.n} ennemis`);
  // 7. chapter 1 boss → victory → Séléna joins
  await load(base({ stars: [1, 1, 1, 1, 0].concat(Array(25).fill(0)), h: Object.fromEntries(['aldric', 'selena', 'orin', 'lyra', 'nyx'].map(k => [k, { lvl: 14, xp: 0, w: 3, a: 3 }])) })); await closeAll();
  await pg.click('.node[data-lv="4"]'); await pg.waitForTimeout(200); await pg.click('[data-play]'); await pg.waitForSelector('#autoBtn', { state: 'visible' }); await pg.waitForTimeout(1200); await pg.click('#autoBtn');
  let phase2 = false; for (let t = 0; t < 360 && !(await pg.$('[data-chpick]')); t++) { await pg.waitForTimeout(500); if (!phase2) phase2 = await pg.evaluate(() => { const B = window.__db2.B; return !!(B && B.foes.some(f => f.boss && f.ph)); }); }
  for (let t = 0; t < 80; t++) { const x = await pg.$('#modal:not([hidden]) [data-chpick]') || await pg.$('#modal:not([hidden]) [data-dkeep]') || await pg.$('#modal:not([hidden]) [data-lpick]') || await pg.$('#modal:not([hidden]) [data-cnext]') || await pg.$('#modal:not([hidden]) [data-home]') || await pg.$('#modal:not([hidden]) [data-next]'); if (!x) { await pg.waitForTimeout(500); continue; } await x.click(); await pg.waitForTimeout(350); }
  s = await S(); await pg.screenshot({ path: `${OUT}/c6-fin.png` });
  ok('Boss du chapitre 1 : 2e phase, victoire, Séléna rejoint, chapitre 2 ouvert', phase2 && s.own.selena === 1 && s.stars[4] > 0 && s.ch === 1, `phase 2 ${phase2} · Séléna ${!!s.own.selena} · chapitre ${s.ch + 1} · trésor ${s.inv.some(it => it.r === 4)}`);
  ok('Aucune erreur JavaScript', !errs.length, errs.join(' | '));
  console.log(res.join('\n')); await b.close(); srv.close();
});
