
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Trash2, Meh, Sun, User, Cloud, Frown, AlertTriangle, Star, Sunrise, Clock, CheckCircle, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

// New colorful and interactive mood selector component
const MoodSelector = ({ value, onChange }) => {
  const moodOptions = [
    { value: 'energized', label: 'Energized', icon: Sun, color: 'text-amber-600 bg-amber-100 border-amber-300', selectedColor: 'bg-amber-500 text-white border-amber-600' },
    { value: 'focused', label: 'Focused', icon: User, color: 'text-sky-600 bg-sky-100 border-sky-300', selectedColor: 'bg-sky-500 text-white border-sky-600' },
    { value: 'neutral', label: 'Neutral', icon: Meh, color: 'text-gray-600 bg-gray-200 border-gray-300', selectedColor: 'bg-gray-600 text-white border-gray-700' },
    { value: 'tired', label: 'Tired', icon: Cloud, color: 'text-slate-600 bg-slate-200 border-slate-300', selectedColor: 'bg-slate-600 text-white border-slate-700' },
    { value: 'stressed', label: 'Stressed', icon: Frown, color: 'text-red-600 bg-red-100 border-red-300', selectedColor: 'bg-red-500 text-white border-red-600' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3">
      {moodOptions.map(option => {
        const Icon = option.icon;
        const isSelected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full border-2 font-semibold transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2",
              isSelected ? `${option.selectedColor} shadow-lg` : `${option.color} hover:shadow-md`
            )}
          >
            <Icon className="w-5 h-5" />
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default function DailyLogForm({ onSubmit, onCancel, tasks: userTasks, currentUser }) {
  const [logData, setLogData] = useState({
    log_date: new Date().toISOString().slice(0, 10),
    mood_level: 'neutral',
    tasks_worked_on: [],
    challenges_faced: '',
    achievement_highlights: '',
    next_day_priorities: ''
  });

  const [availableTasks, setAvailableTasks] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Filter out tasks that have already been added to the log
    const addedTaskIds = new Set(logData.tasks_worked_on.map(t => t.task_id));
    setAvailableTasks(userTasks.filter(task => !addedTaskIds.has(task.id)));
  }, [userTasks, logData.tasks_worked_on]);

  const handleTaskChange = (index, field, value) => {
    const updatedTasks = [...logData.tasks_worked_on];
    updatedTasks[index][field] = value;
    setLogData({ ...logData, tasks_worked_on: updatedTasks });
  };

  const addTask = () => {
    if (availableTasks.length > 0) {
      const newTasks = [...logData.tasks_worked_on, { task_id: '', hours_spent: 1, progress_update: '' }];
      setLogData({ ...logData, tasks_worked_on: newTasks });
    } else {
      toast.info("No more available tasks to add.");
    }
  };

  const removeTask = (index) => {
    const updatedTasks = logData.tasks_worked_on.filter((_, i) => i !== index);
    setLogData({ ...logData, tasks_worked_on: updatedTasks });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Clean up task data before submitting
      const finalTasks = logData.tasks_worked_on
        .filter(task => task.task_id && task.hours_spent > 0) // Only include tasks that are selected and have time logged
        .map(task => ({
          ...task,
          hours_spent: Number(task.hours_spent) // Ensure hours are numbers
        }));

      const finalLogData = { 
        ...logData, 
        tasks_worked_on: finalTasks,
        // Ensure employee information is properly included
        employee_name: currentUser.full_name || currentUser.email,
        department: currentUser.department || 'Unknown Department',
        employee_designation: currentUser.designation || 'Employee'
      };

      console.log('Submitting log with employee info:', {
        employee_name: finalLogData.employee_name,
        department: finalLogData.department,
        employee_id: currentUser.id
      });

      // Submit the daily log - the parent component will handle notifications
      await onSubmit(finalLogData);
      
    } catch (error) {
      console.error('Error submitting daily log:', error);
      toast.error('Failed to submit daily log. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTaskTitle = (taskId) => {
    const task = userTasks.find(t => t.id === taskId);
    return task ? task.title : 'Unknown Task';
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-violet-500/20 to-pink-500/20 backdrop-blur-sm border border-white/20 mb-4">
          <CheckCircle className="w-10 h-10 text-violet-500" />
        </div>
        <h2 className="text-3xl font-bold text-gradient mb-2">Daily Performance Log</h2>
        <p className="text-muted-foreground">Share your daily progress and plan for tomorrow</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Date and Mood Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Date Input */}
          <div className="space-y-3">
            <Label className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              Date <span className="text-red-500">*</span>
            </Label>
            <Input
              type="date"
              value={logData.log_date}
              onChange={(e) => setLogData({ ...logData, log_date: e.target.value })}
              className="text-lg p-3 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 focus:border-blue-400"
              required
            />
          </div>

          {/* Mood Selector */}
          <div className="space-y-3">
            <Label className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Sun className="w-5 h-5 text-amber-500" />
              How are you feeling today? <span className="text-red-500">*</span>
            </Label>
            <MoodSelector 
              value={logData.mood_level} 
              onChange={(value) => setLogData({ ...logData, mood_level: value })} 
            />
          </div>
        </div>

        {/* Tasks Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-500" />
              Tasks Worked On Today
            </Label>
            {availableTasks.length > 0 && (
              <Button
                type="button"
                onClick={addTask}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 border-purple-200 text-purple-600 hover:bg-purple-50"
              >
                <Plus className="w-4 h-4" />
                Add Task
              </Button>
            )}
          </div>

          {/* Task Addition Area */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-dashed border-purple-200 rounded-xl p-6 min-h-[120px] flex flex-col justify-center">
            {logData.tasks_worked_on.length === 0 ? (
              <div className="text-center text-purple-600">
                <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium">No tasks added yet.</p>
                <p className="text-xs text-purple-500 mt-1">
                  {availableTasks.length > 0 
                    ? 'Click "Add Task" to get started, or skip if you worked on other activities.'
                    : 'No assigned tasks available. You can still submit your daily log.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {logData.tasks_worked_on.map((taskWork, index) => (
                  <div key={index} className="bg-white p-4 rounded-lg border border-purple-200 shadow-sm">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Select
                          value={taskWork.task_id}
                          onValueChange={(value) => handleTaskChange(index, 'task_id', value)}
                        >
                          <SelectTrigger className="bg-white border-gray-300">
                            <SelectValue placeholder="Select a task" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableTasks
                              .filter(task => !logData.tasks_worked_on.some((tw, i) => i !== index && tw.task_id === task.id))
                              .map(task => (
                                <SelectItem key={task.id} value={task.id}>
                                  {task.title}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>

                        <Input
                          type="number"
                          min="0.5"
                          step="0.5"
                          value={taskWork.hours_spent}
                          onChange={(e) => handleTaskChange(index, 'hours_spent', e.target.value)}
                          placeholder="Hours spent"
                          className="bg-white border-gray-300"
                        />

                        <div className="flex gap-2">
                          <Input
                            value={taskWork.progress_update}
                            onChange={(e) => handleTaskChange(index, 'progress_update', e.target.value)}
                            placeholder="Progress update"
                            className="flex-1 bg-white border-gray-300"
                          />
                          <Button
                            type="button"
                            onClick={() => removeTask(index)}
                            variant="outline"
                            size="icon"
                            className="text-red-500 border-red-200 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Text Areas Section */}
        <div className="space-y-6">
          {/* Challenges */}
          <div className="space-y-3">
            <Label className="text-lg font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Challenges Faced
            </Label>
            <Textarea
              value={logData.challenges_faced}
              onChange={(e) => setLogData({ ...logData, challenges_faced: e.target.value })}
              placeholder="Any obstacles, blockers, or difficulties you encountered today..."
              rows={3}
              className="bg-gradient-to-r from-orange-50 to-red-50 border-l-4 border-orange-400 focus:border-orange-500 resize-none"
            />
          </div>

          {/* Achievements */}
          <div className="space-y-3">
            <Label className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Star className="w-5 h-5 text-green-500" />
              Achievement Highlights
            </Label>
            <Textarea
              value={logData.achievement_highlights}
              onChange={(e) => setLogData({ ...logData, achievement_highlights: e.target.value })}
              placeholder="Key accomplishments, milestones, or wins from today..."
              rows={3}
              className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-400 focus:border-green-500 resize-none"
            />
          </div>

          {/* Tomorrow's Priorities */}
          <div className="space-y-3">
            <Label className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Sunrise className="w-5 h-5 text-indigo-500" />
              Tomorrow's Priorities
            </Label>
            <Textarea
              value={logData.next_day_priorities}
              onChange={(e) => setLogData({ ...logData, next_day_priorities: e.target.value })}
              placeholder="What are your main focus areas and goals for tomorrow..."
              rows={3}
              className="bg-gradient-to-r from-indigo-50 to-purple-50 border-l-4 border-indigo-400 focus:border-indigo-500 resize-none"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
          <Button
            type="button"
            onClick={onCancel}
            variant="outline"
            size="lg"
            disabled={isSubmitting}
            className="px-8"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            size="lg"
            className="px-8 bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-700 hover:to-pink-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
          >
            {isSubmitting ? (
              <>
                <Clock className="w-5 h-5 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                Submit Log
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
