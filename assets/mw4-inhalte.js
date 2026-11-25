export const SETTING_PLATFORMS = {
  pc: 'PC',
  ps: 'PlayStation',
  xbox: 'Xbox',
  switch2: 'Nintendo Switch 2',
};

export const BANNER_WIDTH = 1200;
export const BANNER_HEIGHT = 400;

export function settingPlatformLabel(platforms) {
  return platforms.length ? platforms.map((key) => SETTING_PLATFORMS[key]).filter(Boolean).join(' · ') : 'Alle Plattformen';
}
