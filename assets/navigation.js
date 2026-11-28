import { ADMIN_BUILDER_PARAM, inAdminBuilder } from './admin-baukasten-kontext.js';

const routes = {
  feed: 'ranking',
  builder: 'Bauen',
  attachments: 'Aufsaetze',
  settings: 'Einstellungen',
  events: 'News',
  detail: 'Loadout',
};
const menuViews = { attachments: 'builder', detail: 'feed' };
const siteRoot = new URL('../', import.meta.url);
const pendingViews = new Map();
let activeView;
let activeURL;
let navigationNumber = 0;
let onActivate;

function urlFor(view, params = {}) {
  const url = new URL(routes[view], siteRoot);
  url.search = new URLSearchParams(params);
  if (inAdminBuilder) url.searchParams.set(ADMIN_BUILDER_PARAM, '1');
  return url;
}

function pageURL(url) {
  const fullPage = new URL(url);
  fullPage.pathname += '/';
  return fullPage;
}

function viewElement(view) {
  return document.getElementById('view-' + view);
}

function loadView(view) {
  if (!pendingViews.has(view)) {
    const request = (async () => {
      const response = await fetch(pageURL(urlFor(view)));
      if (!response.ok) throw new Error('Die Seite ist gerade nicht erreichbar.');
      const page = new DOMParser().parseFromString(await response.text(), 'text/html');
      const section = page.getElementById('view-' + view);
      if (!section) throw new Error('Der Seiteninhalt konnte nicht geladen werden.');
      document.getElementById('advertisingContact').before(document.importNode(section, true));
    })();
    pendingViews.set(view, request);
    request.then(
      () => pendingViews.delete(view),
      () => pendingViews.delete(view),
    );
  }
  return pendingViews.get(view);
}

function updateMenu(view) {
  const selectedView = menuViews[view] ?? view;
  for (const link of document.querySelectorAll('.bottom-nav [data-view]')) {
    const selected = link.dataset.view === selectedView;
    link.classList.toggle('active', selected);
    if (selected) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
}

export function currentView() {
  return activeView;
}

export function currentParam(name) {
  return activeURL?.searchParams.get(name);
}

export function replaceViewParam(name, value) {
  if (!activeURL) return;
  if (value) activeURL.searchParams.set(name, value);
  else activeURL.searchParams.delete(name);
  history.replaceState(null, '', activeURL);
}

export async function navigate(view, { params, replace = false, fromHistory = false } = {}) {
  if (!Object.hasOwn(routes, view)) return false;
  if (inAdminBuilder && view !== 'builder' && view !== 'attachments') return false;

  const request = ++navigationNumber;
  const url = urlFor(view, params);
  if (!viewElement(view)) {
    try {
      await loadView(view);
    } catch {
      if (request === navigationNumber) location.assign(pageURL(url));
      return false;
    }
  }

  if (request !== navigationNumber) return false;
  for (const section of document.querySelectorAll('main > .view')) {
    section.classList.toggle('active', section.id === 'view-' + view);
  }
  updateMenu(view);
  activeView = view;
  activeURL = url;

  if (!fromHistory && location.href !== url.href) {
    if (replace) history.replaceState(null, '', url);
    else history.pushState(null, '', url);
  }
  onActivate(view);
  if (!fromHistory && !replace) window.scrollTo({ top: 0, behavior: 'smooth' });
  return true;
}

export function startNavigation(activate) {
  onActivate = activate;

  document.addEventListener('click', (event) => {
    const control = event.target.closest('[data-view]');
    if (!control || !Object.hasOwn(routes, control.dataset.view)) return;
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    navigate(control.dataset.view, { params: control.dataset.streamerView === '1' ? { streamer: '1' } : undefined });
  });

  window.addEventListener('popstate', () => {
    const path = location.pathname.replace(/\/index\.html$|\/$/, '');
    const view = Object.keys(routes).find((name) => urlFor(name).pathname === path);
    if (view) navigate(view, { params: new URLSearchParams(location.search), fromHistory: true });
  });

  const page = document.querySelector('main > .view.active').id.slice(5);
  const oldHash = location.hash.slice(1);
  const legacyView =
    oldHash === 'detail' && !new URLSearchParams(location.search).has('id') ? 'feed' : oldHash;
  const params = new URLSearchParams(location.search);
  params.delete('quelle');
  if (['creators', 'creator', 'streamer'].includes(legacyView) || page === 'creators') {
    params.set('streamer', '1');
    navigate('feed', { params, replace: true });
    return;
  }
  const view = Object.hasOwn(routes, legacyView) ? legacyView : page;
  navigate(view, { params, replace: true });
}
