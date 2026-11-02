// Marketing version shared by the iOS and Android projects. Vite injects it
// for the browser. The native app prefers App.getInfo().version, which is
// this same string (MARKETING_VERSION / versionName).

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export function readStoreVersion(rootDir = root) {
  const pbx = readFileSync(join(rootDir, 'ios/App/App.xcodeproj/project.pbxproj'), 'utf8');
  const gradle = readFileSync(join(rootDir, 'android/app/build.gradle'), 'utf8');
  const ios = [...new Set([...pbx.matchAll(/MARKETING_VERSION = ([0-9.]+);/g)].map((m) => m[1]))];
  const android = gradle.match(/versionName "([0-9.]+)"/)?.[1] || '';
  if (ios.length !== 1) {
    throw new Error(`Expected one MARKETING_VERSION, found ${ios.join(', ') || 'none'}`);
  }
  if (ios[0] !== android) {
    throw new Error(`iOS MARKETING_VERSION ${ios[0]} does not match Android versionName ${android || 'none'}`);
  }
  return ios[0];
}
