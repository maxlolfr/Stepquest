// Draws a fight on a canvas: background, units standing on the floor, hit
// numbers, effects. It reads the engine's units directly (read only) and keeps
// its own animation state per unit (offset, pose, flash).
import { POSEM } from '../data/sprite-metrics.js';
import { getImage } from './loader.js';
import { heroFrames, pingPong, drawSprite } from './sprites.js';
import { alive } from '../engine/combat.js';

// slot layouts from Dragonbound II: [x, depth] per unit count
const HSLOT = [[[0.3, 0.6]], [[0.32, 0.42], [0.19, 0.88]], [[0.36, 0.5], [0.15, 0.2], [0.23, 0.95]]];
const FSLOT = [[[0.7, 0.6]], [[0.68, 0.42], [0.83, 0.88]], [[0.66, 0.55], [0.86, 0.26], [0.84, 0.94]]];
const BSLOT = [[0.68, 0.62], [0.9, 0.22], [0.92, 0.96]];
const persp = v => 0.82 + 0.3 * v;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
// v0.6: painted status icons (img/st_*.webp); taunt and shadow marks are drawn
const STATUS_IMG = { poison: 'st_poison', burn: 'st_burn', stun: 'st_stun', freeze: 'st_freeze', mark: 'st_mark' };

export function createView(canvas, B, door) {
  const cx = canvas.getContext('2d');
  const V = { W: 0, H: 0, GY: 0, dpr: 1, fx: [], texts: [], shake: null, units: new Map(), actor: 0, door, running: true, flashAll: 0, speed: 1 };
  const foeCount = B.units.filter(u => u.side === 'f').length;
  const st = u => {
    if (!V.units.has(u.uid)) V.units.set(u.uid, { ox: 0, oy: 0, pose: 'idle', t0: 0, dur: 0, flash: 0, alpha: u.summoned ? 0 : 1, deadT: 0, seed: Math.random() * 6, spawn: performance.now() });
    return V.units.get(u.uid);
  };

  function layout() {
    const r = canvas.getBoundingClientRect();
    V.W = r.width; V.H = r.height; V.dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(V.W * V.dpr); canvas.height = Math.round(V.H * V.dpr);
    V.GY = V.H * 0.38;
  }

  // position of a unit on screen: feet (x, y) and height h
  function pos(u) {
    let s;
    if (u.side === 'h') { const n = B.units.filter(x => x.side === 'h').length; s = HSLOT[n - 1][u.slot] || HSLOT[2][u.slot % 3]; }
    else if (B.units.some(x => x.boss)) s = BSLOT[Math.min(2, u.slot)];
    else s = (FSLOT[Math.min(3, foeCount) - 1] || FSLOT[2])[u.slot] || FSLOT[2][u.slot % 3];
    const [sx, v] = s, a = st(u);
    const fly = u.fly && alive(u) ? V.H * 0.06 + Math.sin(performance.now() / 380 + a.seed) * 4 : 0;
    const base = Math.min(V.H, V.W * 1.3); // narrow phones: size from the width so the trio does not overlap
    return { x: sx * V.W + a.ox, y: V.GY + (V.H - V.GY) * (0.28 + 0.62 * v) + a.oy, fly, h: base * (u.boss ? Math.max(u.h || 0.4, 0.46) * 1.2 : (u.h || 0.25) * (u.elite ? 1.12 : 1)) * persp(v), v }; // bosses: drawn bigger than in Dragonbound II
  }
  V.pos = pos;
  V.center = u => { const p = pos(u); return { x: p.x, y: p.y - p.fly - p.h * 0.5 }; };
  V.unit = st;

  function drawBg() {
    const im = getImage(door.bg);
    if (!im) { cx.fillStyle = '#16121f'; cx.fillRect(0, 0, V.W, V.H); return; }
    // Same layout as Dragonbound II: the whole picture width is shown and its floor
    // line lands on GY; the floor band is then stretched down to the bottom of the
    // stage (reads like a lower camera) instead of zooming into the picture.
    const iw = im.naturalWidth, ih = im.naturalHeight, hzPx = door.hz * ih;
    const s = Math.max(V.W / iw, V.GY / hzPx) * 1.02, w = iw * s, x0 = (V.W - w) / 2, top = V.GY - hzPx * s;
    cx.fillStyle = '#0c0810'; cx.fillRect(0, 0, V.W, V.H);
    cx.drawImage(im, 0, 0, iw, hzPx, x0, top, w, hzPx * s);
    const fb = ih - hzPx, need = V.H - V.GY + 2;
    if (fb * s >= need) cx.drawImage(im, 0, hzPx, iw, need / s, x0, V.GY, w, need);
    else cx.drawImage(im, 0, hzPx, iw, fb * 0.92, x0, V.GY, w, need);
    const g = cx.createLinearGradient(0, 0, 0, V.H); // readability: darker top and bottom
    g.addColorStop(0, 'rgba(0,0,0,.35)'); g.addColorStop(0.25, 'rgba(0,0,0,0)'); g.addColorStop(0.85, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.45)');
    cx.fillStyle = g; cx.fillRect(0, 0, V.W, V.H);
  }

  function spriteKey(u, a, now) {
    const busy = now < a.t0 + a.dur;
    if (u.side === 'h') {
      const b = u.sprite;
      if (!alive(u)) { const f = heroFrames(b, 'ko'); return f[f.length - 1] || `${b}_ko`; }
      const act = busy ? (a.pose === 'atk' ? 'atk' : a.pose === 'cast' ? 'cast' : a.pose === 'hit' ? 'hit' : 'idle') : 'idle';
      const fr = heroFrames(b, act);
      if (!fr.length) return b;
      if (act === 'idle') return fr[reduce ? 0 : pingPong(fr.length, now + a.seed * 300, 190)];
      const k = Math.min(fr.length - 1, Math.floor((now - a.t0) / Math.max(1, a.dur) * fr.length));
      return fr[k];
    }
    const id = u.sprite, has = k => !!POSEM[k];
    if (!alive(u)) return has(`${id}_ko`) ? `${id}_ko` : id;
    if (busy && a.pose === 'blast' && has(`${id}_blast`)) return `${id}_blast`;
    if (busy && a.pose === 'atk' && has(`${id}_atk`)) return `${id}_atk`;
    if (busy && a.pose === 'hit' && has(`${id}_hit`)) return `${id}_hit`;
    if (u.charge && has(`${id}_prep`)) return `${id}_prep`;
    if (u.boss && u.phase === 2 && has(`${id}_rage`)) return `${id}_rage`;
    return id;
  }

  function drawUnit(u, now) {
    const a = st(u), p = pos(u);
    if (!alive(u) && u.side === 'f') { if (!a.deadT) a.deadT = now; if (now - a.deadT > 900) return; }
    else a.deadT = 0;
    let alpha = a.alpha * (u.side === 'f' && !alive(u) ? Math.max(0, 1 - (now - a.deadT) / 900) : !alive(u) ? 0.7 : 1);
    if (u.summoned && a.alpha < 1) a.alpha = Math.min(1, (now - a.spawn) / 500);
    if (alpha <= 0) return;
    const bob = reduce || !alive(u) ? 0 : Math.sin(now / 520 + a.seed) * 1.4;
    // shadow
    cx.save(); cx.globalAlpha = 0.35 * alpha; cx.fillStyle = '#000';
    cx.beginPath(); cx.ellipse(p.x, p.y, p.h * 0.28, p.h * 0.065, 0, 0, Math.PI * 2); cx.fill(); cx.restore();
    // ground rings: acting unit (gold), charging foe (red), elite aura
    if (alive(u)) {
      if (u.charge) { const k = 0.5 + 0.5 * Math.sin(now / 120); cx.save(); cx.strokeStyle = `rgba(255,60,40,${0.55 + 0.4 * k})`; cx.lineWidth = 3; cx.beginPath(); cx.ellipse(p.x, p.y, p.h * (0.36 + 0.04 * k), p.h * 0.1, 0, 0, Math.PI * 2); cx.stroke(); cx.restore(); }
      else if (V.actor === u.uid) { cx.save(); cx.strokeStyle = 'rgba(255,214,110,.85)'; cx.lineWidth = 2.5; cx.beginPath(); cx.ellipse(p.x, p.y, p.h * 0.32, p.h * 0.08, 0, 0, Math.PI * 2); cx.stroke(); cx.restore(); }
      if (u.affCol) { const g = cx.createRadialGradient(p.x, p.y - p.h * 0.45, 4, p.x, p.y - p.h * 0.45, p.h * 0.6); g.addColorStop(0, `rgba(${u.affCol},.35)`); g.addColorStop(1, `rgba(${u.affCol},0)`); cx.fillStyle = g; cx.fillRect(p.x - p.h * 0.6, p.y - p.h * 1.05, p.h * 1.2, p.h * 1.1); }
    }
    const key = spriteKey(u, a, now), y = p.y - p.fly + bob;
    const ok = drawSprite(cx, key, p.x, y, p.h, { alpha }) || drawSprite(cx, u.sprite, p.x, y, p.h, { alpha });
    if (!ok) { cx.fillStyle = u.side === 'h' ? '#4f86c6' : '#a33'; cx.fillRect(p.x - p.h * 0.2, y - p.h, p.h * 0.4, p.h); }
    if (a.flash > now) { // hit flash: redraw additively
      cx.save(); cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = 0.55 * (a.flash - now) / 140;
      drawSprite(cx, key, p.x, y, p.h) || drawSprite(cx, u.sprite, p.x, y, p.h); cx.restore();
    }
    if (u.side === 'f' && alive(u) && !u.boss) drawFoeBar(u, p, y);
    if (u.side === 'h' && alive(u)) drawStatus(u, p.x, y - p.h * 1.02 - 6);
  }

  function rr(x, y, w, h, r) { cx.beginPath(); cx.moveTo(x + r, y); cx.arcTo(x + w, y, x + w, y + h, r); cx.arcTo(x + w, y + h, x, y + h, r); cx.arcTo(x, y + h, x, y, r); cx.arcTo(x, y, x + w, y, r); cx.closePath(); }

  function drawFoeBar(u, p, y) {
    const w = Math.max(64, Math.min(96, p.h * 0.62)), x = p.x - w / 2, by = y - p.h * (POSEM[u.sprite] ? POSEM[u.sprite][0] : 1) - 16;
    if (u.elite) { // v0.6: only the affix (the sprite already says which monster), so names never overlap
      const n = u.affName || ''; cx.font = '800 14px Nunito, sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'alphabetic'; cx.strokeStyle = 'rgba(0,0,0,.9)'; cx.lineWidth = 4;
      cx.fillStyle = u.affCol ? `rgb(${u.affCol})` : '#ffd36e'; cx.strokeText(n, p.x, by - 6); cx.fillText(n, p.x, by - 6); }
    cx.fillStyle = 'rgba(0,0,0,.7)'; rr(x - 2, by - 2, w + 4, 12, 5); cx.fill();
    cx.fillStyle = '#d6352b'; rr(x, by, w * u.hp / u.hpMax, 8, 4); cx.fill();
    if (u.shield > 0) { cx.fillStyle = 'rgba(140,200,255,.9)'; rr(x, by, w * Math.min(1, u.shield / u.hpMax), 4, 2); cx.fill(); }
    drawStatus(u, p.x, by + 24);
  }

  function drawStatus(u, x, y) {
    const items = [];
    if (u.charge) items.push({ k: 'warn' });
    for (const [k, key] of Object.entries(STATUS_IMG)) if (u.st[k]) items.push({ k, key, n: k === 'poison' && u.st.poison ? u.st.poison.stacks : 0 });
    if (u.st.taunt) items.push({ k: 'taunt' });
    if (u.st.shadow) items.push({ k: 'shadow', n: u.st.shadow });
    if (!items.length) return;
    const S = 22, gap = 3, w = items.length * S + (items.length - 1) * gap;
    let px = x - w / 2;
    for (const it of items) {
      const cxp = px + S / 2, cyp = y - S / 2 - 2, im = it.key && getImage(it.key);
      cx.save();
      if (im) cx.drawImage(im, px, cyp - S / 2, S, S);
      else if (it.k === 'warn') { cx.fillStyle = '#d4231b'; cx.beginPath(); cx.arc(cxp, cyp, S / 2, 0, Math.PI * 2); cx.fill(); cx.strokeStyle = '#ffd36e'; cx.lineWidth = 2; cx.stroke(); cx.fillStyle = '#fff'; cx.font = '900 16px Nunito, sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText('!', cxp, cyp + 1); }
      else if (it.k === 'taunt') { cx.fillStyle = '#7fa6d8'; cx.strokeStyle = '#1b2433'; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(cxp, cyp - 10); cx.lineTo(cxp + 9, cyp - 6); cx.lineTo(cxp + 7, cyp + 4); cx.lineTo(cxp, cyp + 10); cx.lineTo(cxp - 7, cyp + 4); cx.lineTo(cxp - 9, cyp - 6); cx.closePath(); cx.fill(); cx.stroke(); }
      else if (it.k === 'shadow') { cx.fillStyle = '#2a1840'; cx.strokeStyle = '#b38cff'; cx.lineWidth = 2; cx.beginPath(); cx.arc(cxp, cyp, S / 2 - 1, 0, Math.PI * 2); cx.fill(); cx.stroke(); }
      if (it.n > 1 || it.k === 'shadow') { // stack count badge
        cx.font = '900 12px Nunito, sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.lineWidth = 3; cx.strokeStyle = '#000'; cx.fillStyle = '#fff';
        const bx = it.k === 'shadow' ? cxp : px + S - 3, by = it.k === 'shadow' ? cyp + 1 : cyp + S / 2 - 4;
        cx.strokeText(String(it.n), bx, by); cx.fillText(String(it.n), bx, by);
      }
      cx.restore();
      px += S + gap;
    }
  }

  function drawBossBar(now) {
    const b = B.units.find(u => u.boss && alive(u));
    if (!b) return;
    const w = Math.min(320, V.W - 32), x = (V.W - w) / 2, y = 62;
    cx.font = '20px "Lilita One", sans-serif'; cx.textAlign = 'center'; cx.fillStyle = '#ffe7a3'; cx.strokeStyle = '#000'; cx.lineWidth = 4;
    cx.strokeText(b.name, V.W / 2, y + 16); cx.fillText(b.name, V.W / 2, y + 16);
    cx.fillStyle = 'rgba(0,0,0,.75)'; rr(x - 3, y + 24, w + 6, 18, 8); cx.fill();
    cx.fillStyle = b.charge ? `rgb(${200 + 55 * Math.sin(now / 100)},40,30)` : '#c02a22'; rr(x, y + 27, w * b.hp / b.hpMax, 12, 6); cx.fill();
    if (b.wall > 0) { cx.fillStyle = '#e8dcc0'; rr(x, y + 27, w * Math.min(1, b.wall / b.hpMax), 5, 3); cx.fill(); }
    cx.font = '700 14px Nunito, sans-serif'; cx.fillStyle = '#fff'; cx.fillText(`${b.hp} / ${b.hpMax}${b.wall > 0 ? `  · protection ${Math.round(b.wall)}` : ''}`, V.W / 2, y + 60);
  }

  function drawFx(now) {
    V.fx = V.fx.filter(f => now < f.t0 + f.dur);
    cx.save(); cx.globalCompositeOperation = 'lighter';
    for (const f of V.fx) {
      const k = (now - f.t0) / f.dur;
      if (f.t === 'strip') {
        const im = getImage(f.key); if (!im) continue;
        const fw = im.naturalWidth / 6, fh = im.naturalHeight, i = Math.min(5, Math.floor(k * 6)), w = f.size, hh = w * fh / fw;
        cx.save(); cx.translate(f.x, f.y); if (f.flip) cx.scale(-1, 1);
        cx.drawImage(im, i * fw, 0, fw, fh, -w / 2, -hh / 2, w, hh); cx.restore();
      } else if (f.t === 'ring') {
        cx.strokeStyle = `rgba(${f.col},${1 - k})`; cx.lineWidth = 4 * (1 - k) + 1;
        cx.beginPath(); cx.ellipse(f.x, f.y, f.r * (0.4 + k), f.r * (0.4 + k) * 0.35, 0, 0, Math.PI * 2); cx.stroke();
      } else if (f.t === 'spark') {
        for (const s of f.parts) { cx.fillStyle = `rgba(${f.col},${1 - k})`; cx.beginPath(); cx.arc(f.x + s.vx * k * 60, f.y + s.vy * k * 60 + k * k * 30, s.r * (1 - k * 0.6), 0, Math.PI * 2); cx.fill(); }
      }
    }
    cx.restore();
  }

  function drawTexts(now) {
    V.texts = V.texts.filter(t => now < t.t0 + t.dur);
    cx.textAlign = 'center';
    for (const t of V.texts) {
      const k = (now - t.t0) / t.dur, pop = k < 0.15 ? 0.6 + k / 0.15 * 0.5 : 1.1 - Math.min(0.1, (k - 0.15));
      const size = (t.big ? 30 : 22) * pop;
      cx.font = `${size}px "Lilita One", sans-serif`;
      cx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
      cx.lineWidth = 4; cx.strokeStyle = 'rgba(0,0,0,.9)';
      const y = t.y - k * 46;
      let tx = t.x;
      const im = t.ic && getImage(t.ic);
      if (im && !t.text) { const s = size * 1.5; cx.drawImage(im, t.x - s / 2, y - s * 0.8, s, s); cx.globalAlpha = 1; continue; } // icon-only pop
      if (im) { const tw = cx.measureText(t.text).width, s = size * 1.05; tx = t.x + s / 2 + 2; cx.drawImage(im, tx - tw / 2 - s - 3, y - s * 0.85, s, s); }
      cx.strokeText(t.text, tx, y); cx.fillStyle = t.col; cx.fillText(t.text, tx, y);
      cx.globalAlpha = 1;
    }
  }

  function frame() {
    if (!V.running) return;
    const now = performance.now();
    if (canvas.width !== Math.round(canvas.getBoundingClientRect().width * V.dpr)) layout();
    cx.setTransform(V.dpr, 0, 0, V.dpr, 0, 0);
    let sx = 0, sy = 0;
    if (V.shake && !reduce) { const k = (now - V.shake.t0) / V.shake.dur; if (k >= 1) V.shake = null; else { sx = (Math.random() - 0.5) * V.shake.amp * (1 - k); sy = (Math.random() - 0.5) * V.shake.amp * (1 - k); } }
    cx.translate(sx, sy);
    drawBg();
    const units = B.units.slice().sort((a, b) => pos(a).y - pos(b).y);
    for (const u of units) drawUnit(u, now);
    drawFx(now);
    drawTexts(now);
    drawBossBar(now);
    if (V.enraged) { // v0.6: red vignette that thickens with the enrage
      const k = Math.min(1, 0.25 + V.enraged * 0.05) * (0.85 + 0.15 * Math.sin(now / 260)) + (V.pulseT > now ? 0.25 * (V.pulseT - now) / 400 : 0);
      const g = cx.createRadialGradient(V.W / 2, V.H * 0.55, Math.min(V.W, V.H) * 0.35, V.W / 2, V.H * 0.55, Math.max(V.W, V.H) * 0.75);
      g.addColorStop(0, 'rgba(160,0,0,0)'); g.addColorStop(1, `rgba(170,10,0,${0.55 * k})`);
      cx.fillStyle = g; cx.fillRect(-10, -10, V.W + 20, V.H + 20);
    }
    if (V.flashAll > now) { cx.fillStyle = `rgba(255,240,200,${0.35 * (V.flashAll - now) / 250})`; cx.fillRect(-10, -10, V.W + 20, V.H + 20); }
    requestAnimationFrame(frame);
  }

  // ---- effects API used by the battle screen
  // v0.6: texts on the same unit stack upwards instead of overlapping; optional icon before the text
  V.text = (u, text, col, big, ic) => {
    const now = performance.now(), c = V.center(u);
    const recent = V.texts.filter(t => t.uid === u.uid && now - t.t0 < 520).length;
    V.texts.push({ uid: u.uid, x: c.x + (recent % 2 ? 14 : -14) * Math.min(1, recent), y: c.y - pos(u).h * 0.25 - recent * 26, text, col, big, ic, t0: now, dur: 900 + Math.min(3, recent) * 120 });
  };
  V.strip = (key, u, size, dur = 420) => { const c = V.center(u); V.fx.push({ t: 'strip', key: `fx_${key}`, x: c.x, y: c.y, size: size || pos(u).h * 1.25, flip: u.side === 'h', t0: performance.now(), dur: dur / V.speed }); };
  V.ring = (u, col = '255,214,110', r) => { const p = pos(u); V.fx.push({ t: 'ring', x: p.x, y: p.y, col, r: r || p.h * 0.6, t0: performance.now(), dur: 500 / V.speed }); };
  V.sparks = (u, col = '255,200,120', n = 10) => { const c = V.center(u); V.fx.push({ t: 'spark', x: c.x, y: c.y, col, parts: Array.from({ length: reduce ? 3 : n }, () => ({ vx: (Math.random() - 0.5) * 2, vy: -Math.random() * 1.6, r: 2 + Math.random() * 3 })), t0: performance.now(), dur: 520 / V.speed }); };
  V.pose = (u, pose, ms) => { const a = st(u); a.pose = pose; a.t0 = performance.now(); a.dur = ms / V.speed; };
  V.flash = u => { st(u).flash = performance.now() + 140; };
  V.doShake = (amp = 8, dur = 300) => { V.shake = { amp, dur, t0: performance.now() }; };
  V.screenFlash = () => { V.flashAll = performance.now() + 250; };
  V.pulse = () => { V.pulseT = performance.now() + 400; };
  V.tween = (u, to, ms) => new Promise(res => {
    const a = st(u), from = { ox: a.ox, oy: a.oy }, t0 = performance.now(), dur = Math.max(1, ms / V.speed);
    const tick = () => { const k = Math.min(1, (performance.now() - t0) / dur), e = 1 - Math.pow(1 - k, 3); a.ox = from.ox + (to.ox - from.ox) * e; a.oy = from.oy + (to.oy - from.oy) * e; if (k < 1 && V.running) requestAnimationFrame(tick); else res(); };
    tick();
  });
  V.stop = () => { V.running = false; removeEventListener('resize', layout); };

  layout();
  addEventListener('resize', layout);
  requestAnimationFrame(frame);
  return V;
}
