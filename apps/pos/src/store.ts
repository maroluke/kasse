import create from 'zustand';
import { CartLine } from '@kasse/core';
import { createClient } from '@supabase/supabase-js';
import { getTenantId, getOutletId } from './settings';

interface State {
  products: { id: string; name: string; price_cents: number; deposit_cents: number; vat_rate: number; is_kitchen_item: boolean; category_id?: string | null }[];
  cart: CartLine[];
  pagerNumber: string | null;
  loadProducts: () => Promise<void>;
  addProductToCart: (p: State['products'][number]) => void;
  addDeposit: () => void;
  returnDeposit: () => void;
  clear: () => void;
  setPagerNumber: (v: string) => void;
  hasKitchenItems: () => boolean;
}

export const useStore = create<State>((set, get) => ({
  products: [],
  cart: [],
  pagerNumber: null,
  loadProducts: async () => {
    const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
    const tenantId = getTenantId() as string | null;
    const outletId = getOutletId() as string | null;
    if (!url || !anon || !tenantId) {
      set({ products: [
        { id: '1', name: 'Coffee', price_cents: 450, deposit_cents: 0, vat_rate: 2.5, is_kitchen_item: true, category_id: null },
        { id: '2', name: 'Bottle', price_cents: 300, deposit_cents: 500, vat_rate: 7.7, is_kitchen_item: false, category_id: null },
      ] });
      return;
    }
    const supa = createClient(url, anon, { auth: { persistSession: false }, global: { headers: { 'x-tenant-id': tenantId } } });
    let rows: any[] | null = null;
    if (outletId) {
      const { data, error } = await supa
        .from('products')
        .select('id,name,deposit_cents,vat_rate,is_kitchen_item,category_id, product_outlets!inner(price_cents,outlet_id)')
        .eq('tenant_id', tenantId)
        .eq('active', true)
        .eq('product_outlets.outlet_id', outletId)
        .order('name', { ascending: true });
      if (!error && data) rows = data.map((r: any) => ({
        id: r.id,
        name: r.name,
        price_cents: r.product_outlets?.price_cents ?? 0,
        deposit_cents: r.deposit_cents ?? 0,
        vat_rate: r.vat_rate ?? 0,
        is_kitchen_item: !!r.is_kitchen_item,
        category_id: r.category_id ?? null,
      }));
    }
    if (!rows) {
      const { data, error } = await supa
        .from('products')
        .select('id,name,price_cents,deposit_cents,vat_rate,is_kitchen_item,category_id')
        .eq('tenant_id', tenantId)
        .eq('active', true)
        .order('name', { ascending: true });
      if (!error && data) rows = data as any[];
    }
    if (!rows || rows.length === 0) {
      set({ products: [
        { id: '1', name: 'Coffee', price_cents: 450, deposit_cents: 0, vat_rate: 2.5, is_kitchen_item: true, category_id: null },
        { id: '2', name: 'Bottle', price_cents: 300, deposit_cents: 500, vat_rate: 7.7, is_kitchen_item: false, category_id: null },
      ] });
      return;
    }
    set({ products: rows as any });
  },
  addProductToCart: (p) => set((s) => {
    const lines: CartLine[] = [
      { kind: 'SALE', product_id: p.id, name: p.name, qty: 1, price_cents: p.price_cents, deposit_cents: 0, vat_rate: p.vat_rate },
    ];
    if (p.deposit_cents && p.deposit_cents !== 0) {
      lines.push({ kind: 'DEPOSIT_CHARGE', name: 'Pfand', qty: 1, price_cents: 0, deposit_cents: p.deposit_cents, vat_rate: p.vat_rate });
    }
    return { cart: [...s.cart, ...lines] };
  }),
  addDeposit: () => set((s) => ({
    cart: [...s.cart, { kind: 'DEPOSIT_CHARGE', name: 'Deposit', qty: 1, price_cents: 0, deposit_cents: 500, vat_rate: 0 }],
  })),
  returnDeposit: () => set((s) => ({
    cart: [...s.cart, { kind: 'DEPOSIT_REFUND', name: 'Deposit Refund', qty: 1, price_cents: 0, deposit_cents: -500, vat_rate: 0 }],
  })),
  clear: () => set({ cart: [], pagerNumber: null }),
  setPagerNumber: (v) => set({ pagerNumber: v }),
  hasKitchenItems: () => {
    const { cart, products } = get();
    const byId = new Map(products.map(p => [p.id, p] as const));
    return cart.some(l => l.kind==='SALE' && l.product_id && byId.get(l.product_id)?.is_kitchen_item);
  },
}));
