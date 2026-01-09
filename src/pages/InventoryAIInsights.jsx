import React, { useState, useEffect, useMemo } from 'react';
import { Inventory } from '@/entities/Inventory';
import { User } from '@/entities/User';
import { Card, CardContent } from '@/components/ui/card';
import { Brain, RefreshCw } from 'lucide-react';
import EnhancedAIInsights from '../components/inventory/EnhancedAIInsights';
import DepartmentFilter from '../components/inventory/DepartmentFilter';
import { withPermission } from '../components/common/PermissionGuard';
import { CacheManager } from '../components/common/PerformanceOptimizer';

function InventoryAIInsightsPage() {
  const [inventory, setInventory] = useState([]);
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
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const cachedUser = CacheManager.get('current_user');
      const cachedInventory = CacheManager.get('inventory_list');

      if (cachedUser && cachedInventory) {
        setCurrentUser(cachedUser);
        setInventory(cachedInventory);
        setIsLoading(false);
      }

      const [user, data] = await Promise.all([User.me(), Inventory.list()]);
      setCurrentUser(user);
      setInventory(data);
      CacheManager.set('current_user', user, 2 * 60 * 1000);
      CacheManager.set('inventory_list', data, 3 * 60 * 1000);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredInventory = useMemo(() => {
    if (!currentUser) return [];

    let filtered = inventory;

    if (!canViewAllDepartments) {
      filtered = filtered.filter(item => item.department === userDepartment);
    } else if (selectedDepartment !== 'all') {
      filtered = filtered.filter(item => item.department === selectedDepartment);
    }

    return filtered;
  }, [inventory, selectedDepartment, currentUser, canViewAllDepartments, userDepartment]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto p-8 space-y-8">
        {/* Premium Header Section */}
        <div className="flex flex-col gap-6 pb-6 border-b border-slate-200">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">AI Inventory Insights</h1>
              <p className="text-slate-600 mt-1 text-base">বুদ্ধিমান চাহিদা পূর্বাভাস, প্রেডিক্টিভ বিশ্লেষণ এবং স্বয়ংক্রিয় সুপারিশ</p>
            </div>
          </div>

          <Card className="bg-white border border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <DepartmentFilter
                currentUser={currentUser}
                selectedDepartment={selectedDepartment}
                onDepartmentChange={setSelectedDepartment}
              />
            </CardContent>
          </Card>
        </div>

        <EnhancedAIInsights department={selectedDepartment} inventoryItems={filteredInventory} />
      </div>
    </div>
  );
}

export default withPermission(InventoryAIInsightsPage, 'inventory_ai_insights', 'can_view');