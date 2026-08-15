import { ShoppingBasket } from 'lucide-react';
import { useData } from '@/store/DataContext';
import { ResourcePage } from '@/components/ResourcePage';
import { AttachmentField } from '@/components/AttachmentField';
import { PackFields, PackPriceCell } from '@/components/Packaging';
import { IssueChips, IssuePicker } from '@/components/IssueLinks';
import { Badge, Checkbox, Field, Select, type Tone } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { byDateDesc, today, useFormat } from '@/lib/format';
import { stripMeta, type FormValues } from '@/lib/forms';
import { SUPPLY_CATEGORIES } from '@shared/schema.js';
import type { Supply } from '@shared/types';

type Values = FormValues<Supply>;

const CATEGORY_TONE: Record<string, Tone> = {
  skin: 'amber',
  grooming: 'blue',
  litter: 'violet',
  accessory: 'green',
  other: 'neutral',
};

export default function SuppliesPage() {
  const { petId, forPet } = useData();
  const { t, tEnum } = useI18n();
  const { formatDate } = useFormat();

  // In use first, then most recently bought: what is on the shelf now matters
  // more than what was on it two years ago.
  const rows = [...forPet('supplies')].sort(
    (a, b) => Number(b.current) - Number(a.current) || byDateDesc<Supply>((row) => row.purchaseDate)(a, b),
  );

  const blank = (): Values => ({
    petId,
    brand: '',
    product: '',
    category: 'other',
    purpose: '',
    purchaseDate: today(),
    current: true,
    packSize: null,
    packUnit: 'unit',
    cost: null,
    issueIds: [],
    notes: '',
    attachments: [],
  });

  return (
    <ResourcePage<Supply, Values>
      collection="supplies"
      title={t('supply.title')}
      subtitle={t('supply.subtitle')}
      addLabel={t('supply.add')}
      emptyIcon={ShoppingBasket}
      emptyTitle={t('supply.emptyTitle')}
      emptyMessage={t('supply.emptyMessage')}
      rows={rows}
      describe={(row) => [row.brand, row.product].filter(Boolean).join(' ')}
      defaults={blank}
      toValues={stripMeta}
      columns={[
        {
          header: t('supply.product'),
          render: (row) => (
            <div>
              <p className="font-medium text-stone-900 dark:text-stone-100">{row.product}</p>
              {row.brand && <p className="text-xs text-stone-500">{row.brand}</p>}
            </div>
          ),
        },
        {
          header: t('supply.category'),
          render: (row) => <Badge tone={CATEGORY_TONE[row.category]}>{tEnum('supplyCategory', row.category)}</Badge>,
        },
        { header: t('supply.purpose'), render: (row) => <span className="text-stone-600 dark:text-stone-400">{row.purpose || '—'}</span> },
        { header: t('pack.priceColumn'), render: (row) => <PackPriceCell item={row} /> },
        {
          header: t('common.status'),
          render: (row) =>
            row.current ? <Badge tone="green">{t('supply.inUse')}</Badge> : <Badge tone="neutral">{t('supply.finished')}</Badge>,
        },
        { header: t('supply.bought'), render: (row) => formatDate(row.purchaseDate) },
        { header: t('common.issues'), render: (row) => <IssueChips ids={row.issueIds} /> },
      ]}
      renderForm={({ values, set, errors }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('supply.product')} error={errors.product}>
              <input
                className="input"
                value={values.product}
                onChange={(e) => set({ product: e.target.value })}
                placeholder={t('supply.productPlaceholder')}
              />
            </Field>
            <Field label={t('food.brand')}>
              <input
                className="input"
                value={values.brand}
                onChange={(e) => set({ brand: e.target.value })}
                placeholder={t('supply.brandPlaceholder')}
              />
            </Field>
            <Field label={t('supply.category')}>
              <Select
                options={SUPPLY_CATEGORIES}
                group="supplyCategory"
                value={values.category}
                onChange={(e) => set({ category: e.target.value as Values['category'] })}
              />
            </Field>
            <Field label={t('supply.purpose')} hint={t('supply.purposeHint')}>
              <input
                className="input"
                value={values.purpose}
                onChange={(e) => set({ purpose: e.target.value })}
                placeholder={t('supply.purposePlaceholder')}
              />
            </Field>
            <PackFields values={values} set={set} />
            <Field label={t('supply.bought')}>
              <input type="date" className="input" value={values.purchaseDate} onChange={(e) => set({ purchaseDate: e.target.value })} />
            </Field>
          </div>

          <Checkbox label={t('supply.stillUsing')} checked={values.current} onChange={(current) => set({ current })} />

          <Field label={t('common.relatedIssues')} hint={t('supply.issuesHint')}>
            <IssuePicker value={values.issueIds} onChange={(issueIds) => set({ issueIds })} />
          </Field>
          <Field label={t('common.notes')}>
            <textarea className="input min-h-16" value={values.notes} onChange={(e) => set({ notes: e.target.value })} />
          </Field>
          <Field label={t('common.attachments')} hint={t('supply.attachmentsHint')}>
            <AttachmentField value={values.attachments} onChange={(attachments) => set({ attachments })} />
          </Field>
        </>
      )}
    />
  );
}
