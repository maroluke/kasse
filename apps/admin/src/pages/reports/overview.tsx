import React from 'react';
import { useTenant } from '../../lib/TenantProvider';
import { Input, Button } from '@kasse/ui';

function toISODate(d: Date) { return d.toISOString().slice(0, 10); }

export default function ReportsOverview() {
  const { supa, tenantId } = useTenant();
  const [from, setFrom] = React.useState<string>(toISODate(new Date(Date.now() - 6*24*3600*1000)));
  const [to, setTo] = React.useState<string>(toISODate(new Date()));
  const [daily, setDaily] = React.useState<Array<{ day: string; sale_cents: number; deposit_taken_cents: number; deposit_refund_cents: number; orders: number }>>([]);
  const [hourly, setHourly] = React.useState<Array<{ hour: string; sale_cents: number; orders: number }>>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function load() {
    if (!supa || !tenantId || !from || !to) return;
    setLoading(true);
    setError(null);
    try {
      const start = new Date(from + 'T00:00:00Z').toISOString();
      const end = new Date(to + 'T23:59:59Z').toISOString();
      // Daily (v_revenue_excl_deposits)
      const { data: dData, error: dErr } = await supa
        .from('v_revenue_excl_deposits')
        .select('day, sale_cents, deposit_taken_cents, deposit_refund_cents, orders')
        .gte('day', start)
        .lte('day', end)
        .order('day');
      if (dErr) throw dErr;
      setDaily((dData as any) || []);
      // Hourly for today
      const hourStart = new Date(to + 'T00:00:00Z').toISOString();
      const hourEnd = new Date(to + 'T23:59:59Z').toISOString();
      const { data: hData, error: hErr } = await supa
        .from('v_revenue_hourly')
        .select('hour, sale_cents, orders')
        .gte('hour', hourStart)
        .lte('hour', hourEnd)
        .order('hour');
      if (hErr) throw hErr;
      setHourly((hData as any) || []);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { load(); /* eslint-disable-next-line */ }, [supa, tenantId]);

  const fmt = (cents: number) => (cents / 100).toFixed(2);

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold">Berichte Übersicht</h1>
      <div className="flex items-center gap-2 my-3">
        <span>Von</span>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[180px]" />
        <span>Bis</span>
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[180px]" />
        <Button size="sm" onClick={load} disabled={loading}>Neu laden</Button>
      </div>
      {error && <div className="text-red-600">{error}</div>}
      <div className={`grid gap-4 ${loading ? 'opacity-60' : ''}`}>
        <section>
          <h2 className="font-semibold">Täglich (ohne Pfand)</h2>
          <div className="grid gap-2 font-semibold mb-2 [grid-template-columns:140px_120px_140px_140px_100px]">
            <div>Tag</div>
            <div>Verkäufe</div>
            <div>Pfand genommen</div>
            <div>Pfand zurück</div>
            <div>Bestellungen</div>
          </div>
          {daily.map((r) => (
            <div key={String(r.day)} className="grid items-center gap-2 mb-1 [grid-template-columns:140px_120px_140px_140px_100px]">
              <div>{String(r.day).slice(0, 10)}</div>
              <div>{fmt(r.sale_cents)}</div>
              <div>{fmt(r.deposit_taken_cents)}</div>
              <div>{fmt(r.deposit_refund_cents)}</div>
              <div>{r.orders}</div>
            </div>
          ))}
          {daily.length === 0 && <div>Keine Daten</div>}
        </section>

        <section>
          <h2 className="font-semibold">Heute Stündlich</h2>
          <div className="grid gap-2 font-semibold mb-2 [grid-template-columns:180px_120px_100px]">
            <div>Stunde</div>
            <div>Verkäufe</div>
            <div>Bestellungen</div>
          </div>
          {hourly.map((r) => (
            <div key={String(r.hour)} className="grid items-center gap-2 mb-1 [grid-template-columns:180px_120px_100px]">
              <div>{new Date(r.hour).toISOString().slice(0, 16).replace('T', ' ')}</div>
              <div>{fmt(r.sale_cents)}</div>
              <div>{r.orders}</div>
            </div>
          ))}
          {hourly.length === 0 && <div>Keine Daten</div>}
        </section>
      </div>
    </div>
  );
}
