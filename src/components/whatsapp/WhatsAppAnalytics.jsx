import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function WhatsAppAnalytics() {
  const data = [
    { name: 'BCS Campaign', sent: 400, delivered: 380, read: 320 },
    { name: 'Bank Campaign', sent: 300, delivered: 290, read: 250 },
    { name: 'NTRCA Offer', sent: 500, delivered: 450, read: 400 },
  ];
  return (
    <Card className="premium-card">
      <CardHeader><CardTitle>Campaign Analytics</CardTitle></CardHeader>
      <CardContent>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={data}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="sent" fill="#8884d8" />
              <Bar dataKey="delivered" fill="#82ca9d" />
              <Bar dataKey="read" fill="#ffc658" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}