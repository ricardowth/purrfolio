import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, apiMessage } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { emptyDatabase } from '@shared/schema.js';
import type { Contact, Database, CollectionName, Pet } from '@shared/types';

type Row<K extends CollectionName> = Database[K][number];

const PET_SCOPED = [
  'issues',
  'appointments',
  'vaccinations',
  'medications',
  'foods',
  'weights',
  'careEvents',
  'journal',
  'documents',
] as const;

type PetScoped = (typeof PET_SCOPED)[number];

interface DataContextValue {
  db: Database;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;

  /** Every pet, including archived ones. */
  allPets: Pet[];
  /** Pets shown in the switcher. */
  pets: Pet[];
  /** The pet currently being viewed, or null when none exist yet. */
  pet: Pet | null;
  petId: string;
  selectPet: (id: string) => void;
  petById: (id?: string) => Pet | undefined;
  contactById: (id?: string) => Contact | undefined;

  /** Records of a pet-scoped collection belonging to the selected pet. */
  forPet: <K extends PetScoped>(collection: K) => Row<K>[];

  create: <K extends CollectionName>(collection: K, values: Record<string, unknown>) => Promise<Row<K>>;
  save: <K extends CollectionName>(collection: K, id: string, values: Record<string, unknown>) => Promise<Row<K>>;
  remove: (collection: CollectionName, id: string) => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

const SELECTED_PET_KEY = 'purrfolio.selectedPet';

export function DataProvider({ children }: { children: ReactNode }) {
  const i18n = useI18n();
  const [db, setDb] = useState<Database>(() => emptyDatabase() as Database);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [petId, setPetId] = useState<string>(() => localStorage.getItem(SELECTED_PET_KEY) ?? '');

  const reload = useCallback(async () => {
    try {
      setDb(await api.getData());
      setError(null);
    } catch (err) {
      setError(apiMessage(err, i18n, 'common.failedLoad'));
    } finally {
      setLoading(false);
    }
  }, [i18n]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const allPets = db.pets;
  const pets = useMemo(() => allPets.filter((p) => !p.archived), [allPets]);

  // Keep the selection valid as pets are added, archived, or deleted.
  useEffect(() => {
    if (pets.length === 0) {
      if (petId) setPetId('');
      return;
    }
    if (!pets.some((p) => p.id === petId)) setPetId(pets[0].id);
  }, [pets, petId]);

  const selectPet = useCallback((id: string) => {
    setPetId(id);
    localStorage.setItem(SELECTED_PET_KEY, id);
  }, []);

  const pet = useMemo(() => allPets.find((p) => p.id === petId) ?? null, [allPets, petId]);

  // Pre-filter every pet-scoped collection once per pet change, so callers get a
  // stable array identity they can safely put in dependency lists.
  const scoped = useMemo(() => {
    const result = {} as { [K in PetScoped]: Row<K>[] };
    for (const name of PET_SCOPED) {
      result[name] = (db[name] as { petId: string }[]).filter((row) => row.petId === petId) as never;
    }
    return result;
  }, [db, petId]);

  const forPet = useCallback(<K extends PetScoped>(collection: K) => scoped[collection], [scoped]);

  const petById = useCallback((id?: string) => allPets.find((p) => p.id === id), [allPets]);
  const contactById = useCallback((id?: string) => db.contacts.find((c) => c.id === id), [db.contacts]);

  const create = useCallback(async <K extends CollectionName>(collection: K, values: Record<string, unknown>) => {
    const record = await api.create<Row<K>>(collection, values);
    setDb((prev) => ({ ...prev, [collection]: [...prev[collection], record] }) as Database);
    return record;
  }, []);

  const save = useCallback(async <K extends CollectionName>(collection: K, id: string, values: Record<string, unknown>) => {
    const record = await api.update<Row<K>>(collection, id, values);
    setDb(
      (prev) =>
        ({
          ...prev,
          [collection]: (prev[collection] as { id: string }[]).map((row) => (row.id === id ? record : row)),
        }) as Database,
    );
    return record;
  }, []);

  const remove = useCallback(
    async (collection: CollectionName, id: string) => {
      await api.remove(collection, id);
      // Deletes cascade on the server (a pet takes its records with it), so pull
      // a fresh copy rather than trying to replay the cascade in the client.
      await reload();
    },
    [reload],
  );

  const value = useMemo<DataContextValue>(
    () => ({
      db,
      loading,
      error,
      reload,
      allPets,
      pets,
      pet,
      petId,
      selectPet,
      petById,
      contactById,
      forPet,
      create,
      save,
      remove,
    }),
    [db, loading, error, reload, allPets, pets, pet, petId, selectPet, petById, contactById, forPet, create, save, remove],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used inside <DataProvider>');
  return context;
}
