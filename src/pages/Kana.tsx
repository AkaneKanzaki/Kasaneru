import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStrings } from '../lib/i18n';
import { getProgress, resetKanaProgress } from '../lib/store';
import { speakJapanese } from '../lib/tts';
import {
  HIRAGANA,
  KATAKANA,
  isMastered,
  type KanaStats,
} from '../lib/kanaData';

type Tab = 'hiragana' | 'katakana';

/**
 * Halaman hub Kana: progres, pilihan silabari, grid, dan tombol
 * untuk membuka halaman kuis terpisah (/kana/quiz/:script).
 */
export default function Kana() {
  const { S } = useStrings();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('hiragana');
  const [progress, setProgress] = useState<Record<string, KanaStats>>(
    () => ({ ...getProgress().kana }),
  );
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const data = tab === 'hiragana' ? HIRAGANA : KATAKANA;
  const masteredCount = data.filter((item) => isMastered(progress[item.kana])).length;
  const progressPct = data.length > 0 ? Math.round((masteredCount / data.length) * 100) : 0;

  const handleTap = (kana: string) => {
    speakJapanese(kana); // hanya tampilkan romaji + bunyikan audio
    // Catatan: tap di sini TIDAK mencatat attempt — Mastered hanya
    // diperoleh dari kuis (/kana/quiz/:script).
    setRevealed((prev) => ({ ...prev, [kana]: true }));
  };

  const handleReset = () => {
    if (!window.confirm(S.resetKanaConfirm)) return;
    resetKanaProgress(tab);
    setProgress((prev) => {
      const inScript = new Set(data.map((item) => item.kana));
      const next: Record<string, KanaStats> = {};
      for (const [k, v] of Object.entries(prev)) {
        if (!inScript.has(k)) next[k] = v;
      }
      return next;
    });
  };

  return (
    <div className="page">
      <div className="stack">
        <div>
          <h1 className="page-title">{S.kanaTitle}</h1>
          <p className="page-subtitle">{S.tapToPractice}</p>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <strong>
              {masteredCount}/{data.length} {S.mastered}
            </strong>
            <span className="muted" style={{ fontSize: 13 }}>{progressPct}%</span>
          </div>
          <div className="progress-track" style={{ marginTop: 8 }}>
            <div className="progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="muted"
            style={{
              background: 'none',
              border: 'none',
              padding: '8px 0 0',
              fontSize: 12,
              cursor: 'pointer',
              textDecoration: 'underline',
              textUnderlineOffset: 2,
              alignSelf: 'flex-start',
            }}
          >
            {S.resetKanaProgress} ({tab === 'hiragana' ? S.hiragana : S.katakana})
          </button>
        </div>

        <div className="seg" role="tablist" aria-label={S.kana}>
          <button
            type="button" role="tab" aria-selected={tab === 'hiragana'}
            onClick={() => setTab('hiragana')}
          >
            {S.hiragana}
          </button>
          <button
            type="button" role="tab" aria-selected={tab === 'katakana'}
            onClick={() => setTab('katakana')}
          >
            {S.katakana}
          </button>
        </div>

        <button type="button" className="btn" onClick={() => navigate(`/kana/quiz/${tab}`)}>
          {S.startQuiz} →
        </button>

        <div
          key={tab}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}
        >
          {data.map((item) => {
            const mastered = isMastered(progress[item.kana]);
            const showRomaji = !!revealed[item.kana];
            return (
              <button
                key={item.kana}
                type="button"
                onClick={() => handleTap(item.kana)}
                aria-label={`${item.kana}${showRomaji ? ` (${item.romaji})` : ''}`}
                style={{
                  position: 'relative',
                  aspectRatio: '0.85',
                  borderRadius: '12px',
                  border: mastered
                    ? '2px solid var(--color-primary)'
                    : '1.5px solid var(--color-border)',
                  background: mastered ? 'var(--color-primary-soft)' : 'var(--color-surface)',
                  color: mastered ? 'var(--color-primary)' : 'var(--color-ink)',
                  fontWeight: mastered ? 700 : 400,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  transition: 'transform 0.12s ease',
                }}
                onTouchStart={(e) => { e.currentTarget.style.transform = 'scale(0.93)'; }}
                onTouchEnd={(e) => { e.currentTarget.style.transform = ''; }}
              >
                {mastered && (
                  <span style={{ position: 'absolute', top: '4px', right: '8px', fontSize: '12px', color: 'var(--color-primary)', fontWeight: 700 }}>
                    ✓
                  </span>
                )}
                <span style={{ fontSize: '28px', lineHeight: 1.2 }}>{item.kana}</span>
                <span style={{ fontSize: '12px', color: 'var(--color-muted)', minHeight: '16px' }}>
                  {showRomaji ? item.romaji : ' '}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
