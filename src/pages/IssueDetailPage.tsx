import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Pencil, Pill, Plus, Trash2 } from 'lucide-react';
import { useData } from '@/store/DataContext';
import { CatBody } from '@/anatomy/CatBody';
import { describePart, REGIONS_BY_ID } from '@/anatomy/regions';
import { IssueEditor } from '@/components/IssueEditor';
import { AttachmentField, AttachmentGallery } from '@/components/AttachmentField';
import { Badge, ConfirmDialog, EmptyState, Field, ISSUE_STATUS_TONE, SEVERITY_TONE } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { today, useFormat } from '@/lib/format';
import { stripMeta } from '@/lib/forms';
import type { Attachment, Issue } from '@shared/types';

function UpdateComposer({ issue }: { issue: Issue }) {
  const { save } = useData();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!note.trim() && attachments.length === 0) return;
    setSaving(true);
    try {
      await save('issues', issue.id, {
        ...stripMeta(issue),
        updates: [...issue.updates, { id: crypto.randomUUID(), date, note, attachments }],
      });
      setNote('');
      setAttachments([]);
      setDate(today());
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className="btn-ghost w-full" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        {t('issueDetail.addUpdate')}
      </button>
    );
  }

  return (
    <div className="card space-y-3 p-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label={t('common.date')}>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label={t('issueDetail.whatChanged')} className="sm:col-span-3">
          <textarea
            className="input min-h-20"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('issueDetail.updatePlaceholder')}
            autoFocus
          />
        </Field>
      </div>
      <Field label={t('common.photos')}>
        <AttachmentField value={attachments} onChange={setAttachments} />
      </Field>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
          {t('common.cancel')}
        </button>
        <button type="button" className="btn-primary" onClick={() => void submit()} disabled={saving}>
          {saving ? t('common.saving') : t('issueDetail.addUpdateAction')}
        </button>
      </div>
    </div>
  );
}

export default function IssueDetailPage() {
  const { issueId } = useParams();
  const navigate = useNavigate();
  const { db, forPet, save, remove } = useData();
  const i18n = useI18n();
  const { t, tEnum } = i18n;
  const { formatDate, formatDateTime, relativeDays } = useFormat();

  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pendingUpdateDelete, setPendingUpdateDelete] = useState<string | null>(null);

  const issue = db.issues.find((row) => row.id === issueId);

  if (!issue) {
    return (
      <EmptyState
        title={t('issueDetail.notFound')}
        message={t('issueDetail.notFoundMessage')}
        action={
          <Link to="/health" className="btn-primary">
            {t('issueDetail.backToMap')}
          </Link>
        }
      />
    );
  }

  const appointments = forPet('appointments')
    .filter((appointment) => appointment.issueIds.includes(issue.id))
    .sort((a, b) => b.dateTime.localeCompare(a.dateTime));
  const medications = forPet('medications').filter((medication) => medication.issueIds.includes(issue.id));
  const updates = [...issue.updates].sort((a, b) => b.date.localeCompare(a.date));
  const region = REGIONS_BY_ID.get(issue.bodyPart);

  async function removeUpdate(updateId: string) {
    setPendingUpdateDelete(null);
    await save('issues', issue!.id, {
      ...stripMeta(issue!),
      updates: issue!.updates.filter((update) => update.id !== updateId),
    });
  }

  const [beforeLink, afterLink] = t('issueDetail.noAppointments').split('{link}');

  return (
    <>
      <button type="button" onClick={() => navigate('/health')} className="btn-subtle mb-3 -ml-2 px-2">
        <ArrowLeft className="size-4" />
        {t('health.title')}
      </button>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-50">{issue.title}</h1>
          <p className="mt-1 text-sm text-stone-500">
            {describePart(i18n, issue.bodyPart, issue.side)} ·{' '}
            {t('issueDetail.firstNoticed', { date: formatDate(issue.onsetDate), rel: relativeDays(issue.onsetDate) })}
            {issue.status === 'resolved' &&
              issue.resolvedDate &&
              t('issueDetail.resolvedOn', { date: formatDate(issue.resolvedDate) })}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge tone={ISSUE_STATUS_TONE[issue.status]}>{tEnum('issueStatus', issue.status)}</Badge>
            <Badge tone={SEVERITY_TONE[issue.severity]}>
              {t('issueDetail.severityBadge', { level: tEnum('severity', issue.severity) })}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-ghost" onClick={() => setEditing(true)}>
            <Pencil className="size-4" />
            {t('common.edit')}
          </button>
          <button type="button" className="btn-ghost hover:text-red-600" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="size-4" />
            {t('common.delete')}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {(issue.description || issue.diagnosis) && (
            <div className="card space-y-4 p-4">
              {issue.description && (
                <div>
                  <p className="section-title mb-1">{t('issueDetail.whatSeeing')}</p>
                  <p className="whitespace-pre-wrap text-sm text-stone-700 dark:text-stone-300">{issue.description}</p>
                </div>
              )}
              {issue.diagnosis && (
                <div>
                  <p className="section-title mb-1">{t('issueDetail.diagnosis')}</p>
                  <p className="whitespace-pre-wrap text-sm text-stone-700 dark:text-stone-300">{issue.diagnosis}</p>
                </div>
              )}
            </div>
          )}

          {issue.attachments.length > 0 && (
            <div className="card p-4">
              <p className="section-title mb-2">{t('common.files')}</p>
              <AttachmentGallery items={issue.attachments} />
            </div>
          )}

          <div>
            <p className="section-title mb-2">{t('issueDetail.progress')}</p>
            <UpdateComposer issue={issue} />

            {updates.length > 0 && (
              <ol className="mt-4 space-y-4 border-l border-stone-200 pl-5 dark:border-stone-800">
                {updates.map((update) => (
                  <li key={update.id} className="relative">
                    <span className="absolute top-1.5 -left-[23px] size-2.5 rounded-full bg-amber-500 ring-4 ring-stone-100 dark:ring-stone-950" />
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-medium text-stone-800 dark:text-stone-200">{formatDate(update.date)}</p>
                      <button
                        type="button"
                        className="btn-subtle px-1.5 py-0.5 text-xs hover:text-red-600"
                        onClick={() => setPendingUpdateDelete(update.id)}
                      >
                        {t('common.remove')}
                      </button>
                    </div>
                    {update.note && <p className="mt-0.5 text-sm whitespace-pre-wrap text-stone-600 dark:text-stone-400">{update.note}</p>}
                    {update.attachments.length > 0 && (
                      <div className="mt-2">
                        <AttachmentGallery items={update.attachments} />
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-4">
            <p className="section-title mb-2">{t('issueDetail.location')}</p>
            <CatBody
              issues={[issue]}
              viewSide={issue.side === 'right' ? 'right' : 'left'}
              showInternal={Boolean(region?.internal)}
              selected={{ bodyPart: issue.bodyPart, side: issue.side }}
            />
          </div>

          <div className="card p-4">
            <p className="section-title mb-2 flex items-center gap-1.5">
              <CalendarDays className="size-3.5" />
              {t('appt.title')}
            </p>
            {appointments.length === 0 ? (
              <p className="text-sm text-stone-500">
                {beforeLink}
                <Link to="/appointments" className="link">
                  {t('issueDetail.addAppointmentLink')}
                </Link>
                {afterLink}
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {appointments.map((appointment) => (
                  <li key={appointment.id}>
                    <p className="font-medium text-stone-800 dark:text-stone-200">{formatDateTime(appointment.dateTime)}</p>
                    <p className="text-stone-500">
                      {appointment.outcome || appointment.reason || tEnum('appointmentType', appointment.type)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card p-4">
            <p className="section-title mb-2 flex items-center gap-1.5">
              <Pill className="size-3.5" />
              {t('med.title')}
            </p>
            {medications.length === 0 ? (
              <p className="text-sm text-stone-500">{t('issueDetail.noMedications')}</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {medications.map((medication) => (
                  <li key={medication.id}>
                    <p className="font-medium text-stone-800 dark:text-stone-200">{medication.name}</p>
                    <p className="text-stone-500">
                      {[medication.dose, medication.frequency].filter(Boolean).join(' · ') || t('issueDetail.noDose')}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <IssueEditor open={editing} issue={issue} onClose={() => setEditing(false)} />

      <ConfirmDialog
        open={confirmDelete}
        title={t('issueDetail.deleteTitle')}
        message={t('issueDetail.deleteMessage', { title: issue.title })}
        onConfirm={() => {
          setConfirmDelete(false);
          void remove('issues', issue.id).then(() => navigate('/health'));
        }}
        onCancel={() => setConfirmDelete(false)}
      />

      <ConfirmDialog
        open={pendingUpdateDelete !== null}
        title={t('issueDetail.removeUpdateTitle')}
        message={t('issueDetail.removeUpdateMessage')}
        confirmLabel={t('common.remove')}
        onConfirm={() => void removeUpdate(pendingUpdateDelete!)}
        onCancel={() => setPendingUpdateDelete(null)}
      />
    </>
  );
}
