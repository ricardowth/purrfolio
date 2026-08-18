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
/** 'YYYY-MM', for things scheduled to a month rather than a day. */
const isoMonth = z.union([z.string().regex(/^\d{4}-\d{2}$/, 'validation.month'), z.literal('')]);
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
/** How a food is sold: a 1.5 kg bag, a 195 g tin, a box of 30 sachets. */
export const PACK_UNITS = ['kg', 'g', 'l', 'ml', 'unit'];
export const SUPPLY_CATEGORIES = ['skin', 'grooming', 'litter', 'accessory', 'other'];
export const CONTACT_ROLES = ['vet', 'clinic', 'sitter', 'groomer', 'emergency', 'other'];
export const CARE_TYPES = ['sitter', 'boarding', 'travel', 'other'];
export const JOURNAL_TAGS = ['behaviour', 'litter', 'grooming', 'mood', 'symptom', 'milestone', 'other'];

const enumOf = (values, fallback) => z.enum(values).default(fallback ?? values[0]);

/**
 * How something is sold: `packSize` is what one package holds — 1.5 (kg), 195
 * (g), 30 (unit). Paired with a price it reduces to the €/kg or €/item that
 * actually compares across brands. Null on records written before this existed:
 * they still show their price, just without a unit price under it.
 */
const packSizing = (defaultUnit) => ({
  packSize: z.number().positive().nullable().default(null),
  packUnit: enumOf(PACK_UNITS, defaultUnit),
});

/** Packaging plus one standing price, for things bought too rarely to track. */
const packaging = (defaultUnit) => ({
  ...packSizing(defaultUnit),
  cost: money,
});

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

/** One zone of the body, e.g. the left ear. */
const IssuePartSchema = z.object({
  bodyPart: z.string().min(1),
  side: enumOf(SIDES, 'none'),
});

export const IssueSchema = z.object({
  ...serverOwned,
  ...belongsToPet,
  title: z.string().min(1, 'validation.title'),
  /**
   * Every zone the problem touches — both ears at once, or an ear and an eye.
   * Never empty; records written when an issue had a single `bodyPart` are
   * lifted into a one-zone list as the file is read.
   */
  parts: z.array(IssuePartSchema).min(1, 'validation.bodyPart'),
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
  /** The appointment booked to cover `followUpDate`; empty means still to book. */
  followUpAppointmentId: text,
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

export const DewormingSchema = z.object({
  ...serverOwned,
  ...belongsToPet,
  product: z.string().min(1, 'validation.productName'),
  date: isoDate,
  /**
   * The month the next dose is due. A month, not a date: deworming runs on
   * "every three months", and inventing a day would be false precision.
   */
  nextMonth: isoMonth.default(''),
  target: text,
  cost: money,
  notes: text,
  attachments,
});

/**
 * One shop trip: how many packs came home that day, and what one pack cost
 * *then*. Shelf prices move constantly, so this is the only place a food's
 * price is written down: the newest trip is what it costs now, and the lines
 * above it are how it got there.
 */
export const PurchaseSchema = z.object({
  id: z.string(),
  date: isoDate,
  /** Packs bought: 2 bags, 12 tins, 1 box. */
  quantity: z.number().positive().default(1),
  /** Price of ONE pack on that day — not the till total for the whole trip. */
  cost: money,
  /** Where it was bought — the same bag is rarely the same price in two shops. */
  place: text,
  notes: text,
});
const purchases = z.array(PurchaseSchema).default([]);

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
  ...packSizing('kg'),
  purchases,
  rating: z.number().int().min(0).max(5).nullable().default(null),
  tolerance: text,
  notes: text,
  attachments,
});

/**
 * Everything else that gets bought for the cat and used up: sunscreen, shampoo,
 * litter, a brush. Not food, not medication — but priced the same way, and
 * often bought because of a specific problem, hence `issueIds`.
 */
export const SupplySchema = z.object({
  ...serverOwned,
  ...belongsToPet,
  brand: text,
  product: z.string().min(1, 'validation.productName'),
  category: enumOf(SUPPLY_CATEGORIES, 'other'),
  /** What it is for, in your own words: 'sunscreen for the ear tips'. */
  purpose: text,
  purchaseDate: optDate,
  current: z.boolean().default(true),
  ...packaging('unit'),
  issueIds: idList,
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
  dewormings: DewormingSchema,
  foods: FoodSchema,
  supplies: SupplySchema,
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
 * Record shapes that predate the current schema, lifted forward as the file is
 * read. They live here rather than inside the schemas because `crud.js` reads
 * `schema.shape`, which wrapping a schema in a zod transform would hide.
 */
const MIGRATIONS = {
  // Food used to carry one standing `cost`, which went stale the moment the shop
  // changed its price. The price now lives on each purchase, so a lone cost is
  // read as what was paid when the food was started — and dropped once there are
  // real purchases to read the price from.
  foods: (record) => {
    if (record.cost === null || record.cost === undefined) return record;
    const { cost, ...rest } = record;
    if (rest.purchases?.length) return rest;
    return {
      ...rest,
      purchases: [
        {
          id: `${record.id}-price`,
          date: record.startDate || (record.createdAt || '').slice(0, 10),
          quantity: 1,
          cost,
          place: '',
          notes: '',
        },
      ],
    };
  },

  // An issue used to sit on exactly one body part; now it names as many as it
  // touches. Anything without a part at all lands on the whole-body catch-all,
  // which is where the old form's default put it.
  issues: (record) =>
    Array.isArray(record.parts)
      ? record
      : { ...record, parts: [{ bodyPart: record.bodyPart || 'general', side: record.side || 'none' }] },
};

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
    const migrate = MIGRATIONS[name];
    db[name] = raw[name].map((record) => {
      if (!record || typeof record !== 'object') return record;
      const parsed = schema.safeParse(migrate ? migrate(record) : record);
      // Defaults come from the schema; identity and timestamps stay untouched.
      return parsed.success ? { ...parsed.data, id: record.id, createdAt: record.createdAt, updatedAt: record.updatedAt } : record;
    });
  }
  return db;
}
