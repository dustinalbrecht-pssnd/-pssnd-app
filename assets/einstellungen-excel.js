import { spreadsheet } from './katalog-import.js?v=waffencheck-20261125';

const SHEET = 'MW4-Einstellungen';
const HEADERS = ['Spielmenü', 'Einstellung (DE)', 'Wert', 'Aktion', 'Mögliche Werte', 'Abschnitt', 'Einstellung (EN)', 'Feld-ID', 'Untermenü'];

function templateRows(catalog) {
  const saved = new Map(catalog.entries.map(({ id, value }) => [id, value]));
  return [HEADERS, ...catalog.templates.flatMap(category => category.sections.flatMap(section =>
    section.fields.map(field => [
      category.de, field.de, saved.get(field.id) ?? '', '',
      field.options?.join(' / ') || (field.step ? 'Zahl in 0,05er-Schritten' :
        field.min !== undefined ? field.min + ' bis ' + field.max : field.kind === 'number' ? 'Zahl' : ''),
      section.name, field.en, field.id, section.tab || '',
    ]),
  ))];
}

async function exportSettings(catalog) {
  const parser = await spreadsheet();
  const workbook = parser.utils.book_new();
  const sheet = parser.utils.aoa_to_sheet(templateRows(catalog));
  sheet['!cols'] = [24, 45, 26, 15, 52, 28, 42, 36, 20].map(wch => ({ wch }));
  sheet['!autofilter'] = { ref: sheet['!ref'] };
  for (let r = 1; r <= parser.utils.decode_range(sheet['!ref']).e.r; r += 1) {
    for (const c of [2, 3]) sheet[parser.utils.encode_cell({ r, c })].z = '@';
  }
  parser.utils.book_append_sheet(workbook, sheet, SHEET);
  const instructions = parser.utils.aoa_to_sheet([
    ['MW4-Einstellungen für eUpdateGaming'],
    ['Trage die gewünschten Werte in die Spalte „Wert“ ein. Die Feld-ID dient der Zuordnung.'],
    ['Eine leere Zelle in „Wert“ überspringt das Feld. Trage „Leeren“ in „Aktion“ ein, um einen Wert zu entfernen.'],
    ['Der Import zeigt eine Vorschau. Die Änderungen werden nach deiner Bestätigung veröffentlicht.'],
  ]);
  instructions['!cols'] = [{ wch: 112 }];
  parser.utils.book_append_sheet(workbook, instructions, 'Anleitung');
  parser.writeFile(workbook, 'eUpdate-MW4-Einstellungen.xlsx', { compression: true });
}

async function rowsFromFile(file) {
  if (!/\.xlsx$/i.test(file.name)) throw Error('Wähle die ausgefüllte Excel-Datei im Format .xlsx.');
  if (file.size > 10 * 1024 * 1024) throw Error('Die Excel-Datei ist größer als 10 MB.');
  const parser = await spreadsheet();
  const workbook = parser.read(await file.arrayBuffer(), { type: 'array', cellFormula: true, sheetRows: 1002 });
  const sheet = workbook.Sheets[SHEET] || workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet?.['!ref']) throw Error('Die Datei enthält keine Einstellungstabelle.');
  const range = parser.utils.decode_range(sheet['!fullref'] || sheet['!ref']);
  if (range.e.r > 1000 || range.e.c > 63) throw Error('Die Einstellungstabelle ist zu groß.');
  const rows = parser.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true, range: 0 });
  const headers = (rows.shift() || []).map(cell => String(cell).trim().toLowerCase());
  const idCol = headers.indexOf('feld-id'), valueCol = headers.indexOf('wert'), actionCol = headers.indexOf('aktion');
  if (idCol < 0 || valueCol < 0 || headers.indexOf('feld-id', idCol + 1) >= 0 ||
      headers.indexOf('wert', valueCol + 1) >= 0) throw Error('Die Tabelle braucht je eine Spalte „Feld-ID“ und „Wert“.');
  return rows.flatMap((row, index) => {
    const id = String(row[idCol] ?? '').trim();
    const value = String(row[valueCol] ?? '').trim();
    const action = String(row[actionCol] ?? '').trim().toLowerCase();
    if ([valueCol, actionCol, idCol].some(c => c >= 0 && sheet[parser.utils.encode_cell({ r: index + 1, c })]?.f)) {
      throw Error('Zeile ' + (index + 2) + ' enthält eine Formel. Füge den Zellinhalt als Wert ein.');
    }
    if (!action && !value) return [];
    if (!id) throw Error('Zeile ' + (index + 2) + ' braucht eine Feld-ID.');
    if (action && action !== 'leeren') throw Error('Zeile ' + (index + 2) + ' – Trage „Leeren“ ein oder lass die Aktion frei.');
    return [{ id, value: action === 'leeren' ? '' : value }];
  });
}

export function mountSettingsExcel({ request, esc, getCatalog, onApplied, note }) {
  const el = id => document.getElementById(id);
  const dialog = el('mw4ExcelDialog'), fileInput = el('mw4ExcelFile'), confirm = el('mw4ExcelConfirm');
  const exportButton = el('mw4ExcelExport'), importButton = el('mw4ExcelImport');
  const previewList = el('mw4ExcelPreview'), status = el('mw4ExcelStatus'), cancel = el('mw4ExcelCancel');
  let preview = [], generation = 0, saving = false;

  function refresh() {
    const data = getCatalog();
    exportButton.disabled = !data?.templates?.length;
    importButton.disabled = !data?.settingsExcel || !data.templates?.length;
  }

  function message(text, error = false) {
    status.textContent = text;
    status.classList.toggle('error', error);
  }

  function discardPreview() {
    generation += 1;
    preview = [];
    fileInput.value = '';
    confirm.disabled = true;
    previewList.replaceChildren();
  }

  exportButton.onclick = async () => {
    const data = getCatalog();
    if (!data?.templates?.length) return;
    exportButton.disabled = true;
    try {
      await exportSettings(data);
    } catch (error) {
      note(error.message);
    } finally {
      refresh();
    }
  };

  importButton.onclick = () => {
    discardPreview();
    message('');
    dialog.showModal();
  };
  cancel.onclick = () => dialog.close();
  dialog.addEventListener('cancel', event => { if (saving) event.preventDefault(); });
  dialog.addEventListener('close', discardPreview);

  fileInput.onchange = async () => {
    const file = fileInput.files[0];
    discardPreview();
    if (!file) return message('');
    const run = generation;
    message('Die Datei wird geprüft …');
    try {
      const changes = await rowsFromFile(file);
      if (run !== generation) return;
      if (!changes.length) return message('Die Tabelle enthält keine eingetragenen Änderungen.');
      const result = await request('/api/admin/game-settings/import/preview', 'POST', { changes });
      if (run !== generation) return;
      preview = result.changes;
      message(preview.length ? preview.length + (preview.length === 1 ? ' Änderung zur Bestätigung' : ' Änderungen zur Bestätigung') :
        'Die eingetragenen Werte sind bereits veröffentlicht.');
      previewList.innerHTML = preview.map(({ de, category, section, previous, value }) =>
        '<li><div><strong>' + esc(de) + '</strong><small>' + esc(category + ' · ' + section) + '</small></div>' +
        '<span>' + esc(previous || 'Leer') + '</span><span aria-hidden="true">→</span><b>' + esc(value || 'Entfernen') + '</b></li>',
      ).join('');
      confirm.disabled = !preview.length;
    } catch (error) {
      if (run === generation) message(error.message, true);
    }
  };

  confirm.onclick = async () => {
    if (saving || !preview.length || !dialog.open) return;
    const run = generation;
    saving = true;
    cancel.disabled = confirm.disabled = fileInput.disabled = true;
    message('Die Werte werden veröffentlicht …');
    try {
      const changes = preview.map(({ id, value, previous }) => ({ id, value, previous }));
      const result = await request('/api/admin/game-settings/import', 'PUT', { changes });
      if (run !== generation) return;
      dialog.close();
      onApplied(result);
      note('Excel-Werte veröffentlicht.');
    } catch (error) {
      if (run === generation) {
        discardPreview();
        message(error.message, true);
      }
    } finally {
      saving = false;
      cancel.disabled = fileInput.disabled = false;
    }
  };
  return {
    refresh,
    reset() {
      if (dialog.open) dialog.close();
      discardPreview();
      refresh();
    },
  };
}
