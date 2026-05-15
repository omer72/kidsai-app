# Billing setup — RevenueCat + Apple IAP

Code wiring is done. The app stays in "not entitled" mode until the steps below are completed in App Store Connect and the RevenueCat dashboard.

---

## 1. App Store Connect

### 1a. Paid Apps Agreement
- **App Store Connect → Agreements, Tax, and Banking**
- Sign the **Paid Apps Agreement** and complete tax + banking. IAP products cannot be created until this is done.

### 1b. Create the subscription group
- **My Apps → Kidsit AI → Monetization → Subscriptions → Create Subscription Group**
- Name: `Kidsit AI Premium` (group name is internal, not user-visible).

### 1c. Create the two products

| Field            | Monthly                | Yearly                 |
| ---------------- | ---------------------- | ---------------------- |
| Reference Name   | `Kidsit AI Premium Monthly`| `Kidsit AI Premium Yearly` |
| Product ID       | `kidsit_monthly`        | `kidsit_yearly`         |
| Duration         | 1 Month                | 1 Year                 |
| Price            | $9.99                  | $59.00                 |
| Localizations    | English (display name + description) | English (display name + description) |

### 1d. Add the free trial to the yearly product
- Open `kidsit_yearly` → **Subscription Prices → View All Subscription Pricing → Introductory Offer**
- Type: **Free**
- Duration: **1 week**
- Eligibility: **New subscribers**
- Countries: All

> **Important:** Only one product per group can be in trial state for a user at a time. Adding the trial to the yearly plan (only) avoids users gaming the trial by switching plans.

### 1e. Generate the App Store shared secret
- **Users and Access → Integrations → In-App Purchase → App-Specific Shared Secret**
- Generate one. Copy it. You'll paste it into RevenueCat.

### 1f. Create a sandbox tester
- **Users and Access → Sandbox → Testers → Create**
- Use a fresh email that isn't tied to any real Apple ID.
- On the test device: **Settings → App Store → Sandbox Account** → sign in with this tester.

---

## 2. RevenueCat dashboard

### 2a. Create the project and app
- Sign in → **Create a new project** → name it `Kidsit AI`.
- **Project settings → Apps → + New** → choose **App Store**.
- Bundle ID: `ai.kidsit.app`.
- Paste the **App Store shared secret** from step 1e.
- For now you can skip the App Store Connect API key (used for server-to-server refund webhooks — nice-to-have, not required for v1).

### 2b. Import products
- **Products → + New Product**
- Add `kidsit_monthly` (App Store, type: Auto-renewable subscription).
- Add `kidsit_yearly` (App Store, type: Auto-renewable subscription).
- Wait ~30 seconds for RevenueCat to fetch metadata from App Store Connect.

### 2c. Create the entitlement
- **Entitlements → + New Entitlement**
- Identifier: **`premium`** (must match `VITE_RC_ENTITLEMENT_ID` in `.env`).
- Attach both `kidsit_monthly` and `kidsit_yearly` to it.

### 2d. Create the offering
- **Offerings → + New Offering**
- Identifier: `default`. Mark it as **Current**.
- Add two packages:
  - `$rc_monthly` → `kidsit_monthly`
  - `$rc_annual` → `kidsit_yearly`

> Our code reads `current.monthly` and `current.annual` from the offering. Using these reserved package identifiers means `Paywall.jsx` finds them automatically.

### 2e. Confirm the SDK key
- **Project settings → API Keys**
- The iOS **public SDK key** for sandbox / TestFlight is the one already in `.env`:
  `VITE_RC_IOS_KEY=test_RxLeEUDIQqHzmLReOBemVVoZRDH`
- For App Store production builds, swap to the `appl_...` key from the same screen.

---

## 3. Build and test

```bash
npm run cap:sync   # vite build + cap sync ios
npx cap open ios   # opens Xcode
```

In Xcode:
1. Pick a real device (sandbox IAP **does not work in the simulator** reliably — use a physical iPhone signed into the sandbox tester account from step 1f).
2. Run the app.
3. In the app: **Kids tab → Add a child** (first kid is free).
4. Try **Add another child** → paywall modal appears → tap **Start 7-day free trial** → Apple's IAP sheet appears → confirm with the sandbox tester → entitlement flips, paywall closes, second kid can be added.

### Testing renewal and lapse in sandbox

Sandbox subscriptions renew on accelerated timelines:

| Real duration | Sandbox duration |
| ------------- | ---------------- |
| 1 week trial  | 3 minutes        |
| 1 month       | 5 minutes        |
| 1 year        | 1 hour           |

After the trial ends in sandbox, the subscription auto-renews 5 times then cancels. To test "lapsed": cancel the sandbox subscription via the device's Apple ID settings, then wait for the period to end. The "1 more kid waiting — unlock" CTA should appear in the Kids tab.

### Restore purchase

Delete the app, reinstall, open the app → **Kids → Add another child → paywall → Restore purchase**. Entitlement should come back without re-paying.

---

## 4. Going to production

When you're ready to ship to the App Store:

1. Swap the SDK key in `.env` from `test_...` to the `appl_...` production key (RevenueCat → Project settings → API Keys).
2. Submit the IAP products for review **inside the same app version submission** as the app build that uses them. Apple won't approve IAPs separately on first submission.
3. Make sure the app's binary includes the in-app purchase capability — Capacitor sets this up automatically when the RevenueCat plugin is present, but verify in Xcode → **Signing & Capabilities → + Capability → In-App Purchase**.
4. Add **Restore Purchases** and **Privacy Policy** links in a user-reachable place (currently in the paywall footer — App Review checks for them).
5. Add cancellation instructions in Settings: "Manage subscription in your Apple ID → Subscriptions."

---

## 5. Where the data lives (answers to "we don't want a database")

- **Source of truth:** RevenueCat servers. They talk to Apple, hold the receipt, and answer "is this user entitled?"
- **On the device:** `kidai.settings.v1` in localStorage caches the last known entitlement (`entitled`, `productId`, `expiresAt`, `inTrial`, `willRenew`, `syncedAt`) so the UI doesn't flash on cold start. Editable by the user — never trusted alone.
- **Re-verification:** `App.jsx` calls `Purchases.getCustomerInfo()` on launch and on `visibilitychange` (every foreground). Result flows through `applyBilling()` which updates both the cache and the live state.
- **Trial expiry:** enforced by Apple, not your code. No "7 days since signup" timer.

---

## 6. Files that changed

| File | Purpose |
| ---- | ------- |
| `src/billing.js` | RevenueCat wrapper (init, refresh, offerings, purchase, restore). |
| `src/storage.js` | Added `billing` field to settings (cache of entitlement). |
| `src/App.jsx` | Initializes RC, listens for updates, owns paywall modal state, gates `visibleKids`. |
| `src/components/Paywall.jsx` | Now reads real packages, calls `purchasePackage`, has working Restore link. |
| `src/components/Kids.jsx` | Gates kid #2+ behind paywall, shows "X more kids waiting" CTA when lapsed. |
| `.env` | Added `VITE_RC_IOS_KEY`, `VITE_RC_ENTITLEMENT_ID`. |
| `package.json` | Added `@revenuecat/purchases-capacitor`. |

---

## 7. Troubleshooting

**Paywall shows fallback prices ($9.99, $59), not real ones.**
RC couldn't load offerings. Causes:
- Products not yet approved/active in App Store Connect (status: Ready to Submit → wait 1–6 hours after submitting).
- Wrong bundle ID in RevenueCat.
- Sandbox tester not signed in on the device.
- Network blocked from `api.revenuecat.com`.

**"Cannot connect to iTunes Store" in the IAP sheet.**
- Make sure you're on a physical device, not the simulator.
- Sign out of your real Apple ID from App Store, sign into the sandbox tester only via **Settings → App Store → Sandbox Account**.

**Entitlement check returns false right after purchase.**
- The `customerInfoUpdateListener` should fire — but if it doesn't, call `refreshEntitlement()` manually. Already wired on app foreground.

**Locked kids still appear on the home/history tabs.**
- They shouldn't — `App.jsx` passes `visibleKids` (not full `kids`) to `FlowComponent` and `HistoryScreen`. If you see otherwise, check those props haven't drifted.

**"Maybe later" link missing in paywall.**
- It only renders when `onStart` is provided. The onboarding paywall passes it; the modal-mode paywall (from "Add another child") doesn't, by design — there's no "skip" path when the user is explicitly trying to unlock.
