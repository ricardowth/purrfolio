/** The editable half of a stored record — everything the server doesn't own. */
export type FormValues<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;

/** Stored record -> form values. */
export function stripMeta<T extends { id: string }>(row: T): FormValues<T> {
  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = row as T & { createdAt?: string; updatedAt?: string };
  return rest as FormValues<T>;
}

/** Empty number inputs should store null, not NaN or 0. */
export const numberOrNull = (value: string) => (value.trim() === '' ? null : Number(value));

/** Value for a number input that may legitimately be null. */
export const numberValue = (value: number | null | undefined) => (value === null || value === undefined ? '' : String(value));

/** 'a, b , c' <-> ['a','b','c'] for simple tag/allergy inputs. */
export const parseList = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
