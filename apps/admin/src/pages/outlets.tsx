import React from 'react';
import { useTenant } from '../lib/TenantProvider';
import { Input, Checkbox, Button } from '@kasse/ui';

type Outlet = { id: string; tenant_id: string; name: string; active: boolean };

export default function Outlets() {
  const { supa, tenantId } = useTenant();
  const [items, setItems] = React.useState<Outlet[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<{ name: string; active: boolean }>({ name: '', active: true });
  const [dbgTenantHeader, setDbgTenantHeader] = React.useState<string | null>(null);
  const [dbgAuthUid, setDbgAuthUid] = React.useState<string | null>(null);

  async function load() {
    if (!supa || !tenantId) return;
    setLoading(true);
    setError(null);
    const { data, error } = await supa
      .from('outlets')
      .select('id,tenant_id,name,active')
      .eq('tenant_id', tenantId)
      .order('name');
    if (error) setError(error.message);
    setItems((data as any) || []);
    setLoading(false);
  }

  React.useEffect(() => { load(); /* eslint-disable-next-line */ }, [supa, tenantId]);

  async function loadDebug() {
    if (!supa) return;
    try {
      const a = await supa.rpc('debug_request_tenant');
      setDbgTenantHeader((a.data as any) ?? null);
    } catch {}
    try {
      const b = await supa.rpc('debug_auth_uid');
      setDbgAuthUid((b.data as any) ?? null);
    } catch {}
  }

  React.useEffect(() => { loadDebug(); /* eslint-disable-next-line */ }, [supa]);

  async function createOutlet() {
    if (!supa || !tenantId) return;
    const payload = { tenant_id: tenantId, name: form.name, active: form.active };
    const { error } = await supa.from('outlets').insert(payload);
    if (error) setError(error.message);
    setForm({ name: '', active: true });
    await load();
  }

  async function updateOutlet(id: string, patch: Partial<Outlet>) {
    if (!supa) return;
    const { error } = await supa.from('outlets').update(patch).eq('id', id);
    if (error) setError(error.message);
    await load();
  }

  async function deleteOutlet(id: string) {
    if (!supa) return;
    const { error } = await supa.from('outlets').delete().eq('id', id);
    if (error) setError(error.message);
    await load();
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold">Outlets</h1>
      <div className="mt-3 flex items-center gap-2">
        <div className="text-xs opacity-70">Tenant: {tenantId || '—'}</div>
        <Button variant="secondary" size="sm" onClick={load} disabled={loading || !tenantId}>Reload</Button>
        <Button size="sm" onClick={loadDebug} disabled={!supa}>Debug</Button>
        <div className="text-xs opacity-70">hdr.x-tenant-id: {dbgTenantHeader || '—'}</div>
        <div className="text-xs opacity-70">auth.uid: {dbgAuthUid || '—'}</div>
      </div>

      <div className="grid gap-2 max-w-[700px] mb-4 mt-4">
        <div className="font-semibold">New outlet</div>
        <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 120px 120px' }}>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" />
          <label className="flex items-center gap-1.5">
            <Checkbox checked={form.active} onChange={(e) => setForm({ ...form, active: (e.target as HTMLInputElement).checked })} />
            Active
          </label>
          <Button onClick={createOutlet} disabled={!tenantId}>Create</Button>
        </div>
      </div>

      {error && <div className="text-red-600 mb-2">{error}</div>}

      <div className={loading ? 'opacity-60' : ''}>
        <div className="grid gap-2 font-semibold mb-2" style={{ gridTemplateColumns: '1.5fr 120px 140px' }}>
          <div>Name</div>
          <div>Active</div>
          <div>Actions</div>
        </div>
        {items.map((o) => (
          <div key={o.id} className="grid items-center gap-2 mb-1" style={{ gridTemplateColumns: '1.5fr 120px 140px' }}>
            <Input value={o.name} onChange={(e) => updateOutlet(o.id, { name: e.target.value })} />
            <Checkbox checked={o.active} onChange={(e) => updateOutlet(o.id, { active: (e.target as HTMLInputElement).checked })} />
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => deleteOutlet(o.id)}>Delete</Button>
              <Button variant="secondary" size="sm" onClick={load}>Refresh</Button>
            </div>
          </div>
        ))}
        {(!tenantId) ? <div>Kein Tenant gesetzt.</div> : (items.length === 0 && <div>No outlets</div>)}
      </div>
    </div>
  );
}
