import React, { useState, useEffect, useMemo } from 'react';
import { Inventory } from '@/entities/Inventory';
import { User } from '@/entities/User';
import { Card, CardContent } from '@/components/ui/card';
import { Brain, RefreshCw } from 'lucide-react';
import AIInventoryInsights from '../components/inventory/AIInventoryInsights';
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
    <div className="p-6 space-y-6">
      <header>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold font-display">AI Inventory Insights</h1>
            <p className="text-muted-foreground">AI-powered demand forecasting and smart recommendations</p>
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

      <AIInventoryInsights department={selectedDepartment} inventoryItems={filteredInventory} />
    </div>
  );
}

export default withPermission(InventoryAIInsightsPage, 'inventory', 'can_view');