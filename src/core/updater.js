/* ─────────────────────────────────────────── */
/*  NAMOZ VAQTLARI — core/updater.js           */
/*  In-app web updates from GitHub releases.   */
/*                                             */
/*  Every push to main builds the web app in   */
/*  CI and publishes a release "web-<sha>" with */
/*  bundle.zip; its body carries a JSON block: */
/*  { version, builtAt, sha256, message }.     */
/*  The APK downloads that zip into its own    */
/*  storage and switches to it (Capgo updater, */
/*  manual mode): no APK reinstall, no install */
/*  permission. Native code changes still need */
/*  a new APK.                                 */
/* ─────────────────────────────────────────── */

export const REPO = 'ibrokhimel/namoz-vaqtlari';
const LATEST_URL = `https://api.github.com/repos/${REPO}/releases/latest`;

/* global __APP_VERSION__, __APP_BUILT_AT__ */
export const CURRENT = {
  version: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev',
  builtAt: typeof __APP_BUILT_AT__ !== 'undefined' ? __APP_BUILT_AT__ : new Date(0).toISOString(),
};

// Release JSON (GitHub API) -> update info, or null if it isn't one of ours
export function parseRelease(rel) {
  if (!rel || typeof rel.body !== 'string' || !/^web-/.test(rel.tag_name || '')) return null;
  const m = /```json\s*([\s\S]*?)```/.exec(rel.body);
  if (!m) return null;
  let meta;
  try { meta = JSON.parse(m[1]); } catch { return null; }
  const asset = (rel.assets || []).find(a => a.name === 'bundle.zip');
  if (!asset || !meta.version || !meta.builtAt || !/^[0-9a-f]{64}$/.test(meta.sha256 || '')) return null;
  return {
    version: String(meta.version), builtAt: String(meta.builtAt), sha256: meta.sha256,
    message: String(meta.message || '').split('\n')[0].slice(0, 120),
    url: asset.browser_download_url,
  };
}

// Newer = a different build that was made later than the running one
export function isNewer(info, current = CURRENT) {
  if (!info) return false;
  return info.version !== current.version && Date.parse(info.builtAt) > Date.parse(current.builtAt);
}

export async function fetchLatest({ timeoutMs = 10000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(LATEST_URL, { signal: ctrl.signal, headers: { Accept: 'application/vnd.github+json' } });
    if (r.status === 404) return null;                 // no release yet
    if (!r.ok) throw new Error(`GitHub ${r.status}`);
    return parseRelease(await r.json());
  } finally {
    clearTimeout(t);
  }
}
