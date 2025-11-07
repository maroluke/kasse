import React from 'react';
import { useTenant } from '../../lib/TenantProvider';
import { Input, Button, Label } from '@kasse/ui';

export default function VatSettings() {
  const { supa, tenantId } = useTenant();
  const [vatStandard, setVatStandard] = React.useState<number>(8.1);
  const [vatReduced, setVatReduced] = React.useState<number>(2.6);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  async function load() {
    if (!supa || !tenantId) return;
    setLoading(true);
    setError(null);
    setSaved(false);
    const { data, error } = await supa
      .from('tenant_settings')
      .select('vat_standard, vat_reduced')
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (error) setError(error.message);
    if (data) {
      setVatStandard(Number(data.vat_standard));
      setVatReduced(Number(data.vat_reduced));
    }
    setLoading(false);
  }

  React.useEffect(() => { load(); /* eslint-disable-next-line */ }, [supa, tenantId]);

  async function save() {
    if (!supa || !tenantId) return;
    setLoading(true);
    setError(null);
    const { error } = await supa
      .from('tenant_settings')
      .update({ vat_standard: vatStandard, vat_reduced: vatReduced })
      .eq('tenant_id', tenantId);
    if (error) setError(error.message);
    setSaved(!error);
    setLoading(false);
  }

  return (
    <div className="p-4 max-w-[520px]">
      <h1 className="text-xl font-semibold">VAT Settings</h1>
      {error && <div className="text-red-600 mt-2">{error}</div>}
      <div className={`grid gap-3 mt-4 ${loading ? 'opacity-60' : ''}`}>
        <div className="grid gap-1.5">
          <Label htmlFor="vat-standard">Standard VAT %</Label>
          <Input id="vat-standard" type="number" step={0.1} value={vatStandard} onChange={(e) => setVatStandard(Number(e.target.value))} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="vat-reduced">Reduced VAT %</Label>
          <Input id="vat-reduced" type="number" step={0.1} value={vatReduced} onChange={(e) => setVatReduced(Number(e.target.value))} />
        </div>
        <div className="flex gap-2">
          <Button onClick={save} disabled={loading || !tenantId}>Save</Button>
          <Button variant="secondary" onClick={load} disabled={loading}>Reload</Button>
          {saved && <span className="text-green-600">Saved</span>}
        </div>
      </div>
    </div>
  );
}
