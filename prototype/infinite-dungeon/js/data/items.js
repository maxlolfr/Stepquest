// Equipment, relics, consumables and events. Gear names, icons and relic powers
// come from Dragonbound II 1.9.11 (WPN, ARMN, JEWN, PW, ITEMS); rules are simplified:
// 3 slots, 3 rarities, one item per slot and hero, equipped as soon as chosen.

export const RARITY = [
  { n: 'Commun', col: '#b8b0a2', m: 1, img: 1 },
  { n: 'Rare', col: '#4f9bff', m: 1.45, img: 2 },
  { n: 'Épique', col: '#c47dff', m: 1.95, img: 3 },
];

export const WEAPONS = {
  aldric: ['Hachette', 'Épée ailée', 'Hache runique'],
  selena: ['Fléau', 'Masse ailée', 'Fléau béni'],
  orin: ['Bâton d’améthyste', 'Sceptre de saphir', 'Sceptre de rubis'],
  lyra: ['Arc recourbé', 'Arc composite', 'Arbalète légère'],
  nyx: ['Dagues courbes', 'Lames du serpent', 'Cimeterres runiques'],
};
// zone index (0..2) -> armour / jewel name and icon index (ga_N / gj_N)
export const ARMORS = [['Armure d’os', 0], ['Armure des marais', 3], ['Plastron du nécromancien', 6]];
export const JEWELS = [['Amulette des morts', 0], ['Œil du marais', 3], ['Âme de liche', 6]];

export const SLOT_NAMES = { w: 'Arme', a: 'Armure', j: 'Bijou' };
export const STAT_NAMES = { atk: ['⚔️', 'Attaque'], mag: ['✨', 'Magie'], hp: ['❤️', 'Vie'], def: ['🛡️', 'Défense'], crit: ['🎯', 'Critique'] };

// art = original icon of this game (img/relic_*.webp); missing art falls back to the emoji.
// tag = build style; two relics of the same style activate its synergy (SYNERGIES).
export const RELICS = {
  vampire:  { tag: 'lumiere', name: 'Soif de sang', ic: '🩸', img: 'uiGem', art: 'relic_vampire', desc: 'Les héros récupèrent 10 % des dégâts qu’ils infligent.' },
  colere:   { tag: 'arcanes', name: 'Colère', ic: '🌟', img: 'uiTrophy', art: 'relic_colere', desc: 'Chaque combat commence avec les jauges d’ultime à 30 %.' },
  clarte:   { tag: 'arcanes', name: 'Clarté', ic: '🔮', img: 'uiScroll', art: 'relic_clarte', desc: 'Les compétences sont prêtes dès le début de chaque combat.' },
  rempart:  { tag: 'riposte', name: 'Rempart', ic: '💠', img: 'uiChest1', art: 'relic_rempart', desc: 'Chaque héros commence les combats avec un bouclier de 15 % de sa vie.' },
  antidote: { tag: '', name: 'Antidote', ic: '🧪', img: 'uiPotion', art: 'relic_antidote', desc: 'L’équipe est immunisée au poison.' },
  ignifuge: { tag: '', name: 'Ignifuge', ic: '🧯', img: 'uiPotion', art: 'relic_ignifuge', desc: 'L’équipe est immunisée à la brûlure.' },
  bourreau: { tag: 'crit', name: 'Bourreau', ic: '🪓', img: 'uiSkull', art: 'relic_bourreau', desc: '+30 % de dégâts sur les ennemis sous 35 % de vie.' },
  venin:    { tag: 'fleau', name: 'Lame venimeuse', ic: '☠️', img: 'uiSkull', art: 'relic_venin', desc: '+35 % de dégâts sur les ennemis empoisonnés.' },
  chasse:   { tag: 'crit', name: 'Œil du chasseur', ic: '🎯', img: 'uiDice', art: 'relic_chasse', desc: '+30 % de dégâts sur les cibles marquées 🎯.' },
  bourse:   { tag: '', name: 'Bourse du pillard', ic: '💰', img: 'uiGold', art: 'relic_bourse', desc: '+30 % d’or gagné.' },
  braises:  { tag: 'lumiere', name: 'Braises du camp', ic: '🔥', img: 'uiChest2', art: 'relic_braises', desc: 'Les repos soignent 50 % de plus.' },
  sceau:    { tag: 'riposte', name: 'Sceau du gardien', ic: '🛡️', img: 'uiChest3', art: 'relic_sceau', desc: 'La Garde peut être utilisée deux fois par combat.' },
  // v0.4: relics that change how a run plays
  riposte:  { tag: 'riposte', name: 'Écu à pointes', ic: '🔰', img: 'uiChest1', art: 'relic_riposte', desc: 'Sous la Garde ou derrière un bouclier 💠, un héros frappé renvoie 40 % du coup à l’attaquant.' },
  pierre:   { tag: 'riposte', name: 'Cœur de pierre', ic: '🪨', img: 'uiChest3', art: 'relic_pierre', desc: 'Sous 35 % de vie, un héros subit 30 % de dégâts en moins et frappe 30 % plus fort.' },
  brasier:  { tag: 'fleau', name: 'Brasier toxique', ic: '🧪', img: 'uiSkull', art: 'relic_brasier', desc: 'Un ennemi à la fois empoisonné ☠️ et brûlé 🔥 subit le double de dégâts de ces deux effets.' },
  peste:    { tag: 'fleau', name: 'Peste', ic: '🦠', img: 'uiSkull', art: 'relic_peste', desc: 'Quand un ennemi empoisonné meurt, son poison se propage à tous les autres ennemis.' },
  prisme:   { tag: 'arcanes', name: 'Prisme', ic: '🔷', img: 'uiGem', art: 'relic_prisme', desc: 'Frapper une faiblesse fait ×2 dégâts au lieu de ×1,5.' },
  tempete:  { tag: 'arcanes', name: 'Orbe des tempêtes', ic: '🌩️', img: 'uiGem', art: 'relic_tempete', desc: 'Chaque ultime remplit de 25 % la jauge des autres héros.' },
  assassin: { tag: 'crit', name: 'Œil de l’assassin', ic: '👁️', img: 'uiSkull', art: 'relic_assassin', desc: 'Les coups critiques font ×2 dégâts au lieu de ×1,6.' },
  duel:     { tag: 'crit', name: 'Lame de duel', ic: '🗡️', img: 'uiDice', art: 'relic_duel', desc: 'La première attaque de chaque héros dans un combat est toujours critique.' },
  calice:   { tag: 'lumiere', name: 'Calice de lumière', ic: '🏆', img: 'uiTrophy', art: 'relic_calice', desc: 'Les soins sont 30 % plus forts et le surplus devient un bouclier plus épais.' },
  etoile:   { tag: 'lumiere', name: 'Étoile du matin', ic: '⭐', img: 'uiTrophy', art: 'relic_etoile', desc: 'Une fois par combat, le premier héros qui tombe se relève avec 40 % de vie.' },
};

// Build styles: owning 2 relics of the same style activates its bonus.
export const SYNERGIES = {
  crit:    { name: 'Frénésie', ic: '⚔️', art: 'syn_crit', desc: '+10 % de chance de critique pour toute l’équipe.' },
  riposte: { name: 'Bastion', ic: '🛡️', art: 'syn_riposte', desc: 'La Garde bloque 70 % des dégâts au lieu de 50 %, et chaque héros commence avec un bouclier de 10 %.' },
  fleau:   { name: 'Fléau', ic: '☠️', art: 'syn_fleau', desc: 'Le poison et la brûlure infligent 50 % de dégâts en plus aux ennemis.' },
  arcanes: { name: 'Arcanes', ic: '✨', art: 'syn_arcanes', desc: 'Les jauges d’ultime se remplissent 30 % plus vite.' },
  lumiere: { name: 'Lumière', ic: '☀️', art: 'syn_lumiere', desc: 'Les soins sont 25 % plus forts, et l’équipe récupère 10 % de vie de plus après chaque victoire.' },
};
export const SYN_NEED = 2;
export const synergyCount = (keys, tag) => keys.filter(k => RELICS[k] && RELICS[k].tag === tag).length;
/** Active synergy keys for a list of relic keys. */
export const activeSynergies = keys => Object.keys(SYNERGIES).filter(t => synergyCount(keys, t) >= SYN_NEED);

export const CONSUMABLES = {
  pot: { name: 'Potion', ic: '🧪', img: 'uiPotion', price: 30, desc: 'Rend 50 % de vie à l’allié le plus blessé.' },
  fea: { name: 'Plume de phénix', ic: '🪶', img: 'uiPotion', price: 70, desc: 'Ramène un allié tombé avec 40 % de sa vie.' },
};

// Special events: each choice returns an outcome resolved in run.js.
export const EVENTS = [
  { id: 'shrine', art: 'event_shrine', title: 'Autel oublié', text: 'Un autel couvert de runes brille faiblement. Une coupe d’or y attend une offrande.',
    choices: [
      { label: 'Offrir 40 or', cost: { gold: 40 }, effect: { relic: true }, hint: 'Une relique au hasard' },
      { label: 'Prier sans rien donner', effect: { healPct: 0.25 }, hint: 'Soigne l’équipe de 25 %' },
    ] },
  { id: 'chest', art: 'event_chest', title: 'Coffre piégé', text: 'Un coffre de fer, entrouvert. Un mécanisme grince à l’intérieur.',
    choices: [
      { label: 'Forcer le coffre', effect: { gamble: { win: { gold: 90 }, lose: { dmgPct: 0.2 }, p: 0.6 } }, hint: '60 % : 90 or · sinon −20 % de vie' },
      { label: 'Passer son chemin', effect: {}, hint: 'Rien ne se passe' },
    ] },
  { id: 'spring', art: 'event_spring', title: 'Source pure', text: 'Une source claire coule entre les pierres. L’air y est étrangement calme.',
    choices: [
      { label: 'Boire', effect: { healPct: 0.4 }, hint: 'Soigne l’équipe de 40 %' },
      { label: 'Remplir une fiole', effect: { item: 'pot' }, hint: '+1 potion' },
    ] },
  { id: 'trainer', art: 'event_trainer', title: 'Fantôme d’un maître d’armes', text: 'Un spectre en armure lève son épée : « Prouve ta valeur, et je t’enseignerai. »',
    choices: [
      { label: 'Accepter l’épreuve', effect: { dmgPct: 0.15, upgrade: true }, hint: '−15 % de vie · une compétence améliorée' },
      { label: 'Refuser poliment', effect: {}, hint: 'Rien ne se passe' },
    ] },
  { id: 'merchant_ghost', art: 'event_peddler', title: 'Colporteur égaré', text: 'Un colporteur perdu propose d’échanger ses provisions contre un peu d’or.',
    choices: [
      { label: 'Acheter une plume (50 or)', cost: { gold: 50 }, effect: { item: 'fea' }, hint: '+1 plume de phénix' },
      { label: 'Lui indiquer la sortie', effect: { shards: 4 }, hint: '+4 éclats' },
    ] },
  // v0.3: scenes are Dragonbound II backgrounds (scene) until their own art exists (art)
  { id: 'forge', art: 'event_forge', zones: [2, 9], scene: 'bg_c3_4', from: 2, title: 'Forge de lave', text: 'Une enclume abandonnée au bord d’une rivière de lave. Le feu y brûle encore.',
    choices: [
      { label: 'Forger (60 or)', cost: { gold: 60 }, effect: { gear: true }, hint: 'Un équipement rare pour un héros' },
      { label: 'Tremper une arme dans la lave', effect: { dmgPct: 0.1, element: 'feu' }, hint: '−10 % de vie · une arme de feu' },
    ] },
  { id: 'obelisk', art: 'event_obelisk', zones: [6], scene: 'bg_c7_4', from: 4, title: 'Obélisque murmurant', text: 'Des runes violettes pulsent sur la pierre noire. Une voix promet la force… à un prix.',
    choices: [
      { label: 'Toucher les runes', effect: { gamble: { win: { stat: true }, lose: { dmgPct: 0.2 }, p: 0.65 } }, hint: '65 % : +10 % de stat à un héros · sinon −20 % de vie' },
      { label: 'S’éloigner', effect: {}, hint: 'Rien ne se passe' },
    ] },
  { id: 'gambler', art: 'event_gambler', zones: [7], scene: 'bg_c8_3', from: 3, title: 'Parieur du marché noir', text: 'Un parieur encapuchonné agite trois dés d’os. « Double ou rien, l’ami ? »',
    choices: [
      { label: 'Parier 50 or', cost: { gold: 50 }, effect: { gamble: { win: { gold: 110 }, lose: {}, p: 0.5 } }, hint: '50 % : 110 or · sinon rien' },
      { label: 'Vendre une potion', cost: { item: 'pot' }, effect: { gold: 40 }, hint: '−1 potion · +40 or' },
    ] },
  { id: 'frozen', art: 'event_frozen', zones: [4], scene: 'bg_c5_3', from: 3, title: 'Aventurier gelé', text: 'Un aventurier est pris dans la glace, son sac encore à l’épaule.',
    choices: [
      { label: 'Briser la glace', effect: { dmgPct: 0.08, gear: true }, hint: '−8 % de vie · son équipement' },
      { label: 'Prendre sa fiole', effect: { item: 'pot' }, hint: '+1 potion' },
    ] },
  { id: 'blood', art: 'event_blood_altar', zones: [5], scene: 'bg_c6_5', from: 4, title: 'Autel de sang', text: 'Une coupe de sang sombre repose sur l’autel. Le Comte récompense les offrandes.',
    choices: [
      { label: 'Offrir son sang', effect: { dmgPct: 0.25, relic: true }, hint: '−25 % de vie · une relique' },
      { label: 'Renverser la coupe', effect: { shards: 6 }, hint: '+6 éclats' },
    ] },
  { id: 'library', art: 'event_library', zones: [5, 8], scene: 'bg_c6_3', from: 2, title: 'Bibliothèque oubliée', text: 'Un grimoire flotte au milieu des étagères, ouvert sur une page qui brille.',
    choices: [
      { label: 'Étudier le grimoire', effect: { upgrade: true }, hint: 'Une compétence améliorée' },
      { label: 'Lire les chroniques', effect: { stat: true }, hint: '+10 % de stat à un héros' },
    ] },
  // v0.4: zone events (zones = where they are 3× more likely; from = first zone where they can appear)
  { id: 'mushrooms', art: 'event_mushrooms', zones: [1], from: 1, scene: 'bg_c2_2', title: 'Cercle de champignons', text: 'Des champignons bleus brillent en cercle. Un vieil arbre semble sourire dans son sommeil.',
    choices: [
      { label: 'Goûter un champignon', effect: { gamble: { win: { healPct: 0.5 }, lose: { dmgPct: 0.15 }, p: 0.6 } }, hint: '60 % : soigne 50 % · sinon −15 % de vie' },
      { label: 'En cueillir pour plus tard', effect: { item: 'pot' }, hint: '+1 potion' },
    ] },
  { id: 'cart', art: 'event_cart', zones: [2], from: 2, scene: 'bg_c3_2', title: 'Chariot de cristaux', text: 'Un chariot renversé déborde de cristaux rouges, au bord d’une coulée de lave.',
    choices: [
      { label: 'Fouiller le chariot', effect: { dmgPct: 0.1, gold: 80 }, hint: '−10 % de vie · +80 or' },
      { label: 'Garder un cristal pur', effect: { stat: true }, hint: '+10 % de stat à un héros' },
    ] },
  { id: 'banquet', art: 'event_banquet', zones: [5], from: 5, scene: 'bg_c6_4', title: 'Banquet du Comte', text: 'Une longue table dressée, des coupes de vin rouge… et personne pour les boire.',
    choices: [
      { label: 'Boire le vin', effect: { healPct: 0.5 }, hint: 'Soigne l’équipe de 50 %' },
      { label: 'Voler l’argenterie', effect: { dmgPct: 0.2, gold: 120 }, hint: '−20 % de vie · +120 or' },
    ] },
  { id: 'pact', art: 'event_pact', zones: [8], from: 8, scene: 'bg_c9_1', title: 'Pacte du Néant', text: 'Un miroir flottant montre ton équipe, plus forte… et plus pâle. Une voix propose un marché.',
    choices: [
      { label: 'Accepter le pacte', effect: { dmgPct: 0.35, relic: 2 }, hint: '−35 % de vie · 2 reliques' },
      { label: 'Briser le miroir', effect: { shards: 10 }, hint: '+10 éclats' },
    ] },
];
/** Events that can appear in a zone (index 0-9), with their weight (3 in their own zone). */
export const eventsForZone = z => EVENTS.filter(e => (e.from || 0) <= z).map(e => [e, e.zones && e.zones.includes(z) ? 3 : 1]);
