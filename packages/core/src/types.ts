export type LineKind = 'SALE' | 'DEPOSIT_CHARGE' | 'DEPOSIT_REFUND';
export type PrepStatus = 'QUEUED' | 'IN_PROGRESS' | 'READY' | 'SERVED';

export interface Product {
  id: string;
  tenant_id: string;
  name: string;
  price_cents: number;
  deposit_cents: number;
  vat_rate: number; // e.g., 7.7 for 7.7%
  is_kitchen_item: boolean;
  active: boolean;
  updated_at: string;
}

export interface CartLine {
  kind: LineKind;
  product_id?: string;
  name: string;
  qty: number;
  price_cents: number; // per unit
  deposit_cents: number; // per unit
  vat_rate: number; // %
  prep_status?: PrepStatus;
}

export interface Totals {
  sale_total_cents: number;
  deposit_total_cents: number;
  vat_total_cents: number;
  grand_total_cents: number;
}
