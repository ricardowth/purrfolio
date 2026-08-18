import { byDateDesc, daysFromToday, today } from '@/lib/format';
import type { I18n } from '@/lib/i18n';
import type {
  Appointment,
  CareEvent,
  Deworming,
  Food,
  FoodPurchase,
  Issue,
  Medication,
  PackUnit,
  Supply,
  Vaccination,
  Weight,
} from '@shared/types';

/** Categories money can fall into, in the fixed order the chart paints them. */
export const COST_CATEGORIES = [
  'appointments',
  'vaccinations',
  'medications',
  'dewormings',
  'foods',
  'supplies',
  'careEvents',
] as const;
export type CostCategory = (typeof COST_CATEGORIES)[number];

export interface CostEntry {
  /** 'YYYY-MM-DD' — when the money was spent. */
  date: string;
  amount: number;
  category: CostCategory;
  label: string;
}

interface CostSources {
  appointments: Appointment[];
  vaccinations: Vaccination[];
  medications: Medication[];
  dewormings: Deworming[];
  foods: Food[];
  supplies: Supply[];
  careEvents: CareEvent[];
}

/**
 * Every recorded cost as one flat, dated list. Records without a cost or
 * without a date are skipped rather than counted as zero on an unknown day.
 */
export function costEntries(sources: CostSources): CostEntry[] {
  const entries: CostEntry[] = [];

  const add = (category: CostCategory, date: string | undefined, amount: number | null | undefined, label: string) => {
    if (!date || amount === null || amount === undefined || amount <= 0) return;
    entries.push({ date: date.slice(0, 10), amount, category, label });
  };

  for (const row of sources.appointments) add('appointments', row.dateTime, row.cost, row.reason || row.type);
  for (const row of sources.vaccinations) add('vaccinations', row.date, row.cost, row.name);
  for (const row of sources.medications) add('medications', row.startDate, row.cost, row.name);
  for (const row of sources.dewormings) add('dewormings', row.date, row.cost, row.product);
  // Each shop trip is its own expense, on the day it happened.
  for (const row of sources.foods) {
    const label = [row.brand, row.product].filter(Boolean).join(' ');
    for (const purchase of row.purchases) add('foods', purchase.date, purchaseTotal(purchase), label);
  }
  for (const row of sources.supplies) add('supplies', row.purchaseDate, row.cost, [row.brand, row.product].filter(Boolean).join(' '));
  for (const row of sources.careEvents) add('careEvents', row.startDate, row.cost, row.title);

  return entries.sort((a, b) => a.date.localeCompare(b.date));
}

/** Years that actually have spending, newest first. */
export const costYears = (entries: CostEntry[]) => [...new Set(entries.map((e) => e.date.slice(0, 4)))].sort().reverse();

/** One row per month of the given year, with a column per category. */
export function monthlyCosts(entries: CostEntry[], year: string) {
  const months = Array.from({ length: 12 }, (_, index) => {
    const row: { month: number; total: number } & Record<CostCategory, number> = {
      month: index + 1,
      total: 0,
      appointments: 0,
      vaccinations: 0,
      medications: 0,
      dewormings: 0,
      foods: 0,
      supplies: 0,
      careEvents: 0,
    };
    return row;
  });

  for (const entry of entries) {
    if (entry.date.slice(0, 4) !== year) continue;
    const index = Number(entry.date.slice(5, 7)) - 1;
    if (index < 0 || index > 11) continue;
    months[index][entry.category] += entry.amount;
    months[index].total += entry.amount;
  }
  return months;
}

/** Totals per category for a year, biggest first. */
export function costsByCategory(entries: CostEntry[], year: string) {
  const totals = new Map<CostCategory, { total: number; count: number }>();
  for (const entry of entries) {
    if (entry.date.slice(0, 4) !== year) continue;
    const current = totals.get(entry.category) ?? { total: 0, count: 0 };
    current.total += entry.amount;
    current.count += 1;
    totals.set(entry.category, current);
  }
  return COST_CATEGORIES.filter((c) => totals.has(c))
    .map((category) => ({ category, ...totals.get(category)! }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Derived views over the raw records. The dashboard, the health map and the care
 * sheet all ask the same questions, so they ask them here.
 */

/** A medication is current if it has started and hasn't finished. */
export function isMedicationActive(medication: Medication, on = today()): boolean {
  if (medication.startDate && medication.startDate > on) return false;
  if (medication.ongoing) return true;
  if (!medication.endDate) return Boolean(medication.startDate);
  return medication.endDate >= on;
}

export const activeMedications = (medications: Medication[]) => medications.filter((m) => isMedicationActive(m));

/**
 * How often to give it, as one line: the structured count first, then whatever
 * qualifier didn't fit a number ('com comida', '11h e 21h', 'em dias alternados').
 * The medications table, the care sheet and the issue page all show this, so
 * they all build it the same way.
 */
export function describeSchedule({ t }: I18n, medication: Medication): string {
  return [medication.timesPerDay ? t('dash.perDay', { n: medication.timesPerDay }) : '', medication.frequency]
    .filter(Boolean)
    .join(' · ');
}

export type MedicationStatus = 'upcoming' | 'active' | 'finished';

/**
 * Where a course sits relative to today. `isMedicationActive` answers only
 * "is it current?", which lumps a course that starts next week in with one that
 * ended last month — true in both cases, but they mean opposite things to
 * whoever has to give the dose.
 */
export function medicationStatus(medication: Medication, on = today()): MedicationStatus {
  if (medication.startDate && medication.startDate > on) return 'upcoming';
  return isMedicationActive(medication, on) ? 'active' : 'finished';
}

export const openIssues = (issues: Issue[]) => issues.filter((issue) => issue.status !== 'resolved');

// --- food ------------------------------------------------------------------

export const currentFoods = (foods: Food[]) => foods.filter((food) => food.current);

/**
 * The two shelves food is kept on. Treats are bought and compared by the item,
 * everything else by weight, so they can't share a price column — or a table.
 */
export type FoodGroup = 'regular' | 'snack';
export const foodGroup = (food: Food): FoodGroup => (food.type === 'treat' ? 'snack' : 'regular');

/**
 * Buying history. Prices move — a bag is 20,50 € one month and 23,99 € the
 * next — so what was paid belongs to the shop trip, not to the food itself.
 * Every price on this page comes from here.
 */

/** Newest trip first: the last one is the price that still stands. */
export const sortedPurchases = (purchases: FoodPurchase[]) => [...purchases].sort(byDateDesc((row) => row.date));

/** What one trip cost in total: n packs at that day's price. */
export const purchaseTotal = (purchase: FoodPurchase) => (purchase.cost === null ? null : purchase.cost * purchase.quantity);

/** The most recent trip that names a price, i.e. what the pack costs today. */
export function latestPurchase(purchases: FoodPurchase[]): FoodPurchase | null {
  return sortedPurchases(purchases).find((row) => row.cost !== null) ?? null;
}

/**
 * The pack priced at what was last actually paid for it. A food carries no
 * price of its own: shelf prices move, so the only honest answer to "what does
 * this cost?" is what the last bag cost — and unpriced until one is recorded.
 */
export function pricedPack(food: Food): Packaged {
  return { packSize: food.packSize, packUnit: food.packUnit, cost: latestPurchase(food.purchases)?.cost ?? null };
}

/** Packs brought home and money spent, across every recorded trip. */
export function purchaseTotals(purchases: FoodPurchase[]) {
  let packs = 0;
  let spent = 0;
  for (const purchase of purchases) {
    packs += purchase.quantity;
    spent += purchaseTotal(purchase) ?? 0;
  }
  return { packs, spent };
}

/** What a pack cost the time before last — for showing which way prices moved. */
export function priceChange(purchases: FoodPurchase[]): { from: number; to: number } | null {
  const priced = sortedPurchases(purchases).filter((row) => row.cost !== null);
  if (priced.length < 2 || priced[0].cost === priced[1].cost) return null;
  return { from: priced[1].cost!, to: priced[0].cost! };
}

/** What a price ends up being quoted in. */
export type PriceBasis = 'kg' | 'l' | 'item';

/** Anything sold in a package: a 1.5 kg bag, a 195 g tin, a box of 30 sachets. */
export interface Pack {
  packSize: number | null;
  packUnit: PackUnit;
}

/** A pack with a price against it — the pair that reduces to a unit price. */
export interface Packaged extends Pack {
  cost: number | null;
}

/** Each pack unit as its base unit, and how much of it one unit is worth. */
const PACK_BASE: Record<string, { basis: PriceBasis; factor: number }> = {
  kg: { basis: 'kg', factor: 1 },
  g: { basis: 'kg', factor: 0.001 },
  l: { basis: 'l', factor: 1 },
  ml: { basis: 'l', factor: 0.001 },
  unit: { basis: 'item', factor: 1 },
};

/**
 * Price of one kilo, litre or item, worked out from the pack the food is sold
 * in. This is the only number that compares across brands: 20,50 € means
 * nothing until you know it bought 1,5 kg. Null unless both halves are known.
 */
export function unitPrice(item: Packaged): { basis: PriceBasis; amount: number } | null {
  const base = PACK_BASE[item.packUnit];
  if (!base || !item.packSize || !item.cost) return null;
  const size = item.packSize * base.factor;
  return size > 0 ? { basis: base.basis, amount: item.cost / size } : null;
}

const vaccineKey = (name: string) => name.trim().toLowerCase();

/**
 * Whether a later dose of the same vaccine has already been given.
 *
 * The booster date on an older dose is history — the newest dose is the one
 * carrying the live due date. Without this every shot of a kitten's primary
 * course stays flagged overdue for the rest of the cat's life, even though the
 * annual booster sitting right above it was given on time.
 */
export function isBoosterSuperseded(vaccination: Vaccination, all: Vaccination[]): boolean {
  const key = vaccineKey(vaccination.name);
  return all.some((other) => other.id !== vaccination.id && vaccineKey(other.name) === key && other.date > vaccination.date);
}

/** Vaccinations whose booster is due within `withinDays` (or already overdue). */
export function dueVaccinations(vaccinations: Vaccination[], withinDays = 30) {
  return vaccinations
    .filter((vaccination) => {
      if (isBoosterSuperseded(vaccination, vaccinations)) return false;
      const days = daysFromToday(vaccination.nextDueDate);
      return days !== null && days <= withinDays;
    })
    .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));
}

// --- deworming -------------------------------------------------------------

/** 'YYYY-MM' for today, to compare against a deworming's `nextMonth`. */
export const currentMonth = (on = today()) => on.slice(0, 7);

/**
 * A newer dose retires the older one's plan. Unlike vaccines, the product is
 * not part of the comparison: deworming is a rolling treatment and the brand
 * rotates with what the clinic has, so any later dose answers the earlier plan.
 */
export function isDewormingSuperseded(deworming: Deworming, all: Deworming[]): boolean {
  return all.some((other) => other.id !== deworming.id && other.date > deworming.date);
}

export type DewormingDue = 'none' | 'superseded' | 'upcoming' | 'due' | 'overdue';

/** Where a deworming's next dose stands, at month resolution. */
export function dewormingDue(deworming: Deworming, all: Deworming[], on = today()): DewormingDue {
  if (isDewormingSuperseded(deworming, all)) return 'superseded';
  if (!deworming.nextMonth) return 'none';
  const month = currentMonth(on);
  if (deworming.nextMonth < month) return 'overdue';
  if (deworming.nextMonth === month) return 'due';
  return 'upcoming';
}

/** Doses due this month or already late, newest plan first. */
export function dueDewormings(dewormings: Deworming[], on = today()) {
  return dewormings
    .filter((row) => ['due', 'overdue'].includes(dewormingDue(row, dewormings, on)))
    .sort((a, b) => a.nextMonth.localeCompare(b.nextMonth));
}

// --- appointments ----------------------------------------------------------

/**
 * Appointments that asked for a re-check but have no appointment booked to
 * cover it. Cancelled visits are dropped: their follow-up went with them.
 */
export function pendingFollowUps(appointments: Appointment[]) {
  return appointments
    .filter((row) => row.followUpDate && !row.followUpAppointmentId && row.status !== 'cancelled')
    .sort((a, b) => a.followUpDate.localeCompare(b.followUpDate));
}

export function upcomingAppointments(appointments: Appointment[]) {
  const now = new Date().toISOString();
  return appointments
    .filter((appointment) => appointment.status === 'scheduled' && appointment.dateTime >= now.slice(0, 16))
    .sort((a, b) => a.dateTime.localeCompare(b.dateTime));
}

export function pastAppointments(appointments: Appointment[]) {
  const now = new Date().toISOString();
  return appointments.filter((appointment) => appointment.dateTime < now.slice(0, 16)).sort((a, b) => b.dateTime.localeCompare(a.dateTime));
}

/** Care events that are running now or start soon. */
export function activeCareEvents(events: CareEvent[], withinDays = 30) {
  const now = today();
  return events
    .filter((event) => {
      const end = event.endDate || event.startDate;
      if (end < now) return false;
      const days = daysFromToday(event.startDate);
      return days === null || days <= withinDays;
    })
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export const sortedWeights = (weights: Weight[]) => [...weights].sort((a, b) => a.date.localeCompare(b.date));

export function latestWeight(weights: Weight[]): Weight | null {
  const sorted = sortedWeights(weights);
  return sorted.length ? sorted[sorted.length - 1] : null;
}

/** Change against the previous reading, for the dashboard trend. */
export function weightTrend(weights: Weight[]): { latest: Weight; deltaKg: number | null } | null {
  const sorted = sortedWeights(weights);
  if (sorted.length === 0) return null;
  const latest = sorted[sorted.length - 1];
  const previous = sorted[sorted.length - 2];
  return { latest, deltaKg: previous ? Number((latest.kg - previous.kg).toFixed(2)) : null };
}
