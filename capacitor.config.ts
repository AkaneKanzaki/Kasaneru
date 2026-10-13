import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kasaneru.app',
  appName: 'Kasaneru',
  webDir: 'dist',
  backgroundColor: '#fff6ec',
  plugins: {
    SplashScreen: {
      // Splash native: torii di atas kertas hangat (lihat resources/splash.png
      // + scripts/sync-android-splash.mjs).
      launchShowDuration: 1800,
      launchAutoHide: false, // disembunyikan manual dari App.tsx saat siap
      backgroundColor: '#fff6ec',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
