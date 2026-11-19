# Kidsit AI 1.0.18 release notes

Paste-ready store text only. Nothing here describes a feature that is not in the git history after 1.0.17 (`ff9c83d`).

- Both stores: a link from kidsit.ai (a blog post, or /app) opens the app. A cold launch opens Home to start a moment. A link while the app is already open leaves the current screen in place (`65d4562`, `77b7b20`).
- Not mentioned, on purpose: the link's source feeds the funnel (`65d4562`). That is measurement only.

Character counts are JavaScript string length (UTF-16 code units), which is how both stores count. Limits: App Store 4000, Play 500.

Play upload reads the Play sections from `release-notes/play/en-US.txt` and `release-notes/play/he-IL.txt`. Those files are the text below, with no extra heading.

## App Store (English)

4000 character limit. This text is 206 characters.

```
A link on kidsit.ai opens the app. A blog post and the app page both do this. The app opens on Home, so you can record or type what happened.

If the app is already open, you stay on the screen you were on.
```

## App Store (Hebrew)

4000 character limit. This text is 179 characters.

```
קישור באתר kidsit.ai פותח את האפליקציה. זה עובד מפוסט בבלוג ומעמוד האפליקציה. האפליקציה נפתחת במסך הבית, ואפשר להקליט או לכתוב מה קרה.

אם האפליקציה כבר פתוחה, נשארים במסך הנוכחי.
```

## Google Play (English)

500 character limit. This text is 180 characters.

```
A link on kidsit.ai opens the app. A blog post or the app page opens Home, so you can record or type what happened.

If the app is already open, you stay on the screen you were on.
```

## Google Play (Hebrew)

500 character limit. This text is 161 characters.

```
קישור באתר kidsit.ai פותח את האפליקציה. פוסט בבלוג או עמוד האפליקציה נפתחים במסך הבית, ואפשר להקליט או לכתוב מה קרה.

אם האפליקציה כבר פתוחה, נשארים במסך הנוכחי.
```
