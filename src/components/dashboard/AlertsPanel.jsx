import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertTriangle, Info, ShieldCheck, XCircle, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

const alertIcons = {
  warning: <AlertTriangle className="w-5 h-5 text-amber-400" />,
  info: <Info className="w-5 h-5 text-sky-400" />,
  danger: <XCircle className="w-5 h-5 text-red-400" />,
  success: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
};

const alertColors = {
  warning: 'border-amber-500/30 bg-amber-500/10',
  info: 'border-sky-500/30 bg-sky-500/10',
  danger: 'border-red-500/30 bg-red-500/10',
  success: 'border-emerald-500/30 bg-emerald-500/10',
};

export default function AlertsPanel({ alerts }) {
  return (
    <div className="card-glassmorphic p-6 sm:p-8 h-full">
      <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-500/10 flex items-center justify-center rounded-2xl shadow-glow-amber border border-amber-500/20">
                <Bell className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold font-display text-gradient">System Alerts</h3>
                <p className="text-sm text-muted-foreground">Actionable insights & notifications</p>
              </div>
          </div>
      </div>
      
      {alerts.length > 0 ? (
        <div className="space-y-4">
          {alerts.map((alert, index) => (
            <div key={index} className={`flex items-start gap-4 p-4 rounded-lg border ${alertColors[alert.type]}`}>
              <div className="mt-1">{alertIcons[alert.type]}</div>
              <div className="flex-1">
                <h4 className="font-bold text-primary">{alert.title}</h4>
                <p className="text-sm text-muted-foreground">{alert.message}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-8">
          <ShieldCheck className="w-12 h-12 mx-auto text-emerald-400 mb-4" />
          <h4 className="font-bold text-primary">All Systems Nominal</h4>
          <p className="text-sm">No critical alerts at this time.</p>
        </div>
      )}
    </div>
  );
}