import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useData } from '@/store/DataContext';
import { ApiError, apiMessage, translateFieldErrors } from '@/lib/api';
import { CatBody, type PartSelection } from '@/anatomy/CatBody';
import { REGIONS, REGIONS_BY_ID, describePart, regionLabel } from '@/anatomy/regions';
import { AttachmentField } from '@/components/AttachmentField';
import { ErrorNote, Field, Modal, Select, cx } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { today } from '@/lib/format';
import { stripMeta, type FormValues } from '@/lib/forms';
import { ISSUE_STATUSES, SEVERITIES } from '@shared/schema.js';
import type { Issue, IssuePart } from '@shared/types';

type Values = FormValues<Issue>;

const samePart = (a: IssuePart, b: IssuePart) => a.bodyPart === b.bodyPart && a.side === b.side;

const blank = (petId: string, part?: PartSelection | null): Values => ({
  petId,
  title: '',
  // Nothing is assumed: an issue names the zones it touches, and the map below
  // is the only way to say so.
  parts: part ? [part] : [],
  severity: 'low',
  status: 'active',
  onsetDate: today(),
  resolvedDate: '',
  description: '',
  diagnosis: '',
  updates: [],
  appointmentIds: [],
  medicationIds: [],
  attachments: [],
});

/** Create or edit a health issue, including picking the body part off the map. */
export function IssueEditor({
  open,
  issue,
  initialPart,
  onClose,
  onSaved,
}: {
  open: boolean;
  issue?: Issue | null;
  initialPart?: PartSelection | null;
  onClose: () => void;
  onSaved?: (issue: Issue) => void;
}) {
  const { petId, forPet, create, save } = useData();
  const i18n = useI18n();
  const { t } = i18n;
  const issues = forPet('issues');

  const [values, setValues] = useState<Values>(() => blank(petId, initialPart));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showInternal, setShowInternal] = useState(false);

  // Reset the form each time the modal is opened.
  useEffect(() => {
    if (!open) return;
    const parts = issue ? issue.parts : initialPart ? [initialPart] : [];
    setValues(issue ? stripMeta(issue) : blank(petId, initialPart));
    setErrors({});
    setFormError(null);
    setShowInternal(parts.some((part) => REGIONS_BY_ID.get(part.bodyPart)?.internal));
  }, [open, issue, initialPart, petId]);

  const set = (patch: Partial<Values>) => setValues((prev) => ({ ...prev, ...patch }));

  const isPicked = (part: IssuePart) => values.parts.some((picked) => samePart(picked, part));

  /** Clicking a zone adds it; clicking it again takes it off. */
  function togglePart(selection: PartSelection) {
    if (isPicked(selection)) {
      set({ parts: values.parts.filter((part) => !samePart(part, selection)) });
      return;
    }
    set({ parts: [...values.parts, selection] });
  }

  /**
   * Both ears, both eyes, both hind paws: the symmetric case is common enough
   * that finding the mirrored shape on the other view is worth saving.
   */
  const mirrored: IssuePart | null =
    values.parts.length === 1 && (values.parts[0].side === 'left' || values.parts[0].side === 'right')
      ? { bodyPart: values.parts[0].bodyPart, side: values.parts[0].side === 'left' ? 'right' : 'left' }
      : null;

  async function submit() {
    setSubmitting(true);
    setErrors({});
    setFormError(null);
    try {
      const saved = issue ? await save('issues', issue.id, values) : await create('issues', values);
      onSaved?.(saved as Issue);
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.issues.length) {
        setErrors(translateFieldErrors(err.byField, i18n));
        setFormError(t('common.fixFields'));
      } else {
        setFormError(apiMessage(err, i18n, 'common.couldNotSave'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  const generalRegions = REGIONS.filter((item) => item.shapes.length === 0);

  return (
    <Modal
      open={open}
      title={issue ? t('issueEditor.editTitle') : t('issueEditor.newTitle')}
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button type="button" className="btn-primary" onClick={() => void submit()} disabled={submitting}>
            {submitting ? t('common.saving') : t('issueEditor.saveIssue')}
          </button>
        </>
      }
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <span className="label">{t('issueEditor.where')}</span>
          <div className="mb-2 flex items-center justify-end">
            <button
              type="button"
              onClick={() => setShowInternal((prev) => !prev)}
              className={cx('btn text-xs', showInternal ? 'btn-primary' : 'btn-ghost')}
            >
              {t('body.organs')}
            </button>
          </div>

          <CatBody
            issues={issues.filter((item) => item.id !== issue?.id)}
            showInternal={showInternal}
            selected={values.parts}
            onSelect={togglePart}
            className="rounded-lg border border-stone-200 p-2 dark:border-stone-800"
          />

          <div className="mt-2 flex flex-wrap gap-1.5">
            {generalRegions.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => togglePart({ bodyPart: item.id, side: 'none' })}
                className={cx(
                  'badge cursor-pointer',
                  isPicked({ bodyPart: item.id, side: 'none' })
                    ? 'bg-amber-600 text-white'
                    : 'bg-stone-200 text-stone-700 hover:bg-stone-300 dark:bg-stone-800 dark:text-stone-300',
                )}
              >
                {regionLabel(i18n, item.id)}
              </button>
            ))}
          </div>

          <div className="mt-3">
            <span className="label">{t('issueEditor.selected')}</span>
            {values.parts.length === 0 ? (
              <p className="text-sm text-stone-400 dark:text-stone-500">{t('issueEditor.nonePicked')}</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {values.parts.map((part) => (
                  <span
                    key={`${part.bodyPart}|${part.side}`}
                    className="badge gap-1 bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
                  >
                    {describePart(i18n, part.bodyPart, part.side)}
                    <button
                      type="button"
                      onClick={() => togglePart(part)}
                      aria-label={t('issueEditor.removeZone', { zone: describePart(i18n, part.bodyPart, part.side) })}
                      className="cursor-pointer"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {errors.parts && <p className="mt-1 text-xs font-medium text-red-600">{errors.parts}</p>}
          </div>

          {mirrored && (
            <button type="button" className="btn-ghost mt-2 text-xs" onClick={() => togglePart(mirrored)}>
              <Plus className="size-3.5" />
              {t('issueEditor.addOtherSide', { zone: describePart(i18n, mirrored.bodyPart, mirrored.side) })}
            </button>
          )}
        </div>

        <div className="space-y-4">
          {formError && <ErrorNote>{formError}</ErrorNote>}

          <Field label={t('issueEditor.titleLabel')} error={errors.title}>
            <input
              className="input"
              value={values.title}
              onChange={(e) => set({ title: e.target.value })}
              placeholder={t('issueEditor.titlePlaceholder')}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('issueEditor.severity')}>
              <Select
                options={SEVERITIES}
                group="severity"
                value={values.severity}
                onChange={(e) => set({ severity: e.target.value as Values['severity'] })}
              />
            </Field>
            <Field label={t('issueEditor.status')}>
              <Select
                options={ISSUE_STATUSES}
                group="issueStatus"
                value={values.status}
                onChange={(e) => {
                  const status = e.target.value as Values['status'];
                  set({ status, resolvedDate: status === 'resolved' && !values.resolvedDate ? today() : values.resolvedDate });
                }}
              />
            </Field>
            <Field label={t('issueEditor.firstNoticed')}>
              <input type="date" className="input" value={values.onsetDate} onChange={(e) => set({ onsetDate: e.target.value })} />
            </Field>
            <Field label={t('issueEditor.resolvedOn')}>
              <input
                type="date"
                className="input"
                value={values.resolvedDate}
                disabled={values.status !== 'resolved'}
                onChange={(e) => set({ resolvedDate: e.target.value })}
              />
            </Field>
          </div>

          <Field label={t('issueEditor.whatSeeing')}>
            <textarea className="input min-h-24" value={values.description} onChange={(e) => set({ description: e.target.value })} />
          </Field>

          <Field label={t('issueEditor.diagnosis')} hint={t('issueEditor.diagnosisHint')}>
            <textarea className="input min-h-16" value={values.diagnosis} onChange={(e) => set({ diagnosis: e.target.value })} />
          </Field>

          <Field label={t('issueEditor.photosFiles')}>
            <AttachmentField value={values.attachments} onChange={(attachments) => set({ attachments })} />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
