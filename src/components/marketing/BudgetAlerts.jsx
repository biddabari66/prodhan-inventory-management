import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, CheckCircle, XCircle, TrendingUp, 
  TrendingDown, Target, DollarSign, Bell
} from 'lucide-react';
import { format } from 'date-fns';

export default function BudgetAlerts({ budgets = [], adSpends = [] }) {
  const alerts = useMemo(() => {
    const currentPeriod = format(new Date(), 'yyyy-MM');
    const alerts = [];

    // Check each marketing budget
    budgets.filter(b => b.category === 'marketing').forEach(budget => {
      const spent = adSpends
        .filter(s => s.spend_date?.startsWith(budget.period))
        .reduce((sum, s) => sum + (s.total_spend_bdt || 0), 0);
      
      const utilization = budget.allocated_amount > 0 ? (spent / budget.allocated_amount) * 100 : 0;
      const remaining = (budget.allocated_amount || 0) - spent;
      const daysInMonth = new Date(budget.period + '-01').getMonth() === new Date().getMonth() ? 
        new Date().getDate() : 30;
      const daysRemaining = 30 - daysInMonth;
      const projectedSpend = daysRemaining > 0 ? spent * (30 / daysInMonth) : spent;

      // Determine alert type
      if (utilization > 100) {
        alerts.push({
          type: 'overspend',
          severity: 'critical',
          budget,
          spent,
          utilization,
          remaining,
          message: `Budget exceeded by ৳${Math.abs(remaining).toLocaleString()}`,
          icon: XCircle,
          color: 'bg-red-100 text-red-800 border-red-200'
        });
      } else if (utilization > 90) {
        alerts.push({
          type: 'near_limit',
          severity: 'warning',
          budget,
          spent,
          utilization,
          remaining,
          message: `Only ৳${remaining.toLocaleString()} remaining (${(100 - utilization).toFixed(1)}%)`,
          icon: AlertTriangle,
          color: 'bg-amber-100 text-amber-800 border-amber-200'
        });
      } else if (budget.period === currentPeriod && utilization < 50 && daysInMonth > 15) {
        alerts.push({
          type: 'underspend',
          severity: 'info',
          budget,
          spent,
          utilization,
          remaining,
          message: `Only ${utilization.toFixed(0)}% used with ${daysRemaining} days remaining`,
          icon: TrendingDown,
          color: 'bg-blue-100 text-blue-800 border-blue-200'
        });
      }

      // Projected overspend alert
      if (budget.period === currentPeriod && projectedSpend > budget.allocated_amount && utilization <= 100) {
        alerts.push({
          type: 'projected_overspend',
          severity: 'warning',
          budget,
          spent,
          utilization,
          remaining,
          projectedSpend,
          message: `At current pace, projected to exceed budget by ৳${(projectedSpend - budget.allocated_amount).toFixed(0)}`,
          icon: TrendingUp,
          color: 'bg-orange-100 text-orange-800 border-orange-200'
        });
      }
    });

    return alerts.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }, [budgets, adSpends]);

  if (alerts.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-semibold text-green-800">All Budgets On Track</p>
              <p className="text-sm text-green-600">No spending alerts at this time</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Bell className="w-5 h-5 text-amber-500" />
        <h3 className="font-semibold text-lg">Budget Alerts</h3>
        <Badge variant="outline" className="bg-amber-50">{alerts.length} alerts</Badge>
      </div>

      <div className="space-y-3">
        {alerts.map((alert, idx) => (
          <Card key={idx} className={`border ${alert.color}`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  alert.severity === 'critical' ? 'bg-red-500' :
                  alert.severity === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                }`}>
                  <alert.icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold">{alert.budget.period} Marketing Budget</p>
                    <Badge className={
                      alert.severity === 'critical' ? 'bg-red-500' :
                      alert.severity === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                    }>
                      {alert.severity === 'critical' ? 'Critical' :
                       alert.severity === 'warning' ? 'Warning' : 'Info'}
                    </Badge>
                  </div>
                  <p className="text-sm mb-3">{alert.message}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <span>Allocated: ৳{alert.budget.allocated_amount?.toLocaleString()}</span>
                    <span>Spent: ৳{alert.spent.toLocaleString()}</span>
                  </div>
                  <Progress 
                    value={Math.min(alert.utilization, 100)} 
                    className={`h-2 mt-2 ${alert.utilization > 100 ? 'bg-red-200' : 'bg-slate-200'}`}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}