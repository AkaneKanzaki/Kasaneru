import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStrings } from '../lib/i18n';
import { LEVELS, currentLevel, setLevel, type Level } from '../lib/levelStore';
import { getProgress } from '../lib/store';
import { completedLessonIds, lessonIdsForLevel } from '../lib/lessonService';
import { dueCount } from '../lib/srsService';

// Beranda: sapaan hero, ubin statistik, progres level, CTA kartu jatuh tempo,
// dan kartu aktivitas bergambar.
export default function Dashboard() {
  const { S } = useStrings();
  const navigate = useNavigate();
  const [level, setLevelState] = useState<Level>('N5');
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lessonsDone, setLessonsDone] = useState(0);
  const [lessonsTotal, setLessonsTotal] = useState(0);
  const [cardsDue, setCardsDue] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (activeLevel: Level) => {
    setLoading(true);
    try {
      const [completed, levelIds, due] = await Promise.all([
        completedLessonIds(),
        lessonIdsForLevel(activeLevel),
        dueCount({ levelId: activeLevel }),
      ]);
      const completedSet = new Set([...(completed ?? [])].map(String));
      const levelSet = new Set((levelIds ?? []).map(String));
      let done = 0;
      levelSet.forEach((id) => {
        if (completedSet.has(id)) done += 1;
      });
      setLessonsDone(done);
      setLessonsTotal(levelSet.size);
      setCardsDue(due || 0);

      const p = getProgress();
      setXp(p.xp);
      setStreak(p.streakCount);
    } catch {
      // tampilkan ringkasan parsial apa adanya
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const lv = await currentLevel();
      setLevelState(lv);
      await load(lv);
    })();
  }, [load]);

  const changeLevel = (lv: Level) => {
    if (lv === level) return;
    setLevel(lv);
    setLevelState(lv);
    void load(lv);
  };

  const navItems = [
    { title: S.kana, subtitle: S.tapToPractice, glyph: 'あ', route: '/kana' },
    { title: S.lessons, subtitle: S.startLesson, glyph: '文', route: '/lessons' },
    { title: S.flashcards, subtitle: S.flashcardsTitle, glyph: '単', route: '/flashcards' },
    { title: S.exam, subtitle: S.examTitle, glyph: '試', route: '/exam' },
  ];

  const hour = new Date().getHours();
  const greeting = hour < 11 ? S.goodMorning : hour < 18 ? S.goodAfternoon : S.goodEvening;
  const progress = lessonsTotal > 0 ? Math.round((lessonsDone / lessonsTotal) * 100) : 0;

  return (
    <div className="page">
      {loading ? (
        <p className="center muted">{S.loading}</p>
      ) : (
        <div className="stack">
          {/* Hero */}
          <div className="hero-card">
            <div className="hero-text">
              <p className="hero-greeting">{greeting}</p>
              <p className="hero-sub">{S.heroSubtitle}</p>
            </div>
            <span className="hero-torii" aria-hidden="true">⛩️</span>
          </div>

          {/* Statistik */}
          <div className="stat-row">
            <div className="card stat-tile">
              <span className="stat-icon" aria-hidden="true">連</span>
              <strong>{streak}</strong>
              <span className="muted">{S.yourStreak}</span>
            </div>
            <div className="card stat-tile">
              <span className="stat-icon" aria-hidden="true">力</span>
              <strong>{xp}</strong>
              <span className="muted">{S.yourXp}</span>
            </div>
            <div className="card stat-tile">
              <span className="stat-icon" aria-hidden="true">学</span>
              <strong>{lessonsDone}/{lessonsTotal}</strong>
              <span className="muted">{S.completed}</span>
            </div>
          </div>

          {/* Level + progres */}
          <div className="card stack">
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <strong>{S.selectStudyLevel}</strong>
              <span className="muted" style={{ fontSize: 13 }}>{progress}%</span>
            </div>
            <div className="chips-scroll" role="tablist" aria-label={S.selectStudyLevel}>
              {LEVELS.map((l) => (
                <button
                  key={l}
                  type="button"
                  role="tab"
                  aria-selected={l === level}
                  className={'chip' + (l === level ? ' active' : '')}
                  onClick={() => changeLevel(l)}
                >
                  {l}
                </button>
              ))}
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Kartu jatuh tempo */}
          {cardsDue > 0 && (
            <button
              type="button"
              className="card due-cta"
              onClick={() => navigate('/flashcards')}
            >
              <span className="glyph-tile" aria-hidden="true">学</span>
              <span style={{ flex: 1, textAlign: 'left' }}>
                <span style={{ display: 'block', fontWeight: 700 }}>
                  {cardsDue} {S.dueNow}
                </span>
                <span className="muted" style={{ fontSize: 13 }}>{S.reviewNow} →</span>
              </span>
            </button>
          )}

          {/* Aktivitas */}
          <h2 className="section-title" style={{ marginBottom: 0 }}>{S.pickActivity}</h2>
          <div className="stack">
            {navItems.map((item) => (
              <button
                key={item.route}
                type="button"
                className="card activity-card"
                onClick={() => navigate(item.route)}
              >
                <span className="glyph-tile" aria-hidden="true">{item.glyph}</span>
                <span style={{ flex: 1, textAlign: 'left' }}>
                  <span style={{ display: 'block', fontWeight: 700 }}>
                    {item.title}
                  </span>
                  <span className="muted" style={{ fontSize: 13 }}>
                    {item.subtitle}
                  </span>
                </span>
                <span className="muted" aria-hidden="true">›</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
