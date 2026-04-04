import React from 'react';
import { PackageX } from 'lucide-react';
import ReturnDamageManagement from '../components/inventory/ReturnDamageManagement';
import { withPermission } from '../components/common/PermissionGuard';

function InventoryReturnsPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="max-w-7xl mx-auto px-2 py-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-5">
        
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500">
          <span>Inventory</span>
          <span>/</span>
          <span className="text-slate-900 font-medium">Returns & Damages</span>
        </div>

        {/* Professional Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
            <PackageX className="w-5 h-5 sm:w-6 sm:h-6 text-[#D32F2F]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-semibold text-[#111827] tracking-tight">Returns & Damages</h1>
            <p className="text-xs sm:text-sm text-[#6B7280] mt-0.5">Complete tracking & management</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl border-0 shadow-sm overflow-hidden">
          <div className="p-2 sm:p-4 lg:p-6">
            <ReturnDamageManagement 
              selectedDepartment="prodhan_com_e_commerce" 
              defaultTab="returns"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default withPermission(InventoryReturnsPage, 'inventory_returns', 'can_view');