
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AlertConfiguration } from '@/entities/AlertConfiguration';
import { User } from '@/entities/User';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Plus, Edit, Bell, Filter, Settings, Search, AlertTriangle, CheckCircle, X, Check } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import ErrorBoundary from '../components/common/ErrorBoundary';

// Ultra-safe Multi-select component
const MultiSelect = React.memo(({ options, value, onChange, placeholder = "Select items..." }) => {
  const [open, setOpen] = useState(false);

  // Triple-safe value and options with fallbacks
  const safeValue = React.useMemo(() => {
    try {
      if (value === null || value === undefined) return [];
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') return value ? [value] : [];
      return [];
    } catch (error) {
      console.error('Error processing value in MultiSelect:', error);
      return [];
    }
  }, [value]);

  const safeOptions = React.useMemo(() => {
    try {
      if (!options) return [];
      if (Array.isArray(options)) return options.filter(opt => opt && opt.value && opt.label);
      return [];
    } catch (error) {
      console.error('Error processing options in MultiSelect:', error);
      return [];
    }
  }, [options]);

  const handleSelect = React.useCallback((selectedValue) => {
    try {
      if (!selectedValue || !onChange || typeof onChange !== 'function') return;
      
      const isSelected = safeValue.includes(selectedValue);
      const newValue = isSelected 
        ? safeValue.filter(v => v !== selectedValue)
        : [...safeValue, selectedValue];
      
      onChange(newValue);
    } catch (error) {
      console.error('Error in handleSelect:', error);
    }
  }, [safeValue, onChange]);

  const handleRemove = React.useCallback((valueToRemove) => {
    try {
      if (!onChange || typeof onChange !== 'function') return;
      const newValue = safeValue.filter(v => v !== valueToRemove);
      onChange(newValue);
    } catch (error) {
      console.error('Error in handleRemove:', error);
    }
  }, [safeValue, onChange]);

  const selectedOptions = React.useMemo(() => {
    try {
      return safeOptions.filter(option => 
        option && option.value && safeValue.includes(option.value)
      );
    } catch (error) {
      console.error('Error filtering selected options:', error);
      return [];
    }
  }, [safeOptions, safeValue]);

  if (!Array.isArray(safeOptions) || safeOptions.length === 0) {
    return (
      <div className="w-full p-3 border rounded-md text-sm text-muted-foreground">
        No recipients available (Admin/Manager roles required)
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
            >
              {safeValue.length === 0 ? placeholder : `${safeValue.length} selected`}
              <Settings className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0">
            <Command>
              <CommandInput placeholder="Search recipients..." />
              <CommandEmpty>No recipients found.</CommandEmpty>
              <CommandGroup>
                {safeOptions.map((option) => {
                  if (!option?.value) return null;
                  return (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      onSelect={() => handleSelect(option.value)}
                    >
                      <Check
                        className={`mr-2 h-4 w-4 ${
                          safeValue.includes(option.value) ? "opacity-100" : "opacity-0"
                        }`}
                      />
                      {option.label || 'Unknown User'}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>

        {selectedOptions.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {selectedOptions.map((option) => {
              if (!option?.value) return null;
              return (
                <Badge key={option.value} variant="secondary" className="flex items-center gap-1">
                  {option.label || 'Unknown'}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-red-500"
                    onClick={() => handleRemove(option.value)}
                  />
                </Badge>
              );
            })}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
});

// Module configuration
const MODULE_CONFIG = {
  crm: {
    label: 'CRM & Leads',
    entities: {
      Lead: {
        label: 'Leads',
        fields: [
          { value: 'lead_score', label: 'Lead Score', type: 'number' },
          { value: 'conversion_probability', label: 'Conversion Probability', type: 'number' },
        ]
      }
    }
  },
  inventory: {
    label: 'Inventory Management',
    entities: {
      Inventory: {
        label: 'Inventory Items',
        fields: [
          { value: 'current_stock', label: 'Current Stock', type: 'number' },
          { value: 'minimum_stock', label: 'Minimum Stock', type: 'number' },
        ]
      }
    }
  }
};

const CONDITION_OPTIONS = [
  { value: 'less_than', label: 'Less Than (<)' },
  { value: 'greater_than', label: 'Greater Than (>)' },
  { value: 'equals', label: 'Equals (=)' }
];

const NOTIFICATION_METHODS = [
  { value: 'in_app', label: 'In-App Notification', icon: Bell },
  { value: 'email', label: 'Email', icon: Settings },
  { value: 'both', label: 'Both In-App & Email', icon: AlertTriangle }
];

// Main component wrapped in error boundary
function AlertsConfigurationContent() {
  const [alerts, setAlerts] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModule, setFilterModule] = useState('all');
  
  const [formData, setFormData] = useState(() => ({
    name: '',
    description: '',
    module: '',
    entity_type: '',
    metric_field: '',
    condition: '',
    threshold_value: '',
    notification_method: 'in_app',
    recipients: [],
    is_active: true,
  }));

  // Helper function to reset form
  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      description: '',
      module: '',
      entity_type: '',
      metric_field: '',
      condition: '',
      threshold_value: '',
      notification_method: 'in_app',
      recipients: [],
      is_active: true,
    });
    setEditingAlert(null);
  }, []);

  // Helper function to reload alerts
  const refreshAlerts = useCallback(async () => {
    try {
      const alertsResponse = await AlertConfiguration.list('-created_date');
      setAlerts(Array.isArray(alertsResponse) ? alertsResponse : []);
    } catch (error) {
      console.error('Error reloading alerts:', error);
      toast.error('Failed to reload alerts.');
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    
    const loadData = async () => {
      if (!mounted) return;
      
      setIsLoading(true);
      try {
        // Load data with individual error handling
        let alertsList = [];
        let usersList = [];
        let currentUserData = null;

        try {
          const alertsResponse = await AlertConfiguration.list('-created_date');
          alertsList = Array.isArray(alertsResponse) ? alertsResponse : [];
        } catch (error) {
          console.warn('Failed to load alerts:', error);
          toast.error('Failed to load alerts configurations.');
        }

        try {
          const usersResponse = await User.list();
          usersList = Array.isArray(usersResponse) ? usersResponse : [];
        } catch (error) {
          console.warn('Failed to load users:', error);
          toast.error('Failed to load user list for recipients.');
        }

        try {
          currentUserData = await User.me();
        } catch (error) {
          console.warn('Failed to load current user:', error);
          // Not critical, can be silent or a different toast
        }

        if (mounted) {
          setAlerts(alertsList);
          setAllUsers(usersList);
          setCurrentUser(currentUserData);
        }

      } catch (error) {
        console.error('Error in loadData:', error);
        if (mounted) {
          setAlerts([]);
          setAllUsers([]);
          setCurrentUser(null);
          toast.error('An unexpected error occurred while loading data.');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, []); // refreshAlerts is stable via useCallback, so no need to add to deps if not explicitly used here.

  const handleFormChange = React.useCallback((key, value) => {
    try {
      setFormData((prev) => {
        if (!prev) return { [key]: value };
        
        const newState = { ...prev, [key]: value };

        if (key === 'module') {
          newState.entity_type = '';
          newState.metric_field = '';
        } else if (key === 'entity_type') {
          newState.metric_field = '';
        }
        
        return newState;
      });
    } catch (error) {
      console.error('Error in handleFormChange:', error);
    }
  }, []);

  const validateForm = React.useCallback(() => {
    try {
      const required = ['name', 'module', 'entity_type', 'metric_field', 'condition', 'threshold_value', 'notification_method'];
      
      for (let field of required) {
        if (!formData || !formData[field]) {
          toast.error(`${field.replace('_', ' ')} is required`);
          return false;
        }
      }

      // Validate threshold_value based on metric field type
      const currentModuleConfig = MODULE_CONFIG[formData.module];
      const currentEntityConfig = currentModuleConfig?.entities[formData.entity_type];
      const currentMetricField = currentEntityConfig?.fields.find(f => f.value === formData.metric_field);

      if (currentMetricField && currentMetricField.type === 'number') {
        const threshold = parseFloat(formData.threshold_value);
        if (isNaN(threshold)) {
          toast.error('Threshold value must be a valid number.');
          return false;
        }
      }

      const recipients = Array.isArray(formData.recipients) ? formData.recipients : [];
      if (recipients.length === 0) {
        toast.error('At least one recipient must be selected');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in validateForm:', error);
      toast.error('Form validation error');
      return false;
    }
  }, [formData]);

  const handleSubmit = React.useCallback(async (e) => {
    try {
      e.preventDefault();
      
      if (!validateForm()) return;

      const dataToSave = {
        name: formData.name || '',
        description: formData.description || '',
        module: formData.module || '',
        entity_type: formData.entity_type || '',
        metric_field: formData.metric_field || '',
        condition: formData.condition || '',
        threshold_value: parseFloat(formData.threshold_value || '0'), // Ensure number for saving
        notification_method: formData.notification_method || 'in_app',
        recipients: Array.isArray(formData.recipients) ? formData.recipients : [],
        is_active: Boolean(formData.is_active),
      };

      if (editingAlert) {
        await AlertConfiguration.update(editingAlert.id, dataToSave);
        toast.success('Alert updated successfully!');
      } else {
        await AlertConfiguration.create(dataToSave);
        toast.success('Alert created successfully!');
      }
      
      resetForm(); 
      setIsFormOpen(false);
      await refreshAlerts(); 
      
    } catch (error) {
      console.error('Error saving alert:', error);
      toast.error('Failed to save alert: ' + (error?.message || 'Please try again.'));
    }
  }, [formData, editingAlert, validateForm, resetForm, refreshAlerts]);

  const handleEdit = React.useCallback((alert) => {
    setFormData({
      name: alert.name || '',
      description: alert.description || '',
      module: alert.module || '',
      entity_type: alert.entity_type || '',
      metric_field: alert.metric_field || '',
      condition: alert.condition || '',
      threshold_value: String(alert.threshold_value), // Convert to string for number input
      notification_method: alert.notification_method || 'in_app',
      recipients: Array.isArray(alert.recipients) ? alert.recipients.map(String) : [], // Ensure recipients are strings
      is_active: Boolean(alert.is_active),
    });
    setEditingAlert(alert);
    setIsFormOpen(true);
  }, []);

  const handleDelete = React.useCallback(async (alertId) => {
    toast.promise(AlertConfiguration.delete(alertId), {
      loading: 'Deleting alert...',
      success: () => {
        refreshAlerts(); // Reload alerts on successful deletion
        return 'Alert deleted successfully!';
      },
      error: (err) => {
        console.error('Failed to delete alert:', err);
        return 'Failed to delete alert: ' + (err?.message || 'Please try again.');
      },
    });
  }, [refreshAlerts]);

  // Safe recipient options calculation
  const recipientOptions = useMemo(() => {
    try {
      if (!Array.isArray(allUsers) || allUsers.length === 0) {
        return [];
      }
      
      const managerialRoles = ['admin', 'manager', 'department_head'];
      
      return allUsers
        .filter(user => {
          try {
            return user && 
                   typeof user === 'object' && 
                   user.id && 
                   user.job_role && 
                   managerialRoles.includes(user.job_role);
          } catch (error) {
            return false;
          }
        })
        .map(user => {
          try {
            const userId = String(user.id || '');
            const fullName = String(user.full_name || 'Unknown User');
            const role = String(user.job_role || 'manager').replace(/_/g, ' ');
            const capitalizedRole = role.charAt(0).toUpperCase() + role.slice(1);
            
            return {
              value: userId,
              label: `${fullName} (${capitalizedRole})`,
            };
          } catch (error) {
            console.error('Error processing user for recipient options:', error);
            return null;
          }
        })
        .filter(Boolean);
        
    } catch (error) {
      console.error('Error creating recipient options:', error);
      return [];
    }
  }, [allUsers]);

  const filteredAlerts = useMemo(() => {
    try {
      if (!Array.isArray(alerts)) return [];
      
      return alerts.filter(alert => {
        try {
          if (!alert || typeof alert !== 'object') return false;
          
          const searchLower = (searchTerm || '').toLowerCase();
          const matchesSearch = !searchTerm || 
            (alert.name || '').toLowerCase().includes(searchLower) ||
            (alert.description || '').toLowerCase().includes(searchLower);
            
          const matchesModule = filterModule === 'all' || alert.module === filterModule;
          
          return matchesSearch && matchesModule;
        } catch (error) {
          console.error('Error filtering alert:', error);
          return false;
        }
      });
    } catch (error) {
      console.error('Error filtering alerts:', error);
      return [];
    }
  }, [alerts, searchTerm, filterModule]);

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-flex items-center gap-2 text-muted-foreground">
          <Settings className="w-5 h-5 animate-spin" />
          Loading alert configurations...
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="p-8 space-y-8">
        <header className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold font-display text-gradient">System Alerts Configuration</h1>
            <p className="text-lg text-muted-foreground mt-1">Create intelligent alerts to monitor key business metrics.</p>
          </div>
          <Dialog open={isFormOpen} onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) {
              resetForm(); // Reset form when dialog closes without saving
            }
          }}>
            <DialogTrigger asChild>
              <Button className="btn-primary">
                <Plus className="w-4 h-4 mr-2" />
                Create Alert
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingAlert ? 'Edit Alert' : 'Create New Alert'}</DialogTitle>
              </DialogHeader>
              
              <ErrorBoundary>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Alert Name *</Label>
                      <Input
                        id="name"
                        value={formData?.name || ''}
                        onChange={(e) => handleFormChange('name', e.target.value)}
                        placeholder="e.g., Low Stock Alert"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="module">Module *</Label>
                      <Select 
                        value={formData?.module || ''} 
                        onValueChange={(value) => handleFormChange('module', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select module" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(MODULE_CONFIG).map(([key, config]) => (
                            <SelectItem key={key} value={key}>
                              {config.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Entity Type *</Label>
                      <Select 
                        value={formData?.entity_type || ''} 
                        onValueChange={(value) => handleFormChange('entity_type', value)}
                        disabled={!formData?.module}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select entity" />
                        </SelectTrigger>
                        <SelectContent>
                          {formData?.module && MODULE_CONFIG[formData.module] && 
                            Object.entries(MODULE_CONFIG[formData.module].entities).map(([key, entity]) => (
                              <SelectItem key={key} value={key}>
                                {entity.label}
                              </SelectItem>
                            ))
                          }
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Metric Field *</Label>
                      <Select 
                        value={formData?.metric_field || ''} 
                        onValueChange={(value) => handleFormChange('metric_field', value)}
                        disabled={!formData?.entity_type}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select field" />
                        </SelectTrigger>
                        <SelectContent>
                          {formData?.module && formData?.entity_type && 
                            MODULE_CONFIG[formData.module]?.entities?.[formData.entity_type]?.fields?.map((field) => (
                              <SelectItem key={field.value} value={field.value}>
                                {field.label}
                              </SelectItem>
                            ))
                          }
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Condition *</Label>
                      <Select 
                        value={formData?.condition || ''} 
                        onValueChange={(value) => handleFormChange('condition', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select condition" />
                        </SelectTrigger>
                        <SelectContent>
                          {CONDITION_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Threshold Value *</Label>
                      <Input
                        type="number"
                        value={formData?.threshold_value || ''}
                        onChange={(e) => handleFormChange('threshold_value', e.target.value)}
                        placeholder="Enter value"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Notification Method *</Label>
                      <Select 
                        value={formData?.notification_method || 'in_app'} 
                        onValueChange={(value) => handleFormChange('notification_method', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                        <SelectContent>
                          {NOTIFICATION_METHODS.map((method) => (
                            <SelectItem key={method.value} value={method.value}>
                              <div className="flex items-center gap-2">
                                <method.icon className="w-4 h-4" />
                                {method.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Recipients (Admin/Manager Only) *</Label>
                      <MultiSelect
                        options={recipientOptions}
                        value={formData?.recipients || []}
                        onChange={(values) => handleFormChange('recipients', values)}
                        placeholder="Select recipients"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Description (Optional)</Label>
                    <Textarea
                      value={formData?.description || ''}
                      onChange={(e) => handleFormChange('description', e.target.value)}
                      placeholder="Describe when this alert should trigger..."
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData?.is_active || false}
                      onCheckedChange={(checked) => handleFormChange('is_active', checked)}
                    />
                    <Label>Active (alert will trigger when conditions are met)</Label>
                  </div>

                  <div className="flex justify-end space-x-2 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" className="btn-primary">
                      {editingAlert ? 'Update Alert' : 'Create Alert'}
                    </Button>
                  </div>
                </form>
              </ErrorBoundary>
            </DialogContent>
          </Dialog>
        </header>

        <Card className="premium-card">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search alerts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterModule} onValueChange={setFilterModule}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Modules" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modules</SelectItem>
                  {Object.entries(MODULE_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardHeader>
            <CardTitle>Alert Configurations ({filteredAlerts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredAlerts.length === 0 ? (
              <div className="text-center py-12">
                <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  No alert configurations found
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first alert to start monitoring key business metrics.
                </p>
                <Button onClick={() => { setIsFormOpen(true); resetForm(); }} className="btn-primary">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Alert
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Alert Name</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAlerts.map((alert) => (
                    <TableRow key={alert?.id || Math.random()}>
                      <TableCell>
                        <div className="font-medium">{alert?.name || 'Unknown Alert'}</div>
                        {alert?.description && (
                          <div className="text-xs text-muted-foreground mt-1">{alert.description}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {MODULE_CONFIG[alert?.module]?.label || alert?.module || 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {Array.isArray(alert?.recipients) ? `${alert.recipients.length} recipients` : 'No recipients'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={alert?.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {alert?.is_active ? (
                            <>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Active
                            </>
                          ) : (
                            'Inactive'
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" title="Edit" onClick={() => handleEdit(alert)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Delete" onClick={() => handleDelete(alert.id)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
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
    </ErrorBoundary>
  );
}

// Export wrapped component
export default function AlertsConfiguration() {
  return (
    <ErrorBoundary>
      <AlertsConfigurationContent />
    </ErrorBoundary>
  );
}
