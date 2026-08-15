import { Field, Select } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { useFormat } from '@/lib/format';
import { unitPrice, type Packaged, type PriceBasis } from '@/lib/derive';
import { numberOrNull, numberValue } from '@/lib/forms';
import type { StringKey } from '@/lib/strings';
import { PACK_UNITS } from '@shared/schema.js';
import type { PackUnit } from '@shared/types';

/**
 * Buying and pricing, shared by everything that comes in a package — a 1.5 kg
 * bag of biscuits, a 195 g tin of mousse, a 50 ml tube of sunscreen. Kept in one
 * place so food and products can always be read against each other.
 */

/** How each unit price reads: '13,67 €/kg', '0,15 €/un.'. */
const BASIS_LABEL: Record<PriceBasis, StringKey> = { kg: 'pack.perKg', l: 'pack.perLitre', item: 'pack.perItem' };

/** The comparable figure as one line, or null while the pack is undescribed. */
export function useUnitPriceLabel() {
  const { t } = useI18n();
  const { formatMoney } = useFormat();
  return (item: Packaged) => {
    const price = unitPrice(item);
    return price ? t(BASIS_LABEL[price.basis], { price: formatMoney(price.amount) }) : null;
  };
}

/** Table cell: what it costs per kilo or item, over the pack that says so. */
export function PackPriceCell({ item }: { item: Packaged }) {
  const { t, tEnum } = useI18n();
  const { formatMoney, formatNumber } = useFormat();
  const perUnit = useUnitPriceLabel()(item);

  if (!perUnit) return <>{formatMoney(item.cost)}</>;

  // The select's own unit labels carry examples and are too long for a cell.
  const unit = item.packUnit === 'unit' ? t('pack.unitsShort') : tEnum('packUnit', item.packUnit);

  return (
    <div>
      <p className="font-medium text-stone-900 dark:text-stone-100">{perUnit}</p>
      <p className="text-xs text-stone-500">
        {formatMoney(item.cost)} · {formatNumber(item.packSize)} {unit}
      </p>
    </div>
  );
}

/**
 * The pack size, its unit and the price of one pack — the three inputs that
 * together produce the unit price. Rendered as two fields, so it drops straight
 * into a form's grid.
 */
export function PackFields({ values, set }: { values: Packaged; set: (patch: Partial<Packaged>) => void }) {
  const { t } = useI18n();
  const label = useUnitPriceLabel();

  return (
    <>
      <Field label={t('pack.size')} hint={t('pack.sizeHint')}>
        <div className="flex gap-2">
          <input
            type="number"
            step="0.01"
            min="0"
            className="input"
            value={numberValue(values.packSize)}
            onChange={(e) => set({ packSize: numberOrNull(e.target.value) })}
          />
          <Select
            className="w-44 shrink-0"
            options={PACK_UNITS}
            group="packUnit"
            value={values.packUnit}
            onChange={(e) => set({ packUnit: e.target.value as PackUnit })}
          />
        </div>
      </Field>

      {/* The hint doubles as a live readout: fill both halves and it turns into
          the €/kg, which is the number worth checking before buying again. */}
      <Field label={t('pack.price')} hint={label(values) ?? t('pack.priceHint')}>
        <input
          type="number"
          step="0.01"
          min="0"
          className="input"
          value={numberValue(values.cost)}
          onChange={(e) => set({ cost: numberOrNull(e.target.value) })}
        />
      </Field>
    </>
  );
}
