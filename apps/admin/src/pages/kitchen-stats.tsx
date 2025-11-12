import React from 'react';
import { useTenant } from '../lib/TenantProvider';
import { useAuth } from '../lib/AuthProvider';
import { Button, Select } from '@kasse/ui';

type Staff = {
  id: string;
  name: string;
  pin: string;
  active: boolean;
};

type KitchenStats = {
  staff_id: string;
  staff_name: string;
  total_items: number;
  avg_prep_time_seconds: number;
  total_prep_time_seconds: number;
  items_today: number;
  avg_prep_time_today_seconds: number;
};

export default function KitchenStats() {
  const { supa, tenantId, loading: tenantLoading, error: tenantError } = useTenant();
  const { signOut } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [staff, setStaff] = React.useState<Staff[]>([]);
  const [selectedStaffId, setSelectedStaffId] = React.useState<string>('all');
  const [stats, setStats] = React.useState<KitchenStats[]>([]);

  async function loadStaff() {
    if (!supa || !tenantId) return;
    const { data, error } = await supa
      .from('staff')
      .select('id,name,pin,active')
      .eq('tenant_id', tenantId)
      .eq('active', true)
      .order('name');
    if (error) {
      // Error loading staff data
      setError('Failed to load staff');
    } else setStaff((data as any) || []);
  }

  async function loadStats() {
    if (!supa || !tenantId) return;
    setLoading(true);
    setError(null);

    // Get kitchen preparation statistics
    const query = supa
      .from('order_items')
      .select(`
        id,
        in_progress_at,
        ready_at,
        in_progress_by,
        ready_by,
        products!inner(name, is_kitchen_item),
        orders!inner(created_at)
      `)
      .eq('kind', 'SALE')
      .eq('products.is_kitchen_item', true)
      .not('in_progress_at', 'is', null)
      .not('ready_at', 'is', null)
      .order('in_progress_at', { ascending: false });

    const { data: itemsData, error: itemsError } = await query;

    if (itemsError) {
      setError(itemsError.message);
      setLoading(false);
      return;
    }

    const items = itemsData || [];
    
    // Calculate statistics per staff member
    const staffStats = new Map<string, KitchenStats>();
    const today = new Date().toDateString();

    // Initialize stats for all active staff
    staff.forEach(s => {
      staffStats.set(s.id, {
        staff_id: s.id,
        staff_name: s.name,
        total_items: 0,
        avg_prep_time_seconds: 0,
        total_prep_time_seconds: 0,
        items_today: 0,
        avg_prep_time_today_seconds: 0,
      });
    });

    // Process items and calculate stats
    items.forEach((item: any) => {
      const staffPin = item.ready_by || item.in_progress_by;
      if (!staffPin) return;

      // Find staff by PIN
      const staffMember = staff.find(s => s.pin === staffPin);
      if (!staffMember) return;

      const inProgress = new Date(item.in_progress_at);
      const ready = new Date(item.ready_at);
      const prepTimeSeconds = (ready.getTime() - inProgress.getTime()) / 1000;

      if (prepTimeSeconds < 0 || prepTimeSeconds > 3600) return; // Filter out invalid times (> 1 hour)

      const existing = staffStats.get(staffMember.id);
      if (!existing) return;

      // Update overall stats
      existing.total_items++;
      existing.total_prep_time_seconds += prepTimeSeconds;
      existing.avg_prep_time_seconds = existing.total_prep_time_seconds / existing.total_items;

      // Update today's stats
      const orderDate = new Date(item.orders.created_at).toDateString();
      if (orderDate === today) {
        existing.items_today++;
        existing.avg_prep_time_today_seconds = 
          (existing.avg_prep_time_today_seconds * (existing.items_today - 1) + prepTimeSeconds) / existing.items_today;
      }

      staffStats.set(staffMember.id, existing);
    });

    const statsArray = Array.from(staffStats.values())
      .filter(s => s.total_items > 0)
      .sort((a, b) => b.total_items - a.total_items);

    setStats(statsArray);
    setLoading(false);
  }

  React.useEffect(() => {
    loadStaff();
  }, [supa, tenantId]);

  React.useEffect(() => {
    if (staff.length > 0) {
      loadStats();
    }
  }, [staff]);

  const filteredStats = selectedStaffId === 'all' 
    ? stats 
    : stats.filter(s => s.staff_id === selectedStaffId);

  function formatTime(seconds: number): string {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  }

  if (tenantLoading) return <div className="p-4">Loading...</div>;
  if (tenantError) return <div className="p-4 text-red-600">Error: {tenantError}</div>;

  return (
    <div className="p-4 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Kitchen Statistiken</h1>
        <div className="flex gap-2">
          <Button onClick={loadStats} disabled={loading}>
            {loading ? 'Lädt...' : 'Aktualisieren'}
          </Button>
          <Button onClick={signOut} variant="outline">
            Abmelden
          </Button>
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}

      {/* Filter */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <div className="flex items-center gap-4">
          <label className="font-medium">Mitarbeiter:</label>
          <Select
            value={selectedStaffId}
            onChange={(e) => setSelectedStaffId(e.target.value)}
          >
            <option value="all">Alle Mitarbeiter</option>
            {staff.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
        </div>
      </div>

      {/* Statistics */}
      {filteredStats.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          {loading ? 'Lädt Daten...' : 'Keine Kitchen-Daten gefunden'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStats.map(stat => (
            <div key={stat.staff_id} className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">{stat.staff_name}</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Gesamte Items:</span>
                  <span className="font-medium">{stat.total_items}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Ø Zubereitungszeit:</span>
                  <span className="font-medium">{formatTime(stat.avg_prep_time_seconds)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Gesamtzeit:</span>
                  <span className="font-medium">{formatTime(stat.total_prep_time_seconds)}</span>
                </div>
                
                <div className="border-t pt-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Heute:</span>
                    <span className="font-medium">{stat.items_today} Items</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ø Zeit heute:</span>
                    <span className="font-medium">
                      {stat.items_today > 0 ? formatTime(stat.avg_prep_time_today_seconds) : '-'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {filteredStats.length > 1 && (
        <div className="mt-6 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3">Zusammenfassung</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-600">Gesamt Items</div>
              <div className="text-xl font-bold">
                {filteredStats.reduce((sum, s) => sum + s.total_items, 0)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Ø Zeit gesamt</div>
              <div className="text-xl font-bold">
                {formatTime(
                  filteredStats.reduce((sum, s) => sum + s.total_prep_time_seconds, 0) /
                  filteredStats.reduce((sum, s) => sum + s.total_items, 0)
                )}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Schnellster Mitarbeiter</div>
              <div className="text-xl font-bold">
                {filteredStats.reduce((fastest, current) => 
                  current.avg_prep_time_seconds < fastest.avg_prep_time_seconds ? current : fastest
                ).staff_name}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Meiste Items</div>
              <div className="text-xl font-bold">
                {filteredStats.reduce((most, current) => 
                  current.total_items > most.total_items ? current : most
                ).staff_name}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
