import React from 'react';
import { RotateCcw } from 'lucide-react';
import StockMovementHistory from '../components/inventory/StockMovementHistory';
import { withPermission } from '../components/common/PermissionGuard';
import PageHeader from '@/components/common/PageHeader';

function InventoryMovementsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">

        <PageHeader
          icon={RotateCcw}
          title="Stock Movements"
          subtitle="সম্পূর্ণ লেনদেন ইতিহাস ও মুভমেন্ট ট্র্যাকিং"
          breadcrumb="Inventory / Stock Movements"
        />

        <StockMovementHistory />
      </div>
    </div>
  );
}

export default withPermission(InventoryMovementsPage, 'inventory_movements', 'can_view');