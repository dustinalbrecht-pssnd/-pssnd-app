import { settingPlatformLabel } from './mw4-inhalte.js';

const WIDTH = 1080;
const PADDING = 56;
const MAX_HEIGHT = 1600;
const CARD_PADDING = 18;

function settingLines(ctx, value, width) {
  return String(value).split('\n').flatMap((paragraph) => {
    const lines = [];
    let line = '';
    for (const word of paragraph.trim().split(/\s+/)) {
      const next = line ? line + ' ' + word : word;
      if (ctx.measureText(next).width <= width) {
        line = next;
        continue;
      }
      if (line) lines.push(line);
      line = '';
      for (const character of word) {
        if (ctx.measureText(line + character).width > width) {
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

export function settingsImageExport(entries, categories) {
  const palette = getComputedStyle(document.documentElement);
  const colors = {
    background: palette.getPropertyValue('--bg').trim() || '#0d0f11',
    panel: palette.getPropertyValue('--surface').trim() || '#1b1f22',
    text: palette.getPropertyValue('--text').trim() || '#f8f7f1',
    muted: palette.getPropertyValue('--muted').trim() || '#aab0b4',
    accent: palette.getPropertyValue('--gold').trim() || '#ffda0a',
  };
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const rows = entries.map((entry) => {
    const category = categories.find(({ id }) => entry.categoryId === id);
    const title = [category?.de, entry.section, entry.platforms.length ? settingPlatformLabel(entry.platforms) : '']
      .filter(Boolean).join('  ·  ');
    const fields = [
      [title, 18, 600, colors.muted],
      [entry.de, 29, 700, colors.text],
      [entry.en && entry.en !== entry.de ? entry.en : '', 19, 500, colors.muted],
      [entry.value, 27, 700, colors.accent],
      [entry.values ? 'Werte  ·  ' + entry.values : '', 23, 500, colors.text],
      [entry.recommendation ? 'Empfehlung  ·  ' + entry.recommendation : '', 23, 700, colors.accent],
      [entry.description, 21, 500, colors.muted],
    ];
    return fields.filter(([text]) => text).flatMap(([text, size, weight, color]) => {
      const font = `${weight} ${size}px system-ui`;
      ctx.font = font;
      return settingLines(ctx, text, WIDTH - 2 * (PADDING + CARD_PADDING)).map((line) => ({
        line, font, color, height: Math.ceil(size * 1.37),
      }));
    });
  });

  const header = 154;
  const footer = 69;
  const spacing = 12;
  const pageBody = MAX_HEIGHT - header - footer;
  const pages = [{ cards: [], height: 0 }];
  for (const row of rows) {
    let i = 0;
    while (i < row.length) {
      let page = pages.at(-1);
      const space = pageBody - page.height - 2 * CARD_PADDING - spacing;
      const remaining = row.slice(i).reduce((total, line) => total + line.height, 0);
      if (page.cards.length && remaining > space) {
        page = { cards: [], height: 0 };
        pages.push(page);
      }
      const card = { lines: [], height: 2 * CARD_PADDING };
      while (i < row.length && page.height + card.height + row[i].height + spacing <= pageBody) {
        card.lines.push(row[i]);
        card.height += row[i].height;
        i += 1;
      }
      page.cards.push(card);
      page.height += card.height + spacing;
    }
  }

  async function download(index) {
    const page = pages[index];
    if (!page) throw new Error('Diese Bildseite ist nicht verfügbar.');
    canvas.width = WIDTH;
    canvas.height = Math.max(360, header + page.height + footer);
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = colors.accent;
    ctx.fillRect(PADDING, 33, 45, 4);
    ctx.font = '700 22px system-ui';
    ctx.fillText('eUpdate Gaming', PADDING, 68);
    ctx.fillStyle = colors.text;
    ctx.font = '750 46px system-ui';
    ctx.fillText('MW4-Einstellungen', PADDING, 120);
    ctx.textBaseline = 'top';
    let y = header;
    for (const { lines, height } of page.cards) {
      ctx.fillStyle = colors.panel;
      ctx.beginPath();
      ctx.roundRect(PADDING, y, WIDTH - 2 * PADDING, height, 14);
      ctx.fill();
      y += CARD_PADDING;
      for (const { line, font, color, height: lineHeight } of lines) {
        ctx.fillStyle = color;
        ctx.font = font;
        ctx.fillText(line, PADDING + CARD_PADDING, y);
        y += lineHeight;
      }
      y += CARD_PADDING + spacing;
    }
    ctx.fillStyle = colors.muted;
    ctx.font = '500 20px system-ui';
    ctx.fillText('eupdategaming.com', PADDING, canvas.height - 44);
    ctx.textAlign = 'right';
    ctx.fillText(`${index + 1} / ${pages.length}`, WIDTH - PADDING, canvas.height - 44);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('Das Bild konnte nicht erstellt werden.');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'eupdate-mw4-einstellungen-' + (index + 1) + '.png';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  }

  return { count: pages.length, download };
}
