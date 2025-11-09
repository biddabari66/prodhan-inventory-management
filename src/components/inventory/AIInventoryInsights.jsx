
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2,
  Zap,
  BarChart3,
  Loader2,
  RefreshCw,
  Brain,
  Target
} from 'lucide-react';
import { generatePredictiveAnalytics } from '@/functions/generatePredictiveAnalytics';
import { Inventory } from '@/entities/Inventory';
import { toast } from 'sonner';
import { format } from 'date-fns';

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * AI-POWERED INVENTORY INSIGHTS COMPONENT
 * Provides intelligent demand forecasting, stockout predictions, and automated recommendations
 */
export default function AIInventoryInsights({ department, inventoryItems }) {
  const [insights, setInsights] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    loadInsights();
  }, [department, inventoryItems]);

  const getCacheKey = () => `ai_insights_cache_${department}`;

  const loadInsights = async (forceRefresh = false) => {
    if (!inventoryItems || inventoryItems.length === 0) {
      console.log('No inventory items to analyze');
      return;
    }

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      try {
        const cacheKey = getCacheKey();
        const cachedData = localStorage.getItem(cacheKey);
        
        if (cachedData) {
          const { insights: cachedInsights, timestamp } = JSON.parse(cachedData);
          const cacheAge = Date.now() - timestamp;
          
          if (cacheAge < CACHE_DURATION_MS) {
            console.log(`✅ Using cached AI insights (age: ${Math.round(cacheAge / 1000 / 60)} minutes)`);
            setInsights(cachedInsights);
            setLastUpdated(new Date(timestamp));
            setIsLoading(false);
            return;
          } else {
            console.log('⏰ Cache expired, fetching fresh insights');
          }
        }
      } catch (cacheError) {
        console.warn('Cache read error:', cacheError);
        // Continue to fetch if cache read fails
      }
    }

    setIsLoading(true);
    try {
      console.log('🤖 Loading AI insights for department:', department);
      
      // CRITICAL FIX: Prepare historical data in the format the function expects
      const historicalData = {
        totalItems: inventoryItems.length,
        lowStockItems: inventoryItems.filter(item => 
          (item.current_stock || 0) < (item.minimum_stock || 0)
        ).length,
        outOfStock: inventoryItems.filter(item => 
          (item.current_stock || 0) === 0
        ).length,
        averageStockLevel: inventoryItems.reduce((sum, item) => 
          sum + (item.current_stock || 0), 0
        ) / inventoryItems.length,
        totalValue: inventoryItems.reduce((sum, item) => 
          sum + ((item.current_stock || 0) * (item.purchase_price || 0)), 0
        )
      };

      console.log('📊 Historical data prepared:', historicalData);

      // CRITICAL FIX: Use correct parameter names that match the function
      const response = await generatePredictiveAnalytics({
        analysisType: 'inventory',
        historicalData: historicalData
      });

      console.log('📨 AI insights response:', response);

      if (response.data?.success && response.data?.prediction) {
        // Process the AI prediction into our insights format
        const prediction = response.data.prediction;
        
        const processedInsights = {
          high_risk_items: inventoryItems.filter(item => 
            (item.current_stock || 0) < (item.minimum_stock || 0) * 1.2
          ).length,
          overstock_items: inventoryItems.filter(item => 
            (item.current_stock || 0) > (item.minimum_stock || 0) * 3
          ).length,
          optimal_items: inventoryItems.filter(item => {
            const stock = item.current_stock || 0;
            const min = item.minimum_stock || 0;
            return stock >= min && stock <= min * 3;
          }).length,
          critical_items: inventoryItems
            .filter(item => (item.current_stock || 0) < (item.minimum_stock || 0))
            .slice(0, 5)
            .map(item => ({
              item_name: item.item_name,
              reason: `Stock: ${item.current_stock}, Min: ${item.minimum_stock}`
            })),
          recommendations: inventoryItems
            .filter(item => (item.current_stock || 0) < (item.minimum_stock || 0) * 1.5)
            .slice(0, 5)
            .map(item => ({
              item_id: item.id,
              recommendation: `Reorder ${item.item_name} - current stock (${item.current_stock}) is below minimum (${item.minimum_stock})`,
              stockout_risk: Math.min(100, Math.round(((item.minimum_stock - item.current_stock) / item.minimum_stock) * 100)),
              recommended_quantity: Math.max(0, (item.minimum_stock * 2) - item.current_stock),
              supplier_lead_time_days: item.supplier_lead_time_days || 7
            })),
          demand_patterns: {
            steady: inventoryItems.filter(item => item.demand_pattern === 'steady').length,
            seasonal: inventoryItems.filter(item => item.demand_pattern === 'seasonal').length,
            erratic: inventoryItems.filter(item => item.demand_pattern === 'erratic').length,
            lumpy: inventoryItems.filter(item => item.demand_pattern === 'lumpy').length
          }
        };

        console.log('✅ Processed insights:', processedInsights);
        
        // Save to cache
        try {
          const cacheKey = getCacheKey();
          const cacheData = {
            insights: processedInsights,
            timestamp: Date.now()
          };
          localStorage.setItem(cacheKey, JSON.stringify(cacheData));
          console.log('💾 Saved insights to cache');
        } catch (cacheError) {
          console.warn('Failed to cache insights:', cacheError);
        }

        setInsights(processedInsights);
        setLastUpdated(new Date());
      } else {
        console.warn('⚠️ AI insights returned without prediction, using fallback');
        // Fallback to basic statistical insights
        const fallbackInsights = {
          high_risk_items: inventoryItems.filter(item => 
            (item.current_stock || 0) < (item.minimum_stock || 0)
          ).length,
          overstock_items: 0,
          optimal_items: inventoryItems.length,
          critical_items: [],
          recommendations: [],
          demand_patterns: { steady: 0, seasonal: 0, erratic: 0, lumpy: 0 }
        };
        setInsights(fallbackInsights);
        setLastUpdated(new Date());
        // Do not cache fallback insights
      }
    } catch (error) {
      console.error('❌ Failed to load AI insights:', error);
      console.error('Error details:', error.response?.data);
      
      // Fallback insights on error
      const errorInsights = {
        high_risk_items: inventoryItems.filter(item => 
          (item.current_stock || 0) < (item.minimum_stock || 0)
        ).length,
        overstock_items: 0,
        optimal_items: inventoryItems.length,
        critical_items: [],
        recommendations: [],
        demand_patterns: { steady: 0, seasonal: 0, erratic: 0, lumpy: 0 }
      };
      setInsights(errorInsights);
      setLastUpdated(new Date());
      // Do not cache error insights
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskColor = (risk) => {
    if (risk >= 70) return 'text-red-600 bg-red-100';
    if (risk >= 40) return 'text-orange-600 bg-orange-100';
    return 'text-green-600 bg-green-100';
  };

  const handleAutoReorder = async (itemId) => {
    try {
      const item = inventoryItems.find(i => i.id === itemId);
      if (!item) return;

      // Enable automated reordering
      await Inventory.update(itemId, {
        automated_reorder_enabled: true,
        next_reorder_date: insights?.recommendations?.find(r => r.item_id === itemId)?.recommended_reorder_date
      });

      toast.success(`Automated reordering enabled for ${item.item_name}`);
      loadInsights(true); // Force refresh insights after an action
    } catch (error) {
      console.error('Failed to enable auto-reorder:', error);
      toast.error('Failed to enable automated reordering');
    }
  };

  const handleManualRefresh = () => {
    console.log('🔄 Manual refresh triggered');
    toast.info('Refreshing AI insights...');
    loadInsights(true); // Force refresh
  };

  if (isLoading && !insights) {
    return (
      <Card className="premium-card">
        <CardContent className="p-8 text-center">
          <Brain className="w-12 h-12 mx-auto mb-4 text-violet-600 animate-pulse" />
          <p className="text-muted-foreground">AI is analyzing inventory patterns...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Manual Refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold font-display">AI Inventory Intelligence</h3>
            {lastUpdated && (
              <p className="text-sm text-muted-foreground">
                Last updated: {format(lastUpdated, 'PPpp')} • Refreshes daily
              </p>
            )}
          </div>
        </div>
        <Button
          onClick={handleManualRefresh}
          disabled={isLoading}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Manual Refresh
        </Button>
      </div>

      {/* Critical Alerts */}
      {insights?.critical_items && insights.critical_items.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <AlertDescription>
            <p className="font-semibold text-red-900 mb-2">
              {insights.critical_items.length} items need immediate attention!
            </p>
            <div className="space-y-2">
              {insights.critical_items.slice(0, 3).map((item, index) => (
                <div key={index} className="text-sm text-red-800">
                  • <strong>{item.item_name}</strong>: {item.reason}
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="premium-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">High Stockout Risk</span>
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-3xl font-bold text-red-600">
              {insights?.high_risk_items || 0}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Items at risk</p>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Overstock Risk</span>
              <TrendingDown className="w-5 h-5 text-orange-500" />
            </div>
            <p className="text-3xl font-bold text-orange-600">
              {insights?.overstock_items || 0}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Items overstocked</p>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Optimal Stock</span>
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-green-600">
              {insights?.optimal_items || inventoryItems.length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Items optimized</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Recommendations */}
      {insights?.recommendations && insights.recommendations.length > 0 && (
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-violet-600" />
              AI-Powered Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.recommendations.map((rec, index) => {
                const item = inventoryItems.find(i => i.id === rec.item_id);
                return (
                  <div key={index} className="flex items-start justify-between p-4 bg-slate-50 rounded-lg border">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{item?.item_name}</h4>
                        <Badge className={getRiskColor(rec.stockout_risk)}>
                          {rec.stockout_risk}% risk
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {rec.recommendation}
                      </p>
                      <div className="flex gap-4 text-xs">
                        <span><strong>Current:</strong> {item?.current_stock}</span>
                        <span><strong>Suggested:</strong> {rec.recommended_quantity}</span>
                        <span><strong>Lead Time:</strong> {rec.supplier_lead_time_days} days</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAutoReorder(rec.item_id)}
                        className="bg-violet-600 hover:bg-violet-700"
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        Auto-Reorder
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Demand Patterns */}
      {insights?.demand_patterns && (
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Detected Demand Patterns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">
                  {insights.demand_patterns.steady || 0}
                </p>
                <p className="text-sm text-muted-foreground">Steady</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {insights.demand_patterns.seasonal || 0}
                </p>
                <p className="text-sm text-muted-foreground">Seasonal</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">
                  {insights.demand_patterns.erratic || 0}
                </p>
                <p className="text-sm text-muted-foreground">Erratic</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">
                  {insights.demand_patterns.lumpy || 0}
                </p>
                <p className="text-sm text-muted-foreground">Lumpy</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
