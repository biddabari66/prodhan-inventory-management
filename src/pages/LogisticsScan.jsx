import React, { useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Inventory } from '@/entities/Inventory';
import { InventoryMovement } from '@/entities/InventoryMovement';
import { User } from '@/entities/User';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScanLine, Truck, Package, Loader2 } from 'lucide-react';
import OrderBarcodeScanner from '../components/logistics/OrderBarcodeScanner';
import { toast } from 'sonner';

export default function LogisticsScan() {
  const queryClient = useQueryClient();

  // Cached current user for audit trail (performed_by on movement records)
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => User.me(),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

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

  // ─────────────────────────────────────────────────────────────────────
  // INLINE INVENTORY DEDUCTION
  // Runs entirely in the browser — no Base44 automation, no integration
  // credits. Idempotent: if an InventoryMovement already exists for this
  // order_number with reference_type='sale', we skip.
  // Supports both the barcode flow (scanned_items[]) and the normal flow
  // (order_items[]) so it works identically to the Sales page deduction.
  // ─────────────────────────────────────────────────────────────────────
  const deductInventoryInline = useCallback(async (order) => {
    const result = { success: false, skipped: false, items_deducted: 0, errors: [] };

    try {
      if (!order || !order.order_number) {
        return { ...result, error: 'Order missing order_number' };
      }

      // 1. Idempotency — bail if any sale movement exists for this order
      let existing = [];
      try {
        const movements = await InventoryMovement.filter({ reference_number: order.order_number });
        existing = (movements || []).filter(m => m.reference_type === 'sale');
      } catch (err) {
        console.error('[deduct] idempotency check failed:', err);
        return { ...result, error: `Idempotency check failed: ${err.message}` };
      }
      if (existing.length > 0) {
        console.log(`[deduct] ${order.order_number}: already deducted (${existing.length} movements) — skip`);
        return { ...result, success: true, skipped: true };
      }

      // 2. Pick line items source (barcode flow wins when scanned_items[] present)
      const scanned = Array.isArray(order.scanned_items) ? order.scanned_items : [];
      const useBarcode = scanned.length > 0;
      const items = useBarcode ? scanned : (order.order_items || []);
      if (!Array.isArray(items) || items.length === 0) {
        return { ...result, success: true, skipped: true };
      }

      const today = new Date().toISOString().split('T')[0];
      const performedBy = currentUser?.email || order.created_by || 'system';

      // 3. Process each line item
      for (const item of items) {
        try {
          // Resolve inventory_id (multi-field fallback)
          let invId = '';
          if (useBarcode) {
            const barcode = item.barcode || item.sku || item.code || item.item_code || '';
            if (!barcode) {
              result.errors.push({ item: JSON.stringify(item), error: 'No barcode' });
              continue;
            }
            const hits = await Inventory.filter({ barcode });
            const hit = hits && hits[0];
            if (!hit) {
              result.errors.push({ item: barcode, error: 'Inventory not found by barcode' });
              continue;
            }
            invId = hit.id;
            item.inventory_id = hit.id;
            item.item_name = item.item_name || hit.item_name;
            item.quantity = item.quantity || 1;
            item.unit_price = item.unit_price || hit.selling_price || 0;
            item.selected_color = item.selected_color || item.color || null;
          } else {
            invId =
              item.inventory_id ||
              item.inventoryId ||
              item.product_id ||
              item.productId ||
              item.item_id ||
              (item.inventory && item.inventory.id) ||
              (item.product && item.product.id) ||
              '';
          }

          if (!invId) {
            result.errors.push({ item: item.item_name || 'unknown', error: 'No inventory_id' });
            continue;
          }

          const inv = await Inventory.get(invId);
          if (!inv) {
            result.errors.push({ item: item.item_name || invId, error: 'Inventory record not found' });
            continue;
          }

          // ── BUNDLE / COMBO ──
          if (inv.is_bundle && Array.isArray(inv.bundle_items) && inv.bundle_items.length > 0) {
            for (const bi of inv.bundle_items) {
              try {
                const cid = bi.inventory_id || bi.inventoryId || bi.product_id || bi.id || '';
                if (!cid) {
                  result.errors.push({ item: `Bundle component of "${inv.item_name}"`, error: 'No component id' });
                  continue;
                }
                const comp = await Inventory.get(cid);
                if (!comp) {
                  result.errors.push({ item: `Bundle component ${cid}`, error: 'Not found' });
                  continue;
                }
                const qty = (bi.quantity || 1) * (item.quantity || 1);
                const oldStock = comp.current_stock ?? 0;
                const newStock = Math.max(0, oldStock - qty);

                await Inventory.update(cid, {
                  current_stock: newStock,
                  last_sale_date: today,
                  total_sold: (comp.total_sold ?? 0) + qty,
                  status: newStock <= 0 ? 'out_of_stock'
                    : newStock <= (comp.minimum_stock || 0) ? 'low_stock' : 'active'
                });

                await InventoryMovement.create({
                  inventory_item_id: cid,
                  movement_type: 'out',
                  quantity: -qty,
                  reference_type: 'sale',
                  reference_id: order.id,
                  reference_number: order.order_number,
                  unit_cost: comp.purchase_price || 0,
                  total_value: -(qty * (comp.purchase_price || 0)),
                  performed_by: performedBy,
                  notes: `Scan&Ship deduct | Combo: ${inv.item_name} | Order: ${order.order_number}`,
                  movement_date: today,
                  balance_after: newStock
                });

                result.items_deducted++;
              } catch (e) {
                result.errors.push({ item: `Bundle component of ${inv.item_name}`, error: e.message });
              }
            }
            continue;
          }

          // ── REGULAR PRODUCT ──
          const qty = item.quantity || 1;
          const oldStock = inv.current_stock ?? 0;
          const newStock = Math.max(0, oldStock - qty);

          let updatedVariants = inv.color_variants;
          if (item.selected_color && Array.isArray(inv.color_variants) && inv.color_variants.length > 0) {
            updatedVariants = inv.color_variants.map(v =>
              v.color === item.selected_color
                ? { ...v, quantity: Math.max(0, (v.quantity ?? 0) - qty) }
                : v
            );
          }

          const updateData = {
            current_stock: newStock,
            last_sale_date: today,
            total_sold: (inv.total_sold ?? 0) + qty,
            status: newStock <= 0 ? 'out_of_stock'
              : newStock <= (inv.minimum_stock || 0) ? 'low_stock' : 'active'
          };
          if (updatedVariants) updateData.color_variants = updatedVariants;

          await Inventory.update(invId, updateData);

          await InventoryMovement.create({
            inventory_item_id: invId,
            movement_type: 'out',
            quantity: -qty,
            reference_type: 'sale',
            reference_id: order.id,
            reference_number: order.order_number,
            unit_cost: item.unit_price || 0,
            total_value: -(qty * (item.unit_price || 0)),
            performed_by: performedBy,
            notes: `Scan&Ship deduct | Order: ${order.order_number}${item.selected_color ? ` | Color: ${item.selected_color}` : ''}`,
            movement_date: today,
            balance_after: newStock
          });

          console.log(`[deduct] "${inv.item_name}": ${oldStock} - ${qty} = ${newStock}`);
          result.items_deducted++;
        } catch (itemErr) {
          console.error('[deduct] item error:', itemErr);
          result.errors.push({ item: item.item_name || 'unknown', error: itemErr.message });
        }
      }

      result.success = true;
      console.log(`[deduct] DONE ${order.order_number} | deducted=${result.items_deducted} | errors=${result.errors.length}`);
      return result;
    } catch (fatal) {
      console.error('[deduct] fatal:', fatal);
      return { ...result, error: fatal.message };
    }
  }, [currentUser]);

  // ─────────────────────────────────────────────────────────────────────
  // SHIP HANDLER — called by OrderBarcodeScanner when the user taps
  // "Ship Order" after scanning/verifying. No more automation dependency.
  // ─────────────────────────────────────────────────────────────────────
  const handleOrderShipped = async (order) => {
    const loadingToast = toast.loading(`Shipping ${order.order_number} & deducting inventory...`);

    try {
      // 1. Update status first so the order moves out of "Ready to Ship"
      await base44.entities.Order.update(order.id, { order_status: 'shipped' });

      // 2. Deduct inventory inline (idempotent — safe even if called twice)
      const deduction = await deductInventoryInline(order);

      toast.dismiss(loadingToast);

      if (!deduction.success) {
        toast.error(`Order shipped, but deduction FAILED: ${deduction.error}`);
        console.error('[Scan&Ship] Deduction failure for', order.order_number, deduction);
      } else if (deduction.skipped) {
        toast.success(`Order ${order.order_number} shipped! (Already deducted earlier)`);
      } else {
        const warn = deduction.errors.length ? ` — ${deduction.errors.length} warning(s), see console` : '';
        toast.success(`Order ${order.order_number} shipped! Deducted ${deduction.items_deducted} item(s)${warn}`);
        if (deduction.errors.length) {
          console.warn('[Scan&Ship] Partial deduction errors:', deduction.errors);
        }
      }

      // 3. Refresh caches so counts and stock numbers update
      queryClient.invalidateQueries({ queryKey: ['orders-logistics'] });
      queryClient.invalidateQueries({ queryKey: ['orders-logistics-all'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-logistics'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-sales'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    } catch (err) {
      toast.dismiss(loadingToast);
      console.error('[Scan&Ship] ship handler fatal:', err);
      toast.error(`Failed to ship ${order.order_number}: ${err.message}`);
    }
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