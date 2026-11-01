// Anonymous insights POST. No auth header, no RevenueCat id, no cookies.

export const DEFAULT_INSIGHTS_URL = 'https://kidsit.ai/api/insights';
export const APP_VERSION = '0.1.0';

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
  const response = await fetchImpl(insightsEndpoint(), insightsRequest(payload));
  if (!response.ok) {
    let detail = '';
    try { detail = await response.text(); } catch { detail = ''; }
    throw new Error(`Insights request failed (${response.status}): ${String(detail).slice(0, 180)}`);
  }
  return { ok: true };
}
