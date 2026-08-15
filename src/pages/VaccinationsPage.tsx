import { Syringe } from 'lucide-react';
import { useData } from '@/store/DataContext';
import { ResourcePage } from '@/components/ResourcePage';
import { AttachmentField } from '@/components/AttachmentField';
import { ContactName, ContactSelect } from '@/components/ContactSelect';
import { Badge, Field } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { byDateDesc, daysFromToday, today, useFormat } from '@/lib/format';
import { isBoosterSuperseded } from '@/lib/derive';
import { numberOrNull, numberValue, stripMeta, type FormValues } from '@/lib/forms';
import type { Vaccination } from '@shared/types';

type Values = FormValues<Vaccination>;

/** Due status shown in the list. */
export function DueBadge({ nextDueDate, superseded }: { nextDueDate: string; superseded?: boolean }) {
  const { t } = useI18n();
  const { formatDate, relativeDays } = useFormat();

  if (!nextDueDate) return <span className="text-stone-400">—</span>;
  const days = daysFromToday(nextDueDate);
  if (days === null) return <span className="text-stone-400">—</span>;
  // A dose that has already been followed by a newer one is history: show the
  // date it asked for, but never chase it.
  if (superseded) {
    return (
      <span className="text-stone-400 line-through dark:text-stone-500" title={t('vax.supersededHint')}>
        {formatDate(nextDueDate)}
      </span>
    );
  }
  if (days < 0) return <Badge tone="red">{t('vax.overdue', { when: relativeDays(nextDueDate) })}</Badge>;
  if (days <= 30) return <Badge tone="amber">{t('vax.due', { when: relativeDays(nextDueDate) })}</Badge>;
  return <span className="text-stone-600 dark:text-stone-400">{formatDate(nextDueDate)}</span>;
}

export default function VaccinationsPage() {
  const { petId, forPet } = useData();
  const { t } = useI18n();
  const { formatDate, formatMoney } = useFormat();
  const rows = [...forPet('vaccinations')].sort(byDateDesc((row) => row.date));

  const blank = (): Values => ({
    petId,
    name: '',
    date: today(),
    nextDueDate: '',
    batchNumber: '',
    contactId: '',
    clinicId: '',
    clinic: '',
    cost: null,
    notes: '',
    attachments: [],
  });

  return (
    <ResourcePage<Vaccination, Values>
      collection="vaccinations"
      title={t('vax.title')}
      subtitle={t('vax.subtitle')}
      addLabel={t('vax.add')}
      emptyIcon={Syringe}
      emptyTitle={t('vax.emptyTitle')}
      emptyMessage={t('vax.emptyMessage')}
      rows={rows}
      describe={(row) => `${row.name} (${formatDate(row.date)})`}
      defaults={blank}
      toValues={stripMeta}
      columns={[
        { header: t('vax.vaccine'), render: (row) => <span className="font-medium text-stone-900 dark:text-stone-100">{row.name}</span> },
        { header: t('vax.given'), render: (row) => formatDate(row.date) },
        { header: t('vax.nextDue'), render: (row) => <DueBadge nextDueDate={row.nextDueDate} superseded={isBoosterSuperseded(row, rows)} /> },
        { header: t('common.clinic'), render: (row) => <ContactName id={row.clinicId} fallback={row.clinic} /> },
        { header: t('vax.batch'), render: (row) => row.batchNumber || '—' },
        { header: t('common.cost'), render: (row) => formatMoney(row.cost) },
      ]}
      renderForm={({ values, set, errors }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('vax.vaccine')} error={errors.name}>
              <input
                className="input"
                value={values.name}
                onChange={(e) => set({ name: e.target.value })}
                placeholder={t('vax.vaccinePlaceholder')}
              />
            </Field>
            <Field label={t('vax.dateGiven')} error={errors.date}>
              <input type="date" className="input" value={values.date} onChange={(e) => set({ date: e.target.value })} />
            </Field>
            <Field label={t('vax.nextDue')} hint={t('vax.nextDueHint')}>
              <input type="date" className="input" value={values.nextDueDate} onChange={(e) => set({ nextDueDate: e.target.value })} />
            </Field>
            <Field label={t('vax.batchNumber')}>
              <input className="input" value={values.batchNumber} onChange={(e) => set({ batchNumber: e.target.value })} />
            </Field>
            <Field label={t('common.vet')}>
              <ContactSelect value={values.contactId} onChange={(contactId) => set({ contactId })} roles={['vet']} />
            </Field>
            <Field
              label={t('common.clinic')}
              hint={values.clinic && !values.clinicId ? t('appt.legacyClinic', { name: values.clinic }) : undefined}
            >
              <ContactSelect value={values.clinicId} onChange={(clinicId) => set({ clinicId })} roles={['clinic']} />
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
            <textarea className="input min-h-20" value={values.notes} onChange={(e) => set({ notes: e.target.value })} />
          </Field>
          <Field label={t('common.attachments')} hint={t('vax.attachmentsHint')}>
            <AttachmentField value={values.attachments} onChange={(attachments) => set({ attachments })} />
          </Field>
        </>
      )}
    />
  );
}
