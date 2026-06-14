import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import CategoryManagement from '@/components/inventory/CategoryManagement';
import { withPermission } from '@/components/common/PermissionGuard';
import PageHeader from '@/components/common/PageHeader';
import { Loader2, Package } from 'lucide-react';

function CategorySettingsPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await erp.auth.me();
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
        <PageHeader
          icon={Package}
          title="Category Management"
          subtitle="প্রোডাক্ট ক্যাটাগরি এবং বই সাবজেক্ট পরিচালনা"
          breadcrumb="Inventory / Categories"
        />

        <CategoryManagement 
          userDepartment={userDepartment}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );
}

export default withPermission(CategorySettingsPage, 'inventory_overview', 'can_edit');