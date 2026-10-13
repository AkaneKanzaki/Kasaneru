# ⛩️ Kasaneru

**Kasaneru** (重ねる — "to stack, layer by layer") is a Japanese learning app
that takes you from zero to JLPT N1, built with **Vite + React + TypeScript +
Capacitor** — one codebase for Web and Android.

**Local-first & open source:** no account, no backend, no tracking. All
content is bundled with the app and all progress stays on your device.
Works fully offline.

## ✨ Features

- **Kana trainer** — Hiragana & Katakana romaji-guessing quiz (46+46) with mastery tracking, auto voice-over, and correct/wrong sound effects
- **Lessons** — 248 N5–N1 lessons in Markdown, fully bilingual (EN/ID), with completion marks & per-module progress
- **SRS flashcards** — 3,175 vocabulary cards (meaning-guessing quiz) powered by the SM-2 algorithm, with bilingual examples and sound effects
- **JLPT mock exams** — 3 modes (Quick/Study/Real), per-level timers, JLPT-style scoring (scores are estimates, not official)
- **Dashboard & profile** — XP, streaks, N5–N1 target level
- **Backup & restore** — export/import your progress as a JSON file (Profile)
- **Bilingual** — English (default) & Bahasa Indonesia, with a toggle in the header
- **Two themes** — vermilion-red light mode & "matsuri night" dark mode

## 🛠️ Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Routing | react-router-dom (HashRouter — Capacitor-compatible) |
| Storage | localStorage (progress), bundled JSON/Markdown (content) |
| Android | Capacitor (native APK via WebView) |
| Markdown | react-markdown + remark-gfm |

## 🚀 Getting started

```bash
npm install
npm run dev        # web, open http://localhost:5173
npm run build      # production build into dist/
```

No `.env`, no backend setup — the app just works.

## 🗂️ Project structure

```
kasaneru-web/
  src/
    content/
      lessons/{n5..n1}/   # 248 Markdown lessons (with YAML frontmatter)
      lessons/index.json  # generated index (see scripts/)
      vocab/{n5..n1}.json # 3,175 SRS cards
      questions/{n5..n1}.json  # generated, approved questions only
    lib/        # store (localStorage), i18n (en/id), theme, levelStore,
                # services: lessonService, srsService, examService, scoring, kanaData
    pages/      # Dashboard, Kana, Lessons, LessonDetail,
                # Flashcards, Exam, Profile, Legal
    components/ # Layout (bottom nav + header)
    index.css   # design tokens (CSS variables, light/dark)
  scripts/      # content build scripts (run manually, not during vite build)
    build-lesson-index.mjs    # regenerates lessons/index.json
    build-questions.mjs       # bundles approved questions from questions-src/
  public/icons/ # torii icon (favicon, apple-touch-icon, 192/512)
  android/      # Capacitor platform (gitignored; regenerable via npx cap add android)
  capacitor.config.ts
```

Contributing: read `CONVENTIONS.md`.

## 📦 Content workflow

- **Lessons:** edit the Markdown files, then run
  `node scripts/build-lesson-index.mjs` to regenerate the index.
- **Questions:** reviewed question files go in
  `src/content/questions-src/{n5..n1}.json`. Only records with
  `review_status: "approved"` are bundled — run
  `node scripts/build-questions.mjs` afterwards.

## 📱 Android build (APK)

```bash
npm run build
npx cap add android    # first time only (android/ is gitignored & regenerable)
npx cap sync android
```

Open the `android/` folder in Android Studio → **Build > Build APK(s)**.

Every `npm run build` automatically re-applies all Android customizations
(all scripts skip gracefully when `android/` doesn't exist):

- `scripts/sync-android-splash.mjs` — copies the torii splash art
  (`resources/splash.png`) into the Android drawables.
- `scripts/sync-android-icons.mjs` — installs the custom torii launcher
  icons (`resources/launcher-icons/`) at all densities.
- `scripts/sync-android-version.mjs` — syncs `versionName` from
  `package.json` (bump `versionCode` manually for Play Store releases).
- `scripts/disable-android-edge-to-edge.mjs` — WebView sits between the
  status bar and the system navigation bar with no dead space.
- `scripts/fix-android-jvm.mjs` — finds a JDK 17–24 on the machine
  (Gradle 8.14.x cannot run on JDK 25) and writes `org.gradle.java.home`
  to `android/gradle.properties`, so neither the Gradle CLI nor Android
  Studio needs a manual JVM selection.
- `scripts/patch-android-manifest.mjs` — declares the TTS engine query
  (mandatory on API 30+ or native text-to-speech stays silent).

## 🔒 Privacy & compliance

Kasaneru is local-first: **no account, no backend, no analytics, no ads,
no trackers, no cookies.** All progress stays on the user's device; the
only data transfer is a user-initiated backup file export.

- **Privacy Policy** and **Terms of Use** are bundled with the app
  (`src/content/legal/`, English + Indonesian) and readable in-app at
  Profile → About.
- User rights are built in: **export** (Profile → Export backup) covers
  access/portability, **reset** (Profile → Reset all data) covers erasure —
  consistent with GDPR, CCPA/CPRA, LGPD, and Indonesia's PDP Law
  (UU No. 27/2022).
- **Google Play Data Safety** (when publishing): declare *no data collected*,
  *no data shared*. The app requests no sensitive permissions.

- Exam scores are **estimates**, not official JLPT scaled scores.
- Your data never leaves your device. Use Profile → Backup to move it
  to another device.

## 📄 License

MIT — see [LICENSE](LICENSE).
