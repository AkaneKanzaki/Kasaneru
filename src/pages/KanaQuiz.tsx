import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import VoiceButton from '../components/VoiceButton';
import { useStrings } from '../lib/i18n';
import { getProgress, saveProgress, touchActivity } from '../lib/store';
import { speakJapanese, stopSpeaking, ttsSupported } from '../lib/tts';
import { autoVoiceEnabled } from '../lib/autoVoice';
import { playCorrect, playWrong } from '../lib/sfx';
import {
  HIRAGANA,
  KATAKANA,
  isMastered,
  recordAttempt,
  type KanaItem,
  type KanaStats,
} from '../lib/kanaData';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 4 opsi romaji: jawaban benar + 3 pengecoh dari silabari yang sama. */
function makeOptions(card: KanaItem, pool: KanaItem[]): string[] {
  const distractors = shuffle(pool.filter((k) => k.kana !== card.kana)).slice(0, 3);
  return shuffle([card.romaji, ...distractors.map((k) => k.romaji)]);
}

/**
 * Halaman kuis kana terpisah (/kana/quiz/:script): tebak bacaan romaji.
 * Satu tombol replay kecil di dalam kartu + satu toggle suara otomatis
 * di toolbar — tidak ada lagi tombol ganda yang membingungkan.
 */
export default function KanaQuiz() {
  const { S } = useStrings();
  const navigate = useNavigate();
  const { script } = useParams();
  const tab = script === 'katakana' ? 'katakana' : 'hiragana';
  const data = tab === 'hiragana' ? HIRAGANA : KATAKANA;

  const [progress, setProgress] = useState<Record<string, KanaStats>>(
    () => ({ ...getProgress().kana }),
  );
  const [order, setOrder] = useState<KanaItem[]>(() => shuffle(data));
  const [index, setIndex] = useState(0);
  const [options, setOptions] = useState<string[]>(() => makeOptions(order[0], data));
  const [picked, setPicked] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);

  const persist = useCallback((next: Record<string, KanaStats>) => {
    const p = getProgress();
    p.kana = next;
    saveProgress();
    touchActivity();
  }, []);

  const card = order[index];

  // Voice-over otomatis saat kartu baru tampil (default aktif).
  useEffect(() => {
    if (!finished && card && autoVoiceEnabled() && ttsSupported()) {
      const t = setTimeout(() => speakJapanese(card.kana), 350);
      return () => clearTimeout(t);
    }
  }, [card, finished]);

  useEffect(() => stopSpeaking, []);

  const nextCard = useCallback(() => {
    if (index + 1 < order.length) {
      const ni = index + 1;
      setIndex(ni);
      setOptions(makeOptions(order[ni], data));
      setPicked(null);
    } else {
      setFinished(true);
    }
  }, [index, order, data]);

  const answer = (romaji: string) => {
    if (!card || picked !== null) return;
    const correct = romaji === card.romaji;
    setPicked(romaji);
    if (correct) {
      playCorrect();
      setCorrectCount((n) => n + 1);
    } else {
      playWrong();
    }
    setProgress((prev) => {
      const next = { ...prev, [card.kana]: recordAttempt(prev[card.kana], correct) };
      persist(next);
      return next;
    });
    setTimeout(nextCard, 1000);
  };

  const retry = () => {
    const ord = shuffle(data);
    setOrder(ord);
    setIndex(0);
    setOptions(makeOptions(ord[0], data));
    setPicked(null);
    setCorrectCount(0);
    setFinished(false);
  };

  return (
    <div className="page">
      <div className="stack">
        <button type="button" className="back-link" onClick={() => navigate('/kana')}>
          ‹ {S.back}
        </button>
        <div>
          <h1 className="page-title">{S.kanaQuiz}</h1>
          <p className="page-subtitle">
            {tab === 'hiragana' ? S.hiragana : S.katakana}
          </p>
        </div>

        {finished ? (
          <div className="card stack center">
            <p style={{ fontSize: '3rem', margin: 0, color: 'var(--color-primary)' }}>✓</p>
            <h2 style={{ margin: 0 }}>{S.sessionComplete}</h2>
            <p className="muted" style={{ margin: 0 }}>
              {correctCount} ✓ / {order.length}
            </p>
            <button type="button" className="btn" onClick={retry}>
              {S.retry}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/kana')}>
              {S.kanaTitle}
            </button>
          </div>
        ) : (
          card && (
            <>
              <p className="muted" style={{ margin: 0 }}>
                {index + 1} / {order.length} · ✓ {correctCount}
                {isMastered(progress[card.kana]) ? ` · ${S.mastered}` : ''}
              </p>

              <div
                className="card"
                style={{
                  position: 'relative',
                  minHeight: 240,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {ttsSupported() && (
                  <VoiceButton
                    overlay
                    onPress={() => speakJapanese(card.kana)}
                    label={S.listen}
                  />
                )}
                <span style={{ fontSize: 96, lineHeight: 1.2 }}>{card.kana}</span>
              </div>

              <p className="muted center" style={{ margin: 0 }}>
                {S.tapCorrectReading}
              </p>

              <div className="stack" key={card.kana}>
                {options.map((romaji) => {
                  const isAnswer = romaji === card.romaji;
                  const isPicked = picked === romaji;
                  let style: React.CSSProperties = {};
                  if (picked !== null && isAnswer) {
                    style = {
                      background: 'var(--color-success)',
                      borderColor: 'var(--color-success)',
                      color: '#fff',
                    };
                  } else if (picked !== null && isPicked && !isAnswer) {
                    style = {
                      background: 'var(--color-error)',
                      borderColor: 'var(--color-error)',
                      color: '#fff',
                    };
                  }
                  return (
                    <button
                      key={romaji}
                      type="button"
                      className="card pressable"
                      style={{
                        width: '100%',
                        textAlign: 'center',
                        fontSize: 20,
                        fontWeight: 700,
                        padding: '14px',
                        ...style,
                      }}
                      onClick={() => answer(romaji)}
                      disabled={picked !== null}
                    >
                      {romaji}
                      {picked !== null && isAnswer && ' ✓'}
                    </button>
                  );
                })}
              </div>
            </>
          )
        )}
      </div>
    </div>
  );
}
