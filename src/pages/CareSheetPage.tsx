import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { useData } from '@/store/DataContext';
import { describeParts } from '@/anatomy/regions';
import { activeCareEvents, activeMedications, currentFoods, describeSchedule, latestWeight, openIssues } from '@/lib/derive';
import { useI18n } from '@/lib/i18n';
import { titleCase, useFormat } from '@/lib/format';
import { fileUrl } from '@/lib/api';
import type { Contact } from '@shared/types';

function ContactBlock({ contact, role }: { contact: Contact; role: string }) {
  const { t } = useI18n();
  return (
    <div className="text-sm">
      <p className="font-medium text-stone-900 dark:text-stone-100">
        {contact.name} <span className="font-normal text-stone-500">· {role}</span>
      </p>
      {contact.organisation && <p className="text-stone-600 dark:text-stone-400">{contact.organisation}</p>}
      <p className="text-stone-600 dark:text-stone-400">
        {[contact.phone, contact.email].filter(Boolean).join(' · ') || t('sheet.noPhone')}
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
  const i18n = useI18n();
  const { t, tn, tEnum } = i18n;
  const { formatAge, formatDate } = useFormat();
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

  const [beforeLink, afterLink] = t('sheet.noContacts').split('{link}');

  return (
    <>
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link to="/care" className="btn-subtle -ml-2 px-2">
          <ArrowLeft className="size-4" />
          {t('sheet.back')}
        </Link>
        <div className="flex items-center gap-2">
          {events.length > 0 && (
            <select className="input w-auto" value={eventId} onChange={(e) => setEventId(e.target.value)}>
              <option value="">{t('sheet.noPeriod')}</option>
              {events.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.title}
                </option>
              ))}
            </select>
          )}
          <button type="button" className="btn-primary" onClick={() => window.print()}>
            <Printer className="size-4" />
            {t('common.print')}
          </button>
        </div>
      </div>

      <div className="space-y-5">
        <header className="flex items-start gap-4">
          {pet.photo && <img src={fileUrl(pet.photo)} alt={pet.name} className="size-20 rounded-full object-cover" />}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-50">
              {t('sheet.heading', { name: pet.name })}
            </h1>
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
            {pet.microchip && <p className="mt-1 text-xs text-stone-500">{t('sheet.microchip', { number: pet.microchip })}</p>}
          </div>
        </header>

        {pet.allergies.length > 0 && (
          <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 dark:border-red-900 dark:bg-red-950/40">
            <p className="text-sm font-bold text-red-800 dark:text-red-300">{t('sheet.allergiesTitle')}</p>
            <p className="text-sm text-red-700 dark:text-red-300">{pet.allergies.join(', ')}</p>
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          <Section title={t('sheet.feeding')}>
            {foods.length === 0 ? (
              <p className="text-sm text-stone-500">{t('sheet.noFood')}</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {foods.map((food) => (
                  <li key={food.id}>
                    <p className="font-medium text-stone-900 dark:text-stone-100">
                      {[food.brand, food.product].filter(Boolean).join(' ')}{' '}
                      <span className="font-normal text-stone-500">({tEnum('foodType', food.type)})</span>
                    </p>
                    <p className="text-stone-600 dark:text-stone-400">
                      {food.amountPerDay || t('sheet.amountNotRecorded')}
                      {food.timesPerDay ? ` · ${tn('sheet.mealsADay', food.timesPerDay)}` : ''}
                    </p>
                    {food.notes && <p className="text-stone-500">{food.notes}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title={t('sheet.medication')}>
            {medications.length === 0 ? (
              <p className="text-sm text-stone-500">{t('sheet.noMedication')}</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {medications.map((medication) => (
                  <li key={medication.id}>
                    <p className="font-medium text-stone-900 dark:text-stone-100">{medication.name}</p>
                    <p className="text-stone-600 dark:text-stone-400">
                      {[medication.dose, describeSchedule(i18n, medication), tEnum('medRoute', medication.route)].filter(Boolean).join(' · ')}
                    </p>
                    {medication.reason && <p className="text-stone-500">{t('sheet.medicationFor', { reason: medication.reason })}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        {(pet.quirks || event?.instructions) && (
          <Section title={t('sheet.handling')}>
            {pet.quirks && <p className="mb-3 text-sm whitespace-pre-wrap text-stone-700 dark:text-stone-300">{pet.quirks}</p>}
            {event?.instructions && <p className="text-sm whitespace-pre-wrap text-stone-700 dark:text-stone-300">{event.instructions}</p>}
          </Section>
        )}

        {issues.length > 0 && (
          <Section title={t('sheet.ongoingIssues')}>
            <ul className="space-y-2 text-sm">
              {issues.map((issue) => (
                <li key={issue.id}>
                  <p className="font-medium text-stone-900 dark:text-stone-100">
                    {issue.title} <span className="font-normal text-stone-500">· {describeParts(i18n, issue.parts)}</span>
                  </p>
                  {issue.description && <p className="text-stone-600 dark:text-stone-400">{issue.description}</p>}
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section title={t('sheet.whoToCall')}>
          <div className="grid gap-4 sm:grid-cols-2">
            {caregiver && <ContactBlock contact={caregiver} role={t('sheet.roleCaregiver')} />}
            {emergency && <ContactBlock contact={emergency} role={t('sheet.roleEmergency')} />}
            {vets.map((contact) => (
              <ContactBlock key={contact.id} contact={contact} role={tEnum('contactRole', contact.role)} />
            ))}
            {!caregiver && !emergency && vets.length === 0 && (
              <p className="text-sm text-stone-500">
                {beforeLink}
                <Link to="/contacts" className="link">
                  {t('sheet.contactsLink')}
                </Link>
                {afterLink}
              </p>
            )}
          </div>
        </Section>

        <p className="text-xs text-stone-400">
          {t('sheet.generated', { date: formatDate(new Date().toISOString().slice(0, 10)) })}
        </p>
      </div>
    </>
  );
}
