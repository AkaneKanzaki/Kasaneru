// Build identity: version + git hash + build time, injected by vite.config.ts.
// Shown in Profile → About so the running version can always be verified
// (telling old builds apart from new ones).

declare const __APP_VERSION__: string;
declare const __GIT_HASH__: string;
declare const __BUILD_TIME__: string;

export const APP_VERSION: string =
  typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';
export const GIT_HASH: string =
  typeof __GIT_HASH__ !== 'undefined' ? __GIT_HASH__ : 'dev';
export const BUILD_TIME: string =
  typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : '';

export function buildLabel(lang: 'en' | 'id'): string {
  let date = '';
  try {
    if (BUILD_TIME) {
      date = new Date(BUILD_TIME).toLocaleString(lang === 'id' ? 'id-ID' : 'en-US', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  } catch {
    /* ignore */
  }
  // No git info (e.g. built from a plain zip extract) -> omit the hash
  // instead of showing a confusing "(dev)".
  const hash = GIT_HASH && GIT_HASH !== 'dev' ? ` (${GIT_HASH})` : '';
  return `v${APP_VERSION}${hash}${date ? ` · ${date}` : ''}`;
}
