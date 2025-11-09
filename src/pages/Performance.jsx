import React, { useState, useEffect, useMemo } from 'react';
import { User } from '@/entities/User';
import { Task } from '@/entities/Task';
import { TaskComment } from '@/entities/TaskComment';
import { EmployeeBadge } from '@/entities/EmployeeBadge';
import { InvokeLLM, UploadFile } from '@/integrations/Core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Award, Target, Star, Plus, ThumbsUp, Send, Upload, MessageSquare, Clock, CheckCircle, AlertCircle, BarChart3, FileText } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function PerformancePage() {
    const [currentUser, setCurrentUser] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [badges, setBadges] = useState([]);
    const [comments, setComments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState(null);
    const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
    const [isSubmissionDialogOpen, setIsSubmissionDialogOpen] = useState(false);
    const [newTask, setNewTask] = useState({
        title: '',
        description: '',
        assigned_to: '',
        priority: 'medium',
        deadline: '',
        estimated_hours: ''
    });
    const [submission, setSubmission] = useState({
        notes: '',
        files: []
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [user, taskList, employeeList, badgeList, commentList] = await Promise.all([
                User.me(),
                Task.list('-created_date', 100).catch(() => []),
                User.list().catch(() => []),
                EmployeeBadge.list().catch(() => []),
                TaskComment.list().catch(() => [])
            ]);
            
            setCurrentUser(user);
            setTasks(taskList);
            setEmployees(employeeList);
            setBadges(badgeList);
            setComments(commentList);
        } catch (error) {
            console.error("Error loading performance data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const userTasks = useMemo(() => {
        return tasks.filter(task => 
            currentUser?.role === 'admin' || 
            currentUser?.role === 'department_head' || 
            task.assigned_to === currentUser?.id
        );
    }, [tasks, currentUser]);

    const performanceStats = useMemo(() => {
        const completedTasks = userTasks.filter(t => t.status === 'completed');
        const onTimeTasks = completedTasks.filter(t => {
            if (!t.completion_date || !t.deadline) return false;
            return new Date(t.completion_date) <= new Date(t.deadline);
        });
        
        const totalRating = completedTasks.reduce((sum, t) => sum + (t.admin_rating || 0), 0);
        const avgRating = completedTasks.length > 0 ? (totalRating / completedTasks.length).toFixed(1) : 0;
        
        return {
            totalTasks: userTasks.length,
            completedTasks: completedTasks.length,
            onTimePercentage: completedTasks.length > 0 ? ((onTimeTasks.length / completedTasks.length) * 100).toFixed(0) : 0,
            averageRating: avgRating
        };
    }, [userTasks]);

    const handleCreateTask = async () => {
        try {
            await Task.create({
                ...newTask,
                assigned_by: currentUser.id,
                status: 'pending',
                estimated_hours: parseFloat(newTask.estimated_hours) || null
            });
            
            setNewTask({ title: '', description: '', assigned_to: '', priority: 'medium', deadline: '', estimated_hours: '' });
            setIsTaskDialogOpen(false);
            loadData();
            toast.success('Task created successfully!');
        } catch (error) {
            console.error('Failed to create task:', error);
            toast.error('Failed to create task');
        }
    };

    const handleTaskSubmission = async (taskId) => {
        try {
            const updateData = {
                status: 'submitted',
                submission_date: new Date().toISOString(),
                submission_notes: submission.notes
            };

            if (submission.files.length > 0) {
                const uploadPromises = submission.files.map(file => UploadFile({ file }));
                const uploads = await Promise.all(uploadPromises);
                updateData.attachment_urls = uploads.map(upload => upload.file_url);
            }

            await Task.update(taskId, updateData);
            setSubmission({ notes: '', files: [] });
            setIsSubmissionDialogOpen(false);
            setSelectedTask(null);
            loadData();
            toast.success('Task submitted for review!');
        } catch (error) {
            console.error('Failed to submit task:', error);
            toast.error('Failed to submit task');
        }
    };

    const handleRateTask = async (taskId, rating, feedback) => {
        try {
            await Task.update(taskId, {
                admin_rating: rating,
                admin_feedback: feedback,
                status: 'completed',
                completion_date: new Date().toISOString()
            });

            // Check for badge eligibility
            checkBadgeEligibility(taskId);
            
            loadData();
            toast.success('Task rated successfully!');
        } catch (error) {
            console.error('Failed to rate task:', error);
            toast.error('Failed to rate task');
        }
    };

    const checkBadgeEligibility = async (taskId) => {
        try {
            const task = tasks.find(t => t.id === taskId);
            if (!task) return;

            const employeeTasks = tasks.filter(t => t.assigned_to === task.assigned_to && t.status === 'completed');
            const onTimeTasks = employeeTasks.filter(t => 
                t.completion_date && t.deadline && new Date(t.completion_date) <= new Date(t.deadline)
            );

            // Award "Punctual Performer" badge
            if (onTimeTasks.length >= 10) {
                const existingBadge = badges.find(b => 
                    b.employee_id === task.assigned_to && b.badge_name === 'punctual_performer'
                );
                
                if (!existingBadge) {
                    await EmployeeBadge.create({
                        employee_id: task.assigned_to,
                        badge_name: 'punctual_performer',
                        badge_description: 'Completed 10+ tasks on time',
                        earned_date: new Date().toISOString().slice(0, 10),
                        criteria_met: 'Completed 10 tasks on time',
                        points: 100
                    });
                }
            }

            // Award "Taskmaster" badge
            if (employeeTasks.length >= 50) {
                const existingBadge = badges.find(b => 
                    b.employee_id === task.assigned_to && b.badge_name === 'taskmaster'
                );
                
                if (!existingBadge) {
                    await EmployeeBadge.create({
                        employee_id: task.assigned_to,
                        badge_name: 'taskmaster',
                        badge_description: 'Completed 50+ tasks',
                        earned_date: new Date().toISOString().slice(0, 10),
                        criteria_met: 'Completed 50 tasks',
                        points: 200
                    });
                }
            }
        } catch (error) {
            console.error('Failed to check badge eligibility:', error);
        }
    };

    const generateAIPerformanceSummary = async (employeeId) => {
        try {
            const employeeTasks = tasks.filter(t => t.assigned_to === employeeId && t.status === 'completed');
            const employee = employees.find(e => e.id === employeeId);

            if (employeeTasks.length === 0) {
                toast.error('No completed tasks to analyze');
                return;
            }

            const prompt = `Generate a comprehensive performance analysis for employee ${employee?.full_name}:

            Task Completion Data:
            - Total Completed Tasks: ${employeeTasks.length}
            - Average Rating: ${employeeTasks.reduce((sum, t) => sum + (t.admin_rating || 0), 0) / employeeTasks.length}
            - On-time Completion Rate: ${employeeTasks.filter(t => t.completion_date && t.deadline && new Date(t.completion_date) <= new Date(t.deadline)).length / employeeTasks.length * 100}%
            
            Recent Tasks: ${employeeTasks.slice(-5).map(t => `${t.title} (Rating: ${t.admin_rating || 'N/A'})`).join(', ')}

            Please provide:
            1. Performance strengths (2-3 points)
            2. Areas for improvement (2-3 points)
            3. Growth recommendations (2-3 actionable items)
            4. Overall performance summary (1 paragraph)`;

            const response = await InvokeLLM({
                prompt,
                response_json_schema: {
                    type: "object",
                    properties: {
                        strengths: { type: "array", items: { type: "string" } },
                        improvements: { type: "array", items: { type: "string" } },
                        recommendations: { type: "array", items: { type: "string" } },
                        summary: { type: "string" }
                    }
                }
            });

            // Display the AI summary (you could create a modal or section for this)
            console.log('AI Performance Summary:', response);
            toast.success('AI performance summary generated!');
            
        } catch (error) {
            console.error('Failed to generate AI summary:', error);
            toast.error('Failed to generate AI performance summary');
        }
    };

    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'department_head';

    if (isLoading) return <div>Loading performance data...</div>;

    return (
        <div className="p-6 space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-bold font-display text-gradient">Performance Tracker</h1>
                    <p className="text-lg text-muted-foreground mt-1">Monitor tasks, achieve goals, and celebrate success.</p>
                </div>
                {isAdmin && (
                    <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="btn-primary">
                                <Plus className="mr-2 h-4 w-4" />
                                Assign Task
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Create New Task</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <Input
                                    placeholder="Task title"
                                    value={newTask.title}
                                    onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                                />
                                <Textarea
                                    placeholder="Task description"
                                    value={newTask.description}
                                    onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                                />
                                <Select value={newTask.assigned_to} onValueChange={(value) => setNewTask({...newTask, assigned_to: value})}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Assign to employee" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {employees.map(emp => (
                                            <SelectItem key={emp.id} value={emp.id}>
                                                {emp.full_name} - {emp.designation}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={newTask.priority} onValueChange={(value) => setNewTask({...newTask, priority: value})}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Low Priority</SelectItem>
                                        <SelectItem value="medium">Medium Priority</SelectItem>
                                        <SelectItem value="high">High Priority</SelectItem>
                                        <SelectItem value="urgent">Urgent</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Input
                                    type="date"
                                    value={newTask.deadline}
                                    onChange={(e) => setNewTask({...newTask, deadline: e.target.value})}
                                />
                                <Input
                                    type="number"
                                    placeholder="Estimated hours"
                                    value={newTask.estimated_hours}
                                    onChange={(e) => setNewTask({...newTask, estimated_hours: e.target.value})}
                                />
                                <Button onClick={handleCreateTask} className="w-full btn-primary">
                                    Create Task
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </header>

            {/* Performance Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="premium-card">
                    <CardContent className="p-6 text-center">
                        <Target className="w-12 h-12 mx-auto text-blue-500 mb-3" />
                        <p className="text-3xl font-bold">{performanceStats.totalTasks}</p>
                        <p className="text-muted-foreground">Total Tasks</p>
                    </CardContent>
                </Card>
                <Card className="premium-card">
                    <CardContent className="p-6 text-center">
                        <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-3" />
                        <p className="text-3xl font-bold">{performanceStats.completedTasks}</p>
                        <p className="text-muted-foreground">Completed</p>
                    </CardContent>
                </Card>
                <Card className="premium-card">
                    <CardContent className="p-6 text-center">
                        <Clock className="w-12 h-12 mx-auto text-purple-500 mb-3" />
                        <p className="text-3xl font-bold">{performanceStats.onTimePercentage}%</p>
                        <p className="text-muted-foreground">On-Time Rate</p>
                    </CardContent>
                </Card>
                <Card className="premium-card">
                    <CardContent className="p-6 text-center">
                        <Star className="w-12 h-12 mx-auto text-yellow-500 mb-3" />
                        <p className="text-3xl font-bold">{performanceStats.averageRating}/10</p>
                        <p className="text-muted-foreground">Avg Rating</p>
                    </CardContent>
                </Card>
            </div>

            {/* User Badges */}
            {badges.filter(b => b.employee_id === currentUser?.id).length > 0 && (
                <Card className="premium-card">
                    <CardHeader>
                        <CardTitle>Your Achievements</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-3">
                            {badges.filter(b => b.employee_id === currentUser?.id).map(badge => (
                                <Badge key={badge.id} className="bg-yellow-100 text-yellow-800 px-4 py-2 text-sm">
                                    <Award className="w-4 h-4 mr-2" />
                                    {badge.badge_name.replace('_', ' ').toUpperCase()}
                                </Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Task List */}
            <Card className="premium-card">
                <CardHeader>
                    <CardTitle>Task Management</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {userTasks.map(task => (
                            <div key={task.id} className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-lg">{task.title}</h3>
                                        <p className="text-muted-foreground text-sm mt-1">{task.description}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <Badge variant="outline">
                                                {task.priority} priority
                                            </Badge>
                                            <Badge className={`${
                                                task.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                task.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
                                                task.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-gray-100 text-gray-800'
                                            }`}>
                                                {task.status.replace('_', ' ')}
                                            </Badge>
                                            {task.deadline && (
                                                <span className="text-sm text-muted-foreground">
                                                    Due: {format(new Date(task.deadline), 'MMM dd, yyyy')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 ml-4">
                                        {task.admin_rating && (
                                            <Badge className="bg-purple-100 text-purple-800">
                                                ⭐ {task.admin_rating}/10
                                            </Badge>
                                        )}
                                        
                                        {currentUser?.role === 'employee' && task.status === 'pending' && (
                                            <Button
                                                onClick={() => {
                                                    setSelectedTask(task);
                                                    setIsSubmissionDialogOpen(true);
                                                }}
                                                size="sm"
                                            >
                                                <Send className="w-4 h-4 mr-1" />
                                                Submit
                                            </Button>
                                        )}

                                        {isAdmin && task.status === 'submitted' && (
                                            <div className="flex gap-2">
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    max="10"
                                                    placeholder="Rate 1-10"
                                                    className="w-24"
                                                    onKeyPress={(e) => {
                                                        if (e.key === 'Enter') {
                                                            const rating = parseInt(e.target.value);
                                                            if (rating >= 1 && rating <= 10) {
                                                                handleRateTask(task.id, rating, '');
                                                            }
                                                        }
                                                    }}
                                                />
                                                <Button
                                                    size="sm"
                                                    onClick={() => generateAIPerformanceSummary(task.assigned_to)}
                                                >
                                                    <BarChart3 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {task.submission_notes && (
                                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                                        <p className="text-sm">
                                            <strong>Submission Notes:</strong> {task.submission_notes}
                                        </p>
                                    </div>
                                )}

                                {task.admin_feedback && (
                                    <div className="mt-3 p-3 bg-green-50 rounded-lg">
                                        <p className="text-sm">
                                            <strong>Admin Feedback:</strong> {task.admin_feedback}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Task Submission Dialog */}
            <Dialog open={isSubmissionDialogOpen} onOpenChange={setIsSubmissionDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Submit Task: {selectedTask?.title}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Textarea
                            placeholder="Add submission notes..."
                            value={submission.notes}
                            onChange={(e) => setSubmission({...submission, notes: e.target.value})}
                        />
                        <div>
                            <label className="text-sm font-medium">Attach Files (optional)</label>
                            <Input
                                type="file"
                                multiple
                                onChange={(e) => setSubmission({...submission, files: Array.from(e.target.files)})}
                                className="mt-1"
                            />
                        </div>
                        <Button
                            onClick={() => handleTaskSubmission(selectedTask?.id)}
                            className="w-full btn-primary"
                        >
                            Submit for Review
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}