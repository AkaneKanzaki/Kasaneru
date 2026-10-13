// Preferensi suara otomatis saat kartu kuis tampil (default aktif).
// Satu-satunya tempat toggle ini berada adalah Profile — layar kuis
// hanya punya satu tombol suara kecil (replay) per kartu.
const KEY = 'kasaneru.autovoice';

export function autoVoiceEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) !== '0';
  } catch {
    return true;
  }
}

export function setAutoVoiceEnabled(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? '1' : '0');
  } catch {
    /* abaikan */
  }
}
