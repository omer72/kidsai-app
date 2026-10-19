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
  { folder: '', width: 430, height: 932, out: 'shots' },
  { folder: '6.1', width: 390, height: 844, out: 'shots' },
  { folder: '6.3', width: 402, height: 874, out: 'shots' },
  { folder: '6.5', width: 428, height: 926, out: 'shots' },
  { folder: '6.9', width: 440, height: 956, out: 'shots' },
  // Play phone slot is 9:16. 360×640 at 3x is 1080×1920, ratio 1.778.
  { folder: '', width: 360, height: 640, out: 'play', platform: 'android', sat: 28, sab: 20, sax: 16 },
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
  const rows = he
    ? [
        { title: 'צורך בשליטה, לא התרסה', where: 'public', mood: 'upset', when: 'יום ב׳, 18:04', at: '2026-10-12T18:04:00Z', story: 'הפעוטה נפלה על הרצפה בחניון של הפארק ולא הסכימה לעלות לאוטו.' },
        { title: 'איסוף קשה מהפארק', where: 'outside', mood: 'tired', when: 'יום א׳, 16:20', at: '2026-10-11T16:20:00Z', story: 'היא לא רצתה לעזוב את המגלשה, ואחרי שתי דקות של שכנוע התחילה לבכות.' },
        { title: 'ההרדמה לקחה שלושה ניסיונות', where: 'inside', mood: 'anxious', when: 'שבת, 20:15', at: '2026-10-10T20:15:00Z', story: 'ביקשה עוד מים, עוד סיפור, ואז קמה מהמיטה פעמיים.' },
      ]
    : [
        { title: 'A need for control, not defiance', where: 'public', mood: 'upset', when: 'Mon, 6:04 PM', at: '2026-10-12T18:04:00Z', story: 'She dropped onto the floor in the park parking lot and would not get in the car.' },
        { title: 'A rough pickup from the park', where: 'outside', mood: 'tired', when: 'Sun, 4:20 PM', at: '2026-10-11T16:20:00Z', story: 'She did not want to leave the slide, and after a short wait she started to cry.' },
        { title: 'Bedtime took three tries', where: 'inside', mood: 'anxious', when: 'Sat, 8:15 PM', at: '2026-10-10T20:15:00Z', story: 'She asked for more water, one more book, then got out of bed twice.' },
      ];
  return rows.map((row) => ({
    id: Date.parse(row.at),
    kidId: 'noa',
    title: row.title,
    story: row.story,
    where: row.where,
    mood: row.mood,
    when: row.when,
    feedback: null,
    note: null,
    response: { title: row.title, summary: row.story, sections: [] },
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

function shotDir(lang, size) {
  if (size.out === 'play') return resolve(root, lang === 'he' ? 'play/he' : 'play');
  return resolve(root, lang === 'he' ? 'shots/he' : 'shots', size.folder);
}

async function shoot(page, lang, size, name) {
  const dir = shotDir(lang, size);
  mkdirSync(dir, { recursive: true });
  const file = resolve(dir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(' ', file.replace(root + '/', ''));
}

async function reveal(page, selector, scrollerSelector) {
  await page.evaluate(({ selector, scrollerSelector }) => {
    const el = document.querySelector(selector);
    const scroller = document.querySelector(scrollerSelector);
    if (!el || !scroller) return;
    const tab = document.querySelector('[data-tabbar]');
    const limit = (tab ? tab.getBoundingClientRect().top : scroller.getBoundingClientRect().bottom) - 12;
    const bottom = el.getBoundingClientRect().bottom;
    if (bottom > limit) scroller.scrollTop += bottom - limit;
  }, { selector, scrollerSelector });
  await page.waitForTimeout(180);
}

async function assertBox(page, selector, label, { aboveTab = false } = {}) {
  const info = await page.evaluate((selector) => {
    const el = document.querySelector(selector);
    if (!el) return { missing: true };
    const r = el.getBoundingClientRect();
    const tab = document.querySelector('[data-tabbar]');
    const sat = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--shot-sat')) || 0;
    return {
      top: r.top, bottom: r.bottom, left: r.left, right: r.right,
      w: window.innerWidth, h: window.innerHeight, sat,
      tabTop: tab ? tab.getBoundingClientRect().top : null,
    };
  }, selector);
  if (info.missing) throw new Error(`${label} not found`);
  const limit = aboveTab && info.tabTop != null ? info.tabTop - 2 : info.h - 2;
  if (info.top < -1 || info.bottom > limit + 1 || info.left < -1 || info.right > info.w + 1) {
    throw new Error(`${label} clipped ${JSON.stringify(info)}`);
  }
  return info;
}

async function capture(browser, lang, size) {
  const context = await browser.newContext({
    viewport: { width: size.width, height: size.height },
    deviceScaleFactor: 3,
    locale: lang === 'he' ? 'he-IL' : 'en-US',
    timezoneId: 'UTC',
    hasTouch: true,
    isMobile: true,
  });
  const sat = size.sat ?? 59;
  const sab = size.sab ?? 34;
  const sax = size.sax ?? 28;
  const android = size.platform === 'android';
  // A style node created in an init script is dropped when the parser builds
  // <html>. Inject into the document itself so the variables exist before
  // React reads them. CapacitorCustomPlatform is read when @capacitor/core loads.
  await context.route('**/*', async (route) => {
    if (route.request().resourceType() !== 'document') return route.continue();
    const response = await route.fetch();
    const body = (await response.text()).replace(
      '<head>',
      `<head><style>:root{--shot-sat:${sat}px;--shot-sab:${sab}px;--shot-sax:${sax}px}</style>` +
        (android ? '<script>window.CapacitorCustomPlatform={name:"android"}</script>' : ''),
    );
    await route.fulfill({ response, body });
  });
  const page = await context.newPage();
  await page.goto(base, { waitUntil: 'networkidle' });

  await load(page, lang, {});
  await shoot(page, lang, size, '01');

  await load(page, lang, { 'kidai.settings.v1': settings(false) });
  await clickText(page, lang === 'he' ? 'נסו את הרגע הראשון' : 'Try your first moment');
  await clickText(page, lang === 'he' ? 'דלג' : 'Skip');
  await page.waitForTimeout(300);
  await reveal(page, '[data-paywall-fine]', '[data-paywall-scroll]');
  const close = await assertBox(page, '[data-paywall-close]', 'paywall close');
  if (close.top + 0.5 < close.sat) throw new Error(`paywall close sits in the status bar ${JSON.stringify(close)}`);
  if (close.left < 12 || close.right > close.w - 12) throw new Error(`paywall close clipped by the corner ${JSON.stringify(close)}`);
  await assertBox(page, '[data-paywall-fine]', 'paywall fine print');
  const headline = await assertBox(page, '[data-paywall-headline]', 'paywall headline');
  if (headline.top < close.bottom - 2) throw new Error(`paywall headline runs under the close button ${JSON.stringify({ headline, close })}`);
  await shoot(page, lang, size, '05');

  await load(page, lang, {
    'kidai.settings.v1': settings(true),
    'kidai.kids.v1': [kid(lang)],
    'kidai.history.v1': history(lang),
  });
  await assertBox(page, '[data-type-link]', 'type link', { aboveTab: true });
  await shoot(page, lang, size, '02');

  await clickTab(page, 1);
  const titles = history(lang).map((row) => row.title);
  await page.waitForTimeout(200);
  const historyFit = await page.evaluate((titles) => {
    const tab = document.querySelector('[data-tabbar]');
    const limit = tab.getBoundingClientRect().top - 4;
    const boxes = titles.map((title) => {
      const el = [...document.querySelectorAll('div')].find((node) => node.childElementCount === 0 && node.textContent === title);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { title, top: r.top, bottom: r.bottom };
    });
    const last = boxes[boxes.length - 1];
    return { boxes, limit, overflow: last ? last.bottom - limit : 0 };
  }, titles);
  if (historyFit.boxes.some((box) => !box)) throw new Error(`history titles missing ${JSON.stringify(historyFit)}`);
  if (new Set(titles).size !== titles.length) throw new Error('history titles are not varied');
  if (historyFit.overflow > 0) {
    await page.evaluate((overflow) => {
      const scroller = document.querySelector('[data-kb-scroll]');
      if (scroller) scroller.scrollTop += overflow;
    }, historyFit.overflow);
    await page.waitForTimeout(180);
  }
  await shoot(page, lang, size, '04');

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
  await reveal(page, '[data-tonight]', '[data-kb-scroll]');
  await assertBox(page, '[data-tonight]', 'tonight card', { aboveTab: true });
  await shoot(page, lang, size, '03');

  await context.close();
}

const browser = await chromium.launch();
for (const lang of ['en', 'he']) {
  for (const size of SIZES) {
    console.log(`capturing ${lang} ${size.out === 'play' ? 'play' : (size.folder || '6.7')}`);
    await capture(browser, lang, size);
  }
}
await browser.close();
console.log('raw shots done');
