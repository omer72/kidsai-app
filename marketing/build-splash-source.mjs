// Build assets/splash.png (2732x2732) — icon centered on #040217 background.
// Used as source for @capacitor/assets to generate per-density splash drawables.

import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, '..');

const ICON = resolve(REPO, 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png');
const OUT = resolve(REPO, 'assets/splash.png');

const CANVAS = 2732;
const ICON_SIZE = 768; // ~28% of canvas — comfortable splash sizing

const iconResized = await sharp(ICON).resize(ICON_SIZE, ICON_SIZE).png().toBuffer();

await sharp({
  create: {
    width: CANVAS,
    height: CANVAS,
    channels: 3,
    background: { r: 0x04, g: 0x02, b: 0x17 },
  },
})
  .composite([
    {
      input: iconResized,
      top: Math.round((CANVAS - ICON_SIZE) / 2),
      left: Math.round((CANVAS - ICON_SIZE) / 2),
    },
  ])
  .png()
  .toFile(OUT);

console.log(`wrote ${OUT}`);
