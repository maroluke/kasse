import React from 'react';
import { useTenant } from '../../lib/TenantProvider';
import { useAuth } from '../../lib/AuthProvider';
import { Input, Button } from '@kasse/ui';

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function DailyReport() {
  const { supa, tenantId } = useTenant();
  const { signOut } = useAuth();
  const [day, setDay] = React.useState<string>(toISODate(new Date()));
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [summary, setSummary] = React.useState({
    orders_count: 0,
    sales_cents: 0,
    deposit_charge_cents: 0,
    deposit_refund_cents: 0,
    vat_total_cents: 0,
    grand_total_cents: 0,
  });

  async function load() {
    if (!supa || !tenantId || !day) return;
    setLoading(true);
    setError(null);
    try {
      const start = new Date(day + 'T00:00:00Z').toISOString();
      const end = new Date(day + 'T23:59:59Z').toISOString();
      // Fetch orders for the day
      const { data: orders, error: oErr } = await supa
        .from('orders')
        .select('id,total_cents,vat_total_cents')
        .eq('tenant_id', tenantId)
        .gte('closed_at', start)
        .lte('closed_at', end);
      if (oErr) throw oErr;
      const orderIds = (orders || []).map((o: any) => o.id);
      const orders_count = orderIds.length;
      const grand_total_cents = (orders || []).reduce((s: number, o: any) => s + (o.total_cents || 0), 0);
      const vat_total_cents = (orders || []).reduce((s: number, o: any) => s + (o.vat_total_cents || 0), 0);

      let sales_cents = 0, deposit_charge_cents = 0, deposit_refund_cents = 0;
      if (orderIds.length > 0) {
        // Fetch items for those orders to break down sales and deposits
        const { data: items, error: iErr } = await supa
          .from('order_items')
          .select('order_id,kind,price_cents,deposit_cents')
          .in('order_id', orderIds);
        if (iErr) throw iErr;
        for (const it of items || []) {
          if (it.kind === 'SALE') sales_cents += it.price_cents || 0;
          if (it.kind === 'DEPOSIT_CHARGE') deposit_charge_cents += it.deposit_cents || 0;
          if (it.kind === 'DEPOSIT_REFUND') deposit_refund_cents += (it.deposit_cents || 0); // negative values expected
        }
      }

      setSummary({ orders_count, sales_cents, deposit_charge_cents, deposit_refund_cents, vat_total_cents, grand_total_cents });
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, day, supa]);

  const fmt = (cents: number) => (cents / 100).toFixed(2);

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold">Tagesrapport</h1>
      <div className="my-3 flex items-center gap-2">
        <div className="text-xs opacity-70">Tenant: {tenantId || '—'}</div>
        <Button variant="secondary" size="sm" onClick={() => signOut()}>Logout</Button>
      </div>

      <div className="my-3 flex items-center gap-2">
        <Input type="date" value={day} onChange={(e) => setDay(e.target.value)} className="w-[200px]" />
      </div>

      {error && <div className="text-red-600 mb-2">{error}</div>}

      <div className={loading ? 'opacity-60' : ''}>
        <ul className="list-disc pl-6 space-y-1">
          <li>Anzahl Bestellungen: {summary.orders_count}</li>
          <li>Einnahmen: {fmt(summary.sales_cents)}</li>
          <li>Deposits abgezogen: {fmt(summary.deposit_charge_cents)}</li>
          <li>Deposits zurückgegeben: {fmt(summary.deposit_refund_cents)}</li>
          <li>MwSt. Total: {fmt(summary.vat_total_cents)}</li>
          <li><b>Netto (Bestellungen total): {fmt(summary.grand_total_cents)}</b></li>
        </ul>
        <div className="mt-3">
          <Button variant="secondary" size="sm" onClick={load}>Refresh</Button>
        </div>
      </div>
    </div>
  );
}
