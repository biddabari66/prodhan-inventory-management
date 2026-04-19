import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { AlertConfiguration } from "@/entities/AlertConfiguration";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Bell, Plus, Edit, Trash2, Mail, Send, AlertTriangle, FileText, Package, DollarSign, Users, Calendar } from "lucide-react";
import { toast } from "sonner";
import { base44 } from '@/api/base44Client';
import { withPermission } from '../components/common/PermissionGuard';

/**
 * 🔔 ENHANCED ALERTS CONFIGURATION PAGE
 * - System alerts with thresholds
 * - Automated email notifications
 * - Department-specific reports
 * - Low stock alerts
 * - Role & department-based customization
 */

// Multi-Select Component
function MultiSelect({ value = [], onChange, options = [] }) {
  const [selected, setSelected] = useState(Array.isArray(value) ? value : []);

  useEffect(() => {
    setSelected(Array.isArray(value) ? value : []);
  }, [value]);

  const handleToggle = (optionValue) => {
    const newSelected = selected.includes(optionValue)
      ? selected.filter(v => v !== optionValue)
      : [...selected, optionValue];
    
    setSelected(newSelected);
    if (onChange) {
      onChange(newSelected);
    }
  };

  if (!Array.isArray(options)) {
    console.error('MultiSelect: options must be an array', options);
    return null;
  }

  return (
    <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
      {options.length === 0 ? (
        <p className="text-sm text-muted-foreground">No options available</p>
      ) : (
        options.map((option) => (
          <label
            key={option.value}
            className="flex items-center gap-2 cursor-pointer hover:bg-accent p-2 rounded"
          >
            <input
              type="checkbox"
              checked={selected.includes(option.value)}
              onChange={() => handleToggle(option.value)}
              className="w-4 h-4"
            />
            <span className="text-sm">{option.label}</span>
          </label>
        ))
      )}
    </div>
  );
}

// Configuration Constants
const MODULE_CONFIGS = {
  inventory: {
    label: 'Inventory',
    icon: Package,
    entities: ['Inventory'],
    metrics: [
      { value: 'current_stock', label: 'Current Stock Level' },
      { value: 'reorder_point', label: 'Reorder Point' },
      { value: 'minimum_stock', label: 'Minimum Stock' }
    ]
  },
  finance: {
    label: 'Finance',
    icon: DollarSign,
    entities: ['Expense', 'Income', 'Budget'],
    metrics: [
      { value: 'amount', label: 'Amount' },
      { value: 'total_expenses', label: 'Total Expenses' },
      { value: 'budget_utilization', label: 'Budget Utilization %' }
    ]
  },
  hr: {
    label: 'HR',
    icon: Users,
    entities: ['Attendance', 'Task'],
    metrics: [
      { value: 'attendance_rate', label: 'Attendance Rate %' },
      { value: 'overdue_tasks', label: 'Overdue Tasks Count' }
    ]
  },
  crm: {
    label: 'CRM',
    icon: Users,
    entities: ['Lead', 'Admission'],
    metrics: [
      { value: 'conversion_rate', label: 'Conversion Rate %' },
      { value: 'lead_response_time', label: 'Response Time (hours)' }
    ]
  }
};

const CONDITION_OPTIONS = [
  { value: 'less_than', label: 'Less Than' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'equals', label: 'Equals' }
];

const NOTIFICATION_METHODS = [
  { value: 'in_app', label: 'In-App Notification' },
  { value: 'email', label: 'Email' },
  { value: 'both', label: 'Both In-App & Email' }
];

const DEPARTMENT_OPTIONS = [
  { value: 'boibari', label: '📚 Boibari' },
  { value: 'prodhan_com_e_commerce', label: '🛒 Prodhan.com' },
  { value: 'biddabari_publication', label: '📖 Biddabari Publication' },
  { value: 'it', label: '💻 IT' },
  { value: 'admission', label: '🎓 Admission' },
  { value: 'service', label: '🛠️ Service' },
  { value: 'marketing', label: '📣 Marketing' },
  { value: 'sales', label: '💼 Sales' },
  { value: 'finance', label: '💰 Finance' },
  { value: 'hr', label: '👥 HR' },
  { value: 'r_and_d', label: '🔬 R&D' }
];

const ROLE_OPTIONS = [
  { value: 'admin', label: '👑 Admin' },
  { value: 'super_admin', label: '⚡ Super Admin' },
  { value: 'finance_head', label: '💰 Finance Head' },
  { value: 'department_head', label: '🎯 Department Head' },
  { value: 'manager', label: '📊 Manager' },
  { value: 'inventory_manager', label: '📦 Inventory Manager' },
  { value: 'hr_manager', label: '👥 HR Manager' },
  { value: 'sales_manager', label: '💼 Sales Manager' }
];

const REPORT_FREQUENCY_OPTIONS = [
  { value: 'daily', label: '📅 Daily' },
  { value: 'weekly', label: '📆 Weekly' },
  { value: 'monthly', label: '🗓️ Monthly' }
];

function AlertsConfigurationPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModule, setFilterModule] = useState('all');
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    module: '',
    entity_type: '',
    metric_field: '',
    condition: 'less_than',
    threshold_value: 0,
    notification_method: 'in_app',
    recipients: [],
    recipient_roles: [],
    recipient_departments: [],
    is_active: true,
    alert_type: 'threshold', // threshold | scheduled_report | low_stock
    report_type: 'department_report', // department_report | inventory_report
    report_frequency: 'daily',
    include_pdf: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [user, alertList, userList] = await Promise.all([
        User.me(),
        AlertConfiguration.list(),
        User.list()
      ]);
      setCurrentUser(user);
      setAlerts(alertList);
      setUsers(userList);
    } catch (error) {
      console.error("Error loading alerts:", error);
      toast.error("Failed to load alerts");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Validate recipients
      const recipients = [
        ...formData.recipients,
        ...users.filter(u => 
          (formData.recipient_roles.length > 0 && formData.recipient_roles.includes(u.job_role)) ||
          (formData.recipient_departments.length > 0 && formData.recipient_departments.includes(u.department))
        ).map(u => u.email)
      ];

      const uniqueRecipients = [...new Set(recipients)];

      if (uniqueRecipients.length === 0) {
        toast.error("Please select at least one recipient");
        return;
      }

      const alertData = {
        ...formData,
        recipients: uniqueRecipients
      };

      if (editingAlert) {
        await AlertConfiguration.update(editingAlert.id, alertData);
        toast.success("Alert updated successfully");
      } else {
        await AlertConfiguration.create(alertData);
        toast.success("Alert created successfully");
      }

      setIsFormOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error("Error saving alert:", error);
      toast.error("Failed to save alert");
    }
  };

  const handleEdit = (alert) => {
    setEditingAlert(alert);
    setFormData({
      name: alert.name || '',
      description: alert.description || '',
      module: alert.module || '',
      entity_type: alert.entity_type || '',
      metric_field: alert.metric_field || '',
      condition: alert.condition || 'less_than',
      threshold_value: alert.threshold_value || 0,
      notification_method: alert.notification_method || 'in_app',
      recipients: alert.recipients || [],
      recipient_roles: alert.recipient_roles || [],
      recipient_departments: alert.recipient_departments || [],
      is_active: alert.is_active !== false,
      alert_type: alert.alert_type || 'threshold',
      report_type: alert.report_type || 'department_report',
      report_frequency: alert.report_frequency || 'daily',
      include_pdf: alert.include_pdf !== false
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (alertId) => {
    if (confirm("Are you sure you want to delete this alert?")) {
      try {
        await AlertConfiguration.delete(alertId);
        toast.success("Alert deleted successfully");
        loadData();
      } catch (error) {
        console.error("Error deleting alert:", error);
        toast.error("Failed to delete alert");
      }
    }
  };

  const handleSendTestEmail = async () => {
    setIsSendingTest(true);
    try {
      const response = await base44.functions.invoke('sendTestEmail', {
        recipient_email: currentUser.email
      });
      
      if (response.data.success) {
        toast.success(`✅ Test email sent to ${currentUser.email}!`);
      } else {
        toast.error("Failed to send test email");
      }
    } catch (error) {
      console.error("Test email error:", error);
      toast.error("Failed to send test email");
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleSendDepartmentReport = async (department) => {
    try {
      toast.info(`📊 Generating ${department} report...`);
      
      const response = await base44.functions.invoke('sendDepartmentReport', {
        department: department,
        include_pdf: true
      });
      
      if (response.data.success) {
        toast.success(`✅ ${department} report sent successfully!`);
      } else {
        toast.error("Failed to send report");
      }
    } catch (error) {
      console.error("Department report error:", error);
      toast.error("Failed to send department report");
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      module: '',
      entity_type: '',
      metric_field: '',
      condition: 'less_than',
      threshold_value: 0,
      notification_method: 'in_app',
      recipients: [],
      recipient_roles: [],
      recipient_departments: [],
      is_active: true,
      alert_type: 'threshold',
      report_type: 'department_report',
      report_frequency: 'daily',
      include_pdf: true
    });
    setEditingAlert(null);
  };

  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = !searchTerm || 
      alert.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesModule = filterModule === 'all' || alert.module === filterModule;
    
    return matchesSearch && matchesModule;
  });

  const getAlertTypeIcon = (alertType) => {
    switch (alertType) {
      case 'scheduled_report': return FileText;
      case 'low_stock': return Package;
      case 'threshold': return AlertTriangle;
      default: return Bell;
    }
  };

  const getAlertTypeBadge = (alertType) => {
    switch (alertType) {
      case 'scheduled_report': return 'bg-blue-100 text-blue-800';
      case 'low_stock': return 'bg-orange-100 text-orange-800';
      case 'threshold': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return <div className="p-6 text-foreground">Loading alerts configuration...</div>;
  }

  return (
    <div className="p-6 space-y-6 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold font-display text-gradient">Alerts & Notifications</h1>
          <p className="text-lg text-muted-foreground mt-1">
            Configure automated alerts, email notifications, and department reports
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleSendTestEmail} 
            variant="outline"
            disabled={isSendingTest}
          >
            {isSendingTest ? (
              <>
                <Mail className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Test Email
              </>
            )}
          </Button>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button className="bg-violet-600 hover:bg-violet-700" onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Create Alert
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingAlert ? 'Edit Alert Configuration' : 'Create New Alert'}
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleFormSubmit} className="space-y-6">
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="basic">Basic Info</TabsTrigger>
                    <TabsTrigger value="conditions">Conditions</TabsTrigger>
                    <TabsTrigger value="recipients">Recipients</TabsTrigger>
                  </TabsList>

                  {/* Basic Info Tab */}
                  <TabsContent value="basic" className="space-y-4">
                    <div>
                      <Label>Alert Type</Label>
                      <Select
                        value={formData.alert_type}
                        onValueChange={(value) => setFormData({...formData, alert_type: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="threshold">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4" />
                              Threshold Alert
                            </div>
                          </SelectItem>
                          <SelectItem value="scheduled_report">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              Scheduled Report
                            </div>
                          </SelectItem>
                          <SelectItem value="low_stock">
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4" />
                              Low Stock Alert
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Alert Name *</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="e.g., Low Stock Alert - Boibari"
                        required
                      />
                    </div>

                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        placeholder="What does this alert monitor?"
                        rows={3}
                      />
                    </div>

                    {formData.alert_type === 'scheduled_report' && (
                      <>
                        <div>
                          <Label>Report Type</Label>
                          <Select
                            value={formData.report_type}
                            onValueChange={(value) => setFormData({...formData, report_type: value})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="department_report">📊 Department Report</SelectItem>
                              <SelectItem value="inventory_report">📦 Inventory Report</SelectItem>
                              <SelectItem value="finance_report">💰 Finance Report</SelectItem>
                              <SelectItem value="sales_report">💼 Sales Report</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Report Frequency</Label>
                          <Select
                            value={formData.report_frequency}
                            onValueChange={(value) => setFormData({...formData, report_frequency: value})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {REPORT_FREQUENCY_OPTIONS.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={formData.include_pdf}
                            onCheckedChange={(checked) => setFormData({...formData, include_pdf: checked})}
                          />
                          <Label>Include PDF Attachment</Label>
                        </div>
                      </>
                    )}
                  </TabsContent>

                  {/* Conditions Tab */}
                  <TabsContent value="conditions" className="space-y-4">
                    {formData.alert_type !== 'scheduled_report' && (
                      <>
                        <div>
                          <Label>Module *</Label>
                          <Select
                            value={formData.module}
                            onValueChange={(value) => {
                              setFormData({...formData, module: value, entity_type: '', metric_field: ''});
                            }}
                            required
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select module" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(MODULE_CONFIGS).map(([key, config]) => {
                                const Icon = config.icon;
                                return (
                                  <SelectItem key={key} value={key}>
                                    <div className="flex items-center gap-2">
                                      <Icon className="w-4 h-4" />
                                      {config.label}
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>

                        {formData.module && (
                          <div>
                            <Label>Entity Type *</Label>
                            <Select
                              value={formData.entity_type}
                              onValueChange={(value) => setFormData({...formData, entity_type: value, metric_field: ''})}
                              required
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select entity" />
                              </SelectTrigger>
                              <SelectContent>
                                {MODULE_CONFIGS[formData.module]?.entities.map(entity => (
                                  <SelectItem key={entity} value={entity}>
                                    {entity}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {formData.entity_type && (
                          <div>
                            <Label>Metric Field *</Label>
                            <Select
                              value={formData.metric_field}
                              onValueChange={(value) => setFormData({...formData, metric_field: value})}
                              required
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select metric" />
                              </SelectTrigger>
                              <SelectContent>
                                {MODULE_CONFIGS[formData.module]?.metrics.map(metric => (
                                  <SelectItem key={metric.value} value={metric.value}>
                                    {metric.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Condition *</Label>
                            <Select
                              value={formData.condition}
                              onValueChange={(value) => setFormData({...formData, condition: value})}
                              required
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {CONDITION_OPTIONS.map(opt => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label>Threshold Value *</Label>
                            <Input
                              type="number"
                              value={formData.threshold_value}
                              onChange={(e) => setFormData({...formData, threshold_value: parseFloat(e.target.value)})}
                              placeholder="e.g., 10"
                              required
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </TabsContent>

                  {/* Recipients Tab */}
                  <TabsContent value="recipients" className="space-y-4">
                    <div>
                      <Label>Notification Method *</Label>
                      <Select
                        value={formData.notification_method}
                        onValueChange={(value) => setFormData({...formData, notification_method: value})}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {NOTIFICATION_METHODS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Recipient Roles</Label>
                      <MultiSelect
                        value={formData.recipient_roles}
                        onChange={(values) => setFormData({...formData, recipient_roles: values})}
                        options={ROLE_OPTIONS}
                      />
                    </div>

                    <div>
                      <Label>Recipient Departments</Label>
                      <MultiSelect
                        value={formData.recipient_departments}
                        onChange={(values) => setFormData({...formData, recipient_departments: values})}
                        options={DEPARTMENT_OPTIONS}
                      />
                    </div>

                    <div className="flex items-center space-x-2 p-4 bg-accent rounded-lg">
                      <Switch
                        checked={formData.is_active}
                        onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                      />
                      <Label>Alert Active</Label>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-blue-800">
                        💡 <strong>Recipients Preview:</strong> This alert will notify{' '}
                        {users.filter(u => 
                          formData.recipient_roles.includes(u.job_role) ||
                          formData.recipient_departments.includes(u.department)
                        ).length} user(s)
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-violet-600 hover:bg-violet-700">
                    {editingAlert ? 'Update Alert' : 'Create Alert'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="premium-card cursor-pointer hover:shadow-lg transition-all" onClick={() => handleSendDepartmentReport('boibari')}>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold">📚 Boibari Report</p>
                <p className="text-xs text-muted-foreground">Send now</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card cursor-pointer hover:shadow-lg transition-all" onClick={() => handleSendDepartmentReport('prodhan_com_e_commerce')}>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="font-semibold">🛒 Prodhan.com Report</p>
                <p className="text-xs text-muted-foreground">Send now</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card cursor-pointer hover:shadow-lg transition-all" onClick={() => handleSendDepartmentReport('all_low_stock')}>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <Package className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="font-semibold">📦 Low Stock Alert</p>
                <p className="text-xs text-muted-foreground">Send to inventory mgrs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card cursor-pointer hover:shadow-lg transition-all" onClick={() => handleSendDepartmentReport('finance_summary')}>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold">💰 Finance Report</p>
                <p className="text-xs text-muted-foreground">Send to finance team</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <Input
              placeholder="Search alerts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="md:w-1/3"
            />
            <Select value={filterModule} onValueChange={setFilterModule}>
              <SelectTrigger className="md:w-1/4">
                <SelectValue placeholder="Filter by module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                {Object.entries(MODULE_CONFIGS).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Alerts List */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Configured Alerts ({filteredAlerts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No alerts configured yet. Create your first alert!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Alert Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAlerts.map((alert) => {
                    const AlertIcon = getAlertTypeIcon(alert.alert_type);
                    return (
                      <TableRow key={alert.id}>
                        <TableCell>
                          <div>
                            <p className="font-semibold">{alert.name}</p>
                            {alert.description && (
                              <p className="text-xs text-muted-foreground">{alert.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getAlertTypeBadge(alert.alert_type)}>
                            <AlertIcon className="w-3 h-3 mr-1" />
                            {alert.alert_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{alert.module || 'N/A'}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {alert.recipients?.length || 0} recipient(s)
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={alert.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {alert.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(alert)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(alert.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default AlertsConfigurationPage;