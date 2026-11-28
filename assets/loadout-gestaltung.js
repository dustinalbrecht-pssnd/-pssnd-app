import { BY, MODE } from './katalog.js';
import { weaponNames } from './katalog-abgleich.js';
import { WEAPON_DISTANCES, weaponProfile } from './waffenprofil.js';
import { weaponSkin } from './waffenskin-katalog.js';

export const LOADOUT_TITLE_LENGTH = 90;

export function ownLoadoutTitle(loadout) {
  return typeof loadout?.customTitle === 'string'
    ? loadout.customTitle.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, LOADOUT_TITLE_LENGTH)
    : '';
}

export function loadoutWeapons(loadout, selectedId) {
  const slots = ['primary', 'secondary'].includes(loadout.setupType)
    ? [loadout.setupType] : ['primary', 'secondary'];
  const matching = slots.filter(slot => BY[loadout[slot]] && (!selectedId || selectedId === loadout[slot]));
  return (selectedId ? matching.slice(0, 1) : matching)
    .map(slot => ({
      slot,
      id: loadout[slot],
      weapon: BY[loadout[slot]],
      skin: weaponSkin(loadout, slot),
    }));
}

export function generatedLoadoutTitle(loadout, selectedId, language = 'de') {
  const weapons = loadoutWeapons(loadout, selectedId);
  const title = weapons.map(({ weapon }) => weaponNames(weapon)[language]).join(' / ');
  const distance = weapons.map(({ id }) => WEAPON_DISTANCES[weaponProfile(loadout, id).distance]).find(Boolean);
  return [title || 'Loadout', distance || (!selectedId ? MODE[loadout.mode] : '')].filter(Boolean).join(' · ');
}

export function loadoutDisplayTitle(loadout, selectedId, language = 'de') {
  return ownLoadoutTitle(loadout) ||
    (!selectedId && typeof loadout.title === 'string' && loadout.title.trim()) ||
    generatedLoadoutTitle(loadout, selectedId, language);
}

export function authorInitials(name) {
  const display = (typeof name === 'string' ? name : '').normalize('NFKC').trim() || 'Community';
  const words = display.match(/[\p{L}\p{N}]+/gu) || [display];
  const initials = words.length > 1
    ? Array.from(words[0])[0] + Array.from(words[1])[0]
    : Array.from(words[0]).slice(0, 2).join('');
  let hash = 2166136261;
  for (const char of display.toLocaleLowerCase('de-DE')) {
    hash = Math.imul(hash ^ char.codePointAt(0), 16777619);
  }
  return { initials: Array.from(initials.toLocaleUpperCase('de-DE')).slice(0, 2).join(''), hue: (hash >>> 0) % 360 };
}
