import { useEffect, useState } from 'react';
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
import type { Issue, Side } from '@shared/types';

type Values = FormValues<Issue>;

const blank = (petId: string, part?: PartSelection | null): Values => ({
  petId,
  title: '',
  bodyPart: part?.bodyPart ?? 'general',
  side: part?.side ?? 'none',
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
  const [viewSide, setViewSide] = useState<'left' | 'right'>(initialPart?.side === 'right' ? 'right' : 'left');
  const [showInternal, setShowInternal] = useState(Boolean(issue && REGIONS_BY_ID.get(issue.bodyPart)?.internal));

  // Reset the form each time the modal is opened.
  useEffect(() => {
    if (!open) return;
    setValues(issue ? stripMeta(issue) : blank(petId, initialPart));
    setErrors({});
    setFormError(null);
    const side = issue?.side ?? initialPart?.side;
    if (side === 'left' || side === 'right') setViewSide(side);
    const part = issue?.bodyPart ?? initialPart?.bodyPart;
    setShowInternal(Boolean(part && REGIONS_BY_ID.get(part)?.internal));
  }, [open, issue, initialPart, petId]);

  const set = (patch: Partial<Values>) => setValues((prev) => ({ ...prev, ...patch }));
  const region = REGIONS_BY_ID.get(values.bodyPart);

  function selectPart(selection: PartSelection) {
    set({ bodyPart: selection.bodyPart, side: selection.side });
    if (selection.side === 'left' || selection.side === 'right') setViewSide(selection.side);
  }

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
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="inline-flex overflow-hidden rounded-lg border border-stone-300 text-xs dark:border-stone-700">
              {(['left', 'right'] as const).map((side) => (
                <button
                  key={side}
                  type="button"
                  onClick={() => setViewSide(side)}
                  className={cx(
                    'cursor-pointer px-3 py-1.5 font-medium',
                    viewSide === side ? 'bg-amber-600 text-white' : 'bg-white text-stone-600 dark:bg-stone-900 dark:text-stone-400',
                  )}
                >
                  {side === 'left' ? t('body.leftSide') : t('body.rightSide')}
                </button>
              ))}
            </div>
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
            viewSide={viewSide}
            showInternal={showInternal}
            selected={{ bodyPart: values.bodyPart, side: values.side }}
            onSelect={selectPart}
            className="rounded-lg border border-stone-200 p-2 dark:border-stone-800"
          />

          <div className="mt-2 flex flex-wrap gap-1.5">
            {generalRegions.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => set({ bodyPart: item.id, side: 'none' })}
                className={cx(
                  'badge cursor-pointer',
                  values.bodyPart === item.id
                    ? 'bg-amber-600 text-white'
                    : 'bg-stone-200 text-stone-700 hover:bg-stone-300 dark:bg-stone-800 dark:text-stone-300',
                )}
              >
                {regionLabel(i18n, item.id)}
              </button>
            ))}
          </div>

          <p className="mt-2 text-sm">
            <span className="text-stone-500">{t('issueEditor.selected')}</span>
            <span className="font-medium text-stone-900 dark:text-stone-100">{describePart(i18n, values.bodyPart, values.side)}</span>
          </p>
          {errors.bodyPart && <p className="mt-1 text-xs font-medium text-red-600">{errors.bodyPart}</p>}

          {region?.sided && (
            <Field label={t('issueEditor.side')} className="mt-3">
              <Select
                options={['left', 'right', 'none']}
                group="side"
                value={values.side}
                onChange={(e) => {
                  const side = e.target.value as Side;
                  set({ side });
                  if (side === 'left' || side === 'right') setViewSide(side);
                }}
              />
            </Field>
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
