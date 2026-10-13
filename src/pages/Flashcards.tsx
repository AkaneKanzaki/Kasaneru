import { useCallback, useEffect, useRef, useState } from 'react';
import VoiceButton from '../components/VoiceButton';
import { useStrings } from '../lib/i18n';
import { LEVELS, currentLevel, setLevel as persistLevel } from '../lib/levelStore';
import type { Level } from '../lib/levelStore';
import { dueCards, review, seedForNewUser } from '../lib/srsService';
import type { DueCard, VocabCard } from '../lib/srsService';
import { speakJapanese, stopSpeaking, ttsSupported } from '../lib/tts';
import { autoVoiceEnabled } from '../lib/autoVoice';
import { playCorrect, playWrong } from '../lib/sfx';

// Sesi review SRS: tebak arti kata (kuis pilihan ganda), bukan buka-tutup kartu.
// Jawaban benar -> quality 4, salah -> quality 0.

const seedKey = (level: string) => `srs_seeded_${level}`;

const vocabModules = import.meta.glob('../content/vocab/*.json') as Record<
  string,
  () => Promise<{ default: VocabCard[] }>
>;
const vocabCache: Record<string, VocabCard[]> = {};

async function loadVocabPool(level: string): Promise<VocabCard[]> {
  const lv = level.toLowerCase();
  if (!vocabCache[lv]) {
    const loader = vocabModules[`../content/vocab/${lv}.json`];
    if (!loader) return [];
    const mod = await loader();
    vocabCache[lv] = mod.default ?? [];
  }
  return vocabCache[lv];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Flashcards() {
  const { S, lang } = useStrings();
  const [level, setLevelState] = useState<Level>('N5');
  const [due, setDue] = useState<DueCard[]>([]);
  const [index, setIndex] = useState(0);
  const [options, setOptions] = useState<string[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [started, setStarted] = useState(false);
  const [sessionFinished, setSessionFinished] = useState(false);
  const [grading, setGrading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const poolRef = useRef<VocabCard[]>([]);

  const meaningOf = useCallback(
    (c: VocabCard | null | undefined): string =>
      (lang === 'id' ? c?.meaning_id : c?.meaning_en) ?? c?.meaning_id ?? c?.meaning_en ?? '—',
    [lang],
  );

  const makeOptions = useCallback(
    (card: VocabCard, pool: VocabCard[]): string[] => {
      const answer = meaningOf(card);
      const distractors = shuffle(
        pool.filter((c) => c.word !== card.word).map((c) => meaningOf(c)),
      ).filter((m, i, a) => m !== answer && m !== '—' && a.indexOf(m) === i);
      return shuffle([answer, ...distractors.slice(0, 3)]);
    },
    [meaningOf],
  );

  // Seed review rows sekali per level, lalu tandai 'srs_seeded_<level>'.
  const ensureSeeded = useCallback(async (lvl: string) => {
    try {
      if (localStorage.getItem(seedKey(lvl)) === '1') return;
    } catch {
      /* abaikan */
    }
    setSeeding(true);
    try {
      await seedForNewUser(lvl);
      try {
        localStorage.setItem(seedKey(lvl), '1');
      } catch {
        /* abaikan */
      }
    } finally {
      setSeeding(false);
    }
  }, []);

  const load = useCallback(async (lvl: string) => {
    setLoading(true);
    setError(null);
    try {
      poolRef.current = await loadVocabPool(lvl);
      const cards = await dueCards({ levelId: lvl });
      setDue(cards);
      setIndex(0);
      setPicked(null);
      setCorrectCount(0);
      setAnsweredCount(0);
      setStarted(false);
      setSessionFinished(false);
    } catch {
      setError(S.errorGeneric);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const lvl = await currentLevel();
        if (!alive) return;
        setLevelState(lvl);
        await ensureSeeded(lvl);
        if (!alive) return;
        await load(lvl);
      } catch {
        if (alive) {
          setError(S.errorGeneric);
          setLoading(false);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [ensureSeeded, load]);

  useEffect(() => stopSpeaking, []);

  const changeLevel = useCallback(
    async (lvl: Level) => {
      if (lvl === level) return;
      await persistLevel(lvl);
      setLevelState(lvl);
      await ensureSeeded(lvl);
      await load(lvl);
    },
    [level, ensureSeeded, load]
  );

  const card = due[index]?.vocab_cards as VocabCard | undefined;

  // Siapkan opsi + voice otomatis tiap kartu baru.
  useEffect(() => {
    if (!started || sessionFinished || !card) return;
    setOptions(makeOptions(card, poolRef.current));
    setPicked(null);
    if (autoVoiceEnabled() && ttsSupported() && card.word) {
      const t = setTimeout(() => speakJapanese(card.word!), 350);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, sessionFinished, index, lang]);

  const answer = useCallback(
    async (meaning: string) => {
      const c = due[index]?.vocab_cards as VocabCard | undefined;
      if (!c || picked !== null || grading) return;
      const correct = meaning === meaningOf(c);
      setPicked(meaning);
      setAnsweredCount((n) => n + 1);
      if (correct) { playCorrect(); setCorrectCount((n) => n + 1); } else { playWrong(); }
      setGrading(true);
      try {
        await review({ cardId: c.id, quality: correct ? 4 : 0 });
      } catch {
        setError(S.errorGeneric);
      } finally {
        setGrading(false);
      }
    },
    [due, index, picked, grading, meaningOf]
  );

  const next = useCallback(async () => {
    if (index + 1 < due.length) {
      setIndex(index + 1);
    } else {
      setSessionFinished(true);
      const cards = await dueCards({ levelId: level });
      setDue(cards);
    }
  }, [index, due.length, level]);

  const retry = useCallback(async () => {
    await load(level);
  }, [load, level]);

  const renderChips = () => (
    <div className="chips-scroll" role="tablist" aria-label={S.level}>
      {LEVELS.map(l => (
        <button
          key={l}
          type="button"
          role="tab"
          aria-selected={l === level}
          className={`chip${l === level ? ' active' : ''}`}
          onClick={() => changeLevel(l)}
        >
          {l}
        </button>
      ))}
    </div>
  );

  const renderIntro = () => (
    <div className="stack">
      <div>
        <h1 className="page-title">{S.flashcardsTitle}</h1>
        <p className="page-subtitle">{S.flashcardsSubtitle}</p>
      </div>
      {renderChips()}
      <div className="card stack center" style={{ padding: '32px 20px' }}>
        {due.length === 0 ? (
          <>
            <span style={{ fontSize: 44, fontWeight: 800, color: 'var(--color-primary)' }} aria-hidden="true">完</span>
            <p className="muted" style={{ margin: 0 }}>{S.noCardsDue}</p>
          </>
        ) : (
          <>
            <span style={{ fontSize: 44, fontWeight: 800, color: 'var(--color-primary)' }} aria-hidden="true">札</span>
            <div style={{ fontSize: 40, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
              {due.length}
            </div>
            <p className="muted" style={{ margin: 0 }}>{S.cardsDue}</p>
            <button type="button" className="btn" onClick={() => setStarted(true)}>
              {S.startSession}
            </button>
          </>
        )}
      </div>
    </div>
  );

  const renderCard = () => {
    if (!card) return null;
    const answered = picked !== null;
    const correctMeaning = meaningOf(card);
    return (
      <div className="stack">
        <div
          className="card center"
          style={{ position: 'relative', padding: '40px 24px' }}
        >
          {ttsSupported() && (
            <VoiceButton
              overlay
              onPress={() => card.word && speakJapanese(card.word)}
              label={S.listen}
            />
          )}
          <p style={{ fontSize: '2.75rem', margin: 0 }}>{card.word ?? ''}</p>
          {answered && (
            <p className="muted" style={{ fontSize: '1.1rem', margin: '8px 0 0' }}>
              {card.reading ?? ''}
            </p>
          )}
        </div>

        {!answered ? (
          <>
            <p className="muted center" style={{ margin: 0 }}>
              {S.guessMeaning}
            </p>
            <div className="stack">
              {options.map((m) => (
                <button
                  key={m}
                  type="button"
                  className="card pressable"
                  style={{ width: '100%', textAlign: 'center', fontSize: 17, padding: '14px' }}
                  onClick={() => answer(m)}
                  disabled={grading}
                >
                  {m}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="stack">
              {options.map((m) => {
                const isAnswer = m === correctMeaning;
                const isPicked = picked === m;
                let style: React.CSSProperties = {};
                if (isAnswer) {
                  style = {
                    background: 'var(--color-success)',
                    borderColor: 'var(--color-success)',
                    color: '#fff',
                  };
                } else if (isPicked) {
                  style = {
                    background: 'var(--color-error)',
                    borderColor: 'var(--color-error)',
                    color: '#fff',
                  };
                }
                return (
                  <div
                    key={m}
                    className="card"
                    style={{ width: '100%', textAlign: 'center', fontSize: 17, padding: '14px', ...style }}
                  >
                    {m}
                    {isAnswer && ' ✓'}
                  </div>
                );
              })}
            </div>
            {(lang === 'id' ? card.example : card.example_en ?? card.example) && (
              <p className="muted center" style={{ fontStyle: 'italic', margin: 0 }}>
                {lang === 'id' ? card.example : card.example_en ?? card.example}
              </p>
            )}
            <button type="button" className="btn" onClick={next}>
              {S.next} →
            </button>
          </>
        )}
      </div>
    );
  };

  const renderSession = () => {
    const pct = due.length > 0 ? Math.round(((index + 1) / due.length) * 100) : 0;
    return (
      <div className="stack">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="section-badge">{level}</span>
          <p className="muted" style={{ margin: 0 }}>
            {index + 1} / {due.length}
          </p>
          <span style={{ flex: 1 }} />
          <span className="muted" style={{ fontWeight: 700 }}>
            ✓ {correctCount}
          </span>
        </div>
        <div className="progress-track" aria-hidden="true">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        {renderCard()}
      </div>
    );
  };

  const renderComplete = () => {
    const pct = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
    return (
      <div className="card stack center" style={{ padding: '32px 20px' }}>
        <p style={{ fontSize: '3rem', margin: 0, color: 'var(--color-primary)' }}>✓</p>
        <h2 style={{ margin: 0 }}>{S.sessionComplete}</h2>
        <div style={{ fontSize: 40, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
          {pct}
          <span style={{ fontSize: 20, color: 'var(--color-muted)' }}>%</span>
        </div>
        <p className="muted" style={{ margin: 0 }}>
          {correctCount} ✓ / {answeredCount} · {S.accuracy}
        </p>
        <button type="button" className="btn" onClick={retry}>
          {S.retry}
        </button>
      </div>
    );
  };

  let body: React.ReactNode;
  if (loading) {
    body = (
      <div className="center">
        <p className="muted">{S.loading}</p>
      </div>
    );
  } else if (seeding) {
    body = (
      <div className="center">
        <p className="muted">{S.preparingCards}</p>
      </div>
    );
  } else if (error) {
    body = (
      <div className="error-box stack center">
        <p style={{ margin: 0 }}>{error}</p>
        <button type="button" className="btn" onClick={retry}>
          {S.retry}
        </button>
      </div>
    );
  } else if (sessionFinished) {
    body = renderComplete();
  } else if (!started) {
    body = renderIntro();
  } else {
    body = renderSession();
  }

  return (
    <div className="page">
      <div className="stack">
        {body}
      </div>
    </div>
  );
}
