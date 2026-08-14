import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Plus, X } from 'lucide-react';
import { useData } from '@/store/DataContext';
import { CatBody, SeverityLegend, type PartSelection } from '@/anatomy/CatBody';
import { describePart } from '@/anatomy/regions';
import { IssueEditor } from '@/components/IssueEditor';
import { Badge, EmptyState, ISSUE_STATUS_TONE, PageHeader, SEVERITY_TONE, cx } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { useFormat } from '@/lib/format';
import type { StringKey } from '@/lib/strings';
import type { Issue } from '@shared/types';

type StatusFilter = 'open' | 'all' | 'resolved';

function IssueCard({ issue }: { issue: Issue }) {
  const i18n = useI18n();
  const { t, tn, tEnum } = i18n;
  const { formatDate, relativeDays } = useFormat();

  return (
    <Link
      to={`/issues/${issue.id}`}
      className="card block p-3.5 transition hover:border-amber-400 hover:shadow-md dark:hover:border-amber-700"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-stone-900 dark:text-stone-100">{issue.title}</p>
          <p className="mt-0.5 text-xs text-stone-500">
            {describePart(i18n, issue.bodyPart, issue.side)} · {t('health.firstNoticed', { date: formatDate(issue.onsetDate) })}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge tone={ISSUE_STATUS_TONE[issue.status]}>{tEnum('issueStatus', issue.status)}</Badge>
          {issue.status !== 'resolved' && <Badge tone={SEVERITY_TONE[issue.severity]}>{tEnum('severity', issue.severity)}</Badge>}
        </div>
      </div>
      {issue.description && <p className="mt-2 line-clamp-2 text-sm text-stone-600 dark:text-stone-400">{issue.description}</p>}
      <p className="mt-2 text-xs text-stone-400">
        {issue.updates.length > 0
          ? tn('health.updatesCount', issue.updates.length, {
              when: relativeDays(issue.updates[issue.updates.length - 1].date),
            })
          : t('health.noUpdates')}
      </p>
    </Link>
  );
}

/** Empty-state copy depends on which status filter is narrowing the list. */
const EMPTY_MESSAGE_KEY: Record<StatusFilter, StringKey> = {
  all: 'health.emptySelectedMessage',
  open: 'health.emptySelectedMessageOpen',
  resolved: 'health.emptySelectedMessageResolved',
};

export default function HealthPage() {
  const { forPet, pet } = useData();
  const i18n = useI18n();
  const { t, tn } = i18n;
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

  const filters: [StatusFilter, StringKey][] = [
    ['open', 'health.filterOpen'],
    ['resolved', 'health.filterResolved'],
    ['all', 'health.filterAll'],
  ];

  return (
    <>
      <PageHeader
        title={t('health.title')}
        subtitle={pet ? tn('health.subtitle', openCount, { name: pet.name }) : undefined}
        actions={
          <button type="button" className="btn-primary" onClick={() => setEditorOpen(true)}>
            <Plus className="size-4" />
            {t('health.newIssue')}
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
            issues={issues}
            viewSide={viewSide}
            showInternal={showInternal}
            selected={selected}
            showOffDiagram
            onSelect={(part) =>
              setSelected((prev) => (prev?.bodyPart === part.bodyPart && prev.side === part.side ? null : part))
            }
          />

          <div className="mt-3 border-t border-stone-200 pt-3 dark:border-stone-800">
            <SeverityLegend />
          </div>

          <p className="mt-3 text-center text-xs text-stone-400">
            {t('health.legHint', {
              side: viewSide === 'left' ? t('health.legHintRight') : t('health.legHintLeft'),
            })}
          </p>
        </div>

        <div className="lg:col-span-3">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="inline-flex overflow-hidden rounded-lg border border-stone-300 text-xs dark:border-stone-700">
              {filters.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatusFilter(value)}
                  className={cx(
                    'cursor-pointer px-3 py-1.5 font-medium transition-colors',
                    statusFilter === value
                      ? 'bg-stone-800 text-white dark:bg-stone-200 dark:text-stone-900'
                      : 'bg-white text-stone-600 dark:bg-stone-900 dark:text-stone-400',
                  )}
                >
                  {t(label)}
                </button>
              ))}
            </div>

            {selected && (
              <span className="badge bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                {describePart(i18n, selected.bodyPart, selected.side)}
                <button type="button" onClick={() => setSelected(null)} aria-label={t('health.clearFilter')} className="cursor-pointer">
                  <X className="size-3" />
                </button>
              </span>
            )}

            <div className="flex-1" />

            {selected && (
              <button type="button" className="btn-ghost text-xs" onClick={() => setEditorOpen(true)}>
                <Plus className="size-3.5" />
                {t('health.addIssueHere')}
              </button>
            )}
          </div>

          {visible.length === 0 ? (
            <EmptyState
              icon={Activity}
              title={selected ? t('health.emptySelectedTitle') : t('health.emptyTitle')}
              message={
                selected
                  ? t(EMPTY_MESSAGE_KEY[statusFilter], { part: describePart(i18n, selected.bodyPart, selected.side) })
                  : t('health.emptyMessage')
              }
              action={
                <button type="button" className="btn-primary" onClick={() => setEditorOpen(true)}>
                  <Plus className="size-4" />
                  {t('health.newIssue')}
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
