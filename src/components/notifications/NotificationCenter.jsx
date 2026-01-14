import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Check, X, AlertTriangle, Info, CheckCircle, ExternalLink, Loader2, AlertCircle as AlertCircleIcon, Settings, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Notification } from '@/entities/Notification';
import { User } from '@/entities/User';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { createPageUrl } from '@/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ActionableNotification from './ActionableNotification';
import SendNotificationDialog from './SendNotificationDialog';

const getCategoryIcon = (category) => {
  const icons = {
    system: <Info className="w-4 h-4" />,
    finance: <AlertTriangle className="w-4 h-4" />,
    inventory: <AlertTriangle className="w-4 h-4" />,
    crm: <Info className="w-4 h-4" />,
    hr: <Info className="w-4 h-4" />,
    academic: <Info className="w-4 h-4" />
  };
  return icons[category] || <Info className="w-4 h-4" />;
};

const getPriorityColor = (priority) => {
  const colors = {
    low: 'text-blue-600 dark:text-blue-400',
    medium: 'text-yellow-600 dark:text-yellow-400',
    high: 'text-orange-600 dark:text-orange-400',
    urgent: 'text-red-600 dark:text-red-400'
  };
  return colors[priority] || 'text-gray-600 dark:text-gray-400';
};

const NotificationItem = ({ notification, onNotificationClick, onActionComplete }) => {
  const priorityColorClass = getPriorityColor(notification.priority);
  const categoryIcon = getCategoryIcon(notification.category);

  const handleClick = () => {
    if (!notification.is_actionable) {
      onNotificationClick(notification);
    }
  };

  // Use ActionableNotification for actionable items
  if (notification.is_actionable) {
    return (
      <div className="p-3">
        <ActionableNotification 
          notification={notification} 
          onActionComplete={() => {
            onNotificationClick(notification);
            if (onActionComplete) onActionComplete();
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={`p-3 cursor-pointer transition-colors ${
        !notification.is_read
          ? 'bg-violet-50 dark:bg-violet-900/20 border-l-4 border-violet-500'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
      }`}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-1 ${priorityColorClass}`}>
          {categoryIcon}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-tight">
            {notification.title}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
            {notification.message}
          </p>

          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatDistanceToNow(new Date(notification.created_date), { addSuffix: true })}
            </span>

            {notification.action_url && (
              <div className="flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400">
                <ExternalLink className="w-3 h-3" />
                {notification.action_text || 'View'}
              </div>
            )}
          </div>
        </div>

        {!notification.is_read && (
          <div className="w-2 h-2 bg-violet-500 rounded-full mt-2 flex-shrink-0"></div>
        )}
      </div>
    </div>
  );
};

export default function NotificationCenter({ currentUser }) {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [user, setUser] = useState(currentUser);

  useEffect(() => {
    const loadUser = async () => {
      if (!currentUser) {
        try {
          const u = await User.me();
          setUser(u);
        } catch (err) {
          console.error('Failed to load user:', err);
        }
      }
    };
    loadUser();
  }, [currentUser]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const loadNotifications = useCallback(async () => {
    const activeUser = user || currentUser;
    if (!activeUser?.id) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const userNotifications = await Notification.filter(
        { user_id: activeUser.id },
        '-created_date',
        50
      );
      const notificationList = Array.isArray(userNotifications) ? userNotifications : [];
      setNotifications(notificationList);
    } catch (err) {
      console.error("Failed to load notifications:", err);
      setError("Could not load notifications. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, user]);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen, loadNotifications]);

  const handleMarkAsRead = async (notificationId) => {
    try {
      await Notification.update(notificationId, { is_read: true });
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.is_read);
      if (unreadNotifications.length === 0) return;

      const promises = unreadNotifications.map(n =>
        Notification.update(n.id, { is_read: true })
      );

      await Promise.all(promises);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      toast.error('Failed to mark all notifications as read');
    }
  };

  const handleNotificationItemClick = (notification) => {
    if (!notification.is_read) {
      handleMarkAsRead(notification.id);
    }

    if (notification.action_url && !notification.is_actionable) {
      window.location.href = notification.action_url;
      setIsOpen(false);
    }
  };

  const isAdmin = user?.job_role === 'admin' || user?.job_role === 'super_admin';

  return (
    <>
      <div className="flex items-center gap-2">
        {isAdmin && (
          <Button 
            variant="ghost" 
            className="h-9 px-3 hover:bg-red-50 rounded-xl text-[#D32F2F]"
            onClick={() => setSendDialogOpen(true)}
          >
            <Send className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Send</span>
          </Button>
        )}
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen} modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground relative min-w-[48px] min-h-[48px]">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-red-600 text-white text-xs rounded-full flex items-center justify-center border-2 border-background">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </div>
              )}
            </Button>
          </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 md:w-[420px] p-0 premium-card z-50">
        <div className="flex items-center justify-between p-3 border-b border-border bg-gradient-to-r from-violet-50 to-purple-50">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-violet-600" />
            <h3 className="font-semibold text-base">Notifications</h3>
            {unreadCount > 0 && (
              <Badge className="bg-red-600 text-white">
                {unreadCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button variant="link" size="sm" onClick={handleMarkAllAsRead} className="text-xs">
                Mark all read
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                window.location.href = createPageUrl('NotificationPreferences');
                setIsOpen(false);
              }}
              className="h-8 w-8 p-0"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="max-h-[500px] overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-10 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Loading notifications...</p>
            </div>
          ) : error ? (
            <div className="p-6 text-center text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-md m-2">
               <AlertCircleIcon className="w-5 h-5 mx-auto mb-2" />
               {error}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-10 text-center text-sm text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>You have no new notifications.</p>
            </div>
          ) : (
            notifications.map((notif, index) => (
              <React.Fragment key={notif.id}>
                <NotificationItem 
                  notification={notif} 
                  onNotificationClick={handleNotificationItemClick}
                  onActionComplete={loadNotifications}
                />
                {index < notifications.length - 1 && (
                  <Separator className="my-0" />
                )}
              </React.Fragment>
            ))
          )}
        </div>

      </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <SendNotificationDialog 
        open={sendDialogOpen} 
        onOpenChange={(open) => {
          setSendDialogOpen(open);
          if (!open) {
            loadNotifications();
          }
        }} 
      />
    </>
  );
}