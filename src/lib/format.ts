import { useMemo } from 'react';
import { useI18n, type I18n } from '@/lib/i18n';

/**
 * Date, number and duration formatting.
 *
 * Anything whose output depends on the chosen language lives behind
 * `useFormat()`, which binds the formatters to the active locale. The helpers
 * exported directly are language-neutral (ISO strings, byte sizes, sorting) and
 * are safe to call from plain modules like ./derive.
 */

export const today = () => new Date().toISOString().slice(0, 10);

/** Whole days from today. Negative means in the past. */
export function daysFromToday(value?: string | null): number | null {
  if (!value) return null;
  const target = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(target.getTime())) return null;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - start.getTime()) / 86_400_000);
}

export const titleCase = (value: string) => (value ? value.charAt(0).toUpperCase() + value.slice(1) : '');

export function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const power = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** power).toFixed(power === 0 ? 0 : 1)} ${units[power]}`;
}

/** Sort helper: newest first, blanks last. */
export const byDateDesc =
  <T>(pick: (row: T) => string | undefined) =>
  (a: T, b: T) =>
    (pick(b) || '').localeCompare(pick(a) || '');

// --- locale-aware formatters -----------------------------------------------

export interface Formatters {
  /** 'YYYY-MM-DD' or an ISO timestamp -> '14 ago 2026' in Portuguese. Blank input gives an em dash. */
  formatDate: (value?: string | null) => string;
  /** 'YYYY-MM' -> 'outubro 2026' in Portuguese, for things scheduled to a month. */
  formatMonth: (value?: string | null) => string;
  formatDateTime: (value?: string | null) => string;
  formatMoney: (value?: number | null) => string;
  /** Plain number in the locale's notation: 1.5 -> '1,5' in Portuguese. */
  formatNumber: (value?: number | null) => string;
  /** '3 days ago', 'in 2 weeks', 'today'. */
  relativeDays: (value?: string | null) => string;
  /** Human age from a birth date, e.g. '3 anos, 2 meses' in Portuguese. */
  formatAge: (birthDate?: string | null) => string;
}

export function createFormatters({ locale, t, tn }: I18n): Formatters {
  const dateFmt = new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' });
  const dateTimeFmt = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const monthFmt = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' });
  const moneyFmt = new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' });
  const numberFmt = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const relativeFmt = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  const formatDate: Formatters['formatDate'] = (value) => {
    if (!value) return '—';
    const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
    return Number.isNaN(date.getTime()) ? value : dateFmt.format(date);
  };

  const formatMonth: Formatters['formatMonth'] = (value) => {
    if (!value) return '—';
    const date = new Date(`${value}-01T00:00:00`);
    return Number.isNaN(date.getTime()) ? value : monthFmt.format(date);
  };

  const formatDateTime: Formatters['formatDateTime'] = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : dateTimeFmt.format(date);
  };

  const formatMoney: Formatters['formatMoney'] = (value) =>
    value === null || value === undefined ? '—' : moneyFmt.format(value);

  const formatNumber: Formatters['formatNumber'] = (value) =>
    value === null || value === undefined ? '—' : numberFmt.format(value);

  const relativeDays: Formatters['relativeDays'] = (value) => {
    const days = daysFromToday(value);
    if (days === null) return '—';
    if (days === 0) return t('date.today');
    if (days === 1) return t('date.tomorrow');
    if (days === -1) return t('date.yesterday');

    const abs = Math.abs(days);
    const [amount, unit]: [number, Intl.RelativeTimeFormatUnit] =
      abs < 31 ? [days, 'day'] : abs < 365 ? [Math.round(days / 30), 'month'] : [Math.round(days / 365), 'year'];
    return relativeFmt.format(amount, unit);
  };

  const formatAge: Formatters['formatAge'] = (birthDate) => {
    if (!birthDate) return t('age.unknown');
    const born = new Date(`${birthDate}T00:00:00`);
    if (Number.isNaN(born.getTime())) return t('age.unknown');

    const now = new Date();
    let years = now.getFullYear() - born.getFullYear();
    let months = now.getMonth() - born.getMonth();
    if (now.getDate() < born.getDate()) months -= 1;
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    if (years < 0) return t('age.notBorn');

    const parts: string[] = [];
    if (years) parts.push(tn('age.years', years));
    if (months || !years) parts.push(tn('age.months', months));
    return parts.join(', ');
  };

  return { formatDate, formatMonth, formatDateTime, formatMoney, formatNumber, relativeDays, formatAge };
}

/** Formatters bound to the language currently selected. */
export function useFormat(): Formatters {
  const i18n = useI18n();
  return useMemo(() => createFormatters(i18n), [i18n]);
}
