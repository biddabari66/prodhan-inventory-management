import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle } from 'lucide-react';

export default function ReviewStep({ data, onConfirm, onBack }) {
  const validLeads = data.filter(lead => lead.student_name && lead.phone);
  const invalidLeads = data.filter(lead => !lead.student_name || !lead.phone);

  return (
    <div className="p-4 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Review Import Data</h3>
        <p className="text-sm text-muted-foreground">
          Please review the mapped data before importing.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="premium-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              Valid Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{validLeads.length}</div>
            <p className="text-xs text-muted-foreground">Leads ready for import</p>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="w-5 h-5" />
              Invalid Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{invalidLeads.length}</div>
            <p className="text-xs text-muted-foreground">Leads missing required fields</p>
          </CardContent>
        </Card>
      </div>

      {validLeads.length > 0 && (
        <Card className="premium-card">
          <CardHeader>
            <CardTitle>Sample Valid Leads (First 3)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {validLeads.slice(0, 3).map((lead, index) => (
                <div key={index} className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{lead.student_name}</p>
                      <p className="text-sm text-muted-foreground">{lead.phone}</p>
                    </div>
                    {lead.email && (
                      <Badge variant="outline">{lead.email}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {invalidLeads.length > 0 && (
        <Card className="premium-card border-orange-200">
          <CardHeader>
            <CardTitle className="text-orange-600">Invalid Leads (Will be Skipped)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              The following leads are missing required fields and will not be imported:
            </p>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {invalidLeads.slice(0, 5).map((lead, index) => (
                <div key={index} className="p-2 bg-orange-50 rounded text-sm">
                  Row {index + 1}: Missing {!lead.student_name ? 'name' : ''} {!lead.phone ? 'phone' : ''}
                </div>
              ))}
              {invalidLeads.length > 5 && (
                <p className="text-xs text-muted-foreground">
                  ...and {invalidLeads.length - 5} more
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back to Mapping
        </Button>
        <Button 
          onClick={onConfirm} 
          disabled={validLeads.length === 0}
          className="btn-primary"
        >
          Import {validLeads.length} Valid Leads
        </Button>
      </div>
    </div>
  );
}