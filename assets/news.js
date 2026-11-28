import { API, el, html, loadSiteConfig, serverGet } from './app.js';

const DATA_VERSION = '2026-10-11.16.8';

const LIVE_CACHE_KEY = 'eupdate_live_v16_3';

const LIVE_DAY = 86400000;
const NEWS_REFRESH_INTERVAL = 300_000;
const externalIcon = '<svg class="news-external-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 12l8-8M5 4h7v7"/></svg>';

const OFFICIAL_BLOG = 'https://www.callofduty.com/blog';

const DMZ_GUIDE =
  'https://www.callofduty.com/blog/2026/10/call-of-duty-modern-warfare-4-dmz-how-to-play-forward-operating-base-guide';

const LIVE_SEED = [
  {
    url: DMZ_GUIDE,
    kind: 'mw4',
    mode: 'dmz',
    date: '2026-10-09',
    title: 'DMZ startet drei Tage früher',
    summary:
      'Ab 20. Oktober für digitale Vorbesteller. Standard Digital und Vault Edition zählen. Kampagnen-Vorabzugang beginnt bereits am 16. Oktober.',
  },
  {
    url: 'https://www.callofduty.com/patchnotes/2026/09/call-of-duty-black-ops-7-season-06-patch-notes',
    kind: 'bo7',
    mode: 'zm',
    date: '2026-10-07',
    title: 'BO7: Neues Zombies-Update',
    summary:
      'Fehler in Rex Infernus, Directed und Cursed wurden behoben. Auch ein Problem mit XM325, Titan Wield und Mule Kick ist korrigiert.',
  },
  {
    url: 'https://www.callofduty.com/patchnotes/2026/09/call-of-duty-bo7-warzone-season-06-patch-notes',
    kind: 'wz',
    mode: 'wz',
    date: '2026-10-07',
    title: 'Warzone: C4 reagiert langsamer',
    summary:
      'C4 detoniert nach 0,2 statt 0,05 Sekunden. Gleichzeitig sind weniger Versorgungsdrohnen aktiv: elf in Battle Royale, sieben in Resurgence.',
  },
  {
    url: 'https://www.callofduty.com/blog/2026/10/call-of-duty-modern-warfare-4-dmz-deep-dive-hajin',
    kind: 'mw4',
    mode: 'dmz',
    date: '2026-10-05',
    title: 'DMZ: Hajin im Überblick',
    summary:
      'Der erste Guide stellt Einsatzgebiet, Gegner und wichtige Orte vor. Die neue Heimat für deine DMZ-Runden heißt Hajin.',
  },
  {
    url: 'https://www.callofduty.com/blog/2026/09/call-of-duty-modern-warfare-4-pc-trailer-tech-specs-features',
    kind: 'mw4',
    mode: 'mp',
    date: '2026-09-29',
    title: 'PC: Vorab-Download ab 15. Oktober',
    summary:
      'Der PC-Preload beginnt am 15. Oktober um 18 Uhr MESZ. Digitale Vorbesteller erhalten am 16. Oktober Kampagnen-Vorabzugang.',
  },
  {
    url: 'https://www.callofduty.com/guides/mw4/open-beta-weapons',
    kind: 'mw4',
    mode: 'mp',
    date: '2026-08-27',
    title: 'MW4-Arsenal: 33 Waffen angekündigt',
    summary:
      'Die Beta nennt 22 Grundwaffen. Mojave .357 ist zusätzlich im Multiplayer-Bericht erwähnt. Zehn weitere Namen fehlen noch in den geprüften Quellen.',
  },
];

const LIVE_EVENTS = [
  {
    id: 'preload',
    date: '2026-10-15',
    instant: '2026-10-15T18:00:00+02:00',
    label: 'PC-PRELOAD',
    title: 'Download vor dem Start',
    detail: 'PC · 15. Oktober, 18 Uhr MESZ',
    url: LIVE_SEED[4].url,
  },
  {
    id: 'campaign',
    date: '2026-10-16',
    label: 'KAMPAGNE',
    title: 'Kampagne vorab spielen',
    detail: 'Digitale Vorbesteller · 16. Oktober',
    url: DMZ_GUIDE,
  },
  {
    id: 'dmz',
    date: '2026-10-20',
    label: 'DMZ EARLY ACCESS',
    title: 'Drei Tage vor dem Release',
    detail: 'Digitale Vorbesteller · 20. Oktober · genaue Startzeit noch offen',
    url: DMZ_GUIDE,
  },
  {
    id: 'release',
    date: '2026-10-23',
    label: 'MW4 RELEASE',
    title: 'Das volle Spiel startet',
    detail: '23. Oktober 2026 · Start nach Plattform und Region prüfen',
    url: 'https://www.callofduty.com/modernwarfare4',
  },
];

let liveState = {
    items: [],
    lastSuccess: 0,
    lastAttempt: 0,
    seedDate: '2026-10-10',
    dmzDate: '2026-10-20',
    status: 'seed',
  },
  liveBusy = false,
  liveFilter = 'all';
let newsFetchedAt = 0;

function validOfficial(raw) {
  try {
    const u = new URL(raw);
    return (
      u.protocol === 'https:' &&
      u.hostname === 'www.callofduty.com' &&
      /^\/(blog|patchnotes|guides)\//.test(u.pathname)
    );
  } catch (_) {
    return false;
  }
}

function berlinDay(ms = Date.now()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(ms));
}

function eventDays(iso, ms = Date.now()) {
  return Math.ceil((Date.parse(iso + 'T00:00:00Z') - Date.parse(berlinDay(ms) + 'T00:00:00Z')) / LIVE_DAY);
}

function liveDate(iso) {
  return iso
    ? new Date(iso + 'T12:00:00Z').toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : 'Datum in der Quelle';
}

function eventClock(e, now = Date.now()) {
  if (e.instant) {
    const diff = Date.parse(e.instant) - now;
    if (diff <= 0) return 'Termin erreicht';
    const d = Math.floor(diff / LIVE_DAY),
      h = Math.floor(diff / 3600000) % 24,
      m = Math.floor(diff / 60000) % 60;
    return (d ? d + ' T ' + h + ' Std' : h + ' Std') + ' ' + String(m).padStart(2, '0') + ' Min';
  }
  const d = eventDays(e.date, now);
  return d > 0
    ? 'Noch ' + d + ' ' + (d === 1 ? 'Tag' : 'Tage')
    : d === 0
      ? 'Heute · Startzeit prüfen'
      : 'Termin erreicht';
}

function tick() {
  const dmzEvent = LIVE_EVENTS.find((x) => x.id === 'dmz');
  if (dmzEvent) dmzEvent.date = liveState.dmzDate;
  const now = Date.now(),
    dmz = LIVE_EVENTS.find((x) => x.id === 'dmz');

  document.querySelectorAll('[data-event-clock]').forEach((n) => {
    const e = LIVE_EVENTS.find((x) => x.id === n.dataset.eventClock);
    if (e) n.textContent = eventClock(e, now);
  });
}

function liveNewsMode(item) {
  if (['mp', 'dmz', 'wz', 'cdl'].includes(item.mode)) return item.mode;
  const text = (item.url || '') + ' ' + (item.title || '');
  if (item.kind === 'cdl' || /callofdutyleague\.com|\bCDL\b|call of duty league/i.test(text)) return 'cdl';
  if (item.kind === 'wz' || /warzone/i.test(text)) return 'wz';
  if (/\bdmz\b/i.test(text)) return 'dmz';
  if (/multiplayer|mehrspieler|\bmp\b/i.test(text)) return 'mp';
  return '';
}

function liveNewsLabel(item) {
  const mode = liveNewsMode(item);
  return (
    { cdl: 'CDL / ESPORTS', wz: 'WARZONE', mp: 'MW4 / MULTIPLAYER', dmz: 'MW4 / DMZ' }[mode] ||
    { wz: 'WARZONE', mw4: 'MW4', cdl: 'CDL / ESPORTS' }[item.kind] ||
    'CALL OF DUTY'
  );
}

function articleCreated(item) {
  return Date.parse(item.created || item.published_at || item.publishedAt || '') || 0;
}

function articleDay(item) {
  const day = String(item.date || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(Date.parse(day))) return day;
  return articleCreated(item) ? berlinDay(articleCreated(item)) : '';
}

function newsMeta(item) {
  const day = articleDay(item);
  return '<div class="news-byline"><span>' + html(liveNewsLabel(item)) + '</span>' +
    (day ? '<time datetime="' + day + '">' + html(liveDate(day)) + '</time>' : '') + '</div>';
}

function newsSource(item) {
  return '<a class="news-source-link" href="' + html(item.url) +
    '" target="_blank" rel="noopener noreferrer">Offizielle Quelle ' + externalIcon + '</a>';
}

function newsAiNote(item) {
  return item.aiAssisted
    ? '<p class="news-ai-note">KI-unterstützt aufbereitet · Automatische Zusammenfassung oder Übersetzung. Fehler möglich.</p>'
    : '';
}

function newsImage(item, featured) {
  if (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(item.img || '')) return '';
  return '<figure class="news-image"><img src="' + html(item.img) + '" alt="" decoding="async"' +
    (featured ? '' : ' loading="lazy"') + '></figure>';
}

function archiveNewsSummary(item) {
  const text = String(item.summary || '').trim();
  if (text.length <= 220) return '<p class="news-story-summary">' + html(text) + '</p>';
  const firstLine = text.slice(0, 215).replace(/\s+\S*$/, '');
  return '<p class="news-story-summary news-excerpt">' + html(firstLine) + ' …</p>' +
    '<details class="news-read-more" data-news-url="' + html(item.url) +
    '"><summary>Zusammenfassung lesen</summary><p class="news-story-summary">' + html(text) + '</p></details>';
}

let renderedStories = '';

function renderNewsStories(items) {
  const key = JSON.stringify(items.map(item => [
    item.id, item.url, articleDay(item), item.title, item.summary, item.kind, item.mode, item.aiAssisted, item.img
  ]));
  if (key === renderedStories) return;
  renderedStories = key;
  const [latest, ...archive] = items;
  const lead = el('latestNewsHero');
  const archiveNode = el('patchList');
  const openStories = new Set([...archiveNode.querySelectorAll('.news-read-more[open]')].map(node => node.dataset.newsUrl));
  lead.hidden = !latest;
  if (latest) {
    const picture = newsImage(latest, true);
    lead.classList.toggle('has-image', Boolean(picture));
    lead.innerHTML = '<div class="news-feature-copy">' + newsMeta(latest) + '<h2>' + html(latest.title) +
      '</h2><p class="news-feature-summary">' + html(latest.summary || '') + '</p>' +
      newsAiNote(latest) + newsSource(latest) + '</div>' + picture;
  } else lead.replaceChildren();
  el('newsArticlesHeading').hidden = !archive.length;
  archiveNode.innerHTML = items.length
    ? archive.map(item => {
      const picture = newsImage(item, false);
      return '<article class="news-story' + (picture ? ' has-image' : '') + '"><div class="news-story-copy">' +
        newsMeta(item) + '<h3>' + html(item.title) + '</h3>' + archiveNewsSummary(item) +
        newsAiNote(item) + newsSource(item) + '</div>' + picture + '</article>';
    }).join('')
    : '<p class="empty">Für diese Auswahl gibt es gerade keine Meldungen.</p>';
  for (const details of archiveNode.querySelectorAll('.news-read-more')) {
    details.open = openStories.has(details.dataset.newsUrl);
  }
}

function renderLive() {
  const filters = el('liveFilters');
  if (!filters) return;
  for (const button of filters.querySelectorAll('[data-live-filter]')) {
    button.setAttribute('aria-pressed', String(button.dataset.liveFilter === liveFilter));
  }
  const allItems = liveState.items
    .filter(x => x && x.kind !== 'bo7')
    .sort((a, b) => articleDay(b).localeCompare(articleDay(a)) || articleCreated(b) - articleCreated(a) ||
      Number(b.id || 0) - Number(a.id || 0));
  const items = allItems.filter(
    item => liveFilter === 'all' || (liveFilter === 'mw4' ? item.kind === 'mw4' : liveNewsMode(item) === liveFilter)
  );
  renderNewsStories(items);
  const latestDay = allItems[0] ? articleDay(allItems[0]) : '';
  const latestDate = el('latestNewsDate');
  latestDate.hidden = !latestDay;
  latestDate.textContent = latestDay ? 'Neueste Meldung vom ' + liveDate(latestDay) : '';
  const events = LIVE_EVENTS.filter((e) =>
    e.instant ? Date.parse(e.instant) > Date.now() : eventDays(e.date) >= 0,
  ).sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  el('emptyNewsDates').hidden = events.length > 0;
  el('eventTimeline').innerHTML = events
    .map(
      (e) =>
        '<article class="date-card"><div class="event-date"><b>' +
        Number(e.date.slice(-2)) +
        '</b><span>' +
        new Date(e.date + 'T12:00:00Z').toLocaleDateString('de-DE', { month: 'short' }) +
        '</span></div><div><span class="eyebrow">' +
        html(e.label) +
        '</span><h3>' +
        html(e.title) +
        '</h3><p>' +
        html(e.detail) +
        '</p><strong data-event-clock="' +
        e.id +
        '">' +
        eventClock(e) +
        '</strong><a href="' +
        html(e.url) +
        '" target="_blank" rel="noopener">Quelle ' + externalIcon + '</a></div></article>',
    )
    .join('');
  const success = liveState.lastSuccess
    ? new Date(liveState.lastSuccess).toLocaleString('de-DE', {
        timeZone: 'Europe/Berlin',
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';
  const status = liveBusy
    ? 'Meldungen werden geladen …'
    : liveState.status === 'paused'
      ? 'Automatische Quellenprüfung pausiert'
      : liveState.status === 'error'
        ? 'Abruf fehlgeschlagen' + (success ? ' · Quellen zuletzt geprüft am ' + success + ' Uhr' : '')
        : success
          ? 'Quellen geprüft am ' + success + ' Uhr'
          : 'Die erste Quellenprüfung steht noch aus';
  el('patchStatus').textContent = status;
  el('patchStatus').title = liveState.warning || '';
  const sources = liveState.sources || [],
    sourceTime = (value) =>
      value
        ? new Date(value).toLocaleString('de-DE', {
            timeZone: 'Europe/Berlin',
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })
        : '';
  el('liveSourcesList').innerHTML = sources.length
    ? sources
        .map(
          (s) =>
            '<li><a href="' +
            html(s.url) +
            '" target="_blank" rel="noopener noreferrer">' +
            html(s.label) +
            '</a><small>' +
            html(
              (s.ok ? 'Geprüft' : 'Abruf fehlgeschlagen') +
                (s.checked ? ' · ' + sourceTime(s.checked) + ' Uhr' : ''),
            ) +
            '</small></li>',
        )
        .join('')
    : '<li>Die Quellenübersicht erscheint nach der ersten Prüfung mit dem aktualisierten Server.</li>';

  el('liveRefresh').disabled = liveBusy;
  el('liveRefresh').textContent = liveBusy ? 'Lädt …' : 'Meldungen laden';
  tick();
}

function articleDate(text) {
  const months = {
    January: '01',
    February: '02',
    March: '03',
    April: '04',
    May: '05',
    June: '06',
    July: '07',
    August: '08',
    September: '09',
    October: '10',
    November: '11',
    December: '12',
  };
  const body = text.split('Markdown Content:')[1] || text;
  const m = body.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(20\d{2})/,
  );
  if (m) return m[3] + '-' + months[m[1]] + '-' + m[2].padStart(2, '0');
  const pub = text.match(/Published Time:\s*([^\n]+)/);
  if (pub) {
    const time = Date.parse(pub[1]);
    if (Number.isFinite(time)) return new Date(time).toISOString().slice(0, 10);
  }
  return null;
}

function scanOfficialNews(markdown) {
  const matches = [
      ...markdown.matchAll(
        /^\[([^\]\n]+)\]\((https:\/\/www\.callofduty\.com\/(?:blog|patchnotes)\/20\d{2}\/\d{2}\/[^)\s]+)\)/gm,
      ),
    ],
    unique = new Set(),
    out = [];
  for (const m of matches) {
    const url = m[2];
    if (
      unique.has(url) ||
      !/modern-warfare-4|modernwarfare4|black-ops-7|bo7|warzone/i.test(url) ||
      /\/202[0-5]\//.test(url)
    )
      continue;
    unique.add(url);
    const kind = /warzone/i.test(url) ? 'wz' : /black-ops-7|bo7/i.test(url) ? 'bo7' : 'mw4';
    const known = LIVE_SEED.find((x) => x.url === url);
    out.push(
      known
        ? { ...known }
        : {
            url,
            kind,
            date: null,
            title:
              kind === 'wz'
                ? 'Warzone: Neue offizielle Meldung'
                : kind === 'bo7'
                  ? 'BO7: Neue offizielle Meldung'
                  : /dmz/i.test(url)
                    ? 'DMZ: Neue offizielle Meldung'
                    : 'MW4: Neue offizielle Meldung',
            sourceTitle: m[1].slice(0, 140),
            summary:
              'Eine neue Meldung wurde auf der offiziellen Call-of-Duty-Seite gefunden. Öffne die Quelle für die Einzelheiten.',
          },
    );
    if (out.length === 8) break;
  }
  return out;
}

function dmzEarlyDate(text) {
  const p =
    text.match(/DMZ Early Access Launches\s+(October|November|December)\s+(\d{1,2})/i) ||
    text.match(/DMZ Early Access[^\n]{0,80}(October|November|December)\s+(\d{1,2})/i);
  return p
    ? '2026-' +
        { october: '10', november: '11', december: '12' }[p[1].toLowerCase()] +
        '-' +
        p[2].padStart(2, '0')
    : null;
}

function patchStatus() {
  renderLive();
  checkLive();
}

async function checkLive(force = false) {
  if (liveBusy) return;
  if (!API) {
    liveState.status = 'seed';
    renderLive();
    return;
  }
  if (!force && Date.now() - newsFetchedAt < NEWS_REFRESH_INTERVAL) return;
  liveBusy = true;
  renderLive();
  try {
    const [data] = await Promise.all([serverGet('/api/news'), loadSiteConfig()]);
    liveState.items = Array.isArray(data.items) ? data.items.filter((x) => x && x.kind !== 'bo7') : [];
    liveState.lastSuccess = data.lastSuccess ? Date.parse(data.lastSuccess) : 0;
    liveState.lastAttempt = data.lastAttempt ? Date.parse(data.lastAttempt) : 0;
    liveState.reviewCount = Number(data.reviewCount || 0);
    liveState.fetchErrors = Number(data.fetchErrors || 0);
    liveState.warning = data.warning || data.error || '';
    liveState.sources = Array.isArray(data.sources) ? data.sources : [];
    liveState.articleLimit = Number(data.articleLimit || 0);
    const failed = data.failed === true;
    liveState.status = data.paused ? 'paused' : failed ? 'error' : data.lastSuccess ? 'ok' : 'seed';
    newsFetchedAt = Date.now();
  } catch (err) {
    liveState.status = 'error';
    liveState.warning = String(err?.message || err);
  } finally {
    liveBusy = false;
    renderLive();
  }
}

function applyNewsConfig(config) {
  if (!Array.isArray(config.events)) return;
  LIVE_EVENTS.splice(0, LIVE_EVENTS.length, ...config.events);
  const dmz = LIVE_EVENTS.find((event) => event.id === 'dmz');
  if (dmz) liveState.dmzDate = dmz.date;
}
document.addEventListener('click', (e) => {
  const button = e.target.closest('button');
  if (!button) return;
  if (button.id === 'liveRefresh') checkLive(true);
  if (button.dataset.liveFilter) {
    liveFilter = button.dataset.liveFilter;
    renderLive();
  }
});

export { applyNewsConfig, checkLive, patchStatus, renderLive, tick };
