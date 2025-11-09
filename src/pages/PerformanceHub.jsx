
import React, { useState, useEffect } from 'react';
import { User } from '@/entities/User';
import { Task } from '@/entities/Task';
import { DailyPerformanceLog } from '@/entities/DailyPerformanceLog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Users, BarChart3, Calendar, Clock, Target, Award, TrendingUp, CheckCircle } from 'lucide-react';
import { toast } from 'sonner'; // Make sure we're using sonner consistently
import TaskForm from '../components/performance/TaskForm';
import DailyLogForm from '../components/performance/DailyLogForm';
import TaskList from '../components/performance/TaskList';
import PastDailyLogs from '../components/performance/PastDailyLogs';
import PerformanceAnalytics from '../components/performance/PerformanceAnalytics';
import GamificationDashboard from '../components/performance/GamificationDashboard';
import { NotificationService } from '../components/notifications/NotificationService'; // Fixed import path

export default function PerformanceHub() {
  const [currentUser, setCurrentUser] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [dailyLogs, setDailyLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [isLogFormOpen, setIsLogFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [isTodayLogSubmitted, setIsTodayLogSubmitted] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const user = await User.me();
      setCurrentUser(user);

      if (!user) {
        toast.error('User not found');
        setIsLoading(false);
        return;
      }

      // Determine what data to load based on user role
      const isManagerOrAdmin = user.job_role && ['admin', 'manager', 'department_head'].includes(user.job_role);

      // Use Promise.allSettled to handle individual failures gracefully
      const dataPromises = [
        User.list(),
        Task.list('-created_date'),
        // Load logs based on role - managers/admins see all, employees see only their own
        isManagerOrAdmin 
          ? DailyPerformanceLog.list('-log_date', 100) // Get all logs for managers/admins
          : DailyPerformanceLog.filter({ employee_id: user.id }, '-log_date', 35) // Only user's logs for employees
      ];

      const results = await Promise.allSettled(dataPromises);

      // Extract data from settled promises, with fallbacks
      const employeeList = results[0].status === 'fulfilled' ? results[0].value : [];
      const taskList = results[1].status === 'fulfilled' ? results[1].value : [];
      const logList = results[2].status === 'fulfilled' ? results[2].value : [];

      // Log any rejected promises for debugging
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`Promise ${index} rejected:`, result.reason);
        }
      });

      setEmployees(employeeList || []);
      setTasks(taskList || []);
      setDailyLogs(logList || []);

      // Check if a log for today has already been submitted (only for the current user)
      const todayDateString = new Date().toISOString().slice(0, 10);
      const userLogsForCheck = isManagerOrAdmin 
        ? (logList || []).filter(log => log.employee_id === user.id) // Filter current user's logs if manager/admin
        : (logList || []); // All logs are already filtered for regular employees
      
      const logForToday = userLogsForCheck.find(log => log.log_date === todayDateString);
      setIsTodayLogSubmitted(!!logForToday);

    } catch (error) {
      console.error("Error loading performance data:", error);
      toast.error('Failed to load performance data. Please try again.');
      
      // Set empty arrays as fallbacks
      setEmployees([]);
      setTasks([]);
      setDailyLogs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTaskSubmit = async (taskData) => {
    try {
      if (editingTask) {
        await Task.update(editingTask.id, {
          ...taskData,
          assigned_by: currentUser.id
        });
        toast.success('Task updated successfully!');
      } else {
        await Task.create({
          ...taskData,
          assigned_by: currentUser.id
        });
        toast.success('Task assigned successfully!');
      }
      
      setIsTaskFormOpen(false);
      setEditingTask(null);
      await loadData();
    } catch (error) {
      console.error("Error submitting task:", error);
      toast.error('Failed to save task. Please try again.');
    }
  };

  const handleLogSubmit = async (logData) => {
    try {
      // Create the daily log with complete employee information
      const submittedLog = await DailyPerformanceLog.create({
        ...logData,
        employee_id: currentUser.id,
        employee_name: currentUser.full_name || currentUser.email, // Add employee name
        department: currentUser.department || 'Unknown Department' // Add department
      });
      
      console.log('Daily log created with employee info:', submittedLog);
      
      // Send notifications to admins and managers immediately after successful creation
      try {
        // Use the enhanced notification service method
        const notificationResult = await NotificationService.notifyDailyReportSubmission(
          submittedLog.id || 'daily-log', 
          currentUser.id, 
          currentUser.full_name || currentUser.email, 
          logData.log_date
        );
        
        console.log('Notification result:', notificationResult);
        
        if (notificationResult.success) {
          toast.success(`Daily log submitted successfully! ${notificationResult.notified} managers/admins have been notified.`);
        } else {
          toast.success('Daily log submitted successfully! (Notification may have failed)');
        }
      } catch (notificationError) {
        console.error("Error sending notifications:", notificationError);
        toast.success('Daily log submitted successfully! (Managers will be notified separately)');
      }
      
      setIsLogFormOpen(false);
      await loadData(); // This will refresh all data, including the log submission status
      
      return submittedLog;
    } catch (error) {
      console.error("Error submitting daily log:", error);
      toast.error('Failed to submit daily log. Please try again.');
      throw error;
    }
  };
  
  const handleEditTask = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      setEditingTask(task);
      setIsTaskFormOpen(true);
    }
  };

  // Add the missing onUpdateStatus function
  const handleUpdateTaskStatus = async (taskId, newStatus, additionalData = {}) => {
    try {
      const updateData = {
        status: newStatus,
      };

      // Add submission timestamp if status is submitted
      if (newStatus === 'submitted') {
        updateData.submission_date = new Date().toISOString();
        updateData.submission_notes = additionalData.submission_notes || '';
        updateData.submission_attachments = additionalData.submission_attachments || [];
        updateData.submission_attachment_details = additionalData.attachment_details || [];
      }

      // Add completion timestamp if status is completed
      if (newStatus === 'completed') {
        updateData.completion_date = new Date().toISOString();
      }

      await Task.update(taskId, updateData);
      
      // Show appropriate success message
      if (newStatus === 'submitted') {
        toast.success('Task submitted successfully!');
      } else if (newStatus === 'completed') {
        toast.success('Task approved and completed!');
      } else if (newStatus === 'revision_needed') {
        toast.success('Revision requested successfully!');
      } else if (newStatus === 'in_progress') {
        toast.success('Task status updated to In Progress!');
      }

      // Reload data to reflect changes
      await loadData();
      
    } catch (error) {
      console.error('Error updating task status:', error);
      toast.error('Failed to update task status. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading Performance Hub...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Unable to load user information.</p>
            <Button onClick={loadData} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const userTasks = tasks.filter(task => task.assigned_to && task.assigned_to.includes(currentUser.id));

  return (
    <div className="p-4 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold font-display text-gradient">Performance Hub</h1>
          <p className="text-lg text-muted-foreground mt-1">
            Track tasks, performance logs, and team analytics
          </p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={isLogFormOpen} onOpenChange={setIsLogFormOpen}>
            <DialogTrigger asChild>
              <Button 
                disabled={isTodayLogSubmitted} 
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
              >
                <Calendar className="w-4 h-4 mr-2" />
                {isTodayLogSubmitted ? "Today's Log Submitted" : "Submit Daily Log"}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-gradient">Submit Daily Performance Log</DialogTitle>
              </DialogHeader>
              <DailyLogForm 
                onSubmit={handleLogSubmit} 
                onCancel={() => setIsLogFormOpen(false)} 
                tasks={userTasks}
                currentUser={currentUser}
              />
            </DialogContent>
          </Dialog>

          {currentUser?.job_role && ['admin', 'manager', 'department_head'].includes(currentUser.job_role) && (
            <Dialog open={isTaskFormOpen} onOpenChange={(isOpen) => {
              setIsTaskFormOpen(isOpen);
              if (!isOpen) setEditingTask(null);
            }}>
              <DialogTrigger asChild>
                <Button className="btn-primary">
                  <Plus className="w-4 h-4 mr-2" />
                  Assign New Task
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                  <DialogTitle>{editingTask ? 'Edit Task' : 'Assign New Task'}</DialogTitle>
                </DialogHeader>
                <TaskForm 
                  task={editingTask} 
                  employees={employees || []} 
                  onSubmit={handleTaskSubmit} 
                  onCancel={() => {
                    setIsTaskFormOpen(false);
                    setEditingTask(null);
                  }}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Tabs defaultValue="tasks" className="w-full space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Tasks
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Daily Logs
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="gamification" className="flex items-center gap-2">
            <Award className="w-4 h-4" />
            Achievements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-6 space-y-6">
          <TaskList 
            tasks={tasks || []} 
            currentUser={currentUser} 
            onEditTask={handleEditTask}
            onRefresh={loadData}
            onUpdateStatus={handleUpdateTaskStatus}
            employees={employees || []}
            isManagerView={currentUser?.job_role !== 'employee'}
          />
        </TabsContent>

        <TabsContent value="logs" className="mt-6 space-y-6">
          <PastDailyLogs 
            logs={dailyLogs || []} 
            currentUser={currentUser}
            onRefresh={loadData}
          />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6 space-y-6">
          <PerformanceAnalytics 
            tasks={tasks || []} 
            logs={dailyLogs || []} 
            currentUser={currentUser}
          />
        </TabsContent>

        <TabsContent value="gamification" className="mt-6 space-y-6">
          <GamificationDashboard 
            currentUser={currentUser}
            tasks={tasks || []}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
