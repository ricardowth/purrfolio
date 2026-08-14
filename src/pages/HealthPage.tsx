import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Plus, X } from 'lucide-react';
import { useData } from '@/store/DataContext';
import { CatBody, SeverityLegend, type PartSelection } from '@/anatomy/CatBody';
import { describePart } from '@/anatomy/regions';
import { IssueEditor } from '@/components/IssueEditor';
import { Badge, EmptyState, ISSUE_STATUS_TONE, PageHeader, SEVERITY_TONE, cx } from '@/components/ui';
import { formatDate, relativeDays, titleCase } from '@/lib/format';
import type { Issue } from '@shared/types';

type StatusFilter = 'open' | 'all' | 'resolved';

function IssueCard({ issue }: { issue: Issue }) {
  return (
    <Link
      to={`/issues/${issue.id}`}
      className="card block p-3.5 transition hover:border-amber-400 hover:shadow-md dark:hover:border-amber-700"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-stone-900 dark:text-stone-100">{issue.title}</p>
          <p className="mt-0.5 text-xs text-stone-500">
            {describePart(issue.bodyPart, issue.side)} · first noticed {formatDate(issue.onsetDate)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge tone={ISSUE_STATUS_TONE[issue.status]}>{titleCase(issue.status)}</Badge>
          {issue.status !== 'resolved' && <Badge tone={SEVERITY_TONE[issue.severity]}>{titleCase(issue.severity)}</Badge>}
        </div>
      </div>
      {issue.description && <p className="mt-2 line-clamp-2 text-sm text-stone-600 dark:text-stone-400">{issue.description}</p>}
      <p className="mt-2 text-xs text-stone-400">
        {issue.updates.length > 0
          ? `${issue.updates.length} update${issue.updates.length === 1 ? '' : 's'} · last ${relativeDays(issue.updates[issue.updates.length - 1].date)}`
          : 'No progress updates yet'}
      </p>
    </Link>
  );
}

export default function HealthPage() {
  const { forPet, pet } = useData();
  const issues = forPet('issues');

  const [viewSide, setViewSide] = useState<'left' | 'right'>('left');
  const [showInternal, setShowInternal] = useState(false);
  const [selected, setSelected] = useState<PartSelection | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open');
  const [editorOpen, setEditorOpen] = useState(false);

  const visible = useMemo(() => {
    let rows = issues;
    if (statusFilter === 'open') rows = rows.filter((issue) => issue.status !== 'resolved');
    if (statusFilter === 'resolved') rows = rows.filter((issue) => issue.status === 'resolved');
    if (selected) rows = rows.filter((issue) => issue.bodyPart === selected.bodyPart && issue.side === selected.side);
    return [...rows].sort((a, b) => (b.onsetDate || '').localeCompare(a.onsetDate || ''));
  }, [issues, statusFilter, selected]);

  const openCount = issues.filter((issue) => issue.status !== 'resolved').length;

  return (
    <>
      <PageHeader
        title="Health map"
        subtitle={
          pet
            ? `${openCount} open issue${openCount === 1 ? '' : 's'} for ${pet.name}. Click a body part to filter, or to record something new there.`
            : undefined
        }
        actions={
          <button type="button" className="btn-primary" onClick={() => setEditorOpen(true)}>
            <Plus className="size-4" />
            New issue
          </button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="card p-4 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="inline-flex overflow-hidden rounded-lg border border-stone-300 text-xs dark:border-stone-700">
              {(['left', 'right'] as const).map((side) => (
                <button
                  key={side}
                  type="button"
                  onClick={() => setViewSide(side)}
                  className={cx(
                    'cursor-pointer px-3 py-1.5 font-medium transition-colors',
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
            issues={issues}
            viewSide={viewSide}
            showInternal={showInternal}
            selected={selected}
            onSelect={(part) =>
              setSelected((prev) => (prev?.bodyPart === part.bodyPart && prev.side === part.side ? null : part))
            }
          />

          <div className="mt-3 border-t border-stone-200 pt-3 dark:border-stone-800">
            <SeverityLegend />
          </div>

          <p className="mt-3 text-center text-xs text-stone-400">
            The near-side legs are solid; the faded ones behind belong to the {viewSide === 'left' ? 'right' : 'left'} side.
          </p>
        </div>

        <div className="lg:col-span-3">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="inline-flex overflow-hidden rounded-lg border border-stone-300 text-xs dark:border-stone-700">
              {(
                [
                  ['open', 'Open'],
                  ['resolved', 'Resolved'],
                  ['all', 'All'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatusFilter(value)}
                  className={cx(
                    'cursor-pointer px-3 py-1.5 font-medium transition-colors',
                    statusFilter === value ? 'bg-stone-800 text-white dark:bg-stone-200 dark:text-stone-900' : 'bg-white text-stone-600 dark:bg-stone-900 dark:text-stone-400',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {selected && (
              <span className="badge bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                {describePart(selected.bodyPart, selected.side)}
                <button type="button" onClick={() => setSelected(null)} aria-label="Clear body part filter" className="cursor-pointer">
                  <X className="size-3" />
                </button>
              </span>
            )}

            <div className="flex-1" />

            {selected && (
              <button type="button" className="btn-ghost text-xs" onClick={() => setEditorOpen(true)}>
                <Plus className="size-3.5" />
                Add issue here
              </button>
            )}
          </div>

          {visible.length === 0 ? (
            <EmptyState
              icon={Activity}
              title={selected ? 'Nothing recorded on this part' : 'No issues to show'}
              message={
                selected
                  ? `${describePart(selected.bodyPart, selected.side)} has no ${statusFilter === 'all' ? '' : statusFilter + ' '}issues.`
                  : 'Record anything you notice — a limp, a lump, a change in appetite. Even resolved issues are worth keeping.'
              }
              action={
                <button type="button" className="btn-primary" onClick={() => setEditorOpen(true)}>
                  <Plus className="size-4" />
                  New issue
                </button>
              }
            />
          ) : (
            <div className="space-y-2.5">
              {visible.map((issue) => (
                <IssueCard key={issue.id} issue={issue} />
              ))}
            </div>
          )}
        </div>
      </div>

      <IssueEditor open={editorOpen} initialPart={selected} onClose={() => setEditorOpen(false)} />
    </>
  );
}
