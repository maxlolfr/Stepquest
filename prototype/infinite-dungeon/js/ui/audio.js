// Music and sound effects. iOS only plays audio after a touch, so nothing
// starts before unlock() is called from a tap handler. Effects use Web Audio
// (decoded once, cheap to replay); music uses a single <audio> element.
import { AUDIO } from './assets.js';
import { noteMissing } from './loader.js';
import { loadSettings, saveSettings } from '../save/settings.js';

let unlocked = false, music = null, musicKey = '', ctx = null, bus = null;
const buffers = new Map(); // key -> AudioBuffer | Promise | null
const settings = loadSettings();

export const isMuted = () => settings.muted;
export const getSettings = () => settings;
export const persistSettings = () => saveSettings(settings);

export function setMuted(m) {
  settings.muted = !!m;
  saveSettings(settings);
  if (music) { if (m) music.pause(); else if (unlocked) music.play().catch(() => {}); }
}

export function unlock() {
  if (!unlocked) {
    unlocked = true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) { ctx = new AC(); bus = ctx.createGain(); bus.gain.value = 0.8; bus.connect(ctx.destination); }
    } catch { ctx = null; }
  }
  if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
  if (musicKey && !settings.muted) playMusic(musicKey);
}

export function playMusic(key) {
  if (musicKey === key && music && !music.paused) return;
  musicKey = key;
  if (!unlocked || settings.muted) return;
  if (music && music.dataset.key === key) { music.play().catch(() => {}); return; }
  if (music) music.pause();
  const src = AUDIO[key];
  if (!src) return;
  music = new Audio(src);
  music.dataset.key = key;
  music.loop = key !== 'm_victory' && key !== 'm_defeat';
  music.volume = 0.45;
  music.addEventListener('error', () => noteMissing(src), { once: true });
  music.play().catch(() => {});
}

function load(key) {
  if (buffers.has(key)) return buffers.get(key);
  const p = fetch(AUDIO[key]).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
    .then(b => new Promise((res, rej) => ctx.decodeAudioData(b, res, rej)))
    .then(buf => { buffers.set(key, buf); return buf; })
    .catch(() => { noteMissing(AUDIO[key]); buffers.set(key, null); return null; });
  buffers.set(key, p);
  return p;
}

/** Decodes effects ahead of a fight so the first hit is not silent. */
export function preloadSfx(keys) { if (ctx) for (const k of keys) if (AUDIO[k]) load(k); }

export function sfx(key, volume = 0.6) {
  if (!unlocked || settings.muted || !key || !AUDIO[key]) return;
  if (!ctx) { const a = new Audio(AUDIO[key]); a.volume = volume; a.play().catch(() => {}); return; }
  const b = buffers.get(key);
  const play = buf => {
    if (!buf) return;
    const s = ctx.createBufferSource(), g = ctx.createGain();
    s.buffer = buf; g.gain.value = volume; s.connect(g); g.connect(bus); s.start();
  };
  if (b && !(b instanceof Promise)) play(b); else if (b === undefined) load(key).then(play);
}
