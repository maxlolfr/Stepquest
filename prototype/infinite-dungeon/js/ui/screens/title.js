// Title screen: the necropolis gate, the five heroes waiting in front of it,
// rising embers, then the menu once the player taps (which also unlocks sound).
import { GAME } from '../../config.js';
import { IMAGES, HERO_SPRITE } from '../assets.js';
import { loadImage, loadImages } from '../loader.js';
import { heroFrames, pingPong, drawSprite } from '../sprites.js';
import { unlock, playMusic, sfx, isMuted, setMuted } from '../audio.js';

const BG_HORIZON = 0.68;     // where the floor starts in bg_c7_1 (Dragonbound II level data)
const BG_POS_Y = 0.62;       // must match object-position in style.css
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Back row first so the front row overlaps it. x = fraction of screen width.
const LINEUP = [
  { id: 'lyra',   x: 0.14, back: true },
  { id: 'nyx',    x: 0.86, back: true, flip: true },
  { id: 'selena', x: 0.27 },
  { id: 'orin',   x: 0.73, flip: true },
  { id: 'aldric', x: 0.5, lead: true },
];
const MENU_RESERVE = 205;    // px kept free at the bottom for the menu (2 buttons + version)

export async function showTitle() {
  const $ = id => document.getElementById(id);
  const screen = $('title'), cv = $('titleCv'), cx = cv.getContext('2d'), bgEl = $('titleBg');
  $('kicker').textContent = GAME.kicker;
  $('gameTitle').textContent = GAME.title;
  $('tagline').textContent = GAME.tagline;
  $('version').textContent = `${GAME.stage} · v${GAME.version}`;
  document.title = `${GAME.title} — ${GAME.kicker}`;

  const heroes = LINEUP.map((p, i) => ({ ...p, base: HERO_SPRITE[p.id], seed: i * 1.7, frames: heroFrames(HERO_SPRITE[p.id], 'idle') }));
  const bgImg = loadImage('bg_title');
  bgEl.src = IMAGES.bg_title;
  await Promise.all([bgImg, loadImages(heroes.flatMap(h => h.frames)), document.fonts ? document.fonts.ready : null]);
  bgEl.classList.add('ready');
  screen.classList.add('ready');

  // ---- sound toggle ----
  const muteBtn = $('mute');
  const paintMute = () => { muteBtn.textContent = isMuted() ? '🔇' : '🔊'; muteBtn.setAttribute('aria-label', isMuted() ? 'Activer le son' : 'Couper le son'); };
  paintMute();
  muteBtn.addEventListener('click', () => { unlock(); setMuted(!isMuted()); paintMute(); });

  // ---- tap to start ----
  playMusic('m_title');
  $('tapStart').addEventListener('click', () => {
    unlock(); sfx('ui_click');
    $('tapStart').hidden = true; $('menu').hidden = false;
  }, { once: true });

  // ---- canvas: heroes + embers ----
  let W = 0, H = 0, dpr = 1, floorY = 0, heroH = 0;
  const layout = () => {
    const r = cv.getBoundingClientRect();
    W = r.width; H = r.height; dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const im = bgEl.naturalWidth ? bgEl : null, iw = im ? im.naturalWidth : 1400, ih = im ? im.naturalHeight : 1400;
    const s = Math.max(W / iw, H / ih), dispH = ih * s, offY = (H - dispH) * BG_POS_Y;
    floorY = offY + BG_HORIZON * dispH;
    heroH = Math.min(H * 0.21, W * 0.44);
  };
  layout();
  addEventListener('resize', layout);

  const embers = Array.from({ length: reduce ? 10 : 34 }, () => newEmber(true));
  function newEmber(anywhere) {
    return { x: Math.random(), y: anywhere ? Math.random() : 1.02, v: 0.02 + Math.random() * 0.05, r: 0.8 + Math.random() * 2.2,
      w: Math.random() * 6.28, gold: Math.random() < 0.3 };
  }

  let last = performance.now();
  const frame = t => {
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx.clearRect(0, 0, W, H);
    // stand on the floor, but never under the menu
    const feet = Math.max(floorY + 12, Math.min(floorY + heroH * 0.45, H - MENU_RESERVE));
    for (const h of heroes) {
      const size = heroH * (h.lead ? 1.06 : h.back ? 0.8 : 0.94), y = feet - (h.back ? heroH * 0.2 : 0) + (h.lead ? heroH * 0.04 : 0);
      const x = W * h.x, k = h.frames[reduce ? 0 : pingPong(h.frames.length, t + h.seed * 400, 190)];
      // soft ground shadow
      cx.save(); cx.globalAlpha = 0.45; cx.fillStyle = '#000';
      cx.beginPath(); cx.ellipse(x, y, size * 0.26, size * 0.06, 0, 0, Math.PI * 2); cx.fill(); cx.restore();
      if (!drawSprite(cx, k, x, y, size, { flip: !!h.flip, alpha: h.back ? 0.92 : 1 })) drawSprite(cx, h.base, x, y, size, { flip: !!h.flip });
    }
    cx.globalCompositeOperation = 'lighter';
    for (const e of embers) {
      if (!reduce) { e.y -= e.v * dt; e.w += dt * 1.6; }
      if (e.y < -0.02) Object.assign(e, newEmber(false));
      const px = (e.x + Math.sin(e.w) * 0.012) * W, py = e.y * H, a = Math.min(1, (1 - e.y) * 2.2) * (0.35 + 0.35 * Math.sin(e.w * 2.3));
      cx.fillStyle = e.gold ? `rgba(255,200,110,${a})` : `rgba(125,255,154,${a})`;
      cx.beginPath(); cx.arc(px, py, e.r, 0, Math.PI * 2); cx.fill();
    }
    cx.globalCompositeOperation = 'source-over';
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
