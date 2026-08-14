import { Link } from 'react-router-dom';
import { ClipboardList, Plane } from 'lucide-react';
import { useData } from '@/store/DataContext';
import { ResourcePage } from '@/components/ResourcePage';
import { AttachmentField } from '@/components/AttachmentField';
import { ContactName, ContactSelect } from '@/components/ContactSelect';
import { Badge, Field, Select, type Tone } from '@/components/ui';
import { useI18n, type I18n } from '@/lib/i18n';
import { daysFromToday, today, useFormat, type Formatters } from '@/lib/format';
import { numberOrNull, numberValue, stripMeta, type FormValues } from '@/lib/forms';
import { CARE_TYPES } from '@shared/schema.js';
import type { CareEvent } from '@shared/types';

type Values = FormValues<CareEvent>;

const TYPE_TONE: Record<string, Tone> = { sitter: 'violet', boarding: 'blue', travel: 'amber', other: 'neutral' };

function periodBadge(event: CareEvent, t: I18n['t'], relativeDays: Formatters['relativeDays']) {
  const end = event.endDate || event.startDate;
  const now = today();
  if (end < now) return <Badge tone="neutral">{t('care.finished')}</Badge>;
  if (event.startDate <= now) return <Badge tone="green">{t('care.happeningNow')}</Badge>;
  const days = daysFromToday(event.startDate);
  return (
    <Badge tone={days !== null && days <= 14 ? 'amber' : 'blue'}>
      {t('care.starts', { when: relativeDays(event.startDate) })}
    </Badge>
  );
}

export default function CarePage() {
  const { petId, forPet } = useData();
  const { t, tEnum } = useI18n();
  const { formatDate, formatMoney, relativeDays } = useFormat();
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
      title={t('care.title')}
      subtitle={t('care.subtitle')}
      addLabel={t('care.add')}
      emptyIcon={Plane}
      emptyTitle={t('care.emptyTitle')}
      emptyMessage={t('care.emptyMessage')}
      rows={rows}
      describe={(row) => row.title}
      defaults={blank}
      toValues={stripMeta}
      wideModal
      headerActions={
        <Link to="/care/sheet" className="btn-ghost">
          <ClipboardList className="size-4" />
          {t('care.sheetLink')}
        </Link>
      }
      columns={[
        {
          header: t('common.period'),
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
        { header: t('common.type'), render: (row) => <Badge tone={TYPE_TONE[row.type]}>{tEnum('careType', row.type)}</Badge> },
        { header: t('common.status'), render: (row) => periodBadge(row, t, relativeDays) },
        { header: t('care.caregiver'), render: (row) => <ContactName id={row.caregiverId} /> },
        { header: t('care.emergencyContact'), render: (row) => <ContactName id={row.emergencyContactId} /> },
        { header: t('common.cost'), render: (row) => formatMoney(row.cost) },
      ]}
      renderForm={({ values, set, errors }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('common.title')} error={errors.title}>
              <input
                className="input"
                value={values.title}
                onChange={(e) => set({ title: e.target.value })}
                placeholder={t('care.titlePlaceholder')}
              />
            </Field>
            <Field label={t('common.type')}>
              <Select
                options={CARE_TYPES}
                group="careType"
                value={values.type}
                onChange={(e) => set({ type: e.target.value as Values['type'] })}
              />
            </Field>
            <Field label={t('common.startDate')} error={errors.startDate}>
              <input type="date" className="input" value={values.startDate} onChange={(e) => set({ startDate: e.target.value })} />
            </Field>
            <Field label={t('common.endDate')}>
              <input type="date" className="input" value={values.endDate} onChange={(e) => set({ endDate: e.target.value })} />
            </Field>
            <Field label={t('care.caregiver')} hint={t('care.caregiverHint')}>
              <ContactSelect value={values.caregiverId} onChange={(caregiverId) => set({ caregiverId })} roles={['sitter', 'other']} />
            </Field>
            <Field label={t('care.emergencyLabel')}>
              <ContactSelect
                value={values.emergencyContactId}
                onChange={(emergencyContactId) => set({ emergencyContactId })}
                roles={['vet', 'clinic', 'emergency']}
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
          </div>

          <Field label={t('care.instructions')} hint={t('care.instructionsHint')}>
            <textarea
              className="input min-h-32"
              value={values.instructions}
              onChange={(e) => set({ instructions: e.target.value })}
              placeholder={t('care.instructionsPlaceholder')}
            />
          </Field>

          <Field label={t('common.notes')}>
            <textarea className="input min-h-16" value={values.notes} onChange={(e) => set({ notes: e.target.value })} />
          </Field>
          <Field label={t('common.attachments')}>
            <AttachmentField value={values.attachments} onChange={(attachments) => set({ attachments })} />
          </Field>
        </>
      )}
    />
  );
}
