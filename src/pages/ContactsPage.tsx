import { Users } from 'lucide-react';
import { useData } from '@/store/DataContext';
import { ResourcePage } from '@/components/ResourcePage';
import { Badge, Field, Select, type Tone } from '@/components/ui';
import { titleCase } from '@/lib/format';
import { stripMeta, type FormValues } from '@/lib/forms';
import { CONTACT_ROLES } from '@shared/schema.js';
import type { Contact } from '@shared/types';

type Values = FormValues<Contact>;

const ROLE_TONE: Record<string, Tone> = {
  vet: 'blue',
  clinic: 'blue',
  sitter: 'violet',
  groomer: 'green',
  emergency: 'red',
  other: 'neutral',
};

const blank = (): Values => ({
  name: '',
  role: 'vet',
  organisation: '',
  phone: '',
  email: '',
  address: '',
  hours: '',
  notes: '',
});

export default function ContactsPage() {
  const { db } = useData();
  const rows = [...db.contacts].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <ResourcePage<Contact, Values>
      collection="contacts"
      title="Contacts"
      subtitle="Vets, clinics, sitters and anyone else you might need in a hurry. Shared across all pets."
      addLabel="Add contact"
      emptyIcon={Users}
      emptyTitle="No contacts yet"
      emptyMessage="Add your vet first — appointments and the care sheet both link to contacts."
      rows={rows}
      describe={(contact) => contact.name}
      defaults={blank}
      toValues={stripMeta}
      columns={[
        {
          header: 'Name',
          render: (contact) => (
            <div>
              <p className="font-medium text-stone-900 dark:text-stone-100">{contact.name}</p>
              {contact.organisation && <p className="text-xs text-stone-500">{contact.organisation}</p>}
            </div>
          ),
        },
        { header: 'Role', render: (contact) => <Badge tone={ROLE_TONE[contact.role]}>{titleCase(contact.role)}</Badge> },
        {
          header: 'Phone',
          render: (contact) =>
            contact.phone ? (
              <a href={`tel:${contact.phone.replace(/\s/g, '')}`} className="link">
                {contact.phone}
              </a>
            ) : (
              '—'
            ),
        },
        {
          header: 'Email',
          render: (contact) =>
            contact.email ? (
              <a href={`mailto:${contact.email}`} className="link">
                {contact.email}
              </a>
            ) : (
              '—'
            ),
        },
        { header: 'Hours', render: (contact) => contact.hours || '—' },
      ]}
      renderForm={({ values, set, errors }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" error={errors.name}>
              <input className="input" value={values.name} onChange={(e) => set({ name: e.target.value })} placeholder="Dr. Ana Marques" />
            </Field>
            <Field label="Role">
              <Select options={CONTACT_ROLES} value={values.role} onChange={(e) => set({ role: e.target.value as Values['role'] })} />
            </Field>
            <Field label="Organisation">
              <input className="input" value={values.organisation} onChange={(e) => set({ organisation: e.target.value })} />
            </Field>
            <Field label="Phone">
              <input className="input" value={values.phone} onChange={(e) => set({ phone: e.target.value })} />
            </Field>
            <Field label="Email">
              <input type="email" className="input" value={values.email} onChange={(e) => set({ email: e.target.value })} />
            </Field>
            <Field label="Opening hours">
              <input className="input" value={values.hours} onChange={(e) => set({ hours: e.target.value })} placeholder="Mon–Fri 9–19, Sat 9–13" />
            </Field>
          </div>
          <Field label="Address">
            <textarea className="input min-h-16" value={values.address} onChange={(e) => set({ address: e.target.value })} />
          </Field>
          <Field label="Notes">
            <textarea className="input min-h-16" value={values.notes} onChange={(e) => set({ notes: e.target.value })} />
          </Field>
        </>
      )}
    />
  );
}
