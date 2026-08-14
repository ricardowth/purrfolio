import { useData } from '@/store/DataContext';
import { useI18n } from '@/lib/i18n';

/** Dropdown of saved contacts, optionally narrowed to particular roles. */
export function ContactSelect({
  value,
  onChange,
  roles,
  placeholder,
}: {
  value: string;
  onChange: (id: string) => void;
  roles?: string[];
  placeholder?: string;
}) {
  const { db } = useData();
  const { t, tEnum } = useI18n();
  const options = db.contacts
    .filter((contact) => !roles || roles.includes(contact.role) || contact.id === value)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder ?? t('contactSelect.placeholder')}</option>
      {options.map((contact) => (
        <option key={contact.id} value={contact.id}>
          {contact.name} ({tEnum('contactRole', contact.role)})
        </option>
      ))}
    </select>
  );
}

/** Contact name for display in a table cell. */
export function ContactName({ id }: { id: string }) {
  const { contactById } = useData();
  const contact = contactById(id);
  if (!contact) return <>—</>;
  return (
    <span title={[contact.organisation, contact.phone].filter(Boolean).join(' · ')}>{contact.name}</span>
  );
}
