// String Bahasa Indonesia. Kunci harus sama persis dengan en.ts (dicek oleh TS).
import type { Strings } from './en';

export const id: Strings = {
  appName: 'Kasaneru',
  appTagline: 'Menumpuk ilmu lapis demi lapis, dari nol hingga N1.',
  tagline: 'Belajar bahasa Jepang dari nol hingga JLPT',

  // Setup (ditampilkan saat Supabase belum dikonfigurasi)

  // Auth

  // Home
  home: 'Beranda',
  greeting: 'Halo',
  continueLearning: 'Lanjutkan belajar',
  yourStreak: 'Streak harian',
  days: 'hari',
  yourXp: 'XP kamu',
  pickActivity: 'Pilih aktivitas',

  // Kana
  kana: 'Kana',
  kanaTitle: 'Latihan Kana',
  hiragana: 'Hiragana',
  katakana: 'Katakana',
  tapToPractice: 'Ketuk kana untuk berlatih',
  mastered: 'Dikuasai',
  kanaGrid: 'Grid',
  kanaCards: 'Kartu',
  startQuiz: 'Mulai kuis',
  kanaQuiz: 'Kuis Kana',
  goodMorning: 'Selamat pagi',
  goodAfternoon: 'Selamat siang',
  goodEvening: 'Selamat malam',
  heroSubtitle: 'Mari menumpuk lapisan baru hari ini.',
  reviewNow: 'Mulai review',
  listen: 'Dengar',
  autoVoice: 'Suara otomatis',
  guessMeaning: 'Apa arti kata ini?',
  next: 'Lanjut',
  tapCorrectReading: 'Ketuk bacaan yang benar',
  resetKanaProgress: 'Reset progres kana',
  resetKanaConfirm:
    'Hapus semua statistik kuis kana untuk silabari ini? Tindakan ini tidak bisa dibatalkan.',

  // Level
  level: 'Level',
  selectStudyLevel: 'Pilih level belajar',

  // Lessons
  lessons: 'Pelajaran',
  startLesson: 'Mulai pelajaran',
  markComplete: 'Tandai selesai',
  minutes: 'mnt',
  completed: 'Selesai',
  unmarkComplete: 'Batalkan tanda selesai',
  lessonNotFound: 'Pelajaran tidak ditemukan.',
  noLessons: 'Belum ada pelajaran. Konten dosen segera hadir.',

  // Flashcards
  flashcards: 'Kartu kata',
  flashcardsTitle: 'Hafalan Kosakata (SRS)',
  flashcardsSubtitle: 'Tebak artinya, naikkan level kata-katamu',
  accuracy: 'akurasi',
  showAnswer: 'Lihat jawaban',
  startSession: 'Mulai sesi',
  preparingCards: 'Menyiapkan kartu...',
  sessionComplete: 'Sesi selesai! Kerja bagus.',
  again: 'Lagi',
  hard: 'Sulit',
  good: 'Bisa',
  easy: 'Mudah',
  noCardsDue: 'Tidak ada kartu yang jatuh tempo. Kerja bagus!',
  cardsDue: 'kartu jatuh tempo',

  // Exam
  exam: 'Ujian',
  examTitle: 'Simulasi Ujian JLPT',
  modeQuick: 'Cepat',
  modeQuickDesc: 'Tanpa timer, umpan balik langsung',
  modeStudy: 'Belajar',
  modeStudyDesc: 'Durasi penuh, bisa jeda, pembahasan di akhir',
  modeReal: 'Asli',
  modeRealDesc: 'Simulasi hari-H: timer ketat, audio sekali putar',
  startExam: 'Mulai ujian',
  examLevel: 'Level ujian',
  noApprovedQuestions: 'Belum ada soal yang disetujui untuk level ini.',
  submit: 'Kumpulkan',
  nextQuestion: 'Soal berikutnya',
  previousQuestion: 'Sebelumnya',
  timeLeft: 'Sisa waktu',
  estimatedScore: 'Skor ini estimasi, bukan skor resmi JLPT',
  passed: 'LULUS',
  failed: 'BELUM LULUS',
  sectionKnowledge: 'Pengetahuan Bahasa',
  sectionReading: 'Membaca',
  sectionListening: 'Mendengar',

  // Dashboard
  myProgress: 'Progres belajarku',
  dueNow: 'Jatuh tempo',

  // Profile
  profile: 'Profil',
  targetLevel: 'Target level',
  statsTitle: 'Statistikmu',


  examHistory: 'Riwayat ujian',
  invalidRecord: 'Data tidak valid',
  playAudio: 'Putar audio',
  language: 'Bahasa',
  themeLabel: 'Tema',
  themeLight: 'Terang',
  themeDark: 'Gelap',
  soundEffects: 'Efek suara',
  soundOn: 'Aktif',
  soundOff: 'Mati',
  backupTitle: 'Backup & pulihkan',
  preferences: 'Preferensi',
  audio: 'Audio',
  backupDesc:
    'Progresmu hanya tersimpan di perangkat ini. Export file backup sebagai cadangan atau untuk pindah ke perangkat lain.',
  exportBackup: 'Export backup',
  importBackup: 'Import backup',
  importSuccess: 'Backup berhasil diimport. Aplikasi akan dimuat ulang.',
  importFailed: 'File tersebut bukan backup Kasaneru yang valid.',
  resetData: 'Hapus semua data',
  resetDataDesc:
    'Hapus seluruh progres di perangkat ini (XP, streak, pelajaran, SRS, riwayat ujian).',
  resetConfirm: 'Hapus SEMUA data lokal? Tindakan ini tidak bisa dibatalkan.',
  dataReset: 'Seluruh data lokal telah dihapus.',
  aboutTitle: 'Tentang',
  aboutText:
    'Kasaneru — belajar bahasa Jepang dari nol hingga JLPT N1. Open source dan offline-first: datamu tidak pernah keluar dari perangkat ini.',
  version: 'Versi',

  privacyPolicy: 'Kebijakan Privasi',
  termsOfUse: 'Syarat Penggunaan',
  back: 'Kembali',
  githubRepo: 'Repositori GitHub',
  // Generic
  loading: 'Memuat...',
  retry: 'Coba lagi',
  errorGeneric: 'Terjadi kesalahan. Coba lagi.',
  save: 'Simpan',
  cancel: 'Batal',
  // Onboarding (pertama kali dibuka)
  onboardWelcome: 'Selamat datang di Kasaneru',
  onboardIntro: 'Tumpuk ilmumu lapis demi lapis, dari nol hingga JLPT N1.',
  onboardLessons: '248 lesson bertahap',
  onboardFlashcards: 'Flashcard pintar dengan pengulangan berjeda',
  onboardExam: 'Simulasi ujian JLPT yang realistis',
  onboardName: 'Siapa nama kamu?',
  onboardNamePlaceholder: 'Namamu (opsional)',
  onboardTarget: 'Pilih target levelmu',
  onboardStart: 'Mulai belajar',
  onboardSkip: 'Lewati',
  onboardNext: 'Lanjut',
};
