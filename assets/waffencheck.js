import { weaponSeason } from './season.js';
import { weaponProfile } from './waffenprofil.js';

function supportWeight(likes) {
  const count = Number(likes);
  return count > 0 && Number.isFinite(count) ? 1 + count / (count + 10) : 1;
}

function addObservation(tallies, key, weight, data) {
  const previous = tallies.get(key);
  if (previous) {
    previous.count += 1;
    previous.weight += weight;
  } else {
    tallies.set(key, { ...data, count: 1, weight });
  }
}

export function weaponCheck(loadouts, target, currentParts, resolveParts, canApply) {
  const combinations = new Map();
  const bySlot = new Map();
  const counted = new Set();
  for (const build of loadouts) {
    const key = build.kind + ':' + build.id;
    if (
      counted.has(key) || build.game !== target.game || build.mode !== target.mode ||
      (build.primary !== target.weaponId && build.secondary !== target.weaponId) ||
      weaponSeason(build, target.weaponId) !== target.season ||
      weaponProfile(build, target.weaponId).distance !== target.distance
    ) continue;
    const parts = resolveParts((build.attachments || build.parts || {})[target.weaponId], build);
    if (!parts?.length) continue;
    counted.add(key);
    const weight = supportWeight(build.likes);
    const signature = JSON.stringify(parts.map(({ slot, id }) => [slot, id]).sort());
    addObservation(combinations, signature, weight, { parts });
    for (const part of parts) {
      if (!bySlot.has(part.slot)) bySlot.set(part.slot, new Map());
      addObservation(bySlot.get(part.slot), part.id, weight, { part });
    }
  }

  const compare = (a, b) => b.weight - a.weight || b.count - a.count;
  const leadingCombination = [...combinations.values()].sort(compare)[0];
  const leadingIds = new Set(leadingCombination?.parts.map(({ id }) => id));
  const current = new Map(currentParts.map(part => [part.slot, part]));
  const suggestions = [];
  for (const [slot, tallies] of bySlot) {
    const existing = current.get(slot);
    const baseline = tallies.get(existing?.id);
    const choices = [...tallies.values()].sort(compare);
    const best = choices.find(({ part, weight }) =>
      weight > (baseline?.weight ?? 0) && part.id !== existing?.id && canApply(part));
    if (!best) continue;
    suggestions.push({
      part: best.part, count: best.count, current: existing, currentCount: baseline?.count ?? 0,
      advantage: best.weight - (baseline?.weight ?? 0), inLeadingCombination: leadingIds.has(best.part.id),
    });
  }
  suggestions.sort((a, b) => b.advantage - a.advantage ||
    Number(b.inLeadingCombination) - Number(a.inLeadingCombination) || b.count - a.count);
  return { count: counted.size, combination: leadingCombination, suggestions: suggestions.slice(0, 3) };
}
