const DATE_FMT = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const DATETIME_FMT = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const MONEY_FMT = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });

export const today = () => new Date().toISOString().slice(0, 10);

/** 'YYYY-MM-DD' or an ISO timestamp -> '14 Aug 2026'. Blank input gives an em dash. */
export function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(date.getTime()) ? value : DATE_FMT.format(date);
}

export function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : DATETIME_FMT.format(date);
}

export function formatMoney(value?: number | null): string {
  return value === null || value === undefined ? '—' : MONEY_FMT.format(value);
}

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

/** '3 days ago', 'in 2 weeks', 'today'. */
export function relativeDays(value?: string | null): string {
  const days = daysFromToday(value);
  if (days === null) return '—';
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';

  const abs = Math.abs(days);
  const [amount, unit]: [number, Intl.RelativeTimeFormatUnit] =
    abs < 31 ? [days, 'day'] : abs < 365 ? [Math.round(days / 30), 'month'] : [Math.round(days / 365), 'year'];
  return new Intl.RelativeTimeFormat('en-GB', { numeric: 'auto' }).format(amount, unit);
}

/** Human age from a birth date, e.g. '3 years, 2 months'. */
export function formatAge(birthDate?: string | null): string {
  if (!birthDate) return 'Age unknown';
  const born = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(born.getTime())) return 'Age unknown';

  const now = new Date();
  let years = now.getFullYear() - born.getFullYear();
  let months = now.getMonth() - born.getMonth();
  if (now.getDate() < born.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years < 0) return 'Not born yet';

  const parts: string[] = [];
  if (years) parts.push(`${years} year${years === 1 ? '' : 's'}`);
  if (months || !years) parts.push(`${months} month${months === 1 ? '' : 's'}`);
  return parts.join(', ');
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
