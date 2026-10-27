// Browser smoke test: serves prototype/ like GitHub Pages does, opens the game
// at iPhone sizes, fails on any JavaScript error or file that does not load.
// Usage (from prototype/infinite-dungeon/): NODE_PATH=$(npm root -g) node tests/smoke.js [outDir]
// Needs Playwright with Chromium (CI installs it; locally: npx playwright install chromium).
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium, webkit } = require('playwright');
const GAME_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = path.resolve(GAME_DIR, '..'); // prototype/ — the game sits next to dragonbound2/ as on Pages
const OUT = process.argv[2] || path.join(GAME_DIR, 'tests', 'out');
fs.mkdirSync(OUT, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.woff': 'font/woff', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => {
  const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  if (!p.startsWith(ROOT)) { r.writeHead(403); return r.end(); }
  fs.readFile(p, (e, d) => {
    if (e) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(d);
  });
});

const results = [];
const check = (name, ok, extra = '') => { if (!ok) process.exitCode = 1; results.push(`${ok ? '✅' : '❌'} ${name}${extra ? ' — ' + extra : ''}`); };

srv.listen(0, async () => {
  const base = `http://127.0.0.1:${srv.address().port}/infinite-dungeon/index.html`;
  const engines = [['chromium', chromium]];
  if (process.env.SMOKE_WEBKIT) engines.push(['webkit', webkit]);
  for (const [engine, type] of engines) {
    const browser = await type.launch();
    for (const [name, w, h] of [['iphone-se', 375, 667], ['iphone-15', 393, 852], ['iphone-max', 430, 932]]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: engine === 'chromium' });
      const pg = await ctx.newPage(), errors = [], failed = [];
      pg.on('pageerror', e => errors.push(e.message));
      pg.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      pg.on('response', res => { if (res.status() >= 400) failed.push(`${res.status()} ${res.url()}`); });
      await pg.goto(`${base}?debug`);
      await pg.waitForFunction(() => window.__sqid && (window.__sqid.ready || window.__sqid.error), null, { timeout: 20000 }).catch(() => {});
      await pg.waitForTimeout(1300);
      const state = await pg.evaluate(() => ({ ready: window.__sqid.ready, error: window.__sqid.error || '', missing: window.__sqid.missingAssets(),
        title: document.getElementById('gameTitle').textContent,
        tap: getComputedStyle(document.getElementById('tapStart')).display !== 'none',
        menu: getComputedStyle(document.getElementById('menu')).display !== 'none' }));
      const tag = `${engine} ${name} ${w}×${h}`;
      check(`${tag} : écran d'accueil prêt, menu caché avant le toucher`, state.ready && state.title.length > 0 && state.tap && !state.menu, state.error);
      check(`${tag} : aucun fichier manquant`, state.missing.length === 0 && failed.length === 0, [...state.missing, ...failed].join(', '));
      await pg.screenshot({ path: path.join(OUT, `${engine}-${name}-1-accueil.png`) });
      await pg.tap('#tapStart');
      await pg.waitForTimeout(700);
      const menu = await pg.evaluate(() => {
        const m = document.getElementById('menu'), b = [...m.querySelectorAll('button')];
        const visible = el => getComputedStyle(el).display !== 'none';
        return { shown: visible(m) && !visible(document.getElementById('tapStart')), buttons: b.length, allDisabled: b.every(x => x.disabled), minH: Math.min(...b.map(x => x.getBoundingClientRect().height)) };
      });
      check(`${tag} : menu affiché, boutons ≥ 44 px, fonctions à venir désactivées`, menu.shown && menu.buttons === 2 && menu.allDisabled && menu.minH >= 44, `hauteur ${Math.round(menu.minH)} px`);
      const tiny = await pg.evaluate(() => [...document.querySelectorAll('#title *')].filter(el => {
        if (el.hidden || el.closest('[hidden]') || el.id === 'debug' || el.closest('#debug') || !el.childNodes.length) return false;
        const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()); if (!hasText) return false;
        return parseFloat(getComputedStyle(el).fontSize) < 14;
      }).map(el => el.tagName + '#' + el.id));
      check(`${tag} : aucun texte sous 14 px`, tiny.length === 0, tiny.join(', '));
      check(`${tag} : aucune erreur JavaScript`, errors.length === 0, errors.join(' | '));
      await pg.screenshot({ path: path.join(OUT, `${engine}-${name}-2-menu.png`) });
      await ctx.close();
    }
    await browser.close();
  }
  srv.close();
  console.log(results.join('\n'));
  console.log(process.exitCode ? '\nÉCHEC' : '\nOK — captures dans ' + OUT);
});
