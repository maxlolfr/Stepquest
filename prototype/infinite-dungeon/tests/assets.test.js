// Every file the game references must exist in the repository, and the game
// folder must not hold copies of images or sounds from the other games.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { allAssets, IMAGES } from '../js/ui/assets.js';
import { POSEM } from '../js/data/sprite-metrics.js';

const GAME_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const onDisk = rel => path.resolve(GAME_DIR, rel);

test('every path in assets.js exists', () => {
  const missing = allAssets().filter(a => !existsSync(onDisk(a.path))).map(a => a.path);
  assert.deepEqual(missing, [], `missing files:\n${missing.join('\n')}`);
});

test('every url() in style.css exists', () => {
  const css = readFileSync(path.join(GAME_DIR, 'style.css'), 'utf8');
  const urls = [...css.matchAll(/url\(['"]?([^'")]+)['"]?\)/g)].map(m => m[1]);
  assert.ok(urls.length > 0);
  const missing = urls.filter(u => !existsSync(onDisk(u)));
  assert.deepEqual(missing, []);
});

test('assets are only read from the other games, never copied here', () => {
  const media = /\.(webp|png|jpe?g|gif|mp3|ogg|wav|m4a|mp4|woff2?)$/i, found = [];
  const walk = d => { for (const f of readdirSync(d)) { const p = path.join(d, f); if (statSync(p).isDirectory()) walk(p); else if (media.test(f)) found.push(path.relative(GAME_DIR, p)); } };
  walk(GAME_DIR);
  assert.deepEqual(found, []);
});

test('every hero sprite drawn has floor metrics', () => {
  const noMetrics = Object.keys(IMAGES).filter(k => !k.startsWith('bg_') && !k.endsWith('-face') && !POSEM[k]);
  assert.deepEqual(noMetrics, []);
});
