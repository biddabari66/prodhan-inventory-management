import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import CategoryManagement from '@/components/inventory/CategoryManagement';
import { withPermission } from '@/components/common/PermissionGuard';
import { Loader2, Package } from 'lucide-react';

function CategorySettingsPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  const isAdmin = currentUser?.role === 'admin' || currentUser?.job_role === 'admin' || currentUser?.job_role === 'super_admin';
  const userDepartment = currentUser?.department || 'prodhan_com_e_commerce';

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>Inventory</span>
          <span>/</span>
          <span className="text-slate-900 font-medium">Categories</span>
        </div>

        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
            <Package className="w-6 h-6 text-[#D32F2F]" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-[#111827] tracking-tight">Category Management</h1>
            <p className="text-sm text-[#6B7280] mt-0.5">প্রোডাক্ট ক্যাটাগরি এবং বই সাবজেক্ট পরিচালনা</p>
          </div>
        </div>

        <CategoryManagement 
          userDepartment={userDepartment}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );
}

export default withPermission(CategorySettingsPage, 'inventory_overview', 'can_edit');