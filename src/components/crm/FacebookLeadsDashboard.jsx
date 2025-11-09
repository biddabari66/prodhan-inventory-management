import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Facebook, BarChart3, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

export default function FacebookLeadsDashboard({ leads }) {
  const totalFbLeads = leads.length;
  const convertedFbLeads = leads.filter(l => l.lead_status === 'converted').length;
  const conversionRate = totalFbLeads > 0 ? (convertedFbLeads / totalFbLeads) * 100 : 0;
  
  // Create some mock data for chart
  const data = [
    { name: 'Jan', leads: 30 },
    { name: 'Feb', leads: 45 },
    { name: 'Mar', leads: 60 },
    { name: 'Apr', leads: 50 },
    { name: 'May', leads: 70 },
  ];

  return (
    <div className="modern-card border-0 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-sky-500 rounded-xl flex items-center justify-center">
          <Facebook className="w-5 h-5 text-white" />
        </div>
        <h3 className="text-lg font-bold modern-text">Facebook Leads</h3>
      </div>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm modern-text-muted">Total Leads</span>
          <span className="font-bold modern-text">{totalFbLeads}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm modern-text-muted">Converted Leads</span>
          <span className="font-bold modern-text">{convertedFbLeads}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm modern-text-muted">Conversion Rate</span>
          <span className="font-bold modern-text">{conversionRate.toFixed(1)}%</span>
        </div>
      </div>
      <div className="h-48 mt-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
            <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
            <YAxis stroke="var(--text-muted)" fontSize={12} />
            <Tooltip
              contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '0.5rem' }}
              labelStyle={{ color: 'var(--text-primary)' }}
            />
            <Bar dataKey="leads" fill="url(#colorLeads)" radius={[4, 4, 0, 0]} />
            <defs>
                <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.2}/>
                </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}