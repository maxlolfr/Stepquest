// Entry point.
import { initTitle } from './ui/screens/title.js';
import { startApp, app } from './ui/app.js';
import { missingAssets } from './ui/loader.js';
import { GAME } from './config.js';

const debug = /[?&]debug\b/.test(location.search);

// Hook for automated tests and the ?debug panel.
window.__sqid = { version: GAME.version, missingAssets, ready: false, app };

initTitle()
  .then(() => startApp())
  .then(async () => {
    if (debug) (await import('./ui/debug.js')).mountDebug();
    window.__sqid.ready = true;
  })
  .catch(err => { console.error(err); window.__sqid.error = String(err && err.stack || err); });
