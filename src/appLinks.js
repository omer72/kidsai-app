// Universal Links / App Links from kidsit.ai.
//
// The site (kidsit-website) publishes:
//   /.well-known/apple-app-site-association  appID ZZT9HHZQNA.ai.kidsit.app
//     paths /he/blog/*, /en/blog/*, /app
//   /.well-known/assetlinks.json             package ai.kidsit.app
// www.kidsit.ai 308-redirects those files. Apple will not follow a redirect
// for the AASA, so www is not an associated domain.
//
// There is no in-app blog. A cold launch from a blog post or /app opens Home
// on the compose screen (start a moment). A link that arrives while the app
// is already open only records attribution: it does not change tabs or clear
// what the parent is typing. Links never skip onboarding.
//
// Attribution uses the existing funnel `source` field (a utm_source token).
// l, p, ct, and the other utm_* values are stored on device. The funnel API
// rejects unknown body fields, so they are not sent. See resolveFunnelSource.

import { parseInstallReferrer } from './installReferrer.js';

export const APP_LINK_HOST = 'kidsit.ai';
export const APP_LINK_STORAGE_KEY = 'kidai.appLink.v1';
// Play install links from the site use this utm_source when no campaign named
// a channel. A recognized app link with no utm_source uses the same token.
export const SITE_FUNNEL_SOURCE = 'kidsit.ai';

// Same shape as funnel.js normalizeFunnelSource (the API's source rule).
const SOURCE_RE = /^[a-z0-9][a-z0-9_.-]{0,39}$/;
const PAGE_RE = /^[a-z0-9][a-z0-9_.-]{0,79}$/;

export function sourceToken(raw) {
  const value = String(raw ?? '').trim().toLowerCase();
  return SOURCE_RE.test(value) ? value : null;
}

function pageToken(raw) {
  const value = String(raw ?? '').trim().toLowerCase();
  return PAGE_RE.test(value) ? value : null;
}

function utmFromSearch(params) {
  const q = new URLSearchParams();
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content']) {
    const value = params.get(key);
    if (value) q.set(key, value);
  }
  const parsed = parseInstallReferrer(q.toString());
  return {
    source: sourceToken(parsed.source),
    medium: parsed.medium,
    campaign: parsed.campaign,
    content: parsed.content,
  };
}

function decodedPath(pathname) {
  try {
    return decodeURIComponent(pathname).replace(/\/+$/, '') || '/';
  } catch {
    // A truncated % sequence throws URIError. Ignore the link.
    return null;
  }
}

// https://kidsit.ai/he/blog/<slug>, /en/blog/<slug>, or /app, plus query.
// Returns null for anything the association files do not claim, or for a
// URL that cannot be decoded. Never throws.
export function parseAppLink(raw) {
  try {
    return parseAppLinkUnsafe(raw);
  } catch {
    return null;
  }
}

function parseAppLinkUnsafe(raw) {
  let url;
  try { url = new URL(String(raw ?? '')); } catch { return null; }
  if (url.protocol !== 'https:') return null;
  if (url.username || url.password) return null;
  if (url.port && url.port !== '443') return null;
  if (url.hostname.toLowerCase() !== APP_LINK_HOST) return null;

  const path = decodedPath(url.pathname);
  if (!path) return null;
  let kind = null;
  let lang = null;
  let page = null;
  const blog = path.match(/^\/(he|en)\/blog(?:\/([^/]+))?$/);
  if (blog) {
    kind = 'blog';
    lang = blog[1];
    page = pageToken(blog[2]);
  } else if (path === '/app') {
    kind = 'app';
  } else {
    return null;
  }

  const queryLang = url.searchParams.get('l');
  if (queryLang === 'he' || queryLang === 'en') lang = queryLang;
  const queryPage = pageToken(url.searchParams.get('p'));
  if (queryPage) page = queryPage;

  return {
    v: 1,
    kind,
    path,
    lang,
    page,
    ct: sourceToken(url.searchParams.get('ct')),
    utm: utmFromSearch(url.searchParams),
  };
}

// Both claimed paths land on Home when a cold launch applies them.
export function routeForAppLink(link) {
  if (!link) return null;
  return { tab: 'home', stage: 'compose' };
}

// null means stay on the current screen and keep every field the parent has typed.
// `live` is an appUrlOpen while the app is already open: attribution only.
// `editingKid` is the Kids add / edit / intake form, whose text lives in that
// screen and is discarded if the tab changes.
// A cold launch still opens Home, and leaves an in-progress moment on screen.
export function navigationForAppLink(flow, { live = false, editingKid = false } = {}) {
  if (live || editingKid) return null;
  const stage = flow?.stage || 'compose';
  const story = typeof flow?.story === 'string' ? flow.story.trim() : '';
  const busy = stage === 'thinking'
    || stage === 'response'
    || stage === 'followup'
    || (stage === 'compose' && story !== '');
  if (busy) return { tab: 'home', flow: null };
  return {
    tab: 'home',
    flow: { stage: 'compose', story: '', ctx: null, response: null, error: null },
  };
}

export function readAppLink(storage = globalThis.localStorage) {
  try {
    const parsed = JSON.parse(storage?.getItem(APP_LINK_STORAGE_KEY) || 'null');
    if (!parsed || parsed.v !== 1) return null;
    if (parsed.kind !== 'blog' && parsed.kind !== 'app') return null;
    return parsed;
  } catch {
    return null;
  }
}

function channel(link) {
  return sourceToken(link?.utm?.source);
}

// A later link replaces the stored one only when it names a real channel and
// the stored link does not (missing, or the generic site token).
export function appLinkIsClearlyBetter(prev, next) {
  const prevChannel = channel(prev);
  const nextChannel = channel(next);
  const prevGeneric = !prevChannel || prevChannel === SITE_FUNNEL_SOURCE;
  return prevGeneric && !!nextChannel && nextChannel !== SITE_FUNNEL_SOURCE;
}

// Stores the first recognized link. Returns the in-app route, or null when
// the URL is not one of ours. A repeat open still returns the route so the
// UI can move to Home; it does not overwrite a more specific first touch.
export function captureAppLink(raw, storage = globalThis.localStorage) {
  const parsed = parseAppLink(raw);
  if (!parsed) return null;
  const route = routeForAppLink(parsed);
  if (!storage) return route;
  try {
    const prev = readAppLink(storage);
    if (!prev || appLinkIsClearlyBetter(prev, parsed)) {
      storage.setItem(APP_LINK_STORAGE_KEY, JSON.stringify(parsed));
    }
  } catch { /* storage full or blocked; routing still works */ }
  return route;
}

// What flushFunnel sends as `source`. One token, same rule as a utm_source.
//
// 1. An explicit setFunnelContext({ source }) wins. Nothing sets that today.
// 2. A Play install-referrer source wins (first touch at install).
// 3. Exception: the referrer source is the generic site token `kidsit.ai`
//    and the link is more informative. A different utm_source replaces it.
//    So does ct, when the link's own utm_source is `kidsit.ai` (the site
//    default is less informative than the campaign token). ct alone does
//    not replace an install-referrer source.
// 4. With no install source: the link's utm_source, unless that value is
//    `kidsit.ai` and the link also has ct, in which case ct wins. Else ct,
//    else `kidsit.ai` for any recognized kidsit.ai link.
//
// l, p, utm_medium, utm_campaign, and utm_content never become `source`.
// A non-generic install source is not replaced by a later link.
export function resolveFunnelSource({ explicit, install, link } = {}) {
  const explicitSrc = sourceToken(explicit);
  if (explicitSrc) return explicitSrc;

  const installSrc = sourceToken(install);
  const linkUtm = channel(link);
  const linkCt = sourceToken(link?.ct);
  // kidsit.ai as utm_source only says the tap came from our site. ct names
  // the placement, so it is the better source when both are on the link.
  const siteUtmWithCt = linkUtm === SITE_FUNNEL_SOURCE && !!linkCt;
  const linkSrc = siteUtmWithCt ? linkCt : (linkUtm || linkCt);
  const betterThanSite = (!!linkUtm && linkUtm !== SITE_FUNNEL_SOURCE) || siteUtmWithCt;

  if (installSrc === SITE_FUNNEL_SOURCE && betterThanSite) return linkSrc;
  if (installSrc) return installSrc;
  if (linkSrc) return linkSrc;
  if (link) return SITE_FUNNEL_SOURCE;
  return null;
}
