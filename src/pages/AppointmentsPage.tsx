import { CalendarDays } from 'lucide-react';
import { useData } from '@/store/DataContext';
import { ResourcePage } from '@/components/ResourcePage';
import { AttachmentField } from '@/components/AttachmentField';
import { ContactName, ContactSelect } from '@/components/ContactSelect';
import { IssueChips, IssuePicker } from '@/components/IssueLinks';
import { APPOINTMENT_STATUS_TONE, Badge, Field, Select } from '@/components/ui';
import { byDateDesc, formatDateTime, formatMoney, relativeDays, titleCase } from '@/lib/format';
import { numberOrNull, numberValue, stripMeta, type FormValues } from '@/lib/forms';
import { APPOINTMENT_STATUSES, APPOINTMENT_TYPES } from '@shared/schema.js';
import type { Appointment } from '@shared/types';

type Values = FormValues<Appointment>;

/** 'YYYY-MM-DDTHH:mm' for <input type="datetime-local">, defaulting to the next hour. */
function nextHour() {
  const date = new Date();
  date.setMinutes(0, 0, 0);
  date.setHours(date.getHours() + 1);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const TYPE_TONE = { emergency: 'red', surgery: 'orange', dental: 'violet', vaccination: 'blue' } as const;

export default function AppointmentsPage() {
  const { petId, forPet } = useData();
  const rows = [...forPet('appointments')].sort(byDateDesc((row) => row.dateTime));

  const blank = (): Values => ({
    petId,
    dateTime: nextHour(),
    type: 'checkup',
    status: 'scheduled',
    contactId: '',
    clinic: '',
    reason: '',
    outcome: '',
    cost: null,
    weightKg: null,
    followUpDate: '',
    issueIds: [],
    notes: '',
    attachments: [],
  });

  return (
    <ResourcePage<Appointment, Values>
      collection="appointments"
      title="Appointments"
      subtitle="Every visit — what it was for, what came out of it, and what it cost."
      addLabel="Add appointment"
      emptyIcon={CalendarDays}
      emptyTitle="No appointments yet"
      emptyMessage="Log past visits as well as upcoming ones — the dashboard surfaces whatever is next."
      rows={rows}
      describe={(row) => `${titleCase(row.type)} on ${formatDateTime(row.dateTime)}`}
      defaults={blank}
      toValues={stripMeta}
      wideModal
      columns={[
        {
          header: 'When',
          render: (row) => (
            <div>
              <p className="font-medium text-stone-900 dark:text-stone-100">{formatDateTime(row.dateTime)}</p>
              <p className="text-xs text-stone-500">{relativeDays(row.dateTime)}</p>
            </div>
          ),
        },
        {
          header: 'Type',
          render: (row) => <Badge tone={TYPE_TONE[row.type as keyof typeof TYPE_TONE] ?? 'neutral'}>{titleCase(row.type)}</Badge>,
        },
        { header: 'Status', render: (row) => <Badge tone={APPOINTMENT_STATUS_TONE[row.status]}>{titleCase(row.status)}</Badge> },
        { header: 'Reason', render: (row) => <span className="line-clamp-2 max-w-56">{row.reason || '—'}</span> },
        { header: 'Vet', render: (row) => <ContactName id={row.contactId} /> },
        { header: 'Issues', render: (row) => <IssueChips ids={row.issueIds} /> },
        { header: 'Cost', render: (row) => formatMoney(row.cost) },
      ]}
      renderForm={({ values, set, errors }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Date & time" error={errors.dateTime}>
              <input type="datetime-local" className="input" value={values.dateTime} onChange={(e) => set({ dateTime: e.target.value })} />
            </Field>
            <Field label="Type">
              <Select options={APPOINTMENT_TYPES} value={values.type} onChange={(e) => set({ type: e.target.value as Values['type'] })} />
            </Field>
            <Field label="Status">
              <Select options={APPOINTMENT_STATUSES} value={values.status} onChange={(e) => set({ status: e.target.value as Values['status'] })} />
            </Field>
            <Field label="Vet">
              <ContactSelect value={values.contactId} onChange={(contactId) => set({ contactId })} roles={['vet', 'clinic', 'emergency']} />
            </Field>
            <Field label="Clinic">
              <input className="input" value={values.clinic} onChange={(e) => set({ clinic: e.target.value })} />
            </Field>
            <Field label="Follow-up date">
              <input type="date" className="input" value={values.followUpDate} onChange={(e) => set({ followUpDate: e.target.value })} />
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
            <Field label="Weight measured (kg)" hint="Also shows on the weight chart if you add it there.">
              <input
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={numberValue(values.weightKg)}
                onChange={(e) => set({ weightKg: numberOrNull(e.target.value) })}
              />
            </Field>
          </div>

          <Field label="Reason for the visit">
            <textarea className="input min-h-16" value={values.reason} onChange={(e) => set({ reason: e.target.value })} />
          </Field>
          <Field label="Outcome / what the vet said">
            <textarea className="input min-h-24" value={values.outcome} onChange={(e) => set({ outcome: e.target.value })} />
          </Field>
          <Field label="Related health issues">
            <IssuePicker value={values.issueIds} onChange={(issueIds) => set({ issueIds })} />
          </Field>
          <Field label="Notes">
            <textarea className="input min-h-16" value={values.notes} onChange={(e) => set({ notes: e.target.value })} />
          </Field>
          <Field label="Attachments" hint="Invoices, lab results, X-rays.">
            <AttachmentField value={values.attachments} onChange={(attachments) => set({ attachments })} />
          </Field>
        </>
      )}
    />
  );
}
