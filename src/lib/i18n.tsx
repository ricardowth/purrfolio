import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { en, pt, type StringKey } from '@/lib/strings';

export type Lang = 'pt' | 'en';

export const LANGS: { value: Lang; label: string; short: string }[] = [
  { value: 'pt', label: 'Português', short: 'PT' },
  { value: 'en', label: 'English', short: 'EN' },
];

/** Portuguese is the default; English is opt-in. */
const DEFAULT_LANG: Lang = 'pt';
const KEY = 'purrfolio.lang';

const CATALOGUES: Record<Lang, Record<string, string>> = { en, pt };

/** Intl locale behind each language, used for dates, numbers and currency. */
const LOCALES: Record<Lang, string> = { pt: 'pt-PT', en: 'en-GB' };

type Vars = Record<string, string | number>;

/**
 * Base keys of plural pairs, i.e. every key that exists as `<base>.one`.
 * Routed through a generic so the conditional distributes over the union.
 */
type BaseOf<K> = K extends `${infer B}.one` ? B : never;
type PluralBase = BaseOf<StringKey>;

export interface I18n {
  lang: Lang;
  locale: string;
  setLang: (lang: Lang) => void;
  /** Look up a string, filling in {placeholders}. */
  t: (key: StringKey, vars?: Vars) => string;
  /** Plural form: picks `<base>.one` or `<base>.other`. `{n}` is filled in for you. */
  tn: (base: PluralBase, n: number, vars?: Vars) => string;
  /** Label for a stored enum value, e.g. tEnum('severity', 'high'). */
  tEnum: (group: string, value: string) => string;
  /**
   * Look up a key that isn't known at compile time — codes that arrive from the
   * server. Falls back to the code itself so an untranslated one still reads.
   */
  tLoose: (key: string, fallback?: string) => string;
}

const fill = (template: string, vars?: Vars) =>
  vars ? template.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match)) : template;

const capitalise = (value: string) => (value ? value.charAt(0).toUpperCase() + value.slice(1) : '');

function readStoredLang(): Lang {
  const stored = localStorage.getItem(KEY);
  return stored === 'pt' || stored === 'en' ? stored : DEFAULT_LANG;
}

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readStoredLang);

  useEffect(() => {
    localStorage.setItem(KEY, lang);
    document.documentElement.lang = LOCALES[lang];
  }, [lang]);

  const setLang = useCallback((next: Lang) => setLangState(next), []);

  const value = useMemo<I18n>(() => {
    const catalogue = CATALOGUES[lang];

    const t = (key: StringKey, vars?: Vars) => fill(catalogue[key] ?? en[key] ?? key, vars);

    const tn = (base: PluralBase, n: number, vars?: Vars) => {
      const key = `${base}.${n === 1 ? 'one' : 'other'}` as StringKey;
      return fill(catalogue[key] ?? en[key] ?? key, { n, ...vars });
    };

    // Enum values are dynamic, so this falls back to the raw stored value rather
    // than failing when a new value appears in the schema before its label does.
    const tEnum = (group: string, value: string) => {
      const key = `enum.${group}.${value}`;
      return catalogue[key] ?? en[key as StringKey] ?? capitalise(value);
    };

    const tLoose = (key: string, fallback?: string) => catalogue[key] ?? en[key as StringKey] ?? fallback ?? key;

    return { lang, locale: LOCALES[lang], setLang, t, tn, tEnum, tLoose };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside <I18nProvider>');
  return context;
}
