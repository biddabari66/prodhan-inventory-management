import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { WhatsAppTemplate } from '@/entities/WhatsAppTemplate';
import { User } from '@/entities/User';
import { Plus, Send, MessageSquare, Users, Clock, Award } from 'lucide-react';
import { toast } from 'sonner';
import { whatsappAttendanceIntegration } from '@/functions/whatsappAttendanceIntegration';

const TEMPLATE_CATEGORIES = [
    { id: 'attendance', name: 'Attendance', icon: Clock, color: 'blue' },
    { id: 'hr_announcement', name: 'HR Announcements', icon: Users, color: 'purple' },
    { id: 'performance', name: 'Performance', icon: Award, color: 'green' },
    { id: 'general', name: 'General', icon: MessageSquare, color: 'gray' }
];

const DEPARTMENTS = [
    'biddabari_publication',
    'it', 
    'boibari',
    'admission',
    'service', 
    'marketing',
    'prodhan_com_e_commerce',
    'sales',
    'r_and_d'
];

const COMMON_VARIABLES = [
    '{name}', '{department}', '{employee_id}', '{date}', '{time}', '{shift_time}'
];

export default function WhatsAppTemplateManager({ currentUser }) {
    const [templates, setTemplates] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    
    const [newTemplate, setNewTemplate] = useState({
        template_name: '',
        category: 'general',
        message_template: '',
        department_specific: ''
    });

    const [bulkSendConfig, setBulkSendConfig] = useState({
        template_id: '',
        department: '',
        custom_variables: {}
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [templatesData, employeesData] = await Promise.all([
                WhatsAppTemplate.list('-created_date'),
                User.filter({ whatsapp_activated: true })
            ]);
            setTemplates(templatesData);
            setEmployees(employeesData);
        } catch (error) {
            console.error('Failed to load data:', error);
            toast.error('Failed to load templates and employees');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateTemplate = async () => {
        try {
            const template = await WhatsAppTemplate.create({
                ...newTemplate,
                created_by: currentUser.id,
                variables: extractVariables(newTemplate.message_template)
            });

            setTemplates([template, ...templates]);
            setIsCreateDialogOpen(false);
            setNewTemplate({
                template_name: '',
                category: 'general',
                message_template: '',
                department_specific: ''
            });
            
            toast.success('Template created successfully!');
        } catch (error) {
            console.error('Failed to create template:', error);
            toast.error('Failed to create template');
        }
    };

    const handleBulkSend = async () => {
        if (!bulkSendConfig.template_id || !bulkSendConfig.department) {
            toast.error('Please select a template and department');
            return;
        }

        try {
            const template = templates.find(t => t.id === bulkSendConfig.template_id);
            
            const response = await whatsappAttendanceIntegration({
                action: 'send_bulk_update',
                department: bulkSendConfig.department,
                messageTemplate: template.message_template,
                variables: bulkSendConfig.custom_variables
            });

            if (response.data.success) {
                toast.success(`Messages sent successfully! ${response.data.totalSent} sent, ${response.data.totalFailed} failed`);
                
                // Update template usage count
                await WhatsAppTemplate.update(template.id, {
                    usage_count: (template.usage_count || 0) + response.data.totalSent
                });
                
                setBulkSendConfig({ template_id: '', department: '', custom_variables: {} });
                setIsSendDialogOpen(false);
                loadData(); // Refresh data
            } else {
                throw new Error(response.data.error || 'Failed to send messages');
            }
        } catch (error) {
            console.error('Failed to send bulk messages:', error);
            toast.error('Failed to send messages');
        }
    };

    const extractVariables = (template) => {
        const matches = template.match(/{[\w_]+}/g);
        return matches ? matches.map(match => match.slice(1, -1)) : [];
    };

    const insertVariable = (variable) => {
        setNewTemplate({
            ...newTemplate,
            message_template: newTemplate.message_template + variable
        });
    };

    if (isLoading) {
        return (
            <Card className="premium-card">
                <CardContent className="p-6">
                    <div className="text-center">Loading templates...</div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">WhatsApp Template Manager</h2>
                    <p className="text-muted-foreground">Create and manage message templates for bulk communications</p>
                </div>
                <div className="flex gap-2">
                    <Dialog open={isSendDialogOpen} onOpenChange={setIsSendDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-green-600 hover:bg-green-700">
                                <Send className="w-4 h-4 mr-2" />
                                Bulk Send
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Send Bulk WhatsApp Message</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium">Select Template</label>
                                    <Select value={bulkSendConfig.template_id} onValueChange={(value) => 
                                        setBulkSendConfig({...bulkSendConfig, template_id: value})}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Choose template" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {templates.map(template => (
                                                <SelectItem key={template.id} value={template.id}>
                                                    {template.template_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                
                                <div>
                                    <label className="text-sm font-medium">Target Department</label>
                                    <Select value={bulkSendConfig.department} onValueChange={(value) => 
                                        setBulkSendConfig({...bulkSendConfig, department: value})}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Choose department" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {DEPARTMENTS.map(dept => (
                                                <SelectItem key={dept} value={dept}>
                                                    {dept.replace(/_/g, ' ').toUpperCase()}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                
                                <div className="text-sm text-muted-foreground">
                                    Will send to {employees.filter(emp => emp.department === bulkSendConfig.department).length} employees
                                </div>
                                
                                <Button onClick={handleBulkSend} className="w-full bg-green-600 hover:bg-green-700">
                                    <Send className="w-4 h-4 mr-2" />
                                    Send Messages
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="w-4 h-4 mr-2" />
                                New Template
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>Create WhatsApp Template</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium">Template Name</label>
                                        <Input 
                                            value={newTemplate.template_name}
                                            onChange={(e) => setNewTemplate({...newTemplate, template_name: e.target.value})}
                                            placeholder="e.g. Morning Check-in Reminder"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Category</label>
                                        <Select value={newTemplate.category} onValueChange={(value) => 
                                            setNewTemplate({...newTemplate, category: value})}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {TEMPLATE_CATEGORIES.map(cat => (
                                                    <SelectItem key={cat.id} value={cat.id}>
                                                        {cat.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-medium">Department Specific (Optional)</label>
                                    <Select value={newTemplate.department_specific} onValueChange={(value) => 
                                        setNewTemplate({...newTemplate, department_specific: value})}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="All departments" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={null}>All departments</SelectItem>
                                            {DEPARTMENTS.map(dept => (
                                                <SelectItem key={dept} value={dept}>
                                                    {dept.replace(/_/g, ' ').toUpperCase()}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <label className="text-sm font-medium">Message Template</label>
                                    <Textarea 
                                        value={newTemplate.message_template}
                                        onChange={(e) => setNewTemplate({...newTemplate, message_template: e.target.value})}
                                        placeholder="Enter your message template..."
                                        rows={6}
                                    />
                                    <div className="mt-2">
                                        <p className="text-xs text-muted-foreground mb-2">Available variables:</p>
                                        <div className="flex flex-wrap gap-1">
                                            {COMMON_VARIABLES.map(variable => (
                                                <Button
                                                    key={variable}
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-xs h-6"
                                                    onClick={() => insertVariable(variable)}
                                                >
                                                    {variable}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <Button onClick={handleCreateTemplate} className="w-full">
                                    Create Template
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Templates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map(template => {
                    const category = TEMPLATE_CATEGORIES.find(cat => cat.id === template.category);
                    const CategoryIcon = category?.icon || MessageSquare;
                    
                    return (
                        <Card key={template.id} className="premium-card">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                        <CategoryIcon className={`w-4 h-4 text-${category?.color || 'gray'}-600`} />
                                        <CardTitle className="text-sm">{template.template_name}</CardTitle>
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                        {category?.name || 'General'}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="text-sm text-muted-foreground mb-3 line-clamp-3">
                                    {template.message_template.substring(0, 120)}...
                                </div>
                                <div className="flex justify-between items-center text-xs text-muted-foreground">
                                    <span>Used {template.usage_count || 0} times</span>
                                    {template.department_specific && (
                                        <Badge variant="secondary" className="text-xs">
                                            {template.department_specific.replace(/_/g, ' ')}
                                        </Badge>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {templates.length === 0 && (
                <Card className="premium-card">
                    <CardContent className="p-8 text-center">
                        <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-semibold mb-2">No Templates Yet</h3>
                        <p className="text-muted-foreground mb-4">
                            Create your first WhatsApp message template to start sending bulk communications.
                        </p>
                        <Button onClick={() => setIsCreateDialogOpen(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Create First Template
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}