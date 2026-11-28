export const ADMIN_BUILDER_CHANNEL = 'eupdate-admin-baukasten';
export const ADMIN_BUILDER_PARAM = 'adminBaukasten';
export const ADMIN_BUILDER_STORAGE_KEY = 'eupdate_admin_builder_draft_v1';

export const ADMIN_AUTHOR = {
  name: 'Eupdate_DE',
  logo: 'eupdate',
  image: new URL('./bilder/eupdate-profil.webp', import.meta.url).href,
};

function isAdminBuilderFrame() {
  if (window.parent === window || new URLSearchParams(location.search).get(ADMIN_BUILDER_PARAM) !== '1') return false;
  try {
    const adminPage = new URL('../eupdate-admin.html', import.meta.url);
    return window.parent.location.origin === adminPage.origin &&
      window.parent.location.pathname === adminPage.pathname;
  } catch {
    return false;
  }
}

export const inAdminBuilder = isAdminBuilderFrame();

export function notifyAdminBuilder(type, data = {}) {
  if (inAdminBuilder) window.parent.postMessage({ channel: ADMIN_BUILDER_CHANNEL, type, ...data }, location.origin);
}
