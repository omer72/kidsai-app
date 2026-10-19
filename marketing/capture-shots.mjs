// Capture raw app screens for the store frames.
// CSS viewports match the iPhone point sizes; deviceScaleFactor 3
// writes the pixel sizes already in marketing/shots/.
// Run from marketing/: node capture-shots.mjs [baseUrl]
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const root = dirname(fileURLToPath(import.meta.url));
const base = process.argv[2] || 'http://127.0.0.1:5173';

const SIZES = [
  { folder: '', width: 430, height: 932 },
  { folder: '6.1', width: 390, height: 844 },
  { folder: '6.3', width: 402, height: 874 },
  { folder: '6.5', width: 428, height: 926 },
  { folder: '6.9', width: 440, height: 956 },
];

const STORY = {
  en: 'My 2-year-old dropped onto the floor in the park parking lot and started screaming. Everyone was looking. I tried asking her twice.',
  he: 'הפעוטה שלי, בת שנתיים, נפלה לרצפה בחניית הפארק והתחילה לצרוח. כולם הסתכלו. ניסיתי לשאול אותה פעמיים.',
};

function kid(lang) {
  const he = lang === 'he';
  return {
    id: 'noa',
    name: he ? 'נועה' : 'Noa',
    initials: he ? 'נ' : 'N',
    color: '#E07A5F',
    birthdate: '2024-06-01',
    gender: 'girl',
    age: 2,
  };
}

function history(lang) {
  const he = lang === 'he';
  return [1, 2].map((id) => ({
    id,
    kidId: 'noa',
    title: he ? 'צורך בשליטה, לא התרסה' : 'A need for control, not defiance',
    story: STORY[lang],
    where: 'public',
    mood: 'upset',
    when: he ? 'יום ב׳, 18:04' : 'Mon, 6:04 PM',
    feedback: null,
    note: null,
    response: {
      title: he ? 'צורך בשליטה, לא התרסה' : 'A need for control, not defiance',
      summary: he
        ? 'בגיל שנתיים התפרקות היא דבר נפוץ כשרגע טוב נגמר.'
        : 'Two-year-olds often melt down when a good moment has to end.',
      sections: [],
    },
  }));
}

function settings(onboarded) {
  return {
    theme: 'warm',
    flow: 'A',
    fontSize: 'small',
    aiConsent: true,
    askedForReview: false,
    reviewUses: 0,
    onboarded,
    billing: { entitled: false, productId: null, expiresAt: null, inTrial: false, willRenew: false, syncedAt: 0 },
  };
}

async function clickTab(page, index) {
  const ok = await page.evaluate((index) => {
    const bottom = [...document.querySelectorAll('button')].filter((node) => {
      const box = node.getBoundingClientRect();
      return box.top > window.innerHeight - 160 && box.width > 20 && box.height > 20;
    });
    const maxTop = Math.max(...bottom.map((node) => node.getBoundingClientRect().top));
    const buttons = bottom.filter((node) => Math.abs(node.getBoundingClientRect().top - maxTop) < 2);
    if (!buttons[index]) return false;
    buttons[index].click();
    return true;
  }, index);
  if (!ok) throw new Error(`No tab button at index ${index}`);
  await page.waitForTimeout(300);
}

async function clickText(page, text) {
  const ok = await page.evaluate((text) => {
    const els = [...document.querySelectorAll('button')];
    const el = els.find((node) => (node.innerText || '').includes(text));
    if (!el) return false;
    el.click();
    return true;
  }, text);
  if (!ok) throw new Error(`No button containing ${JSON.stringify(text)}`);
  await page.waitForTimeout(250);
}

async function load(page, lang, data) {
  await page.evaluate(({ lang, data }) => {
    localStorage.clear();
    localStorage.setItem('kidai.lang.v1', lang);
    for (const [key, value] of Object.entries(data || {})) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }, { lang, data });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
}

async function shoot(page, lang, folder, name) {
  const dir = resolve(root, lang === 'he' ? 'shots/he' : 'shots', folder);
  mkdirSync(dir, { recursive: true });
  const file = resolve(dir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(' ', file.replace(root + '/', ''));
}

async function capture(browser, lang, size) {
  const context = await browser.newContext({
    viewport: { width: size.width, height: size.height },
    deviceScaleFactor: 3,
    locale: lang === 'he' ? 'he-IL' : 'en-US',
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await page.goto(base, { waitUntil: 'networkidle' });

  await load(page, lang, {});
  await shoot(page, lang, size.folder, '01');

  await load(page, lang, { 'kidai.settings.v1': settings(false) });
  await clickText(page, lang === 'he' ? 'נסו את הרגע הראשון' : 'Try your first moment');
  await clickText(page, lang === 'he' ? 'דלג' : 'Skip');
  await page.waitForTimeout(300);
  await shoot(page, lang, size.folder, '05');

  await load(page, lang, {
    'kidai.settings.v1': settings(true),
    'kidai.kids.v1': [kid(lang)],
    'kidai.history.v1': history(lang),
  });
  await shoot(page, lang, size.folder, '02');

  await clickTab(page, 1);
  await shoot(page, lang, size.folder, '04');

  await clickTab(page, 0);
  await clickText(page, lang === 'he' ? 'או הקלידו' : 'Or type it out');
  await page.locator('textarea').fill(STORY[lang]);
  await clickText(page, lang === 'he' ? 'המשך' : 'Continue');
  const chips = lang === 'he' ? ['בבית', 'נסער', 'רק אנחנו', 'נמוכה'] : ['Inside', 'Upset', 'Just us', 'Low'];
  for (let i = 0; i < chips.length; i++) {
    await clickText(page, chips[i]);
    await clickText(page, i < chips.length - 1 ? (lang === 'he' ? 'הבא' : 'Next') : (lang === 'he' ? 'קבל הכוונה' : 'Get guidance'));
  }
  await page.waitForTimeout(2200);
  await shoot(page, lang, size.folder, '03');

  await context.close();
}

const browser = await chromium.launch();
for (const lang of ['en', 'he']) {
  for (const size of SIZES) {
    console.log(`capturing ${lang} ${size.folder || '6.7'}`);
    await capture(browser, lang, size);
  }
}
await browser.close();
console.log('raw shots done');
