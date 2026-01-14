import React from 'react';
import { RotateCcw } from 'lucide-react';
import StockMovementHistory from '../components/inventory/StockMovementHistory';
import { withPermission } from '../components/common/PermissionGuard';

function InventoryMovementsPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="max-w-7xl mx-auto p-8 space-y-6">
        
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>Inventory</span>
          <span>/</span>
          <span className="text-slate-900 font-medium">Stock Movements</span>
        </div>

        {/* Premium Header Section */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
            <RotateCcw className="w-6 h-6 text-[#D32F2F]" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-[#111827] tracking-tight">Stock Movements</h1>
            <p className="text-sm text-[#6B7280] mt-0.5">সকল ইনভেন্টরি আইটেমের সম্পূর্ণ লেনদেন ইতিহাস ও মুভমেন্ট ট্র্যাকিং</p>
          </div>
        </div>

        <StockMovementHistory />
      </div>
    </div>
  );
}

export default withPermission(InventoryMovementsPage, 'inventory_movements', 'can_view');