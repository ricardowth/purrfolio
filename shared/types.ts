import type { z } from 'zod';
import type {
  AppointmentSchema,
  AttachmentSchema,
  CareEventSchema,
  ContactSchema,
  DocumentSchema,
  FoodSchema,
  IssueSchema,
  JournalSchema,
  MedicationSchema,
  PetSchema,
  VaccinationSchema,
  WeightSchema,
} from './schema.js';

/** Fields the server assigns on write — always present on a stored record. */
type Stored = { id: string; createdAt: string; updatedAt: string };

/** The shape a record has once it has been read back from disk. */
type Record_<S extends z.ZodTypeAny> = Omit<z.infer<S>, keyof Stored> & Stored;

export type Attachment = z.infer<typeof AttachmentSchema>;

export type Pet = Record_<typeof PetSchema>;
export type Issue = Record_<typeof IssueSchema>;
export type Appointment = Record_<typeof AppointmentSchema>;
export type Vaccination = Record_<typeof VaccinationSchema>;
export type Medication = Record_<typeof MedicationSchema>;
export type Food = Record_<typeof FoodSchema>;
export type Weight = Record_<typeof WeightSchema>;
export type CareEvent = Record_<typeof CareEventSchema>;
export type Contact = Record_<typeof ContactSchema>;
export type JournalEntry = Record_<typeof JournalSchema>;
export type PetDocument = Record_<typeof DocumentSchema>;

export type IssueUpdate = Issue['updates'][number];
export type DoseLogEntry = Medication['doseLog'][number];

export type Severity = Issue['severity'];
export type IssueStatus = Issue['status'];
export type Side = Issue['side'];

export interface Database {
  version: number;
  pets: Pet[];
  issues: Issue[];
  appointments: Appointment[];
  vaccinations: Vaccination[];
  medications: Medication[];
  foods: Food[];
  weights: Weight[];
  careEvents: CareEvent[];
  contacts: Contact[];
  journal: JournalEntry[];
  documents: PetDocument[];
}

/** Names of the collections that hold pet-scoped records. */
export type CollectionName = keyof Omit<Database, 'version'>;
