
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { format } from 'date-fns';
import { 
  Clock, CheckCircle, Play, Calendar, AlertTriangle, User, 
  MessageSquare, FileText, Upload, X, Loader2, XCircle,
  Paperclip, ImageIcon, Video, Edit, Eye, Send 
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { UploadFile } from "@/integrations/Core"; // New import

// Renamed from SubmitTaskDialog and updated to accept new props and functionality
const TaskSubmissionDialog = ({ task, isOpen, onClose, onSubmit }) => {
    const [submissionNotes, setSubmissionNotes] = useState('');
    const [attachments, setAttachments] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({});

    // Helper function for file size formatting, local to this component for now
    const formatFileSize = (bytes) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };
  
    const handleFileUpload = async (files) => {
      setIsUploading(true);
      const uploadedFiles = [];
  
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          setUploadProgress(prev => ({ ...prev, [file.name]: 'uploading' }));
          
          const { file_url } = await UploadFile({ file });
          
          uploadedFiles.push({
            name: file.name,
            url: file_url,
            type: file.type,
            size: file.size
          });
          
          setUploadProgress(prev => ({ ...prev, [file.name]: 'completed' }));
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error);
          setUploadProgress(prev => ({ ...prev, [file.name]: 'failed' }));
          toast.error(`Failed to upload ${file.name}`);
        }
      }
  
      setAttachments(prev => [...prev, ...uploadedFiles]);
      setIsUploading(false);
    };
  
    const handleFileChange = (e) => {
      const files = Array.from(e.target.files);
      if (files.length > 0) {
        handleFileUpload(files);
      }
    };
  
    const removeAttachment = (index) => {
      setAttachments(prev => prev.filter((_, i) => i !== index));
    };
  
    const handleSubmit = () => {
      if (!submissionNotes.trim() && attachments.length === 0) {
        toast.error("Please add submission notes or attach files");
        return;
      }
  
      onSubmit({
        submission_notes: submissionNotes,
        submission_attachments: attachments.map(att => att.url), // Just URLs for primary submission
        attachment_details: attachments.map(att => ({ // Detailed info for storage/display
          name: att.name,
          url: att.url,
          type: att.type,
          size: att.size
        }))
      });
  
      // Reset form
      setSubmissionNotes('');
      setAttachments([]);
      setUploadProgress({});
    };
    
    const getFileIcon = (type) => {
      if (type.startsWith('image/')) return <ImageIcon className="w-4 h-4" />;
      if (type === 'application/pdf') return <FileText className="w-4 h-4" />;
      if (type.startsWith('video/')) return <Video className="w-4 h-4" />;
      return <Paperclip className="w-4 h-4" />;
    };
  
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Submit Task: {task?.title}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="notes">Submission Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes for your manager..."
                value={submissionNotes}
                onChange={(e) => setSubmissionNotes(e.target.value)}
                rows={4}
                className="mt-1"
              />
            </div>
  
            <div>
              <Label>Attachments</Label>
              <div className="mt-2 space-y-3">
                {/* File Upload Area */}
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors">
                  <input
                    type="file"
                    multiple
                    accept="image/*,application/pdf,.doc,.docx,.txt,.zip,.rar"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                    disabled={isUploading}
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {isUploading ? 'Uploading...' : 'Click to upload files or drag and drop'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, DOC, Images, ZIP files supported
                    </p>
                  </label>
                </div>
  
                {/* Uploaded Files List */}
                {attachments.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Uploaded Files ({attachments.length})</h4>
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                        <div className="flex items-center space-x-2 flex-1">
                          {getFileIcon(file.type)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAttachment(index)}
                          className="h-8 w-8 p-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
  
                {/* Upload Progress */}
                {Object.keys(uploadProgress).length > 0 && (
                  <div className="space-y-1">
                    {Object.entries(uploadProgress).map(([fileName, status]) => (
                      <div key={fileName} className="flex items-center space-x-2 text-xs">
                        <span className="truncate flex-1">{fileName}</span>
                        {status === 'uploading' && <Loader2 className="w-3 h-3 animate-spin" />}
                        {status === 'completed' && <CheckCircle className="w-3 h-3 text-green-500" />}
                        {status === 'failed' && <XCircle className="w-3 h-3 text-red-500" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
  
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isUploading || (!submissionNotes.trim() && attachments.length === 0)}
              className="bg-green-600 hover:bg-green-700"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirm Submission
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

// Revision Request Dialog
const RevisionDialog = ({ isOpen, onClose, onSubmit, feedback, setFeedback }) => (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Request Revision</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
                <Label htmlFor="revision-feedback">Feedback for Employee</Label>
                <Textarea
                    id="revision-feedback"
                    placeholder="Explain what needs to be revised..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={5}
                />
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={onSubmit} className="bg-amber-600 hover:bg-amber-700">Submit Feedback</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
);


export default function TaskList({ tasks = [], employees = [], onEditTask, onUpdateStatus, isManagerView = false }) {
  const [selectedTaskForSubmit, setSelectedTaskForSubmit] = useState(null);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [revisionFeedback, setRevisionFeedback] = useState("");
  const [revisionTaskId, setRevisionTaskId] = useState(null);
  const [isRevisionDialogOpen, setIsRevisionDialogOpen] = useState(false);

  // Wrapper function to safely call the onUpdateStatus prop
  const safeOnUpdateStatus = (taskId, status, data) => {
    if (typeof onUpdateStatus === 'function') {
      onUpdateStatus(taskId, status, data);
    } else {
      console.error("CRITICAL: onUpdateStatus prop is missing or not a function in TaskList component.", { onUpdateStatus });
      toast.error("Could not update task status due to a system configuration error.");
    }
  };

  const handleSubmitTask = (submissionData) => {
    if (selectedTaskForSubmit) {
      safeOnUpdateStatus(selectedTaskForSubmit.id, 'submitted', submissionData);
      setIsSubmitDialogOpen(false);
      setSelectedTaskForSubmit(null);
      toast.success("Task submitted for review!");
    }
  };

  const handleApproveTask = (task) => {
    safeOnUpdateStatus(task.id, 'completed', { 
        admin_feedback: 'Approved by manager.',
        completion_date: new Date().toISOString()
    });
    toast.success(`Task "${task.title}" approved and marked as Completed.`);
  };

  const handleOpenRevisionDialog = (task) => {
    setRevisionTaskId(task.id);
    setIsRevisionDialogOpen(true);
  };

  const handleRevisionRequest = () => {
    if (!revisionFeedback.trim()) {
      toast.error("Please provide feedback for the revision.");
      return;
    }
    safeOnUpdateStatus(revisionTaskId, 'revision_needed', { admin_feedback: revisionFeedback });
    setIsRevisionDialogOpen(false);
    setRevisionFeedback("");
    setRevisionTaskId(null);
    toast.success("Revision requested successfully.");
  };

  const getAssigneeNames = (assigneeIds) => {
      if (!Array.isArray(assigneeIds)) return 'Unassigned';
      const safeEmployees = Array.isArray(employees) ? employees : [];
      return assigneeIds.map(id => safeEmployees.find(u => u.id === id)?.full_name || 'Unknown').join(', ');
  };

  // Define statusConfig - combines priority and status colors/labels
  const statusConfig = {
    pending: { label: 'Pending', badge: 'bg-gray-200 text-gray-800', icon: <Clock className="w-4 h-4 mr-1" /> },
    in_progress: { label: 'In Progress', badge: 'bg-sky-200 text-sky-800', icon: <Play className="w-4 h-4 mr-1" /> },
    submitted: { label: 'Submitted', badge: 'bg-indigo-200 text-indigo-800', icon: <Send className="w-4 h-4 mr-1" /> },
    completed: { label: 'Completed', badge: 'bg-green-200 text-green-800', icon: <CheckCircle className="w-4 h-4 mr-1" /> },
    overdue: { label: 'Overdue', badge: 'bg-orange-200 text-orange-800', icon: <AlertTriangle className="w-4 h-4 mr-1" /> },
    revision_needed: { label: 'Revision Needed', badge: 'bg-pink-200 text-pink-800', icon: <Edit className="w-4 h-4 mr-1" /> },
    
    // Priority specific badges (used separately from status config)
    priority: {
        low: "bg-blue-100 text-blue-800",
        medium: "bg-yellow-100 text-yellow-800",
        high: "bg-red-100 text-red-800",
        urgent: "bg-fuchsia-200 text-fuchsia-800",
    }
  };

  const getActionForTask = (task) => {
    // Determine the main action button based on task status for the employee view
    if (task.status === 'pending') {
      return { label: 'Start Task', action: 'start', disabled: false };
    } else if (task.status === 'in_progress' || task.status === 'revision_needed') {
      return { label: 'Submit for Review', action: 'submit', disabled: false };
    }
    // No specific action for completed or submitted tasks (from employee's perspective)
    return null; 
  };

  const handleAction = (action, task) => {
    if (action === 'start') {
      safeOnUpdateStatus(task.id, 'in_progress');
      toast.success(`Task "${task.title}" status updated to In Progress.`);
    } else if (action === 'submit') {
      setSelectedTaskForSubmit(task);
      setIsSubmitDialogOpen(true);
    } else if (action === 'approve') {
      handleApproveTask(task);
    } else if (action === 'revise') {
      handleOpenRevisionDialog(task);
    } else if (action === 'edit') {
        if (typeof onEditTask === 'function') {
            onEditTask(task.id);
        } else {
            console.warn("onEditTask prop is not a function in TaskList component.");
        }
    }
  };

  if (tasks.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <FileText className="w-12 h-12 mb-4" />
            <p className="text-lg font-medium">No tasks found.</p>
            <p className="text-sm">Check back later or create a new task.</p>
        </div>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => {
        const config = statusConfig[task.status] || statusConfig.pending;
        const employeeAction = getActionForTask(task); // Action for the employee performing the task
        const priorityBadgeClass = statusConfig.priority[task.priority] || 'bg-gray-100 text-gray-800';

        return (
          <Card key={task.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>{task.title}</CardTitle>
                        <CardDescription>
                            Assigned to: {getAssigneeNames(task.assigned_to)}
                        </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <Badge className={config.badge}>{config.label}</Badge>
                        <Badge variant="outline" className={priorityBadgeClass}>{task.priority}</Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible>
                    <AccordionItem value="task-details">
                        <AccordionTrigger>View Details</AccordionTrigger>
                        <AccordionContent className="space-y-3">
                            <p className="text-sm text-muted-foreground">{task.description}</p>
                            <div className="text-xs">
                                <p><strong>Success Criteria:</strong> {task.success_criteria}</p>
                                <p><strong>Estimated Hours:</strong> {task.estimated_hours || 'N/A'}</p>
                                <p><strong>Deadline:</strong> {format(new Date(task.deadline), 'PPP p')}</p>
                            </div>
                            {isManagerView && task.status === 'submitted' && (
                                <div className="mt-4">
                                    <h4 className="font-semibold text-sm mb-2">Submission Details:</h4>
                                    <p className="text-sm italic text-muted-foreground p-2 bg-muted rounded-md">
                                        "{task.submission_notes || 'No notes provided.'}"
                                    </p>
                                    {task.submission_attachment_details && task.submission_attachment_details.length > 0 && (
                                        <div className="mt-2 text-sm">
                                            <strong>Attachments:</strong>
                                            <ul className="list-disc list-inside">
                                                {task.submission_attachment_details.map((att, idx) => (
                                                    <li key={idx}>
                                                        <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                            {att.name}
                                                        </a> ({formatFileSize(att.size)})
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                            {isManagerView && task.status === 'revision_needed' && task.admin_feedback && (
                                <div className="mt-4">
                                    <h4 className="font-semibold text-sm mb-2 text-pink-700">Manager Feedback for Revision:</h4>
                                    <p className="text-sm text-pink-800 p-2 bg-pink-100 rounded-md">
                                        "{task.admin_feedback}"
                                    </p>
                                </div>
                            )}
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
                <div className="flex justify-end gap-2 mt-4">
                    {employeeAction && (
                        <Button 
                            size="sm" 
                            onClick={() => handleAction(employeeAction.action, task)} 
                            disabled={employeeAction.disabled}
                            className={employeeAction.action === 'submit' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}
                        >
                            {employeeAction.action === 'submit' && <Send className="w-4 h-4 mr-2" />}
                            {employeeAction.label}
                        </Button>
                    )}
                    {isManagerView && task.status === 'submitted' && (
                        <>
                            <Button variant="outline" size="sm" className="bg-green-100 text-green-800 border-green-300 hover:bg-green-200" onClick={() => handleAction('approve', task)}>
                                <CheckCircle className="w-4 h-4 mr-2" />Approve
                            </Button>
                            <Button variant="outline" size="sm" className="bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200" onClick={() => handleAction('revise', task)}>
                                <MessageSquare className="w-4 h-4 mr-2" />Request Revision
                            </Button>
                        </>
                    )}
                    {isManagerView && task.status !== 'completed' && task.status !== 'submitted' && ( // Allow editing for non-completed/submitted tasks by manager
                         <Button variant="outline" size="sm" onClick={() => handleAction('edit', task)}>
                            <Edit className="w-4 h-4 mr-2" />Edit Task
                        </Button>
                    )}
                </div>
            </CardContent>
          </Card>
        );
      })}

      {selectedTaskForSubmit && (
        <TaskSubmissionDialog
          task={selectedTaskForSubmit}
          isOpen={isSubmitDialogOpen}
          onClose={() => {
            setIsSubmitDialogOpen(false);
            setSelectedTaskForSubmit(null); // Clear selected task on close
          }}
          onSubmit={handleSubmitTask}
        />
      )}

      <RevisionDialog
        isOpen={isRevisionDialogOpen}
        onClose={() => {
            setIsRevisionDialogOpen(false);
            setRevisionFeedback(""); // Clear feedback on close
            setRevisionTaskId(null); // Clear task ID on close
        }}
        onSubmit={handleRevisionRequest}
        feedback={revisionFeedback}
        setFeedback={setRevisionFeedback}
      />
    </div>
  );
}

// Helper function formatFileSize (defined globally as it's used in multiple components now)
const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
