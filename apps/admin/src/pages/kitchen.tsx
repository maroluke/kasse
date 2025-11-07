import React, { useEffect, useMemo, useState } from 'react';
import { useTenant } from '../lib/TenantProvider';

type Prep = 'QUEUED'|'IN_PROGRESS'|'READY'|'SERVED';
type Item = { id: string; order_id: string; name: string; qty: number; prep_status: Prep };

function nextStatus(s: Prep): Prep {
  return s === 'QUEUED' ? 'IN_PROGRESS' : s === 'IN_PROGRESS' ? 'READY' : s === 'READY' ? 'SERVED' : 'SERVED';
}

async function fetchKitchenItems(supa: any): Promise<Item[]> {
  if (!supa) return [];
  const { data, error } = await supa
    .from('order_items')
    .select('id, order_id, qty, prep_status, products!left(name, is_kitchen_item)')
    .eq('kind', 'SALE')
    .order('order_id', { ascending: false })
    .limit(50);
  if (error) {
    console.warn('fetchKitchenItems error', error);
    return [];
  }
  return (data || []).map((r: any) => ({
    id: r.id,
    order_id: r.order_id,
    name: r.products?.name ?? 'Item',
    qty: r.qty,
    prep_status: (r.prep_status || 'QUEUED') as Prep,
  }));
}

export default function Kitchen() {
  const { supa } = useTenant();
  const [items, setItems] = useState<Item[]>([]);
  const [connected, setConnected] = useState(false);
  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold">KDS</h1>
      <div className="mt-2">
        Die Kitchen Display Screen wurde in die Android POS App verlegt. Bitte verwende die POS-App (Route "Kitchen").
      </div>
    </div>
  );
}
