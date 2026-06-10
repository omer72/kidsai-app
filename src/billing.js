// RevenueCat wrapper. Configured per-platform (iOS / Android). On web/desktop
// preview we short-circuit to a "not entitled" state and skip native calls.

import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';

const IOS_API_KEY = (import.meta.env.VITE_RC_IOS_KEY || '').trim();
const ANDROID_API_KEY = (import.meta.env.VITE_RC_ANDROID_KEY || '').trim();
const ENTITLEMENT_ID = (import.meta.env.VITE_RC_ENTITLEMENT_ID || 'premium').trim();

let configured = false;
let listeners = new Set();

function isNative() {
  return !!(typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.());
}

function platform() {
  return typeof window !== 'undefined' ? window.Capacitor?.getPlatform?.() : null;
}

function platformKey() {
  const p = platform();
  if (p === 'ios') return IOS_API_KEY;
  if (p === 'android') return ANDROID_API_KEY;
  return '';
}

export function billingAvailable() {
  return isNative() && !!platformKey();
}

function entitlementFromCustomerInfo(info) {
  const active = info?.entitlements?.active?.[ENTITLEMENT_ID];
  if (!active) return { entitled: false, productId: null, expiresAt: null, inTrial: false, willRenew: false };
  return {
    entitled: true,
    productId: active.productIdentifier || null,
    expiresAt: active.expirationDate ? new Date(active.expirationDate).getTime() : null,
    inTrial: active.periodType === 'INTRO' || active.periodType === 'TRIAL',
    willRenew: !!active.willRenew,
  };
}

export async function initBilling(onUpdate) {
  if (!billingAvailable()) return { entitled: false, productId: null, expiresAt: null, inTrial: false, willRenew: false };
  if (!configured) {
    await Purchases.setLogLevel({ level: LOG_LEVEL.WARN });
    await Purchases.configure({ apiKey: platformKey() });
    Purchases.addCustomerInfoUpdateListener((info) => {
      const next = entitlementFromCustomerInfo(info);
      listeners.forEach((cb) => cb(next));
    });
    configured = true;
  }
  if (onUpdate) listeners.add(onUpdate);
  const { customerInfo } = await Purchases.getCustomerInfo();
  return entitlementFromCustomerInfo(customerInfo);
}

export function offUpdate(cb) {
  listeners.delete(cb);
}

export function onBillingUpdate(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export async function refreshEntitlement() {
  if (!billingAvailable()) return { entitled: false, productId: null, expiresAt: null, inTrial: false, willRenew: false };
  const { customerInfo } = await Purchases.getCustomerInfo();
  return entitlementFromCustomerInfo(customerInfo);
}

export async function getOfferings() {
  if (!billingAvailable()) {
    console.log('[billing] getOfferings: billing not available');
    return { monthly: null, yearly: null };
  }
  try {
    const offerings = await Purchases.getOfferings();
    console.log('[billing] getOfferings: full raw response', JSON.stringify({
      currentId: offerings.current?.identifier,
      currentMonthlyExists: !!offerings.current?.monthly,
      currentMonthlyProductId: offerings.current?.monthly?.product?.identifier,
      currentAnnualExists: !!offerings.current?.annual,
      currentAnnualProductId: offerings.current?.annual?.product?.identifier,
      availablePackagesCount: offerings.current?.availablePackages?.length,
      availablePackageIds: offerings.current?.availablePackages?.map((p) => ({
        id: p.identifier, productId: p.product?.identifier, productType: p.product?.productCategory,
      })),
      allOfferingIds: Object.keys(offerings.all || {}),
    }, null, 2));
    const { current } = offerings;
    if (!current) {
      console.log('[billing] getOfferings: no current offering set');
      return { monthly: null, yearly: null };
    }
    const monthly = current.monthly || current.availablePackages?.find((p) => /month/i.test(p.identifier)) || null;
    const yearly = current.annual || current.availablePackages?.find((p) => /year|annual/i.test(p.identifier)) || null;
    console.log('[billing] getOfferings: resolved', {
      monthly: monthly ? { id: monthly.identifier, productId: monthly.product?.identifier } : null,
      yearly: yearly ? { id: yearly.identifier, productId: yearly.product?.identifier } : null,
    });
    return { monthly, yearly };
  } catch (err) {
    console.log('[billing] getOfferings: error', err?.message || String(err));
    throw err;
  }
}

export async function purchasePackage(pkg) {
  if (!billingAvailable()) throw new Error('Purchases unavailable on this platform.');
  const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
  return entitlementFromCustomerInfo(customerInfo);
}

export async function restorePurchases() {
  if (!billingAvailable()) throw new Error('Purchases unavailable on this platform.');
  const { customerInfo } = await Purchases.restorePurchases();
  return entitlementFromCustomerInfo(customerInfo);
}

export async function presentCodeRedemptionSheet() {
  if (!billingAvailable()) throw new Error('Promo codes can only be redeemed in the store build.');
  if (platform() === 'android') {
    window.open('https://play.google.com/redeem', '_blank');
    return;
  }
  await Purchases.presentCodeRedemptionSheet();
}

export function priceString(pkg) {
  if (!pkg) return '';
  return pkg.product?.priceString || pkg.product?.price || '';
}

export function introOfferPeriod(pkg) {
  const intro = pkg?.product?.introPrice;
  if (!intro) return null;
  const n = intro.periodNumberOfUnits;
  const unit = (intro.periodUnit || '').toLowerCase();
  if (!n || !unit) return null;
  // Structured so the UI can localize ("7-day" / "7 ימים") via i18n plurals.
  return { n, unit };
}
