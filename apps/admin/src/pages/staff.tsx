import React from 'react';
import { useTenant } from '../lib/TenantProvider';
import { useAuth } from '../lib/AuthProvider';
import { Input, Checkbox, Button } from '@kasse/ui';

type Staff = {
  id: string;
  tenant_id: string;
  name: string;
  pin: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export default function Staff() {
  const { supa, tenantId, loading: tenantLoading, error: tenantError } = useTenant();
  const { signOut } = useAuth();
  const [items, setItems] = React.useState<Staff[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [manualTenantId, setManualTenantId] = React.useState('');

  // Load tenant ID from localStorage for manual input
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('tenant_id') || '';
      setManualTenantId(stored);
    }
  }, []);

  const [form, setForm] = React.useState<Omit<Staff, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>>({
    name: '',
    pin: '',
    active: true,
  });

  async function load() {
    if (!supa || !tenantId) return;
    setLoading(true);
    setError(null);
    const { data, error } = await supa
      .from('staff')
      .select('id,tenant_id,name,pin,active,created_at,updated_at')
      .eq('tenant_id', tenantId)
      .order('name');
    if (error) setError(error.message);
    setItems((data as any) || []);
    setLoading(false);
  }

  React.useEffect(() => {
    load();
  }, [supa, tenantId]);

  async function save() {
    if (!supa) return;
    if (!tenantId || tenantId.trim() === '') {
      setError('Keine Tenant-ID ausgewählt. Bitte geben Sie eine gültige Tenant-ID ein.');
      return;
    }
    if (!form.name.trim()) {
      setError('Bitte geben Sie einen Namen ein.');
      return;
    }
    if (!form.pin.trim()) {
      setError('Bitte geben Sie eine PIN ein.');
      return;
    }

    setLoading(true);
    setError(null);

    const { error } = await supa
      .from('staff')
      .insert({
        ...form,
        tenant_id: tenantId,
      });

    if (error) setError(error.message);
    else {
      setForm({ name: '', pin: '', active: true });
      await load();
    }
    setLoading(false);
  }

  async function update(id: string, updates: Partial<Staff>) {
    if (!supa) return;
    const { error } = await supa.from('staff').update(updates).eq('id', id);
    if (error) setError(error.message);
    else await load();
  }

  async function remove(id: string) {
    if (!supa) return;
    const { error } = await supa.from('staff').delete().eq('id', id);
    if (error) setError(error.message);
    else await load();
  }

  if (tenantLoading) return <div className="p-4">Loading...</div>;
  if (tenantError) return <div className="p-4 text-red-600">Error: {tenantError}</div>;

  return (
    <div className="p-4 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Mitarbeiterverwaltung</h1>
        <Button onClick={signOut} variant="outline">
          Abmelden
        </Button>
      </div>

      <div className="mb-4 text-sm text-gray-600">
        {tenantId && tenantId.trim() !== '' ? (
          <>Aktueller Tenant: <span className="font-mono">{tenantId}</span></>
        ) : (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded">
            <strong>Kein Tenant ausgewählt</strong>
            <div className="mt-2">
              Bitte melden Sie sich an oder geben Sie manuell eine Tenant-ID ein:
            </div>
            <div className="flex gap-2 mt-2">
              <Input
                placeholder="Tenant-ID eingeben"
                value={manualTenantId}
                onChange={(e) => setManualTenantId(e.target.value.trim())}
              />
              <Button 
                variant="outline"
                onClick={() => {
                  if (manualTenantId) {
                    localStorage.setItem('tenant_id', manualTenantId);
                    window.location.reload();
                  }
                }}
              >
                Übernehmen
              </Button>
            </div>
          </div>
        )}
      </div>

      {error && <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}

      {/* Add new staff form */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-3">Neuer Mitarbeiter</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Mitarbeitername"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">PIN</label>
            <Input
              value={form.pin}
              onChange={(e) => setForm({ ...form, pin: e.target.value })}
              placeholder="4-stelliger PIN"
              maxLength={4}
            />
          </div>
          <div className="flex items-end gap-2">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              <label className="text-sm font-medium">Aktiv</label>
            </div>
            <Button onClick={save} disabled={loading || !form.name.trim() || !form.pin.trim() || !tenantId || tenantId.trim() === ''}>
              Hinzufügen
            </Button>
          </div>
        </div>
      </div>

      {/* Staff list */}
      <div className="bg-white rounded-lg shadow">
        <div className="grid grid-cols-5 gap-4 p-4 font-medium border-b">
          <div>Name</div>
          <div>PIN</div>
          <div>Status</div>
          <div>Erstellt am</div>
          <div>Aktionen</div>
        </div>
        {loading ? (
          <div className="p-4 text-center">Loading...</div>
        ) : items.length === 0 ? (
          <div className="p-4 text-center text-gray-500">Keine Mitarbeiter gefunden</div>
        ) : (
          items.map((staff) => (
            <div key={staff.id} className="grid grid-cols-5 gap-4 p-4 border-b hover:bg-gray-50">
              <div className="font-medium">{staff.name}</div>
              <div className="font-mono">{staff.pin}</div>
              <div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={staff.active}
                    onChange={(e) => update(staff.id, { active: e.target.checked })}
                  />
                  <label className="text-sm font-medium">
                    {staff.active ? 'Aktiv' : 'Inaktiv'}
                  </label>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                {new Date(staff.created_at).toLocaleDateString('de-DE')}
              </div>
              <div>
                <Button
                  onClick={() => remove(staff.id)}
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Löschen
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
