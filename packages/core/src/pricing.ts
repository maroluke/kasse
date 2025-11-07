import { CartLine, Totals } from './types';

export function calcTotals(lines: CartLine[]): Totals {
  const sale_total_cents = lines
    .filter((l) => l.kind === 'SALE')
    .reduce((sum, l) => sum + l.qty * l.price_cents, 0);
  const deposit_total_cents = lines
    .filter((l) => l.kind === 'DEPOSIT_CHARGE' || l.kind === 'DEPOSIT_REFUND')
    .reduce((sum, l) => sum + l.qty * l.deposit_cents, 0);
  const vat_total_cents = lines
    .filter((l) => l.kind === 'SALE')
    .reduce((sum, l) => sum + Math.round((l.qty * l.price_cents * l.vat_rate) / 100), 0);
  const grand_total_cents = sale_total_cents + deposit_total_cents;
  return { sale_total_cents, deposit_total_cents, vat_total_cents, grand_total_cents };
}
