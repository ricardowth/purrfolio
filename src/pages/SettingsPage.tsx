import { useEffect, useRef, useState } from 'react';
import { Download, History, Languages, RotateCcw, Upload } from 'lucide-react';
import { useData } from '@/store/DataContext';
import { api, type BackupInfo } from '@/lib/api';
import { ConfirmDialog, ErrorNote, PageHeader, cx } from '@/components/ui';
import { LANGS, useI18n } from '@/lib/i18n';
import type { StringKey } from '@/lib/strings';
import { formatBytes, useFormat } from '@/lib/format';

export default function SettingsPage() {
  const { db, reload } = useData();
  const { lang, setLang, t } = useI18n();
  const { formatDateTime } = useFormat();
  const fileRef = useRef<HTMLInputElement>(null);

  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<unknown>(null);
  const [pendingRestore, setPendingRestore] = useState<BackupInfo | null>(null);

  useEffect(() => {
    api.backups().then(setBackups).catch(() => setBackups([]));
  }, [db]);

  function exportJson() {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `purrfolio-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function pickImport(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    try {
      setPendingImport(JSON.parse(await files[0].text()));
    } catch {
      setError(t('settings.invalidJson'));
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function runImport() {
    const data = pendingImport;
    setPendingImport(null);
    try {
      await api.importData(data);
      await reload();
      setMessage(t('settings.imported'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.importFailed'));
    }
  }

  async function runRestore() {
    const backup = pendingRestore;
    setPendingRestore(null);
    if (!backup) return;
    try {
      await api.restoreBackup(backup.name);
      await reload();
      setMessage(t('settings.restored', { date: formatDateTime(backup.savedAt) }));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.restoreFailed'));
    }
  }

  const counts = Object.entries(db)
    .filter(([key, value]) => key !== 'version' && Array.isArray(value))
    .map(([key, value]) => [key, (value as unknown[]).length] as const);

  return (
    <>
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />

      {error && (
        <div className="mb-4">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}
      {message && (
        <div className="mb-4 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
          {message}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-700 dark:text-stone-300">
            <Languages className="size-4 text-stone-400" />
            {t('settings.language')}
          </h2>
          <div className="flex flex-wrap gap-2">
            {LANGS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setLang(option.value)}
                aria-pressed={lang === option.value}
                className={cx('btn', lang === option.value ? 'btn-primary' : 'btn-ghost')}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">{t('settings.languageHint')}</p>
        </section>

        <section className="card p-4">
          <h2 className="mb-3 text-sm font-semibold text-stone-700 dark:text-stone-300">{t('settings.backupTitle')}</h2>
          <p className="mb-4 text-sm text-stone-500 dark:text-stone-400">{t('settings.backupText')}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-ghost" onClick={exportJson}>
              <Download className="size-4" />
              {t('settings.exportJson')}
            </button>
            <button type="button" className="btn-ghost" onClick={() => fileRef.current?.click()}>
              <Upload className="size-4" />
              {t('settings.importJson')}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => void pickImport(e.target.files)}
            />
          </div>
        </section>

        <section className="card p-4">
          <h2 className="mb-3 text-sm font-semibold text-stone-700 dark:text-stone-300">{t('settings.storedTitle')}</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {counts.map(([name, count]) => (
              <div key={name} className="flex justify-between border-b border-stone-100 py-1 dark:border-stone-800">
                <dt className="text-stone-500">{t(`collection.${name}` as StringKey)}</dt>
                <dd className="font-medium text-stone-800 dark:text-stone-200">{count}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="card p-4 lg:col-span-2">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-700 dark:text-stone-300">
            <History className="size-4 text-stone-400" />
            {t('settings.snapshotsTitle')}
          </h2>
          {backups.length === 0 ? (
            <p className="text-sm text-stone-500">{t('settings.noSnapshots')}</p>
          ) : (
            <ul className="divide-y divide-stone-100 text-sm dark:divide-stone-800">
              {backups.map((backup) => (
                <li key={backup.name} className="flex items-center justify-between gap-3 py-2">
                  <div>
                    <p className="text-stone-800 dark:text-stone-200">{formatDateTime(backup.savedAt)}</p>
                    <p className="text-xs text-stone-500">{formatBytes(backup.size)}</p>
                  </div>
                  <button type="button" className="btn-subtle text-xs" onClick={() => setPendingRestore(backup)}>
                    <RotateCcw className="size-3.5" />
                    {t('settings.restore')}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={pendingImport !== null}
        title={t('settings.replaceTitle')}
        message={t('settings.replaceMessage')}
        confirmLabel={t('settings.import')}
        onConfirm={() => void runImport()}
        onCancel={() => setPendingImport(null)}
      />

      <ConfirmDialog
        open={pendingRestore !== null}
        title={t('settings.restoreTitle')}
        message={pendingRestore ? t('settings.restoreMessage', { date: formatDateTime(pendingRestore.savedAt) }) : ''}
        confirmLabel={t('settings.restore')}
        onConfirm={() => void runRestore()}
        onCancel={() => setPendingRestore(null)}
      />
    </>
  );
}
