import { Cat } from 'lucide-react';
import { useData } from '@/store/DataContext';
import { ResourcePage } from '@/components/ResourcePage';
import { Badge, Checkbox, Field, Select } from '@/components/ui';
import { PhotoField } from '@/components/AttachmentField';
import { fileUrl } from '@/lib/api';
import { formatAge, formatDate, titleCase } from '@/lib/format';
import { parseList, stripMeta, type FormValues } from '@/lib/forms';
import { SEXES } from '@shared/schema.js';
import type { Pet } from '@shared/types';

type Values = FormValues<Pet>;

const blank = (): Values => ({
  name: '',
  species: 'cat',
  breed: '',
  colour: '',
  sex: 'unknown',
  neutered: false,
  birthDate: '',
  adoptionDate: '',
  microchip: '',
  insurer: '',
  policyNumber: '',
  allergies: [],
  quirks: '',
  photo: '',
  notes: '',
  archived: false,
});

export default function PetsPage() {
  const { allPets } = useData();

  return (
    <ResourcePage<Pet, Values>
      collection="pets"
      title="Pets"
      subtitle="Everyone you're keeping records for."
      addLabel="Add pet"
      emptyIcon={Cat}
      emptyTitle="No pets yet"
      emptyMessage="Add your first pet to unlock the rest of the app."
      rows={allPets}
      describe={(pet) => pet.name}
      defaults={blank}
      toValues={stripMeta}
      columns={[
        {
          header: 'Pet',
          render: (pet) => (
            <div className="flex items-center gap-3">
              {pet.photo ? (
                <img src={fileUrl(pet.photo)} alt={pet.name} className="size-9 rounded-full object-cover" />
              ) : (
                <span className="flex size-9 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  {pet.name.slice(0, 1).toUpperCase()}
                </span>
              )}
              <div>
                <p className="font-medium text-stone-900 dark:text-stone-100">{pet.name}</p>
                <p className="text-xs text-stone-500">{[titleCase(pet.species), pet.breed].filter(Boolean).join(' · ')}</p>
              </div>
            </div>
          ),
        },
        { header: 'Age', render: (pet) => <span className="text-stone-600 dark:text-stone-400">{formatAge(pet.birthDate)}</span> },
        { header: 'Born', render: (pet) => formatDate(pet.birthDate) },
        {
          header: 'Details',
          render: (pet) => (
            <div className="flex flex-wrap gap-1">
              <Badge tone="neutral">{titleCase(pet.sex)}</Badge>
              {pet.neutered && <Badge tone="blue">Neutered</Badge>}
              {pet.allergies.length > 0 && <Badge tone="red">{pet.allergies.length} allergy</Badge>}
              {pet.archived && <Badge tone="neutral">Archived</Badge>}
            </div>
          ),
        },
      ]}
      renderForm={({ values, set, errors }) => (
        <>
          <Field label="Photo">
            <PhotoField value={values.photo} name={values.name} onChange={(photo) => set({ photo })} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" error={errors.name}>
              <input className="input" value={values.name} onChange={(e) => set({ name: e.target.value })} placeholder="Mochi" />
            </Field>
            <Field label="Species">
              <input className="input" value={values.species} onChange={(e) => set({ species: e.target.value })} placeholder="cat" />
            </Field>
            <Field label="Breed">
              <input className="input" value={values.breed} onChange={(e) => set({ breed: e.target.value })} placeholder="Domestic shorthair" />
            </Field>
            <Field label="Colour / markings">
              <input className="input" value={values.colour} onChange={(e) => set({ colour: e.target.value })} placeholder="Ginger tabby" />
            </Field>
            <Field label="Sex">
              <Select options={SEXES} value={values.sex} onChange={(e) => set({ sex: e.target.value as Values['sex'] })} />
            </Field>
            <Field label="Date of birth" error={errors.birthDate} hint="Approximate is fine — it drives the age shown everywhere.">
              <input type="date" className="input" value={values.birthDate} onChange={(e) => set({ birthDate: e.target.value })} />
            </Field>
            <Field label="Adoption date">
              <input type="date" className="input" value={values.adoptionDate} onChange={(e) => set({ adoptionDate: e.target.value })} />
            </Field>
            <Field label="Microchip number">
              <input className="input" value={values.microchip} onChange={(e) => set({ microchip: e.target.value })} />
            </Field>
            <Field label="Insurer">
              <input className="input" value={values.insurer} onChange={(e) => set({ insurer: e.target.value })} />
            </Field>
            <Field label="Policy number">
              <input className="input" value={values.policyNumber} onChange={(e) => set({ policyNumber: e.target.value })} />
            </Field>
          </div>

          <Field label="Allergies" hint="Comma separated. These are highlighted on the care sheet.">
            <input
              className="input"
              value={values.allergies.join(', ')}
              onChange={(e) => set({ allergies: parseList(e.target.value) })}
              placeholder="chicken, dust mites"
            />
          </Field>

          <Field label="Quirks & handling notes" hint="What a sitter needs to know: hiding spots, how they take pills, who they hate.">
            <textarea className="input min-h-20" value={values.quirks} onChange={(e) => set({ quirks: e.target.value })} />
          </Field>

          <Field label="Notes">
            <textarea className="input min-h-20" value={values.notes} onChange={(e) => set({ notes: e.target.value })} />
          </Field>

          <Checkbox label="Neutered / spayed" checked={values.neutered} onChange={(neutered) => set({ neutered })} />
          <Checkbox
            label="Archived (hide from the pet switcher)"
            checked={values.archived}
            onChange={(archived) => set({ archived })}
          />
        </>
      )}
    />
  );
}
