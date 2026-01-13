import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { User } from '@/entities/User';
import { InventoryMovement } from '@/entities/InventoryMovement';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  PackageX, RefreshCw, RotateCcw, AlertOctagon, TrendingDown, 
  DollarSign, ChevronRight, ArrowLeft, Package, AlertTriangle
} from 'lucide-react';
import ReturnDamageManagement from '../components/inventory/ReturnDamageManagement';
import { withPermission } from '../components/common/PermissionGuard';
import { CacheManager } from '../components/common/PerformanceOptimizer';
import { startOfMonth, endOfMonth, parseISO } from 'date-fns';

function InventoryReturnsPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState('dashboard');

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

  // Fetch inventory movements for stats
  const { data: movements = [] } = useQuery({
    queryKey: ['inventoryMovements'],
    queryFn: () => InventoryMovement.list('-created_date', 1000),
    staleTime: 30000
  });

  // Calculate this month's stats
  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const thisMonthMovements = movements.filter(m => {
      const date = parseISO(m.created_date);
      return date >= monthStart && date <= monthEnd;
    });

    const returns = thisMonthMovements.filter(m => m.movement_type === 'return' || m.reason?.toLowerCase().includes('return'));
    const damages = thisMonthMovements.filter(m => m.movement_type === 'damage' || m.reason?.toLowerCase().includes('damage') || m.reason?.toLowerCase().includes('damaged'));

    const returnsCount = returns.length;
    const returnsValue = returns.reduce((sum, r) => sum + Math.abs(r.quantity || 0) * (r.unit_cost || 0), 0);
    
    const damagesCount = damages.length;
    const damagesLoss = damages.reduce((sum, d) => sum + Math.abs(d.quantity || 0) * (d.unit_cost || 0), 0);

    return { returnsCount, returnsValue, damagesCount, damagesLoss };
  }, [movements]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <RefreshCw className="w-10 h-10 animate-spin text-slate-700 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-5">
        
        {/* Professional Header - Deep Navy Theme */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center shadow-lg">
              <PackageX className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Returns & Damages</h1>
              <p className="text-slate-500 text-sm mt-0.5">Complete tracking & management</p>
            </div>
          </div>
        </div>

        {/* Stats Cards - Fixed with Real Data */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Returns Card */}
          <Card 
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${
              activeView === 'returns' 
                ? 'border-slate-800 bg-slate-50 shadow-md' 
                : 'border-slate-200 hover:border-slate-400'
            }`}
            onClick={() => setActiveView('returns')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                    activeView === 'returns' ? 'bg-slate-800' : 'bg-slate-100'
                  }`}>
                    <RotateCcw className={`w-6 h-6 ${activeView === 'returns' ? 'text-white' : 'text-slate-700'}`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Product Returns</h3>
                    <p className="text-sm text-slate-500">Customer & supplier returns</p>
                  </div>
                </div>
                <ChevronRight className={`w-5 h-5 transition-transform ${activeView === 'returns' ? 'text-slate-800 rotate-90' : 'text-slate-400'}`} />
              </div>
              
              <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">This Month</p>
                  <div className="flex items-baseline gap-1">
                    <p className="text-3xl font-bold text-slate-800">{stats.returnsCount}</p>
                    <span className="text-sm text-slate-500">items</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Value</p>
                  <div className="flex items-baseline gap-1">
                    <p className="text-3xl font-bold text-blue-600">৳{stats.returnsValue.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Damages Card */}
          <Card 
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${
              activeView === 'damages' 
                ? 'border-red-600 bg-red-50 shadow-md' 
                : 'border-slate-200 hover:border-red-300'
            }`}
            onClick={() => setActiveView('damages')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                    activeView === 'damages' ? 'bg-red-600' : 'bg-red-100'
                  }`}>
                    <AlertOctagon className={`w-6 h-6 ${activeView === 'damages' ? 'text-white' : 'text-red-600'}`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Damaged Products</h3>
                    <p className="text-sm text-slate-500">Write-offs & inventory loss</p>
                  </div>
                </div>
                <ChevronRight className={`w-5 h-5 transition-transform ${activeView === 'damages' ? 'text-red-600 rotate-90' : 'text-slate-400'}`} />
              </div>
              
              <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">This Month</p>
                  <div className="flex items-baseline gap-1">
                    <p className="text-3xl font-bold text-red-600">{stats.damagesCount}</p>
                    <span className="text-sm text-slate-500">items</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Loss</p>
                  <div className="flex items-baseline gap-1">
                    <p className="text-3xl font-bold text-red-700">৳{stats.damagesLoss.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {activeView === 'dashboard' ? (
            <div className="p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-5">
                <Package className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">
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
                  className="gap-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Overview
                </Button>
              </div>
              <ReturnDamageManagement 
                selectedDepartment="prodhan_com_e_commerce" 
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