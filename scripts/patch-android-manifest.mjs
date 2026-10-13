// Ensures AndroidManifest.xml declares the TTS engine query.
//
// On Android 11+ (API 30+), package visibility filtering prevents the app
// from binding to the system's text-to-speech engine unless the manifest
// contains:
//
//   <queries>
//     <intent>
//       <action android:name="android.intent.action.TTS_SERVICE" />
//     </intent>
//   </queries>
//
// Without it, TextToSpeech init fails and every speak() is silently a no-op
// (our JS wrapper swallows the error). This project targets API 36, so the
// declaration is mandatory. Runs automatically via `npm run build`;
// idempotent and skipped gracefully when android/ does not exist.
//
//   node scripts/patch-android-manifest.mjs
//
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = join(ROOT, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
const MARKER = 'Kasaneru: TTS engine query';

const QUERIES_BLOCK = `    <!-- ${MARKER} (required on API 30+ for TextToSpeech to bind) -->
    <queries>
        <intent>
            <action android:name="android.intent.action.TTS_SERVICE" />
        </intent>
    </queries>
`;

try {
  if (!existsSync(MANIFEST)) {
    console.log('AndroidManifest.xml not found — manifest patch skipped.');
    process.exit(0);
  }
  let src = readFileSync(MANIFEST, 'utf8');
  if (src.includes(MARKER)) {
    console.log('manifest already patched — no changes.');
    process.exit(0);
  }
  // <queries> must be a direct child of <manifest>; insert right after
  // the opening <manifest ...> tag (keeping the original blank line).
  const m = src.match(/<manifest[^>]*>\n/);
  if (!m) {
    console.log('manifest root tag not recognized — manifest patch skipped.');
    process.exit(0);
  }
  src = src.replace(m[0], m[0] + QUERIES_BLOCK);
  writeFileSync(MANIFEST, src);
  console.log(`OK: TTS queries block added to ${MANIFEST}`);
} catch (e) {
  console.log('manifest patch skipped: ' + (e && e.message ? e.message : e));
  process.exit(0);
}
