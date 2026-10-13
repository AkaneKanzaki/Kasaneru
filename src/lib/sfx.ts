// Tiny synthesized sound effects (correct / wrong) — no audio assets,
// fully offline, generated with the Web Audio API.
const KEY = 'kasaneru.sfx';

export function sfxEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) !== '0';
  } catch {
    return true;
  }
}

export function setSfxEnabled(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? '1' : '0');
  } catch {
    /* abaikan */
  }
}

let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(
  freq: number,
  startAt: number,
  dur: number,
  type: OscillatorType,
  vol: number,
): void {
  const c = ac();
  if (!c) return;
  try {
    const t = c.currentTime + startAt;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  } catch {
    /* abaikan */
  }
}

/** Nada naik yang ceria untuk jawaban benar. */
export function playCorrect(): void {
  if (!sfxEnabled()) return;
  tone(523.25, 0, 0.22, 'sine', 0.22); // C5
  tone(783.99, 0.09, 0.3, 'sine', 0.22); // G5
}

/** Nada rendah yang lembut untuk jawaban salah. */
export function playWrong(): void {
  if (!sfxEnabled()) return;
  tone(196.0, 0, 0.25, 'triangle', 0.2); // G3
  tone(155.56, 0.12, 0.3, 'triangle', 0.18); // Eb3
}
