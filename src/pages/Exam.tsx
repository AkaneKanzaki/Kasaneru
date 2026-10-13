import { useCallback, useEffect, useRef, useState } from 'react';
import { useStrings } from '../lib/i18n';
import { LEVELS, currentLevel } from '../lib/levelStore';
import {
  EXAM_MINUTES,
  answerQuestion,
  checkAnswer,
  fetchBalancedQuestions,
  finishAttempt,
  startAttempt,
  verifyExamRecord,
  type ExamMode,
  type Question,
} from '../lib/examService';
import { getProgress, type ExamRecord } from '../lib/store';
import { speakListening, stopSpeaking, ttsSupported } from '../lib/tts';
import type { ScoreResult } from '../lib/scoring';

// Alur mock exam: pilih level + mode -> jawab soal -> kumpulkan -> hasil.
//
// Mode: Cepat (tanpa timer, umpan balik langsung), Belajar (durasi penuh),
// Asli (timer ketat; audio sekali putar, tanpa navigasi mundur).

type Phase = 'pick' | 'loading' | 'running' | 'result';

const MODES: { id: ExamMode; titleKey: 'modeQuick' | 'modeStudy' | 'modeReal'; descKey: 'modeQuickDesc' | 'modeStudyDesc' | 'modeRealDesc' }[] = [
  { id: 'quick', titleKey: 'modeQuick', descKey: 'modeQuickDesc' },
  { id: 'study', titleKey: 'modeStudy', descKey: 'modeStudyDesc' },
  { id: 'real', titleKey: 'modeReal', descKey: 'modeRealDesc' },
];

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function Exam() {
  const { S } = useStrings();
  const [phase, setPhase] = useState<Phase>('pick');
  const [level, setLevel] = useState<string>('N5');
  const [mode, setMode] = useState<ExamMode>('quick');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    currentLevel()
      .then((lv) => {
        if (LEVELS.includes(lv)) setLevel(lv);
      })
      .catch(() => {
        /* pakai default N5 */
      });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      if (attemptId) {
        for (const q of questions) {
          const selected = answers[q.id];
          if (selected == null) continue; // soal tak dijawab dilewati
          await answerQuestion({
            attemptId,
            questionId: q.id,
            selected,
            isCorrect: checkAnswer(q, selected),
          });
        }
        const res = await finishAttempt({ attemptId, level });
        setResult(res);
        setPhase('result');
      }
    } catch {
      setNotice(S.errorGeneric);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [questions, answers, attemptId, level]);

  // Timer mundur: hanya untuk mode study/real (quick tanpa timer).
  useEffect(() => {
    if (phase !== 'running' || mode === 'quick' || result) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [phase, mode, result]);

  // Waktu habis -> kumpulkan otomatis.
  useEffect(() => {
    if (phase === 'running' && mode !== 'quick' && secondsLeft === 0 && !result) {
      handleSubmit();
    }
  }, [secondsLeft, phase, mode, result, handleSubmit]);

  const startExam = async () => {
    setPhase('loading');
    setNotice(null);
    try {
      const qs = await fetchBalancedQuestions(level, 40);
      if (!qs || qs.length === 0) {
        // Belum ada soal approved untuk level ini: jangan mulai attempt.
        setPhase('pick');
        setNotice(S.noApprovedQuestions);
        return;
      }
      const id = await startAttempt({ level, mode });
      const duration = mode === 'quick' ? 0 : (EXAM_MINUTES[level] ?? 105) * 60;
      setQuestions(qs);
      setAttemptId(id);
      setAnswers({});
      setIndex(0);
      setResult(null);
      setSecondsLeft(duration);
      setPhase('running');
    } catch {
      setPhase('pick');
      setNotice(S.errorGeneric);
    }
  };

  const resetToPicker = () => {
    setPhase('pick');
    setQuestions([]);
    setAnswers({});
    setIndex(0);
    setResult(null);
    setAttemptId(null);
    setNotice(null);
    submittingRef.current = false;
  };

  return (
    <>
      <div className="page">
        <h1 className="page-title">{S.examTitle}</h1>

        {phase === 'loading' && <p className="muted center">{S.loading}</p>}

        {phase === 'pick' && (
          <div className="stack">
            <div>
              <div className="label">{S.examLevel}</div>
              <div className="chips-scroll" role="tablist" aria-label={S.examLevel}>
                {LEVELS.map((lv) => (
                  <button
                    key={lv}
                    type="button"
                    role="tab"
                    aria-selected={lv === level}
                    className={lv === level ? 'chip active' : 'chip'}
                    onClick={() => setLevel(lv)}
                  >
                    {lv}
                  </button>
                ))}
              </div>
            </div>

            <div className="stack">
              {MODES.map((m) => {
                const active = m.id === mode;
                const glyph = m.id === 'quick' ? '速' : m.id === 'study' ? '学' : '試';
                return (
                  <button
                    key={m.id}
                    type="button"
                    className="card activity-card"
                    aria-pressed={active}
                    onClick={() => setMode(m.id)}
                    style={{
                      borderColor: active ? 'var(--color-primary)' : undefined,
                      borderWidth: active ? 2 : undefined,
                    }}
                  >
                    <span className="glyph-tile" aria-hidden="true">{glyph}</span>
                    <span style={{ flex: 1, textAlign: 'left' }}>
                      <span style={{ display: 'block', fontWeight: 700 }}>{S[m.titleKey]}</span>
                      <span className="muted" style={{ fontSize: 13 }}>
                        {S[m.descKey]}
                      </span>
                    </span>
                    {active && (
                      <span style={{ color: 'var(--color-primary)', fontWeight: 800 }} aria-hidden="true">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {notice && <div className="error-box">{notice}</div>}

            <button type="button" className="btn" onClick={startExam}>
              {S.startExam}
            </button>

            <HistoryList level={level} />
          </div>
        )}

        {phase === 'running' && (
          <QuestionRunner
            questions={questions}
            index={index}
            onIndexChange={setIndex}
            answers={answers}
            onSelect={(qid, v) => setAnswers((prev) => ({ ...prev, [qid]: v }))}
            mode={mode}
            secondsLeft={secondsLeft}
            submitting={submitting}
            onSubmit={handleSubmit}
          />
        )}

        {phase === 'result' && result && (
          <ResultView result={result} onRetry={resetToPicker} />
        )}
      </div>
    </>
  );
}

function HistoryList({ level }: { level: string }) {
  const { S, lang } = useStrings();
  const [records, setRecords] = useState<ExamRecord[]>([]);
  useEffect(() => {
    setRecords(getProgress().examHistory.filter((r) => r.level === level).slice(0, 10));
  }, [level]);
  if (records.length === 0) return null;
  return (
    <div>
      <h2 className="section-title">{S.examHistory}</h2>
      <div className="stack">
        {records.map((r) => {
          const ok = verifyExamRecord(r);
          const date = new Date(r.at);
          const dateStr = Number.isNaN(date.getTime())
            ? ''
            : date.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              });
          return (
            <div
              key={r.id}
              className="card"
              style={{ opacity: ok ? 1 : 0.55, display: 'flex', alignItems: 'center', gap: 12 }}
            >
              <span style={{ fontSize: 20, fontWeight: 800, color: ok ? (r.passed ? 'var(--color-success)' : 'var(--color-error)') : 'var(--color-muted)' }}>{ok ? (r.passed ? '合' : '否') : '！'}</span>
              <span style={{ flex: 1 }}>
                <strong>
                  {r.total}/180 · {r.mode}
                </strong>
                <span className="muted" style={{ display: 'block', fontSize: 13 }}>
                  {dateStr}
                </span>
              </span>
              {!ok && (
                <span className="muted" style={{ fontSize: 12 }}>
                  {S.invalidRecord}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuestionRunner(props: {
  questions: Question[];
  index: number;
  onIndexChange: (i: number) => void;
  answers: Record<string, number>;
  onSelect: (qid: string, v: number) => void;
  mode: ExamMode;
  secondsLeft: number;
  submitting: boolean;
  onSubmit: () => void;
}) {
  const { S } = useStrings();
  const {
    questions,
    index,
    onIndexChange,
    answers,
    onSelect,
    mode,
    secondsLeft,
    submitting,
    onSubmit,
  } = props;
  const q = questions[index];
  const playedRef = useRef<Set<string>>(new Set());

  // Reset penanda audio tiap set soal baru.
  useEffect(() => {
    playedRef.current.clear();
    return () => stopSpeaking();
  }, [questions]);

  // Putar otomatis sekali saat soal listening tampil.
  useEffect(() => {
    const cur = questions[index];
    if (
      cur &&
      cur.section === 'listening' &&
      cur.script &&
      ttsSupported() &&
      !playedRef.current.has(cur.id)
    ) {
      playedRef.current.add(cur.id);
      const t = setTimeout(() => speakListening(cur.script!, cur.prompt), 600);
      return () => clearTimeout(t);
    }
  }, [questions, index]);
  if (!q) return null;
  const choices = Array.isArray(q.choices) ? q.choices : [];
  const selected = answers[q.id];
  const showFeedback = mode === 'quick' && selected != null;

  const sectionLabel =
    q.section === 'listening'
      ? S.sectionListening
      : q.section === 'reading'
        ? S.sectionReading
        : S.sectionKnowledge;

  return (
    <div className="stack">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <p className="muted" style={{ margin: 0 }}>
          {index + 1} / {questions.length}
        </p>
        <span style={{ flex: 1 }} />
        {mode !== 'quick' && (
          <span
            className={'timer-pill' + (secondsLeft < 300 ? ' danger' : '')}
            role="timer"
            aria-label={S.timeLeft}
          >
            {formatTime(secondsLeft)}
          </span>
        )}
      </div>

      <div className="card stack">
        <span className="section-badge">{sectionLabel}</span>
        {q.section === 'listening' && q.script && ttsSupported() && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => q.script && speakListening(q.script, q.prompt)}
            style={{ fontSize: 16 }}
          >
            {S.playAudio}
          </button>
        )}
        <strong style={{ fontSize: 16 }}>{q.prompt}</strong>
        <div className="stack">
          {choices.map((choice, i) => {
            const value = i + 1; // 1-based, sesuai urutan choices
            const isSelected = selected === value;
            const isCorrect = checkAnswer(q, value);
            let style: React.CSSProperties = {};
            if (showFeedback && isCorrect) {
              style = {
                background: 'var(--color-success)',
                borderColor: 'var(--color-success)',
                color: '#fff',
              };
            } else if (showFeedback && isSelected && !isCorrect) {
              style = {
                background: 'var(--color-error)',
                borderColor: 'var(--color-error)',
                color: '#fff',
              };
            } else if (isSelected) {
              style = {
                background: 'var(--color-primary)',
                borderColor: 'var(--color-primary)',
                color: '#fff',
              };
            }
            return (
              <button
                key={value}
                type="button"
                className="btn-secondary"
                onClick={() => onSelect(q.id, value)}
                style={{ textAlign: 'left', ...style }}
              >
                {String(choice)}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          className="btn-secondary"
          style={{ flex: 1, opacity: index === 0 ? 0.4 : 1 }}
          disabled={index === 0}
          onClick={() => onIndexChange(Math.max(0, index - 1))}
        >
          {S.previousQuestion}
        </button>
        <button
          type="button"
          className="btn-secondary"
          style={{ flex: 1, opacity: index === questions.length - 1 ? 0.4 : 1 }}
          disabled={index === questions.length - 1}
          onClick={() => onIndexChange(Math.min(questions.length - 1, index + 1))}
        >
          {S.nextQuestion}
        </button>
      </div>

      <button
        type="button"
        className="btn"
        disabled={submitting}
        style={{ opacity: submitting ? 0.6 : 1 }}
        onClick={onSubmit}
      >
        {submitting ? S.loading : S.submit}
      </button>
    </div>
  );
}

function ResultView(props: { result: ScoreResult; onRetry: () => void }) {
  const { S } = useStrings();
  const { result, onRetry } = props;
  const ok = result.passed;
  return (
    <div className="stack">
      <div className={'card center result-hero' + (ok ? ' pass' : ' fail')}>
        <div className="result-status">{ok ? S.passed : S.failed}</div>
        <div className="result-score">
          {result.total}
          <span>/180</span>
        </div>
        <p className="muted" style={{ fontSize: 13, margin: '8px 0 0' }}>
          {S.estimatedScore}
        </p>
      </div>

      <div className="card stack">
        <ScoreBar label={S.sectionKnowledge} value={result.knowledge} max={result.knowledgeMax} />
        {result.knowledgeMax === 60 && (
          <ScoreBar label={S.sectionReading} value={result.reading} max={60} />
        )}
        <ScoreBar label={S.sectionListening} value={result.listening} max={60} />
      </div>

      <button type="button" className="btn" onClick={onRetry}>
        {S.retry}
      </button>
    </div>
  );
}

function ScoreBar(props: { label: string; value: number; max: number }) {
  const pct = props.max > 0 ? Math.round((props.value / props.max) * 100) : 0;
  return (
    <div className="score-bar-row">
      <div className="score-bar-top">
        <span>{props.label}</span>
        <strong>
          {props.value}/{props.max}
        </strong>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
