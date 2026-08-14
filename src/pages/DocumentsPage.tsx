import { FolderOpen } from 'lucide-react';
import { useData } from '@/store/DataContext';
import { ResourcePage } from '@/components/ResourcePage';
import { AttachmentField, AttachmentGallery } from '@/components/AttachmentField';
import { Field } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { useFormat } from '@/lib/format';
import { stripMeta, type FormValues } from '@/lib/forms';
import type { StringKey } from '@/lib/strings';
import type { PetDocument } from '@shared/types';

type Values = FormValues<PetDocument>;

const SUGGESTED: StringKey[] = [
  'doc.suggestAdoption',
  'doc.suggestInsurance',
  'doc.suggestMicrochip',
  'doc.suggestLab',
  'doc.suggestPassport',
  'doc.suggestInvoice',
];

export default function DocumentsPage() {
  const { petId, forPet } = useData();
  const { t } = useI18n();
  const { formatDate } = useFormat();
  const rows = [...forPet('documents')].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const blank = (): Values => ({ petId, title: '', category: '', date: '', notes: '', attachments: [] });

  return (
    <ResourcePage<PetDocument, Values>
      collection="documents"
      title={t('doc.title')}
      subtitle={t('doc.subtitle')}
      addLabel={t('doc.add')}
      emptyIcon={FolderOpen}
      emptyTitle={t('doc.emptyTitle')}
      emptyMessage={t('doc.emptyMessage')}
      rows={rows}
      describe={(row) => row.title}
      defaults={blank}
      toValues={stripMeta}
      columns={[
        { header: t('common.title'), render: (row) => <span className="font-medium text-stone-900 dark:text-stone-100">{row.title}</span> },
        { header: t('doc.category'), render: (row) => row.category || '—' },
        { header: t('common.date'), render: (row) => formatDate(row.date) },
        {
          header: t('common.files'),
          render: (row) =>
            row.attachments.length ? <AttachmentGallery items={row.attachments} /> : <span className="text-stone-400">{t('attach.noFile')}</span>,
        },
        { header: t('common.notes'), render: (row) => <span className="line-clamp-2 max-w-sm">{row.notes || '—'}</span> },
      ]}
      renderForm={({ values, set, errors }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t('common.title')} error={errors.title} className="sm:col-span-2">
              <input
                className="input"
                value={values.title}
                onChange={(e) => set({ title: e.target.value })}
                placeholder={t('doc.titlePlaceholder')}
              />
            </Field>
            <Field label={t('common.date')}>
              <input type="date" className="input" value={values.date} onChange={(e) => set({ date: e.target.value })} />
            </Field>
          </div>

          <Field label={t('doc.category')}>
            <input className="input" value={values.category} onChange={(e) => set({ category: e.target.value })} list="document-categories" />
            <datalist id="document-categories">
              {SUGGESTED.map((key) => (
                <option key={key} value={t(key)} />
              ))}
            </datalist>
          </Field>

          <Field label={t('common.notes')}>
            <textarea className="input min-h-20" value={values.notes} onChange={(e) => set({ notes: e.target.value })} />
          </Field>
          <Field label={t('common.files')}>
            <AttachmentField value={values.attachments} onChange={(attachments) => set({ attachments })} />
          </Field>
        </>
      )}
    />
  );
}
