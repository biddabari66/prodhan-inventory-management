import React, { useState, useEffect } from 'react';
import { User } from '@/entities/User';
import { Card, CardContent } from '@/components/ui/card';
import { PackageX, RefreshCw } from 'lucide-react';
import ReturnDamageManagement from '../components/inventory/ReturnDamageManagement';
import DepartmentFilter from '../components/inventory/DepartmentFilter';
import { withPermission } from '../components/common/PermissionGuard';
import { CacheManager } from '../components/common/PerformanceOptimizer';

function InventoryReturnsPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState('all');

  const canViewAllDepartments = currentUser?.job_role === 'super_admin' ||
                                 currentUser?.job_role === 'admin' ||
                                 currentUser?.job_role === 'inventory_manager';

  const userDepartment = canViewAllDepartments ? 'all' : (currentUser?.department || 'all');

  useEffect(() => {
    if (currentUser && !canViewAllDepartments) {
      setSelectedDepartment(userDepartment);
    }
  }, [currentUser, canViewAllDepartments, userDepartment]);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    setIsLoading(true);
    try {
      const cachedUser = CacheManager.get('current_user');
      if (cachedUser) {
        setCurrentUser(cachedUser);
        setIsLoading(false);
      }

      const user = await User.me();
      setCurrentUser(user);
      CacheManager.set('current_user', user, 2 * 60 * 1000);
    } catch (error) {
      console.error("Error loading user:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <header>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center">
            <PackageX className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold font-display">Returns & Damages</h1>
            <p className="text-muted-foreground">Track product returns, damages, and write-offs</p>
          </div>
        </div>

        <Card className="premium-card">
          <CardContent className="p-4">
            <DepartmentFilter
              currentUser={currentUser}
              selectedDepartment={selectedDepartment}
              onDepartmentChange={setSelectedDepartment}
            />
          </CardContent>
        </Card>
      </header>

      <ReturnDamageManagement selectedDepartment={selectedDepartment} />
    </div>
  );
}

export default withPermission(InventoryReturnsPage, 'inventory', 'can_view');