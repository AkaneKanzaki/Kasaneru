import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { pickTitle, useStrings } from '../lib/i18n';
import { LEVELS, currentLevel, setLevel, type Level } from '../lib/levelStore';
import * as lessonService from '../lib/lessonService';
import type { Lesson, Module } from '../lib/lessonService';

/** Satu modul: header lipat + daftar pelajaran + progress selesai/total. */
function ModuleSection({
  module,
  completedIds,
}: {
  module: Module;
  completedIds: Set<string>;
}) {
  const { S, lang } = useStrings();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loadingLessons, setLoadingLessons] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await lessonService.lessons(module.id);
        if (!cancelled) setLessons(rows);
      } catch {
        if (!cancelled) setLessons([]);
      } finally {
        if (!cancelled) setLoadingLessons(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [module.id]);

  const done = lessons.filter((l) => completedIds.has(l.id)).length;
  const total = lessons.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="btn-secondary"
        style={{
          width: '100%',
          border: 'none',
          borderRadius: 0,
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <span style={{ flex: 1 }}>
          <span style={{ fontWeight: 600 }}>
            {module.code.toUpperCase()} · {pickTitle(lang, module.title_en, module.title_id)}
          </span>
          {(module.objective_en || module.objective_id) && (
            <span className="muted" style={{ display: 'block', fontSize: '0.85em', marginTop: 4 }}>
              {pickTitle(lang, module.objective_en ?? '', module.objective_id)}
            </span>
          )}
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <span className="progress-track" style={{ flex: 1 }}>
              <span className="progress-fill" style={{ width: `${pct}%` }} />
            </span>
            <span className="muted" style={{ fontSize: '0.85em' }}>
              {done}/{total} {S.completed}
            </span>
          </span>
        </span>
        <span aria-hidden>{expanded ? '▾' : '▸'}</span>
      </button>

      {expanded && (
        <div>
          {loadingLessons ? (
            <p className="muted center" style={{ padding: 16 }}>
              {S.loading}
            </p>
          ) : (
            lessons.map((lesson) => {
              const isDone = completedIds.has(lesson.id);
              return (
                <button
                  key={lesson.id}
                  type="button"
                  onClick={() => navigate(`/lessons/${lesson.id}`)}
                  className="btn-secondary"
                  style={{
                    width: '100%',
                    border: 'none',
                    borderTop: '1px solid var(--color-border)',
                    borderRadius: 0,
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <span>
                    <span style={{ display: 'block' }}>
                      {lesson.code.toUpperCase()} · {pickTitle(lang, lesson.title_en, lesson.title_id)}
                    </span>
                    <span className="muted" style={{ fontSize: '0.85em' }}>
                      {lesson.duration_min ?? 15}
                    </span>
                  </span>
                  <span aria-hidden style={{ color: isDone ? 'var(--color-success)' : undefined }}>
                    {isDone ? '✓' : '›'}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

/** Browser modul → pelajaran untuk level belajar aktif (N5..N1). */
export default function Lessons() {
  const { S } = useStrings();
  const [level, setLevelState] = useState<Level>('N5');
  const [modules, setModules] = useState<Module[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const lvl = await currentLevel();
      const [mods, done] = await Promise.all([
        lessonService.modules(lvl),
        lessonService.completedLessonIds(),
      ]);
      setLevelState(lvl);
      setModules(mods);
      setCompletedIds(done);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function onLevelChange(next: Level) {
    if (next === level) return;
    setLevel(next);
    load();
  }

  return (
    <div className="page">
      <div className="stack">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>{S.level}</span>
          <div className="chips">
            {LEVELS.map((l) => (
              <button
                key={l}
                type="button"
                className={`chip${l === level ? ' active' : ''}`}
                onClick={() => onLevelChange(l)}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="muted center">{S.loading}</p>
        ) : error ? (
          <div className="error-box center">
            <p>{S.errorGeneric}</p>
            <button type="button" className="btn" onClick={load}>
              {S.retry}
            </button>
          </div>
        ) : modules.length === 0 ? (
          <p className="center">{S.noLessons}</p>
        ) : (
          modules.map((m) => (
            <ModuleSection key={m.id} module={m} completedIds={completedIds} />
          ))
        )}
      </div>
    </div>
  );
}
