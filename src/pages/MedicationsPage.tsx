import { CheckCircle2, Pill } from 'lucide-react';
import { useData } from '@/store/DataContext';
import { ResourcePage } from '@/components/ResourcePage';
import { AttachmentField } from '@/components/AttachmentField';
import { IssueChips, IssuePicker } from '@/components/IssueLinks';
import { Badge, Checkbox, Field, Select } from '@/components/ui';
import { formatDate, formatDateTime, formatMoney, titleCase, today } from '@/lib/format';
import { isMedicationActive } from '@/lib/derive';
import { numberOrNull, numberValue, stripMeta, type FormValues } from '@/lib/forms';
import { MED_ROUTES } from '@shared/schema.js';
import type { Medication } from '@shared/types';

type Values = FormValues<Medication>;

export default function MedicationsPage() {
  const { petId, forPet, save } = useData();

  const rows = [...forPet('medications')].sort((a, b) => {
    const activeDelta = Number(isMedicationActive(b)) - Number(isMedicationActive(a));
    return activeDelta !== 0 ? activeDelta : (b.startDate || '').localeCompare(a.startDate || '');
  });

  const blank = (): Values => ({
    petId,
    name: '',
    dose: '',
    route: 'oral',
    frequency: '',
    timesPerDay: null,
    startDate: today(),
    endDate: '',
    ongoing: false,
    reason: '',
    prescribedBy: '',
    cost: null,
    issueIds: [],
    doseLog: [],
    notes: '',
    attachments: [],
  });

  /** One tap to record that today's dose was given. */
  async function logDose(medication: Medication) {
    await save('medications', medication.id, {
      ...stripMeta(medication),
      doseLog: [...medication.doseLog, { id: crypto.randomUUID(), at: new Date().toISOString(), note: '' }],
    });
  }

  return (
    <ResourcePage<Medication, Values>
      collection="medications"
      title="Medications"
      subtitle="What they're on, how much, and whether today's dose has been given."
      addLabel="Add medication"
      emptyIcon={Pill}
      emptyTitle="No medications recorded"
      emptyMessage="Add current and past prescriptions — current ones appear on the care sheet for sitters."
      rows={rows}
      describe={(row) => row.name}
      defaults={blank}
      toValues={stripMeta}
      wideModal
      rowActions={(row) =>
        isMedicationActive(row) ? (
          <button type="button" className="btn-subtle px-2 py-1 hover:text-emerald-600" onClick={() => void logDose(row)} title="Log a dose now">
            <CheckCircle2 className="size-4" />
          </button>
        ) : null
      }
      columns={[
        {
          header: 'Medication',
          render: (row) => (
            <div>
              <p className="font-medium text-stone-900 dark:text-stone-100">{row.name}</p>
              {row.reason && <p className="text-xs text-stone-500">{row.reason}</p>}
            </div>
          ),
        },
        {
          header: 'Dose',
          render: (row) => (
            <div>
              <p>{row.dose || '—'}</p>
              <p className="text-xs text-stone-500">
                {[titleCase(row.route), row.frequency].filter(Boolean).join(' · ') || '—'}
              </p>
            </div>
          ),
        },
        {
          header: 'Status',
          render: (row) => (isMedicationActive(row) ? <Badge tone="green">Active</Badge> : <Badge tone="neutral">Finished</Badge>),
        },
        {
          header: 'Period',
          render: (row) => (
            <span className="text-stone-600 dark:text-stone-400">
              {formatDate(row.startDate)} → {row.ongoing ? 'ongoing' : formatDate(row.endDate)}
            </span>
          ),
        },
        {
          header: 'Last dose',
          render: (row) =>
            row.doseLog.length ? (
              <span title={`${row.doseLog.length} logged`}>{formatDateTime(row.doseLog[row.doseLog.length - 1].at)}</span>
            ) : (
              '—'
            ),
        },
        { header: 'Issues', render: (row) => <IssueChips ids={row.issueIds} /> },
        { header: 'Cost', render: (row) => formatMoney(row.cost) },
      ]}
      renderForm={({ values, set, errors }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Name" error={errors.name} className="sm:col-span-2">
              <input className="input" value={values.name} onChange={(e) => set({ name: e.target.value })} placeholder="Metacam 0.5 mg/ml" />
            </Field>
            <Field label="Route">
              <Select options={MED_ROUTES} value={values.route} onChange={(e) => set({ route: e.target.value as Values['route'] })} />
            </Field>
            <Field label="Dose" hint="Exactly as written on the label.">
              <input className="input" value={values.dose} onChange={(e) => set({ dose: e.target.value })} placeholder="0.5 ml" />
            </Field>
            <Field label="Frequency">
              <input className="input" value={values.frequency} onChange={(e) => set({ frequency: e.target.value })} placeholder="once daily with food" />
            </Field>
            <Field label="Times per day">
              <input
                type="number"
                min="1"
                className="input"
                value={numberValue(values.timesPerDay)}
                onChange={(e) => set({ timesPerDay: numberOrNull(e.target.value) })}
              />
            </Field>
            <Field label="Start date">
              <input type="date" className="input" value={values.startDate} onChange={(e) => set({ startDate: e.target.value })} />
            </Field>
            <Field label="End date">
              <input
                type="date"
                className="input"
                value={values.endDate}
                disabled={values.ongoing}
                onChange={(e) => set({ endDate: e.target.value })}
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
            <Field label="Prescribed by" className="sm:col-span-2">
              <input className="input" value={values.prescribedBy} onChange={(e) => set({ prescribedBy: e.target.value })} />
            </Field>
          </div>

          <Checkbox label="Ongoing — no planned end date" checked={values.ongoing} onChange={(ongoing) => set({ ongoing, endDate: ongoing ? '' : values.endDate })} />

          <Field label="What it's for">
            <textarea className="input min-h-16" value={values.reason} onChange={(e) => set({ reason: e.target.value })} />
          </Field>
          <Field label="Related health issues">
            <IssuePicker value={values.issueIds} onChange={(issueIds) => set({ issueIds })} />
          </Field>
          <Field label="Notes">
            <textarea className="input min-h-16" value={values.notes} onChange={(e) => set({ notes: e.target.value })} />
          </Field>
          <Field label="Attachments">
            <AttachmentField value={values.attachments} onChange={(attachments) => set({ attachments })} />
          </Field>

          {values.doseLog.length > 0 && (
            <Field label={`Dose log (${values.doseLog.length})`}>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-stone-200 p-2 text-sm dark:border-stone-700">
                {[...values.doseLog].reverse().map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between gap-2">
                    <span>{formatDateTime(entry.at)}</span>
                    <button
                      type="button"
                      className="btn-subtle px-2 py-0.5 text-xs hover:text-red-600"
                      onClick={() => set({ doseLog: values.doseLog.filter((item) => item.id !== entry.id) })}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </Field>
          )}
        </>
      )}
    />
  );
}
