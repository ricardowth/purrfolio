import { Plus, Trash2 } from 'lucide-react';
import { Field, Select } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { today, useFormat } from '@/lib/format';
import {
  latestPurchase,
  purchaseTotal,
  purchaseTotals,
  sortedPurchases,
  unitPrice,
  type Pack,
  type Packaged,
  type PriceBasis,
} from '@/lib/derive';
import { numberOrNull, numberValue } from '@/lib/forms';
import type { StringKey } from '@/lib/strings';
import { PACK_UNITS } from '@shared/schema.js';
import type { FoodPurchase, PackUnit } from '@shared/types';

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
 * What one package holds, and in what unit. On its own for food, whose prices
 * come from the purchase table rather than from a figure typed in beside the
 * size.
 */
export function PackSizeField({ values, set, hint }: { values: Pack; set: (patch: Partial<Pack>) => void; hint?: string }) {
  const { t } = useI18n();

  return (
    <Field label={t('pack.size')} hint={hint ?? t('pack.sizeHint')}>
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
      <PackSizeField values={values} set={set} />

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

/**
 * The buying history as an editable table: one line per shop trip, saying when
 * it was bought, how many packs came home and what one pack cost that day.
 * Prices move constantly, so a single price on the record would be out of date
 * the next time the bag is bought — the newest line here is what the food costs
 * now, and everything above it is the trail that shows how it got there.
 */
export function PurchaseTable({
  purchases,
  pack,
  onChange,
}: {
  purchases: FoodPurchase[];
  /** What one pack holds, so each line can show the €/kg actually paid. */
  pack: Pack;
  onChange: (purchases: FoodPurchase[]) => void;
}) {
  const { t, tn, tEnum } = useI18n();
  const { formatMoney, formatNumber } = useFormat();

  const rows = sortedPurchases(purchases);
  const totals = purchaseTotals(purchases);
  const latest = latestPurchase(purchases);
  const unit = pack.packUnit === 'unit' ? t('pack.unitsShort') : tEnum('packUnit', pack.packUnit);

  const patch = (id: string, values: Partial<FoodPurchase>) =>
    onChange(purchases.map((row) => (row.id === id ? { ...row, ...values } : row)));

  // A new line starts from the last trip — same shop, same price — because most
  // of the time you are buying the same bag again and only the date has moved.
  const addLine = () =>
    onChange([
      ...purchases,
      {
        id: crypto.randomUUID(),
        date: today(),
        quantity: 1,
        cost: latest ? latest.cost : null,
        place: latest ? latest.place : '',
        notes: '',
      },
    ]);

  // '6 packs · 9 kg' — the second half only once a pack size is known.
  const bought = [tn('food.packs', totals.packs), pack.packSize ? `${formatNumber(totals.packs * pack.packSize)} ${unit}` : '']
    .filter(Boolean)
    .join(' · ');

  const perPack = (row: FoodPurchase) => {
    const price = unitPrice({ ...pack, cost: row.cost });
    return price ? t(BASIS_LABEL[price.basis], { price: formatMoney(price.amount) }) : null;
  };

  return (
    <Field label={t('food.purchases')} hint={t('food.purchasesHint')}>
      <div className="overflow-x-auto rounded-lg border border-stone-200 dark:border-stone-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left dark:border-stone-700">
              <th className="w-40 px-2 py-1.5 text-xs font-semibold text-stone-500 uppercase">{t('food.purchaseDate')}</th>
              <th className="w-24 px-2 py-1.5 text-xs font-semibold text-stone-500 uppercase">{t('food.purchaseQty')}</th>
              <th className="w-32 px-2 py-1.5 text-xs font-semibold text-stone-500 uppercase">{t('food.purchasePrice')}</th>
              <th className="px-2 py-1.5 text-xs font-semibold text-stone-500 uppercase">{t('food.purchasePlace')}</th>
              <th className="w-28 px-2 py-1.5 text-right text-xs font-semibold text-stone-500 uppercase">{t('food.purchaseTotal')}</th>
              <th className="w-px px-2 py-1.5" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-2 py-4 text-center text-sm text-stone-500">
                  {t('food.noPurchases')}
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-stone-100 last:border-0 dark:border-stone-800">
                <td className="px-2 py-1.5">
                  <input
                    type="date"
                    className="input px-2 py-1"
                    value={row.date}
                    onChange={(e) => patch(row.id, { date: e.target.value })}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    className="input px-2 py-1"
                    value={numberValue(row.quantity)}
                    // Emptying the box would leave no quantity at all, so it falls
                    // back to one pack; selecting on focus keeps that from fighting
                    // whoever is typing a different number over it.
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) => patch(row.id, { quantity: numberOrNull(e.target.value) ?? 1 })}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="input px-2 py-1"
                    value={numberValue(row.cost)}
                    onChange={(e) => patch(row.id, { cost: numberOrNull(e.target.value) })}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    className="input px-2 py-1"
                    value={row.place}
                    placeholder={t('food.purchasePlacePlaceholder')}
                    onChange={(e) => patch(row.id, { place: e.target.value })}
                  />
                </td>
                <td className="px-2 py-1.5 text-right">
                  <p className="font-medium text-stone-900 dark:text-stone-100">{formatMoney(purchaseTotal(row))}</p>
                  {perPack(row) && <p className="text-xs text-stone-500">{perPack(row)}</p>}
                </td>
                <td className="px-1 py-1.5 text-right">
                  <button
                    type="button"
                    className="btn-subtle px-2 py-1 hover:text-red-600"
                    onClick={() => onChange(purchases.filter((item) => item.id !== row.id))}
                    aria-label={t('common.remove')}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t border-stone-200 dark:border-stone-700">
                <td colSpan={4} className="px-2 py-1.5 text-xs text-stone-500">
                  {bought}
                </td>
                <td className="px-2 py-1.5 text-right font-medium text-stone-900 dark:text-stone-100">{formatMoney(totals.spent)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <button type="button" className="btn-ghost mt-2 px-3 py-1.5 text-sm" onClick={addLine}>
        <Plus className="size-4" />
        {t('food.addPurchase')}
      </button>
    </Field>
  );
}
