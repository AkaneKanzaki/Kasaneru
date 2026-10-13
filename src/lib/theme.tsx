import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export type ThemeName = 'light' | 'dark';

const ThemeContext = createContext<{
  theme: ThemeName;
  toggle: () => void;
}>({ theme: 'light', toggle: () => {} });

const KEY = 'kasaneru-theme';

function initialTheme(): ThemeName {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* abaikan */
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeName>(initialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    // Sinkronkan theme-color browser/WebView + cegah force-dark ganda.
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', theme === 'dark' ? '#161210' : '#FFFCF7');
    }
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* abaikan */
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggle: () => setTheme(t => (t === 'light' ? 'dark' : 'light')) }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
