import React from 'react';
import { DollarSign, BarChart, TrendingUp, TrendingDown, Users, Package, AlertTriangle, ArrowRight } from "lucide-react";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const statIcons = {
  totalRevenue: DollarSign,
  totalExpenses: TrendingDown,
  netProfit: BarChart,
  totalAdmissions: Users,
  pendingApprovals: AlertTriangle,
  lowStockItems: Package,
};

const kpiColorSchemes = {
  totalRevenue: {
    textColor: 'text-emerald-400',
    glowClass: 'bg-emerald-500',
  },
  totalExpenses: {
    textColor: 'text-red-400',
    glowClass: 'bg-red-500',
  },
  netProfit: {
    textColor: 'text-violet-400',
    glowClass: 'bg-violet-500',
  },
  totalAdmissions: {
    textColor: 'text-sky-400',
    glowClass: 'bg-sky-500',
  },
  pendingApprovals: {
    textColor: 'text-amber-400',
    glowClass: 'bg-amber-500',
  },
  lowStockItems: {
    textColor: 'text-pink-400',
    glowClass: 'bg-pink-500',
  },
};

const StatCard = ({ title, value, change, Icon, link, scheme }) => (
    <div className="card-neumorphic-3d group p-6">
        <div className={`absolute inset-0 rounded-3xl ${scheme.glowClass} opacity-0 group-hover:opacity-10 transition-opacity duration-300 blur-2xl`}></div>
        <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl bg-black/20 shadow-inner`}>
                    <Icon className={`w-7 h-7 ${scheme.textColor}`} />
                </div>
                {change && (
                    <div className="flex items-center text-sm font-bold px-3 py-1 rounded-full bg-black/10 backdrop-blur-sm text-white/80">
                        {change.startsWith('+') ? <TrendingUp className="w-4 h-4 mr-1 text-green-400" /> : <TrendingDown className="w-4 h-4 mr-1 text-red-400" />}
                        {change}
                    </div>
                )}
            </div>
            
            <div className="space-y-1">
                <p className="text-sm font-medium text-gray-400">{title}</p>
                <p className={`text-4xl font-bold font-display tracking-tight ${scheme.textColor}`}>
                    {typeof value === 'number' ? `৳${value.toLocaleString()}` : value}
                </p>
                
                {link && (
                    <Link 
                        to={link} 
                        className="inline-flex items-center text-sm font-semibold text-gray-400 hover:text-white transition-all duration-300 group-hover:translate-x-1"
                    >
                        View Details <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                )}
            </div>
        </div>
    </div>
);

export default function DashboardStats({ stats, userRole }) {
  const { 
    totalRevenue = 0, 
    totalExpenses = 0, 
    totalAdmissions = 0,
    netProfit = 0,
    pendingApprovals = 0,
    lowStockItems = 0
  } = stats || {};

  const revenueChange = "+12.5%";
  const expenseChange = "+8.2%";
  const profitChange = netProfit >= 0 ? `+${(totalRevenue > 0 ? (netProfit/totalRevenue * 100) : 0).toFixed(1)}%` : `${(totalExpenses > 0 ? ((netProfit)/totalExpenses * 100) : 0).toFixed(1)}%`;
  const admissionChange = "+25.1%";
  
  const cards = [
    { 
      id: 'totalRevenue',
      title: "Total Revenue", 
      value: totalRevenue, 
      change: revenueChange, 
      Icon: statIcons.totalRevenue, 
      link: createPageUrl('Income'),
    },
    { 
      id: 'totalExpenses',
      title: "Total Expenses", 
      value: totalExpenses, 
      change: expenseChange, 
      Icon: statIcons.totalExpenses, 
      link: createPageUrl('Expenses'),
    },
    { 
      id: 'netProfit',
      title: "Net Profit", 
      value: netProfit, 
      change: profitChange, 
      Icon: statIcons.netProfit,
    },
    { 
      id: 'totalAdmissions',
      title: "New Admissions", 
      value: totalAdmissions, 
      change: admissionChange, 
      Icon: statIcons.totalAdmissions, 
      link: createPageUrl('Admissions'),
    },
    ...(userRole === 'admin' || userRole === 'manager' ? [{ 
      id: 'pendingApprovals',
      title: "Pending Approvals", 
      value: pendingApprovals, 
      Icon: statIcons.pendingApprovals, 
      link: createPageUrl('ExpenseApprovals'),
    }] : []),
    { 
      id: 'lowStockItems',
      title: "Low Stock Items", 
      value: lowStockItems, 
      Icon: statIcons.lowStockItems, 
      link: createPageUrl('Inventory'),
    }
  ].filter(Boolean);

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {cards.map((card, index) => (
        <div key={card.id} className="animate-slide-up" style={{animationDelay: `${index * 100}ms`}}>
          <StatCard {...card} scheme={kpiColorSchemes[card.id]} />
        </div>
      ))}
    </div>
  );
}