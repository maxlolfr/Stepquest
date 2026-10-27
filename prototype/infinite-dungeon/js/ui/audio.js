// Music and interface sounds. iOS only plays audio after a touch, so nothing
// starts before unlock() is called from a tap handler.
import { AUDIO } from './assets.js';
import { noteMissing } from './loader.js';
import { loadSettings, saveSettings } from '../save/settings.js';

let unlocked = false, music = null, musicKey = '';
const settings = loadSettings();

export const isMuted = () => settings.muted;

export function setMuted(m) {
  settings.muted = !!m;
  saveSettings(settings);
  if (music) { if (m) music.pause(); else if (unlocked) music.play().catch(() => {}); }
}

export function unlock() { unlocked = true; if (musicKey && !settings.muted) playMusic(musicKey); }

export function playMusic(key) {
  musicKey = key;
  if (!unlocked || settings.muted) return;
  if (music && music.dataset.key === key) { music.play().catch(() => {}); return; }
  if (music) music.pause();
  const src = AUDIO[key];
  if (!src) return;
  music = new Audio(src);
  music.dataset.key = key;
  music.loop = true;
  music.volume = 0.5;
  music.addEventListener('error', () => noteMissing(src), { once: true });
  music.play().catch(() => {});
}

export function sfx(key, volume = 0.6) {
  if (!unlocked || settings.muted || !AUDIO[key]) return;
  const a = new Audio(AUDIO[key]);
  a.volume = volume;
  a.play().catch(() => {});
}
