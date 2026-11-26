export const SEO_PAGES = {
  feed: {
    label: 'Ranking', path: '/ranking/',
    title: 'eUpdateGaming – MW4 Loadouts, Ranking & Waffencheck',
    description: 'Entdecke MW4-Loadouts der Community für Warzone, Multiplayer, Ranked und DMZ. Filtere nach Waffe, Season und Distanz oder prüfe deinen eigenen Build.',
  },
  builder: {
    label: 'Bauen', path: '/Bauen/',
    title: 'MW4 Loadout bauen und prüfen – eUpdateGaming',
    description: 'Baue dein Modern Warfare 4 Loadout mit Primärwaffe, Sekundärwaffe und Aufsätzen. Vergleiche deinen Build im Waffencheck und speichere ihn als Bild.',
  },
  attachments: {
    label: 'Aufsätze', path: '/Aufsaetze/',
    title: 'MW4 Waffenaufsätze auswählen – eUpdateGaming',
    description: 'Wähle passende Aufsätze für deine Modern Warfare 4 Waffe und deinen Spielmodus. Sieh, welche Aufsatzplätze belegt und welche Kombinationen verfügbar sind.',
  },
  settings: {
    label: 'Einstellungen', path: '/Einstellungen/',
    title: 'MW4 Einstellungen für Controller, Maus und Grafik – eUpdateGaming',
    description: 'Finde veröffentlichte Einstellungen für Modern Warfare 4, von Stick-Empfindlichkeit und Totzonen bis zu Grafik, Audio und HUD. Speichere deine Auswahl als Bild.',
  },
  events: {
    label: 'News', path: '/News/',
    title: 'Call of Duty News und Events – eUpdateGaming',
    description: 'Lies Aktuelles zu Modern Warfare 4, Warzone und Call of Duty Events. Die Meldungen verlinken ihre Originalquellen.',
  },
};

export function seoForPage(view, config) {
  const page = Object.hasOwn(SEO_PAGES, view) && SEO_PAGES[view];
  if (!page) return null;
  const saved = config?.seoPages?.[view];
  return {
    ...page,
    title: saved?.title || page.title,
    description: saved?.description || page.description,
  };
}

export function applyPageSeo(doc, view, config) {
  const page = seoForPage(view, config);
  if (!page) return;
  doc.title = page.title;
  for (const [attribute, key, value] of [
    ['name', 'description', page.description],
    ['property', 'og:title', page.title],
    ['property', 'og:description', page.description],
  ]) {
    let tag = doc.head.querySelector('meta[' + attribute + '="' + key + '"]');
    if (!tag) {
      tag = doc.createElement('meta');
      tag.setAttribute(attribute, key);
      doc.head.append(tag);
    }
    tag.setAttribute('content', value);
  }
  return true;
}
