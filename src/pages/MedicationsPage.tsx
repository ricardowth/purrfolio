import { CheckCircle2, Pill } from 'lucide-react';
import { useData } from '@/store/DataContext';
import { ResourcePage } from '@/components/ResourcePage';
import { AttachmentField } from '@/components/AttachmentField';
import { IssueChips, IssuePicker } from '@/components/IssueLinks';
import { Badge, Checkbox, Field, Select } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { today, useFormat } from '@/lib/format';
import { isMedicationActive } from '@/lib/derive';
import { numberOrNull, numberValue, stripMeta, type FormValues } from '@/lib/forms';
import { MED_ROUTES } from '@shared/schema.js';
import type { Medication } from '@shared/types';

type Values = FormValues<Medication>;

export default function MedicationsPage() {
  const { petId, forPet, save } = useData();
  const { t, tEnum } = useI18n();
  const { formatDate, formatDateTime, formatMoney } = useFormat();

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
      title={t('med.title')}
      subtitle={t('med.subtitle')}
      addLabel={t('med.add')}
      emptyIcon={Pill}
      emptyTitle={t('med.emptyTitle')}
      emptyMessage={t('med.emptyMessage')}
      rows={rows}
      describe={(row) => row.name}
      defaults={blank}
      toValues={stripMeta}
      wideModal
      rowActions={(row) =>
        isMedicationActive(row) ? (
          <button
            type="button"
            className="btn-subtle px-2 py-1 hover:text-emerald-600"
            onClick={() => void logDose(row)}
            title={t('med.logDose')}
          >
            <CheckCircle2 className="size-4" />
          </button>
        ) : null
      }
      columns={[
        {
          header: t('med.medication'),
          render: (row) => (
            <div>
              <p className="font-medium text-stone-900 dark:text-stone-100">{row.name}</p>
              {row.reason && <p className="text-xs text-stone-500">{row.reason}</p>}
            </div>
          ),
        },
        {
          header: t('med.dose'),
          render: (row) => (
            <div>
              <p>{row.dose || '—'}</p>
              <p className="text-xs text-stone-500">{[tEnum('medRoute', row.route), row.frequency].filter(Boolean).join(' · ') || '—'}</p>
            </div>
          ),
        },
        {
          header: t('common.status'),
          render: (row) =>
            isMedicationActive(row) ? <Badge tone="green">{t('med.active')}</Badge> : <Badge tone="neutral">{t('med.finished')}</Badge>,
        },
        {
          header: t('common.period'),
          render: (row) => (
            <span className="text-stone-600 dark:text-stone-400">
              {formatDate(row.startDate)} → {row.ongoing ? t('common.ongoing') : formatDate(row.endDate)}
            </span>
          ),
        },
        {
          header: t('med.lastDose'),
          render: (row) =>
            row.doseLog.length ? (
              <span title={t('med.loggedCount', { n: row.doseLog.length })}>{formatDateTime(row.doseLog[row.doseLog.length - 1].at)}</span>
            ) : (
              '—'
            ),
        },
        { header: t('common.issues'), render: (row) => <IssueChips ids={row.issueIds} /> },
        { header: t('common.cost'), render: (row) => formatMoney(row.cost) },
      ]}
      renderForm={({ values, set, errors }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t('common.name')} error={errors.name} className="sm:col-span-2">
              <input
                className="input"
                value={values.name}
                onChange={(e) => set({ name: e.target.value })}
                placeholder={t('med.namePlaceholder')}
              />
            </Field>
            <Field label={t('med.route')}>
              <Select
                options={MED_ROUTES}
                group="medRoute"
                value={values.route}
                onChange={(e) => set({ route: e.target.value as Values['route'] })}
              />
            </Field>
            <Field label={t('med.dose')} hint={t('med.doseHint')}>
              <input
                className="input"
                value={values.dose}
                onChange={(e) => set({ dose: e.target.value })}
                placeholder={t('med.dosePlaceholder')}
              />
            </Field>
            <Field label={t('med.frequency')}>
              <input
                className="input"
                value={values.frequency}
                onChange={(e) => set({ frequency: e.target.value })}
                placeholder={t('med.frequencyPlaceholder')}
              />
            </Field>
            <Field label={t('med.timesPerDay')}>
              <input
                type="number"
                min="1"
                className="input"
                value={numberValue(values.timesPerDay)}
                onChange={(e) => set({ timesPerDay: numberOrNull(e.target.value) })}
              />
            </Field>
            <Field label={t('common.startDate')}>
              <input type="date" className="input" value={values.startDate} onChange={(e) => set({ startDate: e.target.value })} />
            </Field>
            <Field label={t('common.endDate')}>
              <input
                type="date"
                className="input"
                value={values.endDate}
                disabled={values.ongoing}
                onChange={(e) => set({ endDate: e.target.value })}
              />
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
            <Field label={t('med.prescribedBy')} className="sm:col-span-2">
              <input className="input" value={values.prescribedBy} onChange={(e) => set({ prescribedBy: e.target.value })} />
            </Field>
          </div>

          <Checkbox
            label={t('med.ongoingLabel')}
            checked={values.ongoing}
            onChange={(ongoing) => set({ ongoing, endDate: ongoing ? '' : values.endDate })}
          />

          <Field label={t('med.whatFor')}>
            <textarea className="input min-h-16" value={values.reason} onChange={(e) => set({ reason: e.target.value })} />
          </Field>
          <Field label={t('common.relatedIssues')}>
            <IssuePicker value={values.issueIds} onChange={(issueIds) => set({ issueIds })} />
          </Field>
          <Field label={t('common.notes')}>
            <textarea className="input min-h-16" value={values.notes} onChange={(e) => set({ notes: e.target.value })} />
          </Field>
          <Field label={t('common.attachments')}>
            <AttachmentField value={values.attachments} onChange={(attachments) => set({ attachments })} />
          </Field>

          {values.doseLog.length > 0 && (
            <Field label={t('med.doseLog', { n: values.doseLog.length })}>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-stone-200 p-2 text-sm dark:border-stone-700">
                {[...values.doseLog].reverse().map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between gap-2">
                    <span>{formatDateTime(entry.at)}</span>
                    <button
                      type="button"
                      className="btn-subtle px-2 py-0.5 text-xs hover:text-red-600"
                      onClick={() => set({ doseLog: values.doseLog.filter((item) => item.id !== entry.id) })}
                    >
                      {t('common.remove')}
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
