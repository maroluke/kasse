// Supabase Edge Function: sync
// Accepts a JSON body: { events: [{ type: 'order.created', payload: { order: {...}, items: [...] } }] }
// Writes orders and order_items. Idempotent by natural keys (order.id, item.id) with ON CONFLICT DO NOTHING.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-id, x-device-key, x-timestamp, x-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function isUuid(v: unknown): v is string {
  return typeof v === 'string' && /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i.test(v);
}

function asInt(v: unknown, def = 0): number {
  const n = typeof v === 'number' ? v : parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) ? n : def;
}

function parseAllowedOrigins(): string[] | null {
  const raw = (Deno.env.get('SB_ALLOWED_ORIGINS') || '').trim();
  if (!raw) return null; // null means allow all (use wildcard)
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

function makeCors(origin: string | null) {
  const allowed = parseAllowedOrigins();
  if (!allowed) return { ...corsHeaders }; // wildcard
  if (origin && allowed.includes(origin)) return { ...corsHeaders, 'Access-Control-Allow-Origin': origin };
  return null; // not allowed
}

async function hmacHex(key: string, msg: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey('raw', encoder.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(msg));
  const bytes = new Uint8Array(sig);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

serve(async (req: Request) => {
  try {
    const origin = req.headers.get('origin');
    const dynamicCors = makeCors(origin);
    if (req.method === 'OPTIONS') {
      if (!dynamicCors) return new Response('forbidden', { status: 403 });
      return new Response('ok', { headers: dynamicCors })
    }

    // CORS preflight
    if (!dynamicCors) return new Response('forbidden', { status: 403 });
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: dynamicCors })
    const url = Deno.env.get('SB_URL')!
    const key = Deno.env.get('SB_SERVICE_ROLE_KEY')!
    const supabase = createClient(url, key)

    const deviceRequired = (Deno.env.get('SB_REQUIRE_DEVICE_KEY') || 'false').toLowerCase() === 'true'
    const expectedDeviceKey = Deno.env.get('SB_DEVICE_KEY') || ''
    const headerTenant = req.headers.get('x-tenant-id') || ''
    const headerDeviceKey = req.headers.get('x-device-key') || ''
    const ts = req.headers.get('x-timestamp') || ''
    const sig = req.headers.get('x-signature') || ''

    const raw = await req.text();
    let body: { events?: Array<{ type: string; payload: any }> } | null = null;
    try { body = JSON.parse(raw); } catch { body = null }

    if (deviceRequired) {
      if (!headerDeviceKey || headerDeviceKey !== expectedDeviceKey) {
        return Response.json({ ok: false, error: 'invalid_device_key' }, { status: 401, headers: dynamicCors })
      }
      const maxSkewMs = 5 * 60 * 1000;
      const now = Date.now();
      const tsNum = parseInt(ts, 10);
      if (!ts || !Number.isFinite(tsNum) || Math.abs(now - tsNum) > maxSkewMs) {
        return Response.json({ ok: false, error: 'invalid_timestamp' }, { status: 401, headers: dynamicCors })
      }
      const expectedSig = await hmacHex(headerDeviceKey, `${ts}.${raw}`);
      if (!sig || !safeEqual(sig, expectedSig)) {
        return Response.json({ ok: false, error: 'invalid_signature' }, { status: 401, headers: dynamicCors })
      }
    }

    if (!body || !Array.isArray(body.events)) {
      return Response.json({ ok: false, error: 'invalid_payload_events' }, { status: 400, headers: dynamicCors })
    }

    let processed = 0

    for (const evt of body.events) {
      if (evt.type === 'order.created') {
        const p = evt.payload || {}
        const order = p.order || {}
        const items = Array.isArray(p.items) ? p.items : [] as any[]

        const tenantId = (typeof order.tenant_id === 'string' && order.tenant_id) || headerTenant || Deno.env.get('SB_DEFAULT_TENANT_ID') || null
        if (!tenantId) {
          return Response.json({ ok: false, error: 'missing_tenant_id' }, { status: 400, headers: dynamicCors })
        }

        if (!order || !isUuid(order.id)) {
          return Response.json({ ok: false, error: 'invalid_order_id' }, { status: 400, headers: dynamicCors })
        }

        // upsert order (idempotent)
        const o = {
          id: order.id,
          tenant_id: tenantId,
          opened_at: typeof order.opened_at === 'string' ? order.opened_at : new Date().toISOString(),
          closed_at: typeof order.closed_at === 'string' ? order.closed_at : new Date().toISOString(),
          status: typeof order.status === 'string' ? order.status : 'CLOSED',
          total_cents: asInt(order.total_cents, 0),
          vat_total_cents: asInt(order.vat_total_cents, 0),
        };
        const { error: oErr } = await supabase.from('orders').upsert(o, { onConflict: 'id' });
        if (oErr) return Response.json({ ok: false, error: 'upsert_order_failed', details: String(oErr.message || oErr) }, { status: 500, headers: dynamicCors })

        // insert items
        for (const it of items) {
          if (!it || !isUuid(it.id)) continue
          const pid = (typeof it.product_id === 'string' && isUuid(it.product_id)) ? it.product_id : null
          const oi = {
            id: it.id,
            order_id: order.id,
            product_id: pid,
            kind: typeof it.kind === 'string' ? it.kind : 'SALE',
            qty: asInt(it.qty, 1),
            price_cents: asInt(it.price_cents, 0),
            deposit_cents: asInt(it.deposit_cents, 0),
            vat_rate: typeof it.vat_rate === 'number' ? it.vat_rate : asInt(it.vat_rate, 0),
            prep_status: typeof it.prep_status === 'string' ? it.prep_status : 'QUEUED',
          };
          const { error: iErr } = await supabase.from('order_items').upsert(oi, { onConflict: 'id' });
          if (iErr) return Response.json({ ok: false, error: 'upsert_item_failed', details: String(iErr.message || iErr) }, { status: 500, headers: dynamicCors })
        }

        processed++
      }
    }

    return Response.json({ ok: true, processed }, { headers: dynamicCors })
  } catch (e) {
    // do not leak sensitive details
    return Response.json({ ok: false, error: 'server_error' }, { status: 500, headers: corsHeaders })
  }
})
