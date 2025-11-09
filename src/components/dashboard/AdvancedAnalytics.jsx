import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Calculator, 
  Percent, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Target,
  Users,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles
} from "lucide-react";

export default function AdvancedAnalytics({ analytics, userRole }) {
  if (userRole === 'employee') return null;

  const getMetricTrend = (value, benchmark) => {
    return value >= benchmark ? 'up' : 'down';
  };

  const getMetricColor = (value, benchmark) => {
    return value >= benchmark ? 'text-emerald-300' : 'text-red-300';
  };

  const formatCurrency = (value) => {
    return `৳${value.toLocaleString()}`;
  };

  const formatPercentage = (value) => {
    return `${value.toFixed(1)}%`;
  };

  const analyticsMetrics = [
    {
      title: "ROAS (Return on Ad Spend)",
      value: analytics.roas?.toFixed(2) || "0.00",
      benchmark: 3.0,
      icon: Calculator,
      description: "Revenue per taka spent on marketing",
      suffix: ":1"
    },
    {
      title: "ROI (Return on Investment)",
      value: formatPercentage(analytics.roi || 0),
      benchmark: 20,
      icon: Percent,
      description: "Overall return on investment",
      suffix: ""
    },
    {
      title: "Customer Acquisition Cost",
      value: formatCurrency(analytics.customerAcquisitionCost || 0),
      benchmark: 1000,
      icon: Users,
      description: "Cost to acquire each new student",
      suffix: ""
    },
    {
      title: "Average Order Value",
      value: formatCurrency(analytics.averageOrderValue || 0),
      benchmark: 15000,
      icon: DollarSign,
      description: "Average admission fee per student",
      suffix: ""
    },
    {
      title: "Conversion Rate",
      value: formatPercentage(analytics.conversionRate || 0),
      benchmark: 85,
      icon: Target,
      description: "Leads converted to admissions",
      suffix: ""
    },
    {
      title: "Customer Lifetime Value",
      value: formatCurrency(analytics.customerLifetimeValue || 0),
      benchmark: 30000,
      icon: TrendingUp,
      description: "Expected revenue per student",
      suffix: ""
    },
    {
      title: "Profit Margin",
      value: formatPercentage(analytics.profitMargin || 0),
      benchmark: 25,
      icon: BarChart3,
      description: "Net profit as % of revenue",
      suffix: ""
    },
    {
      title: "Marketing Spend",
      value: formatCurrency(analytics.marketingSpend || 0),
      benchmark: 50000,
      icon: DollarSign,
      description: "Total marketing expenses",
      suffix: ""
    }
  ];

  return (
    <div className="card-glassmorphic p-8 rounded-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-violet-500/10 flex items-center justify-center rounded-2xl shadow-glow-violet border border-violet-500/20">
            <Sparkles className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-display text-gradient">Advanced Analytics</h2>
            <p className="text-sm text-muted-foreground">Real-time KPIs and performance metrics</p>
          </div>
        </div>
        <Badge className="bg-violet-500/20 text-violet-300 text-sm font-bold border border-violet-500/30">
          Live Data
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
        {analyticsMetrics.map((metric, index) => {
          const numericValue = parseFloat(String(metric.value).replace(/[^0-9.-]/g, ''));
          const trend = getMetricTrend(numericValue, metric.benchmark);
          
          return (
            <div key={index} className="p-6 relative overflow-hidden group rounded-xl bg-black/20 backdrop-blur-sm border border-white/10" style={{animationDelay: `${index * 0.1}s`}}>
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 bg-black/20 rounded-lg shadow-inner-soft`}>
                      <metric.icon className={`w-5 h-5 ${trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {trend === 'up' ? (
                      <ArrowUpRight className="w-5 h-5 text-emerald-300" />
                    ) : (
                      <ArrowDownRight className="w-5 h-5 text-red-300" />
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-sm text-gray-400 leading-tight">
                    {metric.title}
                  </h3>
                  
                  <div className={`text-3xl font-bold text-white transition-colors duration-300 font-display`}>
                    {metric.value}{metric.suffix}
                  </div>
                  
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-gray-500 font-semibold">
                      Target: {typeof metric.benchmark === 'number' && metric.benchmark > 100 ? 
                        formatCurrency(metric.benchmark) : 
                        metric.benchmark + (metric.suffix || '')}
                    </span>
                    <Badge 
                      className={`text-xs px-3 py-1 font-bold ${
                        trend === 'up' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                      }`}
                    >
                      {trend === 'up' ? 'On Track' : 'Below Target'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}