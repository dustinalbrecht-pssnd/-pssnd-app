import {
  GEAR_NAMES,
  artworkTile,
  draftGear,
  gearEntry,
  gearLabel,
  gearVisual,
} from './ausruestung.js';
import { LOGO, build, creators, feed, head, modal, setupSlots, siteConfig, state, toast, weapon } from './app.js';
import { BY, CAT, CLASS, GAME, MODE, artSource } from './katalog.js';
import { ATTACHMENT_ART_SLOTS, attachmentLanguage, attachmentName } from './aufsaetze.js';
import { weaponNames } from './katalog-abgleich.js';

let outputFilename = '',
  outputBlob = null,
  outputURL = '';

function round(ctx, x, y, w, h, r, fill, stroke) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function fit(ctx, im, x, y, w, h) {
  const scale = Math.min(w / im.width, h / im.height),
    dw = im.width * scale,
    dh = im.height * scale;
  ctx.drawImage(im, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function image(src) {
  return new Promise((resolve) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => resolve(null);
    im.src = src;
  });
}

function ellipsize(ctx, s, width) {
  let t = String(s);
  while (ctx.measureText(t).width > width && t.length > 2) t = t.slice(0, -2);
  return t === s ? t : t + '…';
}

const exportSprites = new Map(),
  exportImageBounds = new WeakMap();
const weaponBackdrop = new URL('./bilder/waffen-buehne.webp', import.meta.url).href;

function drawWeaponBackdrop(ctx, backdrop, x, y, width, height, radius) {
  round(ctx, x, y, width, height, radius, '#20272d', '#414c55');
  if (!backdrop) return;
  const scale = Math.max(width / backdrop.width, height / backdrop.height);
  const imageWidth = backdrop.width * scale;
  const imageHeight = backdrop.height * scale;
  ctx.save();
  ctx.clip();
  ctx.drawImage(backdrop, x + (width - imageWidth) / 2, y + (height - imageHeight) / 2, imageWidth, imageHeight);
  ctx.restore();
}

function exportTextLines(ctx, value, width) {
  const words = String(value || '')
      .trim()
      .split(/\s+/),
    lines = [];
  let line = '';
  for (let word of words) {
    const plain = word.replace(/\u00ad/g, '');
    if (ctx.measureText(plain).width > width) {
      if (line) {
        lines.push(line);
        line = '';
      }
      if (word.includes('\u00ad')) {
        const chunks = word.split('\u00ad');
        let chunk = chunks.shift();
        while (chunks.length && ctx.measureText(chunk + '-').width <= width) {
          lines.push(chunk + '-');
          chunk = chunks.shift();
        }
        word = chunk + chunks.join('');
      }
      let piece = '';
      for (const char of word.replace(/\u00ad/g, '')) {
        if (piece && ctx.measureText(piece + char).width > width) {
          lines.push(piece);
          piece = '';
        }
        piece += char;
      }
      line = piece;
      continue;
    }
    const next = line ? line + ' ' + plain : plain;
    if (line && ctx.measureText(next).width > width) {
      lines.push(line);
      line = plain;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function exportBounds(im) {
  if (exportImageBounds.has(im)) return exportImageBounds.get(im);
  let result = { x: 0, y: 0, w: im.width, h: im.height };
  try {
    const scale = Math.min(1, 640 / Math.max(im.width, im.height)),
      probe = document.createElement('canvas');
    probe.width = Math.max(1, Math.round(im.width * scale));
    probe.height = Math.max(1, Math.round(im.height * scale));
    const p = probe.getContext('2d', { willReadFrequently: true });
    p.drawImage(im, 0, 0, probe.width, probe.height);
    const data = p.getImageData(0, 0, probe.width, probe.height).data;
    let left = probe.width,
      top = probe.height,
      right = -1,
      bottom = -1;
    for (let y = 0; y < probe.height; y++)
      for (let x = 0; x < probe.width; x++)
        if (data[(y * probe.width + x) * 4 + 3] > 30) {
          left = Math.min(left, x);
          right = Math.max(right, x);
          top = Math.min(top, y);
          bottom = Math.max(bottom, y);
        }
    if (right >= left && bottom >= top) {
      const pad = Math.ceil(Math.max(right - left, bottom - top) * 0.025),
        x = Math.max(0, left - pad),
        y = Math.max(0, top - pad),
        r = Math.min(probe.width, right + pad + 1),
        b = Math.min(probe.height, bottom + pad + 1);
      result = { x: x / scale, y: y / scale, w: (r - x) / scale, h: (b - y) / scale };
    }
  } catch (_) {
    /* An opaque or protected custom image is fitted without cropping. */
  }
  exportImageBounds.set(im, result);
  return result;
}

function fitExportImage(ctx, im, x, y, w, h, trim = true) {
  if (!im) return;
  const b = trim ? exportBounds(im) : { x: 0, y: 0, w: im.width, h: im.height },
    scale = Math.min(w / b.w, h / b.h),
    dw = b.w * scale,
    dh = b.h * scale;
  ctx.drawImage(im, b.x, b.y, b.w, b.h, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function drawExportWeapon(ctx, gun, x, y, width, height) {
  ctx.save();
  ctx.filter = 'brightness(1.25) contrast(1.04) saturate(.91) drop-shadow(0 10px 7px #000a)';
  fitExportImage(ctx, gun, x, y, width, height);
  ctx.restore();
}

async function drawExportArt(ctx, group, index, x, y, size) {
  const tile = artworkTile(group, index);
  if (!exportSprites.has(group)) exportSprites.set(group, image(tile.url));
  const im = await exportSprites.get(group);
  if (!im) return;
  const scale = size / Math.max(tile.width, tile.height);
  const width = tile.width * scale, height = tile.height * scale;
  ctx.drawImage(im, tile.x, tile.y, tile.width, tile.height,
    x + (size - width) / 2, y + (size - height) / 2, width, height);
}

function exportGear(b, game, mode) {
  const gear = b.id || b.kind ? { ...b, ...b.gear } : draftGear(b.gear, game, mode);
  return Object.keys(GEAR_NAMES)
    .map((key) => ({ key, value: gear[key] }))
    .filter((x) => x.value && x.value !== 'Keine' && x.value !== 'None');
}

async function exportLoadoutImages(item = null, direct = false, weaponId) {
  const b = item ? { ...item, parts: item.parts || item.attachments || {}, gear: item.gear || {} } : build(),
    weapons = [item ? BY[item.primary] : weapon('primary'), item ? BY[item.secondary] : weapon('secondary')];
  const slots = setupSlots(b.setupType);
  const chosen = weaponId || (slots.length === 1 ? b[slots[0]] :
    item && (!b.primary || !b.secondary) ? b.primary || b.secondary : '');
  const selectedPage = chosen ? weapons.findIndex((w) => w?.id === chosen) : -1;
  if (chosen ? selectedPage < 0 : weapons.some((w) => !w)) {
    toast('Waffen nicht verfügbar');
    return;
  }
  const single = selectedPage >= 0;
  const accent = siteConfig.accent || '#ffda0a',
    results = [],
    mode = item?.mode || state.mode,
    gear = single ? [] : exportGear(b, item?.game || state.game, mode);
  const [logo, backdrop] = await Promise.all([image(siteConfig.logo || LOGO), image(weaponBackdrop)]);
  for (const page of single ? [selectedPage] : [0, 1, 2]) {
    const w = weapons[page] || null,
      parts = w ? b.parts[w.id] || [] : [],
      entries = page === 2 ? gear : parts;
    const c = document.createElement('canvas');
    c.width = 1080;
    c.height = Math.max(1480, 670 + Math.ceil(entries.length / 2) * 160 + 110);
    const ctx = c.getContext('2d');
    const bg = ctx.createLinearGradient(0, 0, 0, c.height);
    bg.addColorStop(0, '#1d242a');
    bg.addColorStop(1, '#080b0e');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, 1080, 12);
    if (logo) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(86, 80, 37, 0, Math.PI * 2);
      ctx.clip();
      if (siteConfig.logo) fitExportImage(ctx, logo, 49, 43, 74, 74, false);
      else ctx.drawImage(logo, 28, 1, 241, 241, 49, 43, 74, 74);
      ctx.restore();
    }
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 42px Arial';
    ctx.fillText(siteConfig.appName || 'eUpdate', 145, 82);
    ctx.fillStyle = accent;
    ctx.font = 'bold 22px Arial';
    ctx.fillText(single ? 'WAFFENSETUP' : 'MEIN LOADOUT  ·  ' + (page + 1) + '/3', 145, 116);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 48px Arial';
    ctx.fillText(['PRIMÄRWAFFE', 'SEKUNDÄRWAFFE', 'PERKS & GRANATEN'][page], 48, 196);
    if (w) {
      drawWeaponBackdrop(ctx, backdrop, 48, 228, 984, 405, 22);
      ctx.fillStyle = accent;
      ctx.font = 'bold 25px Arial';
      ctx.fillText(weaponNames(w)[attachmentLanguage], 76, 280);
      const gun = await image(artSource(w));
      drawExportWeapon(ctx, gun, 75, 290, 930, 305);
    } else {
      round(ctx, 48, 228, 984, 215, 22, '#20272d', '#414c55');
      ctx.fillStyle = accent;
      ctx.font = 'bold 32px Arial';
      ctx.fillText('DEINE AUSRÜSTUNG', 75, 305);
    }
    const top = w ? 680 : 500;
    ctx.fillStyle = accent;
    ctx.font = 'bold 29px Arial';
    ctx.fillText(
      w ? 'ALLE AUFSÄTZE (' + parts.length + ')' : 'PERKS, GRANATEN & FELDAUSRÜSTUNG',
      48,
      top - 20,
    );
    for (let i = 0; i < entries.length; i++) {
      const x = 48 + (i % 2) * 502,
        y = top + Math.floor(i / 2) * 160,
        width = 482;
      round(ctx, x, y, width, 142, 16, '#222a31', '#45515a');
      ctx.fillStyle = accent;
      ctx.fillRect(x, y + 14, 5, 114);
      const e = entries[i];
      if (w) {
        await drawExportArt(
          ctx,
          'attachments',
          Math.max(0, ATTACHMENT_ART_SLOTS.indexOf(e.slot)),
          x + 12,
          y + 30,
          80,
        );
      } else {
        const row = gearEntry(e.key, e.value, mode);
        const visual = gearVisual(e.value, row);
        if (row?.img) fitExportImage(ctx, await image(row.img), x + 12, y + 30, 80, 80);
        else if (visual) await drawExportArt(ctx, visual[2], visual[3], x + 12, y + 30, 80);
      }
      ctx.fillStyle = '#b9c2c9';
      ctx.font = 'bold 20px Arial';
      ctx.fillText(w ? CAT.find((z) => z[0] === e.slot)?.[1] || e.slot : GEAR_NAMES[e.key], x + 102, y + 38);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 27px Arial';
      const label = w ? attachmentName(e) || e.name || '' : gearLabel(e.key, e.value, mode);
      exportTextLines(ctx, label, 355)
        .slice(0, 3)
        .forEach((line, j) => ctx.fillText(line, x + 102, y + 76 + j * 29));
    }
    ctx.fillStyle = '#8d979f';
    ctx.font = '22px Arial';
    ctx.fillText('eUpdate · ' + ['Primärwaffe', 'Sekundärwaffe', 'Ausrüstung'][page], 48, c.height - 45);
    const blob = await new Promise((resolve) => c.toBlob(resolve, 'image/png'));
    if (!blob) throw Error('PNG konnte nicht erstellt werden');
    const name = single ? 'eupdate-' + w.id + '.png' : 'eupdate-loadout-' + (page + 1) + '.png';
    results.push({ blob, url: URL.createObjectURL(blob), name });
  }
  if (window.eupdateThreeUrls) window.eupdateThreeUrls.forEach((x) => URL.revokeObjectURL(x));
  window.eupdateThreeUrls = results.map((x) => x.url);
  if (window.eupdateThreeArchive) URL.revokeObjectURL(window.eupdateThreeArchive.url);
  window.eupdateThreeArchive = null;
  window.eupdateThreeResults = results;
  const mobile = /iPhone|iPad|iPod/.test(navigator.userAgent);
  if (single) {
    modal(
      head(weaponNames(weapons[selectedPage])[attachmentLanguage], 'Waffenbild mit Aufsätzen') +
      '<img class="export-preview" src="' + results[0].url + '" alt="Waffenbild mit Aufsätzen">' +
      '<div class="dialog-actions"><button class="primary-btn" data-export-page="0">Bild ' +
      (mobile ? 'sichern / teilen ↗' : 'herunterladen ↓') + '</button></div>',
    );
    if (direct && !mobile) await saveThreePage(0);
    return;
  }
  const archive = await loadoutZip(results);
  window.eupdateThreeArchive = {
    blob: archive,
    url: URL.createObjectURL(archive),
    name: 'eupdate-loadout-3-bilder.zip',
  };
  modal(
    head('Deine 3 Loadout-Bilder', 'Alle drei PNGs in voller Auflösung zusammen herunterladen oder teilen.') +
      '<div class="dialog-actions"><button class="primary-btn" id="saveAllThreePages">Alle 3 Bilder ' +
      (mobile ? 'sichern / teilen ↗' : 'herunterladen ↓') +
      '</button></div><p class="fine-print">Der Download enthält alle drei PNG-Bilder in einer ZIP-Datei. Auf unterstützten Geräten kannst du die drei Bilder gemeinsam teilen.</p>' +
      results
        .map(
          (r, i) =>
            '<div style="margin:18px 0"><h3>' +
            ['1 · Primärwaffe + Aufsätze', '2 · Sekundärwaffe + Aufsätze', '3 · Perks + Granaten'][i] +
            '</h3><img class="export-preview" src="' +
            r.url +
            '" alt="Loadout Seite ' +
            (i + 1) +
            '"><div class="dialog-actions"><button class="primary-btn" data-export-page="' +
            i +
            '">Bild ' +
            (i + 1) +
            ' speichern ↗</button></div></div>',
        )
        .join('') +
      '<div class="dialog-actions"><button class="ghost-btn" data-close>Schließen</button></div>',
  );
  if (direct && !mobile) await saveAllThreePages(false);
}

function loadoutCrc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

async function loadoutZip(results) {
  const files = [],
    central = [];
  let offset = 0,
    centralSize = 0;
  for (const result of results) {
    const name = new TextEncoder().encode(result.name),
      data = new Uint8Array(await result.blob.arrayBuffer()),
      crc = loadoutCrc32(data),
      header = new Uint8Array(30 + name.length),
      h = new DataView(header.buffer);
    h.setUint32(0, 0x04034b50, true);
    h.setUint16(4, 20, true);
    h.setUint16(12, 33, true);
    h.setUint32(14, crc, true);
    h.setUint32(18, data.length, true);
    h.setUint32(22, data.length, true);
    h.setUint16(26, name.length, true);
    header.set(name, 30);
    files.push(header, data);
    const record = new Uint8Array(46 + name.length),
      r = new DataView(record.buffer);
    r.setUint32(0, 0x02014b50, true);
    r.setUint16(4, 20, true);
    r.setUint16(6, 20, true);
    r.setUint16(14, 33, true);
    r.setUint32(16, crc, true);
    r.setUint32(20, data.length, true);
    r.setUint32(24, data.length, true);
    r.setUint16(28, name.length, true);
    r.setUint32(42, offset, true);
    record.set(name, 46);
    central.push(record);
    centralSize += record.length;
    offset += header.length + data.length;
  }
  const end = new Uint8Array(22),
    e = new DataView(end.buffer);
  e.setUint32(0, 0x06054b50, true);
  e.setUint16(8, results.length, true);
  e.setUint16(10, results.length, true);
  e.setUint32(12, centralSize, true);
  e.setUint32(16, offset, true);
  return new Blob([...files, ...central, end], { type: 'application/zip' });
}

async function saveAllThreePages(share = true) {
  const results = window.eupdateThreeResults;
  if (!results?.length) return;
  if (share && navigator.share && navigator.canShare) {
    try {
      const files = results.map((r) => new File([r.blob], r.name, { type: 'image/png' }));
      if (navigator.canShare({ files })) {
        await navigator.share({ files, title: 'Meine 3 eUpdate Loadout-Bilder' });
        return;
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
    }
  }
  const archive = window.eupdateThreeArchive;
  if (!archive) return;
  const a = document.createElement('a');
  a.href = archive.url;
  a.download = archive.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  toast('Alle 3 Bilder als ZIP bereit ✓');
}

async function saveThreePage(index) {
  const r = window.eupdateThreeResults?.[index];
  if (!r) return;
  if (/iPhone|iPad|iPod/.test(navigator.userAgent) && navigator.share && navigator.canShare) {
    try {
      const file = new File([r.blob], r.name, { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'eUpdate Loadout' });
        return;
      }
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }
  const a = document.createElement('a');
  a.href = r.url;
  a.download = r.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function exportPng(item = null, direct = false) {
  return exportLoadoutImages(item, direct);
  const b = item ? { ...item, parts: item.parts || item.attachments || {}, gear: item.gear || {} } : build(),
    w = item ? BY[item.primary] : weapon('primary'),
    s = item ? BY[item.secondary] : weapon('secondary'),
    game = item?.game || state.game,
    mode = item?.mode || state.mode;
  if (!w || !s) {
    toast('Waffe für dieses Loadout nicht verfügbar.');
    return;
  }
  const accent = siteConfig.accent || '#ffda0a',
    c = document.createElement('canvas');
  c.width = 1080;
  const ctx = c.getContext('2d');
  if (!ctx) {
    toast('Bildexport nicht verfügbar');
    return;
  }
  const primary = b.parts[w.id] || [],
    secondary = b.parts[s.id] || [],
    both = primary.length && secondary.length,
    groups = both
      ? [
          { weapon: w, parts: primary, index: 1 },
          { weapon: s, parts: secondary, index: 2 },
        ]
      : [
          {
            weapon: primary.length ? w : s,
            parts: primary.length ? primary : secondary,
            index: primary.length ? 1 : 2,
          },
        ],
    equipment = exportGear(b, game, mode),
    margin = 48,
    gap = 20,
    cardWidth = (984 - gap) / 2;
  const nameSize = both ? 31 : 35,
    lineHeight = both ? 36 : 40,
    textWidth = cardWidth - 102;
  ctx.font = '700 ' + nameSize + 'px Arial,sans-serif';
  const rows = groups.map((group) => {
    const entries = group.parts.map((part) => {
      const name = attachmentName(part) || part.name || '',
        label = CAT.find((x) => x[0] === part.slot)?.[attachmentLanguage === 'en' ? 2 : 1] || 'Aufsatz';
      ctx.font = '700 ' + nameSize + 'px Arial,sans-serif';
      const lines = exportTextLines(ctx, name, textWidth);
      return { part, label, lines, height: Math.max(88, 32 + lines.length * lineHeight) };
    });
    return { ...group, entries };
  });
  let attachmentHeight;
  if (both)
    attachmentHeight = 66 + Math.max(...rows.map((x) => x.entries.reduce((n, e) => n + e.height + 10, 0)));
  else {
    attachmentHeight = 66;
    for (let i = 0; i < rows[0].entries.length; i += 2)
      attachmentHeight += Math.max(rows[0].entries[i].height, rows[0].entries[i + 1]?.height || 0) + 10;
    if (!rows[0].entries.length) attachmentHeight += 72;
  }
  const gearWidth = (984 - 32) / 3,
    gearEntries = equipment.map((entry) => {
      const label = gearLabel(entry.key, entry.value),
        display = label
          .replace(/Schnappschussgranate/g, 'Schnappschuss\u00adgranate')
          .replace(/Erschütterungsgranate/g, 'Erschütterungs\u00adgranate')
          .replace(/Herzschlagsensor/g, 'Herzschlags\u00adsensor')
          .replace(/Splittergranate/g, 'Splitter\u00adgranate')
          .replace(/Bombenkommando/g, 'Bomben\u00adkommando');
      let size = 26;
      ctx.font = '700 ' + size + 'px Arial,sans-serif';
      while (
        size > 24 &&
        ctx.measureText(label).width > gearWidth - 97 &&
        ctx.measureText(label).width < (gearWidth - 97) * 1.15
      ) {
        size--;
        ctx.font = '700 ' + size + 'px Arial,sans-serif';
      }
      const lines = exportTextLines(ctx, display, gearWidth - 97);
      return { ...entry, size, lines, height: Math.max(102, 34 + lines.length * 29) };
    }),
    gearRowHeights = [];
  for (let i = 0; i < gearEntries.length; i += 3)
    gearRowHeights.push(Math.max(...gearEntries.slice(i, i + 3).map((x) => x.height)));
  const gearHeight = equipment.length ? 48 + gearRowHeights.reduce((n, h) => n + h + 14, 0) : 0,
    base = 712 + attachmentHeight + 24 + gearHeight + 74;
  c.height = Math.max(1350, Math.ceil(base / 10) * 10);
  const background = ctx.createLinearGradient(0, 0, 1080, c.height);
  background.addColorStop(0, '#1d2328');
  background.addColorStop(0.4, '#101417');
  background.addColorStop(1, '#080b0d');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, 1080, c.height);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, 1080, 10);
  const [logo, wi, si, backdrop] = await Promise.all([
    image(siteConfig.logo || LOGO),
    image(artSource(w)),
    image(artSource(s)),
    image(weaponBackdrop),
  ]);
  if (logo) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(84, 75, 36, 0, Math.PI * 2);
    ctx.clip();
    if (siteConfig.logo) fitExportImage(ctx, logo, 48, 39, 72, 72, false);
    else ctx.drawImage(logo, 28, 1, 241, 241, 48, 39, 72, 72);
    ctx.restore();
  }
  ctx.fillStyle = '#f6f7f0';
  ctx.font = '800 39px Arial,sans-serif';
  ctx.fillText(siteConfig.appName || 'eUpdate', 138, 72);
  ctx.fillStyle = accent;
  ctx.font = '700 23px Arial,sans-serif';
  ctx.fillText((GAME[game] || 'COD').toUpperCase() + ' · ' + (MODE[mode] || mode).toUpperCase(), 138, 106);
  ctx.fillStyle = '#f7f8f2';
  ctx.font = '800 45px Arial,sans-serif';
  ctx.fillText(ellipsize(ctx, item?.title || 'MEIN LOADOUT', 984), 48, 165);
  drawWeaponBackdrop(ctx, backdrop, 48, 190, 984, 340, 24);
  ctx.fillStyle = accent;
  ctx.font = '700 22px Arial,sans-serif';
  ctx.fillText('01  /  PRIMÄRWAFFE', 72, 227);
  ctx.fillStyle = '#b9c2c8';
  ctx.font = '23px Arial,sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(CLASS[w.cls] || '', 1008, 227);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fff';
  ctx.font = '800 49px Arial,sans-serif';
  ctx.fillText(ellipsize(ctx, w.name, 910), 72, 284);
  drawExportWeapon(ctx, wi, 75, 296, 930, 213);
  drawWeaponBackdrop(ctx, backdrop, 48, 548, 984, 135, 20);
  ctx.fillStyle = accent;
  ctx.font = '700 21px Arial,sans-serif';
  ctx.fillText('02  /  SEKUNDÄRWAFFE', 72, 586);
  ctx.fillStyle = '#fff';
  ctx.font = '800 37px Arial,sans-serif';
  ctx.fillText(ellipsize(ctx, s.name, 596), 72, 634);
  drawExportWeapon(ctx, si, 702, 561, 294, 105);
  async function drawPart(entry, x, y, width) {
    round(ctx, x, y, width, entry.height, 15, '#22292f', '#414d56');
    ctx.fillStyle = accent;
    ctx.fillRect(x, y + 14, 4, entry.height - 28);
    await drawExportArt(
      ctx,
      'attachments',
      Math.max(0, ATTACHMENT_ART_SLOTS.indexOf(entry.part.slot)),
      x + 12,
      y + (entry.height - 64) / 2,
      64,
    );
    ctx.fillStyle = '#b8c1c9';
    ctx.font = '700 19px Arial,sans-serif';
    ctx.fillText(entry.label + (entry.part.custom ? ' · eigene Angabe' : ''), x + 87, y + 25);
    ctx.fillStyle = '#fff';
    ctx.font = '700 ' + nameSize + 'px Arial,sans-serif';
    entry.lines.forEach((line, i) => ctx.fillText(line, x + 87, y + 57 + i * lineHeight));
  }
  const attachmentY = 712;
  ctx.fillStyle = accent;
  ctx.font = '700 25px Arial,sans-serif';
  ctx.fillText('AUFSÄTZE', 48, attachmentY + 25);
  if (both) {
    for (let col = 0; col < rows.length; col++) {
      const group = rows[col],
        x = 48 + col * (cardWidth + 20);
      ctx.fillStyle = '#c9d0d5';
      ctx.font = '700 23px Arial,sans-serif';
      ctx.fillText(ellipsize(ctx, group.index + ' · ' + group.weapon.name, cardWidth), x, attachmentY + 58);
      let y = attachmentY + 76;
      for (const entry of group.entries) {
        await drawPart(entry, x, y, cardWidth);
        y += entry.height + 10;
      }
    }
  } else {
    const group = rows[0];
    ctx.fillStyle = '#c9d0d5';
    ctx.font = '700 23px Arial,sans-serif';
    ctx.fillText(
      ellipsize(
        ctx,
        group.entries.length
          ? group.weapon.name + ' · ' + group.entries.length + ' gewählt'
          : 'Keine Aufsätze ausgewählt',
        984,
      ),
      48,
      attachmentY + 58,
    );
    let y = attachmentY + 76;
    for (let i = 0; i < group.entries.length; i += 2) {
      await drawPart(group.entries[i], 48, y, cardWidth);
      if (group.entries[i + 1]) await drawPart(group.entries[i + 1], 48 + cardWidth + 20, y, cardWidth);
      y += Math.max(group.entries[i].height, group.entries[i + 1]?.height || 0) + 10;
    }
  }
  let gearY = attachmentY + attachmentHeight + 34;
  if (equipment.length) {
    ctx.fillStyle = accent;
    ctx.font = '700 25px Arial,sans-serif';
    ctx.fillText('DEINE AUSRÜSTUNG', 48, gearY + 25);
    gearY += 48;
    const width = gearWidth;
    for (let i = 0; i < gearEntries.length; i++) {
      const { key, value, size, lines } = gearEntries[i],
        r = Math.floor(i / 3),
        x = 48 + (i % 3) * (width + 16),
        y = gearY + gearRowHeights.slice(0, r).reduce((n, h) => n + h + 14, 0);
      round(ctx, x, y, width, gearRowHeights[r], 15, '#20272d', '#414d56');
      const row = gearEntry(key, value),
        visual = gearVisual(value, row);
      if (row?.img) fitExportImage(ctx, await image(row.img), x + 9, y + 17, 67, 67);
      else if (visual) await drawExportArt(ctx, visual[2], visual[3], x + 7, y + 16, 70);
      ctx.fillStyle = '#aeb9c0';
      ctx.font = '700 17px Arial,sans-serif';
      ctx.fillText(GEAR_NAMES[key] || key, x + 85, y + 25);
      ctx.fillStyle = '#f6f7f0';
      ctx.font = '700 ' + size + 'px Arial,sans-serif';
      lines.forEach((line, j) => ctx.fillText(line, x + 85, y + 54 + j * 29));
    }
  }
  ctx.strokeStyle = '#414d56';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(48, c.height - 64);
  ctx.lineTo(1032, c.height - 64);
  ctx.stroke();
  ctx.fillStyle = '#adb8bf';
  ctx.font = '20px Arial,sans-serif';
  const owner = item?.name || (!item ? state.lastName : '');
  ctx.fillText(
    ellipsize(ctx, (owner ? owner + ' · ' : '') + new Date().toLocaleDateString('de-DE'), 590),
    48,
    c.height - 30,
  );
  ctx.textAlign = 'right';
  ctx.fillText('Eigene Konzeptgrafiken · eUpdate', 1032, c.height - 30);
  ctx.textAlign = 'left';
  let blob;
  try {
    blob = await new Promise((resolve) => c.toBlob(resolve, 'image/png'));
  } catch (_) {
    toast('Ein Bild lässt sich nicht exportieren. Bitte die hochgeladene Grafik prüfen.');
    return;
  }
  if (!blob) {
    toast('Bild konnte nicht erstellt werden');
    return;
  }
  outputFilename = 'eupdate-' + game + '-' + mode + '.png';
  outputBlob = blob;
  if (outputURL) URL.revokeObjectURL(outputURL);
  outputURL = URL.createObjectURL(blob);
  if (direct && !/iPhone|iPad|iPod/.test(navigator.userAgent)) {
    await saveExport();
    return;
  }
  modal(
    head('Dein Loadout-Bild', c.width + ' × ' + c.height + ' · Waffen, Aufsätze und Ausrüstung') +
      '<img class="export-preview" src="' +
      outputURL +
      '" alt="Dein Loadout mit allen ausgewählten Aufsätzen und der Ausrüstung"><div class="dialog-actions"><button class="primary-btn" id="saveExport">' +
      (/iPhone|iPad|iPod/.test(navigator.userAgent) ? 'In Fotos sichern ↗' : 'PNG herunterladen ↓') +
      '</button><button class="ghost-btn" data-close>Fertig</button></div><p class="fine-print">' +
      (/iPhone|iPad|iPod/.test(navigator.userAgent)
        ? 'Im Teilen-Menü „Bild sichern“ wählen.'
        : 'Das Bild wird als PNG heruntergeladen.') +
      '</p>',
  );
}

async function saveExport() {
  if (!outputBlob) return;
  const name = outputFilename || 'eupdate-mw4.png';
  if (/iPhone|iPad|iPod/.test(navigator.userAgent) && navigator.share && navigator.canShare) {
    try {
      const f = new File([outputBlob], name, { type: 'image/png' });
      if (navigator.canShare({ files: [f] })) {
        await navigator.share({ files: [f], title: 'Mein eUpdate Loadout' });
        return;
      }
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }
  const a = document.createElement('a');
  a.href = outputURL;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  toast('Bild bereit ✓');
}

async function downloadRank(id, kind, weaponId) {
  const item = kind === 'creators' ? creators.find((x) => x.id === id) : feed.find((x) => x.id === id);
  if (item) await exportLoadoutImages(item, true, weaponId);
}

document.addEventListener('click', (e) => {
  const button = e.target.closest('button');
  if (!button) return;
  if (button.id === 'shareLoadout') exportPng();
  if (button.dataset.exportPage !== undefined) saveThreePage(Number(button.dataset.exportPage));
  if (button.id === 'saveAllThreePages') saveAllThreePages();
  if (button.id === 'saveExport') saveExport();
});

export { downloadRank, exportPng, image };
