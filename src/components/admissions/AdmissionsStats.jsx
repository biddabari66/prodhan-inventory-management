import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, DollarSign, TrendingUp, CheckCircle } from 'lucide-react';

export default function AdmissionsStats({ admissions }) {
  const totalAdmissions = admissions.length;
  const totalRevenue = admissions.reduce((sum, a) => sum + (a.admission_fee || 0), 0);
  const paidAdmissions = admissions.filter(a => a.payment_status === 'paid').length;
  const pendingAdmissions = admissions.filter(a => a.payment_status === 'pending').length;

  const stats = [
    {
      title: 'Total Admissions',
      value: totalAdmissions,
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Total Revenue',
      value: `৳${totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-green-500',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Paid Admissions',
      value: paidAdmissions,
      icon: CheckCircle,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-100'
    },
    {
      title: 'Pending Payments',
      value: pendingAdmissions,
      icon: TrendingUp,
      color: 'text-orange-500',
      bgColor: 'bg-orange-100'
    }
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {stats.map(stat => (
        <Card key={stat.title} className="premium-card hover:shadow-xl hover:scale-105 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-display">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}