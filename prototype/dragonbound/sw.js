// Offline support: the app shell is cached on first visit, fonts as they load.
const CACHE = 'dragonbound-v10';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'img/a0amulette.webp', 'img/a0armure.webp', 'img/a0bottes.webp', 'img/a0casque.webp', 'img/a1amulette.webp', 'img/a1armure.webp', 'img/a1bottes.webp', 'img/a1casque.webp', 'img/a2amulette.webp', 'img/a2armure.webp', 'img/a2bottes.webp', 'img/a2casque.webp', 'img/archer-face.webp', 'img/archer.webp', 'img/bat.webp', 'img/bear.webp', 'img/bossBone.webp', 'img/bossDragon.webp', 'img/bossHag.webp', 'img/bossVoid.webp', 'img/bossWitch.webp', 'img/demon.webp', 'img/frog.webp', 'img/garg.webp', 'img/goblin.webp', 'img/golem.webp', 'img/harpy.webp', 'img/hero-face.webp', 'img/hero.webp', 'img/imp.webp', 'img/knight.webp', 'img/mage-face.webp', 'img/mage.webp', 'img/rat.webp', 'img/scorp.webp', 'img/shroom.webp', 'img/skel.webp', 'img/slime.webp', 'img/snake.webp', 'img/spFrost.webp', 'img/spHeal.webp', 'img/spRain.webp', 'img/spRoar.webp', 'img/spVenom.webp', 'img/spWhirl.webp', 'img/spider.webp', 'img/spirit.webp', 'img/vine.webp', 'img/wCrossbow.webp', 'img/wElvenbow.webp', 'img/wHammer.webp', 'img/wScepter.webp', 'img/wShortbow.webp', 'img/wStaff.webp', 'img/wSword.webp', 'img/warlock.webp', 'img/wisp.webp', 'img/wolf.webp', 'img/yeti.webp', 'img/zombie.webp', 'audio/theme.mp3'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  const isOwn = url.origin === self.location.origin;
  if (!isOwn && !isFont) return;

  // Pages: network first so updates arrive, cache when offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put('index.html', copy));
        return res;
      }).catch(() => caches.match('index.html'))
    );
    return;
  }

  // Everything else: cache first.
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok || res.type === 'opaque') {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }))
  );
});
