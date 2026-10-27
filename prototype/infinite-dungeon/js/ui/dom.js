// Tiny DOM helpers (no framework).
import { IMAGES } from './assets.js';

/** h('div.card.big', { onclick }, child, 'text', …) */
export function h(sel, attrs, ...kids) {
  const [tag, ...cls] = sel.split('.');
  const el = document.createElement(tag || 'div');
  if (cls.length) el.className = cls.join(' ');
  if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) { kids.unshift(attrs); attrs = null; }
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(Infinity)) if (c != null && c !== false) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return el;
}

export const img = (key, cls = '') => (IMAGES[key] ? h('img' + (cls ? '.' + cls : ''), { src: IMAGES[key], alt: '', draggable: 'false' }) : null);

/** Icon: image when available, emoji otherwise. */
export const icon = (key, emoji, cls = 'ic') => img(key, cls) || h('span.' + cls + '.emoji', emoji || '');

let toastTimer = 0;
export function toast(text, ms = 2600) {
  let t = document.getElementById('toast');
  if (!t) { t = h('div.toast'); t.id = 'toast'; document.body.append(t); }
  t.textContent = text; t.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), ms);
}

export const bar = (frac, cls = 'hp') => h('div.bar.' + cls, h('i', { style: { width: `${Math.max(0, Math.min(1, frac)) * 100}%` } }));
