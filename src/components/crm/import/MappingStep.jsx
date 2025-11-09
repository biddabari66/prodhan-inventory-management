import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function MappingStep({ csvHeaders, leadFields, onConfirm, data }) {
  const [mapping, setMapping] = useState({});

  const handleMapping = (csvField, leadField) => {
    setMapping(prev => ({ ...prev, [csvField]: leadField }));
  };

  const handleConfirm = () => {
    // Transform data based on mapping
    const mappedData = data.map(row => {
      const mappedRow = {};
      Object.entries(mapping).forEach(([csvField, leadField]) => {
        if (leadField && leadField !== 'skip') {
          mappedRow[leadField] = row[csvField];
        }
      });
      return mappedRow;
    });

    onConfirm(mappedData, mapping);
  };

  const canProceed = Object.keys(mapping).length > 0 && 
                    Object.values(mapping).some(val => val === 'student_name' || val === 'phone');

  return (
    <div className="p-4 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Map CSV Fields to Lead Fields</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Map your CSV columns to the appropriate lead fields. At minimum, map student name and phone number.
        </p>
      </div>

      <div className="space-y-4">
        {csvHeaders.map(csvHeader => (
          <Card key={csvHeader} className="premium-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">CSV Column: {csvHeader}</Label>
                  <p className="text-xs text-muted-foreground">
                    Sample: {data[0]?.[csvHeader] || 'N/A'}
                  </p>
                </div>
                <div className="w-48">
                  <Select 
                    value={mapping[csvHeader] || ''} 
                    onValueChange={(value) => handleMapping(csvHeader, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select lead field..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">Skip this field</SelectItem>
                      <SelectItem value="student_name">Student Name *</SelectItem>
                      <SelectItem value="phone">Phone Number *</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="city">City</SelectItem>
                      <SelectItem value="course_interest">Course Interest</SelectItem>
                      <SelectItem value="notes">Notes</SelectItem>
                      <SelectItem value="age">Age</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-between">
        <p className="text-sm text-muted-foreground">
          Fields marked with * are required for import
        </p>
        <Button onClick={handleConfirm} disabled={!canProceed}>
          Continue to Review
        </Button>
      </div>
    </div>
  );
}