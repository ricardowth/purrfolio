import { Soup, Star } from 'lucide-react';
import { useData } from '@/store/DataContext';
import { ResourcePage } from '@/components/ResourcePage';
import { AttachmentField } from '@/components/AttachmentField';
import { Badge, Checkbox, Field, Select, type Tone } from '@/components/ui';
import { formatDate, formatMoney, titleCase, today } from '@/lib/format';
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
      title="Food & diet"
      subtitle="What they eat now, what they used to eat, and how it went."
      addLabel="Add food"
      emptyIcon={Soup}
      emptyTitle="No food recorded"
      emptyMessage="Add their current food first — it becomes the feeding schedule on the care sheet."
      rows={rows}
      describe={(row) => [row.brand, row.product].filter(Boolean).join(' ')}
      defaults={blank}
      toValues={stripMeta}
      columns={[
        {
          header: 'Food',
          render: (row) => (
            <div>
              <p className="font-medium text-stone-900 dark:text-stone-100">{row.product}</p>
              {row.brand && <p className="text-xs text-stone-500">{row.brand}</p>}
            </div>
          ),
        },
        { header: 'Type', render: (row) => <Badge tone={TYPE_TONE[row.type]}>{titleCase(row.type)}</Badge> },
        {
          header: 'Amount',
          render: (row) => (
            <span>
              {row.amountPerDay || '—'}
              {row.timesPerDay ? ` · ${row.timesPerDay}×/day` : ''}
            </span>
          ),
        },
        { header: 'Status', render: (row) => (row.current ? <Badge tone="green">Current</Badge> : <Badge tone="neutral">Stopped</Badge>) },
        { header: 'Since', render: (row) => formatDate(row.startDate) },
        { header: 'Rating', render: (row) => <Stars rating={row.rating} /> },
        { header: 'Cost', render: (row) => formatMoney(row.cost) },
      ]}
      renderForm={({ values, set, errors }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Product" error={errors.product}>
              <input className="input" value={values.product} onChange={(e) => set({ product: e.target.value })} placeholder="Adult Sterilised Salmon" />
            </Field>
            <Field label="Brand">
              <input className="input" value={values.brand} onChange={(e) => set({ brand: e.target.value })} placeholder="Royal Canin" />
            </Field>
            <Field label="Type">
              <Select options={FOOD_TYPES} value={values.type} onChange={(e) => set({ type: e.target.value as Values['type'] })} />
            </Field>
            <Field label="Amount per day" hint="Written the way you'd tell a sitter.">
              <input className="input" value={values.amountPerDay} onChange={(e) => set({ amountPerDay: e.target.value })} placeholder="55 g" />
            </Field>
            <Field label="Meals per day">
              <input
                type="number"
                min="1"
                className="input"
                value={numberValue(values.timesPerDay)}
                onChange={(e) => set({ timesPerDay: numberOrNull(e.target.value) })}
              />
            </Field>
            <Field label="Cost per unit (€)">
              <input
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={numberValue(values.cost)}
                onChange={(e) => set({ cost: numberOrNull(e.target.value) })}
              />
            </Field>
            <Field label="Started">
              <input type="date" className="input" value={values.startDate} onChange={(e) => set({ startDate: e.target.value })} />
            </Field>
            <Field label="Stopped">
              <input type="date" className="input" value={values.endDate} onChange={(e) => set({ endDate: e.target.value })} />
            </Field>
            <Field label="How well they took to it (0–5)">
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

          <Checkbox label="Currently feeding this" checked={values.current} onChange={(current) => set({ current })} />

          <Field label="Tolerance / reaction" hint="Sickness, itching, refusal — anything worth remembering before buying it again.">
            <textarea className="input min-h-16" value={values.tolerance} onChange={(e) => set({ tolerance: e.target.value })} />
          </Field>
          <Field label="Notes">
            <textarea className="input min-h-16" value={values.notes} onChange={(e) => set({ notes: e.target.value })} />
          </Field>
          <Field label="Attachments" hint="Photo of the label or the ingredients list.">
            <AttachmentField value={values.attachments} onChange={(attachments) => set({ attachments })} />
          </Field>
        </>
      )}
    />
  );
}
