import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { useData } from '@/store/DataContext';
import { describePart } from '@/anatomy/regions';
import { activeCareEvents, activeMedications, currentFoods, latestWeight, openIssues } from '@/lib/derive';
import { formatAge, formatDate, titleCase } from '@/lib/format';
import { fileUrl } from '@/lib/api';
import type { Contact } from '@shared/types';

function ContactBlock({ contact, role }: { contact: Contact; role: string }) {
  return (
    <div className="text-sm">
      <p className="font-medium text-stone-900 dark:text-stone-100">
        {contact.name} <span className="font-normal text-stone-500">· {role}</span>
      </p>
      {contact.organisation && <p className="text-stone-600 dark:text-stone-400">{contact.organisation}</p>}
      <p className="text-stone-600 dark:text-stone-400">
        {[contact.phone, contact.email].filter(Boolean).join(' · ') || 'No phone number recorded'}
      </p>
      {contact.address && <p className="text-stone-500">{contact.address}</p>}
      {contact.hours && <p className="text-stone-500">{contact.hours}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-4">
      <h2 className="mb-3 border-b border-stone-200 pb-2 text-sm font-bold tracking-wide text-stone-500 uppercase dark:border-stone-800">
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * A single page you can print and hand to whoever is looking after the cat.
 * Everything here is derived from records already in the app.
 */
export default function CareSheetPage() {
  const { pet, forPet, contactById, db } = useData();
  const events = forPet('careEvents');
  const upcoming = activeCareEvents(events, 365);
  const [eventId, setEventId] = useState<string>(upcoming[0]?.id ?? '');

  if (!pet) return null;

  const event = events.find((row) => row.id === eventId) ?? null;
  const foods = currentFoods(forPet('foods'));
  const medications = activeMedications(forPet('medications'));
  const issues = openIssues(forPet('issues'));
  const weight = latestWeight(forPet('weights'));

  const caregiver = contactById(event?.caregiverId);
  const emergency = contactById(event?.emergencyContactId);
  const vets = db.contacts.filter((contact) => ['vet', 'clinic', 'emergency'].includes(contact.role) && contact.id !== emergency?.id);

  return (
    <>
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link to="/care" className="btn-subtle -ml-2 px-2">
          <ArrowLeft className="size-4" />
          Care & sitters
        </Link>
        <div className="flex items-center gap-2">
          {events.length > 0 && (
            <select className="input w-auto" value={eventId} onChange={(e) => setEventId(e.target.value)}>
              <option value="">No specific care period</option>
              {events.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.title}
                </option>
              ))}
            </select>
          )}
          <button type="button" className="btn-primary" onClick={() => window.print()}>
            <Printer className="size-4" />
            Print
          </button>
        </div>
      </div>

      <div className="space-y-5">
        <header className="flex items-start gap-4">
          {pet.photo && <img src={fileUrl(pet.photo)} alt={pet.name} className="size-20 rounded-full object-cover" />}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-50">Care sheet — {pet.name}</h1>
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
              {[titleCase(pet.species), pet.breed, pet.colour].filter(Boolean).join(' · ')} · {formatAge(pet.birthDate)}
              {weight && ` · ${weight.kg} kg`}
            </p>
            {event && (
              <p className="mt-1 text-sm font-medium text-amber-700 dark:text-amber-500">
                {event.title} · {formatDate(event.startDate)}
                {event.endDate ? ` → ${formatDate(event.endDate)}` : ''}
              </p>
            )}
            {pet.microchip && <p className="mt-1 text-xs text-stone-500">Microchip {pet.microchip}</p>}
          </div>
        </header>

        {pet.allergies.length > 0 && (
          <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 dark:border-red-900 dark:bg-red-950/40">
            <p className="text-sm font-bold text-red-800 dark:text-red-300">Allergies — do not give</p>
            <p className="text-sm text-red-700 dark:text-red-300">{pet.allergies.join(', ')}</p>
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          <Section title="Feeding">
            {foods.length === 0 ? (
              <p className="text-sm text-stone-500">No current food recorded.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {foods.map((food) => (
                  <li key={food.id}>
                    <p className="font-medium text-stone-900 dark:text-stone-100">
                      {[food.brand, food.product].filter(Boolean).join(' ')}{' '}
                      <span className="font-normal text-stone-500">({food.type})</span>
                    </p>
                    <p className="text-stone-600 dark:text-stone-400">
                      {food.amountPerDay || 'Amount not recorded'}
                      {food.timesPerDay ? ` · ${food.timesPerDay} meal${food.timesPerDay === 1 ? '' : 's'} a day` : ''}
                    </p>
                    {food.notes && <p className="text-stone-500">{food.notes}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Medication">
            {medications.length === 0 ? (
              <p className="text-sm text-stone-500">No medication at the moment.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {medications.map((medication) => (
                  <li key={medication.id}>
                    <p className="font-medium text-stone-900 dark:text-stone-100">{medication.name}</p>
                    <p className="text-stone-600 dark:text-stone-400">
                      {[medication.dose, medication.frequency, titleCase(medication.route)].filter(Boolean).join(' · ')}
                    </p>
                    {medication.reason && <p className="text-stone-500">For: {medication.reason}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        {(pet.quirks || event?.instructions) && (
          <Section title="Handling & instructions">
            {pet.quirks && <p className="mb-3 text-sm whitespace-pre-wrap text-stone-700 dark:text-stone-300">{pet.quirks}</p>}
            {event?.instructions && <p className="text-sm whitespace-pre-wrap text-stone-700 dark:text-stone-300">{event.instructions}</p>}
          </Section>
        )}

        {issues.length > 0 && (
          <Section title="Ongoing health issues to watch">
            <ul className="space-y-2 text-sm">
              {issues.map((issue) => (
                <li key={issue.id}>
                  <p className="font-medium text-stone-900 dark:text-stone-100">
                    {issue.title} <span className="font-normal text-stone-500">· {describePart(issue.bodyPart, issue.side)}</span>
                  </p>
                  {issue.description && <p className="text-stone-600 dark:text-stone-400">{issue.description}</p>}
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section title="Who to call">
          <div className="grid gap-4 sm:grid-cols-2">
            {caregiver && <ContactBlock contact={caregiver} role="Caregiver" />}
            {emergency && <ContactBlock contact={emergency} role="Emergency / vet on call" />}
            {vets.map((contact) => (
              <ContactBlock key={contact.id} contact={contact} role={titleCase(contact.role)} />
            ))}
            {!caregiver && !emergency && vets.length === 0 && (
              <p className="text-sm text-stone-500">
                No contacts saved yet — add your vet under{' '}
                <Link to="/contacts" className="link">
                  Contacts
                </Link>
                .
              </p>
            )}
          </div>
        </Section>

        <p className="text-xs text-stone-400">Generated from Purrfolio on {formatDate(new Date().toISOString().slice(0, 10))}.</p>
      </div>
    </>
  );
}
