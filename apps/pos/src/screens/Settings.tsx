import React from 'react';
import { PrinterPlugin } from '../printer/PrinterPlugin';
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
  const [outlets, setOutlets] = React.useState<{ id: string; name: string }[]>([]);

  async function connectPrinter() {
    const ip = s.printer_ip?.trim();
    if (!ip) {
      alert('Bitte Drucker-IP in den Einstellungen eingeben.');
      return;
    }
    
    try {
      const result = await PrinterPlugin.connect({ kind: 'lan', address: ip });
      alert('Drucker erfolgreich verbunden!');
    } catch (e: any) {
      alert('Verbindung fehlgeschlagen: ' + e.message);
    }
  }

  function saveAll() {
    const next = saveSettings({ tenant_id: s.tenant_id, device_key: s.device_key, staff_pin: s.staff_pin, outlet_id: s.outlet_id, printer_ip: s.printer_ip });
    setS(next);
    // reload products to reflect new tenant immediately
    loadProducts();
  }

  function testPin() {
    setPinOk(verifyPin(pinTry));
  }

  function logout() {
    // Clear all settings
    localStorage.removeItem('tenant_id');
    localStorage.removeItem('device_key');
    localStorage.removeItem('staff_pin');
    localStorage.removeItem('outlet_id');
    
    // Reset form to defaults
    setS({
      tenant_id: '',
      device_key: '',
      staff_pin: '',
      outlet_id: null,
    });
    
    // Reload products to clear tenant-specific data
    loadProducts();
  }

  async function debugFetch() {
    try {
      if (!supaUrl || !supaAnon || !currentTenant) {
        alert('Missing env or tenant');
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
        alert('Error: ' + (error.message || String(error)));
      } else {
        alert('Fetched rows: ' + (data?.length ?? 0));
      }
    } catch (e: any) {
      alert('Exception: ' + (e.message || String(e)));
    }
  }
  React.useEffect(() => {
    (async () => {
      if (!supaUrl || !supaAnon || !currentTenant) return;
      const supa = createClient(supaUrl, supaAnon, { auth: { persistSession: false }, global: { headers: { 'x-tenant-id': currentTenant } } });
      const { data } = await supa
        .from('outlets')
        .select('id,name')
        .eq('active', true)
        .order('name', { ascending: true });
      setOutlets((data || []) as any);
    })();
  }, [supaUrl, supaAnon, currentTenant]);
  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold mb-4">Einstellungen</h1>
      
      <div className="space-y-4">
        {/* Configuration Form */}
        <div className="bg-card rounded-lg p-4 border">
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium mb-2 block">Tenant ID</span>
              <input 
                className="border rounded-lg p-3 w-full text-sm" 
                placeholder="tenant uuid"
                value={s.tenant_id ?? ''}
                onChange={(e) => setS({ ...s, tenant_id: e.target.value })} 
              />
            </label>
            
            <label className="block">
              <span className="text-sm font-medium mb-2 block">Outlet</span>
              <select 
                className="border rounded-lg p-3 w-full text-sm" 
                value={s.outlet_id ?? ''} 
                onChange={(e) => setS({ ...s, outlet_id: e.target.value || null })}
              >
                <option value="">— none —</option>
                {outlets.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </label>
            
            <label className="block">
              <span className="text-sm font-medium mb-2 block">Device Key</span>
              <input 
                className="border rounded-lg p-3 w-full text-sm" 
                placeholder="optional device key"
                value={s.device_key ?? ''}
                onChange={(e) => setS({ ...s, device_key: e.target.value })} 
              />
            </label>
            
            <label className="block">
              <span className="text-sm font-medium mb-2 block">Drucker IP-Adresse</span>
              <input 
                className="border rounded-lg p-3 w-full text-sm" 
                placeholder="z.B. 192.168.1.100"
                value={s.printer_ip ?? ''}
                onChange={(e) => setS({ ...s, printer_ip: e.target.value })} 
              />
            </label>
            
            <label className="block">
              <span className="text-sm font-medium mb-2 block">Staff PIN</span>
              <input 
                className="border rounded-lg p-3 w-full text-sm" 
                placeholder="optional pin"
                value={s.staff_pin ?? ''}
                onChange={(e) => setS({ ...s, staff_pin: e.target.value })} 
              />
            </label>
            
            <button 
              className="touch-button bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors w-full font-medium" 
              onClick={saveAll}
            >
              Speichern
            </button>
          </div>
        </div>

        {/* PIN Test */}
        <div className="bg-card rounded-lg p-4 border">
          <div className="font-semibold mb-3">Sperren/Entsperren Test</div>
          <div className="flex gap-2 items-center">
            <input 
              className="border rounded-lg p-3 text-sm flex-1" 
              placeholder="PIN eingeben" 
              value={pinTry} 
              onChange={(e) => setPinTry(e.target.value)} 
            />
            <button 
              className="touch-button bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors px-4" 
              onClick={testPin}
            >
              Prüfen
            </button>
            {pinOk !== null && (
              <span className={`text-sm font-medium ${pinOk ? 'text-green-600' : 'text-destructive'}`}>
                {pinOk ? '✓ OK' : '✗ Falsche PIN'}
              </span>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="bg-card rounded-lg p-4 border">
          <div className="font-semibold mb-3">Status</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span>Supabase URL:</span>
              <span className={supaUrl ? 'text-green-600' : 'text-destructive'}>
                {supaUrl ? '✓ OK' : '✗ fehlt'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Anon Key:</span>
              <span className={supaAnon ? 'text-green-600' : 'text-destructive'}>
                {supaAnon ? '✓ OK' : '✗ fehlt'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Aktueller Tenant:</span>
              <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                {currentTenant || '—'}
              </span>
            </div>
            <div className="flex gap-2 items-center pt-2">
              <button 
                className="touch-button bg-muted hover:bg-muted/80 transition-colors px-3 py-2 rounded text-sm" 
                onClick={debugFetch}
              >
                Test abrufen
              </button>
            </div>
          </div>
        </div>

        {/* Printer Actions */}
        <div className="space-y-3">
          <button 
            className="touch-button bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors w-full font-medium" 
            onClick={connectPrinter}
          >
            Drucker verbinden
          </button>
          
          <button 
            className="touch-button bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors w-full font-medium" 
            onClick={logout}
          >
            Ausloggen / Zurücksetzen
          </button>
        </div>
      </div>
    </div>
  );
}
