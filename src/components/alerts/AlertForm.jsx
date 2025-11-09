import React, { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { AlertConfiguration } from '@/entities/AlertConfiguration';
import { toast } from 'sonner';
import MultiSelect from '../ui/multi-select';

const CONDITIONS = [
  { value: 'less_than', label: 'Is less than' },
  { value: 'greater_than', label: 'Is greater than' },
  { value: 'equals', label: 'Is equal to' },
  { value: 'not_equals', label: 'Is not equal to' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Does not contain' }
];

const NOTIFICATION_METHODS = ['in_app', 'email'];

export default function AlertForm({ alert, entities, users, entityMap, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    name: alert?.name || '',
    description: alert?.description || '',
    entity_type: alert?.entity_type || '',
    metric_field: alert?.metric_field || '',
    condition: alert?.condition || 'less_than',
    threshold_value: alert?.threshold_value || '',
    notification_method: alert?.notification_method || 'in_app',
    recipients: alert?.recipients || [],
    is_active: alert?.is_active ?? true,
  });
  
  const [availableFields, setAvailableFields] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const recipientOptions = useMemo(() => [
    { value: 'admin', label: 'All Admins' },
    { value: 'manager', label: 'All Managers' },
    { value: 'department_head', label: 'All Department Heads' },
    ...users.map(u => ({ value: u.email, label: `${u.full_name} (${u.email})` }))
  ], [users]);

  useEffect(() => {
    if (formData.entity_type && entityMap[formData.entity_type]) {
      loadEntityFields(formData.entity_type);
    }
  }, [formData.entity_type, entityMap]);

  const loadEntityFields = async (entityName) => {
    try {
      const Entity = entityMap[entityName];
      if (Entity && Entity.schema) {
        const schema = await Entity.schema();
        const fields = Object.entries(schema.properties || {})
          .map(([key, prop]) => ({
            key,
            type: prop.type,
            label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
          }))
          .filter(field => ['number', 'string', 'boolean'].includes(field.type));
        
        setAvailableFields(fields);
        
        // Reset metric_field if it's not valid for the new entity
        if (formData.metric_field && !fields.find(f => f.key === formData.metric_field)) {
          handleInputChange('metric_field', '');
        }
      }
    } catch (error) {
      console.error(`Error loading fields for ${entityName}:`, error);
      setAvailableFields([]);
      toast.error(`Could not load fields for ${entityName}`);
    }
  };

  const handleInputChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name.trim()) {
      toast.error('Alert name is required');
      return;
    }
    
    if (!formData.entity_type) {
      toast.error('Please select an entity to monitor');
      return;
    }
    
    if (!formData.metric_field) {
      toast.error('Please select a field to monitor');
      return;
    }
    
    if (!formData.threshold_value && formData.threshold_value !== 0) {
      toast.error('Please enter a threshold value');
      return;
    }
    
    if (!formData.recipients.length) {
      toast.error('Please select at least one recipient');
      return;
    }

    setIsSubmitting(true);
    try {
      const alertData = {
        ...formData,
        threshold_value: parseFloat(formData.threshold_value) || 0,
        module: formData.entity_type.toLowerCase()
      };

      if (alert?.id) {
        await AlertConfiguration.update(alert.id, alertData);
        toast.success("Alert configuration updated successfully!");
      } else {
        await AlertConfiguration.create(alertData);
        toast.success("Alert configuration created successfully!");
      }
      
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Failed to save alert:", error);
      toast.error("Failed to save alert configuration. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 py-4">
      {/* Basic Information */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="name">Alert Name *</Label>
            <Input 
              id="name" 
              value={formData.name} 
              onChange={e => handleInputChange('name', e.target.value)} 
              placeholder="e.g., 'Low Inventory Alert', 'High Expense Warning'" 
              required 
            />
          </div>
          <div className="flex items-center space-x-2 mt-6">
            <Switch 
              id="is_active" 
              checked={formData.is_active} 
              onCheckedChange={v => handleInputChange('is_active', v)} 
            />
            <Label htmlFor="is_active">Active</Label>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="description">Description (Optional)</Label>
          <Textarea 
            id="description" 
            value={formData.description} 
            onChange={e => handleInputChange('description', e.target.value)} 
            placeholder="Describe what this alert does and when it should trigger..."
            rows={2}
          />
        </div>
      </div>

      {/* Condition Configuration */}
      <fieldset className="border rounded-lg p-4 space-y-4">
        <legend className="text-sm font-medium px-2">Alert Condition</legend>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="entity_type">Monitor Entity *</Label>
            <Select 
              value={formData.entity_type} 
              onValueChange={v => handleInputChange('entity_type', v)} 
              required
            >
              <SelectTrigger id="entity_type">
                <SelectValue placeholder="Select what to monitor..." />
              </SelectTrigger>
              <SelectContent>
                {entities.map(entity => (
                  <SelectItem key={entity} value={entity}>
                    {entity.replace(/([A-Z])/g, ' $1').trim()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="metric_field">Field to Monitor *</Label>
            <Select 
              value={formData.metric_field} 
              onValueChange={v => handleInputChange('metric_field', v)} 
              required 
              disabled={!formData.entity_type}
            >
              <SelectTrigger id="metric_field">
                <SelectValue placeholder="Select field to monitor..." />
              </SelectTrigger>
              <SelectContent>
                {availableFields.map(field => (
                  <SelectItem key={field.key} value={field.key}>
                    {field.label} ({field.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="condition">Condition *</Label>
            <Select 
              value={formData.condition} 
              onValueChange={v => handleInputChange('condition', v)} 
              required
            >
              <SelectTrigger id="condition">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONDITIONS.map(condition => (
                  <SelectItem key={condition.value} value={condition.value}>
                    {condition.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="threshold_value">Threshold Value *</Label>
            <Input 
              id="threshold_value" 
              type="number" 
              step="0.01"
              value={formData.threshold_value} 
              onChange={e => handleInputChange('threshold_value', e.target.value)} 
              placeholder="Enter threshold value..."
              required 
            />
          </div>
        </div>
      </fieldset>
      
      {/* Notification Configuration */}
      <fieldset className="border rounded-lg p-4 space-y-4">
        <legend className="text-sm font-medium px-2">Notification Settings</legend>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="notification_method">Delivery Method *</Label>
            <Select 
              value={formData.notification_method} 
              onValueChange={v => handleInputChange('notification_method', v)} 
              required
            >
              <SelectTrigger id="notification_method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NOTIFICATION_METHODS.map(method => (
                  <SelectItem key={method} value={method}>
                    {method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="recipients">Recipients *</Label>
            <MultiSelect
              options={recipientOptions}
              value={formData.recipients}
              onChange={(selected) => handleInputChange('recipients', selected)}
              placeholder="Select who should be notified..."
            />
          </div>
        </div>
      </fieldset>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : alert ? 'Update Alert' : 'Create Alert'}
        </Button>
      </div>
    </form>
  );
}