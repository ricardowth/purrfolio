import { Link } from 'react-router-dom';
import { ClipboardList, Plane } from 'lucide-react';
import { useData } from '@/store/DataContext';
import { ResourcePage } from '@/components/ResourcePage';
import { AttachmentField } from '@/components/AttachmentField';
import { ContactName, ContactSelect } from '@/components/ContactSelect';
import { Badge, Field, Select, type Tone } from '@/components/ui';
import { daysFromToday, formatDate, formatMoney, relativeDays, titleCase, today } from '@/lib/format';
import { numberOrNull, numberValue, stripMeta, type FormValues } from '@/lib/forms';
import { CARE_TYPES } from '@shared/schema.js';
import type { CareEvent } from '@shared/types';

type Values = FormValues<CareEvent>;

const TYPE_TONE: Record<string, Tone> = { sitter: 'violet', boarding: 'blue', travel: 'amber', other: 'neutral' };

function periodBadge(event: CareEvent) {
  const end = event.endDate || event.startDate;
  const now = today();
  if (end < now) return <Badge tone="neutral">Finished</Badge>;
  if (event.startDate <= now) return <Badge tone="green">Happening now</Badge>;
  const days = daysFromToday(event.startDate);
  return <Badge tone={days !== null && days <= 14 ? 'amber' : 'blue'}>Starts {relativeDays(event.startDate)}</Badge>;
}

export default function CarePage() {
  const { petId, forPet } = useData();
  const rows = [...forPet('careEvents')].sort((a, b) => b.startDate.localeCompare(a.startDate));

  const blank = (): Values => ({
    petId,
    title: '',
    type: 'sitter',
    startDate: today(),
    endDate: '',
    caregiverId: '',
    emergencyContactId: '',
    instructions: '',
    cost: null,
    notes: '',
    attachments: [],
  });

  return (
    <ResourcePage<CareEvent, Values>
      collection="careEvents"
      title="Care & sitters"
      subtitle="Time away, boarding stays, and whoever is looking after them while you're gone."
      addLabel="Add care period"
      emptyIcon={Plane}
      emptyTitle="No care periods planned"
      emptyMessage="Add a holiday or a boarding stay, then print a care sheet for whoever is stepping in."
      rows={rows}
      describe={(row) => row.title}
      defaults={blank}
      toValues={stripMeta}
      wideModal
      headerActions={
        <Link to="/care/sheet" className="btn-ghost">
          <ClipboardList className="size-4" />
          Care sheet
        </Link>
      }
      columns={[
        {
          header: 'Period',
          render: (row) => (
            <div>
              <p className="font-medium text-stone-900 dark:text-stone-100">{row.title}</p>
              <p className="text-xs text-stone-500">
                {formatDate(row.startDate)}
                {row.endDate ? ` → ${formatDate(row.endDate)}` : ''}
              </p>
            </div>
          ),
        },
        { header: 'Type', render: (row) => <Badge tone={TYPE_TONE[row.type]}>{titleCase(row.type)}</Badge> },
        { header: 'Status', render: (row) => periodBadge(row) },
        { header: 'Caregiver', render: (row) => <ContactName id={row.caregiverId} /> },
        { header: 'Emergency contact', render: (row) => <ContactName id={row.emergencyContactId} /> },
        { header: 'Cost', render: (row) => formatMoney(row.cost) },
      ]}
      renderForm={({ values, set, errors }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title" error={errors.title}>
              <input className="input" value={values.title} onChange={(e) => set({ title: e.target.value })} placeholder="Two weeks in Algarve" />
            </Field>
            <Field label="Type">
              <Select options={CARE_TYPES} value={values.type} onChange={(e) => set({ type: e.target.value as Values['type'] })} />
            </Field>
            <Field label="Start date" error={errors.startDate}>
              <input type="date" className="input" value={values.startDate} onChange={(e) => set({ startDate: e.target.value })} />
            </Field>
            <Field label="End date">
              <input type="date" className="input" value={values.endDate} onChange={(e) => set({ endDate: e.target.value })} />
            </Field>
            <Field label="Caregiver" hint="Add them under Contacts first.">
              <ContactSelect value={values.caregiverId} onChange={(caregiverId) => set({ caregiverId })} roles={['sitter', 'other']} />
            </Field>
            <Field label="Emergency contact / vet to call">
              <ContactSelect
                value={values.emergencyContactId}
                onChange={(emergencyContactId) => set({ emergencyContactId })}
                roles={['vet', 'clinic', 'emergency']}
              />
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

          <Field
            label="Instructions for the caregiver"
            hint="Anything not already covered by food, medication or contacts — these lines appear on the care sheet."
          >
            <textarea
              className="input min-h-32"
              value={values.instructions}
              onChange={(e) => set({ instructions: e.target.value })}
              placeholder={'Litter tray in the laundry room, scoop daily.\nHe hides under the sofa for the first day — normal.\nSpare key with the neighbour at no. 12.'}
            />
          </Field>

          <Field label="Notes">
            <textarea className="input min-h-16" value={values.notes} onChange={(e) => set({ notes: e.target.value })} />
          </Field>
          <Field label="Attachments">
            <AttachmentField value={values.attachments} onChange={(attachments) => set({ attachments })} />
          </Field>
        </>
      )}
    />
  );
}
