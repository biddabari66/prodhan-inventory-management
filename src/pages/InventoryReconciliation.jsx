import React from 'react';
import { Shield } from 'lucide-react';
import StockReconciliation from '../components/inventory/StockReconciliation';
import { withPermission } from '../components/common/PermissionGuard';

function InventoryReconciliationPage() {
  return (
    <div className="p-6 space-y-6">
      <header>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold font-display">Stock Reconciliation</h1>
            <p className="text-muted-foreground">Compare physical counts with system records and adjust discrepancies</p>
          </div>
        </div>
      </header>

      <StockReconciliation />
    </div>
  );
}

export default withPermission(InventoryReconciliationPage, 'inventory', 'can_edit');