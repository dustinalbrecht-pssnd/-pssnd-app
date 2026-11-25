import { catalogTable, planTable } from './katalog-tabelle.js';

let spreadsheetPromise;
export function spreadsheet() {
  if (globalThis.XLSX?.version === '0.20.3') return Promise.resolve(globalThis.XLSX);
  if (!spreadsheetPromise) {
    spreadsheetPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = new URL('./xlsx.mini.min.js', import.meta.url);
      script.onload = () =>
        globalThis.XLSX?.utils
          ? resolve(globalThis.XLSX)
          : reject(Error('Die Excel-Funktion konnte nicht gestartet werden.'));
      script.onerror = () => reject(Error('Die Excel-Dateiunterstützung konnte nicht geladen werden.'));
      document.head.append(script);
    }).catch((error) => {
      spreadsheetPromise = null;
      throw error;
    });
  }
  return spreadsheetPromise;
}

async function readTable(file) {
  const extension = file.name.split('.').at(-1).toLowerCase();
  if (!['xlsx', 'csv'].includes(extension)) throw Error('Wähle eine Datei im Format .xlsx oder .csv.');
  if (file.size > 10 * 1024 * 1024)
    throw Error('Die Datei ist größer als 10 MB. Teile sie in mehrere Tabellen auf.');
  const parser = await spreadsheet();
  const bytes = await file.arrayBuffer();
  let workbook;
  if (extension === 'csv') {
    let text;
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      text = new TextDecoder('windows-1252').decode(bytes);
    }
    workbook = parser.read(text, { type: 'string', raw: true });
  } else {
    workbook = parser.read(bytes, { type: 'array', cellFormula: false });
  }
  const worksheet = workbook.Sheets.Katalog || workbook.Sheets[workbook.SheetNames[0]];
  if (!worksheet) throw Error('Die Datei enthält kein Tabellenblatt.');
  return parser.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: false });
}

export function mountCatalogImport({
  request,
  refresh,
  getCatalog,
  canUseCatalog,
  getSession,
  notice,
  classes,
  slots,
  modes,
}) {
  const $ = (id) => document.getElementById(id);
  const dialog = $('catalogImportDialog');
  const filename = $('catalogImportFile');
  const close = $('closeCatalogImport');
  const open = $('openCatalogImport');
  const exportButton = $('exportCatalogTable');
  const apply = $('applyCatalogImport');
  const summary = $('catalogImportSummary');
  const messages = $('catalogImportMessages');
  const issues = $('catalogImportErrors');
  const preview = $('catalogImportPreview');
  let rows = null;
  let plan = null;
  let operation = '';
  let exporting = false;
  let generation = 0;

  function setMessage(text = '', error = false) {
    messages.textContent = text;
    messages.classList.toggle('error', error);
    messages.hidden = !text;
  }

  function updateAvailability() {
    open.disabled = exporting || !canUseCatalog();
    exportButton.disabled = exporting || !canUseCatalog();
    filename.disabled = !!operation;
    close.disabled = operation === 'save';
    apply.disabled = !!operation || !plan?.changes.length || !!plan.problems.length;
  }

  function render() {
    const errors = plan?.problems || [];
    const changes = plan?.changes || [];
    issues.hidden = !errors.length;
    issues.querySelector('summary').textContent =
      `${errors.length} ${errors.length === 1 ? 'Problem prüfen' : 'Probleme prüfen'}`;
    issues.querySelector('ul').replaceChildren(
      ...errors.map((text) => {
        const li = document.createElement('li');
        li.textContent = text;
        return li;
      }),
    );
    preview.hidden = !changes.length;
    preview.open = changes.length <= 40;
    preview.querySelector('summary').textContent = `Änderungen ansehen (${changes.length})`;
    const body = preview.querySelector('tbody');
    const tableRows = document.createDocumentFragment();
    for (const change of changes) {
      const tr = document.createElement('tr');
      for (const value of change) {
        const td = document.createElement('td');
        td.textContent = value;
        tr.append(td);
      }
      tableRows.append(tr);
    }
    body.replaceChildren(tableRows);
    const counts = new Map();
    for (const [kind] of changes) counts.set(kind, (counts.get(kind) || 0) + 1);
    const labels = [
      ['Neue Waffe', 'neue Waffe', 'neue Waffen'],
      ['Neuer Aufsatz', 'neuer Aufsatz', 'neue Aufsätze'],
      ['Name ändern', 'Namensänderung', 'Namensänderungen'],
      ['Zuordnen', 'neue Zuordnung', 'neue Zuordnungen'],
      ['Zuordnung lösen', 'Zuordnung lösen', 'Zuordnungen lösen'],
    ];
    summary.textContent = changes.length
      ? labels
          .filter(([kind]) => counts.has(kind))
          .map(([kind, singular, plural]) => {
            const count = counts.get(kind);
            return `${count} ${count === 1 ? singular : plural}`;
          })
          .join(' · ')
      : plan && !errors.length
        ? 'Die Tabelle stimmt mit dem aktuellen Katalog überein.'
        : '';
    updateAvailability();
  }

  function reset() {
    generation++;
    rows = plan = null;
    operation = '';
    exporting = false;
    filename.value = '';
    setMessage();
    render();
    if (dialog.open) dialog.close();
  }

  open.onclick = () => {
    if (open.disabled) return;
    reset();
    dialog.showModal();
  };
  close.onclick = reset;
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    if (operation !== 'save') reset();
  });

  exportButton.onclick = async () => {
    if (exportButton.disabled) return;
    const session = getSession();
    const run = ++generation;
    exporting = true;
    updateAvailability();
    try {
      const [parser, data] = await Promise.all([spreadsheet(), request('/api/admin/dashboard')]);
      if (run !== generation || session !== getSession()) return;
      const workbook = parser.utils.book_new();
      const worksheet = parser.utils.aoa_to_sheet(catalogTable(data, classes, slots));
      worksheet['!cols'] = [21, 27, 17, 31, 31, 15, 24, 28].map((wch) => ({ wch }));
      worksheet['!autofilter'] = { ref: worksheet['!ref'] };
      parser.utils.book_append_sheet(workbook, worksheet, 'Katalog');
      parser.writeFile(workbook, 'eUpdate-Katalog.xlsx', { compression: true });
      notice('Katalogtabelle heruntergeladen');
    } catch (error) {
      if (run === generation) notice(error.message);
    } finally {
      if (run === generation) {
        exporting = false;
        updateAvailability();
      }
    }
  };

  filename.onchange = async () => {
    const file = filename.files[0];
    const run = ++generation;
    rows = plan = null;
    if (!file) {
      setMessage();
      render();
      return;
    }
    operation = 'read';
    setMessage('Tabelle wird gelesen …');
    render();
    try {
      const [contents, data] = await Promise.all([readTable(file), request('/api/admin/dashboard')]);
      if (run !== generation) return;
      rows = contents;
      plan = planTable(rows, data, classes, slots);
      setMessage(
        plan.problems.length
          ? 'Korrigiere die aufgeführten Zeilen und lade die Tabelle erneut hoch.'
          : '',
      );
    } catch (error) {
      if (run === generation) setMessage(error.message, true);
    } finally {
      if (run === generation) {
        operation = '';
        render();
      }
    }
  };

  apply.onclick = async () => {
    if (apply.disabled || !rows) return;
    const session = getSession();
    const run = generation;
    const live = () => run === generation && session === getSession();
    const signature = JSON.stringify(plan.changes);
    operation = 'save';
    let saved = 0;
    setMessage('Aktueller Katalog wird geprüft …');
    updateAvailability();
    try {
      const current = await request('/api/admin/dashboard');
      if (!live()) return;
      plan = planTable(rows, current, classes, slots);
      if (plan.problems.length || signature !== JSON.stringify(plan.changes)) {
        setMessage('Der Katalog wurde inzwischen geändert. Prüfe die aktualisierte Vorschau.');
        return;
      }
      const { newWeapons } = plan;
      const total = newWeapons.length + plan.parts.length;
      const attachmentChanges = plan.changes.filter(([kind]) => kind !== 'Neue Waffe');
      for (const { name, cls } of newWeapons) {
        if (!live()) return;
        setMessage(`Speichere Waffe ${name} (${saved + 1} von ${total}) …`);
        await request('/api/admin/weapons', 'POST', {
          name,
          cls,
          modes,
          active: true,
          img: '',
          attachmentIds: [],
          customAttachments: [],
        });
        saved++;
      }
      if (!live()) return;
      if (newWeapons.length) {
        const recent = await request('/api/admin/dashboard');
        if (!live()) return;
        plan = planTable(rows, recent, classes, slots);
        if (plan.problems.length || JSON.stringify(plan.changes) !== JSON.stringify(attachmentChanges)) {
          setMessage('Die Waffen wurden verarbeitet. Prüfe die aktualisierte Vorschau der Aufsätze.');
          return;
        }
      }
      for (const part of plan.parts) {
        if (!live()) return;
        const { existing, before, names, slot, links } = part;
        const weaponIds = [...links.values()].map((weapon) => weapon.id);
        if (weaponIds.some((id) => !id))
          throw Error('Eine Waffen-ID fehlt. Prüfe die aktualisierte Vorschau.');
        setMessage(`Speichere ${names.de} (${saved + 1} von ${total}) …`);
        await request(
          '/api/admin/content/attachments' + (existing ? '/' + encodeURIComponent(existing.id) : ''),
          existing ? 'PUT' : 'POST',
          {
            de: names.de === before.de ? existing?.de || names.de : names.de,
            en: names.en === before.en ? existing?.en || names.en : names.en,
            slot,
            unlock: existing?.unlock || '',
            level: existing?.level || '',
            img: existing?.img || '',
            active: existing?.active !== false,
            weaponIds,
          },
        );
        saved++;
      }
      if (!live()) return;
      await refresh();
      if (!live()) return;
      plan = planTable(rows, getCatalog(), classes, slots);
      if (plan.changes.length || plan.problems.length) {
        setMessage('Der Server meldet noch offene Änderungen. Prüfe die Vorschau.', true);
      } else {
        setMessage('Katalog gespeichert. Die Website übernimmt die Änderungen beim nächsten Laden.');
      }
    } catch (error) {
      if (!live()) return;
      try {
        const current = await request('/api/admin/dashboard');
        if (live()) plan = planTable(rows, current, classes, slots);
      } catch {
        // Keep the preview when the server is unavailable.
      }
      if (live())
        setMessage(`${saved} von der Schnittstelle bestätigte Speicherschritte. ${error.message}`, true);
    } finally {
      if (live()) {
        operation = '';
        render();
      }
    }
  };

  updateAvailability();
  return { reset, updateAvailability };
}
