export type PosSettings = {
  tenant_id: string | null;
  device_key: string | null;
  staff_pin: string | null;
  outlet_id: string | null;
  printer_ip?: string | null;
};

const KEY = 'pos_settings_v1';

export function getSettings(): PosSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { tenant_id: null, device_key: null, staff_pin: null, outlet_id: null, printer_ip: null };
    const v = JSON.parse(raw);
    return {
      tenant_id: v.tenant_id ?? null,
      device_key: v.device_key ?? null,
      staff_pin: v.staff_pin ?? null,
      outlet_id: v.outlet_id ?? null,
      printer_ip: v.printer_ip ?? null,
    };
  } catch {
    return { tenant_id: null, device_key: null, staff_pin: null, outlet_id: null, printer_ip: null };
  }
}

export function saveSettings(patch: Partial<PosSettings>) {
  const cur = getSettings();
  const next = { ...cur, ...patch } as PosSettings;
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function getTenantId(): string | null {
  const env = (import.meta as any).env?.VITE_POS_DEFAULT_TENANT_ID as string | undefined;
  const s = getSettings().tenant_id;
  return s || env || null;
}

export function getOutletId(): string | null {
  return getSettings().outlet_id;
}

export function getStaffPin(): string | null {
  return getSettings().staff_pin;
}

export function verifyPin(pin: string): boolean {
  const stored = getStaffPin();
  if (!stored) return true;
  return stored === pin;
}
