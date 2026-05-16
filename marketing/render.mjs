// Render each .stage in screenshots.html as a 1290×2796 PNG, then resize
// to every iPhone display size ASC asks for.
// Run: cd marketing && npx --yes playwright@1.60.0 install chromium && node render.mjs

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { mkdirSync, existsSync, copyFileSync } from 'fs';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HTML = `file://${resolve(__dirname, 'screenshots.html')}`;

// ASC device-size buckets:
const SIZES = {
  '6.9': [1320, 2868],
  '6.7': [1290, 2796],
  '6.5': [1284, 2778],
  '6.3': [1206, 2622],
  '6.1': [1170, 2532],
};
const NATIVE = SIZES['6.7']; // we render the HTML at 6.7"

const OUT = resolve(__dirname, 'composed');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: NATIVE[0], height: NATIVE[1] } });
await page.goto(HTML, { waitUntil: 'networkidle' });
// give web fonts time to load
await page.waitForTimeout(800);

const stages = await page.locator('.stage').all();
console.log(`found ${stages.length} stages`);

for (let i = 0; i < stages.length; i++) {
  const buf = await stages[i].screenshot({ omitBackground: false });
  const n = String(i + 1).padStart(2, '0');
  const native = resolve(OUT, `${n}.png`);
  await sharp(buf).png().toFile(native);
  console.log(`  ✓ ${n}.png (native 1290×2796)`);

  // generate every required size
  for (const [label, [w, h]] of Object.entries(SIZES)) {
    if (label === '6.7') continue; // already saved as native
    const dir = resolve(OUT, label);
    mkdirSync(dir, { recursive: true });
    await sharp(buf).resize(w, h, { fit: 'fill' }).png().toFile(resolve(dir, `${n}.png`));
  }
}

// also derive a top-level 6.7" copy for convenience
for (const n of ['01','02','03','04','05']) {
  const src = resolve(OUT, `${n}.png`);
  const dir = resolve(OUT, '6.7');
  mkdirSync(dir, { recursive: true });
  copyFileSync(src, resolve(dir, `${n}.png`));
}

await browser.close();
console.log('done. composed screenshots in marketing/composed/');
