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
