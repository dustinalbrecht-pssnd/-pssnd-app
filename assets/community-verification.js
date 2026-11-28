const PROOF_KEY = 'eupdate_community_visitor_session';
const LOAD_CALLBACK = 'eupdateTurnstileLoaded';
const VERIFY_PROMPT = 'Bestätige den Zugriff, um Beiträge oder Likes zu senden.';
let widgetScript;
let pending;
let proof;

function turnstile() {
  if (!widgetScript) {
    if (window.turnstile?.render) return Promise.resolve(window.turnstile);
    widgetScript = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const timeout = setTimeout(() => finish(Error('Die Besucherprüfung konnte nicht geladen werden.')), 12000);
      function finish(error) {
        clearTimeout(timeout);
        delete window[LOAD_CALLBACK];
        if (error) {
          script.remove();
          reject(error);
        } else resolve(window.turnstile);
      }
      window[LOAD_CALLBACK] = () => {
        finish(window.turnstile?.render ? null : Error('Die Besucherprüfung konnte nicht gestartet werden.'));
      };
      script.async = true;
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=' + LOAD_CALLBACK;
      script.onerror = () => finish(Error('Die Besucherprüfung konnte nicht geladen werden.'));
      document.head.append(script);
    }).catch((error) => {
      widgetScript = null;
      throw error;
    });
  }
  return widgetScript;
}

async function verify(siteKey, exchangeToken) {
  const widget = await turnstile();
  return new Promise((resolve, reject) => {
    const dialog = document.createElement('dialog');
    dialog.className = 'dialog';
    dialog.setAttribute('aria-label', 'Besucherprüfung');
    dialog.style.cssText = 'max-width:min(420px,92vw);max-height:90dvh;overflow:auto;color:var(--text);background:var(--surface);border:1px solid var(--line);margin:auto';
    dialog.innerHTML = '<h2>Besucherprüfung</h2><p role="status"></p><div class="visitor-widget"></div>' +
      '<div class="dialog-actions"><button type="button" class="primary-btn" data-retry hidden>Erneut versuchen</button>' +
      '<button type="button" class="ghost-btn" data-cancel>Abbrechen</button></div>';
    const container = dialog.querySelector('.visitor-widget');
    const status = dialog.querySelector('[role="status"]');
    const retry = dialog.querySelector('[data-retry]');
    status.textContent = VERIFY_PROMPT;
    let id;
    let done = false;
    let exchanging = false;
    const timeout = setTimeout(() => finish(Error('Besucherprüfung abgelaufen. Starte sie erneut.')), 90000);
    function finish(error, result) {
      if (done) return;
      done = true;
      clearTimeout(timeout);
      if (id !== undefined) widget.remove(id);
      dialog.close();
      dialog.remove();
      if (error) reject(error);
      else resolve(result);
    }
    function failed(message, retryable = true) {
      status.textContent = message;
      retry.hidden = !retryable;
    }
    async function submitToken(token) {
      if (done || exchanging) return;
      exchanging = true;
      retry.hidden = true;
      status.textContent = 'Cloudflare bestätigt die Prüfung …';
      try {
        finish(null, await exchangeToken(token));
      } catch (error) {
        if (!done) failed(error.message, !['turnstile_config', 'turnstile_widget'].includes(error.code));
      } finally {
        exchanging = false;
      }
    }
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      finish(Error('Besucherprüfung abgebrochen.'));
    });
    dialog.querySelector('[data-cancel]').addEventListener('click', () => finish(Error('Besucherprüfung abgebrochen.')));
    retry.addEventListener('click', () => {
      if (exchanging || id === undefined) return;
      retry.hidden = true;
      status.textContent = VERIFY_PROMPT;
      widget.reset(id);
    });
    document.body.append(dialog);
    try {
      dialog.showModal();
      id = widget.render(container, {
        sitekey: siteKey,
        action: 'eupdate_community',
        theme: 'auto',
        size: 'flexible',
        retry: 'never',
        'response-field': false,
        callback: submitToken,
        'expired-callback': () => failed('Die Besucherprüfung ist abgelaufen.'),
        'error-callback': (code) => {
          const suffix = /^\d{6}$/.test(code) ? ' (Cloudflare-Code ' + code + ')' : '';
          failed('Cloudflare konnte die Besucherprüfung nicht abschließen' + suffix + '.');
          return true;
        },
        'timeout-callback': () => failed('Die Besucherprüfung ist abgelaufen.'),
      });
    } catch {
      finish(Error('Die Besucherprüfung konnte nicht gestartet werden.'));
    }
  });
}

export function needsVisitorVerification(path, payload) {
  return path === '/api/sets' || path === '/api/creators' ||
    /^\/api\/(sets|creators)\/\d+\/comments$/.test(path) ||
    (payload?.liked !== false && /^\/api\/(?:support|(?:sets|creators)\/\d+)\/like$/.test(path));
}

export function clearVisitorVerification() {
  proof = null;
  try { sessionStorage.removeItem(PROOF_KEY); } catch {}
}

async function requestSession(api, visitor, token) {
  const check = await fetch(api + '/api/visitor/session', {
    method: 'POST', credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(15000),
    headers: { 'content-type': 'application/json', 'x-eupdate-visitor': visitor },
    body: JSON.stringify({ token }),
  }).catch(() => {
    throw Error('Der Prüfserver war nicht erreichbar. Versuche es erneut.');
  });
  const answer = await check.json().catch(() => ({}));
  if (!check.ok || typeof answer.session !== 'string' || !Number.isFinite(answer.expiresAt)) {
    throw Object.assign(Error(answer.error || 'Besucherprüfung fehlgeschlagen.'), { code: answer.code });
  }
  return answer;
}

export async function visitorVerification(api, visitor, siteKey) {
  if (!siteKey) throw Error('Die Besucherprüfung wird eingerichtet.');
  if (!proof) {
    try { proof = JSON.parse(sessionStorage.getItem(PROOF_KEY) || 'null'); } catch {}
  }
  if (proof?.visitor === visitor && proof.expiresAt > Date.now() + 10000) return proof.session;
  if (!pending) {
    pending = (async () => {
      const answer = await verify(siteKey, token => requestSession(api, visitor, token));
      proof = { visitor, session: answer.session, expiresAt: answer.expiresAt };
      try { sessionStorage.setItem(PROOF_KEY, JSON.stringify(proof)); } catch {}
      return proof.session;
    })().finally(() => { pending = null; });
  }
  return pending;
}
