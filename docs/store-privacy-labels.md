# Store privacy labels — 1.0.13

`docs/store-privacy-labels.md` was not in the tree at `8780b5ad`. This file is the 1.0.13 questionnaire. Older write-ups that this replaces for the forms are `marketing/APP_STORE.md` (“App Privacy”) and `ANDROID_RELEASE.md` section 7 (“Data safety”). Discrepancies with those pages, with the public privacy policy, and with the code are at the bottom.

Checked against the app at that commit plus the 1.0.13 version bump. The insights server is not in this repository. It is `https://kidsit.ai/api/insights`. What that server stores is taken from the published policy at <https://kidsit.ai/en/privacy> (last updated 1 Nov 2026) and is marked as such when the app repo cannot prove it.

There is no ad SDK, no ATT prompt, and no `NSUserTrackingUsageDescription`. Capacitor’s own privacy manifest sets `NSPrivacyTracking` to false and collects no data types. The app does not read the IDFA.

## What the code sends

### Stays on the device

Child profiles, moments, ratings, moment notes, and the digest. The digest is counted on device from fixed templates. No model call. The optional reminder is a local notification with a fixed sentence and no child’s name (`src/notifications.js`). Settings → Clear all data deletes the on-device store.

### Guidance — `POST {VITE_API_BASE}/api/guidance`

Sent only after AI consent, and only when a guidance request is made.

Header, when billing is configured: `X-RC-User` set to the RevenueCat app user id (`src/openai.js`, `src/billing.js`).

Body (`src/guidanceRequest.js`):

- The story the parent just entered.
- Context enums: location category, parent mood, who else was there, urgency. The location is a picked category (inside, outside, public, car), not GPS.
- The open child only: local id, name, birth date, age, gender, new-sibling flag, profile notes, intake answers and short intake text.
- Up to eight of that child’s recent moments: clipped story, rating, time, place category, mood, and a short recap of the earlier guidance (summary, title, up to three advice headlines). The optional moment note is not included. Other children’s names, profiles, and moments are not included. The function drops them again if an older client still posts them.
- UI language.

The function (`netlify/functions/guidance.js`) checks the RevenueCat id against the entitlement, builds a prompt, and calls OpenAI `gpt-6-luna`. It does not write the prompt to a database. It logs the prompt only if `DEBUG_PROMPTS` is set. The RevenueCat id is used for that entitlement check. It is not interpolated into the prompt text. Up to five of the eight moments are quoted in the prompt.

### Transcription — `POST {VITE_API_BASE}/api/transcribe`

The recording, the UI language, and the same `X-RC-User` header. The function forwards the file to OpenAI Whisper and returns text. It does not store the file in this repo.

### Anonymous insights — `POST https://kidsit.ai/api/insights`

Native only. The web build never posts, even if a stored flag says sharing is on (`src/insights.js`, `src/platform.js`). Default is off (`shareInsights` backfills to false). Turning it on shows an explanation. Each send is a separate confirmation from a preview, and the parent can uncheck counts, approaches, the rating, and the note.

Request: `credentials: 'omit'`, `cache: 'no-store'`, header `Content-Type: application/json` only. No `X-RC-User`, no cookies, no RevenueCat id.

Body (`buildInsightsPayload` in `src/digest.js`):

| Field | Present | Contents |
| --- | --- | --- |
| `schema_v`, `taxonomy_v` | always | `1` |
| `period` | always | `week` or `day` |
| `period_key` | always | ISO week, such as `2026-W44`, including when the digest is daily. Not the calendar date. |
| `lang` | always | `en`, `he`, or `es` |
| `platform` | always | `ios` or `android` |
| `app_version` | always | Major.minor only. On a phone this is `App.getInfo().version` (`MARKETING_VERSION` / `versionName`). For 1.0.13 that is `1.0.13`, so the field is `"1.0"`. In a browser, Vite injects that same store version and `getInfo` is not called. |
| `situations` | always (may be `[]`) | Counts by a fixed situation id: `great`, `better`, `same`, `worse`, `unrated`. Each count is capped at 30. `unclassified` is omitted. |
| `moves` | only if any | Approach id plus `worked` and `not_worked`, capped at 30. |
| `rating` | only if chosen | Integer 1–5. |
| `free_text`, `free_text_scrubbed` | only if the note is non-empty after scrubbing | Note, max 500 characters, with child names, emails, phones, URLs, 9-digit ids, and full dates replaced. |

Not in the body: child id, names, stories, guidance text, age, birth date, gender, profile notes, moment notes, device id, install id, RevenueCat id.

### Purchases and affiliate

RevenueCat (`@revenuecat/purchases-capacitor`) holds an anonymous app user id and the subscription. The app does not see the card number.

Insert Affiliate runs only when `VITE_IA_COMPANY_CODE` is set. `.env.example` leaves it empty, and no production env file is in the repo. If a store build sets it, an affiliate code from a link is stored on the RevenueCat subscriber (`src/affiliate.js`). It is not added to the insights body.

### Not in the app

No user-supplied OpenAI key. No analytics or crash SDK in the app binary. No Firebase (`google-services.json` is absent, so the plugin is not applied). Website Google Analytics, described in the public policy, is not loaded by this Capacitor app.

## Linked to the user? Used for tracking?

Apple’s “linked” question means the data is associated with an identity (account, device, or other details) at collection, unless it was de-identified before it was collected. “Tracking” means linking this app’s data with other companies’ data for advertising or ad measurement, or sharing it with a data broker. First-party product analytics is not tracking.

| Data | Linked to the user? | Used for tracking? |
| --- | --- | --- |
| Voice recording | **Yes.** The file and `X-RC-User` are the same request. | **No.** |
| Story, open child’s profile, recent moments | **Yes.** The body includes the child’s name and birth date, and the same request carries `X-RC-User`. | **No.** |
| RevenueCat app user id | **Yes.** It is the identifier. | **No.** |
| Purchase status | **Yes.** It is stored on that RevenueCat id. | **No.** |
| Anonymous insights (counts, approaches, rating, note, language, platform, app version `"1.0"`, ISO week) | **No.** No identifier is sent. `credentials` is `omit`. | **No.** Purpose is to improve Kidsit. Not ads. |

The public policy says guidance prompts are not stored, recordings are not kept, and the RevenueCat id is not part of the text sent to the model. That is what `netlify/functions/guidance.js` does, apart from an optional `DEBUG_PROMPTS` log. It does not de-identify the request before Kidsit’s function receives it, so the App Store answer for those types is still **linked: Yes**.

## App Store App Privacy — answers to enter

**Do you or your third-party partners collect data from this app?** Yes.

**Data used to track the user:** none. Do not list any type in the tracking section. Do not add an ATT prompt. The binary has no tracking usage description.

Declare only these types. Leave every other type as not collected (no contact info, health, financial info, precise or coarse location, sensitive info, contacts, photos, email, browsing or search history, device ID, advertising data, crash or performance data).

### User Content → Audio Data

- Used for: **App Functionality**
- Linked to the user’s identity: **Yes**
- Used for tracking: **No**

### User Content → Other User Content

Covers the guidance story, the open child’s profile and recent moments, and the optional insight note.

- Used for: **App Functionality** and **Analytics**
- Linked to the user’s identity: **Yes** (the guidance content is linked; the insight note by itself is not, and the type-level answer follows the linked use)
- Used for tracking: **No**

### Identifiers → User ID

The RevenueCat app user id.

- Used for: **App Functionality**
- Linked to the user’s identity: **Yes**
- Used for tracking: **No**

### Purchases

- Used for: **App Functionality**
- Linked to the user’s identity: **Yes**
- Used for tracking: **No**

### Usage Data → Product Interaction

Optional insights: situation counts, approach counts, the 1–5 rating, language, platform, the coarse version string, and the ISO week. The digest itself is on device and is not this type.

- Used for: **Analytics**
- Linked to the user’s identity: **No**
- Used for tracking: **No**

## Google Play Data safety — answers to enter

**Does the app collect or share any of the required user data types?** Yes.

**Is all of the user data collected by your app encrypted in transit?** Yes. Guidance, transcription, insights, and RevenueCat use HTTPS.

**Do you provide a way for users to request that their data is deleted?** Yes, with the limits below. Do not claim that one anonymous submission can be looked up.

- On the device: Settings → Clear all data, and uninstalling the app.
- Guidance and recordings: the functions in this repo do not store them.
- Anonymous insights: the published policy says the row is stored under a random id, so one submission cannot be found from an account. It also says free text is deleted after 90 days, counts may be kept longer, and a parent can email and quote a note that is still inside those 90 days. That deletion job is not in this repository. Use <https://kidsit.ai/en/privacy> as the policy URL. Support address already used by the app: `omer+support@kidsit.ai`.

**Account creation:** the app has no account. The RevenueCat id is created by the SDK.

**Data shared:** No, for the types below, using Play’s service-provider exception. OpenAI processes voice and guidance for the answer. Netlify hosts those two functions. RevenueCat processes the app user id and purchases. The public policy says Vercel hosts the insights endpoint and Neon stores the anonymous rows. Those are processors for the purpose below, not sold, and not used for ads.

If the store binary sets `VITE_IA_COMPANY_CODE`, say so before submitting. This repo cannot see that env var. When it is set, an affiliate id can be written onto the RevenueCat subscriber after an affiliate link. It is not part of the insights body. The empty example env means the answers below do not declare Insert Affiliate.

| Play type | Collected | Shared | Optional | Purpose |
| --- | --- | --- | --- | --- |
| Personal info → Name | Yes (the open child’s name, on a guidance request) | No | The parent can decline AI consent. Guidance does not run without this send. | App functionality |
| Personal info → User IDs | Yes (RevenueCat app user id) | No | Sent when native billing is configured | App functionality |
| Personal info → Other info | Yes (birth date, age, gender, new-sibling flag, profile notes, intake) | No | Same consent gate as guidance | App functionality |
| Financial info → Purchase history | Yes (subscription state via RevenueCat and the store) | No | A subscription is optional. One child stays free. | App functionality |
| Audio → Voice or sound recordings | Yes | No | The parent can type instead of recording | App functionality |
| App activity → App interactions | Yes (optional insight counts, approach counts, 1–5 rating) | No | Off by default. Each send is confirmed. | Analytics |
| App activity → Other user-generated content | Yes (story, recent-moment text, and the optional insight note) | No | Guidance is consent-gated. The note is off unless the parent includes it. | App functionality, and Analytics for the insight note |

Do not declare: location, photos, contacts, SMS, device or other IDs, crash logs, diagnostics, health, or advertising data. The place and mood on a moment are categories the parent picks, not device location.

Do not declare the on-device digest as collected. It does not leave the phone. Local notification permission (`POST_NOTIFICATIONS`, plus `RECEIVE_BOOT_COMPLETED` and `WAKE_LOCK` from the plugin) does not send data. The app manifest removes `SCHEDULE_EXACT_ALARM`.

Play has no separate “linked” toggle. Use the table in “Linked to the user?” above if a reviewer asks. Insights are not linked. Guidance, audio, the RevenueCat id, and purchases are linked.

## Discrepancies

1. **`docs/store-privacy-labels.md` did not exist** on main at `8780b5ad`. The answers above are the new source for the forms.

2. **Other User Content cannot be “not linked” on the App Store form** just because the insight note is anonymous. The same data type is used for the guidance story, which is linked. `marketing/APP_STORE.md` now says linked Yes for that type, with Analytics as the extra purpose for the note.

3. **`ANDROID_RELEASE.md` says a user-supplied OpenAI key, if present, stays on the device.** The app has no settings field and no code path for a user-supplied OpenAI key. `src/openai.js` calls `VITE_API_BASE`. The key is a server env var. The same paragraph’s insights line (App interactions and other user-generated content, optional, Analytics, not shared, HTTPS) matches the code.

4. **90-day deletion of insight free text is not implemented in this repository.** The in-app copy and <https://kidsit.ai/en/privacy> both state it, and the policy says counts may be kept longer and that one anonymous row cannot be deleted without the parent quoting the text. Do not treat this repo as proof that the job runs. There is no insights function under `netlify/functions/`.

5. **`DEBUG_PROMPTS` can log a guidance prompt**, which includes the story and profile notes, to the function log. It is off unless that env var is set. The public policy says prompts are not stored. Confirm the production Netlify env does not set `DEBUG_PROMPTS` before answering that prompts are never retained.

6. **Insert Affiliate is unused in the checked-in env and is not part of the answers above.** A store build that sets `VITE_IA_COMPANY_CODE` would write an affiliate id onto the RevenueCat subscriber. Check the binary’s env before submitting. This repo cannot.
