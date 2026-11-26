import { applyPageSeo, SEO_PAGES, seoForPage } from './seo.js';

export function mountAdminSeo({ getConfig, note }) {
  const form = document.getElementById('seoForm');
  const page = form.elements.seoPage;
  const title = form.elements.seoTitle;
  const description = form.elements.seoDescription;
  const previewTitle = document.getElementById('seoPreviewTitle');
  const previewDescription = document.getElementById('seoPreviewDescription');
  const path = document.getElementById('seoPagePath');
  const download = document.getElementById('seoDownload');
  const drafts = new Map();

  page.replaceChildren(...Object.entries(SEO_PAGES).map(([key, value]) => new Option(value.label, key)));
  function renderPreview() {
    const defaults = SEO_PAGES[page.value];
    previewTitle.textContent = title.value.trim() || defaults.title;
    previewDescription.textContent = description.value.trim() || defaults.description;
    path.textContent = 'eupdategaming.com' + defaults.path;
    path.href = 'https://eupdategaming.com' + defaults.path;
  }

  function render() {
    const draft = drafts.get(page.value);
    const saved = getConfig()?.seoPages?.[page.value];
    title.value = draft?.title ?? saved?.title ?? '';
    description.value = draft?.description ?? saved?.description ?? '';
    renderPreview();
  }

  page.addEventListener('change', render);
  for (const input of [title, description]) input.addEventListener('input', () => {
    drafts.set(page.value, { title: title.value, description: description.value });
    renderPreview();
  });
  download.onclick = async () => {
    if (download.disabled) return;
    const view = page.value;
    const config = getConfig();
    const info = seoForPage(view, config);
    download.disabled = true;
    try {
      const response = await fetch(info.path, { cache: 'no-store' });
      if (!response.ok) throw Error('Die Website-Datei konnte nicht geladen werden.');
      const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
      if (!doc.querySelector('main > .view')) throw Error('Beim Laden wurde keine eUpdateGaming-Seite gefunden.');
      applyPageSeo(doc, view, config);
      const blob = new Blob(['<!doctype html>\n', doc.documentElement.outerHTML], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'index.html';
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 15000);
      note('Speichere die Datei in GitHub unter ' + info.path.slice(1) + 'index.html');
    } catch (error) {
      note(error.message);
    } finally {
      download.disabled = false;
    }
  };

  return {
    render,
    saved({ seoPage, seoTitle, seoDescription }) {
      const draft = drafts.get(seoPage);
      if (draft?.title === seoTitle && draft.description === seoDescription) drafts.delete(seoPage);
    },
    reset() { drafts.clear(); page.selectedIndex = 0; render(); },
  };
}
