// Build script: generates src/content/lessons/index.json from the Markdown
// lesson files + per-level index files (module titles) + objectives.
//
// Run: node scripts/build-lesson-index.mjs
// Re-run whenever a lesson file or module title changes.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LESSONS_DIR = join(ROOT, 'src', 'content', 'lessons');
const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];

/** Parse the simple YAML frontmatter used by lesson files. */
function parseFrontmatter(text, path) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!m) throw new Error(`no frontmatter: ${path}`);
  const fm = {};
  let listKey = null;
  for (const line of m[1].split(/\r?\n/)) {
    const item = line.match(/^\s*-\s*(.*)$/);
    if (item && listKey) {
      fm[listKey].push(item[1].replace(/^"|"$/g, ''));
      continue;
    }
    const kv = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (!kv) {
      listKey = null;
      continue;
    }
    const [, key, raw] = kv;
    if (raw === '') {
      fm[key] = [];
      listKey = key;
    } else {
      fm[key] = raw.replace(/^"|"$/g, '');
      listKey = null;
    }
  }
  return fm;
}

const objectives = JSON.parse(
  readFileSync(join(ROOT, 'scripts', 'objectives.json'), 'utf8'),
);
const objectivesEn = JSON.parse(
  readFileSync(join(ROOT, 'scripts', 'objectives-en.json'), 'utf8'),
);

const levels = [];
for (const level of LEVELS) {
  const lv = level.toLowerCase();
  const idx = JSON.parse(
    readFileSync(join(LESSONS_DIR, `index_${lv}.json`), 'utf8'),
  );
  const files = readdirSync(join(LESSONS_DIR, lv)).filter((f) => f.endsWith('.md') && !f.endsWith('.en.md'));
  const lessonsByModule = {};
  for (const file of files) {
    const text = readFileSync(join(LESSONS_DIR, lv, file), 'utf8');
    const fm = parseFrontmatter(text, file);
    for (const k of ['code', 'module_code', 'title', 'title_id', 'duration_min']) {
      if (fm[k] == null || fm[k] === '') throw new Error(`missing ${k}: ${file}`);
    }
    const enFile = file.replace(/\.md$/, '.en.md');
    const lesson = {
      id: `${level}-${fm.code}`,
      code: fm.code,
      title_en: fm.title,
      title_id: fm.title_id,
      duration_min: Number(fm.duration_min),
      file: `${lv}/${file}`,
      ...(existsSync(join(LESSONS_DIR, lv, enFile)) ? { file_en: `${lv}/${enFile}` } : {}),
    };
    (lessonsByModule[fm.module_code] ||= []).push(lesson);
  }
  const modules = Object.entries(idx.modules).map(([code, meta]) => ({
    id: `${level}-${code}`,
    code,
    title_en: meta.title_en,
    title_id: meta.title_id,
    objective_id: objectives[level]?.[code] ?? null,
    objective_en: objectivesEn[level]?.[code] ?? null,
    lessons: (lessonsByModule[code] || []).sort((a, b) =>
      a.code.localeCompare(b.code),
    ),
  }));
  const total = modules.reduce((n, m) => n + m.lessons.length, 0);
  console.log(`${level}: ${modules.length} modules, ${total} lessons`);
  levels.push({ id: level, modules });
}

writeFileSync(
  join(LESSONS_DIR, 'index.json'),
  JSON.stringify({ levels }, null, 1) + '\n',
);
console.log('wrote src/content/lessons/index.json');
