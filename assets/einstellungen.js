import { el, head, html, modal, serverGet, toast } from './app.js';
import { SETTING_PLATFORMS, settingPlatformLabel } from './mw4-inhalte.js';
import { settingsImageExport } from './einstellungen-bild.js';

let catalog;
let filteredEntries = [];
let exportJob;
let loading;

export async function showGameSettings() {
  if (!el('gameSettingsList')) return;
  if (catalog) {
    renderGameSettings();
    return;
  }
  if (loading) return loading;
  const status = el('gameSettingsStatus');
  status.textContent = 'Einstellungen werden geladen …';
  loading = (async () => {
    try {
      catalog = await serverGet('/api/game-settings');
      el('settingsCategory').insertAdjacentHTML('beforeend', catalog.categories.map(
        ({ id, de }) => '<option value="' + html(id) + '">' + html(de) + '</option>',
      ).join(''));
      el('settingsPlatform').insertAdjacentHTML('beforeend', Object.entries(SETTING_PLATFORMS).map(
        ([id, label]) => '<option value="' + id + '">' + label + '</option>',
      ).join(''));
      renderGameSettings();
    } catch {
      status.innerHTML = 'Einstellungen sind gerade nicht erreichbar. <button type="button" class="text-action" id="retryGameSettings">Erneut laden</button>';
    } finally {
      loading = null;
    }
  })();
  return loading;
}

function settingCard(entry) {
  const fields = [
    ['Verfügbare Werte', entry.values],
    ['Empfehlung', entry.recommendation],
  ];
  return `<article class="game-setting">
    <div class="game-setting-heading"><div><h3>${html(entry.de)}</h3>
    ${entry.en && entry.de !== entry.en ? '<p lang="en">' + html(entry.en) + '</p>' : ''}
    <small>${html(settingPlatformLabel(entry.platforms))}</small></div>
    <button type="button" class="ghost-btn" data-save-setting="${html(entry.id)}">Bild speichern ↓</button></div>
    ${fields.some(([, value]) => value) ? '<dl>' + fields.filter(([, value]) => value).map(
      ([label, value]) => '<div><dt>' + label + '</dt><dd>' + html(value) + '</dd></div>',
    ).join('') + '</dl>' : ''}
    ${entry.description ? '<p class="game-setting-description">' + html(entry.description) + '</p>' : ''}
  </article>`;
}

function renderGameSettings() {
  if (!catalog || !el('gameSettingsList')) return;
  const query = el('settingsSearch').value.trim().toLocaleLowerCase('de');
  const categoryId = el('settingsCategory').value;
  const platform = el('settingsPlatform').value;
  filteredEntries = [];
  const groups = catalog.categories.filter(({ id }) => !categoryId || id === categoryId).map((category) => {
    const entries = catalog.entries.filter((entry) => entry.categoryId === category.id &&
      (!platform || !entry.platforms.length || entry.platforms.includes(platform)) &&
      [category.de, category.en, entry.de, entry.en, entry.values, entry.recommendation, entry.description]
        .join(' ').toLocaleLowerCase('de').includes(query));
    filteredEntries.push(...entries);
    return entries.length ? '<section class="game-settings-group"><h2>' + html(category.de) + '</h2>' + entries.map(settingCard).join('') + '</section>' : '';
  });
  el('gameSettingsList').innerHTML = groups.join('');
  el('saveGameSettings').disabled = !filteredEntries.length;
  el('gameSettingsStatus').textContent = filteredEntries.length ?
    filteredEntries.length + (filteredEntries.length === 1 ? ' Einstellung' : ' Einstellungen') :
    catalog.entries.length ? 'Für diese Auswahl gibt es keine Einstellungen.' : 'Hier wurden noch keine MW4-Einstellungen veröffentlicht.';
}

async function downloadSettings(index) {
  try {
    await exportJob.download(index);
    toast('Bild gespeichert ✓');
  } catch (error) {
    toast(error.message);
  }
}

document.addEventListener('input', (event) => {
  if (event.target.id === 'settingsSearch') renderGameSettings();
});
document.addEventListener('change', (event) => {
  if (['settingsCategory', 'settingsPlatform'].includes(event.target.id)) renderGameSettings();
});
document.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.id === 'retryGameSettings') showGameSettings();
  if (button.dataset.settingsPage !== undefined) downloadSettings(Number(button.dataset.settingsPage));
  if (button.id !== 'saveGameSettings' && !button.dataset.saveSetting) return;
  const entries = button.dataset.saveSetting
    ? filteredEntries.filter(({ id }) => id === button.dataset.saveSetting)
    : filteredEntries;
  if (!entries.length) return;
  exportJob = settingsImageExport(entries, catalog.categories);
  if (exportJob.count === 1) {
    downloadSettings(0);
    return;
  }
  modal(head('MW4-Einstellungen als Bild', 'Wähle eine Bildseite zum Speichern.') + '<div class="settings-export-pages">' +
    Array.from({ length: exportJob.count }, (_, i) => '<button type="button" class="ghost-btn" data-settings-page="' + i + '">Bild ' + (i + 1) + ' speichern ↓</button>').join('') + '</div>');
});
