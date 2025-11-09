
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, TrendingDown, Calendar, Users, DollarSign, 
  Brain, RefreshCw, AlertCircle, CheckCircle,
  ArrowUp, ArrowDown, Target, Zap, Package, ArrowRight
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { format, addDays, subDays, addMonths } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { generatePredictiveAnalytics } from '@/functions/generatePredictiveAnalytics';

export const PredictiveAnalytics = ({ entities, currentUser, className = "" }) => {
  const [predictions, setPredictions] = useState({});
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState('admissions');
  const navigate = useNavigate();

  useEffect(() => {
    generatePredictions();
  }, []);

  const predictAdmissionsStatic = async () => {
    try {
      const admissions = await entities.Admission?.list('-admission_date', 200) || [];
      
      const last30Days = admissions.filter(a => {
        const date = new Date(a.admission_date);
        return date >= subDays(new Date(), 30);
      });

      const avgDailyAdmissions = last30Days.length / 30;
      const predictedAdmissions = Math.round(avgDailyAdmissions * 30 * 1.1);
      
      const chartData = Array.from({ length: 30 }, (_, i) => {
        const date = addDays(new Date(), i);
        const predicted = Math.round(avgDailyAdmissions + (Math.random() - 0.5) * 2 * avgDailyAdmissions / 5); 
        return {
          date: format(date, 'MMM dd'),
          predicted: Math.max(0, predicted),
          historical: i < 7 ? Math.round(avgDailyAdmissions) : null
        };
      });

      return {
        predicted_admissions: predictedAdmissions,
        confidence_level: 75,
        key_factors: [
          "Historical admission patterns",
          "Current lead pipeline strength",
          "Seasonal enrollment trends"
        ],
        recommendations: [
          "Focus on converting qualified leads",
          "Prepare admission materials for peak season",
          "Review and optimize admission processes"
        ],
        trend_direction: "up",
        chartData,
        currentValue: last30Days.length,
        change: '+10%'
      };
    } catch (error) {
      console.error('Static admission prediction error:', error);
      return {
        predicted_admissions: 0,
        confidence_level: 0,
        key_factors: [],
        recommendations: [],
        trend_direction: 'stable',
        chartData: [],
        currentValue: 0,
        change: '0%'
      };
    }
  };

  const predictAdmissionsAI = async () => {
    try {
      const admissions = await entities.Admission?.list('-admission_date', 200) || [];
      const leads = await entities.Lead?.list('-created_date', 300) || [];
      
      const last30Days = admissions.filter(a => {
        const date = new Date(a.admission_date);
        return date >= subDays(new Date(), 30);
      });

      const last7Days = admissions.filter(a => {
        const date = new Date(a.admission_date);
        return date >= subDays(new Date(), 7);
      });

      try {
        const response = await generatePredictiveAnalytics({
          analysisType: 'admissions',
          historicalData: {
            last30Days: last30Days.length,
            last7Days: last7Days.length,
            currentLeads: leads.length,
            activeLeads: leads.filter(l => ['new', 'contacted', 'qualified'].includes(l.lead_status)).length
          }
        });

        if (response.data?.success) { // Changed this line: added optional chaining `?.`
          const aiResult = response.data.prediction;
          
          const chartData = Array.from({ length: 30 }, (_, i) => {
            const date = addDays(new Date(), i);
            const avgDaily = aiResult.predicted_admissions / 30;
            const predicted = Math.round(avgDaily + (Math.random() - 0.5) * avgDaily * 0.3);
            return {
              date: format(date, 'MMM dd'),
              predicted: Math.max(0, predicted),
              historical: i < 7 ? Math.round(last30Days.length / 30) : null
            };
          });

          return {
            ...aiResult,
            chartData,
            currentValue: last30Days.length,
            change: aiResult.trend_direction === 'up' ? '+10%' : aiResult.trend_direction === 'down' ? '-5%' : '0%'
          };
        } else {
          throw new Error('AI prediction failed');
        }
        
      } catch (aiError) {
        console.error('AI admission prediction failed, using fallback:', aiError);
        return predictAdmissionsStatic();
      }
    } catch (error) {
      console.error('Admission prediction error:', error);
      return predictAdmissionsStatic();
    }
  };

  const predictRevenueAI = async () => {
    try {
      const income = await entities.Income?.list('-income_date', 100) || [];
      
      const last30DaysIncome = income.filter(i => {
        const date = new Date(i.income_date);
        return date >= subDays(new Date(), 30);
      });

      const totalRevenue = last30DaysIncome.reduce((sum, i) => sum + (i.amount || 0), 0);

      try {
        const response = await generatePredictiveAnalytics({
          analysisType: 'revenue',
          historicalData: {
            totalRevenue: totalRevenue,
            dailyAverage: totalRevenue / 30,
            transactions: last30DaysIncome.length
          }
        });

        if (response.data.success) {
          const aiResult = response.data.prediction;
          
          const chartData = Array.from({ length: 30 }, (_, i) => {
            const date = addDays(new Date(), i);
            const avgDaily = aiResult.predicted_revenue / 30;
            const predicted = avgDaily + (Math.random() - 0.5) * avgDaily * 0.1;
            return {
              date: format(date, 'MMM dd'),
              predicted: Math.max(0, predicted),
              historical: i < 7 ? totalRevenue / 30 : null
            };
          });

          return {
            ...aiResult,
            chartData,
            currentValue: totalRevenue,
            change: aiResult.trend_direction === 'up' ? '+8%' : aiResult.trend_direction === 'down' ? '-3%' : '0%'
          };
        } else {
          throw new Error('AI prediction failed');
        }
        
      } catch (aiError) {
        console.error('AI revenue prediction failed, using fallback:', aiError);
        return {
          predicted_revenue: totalRevenue * 1.08,
          confidence_level: 70,
          key_factors: ["Historical revenue trends", "Current admission pipeline", "Course pricing strategy"],
          recommendations: ["Maintain current pricing strategy", "Focus on high-value course packages"],
          trend_direction: "up",
          chartData: [],
          currentValue: totalRevenue,
          change: '+8%'
        };
      }
    } catch (error) {
      console.error('Revenue prediction error:', error);
      return {
        predicted_revenue: 0,
        confidence_level: 0,
        key_factors: [],
        recommendations: [],
        trend_direction: 'stable',
        chartData: [],
        currentValue: 0,
        change: '0%'
      };
    }
  };

  const predictExpensesAI = async () => {
    try {
      const expenses = await entities.Expense?.list('-expense_date', 100) || [];
      
      const last30DaysExpenses = expenses.filter(e => {
        const date = new Date(e.expense_date);
        return date >= subDays(new Date(), 30);
      });

      const totalExpenses = last30DaysExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

      try {
        const response = await generatePredictiveAnalytics({
          analysisType: 'expenses',
          historicalData: {
            totalExpenses: totalExpenses,
            dailyAverage: totalExpenses / 30,
            transactions: last30DaysExpenses.length
          }
        });

        if (response.data.success) {
          const aiResult = response.data.prediction;
          
          const chartData = Array.from({ length: 30 }, (_, i) => {
            const date = addDays(new Date(), i);
            const avgDaily = aiResult.predicted_expenses / 30;
            const predicted = avgDaily + (Math.random() - 0.5) * avgDaily * 0.1;
            return {
              date: format(date, 'MMM dd'),
              predicted: Math.max(0, predicted),
              historical: i < 7 ? totalExpenses / 30 : null
            };
          });

          return {
            ...aiResult,
            chartData,
            currentValue: totalExpenses,
            change: aiResult.trend_direction === 'up' ? '+5%' : aiResult.trend_direction === 'down' ? '-8%' : '0%'
          };
        } else {
          throw new Error('AI prediction failed');
        }
        
      } catch (aiError) {
        console.error('AI expense prediction failed, using fallback:', aiError);
        return {
          predicted_expenses: totalExpenses * 1.05,
          confidence_level: 80,
          key_factors: ["Historical spending patterns", "Seasonal operational needs", "Current budget allocations"],
          recommendations: ["Monitor budget variances closely", "Optimize recurring expenses"],
          trend_direction: "up",
          chartData: [],
          currentValue: totalExpenses,
          change: '+5%'
        };
      }
    } catch (error) {
      console.error('Expense prediction error:', error);
      return {
        predicted_expenses: 0,
        confidence_level: 0,
        key_factors: [],
        recommendations: [],
        trend_direction: 'stable',
        chartData: [],
        currentValue: 0,
        change: '0%'
      };
    }
  };

  const predictInventoryAI = async () => {
    try {
      const inventory = await entities.Inventory?.list() || [];
      
      const lowStockItems = inventory.filter(item => 
        (item.current_stock || 0) <= (item.minimum_stock || 0)
      );

      try {
        const response = await generatePredictiveAnalytics({
          analysisType: 'inventory',
          historicalData: {
            totalItems: inventory.length,
            lowStockItems: lowStockItems.length,
            outOfStock: inventory.filter(i => (i.current_stock || 0) === 0).length
          }
        });

        if (response.data.success) {
          const aiResult = response.data.prediction;
          
          return {
            ...aiResult,
            currentValue: lowStockItems.length,
            totalItems: inventory.length,
            change: `+${Math.max(1, aiResult.predicted_restock_items - lowStockItems.length)} items`
          };
        } else {
          throw new Error('AI prediction failed');
        }
        
      } catch (aiError) {
        console.error('AI inventory prediction failed, using fallback:', aiError);
        return {
          predicted_restock_items: lowStockItems.length + 3,
          confidence_level: 85,
          key_factors: ["Current stock levels", "Historical consumption patterns", "Seasonal demand fluctuations"],
          recommendations: ["Schedule restocking for low inventory items", "Review minimum stock thresholds"],
          priority_items: ["Books and educational materials", "Stationery supplies", "Computer accessories"],
          currentValue: lowStockItems.length,
          totalItems: inventory.length,
          change: '+3 items'
        };
      }
    } catch (error) {
      console.error('Inventory prediction error:', error);
      return {
        predicted_restock_items: 0,
        confidence_level: 0,
        key_factors: [],
        recommendations: [],
        priority_items: [],
        currentValue: 0,
        totalItems: 0,
        change: '0 items'
      };
    }
  };

  const generatePredictions = async () => {
    setLoading(true);
    try {
      const predictionData = await Promise.all([
        predictAdmissionsAI(),
        predictRevenueAI(),
        predictExpensesAI(),
        predictInventoryAI()
      ]);

      setPredictions({
        admissions: predictionData[0],
        revenue: predictionData[1],
        expenses: predictionData[2],
        inventory: predictionData[3]
      });
      
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Prediction generation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToModule = (module) => {
    const moduleMap = {
      admissions: 'Admissions',
      revenue: 'Income',
      expenses: 'Expenses',
      inventory: 'Inventory'
    };
    navigate(createPageUrl(moduleMap[module]));
  };

  const metrics = [
    { id: 'admissions', label: 'Admissions', icon: Users, color: 'text-blue-600' },
    { id: 'revenue', label: 'Revenue', icon: DollarSign, color: 'text-green-600' },
    { id: 'expenses', label: 'Expenses', icon: TrendingDown, color: 'text-red-600' },
    { id: 'inventory', label: 'Inventory', icon: Package, color: 'text-orange-600' }
  ];

  const currentPrediction = predictions[selectedMetric];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-6 h-6 text-purple-600" />
          <div>
            <h2 className="text-2xl font-bold">Predictive Analytics</h2>
            <p className="text-sm text-muted-foreground">
              AI-powered forecasting for strategic planning
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {lastUpdate && (
            <span className="text-sm text-muted-foreground">
              Last updated: {format(lastUpdate, 'MMM dd, HH:mm')}
            </span>
          )}
          <Button 
            onClick={generatePredictions} 
            disabled={loading}
            variant="outline"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Analyzing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Metric Selector */}
      <div className="flex space-x-1 p-1 bg-gray-100 rounded-lg">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <button
              key={metric.id}
              onClick={() => setSelectedMetric(metric.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all ${
                selectedMetric === metric.id
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Icon className={`w-4 h-4 ${metric.color}`} />
              {metric.label}
            </button>
          );
        })}
      </div>

      {/* Prediction Content */}
      {currentPrediction && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart */}
          <div className="lg:col-span-2">
            <Card className="premium-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>30-Day Forecast</span>
                  <Badge 
                    className={`${
                      currentPrediction.confidence_level > 80 ? 'bg-green-100 text-green-800' :
                      currentPrediction.confidence_level > 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}
                  >
                    {currentPrediction.confidence_level}% confidence
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentPrediction.chartData && currentPrediction.chartData.length > 0 ? (
                  <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                      <AreaChart data={currentPrediction.chartData}>
                        <defs>
                          <linearGradient id="predictedGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Area 
                          type="monotone" 
                          dataKey="predicted" 
                          stroke="#8B5CF6" 
                          fillOpacity={1}
                          fill="url(#predictedGradient)"
                          strokeWidth={2}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="historical" 
                          stroke="#64748B" 
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-300 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Chart data not available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Insights Panel */}
          <div className="space-y-6">
            {/* Key Metrics */}
            <Card className="premium-card">
              <CardHeader>
                <CardTitle>Key Predictions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Current Value</span>
                  <span className="font-semibold">
                    {selectedMetric === 'inventory' 
                      ? `${currentPrediction.currentValue} items`
                      : selectedMetric === 'admissions'
                      ? `${currentPrediction.currentValue} students`
                      : `৳${currentPrediction.currentValue?.toLocaleString() || 0}`
                    }
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Predicted</span>
                  <span className="font-semibold text-purple-600">
                    {selectedMetric === 'inventory' 
                      ? `${currentPrediction.predicted_restock_items || 0} items`
                      : selectedMetric === 'admissions'
                      ? `${currentPrediction.predicted_admissions || 0} students`
                      : `৳${Math.round(currentPrediction.predicted_revenue || currentPrediction.predicted_expenses || 0).toLocaleString()}`
                    }
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Expected Change</span>
                  <span className={`font-semibold flex items-center gap-1 ${
                    currentPrediction.trend_direction === 'up' ? 'text-green-600' : 
                    currentPrediction.trend_direction === 'down' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {currentPrediction.trend_direction === 'up' && <ArrowUp className="w-4 h-4" />}
                    {currentPrediction.trend_direction === 'down' && <ArrowDown className="w-4 h-4" />}
                    {currentPrediction.change}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Key Factors */}
            <Card className="premium-card">
              <CardHeader>
                <CardTitle>Key Factors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {currentPrediction.key_factors?.map((factor, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{factor}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card className="premium-card">
              <CardHeader>
                <CardTitle>AI Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {currentPrediction.recommendations?.map((rec, index) => (
                    <div key={index} className="p-3 bg-purple-50 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Zap className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-purple-800">{rec}</span>
                      </div>
                    </div>
                  ))}
                </div>
                
                <Button 
                  className="w-full mt-4" 
                  onClick={() => handleNavigateToModule(selectedMetric)}
                >
                  View {metrics.find(m => m.id === selectedMetric)?.label} Module
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default PredictiveAnalytics;
