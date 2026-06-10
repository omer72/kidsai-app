# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Kidsit AI is a parental-guidance mobile app. **Vite + React + Capacitor**, iOS-only (Android scaffolding has been removed). Source lives in `src/`, build output in `dist/`, Capacitor's `webDir` points at `dist/`. The native iOS shell wraps the WebView and is built with Swift Package Manager (no CocoaPods).

## Commands

```
npm run dev       # Vite dev server on :5173 (HMR for browser preview)
npm run build     # Vite production build → dist/
npm run ios       # vite build && cap sync ios && open Xcode
npm run cap:sync  # vite build && cap sync (after any src/ change)
```

No tests, no lint setup. Don't add them unless asked.

## Architecture

**Theme system: `tokens` is mutated synchronously in `App.jsx`.** `src/theme.js` exports a mutable `tokens` object and an `applyTheme(themeName)` that does `Object.assign(tokens, THEMES[name])`. `App.jsx` calls `applyTheme(settings.theme)` in the component body (not in an effect) BEFORE children render — that's load-bearing. If you move it to `useEffect`, children render once with stale colors before the effect runs.

**State + persistence:** `src/storage.js` reads/writes three localStorage keys: `kidai.settings.v1` (apiKey, theme, flow, onboarded), `kidai.kids.v1` (children list), `kidai.history.v1` (logged moments). Settings and kids load lazily via `useState(() => loadX())` in `App.jsx`. Mutations go through `setSettings` / `setKids` wrappers that persist on every change.

**Phase machine:** `App.jsx` has a top-level `phase` state: `welcome → onboarding → paywall → app`. The `app` phase mounts `MainApp`, which has its own `tab` state (`home | history | kids | settings`) and a `flowState` machine for the home tab (`compose → thinking → response → followup`). On finish, the moment is appended to history via `appendHistory()`.

**OpenAI integration:** `src/openai.js` builds a prompt from `{story, ctx, kid}`, calls `gpt-4o-mini` with `response_format: json_object`, and returns a parsed object matching `DEMO_RESPONSE`'s shape from `constants.js`. Key is user-supplied via the Settings screen (`dangerouslyAllowBrowser: true`). When no key is set, `MainApp.submit` falls back to `DEMO_RESPONSE` after a fake delay so the UI is still demoable. The `[SET API KEY]` pill in the top bar nudges the user to Settings.

**iOS frame vs fullscreen:** `App.jsx` computes `isFullscreenViewport()` once at mount from `window.Capacitor?.isNativePlatform?.()` and a `max-width: 500px` media query. If fullscreen, content fills the viewport; otherwise it's wrapped in `IOSDevice` (a 402×874 fake iOS frame in `IOSFrame.jsx`). Pre-app screens (Welcome/Onboarding/Paywall) accept a `fullscreen` prop and switch between fixed `top: 58` and `env(safe-area-inset-top)` for status-bar safe area.

**Capacitor sync model:** Editing `src/` does NOT automatically update the iOS project. Run `npm run cap:sync` (or `npm run ios`, which syncs first). The sync copies `dist/` → `ios/App/App/public/`. Don't edit that copy directly.

## Known gotchas

- **Mic recording is real.** `src/recorder.js` uses `MediaRecorder` + `navigator.mediaDevices.getUserMedia({ audio: true })`, called from `src/components/FlowB.jsx`. iOS needs `NSMicrophoneUsageDescription` in `Info.plist`; Android needs `RECORD_AUDIO` + `MODIFY_AUDIO_SETTINGS` in `AndroidManifest.xml` (already there). Capacitor 8's `BridgeWebChromeClient` handles the OS prompt automatically on first `getUserMedia` call.
- **No IAP yet.** The Paywall screen's "Start trial" button just sets `settings.onboarded = true` and drops into the app. Trial / lapsed / subscription screens were not ported — they belong with the payment work.
- **`dangerouslyAllowBrowser: true`** is acceptable here because the key is user-supplied and stays on-device. If you later add a backend proxy, switch to calling your proxy instead and remove the flag.
- **Don't reintroduce window globals.** Everything is ES modules now. Imports must be from relative paths under `src/`.

## gstack

Use the `/browse` skill from gstack for all web browsing. Never use `mcp__claude-in-chrome__*` tools.

Available gstack skills:
`/office-hours`, `/plan-ceo-review`, `/plan-eng-review`, `/plan-design-review`, `/plan-devex-review`, `/plan-tune`, `/design-consultation`, `/design-shotgun`, `/design-html`, `/design-review`, `/spec`, `/autoplan`, `/review`, `/codex`, `/cso`, `/ship`, `/land-and-deploy`, `/landing-report`, `/canary`, `/benchmark`, `/benchmark-models`, `/health`, `/browse`, `/open-gstack-browser`, `/scrape`, `/skillify`, `/pair-agent`, `/qa`, `/qa-only`, `/devex-review`, `/ios-qa`, `/ios-fix`, `/ios-design-review`, `/ios-sync`, `/ios-clean`, `/setup-browser-cookies`, `/setup-deploy`, `/setup-gbrain`, `/sync-gbrain`, `/retro`, `/investigate`, `/document-release`, `/document-generate`, `/make-pdf`, `/careful`, `/freeze`, `/guard`, `/unfreeze`, `/gstack-upgrade`, `/context-save`, `/context-restore`, `/learn`
