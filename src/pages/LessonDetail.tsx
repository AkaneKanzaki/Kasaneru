import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { pickTitle, useStrings } from '../lib/i18n';
import * as lessonService from '../lib/lessonService';
import type { Lesson, LessonFull, Module } from '../lib/lessonService';

/**
 * Halaman baca satu pelajaran: tombol kembali, meta (modul/kode/durasi),
 * progress bar baca, body Markdown, navigasi prev/next, tombol selesai.
 */
export default function LessonDetail() {
  const { S, lang } = useStrings();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const lessonId = id ?? '';

  const [lesson, setLesson] = useState<LessonFull | null>(null);
  const [module, setModule] = useState<Module | null>(null);
  const [siblings, setSiblings] = useState<{ prev: Lesson | null; next: Lesson | null }>({
    prev: null,
    next: null,
  });
  const [isDone, setIsDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [readPct, setReadPct] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [detail, doneIds] = await Promise.all([
          lessonService.lessonDetail(lessonId, lang),
          lessonService.completedLessonIds(),
        ]);
        if (cancelled) return;
        setLesson(detail);
        setModule(lessonService.moduleOfLesson(lessonId));
        setSiblings(lessonService.prevNextLesson(lessonId));
        setIsDone(doneIds.has(lessonId));
      } catch {
        if (!cancelled) setLesson(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    window.scrollTo(0, 0);
    return () => {
      cancelled = true;
    };
  }, [lessonId, lang]);

  // Progress bar baca mengikuti scroll window. Di-throttle via rAF agar
  // scroll tetap mulus — tanpa ini setiap scroll event me-re-render halaman.
  useEffect(() => {
    if (!lesson) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setReadPct(max > 0 ? Math.min(100, (el.scrollTop / max) * 100) : 0);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [lesson]);

  async function toggleComplete() {
    try {
      if (isDone) {
        await lessonService.uncompleteLesson(lessonId);
      } else {
        await lessonService.completeLesson(lessonId);
      }
      setIsDone((v) => !v);
    } catch {
      // Abaikan: status tombol tetap seperti semula.
    }
  }

  const title = lesson ? pickTitle(lang, lesson.title_en, lesson.title_id) : S.lessons;

  return (
    <div className="page">
      {loading ? (
        <p className="muted center">{S.loading}</p>
      ) : !lesson ? (
        <p className="center">{S.lessonNotFound}</p>
      ) : (
        <div className="stack">
          <div
            className="read-progress"
            aria-hidden="true"
            style={{ width: `${readPct}%` }}
          />
          <button type="button" className="back-link" onClick={() => navigate('/lessons')}>
            ‹ {S.back}
          </button>

          <div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
              {module && (
                <span className="section-badge">{module.code.toUpperCase()}</span>
              )}
              <span className="muted" style={{ fontSize: 13 }}>
                {lesson.code.toUpperCase()}
                {lesson.duration_min ? ` · ⏱ ${lesson.duration_min} ${S.minutes}` : ''}
              </span>
              {isDone && (
                <span style={{ color: 'var(--color-success)', fontWeight: 800, fontSize: 13 }}>
                  ✓ {S.completed}
                </span>
              )}
            </div>
            <h1 className="page-title" style={{ marginTop: 0 }}>{title}</h1>
          </div>

          <div className="card markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{lesson.body_md ?? ''}</ReactMarkdown>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {siblings.prev ? (
              <button
                type="button"
                className="btn-secondary"
                style={{ flex: 1 }}
                onClick={() => navigate(`/lessons/${siblings.prev!.id}`)}
              >
                ‹ {pickTitle(lang, siblings.prev.title_en, siblings.prev.title_id)}
              </button>
            ) : (
              <span style={{ flex: 1 }} />
            )}
            {siblings.next && (
              <button
                type="button"
                className="btn-secondary"
                style={{ flex: 1 }}
                onClick={() => navigate(`/lessons/${siblings.next!.id}`)}
              >
                {pickTitle(lang, siblings.next.title_en, siblings.next.title_id)} ›
              </button>
            )}
          </div>

          <button
            type="button"
            className={isDone ? 'btn-secondary' : 'btn'}
            onClick={toggleComplete}
          >
            {isDone ? `✓ ${S.unmarkComplete}` : S.markComplete}
          </button>
        </div>
      )}
    </div>
  );
}
