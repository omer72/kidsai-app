// Render marketing/feature-graphic.html to play/feature-1024x500.png
// Run: cd marketing && node render-feature-graphic.mjs

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HTML = `file://${resolve(__dirname, 'feature-graphic.html')}`;
const OUT_DIR = resolve(__dirname, 'play');
mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1024, height: 500 },
  deviceScaleFactor: 1,
});
await page.goto(HTML, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200); // let fonts settle

const out = resolve(OUT_DIR, 'feature-1024x500.png');
await page.screenshot({ path: out, omitBackground: false, type: 'png' });
await browser.close();
console.log(`wrote ${out}`);
