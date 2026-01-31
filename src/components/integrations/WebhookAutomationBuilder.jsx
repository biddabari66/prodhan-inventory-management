import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { 
  Webhook, Plus, Settings, Play, Trash2, CheckCircle, 
  XCircle, Activity, Zap, Link2, AlertCircle, Code
} from 'lucide-react';

export default function WebhookAutomationBuilder() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState(null);
  const [formData, setFormData] = useState({
    automation_name: '',
    webhook_url: '',
    trigger_module: 'sales',
    trigger_event: 'create',
    filter_conditions: {},
    response_action: 'no_action',
    response_mapping: {},
    is_active: true
  });

  const { data: automations = [], isLoading } = useQuery({
    queryKey: ['webhook-automations'],
    queryFn: () => base44.entities.WebhookAutomation.list('-created_date', 100),
    staleTime: 60 * 1000
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.WebhookAutomation.create({
        ...data,
        created_by_id: currentUser?.id,
        created_by_name: currentUser?.full_name
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['webhook-automations']);
      toast.success('Webhook automation created!');
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error('Failed to create automation: ' + error.message);
    }
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }) => {
      return await base44.entities.WebhookAutomation.update(id, { is_active: isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['webhook-automations']);
      toast.success('Automation updated!');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.WebhookAutomation.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['webhook-automations']);
      toast.success('Automation deleted!');
    }
  });

  const resetForm = () => {
    setFormData({
      automation_name: '',
      webhook_url: '',
      trigger_module: 'sales',
      trigger_event: 'create',
      filter_conditions: {},
      response_action: 'no_action',
      response_mapping: {},
      is_active: true
    });
    setEditingAutomation(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.automation_name || !formData.webhook_url) {
      toast.error('Please fill in all required fields');
      return;
    }
    createMutation.mutate(formData);
  };

  const testWebhook = async (automation) => {
    const loadingToast = toast.loading('Testing webhook...');
    try {
      const testPayload = {
        test: true,
        automation_name: automation.automation_name,
        trigger_module: automation.trigger_module,
        trigger_event: automation.trigger_event,
        timestamp: new Date().toISOString()
      };

      const response = await fetch(automation.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload)
      });

      toast.dismiss(loadingToast);
      
      if (response.ok) {
        const result = await response.json();
        toast.success('Webhook test successful!');
        console.log('Webhook response:', result);
      } else {
        toast.error('Webhook returned error: ' + response.statusText);
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Webhook test failed: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-violet-600 flex items-center justify-center">
              <Webhook className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Webhook Automations</h3>
              <p className="text-sm text-slate-600 font-normal">Create automated integrations with external systems</p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className="bg-violet-600 text-white">{automations.length} Active</Badge>
              <Badge variant="outline">{automations.filter(a => a.is_active).length} Enabled</Badge>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-violet-600 hover:bg-violet-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Automation
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Webhook Automation</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                  <div>
                    <Label>Automation Name *</Label>
                    <Input
                      value={formData.automation_name}
                      onChange={(e) => setFormData({...formData, automation_name: e.target.value})}
                      placeholder="e.g., Sync Orders to External System"
                      required
                    />
                  </div>

                  <div>
                    <Label>Webhook URL *</Label>
                    <Input
                      type="url"
                      value={formData.webhook_url}
                      onChange={(e) => setFormData({...formData, webhook_url: e.target.value})}
                      placeholder="https://your-system.com/webhook"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Trigger Module *</Label>
                      <Select value={formData.trigger_module} onValueChange={(v) => setFormData({...formData, trigger_module: v})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sales">Sales Orders</SelectItem>
                          <SelectItem value="purchase_orders">Purchase Orders</SelectItem>
                          <SelectItem value="inventory">Inventory</SelectItem>
                          <SelectItem value="customers">Customers</SelectItem>
                          <SelectItem value="production">Production</SelectItem>
                          <SelectItem value="returns">Returns & Damages</SelectItem>
                          <SelectItem value="payroll">Payroll</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Trigger Event *</Label>
                      <Select value={formData.trigger_event} onValueChange={(v) => setFormData({...formData, trigger_event: v})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="create">On Create</SelectItem>
                          <SelectItem value="update">On Update</SelectItem>
                          <SelectItem value="delete">On Delete</SelectItem>
                          <SelectItem value="status_change">On Status Change</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Response Action</Label>
                    <Select value={formData.response_action} onValueChange={(v) => setFormData({...formData, response_action: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no_action">No Action (Fire & Forget)</SelectItem>
                        <SelectItem value="update_entity">Update Entity with Response</SelectItem>
                        <SelectItem value="create_entity">Create New Entity</SelectItem>
                        <SelectItem value="send_notification">Send Notification</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.response_action === 'update_entity' && (
                    <div>
                      <Label>Response Mapping (JSON)</Label>
                      <Textarea
                        value={JSON.stringify(formData.response_mapping, null, 2)}
                        onChange={(e) => {
                          try {
                            setFormData({...formData, response_mapping: JSON.parse(e.target.value)});
                          } catch {}
                        }}
                        placeholder='{"response_field": "entity_field"}'
                        rows={4}
                        className="font-mono text-xs"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Map webhook response fields to entity fields (e.g., tracking_code → courier_tracking_code)
                      </p>
                    </div>
                  )}

                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                      <div className="text-xs text-blue-800">
                        <strong>How it works:</strong> When the selected event occurs in the chosen module, 
                        the system will automatically send a POST request to your webhook URL with the entity data.
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-violet-600 hover:bg-violet-700">
                      Create Automation
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Automations List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Active Automations</CardTitle>
        </CardHeader>
        <CardContent>
          {automations.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Webhook className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No webhook automations configured yet</p>
              <p className="text-sm">Click "Create Automation" to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Stats</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {automations.map((automation) => (
                  <TableRow key={automation.id}>
                    <TableCell className="font-medium">{automation.automation_name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className="w-fit">
                          {automation.trigger_module}
                        </Badge>
                        <span className="text-xs text-slate-500">on {automation.trigger_event}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-blue-600">
                      {automation.webhook_url}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={automation.is_active}
                        onCheckedChange={(checked) => 
                          toggleMutation.mutate({ id: automation.id, isActive: checked })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Badge className="bg-green-100 text-green-800 text-xs">
                          ✓ {automation.success_count || 0}
                        </Badge>
                        {(automation.error_count || 0) > 0 && (
                          <Badge className="bg-red-100 text-red-800 text-xs">
                            ✗ {automation.error_count}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testWebhook(automation)}
                          className="h-8"
                          title="Test webhook"
                        >
                          <Play className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(automation.id)}
                          className="h-8 text-red-600 hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
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

      {/* Documentation Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Code className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="flex-1 text-sm">
              <h4 className="font-semibold text-blue-900 mb-2">Webhook Payload Format</h4>
              <pre className="bg-white p-3 rounded-lg border border-blue-200 text-xs overflow-x-auto">
{`{
  "event": "create|update|delete|status_change",
  "module": "sales|inventory|...",
  "entity_id": "abc123",
  "entity_data": { /* full entity object */ },
  "old_data": { /* for updates only */ },
  "timestamp": "2026-01-31T12:00:00Z"
}`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}