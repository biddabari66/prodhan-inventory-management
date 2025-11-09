import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Phone, Mail, Calendar, Edit, Star, BarChart } from 'lucide-react';

export default function LeadDetails({ lead, getEmployeeName, onEdit, onClose }) {
  if (!lead) return null;

  const getStatusColor = (status) => ({
    new: "bg-blue-100 text-blue-800",
    converted: "bg-green-100 text-green-800",
    lost: "bg-red-100 text-red-800",
  }[status] || "bg-gray-100 text-gray-800");

  return (
    <div className="p-2 space-y-6">
      <header className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold font-display">{lead.student_name}</h2>
          <p className="text-muted-foreground">{lead.course_interest?.toUpperCase()}</p>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => onEdit(lead)}><Edit className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" onClick={onClose}>&times;</Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <InfoItem icon={Phone} label="Phone" value={lead.phone} />
        <InfoItem icon={Mail} label="Email" value={lead.email || 'N/A'} />
        <InfoItem icon={User} label="Assigned To" value={getEmployeeName(lead.assigned_to)} />
        <InfoItem icon={BarChart} label="Lead Status" value={<Badge className={getStatusColor(lead.lead_status)}>{lead.lead_status}</Badge>} />
        <InfoItem icon={Star} label="Lead Score" value={`${lead.lead_score || 0}/100`} />
        <InfoItem icon={Calendar} label="Created On" value={new Date(lead.created_date).toLocaleDateString()} />
      </div>

      <Card>
        <CardHeader><CardTitle>Call History</CardTitle></CardHeader>
        <CardContent>
          {lead.call_history && lead.call_history.length > 0 ? (
            <ul className="space-y-3">
              {lead.call_history.map((call, index) => (
                <li key={index} className="border-l-2 pl-4">
                  <p className="font-semibold">{call.outcome}</p>
                  <p className="text-sm text-muted-foreground">{call.notes}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(call.date).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No call history recorded.</p>
          )}
        </CardContent>
      </Card>
      
       <Card>
        <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
        <CardContent>
           <p className="text-muted-foreground whitespace-pre-wrap">{lead.notes || 'No additional notes.'}</p>
        </CardContent>
      </Card>
    </div>
  );
}

const InfoItem = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 p-3 bg-secondary/50 rounded-lg">
    <Icon className="w-4 h-4 mt-1 text-muted-foreground" />
    <div>
      <p className="font-semibold text-foreground">{label}</p>
      <div className="text-muted-foreground">{value}</div>
    </div>
  </div>
);