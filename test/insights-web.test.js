import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { isNativeApp } from '../src/platform.js';
import { insightsRequest, postInsights } from '../src/insights.js';
import { syncDigestNotification } from '../src/notifications.js';

const SHARE = 'Share anonymous insights';
const SEND = 'Send to Kidsit to improve';
const JSON_LABEL = 'Show the JSON';
const DIGEST = 'Weekly digest';
const FRIDAY = 'Friday';

function installCapacitor(cap) {
  if (!globalThis.window) globalThis.window = {};
  globalThis.window.Capacitor = cap;
}

const vite = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  logLevel: 'silent',
  optimizeDeps: { noDiscovery: true, include: [] },
});

test.after(async () => {
  await vite.close();
});

async function screens() {
  const i18n = await vite.ssrLoadModule('/src/i18n/index.js');
  i18n.setLanguage('en');
  const settingsMod = await vite.ssrLoadModule('/src/components/Settings.jsx');
  const digestMod = await vite.ssrLoadModule('/src/components/Digest.jsx');
  const shareMod = await vite.ssrLoadModule('/src/components/InsightsShare.jsx');
  return {
    SettingsScreen: settingsMod.SettingsScreen,
    DigestScreen: digestMod.DigestScreen,
    InsightsShare: shareMod.InsightsShare,
  };
}

function settingsProps() {
  return {
    settings: {
      theme: 'warm',
      flow: 'A',
      fontSize: 'small',
      aiConsent: true,
      shareInsights: true,
      digest: { enabled: true, cadence: 'week', weekday: 5, hour: 9 },
    },
    setSettings: () => {},
    onClearData: () => {},
    billing: { entitled: false },
    inTrial: false,
    onOpenSubscription: () => {},
    onOpenUpgrade: () => {},
  };
}

function digestProps() {
  return {
    kid: { id: 'k1', name: 'Maya' },
    kids: [{ id: 'k1', name: 'Maya' }, { id: 'k2', name: 'Noa' }],
    history: [],
    settings: {
      shareInsights: true,
      digest: { enabled: true, cadence: 'week', weekday: 5, hour: 9 },
    },
    setSettings: () => {},
    digestMeta: { lastShownPeriod: {}, sentPeriods: [], digestsOpened: 5, sharePrompted: false },
    setDigestMeta: () => {},
    onBack: () => {},
  };
}

test('on web, share UI is absent, the digest stays, and send never calls fetch', async () => {
  installCapacitor({ isNativePlatform: () => false, getPlatform: () => 'ios' });
  assert.equal(isNativeApp(), false);
  let calls = 0;
  const skipped = await postInsights({ schema_v: 1 }, async () => {
    calls += 1;
    return { ok: true };
  });
  assert.equal(calls, 0);
  assert.deepEqual(skipped, { ok: false, skipped: 'web' });
  const scheduled = await syncDigestNotification({
    enabled: true, cadence: 'week', weekday: 5, hour: 9, body: 'reminder',
  });
  assert.deepEqual(scheduled, { scheduled: false, reason: 'web' });

  const { SettingsScreen, DigestScreen, InsightsShare } = await screens();
  const settingsHtml = renderToStaticMarkup(createElement(SettingsScreen, settingsProps()));
  const digestHtml = renderToStaticMarkup(createElement(DigestScreen, digestProps()));
  const shareHtml = renderToStaticMarkup(createElement(InsightsShare, {
    open: true,
    onClose: () => {},
    onSent: () => {},
    ...digestProps(),
    cadence: 'week',
    now: new Date(2026, 10, 1),
  }));
  assert.equal(settingsHtml.includes(SHARE), false);
  assert.equal(settingsHtml.includes(DIGEST), true);
  assert.equal(settingsHtml.includes('Weekly'), true);
  assert.equal(settingsHtml.includes(FRIDAY), false);
  assert.equal(settingsHtml.includes('Time'), false);
  assert.equal(digestHtml.includes('This week with Maya'), true);
  assert.equal(digestHtml.includes('Built on this device'), true);
  assert.equal(digestHtml.includes(SEND), false);
  assert.equal(digestHtml.includes('Share an anonymous summary?'), false);
  assert.equal(shareHtml, '');
  assert.equal(shareHtml.includes(JSON_LABEL), false);
  assert.equal(calls, 0);
});

test('on native, share UI and the insights POST stay available', async () => {
  installCapacitor({ isNativePlatform: () => true, getPlatform: () => 'ios' });
  assert.equal(isNativeApp(), true);
  const payload = { schema_v: 1, lang: 'en' };
  let seen = null;
  const result = await postInsights(payload, async (url, init) => {
    seen = { url, init };
    return { ok: true, text: async () => '' };
  });
  assert.equal(result.ok, true);
  assert.equal(seen.init.method, 'POST');
  assert.deepEqual(seen.init.headers, insightsRequest(payload).headers);
  assert.equal(seen.init.credentials, 'omit');
  assert.equal(seen.init.body, JSON.stringify(payload));
  assert.equal(String(seen.url).includes('/api/insights'), true);

  installCapacitor({ getPlatform: () => 'android' });
  assert.equal(isNativeApp(), true);
  installCapacitor({ getPlatform: () => 'web' });
  assert.equal(isNativeApp(), false);
  installCapacitor(undefined);
  assert.equal(isNativeApp(), false);

  installCapacitor({ isNativePlatform: () => true, getPlatform: () => 'ios' });
  const { SettingsScreen, DigestScreen, InsightsShare } = await screens();
  const settingsHtml = renderToStaticMarkup(createElement(SettingsScreen, settingsProps()));
  const digestHtml = renderToStaticMarkup(createElement(DigestScreen, digestProps()));
  const shareHtml = renderToStaticMarkup(createElement(InsightsShare, {
    open: true,
    onClose: () => {},
    onSent: () => {},
    ...digestProps(),
    cadence: 'week',
    now: new Date(2026, 10, 1),
  }));
  assert.equal(settingsHtml.includes(SHARE), true);
  assert.equal(settingsHtml.includes(DIGEST), true);
  assert.equal(settingsHtml.includes(FRIDAY), true);
  assert.equal(digestHtml.includes('This week with Maya'), true);
  assert.equal(digestHtml.includes(SEND), true);
  assert.equal(shareHtml.includes(JSON_LABEL), true);
  assert.equal(shareHtml.includes(SEND), true);
  assert.equal(shareHtml.includes('Exactly what will be sent'), true);
});
