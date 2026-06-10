# Android Release Checklist (Google Play)

Steps to publish Kidsit AI to the Google Play Store. Android scaffolding is already in place (`android/`, Capacitor configured, release signing wired in `android/app/build.gradle`).

---

## Current status (as of 2026-06-09)

| Step | Status |
|------|--------|
| 1. Upload keystore generated | ✅ `~/keystores/kidsai-upload.jks` |
| 2. Keystore wired to build | ✅ `android/keystore.properties` (gitignored at `.gitignore:7`) |
| 3. Version bump | ⏳ Still at `versionCode 1` / `versionName "1.0"` — fine for first upload |
| 4. Release AAB built | ✅ `android/app/build/outputs/bundle/release/app-release.aab` (5.6 MB, signed) |
| 5. App created in Play Console | ⏳ Pending — package `ai.kidsit.app`, Free |
| 6. Default store listing | ⏳ Copy + assets ready (see §6) |
| 7. Policy forms | ⏳ Pending |
| 8. Internal testing release | ⏳ Pending |
| 9a. Payments profile | ✅ Profile ID `3359-5780-0529` (Israel, Individual) |
| 9b–9m. RevenueCat IAP wiring | ⏳ Pending — create products + base plans, link service account |

---

## 1. Create the upload keystore (one-time) ✅ DONE

⚠️ **Keep this file forever.** Losing it means you can never update the app under this listing.

```bash
mkdir -p ~/keystores
keytool -genkey -v -keystore ~/keystores/kidsai-upload.jks \
  -alias kidsai -keyalg RSA -keysize 2048 -validity 10000
```

- Password is in your password manager.
- **TODO:** confirm `~/keystores/kidsai-upload.jks` is backed up off this machine (iCloud Drive, 1Password attachment, external drive).

## 2. Wire the keystore into the build ✅ DONE

`android/keystore.properties` exists and is gitignored. Don't commit it.

## 3. Bump version before each release

In `android/app/build.gradle`:
- `versionCode` — must increment by at least 1 per upload (Play rejects duplicates)
- `versionName` — user-visible string (e.g. `"1.0.3"`)

Current values: `versionCode 1`, `versionName "1.0"` — leave as-is for the very first upload, bump on every subsequent build. Keep aligned with the iOS version in `ios/App/App/Info.plist`.

## 4. Build the release AAB ✅ DONE (rebuild on every version bump)

```bash
npm run build
npx cap sync android
cd android && ./gradlew bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

To smoke-test on a real device before uploading:
```bash
cd android && ./gradlew installRelease
```

## 5. Google Play Console — create the app

- **App name:** `Kidsit AI`
- **Package name (immutable!):** `ai.kidsit.app`
- **App or game:** App
- **Free or paid:** **Free** (monetized via in-app subscriptions through RevenueCat — cannot switch Free→Paid later)
- **Enroll in Play App Signing:** Yes. Google holds the app signing key; you keep the upload key.

## 6. Default store listing — content ready to paste

### App details

**App name** (max 30):
```
Kidsit AI
```

**Short description** (max 80):
```
AI parenting coach. Describe the moment, get calm, expert-backed guidance.
```

**Full description** (max 4000):
```
Parenting is hard. Kidsit AI gives you a thoughtful, expert-backed response in the moments that matter most — tantrums, tough questions, sibling fights, big feelings.

HOW IT WORKS
Describe what just happened, or what's coming up. Kidsit AI replies with calm, practical guidance you can actually use — grounded in child development research, not generic advice.

WHAT YOU CAN DO
• Log parenting moments across each of your kids
• Get instant, personalized guidance for tantrums, transitions, sleep, screens, sibling conflict, and more
• Build a history of what works for your family
• Quick text or voice input — describe the moment in your own words
• Multiple kids, ages, and personalities supported

WHO IT'S FOR
Parents of toddlers, preschoolers, and school-age kids who want a calm second opinion in the heat of the moment — without scrolling through forums or waiting for a therapy appointment.

PRIVACY
Your moments stay private. We don't sell your data. Kidsit AI is designed for parents — not children — and never asks for your child's personal information.

SUBSCRIPTION
Kidsit AI is free to try. Unlimited guidance requires a subscription, billed monthly or annually through Google Play. Cancel anytime in your Google Play account.

QUESTIONS OR FEEDBACK
Email us at omere@appcard.com. We read every message.
```

### Graphics (all generated, sitting in `marketing/play/`)

| Asset | Path | Spec |
|-------|------|------|
| App icon | `marketing/play/icon-512.png` | 512×512 PNG, no alpha |
| Feature graphic | `marketing/play/feature-1024x500.png` | 1024×500 PNG |
| Phone screenshots | `marketing/shots/01.png` – `05.png` | 1290×2796 (raw, unframed) |

To regenerate the feature graphic after editing `marketing/feature-graphic.html`:
```bash
cd marketing && node render-feature-graphic.mjs
```

### Categorization

- **Category:** Parenting
- **Tags (max 5):** Parenting, Family, AI chatbot, Self-improvement, Mental wellness
- **Do NOT pick:** Kids / Children tags (would trigger Designed for Families review)

### Contact

- **Email (public on store page):** `omere@appcard.com`
- **Website:** (leave blank unless you want one public)
- **Privacy policy URL:** `https://kidsit.ai/privacy`

### Release notes (first release)

```
Kidsit AI helps parents handle tough parenting moments with calm,
expert-backed guidance. Describe what happened — a tantrum, a tough
question, a sibling fight — and get a thoughtful response you can
actually use. Track moments across each child, learn what works,
and grow your toolkit over time.

This is our first Android release. Welcome aboard.
```

For future releases (versionCode 2+), switch to a bulleted changelog format.

## 7. Policy forms

| Form | Answer |
|------|--------|
| Privacy policy URL | `https://kidsit.ai/privacy` |
| App access | All functionality available without special access (or provide a test login if behind a wall) |
| Ads | No |
| Content rating (IARC) | Answer honestly about AI-generated content. Likely Everyone or Teen depending on prompts. |
| Target audience | **Adults / Parents only** — do NOT include child age groups |
| News app | No |
| COVID-19 contact tracing | No |
| Government app | No |
| Financial features | No |
| Health | No (unless you reposition as wellness) |
| Data safety | Declare: OpenAI API key stored on-device (user-supplied), parenting moments stored on-device. If you later add analytics/Sentry/crash reporting, update this. |

## 8. Upload to Internal Testing first

- **Testing → Internal testing → Create new release**
- Upload `app-release.aab`
- Paste the release notes (§6)
- Add testers (email list or Google Group)
- Save → Review → Rollout to Internal testing

Internal testing reviews are fast (often <1 hour). Play gives you an opt-in URL — use it on your Android test device to install via the Play Store.

Promotion path: **Internal → Closed → Open → Production**. Each step requires a new review.

## 9. RevenueCat / IAP setup (Google Play)

The iOS-side setup is documented in `BILLING_SETUP.md`. Android is similar in spirit but uses Play's subscription model (which is structured differently — products have "base plans" and "offers"). Code is already wired up — `src/billing.js` reads `VITE_RC_ANDROID_KEY` and uses the same `premium` entitlement and offering IDs as iOS.

### 9a. Payments profile ✅ DONE

- Profile ID: `3359-5780-0529` (Individual, Israel)
- Shared across Play, Play Developer, Cloud, Google Pay
- Settings → Payments profile to verify/edit
- **Worth confirming on that page:**
  - Public merchant profile → set seller name to `Kidsit AI` (otherwise receipts show personal name)
  - Tax info → W-8BEN completed (required before Google can pay out)
  - Bank account linked (Israeli IBAN)

### 9b. Create the subscription products

- **Monetize → Products → Subscriptions → Create subscription**
- Use the same product IDs as iOS so the user-facing experience and analytics stay aligned:
  - `kidsit_monthly`
  - `kidsit_yearly`
- For each, you'll create:
  - **Subscription details** — name + description shown in the Play purchase sheet
  - **Base plan** — billing period (monthly / yearly), auto-renewing, the price
  - **Offer** (only on the yearly product) — a free trial

### 9c. Base plans

For each subscription, click into **Base plans → Add base plan**:

| Product | Base plan ID | Billing period | Renewal | Price |
|---------|--------------|----------------|---------|-------|
| `kidsit_monthly` | `monthly-autorenewing` | 1 month | Auto-renewing | match iOS price |
| `kidsit_yearly` | `yearly-autorenewing` | 1 year | Auto-renewing | match iOS price |

Set prices per market (USD default → Play auto-converts, you can override).

After creating each base plan, **Activate** it (otherwise the product won't be purchasable).

### 9d. Free trial offer on yearly only

- Open `kidsit_yearly` → **Offers → Add offer**
- Offer ID: `freetrial-1week`
- Eligibility: **Developer-determined** → set to **New customer acquisition** (matches iOS "New subscribers" eligibility)
- Phase: **Free trial**, 1 week
- Then a paid auto-renewing phase referencing the base plan
- **Activate** the offer

Matches the iOS approach (`BILLING_SETUP.md` §1d): trial on yearly only, so users can't game it by switching plans.

### 9e. Get Play service account credentials for RevenueCat

This is the gnarly part — RevenueCat needs a Google Cloud service account with Play Developer API access to verify purchases server-side.

Follow RevenueCat's exact steps: https://www.revenuecat.com/docs/service-credentials/creating-play-service-credentials

Summary:
1. **Google Play Console → Setup → API access** → link a Google Cloud project (or create one)
2. Create a **service account** in the linked GCP project
3. Grant it the **Service Account User** role in GCP
4. Back in Play Console **API access**, grant the service account these permissions:
   - View financial data
   - Manage orders and subscriptions
5. Download the service account's **JSON key file** — keep this private (never commit it)
6. Wait ~24–36h before the service account is fully active (Google notes this is real, not theoretical — RevenueCat will return errors until then)

### 9f. RevenueCat: add the Android app

- **RevenueCat dashboard → existing project → Project settings → Apps → + New** → **Play Store**
- Package name: `ai.kidsit.app`
- Upload the service account JSON from §9e
- Save

### 9g. Import products into RevenueCat

- **Products → + New Product** for each:
  - `kidsit_monthly` (Play Store, type: Subscription)
  - `kidsit_yearly` (Play Store, type: Subscription)
- Wait ~30 seconds for RevenueCat to fetch metadata from Play
- If RevenueCat can't see the products: confirm an AAB has been uploaded to a release track (§9j) and base plans are activated (§9c)

### 9h. Attach to the existing `premium` entitlement

- **Entitlements → premium** (already exists from iOS setup)
- Click **Attach products** → add both Android products
- The `premium` entitlement now resolves true for any user with an active sub on either platform

### 9i. Add Android packages to the existing offering

- **Offerings → default** (already exists, marked Current)
- Add packages (or check that existing $rc_monthly / $rc_annual packages now show Android products):
  - `$rc_monthly` → both `kidsit_monthly` (iOS) and `kidsit_monthly` (Play, monthly-autorenewing base plan)
  - `$rc_annual` → both `kidsit_yearly` (iOS) and `kidsit_yearly` (Play, yearly-autorenewing base plan with freetrial-1week offer)

`src/billing.js` reads from the same `default` offering on both platforms — RevenueCat auto-selects the right platform's product at purchase time.

### 9j. Upload the AAB to a release track

Play won't surface the products to the live device until a build containing the billing library has been uploaded to **at least one release track** (Internal testing is enough). The signed AAB from §4 already includes the RevenueCat billing library via `@revenuecat/purchases-capacitor`.

### 9k. Get the Android SDK key into `.env`

- **RevenueCat → Project settings → API Keys → Public SDK keys → Android**
- Copy the `goog_...` key
- Update `.env` locally:
  ```
  VITE_RC_ANDROID_KEY=goog_...
  ```
- **You must rebuild and re-upload the AAB** for this to take effect on devices — Vite bakes `import.meta.env.VITE_*` into the JS bundle at build time

### 9l. License testers for free purchases

- **Play Console → Setup → License testing**
- Add the Gmail addresses you'll test purchases from (must be the same account signed into Play on the test device)
- License testers can complete purchases at $0 and exercise the full flow including renewal, cancel, refund
- Trial is also testable: license testers can complete a 1-week trial in ~5 minutes of accelerated test time

### 9m. Going live

When ready for production:
1. Promote the AAB through Internal → Closed → Open → Production review tracks
2. Subscription products are reviewed alongside the app build — they can't be approved separately on first submission
3. Once production rollout starts, anyone (not just testers) can subscribe

### Android billing — common gotchas

- **Service account propagation delay:** 24–36h after creating the GCP service account, RevenueCat will get `403 PERMISSION_DENIED` from Play. This is expected; don't debug it for the first day.
- **Products not visible in RevenueCat:** confirm the AAB is uploaded to Internal testing AND base plans are activated. Both are required.
- **Test device signed into wrong Google account:** Play uses the device's primary Google account. If you've added a tester email but the device is signed in as someone else, you'll see real-money prices instead of $0.
- **Existing iOS subscribers on Android:** they'll need to log in via the same RevenueCat-anonymous ID or your own login system to share entitlements cross-platform. If you don't have user accounts yet, iOS purchases won't carry to Android.
- **`installRelease` vs Play Store install:** sideloaded builds (`./gradlew installRelease`) **cannot complete real purchases** — the device must install the build *through the Play Store* (via the Internal testing opt-in URL). This trips people up constantly.

## 10. First-release gotchas

- Play review for a brand-new app's first production release is typically 1–7 days (longer than iOS lately).
- Avoid "Designed for Families" unless you specifically want kid-targeted distribution — stricter content/ad policy.
- Audit `android/app/src/main/AndroidManifest.xml` — only request permissions you actually use. Extras trigger scrutiny.
- The OpenAI key shipped client-side (`dangerouslyAllowBrowser: true`) is fine for user-supplied keys, but the data safety form and privacy policy must reflect that you're sending prompts to OpenAI.

---

## Quick reference

| Item | Value |
|------|-------|
| Package name | `ai.kidsit.app` |
| Privacy policy URL | `https://kidsit.ai/privacy` |
| Contact email | `omere@appcard.com` |
| Keystore path | `~/keystores/kidsai-upload.jks` |
| Keystore config | `android/keystore.properties` |
| Version (current) | `versionCode 1`, `versionName "1.0"` in `android/app/build.gradle:13-14` |
| AAB output | `android/app/build/outputs/bundle/release/app-release.aab` |
| Build AAB | `npm run build && npx cap sync android && cd android && ./gradlew bundleRelease` |
| Install on device | `cd android && ./gradlew installRelease` |
| Icon (512×512) | `marketing/play/icon-512.png` |
| Feature graphic (1024×500) | `marketing/play/feature-1024x500.png` |
| Screenshots | `marketing/shots/01.png` – `05.png` |
| Regenerate feature graphic | `cd marketing && node render-feature-graphic.mjs` |
