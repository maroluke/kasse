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
  in_progress_by_name?: string | null;
  ready_by_name?: string | null;
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
  
  // First fetch order items with timing data
  const { data: itemsData, error: itemsError } = await supa
    .from('order_items')
    .select('id, order_id, qty, prep_status, in_progress_at, in_progress_by, ready_at, ready_by, orders!inner(pager_number), products!inner(name, is_kitchen_item)')
    .eq('kind', 'SALE')
    .eq('products.is_kitchen_item', true)
    .order('order_id', { ascending: false })
    .limit(50);
    
  if (itemsError) return [];
  
  const items = itemsData || [];
  
  // Get all unique staff PINs from the items
  const staffPins = new Set<string>();
  items.forEach((item: any) => {
    if (item.in_progress_by) staffPins.add(item.in_progress_by);
    if (item.ready_by) staffPins.add(item.ready_by);
  });
  
  // Fetch staff names for those PINs
  const staffMap = new Map<string, string>();
  if (staffPins.size > 0) {
    const { data: staffData } = await supa
      .from('staff')
      .select('pin, name')
      .in('pin', Array.from(staffPins))
      .eq('active', true);
      
    if (staffData) {
      (staffData as any[]).forEach(staff => {
        staffMap.set(staff.pin, staff.name);
      });
    }
  }
  
  // Map items with staff names
  return items.map((r: any) => ({
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
    in_progress_by_name: staffMap.get(r.in_progress_by) || null,
    ready_by_name: staffMap.get(r.ready_by) || null,
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
    if (error) {
      // Error updating preparation status
      return;
    }
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
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="text-xl font-bold">Küche</div>
            <div className="flex items-center gap-2">
              {!supa && <div className="text-amber-600 text-xs sm:text-sm">Mock-Modus</div>}
              {supa && !connected && <div className="text-xs sm:text-sm text-muted-foreground">Verbinde…</div>}
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {(['ALL','QUEUED','IN_PROGRESS','READY'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`touch-button text-sm ${filter===s?'bg-primary text-primary-foreground':'bg-muted hover:bg-muted/80'}`}
              >
                {s === 'ALL' ? 'Alle' : 
                 s === 'QUEUED' ? 'Wartend' :
                 s === 'IN_PROGRESS' ? 'In Arbeit' :
                 s === 'READY' ? 'Fertig' : s}
              </button>
            ))}
            
            <label className="flex items-center gap-2 text-sm ml-auto">
              <input 
                type="checkbox" 
                checked={sound} 
                onChange={(e) => setSound(e.target.checked)} 
                className="rounded"
              />
              Ton
            </label>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto hide-scrollbar">
        {grouped.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground">Keine Küchenartikel vorhanden.</div>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {grouped.map(([oid, arr]) => (
              <div key={oid} className="bg-card rounded-lg border shadow-sm p-4 select-none">
                <div className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
                  <span className="font-mono">Bestellung {oid}</span>
                  {arr[0]?.pager_number && (
                    <span className="px-2 py-1 rounded bg-amber-100 text-amber-800 text-xs font-medium">
                      Pager {arr[0].pager_number}
                    </span>
                  )}
                </div>
                
                <div className="space-y-3">
                  {arr.filter((x) => filter==='ALL' || x.prep_status===filter).map((it) => (
                    <div key={it.id} className={`rounded-lg p-3 border ${
                      it.prep_status==='READY' ? 'border-green-500 bg-green-50' : 
                      it.prep_status==='IN_PROGRESS' ? 'border-amber-400 bg-amber-50' : 
                      'border-border bg-muted/30'
                    }`}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-semibold text-base">{it.name}</div>
                        <div className="text-sm font-medium bg-background px-2 py-1 rounded">x{it.qty}</div>
                      </div>
                      
                      <div className="text-xs text-muted-foreground mb-3">
                        Status: <span className="font-medium">
                          {it.prep_status === 'QUEUED' ? 'Wartend' :
                           it.prep_status === 'IN_PROGRESS' ? 'In Arbeit' :
                           it.prep_status === 'READY' ? 'Fertig' :
                           it.prep_status}
                        </span>
                      </div>
                      
                      {(it.in_progress_at || it.ready_at) && (
                        <div className="text-xs text-muted-foreground space-y-1 mb-3">
                          {it.in_progress_at && (
                            <div>Start: {new Date(it.in_progress_at).toLocaleTimeString('de-DE', {hour: '2-digit', minute: '2-digit'})} 
                              {it.in_progress_by_name && ` (${it.in_progress_by_name})`}
                            </div>
                          )}
                          {it.ready_at && (
                            <div>Fertig: {new Date(it.ready_at).toLocaleTimeString('de-DE', {hour: '2-digit', minute: '2-digit'})} 
                              {it.ready_by_name && ` (${it.ready_by_name})`}
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        {it.prep_status !== 'IN_PROGRESS' && it.prep_status !== 'READY' && it.prep_status !== 'SERVED' && (
                          <button 
                            className="flex-1 touch-button bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm" 
                            onClick={() => setStatus(it, 'IN_PROGRESS')}
                          >
                            Start
                          </button>
                        )}
                        {it.prep_status === 'IN_PROGRESS' && (
                          <button 
                            className="flex-1 touch-button bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm" 
                            onClick={() => setStatus(it, 'READY')}
                          >
                            Fertig
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
