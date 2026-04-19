import React, { useState, useEffect } from 'react';
import { User } from '@/entities/User';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { generateAndSendEmail } from '@/functions/generateAndSendEmail';
import { toast } from 'sonner';
import { Mail, Send, Users, Loader2, CheckCircle2, AlertTriangle, Info, Check, ChevronsUpDown, Search } from 'lucide-react';
import { withPermission } from '../components/common/PermissionGuard';
import { cn } from '@/lib/utils';

function SendEmailPage() {
  const [recipients, setRecipients] = useState([]);
  const [selectedRecipient, setSelectedRecipient] = useState('');
  const [emailType, setEmailType] = useState('system_notification');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSentEmail, setLastSentEmail] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    setIsLoading(true);
    try {
      const employees = await User.list();
      console.log('📋 Loaded employees:', employees?.length);
      setRecipients(employees || []);
    } catch (error) {
      console.error('❌ Error loading employees:', error);
      toast.error('Failed to load employees');
      setRecipients([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    // Validation
    if (!selectedRecipient) {
      toast.error('Please select a recipient');
      return;
    }

    if (!subject || !subject.trim()) {
      toast.error('Please enter an email subject');
      return;
    }

    if (!message || !message.trim()) {
      toast.error('Please enter an email message');
      return;
    }

    const recipient = recipients.find(r => r.id === selectedRecipient);
    
    if (!recipient) {
      toast.error('Selected recipient not found');
      return;
    }

    if (!recipient.email) {
      toast.error(`${recipient.full_name} does not have an email address`);
      return;
    }

    console.log('📤 ========== SENDING EMAIL ==========');
    console.log('To:', recipient.email);
    console.log('Subject:', subject);
    console.log('Message length:', message.length);

    setIsSending(true);
    const sendingToast = toast.loading(`Sending email to ${recipient.full_name}...`);

    try {
      const payload = {
        to: recipient.email,
        emailType: emailType,
        context: {
          title: subject.trim(),
          subject: subject.trim(),
          message: message.trim(),
          body: message.trim(),
          recipientName: recipient.full_name
        }
      };

      console.log('📦 Payload:', JSON.stringify(payload, null, 2));

      const response = await generateAndSendEmail(payload);
      
      console.log('📨 Response received:', response);
      console.log('📨 Response data:', response?.data);
      console.log('📨 Response status:', response?.status);

      // Check for successful response
      if (response && response.data) {
        const data = response.data;
        
        console.log('🔍 Checking response data.success:', data.success);
        
        if (data.success === true) {
          console.log('✅ Email sent successfully!');
          
          toast.dismiss(sendingToast);
          toast.success(`Email sent successfully to ${recipient.full_name}!`, {
            description: `Subject: ${subject}`,
            duration: 5000
          });
          
          // Store last sent email info
          setLastSentEmail({
            to: recipient.full_name,
            email: recipient.email,
            subject: subject,
            time: new Date().toLocaleString()
          });
          
          // Reset form
          setSelectedRecipient('');
          setSubject('');
          setMessage('');
          setEmailType('system_notification');
          
        } else {
          // Success is false or undefined
          const errorMsg = data.error || data.details?.message || 'Email sending failed';
          console.error('❌ Email sending failed:', errorMsg);
          console.error('Full error details:', data.details);
          
          toast.dismiss(sendingToast);
          toast.error('Failed to send email', {
            description: errorMsg,
            duration: 7000
          });
        }
      } else {
        // No response data
        console.error('❌ Invalid response format:', response);
        
        toast.dismiss(sendingToast);
        toast.error('Failed to send email', {
          description: 'Invalid server response',
          duration: 5000
        });
      }
      
    } catch (error) {
      console.error('💥 ========== EMAIL SENDING ERROR ==========');
      console.error('Error:', error);
      console.error('Error message:', error.message);
      console.error('Error response:', error.response);
      
      toast.dismiss(sendingToast);
      toast.error('Failed to send email', {
        description: error.message || 'An unexpected error occurred',
        duration: 7000
      });
    } finally {
      setIsSending(false);
      console.log('🏁 Email sending process completed');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-violet-600 mx-auto" />
          <p className="text-muted-foreground">Loading employees...</p>
        </div>
      </div>
    );
  }

  const selectedEmployee = recipients.find(r => r.id === selectedRecipient);

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold font-display text-gradient flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
              <Mail className="w-6 h-6 text-white" />
            </div>
            Send Email
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-2">
            Send emails to employees with customized templates
          </p>
        </div>
      </div>

      {/* Last Sent Email Info */}
      {lastSentEmail && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-green-900">Last email sent successfully!</p>
                <p className="text-sm text-green-700 mt-1">
                  To: <strong>{lastSentEmail.to}</strong> ({lastSentEmail.email})
                </p>
                <p className="text-sm text-green-700">
                  Subject: <strong>{lastSentEmail.subject}</strong>
                </p>
                <p className="text-xs text-green-600 mt-1">{lastSentEmail.time}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Important Notice */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-blue-900">Email System Status</p>
              <p className="text-sm text-blue-700 mt-1">
                Emails are sent via the Base44 Core email integration. Please ensure:
              </p>
              <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
                <li>The recipient has a valid email address</li>
                <li>The Base44 email service is properly configured</li>
                <li>Check the browser console for detailed logs</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Form */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Compose Email
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enhanced Searchable Recipient Selection */}
          <div className="space-y-2">
            <Label>Recipient * ({recipients.length} employees)</Label>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between"
                >
                  {selectedRecipient ? (
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-violet-600" />
                      <span className="truncate">{selectedEmployee?.full_name}</span>
                      {selectedEmployee?.email && (
                        <span className="text-xs text-muted-foreground truncate">({selectedEmployee.email})</span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Search className="w-4 h-4" />
                      <span>Search and select an employee...</span>
                    </div>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search by name, email, or department..." />
                  <CommandEmpty>No employee found.</CommandEmpty>
                  <CommandGroup className="max-h-[300px] overflow-y-auto">
                    {recipients.map((employee) => (
                      <CommandItem
                        key={employee.id}
                        value={`${employee.full_name} ${employee.email || ''} ${employee.department || ''} ${employee.designation || ''}`}
                        onSelect={() => {
                          setSelectedRecipient(employee.id);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedRecipient === employee.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{employee.full_name}</span>
                            {!employee.email && (
                              <AlertTriangle className="w-3 h-3 text-orange-500 flex-shrink-0" title="No email" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            {employee.email && <span className="truncate">{employee.email}</span>}
                            {employee.department && (
                              <span className="px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded text-[10px] font-medium">
                                {employee.department}
                              </span>
                            )}
                            {employee.designation && (
                              <span className="truncate">{employee.designation}</span>
                            )}
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
            {selectedRecipient && selectedEmployee && !selectedEmployee.email && (
              <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 p-2 rounded">
                <AlertTriangle className="w-4 h-4" />
                This employee does not have an email address
              </div>
            )}
          </div>

          {/* Email Type */}
          <div className="space-y-2">
            <Label htmlFor="emailType">Email Type</Label>
            <Select value={emailType} onValueChange={setEmailType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system_notification">System Notification</SelectItem>
                <SelectItem value="task_assignment">Task Assignment</SelectItem>
                <SelectItem value="report_submission">Report Submission</SelectItem>
                <SelectItem value="expense_approval_request">Expense Approval</SelectItem>
                <SelectItem value="lead_assignment">Lead Assignment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject..."
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your message..."
              rows={8}
            />
          </div>

          {/* Send Button */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedRecipient('');
                setSubject('');
                setMessage('');
              }}
            >
              Clear
            </Button>
            <Button
              onClick={handleSend}
              disabled={isSending || !selectedRecipient || !subject.trim() || !message.trim()}
              className="bg-violet-600 hover:bg-violet-700"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Email
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Permission check: hr module, can_view permission
export default SendEmailPage;