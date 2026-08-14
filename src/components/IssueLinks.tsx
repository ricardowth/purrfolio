import { Link } from 'react-router-dom';
import { useData } from '@/store/DataContext';
import { useI18n } from '@/lib/i18n';
import { Badge, SEVERITY_TONE } from '@/components/ui';
import { describePart } from '@/anatomy/regions';

/** Checkbox list for linking a record to the health issues it relates to. */
export function IssuePicker({ value, onChange }: { value: string[]; onChange: (ids: string[]) => void }) {
  const { forPet } = useData();
  const i18n = useI18n();
  const issues = forPet('issues');

  if (issues.length === 0) {
    // The sentence wraps a link, so it is split around the {link} placeholder
    // rather than being assembled from fragments that would not reorder.
    const [before, after] = i18n.t('issueLinks.none').split('{link}');
    return (
      <p className="text-sm text-stone-500 dark:text-stone-400">
        {before}
        <Link to="/health" className="link">
          {i18n.t('issueLinks.healthMap')}
        </Link>
        {after}
      </p>
    );
  }

  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);

  return (
    <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-stone-200 p-2 dark:border-stone-700">
      {issues.map((issue) => (
        <label key={issue.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-stone-100 dark:hover:bg-stone-800">
          <input
            type="checkbox"
            checked={value.includes(issue.id)}
            onChange={() => toggle(issue.id)}
            className="size-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500/40 dark:border-stone-600 dark:bg-stone-900"
          />
          <span className="flex-1 truncate">{issue.title}</span>
          <span className="text-xs text-stone-500">{describePart(i18n, issue.bodyPart, issue.side)}</span>
        </label>
      ))}
    </div>
  );
}

/** Read-only chips linking back to the issues a record is attached to. */
export function IssueChips({ ids }: { ids: string[] }) {
  const { forPet } = useData();
  const issues = forPet('issues').filter((issue) => ids.includes(issue.id));
  if (issues.length === 0) return <span className="text-stone-400">—</span>;

  return (
    <span className="flex flex-wrap gap-1">
      {issues.map((issue) => (
        <Link key={issue.id} to={`/issues/${issue.id}`}>
          <Badge tone={issue.status === 'resolved' ? 'green' : SEVERITY_TONE[issue.severity]}>{issue.title}</Badge>
        </Link>
      ))}
    </span>
  );
}
