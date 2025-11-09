import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function WhatsAppTemplates() {
  const templates = [
    { name: 'BCS_47_Welcome', status: 'Approved', category: 'UTILITY' },
    { name: 'Bank_Job_Offer', status: 'Approved', category: 'MARKETING' },
    { name: 'NTRCA_Reminder', status: 'Pending', category: 'UTILITY' },
  ];
  return (
    <Card className="premium-card">
      <CardHeader><CardTitle>Message Templates</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {templates.map(t => (
          <div key={t.name} className="flex justify-between items-center p-3 border rounded-lg">
            <div>
              <p className="font-semibold">{t.name}</p>
              <p className="text-xs text-muted-foreground">{t.category}</p>
            </div>
            <Badge className={t.status === 'Approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
              {t.status}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}