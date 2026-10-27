// Monsters: names, base stats, size, traits, weaknesses (w) and resistances (r)
// copied from Dragonbound II 1.9.11 (MON). Sprites: Dragonbound 1 img/ for
// monsters, Dragonbound II img/ for bosses. Stats are scaled per floor in balance.js.
// Traits used here: regen, poison, double, rise, howl, burn, slow, drain, evade, chill.

export const MONSTERS = {
  // Zone 1 — crypt (floors 1-3)
  slime:  { name: 'Gluant vert', hp: 80, atk: 16, def: 2, h: 0.17, trait: 'regen', w: ['feu'], r: ['poison'], tip: 'Se régénère à chaque tour.' },
  rat:    { name: 'Rat des égouts', hp: 72, atk: 17, def: 2, h: 0.18, trait: 'poison', w: ['glace'], r: ['poison'], tip: 'Sa morsure empoisonne.' },
  bat:    { name: 'Chauve-souris', hp: 60, atk: 14, def: 1, h: 0.15, fly: true, trait: 'double', w: ['foudre'], r: [], tip: 'Rapide : frappe deux fois.' },
  skel:   { name: 'Squelette', hp: 112, atk: 23, def: 5, h: 0.25, trait: 'rise', w: ['feu', 'foudre'], r: ['poison'], tip: 'Se relève une fois… sauf s’il brûle.' },
  wolf:   { name: 'Loup gris', hp: 120, atk: 27, def: 6, h: 0.21, trait: 'howl', w: ['feu'], r: [], tip: 'Hurle, puis mord très fort au tour suivant.' },
  spider: { name: 'Araignée géante', hp: 105, atk: 26, def: 5, h: 0.19, trait: 'poison', w: ['feu'], r: ['poison'], tip: 'Son venin empoisonne.' },
  shroom: { name: 'Champignon furieux', hp: 140, atk: 23, def: 8, h: 0.21, trait: 'regen', w: ['feu'], r: ['poison'], tip: 'Ses spores le soignent à chaque tour.' },
  // Zone 2 — swamp (floors 4-6)
  frog:   { name: 'Crapaud toxique', hp: 120, atk: 22, def: 8, h: 0.18, trait: 'poison', w: ['glace'], r: ['poison'], tip: 'Sa langue gluante empoisonne.' },
  wisp:   { name: 'Feu follet', hp: 95, atk: 25, def: 6, h: 0.16, fly: true, trait: 'evade', w: ['foudre'], r: ['feu', 'poison'], tip: 'Esprit fragile, esquive un coup sur quatre.' },
  zombie: { name: 'Noyé des marais', hp: 160, atk: 24, def: 10, h: 0.24, trait: 'regen', w: ['feu'], r: ['poison'], tip: 'Il se recompose à chaque tour.' },
  vine:   { name: 'Liane carnivore', hp: 135, atk: 21, def: 9, h: 0.23, trait: 'double', w: ['feu'], r: ['poison'], tip: 'Ses lianes frappent deux fois.' },
  imp:    { name: 'Diablotin', hp: 95, atk: 26, def: 6, h: 0.2, trait: 'burn', w: ['glace'], r: ['feu'], tip: 'Il t’enflamme : brûlure 3 tours.' },
  golem:  { name: 'Golem de lave', hp: 190, atk: 30, def: 14, h: 0.3, trait: 'slow', w: ['glace'], r: ['feu', 'poison'], tip: 'Lent : il charge un tour, puis frappe très fort.' },
  // Zone 3 — necropolis (floors 7-9)
  ghoul:  { name: 'Goule', hp: 230, atk: 33, def: 14, h: 0.27, trait: 'regen', w: ['feu'], r: ['poison'], tip: 'Elle se recompose à chaque tour.' },
  banshee:{ name: 'Banshee', hp: 140, atk: 35, def: 10, h: 0.26, fly: true, trait: 'evade', w: ['foudre'], r: ['glace', 'poison'], tip: 'Insaisissable : esquive un coup sur quatre.' },
  necro:  { name: 'Nécromancien', hp: 160, atk: 37, def: 11, h: 0.28, trait: 'burn', w: ['phys', 'feu'], r: ['poison'], tip: 'Ses flammes vertes brûlent 3 tours.' },
  vampire:{ name: 'Vampire', hp: 170, atk: 35, def: 12, h: 0.29, trait: 'drain', w: ['feu'], r: ['poison', 'glace'], tip: 'Elle se soigne en te mordant.' },
  werewolf:{ name: 'Loup-garou', hp: 215, atk: 37, def: 13, h: 0.3, trait: 'howl', w: ['feu'], r: [], tip: 'Il hurle, puis frappe très fort.' },
  armor:  { name: 'Armure hantée', hp: 200, atk: 31, def: 20, h: 0.29, trait: 'double', w: ['foudre'], r: ['poison', 'glace'], tip: 'Sa hallebarde frappe deux fois. Très résistante.' },
  // Guardian of floor 5 (always elite)
  knight: { name: 'Chevalier noir', hp: 260, atk: 40, def: 22, h: 0.29, trait: 'double', w: ['foudre'], r: ['poison'], tip: 'Armure presque impénétrable, frappe deux fois.' },
  // Final boss (floor 10)
  bossBone: { name: 'Roi des Os', boss: true, hp: 1000, atk: 43, def: 10, h: 0.46, w: ['feu'], r: ['poison'], dir: 'db2',
    tip: 'Prépare une Faux macabre sur toute l’équipe : utilise la Garde ou étourdis-le avec la Charge d’Aldric ! À mi-vie, une muraille d’os le protège : le feu la brise deux fois plus vite.' },
};

export const ZONES = [
  { floors: [1, 2, 3], name: 'Crypte oubliée', pool: ['slime', 'rat', 'bat', 'skel', 'wolf', 'spider', 'shroom'], bgs: [['bg_c1_1', 0.5], ['bg_c1_2', 0.5], ['bg_c1_4', 0.5]], music: 'm_crypt' },
  { floors: [4, 5, 6], name: 'Marais putride', pool: ['frog', 'wisp', 'zombie', 'vine', 'imp', 'golem'], bgs: [['bg_c4_2', 0.66], ['bg_c4_3', 0.63], ['bg_c4_4', 0.65]], music: 'm_swamp' },
  { floors: [7, 8, 9], name: 'Nécropole', pool: ['ghoul', 'banshee', 'necro', 'vampire', 'werewolf', 'armor'], bgs: [['bg_c7_2', 0.66], ['bg_c7_3', 0.67], ['bg_c7_4', 0.66]], music: 'm_necro' },
  { floors: [10], name: 'Trône des Os', pool: ['skel'], bgs: [['bg_c1_5', 0.47]], music: 'm_boss' },
];
export const zoneOf = floor => ZONES.find(z => z.floors.includes(floor)) || ZONES[0];

// Elite affixes (subset of Dragonbound II AFFIX). col = tint shown on the sprite.
export const AFFIXES = {
  enrage: { n: 'enragé', col: '255,70,50', tip: 'frappe plus fort quand il est blessé' },
  thorns: { n: 'épineux', col: '90,230,90', tip: 'renvoie 25 % des coups au corps à corps' },
  regen:  { n: 'régénérant', col: '120,255,170', tip: 'récupère 10 % de vie à chaque tour' },
  vamp:   { n: 'vampirique', col: '200,40,90', tip: 'se soigne de la moitié des dégâts qu’il inflige' },
  armor:  { n: 'blindé', col: '170,190,210', tip: 'protégé par un bouclier de 30 % de sa vie' },
};

export const ELEMENTS = { phys: '⚔️', feu: '🔥', glace: '❄️', poison: '☠️', foudre: '⚡' };
export const ELEMENT_NAMES = { phys: 'Physique', feu: 'Feu', glace: 'Glace', poison: 'Poison', foudre: 'Foudre' };
