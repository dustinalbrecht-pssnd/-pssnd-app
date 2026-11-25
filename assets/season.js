function weaponSeason(loadout, weaponId) {
  const season = loadout.weaponSeasons?.[weaponId];
  return Number.isSafeInteger(season) && season >= 0 ? season : undefined;
}

function loadoutWeaponSeasons(loadout) {
  const weapons = new Set([loadout.primary, loadout.secondary].filter(Boolean));
  const seasons = [];
  for (const weaponId of weapons) {
    const season = weaponSeason(loadout, weaponId);
    if (season !== undefined) seasons.push([weaponId, season]);
  }
  return seasons;
}

const seasonLabel = (season) => 'Season ' + season;

export { loadoutWeaponSeasons, seasonLabel, weaponSeason };
