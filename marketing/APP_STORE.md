# App Store submission — paste-ready copy

Everything you need to fill in App Store Connect for **Kidsit AI - Parent Coach**. Copy each block straight into the matching ASC field.

---

## App Information

| Field | Value |
| ----- | ----- |
| **Name** (already set) | `Kidsit AI - Parent Coach` |
| **Bundle ID** | `ai.kidsit.app` |
| **SKU** | `kidsai-ios-001` |
| **Primary language** | English (U.S.) |
| **Primary category** | Lifestyle |
| **Secondary category** | Education *(or leave blank)* |
| **Content rights** | "Does your app contain, display, or access third-party content?" → **No** |

### Why Lifestyle (not Health & Fitness)

Health & Fitness invites stricter scrutiny of the clinical disclaimer. Lifestyle / Parenting matches how Apple frames apps like Cozi, Huckleberry, and Daylio — and we already have the medical-info disclosure logged in the Age Rating answers, which covers the substance.

---

## Subtitle (30 characters)

```
Calm guidance for hard moments
```

## Promotional Text (170 characters — updateable any time without re-review)

```
Whisper what just happened with your child. Get warm, science-backed guidance in seconds — without judgment, without lectures.
```

---

## Description (≤4,000 characters)

```
Kidsit AI is the parenting companion you reach for at 6 PM when your toddler is on the floor and you've run out of ideas.

WHAT IT DOES
Press and hold the mic. Tell Kidsit AI what just happened in plain language — no journaling, no forms. In about ten seconds you'll get back four things you can actually use:

• WHAT HAPPENED — a clear, judgment-free recap in your own register
• WHY IT HAPPENED — the developmental and emotional read, with a kinder second interpretation
• WHAT TO TRY NEXT TIME — three specific actions, including a literal sentence you can say out loud
• TONIGHT, BEFORE BED — one warm thing to say at bedtime to reconnect

Grounded in the Adlerian, Haim Ginott, and Faber–Mazlish parenting tradition. The tone is a calm friend with a developmental-psych background — not a clinical report, not a moralizing lecture.

PER-CHILD MEMORY
Each child gets their own profile. Kidsit AI remembers past moments for that specific kid and feeds them back into the next answer so the guidance gets smarter over time. When you mark something as "didn't help," the next answer won't repeat it — it tries a different angle instead.

PRIVATE BY DESIGN
Your moments and child profiles live on your device. We don't sell data, we don't run ads, and we don't train models on what you write.

FEATURES
• Press-and-hold voice or type — your choice
• Per-child profiles with patterns over time
• "How did it go?" feedback after each response so the coach learns
• Beautifully readable history of every moment you logged
• Two flow styles: guided (one question at a time) or dense (all on one page)
• Three themes: warm cream, clinical blue, dusk navy

START FREE — TRY WITH ONE CHILD
You can use Kidsit AI free with one child, no time limit. Add multiple children, unlock the full experience, and start your free trial inside the app.

SUBSCRIPTION
• Kidsit AI Premium Yearly — $59.99/year (7-day free trial for new subscribers)
• Kidsit AI Premium Monthly — $9.99/month
Subscriptions auto-renew unless cancelled at least 24 hours before the end of the current period. Payment is charged to your Apple ID. Manage or cancel anytime in Settings → Apple ID → Subscriptions.

IMPORTANT
Kidsit AI is not a medical or psychological service. It is a reflective parenting companion. It does not diagnose, treat, or replace care from a qualified professional. If you're worried about your child's safety, development, or mental health — or your own — please speak with a pediatrician, therapist, or licensed clinician.

Built by a parent, for parents.

Privacy: https://kidsit.ai/privacy
Terms: https://kidsit.ai/terms
```

---

## Keywords (100 characters max, comma-separated, no spaces after commas)

```
parenting,toddler,kids,tantrum,child,advice,coach,family,mom,dad,mindful,calm,gentle,behavior
```

*93 chars used — 7 left to experiment with ASO variants.*

### ASO alternatives to test if rankings disappoint

Pull one out, swap one in. Don't waste keyword budget on words that already appear in **Title** or **Subtitle** — Apple indexes those separately.

- `discipline` — high intent, low competition
- `meltdown` — exact-match user search term
- `mindfulparenting` — long-tail
- `gentleparenting` — long-tail
- `bedtime` — situational
- `parentgoals` — broader emotional discovery

---

## URLs

| Field | Value |
| ----- | ----- |
| **Privacy Policy URL** | `https://kidsit.ai/privacy` |
| **Terms of Use URL (EULA)** | `https://kidsit.ai/terms` |
| **Support URL** | `https://kidsit.ai/support` *(or `https://kidsit.ai` if you don't have a support page yet)* |
| **Marketing URL** *(optional)* | `https://kidsit.ai` |

---

## Age Rating

Answer **No** to every question in the Age Rating questionnaire **except**:

| Question | Answer |
| -------- | ------ |
| **Medical/Treatment Information** | **Infrequent/Mild** |

All others — violence, profanity, sexual content, drugs, gambling, horror, unrestricted web access, user-generated content shared — answer **None / No**.

This produces a **4+** rating with the medical-info disclosure logged, which matches the clinical disclaimer copy in Welcome + Settings → About.

---

## App Privacy ("Nutrition Label")

In ASC → **App Privacy → Data Types → Edit**, declare:

### User Content — Audio Data
- **Used for:** App Functionality
- **Linked to user:** No
- **Used for tracking:** No
- *Reason: parent's voice is sent to OpenAI Whisper for transcription via our server; not stored, not linked to identity.*

### User Content — Other User Content (typed story / kid names / history)
- **Used for:** App Functionality
- **Linked to user:** No
- **Used for tracking:** No

### Purchases
- **Used for:** App Functionality
- **Linked to user:** No
- **Used for tracking:** No

**Everything else:** No data collected. No identifiers used for tracking. No third-party analytics.

---

## App Review Information (notes to the reviewer)

In ASC → **App Information → Notes** (free-text field shown to the reviewer), paste:

```
Reviewer notes:

1. No account creation is required to test. On first launch the app
   goes Welcome → Onboarding → Paywall. The paywall offers a 7-day
   free trial on BOTH plans (Monthly and Yearly) — whichever the
   reviewer picks, the IAP sheet shows the introductory offer
   ("Free for 1 week, then $X/month or year"). You can also tap
   "Maybe later — try with 1 kid free" to enter the free tier and
   test most functionality without subscribing.

2. The microphone button on the Home tab is press-and-hold. Hold
   it for at least one second to record. Audio is sent to a server
   for transcription (OpenAI Whisper), then text + context is sent
   for guidance (OpenAI GPT-4o-mini). All API keys are server-side;
   the IPA contains no third-party credentials.

3. Subscription products: kidsit_monthly ($9.99/mo, 7-day free
   trial for new subscribers) and kidsit_yearly ($59.99/yr, 7-day
   free trial for new subscribers). Both use StoreKit 2 via
   RevenueCat. Restore is wired in the paywall footer and in
   Settings → Subscription.

4. The app gives reflective parenting guidance and explicitly states,
   in both Welcome and Settings → About, that it is not a medical
   or psychological service.

5. Privacy: all child data is stored locally on the device. Audio
   and text are sent transiently to OpenAI for processing and not
   retained by us.
```

---

## Demo Account

**Not required.** No login flow. Sandbox tester credentials from your Apple Developer account work for IAP testing.

---

## Screenshots

### Required device sizes

| Device | Resolution | Required? |
| ------ | ---------- | --------- |
| 6.7-inch iPhone | 1290 × 2796 | **Required** |
| 6.5-inch iPhone | 1284 × 2778 | Required (auto-derived from 6.7" if you skip) |
| 5.5-inch iPhone | 1242 × 2208 | Optional but recommended |
| iPad | various | Only if iPad declared as supported (currently not) |

### Source files

- **Mockup template:** `marketing/screenshots.html` — open in Chrome
- **Raw inputs:** `marketing/shots/01.png` … `marketing/shots/05.png` — drop your iOS Simulator captures here
- **Export workflow:** Chrome DevTools → ⋮ → **Capture node screenshot** on each `.stage` (DPR set to 2, gives you native 1290×2796)

### Per-screenshot copy

| # | What to capture | Headline overlay | Subhead |
| - | --------------- | ---------------- | ------- |
| 1 | Welcome screen | *Parenting is hard. **You don't have to do it alone.*** | Warm, science-backed guidance the moment you need it. |
| 2 | Home (kid selector + mic, mid-recording ideal) | Whisper what just happened. | Voice in. Clarity out. About 10 seconds. |
| 3 | Response screen (full structured guidance) | A kinder ***second look.*** | Not a lecture. Not a label. Three things you can actually try. |
| 4 | History tab (3+ logged moments) | Patterns become ***visible.*** | A coach that remembers what works for *your* child. |
| 5 | Paywall (plan picker + trial CTA) | The full Kidsit AI, ***at your fingertips.*** | Unlimited kids · unlimited moments · private by design. + badge "7-DAY FREE TRIAL · CANCEL ANYTIME" |

---

## In-App Purchase metadata

Both products need a **Display Name** and **Description** for the App Store listing. Apple reads these from your IAP setup — make sure they're filled in App Store Connect → Subscriptions → *(each product)* → Localizations.

### Kidsit AI Premium Monthly

| | |
|---|---|
| **Display Name** | Kidsit AI Premium Monthly |
| **Description** | Unlimited children, unlimited moments, smarter guidance over time. Cancel anytime. |

### Kidsit AI Premium Yearly

| | |
|---|---|
| **Display Name** | Kidsit AI Premium Yearly |
| **Description** | Best value — same unlimited everything, billed once a year. Includes 7-day free trial. |

### Introductory Offer (on Yearly only)

| | |
|---|---|
| **Type** | Free Trial |
| **Duration** | 1 Week |
| **Eligibility** | New Subscribers |

---

## Submission checklist — what's left

- [ ] Capture 5 raw iOS Simulator screenshots → `marketing/shots/01.png` to `05.png`
- [ ] Open `marketing/screenshots.html` in Chrome, export each `.stage` at 1290×2796
- [ ] Upload screenshots to ASC → 6.7-Inch Display
- [ ] Paste subtitle, promotional text, description, keywords
- [ ] Pick categories (Lifestyle primary, Education secondary)
- [ ] Fill Age Rating questionnaire (everything No except Medical/Treatment → Infrequent/Mild)
- [ ] Fill App Privacy data types (User Content × 2 + Purchases, all App Functionality + Not Linked)
- [ ] Add Privacy + Terms + Support URLs
- [ ] Paste Reviewer Notes
- [ ] Fill IAP Display Name + Description on both products
- [ ] In Xcode: bump build number → Archive → Distribute → App Store Connect
- [ ] In ASC: select the build for the new app version
- [ ] **Submit for Review**

---

## After submission

- **Typical review time:** 24–48 hours for first submissions.
- **If rejected:** the rejection email has the specific guideline cited. Reply in the Resolution Center with a fix or a clarification — most rejections are resolvable in a single reply.
- **Common first-time rejection vectors for this app:**
  - 3.1.1 — IAP wording / restore implementation. *Covered.*
  - 3.1.2(a) — auto-renewal disclosure. *Covered.*
  - 5.1.1 — privacy policy. *Covered.*
  - 5.2.1 — health-adjacent guidance. *Covered by disclaimer copy and 4+ medical-info disclosure.*

If you hit any rejection, paste the reviewer's email here and I'll draft the reply.
