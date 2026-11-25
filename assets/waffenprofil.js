export const WEAPON_DISTANCES = {
  short: 'Kurze Distanz',
  mid: 'Mittlere Distanz',
  long: 'Große Distanz',
  allround: 'Allrounder',
};

export const WEAPON_HINT_LENGTH = 100;

export function weaponProfile(loadout, id) {
  const profile = loadout?.weaponProfiles?.[id];
  return {
    distance: Object.hasOwn(WEAPON_DISTANCES, profile?.distance) ? profile.distance : '',
    hint: typeof profile?.hint === 'string' ? profile.hint.trim().slice(0, WEAPON_HINT_LENGTH) : '',
  };
}

export function loadoutWeaponProfiles(loadout) {
  return Object.fromEntries([...new Set([loadout.primary, loadout.secondary].filter(Boolean))]
    .map((id) => [id, weaponProfile(loadout, id)])
    .filter(([, { distance, hint }]) => distance || hint));
}

export function weaponProfileSummary(loadout, id) {
  const { distance, hint } = weaponProfile(loadout, id);
  return [WEAPON_DISTANCES[distance], hint].filter(Boolean).join(' · ');
}

export function distanceOptions(placeholder, selected = '') {
  return '<option value="">' + placeholder + '</option>' + Object.entries(WEAPON_DISTANCES)
    .map(([value, label]) => '<option value="' + value + '"' + (value === selected ? ' selected' : '') + '>' + label + '</option>')
    .join('');
}
