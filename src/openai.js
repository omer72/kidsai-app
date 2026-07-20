import i18n from './i18n';
import { getAppUserId } from './billing';

const API_BASE = (import.meta.env.VITE_API_BASE || '').trim().replace(/\/$/, '');

async function authHeaders() {
  const uid = await getAppUserId();
  return uid ? { 'X-RC-User': uid } : {};
}

export function hasApiKey() {
  return !!API_BASE;
}

export async function getGuidance({ story, ctx, kid, siblings, history }) {
  if (!API_BASE) throw new Error('VITE_API_BASE not configured');
  const language = (i18n.language || 'en').split('-')[0];
  const r = await fetch(`${API_BASE}/api/guidance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ story, ctx, kid, siblings, history, language }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`Guidance request failed (${r.status}): ${t.slice(0, 200)}`);
  }
  return r.json();
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
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`Transcription failed (${r.status}): ${t.slice(0, 200)}`);
  }
  const { text } = await r.json();
  return text || '';
}
