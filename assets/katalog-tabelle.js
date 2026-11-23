import { attachmentNames, isRetiredAttachment } from './katalog-abgleich.js';

export const columns = [
  'Waffe',
  'Waffenklasse',
  'Kategorie',
  'Deutsch',
  'Englisch',
  'Aktion',
  'Waffen-ID',
  'Aufsatz-ID',
];
const fields = ['weapon', 'cls', 'slot', 'de', 'en', 'action', 'weaponId', 'partId'];
const clean = (value) => String(value ?? '').trim();
const key = (value) => clean(value).normalize('NFKC').toLocaleLowerCase('de-DE');
const partKey = (slot, name) => JSON.stringify([slot, key(name)]);

function valuesByLabel(labels, aliases) {
  const keys = new Map(Object.entries(aliases));
  for (const [id, label] of Object.entries(labels)) {
    for (const value of [id, label, ...label.split(' · ')]) keys.set(key(value), id);
  }
  return keys;
}

export function catalogTable(data, classes, slots) {
  const parts = new Map(
    data.attachments.filter((part) => !isRetiredAttachment(part.id)).map((part) => [part.id, part]),
  );
  const rows = [columns];
  const assigned = new Set();
  const add = (weapon, part) => {
    const names = part ? attachmentNames(part) : {};
    rows.push([
      weapon?.name || '',
      classes[weapon?.cls] || weapon?.cls || '',
      slots[part?.slot] || part?.slot || '',
      names.de || '',
      names.en || '',
      weapon && part ? 'Zuordnen' : '',
      weapon?.id || '',
      part?.id || '',
    ]);
  };
  for (const weapon of data.weapons) {
    const list = [...new Set(weapon.attachmentIds || [])].map((id) => parts.get(id)).filter(Boolean);
    if (!list.length) add(weapon);
    for (const part of list) {
      assigned.add(part.id);
      add(weapon, part);
    }
  }
  for (const part of parts.values()) if (!assigned.has(part.id)) add(null, part);
  return rows;
}

export function planTable(rows, data, classes, slots) {
  const problems = [];
  const changes = [];
  const newWeapons = new Map();
  const plannedParts = new Map();
  const result = () => ({
    problems,
    changes,
    newWeapons: [...newWeapons.values()],
    parts: [...plannedParts.values()].filter((part) => part.changed),
  });
  if (!Array.isArray(data?.weapons) || !Array.isArray(data?.attachments)) {
    problems.push('Der Server liefert gerade keinen Waffen- und Aufsatzkatalog.');
    return result();
  }
  const headerAt = rows.findIndex((row) => row.some((cell) => clean(cell)));
  if (headerAt < 0) {
    problems.push('Die Tabelle ist leer.');
    return result();
  }
  const header = rows[headerAt].map(key);
  const indices = columns.map((title) => header.indexOf(key(title)));
  if (
    indices.filter((i) => i >= 0).length < 2 ||
    columns.some((title) => header.indexOf(key(title)) !== header.lastIndexOf(key(title)))
  ) {
    problems.push(
      'Verwende die Spaltenüberschriften aus der heruntergeladenen Katalogtabelle. Jede Überschrift darf nur einmal vorkommen.',
    );
    return result();
  }
  if (rows.slice(headerAt + 1).every((row) => indices.every((i) => !clean(row[i])))) {
    problems.push('Unter den Spaltenüberschriften stehen noch keine Katalogzeilen.');
    return result();
  }
  const classByLabel = valuesByLabel(classes, {
    assault: 'ar',
    'assault rifle': 'ar',
    'marksman rifle': 'marksman',
    scharfschützengewehr: 'sniper',
  });
  const slotByLabel = valuesByLabel(slots, {
    'rear grip': 'grip',
    ammunition: 'ammo',
    'trigger action': 'trigger',
  });
  const weapons = new Map(data.weapons.map((weapon) => [weapon.id, weapon]));
  const weaponNames = new Map();
  const parts = new Map(data.attachments.map((part) => [part.id, part]));
  const namedParts = new Map();
  const linkedWeapons = new Map();
  for (const weapon of data.weapons) {
    const names = weaponNames.get(key(weapon.name)) || [];
    names.push(weapon);
    weaponNames.set(key(weapon.name), names);
    for (const id of new Set(weapon.attachmentIds || [])) {
      const linked = linkedWeapons.get(id) || [];
      linked.push(weapon.id);
      linkedWeapons.set(id, linked);
    }
  }
  for (const part of data.attachments) {
    if (isRetiredAttachment(part.id)) continue;
    const names = attachmentNames(part);
    for (const name of [part.name, part.de, part.en, names.de, names.en].filter(Boolean)) {
      const id = partKey(part.slot, name);
      const matches = namedParts.get(id) || new Set();
      matches.add(part.id);
      namedParts.set(id, matches);
    }
  }

  function resolveWeapon(row) {
    if (!row.weapon && !row.weaponId) {
      if (row.cls) throw Error('Zur Waffenklasse fehlt die Waffe.');
      return null;
    }
    const cls = classByLabel.get(key(row.cls));
    if (row.cls && !cls) throw Error(`Unbekannte Waffenklasse „${row.cls}“.`);
    const id = row.weaponId;
    const matches = weaponNames.get(key(row.weapon)) || [];
    if (!id && matches.length > 1)
      throw Error(`„${row.weapon}“ ist mehrdeutig. Trage die Waffen-ID ein.`);
    const existing = id ? weapons.get(id) : matches[0];
    if (id && !existing)
      throw Error(`Unbekannte Waffen-ID „${id}“. Lass sie bei einer neuen Waffe leer.`);
    if (existing) {
      if (row.weapon && key(row.weapon) !== key(existing.name)) {
        throw Error(`Die Waffen-ID gehört zu „${existing.name}“. Prüfe Waffe und Waffen-ID.`);
      }
      if (cls && cls !== existing.cls)
        throw Error(`„${existing.name}“ hat die Klasse „${classes[existing.cls] || existing.cls}“.`);
      return { id: existing.id, name: existing.name, active: existing.active !== false };
    }
    if (row.weapon.length > 80 || !cls)
      throw Error(
        'Für eine neue Waffe sind ein Name mit höchstens 80 Zeichen und die Waffenklasse erforderlich.',
      );
    const newKey = key(row.weapon);
    const planned = newWeapons.get(newKey);
    if (planned && planned.cls !== cls)
      throw Error(`Für „${row.weapon}“ sind zwei verschiedene Waffenklassen angegeben.`);
    if (planned) return planned;
    const candidate = { id: '', name: row.weapon, cls, active: true };
    newWeapons.set(newKey, candidate);
    return candidate;
  }

  function resolvePart(row, line, removing) {
    if (!row.partId && !row.de && !row.en && !row.slot) return null;
    const slot = slotByLabel.get(key(row.slot));
    if (row.slot && !slot) throw Error(`Unbekannte Aufsatz-Kategorie „${row.slot}“.`);
    if (!row.partId && !slot) throw Error('Trage die Aufsatz-ID oder die passende Kategorie ein.');
    if (row.de.length > 80 || row.en.length > 80)
      throw Error('Aufsatznamen dürfen höchstens 80 Zeichen haben.');
    let existing = parts.get(row.partId);
    if (row.partId && !existing)
      throw Error(`Unbekannte Aufsatz-ID „${row.partId}“. Lass sie bei einem neuen Aufsatz leer.`);
    if (!existing) {
      const matches = new Set([
        ...(namedParts.get(partKey(slot, row.en)) || []),
        ...(namedParts.get(partKey(slot, row.de)) || []),
      ]);
      if (matches.size > 1) throw Error('Der Aufsatzname ist mehrdeutig. Trage die Aufsatz-ID ein.');
      if (matches.size) existing = parts.get([...matches][0]);
    }
    if (existing) {
      if (slot && slot !== existing.slot) {
        throw Error(
          `„${attachmentNames(existing).en}“ gehört zur Kategorie „${slots[existing.slot] || existing.slot}“.`,
        );
      }
      if (isRetiredAttachment(existing.id) && !removing) {
        throw Error(
          'Diese Aufsatz-ID ist ein älterer Doppeleintrag. Verwende die ID aus einer aktuellen Katalogtabelle.',
        );
      }
    } else if (!row.de || !row.en || removing) {
      throw Error(
        removing
          ? 'Zum Lösen einer Zuordnung muss der Aufsatz im Katalog stehen.'
          : 'Für einen neuen Aufsatz sind der deutsche und der englische Name erforderlich.',
      );
    }

    const id = existing ? existing.id : partKey(slot, row.en);
    let part = plannedParts.get(id);
    if (!part) {
      const before = existing ? attachmentNames(existing) : { de: '', en: '' };
      part = {
        existing,
        slot: existing?.slot || slot,
        before,
        names: { ...before },
        input: {},
        line,
        relations: new Map(),
        changed: false,
      };
      plannedParts.set(id, part);
    }
    if (!removing) {
      for (const [lang, label] of [
        ['de', 'Deutsch'],
        ['en', 'Englisch'],
      ]) {
        const value = row[lang];
        if (!value) continue;
        if (part.input[lang] && part.input[lang].value !== value) {
          throw Error(
            `Die Spalte ${label} weicht für denselben Aufsatz von Zeile ${part.input[lang].line} ab.`,
          );
        }
        part.input[lang] = { value, line };
        part.names[lang] = value;
      }
    }
    return part;
  }

  for (let i = headerAt + 1; i < rows.length; i++) {
    const row = Object.fromEntries(fields.map((field, col) => [field, clean(rows[i][indices[col]])]));
    if (Object.values(row).every((value) => !value)) continue;
    const removing = ['entfernen', 'zuordnung lösen', 'remove'].includes(key(row.action));
    try {
      if (row.action && !removing && !['zuordnen', 'add'].includes(key(row.action))) {
        throw Error('Als Aktion sind „Zuordnen“ und „Entfernen“ möglich.');
      }
      const weapon = resolveWeapon(row);
      const part = resolvePart(row, i + 1, removing);
      if (!weapon && !part) throw Error('Es fehlt die Waffe oder der Aufsatz.');
      if (removing && (!weapon?.id || !part?.existing)) {
        throw Error(
          'Zum Lösen einer Zuordnung müssen eine bestehende Waffe und ein bestehender Aufsatz angegeben sein.',
        );
      }
      if (weapon && part) {
        const id = weapon.id || key(weapon.name);
        const planned = part.relations.get(id);
        if (planned && planned.removing !== removing)
          throw Error(`Die Aktion widerspricht Zeile ${planned.line}.`);
        part.relations.set(id, { weapon, removing, line: i + 1 });
      }
    } catch (error) {
      problems.push(`Zeile ${i + 1}: ${error.message}`);
    }
  }

  for (const weapon of newWeapons.values())
    changes.push(['Neue Waffe', weapon.name, classes[weapon.cls]]);
  for (const part of plannedParts.values()) {
    const { before, names, existing, relations, slot } = part;
    const translated = names.de === names.en ? names.de : `${names.de} · ${names.en}`;
    const matchingName = attachmentsForName(namedParts, slot, names.en, existing?.id);
    if ((!existing || names.en !== before.en) && matchingName) {
      problems.push(
        `Zeile ${part.line}: Der englische Name „${names.en}“ gehört bereits zu einem Aufsatz dieser Kategorie.`,
      );
    }
    part.nameChanged = !!existing && (names.de !== before.de || names.en !== before.en);
    if (!existing) changes.push(['Neuer Aufsatz', slots[slot] || slot, translated]);
    if (part.nameChanged) {
      const effective = attachmentNames({ ...existing, ...names });
      if (effective.de !== names.de || effective.en !== names.en) {
        problems.push(
          `Zeile ${part.line}: Der gewählte Name ist ein früherer Katalogname. Aktuell lautet der Name „${effective.de}“ / „${effective.en}“.`,
        );
      }
      const values = ['de', 'en']
        .filter((lang) => before[lang] !== names[lang])
        .map((lang) => `${before[lang]} → ${names[lang]}`);
      changes.push(['Name ändern', slots[slot] || slot, values.join('\n')]);
    }
    const prior = new Set(linkedWeapons.get(existing?.id) || []);
    part.links = new Map([...prior].map((id) => [id, { id, name: weapons.get(id)?.name }]));
    for (const [id, { weapon, removing }] of relations) {
      if (removing && part.links.delete(id)) {
        changes.push(['Zuordnung lösen', weapon.name, translated]);
        part.changed = true;
      } else if (!removing && !part.links.has(id)) {
        part.links.set(id, weapon);
        changes.push([
          'Zuordnen',
          weapon.name,
          translated + (weapon.active === false || existing?.active === false ? ' (ausgeblendet)' : ''),
        ]);
        part.changed = true;
      }
    }
    part.changed ||= !existing || part.nameChanged;
  }
  return result();
}

function attachmentsForName(namedParts, slot, name, excludeId) {
  return [...(namedParts.get(partKey(slot, name)) || [])].some((id) => id !== excludeId);
}
