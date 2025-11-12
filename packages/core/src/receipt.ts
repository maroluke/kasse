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
  rows.push({ type: 'text', text: 'Alle Preise in CHF' });
  rows.push({ type: 'hr' });
  
  for (const l of lines) {
    const label = l.kind === 'SALE' ? l.name : l.kind === 'DEPOSIT_CHARGE' ? 'Pfand' : 'Pfand-Rückerstattung';
    const value = l.kind === 'SALE' ? l.price_cents : l.deposit_cents;
    const amountValue = (value * l.qty / 100).toFixed(2); // Just the number, no CHF
    const leftText = `${label} x${l.qty}`;
    
    // Split amount into parts for decimal alignment
    const amountParts = amountValue.split('.');
    const wholePart = amountParts[0] || '';
    const decimalPart = amountParts[1] ? `.${amountParts[1]}` : '.00';
    
    // Calculate spacing: 42 total - left text - whole amount - decimal
    const leftWidth = 28; // Fixed width for left column
    const amountWidth = 8; // Fixed width for right column (just numbers)
    const paddedLeft = leftText.padEnd(leftWidth, ' ');
    
    // Format with decimal alignment
    const wholePadded = wholePart.padStart(amountWidth - 3, ' '); // 3 chars for ".xx"
    rows.push({ type: 'text', text: `${paddedLeft}${wholePadded}${decimalPart}` });
  }
  rows.push({ type: 'hr' });
  
  // Totals with same decimal alignment
  const totals = [
    { label: 'Verkäufe:', value: (t.sale_total_cents / 100).toFixed(2) },
    { label: 'Pfand:', value: (t.deposit_total_cents / 100).toFixed(2) },
    { label: 'MwSt.:', value: (t.vat_total_cents / 100).toFixed(2) },
    { label: 'Gesamt:', value: (t.grand_total_cents / 100).toFixed(2) }
  ];
  
  for (const { label, value } of totals) {
    const amountParts = value.split('.');
    const wholePart = amountParts[0] || '';
    const decimalPart = amountParts[1] ? `.${amountParts[1]}` : '.00';
    
    const leftWidth = 28;
    const amountWidth = 8;
    const paddedLeft = label.padEnd(leftWidth, ' ');
    const wholePadded = wholePart.padStart(amountWidth - 3, ' ');
    
    rows.push({ type: 'text', text: `${paddedLeft}${wholePadded}${decimalPart}` });
  }
  
  if (footerQR) rows.push({ type: 'qr', data: footerQR });
  return rows;
}
