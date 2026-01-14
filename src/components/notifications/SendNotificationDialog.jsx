import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Loader2, Send, Upload, FileText, X } from 'lucide-react';
import SearchableUserSelect from '../common/SearchableUserSelect';
import { useQuery } from '@tanstack/react-query';
import { User } from '@/entities/User';

export default function SendNotificationDialog({ open, onOpenChange }) {
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('system');
  const [isActionable, setIsActionable] = useState(false);
  const [actionText, setActionText] = useState('');
  const [actionUrl, setActionUrl] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users-notification'],
    queryFn: () => User.list(),
    staleTime: 5 * 60 * 1000
  });

  const addUser = (userId) => {
    if (!userId) return;
    if (selectedUserIds.includes(userId)) {
      toast.error('Employee already added');
      return;
    }
    setSelectedUserIds([...selectedUserIds, userId]);
  };

  const removeUser = (userId) => {
    setSelectedUserIds(selectedUserIds.filter(id => id !== userId));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type (PDF only)
    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are allowed');
      return;
    }

    setIsUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setUploadedFileUrl(result.file_url);
      setUploadedFile(file);
      toast.success('File uploaded successfully!');
    } catch (error) {
      toast.error('Failed to upload file: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSend = async () => {
    if (selectedUserIds.length === 0) {
      toast.error('Please select at least one recipient');
      return;
    }
    if (!title.trim() || !message.trim()) {
      toast.error('Title and message are required');
      return;
    }

    setIsSending(true);
    try {
      const notifications = selectedUserIds.map(userId => ({
        user_id: userId,
        title,
        message: uploadedFileUrl ? `${message}\n\n📎 Attachment: ${uploadedFile.name}` : message,
        category,
        priority,
        is_actionable: isActionable || !!uploadedFileUrl,
        action_text: uploadedFileUrl ? 'Download File' : actionText,
        action_url: uploadedFileUrl || actionUrl,
        is_read: false
      }));

      await base44.entities.Notification.bulkCreate(notifications);
      
      toast.success(`✅ Notification sent to ${selectedUserIds.length} employee(s)`);
      
      // Reset form
      setSelectedUserIds([]);
      setTitle('');
      setMessage('');
      setPriority('medium');
      setCategory('system');
      setIsActionable(false);
      setActionText('');
      setActionUrl('');
      setUploadedFile(null);
      setUploadedFileUrl('');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to send notification: ' + error.message);
    } finally {
      setIsSending(false);
    }
  };

  const selectedUsers = allUsers.filter(u => selectedUserIds.includes(u.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-[#D32F2F]" />
            Send Notification to Employees
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Employee Selection */}
          <div className="space-y-3">
            <Label className="font-semibold">Select Employees *</Label>
            <SearchableUserSelect
              users={allUsers}
              value=""
              onValueChange={addUser}
              placeholder="Search and select employees..."
            />
            
            {selectedUsers.length > 0 && (
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <Label className="text-xs text-slate-600 mb-2 block">
                  Selected Employees ({selectedUsers.length})
                </Label>
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map(user => (
                    <Badge key={user.id} className="bg-[#D32F2F] text-white pr-1 py-1">
                      {user.full_name}
                      <X 
                        className="w-3 h-3 ml-1 cursor-pointer hover:bg-red-700 rounded-full" 
                        onClick={() => removeUser(user.id)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Notification title..."
              maxLength={100}
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label>Message *</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your message here..."
              rows={4}
            />
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label>Attach PDF (Optional)</Label>
            <div className="flex gap-2">
              <Input
                type="file"
                accept="application/pdf"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="flex-1"
              />
              {isUploading && <Loader2 className="w-5 h-5 animate-spin text-[#D32F2F]" />}
            </div>
            {uploadedFile && (
              <Badge className="bg-green-100 text-green-700 border-0 gap-1">
                <FileText className="w-3 h-3" />
                {uploadedFile.name}
                <X 
                  className="w-3 h-3 cursor-pointer ml-1" 
                  onClick={() => {
                    setUploadedFile(null);
                    setUploadedFileUrl('');
                  }}
                />
              </Badge>
            )}
          </div>

          {/* Category & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="inventory">Inventory</SelectItem>
                  <SelectItem value="crm">CRM</SelectItem>
                  <SelectItem value="hr">HR</SelectItem>
                  <SelectItem value="academic">Academic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Custom Action (Optional) */}
          {!uploadedFileUrl && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_actionable"
                  checked={isActionable}
                  onChange={(e) => setIsActionable(e.target.checked)}
                  className="w-4 h-4"
                />
                <Label htmlFor="is_actionable" className="text-sm">
                  Add custom action button
                </Label>
              </div>
              
              {isActionable && (
                <div className="grid grid-cols-2 gap-3 pl-6">
                  <div className="space-y-2">
                    <Label className="text-xs">Button Text</Label>
                    <Input
                      value={actionText}
                      onChange={(e) => setActionText(e.target.value)}
                      placeholder="View Details"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Action URL</Label>
                    <Input
                      value={actionUrl}
                      onChange={(e) => setActionUrl(e.target.value)}
                      placeholder="/page?param=value"
                      className="h-9"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSend} 
            disabled={isSending || selectedUserIds.length === 0}
            className="bg-[#D32F2F] hover:bg-[#B71C1C]"
          >
            {isSending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
            ) : (
              <><Send className="w-4 h-4 mr-2" /> Send to {selectedUserIds.length} Employee(s)</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}