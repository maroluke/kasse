import React from 'react';
import { useTenant } from '../lib/TenantProvider';
import { useAuth } from '../lib/AuthProvider';
import { Input, Checkbox, Button, Select } from '@kasse/ui';

type Prod = {
  id: string;
  tenant_id: string;
  name: string;
  price_cents: number;
  deposit_cents: number;
  vat_rate: number;
  is_kitchen_item: boolean;
  active: boolean;
  category_id?: string | null;
};

export default function Products() {
  const { supa, tenantId, loading: tenantLoading, error: tenantError } = useTenant();
  const { signOut } = useAuth();
  const [items, setItems] = React.useState<Prod[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [form, setForm] = React.useState<Omit<Prod, 'id' | 'tenant_id'>>({
    name: '',
    price_cents: 0,
    deposit_cents: 0,
    vat_rate: 0,
    is_kitchen_item: false,
    active: true,
    category_id: null,
  });

  const [categories, setCategories] = React.useState<Array<{ id: string; name: string; active: boolean; sort_order: number }>>([]);

  async function load() {
    if (!supa || !tenantId) return;
    setLoading(true);
    setError(null);
    const { data, error } = await supa
      .from('products')
      .select('id,tenant_id,name,price_cents,deposit_cents,vat_rate,is_kitchen_item,active,category_id')
      .eq('tenant_id', tenantId)
      .order('name');
    if (error) setError(error.message);
    setItems((data as any) || []);
    setLoading(false);
  }

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, supa]);

  async function loadCategories() {
    if (!supa || !tenantId) return;
    const { data, error } = await supa
      .from('categories')
      .select('id,name,active,sort_order')
      .eq('tenant_id', tenantId)
      .eq('active', true)
      .order('sort_order')
      .order('name');
    if (!error) setCategories((data as any) || []);
  }

  React.useEffect(() => {
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, supa]);

  async function createProduct() {
    if (!tenantId) return;
    const insert = { ...form, tenant_id: tenantId } as any;
    if (!supa || !tenantId) return;
    const { error } = await supa.from('products').insert(insert);
    if (error) setError(error.message);
    setForm({ name: '', price_cents: 0, deposit_cents: 0, vat_rate: 0, is_kitchen_item: false, active: true, category_id: null });
    await load();
  }

  async function updateProduct(id: string, patch: Partial<Prod>) {
    if (!supa) return;
    const { error } = await supa.from('products').update(patch).eq('id', id);
    if (error) setError(error.message);
    await load();
  }

  async function deleteProduct(id: string) {
    if (!supa) return;
    const { error } = await supa.from('products').delete().eq('id', id);
    if (error) setError(error.message);
    await load();
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold">Products</h1>
      <div className="mt-3 flex items-center gap-2">
        <div className="text-xs opacity-70">Tenant: {tenantId || '—'}</div>
        <Button variant="secondary" size="sm" onClick={() => signOut()}>Logout</Button>
      </div>

      <div className="grid gap-2 max-w-[1100px] mb-4 mt-4">
        <div className="font-semibold">New product</div>
        <div className="grid gap-2 [grid-template-columns:1fr_180px_120px_120px_100px_120px_100px_100px]">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" />
          <Select value={form.category_id ?? ''} onChange={(e) => setForm({ ...form, category_id: e.target.value || null })}>
            <option value="">Keine Kategorie</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
          <Input type="number" value={form.price_cents} onChange={(e) => setForm({ ...form, price_cents: Number(e.target.value) })} placeholder="Price (cents)" />
          <Input type="number" value={form.deposit_cents} onChange={(e) => setForm({ ...form, deposit_cents: Number(e.target.value) })} placeholder="Deposit (cents)" />
          <Input type="number" step={0.1} value={form.vat_rate} onChange={(e) => setForm({ ...form, vat_rate: Number(e.target.value) })} placeholder="VAT %" />
          <label className="flex items-center gap-1.5">
            <Checkbox checked={form.is_kitchen_item} onChange={(e) => setForm({ ...form, is_kitchen_item: (e.target as HTMLInputElement).checked })} />
            Kitchen
          </label>
          <label className="flex items-center gap-1.5">
            <Checkbox checked={form.active} onChange={(e) => setForm({ ...form, active: (e.target as HTMLInputElement).checked })} />
            Active
          </label>
          <Button onClick={createProduct}>Create</Button>
        </div>
      </div>

      {(tenantError || error) && <div className="text-red-600 mb-2">{tenantError || error}</div>}

      <div className={loading || tenantLoading ? 'opacity-60' : ''}>
        <div className="grid gap-2 font-semibold mb-2 [grid-template-columns:1.5fr_180px_120px_120px_100px_100px_80px_140px]">
          <div>Name</div>
          <div>Category</div>
          <div>Price</div>
          <div>Deposit</div>
          <div>VAT%</div>
          <div>Kitchen</div>
          <div>Active</div>
          <div>Actions</div>
        </div>
        {items.map((p) => (
          <div key={p.id} className="grid items-center gap-2 mb-1 [grid-template-columns:1.5fr_180px_120px_120px_100px_100px_80px_140px]">
            <Input value={p.name} onChange={(e) => updateProduct(p.id, { name: e.target.value })} />
            <Select value={p.category_id ?? ''} onChange={(e) => updateProduct(p.id, { category_id: (e.target as HTMLSelectElement).value || null })}>
              <option value="">Keine Kategorie</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
            <Input type="number" value={p.price_cents} onChange={(e) => updateProduct(p.id, { price_cents: Number(e.target.value) })} />
            <Input type="number" value={p.deposit_cents} onChange={(e) => updateProduct(p.id, { deposit_cents: Number(e.target.value) })} />
            <Input type="number" step={0.1} value={p.vat_rate} onChange={(e) => updateProduct(p.id, { vat_rate: Number(e.target.value) })} />
            <Checkbox checked={p.is_kitchen_item} onChange={(e) => updateProduct(p.id, { is_kitchen_item: (e.target as HTMLInputElement).checked })} />
            <Checkbox checked={p.active} onChange={(e) => updateProduct(p.id, { active: (e.target as HTMLInputElement).checked })} />
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => deleteProduct(p.id)}>Delete</Button>
              <Button variant="secondary" size="sm" onClick={load}>Refresh</Button>
            </div>
          </div>
        ))}
        {items.length === 0 && <div>No products</div>}
      </div>
    </div>
  );
}
