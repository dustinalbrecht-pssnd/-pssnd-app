const PROOF_KEY = 'eupdate_community_visitor_session';
let widgetScript;
let pending;
let proof;

function turnstile() {
  if (window.turnstile?.render) return Promise.resolve(window.turnstile);
  if (!widgetScript) {
    widgetScript = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const timeout = setTimeout(() => finish(Error('Die Besucherprüfung konnte nicht geladen werden.')), 12000);
      function finish(error) {
        clearTimeout(timeout);
        if (error) {
          script.remove();
          reject(error);
        } else resolve(window.turnstile);
      }
      script.async = true;
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.onerror = () => finish(Error('Die Besucherprüfung konnte nicht geladen werden.'));
      script.onload = () => {
        if (window.turnstile?.ready) window.turnstile.ready(() => finish());
        else finish(Error('Die Besucherprüfung konnte nicht gestartet werden.'));
      };
      document.head.append(script);
    }).catch((error) => {
      widgetScript = null;
      throw error;
    });
  }
  return widgetScript;
}

async function verify(siteKey) {
  const widget = await turnstile();
  return new Promise((resolve, reject) => {
    const dialog = document.createElement('dialog');
    dialog.className = 'dialog';
    dialog.setAttribute('aria-label', 'Besucherprüfung');
    dialog.style.cssText = 'max-width:min(420px,92vw);max-height:90dvh;overflow:auto;color:var(--text);background:var(--surface);border:1px solid var(--line);margin:auto';
    dialog.innerHTML = '<h2>Besucherprüfung</h2><p>Bestätige den Zugriff, um Beiträge oder Likes zu senden.</p>' +
      '<div class="visitor-widget"></div><button type="button" class="ghost-btn">Abbrechen</button>';
    const container = dialog.querySelector('.visitor-widget');
    const failure = () => finish(Error('Besucherprüfung abgelaufen. Versuche es erneut.'));
    let id;
    let done = false;
    const timeout = setTimeout(failure, 90000);
    function finish(error, token) {
      if (done) return;
      done = true;
      clearTimeout(timeout);
      if (id !== undefined) widget.remove(id);
      dialog.close();
      dialog.remove();
      if (error) reject(error);
      else resolve(token);
    }
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      finish(Error('Besucherprüfung abgebrochen.'));
    });
    dialog.querySelector('button').addEventListener('click', () => finish(Error('Besucherprüfung abgebrochen.')));
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
        callback: (token) => finish(null, token),
        'expired-callback': failure,
        'error-callback': failure,
        'timeout-callback': failure,
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

export async function visitorVerification(api, visitor, siteKey) {
  if (!siteKey) throw Error('Die Besucherprüfung wird eingerichtet.');
  if (!proof) {
    try { proof = JSON.parse(sessionStorage.getItem(PROOF_KEY) || 'null'); } catch {}
  }
  if (proof?.visitor === visitor && proof.expiresAt > Date.now() + 10000) return proof.session;
  if (!pending) {
    pending = (async () => {
      const token = await verify(siteKey);
      const check = await fetch(api + '/api/visitor/session', {
        method: 'POST', credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(15000),
        headers: { 'content-type': 'application/json', 'x-eupdate-visitor': visitor },
        body: JSON.stringify({ token }),
      });
      const answer = await check.json().catch(() => ({}));
      if (!check.ok || !answer.session) throw Error(answer.error || 'Besucherprüfung fehlgeschlagen.');
      proof = { visitor, session: answer.session, expiresAt: answer.expiresAt };
      try { sessionStorage.setItem(PROOF_KEY, JSON.stringify(proof)); } catch {}
      return proof.session;
    })().finally(() => { pending = null; });
  }
  return pending;
}
