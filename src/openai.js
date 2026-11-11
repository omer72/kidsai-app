import i18n from './i18n';
import { getAppUserId } from './billing';
import { buildGuidanceRequest } from './guidanceRequest';

const API_BASE = (import.meta.env.VITE_API_BASE || '').trim().replace(/\/$/, '');

async function authHeaders() {
  const uid = await getAppUserId();
  return uid ? { 'X-RC-User': uid } : {};
}

// A 403 from the backend means "subscription required": the free answers are
// used up, or the caller has no entitlement. It is not a failure to show as an
// error; the app opens the paywall instead.
export class AccessError extends Error {
  constructor(code) {
    super('subscription required');
    this.name = 'AccessError';
    this.code = code || 'not_entitled';
  }
}

async function accessErrorFrom(r) {
  let code = '';
  try { code = (await r.json())?.code || ''; } catch { code = ''; }
  return new AccessError(code);
}

// Free answers left, from the X-Free-Remaining header. Null when the server
// did not say (subscriber, or the gate is not enforced).
export function parseFreeRemaining(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function hasApiKey() {
  return !!API_BASE;
}

export async function getGuidance({ story, ctx, kid, history }) {
  if (!API_BASE) throw new Error('VITE_API_BASE not configured');
  const language = (i18n.language || 'en').split('-')[0];
  const r = await fetch(`${API_BASE}/api/guidance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify(buildGuidanceRequest({ story, ctx, kid, history, language })),
  });
  if (r.status === 403) throw await accessErrorFrom(r);
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`Guidance request failed (${r.status}): ${t.slice(0, 200)}`);
  }
  return { guidance: await r.json(), freeRemaining: parseFreeRemaining(r.headers.get('X-Free-Remaining')) };
}

export async function transcribeAudio(blob) {
  if (!API_BASE) throw new Error('VITE_API_BASE not configured');
  const ext = (blob.type.split('/')[1] || 'webm').split(';')[0];
  const file = new File([blob], `recording.${ext}`, { type: blob.type });
  const form = new FormData();
  form.append('file', file);
  form.append('language', (i18n.language || 'en').split('-')[0]);
  const r = await fetch(`${API_BASE}/api/transcribe`, {
    method: 'POST', headers: await authHeaders(), body: form,
  });
  if (r.status === 403) throw await accessErrorFrom(r);
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`Transcription failed (${r.status}): ${t.slice(0, 200)}`);
  }
  const { text } = await r.json();
  return text || '';
}
