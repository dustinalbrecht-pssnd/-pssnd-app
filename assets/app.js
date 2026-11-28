import { BY, GAME, MODE, WM, art, loadWeaponCatalog } from './katalog.js';
import { downloadRank, exportPng, image } from './bildexport.js';
import { importLoadout, payload, postLoadout, renderBuilder, validateDraft } from './bauen.js';
import { currentParam, currentView, navigate, startNavigation } from './navigation.js';
import { GEAR_NAMES, managedItems } from './ausruestung.js';
import { availableInMode } from './mw4-ausruestung.js';
import { activateRanking, avatar, renderFeed, setFeedStatus, updateCommunityConnection } from './ranking.js';
import { renderCurrentDetail } from './loadout.js';
import { applyNewsConfig, checkLive, renderLive, tick } from './news.js';
import { attachmentLanguage, renderGunsmith } from './aufsaetze.js';
import { weaponNames } from './katalog-abgleich.js';
import { applyGameSettingsCopy, showGameSettings } from './einstellungen.js?v=mw4-community-20261126';
import { BANNER_HEIGHT, BANNER_WIDTH } from './mw4-inhalte.js';
import { countPageView } from './zugriffe.js';
import { clearVisitorVerification, needsVisitorVerification, visitorVerification } from './community-verification.js?v=community-security-20261126';
import { applyPageSeo, SEO_PAGES } from './seo.js';

const API = 'https://eupdate-server.dustin-albrecht.workers.dev';
const COMMUNITY_REFRESH_MS = 60_000;

const LOGO = new URL('./bilder/logo.jpg', import.meta.url).href;

const html = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );

const el = (id) => document.getElementById(id);

const BO7_MODES = ['wz', 'mp', 'ranked', 'zm'],
  MW4_MODES = ['wz', 'mp', 'ranked', 'dmz'];

let weeklyWinnerIds = [],
  weeklyStreamerWinnerIds = null,
  weeklyPeriod = null;

let state = { game: 'mw4', mode: 'wz', builds: {}, liked: false },
  feed = [],
  creators = [],
  tipMode = 'wz',
  crop = null,
  toastTimer;
const picker = { slot: '', category: 'all' };

try {
  const s = JSON.parse(
    localStorage.getItem('eupdate_v14') ||
      localStorage.getItem('eupdate_v13') ||
      localStorage.getItem('eupdate_v12') ||
      'null',
  );
  if (s && s.builds && typeof s.builds === 'object') {
    state = { ...state, ...s };
    if (!GAME[state.game]) state.game = 'mw4';
  }
} catch (_) {}

function save() {
  try {
    localStorage.setItem('eupdate_v14', JSON.stringify(state));
  } catch (_) {
    toast('Speichern auf diesem Gerät nicht möglich');
  }
}

function toast(s) {
  el('toast').textContent = s;
  el('toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el('toast').classList.remove('show'), 3200);
}

function currentKey() {
  return state.game + '-' + state.mode;
}

function candidates(slot, game = state.game) {
  const items = WM.filter(
    (w) => w.game === game && availableInMode(w, state.mode),
  );
  return items.filter((w) =>
    slot === 'primary' ? !['pistol', 'launcher', 'melee', 'special'].includes(w.cls) : true,
  );
}

function initial() {
  const list = candidates('primary'),
    secondaryList = candidates('secondary'),
    secondary = secondaryList.find((w) => w.cls === 'pistol') ||
      secondaryList.find((w) => w.id !== list[0]?.id) || list[0];
  return { primary: list[0]?.id || '', secondary: secondary?.id || '', parts: {}, gear: {} };
}

function build() {
  const key = currentKey();
  if (!state.builds[key]) state.builds[key] = initial();
  return state.builds[key];
}

function setupSlots(type) {
  return type === 'primary' || type === 'secondary' ? [type] : ['primary', 'secondary'];
}

function weapon(slot) {
  return BY[build()[slot]] || null;
}

function pieces(slot) {
  return build().parts?.[weapon(slot)?.id] || [];
}

function storedParts(w) {
  return build().parts?.[w?.id] || [];
}

function modal(content, mode = '') {
  if (mode !== 'comments') commentsContext = null;
  if (el('modal').hidden) previousModalFocus = document.activeElement;
  const dialog = el('modal').querySelector('.dialog'),
    standard = !['weapons', 'comments', 'feedback'].includes(mode);
  dialog.classList.toggle('weapon-picker', mode === 'weapons');
  dialog.classList.toggle('comments-dialog', mode === 'comments');
  dialog.classList.toggle('feedback-dialog', mode === 'feedback');
  dialog.classList.toggle('standard-dialog', standard);
  dialog.classList.toggle('equipment-picker', mode === 'equipment');
  const body = el('modalBody');
  body.innerHTML = content;
  if (standard) {
    const heading = body.querySelector(':scope > .dialog-head');
    if (heading) {
      const scroll = document.createElement('div');
      scroll.className = 'dialog-scroll';
      while (heading.nextSibling) scroll.append(heading.nextSibling);
      body.append(scroll);
    }
  }
  dialog.setAttribute('aria-label', body.querySelector('h2')?.textContent || 'Auswahl');
  el('modal').hidden = false;
  document.body.style.overflow = 'hidden';
  dialog.scrollTop = 0;
  body.querySelector('.close')?.focus({ preventScroll: true });
}

function closeModal() {
  commentsContext = null;
  el('modal').hidden = true;
  document.body.style.overflow = el('termsGate') && !el('termsGate').hidden ? 'hidden' : '';
  if (previousModalFocus?.isConnected) previousModalFocus.focus({ preventScroll: true });
  previousModalFocus = null;
}

function head(title, sub = '') {
  return (
    '<div class="dialog-head"><div><h2>' +
    html(title) +
    '</h2><p>' +
    html(sub) +
    '</p></div><button class="close" data-close aria-label="Schließen">×</button></div>'
  );
}

const STARTERS = [];

function card(x, starter = false) {
  const w = BY[x.primary] || WM[0],
    s = BY[x.secondary];
  return (
    '<article class="loadout-card"><div class="card-top"><span class="chip">' +
    html(GAME[x.game] || 'COD') +
    ' · ' +
    html(MODE[x.mode] || '') +
    '</span><span class="heart-count">' +
    (starter ? 'VORLAGE' : '♥ ' + Number(x.likes || 0)) +
    '</span></div><div class="card-art weapon-stage">' +
    art(w) +
    '</div><h3>' +
    html(x.title) +
    '</h3><div class="card-sub">' +
    html(weaponNames(w)[attachmentLanguage]) +
    ' + ' +
    html(weaponNames(s)[attachmentLanguage] || x.secondaryText || '—') +
    '</div><p>' +
    html(x.description || x.note || 'Von ' + x.name) +
    '</p><div class="card-actions"><button data-' +
    (starter ? 'starter' : 'copy') +
    '="' +
    html(starter ? STARTERS.indexOf(x) : x.id) +
    '">Übernehmen ↗</button>' +
    (starter ? '' : '<button data-like="' + x.id + '">♡ Liken</button>') +
    '</div></article>'
  );
}

async function anonId() {
  let id = '';
  try {
    id = localStorage.getItem('eupdate_v12_visitor') || '';
    if (!/^[a-f0-9]{32}$/.test(id)) {
      const b = new Uint8Array(16);
      crypto.getRandomValues(b);
      id = Array.from(b, (v) => v.toString(16).padStart(2, '0')).join('');
      localStorage.setItem('eupdate_v12_visitor', id);
    }
  } catch (_) {
    throw Error('Lokale Speicherung wird benötigt');
  }
  return id;
}

async function apiPost(path, payload) {
  if ((payload?.setupType === 'primary' || payload?.setupType === 'secondary') &&
      siteConfig.supportsSingleWeaponSetups !== true) {
    throw Error('Für die Veröffentlichung von Einzelwaffen braucht der Worker das Setup-Update. Dein Entwurf ist gespeichert.');
  }
  if (payload?.weaponSeasons && siteConfig.supportsWeaponSeasons !== true) {
    throw Error('Der Community-Server speichert noch keine Waffen-Seasons. Dein Entwurf bleibt gespeichert.');
  }
  if (payload?.weaponProfiles && siteConfig.supportsWeaponProfiles !== true) {
    throw Error('Der Community-Server braucht das Update für Einsatzdistanz und Waffenhinweise. Dein Entwurf ist gespeichert.');
  }
  const isReport = path === '/api/reports' || /^\/api\/reports\/\d+\/status$/.test(path);
  const id = isReport ? '' : await anonId();
  const verify = id && siteConfig.visitorVerification === true && needsVisitorVerification(path, payload);
  const headers = { 'content-type': 'application/json', ...(id ? { 'x-eupdate-visitor': id } : {}) };
  if (verify) headers['x-eupdate-session'] = await visitorVerification(API, id, siteConfig.turnstileSiteKey);
  const send = () => fetch(API + path, {
    method: 'POST', credentials: 'omit', redirect: 'error', headers,
    body: JSON.stringify({ ...termsReceipt(), ...(payload || {}) }),
  });
  let r = await send();
  if (verify && r.status === 428 && (await r.clone().json().catch(() => ({}))).code === 'visitor_verification') {
    clearVisitorVerification();
    headers['x-eupdate-session'] = await visitorVerification(API, id, siteConfig.turnstileSiteKey);
    r = await send();
  }
  let data = {};
  try {
    data = await r.json();
  } catch (_) {}
  if (!r.ok) {
    const err = Object.assign(Error(data.error || 'Server nicht erreichbar'), { status: r.status });
    reopenTermsAfterError(err);
    throw err;
  }
  return data;
}

function clearCrop() {
  if (crop?.url) URL.revokeObjectURL(crop.url);
  crop = null;
}

function creatorForm() {
  if (API && siteConfig.communityReady !== true) {
    communityBlocked();
    return;
  }
  clearCrop();
  modal(
    head('Streamer-Loadout zeigen', 'Dein gebautes Loadout · Foto und Links sind optional') +
      '<form id="creatorForm" class="form-grid"><label class="wide">Dein Freigabecode<input id="creatorCode" class="field" type="password" required maxlength="64" autocomplete="off" placeholder="Code von eUpdate" spellcheck="false"><small>Dein Code ordnet den Beitrag deinem Streamer-Namen zu.</small></label><label>Name<input id="creatorName" class="field" maxlength="40" required placeholder="Dein Creator-Name"></label><label>Kanalname<input id="creatorHandle" class="field" maxlength="45" placeholder="@deinname"></label><label class="wide">Kurz zum Loadout<textarea id="creatorNote" class="field" maxlength="180" placeholder="Warum nutzt du es?"></textarea></label><label>YouTube · optional<input id="creatorYoutube" class="field" type="url" placeholder="https://youtube.com/@…"></label><label>Twitch · optional<input id="creatorTwitch" class="field" type="url" placeholder="https://twitch.tv/…"></label><label class="wide">Instagram · optional<input id="creatorInstagram" class="field" type="url" placeholder="https://instagram.com/…"></label><label class="wide">Dein Foto (bis 10 MB)<input class="field" id="creatorPhoto" type="file" accept="image/jpeg,image/png,image/webp"></label><div class="wide" id="cropArea" hidden><div class="crop-box" id="cropBox"><img id="cropImage" alt="Fotoausschnitt"></div><div class="crop-controls"><span>−</span><input type="range" id="cropZoom" min="1" max="3" step=".02" value="1" aria-label="Foto zoomen"><span>＋</span></div><p class="fine-print">Bild mit dem Finger verschieben und mit dem Regler zoomen.</p></div>' +
      privacyConfirmation() +
      publicationRules() +
      '<label class="wide consent"><input type="checkbox" name="consent" required><span>Ich darf diese Inhalte verwenden und willige in die öffentliche Veröffentlichung meines Namens, Loadouts, optionalen Fotos und meiner Kanal-Links ein. Widerruf und Löschung sind jederzeit über „Meine Beiträge“ oder den Betreiberkontakt möglich.</span></label><div class="dialog-actions wide"><button type="submit" class="primary-btn">Streamer-Loadout speichern ↗</button><button type="button" class="ghost-btn" data-close>Zurück</button></div></form><p class="fine-print">' +
      (API
        ? 'Dein Beitrag wird nach Prüfung öffentlich sichtbar.'
        : 'Zum Veröffentlichen als Streamer muss der Community-Server verbunden sein. Dort wird dein persönlicher Code geprüft.') +
      '</p>',
  );
}

function validateSocial(raw, hosts) {
  if (!raw) return '';
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' && hosts.includes(u.hostname) ? u.href.slice(0, 180) : '';
  } catch (_) {
    return '';
  }
}

function cropStyle() {
  if (!crop) return;
  const box = el('cropBox'),
    img = el('cropImage');
  if (!box || !img) return;
  const n = 220,
    scale = Math.max(n / crop.width, n / crop.height) * crop.zoom,
    w = crop.width * scale,
    h = crop.height * scale;
  crop.x = Math.max(n - w, Math.min(0, crop.x));
  crop.y = Math.max(n - h, Math.min(0, crop.y));
  img.style.width = w + 'px';
  img.style.height = h + 'px';
  img.style.left = crop.x + 'px';
  img.style.top = crop.y + 'px';
}

async function loadCrop(file) {
  if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
    toast('Bitte JPG, PNG oder WebP bis 10 MB wählen');
    return;
  }
  const src = URL.createObjectURL(file),
    im = await image(src);
  if (!im) {
    URL.revokeObjectURL(src);
    toast('Bild nicht lesbar');
    return;
  }
  if (crop?.url) URL.revokeObjectURL(crop.url);
  crop = { url: src, width: im.naturalWidth, height: im.naturalHeight, zoom: 1, x: 0, y: 0 };
  el('cropArea').hidden = false;
  el('cropImage').src = src;
  const scale = Math.max(220 / im.naturalWidth, 220 / im.naturalHeight);
  crop.x = (220 - im.naturalWidth * scale) / 2;
  crop.y = (220 - im.naturalHeight * scale) / 2;
  cropStyle();
}

async function croppedPhoto() {
  if (!crop) return '';
  const im = await image(crop.url);
  if (!im) return '';
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 320;
  const ctx = canvas.getContext('2d'),
    scale = Math.max(220 / crop.width, 220 / crop.height) * crop.zoom;
  ctx.drawImage(im, -crop.x / scale, -crop.y / scale, 220 / scale, 220 / scale, 0, 0, 320, 320);
  return canvas.toDataURL('image/jpeg', 0.72);
}

async function submitCreator(e) {
  e.preventDefault();
  if (!confirmedPrivacy(e.target)) return;
  if (!validateDraft()) return;
  if (!API) {
    toast('Streamer-Veröffentlichung benötigt den verbundenen Community-Server.');
    return;
  }
  if (API && siteConfig.communityReady !== true) {
    toast('Die Community ist noch geschlossen.');
    return;
  }
  const links = {
    youtube: validateSocial(el('creatorYoutube').value.trim(), [
      'youtube.com',
      'www.youtube.com',
      'youtu.be',
    ]),
    twitch: validateSocial(el('creatorTwitch').value.trim(), ['twitch.tv', 'www.twitch.tv']),
    instagram: validateSocial(el('creatorInstagram').value.trim(), ['instagram.com', 'www.instagram.com']),
  };
  for (const id of ['youtube', 'twitch', 'instagram'])
    if (el('creator' + id[0].toUpperCase() + id.slice(1)).value.trim() && !links[id]) {
      toast('Bitte gültige HTTPS-Kanal-Links eintragen');
      return;
    }
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true;
  try {
    const photo = await croppedPhoto(),
      item = {
        ...payload(),
        id: Date.now(),
        created: new Date().toISOString(),
        likes: 0,
        title: weaponNames(weapon(setupSlots(build().setupType)[0]))[attachmentLanguage] + ' · ' + MODE[state.mode],
        name: el('creatorName').value.trim().slice(0, 40),
        handle: el('creatorHandle').value.trim().slice(0, 45),
        note: el('creatorNote').value.trim().slice(0, 180),
        photo,
        ...links,
      };
    if (API) {
      rememberSubmission(
        'creators',
        await apiPost('/api/creators', {
          ...item,
          creatorCode: el('creatorCode').value.trim(),
          ...privacyReceipt(e.target),
        }),
      );
      toast('Zur Freigabe gesendet ✓');
    } else {
      localStreamers.unshift(item);
      try {
        localStorage.setItem(STREAMER_KEY, JSON.stringify(localStreamers.slice(0, 25)));
      } catch (_) {
        localStreamers.shift();
        throw Error('Gerätespeicher voll. Bitte freien Speicher schaffen.');
      }
      creators = localStreamers;
      toast('Auf diesem Gerät gespeichert ✓');
    }
    closeModal();
    navigate('feed', { params: { streamer: '1' } });
  } catch (err) {
    await updateChangedPrivacy(e.target, err);
    btn.disabled = false;
    toast(err.message);
  }
}

async function likeApp() {
  if (likeBusy.has('support')) return;
  const confirmed = await toggleLike('support', API ? '/api/support/like' : null, supportVote(), updateSupportHeart);
  if (confirmed) {
    state.liked = confirmed.liked;
    supportLikes = confirmed.likes;
    save();
    toast(confirmed.liked ? 'Danke für dein App-Like ♥' : 'App-Like entfernt');
  }
  updateSupportHeart();
}

const TIPS = {
  mp: [
    [
      'Vor dem Match',
      'Teste dein MW4-Loadout auf dem Schießstand: Rückstoß, Zieltempo und Sicht mit genau diesen Aufsätzen.',
      'https://www.callofduty.com/blog/2026/08/call-of-duty-modern-warfare-4-open-beta-everything-you-need-to-know',
    ],
    [
      'Gunny als Start',
      'Für kurz, ausgewogen oder lang eine Empfehlung im Spiel erzeugen, dann nur die schwache Stelle ändern.',
      'https://www.callofduty.com/blog/2026/08/call-of-duty-modern-warfare-4-next-highlights-multiplayer-gameplay-systems',
    ],
    [
      'Apex zählt extra',
      'Bei MW4 belegt ein Apex-Aufsatz keinen normalen Gunsmith-Slot. Erst prüfen, ob deine Waffe ihn unterstützt.',
      'https://www.callofduty.com/blog/2026/08/call-of-duty-modern-warfare-4-open-beta-everything-you-need-to-know',
    ],
  ],
  wz: [
    [
      'Legacy beachten',
      'Ältere Waffen können in Warzone verfügbar bleiben. Prüfe die aktuellen Regeln im Spiel.',
      'https://www.callofduty.com/blog/2026/09/call-of-duty-modern-warfare-4-warzone-season-1-operator-toggle',
    ],
    [
      'Rolle bestimmen',
      'In Warzone zuerst Distanz und Spielstil wählen; für die zweite Waffe die fehlende Distanz abdecken.',
      'https://www.callofduty.com/blog/2026/08/call-of-duty-modern-warfare-4-open-beta-everything-you-need-to-know',
    ],
    [
      'Visier testen',
      'MW4 verändert die Sichtfeld-Darstellung. Teste FOV und Zielgröße im Spiel, bevor du einen „Pro-Wert“ übernimmst.',
      'https://www.callofduty.com/blog/2026/08/call-of-duty-modern-warfare-4-next-highlights-multiplayer-gameplay-systems',
    ],
  ],
  ranked: [
    [
      'Regeln zuerst',
      'Erlaubte Waffen und Aufsätze können von normalen Multiplayer-Loadouts abweichen. Prüfe die aktuelle Ranked-Regelliste im Spiel.',
      'https://www.callofduty.com/patchnotes',
    ],
    [
      'Konstanz',
      'Halte Empfindlichkeit und FOV über mehrere Matches konstant und ändere pro Test nur eine Sache.',
      'https://www.callofduty.com/blog/2026/08/call-of-duty-modern-warfare-4-open-beta-everything-you-need-to-know',
    ],
    [
      'Sichtbarkeit',
      'Stelle klare Zielerkennung über Effekte. MW4 hat überarbeitete Waffen- und Zielfeldausrichtung.',
      'https://www.callofduty.com/blog/2026/08/call-of-duty-modern-warfare-4-next-highlights-multiplayer-gameplay-systems',
    ],
  ],
  zm: [
    [
      'Rundenplan',
      'Wähle Startwaffe, Feldaufrüstung und einen sicheren Weg zur ersten Extra-Cola; die Cola ist ein Kaufplan, kein Start-Slot.',
      'https://www.callofduty.com/blog/2024/10/call-of-duty-black-ops-6-launch-comms-zombies-mode-prep-intel',
    ],
    [
      'Überleben',
      'Teste Kontrolle und Nachladezeit in frühen Runden, bevor du die Waffe nur nach Schaden auswählst.',
      'https://www.callofduty.com/blog/2024/10/call-of-duty-black-ops-6-launch-comms-zombies-mode-prep-intel',
    ],
  ],
  dmz: [
    [
      'Früher loslegen',
      'Digitale Vorbesteller können ab 20. Oktober in DMZ starten.',
      'https://www.callofduty.com/blog/2026/10/call-of-duty-modern-warfare-4-dmz-how-to-play-forward-operating-base-guide',
    ],
    [
      '5 im Gunsmith, bis zu 8 im Loot',
      'Gunsmith-Waffen haben fünf reguläre Slots. Gefundene Waffen können bis zu acht haben. Wähle beim Bauen die passende Herkunft.',
      'https://www.callofduty.com/blog/2026/10/call-of-duty-modern-warfare-4-dmz-how-to-play-forward-operating-base-guide',
    ],
    [
      'Waffen freischalten',
      'Finde das Waffenhandbuch und bringe es aus dem Einsatz mit. Danach kannst du die Grundwaffe im Gunsmith kaufen.',
      'https://www.callofduty.com/blog/2026/10/call-of-duty-modern-warfare-4-dmz-how-to-play-forward-operating-base-guide',
    ],
  ],
};

const LOCAL_KEY = 'eupdate_v14_posts';

const LIKE_KEY = 'eupdate_v14_loadout_likes';

const STREAMER_KEY = 'eupdate_v16_streamers';

const STREAMER_LIKES_KEY = 'eupdate_v16_streamer_likes';

let localStreamers = [],
  streamerLikes = {};

try {
  const v = JSON.parse(localStorage.getItem(STREAMER_KEY) || '[]');
  if (Array.isArray(v)) localStreamers = v.filter((x) => x && BY[x.primary] && GAME[x.game]).slice(0, 25);
} catch (_) {}

try {
  streamerLikes = JSON.parse(localStorage.getItem(STREAMER_LIKES_KEY) || '{}') || {};
} catch (_) {}

GEAR_NAMES.wildcard = 'Wildcard';

const SUGGESTED = {
  optic: ['Rotpunktvisier', 'Reflexvisier', 'Vergrößertes Visier'],
  muzzle: ['Schalldämpfer', 'Kompensator', 'Mündungsbremse'],
  barrel: ['Langer Lauf', 'Kurzer Lauf', 'Verstärkter Lauf'],
  underbarrel: ['Vertikaler Griff', 'Winkelgriff', 'Vordergriff'],
  magazine: ['Erweitertes Magazin', 'Schnellmagazin'],
  grip: ['Rückstoßgriff', 'Sprintgriff'],
  stock: ['Stabiler Schaft', 'Leichter Schaft'],
  laser: ['Ziel-Laser', 'Hüftfeuer-Laser'],
  ammo: ['Spezialmunition', 'Schnelle Munition'],
  mod: ['Schnellfeuer-Mod', 'Präzisions-Mod'],
  comb: ['Wangenauflage'],
};

let localPosts = [],
  likedIds = {};
let communityLoaded = false;

try {
  const v = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
  if (Array.isArray(v))
    localPosts = v.filter((x) => x && BY[x.primary] && GAME[x.game] && MODE[x.mode]).slice(0, 100);
} catch (_) {}

try {
  const v = JSON.parse(localStorage.getItem(LIKE_KEY) || '{}');
  if (v && typeof v === 'object') likedIds = v;
} catch (_) {}

const DEMOS = [];

function storeCommunity() {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(localPosts));
    localStorage.setItem(LIKE_KEY, JSON.stringify(likedIds));
  } catch (_) {
    toast('Gerätespeicher voll. Ältere lokale Beiträge löschen, um weiter zu speichern.');
  }
}

let communityRequest = 0,
  communityLoading = false,
  communityResponse = '',
  communityCatalogRevision = 0,
  communityVoteRevision = 0;

async function refresh({ background = false, includeCatalog = true } = {}) {
  if (!API) {
    creators = localStreamers;
    feed = localPosts
      .filter((x) => !x.demo)
      .map((x) => ({ ...x, likes: Number(x.likes || 0) + (likedIds[x.id] ? 1 : 0) }));
    setFeedStatus('Deine Beiträge auf diesem Gerät · öffentliche Rangliste nach Serververbindung');
    updateCommunityConnection('setup');
    renderFeed();
    communityLoaded = true;
    renderCurrentDetail();
    return;
  }
  if (background && communityLoading) return;
  const request = ++communityRequest;
  const voteRevision = communityVoteRevision;
  communityLoading = true;
  let redrawDetail = !background;
  if (!background) setFeedStatus('Lade Community-Loadouts …');
  try {
    const view = currentView();
    const needsCatalog = includeCatalog && ['feed', 'detail', 'builder', 'attachments'].includes(view);
    const [r, catalogRevision] = await Promise.all([
      fetch(API + '/api/sets', { cache: 'no-store', headers: existingVisitorHeaders() }),
      needsCatalog ? loadWeaponCatalog().catch(() => communityCatalogRevision) : communityCatalogRevision,
    ]);
    if (!r.ok) throw Error();
    const response = await r.text();
    if (request !== communityRequest) return;
    const staleVotes = voteRevision !== communityVoteRevision;
    if (!background || staleVotes || catalogRevision !== communityCatalogRevision || response !== communityResponse) {
      const data = JSON.parse(response);
      const previousSets = staleVotes ? new Map(feed.map(item => [item.id, item])) : null;
      const previousCreators = staleVotes ? new Map(creators.map(item => [item.id, item])) : null;
      feed = (data.sets || [])
        .filter((x) => BY[x.primary || x.secondary] && GAME[x.game] && MODE[x.mode])
        .map((x) => ({ ...x, description: x.note }));
      creators = (data.creators || []).filter((x) => BY[x.primary || x.secondary] && GAME[x.game]);
      reconcileVotes(feed, likedIds, previousSets);
      reconcileVotes(creators, streamerLikes, previousCreators);
      if (!staleVotes) {
        weeklyWinnerIds = Array.isArray(data.weeklyWinnerIds) ? data.weeklyWinnerIds : [];
        weeklyStreamerWinnerIds = Array.isArray(data.weeklyStreamerWinnerIds) ? data.weeklyStreamerWinnerIds : null;
        weeklyPeriod = data.week || null;
        state.liked = !!data.supportLiked;
        supportLikes = Number(data.supportLikes || 0);
      }
      updateSupportHeart();
      renderFeed();
      communityResponse = staleVotes ? '' : response;
      communityCatalogRevision = catalogRevision;
      redrawDetail = true;
    }
    updateCommunityConnection('');
    setFeedStatus(
      'Community · aktualisiert ' +
        new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) +
        ' Uhr',
    );
  } catch (_) {
    if (request === communityRequest && (!background || !communityResponse)) {
      setFeedStatus('Community gerade nicht erreichbar · bitte später neu laden');
      updateCommunityConnection('offline');
    }
  } finally {
    if (request === communityRequest) {
      communityLoading = false;
      communityLoaded = true;
      if (redrawDetail) renderCurrentDetail();
    }
  }
}

function reconcileVotes(items, liked, previous) {
  for (const item of items) {
    const old = previous?.get(item.id);
    if (old) {
      item.likes = old.likes;
      item.weekLikes = old.weekLikes;
      item.liked = liked[item.id];
    }
    liked[item.id] = Boolean(item.liked);
  }
}

function refreshVisibleCommunity() {
  if (!API || document.hidden) return;
  const view = currentView();
  if (view === 'feed' || view === 'detail') refresh({ background: true });
  if (view === 'builder' || view === 'attachments') loadWeaponCatalog().catch(() => {});
}

let siteConfig = {
  controllerName: '',
  controllerAddress: '',
  controllerEmail: '',
  legalReady: false,
  communityReady: false,
};
let communityCopyReady = false;
let siteConfigPending = null;

const OWNER_KEY = 'eupdate_v16_own_posts';

function rememberSubmission(kind, r) {
  if (!r?.id || !r.deleteKey) return;
  try {
    const list = JSON.parse(localStorage.getItem(OWNER_KEY) || '[]');
    list.unshift({ kind, id: r.id, key: r.deleteKey, status: r.status || 'pending' });
    localStorage.setItem(OWNER_KEY, JSON.stringify(list));
  } catch (_) {
    toast('Löschschlüssel konnte nicht gespeichert werden. Bei Bedarf Betreiber kontaktieren.');
  }
}

async function serverGet(path) {
  const r = await fetch(API + path, { cache: 'no-store', credentials: 'omit' });
  const data = await r.json();
  if (!r.ok) throw Object.assign(Error(data.error || 'Server nicht erreichbar'), { status: r.status });
  return data;
}

async function loadSiteConfig() {
  if (!API) return;
  if (siteConfigPending) return siteConfigPending;
  siteConfigPending = (async () => {
    try {
      siteConfig = await serverGet('/api/config');
      communityCopyReady = true;
      applyNewsConfig(siteConfig);
      applySiteContent();
      renderLive();
    } finally {
      checkTermsGate();
    }
  })().catch(() => {}).finally(() => { siteConfigPending = null; });
  return siteConfigPending;
}

function legacyUsageMarkup() {
  return '<div class="legal-text"><h3>Öffentlich teilen ab 18 Jahren</h3><p>Öffentliche Loadouts, Streamer-Beiträge und Kommentare sind für volljährige Personen vorgesehen. Es wird kein Geburtsdatum und kein Ausweisdokument erhoben. Die Altersbestätigung ist eine Selbstauskunft. Bauen und Bildexport sind auch ohne Veröffentlichung möglich.</p><h3>Deine Inhalte und Rechte</h3><p>Verwende nur eigene Inhalte oder solche, für die du die erforderlichen Rechte hast. Lade nur dein eigenes Profilfoto hoch, auf dem keine weiteren Personen erkennbar sind. Keine fremden Fotos, Spiel-Screenshots, kopierten Grafiken, Adressen oder anderen privaten Angaben. Nutze einen Spielernamen. Veröffentliche keine Beleidigungen, Drohungen, rechtswidrigen Inhalte, Spam oder Werbung.</p><h3>Was eUpdate mit deinem Beitrag macht</h3><p>Du erlaubst eUpdate für die Dauer deiner Veröffentlichung, den Beitrag zu speichern, anzuzeigen und anderen Nutzern als Loadout-Bild bereitzustellen. Damit überträgst du nicht deine Urheberrechte. Du kannst die Veröffentlichung jederzeit unter „Meine Beiträge“ beenden. Bereits von anderen gespeicherte Bilder lassen sich nicht zurückholen. Loadouts werden vor Veröffentlichung geprüft. Kommentare werden gemäß den angezeigten Kommentarregeln geprüft.</p><h3>Meldungen und Entscheidungen</h3><p>Über „Inhalt melden“ oder den Kontakt im Impressum kannst du problematische Inhalte melden. eUpdate kann Inhalte ausblenden oder entfernen. Die Begründung findest du mit deinem privaten Löschschlüssel unter „Meine Beiträge“. Gegen eine Entscheidung kannst du dich über den Betreiberkontakt wenden und die Beitragsnummer nennen. Es gibt keine automatische E-Mail-Benachrichtigung; öffne „Meine Beiträge“ zum Abrufen. Gesetzliche Rechte bleiben unberührt.</p></div>';
}

function publicationRules() {
  return (
    '<section class="wide privacy-confirmation"><details><summary>Nutzungsregeln lesen</summary>' +
    usageMarkup() +
    '</details><label class="consent"><input type="checkbox" name="adultConfirmed" required><span>Ich bin mindestens 18 Jahre alt.</span></label><label class="consent"><input type="checkbox" name="rightsAccepted" required><span>Ich akzeptiere die Nutzungsregeln. Ich darf meine Inhalte veröffentlichen; das optionale Foto zeigt nur mich. Ich erlaube die Anzeige und den Bilddownload meines Beitrags.</span></label></section>'
  );
}

function communityBlocked() {
  modal(
    head('Die Community öffnet bald', 'Dein Loadout kannst du schon jetzt bauen.') +
      '<p>Neue Veröffentlichungen sind noch nicht freigegeben. Dein Entwurf bleibt erhalten.</p><button class="primary-btn" data-close>Weiterbauen →</button>',
  );
}

function privacyMarkup() {
  const c = siteConfig,
    email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.controllerEmail) ? c.controllerEmail : '';
  if (c.privacyTextFull === true && c.privacyText) {
    return '<div class="legal-text"><p style="white-space: pre-line">' + html(c.privacyText) + '</p></div>';
  }
  return (
    '<div class="legal-text">' +
    (!c.legalReady
      ? '<p class="legal-draft"><b>Einrichtung noch nicht abgeschlossen.</b> Verantwortlicher, ladungsfähige Anschrift und Kontakt müssen ergänzt sein. Öffentliche Uploads und Kommentare sind bis dahin serverseitig gesperrt.</p>'
      : '') +
    (c.privacyText
      ? '<h3>Ergänzende Angaben des Betreibers</h3><p>' + html(c.privacyText).replace(/\n/g, '<br>') + '</p>'
      : '') +
    '<h3>1. Verantwortlicher und Kontakt</h3><p>' +
    html(c.controllerName || 'Noch einzutragen') +
    '<br>' +
    html(c.controllerAddress || 'Anschrift noch einzutragen').replace(/\n/g, '<br>') +
    '<br>' +
    html(email || 'Datenschutzkontakt noch einzutragen') +
    '</p><p>Bei Fragen und zur Ausübung deiner Rechte nutze den genannten Kontakt. Du brauchst kein Nutzerkonto. Die zufälligen Kennungen und Löschschlüssel sind pseudonyme technische Daten; sie bedeuten keine vollständige Anonymität.</p>' +
    '<h3>Privates Feedback</h3><p>Unter Unterstützen kannst du Fehler, Ideen oder Wünsche privat senden. Verarbeitet werden Kategorie, Nachricht, freiwilliger Name und E-Mail-Adresse, Zeitpunkte, Bearbeitungsstatus, Einwilligung und Datenschutzhinweis-Version sowie ein gehashter Löschschlüssel. Nur der Betreiber hat Zugriff. Zweck ist die Bearbeitung deiner Nachricht und eine mögliche Antwort; Grundlage ist deine Einwilligung nach Art. 6 Abs. 1 lit. a DSGVO. Feedback wird spätestens nach 90 Tagen gelöscht. Du kannst es unter Mein Feedback entfernen oder deine Einwilligung beim Betreiber widerrufen. Auf deinem Gerät werden nur Feedback-Nummer, Zeitpunkt und der geheime Löschschlüssel gespeichert. Zur Missbrauchsbegrenzung wird eine täglich wechselnde, gesalzene Kennung aus der IP-Adresse bis zu 24 Stunden gespeichert. Widerruf berührt die Rechtmäßigkeit der bisherigen Verarbeitung nicht.</p>' +
    '<h3>2. Aufruf und Hosting</h3><p>Die App wird über GitHub Pages bereitgestellt (GitHub, Inc., USA). Der Community-Server verwendet Cloudflare Workers und D1 (Cloudflare, Inc., USA). Dabei verarbeiten die Anbieter technisch notwendige Verbindungsdaten wie IP-Adresse, Zeitpunkt, URL und Browserinformationen. Zweck ist die sichere Bereitstellung; Grundlage ist Art. 6 Abs. 1 lit. f DSGVO. Unser Interesse ist ein funktionsfähiger, sicherer Dienst. Die Region der D1-Datenbank richtet sich nach der tatsächlichen Einrichtung; eine EU-Datenbank begrenzt nicht sämtliche Verarbeitung im weltweiten Workers-Netz. Eine Verarbeitung in Drittländern kann stattfinden. GitHub und Cloudflare veröffentlichen Informationen zu Datenübermittlungen, darunter dem EU-US Data Privacy Framework und Standardvertragsklauseln. Welche Grundlage im konkreten Betrieb gilt und wo Nachweise erhältlich sind, ist in den nachfolgenden Betreiberangaben dokumentiert.</p>' +
    (c.hostingDetails
      ? '<h3>Hostingangaben des Betreibers</h3><p>' + html(c.hostingDetails).replace(/\n/g, '<br>') + '</p>'
      : '<p class="legal-draft">Die konkreten Angaben zu Hosting-Verträgen, Speicherregion und Übermittlungsgarantien werden vor der Startfreigabe ergänzt. Neue Veröffentlichungen sind bis dahin gesperrt.</p>') +
    '<h3>Statistik zu Seitenaufrufen</h3><p>eUpdate zählt pro Tag die aufgerufene Seite, die Herkunfts-Domain und das Land, soweit diese Angaben vorliegen. Für diese Zählung speichert eUpdate weder Besucherkennungen noch IP-Adressen und setzt keine Analyse-Cookies. Do Not Track und Global Privacy Control werden berücksichtigt.</p>' +
    '<h3>KI-gestützte Aufbereitung öffentlicher Gaming-Nachrichten</h3><p>eUpdate nutzt Cloudflare Workers AI (Cloudflare, Inc.) zur automatisierten sprachlichen Bearbeitung, Übersetzung und Zusammenfassung öffentlich zugänglicher Gaming-Nachrichten. Dabei werden Artikeltexte, Überschriften und Quellenangaben an das KI-Modell übermittelt. Nutzereingaben aus Kommentaren, Loadouts, Profilen, Feedback und private Kontaktdaten werden für diese News-Funktion nicht an das KI-Modell übermittelt. Die News-Verarbeitung erfolgt serverseitig unabhängig vom einzelnen Besuch. Beim bloßen Lesen einer News wird keine personenbezogene Anfrage an das KI-Modell gesendet. Enthalten öffentlich zugängliche Quellartikel personenbezogene Angaben, können diese Teil der KI-Eingabe sein; ihre Verarbeitung muss im Einzelfall auf eine Rechtsgrundlage gestützt werden. Die hierfür eingesetzten Cloudflare-Dienste und etwaige Drittlandübermittlungen sind unter den Hostingangaben beschrieben. Weitere Informationen: <a href="https://developers.cloudflare.com/workers-ai/platform/data-usage/" target="_blank" rel="noopener noreferrer">Cloudflare Workers AI – Datenverwendung ↗</a>.</p>' +
    '<h3>3. Loadouts, Fotos und Streamer-Beiträge</h3><p>Deine freiwilligen Angaben umfassen Spielernamen, Texte, Waffen, Aufsätze, Ausrüstung, gegebenenfalls Fotos und Kanal-Links. Wir speichern sie zunächst privat zur Prüfung. Nach Freigabe sind sie öffentlich abrufbar und können als Bild heruntergeladen werden. Gib einen Spielernamen statt deines vollständigen Namens an und veröffentliche keine fremden personenbezogenen Daten. Profilfotos werden im Browser zugeschnitten und auf dem Server mit Cloudflare Images als neues Bild ohne die ursprünglichen Metadaten erzeugt. Grundlage der freiwilligen Veröffentlichung ist deine Einwilligung nach Art. 6 Abs. 1 lit. a DSGVO. Die Prüfung zum Schutz der Community beruht außerdem auf Art. 6 Abs. 1 lit. f DSGVO. Du kannst deine Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen und deinen Beitrag unter „Meine Beiträge“ löschen oder den Betreiber kontaktieren. Vor dem Senden bestätigst du, dass du die Datenschutzhinweise zur Kenntnis genommen hast, und erteilst getrennt deine Einwilligung zur Veröffentlichung. Zeitpunkt und Fassung der Hinweise werden mit dem Beitrag gespeichert und erscheinen nicht öffentlich. Ohne Einwilligung wird kein Beitrag veröffentlicht. Bauen und Bildexport bleiben möglich. Von Dritten gespeicherte Bilder können wir nicht zurückholen.</p><p>Streamer-Freigabecodes werden zur Prüfung als Hash und für die erneute Anzeige im geschützten Adminbereich zusätzlich verschlüsselt gespeichert. Der Entschlüsselungsschlüssel wird aus einem Cloudflare-Secret abgeleitet und steht nicht in der öffentlichen App. Nur der angemeldete Administrator kann die Codes erneut anzeigen und kopieren; die Speicherung dient der Verwaltung, bis der Code ersetzt oder entfernt wird. Sie ermöglichen die Zuordnung zum freigegebenen Streamer-Namen und können vom Betreiber gesperrt werden. Die App erstellt daraus kein Spielerprofil. Öffentliches Veröffentlichen ist ab 18 Jahren vorgesehen. Wir speichern die Bestätigung mit Zeitpunkt im Beitrag, ohne Geburtsdatum oder Ausweiskopie. Du bestätigst zudem deine Nutzungsrechte. Die Angaben sind Selbstauskünfte; sie ersetzen keine Prüfung bei konkreten Zweifeln.</p>' +
    '<h3>4. Kommentare und Moderation</h3><p>Bei einem Kommentar speichern wir den optionalen Spielernamen, Text, Loadout-Bezug, Zeitpunkt, Freigabestatus, Nachweis deiner Bestätigung und Einwilligung und einen Hash deines privaten Löschschlüssels. Kommentare bleiben bis zur manuellen Freigabe privat. Für öffentliche Kommentare bestätigst du ebenfalls Volljährigkeit und die Nutzungsregeln. Ohne Namen erscheint „Gast“. Grundlage der Veröffentlichung ist deine Einwilligung nach Art. 6 Abs. 1 lit. a DSGVO; Moderation und Missbrauchsschutz beruhen auf Art. 6 Abs. 1 lit. f DSGVO. Du kannst deine Kommentare über „Meine Beiträge“ löschen oder deine Einwilligung über den Betreiberkontakt widerrufen.</p><p>Ein serverseitiger Regelfilter prüft Namen und Text auf hinterlegte Begriffe, Links, mögliche Kontaktangaben, auffällige Schreibweisen und Spam. Bekannte gesperrte Ausdrücke und direkte Links führen zur Ablehnung; andere erkannte Auffälligkeiten zur manuellen Prüfung. Dabei wird keine externe KI genutzt und kein Kommentar an einen KI-Anbieter gesendet. Abgewiesene Texte werden nicht in der App-Datenbank gespeichert. Der Filter kann harmlose Texte anhalten oder problematische Texte übersehen. Öffentliche Inhalte lassen sich melden; der Betreiber kann sie ausblenden oder löschen. Bei einer irrtümlichen Ablehnung oder einer offenen Prüfung kannst du den Betreiber kontaktieren.</p>' +
    '<h3>5. Meldungen problematischer Inhalte</h3>' +
    (c.reportContactMode === 'in-app'
      ? '<p>Du kannst Nutzereinträge und Seiteninhalte privat melden. Wir speichern die Fundstelle, die Begründung, den Zeitpunkt, den Bearbeitungsstand, die Entscheidung und deinen Namen, wenn du ihn angibst. Bei Meldungen zu sexualisierter Gewalt gegen Kinder kannst du deinen Namen weglassen. Wir verarbeiten die Angaben zur Erfüllung anwendbarer gesetzlicher Pflichten nach Art. 6 Abs. 1 lit. c DSGVO und im Übrigen zur Prüfung von Verstößen und zum Schutz Betroffener nach Art. 6 Abs. 1 lit. f DSGVO.</p>' +
        '<p>eUpdate bestätigt den Eingang direkt in der App. Mit deinem privaten Empfangsschlüssel kannst du die Entscheidung unter „Meine Meldungen“ abrufen. Die App speichert die Meldungsnummer und den Empfangsschlüssel in deinem Browser und der Server speichert den Hash des Schlüssels.</p>'
      : '<p>Du kannst Nutzereinträge und Seiteninhalte privat melden. Wir speichern Inhalt, Begründung, Zeitpunkt und Entscheidung sowie, falls angegeben, Name und E-Mail-Adresse. Bei Meldungen zu sexualisierter Gewalt gegen Kinder können die Kontaktdaten wegbleiben. Wir nutzen die Daten zur Bearbeitung gesetzlicher Meldepflichten und zum Schutz Betroffener. Bei einer angegebenen Adresse versenden wir Bestätigung und Entscheidung über den eingerichteten Versanddienst. ' +
        (c.reportEmailProvider === 'resend' ? 'Hierfür nutzen wir Resend.' : c.reportEmailProvider === 'cloudflare' ? 'Hierfür nutzen wir Cloudflare Email Service.' : '') + ' Du kannst die Entscheidung auch mit deinem Empfangsschlüssel abrufen.</p>') +
    '<h3>6. Likes und Missbrauchsschutz</h3><p>Cloudflare Turnstile prüft den Zugriff bei der ersten Veröffentlichung, beim Kommentieren oder Liken. Cloudflare verarbeitet dafür Verbindungs- und technische Browserdaten. eUpdate nutzt die Bestätigung für eine zeitlich begrenzte Sitzung und die Verhinderung automatisierten Missbrauchs. Erst bei einer ausdrücklich ausgelösten Serveraktion wird eine zufällige Kennung auf deinem Gerät gespeichert. Der Server speichert einen mit geheimem Zusatz gebildeten Hash davon, um deine Like-Auswahl wiederzufinden und doppelte Likes zu verhindern. Ein erneuter Klick entfernt deinen Like und den zugehörigen Datenbankeintrag. Für Tageslimits wird aus IP-Adresse, Datum und geheimem Zusatz ein kurzlebiger Hash gebildet. Die App-Datenbank speichert keine vollständige IP-Adresse; Hostinganbieter können IP-Adressen in eigenen Protokollen verarbeiten. Grundlage ist Art. 6 Abs. 1 lit. f DSGVO für die gewünschte Like-Funktion und den Schutz vor Missbrauch. Die Rangliste verwendet Like-Zahlen, kein personenbezogenes Profiling. Ohne Konto ist der Missbrauchsschutz begrenzt.</p>' +
    '<h3>7. Speicherfristen und Löschung</h3><p>Nicht freigegebene und ausgeblendete Loadouts werden nach 30 Tagen, öffentliche Loadouts nach 365 Tagen bei der nächsten automatischen Bereinigung gelöscht. Ihre Like-Einträge und Kommentare werden mitgelöscht. Nicht freigegebene oder ausgeblendete Kommentare werden nach 7 Tagen, alle Kommentare spätestens nach 90 Tagen bei der nächsten Bereinigung entfernt. Meldungen werden 90 Tage nach Abschluss, spätestens 180 Tage nach Eingang bereinigt. Private Moderationsmitteilungen speichern nur Beitragsbezug, Löschschlüssel-Hash, Status, Begründung und Zeitpunkt. Sie werden nach 180 Tagen bei der nächsten Bereinigung gelöscht; ein entfernter Inhalt wird darin nicht erneut gespeichert. Support-Likes werden nach 365 Tagen entfernt. Tageslimit-Hashes verfallen nach 24 Stunden und werden bei der nächsten Bereinigung gelöscht. Die Bereinigung läuft über den eingerichteten regelmäßigen Cloudflare-Cron. Du und der Administrator können Inhalte vorher löschen. Lokale Daten bleiben bis zu deiner Löschung oder dem Entfernen der Browserdaten. Anbieterprotokolle und Datenbank-Sicherungskopien können bis zum Ablauf der jeweiligen Anbieterfristen fortbestehen.</p>' +
    '<h3>8. Daten auf deinem Gerät</h3><p>LocalStorage enthält nach Nutzung der jeweiligen Funktionen Loadout-Entwürfe, lokal vorbereitete Bilder, Like-Auswahl sowie private Lösch- und Empfangsschlüssel. Neue öffentliche Nachrichten- und Katalogdaten bleiben im Arbeitsspeicher dieses Tabs. Ältere Cache-Daten aus Vorversionen kannst du über „Meine Daten löschen“ entfernen. Für eigene Kommentare wird außerdem eine lokale Kopie mit Status gespeichert. Das ermöglicht dir Speichern, Wiederfinden und Löschen ohne Konto. Technisch notwendige Speicherung für ausdrücklich gewünschte Funktionen erfolgt gemäß § 25 Abs. 2 Nr. 2 TDDDG. Es gibt keine Analyse-Cookies, Werbetracker oder automatisch geladenen Social-Media-Einbettungen. „Meine Daten löschen“ entfernt anhand der vorhandenen Schlüssel und Gerätekennung deine zuordenbaren gespeicherten Beiträge, Kommentare, Meldungen, Likes, Feedback und Protokolleinträge. Anschließend entfernt die Funktion die eUpdate-Daten aus dem Browser. Für Daten aus anderen Browsern nutze den dortigen Speicher oder wende dich an den Betreiber.</p>' +
    '<h3>9. News, externe Links und Unterstützung</h3><p>Der eingerichtete Server prüft offizielle Call-of-Duty-Quellen regelmäßig über den eingerichteten Cloudflare-Cron, sofern die Automatik aktiviert ist. Nutzerkennungen und Profilfotos werden dabei nicht an die Quelle übertragen. Quellen-, Social-Media-, Werbe- und PayPal-Links öffnen externe Seiten erst nach deinem Klick. Dann gelten die Hinweise der jeweiligen Anbieter. Für eine Zahlung ist PayPal zuständig; eUpdate verarbeitet hier keine Zahlungsdaten.</p>' +
    '<h3>Protokoll und Nutzungsbedingungen</h3><p>Beim ausdrücklichen Bestätigen der Nutzungsbedingungen speichern wir deren Fassung und Zeitpunkt auf deinem Gerät. Bei Serververbindung wird die Bestätigung im geschützten Betriebsprotokoll erfasst. Dieses enthält wesentliche Community- und Verwaltungsaktionen mit Zeitpunkt, Vorgangsart, Beitragsbezug, Ergebnis, gegebenenfalls pseudonymer technischer Kennung und den bestätigten Fassungen. Es enthält keine vollständigen IP-Adressen, Passwörter, Freigabecodes, Löschschlüssel oder Kopien gelöschter Beiträge und Fotos. Normales Lesen und jeder einzelne Seitenaufruf werden darin nicht protokolliert. Zweck ist die Nachvollziehbarkeit von Bestätigungen, Moderation und technischen Vorgängen sowie die Bearbeitung zuordenbarer Anfragen; Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Unser berechtigtes Interesse besteht in einem sicheren, nachvollziehbaren Community-Betrieb. Einwilligungsnachweise dienen zusätzlich dem Nachweis nach Art. 7 Abs. 1 DSGVO. Nur der angemeldete Administrator hat Zugriff. Protokolleinträge werden spätestens bei der nächsten Bereinigung nach 180 Tagen gelöscht. Bedingungen werden als Fassungen gespeichert und nach Ablauf dieser Frist entfernt, sofern sie weder aktuell sind noch von verbleibenden Einträgen benötigt werden. Exportierte Kopien sind vom Betreiber entsprechend zu löschen. Du kannst der Verarbeitung aus Gründen deiner besonderen Situation widersprechen. Ohne gespeicherten Löschschlüssel ist eine sichere Zuordnung möglicherweise nicht mehr möglich.</p>' +
    '<h3>10. Deine Rechte</h3><p>Du hast unter den gesetzlichen Voraussetzungen Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit sowie Widerspruch gegen Verarbeitung auf Grundlage berechtigter Interessen. Freiwillige Einwilligungen kannst du jederzeit widerrufen, ohne dass die Rechtmäßigkeit der bisherigen Verarbeitung berührt wird. Nutze den oben genannten Kontakt. Zur Zuordnung können Beitragsnummer und Löschschlüssel helfen; übersende keinen Admin-Schlüssel. Du kannst dich bei einer Datenschutzaufsichtsbehörde beschweren, etwa der LDI Nordrhein-Westfalen. Die aktuellen Kontaktdaten findest du auf deren verlinkter Webseite.</p>' +
    '<p><a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener noreferrer">GitHub-Datenschutz ↗</a><br><a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer">Cloudflare-Datenschutz ↗</a><br><a href="https://www.cloudflare.com/cloudflare-customer-dpa/" target="_blank" rel="noopener noreferrer">Cloudflare-Auftragsverarbeitung ↗</a><br><a href="https://www.ldi.nrw.de/" target="_blank" rel="noopener noreferrer">LDI NRW ↗</a></p></div>'
  );
}

const PRIVACY_TEMPLATE_VERSION = '2026-11-27-reports-in-app';

function noticeVersion() {
  return siteConfig.privacyNoticeVersion || PRIVACY_TEMPLATE_VERSION;
}

function privacyConfirmation() {
  return (
    '<section class="wide privacy-confirmation"><details class="privacy-details"><summary>Datenschutzhinweise lesen <span>⌄</span></summary><p class="fine-print">Stand: ' +
    html(siteConfig.privacyVersion || '10.10.2026') +
    '</p>' +
    privacyMarkup() +
    '</details><label class="consent"><input type="checkbox" name="privacyAcknowledged" required><span>Ich habe die Datenschutzhinweise zur Kenntnis genommen.</span></label><input type="hidden" name="privacyNoticeVersion" value="' +
    html(noticeVersion()) +
    '"></section>'
  );
}

function confirmedPrivacy(form, publication = true) {
  if (publication) {
    for (const k of ['adultConfirmed', 'rightsAccepted'])
      if (!form.elements[k]?.checked) {
        toast(
          k === 'adultConfirmed'
            ? 'Öffentlich teilen ist ab 18 Jahren möglich.'
            : 'Bitte bestätige die Nutzungsregeln und deine Rechte.',
        );
        form.elements[k]?.focus();
        return false;
      }
  }
  const ack = form.elements.privacyAcknowledged,
    consent = form.elements.consent;
  if (!ack?.checked || (publication && !consent?.checked)) {
    toast('Bitte bestätige die Datenschutzhinweise' + (publication ? ' und die Veröffentlichung.' : '.'));
    (ack?.checked ? consent : ack)?.focus();
    return false;
  }
  if (form.elements.privacyNoticeVersion.value !== noticeVersion()) {
    ack.checked = false;
    if (consent) consent.checked = false;
    form.elements.privacyNoticeVersion.value = noticeVersion();
    const details = form.querySelector('.privacy-details');
    if (details) details.querySelector('.legal-text').outerHTML = privacyMarkup();
    toast('Die Datenschutzhinweise wurden aktualisiert. Bitte erneut lesen und bestätigen.');
    return false;
  }
  return true;
}

async function updateChangedPrivacy(form, error) {
  if (error.status !== 409 || !form.isConnected) return;
  try {
    siteConfig = await serverGet('/api/config');
    if (!form.isConnected) return;
    form.elements.privacyAcknowledged.checked = false;
    if (form.elements.consent) form.elements.consent.checked = false;
    form.elements.privacyNoticeVersion.value = noticeVersion();
    const details = form.querySelector('.privacy-details');
    if (details) {
      details.querySelector('.legal-text').outerHTML = privacyMarkup();
      details.querySelector('.fine-print').textContent =
        'Stand: ' + (siteConfig.privacyVersion || '10.10.2026');
      details.open = true;
    }
    form.elements.privacyAcknowledged.focus();
  } catch (_) {
    toast('Hinweise konnten nicht neu geladen werden. Bitte lade die App erneut.');
  }
}

function privacyReceipt(form) {
  return {
    ...termsReceipt(),
    privacyAcknowledged: form.elements.privacyAcknowledged.checked,
    privacyNoticeVersion: form.elements.privacyNoticeVersion.value,
    consent: form.elements.consent?.checked === true,
    adultConfirmed: form.elements.adultConfirmed?.checked === true,
    rightsAccepted: form.elements.rightsAccepted?.checked === true,
  };
}

function privacy() {
  modal(
    head('Datenschutz', 'Stand: ' + (siteConfig.privacyVersion || '10.10.2026')) +
      privacyMarkup() +
      '<button type="button" class="ghost-btn" data-open-data-erasure>Meine Daten löschen</button>',
  );
}

function imprint() {
  modal(
    head('Impressum', 'Angaben gemäß § 5 DDG') +
      '<div class="legal-text"><p>' +
      html(siteConfig.controllerName || 'Name noch einzutragen') +
      '<br>' +
      html(siteConfig.controllerAddress || 'Ladungsfähige Anschrift noch einzutragen') +
      '<br>' +
      html(siteConfig.controllerEmail || 'E-Mail noch einzutragen') +
      '</p>' +
      (siteConfig.imprintText ? '<p>' + html(siteConfig.imprintText).replace(/\n/g, '<br>') + '</p>' : '') +
      (siteConfig.newsResponsibleName && siteConfig.newsResponsibleAddress
        ? '<h3>Verantwortlich für redaktionelle Inhalte</h3><p>' +
          html(siteConfig.newsResponsibleName) +
          '<br>' +
          html(siteConfig.newsResponsibleAddress).replace(/\n/g, '<br>') +
          '</p>'
        : '') +
      '</div>',
  );
}

function localOwnedItems() {
  return [
    ...readLocalList(LOCAL_KEY)
      .filter((x) => x && !x.demo)
      .map((x) => ({ ...x, ownedKind: 'sets' })),
    ...readLocalList(STREAMER_KEY)
      .filter((x) => x && !x.demo)
      .map((x) => ({ ...x, ownedKind: 'creators' })),
  ]
    .filter((x) => Number.isSafeInteger(Number(x.id)) && Number(x.id) > 0)
    .sort((a, b) => Number(b.id) - Number(a.id));
}

function localOwnedRow(x) {
  const key = x.ownedKind + ':' + Number(x.id),
    w = BY[x.primary],
    side = BY[x.secondary];
  return (
    '<article class="owned-row local-owned-row"><div class="owned-local-info">' +
    avatar(x) +
    '<div><span class="owned-local-badge">Nur auf diesem Gerät' +
    (x.ownedKind === 'creators' ? ' · Streamer' : '') +
    '</span><b>' +
    html(x.title || w?.name || 'Dein Loadout') +
    '</b><small>' +
    html((GAME[x.game] || x.game || 'COD') + ' · ' + (MODE[x.mode] || x.mode || '')) +
    '</small><small>' +
    html((w?.name || x.primary || 'Primärwaffe') + (side ? ' + ' + side.name : '')) +
    '</small></div></div><div class="owned-local-actions"><button class="ghost-btn" data-open-local="' +
    key +
    '">Im Builder öffnen</button><button class="ghost-btn" data-download-local="' +
    key +
    '">Als Bild herunterladen ↓</button><button class="ghost-btn owned-delete" data-delete-local="' +
    key +
    '">Löschen</button></div></article>'
  );
}

function localOwnedItem(value) {
  const [kind, raw] = value.split(':'),
    id = Number(raw);
  return localOwnedItems().find((x) => x.ownedKind === kind && Number(x.id) === id);
}

async function refreshOwnStatus() {
  if (!API) return;
  const button = el('refreshOwnStatus');
  if (button) button.disabled = true;
  try {
    const posts = readLocalList(OWNER_KEY),
      comments = readLocalList(COMMENTS_KEY),
      entries = [
        ...posts.map((x) => ({ kind: x.kind, id: x.id, key: x.key })),
        ...comments.map((x) => ({ kind: 'comments', id: x.id, key: x.key })),
      ];
    const statuses = [];
    for (let i = 0; i < entries.length; i += 100) {
      const r = await fetch(API + '/api/own/status', {
        method: 'POST',
        credentials: 'omit',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ items: entries.slice(i, i + 100) }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error || 'Status nicht erreichbar');
      statuses.push(...data.items);
    }
    for (const x of posts) {
      const v = statuses.find((v) => v.kind === x.kind && v.id === x.id);
      if (v) Object.assign(x, { status: v.status, reason: v.reason, updated: v.updated });
    }
    for (const x of comments) {
      const v = statuses.find((v) => v.kind === 'comments' && v.id === x.id);
      if (v) Object.assign(x, { status: v.status, reason: v.reason, updated: v.updated });
    }
    writeLocalList(OWNER_KEY, posts);
    writeLocalList(COMMENTS_KEY, comments);
    ownPosts();
    toast('Status und Entscheidungen aktualisiert');
  } catch (e) {
    toast(e.message);
    if (button) button.disabled = false;
  }
}

function ownPosts() {
  const list = readLocalList(OWNER_KEY),
    comments = readLocalList(COMMENTS_KEY),
    local = localOwnedItems();
  modal(
    head('Meine Beiträge', 'Deine Loadouts und Kommentare · ohne Konto') +
      '<div class="owned-intro">' +
      (API
        ? 'Deine privaten Löschschlüssel bleiben auf diesem Gerät. Mit ihnen kannst du öffentliche Beiträge entfernen.'
        : 'Hier findest du deine in diesem Browser gespeicherten Loadouts. Sie sind nur auf diesem Gerät sichtbar.') +
      '</div>' +
      (API
        ? '<button class="ghost-btn" id="refreshOwnStatus">Status & Entscheidungen aktualisieren ↻</button>'
        : '') +
      '<h3>Auf diesem Gerät <span class="count-chip">' +
      local.length +
      '</span></h3>' +
      (local.length
        ? local.map(localOwnedRow).join('')
        : '<p>Du hast hier noch kein Loadout gespeichert.</p><button class="primary-btn" id="buildFromOwn">Loadout bauen →</button>') +
      (API || list.length
        ? '<h3>Öffentliche Loadouts <span class="count-chip">' +
          list.length +
          '</span></h3>' +
          (!API
            ? '<p class="fine-print">Für diese bereits eingereichten Beiträge muss der bisherige Community-Server verbunden sein. Die Löschschlüssel bleiben erhalten.</p>'
            : '') +
          (list.length
            ? list
                .map(
                  (x) =>
                    '<div class="owned-row"><div><b>' +
                    (x.kind === 'creators' ? 'Streamer' : 'Loadout') +
                    ' #' +
                    x.id +
                    '</b><small>' +
                    html(commentStatusLabel(x.status)) +
                    '</small>' +
                    (x.reason
                      ? '<p>' +
                        html(x.reason) +
                        '</p><small>Einwände? Nutze den Betreiberkontakt und nenne die Beitragsnummer.</small>'
                      : '') +
                    '</div><button class="ghost-btn" ' +
                    (!API ? 'disabled ' : '') +
                    'data-delete-own="' +
                    x.kind +
                    ':' +
                    x.id +
                    '">Löschen</button></div>',
                )
                .join('')
            : '<p>Auf diesem Gerät sind noch keine Löschschlüssel für öffentliche Loadouts gespeichert.</p>')
        : '') +
      (API || comments.length
        ? '<h3>Kommentare <span class="count-chip">' +
          comments.length +
          '</span></h3>' +
          (comments.length
            ? (API
                ? '<button class="text-action" id="refreshOwnComments">Status aktualisieren ↻</button>'
                : '<p class="fine-print">Zum Verwalten deiner öffentlichen Kommentare den bisherigen Community-Server verbinden.</p>') +
              comments
                .map(
                  (x) =>
                    '<div class="owned-row"><div><b>' +
                    html(x.text || 'Kommentar #' + x.id) +
                    '</b><small>' +
                    html(commentStatusLabel(x.status)) +
                    ' · ' +
                    html(x.kind === 'creators' ? 'Streamer-Loadout' : 'Loadout') +
                    ' #' +
                    x.postId +
                    '</small>' +
                    (x.reason
                      ? '<p>' + html(x.reason) + '</p><small>Einwände? Nutze den Betreiberkontakt.</small>'
                      : '') +
                    '</div><button class="ghost-btn" ' +
                    (!API ? 'disabled ' : '') +
                    'data-delete-comment="' +
                    x.id +
                    '">Löschen</button></div>',
                )
                .join('')
            : '<p>Deine Kommentare erscheinen hier nach dem Absenden.</p>')
        : '') +
      '<div class="dialog-actions">' +
      (API ? '<button class="ghost-btn" id="myReports">Meine Meldungen →</button>' : '') +
      '<button class="ghost-btn" data-close>Schließen</button></div><p class="fine-print">Lokale Loadouts und Löschschlüssel sind an diesen Browser gebunden. Nach dem Löschen der Browserdaten oder auf einem anderen Gerät stehen sie hier nicht zur Verfügung.</p>',
  );
}

async function deleteLocalOwn(value) {
  const item = localOwnedItem(value);
  if (!item) return;
  if (!confirm('Dieses auf deinem Gerät gespeicherte Loadout endgültig löschen?')) return;
  const key = item.ownedKind === 'creators' ? STREAMER_KEY : LOCAL_KEY,
    id = Number(item.id);
  try {
    const next = readLocalList(key).filter((x) => Number(x?.id) !== id);
    localStorage.setItem(key, JSON.stringify(next));
    if (item.ownedKind === 'creators') {
      localStreamers = localStreamers.filter((x) => Number(x.id) !== id);
      delete streamerLikes[id];
      try {
        localStorage.setItem(STREAMER_LIKES_KEY, JSON.stringify(streamerLikes));
      } catch (_) {}
    } else {
      localPosts = localPosts.filter((x) => Number(x.id) !== id);
      delete likedIds[id];
      try {
        localStorage.setItem(LIKE_KEY, JSON.stringify(likedIds));
      } catch (_) {}
    }
    await refresh();
    ownPosts();
    toast('Lokales Loadout gelöscht ✓');
  } catch (e) {
    toast('Lokales Löschen nicht möglich. Bitte prüfe den Browser-Speicher.');
  }
}

async function deleteOwn(value) {
  if (!API) {
    toast('Für diesen öffentlichen Beitrag den bisherigen Community-Server verbinden.');
    return;
  }
  const [kind, raw] = value.split(':'),
    id = Number(raw),
    list = readLocalList(OWNER_KEY),
    x = list.find((v) => v.kind === kind && v.id === id);
  if (!x) return;
  if (!confirm('Diesen öffentlichen Beitrag endgültig löschen?')) return;
  try {
    const r = await fetch(API + '/api/' + kind + '/' + id, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ deleteKey: x.key }),
    });
    if (!r.ok && r.status !== 404) throw Error('Löschen fehlgeschlagen. Betreiber kontaktieren.');
    localStorage.setItem(OWNER_KEY, JSON.stringify(list.filter((v) => v !== x)));
    await refresh();
    ownPosts();
    toast('Beitrag gelöscht');
  } catch (e) {
    toast(e.message);
  }
}

function openSupport() {
  modal(
    head(
      siteConfig.supportTitle || 'eUpdate unterstützen',
      siteConfig.supportText || 'Danke, dass du dabei bist.',
    ) +
      '<div class="stats"><div><b id="supportModalCount">' +
      supportLikes.toLocaleString('de-DE') +
      '</b><span>' +
      (API ? 'App-Likes' : 'Dein Like auf diesem Gerät') +
      '</span></div></div><div class="dialog-actions"><button class="primary-btn" id="likeApp" aria-pressed="' +
      !!state.liked +
      '">' +
      (state.liked ? '♥ Like entfernen' : '♡ App liken') +
      '</button>' +
      (siteConfig.paypal && /^https:\/\/(paypal\.me|www\.paypal\.com|paypal\.com)\//.test(siteConfig.paypal)
        ? '<a class="ghost-btn" href="' +
          html(siteConfig.paypal) +
          '" target="_blank" rel="noopener noreferrer">Mit PayPal unterstützen ↗</a>'
        : '') +
      '<button class="ghost-btn" id="feedbackOpen">Feedback geben</button><button class="ghost-btn" id="feedbackMine">Mein Feedback</button></div><p class="fine-print">' +
      (API
        ? 'Dein Like zählt für alle. Tippe erneut auf das Herz, um ihn zu entfernen.'
        : 'Der öffentliche Zähler startet nach der Serveranbindung.') +
      '</p>',
  );
  updateSupportHeart();
}

document.addEventListener('click', (e) => {
  const n = e.target.closest('button');
  if (!n) return;
  if (n.dataset.download) downloadRank(Number(n.dataset.download), n.dataset.downloadKind, n.dataset.loadoutWeapon);
  if (n.id === 'openPrivacy') privacy();
  if (n.id === 'openImprint') imprint();
  if (n.id === 'openUsage') modal(head('Nutzungsregeln', 'Öffentlich teilen · ohne Konto') + usageMarkup());
  if (n.id === 'ownPosts') ownPosts();
  if (n.id === 'refreshOwnStatus') refreshOwnStatus();
  if (n.id === 'buildFromOwn') {
    closeModal();
    navigate('builder');
  }
  if (n.dataset.openLocal) {
    const item = localOwnedItem(n.dataset.openLocal);
    if (item) {
      closeModal();
      importLoadout(item);
    }
  }
  if (n.dataset.downloadLocal) {
    const item = localOwnedItem(n.dataset.downloadLocal);
    if (item) exportPng(item, true);
  }
  if (n.dataset.deleteLocal) deleteLocalOwn(n.dataset.deleteLocal);
  if (n.dataset.deleteOwn) deleteOwn(n.dataset.deleteOwn);
  if (n.hasAttribute('data-open-data-erasure')) openDataErasure();
  if (n.hasAttribute('data-confirm-data-erasure')) eraseOwnData(n);
});

let adminTipPlatform = 'all';

function applySiteContent() {
  const c = siteConfig;
  if (c.accent) document.documentElement.style.setProperty('--gold', c.accent);
  if (c.background) document.documentElement.style.setProperty('--bg', c.background);
  for (const [key, variable] of Object.entries({
    surface: '--surface',
    surface2: '--surface2',
    textColor: '--text',
    mutedColor: '--muted',
    lineColor: '--line',
  }))
    if (c[key]) document.documentElement.style.setProperty(variable, c[key]);
  if (c.logo) {
    const img = document.querySelector('.logo-disc img');
    img.src = c.logo;
    img.classList.add('custom-logo');
  } else {
    const img = document.querySelector('.logo-disc img');
    img.src = LOGO;
    img.classList.remove('custom-logo');
  }
  const activeView = document.querySelector('main > .view.active');
  const viewKey = activeView?.id.replace(/^view-/, '');
  if (Object.hasOwn(SEO_PAGES, viewKey)) {
    if (c.seoPages) applyPageSeo(document, viewKey, c);
  } else if (activeView?.dataset.title) {
    document.title = (c.appName || 'eUpdate') + ' · ' + activeView.dataset.title;
  }
  if (!communityCopyReady) return;
  if (c.appName) document.querySelector('.brand > span:last-child').firstChild.textContent = c.appName;
  for (const [view, key] of Object.entries({
    feed: 'navRanking',
    builder: 'navBuilder',
    settings: 'navGameSettings',
  })) {
    const button = document.querySelector('.bottom-nav [data-view="' + view + '"]');
    if (!button) continue;
    const configuredLabel = c[key];
    const label = view === 'settings' && (!configuredLabel || ['MW4-Einstellungen', 'Spieleinstellungen'].includes(configuredLabel))
      ? 'Einstellungen'
      : configuredLabel;
    if (label) {
      const labelNode = button.querySelector('.settings-nav-label') ||
        [...button.childNodes].filter((node) => node.nodeType === 3).at(-1);
      if (labelNode && labelNode.textContent !== label) labelNode.textContent = label;
    }
  }
  const copy = [
    ['#rankingTitle', 'rankingTitle'],
    ['#rankingSubtitle', 'rankingSubtitle'],
    ['#view-builder .page-heading h1', 'builderTitle'],
    ['#view-builder .page-heading p', 'builderText'],
    ['#view-events .page-heading p', 'eventsText'],
    ['#setupTitle', 'setupTitle'],
    ['#setupText', 'setupText'],
  ];
  for (const [selector, key] of copy)
    if (c[key]) {
      const n = document.querySelector(selector);
      if (n) n.textContent = c[key];
    }
  applyGameSettingsCopy(c);
  const newsFootnote = document.querySelector('.live-footnote');
  if (newsFootnote)
    newsFootnote.textContent =
      c.autoNews === false
        ? 'Die automatische Quellenprüfung ist pausiert. Angezeigt wird der zuletzt gespeicherte Stand.'
        : 'Offizielle COD- und CDL-Quellen werden auf dem verbundenen Server im eingerichteten Zeitplan geprüft. Deine eigenen Texte bleiben erhalten.';
  const cards = managedItems('ads') || [],
    advertising = el('appAdvertising');
  if (advertising)
    advertising.innerHTML = cards.map((ad) => {
      const banner = ad.img ? '<img class="ad-banner" src="' + html(ad.img) + '" alt="' + html(ad.title) +
        '" width="' + BANNER_WIDTH + '" height="' + BANNER_HEIGHT + '" loading="lazy">' : '';
      const link = /^https:\/\/[^\s"<>]+$/.test(ad.url || '') ?
        ' href="' + html(ad.url) + '" target="_blank" rel="noopener noreferrer sponsored"' : '';
      const media = banner && link ? '<a class="ad-banner-link"' + link + '>' + banner + '</a>' : banner;
      return '<article class="ad-card"><span class="eyebrow">Werbung</span>' + media +
        '<strong>' + html(ad.title) + '</strong>' + (ad.text ? '<p>' + html(ad.text) + '</p>' : '') +
        (link ? '<a' + link + '>Mehr erfahren ↗</a>' : '') + '</article>';
    }).join('');
  el('advertisingContact').innerHTML = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.advertisingEmail || '')
    ? '<a href="mailto:' + html(c.advertisingEmail) + '">Werbung anfragen · Banner 1.200 × 400 px ↗</a>'
    : '';
  renderBuilder();
  if (el('tipModes')) renderTips();
}

function renderTips() {
  if (!el('tipModes') || !el('tipPlatforms') || !el('tipCards')) return;
  const modes = MW4_MODES;
  if (!modes.includes(tipMode)) tipMode = modes[0];
  el('tipModes').innerHTML = modes
    .map(
      (id) =>
        '<button data-tip-mode="' +
        id +
        '" class="' +
        (id === tipMode ? 'active' : '') +
        '">' +
        MODE[id] +
        '</button>',
    )
    .join('');
  el('tipPlatforms').innerHTML = Object.entries({ all: 'Alle', pc: 'PC', ps: 'PlayStation', xbox: 'Xbox' })
    .map(
      ([id, label]) =>
        '<button data-tip-platform="' +
        id +
        '" class="' +
        (id === adminTipPlatform ? 'active' : '') +
        '">' +
        label +
        '</button>',
    )
    .join('');
  const managed = managedItems('tips'),
    rows = managed
      ? managed.filter(
          (x) =>
            x.mode === tipMode &&
            (adminTipPlatform === 'all' || x.platform === 'all' || x.platform === adminTipPlatform),
        )
      : (TIPS[tipMode] || []).map(([title, text, url]) => ({ title, text, url, platform: 'all' }));
  el('tipCards').innerHTML = rows.length
    ? rows
        .map(
          (x, i) =>
            '<article class="tip"><span class="eyebrow">' +
            MODE[tipMode].toUpperCase() +
            ' · ' +
            ({ all: 'ALLE PLATTFORMEN', pc: 'PC', ps: 'PLAYSTATION', xbox: 'XBOX' }[x.platform] || '') +
            '</span><b>' +
            html(x.title) +
            '</b><p>' +
            html(x.text).replace(/\n/g, '<br>') +
            '</p>' +
            (x.author ? '<small>' + html(x.author) + '</small>' : '') +
            (x.url
              ? '<a href="' + html(x.url) + '" target="_blank" rel="noopener noreferrer">Quelle ↗</a>'
              : '') +
            '</article>',
        )
        .join('')
    : '<div class="empty">Für diesen Modus und diese Plattform sind noch keine Tipps veröffentlicht.</div>';
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-tip-platform]');
  if (b) {
    adminTipPlatform = b.dataset.tipPlatform;
    renderTips();
  }
});

const likeBusy = new Map(),
  COMMENTS_KEY = 'eupdate_v16_own_comments',
  REPORTS_KEY = 'eupdate_v16_own_reports';

let commentsContext = null,
  previousModalFocus = null,
  supportLikes = 0;

function arrangeHeader() {
  const bar = document.querySelector('.topbar'),
    access = document.querySelector('.my-posts-access'),
    main = document.querySelector('main');
  if (!access) return;
  if (matchMedia('(min-width:900px)').matches) {
    if (access.parentElement !== bar) bar.insertBefore(access, bar.querySelector('.topbar-actions'));
  } else if (access.parentElement !== main) main.insertBefore(access, main.firstElementChild);
}

window.addEventListener('resize', arrangeHeader);

function existingVisitorHeaders() {
  try {
    const id = localStorage.getItem('eupdate_v12_visitor') || '';
    return /^[a-f0-9]{32}$/.test(id) ? { 'x-eupdate-visitor': id } : {};
  } catch (_) {
    return {};
  }
}

async function toggleLike(key, path, vote, show) {
  if (likeBusy.has(key)) return null;
  const next = { liked: !vote.liked, likes: Math.max(0, vote.likes + (vote.liked ? -1 : 1)) };
  likeBusy.set(key, next);
  show(next, true);
  try {
    if (path && !communityCopyReady && next.liked) await loadSiteConfig();
    if (path && next.liked && communityCopyReady && siteConfig.communityReady === false) {
      throw Error('Neue Likes sind derzeit pausiert.');
    }
    const saved = path ? await apiPost(path, { liked: next.liked }) : next;
    if (typeof saved.liked !== 'boolean' || !Number.isSafeInteger(saved.likes)) throw Error('Like konnte nicht bestätigt werden.');
    communityVoteRevision++;
    return saved;
  } catch (error) {
    toast(error.message);
    return null;
  } finally {
    likeBusy.delete(key);
  }
}

function paintVoteButton(button, vote, busy) {
  button.setAttribute('aria-pressed', String(vote.liked));
  if (busy) {
    button.setAttribute('aria-busy', 'true');
    button.setAttribute('aria-disabled', 'true');
  } else {
    button.removeAttribute('aria-busy');
    button.removeAttribute('aria-disabled');
  }
  button.querySelector('.vote-symbol').textContent = vote.liked ? '♥' : '♡';
  button.querySelector('.vote-count').textContent = vote.likes.toLocaleString('de-DE');
}

function supportVote() {
  return { liked: Boolean(state.liked), likes: supportLikes };
}

function updateSupportHeart(vote = likeBusy.get('support') || supportVote(), busy = likeBusy.has('support')) {
  const button = el('quickSupportLike');
  if (button) {
    paintVoteButton(button, vote, busy);
    button.classList.toggle('liked', vote.liked);
  }
  const modalButton = el('likeApp');
  if (modalButton) {
    modalButton.disabled = busy;
    modalButton.textContent = vote.liked ? '♥ Like entfernen' : '♡ App liken';
    modalButton.setAttribute('aria-pressed', String(vote.liked));
    el('supportModalCount').textContent = vote.likes.toLocaleString('de-DE');
  }
}

function openAppGuide() {
  const steps = [
    ['builder', 'Setup bauen und Aufsätze wählen',
      'Wähle unter Bauen zuerst dein Setup und den Modus. Tippe auf das Waffenbild, um die Waffe zu ändern. Unter Aufsätze kannst du eine Kategorie öffnen und einen Vorschlag direkt übernehmen. Für ein ganzes Loadout wählst du zusätzlich Perks und Granaten.',
      'Zum Baukasten'],
    ['feed', 'Im Ranking filtern und speichern',
      'Wähle Primärwaffen, Sekundärwaffen oder ganze Loadouts aus. Filtere nach Waffe, Distanz oder Modus. Tippe auf ein Bild, um die Aufsätze zu sehen. Mit Bild speichern lädst du das gewählte Setup herunter.',
      'Zum Ranking'],
    ['settings', 'Spieleinstellungen nachschlagen',
      'Wähle Controller oder Maus und Tastatur. Öffne einen Einstellungsbereich und tippe auf eine Zeile, um ihre Erklärung zu lesen.',
      'Zu den Einstellungen'],
    ['events', 'News und Patchnotes lesen',
      'Die neueste passende Meldung steht oben. Über die Filter findest du Meldungen für deinen Modus. Jede Meldung verlinkt ihre offizielle Quelle.',
      'Zu den News'],
    [null, 'Likes und eigene Beiträge',
      'Mit dem Herz oben likst du eUpdate. Mit einem Herz im Ranking bewertest du ein Loadout. Ein erneuter Tipp nimmt dein Like zurück. Unter Meine Beiträge findest du deine veröffentlichten und gespeicherten Beiträge.',
      ''],
  ];
  const active = currentView();
  const currentTopic = active === 'attachments' ? 'builder' : active === 'detail' ? 'feed' : active || 'builder';
  modal(
    head('Anleitung', 'So nutzt du eUpdate') +
    '<div class="app-guide">' + steps.map(([view, title, text, label]) =>
      '<details' + (currentTopic === view ? ' open' : '') + '><summary>' + title + '</summary><p>' + text + '</p>' +
      (view ? '<button class="ghost-btn" type="button" data-guide-view="' + view + '">' + label + '</button>' : '') +
      '</details>').join('') + '</div>',
  );
}

function readLocalList(key) {
  try {
    const data = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(data) ? data : [];
  } catch (_) {
    return [];
  }
}

function writeLocalList(key, list) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
    return true;
  } catch (_) {
    toast(
      'Gerätespeicher voll. Löschschlüssel konnten nicht gespeichert werden. Bitte bei Bedarf den Betreiber kontaktieren.',
    );
    return false;
  }
}

function openDataErasure() {
  const contact = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(siteConfig.controllerEmail || '')
    ? 'oder kontaktiere den Betreiber unter ' + html(siteConfig.controllerEmail) + '.'
    : 'oder kontaktiere den Betreiber über das Impressum.';
  modal(head('Meine Daten löschen', 'Die Löschung ist endgültig.') +
    '<p>eUpdate löscht anhand der Schlüssel dieses Browsers deine gespeicherten Loadouts, Kommentare, ' +
    'Meldungen und dein privates Feedback. Auch Likes und zuordenbare Protokolleinträge werden entfernt. ' +
    'Anschließend löscht die App ihre gespeicherten Entwürfe und Einstellungen aus diesem Browser.</p>' +
    '<p>Verwende für Einträge aus einem anderen Browser dort dieselbe Funktion ' + contact + '</p>' +
    '<p id="dataErasureStatus" role="status"></p><div class="dialog-actions">' +
    '<button type="button" class="ghost-btn" data-close>Abbrechen</button>' +
    '<button type="button" class="ghost-btn" data-erase-local-data hidden>Nur Browserdaten löschen</button>' +
    '<button type="button" class="danger-btn" data-confirm-data-erasure>Endgültig löschen</button></div>');
}

let dataErasureInProgress = false;
let temporaryReports = [];

function clearCommunityStorage() {
  clearVisitorVerification();
  for (const storage of [localStorage, sessionStorage]) {
    for (const key of Object.keys(storage)) if (key.startsWith('eupdate_')) storage.removeItem(key);
  }
  sessionStorage.setItem('eupdate_data_erasure_done', '1');
  location.reload();
}

document.addEventListener('click', (event) => {
  if (!event.target.closest('[data-erase-local-data]')) return;
  if (confirm('Die restlichen Löschschlüssel gehen dabei verloren. Browserdaten löschen?')) {
    try { clearCommunityStorage(); } catch { toast('Die Browserdaten konnten nicht entfernt werden.'); }
  }
});

async function eraseOwnData(button) {
  if (dataErasureInProgress || button.disabled) return;
  dataErasureInProgress = true;
  button.disabled = true;
  const status = el('dataErasureStatus');
  status.textContent = 'Deine Daten werden gelöscht …';
  try {
    const items = [
      ...readLocalList(OWNER_KEY).filter(item => ['sets', 'creators'].includes(item?.kind)),
      ...readLocalList(COMMENTS_KEY).map(item => ({ ...item, kind: 'comments' })),
      ...readLocalList(REPORTS_KEY).concat(temporaryReports).map(item => ({ ...item, kind: 'reports' })),
      ...readLocalList(FEEDBACK_KEY).map(item => ({ ...item, kind: 'feedback' })),
    ].filter(item => Number.isSafeInteger(item?.id) && item.id > 0 &&
        typeof item.key === 'string' && /^[a-z0-9_-]{32,128}$/i.test(item.key))
      .map(({ kind, id, key }) => ({ kind, id, key }));
    const visitor = existingVisitorHeaders();
    const confirmed = new Set();
    let unverified = false;
    if (API && (items.length || Object.keys(visitor).length)) {
      for (let offset = 0; offset < Math.max(1, items.length); offset += 1000) {
        const signal = typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(25000) : undefined;
        const response = await fetch(API + '/api/own/erase', {
          method: 'POST', credentials: 'omit', signal,
          headers: { 'content-type': 'application/json', ...(offset === 0 ? visitor : {}) },
          body: JSON.stringify({ confirmed: true, items: items.slice(offset, offset + 1000) }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || result.ok !== true) throw Error(response.status === 404
          ? 'Die Serverfunktion zum Löschen wird noch eingerichtet.' : (result.error || 'Die Löschung konnte nicht bestätigt werden.'));
        if (Array.isArray(result.items)) {
          const submitted = items.slice(offset, offset + 1000);
          submitted.forEach((item, index) => {
            if (result.items[index]?.confirmed === true) confirmed.add(item.key);
            else unverified = true;
          });
          for (const key of [OWNER_KEY, COMMENTS_KEY, REPORTS_KEY, FEEDBACK_KEY]) {
            const saved = readLocalList(key);
            const remaining = saved.filter((item) => !confirmed.has(item.key));
            if (remaining.length !== saved.length) writeLocalList(key, remaining);
          }
          temporaryReports = temporaryReports.filter((item) => !confirmed.has(item.key));
        }
      }
    }
    if (unverified) {
      const contact = siteConfig.controllerEmail ? ' Für Rückfragen erreichst du den Betreiber unter ' + siteConfig.controllerEmail + '.' : '';
      const local = document.querySelector('[data-erase-local-data]');
      if (local) local.hidden = false;
      throw Error('Bestätigte Einträge wurden entfernt. Die Schlüssel der übrigen Einträge bleiben für eine Rückfrage auf diesem Gerät.' + contact);
    }
    clearCommunityStorage();
  } catch (error) {
    const message = error.name === 'TimeoutError' ? 'Der Server hat zu lange gebraucht. Versuche es erneut.' :
      error instanceof TypeError ? 'Der Server ist gerade nicht erreichbar. Versuche es erneut.' : error.message;
    if (status.isConnected) status.textContent = message;
    else toast(message);
    button.disabled = false;
  } finally {
    dataErasureInProgress = false;
  }
}

function commentStatusLabel(status) {
  return (
    {
      pending: 'Wartet auf Freigabe',
      approved: 'Veröffentlicht',
      hidden: 'Ausgeblendet',
      deleted: 'Bereits entfernt',
      unavailable: 'Nicht mehr verfügbar',
    }[status] || 'Status noch nicht geprüft'
  );
}

async function openComments(kind, id) {
  if (!['sets', 'creators'].includes(kind) || !Number.isSafeInteger(id)) return;
  const item = (kind === 'sets' ? feed : creators).find((x) => x.id === id);
  if (!API || item?.local) {
    commentsContext = null;
    modal(
      head('Kommentare', item?.title || item?.name || 'Dein Loadout') +
        '<div class="comment-unavailable"><b>' +
        (item?.local
          ? 'Dieses Loadout ist nur auf deinem Gerät gespeichert.'
          : 'Die Community wird gerade eingerichtet.') +
        '</b><p>' +
        (item?.local
          ? 'Kommentare sind verfügbar, sobald dein Loadout öffentlich freigegeben ist.'
          : 'Sobald die App mit dem Community-Server verbunden ist, kannst du Kommentare lesen und schreiben.') +
        '</p><p>Für Kommentare brauchst du kein Nutzerkonto.</p></div><div class="dialog-actions"><button type="button" class="primary-btn" data-close>Verstanden</button></div>',
      'comments',
    );
    return;
  }
  if (id < 1) return;
  const ctx = { kind, id };
  commentsContext = ctx;
  modal(
    head('Kommentare', item?.title || item?.name || 'Loadout #' + id) +
      '<p class="comments-loading" role="status">Kommentare werden geladen …</p>',
    'comments',
  );
  try {
    const [data, c] = await Promise.all([
      serverGet('/api/' + kind + '/' + id + '/comments'),
      serverGet('/api/config'),
    ]);
    if (commentsContext !== ctx || el('modal').hidden) return;
    siteConfig = c;
    const automatic = c.autoApproveComments !== false;
    modal(
      head('Kommentare', item?.title || item?.name || 'Loadout #' + id) +
        '<div class="comment-context"><span>' +
        html(kind === 'creators' ? 'STREAMER-LOADOUT' : 'COMMUNITY-LOADOUT') +
        '</span><p>' +
        html(
          siteConfig.commentRules ||
            'Bleib sachlich. Keine Beleidigungen, Drohungen, Links oder privaten Daten.',
        ) +
        '</p></div><div id="commentsList" aria-live="polite"><p>Lade Kommentare …</p></div><div id="ownPendingComments"></div>' +
        (siteConfig.communityReady === true && siteConfig.commentsEnabled !== false
          ? '<form id="commentForm" class="comment-form" data-kind="' +
            kind +
            '" data-post="' +
            id +
            '"><h3>Dein Kommentar</h3><label class="field-label">Spielername · optional<input class="field" name="name" maxlength="30" autocomplete="off" placeholder="Gast"></label><label class="field-label">Was möchtest du zum Loadout sagen?<textarea class="field" name="text" id="commentText" minlength="2" maxlength="600" required placeholder="Wie spielt sich das Loadout? Was würdest du ändern?"></textarea></label><div class="comment-meter"><span>Keine privaten Daten oder Links.</span><span id="commentCharacters">0 / 600</span></div>' +
            privacyConfirmation() +
            publicationRules() +
            '<label class="consent comment-consent"><input type="checkbox" name="consent" required><span>Ich willige ein, dass mein Spielername und Kommentar öffentlich erscheinen. Widerruf und Löschung sind jederzeit über „Meine Beiträge“ oder den Betreiberkontakt möglich.</span></label><div class="dialog-actions"><button class="primary-btn" type="submit">' +
            (automatic ? 'Kommentar veröffentlichen →' : 'Zur Prüfung senden →') +
            '</button><button class="ghost-btn" type="button" data-close>Schließen</button></div><p class="fine-print">' +
            (automatic
              ? 'Unauffällige Kommentare erscheinen direkt. Auffällige warten auf Freigabe.'
              : 'Kommentare erscheinen erst nach Freigabe.') +
            ' Du brauchst kein Konto.</p></form>'
          : '<p class="own-part-note">Neue Kommentare sind derzeit nicht freigegeben.</p>') +
        '<div class="comments-links"><button class="text-action" data-report="' +
        kind +
        ':' +
        id +
        '">Loadout melden</button><button class="text-action" id="ownPosts">Meine Beiträge</button></div>',
      'comments',
    );
    const own = readLocalList(COMMENTS_KEY),
      list = data.comments || [];
    el('commentsList').innerHTML = list.length
      ? list
          .map((c) => {
            const mine = own.some((x) => x.id === c.id);
            return (
              '<article class="comment-item"><div class="comment-heading"><b>' +
              html(c.name) +
              '</b><time>' +
              html(
                new Date(c.created).toLocaleDateString('de-DE', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                }),
              ) +
              '</time></div><p>' +
              html(c.text).replace(/\n/g, '<br>') +
              '</p><div class="comment-item-actions">' +
              (mine
                ? '<button class="text-action" data-delete-comment="' +
                  c.id +
                  '">Mein Kommentar · löschen</button>'
                : '') +
              '<button class="text-action" data-report="comments:' +
              c.id +
              '">Melden</button></div></article>'
            );
          })
          .join('')
      : '<div class="comment-empty"><b>Noch keine Kommentare.</b><p>Hast du dieses Loadout getestet? Teile deine Erfahrung.</p></div>';
    const ids = new Set(list.map((x) => x.id));
    for (const x of own) if (ids.has(x.id)) x.status = 'approved';
    const local = own.filter(
      (x) =>
        x.kind === kind && x.postId === id && !ids.has(x.id) && !['deleted', 'approved'].includes(x.status),
    );
    writeLocalList(COMMENTS_KEY, own);
    el('ownPendingComments').innerHTML = local.length
      ? '<div class="pending-comments"><b>Deine noch nicht veröffentlichten Kommentare</b>' +
        local
          .map(
            (x) =>
              '<article><p>' +
              html(x.text) +
              '</p><small>' +
              html(commentStatusLabel(x.status)) +
              ' · nur für dich sichtbar</small><button class="text-action" data-delete-comment="' +
              x.id +
              '">Löschen</button></article>',
          )
          .join('') +
        '</div>'
      : '';
  } catch (e) {
    if (commentsContext !== ctx || el('modal').hidden) return;
    modal(
      head('Kommentare', item?.title || 'Loadout #' + id) +
        '<div class="comment-unavailable" role="alert"><b>Kommentare konnten nicht geladen werden.</b><p>' +
        html(
          e.status === 404
            ? 'Das Loadout ist nicht mehr öffentlich erreichbar oder Kommentare sind auf dem Server noch nicht verfügbar.'
            : e.message || 'Bitte versuche es erneut.',
        ) +
        '</p></div><div class="dialog-actions"><button type="button" class="primary-btn" data-comments="' +
        kind +
        ':' +
        id +
        '">Erneut laden ↻</button><button type="button" class="ghost-btn" data-close>Schließen</button></div>',
      'comments',
    );
  }
}

async function submitComment(e) {
  e.preventDefault();
  if (!confirmedPrivacy(e.target)) return;
  const form = e.target,
    button = form.querySelector('[type="submit"]');
  if (button.disabled) return;
  button.disabled = true;
  const data = Object.fromEntries(new FormData(form)),
    kind = form.dataset.kind,
    id = Number(form.dataset.post);
  try {
    const x = await apiPost('/api/' + kind + '/' + id + '/comments', {
      name: data.name || 'Gast',
      text: data.text,
      ...privacyReceipt(form),
    });
    const own = readLocalList(COMMENTS_KEY);
    own.unshift({
      id: x.id,
      kind,
      postId: id,
      key: x.deleteKey,
      text: data.text,
      status: x.status,
      created: new Date().toISOString(),
    });
    writeLocalList(COMMENTS_KEY, own);
    if (x.status === 'approved') await refresh();
    await openComments(kind, id);
    toast(
      x.status === 'approved'
        ? 'Dein Kommentar ist veröffentlicht.'
        : 'Dein Kommentar wird geprüft. Bis zur Freigabe siehst nur du ihn.',
    );
  } catch (err) {
    await updateChangedPrivacy(form, err);
    button.disabled = false;
    let message = form.querySelector('.inline-error');
    if (!message) {
      message = document.createElement('p');
      message.className = 'inline-error';
      message.setAttribute('role', 'alert');
      form.querySelector('.dialog-actions').before(message);
    }
    message.textContent = err.message;
    toast(err.message);
  }
}

async function deleteComment(id) {
  const list = readLocalList(COMMENTS_KEY),
    item = list.find((x) => x.id === id);
  if (!item) return;
  if (!confirm('Deinen Kommentar endgültig löschen?')) return;
  try {
    const r = await fetch(API + '/api/comments/' + id, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ deleteKey: item.key }),
    });
    const data = await r.json();
    if (!r.ok && r.status !== 404) throw Error(data.error || 'Löschen fehlgeschlagen');
    writeLocalList(
      COMMENTS_KEY,
      list.filter((x) => x.id !== id),
    );
    await refresh();
    if (el('commentsList')) await openComments(item.kind, item.postId);
    else ownPosts();
    toast('Kommentar gelöscht');
  } catch (e) {
    toast(e.message);
  }
}

async function refreshOwnComments() {
  await refreshOwnStatus();
}


function reportForm(value = 'page') {
  if (!API) return;
  const [kind, raw] = value.split(':');
  const id = Number(raw);
  const pageReport = kind === 'page';
  if (!pageReport && (!['comments', 'sets', 'creators'].includes(kind) || !Number.isSafeInteger(id) || id < 1)) return;
  const inApp = siteConfig.reportContactMode === 'in-app';
  const name = kind === 'comments' ? 'Kommentar' : kind === 'creators' ? 'Streamer-Loadout' : 'Community-Loadout';
  modal(head('Inhalt melden', 'Deine Meldung geht privat an eUpdate.') +
    `<form id="reportForm" class="form-grid" data-kind="${kind}" data-target="${pageReport ? 0 : id}">
      ${pageReport ? `<label class="wide">Genauer Link zum Inhalt<input type="url" class="field" name="location"
        value="${html(location.href)}" maxlength="600" required></label>` : `<p class="wide report-target">${name} #${id}</p>`}
      <label>Name<input class="field" name="name" maxlength="60" required autocomplete="name"></label>
      ${inApp ? '' : '<label>E-Mail<input class="field" name="email" type="email" maxlength="254" required autocomplete="email"></label>'}
      <label class="wide consent comment-consent"><input type="checkbox" name="childProtection">
        <span>Die Meldung betrifft sexualisierte Gewalt gegen Kinder. ${inApp
          ? 'Du kannst in diesem Fall deinen Namen weglassen.' : 'Name und E-Mail können in diesem Fall frei bleiben.'}</span></label>
      <label class="wide">Was ist rechtswidrig oder problematisch?
        <textarea class="field" name="reason" minlength="10" maxlength="1500" required
          placeholder="Beschreibe den Inhalt und begründe deine Meldung."></textarea>
        ${inApp ? '<small>Für die Begründung genügen die Angaben zum gemeldeten Inhalt.</small>' : ''}</label>
      <label class="wide consent comment-consent"><input type="checkbox" name="goodFaith" required>
        <span>Meine Angaben sind nach bestem Wissen richtig und vollständig. <button type="button" id="openPrivacy">Datenschutz</button></span></label>
      <div class="dialog-actions wide"><button type="submit" class="primary-btn">Meldung senden</button>
        <button type="button" class="ghost-btn" data-close>Schließen</button></div>
    </form><p class="fine-print">Du findest die Bestätigung und Entscheidung unter „Meine Meldungen“.${!inApp && siteConfig.reportEmailProvider
      ? ' Bei Angabe einer E-Mail-Adresse erhältst du beides auch per E-Mail.' : ''}</p>`);
  const form = el('reportForm');
  form.elements.childProtection.addEventListener('change', () => {
    const required = !form.elements.childProtection.checked;
    form.elements.name.required = required;
    if (form.elements.email) form.elements.email.required = required;
  });
}

async function submitReport(event) {
  event.preventDefault();
  const form = event.target;
  const button = form.querySelector('[type="submit"]');
  if (button.disabled) return;
  button.disabled = true;
  try {
    const data = Object.fromEntries(new FormData(form));
    const report = await apiPost('/api/reports', {
      targetType: form.dataset.kind,
      targetId: Number(form.dataset.target),
      location: data.location,
      name: data.name,
      email: siteConfig.reportContactMode === 'in-app' ? undefined : data.email,
      reason: data.reason,
      childProtection: data.childProtection === 'on',
      goodFaith: data.goodFaith === 'on',
    });
    const entry = { id: report.id, key: report.receiptKey, status: report.status, decision: '',
      created: new Date().toISOString(), target: form.dataset.kind + ':' + form.dataset.target };
    const list = readLocalList(REPORTS_KEY);
    list.unshift(entry);
    if (!writeLocalList(REPORTS_KEY, list)) temporaryReports.unshift(entry);
    myReports();
    toast('Meldung eingegangen.');
  } catch (error) {
    button.disabled = false;
    toast(error.message);
  }
}

function myReports() {
  const list = temporaryReports.concat(readLocalList(REPORTS_KEY));
  modal(
    head('Meine Meldungen', 'Private Bestätigung und Bearbeitungsstand') +
      (list.length
        ? list
            .map(
              (x) =>
                '<article class="report-receipt"><b>Meldung #' +
                x.id +
                '</b><span class="status-badge">' +
                html(
                  {
                    pending: 'Eingegangen',
                    resolved: 'Bearbeitet',
                    dismissed: 'Nicht entfernt',
                    expired: 'Nicht mehr gespeichert',
                  }[x.status] || x.status,
                ) +
                '</span><p>' +
                html(x.decision || 'Deine Meldung ist eingegangen und wird geprüft.') +
                '</p><small>' +
                html(new Date(x.created).toLocaleString('de-DE')) +
                '</small>' +
                (temporaryReports.includes(x) ? '<label>Empfangsschlüssel sichern<input class="field" readonly value="' +
                  html(x.key) + '"></label>' : '') +
                '<button class="ghost-btn" data-report-status="' +
                x.id +
                '">Stand prüfen ↻</button></article>',
            )
            .join('')
        : '<p>Auf diesem Gerät sind noch keine Meldungen gespeichert.</p>') +
      '<p class="fine-print">Empfangsschlüssel bleiben auf deinem Gerät. Über „Stand prüfen“ rufst du die aktuelle Entscheidung ab.</p>' +
      (siteConfig.reportContactMode !== 'in-app' && siteConfig.controllerEmail
        ? '<a class="text-action" href="mailto:' +
          html(siteConfig.controllerEmail) +
          '">Betreiber kontaktieren ↗</a>'
        : '') +
      '<div class="dialog-actions"><button class="ghost-btn" data-report="page">Seiteninhalt melden</button><button class="ghost-btn" id="ownPosts">Meine Beiträge</button><button class="ghost-btn" data-close>Schließen</button></div>',
  );
}

async function refreshReportStatus(id) {
  const button = document.querySelector('[data-report-status="' + id + '"]');
  if (button?.disabled) return;
  if (button) button.disabled = true;
  const list = readLocalList(REPORTS_KEY),
    item = temporaryReports.concat(list).find((x) => x.id === id);
  if (!item) return;
  try {
    const x = await apiPost('/api/reports/' + id + '/status', { receiptKey: item.key });
    Object.assign(item, { status: x.status, decision: x.decision, updated: x.updated });
    writeLocalList(REPORTS_KEY, list);
    myReports();
  } catch (e) {
    if (e.status === 404) {
      item.status = 'expired';
      item.decision = 'Die Meldung ist nicht mehr gespeichert. Bei Bedarf den Betreiber kontaktieren.';
      writeLocalList(REPORTS_KEY, list);
      myReports();
    } else {
      toast(e.message);
      if (button) button.disabled = false;
    }
  }
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.comments) {
    const [kind, id] = b.dataset.comments.split(':');
    openComments(kind, Number(id));
  }
  if (b.dataset.deleteComment) deleteComment(Number(b.dataset.deleteComment));
  if (b.id === 'refreshOwnComments') refreshOwnComments();
  if (b.dataset.report) reportForm(b.dataset.report);
  if (b.id === 'myReports') myReports();
  if (b.dataset.reportStatus) refreshReportStatus(Number(b.dataset.reportStatus));
});

document.addEventListener('submit', (e) => {
  if (e.target.id === 'commentForm') submitComment(e);
  if (e.target.id === 'reportForm') submitReport(e);
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Tab' || el('modal').hidden) return;
  const nodes = [
    ...el('modalBody').querySelectorAll('button,a[href],input,select,textarea,summary,[tabindex]'),
  ].filter((n) => !n.disabled && n.tabIndex >= 0 && n.getClientRects().length);
  if (!nodes.length) return;
  const first = nodes[0],
    last = nodes[nodes.length - 1];
  if (e.shiftKey && (document.activeElement === first || !el('modalBody').contains(document.activeElement))) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
});

document.addEventListener('input', (e) => {
  if (e.target.id === 'commentText' && el('commentCharacters'))
    el('commentCharacters').textContent = e.target.value.length + ' / 600';
});

const BASE_TERMS =
  'Nutzungsbedingungen für eUpdate\n\n1. Angebot und Nutzung\neUpdate ist eine unabhängige Community zum Austausch von Call-of-Duty-Loadouts. Ein Benutzerkonto ist nicht erforderlich. Die Rangliste basiert auf Likes und ist keine Garantie für die Leistung eines Loadouts. Es besteht keine offizielle Verbindung zu Activision oder Call of Duty.\n\n2. Öffentliche Inhalte\nÖffentliche Loadouts, Streamer-Beiträge und Kommentare sind ab 18 Jahren vorgesehen. Verwende einen Spielernamen und nur Inhalte, für die du die erforderlichen Rechte besitzt. Ein Profilfoto darf nur dich zeigen. Veröffentliche keine fremden Fotos, kopierten Spielgrafiken, privaten Kontaktdaten oder sonstigen vertraulichen Informationen.\n\n3. Community-Regeln\nBeleidigungen, Bedrohungen, diskriminierende oder strafbare Inhalte, Spam, Identitätstäuschungen, unerlaubte Werbung und die Verletzung fremder Rechte sind untersagt. Likes dürfen nicht manipuliert werden.\n\n4. Veröffentlichung und Löschung\nMit einer Veröffentlichung erlaubst du eUpdate, deinen Beitrag für deren Dauer zu speichern, öffentlich anzuzeigen und als Loadout-Bild zum Download bereitzustellen. Deine Rechte an eigenen Inhalten bleiben erhalten. Eigene Beiträge und Kommentare kannst du unter „Meine Beiträge“ löschen. Bereits von anderen gespeicherte Bilder können wir nicht zurückholen. Private Löschschlüssel bleiben auf deinem Gerät; nach deren Verlust wende dich an den Betreiber.\n\n5. Moderation und Meldungen\nLoadouts werden vor Veröffentlichung geprüft. Kommentare können je nach Einstellung nach einem automatischen Regelfilter direkt erscheinen oder bis zur manuellen Prüfung zurückgehalten werden. Der Filter kann Fehler machen. Problematische Inhalte kannst du über „Inhalt melden“ oder den Betreiberkontakt melden. Inhalte können nach Prüfung zurückgehalten, ausgeblendet oder gelöscht werden. Begründungen und Bearbeitungsstände sind mit deinem privaten Empfangs- oder Löschschlüssel unter „Meine Beiträge“ beziehungsweise „Meine Meldungen“ abrufbar. Gegen eine Entscheidung kannst du dich über den Betreiberkontakt wenden. Gesetzliche Rechte bleiben unberührt.\n\n6. Datenschutz und Änderungen\nDiese Nutzungsbedingungen sind keine Einwilligung zur Veröffentlichung personenbezogener Daten. Die Datenschutzhinweise erläutern die Verarbeitung. Vor einer Veröffentlichung oder privatem Feedback wird die dafür erforderliche Einwilligung separat abgefragt. Ändern sich die Nutzungsbedingungen, ist vor der weiteren App-Nutzung eine erneute Bestätigung erforderlich. Datenschutz, Impressum, eigene Löschmöglichkeiten und Inhaltsmeldungen bleiben ohne diese Bestätigung erreichbar.';

const TERMS_KEY = 'eupdate_terms_acceptance_v1';

let entryAcceptance = null,
  termsInitialised = false;

function currentTermsVersion() {
  return siteConfig.termsVersion || entryAcceptance?.version || 'local:2026-10-11.1';
}

function usageMarkup() {
  return (
    '<div class="legal-text" style="white-space:pre-line">' +
    html(
      siteConfig.termsText ||
        BASE_TERMS +
          '\n\n7. KI-unterstützte Nachrichten\neUpdate nutzt KI zur Übersetzung und Zusammenfassung öffentlich verfügbarer Gaming-Nachrichten. KI-unterstützt aufbereitete Meldungen sind gekennzeichnet und verlinken die Originalquelle. KI-Texte können Fehler enthalten.',
    ) +
    '</div>'
  );
}

function termsReceipt() {
  return entryAcceptance && entryAcceptance.version === currentTermsVersion()
    ? { termsAccepted: true, acceptedTermsVersion: entryAcceptance.version }
    : {};
}

function gateBackground(block) {
  for (const node of [...document.body.children]) {
    if (['termsGate', 'modal', 'toast'].includes(node.id) || ['SCRIPT', 'STYLE'].includes(node.tagName))
      continue;
    if (block) {
      if (!node.hasAttribute('data-gate-inert')) node.setAttribute('data-gate-inert', node.inert ? '1' : '0');
      node.inert = true;
    } else if (node.hasAttribute('data-gate-inert')) {
      node.inert = node.getAttribute('data-gate-inert') === '1';
      node.removeAttribute('data-gate-inert');
    }
  }
}

function checkTermsGate() {
  const gate = el('termsGate');
  if (!gate) return;
  if (!termsInitialised) {
    termsInitialised = true;
    try {
      const saved = JSON.parse(localStorage.getItem(TERMS_KEY) || 'null');
      if (typeof saved?.version === 'string' && saved.acceptedAt) entryAcceptance = saved;
    } catch {}
  }
  const version = currentTermsVersion();
  if (entryAcceptance?.version === version) {
    gate.hidden = true;
    gateBackground(false);
    if (el('modal').hidden) document.body.style.overflow = '';
    return;
  }
  const wasHidden = gate.hidden;
  entryAcceptance = null;
  el('termsText').textContent = siteConfig.termsText || BASE_TERMS;
  el('entryTermsAccepted').checked = false;
  gate.hidden = false;
  gateBackground(true);
  document.body.style.overflow = 'hidden';
  if (wasHidden) el('termsText').focus();
}

function reopenTermsAfterError(err) {
  if ([409, 428].includes(err.status)) loadSiteConfig();
}

el('entryTermsForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!el('entryTermsAccepted').checked) return;
  const button = el('acceptEntryTerms');
  button.disabled = true;
  el('termsError').textContent = '';
  const version = currentTermsVersion();
  try {
    let receipt = { version, acceptedAt: new Date().toISOString(), serverRecorded: false };
    if (API && siteConfig.termsVersion) {
      const x = await apiPost('/api/terms/accept', { termsAccepted: true, acceptedTermsVersion: version });
      receipt = { version: x.termsVersion, acceptedAt: x.acceptedAt, serverRecorded: true };
    }
    if (version !== currentTermsVersion())
      throw Object.assign(Error('Die Bedingungen wurden geändert. Bitte erneut bestätigen.'), {
        status: 409,
      });
    entryAcceptance = receipt;
    try {
      localStorage.setItem(TERMS_KEY, JSON.stringify(receipt));
    } catch {
      toast('Die Bestätigung gilt für diesen Tab. Der Browser konnte sie nicht speichern.');
    }
    checkTermsGate();
    el('termsGate').hidden = true;
    gateBackground(false);
    document.body.style.overflow = '';
    el('rankingTitle')?.focus?.();
  } catch (err) {
    el('termsError').textContent = err.message;
    reopenTermsAfterError(err);
  } finally {
    button.disabled = false;
  }
});

el('declineEntryTerms').onclick = () => {
  el('entryTermsAccepted').checked = false;
  el('termsError').textContent =
    'Die App bleibt geschlossen. Datenschutz, Impressum, Löschen und Meldungen kannst du weiterhin öffnen.';
};

el('entryPrivacy').onclick = privacy;

el('entryImprint').onclick = imprint;

el('entryOwn').onclick = ownPosts;

el('entryReport').onclick = () => reportForm('page');

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Tab' || el('termsGate').hidden || !el('modal').hidden) return;
  const nodes = [...el('termsGate').querySelectorAll('button,input,[tabindex]')].filter((x) => !x.disabled);
  const first = nodes[0],
    last = nodes.at(-1);
  if (e.shiftKey && (document.activeElement === first || !el('termsGate').contains(document.activeElement))) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
});

function activateView(view) {
  document.body.classList.toggle('builder-view', view === 'builder');
  arrangeHeader();
  if (view === 'feed') activateRanking();
  if (view === 'builder') renderBuilder();
  if (view === 'attachments') {
    const slots = setupSlots(build().setupType);
    picker.slot = slots.includes(currentParam('slot')) ? currentParam('slot') : slots[0];
    renderGunsmith();
  }
  if (view === 'events') checkLive();
  if (view === 'detail') renderCurrentDetail();
  if (view === 'settings') showGameSettings();
  applySiteContent();
  countPageView(API, view);
  if (communityLoaded) refreshVisibleCommunity();
}

function start() {
  const reportLink = document.createElement('button');
  reportLink.type = 'button';
  reportLink.dataset.report = 'page';
  reportLink.textContent = 'Inhalt melden';
  document.querySelector('.legal-footer #myReports')?.before(reportLink);
  checkTermsGate();
  if (!API) supportLikes = state.liked ? 1 : 0;
  updateSupportHeart();
  startNavigation(activateView);
  renderTips();
  refresh();
  loadSiteConfig();
  try {
    if (sessionStorage.getItem('eupdate_data_erasure_done') === '1') {
      sessionStorage.removeItem('eupdate_data_erasure_done');
      toast('Deine zugeordneten Daten wurden gelöscht.');
    }
  } catch {}
  setInterval(() => { if (currentView() === 'events' && !document.hidden) tick(); }, 1000);
  setInterval(() => { if (currentView() === 'events' && !document.hidden) checkLive(); }, COMMUNITY_REFRESH_MS);
  setInterval(refreshVisibleCommunity, COMMUNITY_REFRESH_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    if (currentView() === 'events') checkLive();
    refreshVisibleCommunity();
  });
}

document.addEventListener('click', (e) => {
  const button = e.target.closest('button,a,[data-close]');
  if (!button) return;
  const { scroll, tipMode: mode, close: closeDialog, support } = button.dataset;
  if (scroll) el(scroll)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (mode) {
    tipMode = mode;
    renderTips();
  }
  if (closeDialog !== undefined) closeModal();
  if (button.id === 'openAppGuide') openAppGuide();
  if (button.dataset.guideView) {
    closeModal();
    navigate(button.dataset.guideView);
  }
  if (button.id === 'quickSupportLike' || button.id === 'likeApp') likeApp();
  if (support !== undefined) openSupport();
});

document.addEventListener('change', (e) => {
  if (e.target.id === 'creatorPhoto' || e.target.id === 'postPhoto') loadCrop(e.target.files[0]);
});

document.addEventListener('input', (e) => {
  if (e.target.id === 'cropZoom' && crop) {
    const old = Math.max(220 / crop.width, 220 / crop.height) * crop.zoom,
      cx = (110 - crop.x) / old,
      cy = (110 - crop.y) / old;
    crop.zoom = Number(e.target.value);
    const next = Math.max(220 / crop.width, 220 / crop.height) * crop.zoom;
    crop.x = 110 - cx * next;
    crop.y = 110 - cy * next;
    cropStyle();
  }
});

document.addEventListener('submit', (e) => {
  if (e.target.id === 'postForm') postLoadout(e);
  if (e.target.id === 'creatorForm') submitCreator(e);
});

document.addEventListener('pointerdown', (e) => {
  if (e.target.id !== 'cropBox' || !crop) return;
  const box = e.target;
  box.setPointerCapture(e.pointerId);
  crop.drag = { x: e.clientX, y: e.clientY, left: crop.x, top: crop.y };
});

document.addEventListener('pointermove', (e) => {
  if (!crop?.drag) return;
  crop.x = crop.drag.left + e.clientX - crop.drag.x;
  crop.y = crop.drag.top + e.clientY - crop.drag.y;
  cropStyle();
});

document.addEventListener('pointerup', () => {
  if (crop) crop.drag = null;
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

const FEEDBACK_KEY = 'eupdate_private_feedback_receipts';

function feedbackForm() {
  if (!API) {
    toast('Feedback braucht die Serververbindung.');
    return;
  }
  modal(
    head('Feedback geben', 'Fehlt dir etwas? Oder funktioniert etwas nicht?') +
      '<div class="feedback-scroll"><form id="feedbackForm" class="form-grid feedback-form"><label class="wide">Worum geht es?<select class="field" name="category"><option value="bug">Fehler melden</option><option value="idea">Idee oder Wunsch</option><option value="other">Sonstiges</option></select></label><label class="wide">Deine Nachricht<textarea class="field" name="text" minlength="5" maxlength="2000" required placeholder="Was können wir besser machen?"></textarea></label><label>Name · optional<input class="field" name="name" maxlength="40" autocomplete="off"></label><label>E-Mail · optional, falls du eine Antwort möchtest<input class="field" name="email" type="email" maxlength="254" autocomplete="email"></label><p class="wide fine-print">Nur der Betreiber sieht dein Feedback. Bitte keine Passwörter oder privaten Daten anderer Personen eingeben. Es wird spätestens nach 90 Tagen gelöscht. Antworten werden nicht automatisch versendet.</p>' +
      privacyConfirmation() +
      '<label class="wide consent"><input name="consent" type="checkbox" required><span>Ich stimme der Verarbeitung meines Feedbacks und meiner freiwilligen Kontaktangaben zur Bearbeitung meiner Nachricht zu. Ich kann diese Einwilligung jederzeit widerrufen.</span></label><div class="wide dialog-actions"><button type="submit" class="primary-btn">Feedback senden</button></div><p id="feedbackError" class="wide" role="alert"></p></form></div>',
    'feedback',
  );
}

function myFeedback() {
  const list = readLocalList(FEEDBACK_KEY);
  modal(
    head('Mein Feedback', 'Hier kannst du dein Feedback zurückziehen.') +
      list
        .map(
          (x) =>
            '<article class="owner-card"><h3>Feedback #' +
            Number(x.id) +
            '</h3><p>' +
            html(new Date(x.created).toLocaleDateString('de-DE')) +
            '</p><button class="ghost-btn" data-delete-feedback="' +
            Number(x.id) +
            '">Feedback löschen / Einwilligung widerrufen</button></article>',
        )
        .join('') +
      (list.length ? '' : '<p>Auf diesem Gerät ist kein Feedback gespeichert.</p>') +
      '<p class="fine-print">Die Löschschlüssel bleiben nur auf diesem Gerät. Nach dem Löschen des Browser-Speichers kannst du den Betreiber mit der Feedback-Nummer kontaktieren.</p>',
  );
}

document.addEventListener('click', async (e) => {
  if (e.target.closest('#feedbackOpen')) feedbackForm();
  if (e.target.closest('#feedbackMine')) myFeedback();
  const b = e.target.closest('[data-delete-feedback]');
  if (!b) return;
  const list = readLocalList(FEEDBACK_KEY),
    x = list.find((x) => x.id === Number(b.dataset.deleteFeedback));
  if (!x || !confirm('Feedback endgültig löschen?')) return;
  b.disabled = true;
  try {
    const r = await fetch(API + '/api/feedback/' + x.id, {
      method: 'DELETE',
      credentials: 'omit',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ deleteKey: x.key }),
    });
    if (!r.ok && r.status !== 404) throw Error('Löschen nicht möglich. Bitte versuche es erneut.');
    writeLocalList(
      FEEDBACK_KEY,
      list.filter((y) => y !== x),
    );
    myFeedback();
    toast('Feedback entfernt');
  } catch (err) {
    b.disabled = false;
    toast(err.message);
  }
});

document.addEventListener('submit', async (e) => {
  if (e.target.id !== 'feedbackForm') return;
  e.preventDefault();
  const form = e.target;
  if (!confirmedPrivacy(form, false) || !form.elements.consent.checked) return;
  const button = form.querySelector('[type="submit"]');
  button.disabled = true;
  try {
    const data = Object.fromEntries(new FormData(form)),
      r = await fetch(API + '/api/feedback', {
        method: 'POST',
        credentials: 'omit',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...data, ...privacyReceipt(form) }),
      }),
      x = await r.json();
    if (!r.ok)
      throw Object.assign(Error(x.error || 'Feedback konnte nicht gesendet werden'), { status: r.status });
    const list = readLocalList(FEEDBACK_KEY);
    list.unshift({ id: x.id, key: x.deleteKey, created: x.created });
    writeLocalList(FEEDBACK_KEY, list);
    myFeedback();
    toast('Danke! Dein Feedback ist angekommen.');
  } catch (err) {
    await updateChangedPrivacy(form, err);
    if (form.isConnected) {
      el('feedbackError').textContent = err.message;
      button.disabled = false;
    }
    toast(err.message);
  }
});

start();

export {
  clearCrop,
  API,
  BO7_MODES,
  LOGO,
  MW4_MODES,
  STARTERS,
  STREAMER_KEY,
  STREAMER_LIKES_KEY,
  apiPost,
  build,
  candidates,
  closeModal,
  communityBlocked,
  communityLoaded,
  confirmedPrivacy,
  creatorForm,
  creators,
  crop,
  croppedPhoto,
  el,
  feed,
  head,
  html,
  likeBusy,
  likedIds,
  loadSiteConfig,
  localPosts,
  localStreamers,
  modal,
  paintVoteButton,
  picker,
  privacyConfirmation,
  privacyReceipt,
  publicationRules,
  refresh,
  rememberSubmission,
  renderTips,
  save,
  serverGet,
  setupSlots,
  siteConfig,
  state,
  storeCommunity,
  storedParts,
  streamerLikes,
  toast,
  toggleLike,
  updateChangedPrivacy,
  weapon,
  weeklyStreamerWinnerIds,
  weeklyWinnerIds,
};
