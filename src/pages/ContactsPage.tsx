import { Users } from 'lucide-react';
import { useData } from '@/store/DataContext';
import { ResourcePage } from '@/components/ResourcePage';
import { Badge, Field, Select, type Tone } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
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
  const { t, tEnum } = useI18n();
  const rows = [...db.contacts].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <ResourcePage<Contact, Values>
      collection="contacts"
      title={t('contacts.title')}
      subtitle={t('contacts.subtitle')}
      addLabel={t('contacts.add')}
      emptyIcon={Users}
      emptyTitle={t('contacts.emptyTitle')}
      emptyMessage={t('contacts.emptyMessage')}
      rows={rows}
      describe={(contact) => contact.name}
      defaults={blank}
      toValues={stripMeta}
      columns={[
        {
          header: t('common.name'),
          render: (contact) => (
            <div>
              <p className="font-medium text-stone-900 dark:text-stone-100">{contact.name}</p>
              {contact.organisation && <p className="text-xs text-stone-500">{contact.organisation}</p>}
            </div>
          ),
        },
        { header: t('contacts.role'), render: (contact) => <Badge tone={ROLE_TONE[contact.role]}>{tEnum('contactRole', contact.role)}</Badge> },
        {
          header: t('contacts.phone'),
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
          header: t('contacts.email'),
          render: (contact) =>
            contact.email ? (
              <a href={`mailto:${contact.email}`} className="link">
                {contact.email}
              </a>
            ) : (
              '—'
            ),
        },
        { header: t('contacts.hours'), render: (contact) => contact.hours || '—' },
      ]}
      renderForm={({ values, set, errors }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('common.name')} error={errors.name}>
              <input
                className="input"
                value={values.name}
                onChange={(e) => set({ name: e.target.value })}
                placeholder={t('contacts.namePlaceholder')}
              />
            </Field>
            <Field label={t('contacts.role')}>
              <Select
                options={CONTACT_ROLES}
                group="contactRole"
                value={values.role}
                onChange={(e) => set({ role: e.target.value as Values['role'] })}
              />
            </Field>
            <Field label={t('contacts.organisation')}>
              <input className="input" value={values.organisation} onChange={(e) => set({ organisation: e.target.value })} />
            </Field>
            <Field label={t('contacts.phone')}>
              <input className="input" value={values.phone} onChange={(e) => set({ phone: e.target.value })} />
            </Field>
            <Field label={t('contacts.email')}>
              <input type="email" className="input" value={values.email} onChange={(e) => set({ email: e.target.value })} />
            </Field>
            <Field label={t('contacts.openingHours')}>
              <input
                className="input"
                value={values.hours}
                onChange={(e) => set({ hours: e.target.value })}
                placeholder={t('contacts.hoursPlaceholder')}
              />
            </Field>
          </div>
          <Field label={t('contacts.address')}>
            <textarea className="input min-h-16" value={values.address} onChange={(e) => set({ address: e.target.value })} />
          </Field>
          <Field label={t('common.notes')}>
            <textarea className="input min-h-16" value={values.notes} onChange={(e) => set({ notes: e.target.value })} />
          </Field>
        </>
      )}
    />
  );
}
