import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, CheckCircle, Percent, Target } from 'lucide-react';

export default function LeadStats({ leads }) {
  const totalLeads = leads.length;
  const convertedLeads = leads.filter(l => l.lead_status === 'converted').length;
  const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : 0;
  const averageLeadScore = totalLeads > 0 ? (leads.reduce((sum, l) => sum + (l.lead_score || 0), 0) / totalLeads).toFixed(0) : 0;

  const stats = [
    { title: "Total Leads", value: totalLeads, icon: Users, color: "text-blue-500" },
    { title: "Converted Leads", value: convertedLeads, icon: CheckCircle, color: "text-green-500" },
    { title: "Conversion Rate", value: `${conversionRate}%`, icon: Percent, color: "text-violet-500" },
    { title: "Avg. Lead Score", value: averageLeadScore, icon: Target, color: "text-orange-500" },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {stats.map(stat => (
        <Card key={stat.title} className="premium-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
            <stat.icon className={`w-5 h-5 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-display">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}