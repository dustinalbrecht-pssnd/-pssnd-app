// Multiplayer: https://www.callofduty.com/blog/2026/10/call-of-duty-modern-warfare-4-launch-multiplayer-operators-weapons-equipment-create-a-class
// Warzone: https://www.callofduty.com/blog/2026/11/call-of-duty-modern-warfare-4-warzone-season-1
// DMZ: https://www.callofduty.com/blog/2026/10/call-of-duty-modern-warfare-4-ready-for-launch-progression-prestige
// DMZ additions: https://www.callofduty.com/patchnotes/2026/11/call-of-duty-modern-warfare-4-season-1-patch-notes
const MW4_GEAR_BY_MODE = {
  mp: {
    tactical: [
      'Flash Grenade', 'Smoke Grenade', 'Snapshot Grenade', 'Concussion Grenade', 'Heartbeat Sensor',
      'Shock Stick', 'Decoy Grenade', 'Stim', 'Screamer Mine',
    ],
    lethal: [
      'Frag Grenade', 'Sticky Grenade', 'Drill Charge', 'Proximity Mine', 'Zip Gun', 'Trip Wire',
      'Thermite', 'Molotov Cocktail', 'Claymore', 'C4', 'Throwing Knife',
    ],
    perk1: ['Quick Fix', 'Overkill', 'High Alert', 'Ghost', 'Resupply', 'Kill Chain'],
    perk2: ['Hardline', 'Blood Rush', 'Bomb Squad', 'Fast Hands', 'Ninja', 'Birdseye'],
    perk3: ['Lethal Reach', 'Combat Grid', 'Battle Hardened', 'Scavenger', 'Tracker', 'Cold-Blooded'],
    field: [
      'Portable Radar', 'DDOS', 'Munitions Box', 'SAM Airburst Turret', 'Riot Shield', 'Trophy System',
      'Seeker Drone', 'Inflatable Decoy', 'Smoke Wall', 'Recon Drone', 'Razor Wire Trap', 'Tactical Insertion',
    ],
  },
  wz: {
    tactical: [
      'Flash Grenade', 'Smoke Grenade', 'Snapshot Grenade', 'Concussion Grenade', 'Heartbeat Sensor',
      'Shock Stick', 'Stim', 'Screamer Mine',
    ],
    lethal: [
      'Frag Grenade', 'Sticky Grenade', 'Drill Charge', 'Proximity Mine', 'Trip Wire', 'Thermite',
      'Molotov Cocktail', 'Claymore', 'C4', 'Throwing Knife',
    ],
    perk1: ['Field Medic', 'Hunter', 'Stocked', 'Incognito', 'Surveyor'],
    perk2: ['Mountaineer', 'Adaptive', 'Scavenger', 'Drill Instructor', 'Deft Hands'],
    perk3: ['Berserker', 'Quick Fix', 'Survivor', 'Tempered', 'Wingman'],
  },
  dmz: {
    tactical: [
      'Smoke Grenade', 'Concussion Grenade', 'Snapshot Grenade', 'Heartbeat Sensor', 'Shock Stick', 'Screamer Mine',
    ],
    lethal: [
      'Frag Grenade', 'Throwing Knife', 'Sticky Grenade', 'C4', 'Proximity Mine', 'Molotov Cocktail',
      'Thermite', 'Trip Wire', 'Claymore',
    ],
    field: [
      'Munitions Box', 'Spotter Scope', 'Armor Box', 'Seeker Drone', 'Recon Drone', 'Razor Wire Trap',
      'Inflatable Decoy', 'Revive Pistol', 'DDOS',
    ],
  },
};

function availableInMode(item, mode) {
  return !!item && item.active !== false && (!Array.isArray(item.modes) || item.modes.includes(mode));
}

function mw4GearSlots(mode, items = []) {
  const defaults = MW4_GEAR_BY_MODE[mode === 'ranked' ? 'mp' : mode];
  if (!defaults) return [];
  return Object.keys(MW4_GEAR_BY_MODE.mp).filter((slot) =>
    Object.hasOwn(defaults, slot) || items.some((item) => item.slot === slot && availableInMode(item, mode)),
  );
}

const rows = new Map();
for (const [mode, slots] of Object.entries(MW4_GEAR_BY_MODE)) {
  for (const [slot, names] of Object.entries(slots)) {
    for (const [order, name] of names.entries()) {
      const key = slot + ':' + name;
      if (!rows.has(key)) rows.set(key, { type: 'gear', slot, name, order, modes: [] });
      const row = rows.get(key);
      row.modes.push(mode);
      if (mode === 'mp') row.modes.push('ranked');
    }
  }
}
const MW4_GEAR = [...rows.values()];

export { MW4_GEAR, availableInMode, mw4GearSlots };
