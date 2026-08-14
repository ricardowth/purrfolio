import { useRef, useState } from 'react';
import { FileText, Loader2, Paperclip, X } from 'lucide-react';
import { api, fileUrl } from '@/lib/api';
import { formatBytes } from '@/lib/format';
import { ErrorNote } from '@/components/ui';
import type { Attachment } from '@shared/types';

const isImage = (attachment: Attachment) => attachment.mime.startsWith('image/');

/** Read-only thumbnails/links, for detail views and the dashboard. */
export function AttachmentGallery({ items }: { items: Attachment[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <a
          key={item.id}
          href={fileUrl(item.filename)}
          target="_blank"
          rel="noreferrer"
          title={item.caption || item.originalName}
          className="group block"
        >
          {isImage(item) ? (
            <img
              src={fileUrl(item.filename)}
              alt={item.caption || item.originalName}
              className="size-20 rounded-lg border border-stone-200 object-cover transition group-hover:brightness-90 dark:border-stone-700"
            />
          ) : (
            <span className="flex size-20 flex-col items-center justify-center gap-1 rounded-lg border border-stone-200 px-1 text-center text-[10px] text-stone-500 group-hover:bg-stone-100 dark:border-stone-700 dark:group-hover:bg-stone-800">
              <FileText className="size-5" />
              <span className="line-clamp-2 break-all">{item.originalName}</span>
            </span>
          )}
        </a>
      ))}
    </div>
  );
}

/** Single-image picker, used for a pet's profile photo. Stores just the filename. */
export function PhotoField({ value, onChange, name }: { value: string; onChange: (filename: string) => void; name: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function pick(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    try {
      const [uploaded] = await api.upload([files[0]]);
      if (uploaded) onChange(uploaded.filename);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="flex items-center gap-3">
      {value ? (
        <img src={fileUrl(value)} alt={name} className="size-16 rounded-full border border-stone-200 object-cover dark:border-stone-700" />
      ) : (
        <span className="flex size-16 items-center justify-center rounded-full bg-amber-100 text-xl font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          {name.slice(0, 1).toUpperCase() || '?'}
        </span>
      )}
      <div className="flex gap-2">
        <button type="button" className="btn-ghost" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
          {value ? 'Change' : 'Upload photo'}
        </button>
        {value && (
          <button type="button" className="btn-subtle" onClick={() => onChange('')}>
            Remove
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => void pick(e.target.files)} />
    </div>
  );
}

/** Upload / remove attachments as part of a form. */
export function AttachmentField({ value, onChange }: { value: Attachment[]; onChange: (next: Attachment[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    try {
      onChange([...value, ...(await api.upload(Array.from(files)))]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function removeAt(attachment: Attachment) {
    onChange(value.filter((item) => item.id !== attachment.id));
    // Best effort — if the file is already gone the record is still cleaned up.
    await api.deleteUpload(attachment.filename).catch(() => undefined);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {value.map((item) => (
          <div key={item.id} className="relative">
            {isImage(item) ? (
              <img
                src={fileUrl(item.filename)}
                alt={item.originalName}
                className="size-20 rounded-lg border border-stone-200 object-cover dark:border-stone-700"
              />
            ) : (
              <span className="flex size-20 flex-col items-center justify-center gap-1 rounded-lg border border-stone-200 px-1 text-center text-[10px] text-stone-500 dark:border-stone-700">
                <FileText className="size-5" />
                <span className="line-clamp-2 break-all">{item.originalName}</span>
              </span>
            )}
            <button
              type="button"
              onClick={() => void removeAt(item)}
              aria-label={`Remove ${item.originalName}`}
              className="absolute -top-1.5 -right-1.5 cursor-pointer rounded-full bg-stone-800 p-0.5 text-white shadow hover:bg-red-600"
            >
              <X className="size-3" />
            </button>
            <span className="sr-only">{formatBytes(item.size)}</span>
          </div>
        ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex size-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-stone-300 text-xs text-stone-500 hover:border-amber-500 hover:text-amber-700 disabled:opacity-50 dark:border-stone-700 dark:hover:border-amber-600"
        >
          {busy ? <Loader2 className="size-5 animate-spin" /> : <Paperclip className="size-5" />}
          {busy ? 'Uploading' : 'Add file'}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,application/pdf,.doc,.docx,.txt"
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />

      {error && <ErrorNote>{error}</ErrorNote>}
    </div>
  );
}
