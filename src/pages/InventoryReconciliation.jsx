import React from 'react';
import { Shield } from 'lucide-react';
import StockReconciliation from '../components/inventory/StockReconciliation';
import { withPermission } from '../components/common/PermissionGuard';

function InventoryReconciliationPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="max-w-7xl mx-auto p-8 space-y-6">
        
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>Inventory</span>
          <span>/</span>
          <span className="text-slate-900 font-medium">Stock Reconciliation</span>
        </div>

        {/* Premium Header Section */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
            <Shield className="w-6 h-6 text-[#D32F2F]" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-[#111827] tracking-tight">Stock Reconciliation</h1>
            <p className="text-sm text-[#6B7280] mt-0.5">ফিজিক্যাল কাউন্ট যাচাইকরণ এবং সিস্টেম নির্ভুলতা ব্যবস্থাপনা</p>
          </div>
        </div>

        <StockReconciliation />
      </div>
    </div>
  );
}

export default InventoryReconciliationPage;