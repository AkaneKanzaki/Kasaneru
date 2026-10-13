// Copies the torii splash art into every Android drawable folder.
// Run after `npx cap add android` (and after `npx cap sync android`
// if the android folder is recreated):
//
//   node scripts/sync-android-splash.mjs
//
import { copyFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function skip(msg) {
  console.log(msg);
  process.exit(0);
}

try {
const SRC = join(ROOT, 'resources', 'splash.png');
const ANDROID = join(ROOT, 'android', 'app', 'src', 'main', 'res');

if (!existsSync(SRC)) {
  console.error('splash.png not found in resources/');
  process.exit(1);
}
if (!existsSync(ANDROID)) {
  // Auto-skipped on web-only builds (no Android platform).
  console.log('android/ folder not found — splash sync skipped.');
  process.exit(0);
}

let n = 0;
for (const dir of readdirSync(ANDROID)) {
  const target = join(ANDROID, dir, 'splash.png');
  if (existsSync(target)) {
    copyFileSync(SRC, target);
    n++;
  }
}
console.log(`splash copied to ${n} drawable folders.`);
} catch (e) {
  skip('splash sync skipped: ' + (e && e.message ? e.message : e));
}
