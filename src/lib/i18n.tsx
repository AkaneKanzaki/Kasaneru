import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { en } from './strings/en';
import type { Lang, Strings } from './strings/en';
import { id } from './strings/id';

const DICTS: Record<Lang, Strings> = { en, id };
const KEY = 'kasaneru-lang';

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  S: Strings;
}

const LangContext = createContext<LangContextValue>({ lang: 'en', setLang: () => {}, S: en });

function initialLang(): Lang {
  try {
    return localStorage.getItem(KEY) === 'id' ? 'id' : 'en';
  } catch {
    return 'en';
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang === 'id' ? 'id' : 'en';
    try {
      localStorage.setItem(KEY, lang);
    } catch {
      /* abaikan */
    }
  }, [lang ]);

  const value = useMemo(() => ({ lang, setLang, S: DICTS[lang] }), [lang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useStrings(): LangContextValue {
  return useContext(LangContext);
}

/** Pilih judul sesuai bahasa aktif (fallback ke English). */
export function pickTitle(lang: Lang, title_en: string, title_id: string | null): string {
  return lang === 'id' ? title_id || title_en : title_en;
}
