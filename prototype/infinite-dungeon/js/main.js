// Entry point. Step 1 only has the title screen; later screens plug in here.
import { showTitle } from './ui/screens/title.js';
import { missingAssets } from './ui/loader.js';
import { GAME } from './config.js';

const debug = /[?&]debug\b/.test(location.search);

// Hook for automated tests and the ?debug panel.
window.__sqid = { version: GAME.version, missingAssets, ready: false };

showTitle()
  .then(() => { window.__sqid.ready = true; })
  .catch(err => { console.error(err); window.__sqid.error = String(err); })
  .finally(() => {
    if (!debug) return;
    const box = document.getElementById('debug');
    const paint = () => {
      const miss = missingAssets();
      box.textContent = `debug · v${GAME.version}\n${innerWidth}×${innerHeight} @${devicePixelRatio}x\n` +
        (miss.length ? `Fichiers manquants (${miss.length}) :\n${miss.join('\n')}` : 'Tous les fichiers chargés.');
    };
    box.hidden = false; paint(); setInterval(paint, 2000);
  });
