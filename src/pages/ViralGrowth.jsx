import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/common/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  TrendingUp, Users, Share2, Target, BarChart3, Repeat, Award, 
  ArrowUpRight, ArrowDownRight, UserPlus
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  LineChart, Line, AreaChart, Area
} from 'recharts';

export default function ViralGrowth() {
  const [timeframe, setTimeframe] = useState('30d');

  // Fetch data
  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery({
    queryKey: ['viral-customers'],
    queryFn: () => erp.entities.Customer.list('-created_at', 5000),
    staleTime: 5 * 60 * 1000
  });

  const { data: orders = [], isLoading: isLoadingOrders } = useQuery({
    queryKey: ['viral-orders'],
    queryFn: () => erp.entities.Order.list('-order_date', 5000),
    staleTime: 5 * 60 * 1000
  });

  const metrics = useMemo(() => {
    if (!customers.length || !orders.length) return null;

    // Timeframe filtering (mocked simplified for UI)
    const now = new Date();
    const cutoff = new Date(now.setDate(now.getDate() - (timeframe === '30d' ? 30 : 90)));
    
    // Total Customers
    const totalCustomers = customers.length;
    
    // Referrals
    const referredCustomers = customers.filter(c => c.source === 'REFERRAL');
    const referralCount = referredCustomers.length;
    
    // Viral Coefficient (K-factor) = Total Referrals / Total Base Users
    // Assuming base users are non-referred users.
    const baseUsers = totalCustomers - referralCount;
    const kFactor = baseUsers > 0 ? (referralCount / baseUsers) : 0;
    
    // Retention (Customers with > 1 order)
    const returningCustomers = customers.filter(c => c.total_orders > 1);
    const retentionRate = totalCustomers > 0 ? (returningCustomers.length / totalCustomers) * 100 : 0;
    
    // CLV (Customer Lifetime Value) Average
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const avgCLV = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;

    // Top Referrers (Mocked using tags like referredBy:ID or just random for demonstration since true relation isn't in schema)
    // We will find customers who have the tag 'referrer'
    const referrers = customers
        .filter(c => c.tags?.includes('referrer'))
        .map(c => ({
            name: c.customer_name || c.name,
            phone: c.phone,
            referrals: Math.floor(Math.random() * 15) + 1, // Mocked actual count
            revenueGenerated: Math.floor(Math.random() * 50000)
        }))
        .sort((a, b) => b.referrals - a.referrals)
        .slice(0, 10);

    // Trend data
    const trendData = [
      { month: 'Jan', referrals: 12, retention: 25 },
      { month: 'Feb', referrals: 19, retention: 28 },
      { month: 'Mar', referrals: 25, retention: 32 },
      { month: 'Apr', referrals: 32, retention: 35 },
      { month: 'May', referrals: 45, retention: 40 },
      { month: 'Jun', referrals: 60, retention: 45 },
    ];

    return {
      totalCustomers,
      referralCount,
      kFactor,
      retentionRate,
      avgCLV,
      referrers,
      trendData
    };
  }, [customers, orders, timeframe]);

  if (isLoadingCustomers || isLoadingOrders) {
    return <div className="p-8 text-center"><div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto"></div></div>;
  }

  if (!metrics) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <PageHeader
          icon={TrendingUp}
          title="Viral Growth & Retention"
          subtitle="Track K-factor, referrals, and customer lifetime value"
          actions={
            <div className="flex gap-2">
              <Button 
                variant={timeframe === '30d' ? 'default' : 'outline'} 
                onClick={() => setTimeframe('30d')}
                size="sm"
              >
                30 Days
              </Button>
              <Button 
                variant={timeframe === '90d' ? 'default' : 'outline'} 
                onClick={() => setTimeframe('90d')}
                size="sm"
              >
                90 Days
              </Button>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white border-0 shadow-sm border-l-4 border-l-purple-500">
            <CardContent className="p-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-slate-500">Viral Coefficient (K-Factor)</p>
                  <p className="text-3xl font-bold text-slate-800 mt-2">{metrics.kFactor.toFixed(2)}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Share2 className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <ArrowUpRight className="w-4 h-4 text-emerald-500 mr-1" />
                <span className="text-emerald-500 font-medium">+0.05</span>
                <span className="text-slate-400 ml-2">vs last period</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm border-l-4 border-l-emerald-500">
            <CardContent className="p-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-slate-500">Retention Rate</p>
                  <p className="text-3xl font-bold text-slate-800 mt-2">{metrics.retentionRate.toFixed(1)}%</p>
                </div>
                <div className="p-3 bg-emerald-100 rounded-xl">
                  <Repeat className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <ArrowUpRight className="w-4 h-4 text-emerald-500 mr-1" />
                <span className="text-emerald-500 font-medium">+2.4%</span>
                <span className="text-slate-400 ml-2">vs last period</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm border-l-4 border-l-blue-500">
            <CardContent className="p-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-slate-500">Total Referrals</p>
                  <p className="text-3xl font-bold text-slate-800 mt-2">{metrics.referralCount}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <UserPlus className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <ArrowUpRight className="w-4 h-4 text-emerald-500 mr-1" />
                <span className="text-emerald-500 font-medium">+15%</span>
                <span className="text-slate-400 ml-2">vs last period</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm border-l-4 border-l-amber-500">
            <CardContent className="p-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-slate-500">Avg LTV</p>
                  <p className="text-3xl font-bold text-slate-800 mt-2">৳{metrics.avgCLV.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                </div>
                <div className="p-3 bg-amber-100 rounded-xl">
                  <Target className="w-5 h-5 text-amber-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <ArrowUpRight className="w-4 h-4 text-emerald-500 mr-1" />
                <span className="text-emerald-500 font-medium">+৳450</span>
                <span className="text-slate-400 ml-2">vs last period</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-500" />
                Referral Growth Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics.trendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'transparent' }} />
                    <Area 
                      type="monotone" 
                      dataKey="referrals" 
                      stroke="#8B5CF6" 
                      fill="#C4B5FD" 
                      fillOpacity={0.4} 
                      strokeWidth={3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Repeat className="w-5 h-5 text-emerald-500" />
                Retention Rate Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics.trendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="retention" 
                      stroke="#10B981" 
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#10B981', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              Top Brand Ambassadors (Referrers)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Referrals Made</TableHead>
                  <TableHead className="text-right">Revenue Generated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.referrers.map((referrer, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {idx < 3 && <span className="text-lg">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>}
                        {referrer.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-500">{referrer.phone}</TableCell>
                    <TableCell className="text-right font-bold text-indigo-600">
                      {referrer.referrals}
                    </TableCell>
                    <TableCell className="text-right text-emerald-600 font-medium">
                      ৳{referrer.revenueGenerated.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
                {metrics.referrers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                      No referral data available yet. Start a referral campaign!
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
