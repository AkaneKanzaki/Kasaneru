import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStrings } from '../lib/i18n';
import type { Lang } from '../lib/strings/en';
import { useTheme } from '../lib/theme';
import { GITHUB_REPO_URL } from '../lib/site';
import { buildLabel } from '../lib/buildInfo';
import { setSfxEnabled, sfxEnabled } from '../lib/sfx';
import { setAutoVoiceEnabled, autoVoiceEnabled } from '../lib/autoVoice';
import { LEVELS, type Level } from '../lib/levelStore';
import {
  downloadFile,
  exportBackup,
  getProgress,
  importBackup,
  resetProgress,
  saveProgress,
} from '../lib/store';

// Profil + pengaturan dalam kartu berkelompok: identitas, statistik,
// preferensi, audio, data, tentang.
export default function Profile() {
  const { S, lang, setLang } = useStrings();
  const { theme, toggle } = useTheme();
  const fileRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState('');
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [targetLevel, setTargetLevel] = useState<Level>('N5');
  const [examsTaken, setExamsTaken] = useState(0);
  const [lessonsDone, setLessonsDone] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [sfx, setSfx] = useState(true);
  const [autoVoice, setAutoVoice] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const p = getProgress();
    setDisplayName(p.displayName);
    setXp(p.xp);
    setStreak(p.streakCount);
    setTargetLevel(p.targetLevel);
    setExamsTaken(p.examHistory.length);
    setLessonsDone(Object.keys(p.completedLessons).length);
    setSfx(sfxEnabled());
    setAutoVoice(autoVoiceEnabled());
    setLoading(false);
  }, []);

  const showNotice = (msg: string | null, err = false) => {
    setNotice(msg);
    setIsError(err);
  };

  const saveName = () => {
    const p = getProgress();
    p.displayName = displayName.trim().slice(0, 60);
    setDisplayName(p.displayName);
    saveProgress();
  };

  const changeTargetLevel = (lv: Level) => {
    const p = getProgress();
    p.targetLevel = lv;
    saveProgress();
    setTargetLevel(lv);
  };

  const doExport = () => {
    try {
      const date = new Date().toISOString().slice(0, 10);
      downloadFile(`kasaneru-backup-${date}.json`, exportBackup());
      showNotice(null);
    } catch {
      showNotice(S.errorGeneric, true);
    }
  };

  const doImportFile = async (file: File) => {
    try {
      const text = await file.text();
      importBackup(text);
      showNotice(S.importSuccess);
      setTimeout(() => window.location.reload(), 1200);
    } catch {
      showNotice(S.importFailed, true);
    }
  };

  const doReset = () => {
    if (!window.confirm(S.resetConfirm)) return;
    resetProgress();
    showNotice(S.dataReset);
    setTimeout(() => window.location.reload(), 1200);
  };

  return (
    <div className="page">
      {loading ? (
        <p className="center muted">{S.loading}</p>
      ) : (
        <div className="stack">
          <div>
            <h1 className="page-title">{S.profile}</h1>
          </div>

          {/* Identitas */}
          <div className="card stack">
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <span className="glyph-tile" style={{ width: 56, height: 56, fontSize: 30 }} aria-hidden="true">
                人
              </span>
              <div style={{ minWidth: 0 }}>
                <strong style={{ fontSize: 18, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {displayName || S.profile}
                </strong>
                <span className="muted" style={{ fontSize: 13 }}>
                  {S.targetLevel}: {targetLevel}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                id="displayName"
                className="input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={S.profile}
                maxLength={60}
                style={{ flex: 1 }}
                aria-label={S.profile}
              />
              <button type="button" className="btn-secondary" style={{ width: 'auto' }} onClick={saveName}>
                {S.save}
              </button>
            </div>
          </div>

          {/* Statistik */}
          <div className="stat-row" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <div className="card stat-tile">
              <span className="stat-icon" aria-hidden="true">力</span>
              <strong>{xp}</strong>
              <span className="muted">{S.yourXp}</span>
            </div>
            <div className="card stat-tile">
              <span className="stat-icon" aria-hidden="true">連</span>
              <strong>{streak} {S.days}</strong>
              <span className="muted">{S.yourStreak}</span>
            </div>
            <div className="card stat-tile">
              <span className="stat-icon" aria-hidden="true">学</span>
              <strong>{lessonsDone}</strong>
              <span className="muted">{S.completed}</span>
            </div>
            <div className="card stat-tile">
              <span className="stat-icon" aria-hidden="true">試</span>
              <strong>{examsTaken}</strong>
              <span className="muted">{S.exam}</span>
            </div>
          </div>

          {/* Preferensi */}
          <div className="card">
            <strong style={{ display: 'block', marginBottom: 4 }}>{S.preferences}</strong>
            <div className="chips-scroll" role="tablist" aria-label={S.targetLevel} style={{ margin: '8px 0 4px' }}>
              {LEVELS.map((l) => (
                <button
                  key={l}
                  type="button"
                  role="tab"
                  aria-selected={l === targetLevel}
                  className={'chip' + (l === targetLevel ? ' active' : '')}
                  onClick={() => changeTargetLevel(l)}
                >
                  {l}
                </button>
              ))}
            </div>
            <div className="setting-row">
              <span className="setting-label">{S.language}</span>
              <div className="chips" role="group" aria-label={S.language} style={{ flexWrap: 'nowrap' }}>
                {(['en', 'id'] as Lang[]).map((l) => (
                  <button
                    key={l}
                    type="button"
                    className={'chip' + (lang === l ? ' active' : '')}
                    onClick={() => setLang(l)}
                  >
                    {l === 'en' ? 'EN' : 'ID'}
                  </button>
                ))}
              </div>
            </div>
            <div className="setting-row">
              <span className="setting-label">{S.themeLabel}</span>
              <div className="chips" role="group" aria-label={S.themeLabel} style={{ flexWrap: 'nowrap' }}>
                <button
                  type="button"
                  className={'chip' + (theme === 'light' ? ' active' : '')}
                  onClick={() => theme !== 'light' && toggle()}
                  aria-pressed={theme === 'light'}
                >
                  昼
                </button>
                <button
                  type="button"
                  className={'chip' + (theme === 'dark' ? ' active' : '')}
                  onClick={() => theme !== 'dark' && toggle()}
                  aria-pressed={theme === 'dark'}
                >
                  夜
                </button>
              </div>
            </div>
          </div>

          {/* Audio */}
          <div className="card">
            <strong style={{ display: 'block', marginBottom: 4 }}>{S.audio}</strong>
            <div className="setting-row">
              <span className="setting-label">{S.soundEffects}</span>
              <OnOff
                on={sfx}
                label={S.soundEffects}
                onChange={(v) => { setSfxEnabled(v); setSfx(v); }}
              />
            </div>
            <div className="setting-row">
              <span className="setting-label">{S.autoVoice}</span>
              <OnOff
                on={autoVoice}
                label={S.autoVoice}
                onChange={(v) => { setAutoVoiceEnabled(v); setAutoVoice(v); }}
              />
            </div>
          </div>

          {/* Data */}
          <div className="card stack">
            <strong>{S.backupTitle}</strong>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              {S.backupDesc}
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="btn-secondary" style={{ width: 'auto', flex: 1 }} onClick={doExport}>
                ↓ {S.exportBackup}
              </button>
              <button
                type="button" className="btn-secondary" style={{ width: 'auto', flex: 1 }}
                onClick={() => fileRef.current?.click()}
              >
                ↑ {S.importBackup}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (f) void doImportFile(f);
                }}
              />
            </div>
            {notice && (
              <p className={isError ? 'error-box' : 'muted'} style={{ margin: 0, fontSize: 13 }}>
                {notice}
              </p>
            )}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
              <button type="button" className="btn-danger" style={{ width: 'auto' }} onClick={doReset}>
                {S.resetData}
              </button>
            </div>
          </div>

          {/* Tentang */}
          <div className="card stack">
            <strong>{S.aboutTitle}</strong>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              {S.aboutText}
            </p>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              {S.version} {buildLabel(lang)}
            </p>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <Link to="/legal/privacy">{S.privacyPolicy}</Link>
              <Link to="/legal/terms">{S.termsOfUse}</Link>
            </div>
            {GITHUB_REPO_URL && (
              <div>
                <a
                  className="btn-secondary"
                  href={GITHUB_REPO_URL}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none', width: 'auto' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                  </svg>
                  {S.githubRepo}
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Toggle on/off kompak untuk baris pengaturan. */
function OnOff(props: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  const { S } = useStrings();
  return (
    <div className="chips" role="group" aria-label={props.label} style={{ flexWrap: 'nowrap' }}>
      <button
        type="button"
        className={'chip' + (props.on ? ' active' : '')}
        onClick={() => props.onChange(true)}
        aria-pressed={props.on}
      >
        入 {S.soundOn}
      </button>
      <button
        type="button"
        className={'chip' + (!props.on ? ' active' : '')}
        onClick={() => props.onChange(false)}
        aria-pressed={!props.on}
      >
        切 {S.soundOff}
      </button>
    </div>
  );
}
