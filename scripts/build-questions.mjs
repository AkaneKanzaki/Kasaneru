// Build script: bundles approved exam questions into the app.
//
// Source of truth: src/content/questions-src/{n5..n1}.json — the reviewed
// question files. Each record must have review_status === 'approved' to be
// included.
//
// ANTI-PEEK: the raw `correct_answer` is NEVER shipped. It is replaced with
// `answer_hash`, a keyed hash the app recomputes for the user's selection.
// This stops casual reading of answer keys from the bundle. Honest limit:
// with 4 options the hash is brute-forceable — see src/lib/hash.ts.
//
// The bundle keeps only what the exam UI needs: id/level/section/prompt/
// choices/answer_hash. Review metadata (source_url, notes, confidence...)
// stays out of the shipped app.
//
// Run: node scripts/build-questions.mjs
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = join(ROOT, 'src', 'content', 'questions-src');
const OUT_DIR = join(ROOT, 'src', 'content', 'questions');
const LEVELS = ['n5', 'n4', 'n3', 'n2', 'n1'];

// KEEP IN SYNC with src/lib/hash.ts + src/lib/site.ts (ANSWER_SALT).
const ANSWER_SALT = readSalt();

function readSalt() {
  const site = readFileSync(join(ROOT, 'src', 'lib', 'site.ts'), 'utf8');
  const m = site.match(/ANSWER_SALT\s*=\s*'([^']+)'/);
  if (!m) throw new Error('ANSWER_SALT not found in src/lib/site.ts');
  return m[1];
}

// cyrb53 — copy of src/lib/hash.ts (Node can't import the TS source here).
function cyrb53(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}

function keyedHash(key, message) {
  return cyrb53(`${key}::${message}`, cyrb53(key).length);
}

mkdirSync(OUT_DIR, { recursive: true });

let total = 0;
for (const lv of LEVELS) {
  const src = join(SRC_DIR, `${lv}.json`);
  let approved = [];
  const skipped = [];
  if (existsSync(src)) {
    const raw = JSON.parse(readFileSync(src, 'utf8'));
    const list = Array.isArray(raw) ? raw : raw.questions || [];
    for (const q of list) {
      if (q.review_status !== 'approved') continue;
      const id = String(q.id);
      const n = Number(q.correct_answer);
      const choices = (q.choices || []).map(String).slice(0, 4);
      if (![1, 2, 3, 4].includes(n) || choices.length < 2) {
        // Tanpa kunci jawaban yang valid soal tidak bisa dinilai —
        // butuh dilengkapi saat review dosen.
        skipped.push(id);
        continue;
      }
      approved.push({
        id,
        level: String(q.level || lv).toUpperCase(),
        section: String(q.section),
        prompt: String(q.prompt),
        choices,
        // kunci jawaban asli TIDAK ikut dibundel:
        answer_hash: keyedHash(ANSWER_SALT, `${id}:${n}`),
        // listening: sertakan naskah audio (dibacakan via TTS perangkat)
        ...(String(q.section) === 'listening' && q.script
          ? { script: String(q.script) }
          : {}),
      });
    }
  } else {
    console.log(`(no source yet: ${src} — writing empty bundle)`);
  }
  writeFileSync(join(OUT_DIR, `${lv}.json`), JSON.stringify(approved) + '\n');
  console.log(`${lv}: ${approved.length} approved questions bundled` + (skipped.length ? ` (${skipped.length} skipped: no answer key)` : ''));
  total += approved.length;
}
console.log(`total: ${total}`);
