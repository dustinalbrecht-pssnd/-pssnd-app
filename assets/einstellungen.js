import { el, head, html, modal, serverGet, toast } from './app.js';
import { SETTING_PLATFORMS, settingPlatformLabel } from './mw4-inhalte.js';
import { settingsImageExport } from './einstellungen-bild.js?v=mw4-katalog-20261125';

const MENU_NAMES = {
  favorites: 'Schnelleinstellungen',
  controller: 'Controller',
  'mouse-keyboard': 'Tastatur & Maus',
  'graphics-display': 'Grafik',
  audio: 'Audio',
  'interface-hud': 'Interface',
  'account-network': 'Konto & Netzwerk',
};

const MENU_TABS = {
  controller: ['Controller', 'Zielen', 'Bewegung', 'Kampf'],
  'mouse-keyboard': ['Maus', 'Tastenbelegung', 'Bewegung', 'Kampf'],
  'graphics-display': ['Anzeige', 'Qualität', 'Ansicht', 'Benchmark'],
  audio: ['Audio', 'Sprach-Chat'],
  'interface-hud': ['Global', 'Lesbarkeit', 'Gameplay-HUD'],
};

let settings;
let activeMenu = 'controller';
let activeTab = 'Controller';
let currentExport = [];
let menuExport = [];
let tabButtons = '';
let exportJob;
let loading;

const menuIdFor = (id) => id === 'accessibility' ? 'interface-hud' : id;
const hasValue = (entry) => Boolean(entry.value || entry.values || entry.recommendation || entry.description);
const searchable = (value) => value.toLocaleLowerCase('de').normalize('NFD').replace(/\p{M}/gu, '').replaceAll('ß', 'ss');

function createSettings(catalog) {
  const menus = new Map(Object.entries(MENU_NAMES).map(([id, de]) => [id, { id, de, groups: [] }]));
  const names = new Map((catalog.categories || []).map(({ id, de }) => [id, de]));
  const entries = new Map((catalog.entries || []).map((entry) => [entry.id, entry]));

  function findMenu(categoryId) {
    const id = menuIdFor(categoryId);
    if (!menus.has(id)) menus.set(id, { id, de: names.get(categoryId) || 'Eigene Einstellungen', groups: [] });
    return menus.get(id);
  }

  for (const { id, sections } of catalog.templates || []) {
    const menu = findMenu(id);
    menu.groups.push(...sections.map((section) => ({
      name: section.name,
      tab: section.tab || MENU_TABS[menu.id]?.[0] || '',
      collapsed: section.collapsed,
      entries: section.fields.map((field) => {
        const saved = entries.get(field.id);
        entries.delete(field.id);
        return { ...saved, ...field, categoryId: id, section: section.name };
      }),
    })));
  }

  // Published custom entries and earlier catalogues can still be read with the new menu.
  for (const entry of entries.values()) {
    const menu = findMenu(entry.categoryId);
    const tab = entry.tab || MENU_TABS[menu.id]?.[0] || '';
    const name = entry.section || 'Weitere Einstellungen';
    let group = menu.groups.find((item) => item.name === name && item.tab === tab);
    if (!group) {
      group = { name, tab, entries: [] };
      menu.groups.push(group);
    }
    group.entries.push(entry);
  }

  const labels = Array.from(new Set(Array.from(menus.values()).flatMap(({ groups }) =>
    groups.flatMap(({ entries }) => entries.map(({ categoryId }) => categoryId)))),
    (id) => ({ id, de: menus.get(menuIdFor(id))?.de || names.get(id) }));
  return { menus, labels };
}

function tabsFor(menu) {
  const found = menu.groups.map(({ tab }) => tab).filter(Boolean);
  // Earlier workers provide published values without a structured catalogue.
  const expected = menu.groups.some(({ tab }) => tab) ? MENU_TABS[menu.id] || [] : [];
  return Array.from(new Set([...expected, ...found]));
}

export async function showGameSettings() {
  if (!el('gameSettingsList')) return;
  if (settings) return renderGameSettings();
  if (loading) return loading;
  const status = el('gameSettingsStatus');
  status.textContent = 'Einstellungen werden geladen …';
  loading = (async () => {
    try {
      settings = createSettings(await serverGet('/api/game-settings'));
      el('settingsMenuNav').innerHTML = Array.from(settings.menus.values(), ({ id, de }) =>
        `<button type="button" data-settings-menu="${html(id)}" aria-pressed="false">${html(de)}</button>`).join('');
      el('settingsPlatform').insertAdjacentHTML('beforeend', Object.entries(SETTING_PLATFORMS).map(
        ([id, label]) => '<option value="' + html(id) + '">' + html(label) + '</option>',
      ).join(''));
      activeTab = tabsFor(settings.menus.get(activeMenu))[0] || '';
      renderGameSettings();
    } catch {
      settings = null;
      status.innerHTML = 'Einstellungen sind gerade nicht erreichbar. <button type="button" class="text-action" id="retryGameSettings">Erneut laden</button>';
    } finally {
      loading = null;
    }
  })();
  return loading;
}

function renderNavigation(menu, searching) {
  for (const button of el('settingsMenuNav').querySelectorAll('button')) {
    button.setAttribute('aria-pressed', String(!searching && button.dataset.settingsMenu === activeMenu));
  }
  const tabs = tabsFor(menu);
  const container = el('settingsTabs');
  container.hidden = searching || !tabs.length;
  const htmlButtons = tabs.map((tab) =>
    `<button type="button" data-settings-tab="${html(tab)}" aria-pressed="false">${html(tab)}</button>`).join('');
  if (tabButtons !== htmlButtons) {
    container.innerHTML = htmlButtons;
    tabButtons = htmlButtons;
  }
  for (const button of container.querySelectorAll('button')) {
    button.setAttribute('aria-pressed', String(button.dataset.settingsTab === activeTab));
  }
}

function renderRow(entry, children = []) {
  const value = entry.value ? html(entry.value) : 'Kein Wert hinterlegt';
  const label = entry.favorite ? '<span class="settings-star" aria-label="Favorit">★</span>' : '';
  const info = [
    entry.en && entry.en !== entry.de ? `<p lang="en">${html(entry.en)}</p>` : '',
    entry.platforms?.length ? `<p>${html(settingPlatformLabel(entry.platforms))}</p>` : '',
    entry.options?.length || entry.values ?
      `<p><strong>Mögliche Werte</strong> ${html(entry.values || entry.options.join(' · '))}</p>` : '',
    entry.recommendation ? `<p><strong>Empfehlung</strong> ${html(entry.recommendation)}</p>` : '',
    entry.description ? `<p>${html(entry.description)}</p>` : '',
  ].join('');
  return `<article class="settings-menu-row" data-setting-id="${html(entry.id)}">
    <details>
      <summary>
        <span class="settings-row-name">${label}${html(entry.de)}</span>
        <span class="settings-row-value${entry.value ? '' : ' empty-value'}">${value}</span>
        <span class="settings-chevron" aria-hidden="true"></span>
      </summary>
      <div class="settings-row-details">
        ${info}
        ${children.length ? `<div class="settings-nested-rows">${children.map((child) => renderRow(child)).join('')}</div>` : ''}
        ${hasValue(entry) ? `<button type="button" class="ghost-btn" data-save-setting="${html(entry.id)}">Einstellung als Bild</button>` : ''}
      </div>
    </details>
  </article>`;
}

function renderGroup(group, richHeading) {
  const ids = new Set(group.entries.map(({ id }) => id));
  const children = new Map();
  const visible = [];
  for (const entry of group.entries) {
    if (entry.parentId && ids.has(entry.parentId)) {
      if (!children.has(entry.parentId)) children.set(entry.parentId, []);
      children.get(entry.parentId).push(entry);
    } else {
      visible.push(entry);
    }
  }
  const rows = visible.map((entry) => renderRow(entry, children.get(entry.id))).join('');
  const title = richHeading ? new Set([group.menu.de, group.tab, group.name].filter(Boolean)) : [group.name];
  const heading = html(Array.from(title).join(' › '));
  return group.collapsed && !richHeading
    ? `<details class="settings-option-section"><summary>${heading}<span class="settings-chevron" aria-hidden="true"></span></summary><div>${rows}</div></details>`
    : `<section class="settings-option-section"><h3>${heading}</h3><div>${rows}</div></section>`;
}

function renderGameSettings() {
  if (!settings || !el('gameSettingsList')) return;
  const menu = settings.menus.get(activeMenu);
  const query = searchable(el('settingsSearch').value.trim()).split(/\s+/).filter(Boolean);
  const searching = query.length > 0;
  const quick = !searching && menu.id === 'favorites';
  const platform = el('settingsPlatform').value;
  const includeEmpty = el('settingsShowEmpty').checked;
  const sourceMenus = searching || quick ? Array.from(settings.menus.values()) : [menu];
  const platformMatches = (entry) => !platform || !entry.platforms?.length || entry.platforms.includes(platform);
  menuExport = menu.groups.flatMap(({ entries, tab }) => entries.filter((entry) => hasValue(entry) && platformMatches(entry))
    .map((entry) => ({ ...entry, tab })));
  const groups = sourceMenus.flatMap((sourceMenu) => sourceMenu.groups.map((group) => {
    if (!searching && !quick && activeTab && group.tab !== activeTab) return null;
    const entries = group.entries.filter((entry) => {
      if ((!includeEmpty && !hasValue(entry)) || (quick && !entry.favorite) || !platformMatches(entry)) return false;
      if (!searching) return true;
      const text = searchable([sourceMenu.de, group.tab, group.name, entry.de, entry.en, entry.value,
        entry.values, entry.recommendation, entry.description, entry.options?.join(' ')].join(' '));
      return query.every((word) => text.includes(word));
    });
    return entries.length ? { ...group, menu: sourceMenu, entries } : null;
  })).filter(Boolean);
  const visible = groups.flatMap(({ entries, tab }) => entries.map((entry) => ({ ...entry, tab })));
  currentExport = visible.filter(hasValue);
  renderNavigation(menu, searching);
  el('settingsViewTitle').textContent = searching ? 'Suchergebnisse' : activeTab || menu.de;
  el('saveGameSettings').disabled = !currentExport.length;
  el('saveSettingsMenu').hidden = searching || quick || !tabsFor(menu).length || !menuExport.length;
  el('saveSettingsMenu').disabled = !menuExport.length;
  el('gameSettingsStatus').textContent = visible.length ? visible.length + (visible.length === 1 ? ' Einstellung' : ' Einstellungen') : '';

  const empty = searching ? 'Keine passenden Einstellungen gefunden.' :
    quick ? 'Sterne im Adminbereich legen die Schnelleinstellungen fest.' :
    activeTab === 'Benchmark' ? 'Den Benchmark startest du im Spiel unter Grafik → Benchmark.' :
    'Für diese Auswahl sind noch keine Werte hinterlegt.';
  el('gameSettingsList').innerHTML = groups.length ? groups.map((group) => renderGroup(group, searching || quick)).join('') :
    `<p class="settings-empty">${html(empty)}</p>`;
}

async function downloadSettings(index) {
  try {
    await exportJob.download(index);
    toast('Bild gespeichert ✓');
  } catch (error) {
    toast(error.message);
  }
}

function exportSettings(entries) {
  if (!entries.length) return;
  exportJob = settingsImageExport(entries.map((entry) => ({
    ...entry,
    section: Array.from(new Set([entry.tab, entry.section].filter(Boolean))).join(' · '),
  })), settings.labels);
  if (exportJob.count === 1) return downloadSettings(0);
  modal(head('MW4-Einstellungen als Bild', 'Wähle eine Bildseite zum Speichern.') +
    '<div class="settings-export-pages">' +
    Array.from({ length: exportJob.count }, (_, i) =>
      '<button type="button" class="ghost-btn" data-settings-page="' + i + '">Bild ' + (i + 1) + ' speichern ↓</button>').join('') + '</div>');
}

document.addEventListener('input', (event) => {
  if (event.target.id === 'settingsSearch') renderGameSettings();
});

document.addEventListener('change', (event) => {
  if (['settingsPlatform', 'settingsShowEmpty'].includes(event.target.id)) renderGameSettings();
});

document.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.id === 'retryGameSettings') showGameSettings();
  const { settingsMenu, settingsTab, settingsPage, saveSetting } = button.dataset;
  if (settingsMenu && settings?.menus.has(settingsMenu)) {
    activeMenu = settingsMenu;
    activeTab = tabsFor(settings.menus.get(activeMenu))[0] || '';
    el('settingsSearch').value = '';
    renderGameSettings();
  }
  if (settingsTab) {
    activeTab = settingsTab;
    renderGameSettings();
  }
  if (settingsPage !== undefined && exportJob) downloadSettings(Number(settingsPage));
  if (button.id === 'saveGameSettings') exportSettings(currentExport);
  if (button.id === 'saveSettingsMenu') exportSettings(menuExport);
  if (saveSetting) exportSettings(currentExport.filter(({ id }) => id === saveSetting));
});
