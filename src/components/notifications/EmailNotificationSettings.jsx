import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User } from '@/entities/User';
import { Mail, Send, Users, Bell } from 'lucide-react';
import EmailNotificationService from './EmailNotificationService';
import { toast } from 'sonner';

const EMAIL_TRIGGERS = [
  { id: 'welcome', label: 'Welcome New Employees', description: 'Send welcome email when new employee is added' },
  { id: 'task_assignment', label: 'Task Assignments', description: 'Notify employees when tasks are assigned' },
  { id: 'expense_approval', label: 'Expense Approvals', description: 'Notify when expenses are approved/rejected' },
  { id: 'lead_assignment', label: 'Lead Assignments', description: 'Notify sales team of new lead assignments' },
  { id: 'attendance_alerts', label: 'Attendance Alerts', description: 'Alert managers about attendance issues' },
  { id: 'incentive_reports', label: 'Monthly Incentive Reports', description: 'Send monthly performance incentive reports' },
  { id: 'admission_notifications', label: 'Admission Notifications', description: 'Notify about new admissions processed' },
];

export default function EmailNotificationSettings() {
  const [emailSettings, setEmailSettings] = useState({});
  const [bulkEmailData, setBulkEmailData] = useState({
    recipients: 'all',
    subject: '',
    message: ''
  });
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const employeeList = await User.list();
      setEmployees(employeeList);
      
      // Load email settings from localStorage or set defaults
      const savedSettings = localStorage.getItem('biddabari_email_settings');
      if (savedSettings) {
        setEmailSettings(JSON.parse(savedSettings));
      } else {
        // Default all triggers to enabled
        const defaultSettings = EMAIL_TRIGGERS.reduce((acc, trigger) => {
          acc[trigger.id] = true;
          return acc;
        }, {});
        setEmailSettings(defaultSettings);
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
      toast.error('Failed to load notification settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSettingChange = (triggerId, enabled) => {
    const newSettings = { ...emailSettings, [triggerId]: enabled };
    setEmailSettings(newSettings);
    localStorage.setItem('biddabari_email_settings', JSON.stringify(newSettings));
    toast.success(`${EMAIL_TRIGGERS.find(t => t.id === triggerId)?.label} ${enabled ? 'enabled' : 'disabled'}`);
  };

  const sendBulkEmail = async () => {
    if (!bulkEmailData.subject || !bulkEmailData.message) {
      toast.error('Please fill in subject and message');
      return;
    }

    setIsSending(true);
    try {
      let recipients = [];
      
      if (bulkEmailData.recipients === 'all') {
        recipients = employees.map(emp => ({ name: emp.full_name, email: emp.email }));
      } else if (bulkEmailData.recipients === 'admins') {
        recipients = employees
          .filter(emp => emp.job_role === 'admin')
          .map(emp => ({ name: emp.full_name, email: emp.email }));
      } else if (bulkEmailData.recipients === 'managers') {
        recipients = employees
          .filter(emp => emp.job_role === 'department_head' || emp.job_role === 'manager')
          .map(emp => ({ name: emp.full_name, email: emp.email }));
      } else {
        // Specific department
        recipients = employees
          .filter(emp => emp.department === bulkEmailData.recipients)
          .map(emp => ({ name: emp.full_name, email: emp.email }));
      }

      const results = await EmailNotificationService.sendBulkEmail({
        recipients,
        subject: bulkEmailData.subject,
        body: this.generateBulkEmailTemplate(bulkEmailData.message)
      });

      const successCount = results.filter(r => r.status === 'sent').length;
      const failCount = results.filter(r => r.status === 'failed').length;

      toast.success(`Bulk email sent! ${successCount} successful, ${failCount} failed`);
      
      // Reset form
      setBulkEmailData({ recipients: 'all', subject: '', message: '' });
      
    } catch (error) {
      console.error('Bulk email failed:', error);
      toast.error('Failed to send bulk email');
    } finally {
      setIsSending(false);
    }
  };

  const generateBulkEmailTemplate = (message) => {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa;">
        <div style="background: linear-gradient(135deg, #7C3AED, #EC4899); padding: 40px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Biddabari ERP Notification</h1>
        </div>
        <div style="padding: 40px;">
          <h2 style="color: #333; margin-top: 0;">Dear {{name}},</h2>
          <div style="color: #666; line-height: 1.6; font-size: 16px;">
            ${message.replace(/\n/g, '<br>')}
          </div>
          <div style="text-align: center; margin-top: 40px;">
            <div style="background: #7C3AED; color: white; padding: 20px; border-radius: 12px; display: inline-block;">
              <strong style="font-size: 18px;">Biddabari ERP System</strong>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  const sendTestEmail = async () => {
    try {
      const currentUser = await User.me();
      await EmailNotificationService.sendEmail({
        to: currentUser.email,
        subject: 'Test Email - Biddabari ERP',
        body: this.generateBulkEmailTemplate('This is a test email to verify that the email notification system is working correctly.')
      });
      toast.success('Test email sent to your email address!');
    } catch (error) {
      console.error('Test email failed:', error);
      toast.error('Failed to send test email');
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading email notification settings...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Email Notification Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {EMAIL_TRIGGERS.map(trigger => (
            <div key={trigger.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">{trigger.label}</h4>
                <p className="text-sm text-muted-foreground">{trigger.description}</p>
              </div>
              <Switch
                checked={emailSettings[trigger.id] || false}
                onCheckedChange={(checked) => handleSettingChange(trigger.id, checked)}
              />
            </div>
          ))}
          <div className="pt-4 border-t">
            <Button onClick={sendTestEmail} variant="outline">
              <Mail className="w-4 h-4 mr-2" />
              Send Test Email
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Bulk Email Sender
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Recipients</Label>
            <Select 
              value={bulkEmailData.recipients} 
              onValueChange={(value) => setBulkEmailData({...bulkEmailData, recipients: value})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                <SelectItem value="admins">Admins Only</SelectItem>
                <SelectItem value="managers">Managers & Department Heads</SelectItem>
                <SelectItem value="admission">Admission Department</SelectItem>
                <SelectItem value="it">IT Department</SelectItem>
                <SelectItem value="marketing">Marketing Department</SelectItem>
                <SelectItem value="rnd">R&D Department</SelectItem>
                <SelectItem value="service">Service Department</SelectItem>
                <SelectItem value="nextpage">Nextpage Department</SelectItem>
                <SelectItem value="publication">Publication Department</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Subject</Label>
            <Input
              value={bulkEmailData.subject}
              onChange={(e) => setBulkEmailData({...bulkEmailData, subject: e.target.value})}
              placeholder="Enter email subject..."
            />
          </div>

          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              value={bulkEmailData.message}
              onChange={(e) => setBulkEmailData({...bulkEmailData, message: e.target.value})}
              placeholder="Enter your message here... Use {{name}} to personalize with recipient names."
              rows={6}
            />
          </div>

          <Button 
            onClick={sendBulkEmail} 
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            disabled={isSending}
          >
            <Send className="w-4 h-4 mr-2" />
            {isSending ? 'Sending...' : 'Send Bulk Email'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}