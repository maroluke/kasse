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
    <div className="p-4">
      <h1 className="text-xl font-bold mb-2">Orders</h1>
      <button className="bg-blue-600 text-white px-3 py-2 rounded mb-3" onClick={refresh}>
        Refresh
      </button>
      {loading ? (
        <div>Loading…</div>
      ) : orders.length === 0 ? (
        <div>No orders yet.</div>
      ) : (
        <div className="space-y-2">
          {orders.map((o) => (
            <div key={o.id} className="border p-2 rounded text-sm flex justify-between">
              <div>
                <div>ID: {o.id}</div>
                <div>Status: {o.status}</div>
                <div>Opened: {o.opened_at}</div>
              </div>
              <div className="font-bold">{(o.total_cents / 100).toFixed(2)} CHF</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
