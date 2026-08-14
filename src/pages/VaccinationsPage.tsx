import { Syringe } from 'lucide-react';
import { useData } from '@/store/DataContext';
import { ResourcePage } from '@/components/ResourcePage';
import { AttachmentField } from '@/components/AttachmentField';
import { ContactName, ContactSelect } from '@/components/ContactSelect';
import { Badge, Field } from '@/components/ui';
import { byDateDesc, daysFromToday, formatDate, formatMoney, relativeDays, today } from '@/lib/format';
import { numberOrNull, numberValue, stripMeta, type FormValues } from '@/lib/forms';
import type { Vaccination } from '@shared/types';

type Values = FormValues<Vaccination>;

/** Due status shown in the list and reused by the dashboard. */
export function dueBadge(nextDueDate: string) {
  if (!nextDueDate) return <span className="text-stone-400">—</span>;
  const days = daysFromToday(nextDueDate);
  if (days === null) return <span className="text-stone-400">—</span>;
  if (days < 0) return <Badge tone="red">Overdue · {relativeDays(nextDueDate)}</Badge>;
  if (days <= 30) return <Badge tone="amber">Due {relativeDays(nextDueDate)}</Badge>;
  return <span className="text-stone-600 dark:text-stone-400">{formatDate(nextDueDate)}</span>;
}

export default function VaccinationsPage() {
  const { petId, forPet } = useData();
  const rows = [...forPet('vaccinations')].sort(byDateDesc((row) => row.date));

  const blank = (): Values => ({
    petId,
    name: '',
    date: today(),
    nextDueDate: '',
    batchNumber: '',
    contactId: '',
    clinic: '',
    cost: null,
    notes: '',
    attachments: [],
  });

  return (
    <ResourcePage<Vaccination, Values>
      collection="vaccinations"
      title="Vaccinations"
      subtitle="What was given, when, and when the next one is due."
      addLabel="Add vaccination"
      emptyIcon={Syringe}
      emptyTitle="No vaccinations recorded"
      emptyMessage="Add the ones from the vaccination booklet — Purrfolio will warn you when a booster falls due."
      rows={rows}
      describe={(row) => `${row.name} (${formatDate(row.date)})`}
      defaults={blank}
      toValues={stripMeta}
      columns={[
        { header: 'Vaccine', render: (row) => <span className="font-medium text-stone-900 dark:text-stone-100">{row.name}</span> },
        { header: 'Given', render: (row) => formatDate(row.date) },
        { header: 'Next due', render: (row) => dueBadge(row.nextDueDate) },
        { header: 'Vet', render: (row) => <ContactName id={row.contactId} /> },
        { header: 'Batch', render: (row) => row.batchNumber || '—' },
        { header: 'Cost', render: (row) => formatMoney(row.cost) },
      ]}
      renderForm={({ values, set, errors }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Vaccine" error={errors.name}>
              <input className="input" value={values.name} onChange={(e) => set({ name: e.target.value })} placeholder="Rabies" />
            </Field>
            <Field label="Date given" error={errors.date}>
              <input type="date" className="input" value={values.date} onChange={(e) => set({ date: e.target.value })} />
            </Field>
            <Field label="Next due" hint="Leave blank if it's a one-off.">
              <input type="date" className="input" value={values.nextDueDate} onChange={(e) => set({ nextDueDate: e.target.value })} />
            </Field>
            <Field label="Batch number">
              <input className="input" value={values.batchNumber} onChange={(e) => set({ batchNumber: e.target.value })} />
            </Field>
            <Field label="Vet">
              <ContactSelect value={values.contactId} onChange={(contactId) => set({ contactId })} roles={['vet', 'clinic']} />
            </Field>
            <Field label="Clinic">
              <input className="input" value={values.clinic} onChange={(e) => set({ clinic: e.target.value })} />
            </Field>
            <Field label="Cost (€)">
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
          <Field label="Notes">
            <textarea className="input min-h-20" value={values.notes} onChange={(e) => set({ notes: e.target.value })} />
          </Field>
          <Field label="Attachments" hint="Photo of the vaccination booklet page, certificate, receipt…">
            <AttachmentField value={values.attachments} onChange={(attachments) => set({ attachments })} />
          </Field>
        </>
      )}
    />
  );
}
