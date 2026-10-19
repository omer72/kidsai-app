// Render each .stage in screenshots.html at every iPhone pixel size.
// Each size is a real viewport render, not a resize of the 6.7" frame.
// Run: cd marketing && node render.mjs [en|he]

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { mkdirSync, copyFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LANG = process.argv[2] === 'he' ? 'he' : 'en';

const SIZES = {
  '6.9': [1320, 2868],
  '6.7': [1290, 2796],
  '6.5': [1284, 2778],
  '6.3': [1206, 2622],
  '6.1': [1170, 2532],
};

const OUT = resolve(__dirname, LANG === 'he' ? 'composed/he' : 'composed');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

for (const [label, [w, h]] of Object.entries(SIZES)) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const html = `file://${resolve(__dirname, 'screenshots.html')}?lang=${LANG}&size=${label}`;
  await page.goto(html, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  const stages = await page.locator('.stage').all();
  if (stages.length !== 5) throw new Error(`expected 5 stages, found ${stages.length}`);
  const dir = resolve(OUT, label);
  mkdirSync(dir, { recursive: true });
  for (let i = 0; i < stages.length; i++) {
    const n = String(i + 1).padStart(2, '0');
    const file = resolve(dir, `${n}.png`);
    await stages[i].screenshot({ path: file, omitBackground: false });
    if (label === '6.7') copyFileSync(file, resolve(OUT, `${n}.png`));
    console.log(`  ✓ ${label}/${n}.png (${w}×${h})`);
  }
  await page.close();
}

await browser.close();
console.log(`done. composed screenshots in ${OUT}`);
