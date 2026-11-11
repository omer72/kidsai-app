// Anonymous funnel counts. Each step is reported once per install, so the
// stats page can show how many installs reach each step and where they stop.
//
// The body is { v, step, platform, lang, app_version, source }. No RevenueCat
// id, no device or install id, no child data, no story text, no cookies. The
// server adds the UTC day and keeps one counter per combination.
// Web never sends.

import { isNativeApp, storePlatform } from './platform.js';
import { resolveAppVersion } from './insights.js';
import { storedInstallSource } from './installReferrer.js';

export const FUNNEL_SCHEMA_V = 1;
export const DEFAULT_FUNNEL_URL = 'https://kidsit.ai/api/funnel';
export const FUNNEL_STEPS = Object.freeze([
  'onboarding_done',
  'child_added',
  'moment_sent',
  'answer_received',
  'moment_rated',
  'paywall_shown',
  'paywall_dismissed',
  'purchase',
]);

const KEY = 'kidai.funnel.v1';
const SOURCE_RE = /^[a-z0-9][a-z0-9_.-]{0,39}$/;

function readState(storage) {
  try {
    const parsed = JSON.parse(storage.getItem(KEY) || '{}');
    return parsed && typeof parsed === 'object' && parsed.steps && typeof parsed.steps === 'object'
      ? parsed
      : { steps: {} };
  } catch {
    return { steps: {} };
  }
}

function writeState(storage, state) {
  try { storage.setItem(KEY, JSON.stringify(state)); } catch { /* storage full or blocked */ }
}

// Call once at launch, before any markFunnel. An install that finished
// onboarding on an earlier version is marked legacy and never reports.
export function initFunnel({ existingInstall = false, storage = globalThis.localStorage } = {}) {
  if (!storage) return;
  try {
    if (storage.getItem(KEY) !== null) return;
  } catch {
    return;
  }
  writeState(storage, existingInstall ? { steps: {}, legacy: true } : { steps: {} });
}

// Pure: marks `step` as pending unless it was already recorded.
export function planFunnelStep(state, step) {
  if (state.legacy) return { state, changed: false };
  if (!FUNNEL_STEPS.includes(step)) return { state, changed: false };
  if (state.steps?.[step]) return { state, changed: false };
  return { state: { ...state, steps: { ...state.steps, [step]: 'pending' } }, changed: true };
}

export function pendingFunnelSteps(state) {
  return FUNNEL_STEPS.filter((step) => state.steps?.[step] === 'pending');
}

// Only a short lowercase token (a utm_source) is ever sent as the source.
export function normalizeFunnelSource(raw) {
  const value = String(raw ?? '').trim().toLowerCase();
  return SOURCE_RE.test(value) ? value : null;
}

export function funnelBody({ step, platform, lang, appVersion, source }) {
  const body = { v: FUNNEL_SCHEMA_V, step };
  if (platform === 'ios' || platform === 'android') body.platform = platform;
  const short = String(lang || '').split('-')[0];
  if (short === 'he' || short === 'en' || short === 'es') body.lang = short;
  // Major.minor only, like anonymous insights.
  const version = String(appVersion || '').trim().split('.').slice(0, 2).join('.');
  if (/^\d{1,3}\.\d{1,3}$/.test(version)) body.app_version = version;
  const src = normalizeFunnelSource(source);
  if (src) body.source = src;
  return body;
}

// VITE_FUNNEL_URL=off builds an app that never reports funnel steps.
export function resolveFunnelUrl(envValue) {
  const raw = String(envValue ?? '').trim();
  if (raw.toLowerCase() === 'off') return '';
  return (raw || DEFAULT_FUNNEL_URL).replace(/\/+$/, '');
}

let context = { lang: 'en', source: null };

// Language and install source can change or arrive late; the latest value is
// used for whatever is sent next.
export function setFunnelContext(next) {
  context = { ...context, ...next };
}

let flushing = null;

// Sends every pending step. Failures stay pending and go out on a later call.
export async function flushFunnel({
  storage = globalThis.localStorage,
  fetchImpl = globalThis.fetch,
  native = isNativeApp(),
  platform = storePlatform(),
  url = resolveFunnelUrl(import.meta.env?.VITE_FUNNEL_URL),
  appVersion,
} = {}) {
  if (!native || !storage || !fetchImpl || !url) return { sent: [] };
  if (flushing) return flushing;
  flushing = (async () => {
    const sent = [];
    const version = appVersion ?? await resolveAppVersion({ native });
    for (const step of pendingFunnelSteps(readState(storage))) {
      try {
        const response = await fetchImpl(url, {
          method: 'POST',
          credentials: 'omit',
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(funnelBody({ step, platform, lang: context.lang, appVersion: version, source: context.source || storedInstallSource(storage) })),
        });
        // 4xx will not succeed on retry (an older server, a bad body): drop it.
        if (!response.ok && response.status >= 500) continue;
        const state = readState(storage);
        writeState(storage, { ...state, steps: { ...state.steps, [step]: 'sent' } });
        if (response.ok) sent.push(step);
      } catch {
        // Offline: stays pending.
      }
    }
    return { sent };
  })();
  try { return await flushing; } finally { flushing = null; }
}

// Records a step once per install and tries to send it. Never throws and is
// safe to call without awaiting.
export function markFunnel(step, options = {}) {
  const storage = options.storage ?? globalThis.localStorage;
  if (!storage) return Promise.resolve({ sent: [] });
  const planned = planFunnelStep(readState(storage), step);
  if (planned.changed) writeState(storage, planned.state);
  return flushFunnel({ ...options, storage }).catch(() => ({ sent: [] }));
}
