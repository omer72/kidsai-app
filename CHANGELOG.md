# Changelog

All notable changes to Kidsit AI. Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows [SemVer](https://semver.org/).

Each App Store version maps to `MARKETING_VERSION` in `ios/App/App.xcodeproj/project.pbxproj`; `CURRENT_PROJECT_VERSION` is the iOS build number (bumped on every TestFlight upload, even within the same version).

---

## [Unreleased]

### Added
- **"Restore" link on the Welcome screen** for returning subscribers who reinstalled. Replaces the old non-functional "Sign in" text. Tapping calls RevenueCat's `restorePurchases()`; if an active subscription is found, the app skips Onboarding + Paywall and drops straight into the home tab. Standard App Review pattern.

### Internal
- Welcome screen no longer advertises a sign-in flow that doesn't exist (Guideline 2.3.1 hygiene).

---

## [1.0.14] — 2026-11-11

iOS **1.0.14 (10)**. Android **1.0.14 (18)**. Everything since 1.0.13 (`23d0d1f`). The free-answers limit is enforced by the server only once `AUTH_ENFORCE=true`; until then every answer stays free.

### Changed
- **First paywall moved.** Onboarding is now Welcome → Onboarding → AI consent → app. The paywall no longer appears before the app has shown anything; it opens once, after the first finished moment, and again when the free answers run out. It still opens from "Add another child" and Settings.
- **Free answers instead of an error.** The functions give each install `FREE_MOMENTS` answers (default 3) before a subscription is required, counted on the RevenueCat subscriber (`free_moments_used`). The answer carries `X-Free-Remaining`, the home screen shows what is left, and at zero the paywall opens before the parent records or types. A 403 from the server opens the paywall too, instead of showing "Guidance request failed (403)". Only takes effect with `AUTH_ENFORCE=true`.
- **Review prompt after the first "Helped".** Was three. It never shares a moment with the first paywall: when both are due the review waits for the next positive save.
- **Paywall "Maybe later"** no longer promises "1 kid free".

### Added
- **Anonymous funnel counts.** Eight steps (`onboarding_done` … `purchase`), each posted once per install to `https://kidsit.ai/api/funnel` with platform, language, major.minor version and install source. No RevenueCat id, no device id, no child data. Installs that onboarded on an earlier version report nothing. `VITE_FUNNEL_URL=off` disables it. See `docs/store-privacy-labels.md` (1.0.14 answers) and the privacy policy on kidsit.ai (updated 11 Nov 2026).
- **Android install attribution.** A small native plugin reads the Play install referrer once; the `utm_*` values go to RevenueCat as `$mediaSource`, `$campaign`, `$adGroup`, `$creative`. Click ids are dropped.
- **OpenAI models.** Guidance now uses `gpt-6-luna` (`reasoning_effort: none`) instead of `gpt-4o-mini`, which shuts down on 14 January 2027. Transcription now uses `gpt-transcribe` instead of `whisper-1`, which shuts down on 26 February 2027. Both IDs can be overridden with env vars (`OPENAI_GUIDANCE_MODEL`, `OPENAI_TRANSCRIBE_MODEL`) without changing the function code again.

### Changed (store)
- AI consent text names the current models (`gpt-transcribe`, `gpt-6-luna`).
- Store listing copy, reviewer notes and screenshot 05 describe the 3-free-answers model. Paste-ready notes: `docs/release-notes-1.0.14.md`.

---

## [1.0.13] — 2026-11-02

iOS **1.0.13 (9)**. Android **1.0.13 (17)**. Android's previous store version was 1.0.11 (16), so the Play build also carries the 1.0.12 changes already listed below. This entry is only what landed after iOS 1.0.12 (`45dd015`).

### Added
- **On-device summary.** Each child gets a weekly or daily digest built on the device from the moments already stored there. It counts situation types and which approaches helped or did not. There is no model call on this path.
- **Optional reminder.** A local notification can point at that summary. The text is a fixed template and does not include a child's name.
- **Optional anonymous insights.** Off until the parent turns it on, and each send still has to be confirmed from a preview. Native apps only. The post goes to `https://kidsit.ai/api/insights` with no auth header, no cookies, and no RevenueCat id. The parent can include situation counts, approach counts, a 1–5 rating, and a short note. The note is scrubbed of names, emails, phones, ID numbers, links, and dates before send. Stories, guidance text, age, gender, and profile notes are not in the payload.

### Changed
- **Guidance request.** A request now carries only the open child's profile and up to eight of that child's recent moments. Other children's names, profiles, and history are not sent. The server drops them again if an older client still posts them. The consent copy matches that.
- **Insights stay off the web.** The summary still opens in the browser, but the share controls are hidden and the send path never posts.
- **Name scrubbing follows the note's language.** English and Spanish use their own placeholder. Hebrew keeps attached prefixes on the Hebrew placeholder.
- **Insights app version.** The anonymous payload's `app_version` is the installed version at major.minor. On the phone that is `App.getInfo().version`. In the browser it is the store version injected at build time. It is not the `package.json` version.

---

## [1.0.12] — 2026-10-20

iOS **1.0.12 (8)**.

### Added
- **Hebrew.** The in-app UI, the iOS microphone permission and display name, and the native language list (`he`) are localized for Hebrew.

### Changed
- **Review prompt.** The App Store review sheet is requested only after the third moment marked as helped or really helped, and only in the native app. Closing with no rating does not count. A didn't-help rating does not count and does not reset the total. One request per install.
- **Paywall copy.** English and Hebrew list only what the app does: Premium for unlimited children, each with their own profile; earlier moments (including what didn't help) used in the next answer; moments stored on this device and not used to train models. One child stays free with no time limit. The 7-day free trial is unchanged.
- **Support email.** Store contact is `omer+support@kidsit.ai`.
- **Google Play subscription wording.** Cancel, restore, and "no subscription found" copy on Android names Google Play (Payments & subscriptions) instead of Apple ID.

---

## [1.0.0] — 2026-05-16

First public release. Submitted to App Store Review on 2026-05-16. iOS build **1.0 (2)**.

### Added — core experience

- **Press-and-hold microphone** records the parent's story in their own words.
- **Voice transcription** via OpenAI Whisper, proxied through Netlify Functions.
- **Structured AI guidance** via OpenAI `gpt-4o-mini`, returning four sections:
  - **What happened** — judgment-free recap in the parent's register
  - **Why it happened** — developmental + emotional read with a kinder second interpretation
  - **What to try next time** — three specific actions, each with the exact sentence to say
  - **Tonight, before bed** — one warm reconnection line
- **Type-it-out fallback** for when voice isn't ideal.
- **Smart prompt context**: past moments scored by recency (0–40) + Jaccard keyword overlap with current story (0–30) + feedback signal (0–30, with "didn't help" weighted heaviest). Top 5 fed back chronologically into every new prompt with explicit "this helped" / "this didn't help" annotations.

### Added — per-kid memory

- **Per-child profiles**: each kid has their own name, age, color, and full moment history.
- **"Did it work?" feedback**: 4-way rating (got worse / about the same / helped / really helped) plus optional note, captured after every response and persisted to history. Drives the smart prompt context scoring.
- **Inline feedback in History detail**: tap any past moment in the History tab to expand the full AI guidance, set or change the rating retroactively, and read the saved note.
- **Adaptive kid selector** on Home: numbered "1" badge above the picker, contextual headline ("What happened with *Maya*?"), pill cards for 1–2 kids, horizontal-scroll avatar row with "+ Add" affordance for 3+.

### Added — subscriptions

- **Free tier** (no time limit): 1 kid, all features.
- **Kidsit AI Premium Monthly** — $9.99/month, **7-day free trial** for new subscribers.
- **Kidsit AI Premium Yearly** — $59.99/year, **7-day free trial** for new subscribers.
- StoreKit 2 IAP via RevenueCat.
- **Apple's introductory offer** powers the trial — no localStorage timer, no app-managed countdown. Apple enforces "one trial per Apple ID per subscription group."
- **Hide-but-keep**: locked kids' history is preserved on-device when subscription lapses; reappears instantly on resubscribe.
- **Restore Purchase** in the paywall footer and on the Subscription screen.
- **Subscription management** accessible from Settings → Subscription.
- **Auto-renewal disclosure** in paywall footer per App Store guideline 3.1.2(a).

### Added — surrounding UX

- **Welcome → Onboarding → Paywall → app** first-launch flow with skippable paywall ("Maybe later — try with 1 kid free").
- **Two flow styles**: guided (one question at a time, default) and dense (single page).
- **Three themes**: warm cream, clinical blue, dusk navy.
- **Settings**: theme, flow, clear data, About & disclaimer card, subscription row contextual to entitlement state.
- **Clinical disclaimer** copy on Welcome screen and in Settings → About — explicitly "not medical or psychological service."

### Added — iOS native

- iPhone-only build (`TARGETED_DEVICE_FAMILY = 1`), bundle ID `ai.kidsit.app`.
- Branded app icon (15 sizes, all opaque, no alpha — passes Apple's marketing-icon check).
- Branded splash screen with dark navy background sampled from the artwork to eliminate the boot transition flash.
- Capacitor keyboard plugin: `resize: "none"` + `setScroll({ isDisabled: true })` so the keyboard never pushes the top bar above the safe area; `setAccessoryBarVisible({ isVisible: true })` for the Done button.
- Capacitor splash plugin: `launchAutoHide: false`, hidden manually from JS after React mounts.
- Long-press magnifier suppressed on all buttons (`-webkit-touch-callout: none`, `-webkit-user-select: none`).
- Encryption compliance pre-declared via `ITSAppUsesNonExemptEncryption=false` so future uploads skip the Missing Compliance modal.
- Top/bottom safe-area padding hardened (`max(96px, env(safe-area-inset-top, 0px) + 36px)` for the top bar, `max(56px, env(safe-area-inset-bottom, 0px) + 22px)` for the tab bar).

### Added — privacy & security

- **OpenAI API key off-device.** Lives only as a Netlify environment variable; the iOS binary contains no third-party credentials. All OpenAI calls go through the proxy at `https://kidsai-app.netlify.app/api/{guidance,transcribe}`.
- All child profiles, story text, and history stored locally in `localStorage`. No server-side persistence.
- HTTPS-only networking (ATS strict).
- App Privacy nutrition label declares: User Content (Audio Data, Other User Content) + Purchases — all "App Functionality, Not Linked to User, Not Used for Tracking."

### Added — marketing

- Privacy Policy hosted at https://kidsit.ai/privacy.
- Terms of Service hosted at https://kidsit.ai/terms.
- 5 composed marketing screenshots, exported at every ASC iPhone device size (6.9", 6.5", 6.3", 6.1") via headless Chromium (`marketing/render.mjs`).
- Product Hunt + Twitter + LinkedIn launch copy in `marketing/LAUNCH.md`.
- Paste-ready App Store Connect copy in `marketing/APP_STORE.md` (description, keywords, age rating answers, IAP review notes).

### Tech stack

| Layer | Tech |
| ----- | ---- |
| UI | React 18 + Vite |
| Native shell | Capacitor 8 (iOS only) |
| Plugins | `@revenuecat/purchases-capacitor`, `@capacitor/keyboard`, `@capacitor/splash-screen` |
| AI | OpenAI `gpt-4o-mini` (responses), `whisper-1` (transcription) — proxied via Netlify Functions |
| Subscriptions | RevenueCat + Apple StoreKit 2 |
| Storage | `localStorage` for settings, kids, history |
| Hosting | kidsit.ai (marketing/legal), kidsai-app.netlify.app (API proxy) |

---

## Version conventions

- **MAJOR** (`2.0.0`) — breaking changes to the local-storage schema, kid profile format, or stored history. Existing user data needs a migration.
- **MINOR** (`1.1.0`) — new features (a new tab, a new theme, a new flow style, deeper guidance).
- **PATCH** (`1.0.1`) — bug fixes, copy tweaks, UI polish. No data-format changes. Most weekly cadence.

Build numbers (`CURRENT_PROJECT_VERSION`) bump on every TestFlight upload regardless of marketing version. So `1.0.0` could have multiple builds (`1.0(1)`, `1.0(2)`, …) while iterating before App Store approval.
