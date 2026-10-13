// Local-first progress store: the single source of truth for everything
// the user earns or completes. Persisted to localStorage, no backend.
//
// Backup/restore (Profile page) exports/imports this whole object as JSON,
// so users can move to a new device without an account.
import type { Level } from './levelStore';
import { LEVELS } from './levelStore';
import { HIRAGANA, KATAKANA } from './kanaData';

export interface SrsState {
  ef: number;
  interval: number;
  reps: number;
  due: string; // ISO date
}

export interface ExamRecord {
  id: string;
  level: string;
  mode: string;
  total: number;
  passed: boolean;
  at: string; // ISO date
  /** Tamper-evident signature (see examService). Empty = legacy/unsigned. */
  sig: string;
}

export interface ProgressData {
  version: 1;
  xp: number;
  streakCount: number;
  lastActiveDate: string | null; // YYYY-MM-DD (local)
  targetLevel: Level;
  displayName: string;
  completedLessons: Record<string, string>; // lessonId -> ISO date
  kana: Record<string, { attempts: number; correct: number }>;
  srs: Record<string, SrsState>; // cardId -> SM-2 state
  examHistory: ExamRecord[];
}

const KEY = 'kasaneru-progress-v1';

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

function yesterdayLocal(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

function fresh(): ProgressData {
  return {
    version: 1,
    xp: 0,
    streakCount: 0,
    lastActiveDate: null,
    targetLevel: 'N5',
    displayName: '',
    completedLessons: {},
    kana: {},
    srs: {},
    examHistory: [],
  };
}

let cache: ProgressData | null = null;

function isValidLevel(v: unknown): v is Level {
  return typeof v === 'string' && (LEVELS as readonly string[]).includes(v);
}

function sanitize(raw: unknown): ProgressData {
  const base = fresh();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Record<string, unknown>;
  if (r.version !== 1) return base;
  return {
    version: 1,
    xp: typeof r.xp === 'number' && r.xp >= 0 ? Math.floor(r.xp) : 0,
    streakCount:
      typeof r.streakCount === 'number' && r.streakCount >= 0
        ? Math.floor(r.streakCount)
        : 0,
    lastActiveDate:
      typeof r.lastActiveDate === 'string' || r.lastActiveDate === null
        ? (r.lastActiveDate as string | null)
        : null,
    targetLevel: isValidLevel(r.targetLevel) ? r.targetLevel : 'N5',
    displayName: typeof r.displayName === 'string' ? r.displayName.slice(0, 60) : '',
    completedLessons:
      r.completedLessons && typeof r.completedLessons === 'object'
        ? (r.completedLessons as Record<string, string>)
        : {},
    kana:
      r.kana && typeof r.kana === 'object'
        ? (r.kana as ProgressData['kana'])
        : {},
    srs:
      r.srs && typeof r.srs === 'object' ? (r.srs as Record<string, SrsState>) : {},
    examHistory: Array.isArray(r.examHistory)
      ? (r.examHistory as ExamRecord[]).slice(0, 500)
      : [],
  };
}

/** Load progress (cached in memory). */
export function getProgress(): ProgressData {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? sanitize(JSON.parse(raw)) : fresh();
  } catch {
    cache = fresh();
  }
  return cache;
}

/** Persist progress to localStorage. */
export function saveProgress(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(getProgress()));
  } catch {
    /* storage penuh / mode privat: progres hanya di memori */
  }
}

/** Mark today as active (streak) — call on app start and on XP events. */
export function touchActivity(): void {
  const p = getProgress();
  const today = todayLocal();
  if (p.lastActiveDate === today) return;
  p.streakCount = p.lastActiveDate === yesterdayLocal() ? p.streakCount + 1 : 1;
  p.lastActiveDate = today;
  saveProgress();
}

/** Add XP and touch the streak. */
export function addXp(n: number): void {
  if (n <= 0) return;
  const p = getProgress();
  p.xp += Math.floor(n);
  saveProgress();
  touchActivity();
}

/** Serialize the whole progress for backup. Throws on invalid input. */
export function exportBackup(): string {
  return JSON.stringify({ app: 'kasaneru', exportedAt: new Date().toISOString(), data: getProgress() }, null, 1);
}

/** Replace progress from a backup file. Throws if the file is invalid. */
export function importBackup(text: string): void {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('invalid-json');
  }
  const data =
    parsed && typeof parsed === 'object' && 'data' in (parsed as Record<string, unknown>)
      ? (parsed as Record<string, unknown>).data
      : parsed;
  const clean = sanitize(data);
  // sanitize() returns fresh() for garbage; reject files that carry nothing
  const hasAnything =
    clean.xp > 0 ||
    clean.streakCount > 0 ||
    Object.keys(clean.completedLessons).length > 0 ||
    Object.keys(clean.srs).length > 0 ||
    Object.keys(clean.kana).length > 0 ||
    clean.examHistory.length > 0 ||
    clean.displayName !== '';
  if (!hasAnything && clean.lastActiveDate == null) {
    // allow genuinely-empty but well-formed backups (version must match)
    const r = data as Record<string, unknown>;
    if (!r || r.version !== 1) throw new Error('invalid-backup');
  }
  cache = clean;
  saveProgress();
}

/** Wipe all local progress (with confirmation in the UI). */
export function resetProgress(): void {
  cache = fresh();
  saveProgress();
}

/**
 * Wipe kana quiz stats for one script only — e.g. to start clean after
 * the grid-tap inflation bug. Other progress (lessons, SRS, exams) is untouched.
 */
export function resetKanaProgress(script: 'hiragana' | 'katakana'): void {
  const p = getProgress();
  const inScript = new Set(
    (script === 'hiragana' ? HIRAGANA : KATAKANA).map((k) => k.kana),
  );
  const next: ProgressData['kana'] = {};
  for (const [k, v] of Object.entries(p.kana)) {
    if (!inScript.has(k)) next[k] = v;
  }
  p.kana = next;
  saveProgress();
}

/** Trigger a browser download of a text file. */
export function downloadFile(filename: string, text: string, mime = 'application/json'): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
