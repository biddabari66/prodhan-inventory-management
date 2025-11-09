
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  MessageSquare, Send, Clock, CheckCircle, AlertCircle, 
  User as UserIcon, ChevronDown, ChevronUp 
} from 'lucide-react';
import { ReportComment } from '@/entities/ReportComment';
import { User } from '@/entities/User';
import { sendWhatsAppMessage } from '@/functions/sendWhatsAppMessage';
import { NotificationService } from '../notifications/NotificationService';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function ReportComments({ report, currentUser, onCommentAdded }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [commentType, setCommentType] = useState('general');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  const loadComments = useCallback(async () => {
    if (!report?.id) return;
    
    setIsLoading(true);
    try {
      const fetchedComments = await ReportComment.filter({ 
        report_id: report.id 
      });
      setComments(fetchedComments.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    } catch (error) {
      console.error('Error loading comments:', error);
      toast.error('Failed to load comments');
    } finally {
      setIsLoading(false);
    }
  }, [report?.id]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  // Production-Ready Permission Check for Commenting
  const canComment = useCallback(() => {
    if (!currentUser || !report) return false;
    
    const role = currentUser.job_role || 'employee';
    
    // Admin and Manager can comment on any report
    if (['admin', 'manager'].includes(role)) return true;
    
    // Department Head can comment on reports in their department
    if (role === 'department_head') {
      return report.department === currentUser.department;
    }
    
    // Employees cannot comment
    return false;
  }, [currentUser, report]);

  const handleSubmitComment = async () => {
    if (!newComment.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    // Production-Ready Permission Check
    if (!canComment()) {
      toast.error('You do not have permission to comment on this report');
      return;
    }

    setIsSubmitting(true);
    try {
      // Create comment
      const commentData = {
        report_id: report.id,
        user_id: currentUser.id,
        user_name: currentUser.full_name,
        user_role: currentUser.job_role,
        comment_text: newComment.trim(),
        comment_type: commentType
      };

      const createdComment = await ReportComment.create(commentData);
      
      // Add to local state
      setComments(prev => [createdComment, ...prev]);
      setNewComment('');
      setCommentType('general');

      // Notify report submitter if it's not the same person
      if (report.submitted_by_id !== currentUser.id) {
        try {
          // Send in-app notification
          await NotificationService.send(
            report.submitted_by_id,
            '💬 New Comment on Your Report',
            `${currentUser.full_name} commented on your "${report.template_name}" report: ${newComment.substring(0, 100)}${newComment.length > 100 ? '...' : ''}`,
            {
              category: 'hr',
              priority: 'medium',
              actionText: 'View Report',
              actionUrl: `/SubmittedReports?report=${report.id}`,
              emailContext: {
                type: 'report_comment',
                data: {
                  reportName: report.template_name,
                  commenterName: currentUser.full_name,
                  commentText: newComment,
                  actionUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/SubmittedReports?report=${report.id}`
                }
              }
            }
          );

          // Send WhatsApp notification if user has it activated
          const reportSubmitter = await User.get(report.submitted_by_id);
          if (reportSubmitter?.whatsapp_activated) {
            await sendWhatsAppMessage({
              recipientUserId: report.submitted_by_id,
              messageContent: `You have a new comment on your "${report.template_name}" report from ${currentUser.full_name}:\n\n"${newComment}"\n\nPlease check your Bee ERP dashboard for full details.`,
              messageType: 'report_comment'
            });
          }

          toast.success('Comment added and notification sent');
        } catch (notificationError) {
          console.warn('Failed to send notification:', notificationError);
          toast.success('Comment added (notification failed to send)');
        }
      } else {
        toast.success('Comment added');
      }

      if (onCommentAdded) {
        onCommentAdded(createdComment);
      }

    } catch (error) {
      console.error('Error submitting comment:', error);
      toast.error('Failed to submit comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCommentTypeColor = (type) => {
    const colors = {
      feedback: 'bg-blue-100 text-blue-800',
      approval: 'bg-green-100 text-green-800',
      revision_request: 'bg-orange-100 text-orange-800',
      general: 'bg-gray-100 text-gray-800'
    };
    return colors[type] || colors.general;
  };

  const getRoleColor = (role) => {
    const colors = {
      admin: 'bg-red-100 text-red-800',
      manager: 'bg-blue-100 text-blue-800',
      department_head: 'bg-purple-100 text-purple-800',
      employee: 'bg-green-100 text-green-800'
    };
    return colors[role] || colors.employee;
  };

  if (!report) return null;

  return (
    <Card className="premium-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-500" />
            <span>Comments & Feedback</span>
            {comments.length > 0 && (
              <Badge variant="outline">{comments.length}</Badge>
            )}
          </div>
          {comments.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Add Comment Section - Only show if user has permission */}
        {canComment() && (
          <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Select value={commentType} onValueChange={setCommentType}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General Comment</SelectItem>
                  <SelectItem value="feedback">Feedback</SelectItem>
                  <SelectItem value="approval">Approval Note</SelectItem>
                  <SelectItem value="revision_request">Request Revision</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Textarea
              placeholder="Add your comment or feedback..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[100px]"
            />
            
            <Button 
              onClick={handleSubmitComment}
              disabled={isSubmitting || !newComment.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Submitting...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  Submit Comment
                </div>
              )}
            </Button>
          </div>
        )}

        {/* Comments List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            <span className="ml-2 text-muted-foreground">Loading comments...</span>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No comments yet</p>
            {canComment() ? (
              <p className="text-sm">Be the first to add feedback!</p>
            ) : (
              <p className="text-sm">Only managers and department heads can add comments</p>
            )}
          </div>
        ) : (
          <div className={`space-y-4 ${!isExpanded && comments.length > 2 ? 'max-h-48 overflow-hidden' : ''}`}>
            {comments.map((comment, index) => (
              <div key={comment.id} className="flex gap-3 p-3 bg-white dark:bg-gray-900/50 rounded-lg border">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-xs">
                    {comment.user_name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{comment.user_name}</span>
                    <Badge className={`text-xs ${getRoleColor(comment.user_role)}`}>
                      {comment.user_role?.replace('_', ' ')}
                    </Badge>
                    <Badge className={`text-xs ${getCommentTypeColor(comment.comment_type)}`}>
                      {comment.comment_type?.replace('_', ' ')}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 whitespace-pre-wrap">
                    {comment.comment_text}
                  </p>
                  
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {format(new Date(comment.created_date), 'PPp')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {comments.length > 2 && !isExpanded && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(true)}
            className="w-full"
          >
            Show {comments.length - 2} more comments
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
