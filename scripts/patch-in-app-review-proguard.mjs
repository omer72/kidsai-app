// The in-app-review plugin still asks AGP for proguard-android.txt, which
// current Android Gradle Plugin rejects. Rewrite that one filename so the
// Android build works on macOS and Linux. Missing node_modules is fine:
// postinstall can run before the plugin is unpacked in some installers.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const file = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'node_modules/@capacitor-community/in-app-review/android/build.gradle',
);

if (!existsSync(file)) process.exit(0);

const src = readFileSync(file, 'utf8');
const next = src.replaceAll('proguard-android.txt', 'proguard-android-optimize.txt');
if (next !== src) writeFileSync(file, next);
