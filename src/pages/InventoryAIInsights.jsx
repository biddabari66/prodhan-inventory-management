import React, { useState, useEffect, useMemo } from 'react';
import { Inventory } from '@/entities/Inventory';
import { User } from '@/entities/User';
import { Card, CardContent } from '@/components/ui/card';
import { Brain, Loader2 } from 'lucide-react';
import EnhancedAIInsights from '../components/inventory/EnhancedAIInsights';
import { withPermission } from '../components/common/PermissionGuard';
import { CacheManager } from '../components/common/PerformanceOptimizer';

function InventoryAIInsightsPage() {
  const [inventory, setInventory] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const selectedDepartment = 'prodhan_com_e_commerce';

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
    return inventory.filter(item => item.department === 'prodhan_com_e_commerce');
  }, [inventory, currentUser]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mx-auto">
            <Loader2 className="w-6 h-6 animate-spin text-[#D32F2F]" />
          </div>
          <p className="text-slate-600 font-medium">Loading AI insights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="max-w-7xl mx-auto p-8 space-y-6">
        
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>Inventory</span>
          <span>/</span>
          <span className="text-slate-900 font-medium">AI Insights</span>
        </div>

        {/* Premium Header Section */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
            <Brain className="w-6 h-6 text-[#D32F2F]" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-[#111827] tracking-tight">AI Inventory Insights</h1>
            <p className="text-sm text-[#6B7280] mt-0.5">বুদ্ধিমান চাহিদা পূর্বাভাস, প্রেডিক্টিভ বিশ্লেষণ এবং স্বয়ংক্রিয় সুপারিশ</p>
          </div>
        </div>

        <EnhancedAIInsights department={selectedDepartment} inventoryItems={filteredInventory} />
      </div>
    </div>
  );
}

export default InventoryAIInsightsPage;