import { createClient } from '@supabase/supabase-js';
import type { CartLine } from '@kasse/core';
import { getTenantId, getSettings } from './settings';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const defaultTenantId = import.meta.env.VITE_POS_DEFAULT_TENANT_ID as string | undefined;

function getClient() {
  if (!url || !anon) return null;
  return createClient(url, anon, { auth: { persistSession: false } });
}

async function hmacSHA256(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message));
  const bytes = new Uint8Array(sig);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function syncOrderCreated(
  lines: CartLine[],
  totals: { sale_total_cents: number; deposit_total_cents: number; vat_total_cents: number; grand_total_cents: number },
  opts?: { pager_number?: string | null; outlet_id?: string | null },
) {
  const supa = getClient();
  if (!supa) return; // no env set, skip
  const tenantId = getTenantId() || defaultTenantId;
  if (!tenantId) return; // tenant not configured; skip for now

  // Minimal payload. In a real app, include tenant_id and durable order ids.
  const order = {
    id: crypto.randomUUID(),
    tenant_id: tenantId,
    status: 'CLOSED',
    opened_at: new Date().toISOString(),
    closed_at: new Date().toISOString(),
    total_cents: totals.grand_total_cents,
    vat_total_cents: totals.vat_total_cents,
    pager_number: opts?.pager_number ?? null,
    outlet_id: opts?.outlet_id ?? null,
  };

  const items = lines.map((l) => ({
    id: crypto.randomUUID(),
    order_id: order.id,
    product_id: l.product_id ?? null,
    kind: l.kind,
    qty: l.qty,
    price_cents: l.price_cents,
    deposit_cents: l.deposit_cents,
    vat_rate: l.vat_rate,
    prep_status: l.prep_status ?? 'QUEUED',
  }));

  const body = { events: [{ type: 'order.created', payload: { order, items } }] };
  const timestamp = Date.now().toString();
  const devKey = getSettings().device_key || '';
  const signature = devKey ? await hmacSHA256(devKey, `${timestamp}.${JSON.stringify(body)}`) : '';

  await supa.functions.invoke('sync', {
    body,
    headers: {
      'x-tenant-id': tenantId,
      ...(devKey ? { 'x-device-key': devKey } : {}),
      ...(signature ? { 'x-timestamp': timestamp, 'x-signature': signature } : {}),
    },
  });
}
