// Thin localStorage wrappers. Values are JSON-encoded. Reads return `fallback`
// when the key is missing or the stored value is malformed.

import { DEFAULT_KIDS } from './constants';

const KEYS = {
  settings: 'kidai.settings.v1',
  kids: 'kidai.kids.v1',
  history: 'kidai.history.v1',
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

const DEFAULT_BILLING = {
  entitled: false, productId: null, expiresAt: null, inTrial: false, willRenew: false, syncedAt: 0,
};

export const TRIAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export function loadSettings() {
  const s = read(KEYS.settings, { theme: 'warm', flow: 'A' });
  if (!s.billing) s.billing = DEFAULT_BILLING;
  if (!s.trial) s.trial = { startedAt: null };
  return s;
}

export function trialStatus(settings) {
  const startedAt = settings?.trial?.startedAt || 0;
  if (!startedAt) return { started: false, active: false, expired: false, msLeft: 0 };
  const elapsed = Date.now() - startedAt;
  return {
    started: true,
    active: elapsed < TRIAL_DURATION_MS,
    expired: elapsed >= TRIAL_DURATION_MS,
    msLeft: Math.max(0, TRIAL_DURATION_MS - elapsed),
  };
}

export function saveSettings(s) {
  write(KEYS.settings, s);
}

export function loadKids() {
  return read(KEYS.kids, DEFAULT_KIDS);
}

export function saveKids(kids) {
  write(KEYS.kids, kids);
}

export function loadHistory() {
  return read(KEYS.history, []);
}

export function appendHistory(entry) {
  const items = loadHistory();
  const next = [{ id: Date.now(), feedback: null, note: null, ...entry }, ...items];
  write(KEYS.history, next);
  return next;
}

export function updateHistoryEntry(id, patch) {
  const items = loadHistory();
  const next = items.map((h) => (h.id === id ? { ...h, ...patch } : h));
  write(KEYS.history, next);
  return next;
}

export function clearAll() {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
}
