import { BookOpen } from 'lucide-react';
import { useData } from '@/store/DataContext';
import { ResourcePage } from '@/components/ResourcePage';
import { AttachmentField, AttachmentGallery } from '@/components/AttachmentField';
import { Badge, Field } from '@/components/ui';
import { formatDate, relativeDays, titleCase, today } from '@/lib/format';
import { stripMeta, type FormValues } from '@/lib/forms';
import { JOURNAL_TAGS } from '@shared/schema.js';
import type { JournalEntry } from '@shared/types';

type Values = FormValues<JournalEntry>;

export default function JournalPage() {
  const { petId, forPet } = useData();
  const rows = [...forPet('journal')].sort((a, b) => b.date.localeCompare(a.date));

  const blank = (): Values => ({ petId, date: today(), title: '', text: '', tags: [], attachments: [] });

  return (
    <ResourcePage<JournalEntry, Values>
      collection="journal"
      title="Journal"
      subtitle="Anything that doesn't fit a form: behaviour, litter tray, sleeping, a photo from a good day."
      addLabel="Add entry"
      emptyIcon={BookOpen}
      emptyTitle="Nothing written down yet"
      emptyMessage="Small observations add up — they're often what a vet asks about first."
      rows={rows}
      describe={(row) => row.title || formatDate(row.date)}
      defaults={blank}
      toValues={stripMeta}
      columns={[
        {
          header: 'Date',
          render: (row) => (
            <div className="whitespace-nowrap">
              <p>{formatDate(row.date)}</p>
              <p className="text-xs text-stone-500">{relativeDays(row.date)}</p>
            </div>
          ),
        },
        {
          header: 'Entry',
          render: (row) => (
            <div className="max-w-xl">
              {row.title && <p className="font-medium text-stone-900 dark:text-stone-100">{row.title}</p>}
              {row.text && <p className="whitespace-pre-wrap text-stone-600 dark:text-stone-400">{row.text}</p>}
              {row.attachments.length > 0 && (
                <div className="mt-2">
                  <AttachmentGallery items={row.attachments} />
                </div>
              )}
            </div>
          ),
        },
        {
          header: 'Tags',
          render: (row) => (
            <span className="flex flex-wrap gap-1">
              {row.tags.length === 0 ? '—' : row.tags.map((tag) => <Badge key={tag}>{titleCase(tag)}</Badge>)}
            </span>
          ),
        },
      ]}
      renderForm={({ values, set, errors }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Date" error={errors.date}>
              <input type="date" className="input" value={values.date} onChange={(e) => set({ date: e.target.value })} />
            </Field>
            <Field label="Title" className="sm:col-span-2">
              <input className="input" value={values.title} onChange={(e) => set({ title: e.target.value })} placeholder="Refused breakfast" />
            </Field>
          </div>

          <Field label="Tags">
            <div className="flex flex-wrap gap-2">
              {JOURNAL_TAGS.map((tag: string) => {
                const active = values.tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => set({ tags: active ? values.tags.filter((t) => t !== tag) : [...values.tags, tag] })}
                    className={
                      active
                        ? 'badge cursor-pointer bg-amber-600 text-white'
                        : 'badge cursor-pointer bg-stone-200 text-stone-700 hover:bg-stone-300 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700'
                    }
                  >
                    {titleCase(tag)}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="What happened">
            <textarea className="input min-h-32" value={values.text} onChange={(e) => set({ text: e.target.value })} />
          </Field>
          <Field label="Photos">
            <AttachmentField value={values.attachments} onChange={(attachments) => set({ attachments })} />
          </Field>
        </>
      )}
    />
  );
}
