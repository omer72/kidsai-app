# Kidsit AI 1.0.14 release notes

Paste-ready store text only. Nothing here describes a feature that is not in the git history.

- Both stores: what changed after **1.0.13** (iOS build 9, Android versionCode 17, `23d0d1f`).
- The 3-answer limit is enforced by the server only after `AUTH_ENFORCE=true` is set in Netlify. Set it once 1.0.14 is live in both stores; until then every answer stays free, which the text below does not contradict.

Character counts are JavaScript string length (UTF-16 code units), which is how both stores count. Limits: App Store 4000, Play 500.

## App Store (English)

4000 character limit. This text is 738 characters.

```
Your first 3 answers are free. Open the app, tell Kidsit what happened, and get guidance before you see any subscription screen. The subscription screen now appears once, after your first answer, and you can close it and keep going.

The home screen shows how many free answers you have left. When they run out, the subscription screen opens instead of an error. Premium starts with a 7-day free trial for new subscribers.

Guidance and voice transcription now run on newer OpenAI models.

The app now sends anonymous usage counts, such as how many people finish setup or see the subscription screen. They carry no name, no story, and no account or device id.

After the first moment you mark as helpful, the app may ask you for a rating.
```

## App Store (Hebrew)

4000 character limit. This text is 594 characters.

```
3 התשובות הראשונות בחינם. פותחים את האפליקציה, מספרים מה קרה, ומקבלים הנחיה לפני שרואים מסך מנוי כלשהו. מסך המנוי מופיע עכשיו פעם אחת, אחרי התשובה הראשונה, ואפשר לסגור אותו ולהמשיך.

במסך הבית רואים כמה תשובות חינם נשארו. כשהן נגמרות, נפתח מסך המנוי במקום הודעת שגיאה. Premium מתחיל ב-7 ימי ניסיון חינם למנויים חדשים.

ההנחיה והתמלול של ההקלטות עובדים עכשיו על מודלים חדשים יותר של OpenAI.

האפליקציה שולחת עכשיו ספירות שימוש אנונימיות, למשל כמה מסיימים את ההיכרות או רואים את מסך המנוי. אין בהן שם, סיפור, או מזהה חשבון או מכשיר.

אחרי הרגע הראשון שסימנתם שעזר, האפליקציה עשויה לבקש מכם דירוג.
```

## Google Play (English)

500 character limit. This text is 478 characters.

```
Your first 3 answers are free, and the subscription screen now shows once, after your first answer, not during setup. The home screen shows free answers left; when they run out, the subscription screen opens instead of an error. Newer OpenAI models for guidance and voice. Anonymous usage counts with no name or id. The campaign tag from the Play link you installed from is saved with your subscription account. A rating request comes after the first moment you mark as helpful.
```

## Google Play (Hebrew)

500 character limit. This text is 373 characters.

```
3 התשובות הראשונות בחינם, ומסך המנוי מופיע עכשיו פעם אחת, אחרי התשובה הראשונה, ולא בזמן ההתקנה. במסך הבית רואים כמה תשובות חינם נשארו; כשהן נגמרות נפתח מסך המנוי במקום שגיאה. מודלים חדשים יותר של OpenAI להנחיה ולתמלול. ספירות שימוש אנונימיות, בלי שם או מזהה. תג הקמפיין מהקישור ל-Google Play שממנו התקנתם נשמר עם חשבון המנוי. בקשת דירוג מגיעה אחרי הרגע הראשון שסימנתם שעזר.
```
