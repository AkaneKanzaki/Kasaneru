import { Suspense, lazy, useEffect, useState } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { SplashScreen } from '@capacitor/splash-screen';
import { App as CapApp } from '@capacitor/app';
import { ThemeProvider } from './lib/theme';
import { LanguageProvider } from './lib/i18n';
import { touchActivity } from './lib/store';
import Layout from './components/Layout';
import Splash from './components/Splash';
import Onboarding, { shouldShowOnboarding } from './components/Onboarding';

// Code-splitting per halaman: bundle awal lebih kecil,
// halaman dimuat saat pertama dibuka (optimasi perangkat).
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Kana = lazy(() => import('./pages/Kana'));
const KanaQuiz = lazy(() => import('./pages/KanaQuiz'));
const Lessons = lazy(() => import('./pages/Lessons'));
const LessonDetail = lazy(() => import('./pages/LessonDetail'));
const Flashcards = lazy(() => import('./pages/Flashcards'));
const Exam = lazy(() => import('./pages/Exam'));
const Profile = lazy(() => import('./pages/Profile'));
const Legal = lazy(() => import('./pages/Legal'));

export default function App() {
  const [splashVisible, setSplashVisible] = useState(true);
  const [splashGone, setSplashGone] = useState(false);
  // Onboarding hanya untuk instalasi baru; user lama langsung masuk aplikasi.
  const [onboarded, setOnboarded] = useState(() => !shouldShowOnboarding());

  useEffect(() => {
    touchActivity(); // streak harian
    // Tombol back Android: navigasi mundur di dalam aplikasi bila bisa;
    // di halaman root, minimalkan aplikasi seperti perilaku standar.
    let backListener: { remove: () => void } | undefined;
    CapApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        void CapApp.minimizeApp();
      }
    }).then((h) => {
      backListener = h;
    });
    // Splash dalam aplikasi: tampil ~1 detik, fade-out, lalu tutup splash native.
    const t1 = setTimeout(() => setSplashVisible(false), 1000);
    const t2 = setTimeout(() => {
      setSplashGone(true);
      SplashScreen.hide().catch(() => {});
    }, 1400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      backListener?.remove();
    };
  }, []);

  return (
    <ThemeProvider>
      <LanguageProvider>
        {!splashGone && <Splash visible={splashVisible} />}
        {onboarded ? (
          <HashRouter>
            <Layout>
              <Suspense fallback={null}>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/kana" element={<Kana />} />
                  <Route path="/kana/quiz/:script" element={<KanaQuiz />} />
                  <Route path="/lessons" element={<Lessons />} />
                  <Route path="/lessons/:id" element={<LessonDetail />} />
                  <Route path="/flashcards" element={<Flashcards />} />
                  <Route path="/exam" element={<Exam />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/legal/:doc" element={<Legal />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </Layout>
          </HashRouter>
        ) : (
          <Onboarding onDone={() => setOnboarded(true)} />
        )}
      </LanguageProvider>
    </ThemeProvider>
  );
}
