import { Bug } from 'lucide-react';
import { useData } from '@/store/DataContext';
import { ResourcePage } from '@/components/ResourcePage';
import { AttachmentField } from '@/components/AttachmentField';
import { Badge, Field } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { byDateDesc, today, useFormat } from '@/lib/format';
import { dewormingDue, type DewormingDue } from '@/lib/derive';
import { numberOrNull, numberValue, stripMeta, type FormValues } from '@/lib/forms';
import type { Deworming } from '@shared/types';

type Values = FormValues<Deworming>;

/** When the next dose is due, at month resolution. */
function NextDue({ nextMonth, state }: { nextMonth: string; state: DewormingDue }) {
  const { t } = useI18n();
  const { formatMonth } = useFormat();

  if (!nextMonth) return <span className="text-stone-400">—</span>;
  const when = formatMonth(nextMonth);

  if (state === 'superseded') {
    return (
      <span className="text-stone-400 line-through dark:text-stone-500" title={t('deworm.supersededHint')}>
        {when}
      </span>
    );
  }
  if (state === 'overdue') return <Badge tone="red">{t('deworm.overdue', { when })}</Badge>;
  if (state === 'due') return <Badge tone="amber">{t('deworm.dueNow', { when })}</Badge>;
  return <span className="text-stone-600 dark:text-stone-400">{when}</span>;
}

export default function DewormingPage() {
  const { petId, forPet } = useData();
  const { t } = useI18n();
  const { formatDate, formatMoney } = useFormat();
  const rows = [...forPet('dewormings')].sort(byDateDesc((row) => row.date));

  const blank = (): Values => ({
    petId,
    product: '',
    date: today(),
    nextMonth: '',
    target: '',
    cost: null,
    notes: '',
    attachments: [],
  });

  return (
    <ResourcePage<Deworming, Values>
      collection="dewormings"
      title={t('deworm.title')}
      subtitle={t('deworm.subtitle')}
      addLabel={t('deworm.add')}
      emptyIcon={Bug}
      emptyTitle={t('deworm.emptyTitle')}
      emptyMessage={t('deworm.emptyMessage')}
      rows={rows}
      describe={(row) => `${row.product} (${formatDate(row.date)})`}
      defaults={blank}
      toValues={stripMeta}
      columns={[
        {
          header: t('deworm.product'),
          render: (row) => (
            <div>
              <p className="font-medium text-stone-900 dark:text-stone-100">{row.product}</p>
              {row.target && <p className="text-xs text-stone-500">{row.target}</p>}
            </div>
          ),
        },
        { header: t('deworm.given'), render: (row) => formatDate(row.date) },
        {
          header: t('deworm.nextDue'),
          render: (row) => <NextDue nextMonth={row.nextMonth} state={dewormingDue(row, rows)} />,
        },
        { header: t('common.cost'), render: (row) => formatMoney(row.cost) },
      ]}
      renderForm={({ values, set, errors }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('deworm.product')} error={errors.product}>
              <input
                className="input"
                value={values.product}
                onChange={(e) => set({ product: e.target.value })}
                placeholder={t('deworm.productPlaceholder')}
              />
            </Field>
            <Field label={t('deworm.target')} hint={t('deworm.targetHint')}>
              <input
                className="input"
                value={values.target}
                onChange={(e) => set({ target: e.target.value })}
                placeholder={t('deworm.targetPlaceholder')}
              />
            </Field>
            <Field label={t('deworm.dateGiven')} error={errors.date}>
              <input type="date" className="input" value={values.date} onChange={(e) => set({ date: e.target.value })} />
            </Field>
            <Field label={t('deworm.nextDue')} hint={t('deworm.nextDueHint')} error={errors.nextMonth}>
              <input type="month" className="input" value={values.nextMonth} onChange={(e) => set({ nextMonth: e.target.value })} />
            </Field>
            <Field label={t('common.costEur')}>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={numberValue(values.cost)}
                onChange={(e) => set({ cost: numberOrNull(e.target.value) })}
              />
            </Field>
          </div>
          <Field label={t('common.notes')}>
            <textarea className="input min-h-16" value={values.notes} onChange={(e) => set({ notes: e.target.value })} />
          </Field>
          <Field label={t('common.attachments')}>
            <AttachmentField value={values.attachments} onChange={(attachments) => set({ attachments })} />
          </Field>
        </>
      )}
    />
  );
}
