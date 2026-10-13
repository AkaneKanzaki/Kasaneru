# Konvensi repo kasaneru-web (Vite + React + TypeScript + Capacitor)

Dokumen ini dibaca sebelum menulis/mengubah kode. Tujuannya: satu agen
(manusia/AI) bisa melanjutkan kerja agen lain tanpa menebak-nebak.

## Arsitektur: local-first, tanpa backend

- **Tidak ada database, tidak ada login.** Semua progres user (XP, streak,
  penyelesaian pelajaran, kana, SRS, riwayat ujian) tersimpan di
  `localStorage` via `src/lib/store.ts`.
- **Konten dibundel di aplikasi**: pelajaran Markdown, kartu kosakata JSON,
  dan soal (hanya yang `approved`) tinggal di `src/content/`.
- **Backup/restore manual** di halaman Settings (export/import file JSON)
  menggantikan sinkronisasi antar-device.

## Struktur konten

- `src/content/lessons/{n5..n1}/lesson-*.md` — 248 pelajaran, frontmatter YAML
  (`code`, `module_code`, `title` [EN], `title_id`, `duration_min`).
- `src/content/lessons/index.json` — **generated**, jangan edit manual.
  Dibuat via `node scripts/build-lesson-index.mjs` (baca ulang setelah
  menambah/mengubah pelajaran atau judul modul).
- `src/content/lessons/index_{n5..n1}.json` + `scripts/objectives.json` —
  sumber judul modul & objective untuk generator di atas.
- `src/content/vocab/{n5..n1}.json` — 3.175 kartu (langsung dari pipeline).
- `src/content/questions/{n5..n1}.json` — **generated**, hanya soal
  `approved`. Dibuat via `node scripts/build-questions.mjs` dari
  `src/content/questions-src/{n5..n1}.json` (file review).
- `scripts/` — build script Node, dijalankan manual, bukan saat build Vite.

## Lapisan data (src/lib)

- `store.ts` — `getProgress()` / `saveProgress()` / `addXp(n)` /
  `touchActivity()` / `exportBackup()` / `importBackup()` / `resetProgress()`.
  Satu-satunya tempat yang menyentuh `localStorage` untuk progres.
- `lessonService.ts` — baca index + Markdown (lazy via `import.meta.glob`
  `?raw`); completions via store. ID pelajaran: `N5-L01`, modul: `N5-M1`.
- `srsService.ts` — SM-2 di atas vocab JSON + state di store. Kartu baru =
  jatuh tempo. ID kartu: `LEVEL|word|reading`.
- `examService.ts` — soal dari bundle; attempt di memori; hasil masuk
  `examHistory` di store. Jangan kirim soal pending ke bundle.
- `levelStore.ts` — level belajar aktif (localStorage `kasaneru-level`).
  Beda dari `targetLevel` di store (tujuan user).
- `kanaData.ts` — data kana statis + aturan mastery (murni, tanpa IO).
- `scoring.ts` — scoring estimasi JLPT (murni). Skor selalu disebut estimasi.
- `i18n.tsx` — `useStrings()` → `{ S, lang, setLang }`; `pickTitle(lang, en, id)`.
  Default English, pilihan di localStorage.
- `theme.tsx` — `useTheme()` → `{ theme, toggle }`.

Aturan:
- Jangan akses `localStorage` langsung dari pages/services untuk progres —
  lewat `store.ts`.
- Fungsi service tetap `async` (kontrak lama) walau datanya lokal.
- XP: pelajaran selesai +10, review kartu +2, ujian lulus +50 / tidak +20.
- Streak: `touchActivity()` dipanggil di App mount + setiap penambah XP.

## UI

- Semua teks UI via `useStrings()` (`src/lib/strings/en.ts`, `id.ts` —
  kunci harus sama persis, dicek TS). Jangan hardcode teks.
- Warna hanya via CSS variables (`var(--color-*))` dari `src/index.css`.
  Jangan hardcode hex di komponen.
- Class umum: `.page`, `.card`, `.btn`, `.btn-secondary`, `.chips`,
  `.chip.active`, `.error-box`, `.muted`, `.center`, `.stack`, `.label`, `.input`.
- Router: `HashRouter` (wajib untuk Capacitor). Bottom nav di `Layout.tsx`.
- Halaman: Dashboard, Kana, Lessons, LessonDetail, Flashcards, Exam,
  Profile, Settings.

## Dilarang

- Menambah backend/auth tanpa persetujuan user.
- Memasukkan soal `pending`/`needs_review` ke bundle questions.
- Mengklaim skor ujian sebagai skor resmi JLPT.
- Mengambil/membajak naskah soal JLPT asli (hak cipta).

## Bank soal & anti-curang (tamper-evidence, bukan anti-tamper)

- `src/content/questions-src/{n5..n1}.json` = sumber review (boleh berisi
  `correct_answer` asli — TIDAK dibundel ke aplikasi).
- `scripts/build-questions.mjs` hanya membundel `review_status='approved'`
  dan mengganti kunci dengan `answer_hash` (keyed cyrb53, salt di
  `src/lib/site.ts`). Bundle TIDAK BOLEH berisi `correct_answer`,
  `source_url`, `notes`, atau metadata review lain.
- Soal tanpa kunci valid / listening stub (tanpa choices) di-skip dengan
  log — butuh dilengkapi saat review dosen.
- Hasil ujian ditandai `sig` (keyed hash atas isi record) di
  `examService.signExamRecord`; riwayat memverifikasi via
  `verifyExamRecord` sebelum ditampilkan. Record editan manual tampil
  sebagai "tidak valid".
- JUJUR TENTANG BATASNYA (tulis di kode, jangan disembunyikan): dengan 4
  opsi, hash apa pun bisa di-brute-force; kunci tertanam bisa diekstrak
  dari repo open-source ini. Ini menghentikan pengintip kasual & edit
  Notepad, bukan penyerang serius. Anti-cheat sungguhan butuh penilaian
  sisi server.
