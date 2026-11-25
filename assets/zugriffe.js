const PUBLIC_VIEWS = new Set(['feed', 'builder', 'attachments', 'settings', 'events', 'detail']);
const forwardedSource = new URLSearchParams(location.search).get('quelle');
let lastViewUrl = '';

function firstSource() {
  if (forwardedSource) return forwardedSource;
  if (!document.referrer) return 'direct';
  try {
    const url = new URL(document.referrer);
    return url.origin === location.origin ? 'internal' : url.hostname;
  } catch {
    return 'direct';
  }
}

export function countPageView(api, view) {
  if (!api || !PUBLIC_VIEWS.has(view) || document.prerendering || navigator.globalPrivacyControl ||
    ['1', 'yes'].includes(navigator.doNotTrack) || lastViewUrl === location.href) return;
  const source = lastViewUrl ? 'internal' : firstSource();
  lastViewUrl = location.href;
  fetch(api + '/api/visit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    body: JSON.stringify({ view, source }),
    keepalive: true,
  }).catch(() => {});
}
