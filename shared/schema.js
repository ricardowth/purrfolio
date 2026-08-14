import { z } from 'zod';

/**
 * Single source of truth for the shape of everything stored in data/data.json.
 *
 * This file is plain JavaScript on purpose: the Express server imports it directly
 * at runtime, and the React app imports it too. TypeScript types are inferred from
 * these schemas in ./types.ts, so the types can never drift from the validation.
 *
 * Validation messages are `validation.*` codes rather than prose: the server has
 * no idea which language the browser is showing, so the client translates them
 * on arrival (see `translateFieldErrors` in src/lib/api.ts).
 */

// --- small reusable pieces -------------------------------------------------

/** 'YYYY-MM-DD', or '' when the field is left blank. */
const isoDate = z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'validation.date'), z.literal('')]);
/** Full ISO timestamp, or '' when left blank. */
const isoDateTime = z.union([z.string().datetime({ offset: true }), z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/), z.literal('')]);

const text = z.string().default('');
const optDate = isoDate.default('');
const optDateTime = isoDateTime.default('');
const money = z.number().nonnegative().nullable().default(null);
const idList = z.array(z.string()).default([]);

export const AttachmentSchema = z.object({
  id: z.string(),
  filename: z.string(),
  originalName: z.string().default(''),
  mime: z.string().default(''),
  size: z.number().nonnegative().default(0),
  caption: text,
  uploadedAt: z.string(),
});
const attachments = z.array(AttachmentSchema).default([]);

/** Fields the server owns. Accepted on input but always overwritten on write. */
const serverOwned = {
  id: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
};
const belongsToPet = { petId: z.string().min(1, 'validation.pet') };

// --- enums -----------------------------------------------------------------

export const SEXES = ['male', 'female', 'unknown'];
export const SEVERITIES = ['low', 'medium', 'high'];
export const ISSUE_STATUSES = ['active', 'monitoring', 'resolved'];
export const SIDES = ['left', 'right', 'none'];
export const APPOINTMENT_TYPES = ['checkup', 'vaccination', 'surgery', 'dental', 'emergency', 'grooming', 'other'];
export const APPOINTMENT_STATUSES = ['scheduled', 'completed', 'cancelled'];
export const MED_ROUTES = ['oral', 'topical', 'injection', 'ocular', 'aural', 'inhaled', 'other'];
export const FOOD_TYPES = ['dry', 'wet', 'treat', 'prescription', 'supplement'];
export const CONTACT_ROLES = ['vet', 'clinic', 'sitter', 'groomer', 'emergency', 'other'];
export const CARE_TYPES = ['sitter', 'boarding', 'travel', 'other'];
export const JOURNAL_TAGS = ['behaviour', 'litter', 'grooming', 'mood', 'symptom', 'milestone', 'other'];

const enumOf = (values, fallback) => z.enum(values).default(fallback ?? values[0]);

// --- collections -----------------------------------------------------------

export const PetSchema = z.object({
  ...serverOwned,
  name: z.string().min(1, 'validation.name'),
  species: text.default('cat'),
  breed: text,
  colour: text,
  sex: enumOf(SEXES, 'unknown'),
  neutered: z.boolean().default(false),
  birthDate: optDate,
  adoptionDate: optDate,
  microchip: text,
  insurer: text,
  policyNumber: text,
  allergies: z.array(z.string()).default([]),
  quirks: text,
  photo: text,
  notes: text,
  archived: z.boolean().default(false),
});

export const IssueSchema = z.object({
  ...serverOwned,
  ...belongsToPet,
  title: z.string().min(1, 'validation.title'),
  bodyPart: z.string().min(1, 'validation.bodyPart'),
  side: enumOf(SIDES, 'none'),
  severity: enumOf(SEVERITIES, 'low'),
  status: enumOf(ISSUE_STATUSES, 'active'),
  onsetDate: optDate,
  resolvedDate: optDate,
  description: text,
  diagnosis: text,
  updates: z
    .array(
      z.object({
        id: z.string(),
        date: isoDate,
        note: text,
        attachments,
      }),
    )
    .default([]),
  appointmentIds: idList,
  medicationIds: idList,
  attachments,
});

export const AppointmentSchema = z.object({
  ...serverOwned,
  ...belongsToPet,
  dateTime: isoDateTime,
  type: enumOf(APPOINTMENT_TYPES, 'checkup'),
  status: enumOf(APPOINTMENT_STATUSES, 'scheduled'),
  contactId: text,
  /** Contact with the 'clinic' role. `clinic` below is free text kept from older records. */
  clinicId: text,
  clinic: text,
  /** Superseded by `issueIds`: the reason for a visit is the issues it is about. */
  reason: text,
  outcome: text,
  cost: money,
  weightKg: z.number().positive().nullable().default(null),
  /** Weigh-in generated from `weightKg`, so editing the appointment updates it. */
  weightId: text,
  followUpDate: optDate,
  issueIds: idList,
  /** Prescribed at, or changed by, this visit. */
  medicationIds: idList,
  foodIds: idList,
  notes: text,
  attachments,
});

export const VaccinationSchema = z.object({
  ...serverOwned,
  ...belongsToPet,
  name: z.string().min(1, 'validation.vaccineName'),
  date: isoDate,
  nextDueDate: optDate,
  batchNumber: text,
  contactId: text,
  /** Contact with the 'clinic' role. `clinic` below is free text kept from older records. */
  clinicId: text,
  clinic: text,
  cost: money,
  notes: text,
  attachments,
});

export const MedicationSchema = z.object({
  ...serverOwned,
  ...belongsToPet,
  name: z.string().min(1, 'validation.medicationName'),
  dose: text,
  route: enumOf(MED_ROUTES, 'oral'),
  frequency: text,
  timesPerDay: z.number().int().positive().nullable().default(null),
  startDate: optDate,
  endDate: optDate,
  ongoing: z.boolean().default(false),
  reason: text,
  prescribedBy: text,
  cost: money,
  issueIds: idList,
  doseLog: z.array(z.object({ id: z.string(), at: z.string(), note: text })).default([]),
  notes: text,
  attachments,
});

export const FoodSchema = z.object({
  ...serverOwned,
  ...belongsToPet,
  brand: text,
  product: z.string().min(1, 'validation.productName'),
  type: enumOf(FOOD_TYPES, 'dry'),
  amountPerDay: text,
  timesPerDay: z.number().int().positive().nullable().default(null),
  startDate: optDate,
  endDate: optDate,
  current: z.boolean().default(true),
  cost: money,
  rating: z.number().int().min(0).max(5).nullable().default(null),
  tolerance: text,
  notes: text,
  attachments,
});

export const WeightSchema = z.object({
  ...serverOwned,
  ...belongsToPet,
  date: isoDate,
  kg: z.number().positive('validation.weightPositive'),
  notes: text,
});

export const CareEventSchema = z.object({
  ...serverOwned,
  ...belongsToPet,
  title: z.string().min(1, 'validation.title'),
  type: enumOf(CARE_TYPES, 'sitter'),
  startDate: isoDate,
  endDate: optDate,
  caregiverId: text,
  emergencyContactId: text,
  instructions: text,
  cost: money,
  notes: text,
  attachments,
});

export const ContactSchema = z.object({
  ...serverOwned,
  name: z.string().min(1, 'validation.name'),
  role: enumOf(CONTACT_ROLES, 'vet'),
  organisation: text,
  phone: text,
  email: text,
  address: text,
  hours: text,
  notes: text,
});

export const JournalSchema = z.object({
  ...serverOwned,
  ...belongsToPet,
  date: isoDate,
  title: text,
  text,
  tags: z.array(z.string()).default([]),
  attachments,
});

export const DocumentSchema = z.object({
  ...serverOwned,
  ...belongsToPet,
  title: z.string().min(1, 'validation.title'),
  category: text,
  date: optDate,
  notes: text,
  attachments,
});

/** collection name -> schema. Drives the generic CRUD router and the client. */
export const COLLECTIONS = {
  pets: PetSchema,
  issues: IssueSchema,
  appointments: AppointmentSchema,
  vaccinations: VaccinationSchema,
  medications: MedicationSchema,
  foods: FoodSchema,
  weights: WeightSchema,
  careEvents: CareEventSchema,
  contacts: ContactSchema,
  journal: JournalSchema,
  documents: DocumentSchema,
};

export const COLLECTION_NAMES = Object.keys(COLLECTIONS);

export const DATA_VERSION = 1;

/** An empty database — used to bootstrap data/data.json on first run. */
export function emptyDatabase() {
  const db = { version: DATA_VERSION };
  for (const name of COLLECTION_NAMES) db[name] = [];
  return db;
}

/**
 * Coerce whatever is on disk into a valid database: guarantees every collection
 * exists as an array, and fills in schema defaults on every record, so a
 * hand-edited or partial file can't crash the server — and so records written
 * before a field existed gain it on load rather than reaching the UI as
 * `undefined`.
 *
 * A record the schema rejects outright is kept exactly as it was: refusing to
 * parse it is never a reason to throw the user's data away.
 */
export function normaliseDatabase(raw) {
  const db = emptyDatabase();
  if (!raw || typeof raw !== 'object') return db;
  db.version = typeof raw.version === 'number' ? raw.version : DATA_VERSION;

  for (const name of COLLECTION_NAMES) {
    if (!Array.isArray(raw[name])) continue;
    const schema = COLLECTIONS[name];
    db[name] = raw[name].map((record) => {
      if (!record || typeof record !== 'object') return record;
      const parsed = schema.safeParse(record);
      // Defaults come from the schema; identity and timestamps stay untouched.
      return parsed.success ? { ...parsed.data, id: record.id, createdAt: record.createdAt, updatedAt: record.updatedAt } : record;
    });
  }
  return db;
}
