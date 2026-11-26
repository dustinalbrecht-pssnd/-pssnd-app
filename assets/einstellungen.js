import { el, html, serverGet } from './app.js';
import { settingsImageExport } from './einstellungen-bild.js?v=mw4-community-20261126';
import { settingExplanation } from './einstellungen-hilfe.js';
import { COPY, MENUS, PC_SOURCES, PERSONAL_FIELDS, groupName, settingValue } from './einstellungen-texte.js';

const HARDWARE_KEY = 'eupdate_mw4_hardware_v1';
const LANGUAGE_KEY = 'eupdate_mw4_language_v1';
const ICONS = {
  controller: '<path d="M7.5 8h9c2.4 0 3.7 2.1 4.4 4.4l.7 2.7c.6 2.4-1.6 3.8-3.3 2.5L15 15H9l-3.3 2.6c-1.7 1.3-3.9-.1-3.3-2.5l.7-2.7C3.8 10.1 5.1 8 7.5 8Z"/><path d="M7.7 10.2v4m-2-2h4m6.1-.4h.1m2 1.6h.1"/>',
  'mouse-keyboard': '<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M6 10h.2m3 0h.2m3 0h.2m3 0h.2m3 0h.2M6 14h.2M10 14h4m4 0h.2"/>',
  'graphics-display': '<rect x="3" y="4" width="18" height="13" rx="2.2"/><path d="M12 17v4m-4 0h8"/>',
  audio: '<path d="M3 14v-3a9 9 0 0 1 18 0v3"/><rect x="3" y="12" width="5" height="7.5" rx="2"/><rect x="16" y="12" width="5" height="7.5" rx="2"/>',
  'interface-hud': '<rect x="3" y="4" width="18" height="16" rx="2.2"/><path d="M3 9h18M9 9v11m4-7h4m-4 3h3"/>',
};
const CHEVRON = '<span class="settings-chevron" aria-hidden="true"></span>';
const categoryFor = (id) => id === 'accessibility' ? 'interface-hud' : id;
const searchable = (value) => value.toLocaleLowerCase('de').normalize('NFD').replace(/\p{M}/gu, '').replaceAll('ß', 'ss');

let language = 'de';
let copy = COPY.de;
let germanCopy = {};
let hardware = {};
let hardwarePersisted = true;
let settings;
let loading;
let bound = false;
let activeMenu = 'controller';
let activeTab = 'Controller';
let visibleEntries = [];
let navigationMarkup = '';
let tabMarkup = '';
let exportScopes = new Map();
let exportJob;
let exporting = false;

function personalField(id) {
  return Object.hasOwn(PERSONAL_FIELDS, id) ? PERSONAL_FIELDS[id] : undefined;
}

function restorePreferences() {
  try {
    if (localStorage.getItem(LANGUAGE_KEY) === 'en') language = 'en';
    const saved = JSON.parse(localStorage.getItem(HARDWARE_KEY) || '{}');
    hardware = Object.fromEntries(Object.keys(PERSONAL_FIELDS)
      .filter((id) => typeof saved?.[id] === 'string')
      .map((id) => [id, saved[id].slice(0, 120)]));
  } catch {
    hardwarePersisted = false;
  }
}

function createSettings(catalog) {
  const menus = new Map(Object.entries(MENUS).map(([id, menu]) => [id, { ...menu, id, groups: [] }]));
  const categories = new Map((catalog.categories || []).map((category) => [category.id, category]));
  const published = new Map((catalog.entries || []).map((entry) => [entry.id, entry]));

  function menuFor(categoryId) {
    if (categoryId === 'account-network') return null;
    const id = categoryFor(categoryId);
    if (!menus.has(id)) {
      const category = categories.get(id);
      menus.set(id, { id, de: category?.de || 'Weitere Einstellungen', en: category?.en || 'More Settings', tabs: [], groups: [] });
    }
    return menus.get(id);
  }

  for (const { id, sections } of catalog.templates || []) {
    const menu = menuFor(id);
    if (!menu) continue;
    for (const { name, tab, collapsed, fields } of sections) {
      const submenu = tab || menu.tabs[0] || '';
      const entries = fields.map((field) => {
        const saved = published.get(field.id);
        published.delete(field.id);
        return { ...saved, ...field, categoryId: menu.id, section: name, tab: submenu };
      });
      menu.groups.push({ name, tab: submenu, collapsed, entries });
    }
  }

  for (const entry of published.values()) {
    const menu = menuFor(entry.categoryId);
    if (!menu) continue;
    const tab = entry.tab || menu.tabs[0] || '';
    const name = entry.section || 'Weitere Einstellungen';
    let group = menu.groups.find((item) => item.name === name && item.tab === tab);
    if (!group) {
      group = { name, tab, entries: [] };
      menu.groups.push(group);
    }
    group.entries.push({ ...entry, categoryId: menu.id, section: name, tab });
  }
  return menus;
}

function menuName(menu) {
  return menu[language] || menu.de;
}

function tabsFor(menu) {
  const found = menu.groups.map(({ tab }) => tab).filter(Boolean);
  return [...new Set([...(found.length ? menu.tabs : []), ...found])];
}

export function applyGameSettingsCopy(config) {
  if (!el('gameSettingsHeading')) return;
  germanCopy = { title: config.gameSettingsTitle, intro: config.gameSettingsSubtitle };
  renderHeading();
}

function renderHeading() {
  el('gameSettingsHeading').textContent = (language === 'de' && germanCopy.title) || copy.title;
  el('gameSettingsIntro').textContent = (language === 'de' && germanCopy.intro) || copy.intro;
}

function renderLanguage() {
  copy = COPY[language];
  const view = el('view-settings');
  view.lang = language;
  renderHeading();
  el('settingsLanguage').setAttribute('aria-label', copy.language);
  for (const button of view.querySelectorAll('[data-settings-language]')) {
    button.setAttribute('aria-pressed', String(button.dataset.settingsLanguage === language));
  }
  el('settingsMenuNav').setAttribute('aria-label', copy.menus);
  el('settingsTabs').setAttribute('aria-label', copy.tabs);
  el('settingsSearchLabel').textContent = copy.search;
  el('settingsSearch').placeholder = copy.searchPlaceholder;
  el('settingsEmptyLabel').textContent = copy.includeEmpty;
  el('settingsExportLabel').textContent = copy.exportTitle;
  el('settingsExportHeading').textContent = copy.exportTitle;
  el('settingsExportIntro').textContent = copy.exportIntro;
  el('settingsScopeLabel').textContent = copy.scope;
  el('cancelSettingsExport').textContent = copy.close;
  el('confirmSettingsExport').textContent = copy.exportSettings;
}

function renderLoadFailure() {
  el('gameSettingsStatus').innerHTML = html(copy.offline) +
    ' <button type="button" class="settings-retry" id="retryGameSettings">' + html(copy.retry) + '</button>';
}

export async function showGameSettings() {
  const view = el('view-settings');
  if (!view || !el('gameSettingsList')) return;
  if (!bound) {
    if (!el('gameSettingsStyles')) {
      const style = document.createElement('link');
      style.id = 'gameSettingsStyles';
      style.rel = 'stylesheet';
      style.href = new URL('./einstellungen-menue.css?v=mw4-community-20261126', import.meta.url).href;
      document.head.append(style);
    }
    restorePreferences();
    renderLanguage();
    bindControls(view);
    bound = true;
  }
  if (settings) return renderGameSettings();
  if (loading) return loading;

  el('gameSettingsStatus').textContent = copy.loading;
  loading = (async () => {
    try {
      settings = createSettings(await serverGet('/api/game-settings'));
      activeTab = tabsFor(settings.get(activeMenu))[0] || '';
      renderGameSettings();
    } catch {
      settings = undefined;
      renderLoadFailure();
    } finally {
      loading = undefined;
    }
  })();
  return loading;
}

function renderNavigation(menu, searching) {
  const navigation = el('settingsMenuNav');
  const markup = [...settings.values()].map((item) => {
    const icon = ICONS[item.id];
    return `<button type="button" data-settings-menu="${html(item.id)}" aria-pressed="false">
      ${icon ? `<svg viewBox="0 0 24 24" aria-hidden="true">${icon}</svg>` : ''}
      <span>${html(menuName(item))}</span></button>`;
  }).join('');
  if (navigationMarkup !== markup) {
    navigation.innerHTML = markup;
    navigationMarkup = markup;
  }
  for (const button of navigation.children) {
    button.setAttribute('aria-pressed', String(!searching && button.dataset.settingsMenu === activeMenu));
  }

  const tabs = tabsFor(menu);
  const tabList = el('settingsTabs');
  tabList.hidden = searching || !tabs.length;
  const tabButtons = tabs.map((tab) => `<button type="button" data-settings-tab="${html(tab)}" aria-pressed="false">${html(groupName(tab, language))}</button>`).join('');
  if (tabMarkup !== tabButtons) {
    tabList.innerHTML = tabButtons;
    tabMarkup = tabButtons;
  }
  for (const button of tabList.children) {
    button.setAttribute('aria-pressed', String(button.dataset.settingsTab === activeTab));
  }
}

function renderContext(searching) {
  const context = el('settingsContext');
  let markup = '';
  if (!searching && activeMenu === 'mouse-keyboard' && ['Maus', 'Tastenbelegung'].includes(activeTab)) {
    markup = `<div><strong>${html(copy.pcTitle)}</strong><p>${html(copy.pcIntro)}</p></div>
      <div class="settings-source-links">
        <a href="${PC_SOURCES.test}" target="_blank" rel="noopener noreferrer">${html(copy.pcTest)} <span aria-hidden="true">↗</span></a>
        <a href="${PC_SOURCES.keys}" target="_blank" rel="noopener noreferrer">${html(copy.pcKeys)} <span aria-hidden="true">↗</span></a>
      </div>`;
  }
  if (!searching && ((activeMenu === 'graphics-display' && activeTab === 'Anzeige') ||
      (activeMenu === 'audio' && activeTab === 'Audio'))) {
    markup = `<div><strong>${html(copy.hardwareTitle)}</strong><p>${html(copy.hardwareIntro)}</p></div>`;
  }
  context.innerHTML = markup;
  context.hidden = !markup;
}

function hardwareHelp() {
  return hardwarePersisted ? copy.hardwareSaved : copy.hardwareTemporary;
}

function renderHardware(entry, personal) {
  const hint = language === 'en' ? personal.exampleEn : personal.example;
  const label = personal[language];
  return `<div class="settings-hardware">
    <label><span>${html(label)}</span><input type="text" data-settings-hardware="${html(entry.id)}" value="${html(hardware[entry.id])}"
      placeholder="${html(hint)}" maxlength="120" autocomplete="off" spellcheck="false" aria-describedby="settings-hardware-${html(entry.id)}"></label>
    <small id="settings-hardware-${html(entry.id)}">${html(hardwareHelp())}</small>
    ${entry.value ? `<small>${html(copy.example)} <span>${html(entry.value)}</span></small>` : ''}
  </div>`;
}

function renderRow(entry, children, open) {
  const personal = personalField(entry.id);
  const name = language === 'en' ? entry.en || entry.de : entry.de;
  const entered = personal && hardware[entry.id]?.trim();
  const value = personal ? entered || personal[language] : settingValue(entry.value, language);
  const state = personal && !entered ? ' personal-value' : value ? '' : ' empty-value';
  const help = settingExplanation(entry, language);
  const options = entry.values || entry.options?.map((option) => settingValue(option, language)).join(' · ');
  return `<div class="settings-menu-row" data-setting-id="${html(entry.id)}">
    <details${open.has(entry.id) ? ' open' : ''}>
      <summary>
        <span class="settings-row-name">${html(name)}</span>
        <span class="settings-row-value${state}">${html(value || copy.noValue)}</span>
        ${CHEVRON}
      </summary>
      <div class="settings-row-details">
        <p class="settings-explanation">${html(help || entry.description || copy.noExplanation)}</p>
        ${personal ? renderHardware(entry, personal) : ''}
        ${options ? `<p class="settings-detail-meta"><strong>${html(copy.options)}</strong> ${html(options)}</p>` : ''}
        ${entry.recommendation ? `<p class="settings-detail-meta"><strong>${html(copy.recommendation)}</strong> ${html(entry.recommendation)}</p>` : ''}
        ${help && entry.description ? `<p class="settings-detail-meta">${html(entry.description)}</p>` : ''}
        ${children.length ? `<div class="settings-nested-rows">${children.map((child) => renderRow(child, [], open)).join('')}</div>` : ''}
      </div>
    </details>
  </div>`;
}

function renderGroup(group, searching, open) {
  const ids = new Set(group.entries.map(({ id }) => id));
  const children = new Map();
  const main = [];
  for (const entry of group.entries) {
    if (entry.parentId && ids.has(entry.parentId)) {
      if (!children.has(entry.parentId)) children.set(entry.parentId, []);
      children.get(entry.parentId).push(entry);
    } else {
      main.push(entry);
    }
  }
  const rows = main.map((entry) => renderRow(entry, children.get(entry.id) || [], open)).join('');
  const heading = searching
    ? [...new Set([menuName(group.menu), groupName(group.tab, language), groupName(group.name, language)].filter(Boolean))].join(' › ')
    : groupName(group.name, language);
  const groupId = group.menu.id + '/' + group.tab + '/' + group.name;
  return group.collapsed && !searching
    ? `<details class="settings-option-section" data-settings-group="${html(groupId)}"${open.has(groupId) ? ' open' : ''}>
      <summary>${html(heading)}${CHEVRON}</summary><div>${rows}</div></details>`
    : `<section class="settings-option-section"><h3>${html(heading)}</h3><div>${rows}</div></section>`;
}

function exportable(entries) {
  return entries.flatMap((entry) => {
    if (personalField(entry.id)) {
      const value = hardware[entry.id]?.trim();
      return value ? [{ ...entry, value }] : [];
    }
    return entry.value || entry.recommendation || entry.values ? [entry] : [];
  });
}

function menuEntries(menu) {
  return menu.groups.flatMap(({ entries }) => entries);
}

function setExportAvailability() {
  el('saveGameSettings').disabled = ![...settings.values()].some((menu) => exportable(menuEntries(menu)).length);
}

function renderGameSettings() {
  const menu = settings.get(activeMenu);
  const query = searchable(el('settingsSearch').value.trim()).split(/\s+/).filter(Boolean);
  const searching = query.length > 0;
  const includeEmpty = el('settingsShowEmpty').checked;
  const sourceMenus = searching ? [...settings.values()] : [menu];
  const groups = [];
  for (const source of sourceMenus) {
    for (const group of source.groups) {
      if (!searching && activeTab && group.tab !== activeTab) continue;
      const entries = group.entries.filter((entry) => {
        const personal = personalField(entry.id);
        if (!includeEmpty && !personal && !(entry.value || entry.recommendation || entry.values || entry.description)) return false;
        if (!searching) return true;
        const text = searchable([source.de, source.en, group.tab, groupName(group.tab, 'en'), group.name, groupName(group.name, 'en'),
          entry.de, entry.en, entry.value, settingValue(entry.value, 'en'), personal?.de, personal?.en, hardware[entry.id],
          entry.values, entry.recommendation, entry.description, entry.options?.join(' ')].join(' '));
        return query.every((word) => text.includes(word));
      });
      if (entries.length) groups.push({ ...group, menu: source, entries });
    }
  }

  visibleEntries = groups.flatMap(({ entries }) => entries);
  renderNavigation(menu, searching);
  renderContext(searching);
  const heading = el('settingsViewTitle');
  heading.hidden = false;
  heading.textContent = searching ? copy.results : groupName(activeTab, language) || menuName(menu);
  el('gameSettingsStatus').textContent = (visibleEntries.length || searching) ? copy.count(visibleEntries.length) : '';
  setExportAvailability();

  const list = el('gameSettingsList');
  const open = new Set([...list.querySelectorAll('details[open]')].map((details) =>
    details.dataset.settingsGroup || details.parentElement.dataset.settingId));
  const empty = searching ? copy.noMatches : activeTab === 'Benchmark' ? copy.benchmark : copy.empty;
  list.innerHTML = groups.length ? groups.map((group) => renderGroup(group, searching, open)).join('') :
    `<p class="settings-empty">${html(empty)}</p>`;
}

function updateHardware(input) {
  const id = input.dataset.settingsHardware;
  const personal = personalField(id);
  if (!personal) return;
  const value = input.value.trim();
  if (value) hardware[id] = value;
  else delete hardware[id];

  try {
    localStorage.setItem(HARDWARE_KEY, JSON.stringify(hardware));
    hardwarePersisted = true;
  } catch {
    hardwarePersisted = false;
  }
  const display = input.closest('.settings-menu-row').querySelector('.settings-row-value');
  display.textContent = value || personal[language];
  display.classList.toggle('personal-value', !value);
  el('settings-hardware-' + id).textContent = hardwareHelp();
  setExportAvailability();
}

function updateExportScope() {
  const selection = exportScopes.get(el('settingsExportScope').value);
  exportJob = selection && settingsImageExport(selection.entries, [...settings.values()], language);
  const count = exportJob?.count || 0;
  el('settingsExportStatus').textContent = count ? copy.count(selection.entries.length) + ' · ' +
    (count === 1 ? copy.singleImage : copy.archive(count)) : '';
  el('confirmSettingsExport').disabled = !count;
}

function openExport() {
  const current = exportable(visibleEntries);
  const menus = [...settings.values()].map((menu) => [menu.id, { label: menuName(menu), entries: exportable(menuEntries(menu)) }]);
  const all = menus.flatMap(([, { entries }]) => entries);
  exportScopes = new Map([
    ['current', { label: copy.current, entries: current }],
    ...menus,
    ['all', { label: copy.all, entries: all }],
  ]);
  const select = el('settingsExportScope');
  select.innerHTML = [...exportScopes].map(([id, { label, entries }]) =>
    `<option value="${html(id)}"${entries.length ? '' : ' disabled'}>${html(label)}</option>`).join('');
  select.value = current.length ? 'current' : 'all';
  updateExportScope();
  el('settingsExportDialog').showModal();
  select.focus();
}

async function downloadSettings(event) {
  event.preventDefault();
  if (exporting || !exportJob?.count) return;
  exporting = true;
  const select = el('settingsExportScope');
  const confirm = el('confirmSettingsExport');
  const cancel = el('cancelSettingsExport');
  const status = el('settingsExportStatus');
  const summary = status.textContent;
  select.disabled = confirm.disabled = cancel.disabled = true;
  status.textContent = copy.exportBusy;
  try {
    await exportJob.download();
    el('settingsExportDialog').close();
    status.textContent = summary;
  } catch {
    status.textContent = copy.exportError;
  } finally {
    exporting = false;
    select.disabled = confirm.disabled = cancel.disabled = false;
  }
}

function bindControls(view) {
  view.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    const { settingsMenu, settingsTab, settingsLanguage } = button.dataset;
    if (settingsLanguage && settingsLanguage !== language) {
      language = settingsLanguage;
      try { localStorage.setItem(LANGUAGE_KEY, language); } catch { /* Use this choice for the current page. */ }
      renderLanguage();
      if (settings) renderGameSettings();
      else if (loading) el('gameSettingsStatus').textContent = copy.loading;
      else renderLoadFailure();
    }
    if (settingsMenu && settings?.has(settingsMenu)) {
      activeMenu = settingsMenu;
      activeTab = tabsFor(settings.get(activeMenu))[0] || '';
      el('settingsSearch').value = '';
      renderGameSettings();
    }
    if (settingsTab && settings) {
      activeTab = settingsTab;
      renderGameSettings();
    }
    if (button.id === 'retryGameSettings') showGameSettings();
    if (button.id === 'saveGameSettings') openExport();
    if (button.id === 'cancelSettingsExport') el('settingsExportDialog').close();
  });
  view.addEventListener('input', (event) => {
    if (!settings) return;
    if (event.target.id === 'settingsSearch') renderGameSettings();
    if (event.target.dataset.settingsHardware) updateHardware(event.target);
  });
  el('settingsShowEmpty').addEventListener('change', () => {
    if (settings) renderGameSettings();
  });
  el('settingsExportScope').addEventListener('change', updateExportScope);
  el('settingsExportForm').addEventListener('submit', downloadSettings);
  el('settingsExportDialog').addEventListener('cancel', (event) => {
    if (exporting) event.preventDefault();
  });
}
