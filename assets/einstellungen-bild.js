import { spreadsheet } from './katalog-import.js?v=waffencheck-20261125';
import { COPY, groupName, settingValue } from './einstellungen-texte.js';

const WIDTH = 1200;
const INSET = 54;
const CONTENT = WIDTH - 2 * INSET;
const GUTTER = 24;
const LABEL_WIDTH = 630;
const VALUE_WIDTH = CONTENT - LABEL_WIDTH - 3 * GUTTER;
const MAX_HEIGHT = 2900;
const FOOTER = 76;
const SECTION_HEADER = 56;
const ROW_LINE = 33;
const ROW_PADDING = 12;
const SECTION_GAP = 18;
const LABEL_FONT = '560 25px system-ui';
const VALUE_FONT = '710 26px system-ui';
const TITLE_FONT = '780 55px system-ui';

function linesFor(ctx, value, font, maxWidth) {
  ctx.font = font;
  return String(value).split('\n').flatMap((paragraph) => {
    const lines = [];
    let line = '';
    for (const word of paragraph.trim().split(/\s+/)) {
      const next = line ? line + ' ' + word : word;
      if (ctx.measureText(next).width <= maxWidth) {
        line = next;
        continue;
      }
      if (line) lines.push(line);
      line = '';
      for (const character of word) {
        if (line && ctx.measureText(line + character).width > maxWidth) {
          lines.push(line);
          line = '';
        }
        line += character;
      }
    }
    lines.push(line);
    return lines;
  });
}

function fileSlug(value) {
  return value.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70);
}

function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 15000);
}

export function settingsImageExport(entries, categories, language = 'de') {
  const copy = COPY[language];
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const palette = getComputedStyle(document.documentElement);
  const accent = palette.getPropertyValue('--gold').trim() || '#ffda0a';
  const categoryIndex = new Map(categories.map((category) => [category.id, category]));
  const byCategory = new Map();

  for (const entry of entries) {
    if (!byCategory.has(entry.categoryId)) byCategory.set(entry.categoryId, new Map());
    const sections = byCategory.get(entry.categoryId);
    const section = [...new Set([entry.tab, entry.section].filter(Boolean))]
      .map((name) => groupName(name, language)).join(' · ');
    if (!sections.has(section)) sections.set(section, []);
    const label = language === 'en' ? entry.en || entry.de : entry.de;
    const value = settingValue(entry.value || entry.recommendation || entry.values || entry.description, language);
    const labelLines = linesFor(ctx, label, LABEL_FONT, LABEL_WIDTH);
    const valueLines = linesFor(ctx, value, VALUE_FONT, VALUE_WIDTH);
    sections.get(section).push({
      labelLines, valueLines,
      height: ROW_PADDING * 2 + ROW_LINE * Math.max(labelLines.length, valueLines.length),
    });
  }

  const pages = [];
  for (const [categoryId, sections] of byCategory) {
    const category = categoryIndex.get(categoryId);
    const title = category?.[language] || category?.de || copy.title;
    const titleLines = linesFor(ctx, title, TITLE_FONT, CONTENT);
    const header = 113 + titleLines.length * 65;
    const capacity = MAX_HEIGHT - header - FOOTER;
    const categorySlug = fileSlug(categoryId || 'settings');
    const categoryPages = [];
    let page;

    function nextPage() {
      page = { titleLines, header, height: 0, sections: [] };
      categoryPages.push(page);
    }

    nextPage();
    for (const [section, rows] of sections) {
      const top = (section ? SECTION_HEADER : 10) + SECTION_GAP;
      const sectionHeight = top + rows.reduce((sum, row) => sum + row.height, 0);
      if (page.height && sectionHeight <= capacity && page.height + sectionHeight > capacity) nextPage();
      let group;
      for (const row of rows) {
        if (page.height && page.height + row.height + (group ? 0 : top) > capacity) {
          nextPage();
          group = undefined;
        }
        if (!group) {
          group = { title: section, rows: [] };
          page.sections.push(group);
          page.height += top;
        }
        group.rows.push(row);
        page.height += row.height;
      }
    }
    categoryPages.forEach((item, index) => {
      item.index = index + 1;
      item.total = categoryPages.length;
      const suffix = item.total === 1 ? '' : '-' + String(item.index).padStart(2, '0');
      item.name = 'eupdate-mw4-' + categorySlug + suffix + '.png';
      pages.push(item);
    });
  }

  function drawLines(lines, font, color, x, y, lineHeight) {
    ctx.font = font;
    ctx.fillStyle = color;
    lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
  }

  async function imageBlob(page) {
    canvas.width = WIDTH;
    canvas.height = page.header + page.height + FOOTER;
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#101215';
    ctx.fillRect(0, 0, WIDTH, canvas.height);
    const gradient = ctx.createLinearGradient(0, 0, WIDTH, 0);
    gradient.addColorStop(0, '#241e0b');
    gradient.addColorStop(1, '#181b20');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, page.header - 24);
    ctx.fillStyle = accent;
    ctx.fillRect(INSET, 28, 58, 4);
    drawLines([copy.title], '650 21px system-ui', accent, INSET, 49, 28);
    drawLines(page.titleLines, TITLE_FONT, '#f8f7f1', INSET, 86, 65);

    let y = page.header;
    for (const { title, rows } of page.sections) {
      if (title) {
        ctx.fillStyle = '#24282e';
        ctx.fillRect(INSET, y, CONTENT, SECTION_HEADER);
        drawLines([title], '720 23px system-ui', '#e2e1da', INSET + GUTTER, y + 15, 30);
        y += SECTION_HEADER;
      } else {
        y += 10;
      }
      rows.forEach(({ labelLines, valueLines, height }, index) => {
        ctx.fillStyle = index % 2 ? '#1a1e22' : '#191b1f';
        ctx.fillRect(INSET, y, CONTENT, height - 1);
        drawLines(labelLines, LABEL_FONT, '#f8f7f1', INSET + GUTTER, y + ROW_PADDING, ROW_LINE);
        drawLines(valueLines, VALUE_FONT, accent, INSET + 2 * GUTTER + LABEL_WIDTH, y + ROW_PADDING, ROW_LINE);
        y += height;
      });
      y += SECTION_GAP;
    }
    ctx.fillStyle = '#373b43';
    ctx.fillRect(INSET, y + 8, CONTENT, 1);
    drawLines(['eupdategaming.com'], '600 20px system-ui', '#b7bac2', INSET, y + 25, 26);
    if (page.total > 1) {
      ctx.textAlign = 'right';
      drawLines([`${page.index} / ${page.total}`], '600 20px system-ui', '#b7bac2', WIDTH - INSET, y + 25, 26);
    }
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error(copy.exportError);
    return blob;
  }

  async function download() {
    if (!pages.length) return;
    if (pages.length === 1) {
      saveBlob(await imageBlob(pages[0]), pages[0].name);
      return;
    }
    const { CFB } = await spreadsheet();
    const archive = CFB.utils.cfb_new();
    for (const page of pages) {
      const blob = await imageBlob(page);
      CFB.utils.cfb_add(archive, page.name, new Uint8Array(await blob.arrayBuffer()));
    }
    const bytes = CFB.write(archive, { fileType: 'zip', type: 'array', compression: false });
    const filename = byCategory.size === 1 ? fileSlug(byCategory.keys().next().value) : 'settings';
    saveBlob(new Blob([bytes], { type: 'application/zip' }), 'eupdate-mw4-' + filename + '.zip');
  }

  return { count: pages.length, download };
}
