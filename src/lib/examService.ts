// Local-first exam engine: questions come from the bundled
// src/content/questions/{n5..n1}.json (approved only — see
// scripts/build-questions.mjs).
//
// ANTI-PEEK: the bundle carries NO raw answer keys, only `answer_hash`
// (see src/lib/hash.ts for the honest threat model). The app recomputes
// the hash for the user's selection to grade.
//
// ANTI-FLEX: finished records are tamper-evident — each carries `sig`, a
// keyed hash over its content. Hand-edited JSON fails verification and is
// shown as invalid. (Determined attackers can still extract the embedded
// key from this open-source repo — documented, not hidden.)
import { score, type ScoreResult } from './scoring';
import { keyedHash } from './hash';
import { ANSWER_SALT, RECORD_SIGN_KEY } from './site';
import { addXp, getProgress, saveProgress, touchActivity, type ExamRecord } from './store';

export type ExamMode = 'quick' | 'study' | 'real';

export interface Question {
  id: string;
  level: string;
  section: string;
  prompt: string;
  choices: string[];
  /** Keyed hash of the correct option (1-based). The raw key is never shipped. */
  answer_hash: string;
  /** Listening only: spoken script (dialogue/monologue), played via device TTS. */
  script?: string;
}

// Durasi ujian penuh per level dalam menit (mode quick = tanpa timer).
export const EXAM_MINUTES: Record<string, number> = {
  N5: 105,
  N4: 115,
  N3: 140,
  N2: 155,
  N1: 170,
};

const questionModules = import.meta.glob('../content/questions/*.json') as Record<
  string,
  () => Promise<{ default: Question[] }>
>;

const questionCache: Record<string, Question[]> = {};

async function loadQuestions(level: string): Promise<Question[]> {
  const lv = level.toLowerCase();
  if (!questionCache[lv]) {
    const loader = questionModules[`../content/questions/${lv}.json`];
    if (!loader) return [];
    const mod = await loader();
    questionCache[lv] = (mod.default ?? []).filter(
      (q) => q && Array.isArray(q.choices) && q.choices.length >= 2 && typeof q.answer_hash === 'string',
    );
  }
  return questionCache[lv];
}

// Soal untuk sebuah level, opsional difilter per seksi.
export async function fetchQuestions(
  level: string,
  opts: { sections?: string[]; limit?: number } = {},
): Promise<Question[]> {
  const { sections, limit = 100 } = opts;
  const rows = await loadQuestions(level);
  const filtered =
    sections && sections.length > 0 ? rows.filter((q) => sections.includes(q.section)) : rows;
  return filtered.slice(0, limit);
}

function shuffleArr<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Pengambilan berstrata: tiap seksi yang punya soal mendapat jatah
// proporsional, supaya listening/reading tidak tenggelam oleh slice(0, n).
// Urutan seksi dipertahankan seperti ujian JLPT asli.
export async function fetchBalancedQuestions(
  level: string,
  limit = 40,
): Promise<Question[]> {
  const rows = await loadQuestions(level);
  const sectionOrder = ['vocabulary', 'grammar', 'reading', 'listening'];
  const groups = sectionOrder
    .map((s) => rows.filter((q) => q.section === s))
    .filter((g) => g.length > 0);
  const total = rows.length;
  if (total === 0 || groups.length === 0) return [];
  const target = Math.min(limit, total);

  const quotas = groups.map((g) => Math.floor((g.length / total) * target));
  let assigned = quotas.reduce((a, b) => a + b, 0);
  const remainders = groups
    .map((g, i) => ({ i, r: (g.length / total) * target - quotas[i] }))
    .sort((a, b) => b.r - a.r);
  let k = 0;
  while (assigned < target && k < remainders.length * 4) {
    const { i } = remainders[k % remainders.length];
    if (quotas[i] < groups[i].length) {
      quotas[i] += 1;
      assigned += 1;
    }
    k += 1;
  }

  return groups.flatMap((g, i) => shuffleArr(g).slice(0, quotas[i]));
}

/** Grade a selection without ever seeing the raw answer key. */
export function checkAnswer(question: Question, selected: number): boolean {
  if (!question || selected < 1 || selected > question.choices.length) return false;
  return keyedHash(ANSWER_SALT, `${question.id}:${selected}`) === question.answer_hash;
}

interface AttemptAnswer {
  questionId: string;
  section: string;
  selected: number;
  isCorrect: boolean;
}

interface Attempt {
  id: string;
  level: string;
  mode: ExamMode;
  sections: Map<string, string>; // questionId -> section
  answers: AttemptAnswer[];
}

const attempts = new Map<string, Attempt>();

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// Canonical serialization for signing (stable key order).
function canonicalRecord(r: Omit<ExamRecord, 'sig'>): string {
  return JSON.stringify({
    at: r.at,
    id: r.id,
    level: r.level,
    mode: r.mode,
    passed: r.passed,
    total: r.total,
  });
}

/** Sign an exam record (tamper-evident). */
export function signExamRecord(r: Omit<ExamRecord, 'sig'>): string {
  return keyedHash(RECORD_SIGN_KEY, canonicalRecord(r));
}

/** Verify a stored exam record. False = hand-edited or corrupt. */
export function verifyExamRecord(r: ExamRecord): boolean {
  if (!r || typeof r.sig !== 'string' || !r.sig) return false;
  const { sig, ...rest } = r;
  return keyedHash(RECORD_SIGN_KEY, canonicalRecord(rest as Omit<ExamRecord, 'sig'>)) === sig;
}

// Mulai attempt baru. Mengembalikan attemptId.
export async function startAttempt(opts: { level: string; mode: ExamMode }): Promise<string> {
  const { level, mode } = opts;
  const questions = await loadQuestions(level);
  const id = newId();
  attempts.set(id, {
    id,
    level,
    mode,
    sections: new Map(questions.map((q) => [q.id, q.section])),
    answers: [],
  });
  touchActivity();
  return id;
}

// Catat satu jawaban. selected: 1..N (sesuai jumlah choices).
export async function answerQuestion(opts: {
  attemptId: string;
  questionId: string;
  selected: number;
  isCorrect: boolean;
}): Promise<void> {
  const { attemptId, questionId, selected, isCorrect } = opts;
  const attempt = attempts.get(attemptId);
  if (!attempt) return;
  const existing = attempt.answers.findIndex((a) => a.questionId === questionId);
  const row: AttemptAnswer = {
    questionId,
    section: attempt.sections.get(questionId) ?? '',
    selected,
    isCorrect,
  };
  if (existing >= 0) attempt.answers[existing] = row;
  else attempt.answers.push(row);
}

// Rekap jawaban per seksi, nilai dengan section floors, tutup attempt.
// Mengembalikan hasil scoring untuk layar hasil.
export async function finishAttempt(opts: {
  attemptId: string;
  level: string;
}): Promise<ScoreResult> {
  const { attemptId, level } = opts;
  const attempt = attempts.get(attemptId);
  const answers = attempt?.answers ?? [];

  const correct = (section: string): number =>
    answers.filter((a) => a.section === section && a.isCorrect).length;
  const total = (section: string): number =>
    answers.filter((a) => a.section === section).length;

  const result = score({
    level,
    vocabCorrect: correct('vocabulary'),
    vocabTotal: total('vocabulary'),
    grammarCorrect: correct('grammar'),
    grammarTotal: total('grammar'),
    readingCorrect: correct('reading'),
    readingTotal: total('reading'),
    listeningCorrect: correct('listening'),
    listeningTotal: total('listening'),
  });

  // Simpan ringkasan bertanda tangan ke riwayat lokal.
  const record: Omit<ExamRecord, 'sig'> = {
    id: attemptId,
    level,
    mode: attempt?.mode ?? 'quick',
    total: result.total,
    passed: result.passed,
    at: new Date().toISOString(),
  };
  const p = getProgress();
  p.examHistory.unshift({ ...record, sig: signExamRecord(record) });
  p.examHistory = p.examHistory.slice(0, 200);
  saveProgress();
  addXp(result.passed ? 50 : 20);

  attempts.delete(attemptId);
  return result;
}
