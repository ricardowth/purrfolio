import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useData } from '@/store/DataContext';
import { EmptyState, PageHeader, cx } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { useFormat } from '@/lib/format';
import { costEntries, costsByCategory, costYears, monthlyCosts, COST_CATEGORIES, type CostCategory } from '@/lib/derive';
import type { StringKey } from '@/lib/strings';
import { Wallet } from 'lucide-react';

/** Colour follows the category, never its rank, so filtering never repaints a series. */
const SERIES_COLOUR: Record<CostCategory, string> = {
  appointments: 'var(--series-appointments)',
  vaccinations: 'var(--series-vaccinations)',
  medications: 'var(--series-medications)',
  dewormings: 'var(--series-deworming)',
  foods: 'var(--series-foods)',
  supplies: 'var(--series-supplies)',
  careEvents: 'var(--series-care)',
};

const CATEGORY_LABEL: Record<CostCategory, StringKey> = {
  appointments: 'appt.title',
  vaccinations: 'vax.title',
  medications: 'med.title',
  dewormings: 'deworm.title',
  foods: 'food.title',
  supplies: 'supply.title',
  careEvents: 'care.title',
};

export default function CostsPage() {
  const { forPet } = useData();
  const { t, locale } = useI18n();
  const { formatMoney } = useFormat();

  const appointments = forPet('appointments');
  const vaccinations = forPet('vaccinations');
  const medications = forPet('medications');
  const dewormings = forPet('dewormings');
  const foods = forPet('foods');
  const supplies = forPet('supplies');
  const careEvents = forPet('careEvents');

  const entries = useMemo(
    () => costEntries({ appointments, vaccinations, medications, dewormings, foods, supplies, careEvents }),
    [appointments, vaccinations, medications, dewormings, foods, supplies, careEvents],
  );

  const years = costYears(entries);
  const [year, setYear] = useState(() => years[0] ?? String(new Date().getFullYear()));
  const activeYear = years.includes(year) ? year : (years[0] ?? year);

  const months = useMemo(() => monthlyCosts(entries, activeYear), [entries, activeYear]);
  const byCategory = useMemo(() => costsByCategory(entries, activeYear), [entries, activeYear]);

  const total = byCategory.reduce((sum, row) => sum + row.total, 0);
  const monthsWithSpend = months.filter((m) => m.total > 0).length;
  const busiest = months.reduce((best, m) => (m.total > best.total ? m : best), months[0]);

  // Only paint a series that actually has money in it this year.
  const present = COST_CATEGORIES.filter((c) => byCategory.some((row) => row.category === c));

  const monthNames = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { month: 'short' });
    return Array.from({ length: 12 }, (_, i) => fmt.format(new Date(2026, i, 1)));
  }, [locale]);

  if (entries.length === 0) {
    return (
      <>
        <PageHeader title={t('costs.title')} subtitle={t('costs.subtitle')} />
        <EmptyState icon={Wallet} title={t('costs.emptyTitle')} message={t('costs.emptyMessage')} />
      </>
    );
  }

  const chartData = months.map((m) => ({ ...m, name: monthNames[m.month - 1] }));

  return (
    <>
      <PageHeader
        title={t('costs.title')}
        subtitle={t('costs.subtitle')}
        actions={
          years.length > 1 && (
            <div className="inline-flex overflow-hidden rounded-lg border border-stone-300 text-xs dark:border-stone-700">
              {years.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setYear(option)}
                  aria-pressed={option === activeYear}
                  className={cx(
                    'cursor-pointer px-3 py-1.5 font-medium transition-colors',
                    option === activeYear
                      ? 'bg-stone-800 text-white dark:bg-stone-200 dark:text-stone-900'
                      : 'bg-white text-stone-600 dark:bg-stone-900 dark:text-stone-400',
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          )
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs font-semibold tracking-wide text-stone-500 uppercase">{t('costs.totalIn', { year: activeYear })}</p>
          <p className="mt-2 text-3xl font-bold text-stone-900 dark:text-stone-50">{formatMoney(total)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold tracking-wide text-stone-500 uppercase">{t('costs.perMonth')}</p>
          <p className="mt-2 text-3xl font-bold text-stone-900 dark:text-stone-50">{formatMoney(total / 12)}</p>
          <p className="mt-0.5 text-xs text-stone-500">{t('costs.monthsWithSpend', { n: monthsWithSpend })}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold tracking-wide text-stone-500 uppercase">{t('costs.biggestMonth')}</p>
          <p className="mt-2 text-3xl font-bold text-stone-900 dark:text-stone-50">{formatMoney(busiest.total)}</p>
          <p className="mt-0.5 text-xs text-stone-500">{monthNames[busiest.month - 1]}</p>
        </div>
      </div>

      <section className="card mb-6 p-4">
        <p className="section-title mb-3">{t('costs.overTheYear')}</p>

        {/* Legend: identity is never colour alone — every series is also named here
            and again in the table below, which covers the light-mode contrast relief. */}
        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-600 dark:text-stone-400">
          {present.map((category) => (
            <span key={category} className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ background: SERIES_COLOUR[category] }} />
              {t(CATEGORY_LABEL[category])}
            </span>
          ))}
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--chart-ink)" tickLine={false} axisLine={false} />
              <YAxis
                tickFormatter={(value: number) => `${value} €`}
                tick={{ fontSize: 11 }}
                stroke="var(--chart-ink)"
                tickLine={false}
                axisLine={false}
                width={62}
              />
              <Tooltip
                cursor={{ fill: 'var(--chart-grid)', fillOpacity: 0.4 }}
                contentStyle={{
                  borderRadius: 8,
                  border: '1px solid var(--chart-grid)',
                  background: 'var(--chart-surface)',
                  fontSize: 12,
                }}
                labelStyle={{ color: 'var(--chart-ink)' }}
                formatter={(value: number, name: string) => [formatMoney(value), t(CATEGORY_LABEL[name as CostCategory])]}
              />
              {present.map((category, index) => (
                <Bar
                  key={category}
                  dataKey={category}
                  stackId="cost"
                  fill={SERIES_COLOUR[category]}
                  // A hairline of the surface colour keeps stacked segments from touching.
                  stroke="var(--chart-surface)"
                  strokeWidth={1}
                  radius={index === present.length - 1 ? [4, 4, 0, 0] : undefined}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left dark:border-stone-800">
              <th className="px-4 py-2.5 text-xs font-semibold tracking-wide text-stone-500 uppercase">{t('costs.category')}</th>
              <th className="px-4 py-2.5 text-xs font-semibold tracking-wide text-stone-500 uppercase">{t('costs.records')}</th>
              <th className="px-4 py-2.5 text-xs font-semibold tracking-wide text-stone-500 uppercase">{t('costs.share')}</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold tracking-wide text-stone-500 uppercase">{t('common.cost')}</th>
            </tr>
          </thead>
          <tbody>
            {byCategory.map((row) => (
              <tr key={row.category} className="border-b border-stone-100 last:border-0 dark:border-stone-800/70">
                <td className="px-4 py-2.5">
                  <span className="inline-flex items-center gap-2">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: SERIES_COLOUR[row.category] }} />
                    {t(CATEGORY_LABEL[row.category])}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-stone-600 dark:text-stone-400">{row.count}</td>
                <td className="px-4 py-2.5 text-stone-600 dark:text-stone-400">{total ? Math.round((row.total / total) * 100) : 0}%</td>
                <td className="px-4 py-2.5 text-right font-medium text-stone-900 dark:text-stone-100">{formatMoney(row.total)}</td>
              </tr>
            ))}
            <tr className="border-t border-stone-200 dark:border-stone-800">
              <td className="px-4 py-2.5 font-semibold text-stone-900 dark:text-stone-100">{t('costs.total')}</td>
              <td />
              <td />
              <td className="px-4 py-2.5 text-right font-semibold text-stone-900 dark:text-stone-100">{formatMoney(total)}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </>
  );
}
