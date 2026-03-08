import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert, DollarSign, TrendingUp, Calculator, Wallet } from 'lucide-react';

const CONFIDENTIAL_PERMISSIONS = [
  {
    id: 'can_view_purchase_price',
    name: 'Purchase Price',
    description: 'View purchase/cost price of products in inventory',
    icon: DollarSign,
    color: 'text-red-600 bg-red-50'
  },
  {
    id: 'can_view_cost_data',
    name: 'Cost Breakdown',
    description: 'View cost analytics, packaging cost, boost cost, and margins',
    icon: Calculator,
    color: 'text-orange-600 bg-orange-50'
  },
  {
    id: 'can_view_profit_data',
    name: 'Profit Data',
    description: 'View profit margins, profit per product, and profit reports',
    icon: TrendingUp,
    color: 'text-emerald-600 bg-emerald-50'
  },
  {
    id: 'can_view_sensitive_finance',
    name: 'Financial Metrics',
    description: 'View aggregate revenue, total profit, and financial dashboards',
    icon: Wallet,
    color: 'text-violet-600 bg-violet-50'
  },
  {
    id: 'can_view_salary_data',
    name: 'Salary & Payroll',
    description: 'View employee salary, payroll details, and compensation data',
    icon: DollarSign,
    color: 'text-blue-600 bg-blue-50'
  }
];

export default function ConfidentialPermissions({ employee, confidentialPerms, onConfidentialChange }) {
  const isSuperAdmin = employee?.job_role === 'super_admin';

  return (
    <Card className="border-l-4 border-l-red-600 bg-red-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-800">
            <ShieldAlert className="w-5 h-5" />
            <span>Confidential Data Access</span>
          </div>
          <Badge variant="destructive" className="text-xs">Restricted</Badge>
        </CardTitle>
        <p className="text-xs text-red-700 mt-1">
          These permissions control access to sensitive business data. Only grant to trusted personnel.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {CONFIDENTIAL_PERMISSIONS.map(perm => {
            const Icon = perm.icon;
            const isChecked = isSuperAdmin ? true : (confidentialPerms?.[perm.id] || false);

            return (
              <div
                key={perm.id}
                className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-100 hover:border-red-200 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${perm.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{perm.name}</p>
                    <p className="text-xs text-slate-500">{perm.description}</p>
                  </div>
                </div>
                <Switch
                  checked={isChecked}
                  onCheckedChange={(checked) => onConfidentialChange(perm.id, checked)}
                  disabled={isSuperAdmin}
                />
              </div>
            );
          })}
        </div>
        {isSuperAdmin && (
          <p className="text-xs text-amber-700 mt-3 font-medium">
            ⚡ Super Admin has full access to all confidential data — cannot be restricted.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export { CONFIDENTIAL_PERMISSIONS };