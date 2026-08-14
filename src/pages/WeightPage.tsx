import { Scale, TrendingDown, TrendingUp } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useData } from '@/store/DataContext';
import { ResourcePage } from '@/components/ResourcePage';
import { Field } from '@/components/ui';
import { formatDate, today } from '@/lib/format';
import { sortedWeights, weightTrend } from '@/lib/derive';
import { numberOrNull, stripMeta, type FormValues } from '@/lib/forms';
import type { Weight } from '@shared/types';

type Values = FormValues<Weight>;

function WeightChart({ weights }: { weights: Weight[] }) {
  const series = sortedWeights(weights).map((entry) => ({ date: entry.date, kg: entry.kg }));
  if (series.length < 2) return null;

  return (
    <div className="card mb-6 p-4">
      <p className="section-title mb-3">Weight over time</p>
      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-stone-200 dark:stroke-stone-800" />
            <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11 }} stroke="currentColor" className="text-stone-400" />
            <YAxis
              domain={['dataMin - 0.3', 'dataMax + 0.3']}
              tickFormatter={(value: number) => `${value} kg`}
              tick={{ fontSize: 11 }}
              stroke="currentColor"
              className="text-stone-400"
              width={62}
            />
            <Tooltip
              labelFormatter={(label: string) => formatDate(label)}
              formatter={(value: number) => [`${value} kg`, 'Weight']}
              contentStyle={{ borderRadius: 8, border: '1px solid #d6d3d1', fontSize: 12 }}
            />
            <Line type="monotone" dataKey="kg" stroke="#d97706" strokeWidth={2} dot={{ r: 3, fill: '#d97706' }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function WeightPage() {
  const { petId, forPet } = useData();
  const weights = forPet('weights');
  const rows = [...weights].sort((a, b) => b.date.localeCompare(a.date));
  const trend = weightTrend(weights);

  const blank = (): Values => ({ petId, date: today(), kg: 0, notes: '' });

  return (
    <ResourcePage<Weight, Values>
      collection="weights"
      title="Weight"
      subtitle={
        trend
          ? `Currently ${trend.latest.kg} kg, recorded ${formatDate(trend.latest.date)}.`
          : 'Weigh-ins over time — the earliest sign that something is off.'
      }
      addLabel="Add weigh-in"
      emptyIcon={Scale}
      emptyTitle="No weigh-ins yet"
      emptyMessage="Even a few readings a year make gradual weight loss or gain obvious."
      rows={rows}
      describe={(row) => `${row.kg} kg on ${formatDate(row.date)}`}
      defaults={blank}
      toValues={stripMeta}
      columns={[
        { header: 'Date', render: (row) => formatDate(row.date) },
        { header: 'Weight', render: (row) => <span className="font-medium text-stone-900 dark:text-stone-100">{row.kg} kg</span> },
        {
          header: 'Change',
          render: (row) => {
            const ordered = sortedWeights(weights);
            const index = ordered.findIndex((entry) => entry.id === row.id);
            if (index <= 0) return <span className="text-stone-400">—</span>;
            const delta = Number((row.kg - ordered[index - 1].kg).toFixed(2));
            if (delta === 0) return <span className="text-stone-400">no change</span>;
            const Icon = delta > 0 ? TrendingUp : TrendingDown;
            return (
              <span className={delta > 0 ? 'flex items-center gap-1 text-orange-600' : 'flex items-center gap-1 text-sky-600'}>
                <Icon className="size-3.5" />
                {delta > 0 ? '+' : ''}
                {delta} kg
              </span>
            );
          },
        },
        { header: 'Notes', render: (row) => row.notes || '—' },
      ]}
      renderForm={({ values, set, errors }) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date" error={errors.date}>
            <input type="date" className="input" value={values.date} onChange={(e) => set({ date: e.target.value })} />
          </Field>
          <Field label="Weight (kg)" error={errors.kg}>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input"
              value={values.kg || ''}
              onChange={(e) => set({ kg: numberOrNull(e.target.value) ?? 0 })}
              placeholder="4.2"
            />
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <input className="input" value={values.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Weighed at the clinic" />
          </Field>
        </div>
      )}
    >
      <WeightChart weights={weights} />
    </ResourcePage>
  );
}
