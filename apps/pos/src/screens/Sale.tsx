import React from 'react';
import { useStore } from '../store';
import { calcTotals, renderReceipt } from '@kasse/core';
import { PaymentPlugin, PrinterPlugin } from '../stubs/native';
import { saveOrder } from '../db/repo';
import { syncOrderCreated } from '../sync';
import { getOutletId, getTenantId } from '../settings';
import { createClient } from '@supabase/supabase-js';

export function Sale() {
  const { products, cart, addProductToCart, addDeposit, returnDeposit, clear, loadProducts, pagerNumber, setPagerNumber, hasKitchenItems } = useStore();
  React.useEffect(() => { loadProducts(); }, [loadProducts]);
  const totals = calcTotals(cart);
  const outletId = getOutletId();
  const [categories, setCategories] = React.useState<Array<{ id: string; name: string }>>([]);
  const [selectedCat, setSelectedCat] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
      const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
      const tenantId = getTenantId();
      if (!url || !anon || !tenantId) return;
      const supa = createClient(url, anon, { auth: { persistSession: false }, global: { headers: { 'x-tenant-id': tenantId } } });
      const { data } = await supa
        .from('categories')
        .select('id,name')
        .eq('active', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
      setCategories(((data as any) || []) as Array<{ id: string; name: string }>);
    })();
  }, []);

  const filteredProducts = React.useMemo(() => {
    if (!selectedCat) return products;
    return products.filter((p) => (p as any).category_id === selectedCat);
  }, [products, selectedCat]);

  async function pay() {
    if (hasKitchenItems() && (!pagerNumber || pagerNumber.trim() === '')) {
      alert('Bitte Pager-Nummer eingeben, bevor bezahlt wird.');
      return;
    }
    await PaymentPlugin.initialize();
    await PaymentPlugin.collect(totals.grand_total_cents);
    await saveOrder({
      lines: cart,
      totals,
      payment: { method: 'card', amount_cents: totals.grand_total_cents, provider: 'mock', status: 'captured' },
    });
    // fire-and-forget sync to server (no blocking of POS UX)
    syncOrderCreated(cart, totals, { pager_number: pagerNumber || null, outlet_id: outletId || null }).catch((e) => console.warn('sync error', e));
    const receipt = renderReceipt(cart);
    await PrinterPlugin.print(receipt);
    clear();
  }

  return (
    <div className="p-4 grid grid-cols-3 gap-4">
      <div className="col-span-2">
        <h1 className="text-xl font-bold mb-2">Products</h1>
        {!outletId && (
          <div className="mb-3 p-2 rounded bg-amber-100 text-amber-900 text-sm">
            Tipp: Kein Outlet ausgewählt. Binde das Gerät in Settings an ein Outlet, um outlet-spezifische Preise zu laden.
          </div>
        )}
        {categories.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2 items-center">
            <button
              className={`px-3 py-1 rounded border ${!selectedCat ? 'bg-gray-900 text-white' : 'bg-white'}`}
              onClick={() => setSelectedCat(null)}
            >Alle</button>
            {categories.map((c) => (
              <button
                key={c.id}
                className={`px-3 py-1 rounded border ${selectedCat === c.id ? 'bg-gray-900 text-white' : 'bg-white'}`}
                onClick={() => setSelectedCat(c.id)}
              >{c.name}</button>
            ))}
          </div>
        )}
        <div className="grid grid-cols-3 gap-2">
          {filteredProducts.map((p) => (
            <button key={p.id} className="bg-blue-600 text-white p-3 rounded" onClick={() => addProductToCart(p)}>
              {p.name} {(p.price_cents / 100).toFixed(2)}
            </button>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <button className="bg-amber-600 text-white p-3 rounded" onClick={addDeposit}>Add Deposit +5.00</button>
          <button className="bg-amber-700 text-white p-3 rounded" onClick={returnDeposit}>Return Deposit -5.00</button>
        </div>
      </div>
      <div>
        <h2 className="text-lg font-semibold mb-2">Cart</h2>
        <div className="bg-gray-100 p-2 h-64 overflow-y-auto">
          {cart.map((l, idx) => (
            <div key={idx} className="flex justify-between border-b py-1 text-sm">
              <span>{l.name}</span>
              <span>{((l.kind === 'SALE' ? l.price_cents : l.deposit_cents) / 100).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 text-sm">
          <label className="block mb-1">Pager-Nummer {hasKitchenItems() ? <span className="text-red-600">(erforderlich)</span> : null}</label>
          <div className="flex gap-2">
            <input className="border rounded px-2 py-1 flex-1" inputMode="numeric" value={pagerNumber || ''} onChange={(e) => setPagerNumber(e.target.value)} placeholder="z.B. 21" />
            <button className="px-3 py-1 border rounded" onClick={() => alert('NFC-Scan folgt – späteres Update')}>Per NFC</button>
          </div>
        </div>
        <div className="mt-2 text-sm">
          <div>Sales: {(totals.sale_total_cents / 100).toFixed(2)}</div>
          <div>Deposits: {(totals.deposit_total_cents / 100).toFixed(2)}</div>
          <div>VAT: {(totals.vat_total_cents / 100).toFixed(2)}</div>
          <div className="font-bold">Total: {(totals.grand_total_cents / 100).toFixed(2)}</div>
        </div>
        <div className="mt-4 flex gap-2">
          <button className="bg-green-600 text-white p-3 rounded" onClick={pay}>Pay</button>
          <button className="bg-gray-600 text-white p-3 rounded" onClick={async () => {
            const receipt = renderReceipt(cart);
            await PrinterPlugin.print(receipt);
          }}>Print</button>
        </div>
      </div>
    </div>
  );
}
