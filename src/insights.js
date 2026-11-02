// Anonymous insights POST. No auth header, no RevenueCat id, no cookies.
// Web never sends, even if a stored flag still says sharing is on.

import { isNativeApp } from './platform.js';

export const DEFAULT_INSIGHTS_URL = 'https://kidsit.ai/api/insights';

// Replaced at build time with MARKETING_VERSION / versionName. Empty in a
// plain Node import, where tests pass the version in directly.
export function fallbackAppVersion() {
  return typeof __KIDSIT_APP_VERSION__ === 'string' ? __KIDSIT_APP_VERSION__.trim() : '';
}

// Native: the installed version (CFBundleShortVersionString / versionName).
// Browser, or a plugin that isn't ready: the version baked in by Vite.
export async function resolveAppVersion({
  native = isNativeApp(),
  getInfo,
  buildVersion = fallbackAppVersion(),
} = {}) {
  if (native) {
    try {
      const info = getInfo
        ? await getInfo()
        : await import('@capacitor/app').then(({ App }) => App.getInfo());
      const version = String(info?.version ?? '').trim();
      if (version) return version;
    } catch {
      // The preview and the send still carry the build-time version.
    }
  }
  return String(buildVersion || '').trim();
}

export function resolveInsightsUrl(envValue) {
  const raw = String(envValue ?? '').trim();
  return (raw || DEFAULT_INSIGHTS_URL).replace(/\/+$/, '');
}

export function insightsEndpoint() {
  return resolveInsightsUrl(import.meta.env?.VITE_INSIGHTS_URL);
}

export function insightsRequest(payload) {
  return {
    method: 'POST',
    credentials: 'omit',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  };
}

export async function postInsights(payload, fetchImpl = globalThis.fetch) {
  if (!isNativeApp()) return { ok: false, skipped: 'web' };
  const response = await fetchImpl(insightsEndpoint(), insightsRequest(payload));
  if (!response.ok) {
    let detail = '';
    try { detail = await response.text(); } catch { detail = ''; }
    throw new Error(`Insights request failed (${response.status}): ${String(detail).slice(0, 180)}`);
  }
  return { ok: true };
}
