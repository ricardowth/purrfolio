import { useData } from '@/store/DataContext';
import { titleCase } from '@/lib/format';

/** Dropdown of saved contacts, optionally narrowed to particular roles. */
export function ContactSelect({
  value,
  onChange,
  roles,
  placeholder = 'Not recorded',
}: {
  value: string;
  onChange: (id: string) => void;
  roles?: string[];
  placeholder?: string;
}) {
  const { db } = useData();
  const options = db.contacts
    .filter((contact) => !roles || roles.includes(contact.role) || contact.id === value)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((contact) => (
        <option key={contact.id} value={contact.id}>
          {contact.name} ({titleCase(contact.role)})
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
