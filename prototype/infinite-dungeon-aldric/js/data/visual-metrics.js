// Game-owned visuals layered over generated Dragonbound metrics.
import { POSEM as BASE_POSEM, ANIM as BASE_ANIM } from './sprite-metrics.js';
export const POSEM = { ...BASE_POSEM };
export const ANIM = { ...BASE_ANIM, ald: { idle: 6, atk: 1, cast: 1, hit: 1, ko: 1 } };
for (const key of ['ald', 'ald_win', 'ald_hit', 'ald_ko', ...Object.entries(ANIM.ald).flatMap(([act, n]) => Array.from({length:n}, (_, i) => `aldA_${act}${i}`))]) POSEM[key] = [1.02, 0.55];
