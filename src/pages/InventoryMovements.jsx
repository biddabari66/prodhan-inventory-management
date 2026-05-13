import React from 'react';
import { RotateCcw } from 'lucide-react';
import StockMovementHistory from '../components/inventory/StockMovementHistory';
import { withPermission } from '../components/common/PermissionGuard';

function InventoryMovementsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Inventory</span>
          <span>/</span>
          <span className="text-foreground font-medium">Stock Movements</span>
        </div>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-red-50 dark:bg-red-950/50 flex items-center justify-center flex-shrink-0">
            <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">Stock Movements</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 truncate">সম্পূর্ণ লেনদেন ইতিহাস ও মুভমেন্ট ট্র্যাকিং</p>
          </div>
        </div>

        <StockMovementHistory />
      </div>
    </div>
  );
}

export default withPermission(InventoryMovementsPage, 'inventory_movements', 'can_view');