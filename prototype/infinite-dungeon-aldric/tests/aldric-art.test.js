import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { IMAGES, spriteKeys } from '../js/ui/assets.js';
import { heroFrames, drawSprite } from '../js/ui/sprites.js';
import { ANIM, POSEM } from '../js/data/visual-metrics.js';
import { ANIM as UPSTREAM } from '../js/data/sprite-metrics.js';

test('Aldric uses supplied art for every combat state, including KO and ultimate', () => {
  for (const key of [...spriteKeys('ald'), 'ald-face', 'ult_aldric', 'art_aldric']) {
    assert.match(IMAGES[key], /^img\/aldric\/ald_idle_[0-5]\.png$/);
  }
  assert.equal(heroFrames('ald', 'idle').length, 6);
  assert.equal(UPSTREAM.ald.idle, 4, 'generated source is not mutated');
  for (const action of Object.keys(ANIM.ald)) {
    for (const key of heroFrames('ald', action)) assert.ok(POSEM[key]);
  }
});

test('six original idle files are 512px PNGs with an alpha channel', () => {
  for (const key of heroFrames('ald', 'idle')) {
    const bytes = readFileSync(new URL('../' + IMAGES[key], import.meta.url));
    assert.equal(bytes.subarray(1,4).toString(), 'PNG');
    assert.equal(bytes.readUInt32BE(16), 512);
    assert.equal(bytes.readUInt32BE(20), 512);
    assert.equal(bytes[25], 6, 'RGBA PNG');
  }
});
