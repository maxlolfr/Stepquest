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

// art = original icon of this game (img/relic_*.webp); missing art falls back to the emoji
export const RELICS = {
  vampire:  { name: 'Soif de sang', ic: '🩸', img: 'uiGem', art: 'relic_vampire', desc: 'Les héros récupèrent 10 % des dégâts qu’ils infligent.' },
  colere:   { name: 'Colère', ic: '🌟', img: 'uiTrophy', art: 'relic_colere', desc: 'Chaque combat commence avec les jauges d’ultime à 30 %.' },
  clarte:   { name: 'Clarté', ic: '🔮', img: 'uiScroll', art: 'relic_clarte', desc: 'Les compétences sont prêtes dès le début de chaque combat.' },
  rempart:  { name: 'Rempart', ic: '💠', img: 'uiChest1', art: 'relic_rempart', desc: 'Chaque héros commence les combats avec un bouclier de 15 % de sa vie.' },
  antidote: { name: 'Antidote', ic: '🧪', img: 'uiPotion', art: 'relic_antidote', desc: 'L’équipe est immunisée au poison.' },
  ignifuge: { name: 'Ignifuge', ic: '🧯', img: 'uiPotion', art: 'relic_ignifuge', desc: 'L’équipe est immunisée à la brûlure.' },
  bourreau: { name: 'Bourreau', ic: '🪓', img: 'uiSkull', art: 'relic_bourreau', desc: '+30 % de dégâts sur les ennemis sous 35 % de vie.' },
  venin:    { name: 'Lame venimeuse', ic: '☠️', img: 'uiSkull', art: 'relic_venin', desc: '+35 % de dégâts sur les ennemis empoisonnés.' },
  chasse:   { name: 'Œil du chasseur', ic: '🎯', img: 'uiDice', art: 'relic_chasse', desc: '+30 % de dégâts sur les cibles marquées 🎯.' },
  bourse:   { name: 'Bourse du pillard', ic: '💰', img: 'uiGold', art: 'relic_bourse', desc: '+30 % d’or gagné.' },
  braises:  { name: 'Braises du camp', ic: '🔥', img: 'uiChest2', art: 'relic_braises', desc: 'Les repos soignent 50 % de plus.' },
  sceau:    { name: 'Sceau du gardien', ic: '🛡️', img: 'uiChest3', art: 'relic_sceau', desc: 'La Garde peut être utilisée deux fois par combat.' },
};

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
];
