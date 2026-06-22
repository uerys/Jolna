import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { IntlProvider } from "react-intl";
import { trpc } from "@/lib/trpc";
import en from "@/i18n/messages/en.json";
import kh from "@/i18n/messages/kh.json";

export type Language = "en" | "kh";

const catalogs: Record<Language, Record<string, string>> = {
  en: en as Record<string, string>,
  kh: kh as Record<string, string>,
};

const LANG_STORAGE_KEY = "jolna.language";

type I18nContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}

function readInitialLanguage(): Language {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
  return stored === "kh" ? "kh" : "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(readInitialLanguage);

  // Hydrate from authenticated user's persisted preference when available.
  const me = trpc.auth.me.useQuery();
  useEffect(() => {
    const preferred = (me.data as { languagePreference?: Language } | null)
      ?.languagePreference;
    if (preferred && preferred !== language) {
      setLanguageState(preferred);
      window.localStorage.setItem(LANG_STORAGE_KEY, preferred);
    }
  }, [me.data]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language === "kh" ? "km" : "en";
    }
  }, [language]);

  const saveToServer = trpc.settings.setLanguagePreference.useMutation();

  const setLanguage = useCallback(
    (next: Language) => {
      setLanguageState(next);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LANG_STORAGE_KEY, next);
      }
      // Persist to DB if signed in — ignore errors for unauthenticated visitors.
      if (me.data) {
        saveToServer.mutate({ language: next }, { onError: () => void 0 });
      }
    },
    [saveToServer, me.data]
  );

  const value = useMemo(
    () => ({ language, setLanguage }),
    [language, setLanguage]
  );

  return (
    <I18nContext.Provider value={value}>
      <IntlProvider
        locale={language === "kh" ? "km" : "en"}
        messages={catalogs[language]}
        defaultLocale="en"
        onError={err => {
          // Suppress missing-locale-data warnings for Khmer: the app
          // does not rely on locale-specific number/date formatting.
          // Intl falls back to English, which is acceptable for our UI.
          if (err.code === "MISSING_DATA") return;
          // eslint-disable-next-line no-console
          console.warn("[i18n]", err.message);
        }}
      >
        {children}
      </IntlProvider>
    </I18nContext.Provider>
  );
}
