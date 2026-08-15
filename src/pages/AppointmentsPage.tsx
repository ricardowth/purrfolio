import { CalendarDays } from 'lucide-react';
import { useData } from '@/store/DataContext';
import { ResourcePage } from '@/components/ResourcePage';
import { AttachmentField } from '@/components/AttachmentField';
import { ContactName, ContactSelect } from '@/components/ContactSelect';
import { IssueChips, IssuePicker } from '@/components/IssueLinks';
import { FoodChips, FoodPicker, MedicationChips, MedicationPicker } from '@/components/RecordLinks';
import { APPOINTMENT_STATUS_TONE, Badge, Field, Select } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { byDateDesc, useFormat } from '@/lib/format';
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
  const { t, tEnum } = useI18n();
  const { formatDateTime, formatMoney, relativeDays } = useFormat();
  const rows = [...forPet('appointments')].sort(byDateDesc((row) => row.dateTime));

  const blank = (): Values => ({
    petId,
    dateTime: nextHour(),
    type: 'checkup',
    status: 'scheduled',
    contactId: '',
    clinicId: '',
    clinic: '',
    reason: '',
    outcome: '',
    cost: null,
    weightKg: null,
    weightId: '',
    followUpDate: '',
    followUpAppointmentId: '',
    issueIds: [],
    medicationIds: [],
    foodIds: [],
    notes: '',
    attachments: [],
  });

  return (
    <ResourcePage<Appointment, Values>
      collection="appointments"
      title={t('appt.title')}
      subtitle={t('appt.subtitle')}
      addLabel={t('appt.add')}
      emptyIcon={CalendarDays}
      emptyTitle={t('appt.emptyTitle')}
      emptyMessage={t('appt.emptyMessage')}
      rows={rows}
      describe={(row) => t('appt.describe', { type: tEnum('appointmentType', row.type), date: formatDateTime(row.dateTime) })}
      defaults={blank}
      toValues={stripMeta}
      wideModal
      columns={[
        {
          header: t('appt.when'),
          render: (row) => (
            <div>
              <p className="font-medium text-stone-900 dark:text-stone-100">{formatDateTime(row.dateTime)}</p>
              <p className="text-xs text-stone-500">{relativeDays(row.dateTime)}</p>
            </div>
          ),
        },
        {
          header: t('common.type'),
          render: (row) => (
            <Badge tone={TYPE_TONE[row.type as keyof typeof TYPE_TONE] ?? 'neutral'}>{tEnum('appointmentType', row.type)}</Badge>
          ),
        },
        {
          header: t('common.status'),
          render: (row) => <Badge tone={APPOINTMENT_STATUS_TONE[row.status]}>{tEnum('appointmentStatus', row.status)}</Badge>,
        },
        {
          header: t('appt.reason'),
          render: (row) =>
            row.issueIds?.length ? (
              <IssueChips ids={row.issueIds} />
            ) : (
              // Free-text reasons from before the issue link existed.
              <span className="line-clamp-2 max-w-56 text-stone-500">{row.reason || '—'}</span>
            ),
        },
        { header: t('common.clinic'), render: (row) => <ContactName id={row.clinicId} fallback={row.clinic} /> },
        {
          header: t('appt.prescribed'),
          render: (row) => (
            <div className="flex flex-col gap-1">
              <MedicationChips ids={row.medicationIds} />
              <FoodChips ids={row.foodIds} />
            </div>
          ),
        },
        { header: t('common.cost'), render: (row) => formatMoney(row.cost) },
      ]}
      renderForm={({ values, set, errors, editingId }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t('appt.dateTime')} error={errors.dateTime}>
              <input type="datetime-local" className="input" value={values.dateTime} onChange={(e) => set({ dateTime: e.target.value })} />
            </Field>
            <Field label={t('common.type')}>
              <Select
                options={APPOINTMENT_TYPES}
                group="appointmentType"
                value={values.type}
                onChange={(e) => set({ type: e.target.value as Values['type'] })}
              />
            </Field>
            <Field label={t('common.status')}>
              <Select
                options={APPOINTMENT_STATUSES}
                group="appointmentStatus"
                value={values.status}
                onChange={(e) => set({ status: e.target.value as Values['status'] })}
              />
            </Field>
            <Field label={t('common.vet')}>
              <ContactSelect value={values.contactId} onChange={(contactId) => set({ contactId })} roles={['vet', 'emergency']} />
            </Field>
            <Field label={t('common.clinic')} hint={values.clinic && !values.clinicId ? t('appt.legacyClinic', { name: values.clinic }) : undefined}>
              <ContactSelect value={values.clinicId} onChange={(clinicId) => set({ clinicId })} roles={['clinic']} />
            </Field>
            <Field label={t('appt.followUp')} hint={t('appt.followUpHint')}>
              <input type="date" className="input" value={values.followUpDate} onChange={(e) => set({ followUpDate: e.target.value })} />
            </Field>
            {values.followUpDate && (
              <Field label={t('appt.followUpBooked')} hint={t('appt.followUpBookedHint')}>
                <select
                  className="input"
                  value={values.followUpAppointmentId}
                  onChange={(e) => set({ followUpAppointmentId: e.target.value })}
                >
                  <option value="">{t('appt.followUpNotBooked')}</option>
                  {/* Only visits after this one can be the follow-up, and never itself. */}
                  {rows
                    .filter((row) => row.id !== editingId && row.dateTime > values.dateTime)
                    .map((row) => (
                      <option key={row.id} value={row.id}>
                        {formatDateTime(row.dateTime)} · {tEnum('appointmentType', row.type)}
                      </option>
                    ))}
                </select>
              </Field>
            )}
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
            <Field label={t('appt.weightMeasured')} hint={t('appt.weightHint')}>
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

          <Field
            label={t('appt.reasonForVisit')}
            hint={values.reason && values.issueIds.length === 0 ? t('appt.legacyReason', { text: values.reason }) : t('appt.reasonHint')}
          >
            <IssuePicker value={values.issueIds} onChange={(issueIds) => set({ issueIds })} />
          </Field>
          <Field label={t('appt.outcome')}>
            <textarea className="input min-h-24" value={values.outcome} onChange={(e) => set({ outcome: e.target.value })} />
          </Field>
          <Field label={t('appt.prescribedMedication')} hint={t('appt.prescribedMedicationHint')}>
            <MedicationPicker
              value={values.medicationIds}
              onChange={(medicationIds) => set({ medicationIds })}
              issueIds={values.issueIds}
              startDate={values.dateTime.slice(0, 10)}
            />
          </Field>
          <Field label={t('appt.dietChange')} hint={t('appt.dietChangeHint')}>
            <FoodPicker value={values.foodIds} onChange={(foodIds) => set({ foodIds })} startDate={values.dateTime.slice(0, 10)} />
          </Field>
          <Field label={t('common.notes')}>
            <textarea className="input min-h-16" value={values.notes} onChange={(e) => set({ notes: e.target.value })} />
          </Field>
          <Field label={t('common.attachments')} hint={t('appt.attachmentsHint')}>
            <AttachmentField value={values.attachments} onChange={(attachments) => set({ attachments })} />
          </Field>
        </>
      )}
    />
  );
}
