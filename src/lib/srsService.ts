// Local-first SRS (SM-2): vocabulary comes from the bundled
// src/content/vocab/{n5..n1}.json, review state lives in the local store.
//
// Grade mapping (UI): Lagi=0, Sulit=3, Bisa=4, Mudah=5.
import { addXp, getProgress, saveProgress, touchActivity, type SrsState } from './store';

const MIN_EASE = 1.3;
const DEFAULT_EASE = 2.5;

export interface VocabCard {
  id: string;
  word: string;
  reading: string | null;
  meaning_en: string | null;
  meaning_id: string | null;
  pos: string | null;
  example: string | null;
  example_en: string | null;
  level: string;
}

export interface DueCard {
  card_id: string;
  ease_factor: number | null;
  interval_days: number | null;
  repetitions: number | null;
  vocab_cards: VocabCard | null;
}

export interface DueCardsOpts {
  levelId?: string;
  limit?: number;
}

export interface DueCountOpts {
  levelId?: string;
}

export interface ReviewOpts {
  cardId: string;
  quality: number; // 0..5
}

interface RawCard {
  word: string;
  reading?: string | null;
  meaning_en?: string | null;
  meaning_id?: string | null;
  pos?: string | null;
  example?: string | null;
  example_en?: string | null;
  module?: string;
  tags?: string[];
}

const vocabModules = import.meta.glob('../content/vocab/*.json') as Record<
  string,
  () => Promise<{ default: RawCard[] }>
>;

const vocabCache: Record<string, RawCard[]> = {};

async function loadVocab(levelId: string): Promise<RawCard[]> {
  const lv = levelId.toLowerCase();
  if (!vocabCache[lv]) {
    const loader = vocabModules[`../content/vocab/${lv}.json`];
    if (!loader) return [];
    const mod = await loader();
    vocabCache[lv] = mod.default ?? [];
  }
  return vocabCache[lv];
}

export function cardIdFor(level: string, c: RawCard): string {
  return `${level.toUpperCase()}|${c.word}|${c.reading ?? ''}`;
}

function toVocabCard(level: string, c: RawCard): VocabCard {
  return {
    id: cardIdFor(level, c),
    word: c.word,
    reading: c.reading ?? null,
    meaning_en: c.meaning_en ?? null,
    meaning_id: c.meaning_id ?? null,
    pos: c.pos ?? null,
    example: c.example ?? null,
    example_en: c.example_en ?? null,
    level: level.toUpperCase(),
  };
}

function dueOf(state: SrsState | undefined): number {
  if (!state) return 0; // kartu baru selalu jatuh tempo
  const t = Date.parse(state.due);
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Kartu yang jatuh tempo saat ini (belum pernah direview atau due <= now),
 * paling lama dulu.
 */
export async function dueCards({ levelId, limit = 20 }: DueCardsOpts = {}): Promise<DueCard[]> {
  const p = getProgress();
  const now = Date.now();
  const levels = levelId ? [levelId] : ['N5', 'N4', 'N3', 'N2', 'N1'];
  const out: DueCard[] = [];
  for (const lv of levels) {
    const cards = await loadVocab(lv);
    for (const c of cards) {
      const id = cardIdFor(lv, c);
      const st = p.srs[id];
      if (dueOf(st) <= now) {
        out.push({
          card_id: id,
          ease_factor: st?.ef ?? null,
          interval_days: st?.interval ?? null,
          repetitions: st?.reps ?? null,
          vocab_cards: toVocabCard(lv, c),
        });
      }
    }
  }
  out.sort((a, b) => {
    const da = dueOf(p.srs[a.card_id]);
    const db = dueOf(p.srs[b.card_id]);
    return da - db;
  });
  touchActivity();
  return out.slice(0, limit);
}

/** Jumlah kartu jatuh tempo saat ini untuk satu level (undefined = semua level). */
export async function dueCount({ levelId }: DueCountOpts = {}): Promise<number> {
  const due = await dueCards({ levelId, limit: 10000 });
  return due.length;
}

/** Terapkan update SM-2 untuk satu review (+2 XP). */
export async function review({ cardId, quality }: ReviewOpts): Promise<void> {
  const p = getProgress();
  const cur = p.srs[cardId];

  let ease: number = cur?.ef ?? DEFAULT_EASE;
  let interval: number = cur?.interval ?? 0;
  let reps: number = cur?.reps ?? 0;

  if (quality < 3) {
    reps = 0;
    interval = 1;
  } else {
    reps += 1;
    if (reps === 1) {
      interval = 1;
    } else if (reps === 2) {
      interval = 6;
    } else {
      interval = Math.round(interval * ease);
    }
  }
  ease = ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (ease < MIN_EASE) ease = MIN_EASE;

  const now = new Date();
  const dueAt = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);

  p.srs[cardId] = { ef: ease, interval, reps, due: dueAt.toISOString() };
  saveProgress();
  addXp(2);
}

/**
 * Dulu: seed satu row srs_reviews per kartu untuk pengguna baru.
 * Sekarang kartu baru otomatis dianggap jatuh tempo — no-op, dipertahankan
 * agar pemanggil lama tidak perlu diubah.
 */
export async function seedForNewUser(_levelId: string): Promise<void> {
  touchActivity();
}
