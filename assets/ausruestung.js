import { html, siteConfig, state } from './app.js';
import { attachmentLanguage } from './aufsaetze.js';
import { equipmentNames } from './katalog-abgleich.js';
import { MW4_GEAR, availableInMode, mw4GearSlots } from './mw4-ausruestung.js';

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
  tactical: 'Taktikausrüstung',
  lethal: 'Primärausrüstung',
  perk1: 'Extra 1',
  perk2: 'Extra 2',
  perk3: 'Extra 3',
  field: 'Feldaufrüstung',
  ammo: 'Munitions-Mod',
  cola: 'Extra-Cola',
};

const GEAR_VISUALS = [
  ['Flash Grenade', 'Blendgranate', 'equipment', 0, ['Blendgranate']],
  ['Smoke Grenade', 'Rauchgranate', 'equipment', 1, ['Rauchgranate']],
  ['Snapshot Grenade', 'Schnappschussgranate', 'equipment', 2, ['Snapshot']],
  ['Concussion Grenade', 'Erschütterungsgranate', 'equipment', 3, ['Betäubung', 'Betäubungsgranate']],
  ['Heartbeat Sensor', 'Herzschlagsensor', 'equipment', 4, ['Herzsensor']],
  ['Shock Stick', 'Schockstab', 'equipment', 5, ['Shock Charge']],
  ['Stim', 'Stim-Injektion', 'equipment', 6, ['Stim-Injektion']],
  ['Frag Grenade', 'Splittergranate', 'equipment', 7, ['Splittergranate']],
  ['Sticky Grenade', 'Haftgranate', 'equipment', 8, ['Haftgranate', 'Semtex']],
  ['Drill Charge', 'Bohrladung', 'equipment', 9, ['Bohrladung']],
  ['Proximity Mine', 'Näherungsmine', 'equipment', 10, []],
  ['Thermite', 'Thermit', 'equipment', 11, []],
  ['Trip Wire', 'Stolperdraht', 'equipment', 12, ['Tripwire Mine']],
  ['Zip Gun', 'Einwegkanone', 'equipment', 13, []],
  ['Molotov Cocktail', 'Molotowcocktail', 'equipment', 14, ['Molotow', 'Molotow-Cocktail', 'Molotov']],
  ['Portable Radar', 'Tragbares Radar', 'equipment', 15, []],
  ['DDOS', 'DDoS', 'equipment', 16, [], 'Elektronik stören'],
  ['SAM Airburst Turret', 'Boden-Luft-Geschütz', 'equipment', 17, []],
  ['Smoke Wall', 'Rauchwand', 'equipment', 18, []],
  ['Riot Shield', 'Einsatzschild', 'equipment', 19, []],
  ['Razor Wire Trap', 'Stacheldrahtfalle', 'equipment', 20, ['Stacheldraht']],
  ['C4', 'C4', 'equipment', 21, []],
  ['Trophy System', 'Trophy-System', 'equipment', 22, []],
  ['Throwing Knife', 'Wurfmesser', 'mw4-equipment', 0, []],
  ['Claymore', 'Claymore', 'mw4-equipment', 1, []],
  ['Decoy Grenade', 'Täuschgranate', 'mw4-equipment', 2, []],
  ['Screamer Mine', 'Schreier-Mine', 'mw4-equipment', 3, []],
  ['Seeker Drone', 'Sucherdrohne', 'mw4-equipment', 4, []],
  ['Inflatable Decoy', 'Aufblasbarer Täuschkörper', 'mw4-equipment', 5, []],
  ['Recon Drone', 'Aufklärungsdrohne', 'mw4-equipment', 6, []],
  ['Tactical Insertion', 'Taktikeinstieg', 'mw4-equipment', 7, []],
  ['Spotter Scope', 'Scout-Zielfernrohr', 'mw4-equipment', 8, []],
  ['Armor Box', 'Panzerungskiste', 'mw4-equipment', 9, []],
  ['Revive Pistol', 'Wiederbelebungspistole', 'mw4-equipment', 10, []],
  ['Munitions Box', 'Munitionskiste', 'mw4-equipment', 11, ['Ammo Box'], 'Munition nachfüllen'],
  ['Overkill', 'Overkill', 'perks', 0, [], 'Zwei Primärwaffen'],
  ['Ninja', 'Ninja', 'perks', 1, [], 'Leise Schritte'],
  ['High Alert', 'Alarmiert', 'perks', 2, []],
  ['Quick Fix', 'Zusammenflicken', 'perks', 3, []],
  ['Ghost', 'Geist', 'perks', 4, []],
  ['Fast Hands', 'Flinke Hände', 'perks', 5, []],
  ['Hardline', 'Hardliner', 'perks', 6, []],
  ['Bomb Squad', 'Bombenkommando', 'perks', 7, []],
  ['Tracker', 'Spurenleser', 'perks', 8, ['Spurensucher']],
  ['Scavenger', 'Plünderer', 'perks', 9, []],
  ['Lethal Reach', 'Tödliche Reichweite', 'perks', 10, []],
  ['Blood Rush', 'Blutrausch', 'perks', 11, []],
  ['Combat Grid', 'Kampfraster', 'perks', 12, []],
  ['Battle Hardened', 'Taktikmaske', 'perks', 13, ['Kampfgestählt', 'Söldner']],
  ['Cold-Blooded', 'Kaltblütig', 'perks', 14, []],
  ['Gunfighter', 'Revolverheld', 'perks', 15, ['Revolverheld']],
  ['Resupply', 'Nachschub', 'mw4-perks', 0, []],
  ['Kill Chain', 'Abschusskette', 'mw4-perks', 1, []],
  ['Birdseye', 'Draufsicht', 'mw4-perks', 2, []],
  ['Field Medic', 'Notfallsanitäter', 'mw4-perks', 3, []],
  ['Hunter', 'Jäger', 'mw4-perks', 4, []],
  ['Stocked', 'Beladen', 'mw4-perks', 5, []],
  ['Incognito', 'Inkognito', 'mw4-perks', 6, []],
  ['Surveyor', 'Gutachter', 'mw4-perks', 7, []],
  ['Mountaineer', 'Bergsteiger', 'mw4-perks', 8, []],
  ['Adaptive', 'Adaptiv', 'mw4-perks', 9, []],
  ['Drill Instructor', 'Ausbilder', 'mw4-perks', 10, []],
  ['Deft Hands', 'Flinke Hand', 'mw4-perks', 11, []],
  ['Berserker', 'Berserker', 'mw4-perks', 12, []],
  ['Survivor', 'Überlebenskünstlerin', 'mw4-perks', 13, []],
  ['Tempered', 'Gehärtet', 'mw4-perks', 14, ['Temperiert']],
  ['Wingman', 'Flügelmann', 'mw4-perks', 15, []],
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

const ARTWORK_SHEETS = {
  // The older illustrations are not centered on a regular grid.
  equipment: ['ausruestung.png', [0, 280, 523, 770, 1029, 1290, 1536], [0, 257, 502, 748, 1024]],
  perks: ['extras.png', [0, 322, 626, 938, 1254], [0, 322, 622, 911, 1214]],
  attachments: ['aufsaetze.png', [0, 313.5, 627, 940.5, 1254], [0, 313.5, 627, 940.5, 1254]],
  'mw4-equipment': ['mw4-ausruestung.webp', [0, 362, 724, 1086, 1448], [0, 362, 733, 1086]],
  'mw4-perks': ['mw4-extras.webp', [0, 313.5, 627, 940.5, 1254], [0, 313.5, 627, 940.5, 1254]],
};
const EQUIPMENT_TILE_EDGES = {
  12: { top: 512 },
  13: { bottom: 737 },
  19: { top: 738 },
};

function artworkTile(group, index) {
  const [file, xs, ys] = ARTWORK_SHEETS[group];
  const columns = xs.length - 1;
  const col = index % columns, row = Math.floor(index / columns);
  const edges = group === 'equipment' ? EQUIPMENT_TILE_EDGES[index] : undefined;
  const x = xs[col];
  const y = edges?.top ?? ys[row];
  const right = xs[col + 1];
  const bottom = edges?.bottom ?? ys[row + 1];
  return {
    url: new URL('./bilder/' + file, import.meta.url).href,
    x, y, width: right - x, height: bottom - y,
    sheetWidth: xs.at(-1),
    sheetHeight: group === 'perks' ? 1254 : ys.at(-1),
  };
}

function illustratedArt(group, index, extra = '') {
  const tile = artworkTile(group, index);
  const size = Math.max(tile.width, tile.height);
  const position = (start, length, total) => (start * 100) / (total - length) + '%';
  return `<span class="ui-art ${extra}" style="--art-image:url('${html(tile.url)}');
    --art-w:${(tile.width / size) * 100}%;--art-h:${(tile.height / size) * 100}%;
    --art-size:${tile.sheetWidth * 100 / tile.width}% ${tile.sheetHeight * 100 / tile.height}%;
    --art-position:${position(tile.x, tile.width, tile.sheetWidth)} ${position(tile.y, tile.height, tile.sheetHeight)}"
    aria-hidden="true"></span>`;
}

function gearVisual(name, row) {
  return [name, row?.en, row?.de].map((value) => GEAR_VISUAL_BY_NAME.get(normalizeGearName(value))).find(Boolean);
}

function gearSecondaryLabel(key, name) {
  if (!name || name === 'Keine') return '';
  const entry = gearVisual(name);
  const { de, en } = equipmentNames(gearEntry(key, name), name, entry, state.mode);
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

function managedItems(type) {
  return Array.isArray(siteConfig.content)
    ? siteConfig.content.filter((x) => x.type === type && x.active !== false)
    : null;
}

function gearSlots(game, mode) {
  if (game === 'mw4') return mw4GearSlots(mode, managedItems('gear') ?? MW4_GEAR);
  if (mode === 'zm') return ['tactical', 'lethal', 'field', 'ammo', 'cola'];
  return ['tactical', 'lethal', 'perk1', 'perk2', 'perk3', ...(mode === 'mp' ? ['field'] : []), 'wildcard'];
}

function availableGear(key, game = state.game, mode = state.mode) {
  if (key === 'wildcard') return ['Keine', 'Revolverheld'];
  if (game !== 'mw4') return GEAR[key] || [];
  const items = managedItems('gear') ?? MW4_GEAR;
  return [...new Set(items.filter((x) => x.slot === key && availableInMode(x, mode)).map((x) => x.name))];
}

function buildGearValue(gear, key, options) {
  if (!Object.hasOwn(gear || {}, key)) return options[0] || '';
  return options.includes(gear[key]) ? gear[key] : '';
}

function draftGear(gear, game, mode) {
  const entries = [];
  for (const key of gearSlots(game, mode)) {
    const value = buildGearValue(gear, key, availableGear(key, game, mode));
    if (value && value !== 'Keine' && value !== 'None') entries.push([key, value]);
  }
  return Object.fromEntries(entries);
}

function gearEntry(key, name, mode = state.mode) {
  const matching = managedItems('gear')?.filter((x) => x.slot === key && x.name === name) || [];
  return matching.find((x) => availableInMode(x, mode)) || matching[0];
}

function gearLabel(key, name, mode = state.mode) {
  return equipmentNames(gearEntry(key, name, mode), name, gearVisual(name), mode)[attachmentLanguage];
}

function gearArtwork(key, name) {
  const row = gearEntry(key, name),
    entry = gearVisual(name, row);
  if (row?.img) return '<img class="equipment-image" src="' + html(row.img) + '" alt="" loading="lazy">';
  if (!name || name === 'Keine') return '<span class="equipment-none" aria-hidden="true">–</span>';
  return entry ? illustratedArt(entry[2], entry[3]) : '<span class="equipment-no-art">Grafik fehlt</span>';
}

export {
  GEAR_NAMES,
  artworkTile,
  availableGear,
  buildGearValue,
  draftGear,
  gearSlots,
  gearArtwork,
  gearEntry,
  gearLabel,
  gearLabelMarkup,
  gearSecondaryMarkup,
  gearVisual,
  illustratedArt,
  managedItems,
};
