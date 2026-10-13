// Disables edge-to-edge on Android: the WebView is inset inside the
// system bars (status & navigation) like a classic Android app —
// no dead space between the app bottom nav and the system nav,
// and no manual safe-area CSS is needed.
//
// Run once after `npx cap add android` (or when the android/
// folder is recreated):
//
//   node scripts/disable-android-edge-to-edge.mjs
//
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const configText = readFileSync(join(ROOT, 'capacitor.config.ts'), 'utf8');
const appId = (configText.match(/appId:\s*'([^']+)'/) || [])[1];
if (!appId) {
  console.error('appId not found in capacitor.config.ts');
  process.exit(1);
}

const mainActivity = join(
  ROOT, 'android', 'app', 'src', 'main', 'java',
  ...appId.split('.'), 'MainActivity.java',
);
if (!existsSync(mainActivity)) {
  console.log('android/ folder not found — no-edge skipped.');
  process.exit(0);
}

const MARKER = 'Kasaneru: disable edge-to-edge';
const LEGACY_MARKER = 'Kasaneru: matikan edge-to-edge'; // pre-1.1.0 marker, kept for idempotency
let src = readFileSync(mainActivity, 'utf8');

if (src.includes(MARKER) || src.includes(LEGACY_MARKER)) {
  console.log('already patched — no changes.');
  process.exit(0);
}
if (!src.includes('extends BridgeActivity')) {
  console.log('MainActivity template not recognized — no-edge skipped.');
  process.exit(0);
}

const anchor = 'public class MainActivity extends BridgeActivity {}';
if (!src.includes(anchor)) {
  console.log('MainActivity shape is non-standard — no-edge skipped.');
  process.exit(0);
}

src = src
  .replace(
    'import com.getcapacitor.BridgeActivity;',
    'import android.os.Bundle;\nimport androidx.core.view.WindowCompat;\nimport com.getcapacitor.BridgeActivity;',
  )
  .replace(
    anchor,
    `public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    // ${MARKER} — the WebView is inset inside the system bars,
    // so there is no dead space below the bottom nav.
    WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
  }
}`,
  );

writeFileSync(mainActivity, src);
console.log(`OK: edge-to-edge disabled in ${mainActivity}`);
