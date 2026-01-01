import React from 'react';
import { RotateCcw } from 'lucide-react';
import StockMovementHistory from '../components/inventory/StockMovementHistory';
import { withPermission } from '../components/common/PermissionGuard';

function InventoryMovementsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <div className="max-w-7xl mx-auto p-8 space-y-8">
        {/* Premium Header Section */}
        <div className="flex items-start gap-4 pb-6 border-b border-slate-200">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 via-cyan-600 to-sky-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <RotateCcw className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Stock Movements</h1>
            <p className="text-slate-600 mt-1 text-base">সকল ইনভেন্টরি আইটেমের সম্পূর্ণ লেনদেন ইতিহাস ও মুভমেন্ট ট্র্যাকিং</p>
          </div>
        </div>

        <StockMovementHistory />
      </div>
    </div>
  );
}

export default withPermission(InventoryMovementsPage, 'inventory_movements', 'can_view');