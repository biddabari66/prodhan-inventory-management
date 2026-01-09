import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, TrendingUp, TrendingDown, AlertTriangle, ShoppingCart, 
  Package, DollarSign, Target, Sparkles, BarChart3, Calendar,
  Zap, Loader2, RefreshCw, LineChart, Activity, Award
} from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { BarChart, Bar, LineChart as RechartsLine, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

/**
 * ENHANCED AI INSIGHTS DASHBOARD
 * Advanced predictive analytics with beautiful visualizations
 */
export default function EnhancedAIInsights({ inventoryItems = [], department }) {
  const [insights, setInsights] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    if (inventoryItems.length > 0) {
      analyzeInventory();
    }
  }, [inventoryItems]);

  const analyzeInventory = async () => {
    setIsAnalyzing(true);
    const loadingToast = toast.loading('🧠 AI analyzing inventory patterns...');
    
    try {
      // Prepare data summary for AI
      const summary = inventoryItems.map(item => ({
        name: item.item_name,
        category: item.category,
        current_stock: item.current_stock,
        minimum_stock: item.minimum_stock,
        selling_price: item.selling_price,
        last_sale_date: item.last_sale_date,
        total_sold: item.total_sold || 0
      }));

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this inventory data and provide actionable insights:

${JSON.stringify(summary.slice(0, 50), null, 2)}

Provide:
1. Top 5 products at risk of stockout (with risk score 0-100)
2. Top 5 overstock items (with overstock score 0-100)
3. Recommended reorder priorities (top 5 items to reorder)
4. Sales trend analysis (growing, declining, stable)
5. Category performance insights
6. Actionable recommendations for inventory optimization

Be specific with product names and numbers.`,
        response_json_schema: {
          type: "object",
          properties: {
            stockout_risks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  product_name: { type: "string" },
                  risk_score: { type: "number" },
                  reason: { type: "string" },
                  recommendation: { type: "string" }
                }
              }
            },
            overstock_items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  product_name: { type: "string" },
                  overstock_score: { type: "number" },
                  reason: { type: "string" }
                }
              }
            },
            reorder_priorities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  product_name: { type: "string" },
                  priority: { type: "string" },
                  suggested_quantity: { type: "number" }
                }
              }
            },
            sales_trends: {
              type: "object",
              properties: {
                growing: { type: "array", items: { type: "string" } },
                declining: { type: "array", items: { type: "string" } },
                stable: { type: "array", items: { type: "string" } }
              }
            },
            category_insights: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  performance: { type: "string" },
                  action: { type: "string" }
                }
              }
            },
            recommendations: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      toast.dismiss(loadingToast);
      setInsights(response);
      toast.success('✨ AI analysis complete!');
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('AI analysis error:', error);
      toast.error('Analysis failed: ' + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRiskColor = (score) => {
    if (score >= 80) return 'text-red-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-yellow-600';
  };

  const getRiskBg = (score) => {
    if (score >= 80) return 'bg-red-100 border-red-300';
    if (score >= 50) return 'bg-orange-100 border-orange-300';
    return 'bg-yellow-100 border-yellow-300';
  };

  const chartColors = ['#7C3AED', '#EC4899', '#06B6D4', '#10B981', '#F59E0B'];

  if (isAnalyzing) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="relative">
          <Brain className="w-20 h-20 text-purple-600 animate-pulse" />
          <Sparkles className="w-8 h-8 text-pink-500 absolute -top-2 -right-2 animate-bounce" />
        </div>
        <p className="mt-6 text-lg font-semibold text-slate-700">AI Analyzing Inventory...</p>
        <p className="text-sm text-slate-500">Processing patterns and trends</p>
      </div>
    );
  }

  if (!insights) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Brain className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-600">No insights available. Click analyze to start.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Badge className="bg-green-600 text-white">
            <Activity className="w-3 h-3 mr-1" />
            Live Insights
          </Badge>
          <span className="text-sm text-slate-500">Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
        <Button onClick={analyzeInventory} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Analysis
        </Button>
      </div>

      {/* Stockout Risks */}
      <Card className="border-2 border-red-200 bg-gradient-to-br from-red-50 to-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-900">
            <AlertTriangle className="w-6 h-6" />
            ⚠️ Stockout Risk Alert ({insights.stockout_risks?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {insights.stockout_risks?.slice(0, 5).map((item, idx) => (
              <div key={idx} className={`p-4 rounded-lg border-2 ${getRiskBg(item.risk_score)}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-slate-900">{item.product_name}</h4>
                    <p className="text-xs text-slate-600 mt-1">{item.reason}</p>
                  </div>
                  <Badge className={`${getRiskColor(item.risk_score)}`}>
                    {item.risk_score}% Risk
                  </Badge>
                </div>
                <div className="mt-2">
                  <Progress value={item.risk_score} className="h-2" />
                </div>
                <p className="text-xs text-blue-700 mt-2 font-medium">💡 {item.recommendation}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Reorder Priorities */}
      <Card className="border-2 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <ShoppingCart className="w-6 h-6" />
            📦 Reorder Priorities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {insights.reorder_priorities?.map((item, idx) => (
              <div key={idx} className="p-4 bg-blue-50 rounded-lg border-2 border-blue-300">
                <Badge className={`mb-2 ${
                  item.priority === 'HIGH' ? 'bg-red-600' :
                  item.priority === 'MEDIUM' ? 'bg-orange-600' :
                  'bg-yellow-600'
                }`}>
                  {item.priority}
                </Badge>
                <h4 className="font-semibold text-sm mb-1">{item.product_name}</h4>
                <p className="text-xs text-slate-600">Suggest: {item.suggested_quantity} units</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sales Trends */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-green-700">
              <TrendingUp className="w-4 h-4" />
              Growing Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            {insights.sales_trends?.growing?.slice(0, 5).map((name, idx) => (
              <div key={idx} className="flex items-center gap-2 py-2 border-b last:border-0">
                <Award className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-slate-800">{name}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-red-700">
              <TrendingDown className="w-4 h-4" />
              Declining Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            {insights.sales_trends?.declining?.slice(0, 5).map((name, idx) => (
              <div key={idx} className="flex items-center gap-2 py-2 border-b last:border-0">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-slate-800">{name}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-blue-700">
              <Target className="w-4 h-4" />
              Stable Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            {insights.sales_trends?.stable?.slice(0, 5).map((name, idx) => (
              <div key={idx} className="flex items-center gap-2 py-2 border-b last:border-0">
                <Activity className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-slate-800">{name}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* AI Recommendations */}
      <Card className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-900">
            <Sparkles className="w-6 h-6" />
            💡 AI Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {insights.recommendations?.map((rec, idx) => (
              <div key={idx} className="p-4 bg-white rounded-lg border-2 border-purple-200 flex items-start gap-3">
                <Zap className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-slate-800">{rec}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Category Performance */}
      {insights.category_insights?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-indigo-600" />
              Category Performance Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insights.category_insights.map((cat, idx) => (
                <div key={idx} className="p-4 bg-gradient-to-r from-slate-50 to-indigo-50 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-slate-900">{cat.category}</h4>
                    <Badge className={
                      cat.performance === 'Excellent' ? 'bg-green-600' :
                      cat.performance === 'Good' ? 'bg-blue-600' :
                      cat.performance === 'Average' ? 'bg-yellow-600' :
                      'bg-red-600'
                    }>
                      {cat.performance}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600">{cat.action}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}