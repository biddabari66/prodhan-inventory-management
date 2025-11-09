
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageSquare, Send, Users, CheckCircle, X, Clock, 
  Settings, Zap, Shield, AlertCircle, RefreshCw 
} from 'lucide-react';
import { WhatsAppActivation } from '@/entities/WhatsAppActivation';
import { User } from '@/entities/User';
import { whatsappAttendanceIntegration } from '@/functions/whatsappAttendanceIntegration';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function WhatsAppAdminPanel({ currentUser }) {
  const [activations, setActivations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('reminder');
  const [isSending, setIsSending] = useState(false);

  // Message templates with Bee ERP branding
  const messageTemplates = {
    reminder: `🐝 *Bee ERP Reminder*

Hi {name}! ⏰

Your shift starts in 15 minutes. Please remember to check in on time.

📱 Quick Check-in: {attendanceLink}

Stay productive! 💼✨
_Bee ERP HR Team_`,
    
    announcement: `🐝 *Bee ERP Announcement*

Hi {name}! 📢

{customMessage}

For any questions, contact your HR department.

Best regards,
_Bee ERP Team_🌟`,
    
    leave_approved: `🐝 *Leave Request Update*

Hi {name}! ✅

Good news! Your leave request for {date} has been *approved*.

Enjoy your time off! 🌴

_Bee ERP HR Team_`,
    
    performance: `🐝 *Performance Update*

Hi {name}! 🎯

{customMessage}

Keep up the excellent work! 💪

_Bee ERP Team_`
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [activationsList, employeesList] = await Promise.all([
        WhatsAppActivation.list('-created_date', 100),
        User.filter({ is_active: true })
      ]);
      
      setActivations(activationsList);
      setEmployees(employeesList);
    } catch (error) {
      console.error('Error loading WhatsApp admin data:', error);
      toast.error('Failed to load WhatsApp data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveActivation = async (activation) => {
    try {
      const result = await whatsappAttendanceIntegration({
        action: 'approve_activation',
        activationId: activation.id
      });
      if (result?.data?.success) {
          toast.success(`WhatsApp activation approved for ${activation.employee_name}`);
          loadData();
      } else {
          throw new Error(result?.data?.error || 'Failed to approve activation.');
      }
    } catch (error) {
      console.error('Error approving activation:', error);
      toast.error(error.message);
    }
  };

  const handleRejectActivation = async (activation) => {
    try {
      await whatsappAttendanceIntegration({
        action: 'reject_activation',
        activationId: activation.id
      });
      
      toast.success(`WhatsApp activation rejected for ${activation.employee_name}`);
      loadData();
    } catch (error) {
      console.error('Error rejecting activation:', error);
      toast.error('Failed to reject activation');
    }
  };

  const sendBulkMessage = async () => {
    if ((messageType !== 'reminder' && !message.trim()) || selectedEmployees.length === 0) {
      toast.error('Please select employees and enter a message (if applicable)');
      return;
    }

    setIsSending(true);
    try {
      const result = await whatsappAttendanceIntegration({
        action: 'send_bulk_message',
        employeeIds: selectedEmployees,
        messageType,
        customMessage: message,
        date: new Date().toLocaleDateString() // Example for date variable
      });

      if (result.data?.success) {
        const { sent, failed, skipped } = result.data.summary;
        toast.success(`Messages processed: ${sent} sent, ${failed} failed, ${skipped} skipped.`);
        setMessage('');
        setSelectedEmployees([]);
      } else {
        toast.error(result.data?.error || 'Failed to send messages');
      }
    } catch (error) {
      console.error('Error sending bulk message:', error);
      toast.error('Failed to send messages');
    } finally {
      setIsSending(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'expired': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const connectedEmployees = employees.filter(emp => emp.whatsapp_activated);
  const pendingActivations = activations.filter(act => act.status === 'pending');

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="premium-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-100">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Connected</p>
              <p className="text-2xl font-bold">{connectedEmployees.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-yellow-100">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold">{pendingActivations.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-100">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Staff</p>
              <p className="text-2xl font-bold">{employees.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-violet-100">
              <Zap className="w-6 h-6 text-violet-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Rate</p>
              <p className="text-2xl font-bold">
                {employees.length > 0 ? Math.round((connectedEmployees.length / employees.length) * 100) : 0}%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="activations" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="activations">
            <Shield className="w-4 h-4 mr-2" />
            Activation Requests
          </TabsTrigger>
          <TabsTrigger value="messaging">
            <MessageSquare className="w-4 h-4 mr-2" />
            Send Messages
          </TabsTrigger>
          <TabsTrigger value="connected">
            <Users className="w-4 h-4 mr-2" />
            Connected Users
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activations">
          <Card className="premium-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Pending Activation Requests</span>
                <Button onClick={loadData} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-violet-500" />
                </div>
              ) : pendingActivations.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground">
                  <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No pending activation requests</p>
                </div>
              ) : (
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {pendingActivations.map((activation) => (
                      <div key={activation.id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50 dark:bg-gray-800/50">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="font-semibold">{activation.employee_name}</p>
                              <p className="text-sm text-muted-foreground">
                                Code: {activation.activation_code}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Requested: {format(new Date(activation.created_date), 'MMM dd, yyyy HH:mm')}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(activation.status)}>
                            {activation.status}
                          </Badge>
                          <Button 
                            onClick={() => handleApproveActivation(activation)}
                            size="sm" 
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button 
                            onClick={() => handleRejectActivation(activation)}
                            size="sm" 
                            variant="destructive"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messaging">
          <Card className="premium-card">
            <CardHeader>
              <CardTitle>Send Bulk Messages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium">Message Type</label>
                  <Select value={messageType} onValueChange={setMessageType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reminder">Attendance Reminder</SelectItem>
                      <SelectItem value="announcement">General Announcement</SelectItem>
                      <SelectItem value="leave_approved">Leave Approval</SelectItem>
                      <SelectItem value="performance">Performance Update</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Select Employees</label>
                  <Select onValueChange={(value) => {
                    if (value === 'all') {
                      setSelectedEmployees(connectedEmployees.map(emp => emp.id));
                    } else if (value) {
                       setSelectedEmployees([value]);
                    } else {
                       setSelectedEmployees([]);
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder={`${selectedEmployees.length} selected`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Connected Employees ({connectedEmployees.length})</SelectItem>
                      {connectedEmployees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.full_name} - {emp.department}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Message Preview</label>
                <div className="mt-2 p-4 border rounded-lg bg-green-50 text-sm dark:bg-green-900/20 dark:border-green-500/20">
                  <pre className="whitespace-pre-wrap font-sans">
                    {messageTemplates[messageType].replace('{name}', 'John Doe').replace('{customMessage}', message || '[Your custom message]').replace('{date}', 'Today').replace('{attendanceLink}', 'https://yourapp.com/attendance')}
                  </pre>
                </div>
              </div>

              {messageType !== 'reminder' && (
                <div>
                  <label className="text-sm font-medium">Custom Message</label>
                  <Textarea
                    placeholder="Enter your custom message here... (required for this template)"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="mt-2"
                    rows={4}
                  />
                </div>
              )}

              <Button 
                onClick={sendBulkMessage} 
                disabled={isSending || selectedEmployees.length === 0}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-base py-3"
              >
                {isSending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send to {selectedEmployees.length} Employee{selectedEmployees.length > 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="connected">
          <Card className="premium-card">
            <CardHeader>
              <CardTitle>Connected Employees</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {connectedEmployees.map((employee) => (
                    <div key={employee.id} className="flex items-center justify-between p-4 border rounded-lg dark:border-gray-700">
                      <div>
                        <p className="font-semibold">{employee.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {employee.department} • {employee.designation}
                        </p>
                        <p className="text-xs text-green-600">
                          Connected: {employee.whatsapp_activated_date && format(new Date(employee.whatsapp_activated_date), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
