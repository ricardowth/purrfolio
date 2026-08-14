import { useEffect, useState } from 'react';
import { useData } from '@/store/DataContext';
import { ApiError } from '@/lib/api';
import { CatBody, type PartSelection } from '@/anatomy/CatBody';
import { REGIONS, REGIONS_BY_ID, describePart } from '@/anatomy/regions';
import { AttachmentField } from '@/components/AttachmentField';
import { ErrorNote, Field, Modal, Select, cx } from '@/components/ui';
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
        setErrors(err.byField);
        setFormError('Please fix the highlighted fields.');
      } else {
        setFormError(err instanceof Error ? err.message : 'Could not save');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const generalRegions = REGIONS.filter((item) => item.shapes.length === 0);

  return (
    <Modal
      open={open}
      title={issue ? 'Edit health issue' : 'New health issue'}
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={() => void submit()} disabled={submitting}>
            {submitting ? 'Saving…' : 'Save issue'}
          </button>
        </>
      }
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <span className="label">Where is it?</span>
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
                  {side === 'left' ? 'Left side' : 'Right side'}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowInternal((prev) => !prev)}
              className={cx('btn text-xs', showInternal ? 'btn-primary' : 'btn-ghost')}
            >
              Organs
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
                {item.label}
              </button>
            ))}
          </div>

          <p className="mt-2 text-sm">
            <span className="text-stone-500">Selected: </span>
            <span className="font-medium text-stone-900 dark:text-stone-100">{describePart(values.bodyPart, values.side)}</span>
          </p>
          {errors.bodyPart && <p className="mt-1 text-xs font-medium text-red-600">{errors.bodyPart}</p>}

          {region?.sided && (
            <Field label="Side" className="mt-3">
              <Select
                options={['left', 'right', 'none']}
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

          <Field label="Title" error={errors.title}>
            <input
              className="input"
              value={values.title}
              onChange={(e) => set({ title: e.target.value })}
              placeholder="Limping after jumping down"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Severity">
              <Select options={SEVERITIES} value={values.severity} onChange={(e) => set({ severity: e.target.value as Values['severity'] })} />
            </Field>
            <Field label="Status">
              <Select
                options={ISSUE_STATUSES}
                value={values.status}
                onChange={(e) => {
                  const status = e.target.value as Values['status'];
                  set({ status, resolvedDate: status === 'resolved' && !values.resolvedDate ? today() : values.resolvedDate });
                }}
              />
            </Field>
            <Field label="First noticed">
              <input type="date" className="input" value={values.onsetDate} onChange={(e) => set({ onsetDate: e.target.value })} />
            </Field>
            <Field label="Resolved on">
              <input
                type="date"
                className="input"
                value={values.resolvedDate}
                disabled={values.status !== 'resolved'}
                onChange={(e) => set({ resolvedDate: e.target.value })}
              />
            </Field>
          </div>

          <Field label="What you're seeing">
            <textarea className="input min-h-24" value={values.description} onChange={(e) => set({ description: e.target.value })} />
          </Field>

          <Field label="Diagnosis" hint="Fill this in once the vet has told you what it is.">
            <textarea className="input min-h-16" value={values.diagnosis} onChange={(e) => set({ diagnosis: e.target.value })} />
          </Field>

          <Field label="Photos & files">
            <AttachmentField value={values.attachments} onChange={(attachments) => set({ attachments })} />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
