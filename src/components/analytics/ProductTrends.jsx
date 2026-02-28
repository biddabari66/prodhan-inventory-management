import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Activity, Package, 
  DollarSign, ShoppingCart, Calendar 
} from 'lucide-react';
import { format, subDays, eachDayOfInterval, eachWeekOfInterval, startOfWeek, endOfWeek } from 'date-fns';

export default function ProductTrends({ inventory = [], orders = [], movements = [] }) {
  const [selectedProduct, setSelectedProduct] = useState('all');
  const [timeRange, setTimeRange] = useState('30');

  const trendData = useMemo(() => {
    const days = parseInt(timeRange);
    const startDate = subDays(new Date(), days);
    const endDate = new Date();

    // Filter orders by date range
    const filteredOrders = orders.filter(o => {
      const orderDate = new Date(o.order_date);
      return orderDate >= startDate && orderDate <= endDate && !['cancelled', 'returned'].includes(o.order_status);
    });

    // Group by day
    const dailyData = {};
    const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
    
    dateRange.forEach(date => {
      const dateKey = format(date, 'yyyy-MM-dd');
      dailyData[dateKey] = {
        date: dateKey,
        displayDate: format(date, 'MMM dd'),
        revenue: 0,
        orders: 0,
        units: 0,
        profit: 0,
        products: {}
      };
    });

    // Populate with order data
    filteredOrders.forEach(order => {
      const dateKey = order.order_date?.split('T')[0];
      if (!dailyData[dateKey]) return;

      dailyData[dateKey].orders++;
      dailyData[dateKey].revenue += order.total_amount || 0;

      (order.order_items || []).forEach(item => {
        const inv = inventory.find(i => i.id === item.inventory_id);
        const qty = item.quantity || 0;
        const revenue = qty * (item.unit_price || 0);
        const cost = qty * (inv?.purchase_price || 0);
        
        dailyData[dateKey].units += qty;
        dailyData[dateKey].profit += revenue - cost;

        if (!dailyData[dateKey].products[item.inventory_id]) {
          dailyData[dateKey].products[item.inventory_id] = {
            name: item.item_name || inv?.item_name,
            units: 0,
            revenue: 0
          };
        }
        dailyData[dateKey].products[item.inventory_id].units += qty;
        dailyData[dateKey].products[item.inventory_id].revenue += revenue;
      });
    });

    const dailyArray = Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));

    // Calculate velocity and trends
    const recentDays = dailyArray.slice(-7);
    const previousDays = dailyArray.slice(-14, -7);

    const recentAvgRevenue = recentDays.reduce((s, d) => s + d.revenue, 0) / 7;
    const previousAvgRevenue = previousDays.length > 0 ? previousDays.reduce((s, d) => s + d.revenue, 0) / 7 : recentAvgRevenue;
    const revenueTrend = previousAvgRevenue > 0 ? ((recentAvgRevenue - previousAvgRevenue) / previousAvgRevenue) * 100 : 0;

    const recentAvgUnits = recentDays.reduce((s, d) => s + d.units, 0) / 7;
    const previousAvgUnits = previousDays.length > 0 ? previousDays.reduce((s, d) => s + d.units, 0) / 7 : recentAvgUnits;
    const unitsTrend = previousAvgUnits > 0 ? ((recentAvgUnits - previousAvgUnits) / previousAvgUnits) * 100 : 0;

    // Top products by velocity
    const productVelocity = {};
    dailyArray.forEach(day => {
      Object.entries(day.products).forEach(([id, data]) => {
        if (!productVelocity[id]) {
          productVelocity[id] = { id, name: data.name, totalUnits: 0, totalRevenue: 0, days: 0 };
        }
        productVelocity[id].totalUnits += data.units;
        productVelocity[id].totalRevenue += data.revenue;
        if (data.units > 0) productVelocity[id].days++;
      });
    });

    const topProducts = Object.values(productVelocity)
      .map(p => ({
        ...p,
        velocity: p.totalUnits / days,
        avgDailyRevenue: p.totalRevenue / days
      }))
      .sort((a, b) => b.velocity - a.velocity)
      .slice(0, 10);

    return {
      daily: dailyArray,
      summary: {
        totalRevenue: dailyArray.reduce((s, d) => s + d.revenue, 0),
        totalOrders: dailyArray.reduce((s, d) => s + d.orders, 0),
        totalUnits: dailyArray.reduce((s, d) => s + d.units, 0),
        totalProfit: dailyArray.reduce((s, d) => s + d.profit, 0),
        avgDailyRevenue: recentAvgRevenue,
        avgDailyUnits: recentAvgUnits,
        revenueTrend,
        unitsTrend
      },
      topProducts
    };
  }, [inventory, orders, timeRange]);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex justify-end">
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 Days</SelectItem>
            <SelectItem value="14">Last 14 Days</SelectItem>
            <SelectItem value="30">Last 30 Days</SelectItem>
            <SelectItem value="60">Last 60 Days</SelectItem>
            <SelectItem value="90">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Trend Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <Badge className={trendData.summary.revenueTrend >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                {trendData.summary.revenueTrend >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                {Math.abs(trendData.summary.revenueTrend).toFixed(1)}%
              </Badge>
            </div>
            <p className="text-2xl font-bold text-green-600">৳{(trendData.summary.totalRevenue / 1000).toFixed(1)}K</p>
            <p className="text-xs text-slate-500">Total Revenue</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-600">{trendData.summary.totalOrders}</p>
            <p className="text-xs text-slate-500">Total Orders</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <Package className="w-5 h-5 text-purple-600" />
              <Badge className={trendData.summary.unitsTrend >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                {trendData.summary.unitsTrend >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                {Math.abs(trendData.summary.unitsTrend).toFixed(1)}%
              </Badge>
            </div>
            <p className="text-2xl font-bold text-purple-600">{trendData.summary.totalUnits}</p>
            <p className="text-xs text-slate-500">Units Sold</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-emerald-600">৳{(trendData.summary.totalProfit / 1000).toFixed(1)}K</p>
            <p className="text-xs text-slate-500">Gross Profit</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue & Profit Trend Chart */}
      <Card className="bg-white border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Revenue & Profit Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData.daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="displayDate" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `৳${(v/1000).toFixed(0)}K`} />
                <Tooltip 
                  formatter={(v, name) => [`৳${v.toLocaleString()}`, name]}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Legend />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10B981" fill="#D1FAE5" strokeWidth={2} />
                <Area type="monotone" dataKey="profit" name="Profit" stroke="#8B5CF6" fill="#EDE9FE" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Sales Velocity Chart */}
      <Card className="bg-white border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Daily Sales Velocity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData.daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="displayDate" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="units" name="Units Sold" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="orders" name="Orders" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top Products by Velocity */}
      <Card className="bg-white border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Top Products by Sales Velocity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {trendData.topProducts.map((product, idx) => (
              <div key={product.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center font-bold text-sm">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="font-medium truncate max-w-xs">{product.name}</p>
                    <p className="text-xs text-slate-500">{product.totalUnits} units in {timeRange} days</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-blue-600">{product.velocity.toFixed(1)}/day</p>
                  <p className="text-xs text-green-600">৳{product.avgDailyRevenue.toFixed(0)}/day</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}