import { Cat } from 'lucide-react';
import { useData } from '@/store/DataContext';
import { ResourcePage } from '@/components/ResourcePage';
import { Badge, Checkbox, Field, Select } from '@/components/ui';
import { PhotoField } from '@/components/AttachmentField';
import { fileUrl } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { titleCase, useFormat } from '@/lib/format';
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
  const { t, tn, tEnum } = useI18n();
  const { formatAge, formatDate } = useFormat();

  return (
    <ResourcePage<Pet, Values>
      collection="pets"
      title={t('pets.title')}
      subtitle={t('pets.subtitle')}
      addLabel={t('pets.add')}
      emptyIcon={Cat}
      emptyTitle={t('pets.emptyTitle')}
      emptyMessage={t('pets.emptyMessage')}
      rows={allPets}
      describe={(pet) => pet.name}
      defaults={blank}
      toValues={stripMeta}
      columns={[
        {
          header: t('pets.pet'),
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
        { header: t('pets.age'), render: (pet) => <span className="text-stone-600 dark:text-stone-400">{formatAge(pet.birthDate)}</span> },
        { header: t('pets.born'), render: (pet) => formatDate(pet.birthDate) },
        {
          header: t('pets.details'),
          render: (pet) => (
            <div className="flex flex-wrap gap-1">
              <Badge tone="neutral">{tEnum('sex', pet.sex)}</Badge>
              {pet.neutered && <Badge tone="blue">{t('pets.neutered')}</Badge>}
              {pet.allergies.length > 0 && <Badge tone="red">{tn('pets.allergyCount', pet.allergies.length)}</Badge>}
              {pet.archived && <Badge tone="neutral">{t('pets.archived')}</Badge>}
            </div>
          ),
        },
      ]}
      renderForm={({ values, set, errors }) => (
        <>
          <Field label={t('pets.photo')}>
            <PhotoField value={values.photo} name={values.name} onChange={(photo) => set({ photo })} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('common.name')} error={errors.name}>
              <input
                className="input"
                value={values.name}
                onChange={(e) => set({ name: e.target.value })}
                placeholder={t('pets.namePlaceholder')}
              />
            </Field>
            <Field label={t('pets.species')}>
              <input
                className="input"
                value={values.species}
                onChange={(e) => set({ species: e.target.value })}
                placeholder={t('pets.speciesPlaceholder')}
              />
            </Field>
            <Field label={t('pets.breed')}>
              <input
                className="input"
                value={values.breed}
                onChange={(e) => set({ breed: e.target.value })}
                placeholder={t('pets.breedPlaceholder')}
              />
            </Field>
            <Field label={t('pets.colour')}>
              <input
                className="input"
                value={values.colour}
                onChange={(e) => set({ colour: e.target.value })}
                placeholder={t('pets.colourPlaceholder')}
              />
            </Field>
            <Field label={t('pets.sex')}>
              <Select options={SEXES} group="sex" value={values.sex} onChange={(e) => set({ sex: e.target.value as Values['sex'] })} />
            </Field>
            <Field label={t('pets.birthDate')} error={errors.birthDate} hint={t('pets.birthDateHint')}>
              <input type="date" className="input" value={values.birthDate} onChange={(e) => set({ birthDate: e.target.value })} />
            </Field>
            <Field label={t('pets.adoptionDate')}>
              <input type="date" className="input" value={values.adoptionDate} onChange={(e) => set({ adoptionDate: e.target.value })} />
            </Field>
            <Field label={t('pets.microchip')}>
              <input className="input" value={values.microchip} onChange={(e) => set({ microchip: e.target.value })} />
            </Field>
            <Field label={t('pets.insurer')}>
              <input className="input" value={values.insurer} onChange={(e) => set({ insurer: e.target.value })} />
            </Field>
            <Field label={t('pets.policyNumber')}>
              <input className="input" value={values.policyNumber} onChange={(e) => set({ policyNumber: e.target.value })} />
            </Field>
          </div>

          <Field label={t('pets.allergies')} hint={t('pets.allergiesHint')}>
            <input
              className="input"
              value={values.allergies.join(', ')}
              onChange={(e) => set({ allergies: parseList(e.target.value) })}
              placeholder={t('pets.allergiesPlaceholder')}
            />
          </Field>

          <Field label={t('pets.quirks')} hint={t('pets.quirksHint')}>
            <textarea className="input min-h-20" value={values.quirks} onChange={(e) => set({ quirks: e.target.value })} />
          </Field>

          <Field label={t('common.notes')}>
            <textarea className="input min-h-20" value={values.notes} onChange={(e) => set({ notes: e.target.value })} />
          </Field>

          <Checkbox label={t('pets.neuteredLabel')} checked={values.neutered} onChange={(neutered) => set({ neutered })} />
          <Checkbox label={t('pets.archivedLabel')} checked={values.archived} onChange={(archived) => set({ archived })} />
        </>
      )}
    />
  );
}
