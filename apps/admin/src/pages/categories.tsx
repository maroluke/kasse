import React from 'react';
import { useTenant } from '../lib/TenantProvider';
import { Input, Checkbox, Button } from '@kasse/ui';

export default function Categories() {
  const { supa, tenantId } = useTenant();
  const [items, setItems] = React.useState<Array<{ id: string; name: string; sort_order: number; active: boolean }>>([]);
  const [form, setForm] = React.useState<{ name: string; sort_order: number; active: boolean }>({ name: '', sort_order: 0, active: true });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function load() {
    if (!supa || !tenantId) return;
    setLoading(true);
    setError(null);
    const { data, error } = await supa
      .from('categories')
      .select('id,name,sort_order,active')
      .eq('tenant_id', tenantId)
      .order('sort_order')
      .order('name');
    if (error) setError(error.message);
    setItems((data as any) || []);
    setLoading(false);
  }

  React.useEffect(() => { load(); /* eslint-disable-next-line */ }, [supa, tenantId]);

  async function createCat() {
    if (!supa || !tenantId) return;
    const { error } = await supa.from('categories').insert({ tenant_id: tenantId, ...form });
    if (error) setError(error.message);
    setForm({ name: '', sort_order: 0, active: true });
    await load();
  }

  async function updateCat(id: string, patch: Partial<{ name: string; sort_order: number; active: boolean }>) {
    if (!supa) return;
    const { error } = await supa.from('categories').update(patch).eq('id', id);
    if (error) setError(error.message);
    await load();
  }

  async function deleteCat(id: string) {
    if (!supa) return;
    const { error } = await supa.from('categories').delete().eq('id', id);
    if (error) setError(error.message);
    await load();
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold">Categories</h1>
      <div className="grid gap-2 max-w-[700px] mb-4 mt-4">
        <div className="font-semibold">New category</div>
        <div className="grid gap-2 [grid-template-columns:1fr_120px_100px_120px]">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" />
          <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} placeholder="Sort" />
          <label className="flex items-center gap-1.5">
            <Checkbox checked={form.active} onChange={(e) => setForm({ ...form, active: (e.target as HTMLInputElement).checked })} />
            Active
          </label>
          <Button onClick={createCat}>Create</Button>
        </div>
      </div>

      {error && <div className="text-red-600 mb-2">{error}</div>}

      <div className={loading ? 'opacity-60' : ''}>
        <div className="grid gap-2 font-semibold mb-2 [grid-template-columns:1fr_120px_100px_140px]">
          <div>Name</div>
          <div>Sort</div>
          <div>Active</div>
          <div>Actions</div>
        </div>
        {items.map((c) => (
          <div key={c.id} className="grid items-center gap-2 mb-1 [grid-template-columns:1fr_120px_100px_140px]">
            <Input value={c.name} onChange={(e) => updateCat(c.id, { name: e.target.value })} />
            <Input type="number" value={c.sort_order} onChange={(e) => updateCat(c.id, { sort_order: Number(e.target.value) })} />
            <Checkbox checked={c.active} onChange={(e) => updateCat(c.id, { active: (e.target as HTMLInputElement).checked })} />
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => deleteCat(c.id)}>Delete</Button>
              <Button variant="secondary" size="sm" onClick={load}>Refresh</Button>
            </div>
          </div>
        ))}
        {items.length === 0 && <div>No categories</div>}
      </div>
    </div>
  );
}
