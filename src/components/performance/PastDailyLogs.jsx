
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, Target, AlertTriangle, Star, Sunrise, Search, Filter, User, Building } from 'lucide-react';
import { format } from 'date-fns';
import { User as UserEntity } from '@/entities/User';

export default function PastDailyLogs({ logs, currentUser, onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [filterMood, setFilterMood] = useState('all');
  const [employeeMap, setEmployeeMap] = useState(new Map());

  // Check if current user is manager or admin to show all logs
  const isManagerOrAdmin = currentUser?.job_role && ['admin', 'manager', 'department_head'].includes(currentUser.job_role);

  // Load employee information to map IDs to names/departments
  useEffect(() => {
    const loadEmployeeInfo = async () => {
      try {
        const employees = await UserEntity.list();
        const empMap = new Map();
        employees.forEach(emp => {
          empMap.set(emp.id, {
            name: emp.full_name || emp.email || 'Unknown Employee',
            department: emp.department || 'Unknown Department',
            designation: emp.designation || 'Employee'
          });
        });
        setEmployeeMap(empMap);
        console.log('Employee map loaded:', empMap);
      } catch (error) {
        console.error('Error loading employee information:', error);
      }
    };

    if (isManagerOrAdmin) {
      loadEmployeeInfo();
    }
  }, [isManagerOrAdmin]);

  // Enhanced function to get employee information
  const getEmployeeInfo = (log) => {
    // First try to use the stored employee information from the log
    if (log.employee_name && log.employee_name !== 'Unknown Employee') {
      return {
        name: log.employee_name,
        department: log.department || 'Unknown Department',
        designation: log.employee_designation || 'Employee'
      };
    }

    // Fallback to employee map lookup
    if (log.employee_id && employeeMap.has(log.employee_id)) {
      const empInfo = employeeMap.get(log.employee_id);
      return {
        name: empInfo.name,
        department: empInfo.department,
        designation: empInfo.designation
      };
    }

    // Final fallback
    return {
      name: 'Unknown Employee',
      department: 'Unknown Department',
      designation: 'Employee'
    };
  };

  // Get unique employees from logs for filter dropdown
  const uniqueEmployees = [...new Set(logs.map(log => {
    const empInfo = getEmployeeInfo(log);
    return {
      id: log.employee_id,
      name: empInfo.name,
      department: empInfo.department
    };
  }).filter(emp => emp.id))];

  // Filter logs based on search and filters
  const filteredLogs = logs.filter(log => {
    const matchesSearch = !searchTerm ||
      log.achievement_highlights?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.challenges_faced?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.next_day_priorities?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.employee_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesEmployee = filterEmployee === 'all' || log.employee_id === filterEmployee;
    const matchesMood = filterMood === 'all' || log.mood_level === filterMood;

    return matchesSearch && matchesEmployee && matchesMood;
  });

  const getMoodColor = (mood) => {
    const colors = {
      energized: 'bg-amber-100 text-amber-800 border-amber-300',
      focused: 'bg-sky-100 text-sky-800 border-sky-300',
      neutral: 'bg-gray-100 text-gray-800 border-gray-300',
      tired: 'bg-slate-100 text-slate-800 border-slate-300',
      stressed: 'bg-red-100 text-red-800 border-red-300'
    };
    return colors[mood] || colors.neutral;
  };

  const getMoodIcon = (mood) => {
    const icons = {
      energized: '☀️',
      focused: '🎯',
      neutral: '😐',
      tired: '😴',
      stressed: '😰'
    };
    return icons[mood] || icons.neutral;
  };

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {isManagerOrAdmin ? 'All Daily Logs' : 'My Daily Logs'}
          </h2>
          <p className="text-muted-foreground">
            {isManagerOrAdmin
              ? `Review daily performance logs from all team members (${filteredLogs.length} logs)`
              : `Your submitted daily performance logs (${filteredLogs.length} logs)`
            }
          </p>
        </div>

        <Button
          onClick={onRefresh}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Clock className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Search and Filter Controls */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs by content, achievements, challenges..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {isManagerOrAdmin && (
              <Select value={filterEmployee} onValueChange={setFilterEmployee}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {uniqueEmployees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select value={filterMood} onValueChange={setFilterMood}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by mood" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Moods</SelectItem>
                <SelectItem value="energized">Energized</SelectItem>
                <SelectItem value="focused">Focused</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
                <SelectItem value="tired">Tired</SelectItem>
                <SelectItem value="stressed">Stressed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Daily Logs List */}
      <div className="space-y-6">
        {filteredLogs.length === 0 ? (
          <Card className="premium-card">
            <CardContent className="text-center py-12">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Daily Logs Found</h3>
              <p className="text-muted-foreground">
                {searchTerm || filterEmployee !== 'all' || filterMood !== 'all'
                  ? 'Try adjusting your search or filter criteria.'
                  : isManagerOrAdmin
                    ? 'No daily logs have been submitted yet.'
                    : 'You haven\'t submitted any daily logs yet.'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredLogs.map((log) => {
            const employeeInfo = getEmployeeInfo(log);

            return (
              <Card key={log.id} className="premium-card hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-violet-500" />
                        <span className="text-lg font-semibold">
                          {format(new Date(log.log_date), 'MMMM dd, yyyy')}
                        </span>
                      </div>
                      {isManagerOrAdmin && (
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-blue-500" />
                            <span className="font-medium text-blue-700">
                              {employeeInfo.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Building className="w-4 h-4 text-green-500" />
                            <span className="text-sm font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full">
                              {employeeInfo.department}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge className={`${getMoodColor(log.mood_level)} border`}>
                        <span className="mr-1">{getMoodIcon(log.mood_level)}</span>
                        {log.mood_level.charAt(0).toUpperCase() + log.mood_level.slice(1)}
                      </Badge>
                      {isManagerOrAdmin && employeeInfo.designation && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                            {employeeInfo.designation}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Tasks Worked On */}
                  {log.tasks_worked_on && log.tasks_worked_on.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Target className="w-5 h-5 text-purple-500" />
                        <h4 className="font-semibold text-foreground">Tasks Worked On</h4>
                      </div>
                      <div className="grid gap-3">
                        {log.tasks_worked_on.map((task, index) => (
                          <div key={index} className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-purple-900">Task Progress</span>
                              <Badge variant="outline" className="text-purple-700 border-purple-300">
                                {task.hours_spent}h
                              </Badge>
                            </div>
                            <p className="text-purple-800">{task.progress_update}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Achievements */}
                  {log.achievement_highlights && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Star className="w-5 h-5 text-green-500" />
                        <h4 className="font-semibold text-foreground">Achievement Highlights</h4>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-400">
                        <p className="text-green-800">{log.achievement_highlights}</p>
                      </div>
                    </div>
                  )}

                  {/* Challenges */}
                  {log.challenges_faced && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                        <h4 className="font-semibold text-foreground">Challenges Faced</h4>
                      </div>
                      <div className="bg-orange-50 p-4 rounded-lg border-l-4 border-orange-400">
                        <p className="text-orange-800">{log.challenges_faced}</p>
                      </div>
                    </div>
                  )}

                  {/* Tomorrow's Priorities */}
                  {log.next_day_priorities && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Sunrise className="w-5 h-5 text-indigo-500" />
                        <h4 className="font-semibold text-foreground">Tomorrow's Priorities</h4>
                      </div>
                      <div className="bg-indigo-50 p-4 rounded-lg border-l-4 border-indigo-400">
                        <p className="text-indigo-800">{log.next_day_priorities}</p>
                      </div>
                    </div>
                  )}

                  {/* Enhanced Submission Info */}
                  <div className="text-xs text-muted-foreground border-t pt-3 mt-4 flex justify-between items-center">
                    <span>Submitted on {format(new Date(log.created_date), 'PPP p')}</span>
                    {isManagerOrAdmin && (
                      <span className="text-blue-600 font-medium">
                        👤 {employeeInfo.name} • 🏢 {employeeInfo.department}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
