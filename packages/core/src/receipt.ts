import { CartLine, Totals } from './types';
import { calcTotals } from './pricing';

export type ReceiptLine =
  | { type: 'title'; text: string }
  | { type: 'text'; text: string }
  | { type: 'hr' }
  | { type: 'qr'; data: string };

export function renderReceipt(lines: CartLine[], footerQR?: string): ReceiptLine[] {
  const t: Totals = calcTotals(lines);
  const rows: ReceiptLine[] = [];
  rows.push({ type: 'title', text: 'KASSE' });
  rows.push({ type: 'hr' });
  for (const l of lines) {
    const label = l.kind === 'SALE' ? l.name : l.kind === 'DEPOSIT_CHARGE' ? 'Deposit' : 'Deposit Refund';
    const value = l.kind === 'SALE' ? l.price_cents : l.deposit_cents;
    rows.push({ type: 'text', text: `${label} x${l.qty}  ${(value * l.qty / 100).toFixed(2)} CHF` });
  }
  rows.push({ type: 'hr' });
  rows.push({ type: 'text', text: `Sales: ${(t.sale_total_cents / 100).toFixed(2)} CHF` });
  rows.push({ type: 'text', text: `Deposits: ${(t.deposit_total_cents / 100).toFixed(2)} CHF` });
  rows.push({ type: 'text', text: `VAT: ${(t.vat_total_cents / 100).toFixed(2)} CHF` });
  rows.push({ type: 'text', text: `Total: ${(t.grand_total_cents / 100).toFixed(2)} CHF` });
  if (footerQR) rows.push({ type: 'qr', data: footerQR });
  return rows;
}
