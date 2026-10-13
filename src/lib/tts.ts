// Japanese text-to-speech.
//
// - Android (native): @capacitor-community/text-to-speech — Web Speech API
//   (window.speechSynthesis) TIDAK berfungsi di Android WebView: getVoices()
//   kosong dan speak() diam-diam tidak bersuara.
// - Web: Web Speech API dengan pemilihan voice ja-JP eksplisit.
//
// cancel-before-speak menghindari playback bertumpuk/terpotong.

import { Capacitor } from '@capacitor/core';
import { TextToSpeech } from '@capacitor-community/text-to-speech';

const isNative = Capacitor.isNativePlatform();

function pickJapaneseVoice(): SpeechSynthesisVoice | null {
  try {
    const voices = window.speechSynthesis.getVoices();
    return (
      voices.find((v) => v.lang.toLowerCase() === 'ja-jp') ||
      voices.find((v) => v.lang.toLowerCase().startsWith('ja')) ||
      null
    );
  } catch {
    return null;
  }
}

// Warm up voice list (loads asynchronously on some platforms).
try {
  if (!isNative && 'speechSynthesis' in window) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
  }
} catch {
  /* TTS tidak tersedia */
}

export function ttsSupported(): boolean {
  if (isNative) return true;
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** Speak Japanese text. No-op where TTS is unavailable. */
export function speakJapanese(text: string): void {
  if (isNative) {
    // Native: stop dulu (flush), lalu bicara. Async tapi API tetap void
    // agar pemanggil tidak perlu diubah.
    void (async () => {
      try {
        await TextToSpeech.stop();
        await TextToSpeech.speak({
          text,
          lang: 'ja-JP',
          rate: 0.9,
          pitch: 1.0,
          volume: 1.0,
        });
      } catch {
        /* abaikan */
      }
    })();
    return;
  }
  if (!ttsSupported()) return;
  try {
    const synth = window.speechSynthesis;
    synth.cancel(); // cegah audio bertumpuk / terpotong
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    const voice = pickJapaneseVoice();
    if (voice) u.voice = voice;
    u.rate = 0.85;
    u.pitch = 1;
    synth.speak(u);
  } catch {
    /* abaikan */
  }
}

export function stopSpeaking(): void {
  if (isNative) {
    void TextToSpeech.stop().catch(() => {});
    return;
  }
  try {
    if (ttsSupported()) window.speechSynthesis.cancel();
  } catch {
    /* abaikan */
  }
}

/**
 * Bacakan naskah listening: label pembicara (男：/女：/…) dibuang supaya
 * TTS tidak membacakan "otoko" secara harfiah, lalu bacakan pertanyaannya.
 */
export function speakListening(script: string, prompt: string): void {
  const cleaned = script.replace(/^[^：\n]+：/gm, '').trim();
  speakJapanese(cleaned ? `${cleaned}\n${prompt}` : prompt);
}
