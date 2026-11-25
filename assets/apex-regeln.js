// Confirmed in the MW4 multiplayer weapon overview and the Season 1 Warzone notes.
const APEX_BLOCKED_SLOTS = {
  'han-x20-skybreaker': ['optic', 'stock', 'barrel'],
  'm4-hurricane': ['barrel', 'magazine'],
  'patriot-xmr-volt': ['barrel'],
  'kastov-arc': ['barrel'],
  'oden-sentinel': ['barrel', 'muzzle'],
  'axion-clearcut': ['optic', 'laser', 'underbarrel', 'stock', 'grip'],
  'axion-reaver': ['optic', 'laser', 'underbarrel', 'stock', 'grip'],
  'cronen-maelstrom': ['laser', 'underbarrel'],
  'iso-trace': ['optic', 'ammo'],
  'vel-46-snap': ['stock'],
  'wz-55-striga-rampage': ['optic', 'stock', 'underbarrel'],
  'ppsh-41-ember': ['barrel', 'underbarrel', 'magazine'],
  'x-58-void': ['barrel', 'ammo'],
  'warlord-lumen': ['optic', 'laser'],
  'type-73-assault': ['magazine', 'ammo'],
  'apoc-338-praetor': ['magazine'],
  'mar-9-auto': ['trigger'],
  'oris-8-6-razor': ['underbarrel'],
  'mosin-harpoon': ['barrel', 'muzzle'],
  'astaroth-57-infiltrator': ['optic'],
  'signal-50-inferno': ['ammo'],
  'signal-inferno': ['ammo'],
  'sang-breach': ['laser'],
  'gs-magna': ['trigger'],
  'mojave-357-lawless': ['trigger'],
  'mojave-lawless': ['trigger'],
};

function apexNameKey(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function apexBlockedSlots(apex) {
  if (apex?.slot !== 'apex') return [];
  for (const key of [apex.id, apexNameKey(apex.name), apexNameKey(apex.en)]) {
    if (Object.hasOwn(APEX_BLOCKED_SLOTS, key)) return APEX_BLOCKED_SLOTS[key];
  }
  return [];
}

export function apexConflict(parts) {
  const apex = parts.find((part) => part.slot === 'apex');
  const blocked = apexBlockedSlots(apex);
  const conflicts = parts.filter((part) => blocked.includes(part.slot));
  return conflicts.length ? { apex, conflicts } : null;
}
