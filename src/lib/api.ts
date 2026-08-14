import type { I18n } from '@/lib/i18n';
import type { StringKey } from '@/lib/strings';
import type { Attachment, CollectionName, Database } from '@shared/types';

export interface ApiIssue {
  path: string;
  message: string;
}

/** Failures this module raises itself, as opposed to text relayed from the server. */
export type ApiErrorCode = 'offline' | 'requestFailed';

export class ApiError extends Error {
  issues: ApiIssue[];
  status: number;
  code?: ApiErrorCode;

  constructor(message: string, status: number, issues: ApiIssue[] = [], code?: ApiErrorCode) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.issues = issues;
    this.code = code;
  }

  /** Field name -> message, for showing errors next to the offending input. */
  get byField(): Record<string, string> {
    return Object.fromEntries(this.issues.map((i) => [i.path, i.message]));
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: init?.body instanceof FormData ? init.headers : { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new ApiError('Cannot reach the Purrfolio server. Is `npm run dev` still running?', 0, [], 'offline');
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}) as Record<string, unknown>);
    const relayed = body.error as string | undefined;
    throw new ApiError(
      relayed ?? `Request failed (${response.status})`,
      response.status,
      (body.issues as ApiIssue[]) ?? [],
      relayed ? undefined : 'requestFailed',
    );
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

/**
 * Message to show for a failed request. Errors we raised ourselves carry a code
 * and get translated; anything relayed from the server is shown as sent, with
 * `fallback` covering non-Error throws.
 */
export function apiMessage(error: unknown, i18n: I18n, fallback: StringKey): string {
  if (error instanceof ApiError && error.code === 'offline') return i18n.t('error.offline');
  if (error instanceof ApiError && error.code === 'requestFailed') return i18n.t('error.requestFailed', { status: error.status });
  if (error instanceof Error && error.message) return error.message;
  return i18n.t(fallback);
}

/** Field errors arrive as `validation.*` codes; turn them into readable text. */
export function translateFieldErrors(byField: Record<string, string>, i18n: I18n): Record<string, string> {
  return Object.fromEntries(Object.entries(byField).map(([field, code]) => [field, i18n.tLoose(code)]));
}

export interface BackupInfo {
  name: string;
  size: number;
  savedAt: string;
}

export const api = {
  getData: () => request<Database>('/api/data'),

  create: <T>(collection: CollectionName, values: unknown) =>
    request<T>(`/api/${collection}`, { method: 'POST', body: JSON.stringify(values) }),

  update: <T>(collection: CollectionName, id: string, values: unknown) =>
    request<T>(`/api/${collection}/${id}`, { method: 'PUT', body: JSON.stringify(values) }),

  remove: (collection: CollectionName, id: string) =>
    request<{ ok: true }>(`/api/${collection}/${id}`, { method: 'DELETE' }),

  upload: (files: File[]) => {
    const form = new FormData();
    for (const file of files) form.append('files', file);
    return request<Attachment[]>('/api/uploads', { method: 'POST', body: form });
  },

  deleteUpload: (filename: string) => request<{ ok: true }>(`/api/uploads/${filename}`, { method: 'DELETE' }),

  importData: (data: unknown) => request<{ ok: true; data: Database }>('/api/data', { method: 'PUT', body: JSON.stringify(data) }),

  backups: () => request<BackupInfo[]>('/api/backups'),

  restoreBackup: (name: string) =>
    request<{ ok: true; data: Database }>(`/api/backups/${encodeURIComponent(name)}/restore`, { method: 'POST' }),
};

/** Public URL for an uploaded file. */
export const fileUrl = (filename: string) => `/uploads/${filename}`;
