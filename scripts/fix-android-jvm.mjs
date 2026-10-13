// Ensures Gradle uses a compatible JVM (Gradle 8.14.x cannot run on JDK 25)
// without having to change it manually in Android Studio.
//
// How it works: find a JDK 17–24 on this machine (preferring 21), then write
// org.gradle.java.home to android/gradle.properties. An already-valid value
// is left alone. Runs automatically via `npm run build`;
// skips gracefully when android/ does not exist or no matching JDK is found.
//
//   node scripts/fix-android-jvm.mjs
//
import { existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { homedir, platform } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ANDROID = join(ROOT, 'android');
const PROP_FILE = join(ANDROID, 'gradle.properties');
const KEY = 'org.gradle.java.home';
const MIN = 17;
const MAX = 24; // Gradle 8.14.x does not support JDK 25 yet

function skip(msg) {
  console.log(msg);
  process.exit(0);
}

/** Return the major version of java in <home>, or null if invalid. */
function javaMajor(home) {
  try {
    const bin = join(home, 'bin', platform() === 'win32' ? 'java.exe' : 'java');
    if (!existsSync(bin)) return null;
    // java -version prints to stderr -> merge via 2>&1
    const out = execFileSync(`"${bin}" -version 2>&1`, { encoding: 'utf8', shell: true, timeout: 10000 });
    const m = (out + '').match(/version "([^"]+)"/);
    if (!m) return null;
    const parts = m[1].split('.');
    // legacy scheme "1.8.0_xx" -> 8
    const major = parts[0] === '1' ? parseInt(parts[1], 10) : parseInt(parts[0], 10);
    return Number.isFinite(major) ? major : null;
  } catch {
    return null;
  }
}

/** java.home of the `java` found on PATH. */
function javaHomeFromPath() {
  try {
    const out = execFileSync('java -XshowSettings:properties -version 2>&1', { encoding: 'utf8', shell: true, timeout: 10000 });
    const m = (out + '').match(/java\.home\s*=\s*(.+)/);
    return m ? m[1].trim() : null;
  } catch {
    return null;
  }
}

function candidates() {
  const list = [];
  const pf = process.env['ProgramFiles'] || 'C:\\Program Files';
  const home = homedir();
  if (platform() === 'win32') {
    list.push(
      join(pf, 'Android', 'Android Studio', 'jbr'),
      join(pf, 'Android', 'Android Studio', 'jre'),
    );
    for (const base of [join(pf, 'Java'), join(pf, 'Eclipse Adoptium'), join(pf, 'Microsoft')]) {
      try {
        for (const d of readdirSync(base)) list.push(join(base, d));
      } catch { /* ignore */ }
    }
  } else if (platform() === 'darwin') {
    list.push(
      '/Applications/Android Studio.app/Contents/jbr/Contents/Home',
      join(home, 'Applications/Android Studio.app/Contents/jbr/Contents/Home'),
    );
    try {
      for (const d of readdirSync('/Library/Java/JavaVirtualMachines')) list.push(join('/Library/Java/JavaVirtualMachines', d, 'Contents', 'Home'));
    } catch { /* ignore */ }
  } else {
    list.push(
      join(home, 'android-studio', 'jbr'),
      '/opt/android-studio/jbr',
      '/usr/lib/jvm/default-java',
    );
    try {
      for (const d of readdirSync('/usr/lib/jvm')) list.push(join('/usr/lib/jvm', d));
    } catch { /* ignore */ }
  }
  if (process.env.JAVA_HOME) list.unshift(process.env.JAVA_HOME);
  const fromPath = javaHomeFromPath();
  if (fromPath) list.push(fromPath);
  // unique + absolute
  const seen = new Set();
  return list.map((p) => { try { return resolve(p); } catch { return null; } }).filter((p) => p && !seen.has(p) && seen.add(p));
}

try {
  if (!existsSync(ANDROID)) skip('android/ folder not found — JVM check skipped.');

  let props = existsSync(PROP_FILE) ? readFileSync(PROP_FILE, 'utf8') : '';
  const current = (props.match(new RegExp(`^${KEY}\\s*=\\s*(.+)$`, 'm')) || [])[1];
  if (current) {
    const major = javaMajor(current.trim());
    if (major !== null && major >= MIN && major <= MAX) {
      skip(`${KEY} is already valid (Java ${major}) — left unchanged.`);
    }
    console.log(`The existing ${KEY} is invalid — looking for a replacement…`);
  }

  const found = [];
  for (const home of candidates()) {
    const major = javaMajor(home);
    if (major !== null && major >= MIN && major <= MAX) found.push({ home, major });
  }
  if (found.length === 0) {
    skip(`No JDK ${MIN}–${MAX} found. Searched: Android Studio's bundled JBR, Program Files\\Java, JAVA_HOME, and PATH. Install JDK 21, or pick a JVM manually in Android Studio (Settings → Build Tools → Gradle → Gradle JVM). This is only a warning — the build continues — but note that Gradle 8.14.x cannot run on JDK 25.`);
  }
  // preference: 21, then closest version
  found.sort((a, b) => Math.abs(a.major - 21) - Math.abs(b.major - 21));
  const best = found[0];
  const value = best.home.replace(/\\/g, '/');

  const line = `${KEY}=${value}`;
  if (new RegExp(`^${KEY}\\s*=`, 'm').test(props)) {
    props = props.replace(new RegExp(`^${KEY}\\s*=.*$`, 'm'), line);
  } else {
    if (props.length && !props.endsWith('\n')) props += '\n';
    props += `# Kasaneru: JVM for Gradle (written automatically by scripts/fix-android-jvm.mjs)\n${line}\n`;
  }
  writeFileSync(PROP_FILE, props);
  console.log(`OK: ${KEY}=${value} (Java ${best.major})`);
} catch (e) {
  skip('JVM check skipped: ' + (e && e.message ? e.message : e));
}
