// Google Play install referrer → RevenueCat attribution.
//
// kidsit.ai puts utm_source / utm_medium / utm_campaign / utm_content into
// the Play link's `referrer` parameter. Play hands that string to the app
// after install; without this module nobody reads it and every customer shows
// as "No Attribution". Android only: the App Store has no equivalent, and iOS
// campaign data stays in App Store Connect (plus Apple Search Ads tokens).
//
// Only the utm_* values are kept. Click ids (gclid and friends) are dropped.

import { registerPlugin } from '@capacitor/core';
import { storePlatform } from './platform.js';

const KEY = 'kidai.installReferrer.v1';
const VALUE_RE = /^[A-Za-z0-9][A-Za-z0-9_.\-]{0,59}$/;

// Registered on first use so importing this module has no side effects.
let nativePlugin = null;
function installReferrerPlugin() {
  nativePlugin = nativePlugin || registerPlugin('InstallReferrer');
  return nativePlugin;
}

function clean(value) {
  const v = String(value ?? '').trim();
  return VALUE_RE.test(v) ? v : null;
}

// "utm_source=kidsit.ai&utm_medium=home&utm_campaign=he-home&utm_content=hero"
// → { source, medium, campaign, content }. Unknown keys are ignored.
export function parseInstallReferrer(raw) {
  const out = { source: null, medium: null, campaign: null, content: null };
  let params;
  try { params = new URLSearchParams(String(raw ?? '')); } catch { return out; }
  out.source = clean(params.get('utm_source'));
  out.medium = clean(params.get('utm_medium'));
  out.campaign = clean(params.get('utm_campaign'));
  out.content = clean(params.get('utm_content'));
  return out;
}

// RevenueCat's reserved attribution attributes. Empty when there is no source.
export function referrerAttributes(parsed) {
  if (!parsed?.source) return {};
  const attrs = { $mediaSource: parsed.source };
  if (parsed.campaign) attrs.$campaign = parsed.campaign;
  if (parsed.medium) attrs.$adGroup = parsed.medium;
  if (parsed.content) attrs.$creative = parsed.content;
  return attrs;
}

export function storedInstallSource(storage = globalThis.localStorage) {
  try { return JSON.parse(storage?.getItem(KEY) || 'null')?.source || null; } catch { return null; }
}

function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);
}

// Reads the referrer once per install and returns the parsed values (also on
// later launches, from storage). Null off Android or when Play gives nothing.
export async function readInstallReferrer({
  platform = storePlatform(),
  storage = globalThis.localStorage,
  plugin,
} = {}) {
  if (platform !== 'android' || !storage) return null;
  try {
    const stored = JSON.parse(storage.getItem(KEY) || 'null');
    if (stored) return stored;
  } catch { /* fall through and read again */ }
  try {
    const { referrer } = await withTimeout((plugin || installReferrerPlugin()).getReferrer(), 5000);
    const parsed = parseInstallReferrer(referrer);
    storage.setItem(KEY, JSON.stringify(parsed));
    return parsed;
  } catch {
    // Play services missing, sideloaded build, or a timeout: try again next launch.
    return null;
  }
}
