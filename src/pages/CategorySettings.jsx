import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import CategoryManagement from '@/components/inventory/CategoryManagement';
import { withPermission } from '@/components/common/PermissionGuard';
import { Loader2 } from 'lucide-react';

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
    <div className="p-6 max-w-7xl mx-auto">
      <CategoryManagement 
        userDepartment={userDepartment}
        isAdmin={isAdmin}
      />
    </div>
  );
}

export default withPermission(CategorySettingsPage, 'inventory_overview', 'can_edit');