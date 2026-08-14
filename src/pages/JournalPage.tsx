import { BookOpen } from 'lucide-react';
import { useData } from '@/store/DataContext';
import { ResourcePage } from '@/components/ResourcePage';
import { AttachmentField, AttachmentGallery } from '@/components/AttachmentField';
import { Badge, Field } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { today, useFormat } from '@/lib/format';
import { stripMeta, type FormValues } from '@/lib/forms';
import { JOURNAL_TAGS } from '@shared/schema.js';
import type { JournalEntry } from '@shared/types';

type Values = FormValues<JournalEntry>;

export default function JournalPage() {
  const { petId, forPet } = useData();
  const { t, tEnum } = useI18n();
  const { formatDate, relativeDays } = useFormat();
  const rows = [...forPet('journal')].sort((a, b) => b.date.localeCompare(a.date));

  const blank = (): Values => ({ petId, date: today(), title: '', text: '', tags: [], attachments: [] });

  return (
    <ResourcePage<JournalEntry, Values>
      collection="journal"
      title={t('journal.title')}
      subtitle={t('journal.subtitle')}
      addLabel={t('journal.add')}
      emptyIcon={BookOpen}
      emptyTitle={t('journal.emptyTitle')}
      emptyMessage={t('journal.emptyMessage')}
      rows={rows}
      describe={(row) => row.title || formatDate(row.date)}
      defaults={blank}
      toValues={stripMeta}
      columns={[
        {
          header: t('common.date'),
          render: (row) => (
            <div className="whitespace-nowrap">
              <p>{formatDate(row.date)}</p>
              <p className="text-xs text-stone-500">{relativeDays(row.date)}</p>
            </div>
          ),
        },
        {
          header: t('journal.entry'),
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
          header: t('journal.tags'),
          render: (row) => (
            <span className="flex flex-wrap gap-1">
              {row.tags.length === 0 ? '—' : row.tags.map((tag) => <Badge key={tag}>{tEnum('journalTag', tag)}</Badge>)}
            </span>
          ),
        },
      ]}
      renderForm={({ values, set, errors }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t('common.date')} error={errors.date}>
              <input type="date" className="input" value={values.date} onChange={(e) => set({ date: e.target.value })} />
            </Field>
            <Field label={t('common.title')} className="sm:col-span-2">
              <input
                className="input"
                value={values.title}
                onChange={(e) => set({ title: e.target.value })}
                placeholder={t('journal.titlePlaceholder')}
              />
            </Field>
          </div>

          <Field label={t('journal.tags')}>
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
                    {tEnum('journalTag', tag)}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label={t('journal.whatHappened')}>
            <textarea className="input min-h-32" value={values.text} onChange={(e) => set({ text: e.target.value })} />
          </Field>
          <Field label={t('common.photos')}>
            <AttachmentField value={values.attachments} onChange={(attachments) => set({ attachments })} />
          </Field>
        </>
      )}
    />
  );
}
