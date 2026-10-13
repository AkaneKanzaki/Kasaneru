// Copies the custom torii launcher icons from resources/launcher-icons/
// into the Android project. The android/ folder is gitignored and
// regenerable via `npx cap add android`, so the icons must be re-applied
// after every fresh platform add — this runs automatically on every
// `npm run build` (skipped gracefully when android/ doesn't exist).
//
//   node scripts/sync-android-icons.mjs
//
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'resources', 'launcher-icons');
const DEST = join(ROOT, 'android', 'app', 'src', 'main', 'res');

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

try {
  if (!existsSync(DEST)) {
    console.log('android/ folder not found — launcher icon sync skipped.');
    process.exit(0);
  }
  let n = 0;
  for (const src of walk(SRC)) {
    const rel = src.slice(SRC.length + 1);
    const dest = join(DEST, rel);
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(src, dest);
    n++;
  }
  console.log(`launcher icons synced (${n} files).`);
} catch (e) {
  console.log('launcher icon sync skipped: ' + (e && e.message ? e.message : e));
  process.exit(0);
}
