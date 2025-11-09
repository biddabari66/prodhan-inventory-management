import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, Defs, LinearGradient, Stop } from 'recharts';
import { TrendingUp, DollarSign } from "lucide-react";
import { format } from "date-fns";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-4 bg-gray-900/80 backdrop-blur-sm text-white border border-gray-700 rounded-lg shadow-lg">
        <p className="label font-bold text-lg">{`${label}`}</p>
        <p className="intro text-green-400">{`Income: ৳${payload[0].value.toLocaleString()}`}</p>
        <p className="intro text-red-400">{`Expenses: ৳${payload[1].value.toLocaleString()}`}</p>
        <p className="desc text-violet-400 font-semibold">{`Profit: ৳${(payload[0].value - payload[1].value).toLocaleString()}`}</p>
      </div>
    );
  }
  return null;
};

export default function RevenueChart({ data, period }) {
  const { income = [], expenses = [] } = data;

  const processData = () => {
    const combinedData = {};

    [...income, ...expenses].forEach(item => {
      let dateKey;
      const date = new Date(item.income_date || item.expense_date);

      if (period === 'daily') {
        dateKey = format(date, 'h a'); // e.g., 3 PM
      } else if (period === 'weekly') {
        dateKey = format(date, 'EEE'); // e.g., 'Mon'
      } else {
        dateKey = format(date, 'MMM d'); // e.g., 'Jan 15'
      }

      if (!combinedData[dateKey]) {
        combinedData[dateKey] = { name: dateKey, income: 0, expenses: 0 };
      }

      if ('income_date' in item) {
        combinedData[dateKey].income += item.amount;
      } else {
        combinedData[dateKey].expenses += item.amount;
      }
    });

    const sortedKeys = Object.keys(combinedData).sort((a, b) => {
        if (period === 'daily') {
            const timeA = new Date(`1970/01/01 ${a.replace(' AM', '').replace(' PM', ':00')}`).getTime();
            const timeB = new Date(`1970/01/01 ${b.replace(' AM', '').replace(' PM', ':00')}`).getTime();
            return timeA - timeB;
        }
        if (period === 'weekly') {
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            return days.indexOf(a) - days.indexOf(b);
        }
        return new Date(a + ', ' + new Date().getFullYear()) - new Date(b + ', ' + new Date().getFullYear());
    });
    
    return sortedKeys.map(key => combinedData[key]);
  };
  
  const chartData = processData();

  return (
    <div className="card-glassmorphic p-6 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500/10 flex items-center justify-center rounded-2xl shadow-glow-emerald border border-emerald-500/20">
            <TrendingUp className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold font-display text-gradient">Revenue & Expense</h3>
            <p className="text-sm text-muted-foreground capitalize">{period} Overview</p>
          </div>
        </div>
        <div className="flex gap-4">
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                <span className="text-sm text-muted-foreground">Income</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <span className="text-sm text-muted-foreground">Expenses</span>
            </div>
        </div>
      </div>
      
      <div style={{ width: '100%', height: 350 }}>
        <ResponsiveContainer>
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }} barSize={20}>
            <defs>
              <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#34D399" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.2}/>
              </linearGradient>
              <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F87171" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#EF4444" stopOpacity={0.2}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
            <XAxis 
              dataKey="name" 
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `৳${(value/1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(139, 92, 246, 0.1)' }} />
            <Legend />
            <Bar dataKey="income" fill="url(#colorIncome)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" fill="url(#colorExpense)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}