// Versioned save. One key for the game, one for a backup copy, both prefixed
// "sqid." so the other games of the site are never touched.
// Reading never throws: a broken save is moved aside and the game starts fresh
// with a message. Writing never throws: failure returns false (the UI warns).
import { newMeta, sanitizeMeta } from '../run/meta.js';
import { RUN_VERSION, migrateRun } from '../run/run.js';

export const SAVE_KEY = 'sqid.aldric071.save.v1';
export const BACKUP_KEY = 'sqid.aldric071.save.bak';
export const SAVE_VERSION = 1;

const fresh = () => ({ v: SAVE_VERSION, meta: newMeta(), run: null });

function validRun(r) {
  migrateRun(r);
  return r && typeof r === 'object' && r.v === RUN_VERSION && Number.isFinite(r.seed) && Number.isFinite(r.floor)
    && Array.isArray(r.team) && r.team.length === 3 && typeof r.phase === 'string';
}

function parse(raw) {
  const d = JSON.parse(raw);
  if (!d || typeof d !== 'object') throw new Error('format');
  if (d.v !== SAVE_VERSION) throw new Error(`version ${d.v}`);
  return { v: SAVE_VERSION, meta: sanitizeMeta(d.meta), run: validRun(d.run) && d.run.phase !== 'over' ? d.run : null };
}

/** Returns { data, warning } — warning is a sentence for the player, or ''. */
export function loadSave(storage = globalThis.localStorage) {
  let raw = null;
  try { raw = storage && storage.getItem(SAVE_KEY); } catch { return { data: fresh(), warning: 'La sauvegarde est inaccessible (navigation privée ?). La partie ne sera pas conservée.' }; }
  if (!raw) return { data: fresh(), warning: '' };
  try { return { data: parse(raw), warning: '' }; } catch {
    // keep the broken save aside, try the backup
    try { storage.setItem(`${SAVE_KEY}.broken`, raw); } catch { /* ignore */ }
    try {
      const bak = storage.getItem(BACKUP_KEY);
      if (bak) return { data: parse(bak), warning: 'La sauvegarde était abîmée : la copie de secours a été restaurée.' };
    } catch { /* fall through */ }
    return { data: fresh(), warning: 'La sauvegarde était illisible : une nouvelle partie commence. L’ancienne a été mise de côté.' };
  }
}

/** Writes the save, and the previous good one as backup. Returns true on success. */
export function writeSave(data, storage = globalThis.localStorage) {
  try {
    const json = JSON.stringify({ v: SAVE_VERSION, meta: data.meta, run: data.run });
    const prev = storage.getItem(SAVE_KEY);
    if (prev) storage.setItem(BACKUP_KEY, prev);
    storage.setItem(SAVE_KEY, json);
    return true;
  } catch {
    return false;
  }
}

/** Export/import code for the debug panel. */
export const exportCode = data => btoa(unescape(encodeURIComponent(JSON.stringify({ v: SAVE_VERSION, meta: data.meta, run: data.run }))));
export function importCode(code) {
  try { return parse(decodeURIComponent(escape(atob(code.trim())))); } catch { return null; }
}
