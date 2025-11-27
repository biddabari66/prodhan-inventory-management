import React from 'react';
import { Shield } from 'lucide-react';
import StockReconciliation from '../components/inventory/StockReconciliation';
import { withPermission } from '../components/common/PermissionGuard';

function InventoryReconciliationPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50">
      <div className="max-w-7xl mx-auto p-8 space-y-8">
        {/* Premium Header Section */}
        <div className="flex items-start gap-4 pb-6 border-b border-slate-200">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 via-green-600 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Stock Reconciliation</h1>
            <p className="text-slate-600 mt-1 text-base">ফিজিক্যাল কাউন্ট যাচাইকরণ এবং সিস্টেম নির্ভুলতা ব্যবস্থাপনা</p>
          </div>
        </div>

        <StockReconciliation />
      </div>
    </div>
  );
}

export default withPermission(InventoryReconciliationPage, 'inventory', 'can_edit');