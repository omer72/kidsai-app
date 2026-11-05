import { normalizeReviewState } from './reviewPrompt.js';
// Thin localStorage wrappers. Values are JSON-encoded. Reads return `fallback`
// when the key is missing or the stored value is malformed.

import { DEFAULT_KIDS } from './constants';

const KEYS = {
  settings: 'kidai.settings.v1',
  kids: 'kidai.kids.v1',
  history: 'kidai.history.v1',
  digest: 'kidai.digest.v1',
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

export function loadSettings() {
  const s = read(KEYS.settings, { theme: 'warm', flow: 'A' });
  if (!s.billing) s.billing = DEFAULT_BILLING;
  if (typeof s.aiConsent !== 'boolean') s.aiConsent = false;
  if (!s.fontSize) s.fontSize = 'small';
  // Review-prompt state (see src/reviewPrompt.js); migrates askedForReview.
  Object.assign(s, normalizeReviewState(s));
  if (!s.digest || typeof s.digest !== 'object') {
    s.digest = { enabled: false, cadence: 'week', weekday: 5, hour: 9 };
  } else {
    if (typeof s.digest.enabled !== 'boolean') s.digest.enabled = false;
    if (s.digest.cadence !== 'day' && s.digest.cadence !== 'week') s.digest.cadence = 'week';
    if (typeof s.digest.weekday !== 'number') s.digest.weekday = 5;
    if (typeof s.digest.hour !== 'number') s.digest.hour = 9;
  }
  if (typeof s.shareInsights !== 'boolean') s.shareInsights = false;
  return s;
}

export function saveSettings(s) {
  write(KEYS.settings, s);
}

export function loadKids() {
  return read(KEYS.kids, DEFAULT_KIDS);
}

// Age in whole years. Derived from `birthdate` when present so it never goes
// stale; kids saved before birthdate existed fall back to their stored `age`.
export function kidAgeYears(kid) {
  if (kid?.birthdate) {
    const t = new Date(kid.birthdate).getTime();
    if (!Number.isNaN(t) && t <= Date.now()) {
      return Math.floor((Date.now() - t) / (365.25 * 24 * 3600 * 1000));
    }
  }
  return Number(kid?.age) || 0;
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

const EMPTY_DIGEST_META = {
  lastShownPeriod: {},
  sentPeriods: [],
  digestsOpened: 0,
  sharePrompted: false,
};

export function loadDigestMeta() {
  const meta = read(KEYS.digest, EMPTY_DIGEST_META);
  return {
    lastShownPeriod: meta?.lastShownPeriod && typeof meta.lastShownPeriod === 'object' ? meta.lastShownPeriod : {},
    sentPeriods: Array.isArray(meta?.sentPeriods) ? meta.sentPeriods : [],
    digestsOpened: typeof meta?.digestsOpened === 'number' && meta.digestsOpened > 0 ? meta.digestsOpened : 0,
    sharePrompted: !!meta?.sharePrompted,
  };
}

export function saveDigestMeta(meta) {
  write(KEYS.digest, meta);
}

export function clearAll() {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
}
