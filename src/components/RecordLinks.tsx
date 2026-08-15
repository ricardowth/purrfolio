import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useData } from '@/store/DataContext';
import { useI18n } from '@/lib/i18n';
import { Badge, Field, Select, cx } from '@/components/ui';
import { today } from '@/lib/format';
import { numberOrNull, numberValue } from '@/lib/forms';
import { MED_ROUTES, FOOD_TYPES } from '@shared/schema.js';

/**
 * Pickers for the records an appointment produced. Each one lists what the pet
 * already has, and can create a new record inline so a prescription written at
 * the vet doesn't have to be typed in twice.
 *
 * New records are created as soon as you confirm the inline form, not when the
 * appointment is saved — a medication you were prescribed is real whether or not
 * you go on to save the visit.
 */

function PickerShell({
  emptyMessage,
  addLabel,
  form,
  children,
}: {
  emptyMessage?: ReactNode;
  addLabel: string;
  form: (close: () => void) => ReactNode;
  children: ReactNode;
}) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-2">
      {emptyMessage ? (
        <p className="text-sm text-stone-500 dark:text-stone-400">{emptyMessage}</p>
      ) : (
        <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-stone-200 p-2 dark:border-stone-700">{children}</div>
      )}

      {adding ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50/50 p-3 dark:border-amber-800 dark:bg-amber-950/20">
          {form(() => setAdding(false))}
        </div>
      ) : (
        <button type="button" className="btn-ghost text-xs" onClick={() => setAdding(true)}>
          <Plus className="size-3.5" />
          {addLabel}
        </button>
      )}
    </div>
  );
}

function CheckRow({ checked, onToggle, label, detail }: { checked: boolean; onToggle: () => void; label: string; detail?: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-stone-100 dark:hover:bg-stone-800">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="size-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500/40 dark:border-stone-600 dark:bg-stone-900"
      />
      <span className="flex-1 truncate">{label}</span>
      {detail && <span className="text-xs text-stone-500">{detail}</span>}
    </label>
  );
}

function InlineActions({ onCancel, onSave, busy }: { onCancel: () => void; onSave: () => void; busy: boolean }) {
  const { t } = useI18n();
  return (
    <div className="mt-3 flex justify-end gap-2">
      <button type="button" className="btn-subtle text-xs" onClick={onCancel}>
        {t('common.cancel')}
      </button>
      <button type="button" className="btn-primary text-xs" onClick={onSave} disabled={busy}>
        {busy ? t('common.saving') : t('link.create')}
      </button>
    </div>
  );
}

// --- medications -----------------------------------------------------------

export function MedicationPicker({
  value,
  onChange,
  issueIds,
  startDate,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  /** The appointment's issues, so a prescription inherits what it treats. */
  issueIds: string[];
  startDate: string;
}) {
  const { petId, forPet, create } = useData();
  const { t, tEnum } = useI18n();
  const medications = forPet('medications');

  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [frequency, setFrequency] = useState('');
  const [timesPerDay, setTimesPerDay] = useState<number | null>(null);
  const [route, setRoute] = useState('oral');
  const [busy, setBusy] = useState(false);

  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);

  async function add(close: () => void) {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const created = await create('medications', {
        petId,
        name: name.trim(),
        dose,
        frequency,
        timesPerDay,
        route,
        startDate: startDate || today(),
        issueIds,
      });
      onChange([...value, created.id]);
      setName('');
      setDose('');
      setFrequency('');
      setTimesPerDay(null);
      setRoute('oral');
      close();
    } finally {
      setBusy(false);
    }
  }

  return (
    <PickerShell
      addLabel={t('link.addMedication')}
      emptyMessage={medications.length === 0 ? t('link.noMedications') : undefined}
      form={(close) => (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('common.name')}>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('med.namePlaceholder')} autoFocus />
            </Field>
            <Field label={t('med.route')}>
              <Select options={MED_ROUTES} group="medRoute" value={route} onChange={(e) => setRoute(e.target.value)} />
            </Field>
            <Field label={t('med.dose')}>
              <input className="input" value={dose} onChange={(e) => setDose(e.target.value)} placeholder={t('med.dosePlaceholder')} />
            </Field>
            <Field label={t('med.timesPerDay')}>
              <input
                type="number"
                min="1"
                className="input"
                value={numberValue(timesPerDay)}
                onChange={(e) => setTimesPerDay(numberOrNull(e.target.value))}
              />
            </Field>
            <Field label={t('med.frequency')} className="sm:col-span-2">
              <input
                className="input"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                placeholder={t('med.frequencyPlaceholder')}
              />
            </Field>
          </div>
          <InlineActions onCancel={close} onSave={() => void add(close)} busy={busy} />
        </>
      )}
    >
      {medications.map((medication) => (
        <CheckRow
          key={medication.id}
          checked={value.includes(medication.id)}
          onToggle={() => toggle(medication.id)}
          label={medication.name}
          detail={[medication.dose, tEnum('medRoute', medication.route)].filter(Boolean).join(' · ')}
        />
      ))}
    </PickerShell>
  );
}

// --- food ------------------------------------------------------------------

export function FoodPicker({ value, onChange, startDate }: { value: string[]; onChange: (ids: string[]) => void; startDate: string }) {
  const { petId, forPet, create } = useData();
  const { t, tEnum } = useI18n();
  const foods = forPet('foods');

  const [product, setProduct] = useState('');
  const [brand, setBrand] = useState('');
  const [type, setType] = useState('prescription');
  const [busy, setBusy] = useState(false);

  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);

  async function add(close: () => void) {
    if (!product.trim()) return;
    setBusy(true);
    try {
      const created = await create('foods', {
        petId,
        product: product.trim(),
        brand,
        type,
        startDate: startDate || today(),
        current: true,
      });
      onChange([...value, created.id]);
      setProduct('');
      setBrand('');
      setType('prescription');
      close();
    } finally {
      setBusy(false);
    }
  }

  return (
    <PickerShell
      addLabel={t('link.addFood')}
      emptyMessage={foods.length === 0 ? t('link.noFoods') : undefined}
      form={(close) => (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label={t('food.product')}>
              <input
                className="input"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                placeholder={t('food.productPlaceholder')}
                autoFocus
              />
            </Field>
            <Field label={t('food.brand')}>
              <input className="input" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder={t('food.brandPlaceholder')} />
            </Field>
            <Field label={t('common.type')}>
              <Select options={FOOD_TYPES} group="foodType" value={type} onChange={(e) => setType(e.target.value)} />
            </Field>
          </div>
          <InlineActions onCancel={close} onSave={() => void add(close)} busy={busy} />
        </>
      )}
    >
      {foods.map((food) => (
        <CheckRow
          key={food.id}
          checked={value.includes(food.id)}
          onToggle={() => toggle(food.id)}
          label={[food.brand, food.product].filter(Boolean).join(' ')}
          detail={tEnum('foodType', food.type)}
        />
      ))}
    </PickerShell>
  );
}

// --- read-only chips -------------------------------------------------------

// `ids` is guaranteed by the schema, but a record written before the field
// existed can still reach here as undefined if the API process is older than
// the frontend. Treat that as "nothing linked" rather than taking the page down.
export function MedicationChips({ ids }: { ids?: string[] }) {
  const { forPet } = useData();
  const rows = forPet('medications').filter((row) => ids?.includes(row.id));
  if (rows.length === 0) return <span className="text-stone-400">—</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {rows.map((row) => (
        <Link key={row.id} to="/medications">
          <Badge tone="violet">{row.name}</Badge>
        </Link>
      ))}
    </span>
  );
}

export function FoodChips({ ids }: { ids?: string[] }) {
  const { forPet } = useData();
  const rows = forPet('foods').filter((row) => ids?.includes(row.id));
  if (rows.length === 0) return null;
  return (
    <span className={cx('flex flex-wrap gap-1')}>
      {rows.map((row) => (
        <Link key={row.id} to="/food">
          <Badge tone="amber">{[row.brand, row.product].filter(Boolean).join(' ')}</Badge>
        </Link>
      ))}
    </span>
  );
}
