import React from 'react';
import { useStore } from '../store';
import { calcTotals, renderReceipt } from '@kasse/core';
import { PaymentPlugin } from '../stubs/native';
import { PrinterPlugin } from '../printer/PrinterPlugin';
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
    <div className="flex flex-col h-screen p-3 gap-3">
      {/* Header */}
      <div className="flex-shrink-0">
        <h1 className="text-xl font-bold">Kasse</h1>
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div className="flex-shrink-0">
          <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
            <button
              className={`category-pill flex-shrink-0 ${!selectedCat ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted'}`}
              onClick={() => setSelectedCat(null)}
            >Alle</button>
            {categories.map((c) => (
              <button
                key={c.id}
                className={`category-pill flex-shrink-0 ${selectedCat === c.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted'}`}
                onClick={() => setSelectedCat(c.id)}
              >{c.name}</button>
            ))}
          </div>
        </div>
      )}

      {/* Warning */}
      {!outletId && (
        <div className="flex-shrink-0 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          ⚠️ Kein Outlet ausgewählt
        </div>
      )}

      {/* Products Grid - takes remaining space */}
      <div className="flex-1 min-h-0">
        <div className="h-full overflow-y-auto hide-scrollbar">
          <div className="product-grid-mobile pb-3">
            {filteredProducts.map((p) => (
              <button 
                key={p.id} 
                className="touch-button bg-primary text-primary-foreground rounded-lg shadow-sm hover:shadow-md transition-shadow flex flex-col items-center justify-center text-center p-4 min-h-[80px]" 
                onClick={() => addProductToCart(p)}
              >
                <div className="font-medium text-sm leading-tight">{p.name}</div>
                <div className="text-xs opacity-90 mt-1">€{(p.price_cents / 100).toFixed(2)}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section - Cart */}
      <div className="flex-shrink-0 border-t pt-3">
        <div className="flex gap-3">
          {/* Cart Items */}
          <div className="flex-1 min-w-0">
            <div className="bg-muted rounded-lg p-3 h-32 overflow-y-auto hide-scrollbar mb-2">
              {cart.length === 0 ? (
                <div className="text-muted-foreground text-center text-sm">Warenkorb leer</div>
              ) : (
                <div className="space-y-1">
                  {cart.map((l, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <span className="truncate flex-1 mr-2">{l.name}</span>
                      <span className="font-mono text-xs">€{((l.kind === 'SALE' ? l.price_cents : l.deposit_cents) / 100).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Pager Input */}
            <div className="mb-2">
              <input 
                className="w-full border rounded-lg px-3 py-2 text-sm" 
                inputMode="numeric" 
                value={pagerNumber || ''} 
                onChange={(e) => setPagerNumber(e.target.value)} 
                placeholder="Pager-Nummer" 
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 w-32">
            <div className="text-center">
              <div className="font-bold text-lg">€{(totals.grand_total_cents / 100).toFixed(2)}</div>
            </div>
            <button 
              className="touch-button bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex-1" 
              onClick={pay}
              disabled={cart.length === 0}
            >
              Bezahlen
            </button>
            <button 
              className="touch-button bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm" 
              onClick={addDeposit}
            >
              +Pfand
            </button>
            <button 
              className="touch-button bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors text-sm" 
              onClick={async () => {
                const receipt = renderReceipt(cart);
                await PrinterPlugin.print(receipt);
              }}
              disabled={cart.length === 0}
            >
              Drucken
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
