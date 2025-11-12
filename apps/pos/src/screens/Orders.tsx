import React, { useEffect, useState } from 'react';
import { listRecentOrders } from '../db/repo';
import { createClient } from '@supabase/supabase-js';

export function Orders() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);

  async function refresh() {
    setLoading(true);
    const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
    const tenantId = import.meta.env.VITE_POS_DEFAULT_TENANT_ID as string | undefined;
    if (url && anon && tenantId) {
      try {
        const supa = createClient(url, anon, { auth: { persistSession: false } });
        const { data, error } = await supa
          .from('orders')
          .select('id,status,opened_at,total_cents')
          .eq('tenant_id', tenantId)
          .order('opened_at', { ascending: false })
          .limit(20);
        if (!error && data) {
          setOrders(data as any);
        } else {
          const rows = await listRecentOrders(20);
          setOrders(rows);
        }
      } catch {
        const rows = await listRecentOrders(20);
        setOrders(rows);
      }
    } else {
      const rows = await listRecentOrders(20);
      setOrders(rows);
    }
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Bestellungen</h1>
        <button className="touch-button bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors" onClick={refresh}>
          Aktualisieren
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto hide-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground">Lade…</div>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground">Keine Bestellungen vorhanden.</div>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <div key={o.id} className="bg-card rounded-lg p-4 border shadow-sm">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="font-mono text-sm text-muted-foreground">ID: {o.id}</div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        o.status === 'completed' ? 'bg-green-100 text-green-800' :
                        o.status === 'paid' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {o.status}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {o.opened_at ? new Date(o.opened_at).toLocaleString('de-DE') : 'Keine Zeit'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">€{(o.total_cents / 100).toFixed(2)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
