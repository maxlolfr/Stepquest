// Settings storage must survive broken or unavailable storage.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSettings, saveSettings, SETTINGS_KEY } from '../js/save/settings.js';

const memory = (init = {}) => {
  const m = new Map(Object.entries(init));
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), map: m };
};
const throwing = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('QuotaExceededError'); } };

test('uses its own key, never another game\'s', () => {
  assert.ok(SETTINGS_KEY.startsWith('sqid.'));
});

test('defaults when nothing is stored', () => {
  assert.deepEqual(loadSettings(memory()), { v: 1, muted: false, speed: 1, auto: true });
});

test('round trip', () => {
  const s = memory();
  assert.equal(saveSettings({ muted: true, speed: 4 }, s), true);
  assert.equal(loadSettings(s).muted, true);
  assert.equal(loadSettings(s).speed, 4);
  assert.deepEqual([...s.map.keys()], [SETTINGS_KEY]);
});

test('corrupted JSON falls back to defaults', () => {
  assert.deepEqual(loadSettings(memory({ [SETTINGS_KEY]: '{oops' })), { v: 1, muted: false, speed: 1, auto: true });
});

test('unknown version falls back to defaults', () => {
  assert.equal(loadSettings(memory({ [SETTINGS_KEY]: JSON.stringify({ v: 99, muted: true }) })).muted, false);
});

test('storage that throws never crashes', () => {
  assert.deepEqual(loadSettings(throwing), { v: 1, muted: false, speed: 1, auto: true });
  assert.equal(saveSettings({ muted: true }, throwing), false);
  assert.deepEqual(loadSettings(undefined), { v: 1, muted: false, speed: 1, auto: true });
});

test('auto mode is on by default and can be turned off', () => {
  const s = memory();
  assert.equal(loadSettings(s).auto, true);
  saveSettings({ muted: false, speed: 2, auto: false }, s);
  assert.equal(loadSettings(s).auto, false);
});

test('speed ×10 is kept', () => {
  const s = memory();
  saveSettings({ speed: 10 }, s);
  assert.equal(loadSettings(s).speed, 10);
});
