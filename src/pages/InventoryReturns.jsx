import React from 'react';
import { PackageX } from 'lucide-react';
import { withPermission } from '../components/common/PermissionGuard';

// ✅ Safe date helpers
export const safeFormatDate = (value, fallback = '—') => {
  if (!value) return fallback;
  const d = new Date(value);
  return isNaN(d.getTime()) ? fallback : d.toLocaleDateString();
};

export const safeFormatDateTime = (value, fallback = '—') => {
  if (!value) return fallback;
  const d = new Date(value);
  return isNaN(d.getTime()) ? fallback : d.toLocaleString();
};

// ✅ Main Page Component
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

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
            <PackageX className="w-5 h-5 sm:w-6 sm:h-6 text-[#D32F2F]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-semibold text-[#111827] tracking-tight">
              Returns & Damages
            </h1>
            <p className="text-xs sm:text-sm text-[#6B7280] mt-0.5">
              Complete tracking & management
            </p>
          </div>
        </div>

        {/* Placeholder — replace with your actual component when ready */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-8 flex flex-col items-center gap-3 text-center">
          <PackageX className="w-10 h-10 text-slate-300" />
          <p className="text-slate-500 text-sm">Returns & Damages management coming soon.</p>
        </div>

      </div>
    </div>
  );
}

// ✅ This was missing — fixes "does not provide an export named 'default'"
export default withPermission(InventoryReturnsPage, 'inventory_returns', 'can_view');