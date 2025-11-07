import React from 'react';
import { PrinterPlugin } from '../stubs/native';
import { getSettings, saveSettings, getTenantId, verifyPin } from '../settings';
import { createClient } from '@supabase/supabase-js';
import { useStore } from '../store';

export function Settings() {
  const { loadProducts } = useStore();
  const [s, setS] = React.useState(getSettings());
  const [pinTry, setPinTry] = React.useState('');
  const [pinOk, setPinOk] = React.useState<boolean | null>(null);
  const supaUrl = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
  const supaAnon = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string | undefined;
  const currentTenant = getTenantId();
  const [debugMsg, setDebugMsg] = React.useState<string>('');
  const [outlets, setOutlets] = React.useState<{ id: string; name: string }[]>([]);

  async function connectPrinter() {
    await PrinterPlugin.connect({ kind: 'lan', address: '192.168.1.50' });
  }

  function saveAll() {
    const next = saveSettings({ tenant_id: s.tenant_id, device_key: s.device_key, staff_pin: s.staff_pin, outlet_id: s.outlet_id });
    setS(next);
    // reload products to reflect new tenant immediately
    loadProducts();
  }

  function testPin() {
    setPinOk(verifyPin(pinTry));
  }

  async function debugFetch() {
    try {
      if (!supaUrl || !supaAnon || !currentTenant) {
        setDebugMsg('Missing env or tenant');
        return;
        }
      const supa = createClient(supaUrl, supaAnon, { auth: { persistSession: false }, global: { headers: { 'x-tenant-id': currentTenant } } });
      const { data, error } = await supa
        .from('products')
        .select('id')
        .eq('tenant_id', currentTenant)
        .eq('active', true)
        .limit(5);
      if (error) {
        setDebugMsg('Error: ' + (error.message || String(error)));
      } else {
        setDebugMsg('Fetched rows: ' + (data?.length ?? 0));
      }
    } catch (e: any) {
      setDebugMsg('Exception: ' + (e.message || String(e)));
    }
  }
  React.useEffect(() => {
    (async () => {
      if (!supaUrl || !supaAnon || !currentTenant) return;
      const supa = createClient(supaUrl, supaAnon, { auth: { persistSession: false }, global: { headers: { 'x-tenant-id': currentTenant } } });
      const { data } = await supa.from('outlets').select('id,name').order('name', { ascending: true });
      setOutlets((data || []) as any);
    })();
  }, [supaUrl, supaAnon, currentTenant]);
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-2">Settings</h1>
      <div className="grid gap-2 max-w-md mb-4">
        <label className="text-sm">Tenant ID
          <input className="border p-2 w-full" placeholder="tenant uuid"
                 value={s.tenant_id ?? ''}
                 onChange={(e) => setS({ ...s, tenant_id: e.target.value })} />
        </label>
        <label className="text-sm">Outlet
          <select className="border p-2 w-full" value={s.outlet_id ?? ''} onChange={(e) => setS({ ...s, outlet_id: e.target.value || null })}>
            <option value="">— none —</option>
            {outlets.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">Device Key
          <input className="border p-2 w-full" placeholder="optional device key"
                 value={s.device_key ?? ''}
                 onChange={(e) => setS({ ...s, device_key: e.target.value })} />
        </label>
        <label className="text-sm">Staff PIN
          <input className="border p-2 w-full" placeholder="optional pin"
                 value={s.staff_pin ?? ''}
                 onChange={(e) => setS({ ...s, staff_pin: e.target.value })} />
        </label>
        <button className="bg-green-600 text-white p-2 rounded" onClick={saveAll}>Save</button>
      </div>

      <div className="mb-4">
        <div className="font-semibold mb-1">Lock/Unlock Test</div>
        <div className="flex gap-2 items-center">
          <input className="border p-2" placeholder="enter PIN" value={pinTry} onChange={(e) => setPinTry(e.target.value)} />
          <button className="bg-gray-700 text-white p-2 rounded" onClick={testPin}>Verify</button>
          {pinOk !== null && (
            <span className={pinOk ? 'text-green-700' : 'text-red-700'}>{pinOk ? 'OK' : 'Wrong PIN'}</span>
          )}
        </div>
      </div>

      <div className="mb-4 border rounded p-3 bg-white">
        <div className="font-semibold mb-2">Status</div>
        <div className="text-sm space-y-1">
          <div>Supabase URL: {supaUrl ? <span className="text-green-700">ok</span> : <span className="text-red-700">missing</span>}</div>
          <div>Anon Key: {supaAnon ? <span className="text-green-700">ok</span> : <span className="text-red-700">missing</span>}</div>
          <div>Current Tenant: <span className="font-mono">{currentTenant || '—'}</span></div>
          <div className="flex gap-2 items-center mt-2">
            <button className="bg-gray-200 px-2 py-1 rounded" onClick={debugFetch}>Test fetch</button>
            {debugMsg && <span className="font-mono">{debugMsg}</span>}
          </div>
        </div>
      </div>

      <button className="bg-blue-600 text-white p-3 rounded" onClick={connectPrinter}>Connect Printer (Mock)</button>
    </div>
  );
}
