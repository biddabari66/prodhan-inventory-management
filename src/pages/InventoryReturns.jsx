import React, { useState, useEffect } from 'react';
import { User } from '@/entities/User';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  PackageX, RefreshCw, RotateCcw, AlertOctagon, TrendingDown, 
  DollarSign, Building2, ChevronRight, ArrowLeft
} from 'lucide-react';
import ReturnDamageManagement from '../components/inventory/ReturnDamageManagement';
import DepartmentFilter from '../components/inventory/DepartmentFilter';
import { withPermission } from '../components/common/PermissionGuard';
import { CacheManager } from '../components/common/PerformanceOptimizer';

function InventoryReturnsPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard' | 'returns' | 'damages'

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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <RefreshCw className="w-10 h-10 animate-spin text-violet-600 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-7xl mx-auto p-6 lg:p-8 space-y-6">
        
        {/* Professional Header */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <PackageX className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">রিটার্ন ও ক্ষতি ব্যবস্থাপনা</h1>
              <p className="text-slate-500 text-sm mt-0.5">সম্পূর্ণ ট্র্যাকিং ও ব্যবস্থাপনা</p>
            </div>
          </div>
        </div>

        {/* Quick Navigation Cards - Professional Business Style */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Returns Card */}
          <Card 
            className={`cursor-pointer transition-all duration-300 hover:shadow-lg border-2 ${
              activeView === 'returns' 
                ? 'border-blue-500 bg-blue-50 shadow-blue-100' 
                : 'border-slate-200 hover:border-blue-300'
            }`}
            onClick={() => setActiveView('returns')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    activeView === 'returns' ? 'bg-blue-500' : 'bg-blue-100'
                  }`}>
                    <RotateCcw className={`w-6 h-6 ${activeView === 'returns' ? 'text-white' : 'text-blue-600'}`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Product Returns</h3>
                    <p className="text-sm text-slate-500">Customer & supplier returns</p>
                  </div>
                </div>
                <ChevronRight className={`w-5 h-5 ${activeView === 'returns' ? 'text-blue-600' : 'text-slate-400'}`} />
              </div>
              
              <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">This Month</p>
                  <p className="text-2xl font-bold text-blue-600">--</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Value</p>
                  <p className="text-2xl font-bold text-slate-900">৳--</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Damages Card */}
          <Card 
            className={`cursor-pointer transition-all duration-300 hover:shadow-lg border-2 ${
              activeView === 'damages' 
                ? 'border-red-500 bg-red-50 shadow-red-100' 
                : 'border-slate-200 hover:border-red-300'
            }`}
            onClick={() => setActiveView('damages')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    activeView === 'damages' ? 'bg-red-500' : 'bg-red-100'
                  }`}>
                    <AlertOctagon className={`w-6 h-6 ${activeView === 'damages' ? 'text-white' : 'text-red-600'}`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Damaged Products</h3>
                    <p className="text-sm text-slate-500">Write-offs & inventory loss</p>
                  </div>
                </div>
                <ChevronRight className={`w-5 h-5 ${activeView === 'damages' ? 'text-red-600' : 'text-slate-400'}`} />
              </div>
              
              <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">This Month</p>
                  <p className="text-2xl font-bold text-red-600">--</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Loss</p>
                  <p className="text-2xl font-bold text-slate-900">৳--</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Department Info Banner */}
        {selectedDepartment !== 'all' && (
          <div className={`rounded-xl p-4 flex items-center justify-between ${
            selectedDepartment === 'boibari' 
              ? 'bg-cyan-50 border border-cyan-200' 
              : 'bg-purple-50 border border-purple-200'
          }`}>
            <div className="flex items-center gap-3">
              <Building2 className={`w-5 h-5 ${
                selectedDepartment === 'boibari' ? 'text-cyan-600' : 'text-purple-600'
              }`} />
              <span className="font-medium text-slate-700">
                Viewing: <strong>{selectedDepartment === 'boibari' ? '📚 Boibari.com' : '🛒 Prodhan.com'}</strong>
              </span>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setSelectedDepartment('all')}
              className="text-slate-600"
            >
              Clear Filter
            </Button>
          </div>
        )}

        {/* Main Content Area */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {activeView === 'dashboard' ? (
            <div className="p-8 text-center">
              <PackageX className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h3 className="text-xl font-semibold text-slate-700 mb-2">
                Select a Category Above
              </h3>
              <p className="text-slate-500 max-w-md mx-auto">
                Click on "Product Returns" or "Damaged Products" to view and manage records
              </p>
            </div>
          ) : (
            <div className="p-6">
              <div className="mb-4">
                <Button 
                  variant="ghost" 
                  onClick={() => setActiveView('dashboard')}
                  className="gap-2 text-slate-600"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Overview
                </Button>
              </div>
              <ReturnDamageManagement 
                selectedDepartment={selectedDepartment} 
                defaultTab={activeView === 'returns' ? 'returns' : 'damages'}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default withPermission(InventoryReturnsPage, 'inventory_returns', 'can_view');