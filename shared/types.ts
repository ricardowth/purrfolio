import type { z } from 'zod';
import type {
  AppointmentSchema,
  AttachmentSchema,
  CareEventSchema,
  ContactSchema,
  DewormingSchema,
  DocumentSchema,
  FoodSchema,
  IssueSchema,
  JournalSchema,
  MedicationSchema,
  PetSchema,
  SupplySchema,
  VaccinationSchema,
  WeightSchema,
} from './schema.js';

/** Fields the server assigns on write — always present on a stored record. */
type Stored = { id: string; createdAt: string; updatedAt: string };

/** The shape a record has once it has been read back from disk. */
type Record_<S extends z.ZodTypeAny> = Omit<z.infer<S>, keyof Stored> & Stored;

export type Attachment = z.infer<typeof AttachmentSchema>;

/**
 * Which side of the cat a zone is on. Written out here because the schema is
 * plain JS: `z.enum(SIDES)` cannot see the literals through a `string[]`, so
 * inference alone would leave every side an `any` — and an optional one.
 */
export type Side = 'left' | 'right' | 'none';

/** One zone an issue sits on, e.g. the left ear. */
export interface IssuePart {
  bodyPart: string;
  side: Side;
}

/** What a package is measured in. Pinned here for the same reason as `Side`. */
export type PackUnit = 'kg' | 'g' | 'l' | 'ml' | 'unit';

type WithPack<T> = Omit<T, 'packUnit'> & { packUnit: PackUnit };

export type Pet = Record_<typeof PetSchema>;
export type Issue = Omit<Record_<typeof IssueSchema>, 'parts'> & { parts: IssuePart[] };
export type Appointment = Record_<typeof AppointmentSchema>;
export type Vaccination = Record_<typeof VaccinationSchema>;
export type Medication = Record_<typeof MedicationSchema>;
export type Deworming = Record_<typeof DewormingSchema>;
export type Food = WithPack<Record_<typeof FoodSchema>>;
export type Supply = WithPack<Record_<typeof SupplySchema>>;
export type Weight = Record_<typeof WeightSchema>;
export type CareEvent = Record_<typeof CareEventSchema>;
export type Contact = Record_<typeof ContactSchema>;
export type JournalEntry = Record_<typeof JournalSchema>;
export type PetDocument = Record_<typeof DocumentSchema>;

export type IssueUpdate = Issue['updates'][number];
/** One shop trip for a food: n packs at what a pack cost that day. */
export type FoodPurchase = Food['purchases'][number];
export type DoseLogEntry = Medication['doseLog'][number];

export type Severity = Issue['severity'];
export type IssueStatus = Issue['status'];

export interface Database {
  version: number;
  pets: Pet[];
  issues: Issue[];
  appointments: Appointment[];
  vaccinations: Vaccination[];
  medications: Medication[];
  dewormings: Deworming[];
  foods: Food[];
  supplies: Supply[];
  weights: Weight[];
  careEvents: CareEvent[];
  contacts: Contact[];
  journal: JournalEntry[];
  documents: PetDocument[];
}

/** Names of the collections that hold pet-scoped records. */
export type CollectionName = keyof Omit<Database, 'version'>;
