import type { Attachment, CollectionName, Database } from '@shared/types';

export interface ApiIssue {
  path: string;
  message: string;
}

export class ApiError extends Error {
  issues: ApiIssue[];
  status: number;

  constructor(message: string, status: number, issues: ApiIssue[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.issues = issues;
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
    throw new ApiError('Cannot reach the Purrfolio server. Is `npm run dev` still running?', 0);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}) as Record<string, unknown>);
    throw new ApiError(
      (body.error as string) ?? `Request failed (${response.status})`,
      response.status,
      (body.issues as ApiIssue[]) ?? [],
    );
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
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
