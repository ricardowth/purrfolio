import { useCallback, useState, type ReactNode } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useData } from '@/store/DataContext';
import { useI18n } from '@/lib/i18n';
import { ApiError, apiMessage, translateFieldErrors } from '@/lib/api';
import { ConfirmDialog, EmptyState, ErrorNote, Modal, PageHeader, cx } from '@/components/ui';
import type { CollectionName } from '@shared/types';

export interface Column<T> {
  header: string;
  render: (row: T) => ReactNode;
  /** Applied to both the header cell and the body cells. */
  className?: string;
}

export interface FormApi<V> {
  values: V;
  set: (patch: Partial<V>) => void;
  errors: Record<string, string>;
  /** Id of the record being edited, or null when adding — for forms that need
   *  to exclude the record from a list of its own siblings. */
  editingId: string | null;
}

/** One table on the page. Pages with a single list never build these by hand. */
export interface Section<T> {
  /** Heading above the table; left out when the page is one plain list. */
  title?: string;
  rows: T[];
  columns: Column<T>[];
  /** Shown instead of the table when this section is empty but a sibling isn't. */
  emptyMessage?: string;
}

interface BaseProps<T extends { id: string }, V extends Record<string, unknown>> {
  collection: CollectionName;
  title: string;
  subtitle?: string;
  addLabel: string;
  /** Blank record for the "add" form — include petId here for pet-scoped collections. */
  defaults: () => V;
  /** Existing record -> form values. */
  toValues: (row: T) => V;
  renderForm: (form: FormApi<V>) => ReactNode;
  describe: (row: T) => string;
  emptyTitle: string;
  emptyMessage?: string;
  emptyIcon?: LucideIcon;
  headerActions?: ReactNode;
  /** Extra buttons in each row, shown before edit/delete. */
  rowActions?: (row: T) => ReactNode;
  wideModal?: boolean;
  children?: ReactNode;
}

/** One list, or several under their own headings — never both. */
type ResourcePageProps<T extends { id: string }, V extends Record<string, unknown>> = BaseProps<T, V> &
  ({ rows: T[]; columns: Column<T>[]; sections?: never } | { rows?: never; columns?: never; sections: Section<T>[] });

/**
 * List + add/edit modal + delete confirmation for one collection. Every records
 * page in the app is a thin configuration of this component, so they all behave
 * and look identical.
 */
export function ResourcePage<T extends { id: string }, V extends Record<string, unknown>>(props: ResourcePageProps<T, V>) {
  const {
    collection,
    title,
    subtitle,
    addLabel,
    defaults,
    toValues,
    renderForm,
    describe,
    emptyTitle,
    emptyMessage,
    emptyIcon,
    headerActions,
    rowActions,
    wideModal,
    children,
  } = props;

  const sections: Section<T>[] = props.sections ?? [{ rows: props.rows ?? [], columns: props.columns ?? [] }];
  const totalRows = sections.reduce((count, section) => count + section.rows.length, 0);

  const { create, save, remove } = useData();
  const i18n = useI18n();
  const { t } = i18n;

  const [editing, setEditing] = useState<T | 'new' | null>(null);
  const [values, setValues] = useState<V | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<T | null>(null);

  const openNew = () => {
    setEditing('new');
    setValues(defaults());
    setErrors({});
    setFormError(null);
  };

  const openEdit = (row: T) => {
    setEditing(row);
    // Layered over the blanks so a record written before a field existed still
    // opens: the stored values win, and anything missing falls back to the empty
    // value the form expects rather than reaching the inputs as undefined.
    setValues({ ...defaults(), ...toValues(row) });
    setErrors({});
    setFormError(null);
  };

  const close = useCallback(() => {
    setEditing(null);
    setValues(null);
  }, []);

  const set = useCallback((patch: Partial<V>) => setValues((prev) => (prev ? { ...prev, ...patch } : prev)), []);

  async function submit() {
    if (!values || !editing) return;
    setSubmitting(true);
    setErrors({});
    setFormError(null);
    try {
      if (editing === 'new') await create(collection, values);
      else await save(collection, editing.id, values);
      close();
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

  async function confirmDelete() {
    if (!pendingDelete) return;
    const row = pendingDelete;
    setPendingDelete(null);
    await remove(collection, row.id);
  }

  return (
    <>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          <>
            {headerActions}
            <button type="button" className="btn-primary" onClick={openNew}>
              <Plus className="size-4" />
              {addLabel}
            </button>
          </>
        }
      />

      {children}

      {totalRows === 0 ? (
        <EmptyState
          icon={emptyIcon}
          title={emptyTitle}
          message={emptyMessage}
          action={
            <button type="button" className="btn-primary" onClick={openNew}>
              <Plus className="size-4" />
              {addLabel}
            </button>
          }
        />
      ) : (
        <div className="space-y-6">
          {sections.map((section, index) => (
            <section key={section.title ?? index}>
              {section.title && <p className="section-title mb-2">{section.title}</p>}
              {section.rows.length === 0 ? (
                <p className="card px-4 py-6 text-center text-sm text-stone-500">{section.emptyMessage}</p>
              ) : (
                <div className="card overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-stone-200 text-left dark:border-stone-800">
                        {section.columns.map((column) => (
                          <th
                            key={column.header}
                            className={cx('px-4 py-2.5 text-xs font-semibold tracking-wide text-stone-500 uppercase', column.className)}
                          >
                            {column.header}
                          </th>
                        ))}
                        <th className="w-px px-4 py-2.5" />
                      </tr>
                    </thead>
                    <tbody>
                      {section.rows.map((row) => (
                        <tr
                          key={row.id}
                          className="border-b border-stone-100 last:border-0 hover:bg-stone-50 dark:border-stone-800/70 dark:hover:bg-stone-800/40"
                        >
                          {section.columns.map((column) => (
                            <td key={column.header} className={cx('px-4 py-3 align-top', column.className)}>
                              {column.render(row)}
                            </td>
                          ))}
                          <td className="px-2 py-2 text-right whitespace-nowrap">
                            {rowActions?.(row)}
                            <button
                              type="button"
                              className="btn-subtle px-2 py-1"
                              onClick={() => openEdit(row)}
                              aria-label={t('common.edit')}
                            >
                              <Pencil className="size-4" />
                            </button>
                            <button
                              type="button"
                              className="btn-subtle px-2 py-1 hover:text-red-600"
                              onClick={() => setPendingDelete(row)}
                              aria-label={t('common.delete')}
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      <Modal
        open={editing !== null}
        title={editing === 'new' ? addLabel : t('resource.editRecord')}
        onClose={close}
        wide={wideModal}
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={close}>
              {t('common.cancel')}
            </button>
            <button type="button" className="btn-primary" onClick={() => void submit()} disabled={submitting}>
              {submitting ? t('common.saving') : t('common.save')}
            </button>
          </>
        }
      >
        {values && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            {formError && <ErrorNote>{formError}</ErrorNote>}
            {renderForm({ values, set, errors, editingId: editing && editing !== 'new' ? editing.id : null })}
            {/* Lets Enter submit the form without showing a duplicate button. */}
            <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={t('resource.deleteTitle')}
        message={pendingDelete ? t('resource.deleteMessage', { name: describe(pendingDelete) }) : ''}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
