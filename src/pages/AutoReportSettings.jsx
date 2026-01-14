import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Mail, Clock, Plus, X, CheckCircle, AlertCircle, Loader2, Calendar, Send, TrendingUp, Package, BarChart3, Play, Pause } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { withPermission } from '../components/common/PermissionGuard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SearchableUserSelect from '../components/common/SearchableUserSelect';
import { useQuery } from '@tanstack/react-query';
import { User } from '@/entities/User';

function AutoReportSettingsPage() {
  const [scheduledTasks, setScheduledTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [emailInput, setEmailInput] = useState('');
  const [recipients, setRecipients] = useState([]);
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [isCreating, setIsCreating] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [reportType, setReportType] = useState('daily_sales');
  const [frequency, setFrequency] = useState('daily');
  const [selectedUserId, setSelectedUserId] = useState('');

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => User.list(),
    staleTime: 5 * 60 * 1000
  });

  useEffect(() => {
    loadScheduledTasks();
  }, []);

  const loadScheduledTasks = async () => {
    setIsLoading(true);
    try {
      const response = await base44.functions.invoke('manageScheduledReports', { action: 'list' });
      setScheduledTasks(response.data?.tasks || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
      toast.error('Failed to load scheduled tasks');
    } finally {
      setIsLoading(false);
    }
  };

  const addRecipient = () => {
    const email = emailInput.trim().toLowerCase();
    if (!email) {
      toast.error('Enter an email address');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Invalid email format');
      return;
    }
    if (recipients.includes(email)) {
      toast.error('Email already added');
      return;
    }
    setRecipients([...recipients, email]);
    setEmailInput('');
  };

  const addEmployeeBySelection = () => {
    if (!selectedUserId) {
      toast.error('Please select an employee');
      return;
    }
    const user = allUsers.find(u => u.id === selectedUserId);
    if (!user || !user.email) {
      toast.error('Employee email not found');
      return;
    }
    if (recipients.includes(user.email)) {
      toast.error('Employee already added');
      return;
    }
    setRecipients([...recipients, user.email]);
    setSelectedUserId('');
    toast.success(`Added ${user.full_name}`);
  };

  const removeRecipient = (email) => {
    setRecipients(recipients.filter(e => e !== email));
  };

  const reportTypeConfig = {
    sales_manager: {
      name: 'Sales Manager Report',
      function: 'generateSalesManagerReportNotification',
      description: 'Daily sales manager report (7PM yesterday to 7PM today BDT) with PDF download notification'
    },
    daily_sales: {
      name: 'Daily Sales Report',
      function: 'sendDailySalesEmail',
      description: 'Daily sales summary with order details and top products'
    },
    weekly_sales: {
      name: 'Weekly Sales Report',
      function: 'sendWeeklySalesReport',
      description: 'Comprehensive weekly sales analysis with trends'
    },
    low_stock: {
      name: 'Low Stock Alert',
      function: 'sendLowStockAlert',
      description: 'Alert for products below minimum stock levels'
    },
    monthly_performance: {
      name: 'Monthly Performance Report',
      function: 'sendMonthlyPerformanceReport',
      description: 'Monthly business performance analysis'
    }
  };

  const createSchedule = async () => {
    if (recipients.length === 0) {
      toast.error('Add at least one email recipient');
      return;
    }

    const config = reportTypeConfig[reportType];
    const repeatConfig = frequency === 'daily' 
      ? { repeat_interval: 1, repeat_unit: 'days' }
      : frequency === 'weekly'
      ? { repeat_interval: 1, repeat_unit: 'weeks', repeat_on_days: [1] }
      : { repeat_interval: 1, repeat_unit: 'months', repeat_on_day_of_month: 1 };

    setIsCreating(true);
    try {
      await base44.functions.invoke('manageScheduledReports', {
        action: 'create',
        task_data: {
          name: `${config.name} - ${frequency}`,
          function_name: config.function,
          description: `${config.description} | Sent to ${recipients.length} recipient(s)`,
          function_args: { recipient_emails: recipients },
          ...repeatConfig,
          start_time: scheduleTime,
          is_active: true
        }
      });

      toast.success(`✅ ${config.name} scheduled!`);
      setRecipients([]);
      loadScheduledTasks();
    } catch (error) {
      console.error('Error creating schedule:', error);
      toast.error('Failed to create schedule: ' + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const toggleTask = async (taskId) => {
    try {
      await base44.functions.invoke('manageScheduledReports', { action: 'toggle', task_id: taskId });
      toast.success('Task status updated');
      loadScheduledTasks();
    } catch (error) {
      toast.error('Failed to toggle task');
    }
  };

  const deleteTask = async (taskId) => {
    if (!confirm('Delete this scheduled report? This cannot be undone.')) return;
    
    try {
      await base44.functions.invoke('manageScheduledReports', { action: 'delete', task_id: taskId });
      toast.success('Scheduled report deleted');
      loadScheduledTasks();
    } catch (error) {
      toast.error('Failed to delete task');
    }
  };

  const sendTestEmail = async () => {
    if (recipients.length === 0) {
      toast.error('Add at least one email recipient');
      return;
    }

    const config = reportTypeConfig[reportType];
    setIsTesting(true);
    const loadingToast = toast.loading('📧 Sending test report...');
    
    try {
      const response = await base44.functions.invoke(config.function, {
        recipient_emails: recipients
      });
      
      toast.dismiss(loadingToast);
      if (response.data?.success) {
        toast.success(`✅ Test report sent successfully!`);
      } else {
        toast.error('Failed to send test report');
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Error: ' + error.message);
    } finally {
      setIsTesting(false);
    }
  };

  const reportTemplates = [
    {
      id: 'sales_manager',
      title: 'Sales Manager Report',
      description: 'Daily report (7PM-7PM BDT) with PDF notification for all employees',
      icon: TrendingUp,
      color: 'indigo',
      function: 'generateSalesManagerReportNotification',
      frequencies: ['daily']
    },
    {
      id: 'daily_sales',
      title: 'Daily Sales Report',
      description: 'Daily sales summary with order details and top products',
      icon: BarChart3,
      color: 'blue',
      function: 'sendDailySalesEmail',
      frequencies: ['daily']
    },
    {
      id: 'weekly_sales',
      title: 'Weekly Sales Report',
      description: 'Comprehensive weekly sales analysis with trends',
      icon: TrendingUp,
      color: 'purple',
      function: 'sendWeeklySalesReport',
      frequencies: ['weekly']
    },
    {
      id: 'low_stock',
      title: 'Low Stock Alert',
      description: 'Daily alert for products below minimum stock',
      icon: Package,
      color: 'orange',
      function: 'sendLowStockAlert',
      frequencies: ['daily', 'weekly']
    },
    {
      id: 'monthly_performance',
      title: 'Monthly Performance',
      description: 'Monthly business performance with growth metrics',
      icon: TrendingUp,
      color: 'green',
      function: 'sendMonthlyPerformanceReport',
      frequencies: ['monthly']
    }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center shadow-lg">
            <Mail className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Automated Reports</h1>
            <p className="text-slate-600">Schedule sales reports, alerts & performance analysis</p>
          </div>
        </div>
        <Badge className="bg-green-100 text-green-700 border-green-300 px-3 py-1">
          <CheckCircle className="w-3 h-3 mr-1" />
          Production Ready
        </Badge>
      </div>

      {/* Report Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {reportTemplates.map(template => {
          const Icon = template.icon;
          const activeCount = scheduledTasks.filter(t => t.function_name === template.function).length;
          
          return (
            <Card key={template.id} className="border-2 hover:shadow-lg transition-all cursor-pointer group">
              <CardContent className="p-5">
                <div className={`w-12 h-12 rounded-xl bg-${template.color}-100 flex items-center justify-center mb-3`}>
                  <Icon className={`w-6 h-6 text-${template.color}-600`} />
                </div>
                <h3 className="font-bold text-lg mb-1">{template.title}</h3>
                <p className="text-xs text-slate-600 mb-3">{template.description}</p>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    {activeCount} active
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setReportType(template.id);
                      setFrequency(template.frequencies[0]);
                      window.scrollTo({ top: document.querySelector('.create-schedule-card')?.offsetTop - 100, behavior: 'smooth' });
                    }}
                    className={`text-${template.color}-600 hover:bg-${template.color}-50`}
                  >
                    Configure →
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create New Schedule */}
      <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 create-schedule-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Create New Report Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Report Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="font-semibold mb-2 block">Report Type *</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales_manager">📋 Sales Manager Report (7PM-7PM)</SelectItem>
                  <SelectItem value="daily_sales">📊 Daily Sales Report</SelectItem>
                  <SelectItem value="weekly_sales">📈 Weekly Sales Report</SelectItem>
                  <SelectItem value="low_stock">⚠️ Low Stock Alert</SelectItem>
                  <SelectItem value="monthly_performance">📈 Monthly Performance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="font-semibold mb-2 block">Frequency *</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly (Every Monday)</SelectItem>
                  <SelectItem value="monthly">Monthly (1st of month)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Email Recipients */}
          <div>
            <Label className="font-semibold mb-2 block">Email Recipients *</Label>
            
            {/* Search Employee */}
            <div className="flex gap-2 mb-3 p-3 bg-slate-50 rounded-lg border">
              <div className="flex-1">
                <Label className="text-xs text-slate-600 mb-1 block">Search Employee</Label>
                <SearchableUserSelect
                  users={allUsers}
                  value={selectedUserId}
                  onValueChange={setSelectedUserId}
                  placeholder="Search by name or email..."
                />
              </div>
              <Button 
                type="button" 
                onClick={addEmployeeBySelection} 
                size="sm" 
                className="bg-green-600 hover:bg-green-700 self-end"
                disabled={!selectedUserId}
              >
                <Plus className="w-4 h-4 mr-1" /> Add Employee
              </Button>
            </div>

            {/* Manual Email Entry */}
            <div className="flex gap-2 mb-3">
              <Input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRecipient())}
                placeholder="Or enter email manually..."
                className="flex-1"
              />
              <Button type="button" onClick={addRecipient} size="sm" className="bg-blue-600">
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </div>
            
            {recipients.length > 0 && (
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <Label className="text-xs text-slate-600 mb-2 block">Selected Recipients ({recipients.length})</Label>
                <div className="flex flex-wrap gap-2">
                  {recipients.map((email, idx) => (
                    <Badge key={idx} className="bg-blue-100 text-blue-800 pr-1 py-1">
                      {email}
                      <X 
                        className="w-3 h-3 ml-1 cursor-pointer hover:text-red-600" 
                        onClick={() => removeRecipient(email)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Schedule Time */}
          <div>
            <Label className="font-semibold mb-2 block">Send Time (Asia/Dhaka)</Label>
            <div className="flex gap-3 items-center">
              <Input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="w-40"
              />
              <Badge variant="outline" className="text-slate-600">
                <Clock className="w-3 h-3 mr-1" />
                {frequency === 'daily' && 'Every day at this time'}
                {frequency === 'weekly' && 'Every Monday at this time'}
                {frequency === 'monthly' && '1st of every month at this time'}
              </Badge>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={sendTestEmail}
              disabled={isTesting || recipients.length === 0}
              variant="outline"
              className="flex-1"
            >
              {isTesting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending Test...</>
              ) : (
                <><Send className="w-4 h-4 mr-2" /> Send Test Now</>
              )}
            </Button>
            <Button
              onClick={createSchedule}
              disabled={isCreating || recipients.length === 0}
              className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600"
            >
              {isCreating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
              ) : (
                <><Calendar className="w-4 h-4 mr-2" /> Schedule Daily Report</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active Schedules - Grouped by Type */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Active Report Schedules ({scheduledTasks.length})
            </div>
            <Button
              onClick={loadScheduledTasks}
              variant="outline"
              size="sm"
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
            </div>
          ) : scheduledTasks.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No scheduled reports yet. Create one above!</p>
            </div>
          ) : (
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-6 mb-4">
                <TabsTrigger value="all">All ({scheduledTasks.length})</TabsTrigger>
                <TabsTrigger value="sales_manager">Manager</TabsTrigger>
                <TabsTrigger value="daily_sales">Daily</TabsTrigger>
                <TabsTrigger value="weekly_sales">Weekly</TabsTrigger>
                <TabsTrigger value="low_stock">Alerts</TabsTrigger>
                <TabsTrigger value="monthly_performance">Monthly</TabsTrigger>
              </TabsList>

              {['all', 'sales_manager', 'daily_sales', 'weekly_sales', 'low_stock', 'monthly_performance'].map(tabValue => {
                const filteredTasks = tabValue === 'all' 
                  ? scheduledTasks 
                  : scheduledTasks.filter(t => {
                      const template = reportTemplates.find(rt => rt.function === t.function_name);
                      return template?.id === tabValue;
                    });

                return (
                  <TabsContent key={tabValue} value={tabValue} className="space-y-3 mt-0">
                    {filteredTasks.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No {tabValue === 'all' ? '' : reportTemplates.find(rt => rt.id === tabValue)?.title} schedules yet</p>
                      </div>
                    ) : (
                      filteredTasks.map(task => {
                        const isDaily = task.repeat_unit === 'days';
                        const isWeekly = task.repeat_unit === 'weeks';
                        const isMonthly = task.repeat_unit === 'months';
                        const frequencyText = isDaily ? 'Daily' : isWeekly ? 'Weekly' : isMonthly ? 'Monthly' : 'Custom';
                        const template = reportTemplates.find(rt => rt.function === task.function_name);
                        
                        return (
                          <Card key={task.id} className={`border-2 hover:shadow-lg transition-all ${task.is_active ? 'border-green-200 bg-green-50/30' : 'border-slate-200 bg-slate-50/30'}`}>
                            <CardContent className="p-5">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-3">
                                    <Badge className={task.is_active ? 'bg-green-600' : 'bg-slate-400'}>
                                      {task.is_active ? <><Play className="w-3 h-3 mr-1" /> Active</> : <><Pause className="w-3 h-3 mr-1" /> Paused</>}
                                    </Badge>
                                    <Badge variant="outline" className={`border-${template?.color || 'blue'}-300 text-${template?.color || 'blue'}-700 bg-${template?.color || 'blue'}-50`}>
                                      {frequencyText}
                                    </Badge>
                                    <h3 className="font-bold text-lg">{task.name}</h3>
                                  </div>
                                  <p className="text-sm text-slate-600 mb-4">{task.description}</p>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="flex items-center gap-2 text-sm">
                                      <Clock className="w-4 h-4 text-slate-400" />
                                      <div>
                                        <p className="text-xs text-slate-500">Send Time</p>
                                        <p className="font-semibold">{task.start_time || 'Not set'}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                      <Mail className="w-4 h-4 text-slate-400" />
                                      <div>
                                        <p className="text-xs text-slate-500">Recipients</p>
                                        <p className="font-semibold">{task.function_args?.recipient_emails?.length || 0}</p>
                                      </div>
                                    </div>
                                    {task.next_run && (
                                      <div className="flex items-center gap-2 text-sm">
                                        <Calendar className="w-4 h-4 text-slate-400" />
                                        <div>
                                          <p className="text-xs text-slate-500">Next Run</p>
                                          <p className="font-semibold">{new Date(task.next_run).toLocaleDateString()}</p>
                                        </div>
                                      </div>
                                    )}
                                    {task.last_run && (
                                      <div className="flex items-center gap-2 text-sm">
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                        <div>
                                          <p className="text-xs text-slate-500">Last Run</p>
                                          <p className="font-semibold">{new Date(task.last_run).toLocaleDateString()}</p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  {task.function_args?.recipient_emails && (
                                    <div className="mt-3 pt-3 border-t">
                                      <p className="text-xs text-slate-500 mb-2">Email Recipients:</p>
                                      <div className="flex flex-wrap gap-1">
                                        {task.function_args.recipient_emails.map((email, idx) => (
                                          <Badge key={idx} variant="secondary" className="text-xs">
                                            {email}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div className="flex gap-2 ml-4">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => toggleTask(task.id)}
                                    className={task.is_active ? 'hover:bg-orange-50 border-orange-200' : 'hover:bg-green-50 border-green-200'}
                                  >
                                    {task.is_active ? <><Pause className="w-4 h-4 mr-1" /> Pause</> : <><Play className="w-4 h-4 mr-1" /> Activate</>}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteTask(task.id)}
                                    className="text-red-600 hover:bg-red-50"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default withPermission(AutoReportSettingsPage, 'settings', 'can_view');