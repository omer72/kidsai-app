# Promo / Offer Codes — Operator Guide

How to create and distribute Apple **Subscription Offer Codes** for influencer
campaigns and discounts. The in-app side is already wired: the paywall has a
**"Have a promo code?"** link that opens Apple's native redemption sheet via
RevenueCat (`presentCodeRedemptionSheet`).

> Offer Codes are different from the legacy "Promo Codes" feature. Promo Codes
> are capped at 100/quarter and only grant free access. **Use Offer Codes for
> anything customer-facing or influencer-driven.**

---

## 1. Open App Store Connect

1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. **My Apps** → select **Kidsit AI**
3. Left sidebar → **Subscriptions** (under *In-App Purchases and Subscriptions*)

## 2. Pick the subscription you want to discount

Click into the subscription product (monthly or yearly). Each product has its
own offer codes — if you want the same offer to apply to both plans, you can
attach it to multiple products when creating it.

## 3. Create an offer code

1. Scroll to **Subscription Prices** → find the **Offer Codes** section
2. Click **Create Offer Code** (or **+**)
3. Fill in:

   | Field | What it is |
   |---|---|
   | **Reference Name** | Internal only, e.g. `Sarah-TikTok-Q2-2026` |
   | **Offer Code Name** | What users see in the redemption sheet, e.g. *"Sarah's special offer"* |
   | **Countries/Regions** | Where the code is valid (usually leave as all) |
   | **Eligibility** | `New subscribers` (typical for influencers), `Existing subscribers`, or `Previous subscribers` |
   | **Offer Type** | `Free` (N days/months free), `Pay as you go` (discounted recurring price for N periods), or `Pay up front` (single discounted payment for a duration) |
   | **Duration** | How long the discount lasts before reverting to standard price |
   | **Start/End Date** | Campaign window |

## 4. Generate codes for distribution

After saving the offer, choose distribution method:

- **Custom code** (recommended for influencers) — one memorable code like
  `SARAH30` that anyone can redeem. Set a max-redemption cap (Apple allows up
  to 1M per offer).
- **One-time use codes** — bulk unique codes downloaded as CSV. Better for
  giveaways and email blasts than for public posts.

For an influencer: pick **Custom code**, type the code, set redemption limit,
click **Create**.

## 5. Send the code to the influencer

Give them the code string. Users redeem it by:

1. Opening the paywall in Kidsit AI
2. Tapping **"Have a promo code?"** at the bottom of the paywall
3. Entering the code in Apple's redemption sheet

No special URL or deep link required.

## 6. Track redemptions

- **Subscriptions** → product → **Offer Codes** → click offer → see redemption count
- **Analytics** → **Sources** → filter by subscription offer for revenue/conversion

---

## Practical tips

- **Test in sandbox first.** Create a sandbox tester (Users and Access →
  Sandbox Testers), sign in on a real device, redeem a code. Sandbox
  redemptions don't count against the real cap.
- **One code per influencer.** Give each creator a unique custom code
  (`SARAH30`, `JAKE20`, `MOMTOK15`) so you can attribute redemptions.
- **One offer can cover both products.** Attach the offer to both monthly and
  yearly when creating it — same `SARAH30` works for either.
- **Codes are case-insensitive** and the redemption sheet auto-localizes.
- **Apple still takes its cut** (15% or 30%) on offer-code subscriptions — the
  discount comes out of your revenue, not Apple's.
- **No retroactive discounts.** A user already subscribed at full price can't
  apply a new-subscriber code; only users matching the eligibility tier
  qualify.
- **Codes can be revoked.** End the offer early in App Store Connect to stop
  new redemptions (existing redemptions stay honored through their duration).

---

## Code-side reference

- Native sheet wrapper: `src/billing.js` → `presentCodeRedemptionSheet()`
- Paywall link: `src/components/Paywall.jsx` → `handleRedeemCode`
- i18n strings: `paywall.redeemCode`, `paywall.promoCodeUnavailable` in
  `src/i18n/{en,es,he}.json`
- Requires iOS 14+ (project deployment target is iOS 15.0)
- Entitlement changes after redemption flow through RevenueCat's
  `customerInfoUpdateListener`, wired in `src/App.jsx`
