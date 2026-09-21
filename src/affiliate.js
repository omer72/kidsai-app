// Insert Affiliate. Deep-linking platform is "Other": whatever link the
// affiliate shares must land on a URL carrying ?insertAffiliate=<shortCode>.
// The SDK reads that off window.location on the web, but inside Capacitor the
// WebView URL is capacitor://localhost, so we feed it appUrlOpen / launch URLs.
// Purchase verification is RevenueCat (attributes below + the RevenueCat
// webhook pointed at api.insertaffiliate.com).

import { InsertAffiliate } from 'insert-affiliate-js-sdk';
import { Purchases } from '@revenuecat/purchases-capacitor';

const COMPANY_CODE = (import.meta.env.VITE_IA_COMPANY_CODE || '').trim();
const WEB_PURCHASE_LINK = (import.meta.env.VITE_RC_WEB_PURCHASE_LINK || '').trim();
const ATTRIBUTION_MS = 7 * 24 * 60 * 60 * 1000;

let ready = null;

export function affiliateAvailable() {
  return !!COMPANY_CODE;
}

function captureFromUrl(url) {
  if (!url) return;
  try {
    const code = new URL(url).searchParams.get('insertAffiliate');
    if (code) InsertAffiliate.setInsertAffiliateIdentifier(code);
  } catch {
    // Not a parseable URL — nothing to attribute.
  }
}

export function initAffiliate() {
  if (!COMPANY_CODE) return Promise.resolve();
  // preventAffiliateTransfer: first affiliate to bring the user keeps credit.
  ready = ready || InsertAffiliate.initialize(COMPANY_CODE, false, ATTRIBUTION_MS, true);
  if (window.Capacitor?.isNativePlatform?.()) {
    import('@capacitor/app').then(({ App }) => {
      App.addListener('appUrlOpen', ({ url }) => captureFromUrl(url));
      App.getLaunchUrl().then((r) => captureFromUrl(r?.url)).catch(() => {});
    }).catch(() => {});
  }
  return ready;
}

// Mirrors the affiliate onto the RevenueCat subscriber so RevenueCat's webhook
// carries attribution into Insert Affiliate. Call after Purchases.configure.
export async function attachAffiliateToRevenueCat() {
  if (!COMPANY_CODE) return;
  await initAffiliate();
  const push = async (identifier, offerCode) => {
    if (!identifier) return;
    try {
      await Purchases.getCustomerInfo(); // subscriber must exist before setAttributes
      const expiry = await InsertAffiliate.getAffiliateExpiryTimestamp();
      const attributes = {
        insert_affiliate: identifier,
        insert_timedout: expiry ? String(expiry) : '',
      };
      // Drives RevenueCat Targeting so an affiliate's offering shows up.
      if (offerCode) attributes.affiliateOfferCode = offerCode;
      await Purchases.setAttributes(attributes);
      await Purchases.syncAttributesAndOfferingsIfNeeded();
    } catch (err) {
      console.log('[affiliate] setAttributes failed', err?.message || String(err));
    }
  };
  InsertAffiliate.setInsertAffiliateIdentifierChangeCallback(push);
  // The callback only fires on change; push what a previous session stored.
  push(await InsertAffiliate.returnInsertAffiliateIdentifier(), await InsertAffiliate.getOfferCode());
}

// Short code entry — the fallback Insert Affiliate requires when the deep link
// is a RevenueCat Web Purchase Link, because redemption links don't carry UTM
// params into the app. Returns true when the code was valid and stored.
export async function applyShortCode(code) {
  if (!COMPANY_CODE) return false;
  await initAffiliate();
  return InsertAffiliate.setShortCode(String(code || '').trim());
}

// RevenueCat Web Purchase Link with Insert Affiliate's UTM triplet appended.
// Null when no link is configured. Open it in the system browser (not the
// WebView) so the RevenueCat checkout can hand back a redemption link.
export async function webPurchaseLink() {
  if (!WEB_PURCHASE_LINK) return null;
  const url = new URL(WEB_PURCHASE_LINK);
  if (COMPANY_CODE) {
    await initAffiliate();
    const affiliateId = await InsertAffiliate.returnInsertAffiliateIdentifier(true);
    const companyId = await InsertAffiliate.returnCompanyId();
    if (affiliateId) {
      url.searchParams.set('utm_source', 'insertAffiliate');
      url.searchParams.set('utm_medium', companyId || 'none');
      url.searchParams.set('utm_campaign', affiliateId);
    }
  }
  return url.toString();
}
