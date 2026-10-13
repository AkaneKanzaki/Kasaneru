// Syncs android/app/build.gradle versionName from package.json so the
// version shown in Android Settings always matches the app's version.
// versionCode is left alone (bump it manually for Play Store releases).
// Runs automatically on every `npm run build`; skipped gracefully when
// android/ doesn't exist.
//
//   node scripts/sync-android-version.mjs
//
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BUILD_GRADLE = join(ROOT, 'android', 'app', 'build.gradle');

try {
  if (!existsSync(BUILD_GRADLE)) {
    console.log('android/ folder not found — version sync skipped.');
    process.exit(0);
  }
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  const version = pkg.version;
  if (!version) {
    console.log('package.json has no version — version sync skipped.');
    process.exit(0);
  }
  const target = `versionName "${version}"`;
  let src = readFileSync(BUILD_GRADLE, 'utf8');
  if (src.includes(target)) {
    console.log(`versionName already ${version} — no changes.`);
    process.exit(0);
  }
  if (!/versionName\s+"[^"]*"/.test(src)) {
    console.log('versionName line not found — version sync skipped.');
    process.exit(0);
  }
  src = src.replace(/versionName\s+"[^"]*"/, target);
  writeFileSync(BUILD_GRADLE, src);
  console.log(`OK: versionName synced to ${version} in android/app/build.gradle`);
} catch (e) {
  console.log('version sync skipped: ' + (e && e.message ? e.message : e));
  process.exit(0);
}
