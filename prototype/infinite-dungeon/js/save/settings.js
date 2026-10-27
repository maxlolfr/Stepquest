// Player settings (sound only for now), stored apart from game progress.
// Every key of this game starts with "sqid." so it never touches the saves of
// the other games on the same site (dragonbound2.v2, dragonbound.v1, stepquest.v1).
// Reading or writing may fail (private browsing, full storage): the game keeps
// running with defaults in that case.
export const SETTINGS_KEY = 'sqid.settings.v1';
const DEFAULTS = { v: 1, muted: false };

export function loadSettings(storage = globalThis.localStorage) {
  try {
    const raw = storage && storage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULTS };
    const s = JSON.parse(raw);
    if (!s || typeof s !== 'object' || s.v !== 1) return { ...DEFAULTS };
    return { ...DEFAULTS, muted: !!s.muted };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(s, storage = globalThis.localStorage) {
  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify({ v: 1, muted: !!s.muted }));
    return true;
  } catch {
    return false;
  }
}
