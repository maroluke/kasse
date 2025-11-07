import React from 'react';
import { useTenant } from '../lib/TenantProvider';
import { Select, Input, Checkbox, Button } from '@kasse/ui';

export default function OutletPricing() {
  const { supa, tenantId } = useTenant();
  const [outlets, setOutlets] = React.useState<Array<{ id: string; name: string }>>([]);
  const [outletId, setOutletId] = React.useState<string>('');
  const [rows, setRows] = React.useState<Array<{ product_id: string; name: string; price_cents: number; active: boolean }>>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      if (!supa || !tenantId) return;
      const { data } = await supa.from('outlets').select('id,name').order('name');
      setOutlets((data as any) || []);
    })();
  }, [supa, tenantId]);

  async function load() {
    if (!supa || !tenantId || !outletId) return;
    setLoading(true);
    setError(null);
    setSaved(false);
    const { data, error } = await supa
      .from('products')
      .select('id,name, product_outlets(price_cents,active)')
      .eq('tenant_id', tenantId)
      .eq('active', true)
      .order('name');
    if (error) setError(error.message);
    const mapped = (data || []).map((p: any) => ({
      product_id: p.id,
      name: p.name,
      price_cents: p.product_outlets?.[0]?.price_cents ?? 0,
      active: p.product_outlets?.[0]?.active ?? true,
    }));
    setRows(mapped);
    setLoading(false);
  }

  React.useEffect(() => { load(); /* eslint-disable-next-line */ }, [supa, tenantId, outletId]);

  function updateRow(idx: number, patch: Partial<{ price_cents: number; active: boolean }>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  async function save() {
    if (!supa || !tenantId || !outletId) return;
    setLoading(true);
    setError(null);
    const payload = rows.map((r) => ({
      tenant_id: tenantId,
      product_id: r.product_id,
      outlet_id: outletId,
      price_cents: r.price_cents,
      active: r.active,
    }));
    const { error } = await supa.from('product_outlets').upsert(payload, { onConflict: 'product_id,outlet_id' });
    if (error) setError(error.message);
    setSaved(!error);
    setLoading(false);
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold">Outlet Pricing</h1>
      <div className="flex items-center gap-2 mb-3 mt-3">
        <span>Outlet</span>
        <Select value={outletId} onChange={(e) => setOutletId(e.target.value)} className="w-[220px]">
          <option value="">— select —</option>
          {outlets.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </Select>
        <Button variant="secondary" size="sm" onClick={load} disabled={!outletId || loading}>Reload</Button>
        <Button size="sm" onClick={save} disabled={!outletId || loading}>Save</Button>
        {saved && <span className="text-green-600">Saved</span>}
        {error && <span className="text-red-600">{error}</span>}
      </div>

      <div className={loading ? 'opacity-60' : ''}>
        <div className="grid gap-2 font-semibold mb-2" style={{ gridTemplateColumns: '1.5fr 140px 100px' }}>
          <div>Product</div>
          <div>Price (cents)</div>
          <div>Active</div>
        </div>
        {rows.map((r, idx) => (
          <div key={r.product_id} className="grid items-center gap-2 mb-1" style={{ gridTemplateColumns: '1.5fr 140px 100px' }}>
            <div>{r.name}</div>
            <Input type="number" value={r.price_cents} onChange={(e) => updateRow(idx, { price_cents: Number((e.target as HTMLInputElement).value) })} />
            <Checkbox checked={r.active} onChange={(e) => updateRow(idx, { active: (e.target as HTMLInputElement).checked })} />
          </div>
        ))}
        {rows.length === 0 && outletId && <div>No products</div>}
      </div>
    </div>
  );
}
