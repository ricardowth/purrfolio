import { daysFromToday, today } from '@/lib/format';
import type { Appointment, CareEvent, Food, Issue, Medication, Vaccination, Weight } from '@shared/types';

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

export const openIssues = (issues: Issue[]) => issues.filter((issue) => issue.status !== 'resolved');

export const currentFoods = (foods: Food[]) => foods.filter((food) => food.current);

/** Vaccinations whose booster is due within `withinDays` (or already overdue). */
export function dueVaccinations(vaccinations: Vaccination[], withinDays = 60) {
  return vaccinations
    .filter((vaccination) => {
      const days = daysFromToday(vaccination.nextDueDate);
      return days !== null && days <= withinDays;
    })
    .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));
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
