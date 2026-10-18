// Offline support: the app shell is cached on first visit, fonts as they load.
const CACHE = 'dragonbound-v20';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'img/a0amulette.webp', 'img/a0armure.webp', 'img/a0bottes.webp', 'img/a0casque.webp', 'img/a1amulette.webp', 'img/a1armure.webp', 'img/a1bottes.webp', 'img/a1casque.webp', 'img/a2amulette.webp', 'img/a2armure.webp', 'img/a2bottes.webp', 'img/a2casque.webp', 'img/a3amulette.webp', 'img/a3armure.webp', 'img/a3bottes.webp', 'img/a3casque.webp', 'img/a4amulette.webp', 'img/a4armure.webp', 'img/a4bottes.webp', 'img/a4casque.webp', 'img/a5amulette.webp', 'img/a5armure.webp', 'img/a5bottes.webp', 'img/a5casque.webp', 'img/archer-face.webp', 'img/archer.webp', 'img/armor.webp', 'img/banshee.webp', 'img/bat.webp', 'img/bear.webp', 'img/bg0_0.webp', 'img/bg0_1.webp', 'img/bg0_2.webp', 'img/bg0_3.webp', 'img/bg0_4.webp', 'img/bg1_0.webp', 'img/bg1_1.webp', 'img/bg1_2.webp', 'img/bg1_3.webp', 'img/bg1_4.webp', 'img/bg2_0.webp', 'img/bg2_1.webp', 'img/bg2_2.webp', 'img/bg2_3.webp', 'img/bg2_4.webp', 'img/bg3_0.webp', 'img/bg3_1.webp', 'img/bg3_2.webp', 'img/bg3_3.webp', 'img/bg3_4.webp', 'img/bg4_0.webp', 'img/bg4_1.webp', 'img/bg4_2.webp', 'img/bg4_3.webp', 'img/bg4_4.webp', 'img/bg5_0.webp', 'img/bg5_1.webp', 'img/bg5_2.webp', 'img/bg5_3.webp', 'img/bg5_4.webp', 'img/bg6_0.webp', 'img/bg6_1.webp', 'img/bg6_2.webp', 'img/bg6_3.webp', 'img/bg6_4.webp', 'img/bg7_0.webp', 'img/bg7_1.webp', 'img/bg7_2.webp', 'img/bg7_3.webp', 'img/bg7_4.webp', 'img/bossBone.webp', 'img/bossDragon.webp', 'img/bossHag.webp', 'img/bossLich.webp', 'img/bossQueen.webp', 'img/bossVamp.webp', 'img/bossVoid.webp', 'img/bossWitch.webp', 'img/demon.webp', 'img/frog.webp', 'img/garg.webp', 'img/ghoul.webp', 'img/goblin.webp', 'img/golem.webp', 'img/harpy.webp', 'img/hero-face.webp', 'img/hero.webp', 'img/imp.webp', 'img/intro-poster.jpg', 'img/knight.webp', 'img/lich.webp', 'img/logo.webp', 'img/m_bone.webp', 'img/m_ember.webp', 'img/m_frost.webp', 'img/m_ooze.webp', 'img/m_sap.webp', 'img/m_shard.webp', 'img/m_t0.webp', 'img/m_t1.webp', 'img/m_t2.webp', 'img/m_t3.webp', 'img/m_t4.webp', 'img/m_t5.webp', 'img/mage-face.webp', 'img/mage.webp', 'img/necro.webp', 'img/paladin.webp', 'img/rat.webp', 'img/rogue.webp', 'img/scorp.webp', 'img/shroom.webp', 'img/skel.webp', 'img/slime.webp', 'img/snake.webp', 'img/spBlades.webp', 'img/spFrost.webp', 'img/spHeal.webp', 'img/spRain.webp', 'img/spRoar.webp', 'img/spShadow.webp', 'img/spShield.webp', 'img/spSmite.webp', 'img/spVenom.webp', 'img/spWhirl.webp', 'img/spider.webp', 'img/spirit.webp', 'img/uiChest1.webp', 'img/uiChest2.webp', 'img/uiChest3.webp', 'img/uiEnergy.webp', 'img/uiGold.webp', 'img/uiMats.webp', 'img/uiPotion.webp', 'img/vampire.webp', 'img/vbat.webp', 'img/vine.webp', 'img/wAxe.webp', 'img/wCrossbow.webp', 'img/wElvenbow.webp', 'img/wHammer.webp', 'img/wScepter.webp', 'img/wShortbow.webp', 'img/wStaff.webp', 'img/wSword.webp', 'img/wTome.webp', 'img/warlock.webp', 'img/werewolf.webp', 'img/wisp.webp', 'img/wm0.webp', 'img/wm1.webp', 'img/wm2.webp', 'img/wm3.webp', 'img/wm4.webp', 'img/wm5.webp', 'img/wm6.webp', 'img/wm7.webp', 'img/wolf.webp', 'img/worldmap.webp', 'img/yeti.webp', 'img/zombie.webp', 'audio/boss1.mp3', 'audio/boss2.mp3', 'audio/fight1.mp3', 'audio/fight2.mp3', 'audio/intro.mp4', 'audio/map1.mp3', 'audio/map2.mp3'];

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
