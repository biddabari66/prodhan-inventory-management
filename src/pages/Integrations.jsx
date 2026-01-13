import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Zap, Settings, CheckCircle, AlertTriangle, MessageSquare, Facebook, 
  Truck, Mail, MessageSquareText, Loader2, Info, PlusCircle, Wrench,
  Users, Send, Clock, XCircle, ExternalLink, Shield, Bot, Sparkles, MessagesSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';
import { manageIntegrationStatus } from '@/functions/manageIntegrationStatus';
import { whatsappAttendanceIntegration } from '@/functions/whatsappAttendanceIntegration';
import { sendWhatsAppMessage } from '@/functions/sendWhatsAppMessage';
import { User } from '@/entities/User';
import { WhatsAppActivation } from '@/entities/WhatsAppActivation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const INTEGRATION_META = {
  whatsapp: { 
    icon: MessageSquare, 
    title: 'WhatsApp Business', 
    description: 'Send templated notifications and manage conversations for HR and CRM.',
    color: 'text-green-500',
    bgColor: 'bg-green-50',
    hasConfig: true,
    docs: 'https://developers.facebook.com/docs/whatsapp'
  },
  whatsapp_employee: {
    icon: MessagesSquare,
    title: 'Employee WhatsApp Chat',
    description: 'All employees can connect their WhatsApp number for inventory chat & notifications.',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    hasConfig: true,
    docs: null,
    isEmployeeChat: true
  },
  whatsapp_agent: {
    icon: Bot,
    title: 'WhatsApp AI Agent',
    description: 'Intelligent WhatsApp bot for automated employee communication and support.',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    hasConfig: true,
    docs: null,
    isAgent: true
  },
  facebook_ads: { 
    icon: Facebook, 
    title: 'Facebook Ads', 
    description: 'Sync leads directly from your Facebook Lead Ads into the CRM module.',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    hasConfig: true,
    docs: 'https://developers.facebook.com/docs/marketing-api'
  },
  steadfast_courier: { 
    icon: Truck, 
    title: 'Steadfast Courier', 
    description: 'Create and track courier orders for inventory and procurement.',
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
    hasConfig: false,
    docs: 'https://steadfast.com.bd/documentation'
  },
  email_notifications: { 
    icon: Mail, 
    title: 'Email Notifications', 
    description: 'Send system-wide email alerts for approvals, tasks, and reports.',
    color: 'text-purple-500',
    bgColor: 'bg-purple-50',
    hasConfig: false,
    docs: null
  },
  sms_gateway: { 
    icon: MessageSquareText, 
    title: 'SMS Gateway', 
    description: 'Send transactional SMS for critical alerts and notifications (coming soon).',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-50',
    hasConfig: false,
    docs: null
  }
};

// WhatsApp Manual Messaging Dialog
const WhatsAppManualMessageDialog = ({ isOpen, onClose }) => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      setSelectedUser(''); // Reset selected user on open
      setMessage(''); // Reset message on open
    }
  }, [isOpen]);

  const loadUsers = async () => {
    try {
      const allUsers = await User.list();
      const whatsappUsers = allUsers.filter(u => u.whatsapp_activated && u.whatsapp_number); // Ensure whatsapp_number exists
      setUsers(whatsappUsers);
    } catch (error) {
      toast.error('Failed to load users');
      console.error('Error loading users for WhatsApp:', error);
    }
  };

  const handleSend = async () => {
    if (!selectedUser || !message) {
      toast.error('Please select a user and enter a message');
      return;
    }

    setIsSending(true);
    try {
      const response = await sendWhatsAppMessage({
        recipientUserId: selectedUser,
        messageContent: message,
        messageType: 'manual'
      });

      if (response.data?.success) {
        toast.success('Message sent successfully!');
        setMessage('');
        setSelectedUser('');
        onClose();
      } else {
        throw new Error(response.data?.error || 'Failed to send message');
      }
    } catch (error) {
      toast.error(error.message);
      console.error('Error sending manual WhatsApp message:', error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessagesSquare className="w-6 h-6 text-green-600" />
            Send Manual WhatsApp Message
          </DialogTitle>
          <DialogDescription>
            Send a custom WhatsApp message to any employee with activated WhatsApp
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label>Select Employee</Label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Choose an employee..." />
              </SelectTrigger>
              <SelectContent>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={user.profile_picture_url} />
                        <AvatarFallback>{user.full_name?.charAt(0) || 'U'}</AvatarFallback>
                      </Avatar>
                      <span>{user.display_name || user.full_name}</span>
                      <span className="text-xs text-muted-foreground">({user.whatsapp_number})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Message</Label>
            <Textarea 
              placeholder="Type your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              This will use a WhatsApp template. Max 1024 characters.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isSending} className="bg-green-600 hover:bg-green-700">
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Message
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const IntegrationCard = ({ integration, onToggle, onTest, onConfigure, currentUser, navigate }) => {
  const meta = INTEGRATION_META[integration.name];
  const [isLoading, setIsLoading] = useState(false);

  if (!meta) return null; // Skip if no metadata

  const handleToggle = async (checked) => {
    setIsLoading(true);
    await onToggle(integration.name, checked ? 'active' : 'inactive');
    setIsLoading(false);
  };
  
  const handleTest = async () => {
    setIsLoading(true);
    await onTest(integration.name);
    setIsLoading(false);
  };

  const handleConfigure = () => {
    if (integration.name === 'whatsapp_agent' && meta.isAgent) {
      // Navigate to AI Agents dashboard
      window.open('https://app.base44.com/686aeb57b62314958e21fd12/agents', '_blank');
    } else {
      onConfigure(integration.name);
    }
  };

  // CRITICAL FIX: Update isAdmin to include super_admin
  const isAdmin = ['super_admin', 'admin', 'manager'].includes(currentUser?.job_role);

  return (
    <Card className="premium-card hover:shadow-xl transition-all duration-300">
      <CardHeader className="flex flex-row items-start justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className={`w-14 h-14 rounded-xl ${meta.bgColor} flex items-center justify-center shadow-md flex-shrink-0`}>
            <meta.icon className={`w-7 h-7 ${meta.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg flex items-center gap-2">
              {meta.title}
              {meta.isAgent && <Badge variant="outline" className="text-blue-700 border-blue-300"><Sparkles className="w-3 h-3 mr-1" />AI</Badge>}
            </CardTitle>
            <CardDescription className="text-sm mt-1">{meta.description}</CardDescription>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          ) : meta.isAgent ? (
            <Badge variant="default" className="bg-blue-700">
              <CheckCircle className="w-3 h-3 mr-1" />
              Configured
            </Badge>
          ) : (
            <Switch
              checked={integration.status === 'active'}
              onCheckedChange={handleToggle}
              disabled={!integration.is_configured_on_backend || !isAdmin}
            />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            {!meta.isAgent && (
              <Badge variant={integration.status === 'active' ? 'default' : 'outline'} className="font-semibold">
                {integration.status === 'active' ? (
                  <>
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Active
                  </>
                ) : (
                  <>
                    <XCircle className="w-3 h-3 mr-1" />
                    Inactive
                  </>
                )}
              </Badge>
            )}
            {!integration.is_configured_on_backend && !meta.isAgent && (
              <Badge variant="outline" className="text-yellow-600 border-yellow-300 bg-yellow-50">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Setup Required
              </Badge>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {(integration.is_configured_on_backend || meta.isAgent) && (
              <>
                {meta.hasConfig && isAdmin && (
                  <Button variant="outline" size="sm" onClick={handleConfigure}>
                    <Settings className="w-4 h-4 mr-2" />
                    {meta.isAgent ? 'Open Agent' : 'Configure'}
                  </Button>
                )}
                {!meta.isAgent && (
                  <Button variant="outline" size="sm" onClick={handleTest} disabled={isLoading}>
                    <Zap className="w-4 h-4 mr-2" />
                    Test
                  </Button>
                )}
              </>
            )}
            {meta.docs && (
              <Button variant="ghost" size="sm" asChild>
                <a href={meta.docs} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Docs
                </a>
              </Button>
            )}
          </div>
        </div>
        {!integration.is_configured_on_backend && !meta.isAgent && (
          <Alert className="mt-4 border-yellow-300 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-800">Backend Configuration Required</AlertTitle>
            <AlertDescription className="text-yellow-700 text-sm">
              This integration requires environment variables to be set on the server. Please contact your system administrator.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

const WhatsAppAdminPanel = ({ isOpen, onClose, onRefresh }) => {
  const [activationRequests, setActivationRequests] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('pending');

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [requests, users] = await Promise.all([
        WhatsAppActivation.list(),
        User.list()
      ]);
      setActivationRequests(requests);
      setAllUsers(users);
    } catch (error) {
      console.error('Error loading WhatsApp data:', error);
      toast.error('Failed to load WhatsApp activation data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (activationId) => {
    try {
      const response = await whatsappAttendanceIntegration({
        action: 'approve_activation',
        activationId
      });

      if (response.data?.success) {
        toast.success(response.data.message);
        loadData();
        if (onRefresh) onRefresh();
      } else {
        throw new Error(response.data?.error || 'Failed to approve');
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleReject = async (activationId) => {
    try {
      const response = await whatsappAttendanceIntegration({
        action: 'reject_activation',
        activationId
      });

      if (response.data?.success) {
        toast.success(response.data.message);
        loadData();
      } else {
        throw new Error(response.data?.error || 'Failed to reject');
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const pendingRequests = activationRequests.filter(r => r.status === 'pending');
  const activeUsers = allUsers.filter(u => u.whatsapp_activated);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-green-600" />
            </div>
            WhatsApp Admin Panel
          </DialogTitle>
          <p className="text-muted-foreground">
            Manage WhatsApp activation requests and connected users
          </p>
        </DialogHeader>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="w-4 h-4" />
              Pending Requests 
              {pendingRequests.length > 0 && (
                <Badge variant="destructive" className="ml-2 rounded-full px-2 py-0.5 text-xs">
                  {pendingRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="active" className="gap-2">
              <CheckCircle className="w-4 h-4" />
              Active Users ({activeUsers.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="flex-1 overflow-y-auto mt-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">All Caught Up!</h3>
                <p className="text-muted-foreground">No pending activation requests</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingRequests.map(request => {
                  const user = allUsers.find(u => u.id === request.user_id);
                  return (
                    <Card key={request.id} className="premium-card">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <Avatar className="h-14 w-14 border-2 border-green-200">
                              <AvatarImage src={user?.profile_picture_url} />
                              <AvatarFallback className="bg-gradient-to-br from-green-500 to-emerald-500 text-white text-lg font-bold">
                                {(user?.full_name || 'U').charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-lg truncate">{request.employee_name}</p>
                              <p className="text-sm text-muted-foreground">{request.whatsapp_number}</p>
                              <div className="flex items-center gap-4 mt-2">
                                <p className="text-xs text-muted-foreground">
                                  Code: <span className="font-mono font-semibold text-violet-600">{request.activation_code}</span>
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Requested: {format(new Date(request.created_date), 'PPp')}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <Button 
                              onClick={() => handleApprove(request.id)}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Approve
                            </Button>
                            <Button 
                              onClick={() => handleReject(request.id)}
                              variant="outline"
                              className="border-red-300 text-red-600 hover:bg-red-50"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="active" className="flex-1 overflow-y-auto mt-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
              </div>
            ) : activeUsers.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Active Users</h3>
                <p className="text-muted-foreground">No employees have activated WhatsApp yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeUsers.map(user => (
                  <Card key={user.id} className="premium-card">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 border-2 border-green-200">
                          <AvatarImage src={user.profile_picture_url} />
                          <AvatarFallback className="bg-gradient-to-br from-green-500 to-emerald-500 text-white font-bold">
                            {(user.full_name || 'U').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{user.display_name || user.full_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.whatsapp_number}</p>
                          <p className="text-xs text-green-600 mt-1">
                            ✓ Activated {user.whatsapp_activated_date ? format(new Date(user.whatsapp_activated_date), 'PP') : ''}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const RequestIntegrationDialog = ({ isOpen, onClose }) => {
  const [integrationName, setIntegrationName] = useState('');
  const [businessNeed, setBusinessNeed] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!integrationName || !businessNeed) {
      toast.error('Please fill out both fields.');
      return;
    }
    
    setIsSubmitting(true);
    
    // Simulate submission (in production, this would call a backend function)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast.success(`Request for "${integrationName}" submitted! The admin team has been notified.`);
    setIntegrationName('');
    setBusinessNeed('');
    setIsSubmitting(false);
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <PlusCircle className="w-6 h-6 text-violet-600" />
            Request a New Integration
          </DialogTitle>
          <DialogDescription>
            Need to connect a new service? Let us know what you need and why it would benefit the team.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="integration-name">Service Name</Label>
            <Input 
              id="integration-name" 
              placeholder="e.g., Google Calendar, Slack, Zoom"
              value={integrationName}
              onChange={(e) => setIntegrationName(e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="business-need">Business Need</Label>
            <Textarea 
              id="business-need" 
              placeholder="e.g., 'To sync team events' or 'For instant notifications'"
              value={businessNeed}
              onChange={(e) => setBusinessNeed(e.target.value)}
              className="mt-2"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Request'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default function Integrations() {
  const [integrations, setIntegrations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [isWhatsAppPanelOpen, setIsWhatsAppPanelOpen] = useState(false);
  const [isManualMessageOpen, setIsManualMessageOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

  const loadIntegrations = useCallback(async () => {
    setIsLoading(true);
    try {
      const [me, response] = await Promise.all([
        User.me(),
        manageIntegrationStatus({ action: 'get_all_statuses' })
      ]);
      
      setCurrentUser(me);
      
      if (response.data) {
        // Add WhatsApp Agent and Employee Chat to integrations list
        const integrationsWithExtras = [
          ...response.data,
          {
            name: 'whatsapp_employee',
            status: 'active',
            is_configured_on_backend: true,
            last_updated: new Date().toISOString()
          },
          {
            name: 'whatsapp_agent',
            status: 'active',
            is_configured_on_backend: true,
            last_updated: new Date().toISOString()
          }
        ];
        setIntegrations(integrationsWithExtras);
        console.log('✅ Loaded integrations:', integrationsWithExtras);
      } else {
        throw new Error('Failed to load integration statuses');
      }
    } catch (error) {
      console.error("❌ Error loading integrations:", error);
      toast.error(error.message || "Could not fetch integration statuses");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIntegrations();
  }, [loadIntegrations]);

  const handleToggle = async (name, newStatus) => {
    const originalIntegrations = [...integrations];
    
    // Optimistic UI update
    setIntegrations(prev => prev.map(i => i.name === name ? { ...i, status: newStatus } : i));

    try {
      const response = await manageIntegrationStatus({ 
        action: 'toggle_status', 
        integrationName: name,
        newStatus: newStatus
      });

      if (response.data?.success) {
        toast.success(response.data.message);
        loadIntegrations();
      } else {
        throw new Error(response.data.error || `Failed to toggle ${name}`);
      }
    } catch (error) {
      // Revert optimistic update on failure
      setIntegrations(originalIntegrations);
      toast.error(error.message);
    }
  };
  
  const handleTest = async (name) => {
    const promise = async () => {
        const response = await manageIntegrationStatus({ action: 'test_integration', integrationName: name });
        if (response.data?.success) {
            return response.data.message;
        } else {
            throw new Error(response.data.error || `Test failed for ${name}`);
        }
    };

    toast.promise(promise(), {
        loading: `Testing ${INTEGRATION_META[name]?.title || name}...`,
        success: (message) => message,
        error: (err) => err.message,
    });
  };

  const handleConfigure = (name) => {
    if (name === 'whatsapp') {
      setIsWhatsAppPanelOpen(true);
    }
  };

  // CRITICAL FIX: Update isAdmin to include super_admin
  const isAdmin = ['super_admin', 'admin', 'manager'].includes(currentUser?.job_role);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold font-display text-gradient flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-800 to-blue-800 flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            System Integrations
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">
            Connect and manage third-party services to enhance ERP functionality.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {!isAdmin && (
            <Badge variant="outline" className="border-yellow-300 bg-yellow-50 text-yellow-700">
              <Shield className="w-4 h-4 mr-1" />
              View Only
            </Badge>
          )}
          {isAdmin && (
            <Button onClick={() => setIsManualMessageOpen(true)} className="bg-green-600 hover:bg-green-700">
              <Send className="w-4 h-4 mr-2" />
              Send WhatsApp
            </Button>
          )}
          <Button variant="outline" onClick={() => setIsRequestDialogOpen(true)}>
            <PlusCircle className="w-4 h-4 mr-2" />
            Request Integration
          </Button>
        </div>
      </div>

      {/* FIXED: Only show limited access warning if user is NOT admin */}
      {!isAdmin && (
        <Alert className="border-yellow-300 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-800">Limited Access</AlertTitle>
          <AlertDescription className="text-yellow-700">
            You have read-only access to integrations. Contact an administrator to enable or configure integrations.
          </AlertDescription>
        </Alert>
      )}

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Configuration Notice</AlertTitle>
        <AlertDescription>
          Integrations marked with "Setup Required" need to be configured on the server-side by an administrator. 
          Contact support to enable them.
        </AlertDescription>
      </Alert>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-violet-600 mx-auto mb-4" />
            <p className="text-muted-foreground">Loading integrations...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {integrations.map(integration => (
            <IntegrationCard 
              key={integration.name}
              integration={integration}
              onToggle={handleToggle}
              onTest={handleTest}
              onConfigure={handleConfigure}
              currentUser={currentUser}
              navigate={navigate}
            />
          ))}
          
          <Card className="premium-card border-dashed flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mb-4">
              <Wrench className="w-8 h-8 text-gray-400" />
            </div>
            <CardTitle className="text-lg mb-2">More Integrations Coming Soon</CardTitle>
            <p className="text-sm text-muted-foreground mb-4">
              We are constantly working to connect Bee ERP with more services.
            </p>
            <Button variant="outline" onClick={() => setIsRequestDialogOpen(true)}>
              <PlusCircle className="w-4 h-4 mr-2" />
              Suggest Integration
            </Button>
          </Card>
        </div>
      )}
      
      <RequestIntegrationDialog 
        isOpen={isRequestDialogOpen} 
        onClose={() => setIsRequestDialogOpen(false)} 
      />

      <WhatsAppAdminPanel
        isOpen={isWhatsAppPanelOpen}
        onClose={() => setIsWhatsAppPanelOpen(false)}
        onRefresh={loadIntegrations}
      />

      <WhatsAppManualMessageDialog
        isOpen={isManualMessageOpen}
        onClose={() => setIsManualMessageOpen(false)}
      />
    </div>
  );
}