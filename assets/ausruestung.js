import { html, siteConfig, state } from './app.js';
import { attachmentLanguage } from './aufsaetze.js';
import { equipmentNames } from './katalog-abgleich.js';

const GEAR = {
  tactical: ['Rauchgranate', 'Blendgranate', 'Betäubung', 'Stim', 'Herzsensor', 'Snapshot'],
  lethal: ['Splittergranate', 'Haftgranate', 'C4', 'Molotow', 'Bohrladung'],
  perk1: ['Ghost', 'Scavenger', 'Gung-Ho', 'Quick Fix'],
  perk2: ['Fast Hands', 'Tracker', 'Cold-Blooded', 'Vigilance'],
  perk3: ['Temperiert', 'Ninja', 'High Alert', 'Flak Jacket'],
  field: ['Trophy System', 'Munitionskiste', 'Healing Aura'],
  ammo: ['Dead Wire', 'Napalm Burst', 'Cryo Freeze'],
  cola: ['Jugger-Nog', 'Speed Cola', 'Stamin-Up'],
};

const GEAR_NAMES = {
  tactical: 'Taktik',
  lethal: 'Granate',
  perk1: 'Extra 1',
  perk2: 'Extra 2',
  perk3: 'Extra 3',
  field: 'Feldaufrüstung',
  ammo: 'Munitions-Mod',
  cola: 'Extra-Cola',
};

const M4_OPTIONS = {
  tactical: [
    'Flash Grenade',
    'Smoke Grenade',
    'Snapshot Grenade',
    'Concussion Grenade',
    'Heartbeat Sensor',
    'Shock Stick',
    'Stim',
  ],
  lethal: [
    'Frag Grenade',
    'Sticky Grenade',
    'Drill Charge',
    'Proximity Mine',
    'Thermite',
    'Trip Wire',
    'Zip Gun',
    'Molotov Cocktail',
  ],
  perk1: ['Overkill', 'Ninja', 'High Alert', 'Quick Fix', 'Ghost'],
  perk2: ['Fast Hands', 'Hardline', 'Bomb Squad', 'Tracker'],
  perk3: ['Scavenger', 'Lethal Reach', 'Blood Rush', 'Combat Grid', 'Battle Hardened', 'Cold-Blooded'],
  field: ['Portable Radar', 'DDOS', 'SAM Airburst Turret', 'Smoke Wall', 'Riot Shield', 'Razor Wire Trap'],
};

const GEAR_VISUALS = [
  ['Flash Grenade', 'Blendgranate', 'equipment', 0, ['Blendgranate']],
  ['Smoke Grenade', 'Rauchgranate', 'equipment', 1, ['Rauchgranate']],
  ['Snapshot Grenade', 'Schnappschussgranate', 'equipment', 2, ['Snapshot']],
  ['Concussion Grenade', 'Erschütterungsgranate', 'equipment', 3, ['Betäubung', 'Betäubungsgranate']],
  ['Heartbeat Sensor', 'Herzschlagsensor', 'equipment', 4, ['Herzsensor']],
  ['Shock Stick', 'Schockstab', 'equipment', 5, []],
  ['Stim', 'Stim-Injektion', 'equipment', 6, ['Stim-Injektion']],
  ['Frag Grenade', 'Splittergranate', 'equipment', 7, ['Splittergranate']],
  ['Sticky Grenade', 'Haftgranate', 'equipment', 8, ['Haftgranate', 'Semtex']],
  ['Drill Charge', 'Bohrladung', 'equipment', 9, ['Bohrladung']],
  ['Proximity Mine', 'Näherungsmine', 'equipment', 10, []],
  ['Thermite', 'Thermit', 'equipment', 11, []],
  ['Trip Wire', 'Stolperdraht', 'equipment', 12, []],
  ['Zip Gun', 'Einwegkanone', 'equipment', 13, []],
  ['Molotov Cocktail', 'Molotow-Cocktail', 'equipment', 14, ['Molotow']],
  ['Portable Radar', 'Tragbares Radar', 'equipment', 15, []],
  ['DDOS', 'DDoS', 'equipment', 16, [], 'Elektronik stören'],
  ['SAM Airburst Turret', 'Boden-Luft-Geschütz', 'equipment', 17, []],
  ['Smoke Wall', 'Rauchwand', 'equipment', 18, []],
  ['Riot Shield', 'Einsatzschild', 'equipment', 19, []],
  ['Razor Wire Trap', 'Stacheldrahtfalle', 'equipment', 20, ['Stacheldraht']],
  ['C4', 'C4', 'equipment', 21, [], 'Sprengladung'],
  ['Trophy System', 'Trophy-System', 'equipment', 22, []],
  ['Munitionskiste', 'Munitionskiste', 'equipment', 23, ['Munitions Box', 'Ammo Box'], 'Munition nachfüllen'],
  ['Overkill', 'Overkill', 'perks', 0, [], 'Zwei Primärwaffen'],
  ['Ninja', 'Ninja', 'perks', 1, [], 'Leise Schritte'],
  ['High Alert', 'Alarmiert', 'perks', 2, []],
  ['Quick Fix', 'Zusammenflicken', 'perks', 3, []],
  ['Ghost', 'Geist', 'perks', 4, []],
  ['Fast Hands', 'Flinke Hände', 'perks', 5, []],
  ['Hardline', 'Hardliner', 'perks', 6, []],
  ['Bomb Squad', 'Bombenkommando', 'perks', 7, []],
  ['Tracker', 'Spurensucher', 'perks', 8, []],
  ['Scavenger', 'Plünderer', 'perks', 9, []],
  ['Lethal Reach', 'Tödliche Reichweite', 'perks', 10, []],
  ['Blood Rush', 'Blutrausch', 'perks', 11, []],
  ['Combat Grid', 'Kampfraster', 'perks', 12, []],
  ['Battle Hardened', 'Taktikmaske', 'perks', 13, ['Kampfgestählt', 'Söldner']],
  ['Cold-Blooded', 'Kaltblütig', 'perks', 14, []],
  ['Gunfighter', 'Revolverheld', 'perks', 15, ['Revolverheld']],
  ['Gung-Ho', 'Eifer', 'perks', 1, []],
  ['Vigilance', 'Wachsamkeit', 'perks', 2, []],
  ['Flak Jacket', 'Splitterschutz', 'perks', 7, []],
  ['Healing Aura', 'Heilende Aura', 'perks', 3, []],
  ['Dead Wire', 'Toter Draht', 'attachments', 7, []],
  ['Napalm Burst', 'Napalm-Explosion', 'attachments', 8, []],
  ['Cryo Freeze', 'Kryo-Frost', 'attachments', 8, []],
  ['Speed Cola', 'Speed Cola', 'attachments', 14, [], 'Schneller nachladen'],
  ['Stamin-Up', 'Stamin-Up', 'perks', 11, [], 'Mehr Ausdauer'],
  ['Jugger-Nog', 'Jugger-Nog', 'perks', 13, [], 'Mehr Gesundheit'],
];

const normalizeGearName = (value) =>
  String(value || '')
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('de-DE');

const GEAR_VISUAL_BY_NAME = new Map();

for (const entry of GEAR_VISUALS)
  for (const name of [entry[0], entry[1], ...entry[4]])
    GEAR_VISUAL_BY_NAME.set(normalizeGearName(name), entry);

function illustratedArt(group, index, extra = '') {
  const columns = group === 'equipment' ? 6 : 4,
    rows = 4,
    column = index % columns,
    row = Math.floor(index / columns);
  return (
    '<span class="ui-art art-' +
    group +
    (extra ? ' ' + extra : '') +
    '" style="--art-x:' +
    (column / (columns - 1)) * 100 +
    '%;--art-y:' +
    (row / (rows - 1)) * 100 +
    '%" aria-hidden="true"></span>'
  );
}

function gearVisual(name) {
  return GEAR_VISUAL_BY_NAME.get(normalizeGearName(name));
}

function gearSecondaryLabel(key, name) {
  if (!name || name === 'Keine') return '';
  const entry = gearVisual(name);
  const { de, en } = equipmentNames(gearEntry(key, name), name, entry);
  return normalizeGearName(de) === normalizeGearName(en)
    ? entry?.[5] || ''
    : attachmentLanguage === 'en' ? de : en;
}

function gearSecondaryMarkup(key, name) {
  const label = gearSecondaryLabel(key, name);
  return label ? '<small class="gear-original">' + html(label) + '</small>' : '';
}

function gearLabelMarkup(key, name) {
  return html(gearLabel(key, name))
    .replace(/Schnappschussgranate/g, 'Schnappschuss<wbr>granate')
    .replace(/Erschütterungsgranate/g, 'Erschütterungs<wbr>granate')
    .replace(/Herzschlagsensor/g, 'Herzschlags<wbr>sensor')
    .replace(/Bombenkommando/g, 'Bomben<wbr>kommando')
    .replace(/Stacheldrahtfalle/g, 'Stacheldraht<wbr>falle');
}

function gearIcon(key) {
  return illustratedArt('attachments', key.startsWith('perk') || key === 'wildcard' ? 15 : 14);
}

function managedItems(type) {
  return Array.isArray(siteConfig.content)
    ? siteConfig.content.filter((x) => x.type === type && x.active !== false)
    : null;
}

function availableGear(key) {
  const items = managedItems('gear');
  return items
    ? items.filter((x) => x.slot === key && (!x.modes || x.modes.includes(state.mode))).map((x) => x.name)
    : M4_OPTIONS[key] || [];
}

function gearEntry(key, name) {
  return managedItems('gear')?.find((x) => x.slot === key && x.name === name);
}

function gearLabel(key, name) {
  return equipmentNames(gearEntry(key, name), name, gearVisual(name))[attachmentLanguage];
}

function gearArtwork(key, name) {
  const row = gearEntry(key, name),
    entry = gearVisual(name);
  if (row?.img) return '<img class="equipment-image" src="' + html(row.img) + '" alt="" loading="lazy">';
  if (!name || name === 'Keine') return '<span class="equipment-none" aria-hidden="true">–</span>';
  return entry ? illustratedArt(entry[2], entry[3]) : gearIcon(key);
}

export {
  GEAR,
  GEAR_NAMES,
  M4_OPTIONS,
  availableGear,
  gearArtwork,
  gearEntry,
  gearLabel,
  gearLabelMarkup,
  gearSecondaryMarkup,
  gearVisual,
  illustratedArt,
  managedItems,
};
