import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { TrendingDown } from 'lucide-react';

const COLORS = ['#F87171', '#FB923C', '#FBBF24', '#A3E635', '#4ADE80', '#34D399', '#2DD4BF', '#67E8F9', '#60A5FA', '#A78BFA'];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-4 bg-gray-900/80 backdrop-blur-sm text-white border border-gray-700 rounded-lg shadow-lg">
        <p className="label font-bold text-lg">{`${payload[0].name}`}</p>
        <p className="intro text-cyan-400">{`Amount: ৳${payload[0].value.toLocaleString()}`}</p>
        <p className="desc text-gray-400">{`Represents ${(payload[0].payload.percent * 100).toFixed(2)}% of total`}</p>
      </div>
    );
  }
  return null;
};

export default function ExpenseBreakdown({ expenses, userRole }) {
  if (userRole === 'employee' || !expenses || expenses.length === 0) {
    return (
        <div className="card-glassmorphic p-8 flex flex-col items-center justify-center text-center h-full">
            <div className="w-16 h-16 bg-red-500/10 flex items-center justify-center rounded-2xl shadow-glow-red border border-red-500/20">
                <TrendingDown className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-lg font-bold font-display text-primary mt-6">Expense Breakdown</h3>
            <p className="text-sm text-muted-foreground mt-2">No expense data available for the selected period.</p>
        </div>
    );
  }

  const expenseByCategory = expenses.reduce((acc, expense) => {
    const category = expense.category || 'Uncategorized';
    acc[category] = (acc[category] || 0) + expense.amount;
    return acc;
  }, {});
  
  const totalExpenses = Object.values(expenseByCategory).reduce((sum, amount) => sum + amount, 0);

  const data = Object.entries(expenseByCategory).map(([name, value]) => ({
    name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value,
    percent: totalExpenses > 0 ? value / totalExpenses : 0,
  })).sort((a, b) => b.value - a.value);

  return (
    <div className="card-glassmorphic p-6 sm:p-8 h-full">
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-500/10 flex items-center justify-center rounded-2xl shadow-glow-red border border-red-500/20">
                <TrendingDown className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold font-display text-gradient">Expense Breakdown</h3>
                <p className="text-sm text-muted-foreground">Top spending categories</p>
              </div>
            </div>
        </div>
      
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer>
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={100}
                            innerRadius={60}
                            fill="#8884d8"
                            dataKey="value"
                            paddingAngle={5}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="focus:outline-none" />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="space-y-3 self-start max-h-[250px] overflow-y-auto pr-2">
                {data.slice(0, 5).map((entry, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                            <span className="text-muted-foreground">{entry.name}</span>
                        </div>
                        <div className="font-bold text-primary">
                            {(entry.percent * 100).toFixed(1)}%
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
}