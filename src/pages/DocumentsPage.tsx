import { FolderOpen } from 'lucide-react';
import { useData } from '@/store/DataContext';
import { ResourcePage } from '@/components/ResourcePage';
import { AttachmentField, AttachmentGallery } from '@/components/AttachmentField';
import { Field } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { stripMeta, type FormValues } from '@/lib/forms';
import type { PetDocument } from '@shared/types';

type Values = FormValues<PetDocument>;

const SUGGESTED = ['Adoption papers', 'Insurance policy', 'Microchip registration', 'Lab results', 'Passport', 'Invoice'];

export default function DocumentsPage() {
  const { petId, forPet } = useData();
  const rows = [...forPet('documents')].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const blank = (): Values => ({ petId, title: '', category: '', date: '', notes: '', attachments: [] });

  return (
    <ResourcePage<PetDocument, Values>
      collection="documents"
      title="Documents"
      subtitle="Paperwork that isn't tied to a single appointment — passports, insurance, adoption papers."
      addLabel="Add document"
      emptyIcon={FolderOpen}
      emptyTitle="No documents stored"
      emptyMessage="Scan or photograph the important paperwork once and stop hunting for it."
      rows={rows}
      describe={(row) => row.title}
      defaults={blank}
      toValues={stripMeta}
      columns={[
        { header: 'Title', render: (row) => <span className="font-medium text-stone-900 dark:text-stone-100">{row.title}</span> },
        { header: 'Category', render: (row) => row.category || '—' },
        { header: 'Date', render: (row) => formatDate(row.date) },
        {
          header: 'Files',
          render: (row) => (row.attachments.length ? <AttachmentGallery items={row.attachments} /> : <span className="text-stone-400">No file</span>),
        },
        { header: 'Notes', render: (row) => <span className="line-clamp-2 max-w-sm">{row.notes || '—'}</span> },
      ]}
      renderForm={({ values, set, errors }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Title" error={errors.title} className="sm:col-span-2">
              <input className="input" value={values.title} onChange={(e) => set({ title: e.target.value })} placeholder="Pet passport" />
            </Field>
            <Field label="Date">
              <input type="date" className="input" value={values.date} onChange={(e) => set({ date: e.target.value })} />
            </Field>
          </div>

          <Field label="Category">
            <input className="input" value={values.category} onChange={(e) => set({ category: e.target.value })} list="document-categories" />
            <datalist id="document-categories">
              {SUGGESTED.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </Field>

          <Field label="Notes">
            <textarea className="input min-h-20" value={values.notes} onChange={(e) => set({ notes: e.target.value })} />
          </Field>
          <Field label="Files">
            <AttachmentField value={values.attachments} onChange={(attachments) => set({ attachments })} />
          </Field>
        </>
      )}
    />
  );
}
