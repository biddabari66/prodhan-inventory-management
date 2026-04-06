import React, { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScanLine, Truck, Package, Loader2 } from 'lucide-react';
import OrderBarcodeScanner from '../components/logistics/OrderBarcodeScanner';
import { toast } from 'sonner';

export default function LogisticsScan() {
  const queryClient = useQueryClient();

  // Load ALL recent orders — scanner needs full coverage to match any barcode
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['orders-logistics-all'],
    queryFn: async () => {
      // Load all order statuses that logistics may encounter
      const statuses = ['pending', 'on_hold', 'confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'call_not_received', 'follow_up', 'callback_requested'];
      const results = await Promise.all(
        statuses.map(s => base44.entities.Order.filter({ order_status: s }, '-order_date', 500).catch(() => []))
      );
      return results.flat();
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ['inventory-logistics'],
    queryFn: () => base44.entities.Inventory.filter({ department: 'prodhan_com_e_commerce' }, '-updated_date', 1000),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });

  const handleOrderShipped = async (order) => {
    await base44.entities.Order.update(order.id, { order_status: 'shipped' });
    // The existing automation `deductInventoryOnShip` handles inventory deduction
    // Invalidate caches after a delay to let automation finish
    queryClient.invalidateQueries({ queryKey: ['orders-logistics'] });
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['inventory-logistics'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    }, 3000);
  };

  const stats = useMemo(() => {
    let ready = 0, shipped = 0, pending = 0;
    orders.forEach(o => {
      if (['confirmed', 'processing', 'packed'].includes(o.order_status)) ready++;
      else if (o.order_status === 'shipped' || o.order_status === 'out_for_delivery') shipped++;
      else if (['pending', 'on_hold', 'call_not_received', 'follow_up', 'callback_requested'].includes(o.order_status)) pending++;
    });
    return { total: orders.length, ready, shipped, pending };
  }, [orders]);

  if (ordersLoading && orders.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-red-600 mx-auto" />
          <p className="text-slate-500">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <span>Dashboard</span>
        <span>/</span>
        <span className="text-slate-900 font-medium">Logistics Scan & Ship</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
            <ScanLine className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Scan & Ship</h1>
            <p className="text-sm text-slate-500 mt-0.5">Scan order barcodes to ship & auto-deduct inventory</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-l-4 border-l-blue-500 bg-white border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Package className="w-4 h-4 text-blue-500" />
              <p className="text-xs text-slate-500 uppercase font-medium">Ready to Ship</p>
            </div>
            <p className="text-2xl font-bold text-blue-600">{stats.ready}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 bg-white border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Truck className="w-4 h-4 text-emerald-500" />
              <p className="text-xs text-slate-500 uppercase font-medium">Shipped</p>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{stats.shipped}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-slate-400 bg-white border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <ScanLine className="w-4 h-4 text-slate-400" />
              <p className="text-xs text-slate-500 uppercase font-medium">Total Loaded</p>
            </div>
            <p className="text-2xl font-bold text-slate-600">{stats.total}</p>
          </CardContent>
        </Card>
      </div>

      {/* Scanner */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <OrderBarcodeScanner
            orders={orders}
            inventory={inventory}
            onOrderShipped={handleOrderShipped}
          />
        </CardContent>
      </Card>
    </div>
  );
}