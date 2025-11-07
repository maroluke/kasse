    import React from 'react';
import { createClient } from '@supabase/supabase-js';
import { getTenantId } from '../settings';
// notification sound asset (m4a)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Vite will handle asset import
import notifySoundUrl from '../bell-notification-337658.mp3';

type Prep = 'QUEUED'|'IN_PROGRESS'|'READY'|'SERVED';
type Item = {
  id: string;
  order_id: string;
  name: string;
  qty: number;
  prep_status: Prep;
  pager_number: string | null;
  in_progress_at?: string | null;
  in_progress_by?: string | null;
  ready_at?: string | null;
  ready_by?: string | null;
};

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

function getClient(tenantId: string | null) {
  if (!url || !anon || !tenantId) return null;
  return createClient(url, anon, { auth: { persistSession: false }, global: { headers: { 'x-tenant-id': tenantId } } });
}

function nextStatus(s: Prep): Prep {
  return s === 'QUEUED' ? 'IN_PROGRESS' : s === 'IN_PROGRESS' ? 'READY' : s === 'READY' ? 'SERVED' : 'SERVED';
}

async function fetchKitchenItems(supa: any): Promise<Item[]> {
  if (!supa) return [];
  const { data, error } = await supa
    .from('order_items')
    .select('id, order_id, qty, prep_status, in_progress_at, in_progress_by, ready_at, ready_by, orders!inner(pager_number), products!inner(name, is_kitchen_item)')
    .eq('kind', 'SALE')
    .eq('products.is_kitchen_item', true)
    .order('order_id', { ascending: false })
    .limit(50);
  if (error) return [];
  return (data || []).map((r: any) => ({
    id: r.id,
    order_id: r.order_id,
    name: r.products?.name ?? 'Item',
    qty: r.qty,
    prep_status: (r.prep_status || 'QUEUED') as Prep,
    pager_number: r.orders?.pager_number ?? null,
    in_progress_at: r.in_progress_at ?? null,
    in_progress_by: r.in_progress_by ?? null,
    ready_at: r.ready_at ?? null,
    ready_by: r.ready_by ?? null,
  }));
}

export function Kitchen() {
  const tenantId = getTenantId();
  const supa = React.useMemo(() => getClient(tenantId), [tenantId]);
  const [items, setItems] = React.useState<Item[]>([]);
  const [connected, setConnected] = React.useState(false);
  const [filter, setFilter] = React.useState<Prep | 'ALL'>('ALL');
  const [sound, setSound] = React.useState(true);
  const queuedSeen = React.useRef<Set<string>>(new Set());
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  async function playNotify() {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(notifySoundUrl as unknown as string);
      }
      const a = audioRef.current;
      a.currentTime = 0;
      await a.play();
    } catch {}
  }

  function detectQueuedArrivals(next: Item[]) {
    const nextQueued = new Set(next.filter((x) => x.prep_status === 'QUEUED').map((x) => x.id));
    let hasNew = false;
    nextQueued.forEach((id) => { if (!queuedSeen.current.has(id)) hasNew = true; });
    queuedSeen.current = nextQueued;
    if (hasNew && sound) playNotify();
  }

  React.useEffect(() => {
    let unsub: (() => void) | undefined;
    let poll: any;
    let mounted = true;

    async function init() {
      if (!supa) {
        poll = setInterval(() => {
          if (!mounted) return;
          setItems((prev) => prev.length ? prev : [{ id: 'i1', order_id: 'o1', name: 'Coffee', qty: 1, prep_status: 'QUEUED', pager_number: null }]);
        }, 5000);
        return;
      }

      const first = await fetchKitchenItems(supa);
      detectQueuedArrivals(first);
      setItems(first);

      const channel = supa.channel('pos-kds-items')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, async () => {
          const rows = await fetchKitchenItems(supa);
          if (mounted) { detectQueuedArrivals(rows); setItems(rows); }
        })
        .subscribe((status: any) => { if (status === 'SUBSCRIBED') setConnected(true); });

      unsub = () => { supa.removeChannel(channel); };

      poll = setInterval(async () => {
        const rows = await fetchKitchenItems(supa);
        if (mounted) { detectQueuedArrivals(rows); setItems(rows); }
      }, 5000);
    }

    init();
    return () => {
      mounted = false;
      if (unsub) unsub();
      if (poll) clearInterval(poll);
    };
  }, [supa]);

  async function setStatus(it: Item, status: Prep) {
    const pin = (() => { try { return localStorage.getItem('pos_active_staff_pin'); } catch { return null; } })();
    const now = new Date().toISOString();
    const patch: any = { prep_status: status };
    if (status === 'IN_PROGRESS') { patch.in_progress_at = now; patch.in_progress_by = pin || null; }
    if (status === 'READY') { patch.ready_at = now; patch.ready_by = pin || null; }
    if (!supa) { setItems((arr) => arr.map((x) => x.id === it.id ? { ...x, ...patch } : x)); return; }
    const { error } = await supa.from('order_items').update(patch).eq('id', it.id);
    if (error) console.warn('update prep_status error', error);
  }

  const grouped = React.useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const it of items) {
      if (!map.has(it.order_id)) map.set(it.order_id, []);
      map.get(it.order_id)!.push(it);
    }
    // sort items per order by status priority then name
    const order = new Map<Prep, number>([
      ['QUEUED', 0],
      ['IN_PROGRESS', 1],
      ['READY', 2],
      ['SERVED', 3],
    ]);
    const entries = Array.from(map.entries()).map(([oid, arr]) => [oid, arr.slice().sort((a,b) => (order.get(a.prep_status)! - order.get(b.prep_status)!) || a.name.localeCompare(b.name))] as const);
    return entries;
  }, [items]);

  return (
    <div className="h-full flex flex-col">
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b">
        <div className="px-4 py-3 flex flex-wrap items-center gap-2">
          <div className="text-2xl font-bold mr-auto">Kitchen</div>
          {!supa && <div className="text-amber-700 text-sm">Supabase ENV fehlt – Mockdaten & 5s Polling aktiv.</div>}
          {supa && !connected && <div className="text-sm">Verbinde Realtime…</div>}
          {(['ALL','QUEUED','IN_PROGRESS','READY'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded text-sm md:text-base ${filter===s?'bg-gray-800 text-white':'bg-gray-200 hover:bg-gray-300'}`}
            >{s}</button>
          ))}
          <label className="ml-2 text-sm flex items-center gap-2">
            <input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} />
            Sound bei neuer Bestellung
          </label>
        </div>
      </div>

      <div className="p-4 columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-4 gap-6 [column-fill:_balance]">{/* masonry container */}
        {grouped.map(([oid, arr]) => (
          <div key={oid} className="rounded-lg border shadow-sm p-4 select-none break-inside-avoid mb-3 bg-gray-200">
            <div className="text-sm text-gray-600 mb-2 flex items-center gap-3">
              <span>Order {oid}</span>
              {arr[0]?.pager_number && (
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-xs">Pager {arr[0].pager_number}</span>
              )}
            </div>
            <div className="flex flex-col gap-3">
              {arr.filter((x) => filter==='ALL' || x.prep_status===filter).map((it) => (
                <div key={it.id} className={`rounded-md p-3 border ${it.prep_status==='READY' ? 'border-green-500 ring-1 ring-green-300' : it.prep_status==='IN_PROGRESS' ? 'border-amber-400' : 'border-gray-200'}`}>
                  <div className="font-semibold text-xl">{it.name} <span className="text-gray-500">x{it.qty}</span></div>
                  <div className="mt-1">Status: <span className="font-medium">{it.prep_status}</span></div>
                  <div className="mt-1 text-sm text-gray-700 space-y-1">
                    {it.in_progress_at && (
                      <div>Start: {new Date(it.in_progress_at).toLocaleTimeString()} {it.in_progress_by ? `(PIN ${it.in_progress_by})` : ''}</div>
                    )}
                    {it.ready_at && (
                      <div>Ready: {new Date(it.ready_at).toLocaleTimeString()} {it.ready_by ? `(PIN ${it.ready_by})` : ''}</div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 mt-2">
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700" onClick={() => setStatus(it, 'IN_PROGRESS')}>Start</button>
                    <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700" onClick={() => setStatus(it, 'READY')}>Ready</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
