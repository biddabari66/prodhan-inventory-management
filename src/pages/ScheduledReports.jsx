import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Clock, Plus, Edit, Trash2, Play, Pause, Mail, Calendar,
  FileText, Send, CheckCircle, XCircle, Loader2, Bell
} from 'lucide-react';
import { format, addDays, addWeeks, addMonths } from 'date-fns';
import { toast } from 'sonner';

import { ScheduledReport } from '@/entities/ScheduledReport';
import { CustomReport } from '@/entities/CustomReport';
import { User } from '@/entities/User';

export default function ScheduledReports() {
  const [currentUser, setCurrentUser] = useState(null);
  const [scheduledReports, setScheduledReports] = useState([]);
  const [savedReports, setSavedReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);

  const [formData, setFormData] = useState({
    report_name: '',
    description: '',
    configuration: null,
    frequency: 'weekly',
    schedule_day: 1,
    schedule_time: '09:00',
    recipients: '',
    output_format: 'pdf',
    is_active: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [user, schedules, reports] = await Promise.all([
        User.me(),
        ScheduledReport.list('-created_date', 100),
        CustomReport.list('-created_date', 50)
      ]);
      setCurrentUser(user);
      setScheduledReports(schedules);
      setSavedReports(reports);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateNextRun = (frequency, scheduleDay, scheduleTime) => {
    const now = new Date();
    let nextRun = new Date();
    
    const [hours, minutes] = scheduleTime.split(':').map(Number);
    nextRun.setHours(hours, minutes, 0, 0);

    switch (frequency) {
      case 'daily':
        if (nextRun <= now) nextRun = addDays(nextRun, 1);
        break;
      case 'weekly':
        const currentDay = now.getDay();
        const targetDay = scheduleDay;
        let daysToAdd = targetDay - currentDay;
        if (daysToAdd <= 0 || (daysToAdd === 0 && nextRun <= now)) {
          daysToAdd += 7;
        }
        nextRun = addDays(nextRun, daysToAdd);
        break;
      case 'monthly':
        nextRun.setDate(scheduleDay);
        if (nextRun <= now) nextRun = addMonths(nextRun, 1);
        break;
      case 'quarterly':
        nextRun.setDate(scheduleDay);
        if (nextRun <= now) nextRun = addMonths(nextRun, 3);
        break;
    }
    return nextRun;
  };

  const handleCreate = async () => {
    if (!formData.report_name.trim()) {
      toast.error('Please enter a report name');
      return;
    }
    if (!formData.recipients.trim()) {
      toast.error('Please enter at least one recipient email');
      return;
    }

    try {
      const recipientList = formData.recipients.split(',').map(e => e.trim()).filter(Boolean);
      const nextRun = calculateNextRun(formData.frequency, formData.schedule_day, formData.schedule_time);

      const scheduleData = {
        ...formData,
        recipients: recipientList,
        next_run: nextRun.toISOString(),
        created_by_id: currentUser.id,
        created_by_name: currentUser.full_name,
        run_count: 0
      };

      if (editingSchedule) {
        await ScheduledReport.update(editingSchedule.id, scheduleData);
        toast.success('Schedule updated');
      } else {
        await ScheduledReport.create(scheduleData);
        toast.success('Schedule created');
      }

      setShowCreateDialog(false);
      setEditingSchedule(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.error('Failed to save schedule');
    }
  };

  const handleEdit = (schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      report_name: schedule.report_name,
      description: schedule.description || '',
      configuration: schedule.configuration,
      frequency: schedule.frequency,
      schedule_day: schedule.schedule_day || 1,
      schedule_time: schedule.schedule_time || '09:00',
      recipients: schedule.recipients?.join(', ') || '',
      output_format: schedule.output_format || 'pdf',
      is_active: schedule.is_active
    });
    setShowCreateDialog(true);
  };

  const handleToggleActive = async (schedule) => {
    try {
      await ScheduledReport.update(schedule.id, { is_active: !schedule.is_active });
      toast.success(schedule.is_active ? 'Schedule paused' : 'Schedule activated');
      loadData();
    } catch (error) {
      toast.error('Failed to update schedule');
    }
  };

  const handleDelete = async (scheduleId) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;
    
    try {
      await ScheduledReport.delete(scheduleId);
      toast.success('Schedule deleted');
      loadData();
    } catch (error) {
      toast.error('Failed to delete schedule');
    }
  };

  const resetForm = () => {
    setFormData({
      report_name: '',
      description: '',
      configuration: null,
      frequency: 'weekly',
      schedule_day: 1,
      schedule_time: '09:00',
      recipients: '',
      output_format: 'pdf',
      is_active: true
    });
  };

  const getFrequencyLabel = (freq) => {
    const labels = {
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      quarterly: 'Quarterly'
    };
    return labels[freq] || freq;
  };

  const getDayLabel = (frequency, day) => {
    if (frequency === 'weekly') {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return days[day] || '';
    }
    return `Day ${day}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/30">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-pink-600 flex items-center justify-center shadow-lg">
              <Clock className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Scheduled Reports</h1>
              <p className="text-slate-600 mt-1">Automate report generation and distribution</p>
            </div>
          </div>

          <Dialog open={showCreateDialog} onOpenChange={(open) => {
            setShowCreateDialog(open);
            if (!open) {
              setEditingSchedule(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-violet-600 to-purple-600">
                <Plus className="w-4 h-4 mr-2" />
                Create Schedule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingSchedule ? 'Edit Schedule' : 'Create New Schedule'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Report Name</Label>
                  <Input
                    value={formData.report_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, report_name: e.target.value }))}
                    placeholder="Monthly Sales Report"
                  />
                </div>

                <div>
                  <Label>Description (optional)</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="What this report contains..."
                    rows={2}
                  />
                </div>

                <div>
                  <Label>Base Report (optional)</Label>
                  <Select 
                    value={formData.configuration ? 'saved' : 'none'}
                    onValueChange={(val) => {
                      if (val === 'none') {
                        setFormData(prev => ({ ...prev, configuration: null }));
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a saved report configuration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Custom Configuration --</SelectItem>
                      {savedReports.map(report => (
                        <SelectItem 
                          key={report.id} 
                          value={report.id}
                          onClick={() => setFormData(prev => ({ ...prev, configuration: report.configuration }))}
                        >
                          {report.report_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Frequency</Label>
                    <Select value={formData.frequency} onValueChange={(val) => setFormData(prev => ({ ...prev, frequency: val }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>{formData.frequency === 'weekly' ? 'Day of Week' : 'Day of Month'}</Label>
                    <Select 
                      value={String(formData.schedule_day)} 
                      onValueChange={(val) => setFormData(prev => ({ ...prev, schedule_day: Number(val) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {formData.frequency === 'weekly' ? (
                          <>
                            <SelectItem value="0">Sunday</SelectItem>
                            <SelectItem value="1">Monday</SelectItem>
                            <SelectItem value="2">Tuesday</SelectItem>
                            <SelectItem value="3">Wednesday</SelectItem>
                            <SelectItem value="4">Thursday</SelectItem>
                            <SelectItem value="5">Friday</SelectItem>
                            <SelectItem value="6">Saturday</SelectItem>
                          </>
                        ) : (
                          Array.from({ length: 28 }, (_, i) => (
                            <SelectItem key={i + 1} value={String(i + 1)}>Day {i + 1}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Time</Label>
                    <Input
                      type="time"
                      value={formData.schedule_time}
                      onChange={(e) => setFormData(prev => ({ ...prev, schedule_time: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Output Format</Label>
                    <Select value={formData.output_format} onValueChange={(val) => setFormData(prev => ({ ...prev, output_format: val }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="csv">CSV</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Recipients (comma-separated emails)</Label>
                  <Textarea
                    value={formData.recipients}
                    onChange={(e) => setFormData(prev => ({ ...prev, recipients: e.target.value }))}
                    placeholder="email1@example.com, email2@example.com"
                    rows={2}
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                    />
                    <Label>Active</Label>
                  </div>
                  <Button onClick={handleCreate}>
                    {editingSchedule ? 'Update Schedule' : 'Create Schedule'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-violet-500 to-purple-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-violet-100 text-sm">Total Schedules</p>
                  <p className="text-3xl font-bold">{scheduledReports.length}</p>
                </div>
                <Calendar className="w-8 h-8 text-violet-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm">Active</p>
                  <p className="text-3xl font-bold">{scheduledReports.filter(r => r.is_active).length}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-emerald-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-100 text-sm">Paused</p>
                  <p className="text-3xl font-bold">{scheduledReports.filter(r => !r.is_active).length}</p>
                </div>
                <Pause className="w-8 h-8 text-amber-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Total Runs</p>
                  <p className="text-3xl font-bold">{scheduledReports.reduce((sum, r) => sum + (r.run_count || 0), 0)}</p>
                </div>
                <Send className="w-8 h-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Schedules List */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              All Scheduled Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scheduledReports.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">No scheduled reports yet</p>
                <p className="text-sm">Create your first schedule to automate report distribution</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report Name</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Next Run</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scheduledReports.map(schedule => (
                    <TableRow key={schedule.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{schedule.report_name}</p>
                          {schedule.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{schedule.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <Badge variant="secondary">{getFrequencyLabel(schedule.frequency)}</Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {getDayLabel(schedule.frequency, schedule.schedule_day)} at {schedule.schedule_time}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {schedule.next_run ? format(new Date(schedule.next_run), 'PPp') : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{schedule.recipients?.length || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="uppercase text-xs">{schedule.output_format}</Badge>
                      </TableCell>
                      <TableCell>
                        {schedule.is_active ? (
                          <Badge className="bg-emerald-100 text-emerald-800">Active</Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-800">Paused</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleToggleActive(schedule)}>
                            {schedule.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(schedule)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(schedule.id)} className="text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}