// RevenueCat wrapper. The SDK is iOS-only here, so on web/desktop preview we
// short-circuit to a "not entitled" state and skip native calls.

import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';

const IOS_API_KEY = (import.meta.env.VITE_RC_IOS_KEY || '').trim();
const ENTITLEMENT_ID = (import.meta.env.VITE_RC_ENTITLEMENT_ID || 'premium').trim();

let configured = false;
let listeners = new Set();

function isNative() {
  return !!(typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.());
}

export function billingAvailable() {
  return isNative() && !!IOS_API_KEY;
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
    await Purchases.configure({ apiKey: IOS_API_KEY });
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

export async function refreshEntitlement() {
  if (!billingAvailable()) return { entitled: false, productId: null, expiresAt: null, inTrial: false, willRenew: false };
  const { customerInfo } = await Purchases.getCustomerInfo();
  return entitlementFromCustomerInfo(customerInfo);
}

export async function getOfferings() {
  if (!billingAvailable()) return { monthly: null, yearly: null };
  const { current } = await Purchases.getOfferings();
  if (!current) return { monthly: null, yearly: null };
  return {
    monthly: current.monthly || current.availablePackages?.find((p) => /month/i.test(p.identifier)) || null,
    yearly: current.annual || current.availablePackages?.find((p) => /year|annual/i.test(p.identifier)) || null,
  };
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
  return `${n}-${unit}`;
}
