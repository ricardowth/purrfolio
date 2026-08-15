import { useEffect, type ReactNode } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

// --- page furniture --------------------------------------------------------

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-50">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, message, action }: { icon?: typeof AlertTriangle; title: string; message?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-stone-300 px-6 py-14 text-center dark:border-stone-700">
      {Icon && <Icon className="mb-3 size-8 text-stone-400" strokeWidth={1.5} />}
      <p className="font-medium text-stone-700 dark:text-stone-300">{title}</p>
      {message && <p className="mt-1 max-w-md text-sm text-stone-500 dark:text-stone-400">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-2 py-10 text-sm text-stone-500">
      <Loader2 className="size-4 animate-spin" />
      {label ?? t('common.loading')}
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

// --- form pieces -----------------------------------------------------------

export function Field({
  label,
  error,
  hint,
  className,
  children,
}: {
  label?: string;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      {label && <span className="label">{label}</span>}
      {children}
      {hint && !error && <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">{hint}</p>}
      {error && <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

/**
 * Enum dropdown. `options` are the values stored in data.json (always English);
 * `group` names the `enum.<group>.*` block that supplies the visible labels, so
 * changing language relabels the options without touching the stored value.
 */
export function Select({
  options,
  group,
  ...props
}: { options: readonly string[]; group: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { tEnum } = useI18n();
  return (
    <select {...props} className={cx('input', props.className)}>
      {options.map((option) => (
        <option key={option} value={option}>
          {tEnum(group, option)}
        </option>
      ))}
    </select>
  );
}

export function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-700 select-none dark:text-stone-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500/40 dark:border-stone-600 dark:bg-stone-900"
      />
      {label}
    </label>
  );
}

// --- modal -----------------------------------------------------------------

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const { t } = useI18n();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-stone-900/50 p-4 backdrop-blur-sm sm:p-8">
      {/* Clicking the backdrop closes; clicks inside the panel must not bubble to it. */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx('card relative z-10 my-auto w-full', wide ? 'max-w-4xl' : 'max-w-2xl')}
      >
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-3.5 dark:border-stone-800">
          <h2 className="font-semibold text-stone-900 dark:text-stone-50">{title}</h2>
          <button type="button" onClick={onClose} className="btn-subtle -mr-2 px-2 py-1" aria-label={t('common.close')}>
            <X className="size-4" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-stone-200 px-5 py-3 dark:border-stone-800">{footer}</div>
        )}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={onCancel}>
            {t('common.cancel')}
          </button>
          <button type="button" className="btn-danger" onClick={onConfirm}>
            {confirmLabel ?? t('common.delete')}
          </button>
        </>
      }
    >
      <p className="text-sm text-stone-600 dark:text-stone-300">{message}</p>
    </Modal>
  );
}

// --- badges ----------------------------------------------------------------

const TONES = {
  neutral: 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
  amber: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  orange: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300',
  red: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  green: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  blue: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
  violet: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300',
} as const;

export type Tone = keyof typeof TONES;

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={cx('badge', TONES[tone])}>{children}</span>;
}

export const SEVERITY_TONE: Record<string, Tone> = { low: 'amber', medium: 'orange', high: 'red' };
export const ISSUE_STATUS_TONE: Record<string, Tone> = { active: 'red', monitoring: 'amber', resolved: 'green' };
export const APPOINTMENT_STATUS_TONE: Record<string, Tone> = { scheduled: 'blue', completed: 'green', cancelled: 'neutral' };
export const MEDICATION_STATUS_TONE: Record<string, Tone> = { upcoming: 'blue', active: 'green', finished: 'neutral' };
