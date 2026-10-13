import { useState } from 'react';
import { useStrings } from '../lib/i18n';
import type { Lang } from '../lib/strings/en';
import { LEVELS, type Level } from '../lib/levelStore';
import { getProgress, saveProgress } from '../lib/store';

/**
 * Onboarding pertama kali: sambutan + setup singkat (nama, target level,
 * bahasa). Hanya tampil untuk instalasi baru — user lama yang sudah punya
 * data progress langsung masuk aplikasi.
 */
export const ONBOARDED_KEY = 'kasaneru.onboarded';
const PROGRESS_KEY = 'kasaneru-progress-v1';

export function shouldShowOnboarding(): boolean {
  try {
    if (localStorage.getItem(ONBOARDED_KEY) === '1') return false;
    // Instalasi lama: data progress sudah ada -> anggap sudah onboard.
    if (localStorage.getItem(PROGRESS_KEY) != null) return false;
    return true;
  } catch {
    return false;
  }
}

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const { S, lang, setLang } = useStrings();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [target, setTarget] = useState<Level>('N5');
  const base = import.meta.env.BASE_URL;

  const markDone = () => {
    try {
      localStorage.setItem(ONBOARDED_KEY, '1');
    } catch {
      // Abaikan: onboarding tampil lagi di sesi berikutnya.
    }
    onDone();
  };

  const finish = () => {
    const p = getProgress();
    const clean = name.trim().slice(0, 60);
    if (clean) p.displayName = clean;
    p.targetLevel = target;
    saveProgress();
    markDone();
  };

  return (
    <div className="onboard">
      <div className="onboard-card">
        {step === 0 ? (
          <>
            <img className="onboard-logo" src={`${base}icons/icon-192.png`} alt="Kasaneru" draggable={false} />
            <h1 className="onboard-title">{S.onboardWelcome}</h1>
            <p className="muted" style={{ margin: 0 }}>
              重ねる · {S.onboardIntro}
            </p>
            <ul className="onboard-list">
              <li>
                <span aria-hidden="true">学</span> {S.onboardLessons}
              </li>
              <li>
                <span aria-hidden="true">🃏</span> {S.onboardFlashcards}
              </li>
              <li>
                <span aria-hidden="true">試</span> {S.onboardExam}
              </li>
            </ul>
            <button type="button" className="btn" onClick={() => setStep(1)}>
              {S.onboardNext}
            </button>
            <button type="button" className="link-quiet" onClick={markDone}>
              {S.onboardSkip}
            </button>
          </>
        ) : (
          <>
            <div>
              <div className="label" style={{ textAlign: 'left' }}>{S.onboardName}</div>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={S.onboardNamePlaceholder}
                maxLength={60}
                aria-label={S.onboardName}
              />
            </div>
            <div>
              <div className="label" style={{ textAlign: 'left' }}>{S.onboardTarget}</div>
              <div className="chips-scroll" role="tablist" aria-label={S.onboardTarget}>
                {LEVELS.map((l) => (
                  <button
                    key={l}
                    type="button"
                    role="tab"
                    aria-selected={l === target}
                    className={'chip' + (l === target ? ' active' : '')}
                    onClick={() => setTarget(l)}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="label" style={{ textAlign: 'left' }}>{S.language}</div>
              <div className="chips" role="group" aria-label={S.language}>
                {(['en', 'id'] as Lang[]).map((l) => (
                  <button
                    key={l}
                    type="button"
                    className={'chip' + (lang === l ? ' active' : '')}
                    onClick={() => setLang(l)}
                  >
                    {l === 'en' ? 'English' : 'Indonesia'}
                  </button>
                ))}
              </div>
            </div>
            <button type="button" className="btn" onClick={finish}>
              {S.onboardStart}
            </button>
            <button type="button" className="link-quiet" onClick={markDone}>
              {S.onboardSkip}
            </button>
          </>
        )}
        <div className="onboard-dots" aria-hidden="true">
          <span className={step === 0 ? 'active' : ''} />
          <span className={step === 1 ? 'active' : ''} />
        </div>
      </div>
    </div>
  );
}
