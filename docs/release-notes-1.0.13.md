# Kidsit AI 1.0.13 release notes

Paste-ready store text only. Nothing here describes a feature that is not in the git history.

- **App Store** text is what changed after iOS **1.0.12** (`45dd015`, 20 Oct 2026): on-device per-child summaries, optional anonymous insights, and guidance that sends only the open child's recent moments (`aa33936`, `2a76cfd`, `0ac09e8`).
- **Google Play** text is what changed after Android **1.0.11** (versionName 1.0.11, versionCode 16, `1046433`). Play never shipped 1.0.12, so this also includes the app changes already listed under changelog 1.0.12: the review prompt, Play subscription wording, the paywall copy, and blocking a moment when no child is added.

Character counts are JavaScript string length (UTF-16 code units), which is how both stores count. Limits: App Store 4000, Play 500.

Hebrew in the app itself is older than Android 1.0.11, so it is not listed as new on Play. The 1.0.12 changelog already told App Store readers about Hebrew.

## App Store (English)

4000 character limit. This text is 998 characters.

```
A summary for each child, on this device. It shows the kinds of moments you logged this week or today, and which approaches helped. It is built from moments already stored on the phone. There is no extra AI call.

You can turn on a reminder for that summary. The notification says only that the summary is ready. It does not include a child's name.

Anonymous insights are optional and stay off until you turn them on. They are not sent from the website. On the phone, every send shows a preview and waits for you to confirm. You choose situation counts, which approaches helped, a 1–5 rating, and a short note. Names, email addresses, phone numbers, ID numbers, and links are removed from the note before it is sent. A send does not include the child's name, the story, the guidance, age, gender, profile notes, or an account id.

When you ask for guidance, only the child you have open is included, along with that child's recent moments. Other children's profiles and history stay on the device.
```

## App Store (Hebrew)

4000 character limit. This text is 732 characters.

```
סיכום לכל ילד, על המכשיר. רואים אילו סוגי רגעים נרשמו השבוע או היום, ואילו גישות עזרו. הסיכום נבנה מהרגעים שכבר שמורים בטלפון, בלי קריאה נוספת למודל.

אפשר להפעיל תזכורת לסיכום. ההתראה אומרת רק שהסיכום מוכן, בלי שם של ילד.

שיתוף תובנות אנונימי הוא אופציונלי, ונשאר כבוי עד שמפעילים אותו. מהאתר לא נשלח כלום. בטלפון כל שליחה מציגה תצוגה מקדימה ומחכה לאישור. בוחרים אם לכלול ספירות לפי סוג מצב, אילו גישות עזרו, דירוג מ־1 עד 5, והערה קצרה. שמות, כתובות אימייל, מספרי טלפון, מספרי זהות וקישורים מוסרים מההערה לפני השליחה. השליחה לא כוללת שם של ילד, את הסיפור, את ההנחיה, גיל, מגדר, הערות בפרופיל, או מזהה חשבון.

כשמבקשים הנחיה, נכלל רק הילד שפתוח עכשיו, יחד עם הרגעים האחרונים שלו. פרופילים והיסטוריה של ילדים אחרים נשארים על המכשיר.
```

## Google Play (English)

500 character limit. This text is 430 characters.

```
Since 1.0.11: a per-child summary stays on this device, with an optional reminder that does not include a name. Anonymous insights stay off until you preview and confirm a send. Guidance includes only the open child's recent moments. A review is requested only after three moments you marked as helped. Subscription screens name Google Play. You can't log a moment until a child is added. The paywall lists only what the app does.
```

## Google Play (Hebrew)

500 character limit. This text is 332 characters.

```
מאז 1.0.11: סיכום לכל ילד נשאר על המכשיר, עם תזכורת אופציונלית בלי שם. תובנות אנונימיות כבויות עד תצוגה מקדימה ואישור. הנחיה כוללת רק את הרגעים האחרונים של הילד הפתוח. בקשת דירוג רק אחרי שלושה רגעים שסימנתם שעזרו. מסכי המנוי מציינים את Google Play. אי אפשר לרשום רגע לפני שמוסיפים ילד. מסך התשלום מתאר רק את מה שהאפליקציה באמת עושה.
```
