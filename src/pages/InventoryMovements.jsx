import React from 'react';
import { RotateCcw } from 'lucide-react';
import StockMovementHistory from '../components/inventory/StockMovementHistory';
import { withPermission } from '../components/common/PermissionGuard';

function InventoryMovementsPage() {
  return (
    <div className="p-6 space-y-6">
      <header>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <RotateCcw className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold font-display">Stock Movements</h1>
            <p className="text-muted-foreground">Track all inventory movement transactions</p>
          </div>
        </div>
      </header>

      <StockMovementHistory />
    </div>
  );
}

export default withPermission(InventoryMovementsPage, 'inventory', 'can_view');