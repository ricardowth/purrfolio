import { Soup, Star } from 'lucide-react';
import { useData } from '@/store/DataContext';
import { ResourcePage } from '@/components/ResourcePage';
import { AttachmentField } from '@/components/AttachmentField';
import { Badge, Checkbox, Field, Select, type Tone } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { today, useFormat } from '@/lib/format';
import { numberOrNull, numberValue, stripMeta, type FormValues } from '@/lib/forms';
import { FOOD_TYPES } from '@shared/schema.js';
import type { Food } from '@shared/types';

type Values = FormValues<Food>;

const TYPE_TONE: Record<string, Tone> = {
  dry: 'amber',
  wet: 'blue',
  treat: 'violet',
  prescription: 'red',
  supplement: 'green',
};

function Stars({ rating }: { rating: number | null }) {
  if (rating === null) return <span className="text-stone-400">—</span>;
  return (
    <span className="flex gap-0.5" title={`${rating}/5`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          className={index < rating ? 'size-3.5 fill-amber-400 text-amber-400' : 'size-3.5 text-stone-300 dark:text-stone-600'}
        />
      ))}
    </span>
  );
}

export default function FoodPage() {
  const { petId, forPet } = useData();
  const { t, tEnum } = useI18n();
  const { formatDate, formatMoney } = useFormat();
  const rows = [...forPet('foods')].sort((a, b) => Number(b.current) - Number(a.current) || a.product.localeCompare(b.product));

  const blank = (): Values => ({
    petId,
    brand: '',
    product: '',
    type: 'dry',
    amountPerDay: '',
    timesPerDay: null,
    startDate: today(),
    endDate: '',
    current: true,
    cost: null,
    rating: null,
    tolerance: '',
    notes: '',
    attachments: [],
  });

  return (
    <ResourcePage<Food, Values>
      collection="foods"
      title={t('food.title')}
      subtitle={t('food.subtitle')}
      addLabel={t('food.add')}
      emptyIcon={Soup}
      emptyTitle={t('food.emptyTitle')}
      emptyMessage={t('food.emptyMessage')}
      rows={rows}
      describe={(row) => [row.brand, row.product].filter(Boolean).join(' ')}
      defaults={blank}
      toValues={stripMeta}
      columns={[
        {
          header: t('food.food'),
          render: (row) => (
            <div>
              <p className="font-medium text-stone-900 dark:text-stone-100">{row.product}</p>
              {row.brand && <p className="text-xs text-stone-500">{row.brand}</p>}
            </div>
          ),
        },
        { header: t('common.type'), render: (row) => <Badge tone={TYPE_TONE[row.type]}>{tEnum('foodType', row.type)}</Badge> },
        {
          header: t('food.amount'),
          render: (row) => (
            <span>
              {row.amountPerDay || '—'}
              {row.timesPerDay ? ` · ${t('dash.perDay', { n: row.timesPerDay })}` : ''}
            </span>
          ),
        },
        {
          header: t('common.status'),
          render: (row) => (row.current ? <Badge tone="green">{t('food.current')}</Badge> : <Badge tone="neutral">{t('food.stopped')}</Badge>),
        },
        { header: t('food.since'), render: (row) => formatDate(row.startDate) },
        { header: t('food.rating'), render: (row) => <Stars rating={row.rating} /> },
        { header: t('common.cost'), render: (row) => formatMoney(row.cost) },
      ]}
      renderForm={({ values, set, errors }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('food.product')} error={errors.product}>
              <input
                className="input"
                value={values.product}
                onChange={(e) => set({ product: e.target.value })}
                placeholder={t('food.productPlaceholder')}
              />
            </Field>
            <Field label={t('food.brand')}>
              <input
                className="input"
                value={values.brand}
                onChange={(e) => set({ brand: e.target.value })}
                placeholder={t('food.brandPlaceholder')}
              />
            </Field>
            <Field label={t('common.type')}>
              <Select
                options={FOOD_TYPES}
                group="foodType"
                value={values.type}
                onChange={(e) => set({ type: e.target.value as Values['type'] })}
              />
            </Field>
            <Field label={t('food.amountPerDay')} hint={t('food.amountHint')}>
              <input
                className="input"
                value={values.amountPerDay}
                onChange={(e) => set({ amountPerDay: e.target.value })}
                placeholder={t('food.amountPlaceholder')}
              />
            </Field>
            <Field label={t('food.mealsPerDay')}>
              <input
                type="number"
                min="1"
                className="input"
                value={numberValue(values.timesPerDay)}
                onChange={(e) => set({ timesPerDay: numberOrNull(e.target.value) })}
              />
            </Field>
            <Field label={t('food.costPerUnit')}>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={numberValue(values.cost)}
                onChange={(e) => set({ cost: numberOrNull(e.target.value) })}
              />
            </Field>
            <Field label={t('food.started')}>
              <input type="date" className="input" value={values.startDate} onChange={(e) => set({ startDate: e.target.value })} />
            </Field>
            <Field label={t('food.stoppedDate')}>
              <input type="date" className="input" value={values.endDate} onChange={(e) => set({ endDate: e.target.value })} />
            </Field>
            <Field label={t('food.ratingLabel')}>
              <input
                type="number"
                min="0"
                max="5"
                className="input"
                value={numberValue(values.rating)}
                onChange={(e) => set({ rating: numberOrNull(e.target.value) })}
              />
            </Field>
          </div>

          <Checkbox label={t('food.currentlyFeeding')} checked={values.current} onChange={(current) => set({ current })} />

          <Field label={t('food.tolerance')} hint={t('food.toleranceHint')}>
            <textarea className="input min-h-16" value={values.tolerance} onChange={(e) => set({ tolerance: e.target.value })} />
          </Field>
          <Field label={t('common.notes')}>
            <textarea className="input min-h-16" value={values.notes} onChange={(e) => set({ notes: e.target.value })} />
          </Field>
          <Field label={t('common.attachments')} hint={t('food.attachmentsHint')}>
            <AttachmentField value={values.attachments} onChange={(attachments) => set({ attachments })} />
          </Field>
        </>
      )}
    />
  );
}
