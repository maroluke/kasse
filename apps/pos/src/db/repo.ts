import { getDB, run, query } from './sqlite';
import type { CartLine } from '@kasse/core';

export type PaymentMethod = 'card' | 'cash';

export interface SavedOrder {
  id: string;
  opened_at: string;
  closed_at: string | null;
  status: string;
  total_cents: number;
  vat_total_cents: number;
}

// In-memory fallback when not on device
const memory = {
  orders: [] as SavedOrder[],
};

function uuid() {
  return (globalThis.crypto && 'randomUUID' in globalThis.crypto)
    ? (globalThis.crypto as any).randomUUID()
    : 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function saveOrder(opts: {
  lines: CartLine[];
  totals: { sale_total_cents: number; deposit_total_cents: number; vat_total_cents: number; grand_total_cents: number };
  payment: { method: PaymentMethod; amount_cents: number; provider?: string; provider_tx_id?: string; status?: string };
}) {
  const db = await getDB();
  const orderId = uuid();
  const now = new Date().toISOString();

  if (!db) {
    memory.orders.unshift({
      id: orderId,
      opened_at: now,
      closed_at: now,
      status: 'CLOSED',
      total_cents: opts.totals.grand_total_cents,
      vat_total_cents: opts.totals.vat_total_cents,
    });
    return orderId;
  }

  await run(db, 'INSERT INTO orders (id, opened_at, closed_at, status, total_cents, vat_total_cents) VALUES (?,?,?,?,?,?)', [
    orderId,
    now,
    now,
    'CLOSED',
    opts.totals.grand_total_cents,
    opts.totals.vat_total_cents,
  ]);

  for (const l of opts.lines) {
    await run(db, 'INSERT INTO order_items (id, order_id, product_id, kind, qty, price_cents, deposit_cents, vat_rate, prep_status) VALUES (?,?,?,?,?,?,?,?,?)', [
      uuid(),
      orderId,
      l.product_id ?? null,
      l.kind,
      l.qty,
      l.price_cents,
      l.deposit_cents,
      l.vat_rate,
      l.prep_status ?? null,
    ]);
  }

  await run(db, 'INSERT INTO payments (id, order_id, method, amount_cents, provider, provider_tx_id, status, created_at) VALUES (?,?,?,?,?,?,?,?)', [
    uuid(),
    orderId,
    opts.payment.method,
    opts.payment.amount_cents,
    opts.payment.provider ?? null,
    opts.payment.provider_tx_id ?? null,
    opts.payment.status ?? 'captured',
    now,
  ]);

  await enqueueOutbox({ type: 'order.created', payload: { id: orderId } });
  return orderId;
}

export async function listRecentOrders(limit = 20): Promise<SavedOrder[]> {
  const db = await getDB();
  if (!db) return memory.orders.slice(0, limit);
  const rows = await query<SavedOrder>(db, 'SELECT id, opened_at, closed_at, status, total_cents, vat_total_cents FROM orders ORDER BY opened_at DESC LIMIT ?', [limit]);
  return rows;
}

export async function enqueueOutbox(event: { type: string; payload: any }) {
  const db = await getDB();
  const id = uuid();
  const now = new Date().toISOString();
  if (!db) return id;
  await run(db, 'INSERT INTO outbox (id, type, payload, created_at) VALUES (?,?,?,?)', [
    id,
    event.type,
    JSON.stringify(event.payload ?? {}),
    now,
  ]);
  return id;
}
