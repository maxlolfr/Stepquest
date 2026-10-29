// Every file the game references must exist in the repository, and the game
// folder must not hold copies of images or sounds from the other games.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { allAssets, spriteKeys, HERO_SPRITE } from '../js/ui/assets.js';
import { MONSTERS } from '../js/data/monsters.js';
import { POSEM } from '../js/data/visual-metrics.js';

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

test('no image or sound of the other games is copied here (only original art in img/ and audio/)', () => {
  const media = /\.(webp|png|jpe?g|gif|mp3|ogg|wav|m4a|mp4|woff2?)$/i;
  const walk = (d, out = []) => { for (const f of readdirSync(d)) { const p = path.join(d, f); if (statSync(p).isDirectory()) walk(p, out); else if (media.test(f)) out.push(p); } return out; };
  const mine = walk(GAME_DIR);
  assert.ok(mine.every(p => ['img', 'audio'].some(d => path.relative(GAME_DIR, p).startsWith(d + path.sep))), 'media outside img/ and audio/');
  const hash = p => createHash('sha1').update(readFileSync(p)).digest('hex');
  const theirs = new Set([...walk(path.join(GAME_DIR, '../dragonbound2')), ...walk(path.join(GAME_DIR, '../dragonbound'))].map(hash));
  assert.deepEqual(mine.filter(p => theirs.has(hash(p))).map(p => path.basename(p)), [], 'copied file');
});

test('every hero and monster sprite has floor metrics and an idle pose', () => {
  const bases = [...Object.values(HERO_SPRITE), ...Object.keys(MONSTERS)];
  for (const b of bases) {
    const keys = spriteKeys(b).filter(k => !k.endsWith('-face'));
    assert.ok(keys.includes(b), `${b}: no idle image`);
    assert.deepEqual(keys.filter(k => !POSEM[k]), [], `${b}: missing metrics`);
  }
});
