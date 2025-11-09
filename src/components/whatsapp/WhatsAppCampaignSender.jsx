import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function WhatsAppCampaignSender({ isOpen, onClose }) {
  // Mock data
  const templates = [{id: 1, name: "BCS_47_Welcome"}, {id: 2, name: "Bank_Job_Offer"}];
  const batches = ["BCS 47th Batch", "Bank Job Q1", "NTRCA Group C"];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Create New WhatsApp Campaign</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Campaign Name</Label>
            <Input placeholder="e.g., Q3 Marketing Push" />
          </div>
          <div className="space-y-2">
            <Label>Select Target Batch/Group</Label>
            <Select>
              <SelectTrigger><SelectValue placeholder="Select a group..." /></SelectTrigger>
              <SelectContent>
                {batches.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Select Message Template</Label>
            <Select>
              <SelectTrigger><SelectValue placeholder="Select a template..." /></SelectTrigger>
              <SelectContent>
                {templates.map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Message Body (Preview)</Label>
            <Textarea readOnly value="Dear {{student_name}}, welcome to the BCS 47th Batch! Your classes start on..." />
          </div>
          <Button className="w-full btn-primary">Send Campaign</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}